
const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'

export default (sequelize: Sequelize) => {
    class Product extends Model {
        public id!: number;
        public name!: string;
        public image!: number;
        public sale_price!: number;
        public regular_price!: string;
        public description!: string;
        public quantity!: number;
        public is_active!: number;
    }

    Product.init({
        name: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: ''
        },
        image: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: ''
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        sale_price: {
            type: DataTypes.DOUBLE,
            allowNull: true,
            defaultValue: 0.00
        },
        regular_price: {
            type: DataTypes.DOUBLE,
            allowNull: true,
            defaultValue: 0.00
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: ''
        },
        is_active: {
            type: DataTypes.INTEGER,
            allowNull: true,
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
        tableName: 'products',
        modelName: 'Product',
        sequelize,
        ...config.config
    });

    if (process.env.AUTO_MIGRATION === 'ON') {
        Product.sync({ alter: true }).then()
    }

    return Product
}