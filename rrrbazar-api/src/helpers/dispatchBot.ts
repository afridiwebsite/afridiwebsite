import Schema from "../models";
import autoOrder from "./autoorder";

const { BotDispatch } = Schema;

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
  failedDispatches: any[];
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
      failedDispatches: [],
    };
  }
  const counts: Record<string, number> = {
    success: 0,
    failed: 0,
    pending: 0,
    sent: 0,
    cancelled: 0,
  };
  const failedDispatches: any[] = [];
  let retryable = 0;
  let capped = 0;
  for (const d of all) {
    counts[d.status] = (counts[d.status] || 0) + 1;
    if (d.status === "failed") {
      failedDispatches.push(d);
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
    failedDispatches,
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

  if (agg.failedDispatches.length === 0) return summary;

  const items = agg.failedDispatches
    .map((d) => {
      const label =
        d.tag != null && String(d.tag).length > 0
          ? `tag #${d.tag}`
          : d.voucher_id
            ? `voucher #${d.voucher_id}`
            : d.voucher_package_id
              ? `pool #${d.voucher_package_id}`
              : `dispatch #${d.id}`;
      const cap =
        Number(d.attempt_count || 0) >= MAX_DISPATCH_ATTEMPTS
          ? " <strong style='color:#dc2626;'>(capped — not retryable)</strong>"
          : "";
      const reason = String(d.error_reason || "no reason provided");
      return `<li><strong>${label}</strong> · attempt ${d.attempt_count || 0}/${MAX_DISPATCH_ATTEMPTS}${cap}<br/><span style="color:#dc2626;">${reason}</span></li>`;
    })
    .join("");
  return (
    summary +
    `<div style="margin-top:8px;"><strong>Failures:</strong>` +
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
  await dispatch.save();

  const codeToSend = String(dispatch.code || "");
  const packageToSend = String(dispatch.package_name_sent || "");
  const botUrl = String(dispatch.bot_url || "");

  console.log("[executeDispatch] firing", {
    dispatch_id: dispatch.id,
    order_id: dispatch.order_id,
    attempt: dispatch.attempt_count,
    tag: dispatch.tag,
    voucher_id: dispatch.voucher_id,
    bot_url: botUrl,
  });

  // We use `shellOverride` to carry the code regardless of dispatch
  // type — autoOrder resolves `codeForBot = shellOverride || unipin`,
  // and we want exactly what's saved on the row. `package_name` carries
  // the saved label (tag for shell, package name for voucher).
  // autoOrder always returns `{ ok: true, url } | { ok: false, error_reason }`
  // — including for HTTP 2xx responses whose body says status=error.
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
}): Promise<{ dispatch: any; ok: any; error_reason: string | null }> {
  const dispatch = await BotDispatch.create({
    order_id: opts.order_id,
    voucher_id: opts.voucher_id ?? null,
    tag: opts.tag ?? null,
    code: opts.code,
    package_name_sent: opts.package_name_sent || "",
    bot_url: opts.bot_url,
    status: "pending",
    attempt_count: 0,
  });
  const { ok, error_reason } = await executeDispatch(dispatch, {
    player_id: opts.player_id,
    uc: opts.uc,
  });
  return { dispatch, ok, error_reason };
}
