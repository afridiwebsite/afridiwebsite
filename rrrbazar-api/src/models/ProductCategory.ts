const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'

export default (sequelize: Sequelize) => {
    class ProductCategory extends Model {
        public id!: number;
        public topup_product_id!: number;
        public category_id!: number;
    }

    ProductCategory.init({
        topup_product_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        category_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
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
        tableName: 'product_categories',
        modelName: 'ProductCategory',
        sequelize,
        ...config.config
    });

    if (process.env.AUTO_MIGRATION === 'ON' || process.env.AUTO_MIGRATION_NEW === 'ON') {
        ProductCategory.sync({ alter: true }).then();
    }

    return ProductCategory;
}
