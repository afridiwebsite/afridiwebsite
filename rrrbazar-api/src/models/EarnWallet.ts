const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'

export default (sequelize: Sequelize) => {
    class EarnWallet extends Model {
        public id!: number;
        public user_id!: number;
        public tournament_id!: number;
        public amount!: number;
        public purpose!: string;
        public total_amount!: number;
    }

    EarnWallet.init({
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        tournament_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        purpose: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: 'earn'
        },
        total_amount: {
            type: DataTypes.DECIMAL(10, 2),
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
        tableName: 'earn_wallets',
        modelName: 'EarnWallet',
        sequelize,
        ...config.config
    });


    if (process.env.AUTO_MIGRATION === 'ON') {
        EarnWallet.sync({ alter: true }).then()
    }

    return EarnWallet
}