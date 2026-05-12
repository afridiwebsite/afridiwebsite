
const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'
import { Schema } from './Schemas';

export default (sequelize: Sequelize) => {
    class TopupProduct extends Model {
        public id!: number;
        public name!: string;
        public logo!: string;
        public price!: number;
        public start_at!: string;
        public end_at!: string;
        public rules!: string;
        public topuptype!: number;
        public isactiveforsale!: number;
        public isactivefortopup!: number;
        public serial!: number;
        public is_active!: number;
        public is_offer!: number;
        public offer_items!: number;
        public coin_value!: number;

        static associate({ Category, ProductCategory }: typeof Schema) {
            this.belongsToMany(Category, {
                through: ProductCategory,
                foreignKey: 'topup_product_id',
                otherKey: 'category_id',
                as: 'categories',
                constraints: false,
            });
        }
    }

    TopupProduct.init({
        name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        logo: {
            type: DataTypes.STRING,
            allowNull: true
        },
        price: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        start_at: {
            type: DataTypes.STRING,
            allowNull: true
        },
        end_at: {
            type: DataTypes.STRING,
            allowNull: true
        },
        rules: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        topuptype: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        isactiveforsale: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        isactivefortopup: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        is_active: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        serial: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        is_offer: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        offer_items: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        coin_value: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
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
        tableName: 'topup_products',
        modelName: 'TopupProduct',
        sequelize,
        ...config.config
    });

    if (process.env.AUTO_MIGRATION === 'ON') {
        TopupProduct.sync({ alter: true }).then()
    }

    return TopupProduct
}