const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'

export default (sequelize: Sequelize) => {
    class CoinTransaction extends Model {
        public id!: number;
        public user_id!: number;
        public amount!: number;
        public type!: string;
        public note!: string;
        public reference_id!: number;
    }

    CoinTransaction.init({
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        amount: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'earn'
        },
        note: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: ''
        },
        reference_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
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
        tableName: 'coin_transactions',
        modelName: 'CoinTransaction',
        sequelize,
        ...config.config
    });

    if (process.env.AUTO_MIGRATION === 'ON' || process.env.AUTO_MIGRATION_NEW === 'ON') {
        CoinTransaction.sync({ alter: true }).then();
    }

    return CoinTransaction;
}
