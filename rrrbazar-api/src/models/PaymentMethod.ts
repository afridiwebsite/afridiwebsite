const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'

export default (sequelize: Sequelize) => {
    class PaymentMethod extends Model {
        public id!: number;
        public name!: string;
        public logo!: string;
        public info!: string;
        public status!: string;
        // 'normal' → user submits request with sender number, admin verifies.
        // 'direct' → server kicks straight to FastPay/UddoktaPay (no sender number).
        public type!: string;
        // Optional UddoktaPay seller id used only for the 'direct' flow. Previously
        // this was overloaded onto `info`; lifting it out lets `info` become free-form
        // HTML rendered to users as instructions.
        public seller_id!: number | null;
    }

    PaymentMethod.init({
        name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        logo: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        info: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: '',
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'normal',
        },
        seller_id: {
            type: DataTypes.INTEGER,
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
        tableName: 'payment_methods',
        modelName: 'PaymentMethod',
        sequelize,
        ...config.config
    });

    if (process.env.AUTO_MIGRATION === 'ON') {
        PaymentMethod.sync({ alter: true }).then()
    }

    return PaymentMethod
}