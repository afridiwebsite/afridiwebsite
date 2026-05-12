import Schema from '../models';
import express from 'express';
import responseUtils from '../utils/response.utils';

const { User, SiteSetting, CoinTransaction } = Schema;

async function getSettings() {
    let s = await SiteSetting.findOne();
    if (!s) s = await SiteSetting.create({});
    return s;
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
        const nextClaimAt = user.last_coin_claim_at
            ? new Date(new Date(user.last_coin_claim_at).getTime() + settings.daily_claim_interval_hours * 3600 * 1000)
            : new Date();
        const canClaim = !user.last_coin_claim_at || Date.now() >= nextClaimAt.getTime();

        response.data = {
            coins: user.coins || 0,
            can_claim: canClaim,
            next_claim_at: nextClaimAt,
            daily_claim_amount: settings.daily_claim_amount,
            coin_to_money_rate: settings.coin_to_money_rate,
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
        const intervalMs = settings.daily_claim_interval_hours * 3600 * 1000;
        if (user.last_coin_claim_at) {
            const nextOk = new Date(user.last_coin_claim_at).getTime() + intervalMs;
            if (Date.now() < nextOk) {
                response.status = 400;
                response.success = false;
                response.message = 'You have already claimed. Try again later.';
                return res.status(400).send(response.response);
            }
        }
        const amount = settings.daily_claim_amount;
        user.coins = (user.coins || 0) + amount;
        user.last_coin_claim_at = new Date();
        await user.save();

        await CoinTransaction.create({
            user_id: user.id,
            amount,
            type: 'claim',
            note: 'Daily claim',
        });
        response.data = { coins: user.coins, claimed: amount };
        response.message = `+${amount} coins claimed`;
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
        if ((user.coins || 0) < coinAmount) {
            response.status = 400;
            response.success = false;
            response.message = 'Not enough coins';
            return res.status(400).send(response.response);
        }
        const settings = await getSettings();
        const money = Math.floor(coinAmount * settings.coin_to_money_rate);
        if (money <= 0) {
            response.status = 400;
            response.success = false;
            response.message = 'Conversion amount too small';
            return res.status(400).send(response.response);
        }
        user.coins = user.coins - coinAmount;
        user.wallet = (user.wallet || 0) + money;
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
