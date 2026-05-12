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
        public daily_claim_amount!: number;
        public daily_claim_interval_hours!: number;
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
        daily_claim_amount: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 10
        },
        daily_claim_interval_hours: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 24
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
