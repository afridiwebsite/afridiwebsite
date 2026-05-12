const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'

export default (sequelize: Sequelize) => {
    class PaymentMethod extends Model {
        public id!: number;
        public name!: string;
        public logo!: string;
        public info!: string;
        public status!: string;
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