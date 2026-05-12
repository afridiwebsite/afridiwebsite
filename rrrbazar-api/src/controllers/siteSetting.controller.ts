import Schema from '../models';
import express from 'express';
import responseUtils from '../utils/response.utils';

const { SiteSetting } = Schema;

async function getOrCreate() {
    let settings = await SiteSetting.findOne();
    if (!settings) {
        settings = await SiteSetting.create({});
    }
    return settings;
}

class SiteSettingController {
    async get(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        const settings = await getOrCreate();
        const reqPath = req.protocol + '://' + req.get('host');
        const json: any = settings.toJSON();
        json.logo_full_url = json.logo ? `${reqPath}/images/${json.logo}` : '';
        response.data = json;
        res.send(response.response);
    }

    async update(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        const {
            site_name,
            logo,
            primary_color,
            secondary_color,
            accent_color,
            coin_to_money_rate,
            daily_claim_amount,
            daily_claim_interval_hours,
        } = req.body;

        const settings = await getOrCreate();

        if (site_name !== undefined) settings.site_name = site_name;
        if (logo !== undefined) settings.logo = logo;
        if (primary_color !== undefined) settings.primary_color = primary_color;
        if (secondary_color !== undefined) settings.secondary_color = secondary_color;
        if (accent_color !== undefined) settings.accent_color = accent_color;
        if (coin_to_money_rate !== undefined) settings.coin_to_money_rate = coin_to_money_rate;
        if (daily_claim_amount !== undefined) settings.daily_claim_amount = daily_claim_amount;
        if (daily_claim_interval_hours !== undefined)
            settings.daily_claim_interval_hours = daily_claim_interval_hours;

        await settings.save();
        response.data = settings;
        response.message = 'Settings updated';
        res.send(response.response);
    }
}

export default new SiteSettingController();
