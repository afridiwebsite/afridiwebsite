import Schema from "../models";
import express from "express";
import responseUtils from "../utils/response.utils";
import { sendOtpSms } from "../helpers/smsProvider";

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
    const protocol =
      req.headers["x-forwarded-proto"]?.toString().split(",")[0] ||
      req.protocol;

    const reqPath = `${protocol}://${req.get("host")}`;
    const json: any = settings.toJSON();
    json.logo_full_url = json.logo ? `${reqPath}/images/${json.logo}` : "";
    json.favicon_full_url = json.favicon
      ? `${reqPath}/images/${json.favicon}`
      : "";
    json.wallet_pay_image_full_url = json.wallet_pay_image
      ? `${reqPath}/images/${json.wallet_pay_image}`
      : "";

    // The SMS credentials are admin-only — never leak them on the
    // public settings endpoint (consumed by the storefront). The admin
    // path mounts `auth` middleware before this handler, which
    // populates `req.admin`; absence of `req.admin` therefore means the
    // public route, in which case we strip the fields. With this guard
    // the admin SmsProvider page can hydrate its own saved values.
    if (!(req as any).admin) {
      delete json.sms_provider_url;
      delete json.sms_provider_api_key;
      delete json.sms_provider_sender_id;
      delete json.sms_message_template;
    }

    response.data = json;
    res.send(response.response);
  }

  async update(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    const {
      site_name,
      logo,
      favicon,
      primary_color,
      secondary_color,
      coin_to_money_rate,
      day_1_reward,
      day_2_reward,
      day_3_reward,
      day_4_reward,
      day_5_reward,
      day_6_reward,
      day_7_reward,
      spin_cost_coins,
      spin_daily_limit,
      support_email,
      telegram_number,
      telegram_support_number,
      youtube_link,
      wallet_pay_image,
      min_convert_coins,
      verification_enabled,
    } = req.body;

    const settings = await getOrCreate();

    if (site_name !== undefined) settings.site_name = site_name;
    if (logo !== undefined) settings.logo = logo;
    if (favicon !== undefined) settings.favicon = favicon;
    if (primary_color !== undefined) settings.primary_color = primary_color;
    if (secondary_color !== undefined)
      settings.secondary_color = secondary_color;
    if (coin_to_money_rate !== undefined)
      settings.coin_to_money_rate = coin_to_money_rate;
    if (day_1_reward !== undefined)
      settings.day_1_reward = Number(day_1_reward) || 0;
    if (day_2_reward !== undefined)
      settings.day_2_reward = Number(day_2_reward) || 0;
    if (day_3_reward !== undefined)
      settings.day_3_reward = Number(day_3_reward) || 0;
    if (day_4_reward !== undefined)
      settings.day_4_reward = Number(day_4_reward) || 0;
    if (day_5_reward !== undefined)
      settings.day_5_reward = Number(day_5_reward) || 0;
    if (day_6_reward !== undefined)
      settings.day_6_reward = Number(day_6_reward) || 0;
    if (day_7_reward !== undefined)
      settings.day_7_reward = Number(day_7_reward) || 0;
    if (spin_cost_coins !== undefined)
      settings.spin_cost_coins = Number(spin_cost_coins) || 0;
    if (spin_daily_limit !== undefined)
      settings.spin_daily_limit = Number(spin_daily_limit) || 0;
    if (support_email !== undefined)
      settings.support_email = String(support_email || "").trim();
    if (telegram_number !== undefined)
      settings.telegram_number = String(telegram_number || "").trim();
    if (telegram_support_number !== undefined)
      settings.telegram_support_number = String(
        telegram_support_number || "",
      ).trim();
    if (youtube_link !== undefined)
      settings.youtube_link = String(youtube_link || "").trim();
    if (wallet_pay_image !== undefined)
      settings.wallet_pay_image = String(wallet_pay_image || "").trim();
    if (min_convert_coins !== undefined)
      settings.min_convert_coins = Math.max(0, Number(min_convert_coins) || 0);
    if (verification_enabled !== undefined)
      settings.verification_enabled = verification_enabled == 1 ? 1 : 0;

    await settings.save();
    response.data = settings;
    response.message = "Settings updated";
    res.send(response.response);
  }

  // Dedicated endpoint for the SMS / OTP provider config page. Kept
  // separate from the omnibus update above so the SMS page can save
  // without round-tripping the whole settings payload — and so a future
  // permissions check (e.g. only super-admins can edit the gateway)
  // has one obvious place to land.
  async updateSmsProvider(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    const {
      sms_provider_url,
      sms_provider_api_key,
      sms_provider_sender_id,
      sms_message_template,
    } = req.body;

    const settings = await getOrCreate();
    if (sms_provider_url !== undefined)
      settings.sms_provider_url = String(sms_provider_url || "").trim().slice(0, 512);
    if (sms_provider_api_key !== undefined)
      settings.sms_provider_api_key = String(sms_provider_api_key || "").trim().slice(0, 255);
    if (sms_provider_sender_id !== undefined)
      settings.sms_provider_sender_id = String(sms_provider_sender_id || "").trim().slice(0, 64);
    if (sms_message_template !== undefined)
      settings.sms_message_template = String(sms_message_template || "").trim().slice(0, 255);

    await settings.save();
    response.message = "SMS provider settings updated";
    // Don't echo the API key back — the page already has it in state from
    // the GET, and avoiding round-trip echoes makes audit logs cleaner.
    response.data = {
      sms_provider_url: settings.sms_provider_url,
      sms_provider_sender_id: settings.sms_provider_sender_id,
      sms_message_template: settings.sms_message_template,
    };
    res.send(response.response);
  }

  // Test-send endpoint for the SMS provider page. Fires a single SMS to
  // the admin-supplied number using whatever credentials are currently
  // saved, so they can verify the gateway works before any user-facing
  // OTP flow exists. Returns the gateway response body so the admin can
  // see what the upstream said.
  async testSmsProvider(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const { phone, message } = req.body;
      const trimmedPhone = String(phone || "").trim();
      if (!trimmedPhone) {
        response.success = false;
        response.status = 400;
        response.message = "Phone number is required for a test send.";
        return res.status(400).send(response.response);
      }
      const settings = await getOrCreate();
      const result = await sendOtpSms({
        phone: trimmedPhone,
        message:
          String(message || "").trim() ||
          "Test SMS from your topup admin panel.",
        providerUrl: settings.sms_provider_url,
        apiKey: settings.sms_provider_api_key,
        senderId: settings.sms_provider_sender_id,
      });
      if (!result.ok) {
        response.success = false;
        response.status = 502;
        response.message = result.error || "SMS gateway rejected the request.";
        response.data = { upstream: result.body };
        return res.status(502).send(response.response);
      }
      response.message = "Test SMS sent — check the recipient phone.";
      response.data = { upstream: result.body };
      res.send(response.response);
    } catch (err: any) {
      console.error("[siteSetting.testSmsProvider] failed", err);
      response.success = false;
      response.status = 500;
      response.message = err?.message || "SMS test send failed.";
      res.status(500).send(response.response);
    }
  }
}

export default new SiteSettingController();
