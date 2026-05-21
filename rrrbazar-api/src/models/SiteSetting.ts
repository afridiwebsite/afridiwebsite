const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'

export default (sequelize: Sequelize) => {
    class SiteSetting extends Model {
        public id!: number;
        public site_name!: string;
        public logo!: string;
        public primary_color!: string;
        public secondary_color!: string;
        public accent_color!: string;
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
        accent_color: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: '#f59e0b'
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
