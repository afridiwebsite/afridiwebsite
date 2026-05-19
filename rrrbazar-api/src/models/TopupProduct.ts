
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
        public product_link!: string;
        public youtube_link!: string;
        public is_voucher!: number;
        public redeem_link!: string;

        static associate({ Category, ProductCategory, TopupProductInput }: typeof Schema) {
            this.belongsToMany(Category, {
                through: ProductCategory,
                foreignKey: 'topup_product_id',
                otherKey: 'category_id',
                as: 'categories',
                constraints: false,
            });
            this.hasMany(TopupProductInput, {
                foreignKey: 'topup_product_id',
                as: 'inputs',
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
        product_link: {
            // When set, the product tile on the home page links straight to
            // this URL instead of /topup/:id. Used for affiliate / external
            // products that don't have packages to pick.
            type: DataTypes.STRING(512),
            allowNull: true,
            defaultValue: '',
        },
        youtube_link: {
            // Optional tutorial video URL — surfaced beside the Description
            // header on the topup page.
            type: DataTypes.STRING(512),
            allowNull: true,
            defaultValue: '',
        },
        is_voucher: {
            // 1 = treat this product as a voucher-pool product. Orders for
            // its packages allocate a code from the Voucher pool instead of
            // running through the UC / bot flow.
            type: DataTypes.TINYINT,
            allowNull: true,
            defaultValue: 0,
        },
        redeem_link: {
            // External redemption URL surfaced to the buyer once a voucher
            // product order is completed. Empty string when not set.
            type: DataTypes.STRING(512),
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