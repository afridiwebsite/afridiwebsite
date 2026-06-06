const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'
import { Schema } from './Schemas';

export default (sequelize: Sequelize) => {
    class Category extends Model {
        public id!: number;
        public name!: string;
        public slug!: string;
        public emoji!: string;
        public serial!: number;
        public is_active!: number;

        static associate({ TopupProduct, ProductCategory }: typeof Schema) {
            this.belongsToMany(TopupProduct, {
                through: ProductCategory,
                foreignKey: 'category_id',
                otherKey: 'topup_product_id',
                as: 'topup_products',
                constraints: false,
            });
        }
    }

    Category.init({
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        slug: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        emoji: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: ''
        },
        serial: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        is_active: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        limit_product: {
            type: DataTypes.TINYINT,
            defaultValue: 0
        },
        product_limit: {
            type: DataTypes.INTEGER,
            defaultValue: 0
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
        tableName: 'categories',
        modelName: 'Category',
        sequelize,
        ...config.config
    });

    if (process.env.AUTO_MIGRATION === 'ON' || process.env.AUTO_MIGRATION_NEW === 'ON') {
        Category.sync({ alter: true }).then();
    }

    return Category;
}
