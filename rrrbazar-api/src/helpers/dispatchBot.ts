import fetch from "node-fetch";
import Schema from "../models";
import autoOrder from "./autoorder";

const { BotDispatch } = Schema;

// Per-request hard timeout for the like-bot GET. Keeps a hung upstream
// from blocking the whole dispatch path.
const LIKE_BOT_TIMEOUT_MS = 15000;
// PUBG-bot is allowed more headroom — gamerspay.app's order endpoint
// can take several seconds to deliver, especially for first-time SKUs.
const PUBG_BOT_TIMEOUT_MS = 30000;

/**
 * Fire a GET request to a like-bot URL and decide success/failure from the
 * response body. Like-bot returns JSON like:
 *   { "status": "success", "added": 100, ... }
 *   { "status": "error", "message": "..." }
 * Anything non-2xx is also treated as failure.
 */
async function fireLikeBot(
  url: string,
): Promise<{ ok: boolean; error_reason: string | null; body: any }> {
  if (!url) {
    return {
      ok: false,
      error_reason: "no like-bot URL configured for this package",
      body: null,
    };
  }
  let timeoutHandle: any;
  try {
    // node-fetch in this project doesn't have AbortController in older
    // versions; race a manual timer instead.
    const requestPromise = fetch(url, { method: "GET" });
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error(`timed out after ${LIKE_BOT_TIMEOUT_MS}ms`)),
        LIKE_BOT_TIMEOUT_MS,
      );
    });
    const response = (await Promise.race([
      requestPromise,
      timeoutPromise,
    ])) as any;
    clearTimeout(timeoutHandle);

    let body: any;
    const contentType = response.headers?.get?.("content-type") || "";
    try {
      if (contentType.includes("application/json")) {
        body = await response.json();
      } else {
        body = await response.text();
      }
    } catch {
      body = "(unparseable)";
    }

    if (!response.ok) {
      return {
        ok: false,
        error_reason: `like-bot HTTP ${response.status} ${response.statusText || ""}`.trim(),
        body,
      };
    }
    // Treat `{ status: "error", message }` (or `success: false`) as failure.
    if (body && typeof body === "object") {
      const status = String(body.status || "").toLowerCase();
      if (status === "error" || body.success === false) {
        return {
          ok: false,
          error_reason: String(
            body.message || body.error || "like-bot reported status=error",
          ).slice(0, 300),
          body,
        };
      }
    }
    return { ok: true, error_reason: null, body };
  } catch (e: any) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    const msg = (e && (e.message || e.code || e.toString())) || "unknown error";
    return {
      ok: false,
      error_reason: `like-bot threw: ${String(msg).slice(0, 250)}`,
      body: null,
    };
  }
}

/**
 * Fire a POST request to the PUBG-bot URL with the X-API-Key header and
 * a JSON body. The body shape (`{ game, sku, player_id, server? }`) is
 * decided upstream by handlePubgBot — this function is transport-only.
 *
 * Returns ok=true whenever the upstream returns a 2xx, regardless of
 * the parsed `success`/`status` fields. handlePubgBot reads those off
 * the parsed body to decide the *order* outcome (delivered / pending
 * review / cancel-and-refund). That split keeps the dispatch row's
 * transport-level status honest while still letting an admin retry on
 * recoverable upstream errors.
 */
async function firePubgBot(
  url: string,
  apiKey: string,
  body: Record<string, any>,
): Promise<{ ok: boolean; error_reason: string | null; body: any }> {
  if (!url || !apiKey) {
    return {
      ok: false,
      error_reason: "PUBG-bot URL or API key missing",
      body: null,
    };
  }
  let timeoutHandle: any;
  try {
    const requestPromise = fetch(url, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body || {}),
    });
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error(`timed out after ${PUBG_BOT_TIMEOUT_MS}ms`)),
        PUBG_BOT_TIMEOUT_MS,
      );
    });
    const response = (await Promise.race([
      requestPromise,
      timeoutPromise,
    ])) as any;
    clearTimeout(timeoutHandle);

    let responseBody: any;
    const contentType = response.headers?.get?.("content-type") || "";
    try {
      if (contentType.includes("application/json")) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }
    } catch {
      responseBody = "(unparseable)";
    }

    if (!response.ok) {
      return {
        ok: false,
        error_reason:
          `pubg-bot HTTP ${response.status} ${response.statusText || ""}`.trim(),
        body: responseBody,
      };
    }
    return { ok: true, error_reason: null, body: responseBody };
  } catch (e: any) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    const msg = (e && (e.message || e.code || e.toString())) || "unknown error";
    return {
      ok: false,
      error_reason: `pubg-bot threw: ${String(msg).slice(0, 250)}`,
      body: null,
    };
  }
}

// Soft cap on retries — the retry endpoint refuses to fire any dispatch
// whose attempt_count is already >= MAX_DISPATCH_ATTEMPTS so a runaway
// loop on a permanently-broken bot can't burn its way through resources.
// Counts include the first attempt.
export const MAX_DISPATCH_ATTEMPTS = 5;

export interface OrderAggregate {
  // Aggregate order status derived from the BotDispatch rows:
  //   'completed'   — every dispatch reported success
  //   'cancel'      — any cancelled (Invalid player/region) OR all failed
  //                   dispatches are at the retry cap (not retryable)
  //   'pending'     — every dispatch failed (still retryable) with nothing
  //                   in flight and no partial successes — admin needs to
  //                   retry or refund
  //   'In Progress' — at least one dispatch is still pending/sent, OR a
  //                   mix of successes and retryable failures (partial
  //                   delivery)
  //   null          — order has no dispatch rows (legacy)
  status: "completed" | "cancel" | "pending" | "In Progress" | null;
  counts: Record<string, number>;
  total: number;
  retryableFailedCount: number;
  cappedFailedCount: number;
  allDispatches: any[];
}

/**
 * Aggregate an order's terminal status from its BotDispatch rows.
 * Shared between checkOrder (callback path) and retryBotDispatches
 * (admin retry path) so both arrive at the same conclusion.
 *
 * Cancellation rules:
 *   - Any `cancelled` dispatch (Invalid player/region) is a hard stop.
 *   - All failed dispatches at attempt cap with zero retryable ones AND
 *     no successes/pendings → order is not retryable → cancel.
 */
export async function aggregateOrderFromDispatches(
  orderId: number,
): Promise<OrderAggregate> {
  const all = await BotDispatch.findAll({ where: { order_id: orderId } });
  if (all.length === 0) {
    return {
      status: null,
      counts: {},
      total: 0,
      retryableFailedCount: 0,
      cappedFailedCount: 0,
      allDispatches: [],
    };
  }
  const counts: Record<string, number> = {
    success: 0,
    failed: 0,
    pending: 0,
    sent: 0,
    cancelled: 0,
  };
  let retryable = 0;
  let capped = 0;
  for (const d of all) {
    counts[d.status] = (counts[d.status] || 0) + 1;
    if (d.status === "failed") {
      if (Number(d.attempt_count || 0) < MAX_DISPATCH_ATTEMPTS) retryable += 1;
      else capped += 1;
    }
  }

  let status: OrderAggregate["status"];
  const inFlight = (counts.pending || 0) + (counts.sent || 0);
  if (counts.cancelled > 0) {
    status = "cancel";
  } else if (
    counts.success === all.length &&
    counts.failed === 0 &&
    inFlight === 0
  ) {
    status = "completed";
  } else if (counts.failed > 0 && retryable === 0 && inFlight === 0) {
    // Every failed dispatch is at cap and nothing is in flight — admin
    // can't retry from here, so the order is effectively dead.
    status = "cancel";
  } else if (
    counts.failed > 0 &&
    counts.success === 0 &&
    inFlight === 0
  ) {
    // Bot already rejected every dispatch and nothing is awaiting a
    // callback — surface as "pending" so the admin sees it as needing
    // action (rather than "In Progress" which implies the bot is still
    // working). Retry is still possible until the cap.
    status = "pending";
  } else {
    // Mix of successes and retryable failures, or some still in flight.
    status = "In Progress";
  }

  return {
    status,
    counts,
    total: all.length,
    retryableFailedCount: retryable,
    cappedFailedCount: capped,
    allDispatches: all,
  };
}

/**
 * Build the order.details HTML from a dispatch aggregate. Shared between
 * checkOrder and retryBotDispatches so both keep the details cell
 * consistent.
 */
export function buildOrderDetailsHtml(agg: OrderAggregate): string {
  const total = agg.total;
  const c = agg.counts;
  const headerColor =
    agg.status === "completed"
      ? "#059669"
      : agg.status === "cancel"
        ? "#dc2626"
        : c.failed > 0
          ? "#dc2626"
          : "#2563eb";

  const summary =
    `<div style="color:${headerColor};">` +
    `<strong>Dispatches:</strong> ${c.success || 0}/${total} ok` +
    (c.failed ? `, ${c.failed} failed` : "") +
    (c.cancelled ? `, ${c.cancelled} cancelled` : "") +
    (c.sent ? `, ${c.sent} awaiting callback` : "") +
    (c.pending ? `, ${c.pending} pending` : "") +
    `</div>`;

  // Filter to dispatches that have something interesting to say:
  //   - failed or cancelled (show the error)
  //   - successful with delivered content (show the voucher)
  const detailRows = agg.allDispatches.filter(
    (d) =>
      d.status === "failed" ||
      d.status === "cancelled" ||
      (d.status === "success" && d.response_content),
  );

  if (detailRows.length === 0) return summary;

  const items = detailRows
    .map((d) => {
      const isOk = d.status === "success";
      const label =
        d.tag != null && String(d.tag).length > 0
          ? `tag #${d.tag}`
          : d.voucher_id
            ? `voucher #${d.voucher_id}`
            : d.voucher_package_id
              ? `pool #${d.voucher_package_id}`
              : `dispatch #${d.id}`;

      let detailText: string;
      if (isOk) {
        detailText = `<span style="color:#059669;">${d.response_content}</span>`;
      } else {
        const cap =
          Number(d.attempt_count || 0) >= MAX_DISPATCH_ATTEMPTS
            ? " <strong style='color:#dc2626;'>(capped — not retryable)</strong>"
            : "";
        const reason = String(d.error_reason || "no reason provided");
        detailText = `attempt ${d.attempt_count || 0}/${MAX_DISPATCH_ATTEMPTS}${cap}<br/><span style="color:#dc2626;">${reason}</span>`;
      }

      return `<li><strong>${label}</strong> · ${detailText}</li>`;
    })
    .join("");

  return (
    summary +
    `<div style="margin-top:8px;"><strong>Delivery Details:</strong>` +
    `<ul style="text-align:left; margin-top:4px; list-style-type:disc; padding-left:20px;">${items}</ul></div>`
  );
}

/**
 * Re-fire the bot for an *existing* BotDispatch row, persisting the
 * outcome on the same row. Used by both:
 *   - the initial dispatch path in topupPackageOrder (caller creates the
 *     row first with status='pending', then calls this)
 *   - the admin retry endpoint
 *
 * What the row already captured (code, package_name_sent, bot_url,
 * voucher_id, tag) is what gets re-sent — we don't re-derive anything
 * from the order or package, since those may have drifted since the
 * original attempt.
 *
 * Returns `{ ok, error_reason }`:
 *   ok = url string when the bot accepted the POST, false otherwise.
 *   error_reason = populated when ok = false.
 */
export async function executeDispatch(
  dispatch: any,
  opts: { player_id: string; uc: number },
): Promise<{ ok: any; error_reason: string | null }> {
  dispatch.attempt_count = (Number(dispatch.attempt_count) || 0) + 1;
  dispatch.last_attempted_at = new Date();
  dispatch.status = "pending";
  dispatch.error_reason = null;
  (dispatch as any).response_content = null;
  await dispatch.save();

  const codeToSend = String(dispatch.code || "");
  const packageToSend = String(dispatch.package_name_sent || "");
  const botUrl = String(dispatch.bot_url || "");
  const botType = String(dispatch.bot_type || "").toLowerCase().trim();

  console.log("[executeDispatch] firing", {
    dispatch_id: dispatch.id,
    order_id: dispatch.order_id,
    attempt: dispatch.attempt_count,
    bot_type: botType || "(legacy)",
    tag: dispatch.tag,
    voucher_id: dispatch.voucher_id,
    bot_url: botUrl,
  });

  // Like-bot: synchronous GET to the per-order URL captured on the row.
  // Success/failure is resolved inline from the response body (no
  // separate /check_order callback) so the dispatch terminates on the
  // first attempt — no `sent` intermediate state.
  if (botType === "like-bot") {
    const result = await fireLikeBot(botUrl);
    if (!result.ok) {
      dispatch.status = "failed";
      dispatch.error_reason =
        result.error_reason || "like-bot rejected the request";
      await dispatch.save();
      return { ok: false, error_reason: dispatch.error_reason };
    }
    dispatch.status = "success";
    (dispatch as any).response_content =
      typeof result.body === "string"
        ? result.body.slice(0, 500)
        : JSON.stringify(result.body || {}).slice(0, 500);
    await dispatch.save();
    return { ok: botUrl, error_reason: null };
  }

  // PUBG-bot: synchronous POST. The api key + json body were packed
  // into `code` by handlePubgBot as `{ api_key, body }` so a retry can
  // re-fire the original payload even if the package's bot_config has
  // since drifted. The transport status here is just "did the HTTP
  // call land?" — handlePubgBot decides the *order* outcome from the
  // parsed body (completed / pending review / failed-and-refund).
  if (botType === "pubg-bot") {
    let envelope: any = {};
    try {
      envelope = JSON.parse(String(dispatch.code || ""));
    } catch {
      envelope = {};
    }
    const apiKey = String(envelope?.api_key || "").trim();
    const reqBody =
      envelope?.body && typeof envelope.body === "object" ? envelope.body : {};
    const result = await firePubgBot(botUrl, apiKey, reqBody);
    // Always stash the body so handlePubgBot can read status/order_id/
    // code_plaintext off it. response_content is TEXT so the 2000-char
    // ceiling is plenty for the documented payload shape including
    // data.code_plaintext on risk_error_manual_charge.
    if (result.body != null) {
      (dispatch as any).response_content =
        typeof result.body === "string"
          ? result.body.slice(0, 2000)
          : JSON.stringify(result.body || {}).slice(0, 2000);
    }
    if (!result.ok) {
      dispatch.status = "failed";
      dispatch.error_reason =
        result.error_reason || "pubg-bot rejected the request";
      await dispatch.save();
      return { ok: false, error_reason: dispatch.error_reason };
    }
    dispatch.status = "success";
    await dispatch.save();
    return { ok: botUrl, error_reason: null };
  }

  // uc-bot / shell-bot / legacy: POST to the configured bot endpoint
  // via the shared autoOrder helper. autoOrder always returns
  // `{ ok: true, url } | { ok: false, error_reason }`.
  const result: any = await autoOrder(
    dispatch.order_id,
    opts.player_id,
    opts.uc,
    "",
    botUrl,
    packageToSend,
    codeToSend,
    "80",
    dispatch.id,
  );

  if (!result || result.ok !== true) {
    dispatch.status = "failed";
    dispatch.error_reason =
      (result && result.error_reason) ||
      `bot returned no acceptance (no response from ${botUrl || "(no url)"})`;
    await dispatch.save();
    console.warn("[executeDispatch] rejected", {
      dispatch_id: dispatch.id,
      order_id: dispatch.order_id,
      reason: dispatch.error_reason,
    });
    return { ok: false, error_reason: dispatch.error_reason };
  }

  dispatch.status = "sent";
  await dispatch.save();
  console.log("[executeDispatch] sent — awaiting bot callback", {
    dispatch_id: dispatch.id,
    order_id: dispatch.order_id,
  });
  return { ok: result.url || true, error_reason: null };
}

/**
 * Convenience: build a BotDispatch row and immediately fire it. Used by
 * topupPackageOrder for first-time dispatches.
 */
export async function createAndSendDispatch(opts: {
  order_id: number;
  player_id: string;
  uc: number;
  bot_url: string;
  code: string;
  package_name_sent: string;
  voucher_id?: number | null;
  tag?: string | null;
  // Captured at create time so retry routes to the right transport
  // (POST autoOrder vs Like-bot GET) even if the package's bot_type
  // has drifted by the time the admin clicks Retry. Empty = legacy
  // POST behaviour.
  bot_type?: string;
}): Promise<{ dispatch: any; ok: any; error_reason: string | null }> {
  const dispatch = await BotDispatch.create({
    order_id: opts.order_id,
    voucher_id: opts.voucher_id ?? null,
    tag: opts.tag ?? null,
    code: opts.code,
    package_name_sent: opts.package_name_sent || "",
    bot_url: opts.bot_url,
    bot_type: String(opts.bot_type || "").toLowerCase().trim(),
    status: "pending",
    attempt_count: 0,
  });
  const { ok, error_reason } = await executeDispatch(dispatch, {
    player_id: opts.player_id,
    uc: opts.uc,
  });
  return { dispatch, ok, error_reason };
}
