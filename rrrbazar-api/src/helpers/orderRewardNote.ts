// Build the user-facing reward block that gets appended to Order.brief_note
// on completion. Kept as plain HTML so the storefront can parse + render it
// inside an order card without an extra column / API field.
//
// Marker class is `order-reward-note` — the client greps for it to pull
// just this block out of brief_note (which may also contain
// "UniPin: <code>" or "Voucher: <code>" prefixes from older flows).

export interface RewardNoteOpts {
  rewardType: string | null | undefined;   // 'coin' | 'money'
  coinValue: number | string | null | undefined;
  cashbackAmount: number | string | null | undefined;
  resellerCashback: number | string | null | undefined;
  isReseller: boolean;
  // Voucher-pool orders pay per-unit, so the caller passes their quantity.
  // Everything else implicitly multiplies by 1.
  quantity?: number;
}

export const REWARD_NOTE_MARKER_CLASS = "order-reward-note";
export const RESELLER_NOTE_MARKER_CLASS = "order-reseller-note";

export function buildRewardNoteHtml(opts: RewardNoteOpts): string {
  const qty = Math.max(1, Number(opts.quantity || 1));
  const rt = String(opts.rewardType || "coin").toLowerCase();

  // Primary reward — the user-facing one tied to reward_type.
  let primaryHtml = "";
  if (rt === "money") {
    const amt = Number(opts.cashbackAmount || 0) * qty;
    if (amt > 0) {
      primaryHtml =
        `<div class="${REWARD_NOTE_MARKER_CLASS}" ` +
        `style="margin-top:8px; padding:8px 10px; border-left:3px solid #10b981; ` +
        `background:#ecfdf5; border-radius:4px; font-size:13px; color:#065f46;">` +
        `<strong>🎁 Cashback reward:</strong> ৳${amt.toFixed(2)}` +
        `</div>`;
    }
  } else {
    const coins = Number(opts.coinValue || 0) * qty;
    if (coins > 0) {
      primaryHtml =
        `<div class="${REWARD_NOTE_MARKER_CLASS}" ` +
        `style="margin-top:8px; padding:8px 10px; border-left:3px solid #10b981; ` +
        `background:#ecfdf5; border-radius:4px; font-size:13px; color:#065f46;">` +
        `<strong>🪙 Coin reward:</strong> +${coins} coins` +
        `</div>`;
    }
  }

  // Reseller bonus — independent of reward_type, only paid to resellers.
  let resellerHtml = "";
  if (opts.isReseller) {
    const rc = Number(opts.resellerCashback || 0) * qty;
    if (rc > 0) {
      resellerHtml =
        `<div class="${RESELLER_NOTE_MARKER_CLASS}" ` +
        `style="margin-top:8px; padding:8px 10px; border-left:3px solid #6366f1; ` +
        `background:#eef2ff; border-radius:4px; font-size:13px; color:#3730a3;">` +
        `<strong>💼 Reseller bonus:</strong> ৳${rc.toFixed(2)}` +
        `</div>`;
    }
  }

  return primaryHtml + resellerHtml;
}

// Strip any existing reward-note div from a brief_note string before
// appending a new one. Prevents duplicate blocks when a completion path
// is hit twice (e.g. checkOrder callback fires after an admin manually
// marked the order completed).
export function stripRewardNote(briefNote: string | null | undefined): string {
  const s = String(briefNote || "");
  return s
    .replace(/<div class="order-reward-note"[\s\S]*?<\/div>/g, "")
    .replace(/<div class="order-reseller-note"[\s\S]*?<\/div>/g, "")
    .trim();
}

export default buildRewardNoteHtml;
