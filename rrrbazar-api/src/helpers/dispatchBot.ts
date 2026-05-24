import Schema from "../models";
import autoOrder from "./autoorder";

const { BotDispatch } = Schema;

// Soft cap on retries — the retry endpoint refuses to fire any dispatch
// whose attempt_count is already >= MAX_DISPATCH_ATTEMPTS so a runaway
// loop on a permanently-broken bot can't burn its way through resources.
// Counts include the first attempt.
export const MAX_DISPATCH_ATTEMPTS = 5;

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

  try {
    // We use `shellOverride` to carry the code regardless of dispatch
    // type — autoOrder resolves `codeForBot = shellOverride || unipin`,
    // and we want exactly what's saved on the row. `package_name` carries
    // the saved label (tag for shell, package name for voucher).
    const result = await autoOrder(
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

    if (!result) {
      dispatch.status = "failed";
      dispatch.error_reason = `bot returned no acceptance (no response from ${botUrl || "(no url)"})`;
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
    return { ok: result, error_reason: null };
  } catch (e: any) {
    const msg =
      (e && (e.message || e.code || e.toString())) || "unknown error";
    dispatch.status = "failed";
    dispatch.error_reason = `dispatch threw: ${String(msg).slice(0, 250)}`;
    await dispatch.save();
    console.error("[executeDispatch] threw", {
      dispatch_id: dispatch.id,
      order_id: dispatch.order_id,
      err: msg,
    });
    return { ok: false, error_reason: dispatch.error_reason };
  }
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
