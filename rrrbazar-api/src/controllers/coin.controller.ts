import Schema from '../models';
import express from 'express';
import responseUtils from '../utils/response.utils';

const { User, SiteSetting, CoinTransaction } = Schema;

async function getSettings() {
    let s = await SiteSetting.findOne();
    if (!s) s = await SiteSetting.create({});
    return s;
}

// Pull the seven configured day rewards into an array indexed 0..6 (day 1..7).
function rewardsArray(settings: any): number[] {
    return [
        Number(settings.day_1_reward) || 0,
        Number(settings.day_2_reward) || 0,
        Number(settings.day_3_reward) || 0,
        Number(settings.day_4_reward) || 0,
        Number(settings.day_5_reward) || 0,
        Number(settings.day_6_reward) || 0,
        Number(settings.day_7_reward) || 0,
    ];
}

// Streak rules:
//   - First-ever claim → day 1.
//   - Claim during the window [interval, 2 × interval) since last claim →
//     advance streak (wraps 7 → 1).
//   - Claim before `interval` elapsed → reject as "too soon".
//   - Claim more than 2 × interval since last claim → user broke the streak,
//     reset to day 1.
function streakState(user: any, settings: any) {
    const daily_claim_interval_hours = 24; // Hardcoded to 24 hours since it was removed from settings
    const intervalMs = daily_claim_interval_hours * 3600 * 1000;
    const last = user.last_coin_claim_at ? new Date(user.last_coin_claim_at).getTime() : 0;
    const now = Date.now();
    const prevStreak = Number(user.claim_streak) || 0;

    if (!last) {
        return {
            canClaim: true,
            nextStreakDay: 1,
            currentStreak: 0,
            nextClaimAt: new Date(now),
        };
    }

    const sinceLast = now - last;
    if (sinceLast < intervalMs) {
        return {
            canClaim: false,
            nextStreakDay: (prevStreak % 7) + 1,
            currentStreak: prevStreak,
            nextClaimAt: new Date(last + intervalMs),
        };
    }
    if (sinceLast >= 2 * intervalMs) {
        return { canClaim: true, nextStreakDay: 1, currentStreak: 0, nextClaimAt: new Date(now) };
    }
    return {
        canClaim: true,
        nextStreakDay: (prevStreak % 7) + 1,
        currentStreak: prevStreak,
        nextClaimAt: new Date(now),
    };
}

class CoinController {
    async myCoins(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        const user = await User.findByPk((req as any).user.id);
        if (!user) {
            response.status = 400;
            response.success = false;
            response.message = 'User not found';
            return res.status(400).send(response.response);
        }
        const settings = await getSettings();
        const rewards = rewardsArray(settings);
        const state = streakState(user, settings);
        const nextReward = rewards[state.nextStreakDay - 1] || 0;

        response.data = {
            coins: user.coins || 0,
            can_claim: state.canClaim,
            next_claim_at: state.nextClaimAt,
            current_streak: state.currentStreak,
            next_streak_day: state.nextStreakDay,
            next_reward: nextReward,
            rewards, // [day1, day2, ..., day7]
            coin_to_money_rate: settings.coin_to_money_rate,
            // Kept for backward compatibility with the /coins page button label:
            daily_claim_amount: nextReward,
        };
        res.send(response.response);
    }

    async claim(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        const user = await User.findByPk((req as any).user.id);
        if (!user) {
            response.status = 400;
            response.success = false;
            response.message = 'User not found';
            return res.status(400).send(response.response);
        }
        const settings = await getSettings();
        const state = streakState(user, settings);

        if (!state.canClaim) {
            response.status = 400;
            response.success = false;
            response.message = 'You have already claimed. Try again later.';
            return res.status(400).send(response.response);
        }

        const rewards = rewardsArray(settings);
        const day = state.nextStreakDay;
        const amount = rewards[day - 1] || 0;

        user.coins = (user.coins || 0) + amount;
        user.last_coin_claim_at = new Date();
        user.claim_streak = day;
        await user.save();

        await CoinTransaction.create({
            user_id: user.id,
            amount,
            type: 'claim',
            note: `Daily claim — Day ${day}`,
        });

        response.data = {
            coins: user.coins,
            claimed: amount,
            streak_day: day,
        };
        response.message = `+${amount} coins claimed (Day ${day})`;
        res.send(response.response);
    }

    async convert(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        const { amount } = req.body;
        const coinAmount = Number(amount || 0);
        if (!coinAmount || coinAmount <= 0) {
            response.status = 400;
            response.success = false;
            response.message = 'Invalid amount';
            return res.status(400).send(response.response);
        }
        const user = await User.findByPk((req as any).user.id);
        if (!user) {
            response.status = 400;
            response.success = false;
            response.message = 'User not found';
            return res.status(400).send(response.response);
        }
        const settings = await getSettings();
        // Admin-configured floor. 0 disables it so existing setups behave the
        // same. Check this before the balance check so the user sees the
        // limit error even when they have fewer coins than the minimum.
        const minConvert = Number((settings as any).min_convert_coins) || 0;
        if (minConvert > 0 && coinAmount < minConvert) {
            response.status = 400;
            response.success = false;
            response.message = `Minimum convert is ${minConvert} coins`;
            return res.status(400).send(response.response);
        }
        if ((user.coins || 0) < coinAmount) {
            response.status = 400;
            response.success = false;
            response.message = 'Not enough coins';
            return res.status(400).send(response.response);
        }
        const money = Number((coinAmount * settings.coin_to_money_rate).toFixed(2));
        if (money <= 0) {
            response.status = 400;
            response.success = false;
            response.message = 'Conversion amount too small';
            return res.status(400).send(response.response);
        }
        user.coins = Number(user.coins) - coinAmount;
        user.wallet = Number(user.wallet) + money;
        await user.save();

        await CoinTransaction.create({
            user_id: user.id,
            amount: -coinAmount,
            type: 'convert',
            note: `Converted to ${money} BDT wallet`,
        });

        response.data = { coins: user.coins, wallet: user.wallet, money };
        response.message = `Converted ${coinAmount} coins to ${money}`;
        res.send(response.response);
    }

    async history(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        const data = await CoinTransaction.findAll({
            where: { user_id: (req as any).user.id },
            order: [['id', 'DESC']],
            limit: 100,
        });
        response.data = data;
        res.send(response.response);
    }
}

export default new CoinController();
