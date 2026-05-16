const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'

export default (sequelize: Sequelize) => {
    class WithdrawEarnWallet extends Model {
        public id!: number;
        public user_id!: number;
        public amount!: number;
        public payment_method_id!: string;
        public number!: string;
        public status!: string;
    }

    WithdrawEarnWallet.init({
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        number: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        payment_method: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: literal("NOW()")
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: literal("NOW()")
        }
    }, {
        tableName: 'withdraw_earn_wallet',
        modelName: 'WithdrawEarnWallet',
        sequelize,
        ...config.config
    });


    if (process.env.AUTO_MIGRATION === 'ON') {
        WithdrawEarnWallet.sync({ alter: true }).then()
    }

    return WithdrawEarnWallet
}