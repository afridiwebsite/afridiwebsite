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
            day_1_reward,
            day_2_reward,
            day_3_reward,
            day_4_reward,
            day_5_reward,
            day_6_reward,
            day_7_reward,
        } = req.body;

        const settings = await getOrCreate();

        if (site_name !== undefined) settings.site_name = site_name;
        if (logo !== undefined) settings.logo = logo;
        if (primary_color !== undefined) settings.primary_color = primary_color;
        if (secondary_color !== undefined) settings.secondary_color = secondary_color;
        if (accent_color !== undefined) settings.accent_color = accent_color;
        if (coin_to_money_rate !== undefined) settings.coin_to_money_rate = coin_to_money_rate;
        if (day_1_reward !== undefined) settings.day_1_reward = Number(day_1_reward) || 0;
        if (day_2_reward !== undefined) settings.day_2_reward = Number(day_2_reward) || 0;
        if (day_3_reward !== undefined) settings.day_3_reward = Number(day_3_reward) || 0;
        if (day_4_reward !== undefined) settings.day_4_reward = Number(day_4_reward) || 0;
        if (day_5_reward !== undefined) settings.day_5_reward = Number(day_5_reward) || 0;
        if (day_6_reward !== undefined) settings.day_6_reward = Number(day_6_reward) || 0;
        if (day_7_reward !== undefined) settings.day_7_reward = Number(day_7_reward) || 0;

        await settings.save();
        response.data = settings;
        response.message = 'Settings updated';
        res.send(response.response);
    }
}

export default new SiteSettingController();
