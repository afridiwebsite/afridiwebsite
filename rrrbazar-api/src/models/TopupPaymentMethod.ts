const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'

export default (sequelize: Sequelize) => {
    class TopupPaymentMethod extends Model {
        public id!: number;
        public name!: string;
        public payment_method!: string;
        public is_active!: number;
    }

    TopupPaymentMethod.init({
        name: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: ''
        },
        payment_method: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: ''
        },
        is_active: {
            type: DataTypes.INTEGER,
            allowNull: true,
            // unique: true,
            defaultValue: 0,
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
        tableName: 'topup_payment_methods',
        modelName: 'TopupPaymentMethod',
        sequelize,
        ...config.config
    });


    if (process.env.AUTO_MIGRATION === 'ON') {
        TopupPaymentMethod.sync({ alter: true }).then()
    }

    return TopupPaymentMethod
}