import { Op } from "sequelize";
import Schema from "../models";

const { Order, User, TopupProduct, BotDispatch, Voucher } = Schema;

/**
 * Work out how much of an order is still refundable, as a fraction of the
 * whole, from its BotDispatch rows. Multi-dispatch bot types (shell-bot,
 * uc-bot) fan an order out into one dispatch per tag / voucher, and a
 * cancel can land after some of those already delivered — refunding the
 * full amount would hand the customer money back for value they kept.
 *
 *   - No dispatch rows (legacy orders, type=2 UniPin, pool-exhausted
 *     orders) → fraction 1 (full refund), preserving prior behaviour.
 *   - Single-dispatch bots (like-bot, pubg-bot) → on cancel the one
 *     dispatch is non-success, so fraction is 1 (full refund) as before.
 *   - A dispatch counts as DELIVERED when its status is "success", OR the
 *     upstream reported the voucher as consumed/already-used (a code the
 *     customer received even though the dispatch row shows cancelled/
 *     failed), OR its linked voucher is already flagged consumed
 *     (is_used = 2).
 *
 * The consumed-code check mirrors checkOrder's CONSUMED_PATTERNS and reads
 * the dispatch row's reason directly, because checkOrder flips the voucher
 * to is_used = 2 only AFTER the refund runs — relying on the flag alone
 * here would miss a just-consumed code and wrongly refund it.
 */
const CONSUMED_PATTERNS = [
  /Failed to create order in unipin-orders table/i,
  /Consumed Voucher/i,
  /Already Used/i,
];

async function undeliveredFraction(orderId: number): Promise<number> {
  const dispatches = await BotDispatch.findAll({
    where: { order_id: orderId },
  });
  const total = dispatches.length;
  if (total === 0) return 1;

  let delivered = 0;
  for (const d of dispatches as any[]) {
    if (String(d.status) === "success") {
      delivered += 1;
      continue;
    }
    const reason = String(d.error_reason || d.response_content || "");
    if (CONSUMED_PATTERNS.some((p) => p.test(reason))) {
      delivered += 1;
      continue;
    }
    if (d.voucher_id) {
      const v = await Voucher.findByPk(d.voucher_id);
      if (v && Number((v as any).is_used) === 2) delivered += 1;
    }
  }
  const undelivered = Math.max(0, total - delivered);
  return undelivered / total;
}

/**
 * Idempotently refund a cancelled order's amount back to the user's wallet
 * (and restore the product's bprice).
 *
 * WHY THIS EXISTS — the multi-dispatch double-refund bug:
 * Multi-dispatch bot types (shell-bot, uc-bot) fan an order out into one
 * BotDispatch row per tag / voucher, and each dispatch produces its own
 * `/check_order` callback. The old refund guard read `order.status` into
 * memory at the top of each callback and only refunded when that snapshot
 * wasn't already "cancel". Two callbacks for the same order landing together
 * both read the pre-cancel status, both flip the order to "cancel", and both
 * credit the wallet — so a single charge was refunded N times. Shell orders
 * hit this routinely because they're the bot type that always fans out.
 *
 * The guard here is a single conditional UPDATE that flips orders.refunded
 * false→true. Only the caller that wins that race (affected === 1) performs
 * the wallet/product credit; every duplicate / concurrent caller no-ops.
 * The wallet and product credits use atomic SQL increments so concurrent
 * writers can't lose updates either.
 *
 * Only the UNDELIVERED portion of the order is refunded (see
 * undeliveredFraction) so a partially-fulfilled multi-dispatch order
 * doesn't hand back money for codes/tags the customer already received.
 *
 * Returns true when THIS call performed the refund, false when it was
 * already refunded (or the order/user is missing). Never throws — refund
 * bookkeeping must not crash the calling endpoint.
 */
export default async function refundOrderOnce(orderOrId: any): Promise<boolean> {
  try {
    const orderId =
      typeof orderOrId === "object" && orderOrId !== null
        ? Number((orderOrId as any).id)
        : Number(orderOrId);
    if (!orderId) return false;

    // Atomic claim: exactly one concurrent caller flips refunded false→true.
    // Legacy rows may carry NULL (column added after they were created), so
    // treat NULL the same as "not yet refunded".
    const [affected] = await Order.update(
      { refunded: true } as any,
      {
        where: {
          id: orderId,
          [Op.or]: [{ refunded: false }, { refunded: { [Op.is]: null } }],
        } as any,
      },
    );
    if (!affected) return false;

    const order = await Order.findByPk(orderId);
    if (!order) return false;

    // Refund only what wasn't delivered.
    const fraction = await undeliveredFraction(orderId);
    if (fraction <= 0) return true; // fully delivered — nothing to refund

    const amount = Math.round((Number((order as any).amount) || 0) * fraction);
    if (amount > 0 && (order as any).user_id) {
      const user = await User.findByPk((order as any).user_id);
      if (user) await (user as any).increment("wallet", { by: amount });
    }

    const bprice =
      parseFloat(String((order as any).bprice || "0")) * fraction;
    if (Number.isFinite(bprice) && bprice > 0 && (order as any).product_id) {
      const product = await TopupProduct.findByPk((order as any).product_id);
      if (product) await (product as any).increment("price", { by: bprice });
    }
    return true;
  } catch (e) {
    console.error("[refundOrderOnce] failed", {
      order: typeof orderOrId === "object" ? orderOrId?.id : orderOrId,
      err: (e as any)?.message || e,
    });
    return false;
  }
}

/**
 * Reverse a prior refund — re-debit the user's wallet and re-consume the
 * product bprice. Used when an order that was cancelled+refunded later
 * resolves to "completed" (e.g. a PUBG poll succeeds after a transient
 * failure). Idempotent counterpart to refundOrderOnce: claims the
 * refunded true→false transition so a doubled success callback can't
 * re-debit twice. Wallet is floored at 0 so a re-debit can't drive a
 * balance negative if the user already spent the refund elsewhere.
 *
 * Re-debits the FULL amount. This only runs on the PUBG retry path, which
 * is single-dispatch — its cancel always refunded the full amount (nothing
 * was delivered), so reversing the full amount is exact. Partial refunds
 * only arise for multi-dispatch bots (shell/uc), which never hit this path.
 *
 * Returns true when THIS call performed the re-debit, false otherwise.
 */
export async function reverseRefundOnce(orderOrId: any): Promise<boolean> {
  try {
    const orderId =
      typeof orderOrId === "object" && orderOrId !== null
        ? Number((orderOrId as any).id)
        : Number(orderOrId);
    if (!orderId) return false;

    const [affected] = await Order.update(
      { refunded: false } as any,
      { where: { id: orderId, refunded: true } as any },
    );
    if (!affected) return false;

    const order = await Order.findByPk(orderId);
    if (!order) return false;

    const amount = Number((order as any).amount) || 0;
    if (amount > 0 && (order as any).user_id) {
      const user = await User.findByPk((order as any).user_id);
      if (user) {
        (user as any).wallet = Math.max(0, Number((user as any).wallet) - amount);
        await user.save();
      }
    }

    const bprice = parseFloat(String((order as any).bprice || "0"));
    if (Number.isFinite(bprice) && bprice > 0 && (order as any).product_id) {
      const product = await TopupProduct.findByPk((order as any).product_id);
      if (product) {
        (product as any).price = Number((product as any).price) - bprice;
        await product.save();
      }
    }
    return true;
  } catch (e) {
    console.error("[reverseRefundOnce] failed", {
      order: typeof orderOrId === "object" ? orderOrId?.id : orderOrId,
      err: (e as any)?.message || e,
    });
    return false;
  }
}
