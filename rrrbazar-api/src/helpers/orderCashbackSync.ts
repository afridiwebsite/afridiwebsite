import Schema from "../models";

const { Transaction, TopupPackage, User } = Schema;

// Stable purpose strings — used as the idempotency key (no `reference_id`
// column on Transaction, so we look the prior row up by purpose).
const cashbackPurpose = (orderId: number | string) => `Cashback #${orderId}`;
const cashbackRefundPurpose = (orderId: number | string) =>
  `Cashback refund #${orderId}`;
const resellerPurpose = (orderId: number | string) =>
  `Reseller cashback #${orderId}`;
const resellerRefundPurpose = (orderId: number | string) =>
  `Reseller cashback refund #${orderId}`;

/**
 * Reconcile package cashback (money reward) + reseller cashback against an
 * order's terminal status. Counterpart to syncOrderCoinsForStatus — same
 * idempotency rules, but credits BDT to user.wallet (and bumps
 * user.cashback_total) instead of coins.
 *
 * newStatus = "completed"
 *   → if package.reward_type === 'money' and package.cashback_amount > 0,
 *     credit `cashback_amount * multiplier` to user.wallet AND bump
 *     user.cashback_total. Idempotent on purpose=`Cashback #<order_id>`.
 *   → independently, if the user is a reseller and reseller_cashback > 0,
 *     credit `reseller_cashback * multiplier` to user.wallet AND bump
 *     user.cashback_total. Idempotent on purpose=`Reseller cashback
 *     #<order_id>`.
 *
 * newStatus = "cancel"
 *   → reverse each prior award (if any), writing matching `*_refund`
 *     transactions. user.wallet is floored at 0 to mirror the coin helper.
 *     user.cashback_total is *not* clawed back — it represents lifetime
 *     credited cashback, which matches how the storefront displays it.
 *
 * Multiplier mirrors the coin helper — when omitted we read `order.quantity`
 * (default 1) so quantity-enabled non-voucher orders pay per-unit cashback
 * on the deferred completion path (checkOrder webhook, admin manual
 * complete). The voucher branch still passes an explicit multiplier; it's
 * the same value persisted on the order so the two are equivalent.
 *
 * Never throws. Failures are logged so cashback bookkeeping never blocks
 * the calling endpoint.
 */
export async function syncOrderCashbackForStatus(
  order: any,
  newStatus: string,
  multiplier?: number,
): Promise<void> {
  const effectiveMultiplier =
    multiplier !== undefined
      ? multiplier
      : Math.max(1, Number(order?.quantity || 1));
  try {
    if (!order) return;
    const order_id = order.id;
    const user_id = order.user_id;
    const topuppackage_id = order.topuppackage_id;
    if (!order_id || !user_id || !topuppackage_id) return;

    const pkg = await TopupPackage.findByPk(topuppackage_id);
    if (!pkg) return;

    if (newStatus === "completed") {
      const user = await User.findByPk(user_id);
      if (!user) return;

      // --- Package cashback (only when reward_type === 'money') --------
      const rewardType = String((pkg as any).reward_type || "coin").toLowerCase();
      const cashback =
        rewardType === "money"
          ? Number((pkg as any).cashback_amount || 0) * Math.max(1, effectiveMultiplier)
          : 0;
      if (cashback > 0) {
        const already = await Transaction.findOne({
          where: { user_id, purpose: cashbackPurpose(order_id) },
        });
        if (!already) {
          user.wallet = Number(user.wallet || 0) + cashback;
          (user as any).cashback_total =
            Number((user as any).cashback_total || 0) + cashback;
          await user.save();
          await Transaction.create({
            user_id,
            amount: cashback,
            status: "completed",
            purpose: cashbackPurpose(order_id),
          });
        }
      }

      // --- Reseller cashback (regardless of reward_type) ---------------
      const isReseller =
        String((user as any).user_type || "").toLowerCase() === "reseller";
      const resellerCashback = isReseller
        ? Number((pkg as any).reseller_cashback || 0) * Math.max(1, effectiveMultiplier)
        : 0;
      if (resellerCashback > 0) {
        const already = await Transaction.findOne({
          where: { user_id, purpose: resellerPurpose(order_id) },
        });
        if (!already) {
          // Re-read to capture the wallet change above without overwriting it.
          const fresh = await User.findByPk(user_id);
          if (fresh) {
            fresh.wallet = Number(fresh.wallet || 0) + resellerCashback;
            (fresh as any).cashback_total =
              Number((fresh as any).cashback_total || 0) + resellerCashback;
            await fresh.save();
            await Transaction.create({
              user_id,
              amount: resellerCashback,
              status: "completed",
              purpose: resellerPurpose(order_id),
            });
          }
        }
      }
      return;
    }

    if (newStatus === "cancel") {
      // Reverse package cashback if we credited any.
      const priorCashback = await Transaction.findOne({
        where: { user_id, purpose: cashbackPurpose(order_id) },
      });
      if (priorCashback && Number(priorCashback.amount) > 0) {
        const priorReversal = await Transaction.findOne({
          where: { user_id, purpose: cashbackRefundPurpose(order_id) },
        });
        if (!priorReversal) {
          const user = await User.findByPk(user_id);
          if (user) {
            const amt = Number(priorCashback.amount);
            user.wallet = Math.max(0, Number(user.wallet || 0) - amt);
            await user.save();
            await Transaction.create({
              user_id,
              amount: amt,
              status: "completed",
              purpose: cashbackRefundPurpose(order_id),
            });
          }
        }
      }

      // Reverse reseller cashback (if any).
      const priorReseller = await Transaction.findOne({
        where: { user_id, purpose: resellerPurpose(order_id) },
      });
      if (priorReseller && Number(priorReseller.amount) > 0) {
        const priorReversal = await Transaction.findOne({
          where: { user_id, purpose: resellerRefundPurpose(order_id) },
        });
        if (!priorReversal) {
          const user = await User.findByPk(user_id);
          if (user) {
            const amt = Number(priorReseller.amount);
            user.wallet = Math.max(0, Number(user.wallet || 0) - amt);
            await user.save();
            await Transaction.create({
              user_id,
              amount: amt,
              status: "completed",
              purpose: resellerRefundPurpose(order_id),
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("[syncOrderCashbackForStatus] failed", {
      order_id: order?.id,
      newStatus,
      err: (e as any)?.message || e,
    });
  }
}

export default syncOrderCashbackForStatus;
