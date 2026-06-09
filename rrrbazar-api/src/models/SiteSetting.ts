const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'

export default (sequelize: Sequelize) => {
    class SiteSetting extends Model {
        public id!: number;
        public site_name!: string;
        public logo!: string;
        public favicon!: string;
        public primary_color!: string;
        public secondary_color!: string;
        public coin_to_money_rate!: number;
        public day_1_reward!: number;
        public day_2_reward!: number;
        public day_3_reward!: number;
        public day_4_reward!: number;
        public day_5_reward!: number;
        public day_6_reward!: number;
        public day_7_reward!: number;
        public spin_cost_coins!: number;
        public spin_daily_limit!: number;
        public support_email!: string;
        public telegram_number!: string;
        public telegram_support_number!: string;
        public youtube_link!: string;
        // Image shown on the "Wallet Pay" tile on the topup payment picker.
        // Stored as the upload-relative filename; the controller appends the
        // public path on read.
        public wallet_pay_image!: string;
        // Minimum coins a user can convert to wallet balance in a single call.
        // 0 (the default) disables the floor.
        public min_convert_coins!: number;
        // KYC verification master switch (migration 010). When 0 the whole
        // verification UX is invisible — storefront page hides, profile tag
        // hides, order-block never fires — regardless of what's already in
        // the verification_submissions table.
        public verification_enabled!: number;
        // SMS gateway config for the OTP step. URL + key + sender are
        // exposed on a dedicated admin page so the gateway can be swapped
        // without code changes. `sms_message_template` may contain {code}
        // and {minutes} placeholders.
        public sms_provider_url!: string;
        public sms_provider_username!: string;
        public sms_provider_api_key!: string;
        public sms_provider_sender_id!: string;
        public sms_message_template!: string;
    }

    SiteSetting.init({
        site_name: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: 'TopupMan'
        },
        logo: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: ''
        },
        favicon: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: ''
        },
        primary_color: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: '#2563eb'
        },
        secondary_color: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: '#1e40af'
        },
        coin_to_money_rate: {
            type: DataTypes.DOUBLE,
            allowNull: true,
            defaultValue: 0.01
        },
        day_1_reward: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 2 },
        day_2_reward: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 4 },
        day_3_reward: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 6 },
        day_4_reward: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 8 },
        day_5_reward: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 10 },
        day_6_reward: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 12 },
        day_7_reward: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 14 },
        spin_cost_coins:  { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
        spin_daily_limit: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
        support_email:    { type: DataTypes.STRING, allowNull: true, defaultValue: '' },
        // Telegram contact — admin enters either a phone (with country code,
        // e.g. +8801234567890) or a username. The client builds the t.me link.
        // `telegram_number` is the channel/group; `telegram_support_number`
        // is the dedicated 1:1 support contact surfaced in the footer.
        telegram_number:         { type: DataTypes.STRING, allowNull: true, defaultValue: '' },
        telegram_support_number: { type: DataTypes.STRING, allowNull: true, defaultValue: '' },
        youtube_link:     { type: DataTypes.STRING, allowNull: true, defaultValue: '' },
        wallet_pay_image: { type: DataTypes.STRING, allowNull: true, defaultValue: '' },
        min_convert_coins: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
        verification_enabled: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
        sms_provider_url: {
            type: DataTypes.STRING(512),
            allowNull: false,
            defaultValue: 'https://api.mimsms.com/api/SmsSending/SMS',
        },
        // MiMSMS (and similar JSON gateways) authenticate the account with a
        // username/login alongside the API key. Configurable so we never
        // hard-code a specific account in the provider helper.
        sms_provider_username:  { type: DataTypes.STRING(128), allowNull: false, defaultValue: '' },
        sms_provider_api_key:   { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
        sms_provider_sender_id: { type: DataTypes.STRING(64),  allowNull: false, defaultValue: '' },
        sms_message_template:   {
            type: DataTypes.STRING(255),
            allowNull: false,
            defaultValue: 'Your verification code is {code}. It expires in 5 minutes.',
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: literal('NOW()')
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: literal('NOW()')
        }
    }, {
        tableName: 'site_settings',
        modelName: 'SiteSetting',
        sequelize,
        ...config.config
    });

    if (process.env.AUTO_MIGRATION === 'ON' || process.env.AUTO_MIGRATION_NEW === 'ON') {
        SiteSetting.sync({ alter: true }).then();
    }

    return SiteSetting;
}
