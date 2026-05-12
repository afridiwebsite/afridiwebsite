
const config = require('../config/CommonPatternConfig')
import { DataTypes, literal, Model, Sequelize } from 'sequelize';
import { Schema } from './Schemas';

export default (sequelize: Sequelize) => {
    class ProductOrder extends Model {
        public id!: number;
        public product_id!: number;
        public amount!: number;
        public user_message!: string;
        public admin_message!: string;
        public user_id!: number;
        public status!: string;

        static associate({ User, Product }: typeof Schema) {
            this.hasOne(User, {
                sourceKey: 'user_id',
                foreignKey: "id",
                constraints: false
            })

            this.hasOne(Product, {
                sourceKey: 'product_id',
                foreignKey: "id",
                constraints: false
            })
        }

    }

    ProductOrder.init({
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        amount: {
            type: DataTypes.DOUBLE,
            allowNull: true,
            defaultValue: 0.00
        },
        user_message: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: ''
        },
        admin_message: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: ''
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
            allowNull: true,
            defaultValue: 'pending',
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
        tableName: 'product_orders',
        modelName: 'ProductOrder',
        sequelize,
        ...config.config
    });

    if (process.env.AUTO_MIGRATION === 'ON') {
        ProductOrder.sync({ alter: true }).then()
    }

    return ProductOrder
}