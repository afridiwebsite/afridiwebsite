import Schema from "../models";

const { CoinTransaction, TopupPackage, User } = Schema;

/**
 * Reconcile coin rewards against an order's terminal status.
 *
 * Behavior:
 *   newStatus = "completed"
 *     → award the package's `coin_value` to the order's user, once. Writes a
 *       CoinTransaction row of type "purchase" keyed by `reference_id = order.id`.
 *       If a matching purchase row already exists (e.g. the voucher branch
 *       awarded inline, or this call ran before), do nothing.
 *
 *   newStatus = "cancel"
 *     → if a prior purchase reward exists and hasn't been reversed yet, deduct
 *       the same amount from the user's `coins` (floored at 0) and write a
 *       compensating "refund" CoinTransaction so admins can audit the trail.
 *
 * Any other status is a no-op. The function never throws — coin sync should
 * never block the calling endpoint; problems are logged for manual reconciliation.
 *
 * `multiplier` lets the voucher branch credit per-unit (qty × coin_value); the
 * default of 1 fits every other completion path (auto-delivery, regular bot,
 * type=2 immediate complete, admin manual complete).
 */
export async function syncOrderCoinsForStatus(
  order: any,
  newStatus: string,
  multiplier: number = 1,
): Promise<void> {
  console.log("[syncOrderCoinsForStatus] called", {
    order_id: order?.id,
    newStatus,
    multiplier,
    topuppackage_id: order?.topuppackage_id,
    user_id: order?.user_id,
  });
  try {
    if (!order) {
      console.warn("[syncOrderCoinsForStatus] no order — skipping");
      return;
    }
    const topuppackage_id = order.topuppackage_id;
    const user_id = order.user_id;
    if (!topuppackage_id || !user_id) {
      console.warn(
        "[syncOrderCoinsForStatus] missing topuppackage_id or user_id — skipping",
        { order_id: order.id, topuppackage_id, user_id },
      );
      return;
    }

    if (newStatus === "completed") {
      const existingAward = await CoinTransaction.findOne({
        where: { reference_id: order.id, type: "purchase" },
      });
      if (existingAward) {
        console.log(
          "[syncOrderCoinsForStatus][completed] already credited — skipping",
          {
            order_id: order.id,
            existing_amount: existingAward.amount,
            existing_tx_id: existingAward.id,
          },
        );
        return; // already credited (e.g. voucher branch)
      }

      const pkg = await TopupPackage.findByPk(topuppackage_id);
      if (!pkg) {
        console.warn(
          "[syncOrderCoinsForStatus][completed] topup package not found — skipping",
          { order_id: order.id, topuppackage_id },
        );
        return;
      }
      const coinReward = Number(pkg.coin_value || 0) * Math.max(1, multiplier);
      console.log("[syncOrderCoinsForStatus][completed] resolved reward", {
        order_id: order.id,
        package_id: pkg.id,
        package_name: pkg.name,
        coin_value: pkg.coin_value,
        multiplier,
        coinReward,
      });
      if (coinReward <= 0) {
        console.log(
          "[syncOrderCoinsForStatus][completed] reward is 0 — nothing to credit",
          { order_id: order.id, coin_value: pkg.coin_value },
        );
        return;
      }

      const user = await User.findByPk(user_id);
      if (!user) {
        console.warn(
          "[syncOrderCoinsForStatus][completed] user not found — skipping",
          { order_id: order.id, user_id },
        );
        return;
      }
      const before = user.coins || 0;
      user.coins = before + coinReward;
      await user.save();
      const tx = await CoinTransaction.create({
        user_id: user.id,
        amount: coinReward,
        type: "purchase",
        note: `Order #${order.id} (${pkg.name})`,
        reference_id: order.id,
      });
      console.log("[syncOrderCoinsForStatus][completed] credited", {
        order_id: order.id,
        user_id: user.id,
        coins_before: before,
        coins_after: user.coins,
        coin_tx_id: tx.id,
      });
      return;
    }

    if (newStatus === "cancel") {
      const priorAward = await CoinTransaction.findOne({
        where: { reference_id: order.id, type: "purchase" },
      });
      if (!priorAward || Number(priorAward.amount) <= 0) {
        console.log(
          "[syncOrderCoinsForStatus][cancel] no prior award to reverse — skipping",
          { order_id: order.id, has_prior: !!priorAward },
        );
        return;
      }

      const priorReversal = await CoinTransaction.findOne({
        where: { reference_id: order.id, type: "refund" },
      });
      if (priorReversal) {
        console.log(
          "[syncOrderCoinsForStatus][cancel] already reversed — skipping",
          { order_id: order.id, reversal_tx_id: priorReversal.id },
        );
        return; // already reversed
      }

      const user = await User.findByPk(user_id);
      if (!user) {
        console.warn(
          "[syncOrderCoinsForStatus][cancel] user not found — skipping",
          { order_id: order.id, user_id },
        );
        return;
      }
      const reward = Number(priorAward.amount);
      const before = user.coins || 0;
      user.coins = Math.max(0, before - reward);
      await user.save();
      const tx = await CoinTransaction.create({
        user_id: user.id,
        amount: -reward,
        type: "refund",
        note: `Order #${order.id} cancelled — coin reward reversed`,
        reference_id: order.id,
      });
      console.log("[syncOrderCoinsForStatus][cancel] reversed", {
        order_id: order.id,
        user_id: user.id,
        reward_reversed: reward,
        coins_before: before,
        coins_after: user.coins,
        refund_tx_id: tx.id,
      });
      return;
    }

    console.log(
      "[syncOrderCoinsForStatus] status not actionable — skipping",
      { order_id: order.id, newStatus },
    );
  } catch (e) {
    console.error("[syncOrderCoinsForStatus] failed", {
      order_id: order?.id,
      newStatus,
      err: (e as any)?.message || e,
      stack: (e as any)?.stack,
    });
  }
}

export default syncOrderCoinsForStatus;
