import Schema from '../models';
import express from 'express';
import { Op } from 'sequelize';
import responseUtils from '../utils/response.utils';

const { User, SiteSetting, SpinReward, SpinResult, CoinTransaction } = Schema;

async function getSettings() {
    let s = await SiteSetting.findOne();
    if (!s) s = await SiteSetting.create({});
    return s;
}

// Build the list of active rewards, ordered by serial (the same order the
// wheel will render in). Stable order matters: the server returns the index
// of the winning segment so the client can animate to it.
async function activeRewards() {
    return SpinReward.findAll({
        where: { is_active: 1 },
        order: [
            ['serial', 'ASC'],
            ['id', 'ASC'],
        ],
    });
}

// Weighted random pick → returns { rewardIndex, reward }.
function weightedPick(rewards: any[]) {
    const total = rewards.reduce((acc, r) => acc + (Number(r.weight) || 0), 0);
    if (total <= 0) {
        const i = Math.floor(Math.random() * rewards.length);
        return { rewardIndex: i, reward: rewards[i] };
    }
    let roll = Math.random() * total;
    for (let i = 0; i < rewards.length; i++) {
        roll -= Number(rewards[i].weight) || 0;
        if (roll <= 0) return { rewardIndex: i, reward: rewards[i] };
    }
    const last = rewards.length - 1;
    return { rewardIndex: last, reward: rewards[last] };
}

class SpinController {
    // Public-ish endpoint: returns wheel rewards + per-user spin state
    // (cost, remaining-spins-today, coin balance) so the client can render
    // the whole page in one round trip.
    async overview(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        try {
            const settings = await getSettings();
            const rewards = await activeRewards();

            let coins = 0;
            let spinsToday = 0;
            let freeSpins = 0;
            const userId = (req as any).user?.id;
            if (userId) {
                const user = await User.findByPk(userId);
                coins = user?.coins || 0;
                freeSpins = Number((user as any)?.spin_free_count) || 0;
                const since = new Date(Date.now() - 24 * 3600 * 1000);
                // Free spins (granted by try-again) don't count toward the
                // daily quota — filter them out of the rolling 24h count.
                spinsToday = await SpinResult.count({
                    where: {
                        user_id: userId,
                        created_at: { [Op.gte]: since },
                        is_free: 0,
                    },
                });
            }

            response.data = {
                rewards: rewards.map((r: any, i: number) => ({
                    index: i,
                    id: r.id,
                    label: r.label,
                    type: r.type,
                    amount: r.amount,
                    color: r.color,
                    icon: r.icon,
                    try_again_count: r.try_again_count,
                })),
                cost: Number(settings.spin_cost_coins) || 0,
                daily_limit: Number(settings.spin_daily_limit) || 0,
                spins_today: spinsToday,
                free_spins: freeSpins,
                coins,
                coin_to_money_rate: Number(settings.coin_to_money_rate) || 0,
            };
            res.send(response.response);
        } catch (e) {
            console.log(e);
            response.status = 400;
            response.success = false;
            response.message = 'Could not load spin overview';
            return res.status(400).send(response.response);
        }
    }

    async spin(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        try {
            const userId = (req as any).user.id;
            const user = await User.findByPk(userId);
            if (!user) {
                response.status = 400;
                response.success = false;
                response.message = 'User not found';
                return res.status(400).send(response.response);
            }

            const settings = await getSettings();
            const rewards = await activeRewards();
            if (rewards.length === 0) {
                response.status = 400;
                response.success = false;
                response.message = 'No rewards configured yet — ask an admin to add some.';
                return res.status(400).send(response.response);
            }

            const cost = Number(settings.spin_cost_coins) || 0;
            const limit = Number(settings.spin_daily_limit) || 0;

            // If the user has free spins banked from a previous try-again,
            // this spin runs free: no cost deducted, doesn't count toward
            // the daily limit, no daily-limit check at all.
            const freeSpinsAvailable =
                Number((user as any).spin_free_count) || 0;
            const usingBankedFree = freeSpinsAvailable > 0;

            if (!usingBankedFree && limit > 0) {
                const since = new Date(Date.now() - 24 * 3600 * 1000);
                const spinsToday = await SpinResult.count({
                    where: {
                        user_id: userId,
                        created_at: { [Op.gte]: since },
                        is_free: 0,
                    },
                });
                if (spinsToday >= limit) {
                    response.status = 400;
                    response.success = false;
                    response.message = `Daily spin limit reached (${limit}). Try again tomorrow.`;
                    return res.status(400).send(response.response);
                }
            }

            if (!usingBankedFree && cost > 0 && (user.coins || 0) < cost) {
                response.status = 400;
                response.success = false;
                response.message = `Not enough coins — need ${cost} to spin.`;
                return res.status(400).send(response.response);
            }

            // Banked free spin → just decrement the counter, no charge.
            // Otherwise → deduct cost (if any) before picking, so failure
            // modes are easier to reason about (no half-applied state).
            let costApplied = 0;
            if (usingBankedFree) {
                (user as any).spin_free_count = freeSpinsAvailable - 1;
                await user.save();
            } else if (cost > 0) {
                user.coins = (user.coins || 0) - cost;
                costApplied = cost;
                await user.save();
                await CoinTransaction.create({
                    user_id: user.id,
                    amount: -cost,
                    type: 'spin_cost',
                    note: 'Spin entry cost',
                });
            }

            const { rewardIndex, reward } = weightedPick(rewards);
            // `is_free` on the resulting row tracks whether this spin
            // consumed a try. Banked free spins always count as free; a
            // paid spin that lands on try-again also flips this on (and
            // refunds the cost) so the user truly doesn't lose the try.
            let isFreeOutcome = usingBankedFree;

            // Apply reward by type. Defaults to 'coin' so admins can add new
            // types in the DB without an immediate code change (those just
            // record a SpinResult row and the frontend can decide how to
            // surface them).
            let appliedAmount = Number(reward.amount) || 0;
            const note = `Spin won: ${reward.label}`;
            if (reward.type === 'coin' && appliedAmount > 0) {
                user.coins = (user.coins || 0) + appliedAmount;
                await user.save();
                await CoinTransaction.create({
                    user_id: user.id,
                    amount: appliedAmount,
                    type: 'spin',
                    note,
                });
            } else if (reward.type === 'wallet' && appliedAmount > 0) {
                user.wallet = Number(user.wallet || 0) + appliedAmount;
                await user.save();
            } else if (reward.type === 'try_again') {
                // Refund the cost (if we just deducted one) and grant any
                // extra free spins configured on the reward.
                isFreeOutcome = true;
                if (costApplied > 0) {
                    user.coins = (user.coins || 0) + costApplied;
                    await CoinTransaction.create({
                        user_id: user.id,
                        amount: costApplied,
                        type: 'spin_refund',
                        note: `Refund — landed on ${reward.label}`,
                    });
                }
                const grant = Math.max(
                    0,
                    Number((reward as any).try_again_count) || 0,
                );
                if (grant > 0) {
                    (user as any).spin_free_count =
                        (Number((user as any).spin_free_count) || 0) + grant;
                }
                await user.save();
                appliedAmount = 0;
            } else {
                // Unknown / legacy 'none' — just log the result.
                appliedAmount = 0;
            }

            await SpinResult.create({
                user_id: user.id,
                spin_reward_id: reward.id,
                type: reward.type,
                amount: appliedAmount,
                label: reward.label,
                note,
                is_free: isFreeOutcome ? 1 : 0,
            });

            response.data = {
                reward_index: rewardIndex,
                reward: {
                    id: reward.id,
                    label: reward.label,
                    type: reward.type,
                    amount: appliedAmount,
                    color: reward.color,
                    icon: reward.icon,
                    try_again_count: (reward as any).try_again_count,
                },
                coins: user.coins,
                wallet: user.wallet,
                free_spins: Number((user as any).spin_free_count) || 0,
                is_free: isFreeOutcome,
            };
            response.message =
                reward.type === 'try_again'
                    ? `Try again! ${
                          Number((reward as any).try_again_count) > 0
                              ? `+${(reward as any).try_again_count} free spin(s)`
                              : ''
                      }`.trim()
                    : appliedAmount > 0
                      ? `You won ${reward.label}!`
                      : `Result: ${reward.label}`;
            res.send(response.response);
        } catch (e) {
            console.log(e);
            response.status = 400;
            response.success = false;
            response.message = 'Spin failed';
            return res.status(400).send(response.response);
        }
    }

    // Personal spin history — scoped to the requesting user.
    async history(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        try {
            const data = await SpinResult.findAll({
                where: { user_id: (req as any).user.id },
                order: [['id', 'DESC']],
                limit: 10,
            });
            response.data = data;
            res.send(response.response);
        } catch (e) {
            console.log(e);
            response.status = 400;
            response.success = false;
            response.message = 'Could not load spin history';
            return res.status(400).send(response.response);
        }
    }

    // Global feed — every user's recent spins. Joined with the User row so
    // the storefront can show the player's name. Lightweight projection,
    // never returns email/phone/etc.
    async globalHistory(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        try {
            const rows = await SpinResult.findAll({
                order: [['id', 'DESC']],
                limit: 10,
                raw: true,
            });
            const userIds = Array.from(
                new Set((rows as any[]).map((r) => r.user_id).filter(Boolean)),
            );
            const users = userIds.length
                ? await User.findAll({
                      where: { id: userIds },
                      attributes: ['id', 'username', 'email', 'avatar'],
                      raw: true,
                  })
                : [];
            const userById = new Map((users as any[]).map((u) => [u.id, u]));
            response.data = (rows as any[]).map((r) => {
                const u = userById.get(r.user_id);
                const displayName =
                    u?.username ||
                    (u?.email ? String(u.email).split('@')[0] : 'Anonymous Player');
                return {
                    id: r.id,
                    user_id: r.user_id,
                    player_name: displayName,
                    avatar: u?.avatar || null,
                    label: r.label,
                    type: r.type,
                    amount: r.amount,
                    note: r.note,
                    created_at: r.created_at,
                };
            });
            res.send(response.response);
        } catch (e) {
            console.log(e);
            response.status = 400;
            response.success = false;
            response.message = 'Could not load global spin history';
            return res.status(400).send(response.response);
        }
    }

    // ---- Admin CRUD ----
    async adminList(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        const rewards = await SpinReward.findAll({
            order: [['serial', 'ASC'], ['id', 'ASC']],
        });
        response.data = rewards;
        res.send(response.response);
    }

    async adminCreate(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        const { label, type, amount, weight, color, icon, is_active, serial, try_again_count } = req.body;
        if (!label) {
            response.status = 400;
            response.success = false;
            response.message = 'Label is required';
            return res.status(400).send(response.response);
        }
        const resolvedType = type || 'coin';
        const r = await SpinReward.create({
            label,
            type: resolvedType,
            amount: Number(amount) || 0,
            weight: Number(weight) || 1,
            color: color || null,
            icon: icon || null,
            is_active: is_active === 0 ? 0 : 1,
            serial: Number(serial) || 0,
            // try_again_count is only meaningful for type='try_again'; force
            // 0 on every other type so admins can't accidentally arm a
            // bonus-spin grant on a coin reward.
            try_again_count:
                resolvedType === 'try_again'
                    ? Math.max(0, Number(try_again_count) || 0)
                    : 0,
        });
        response.data = r;
        response.message = 'Reward created';
        res.send(response.response);
    }

    async adminUpdate(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        const id = req.params.id;
        const r = await SpinReward.findByPk(id);
        if (!r) {
            response.status = 400;
            response.success = false;
            response.message = 'Reward not found';
            return res.status(400).send(response.response);
        }
        const { label, type, amount, weight, color, icon, is_active, serial, try_again_count } = req.body;
        if (label !== undefined) r.label = label;
        if (type !== undefined) r.type = type;
        if (amount !== undefined) r.amount = Number(amount) || 0;
        if (weight !== undefined) r.weight = Number(weight) || 1;
        if (color !== undefined) r.color = color || null;
        if (icon !== undefined) r.icon = icon || null;
        if (is_active !== undefined) r.is_active = is_active ? 1 : 0;
        if (serial !== undefined) r.serial = Number(serial) || 0;
        // Keep try_again_count consistent with the type — clamp to 0 for
        // anything else so a leftover non-zero value can't grant free spins
        // on a coin/wallet reward.
        if (r.type === 'try_again') {
            if (try_again_count !== undefined) {
                (r as any).try_again_count = Math.max(
                    0,
                    Number(try_again_count) || 0,
                );
            }
        } else {
            (r as any).try_again_count = 0;
        }
        await r.save();
        response.data = r;
        response.message = 'Reward updated';
        res.send(response.response);
    }

    async adminDelete(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        await SpinReward.destroy({ where: { id: req.params.id } });
        response.message = 'Reward deleted';
        res.send(response.response);
    }
}

export default new SpinController();
