
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
        public quantity_prefix!: string;
        public allow_quantity!: number;

        static associate({ Category, ProductCategory, TopupProductInput, TopupPackage }: typeof Schema) {
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
            this.hasMany(TopupPackage, {
                foreignKey: 'product_id',
                as: 'packages',
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
        quantity_prefix: {
            // Admin-supplied label shown in front of the storefront quantity
            // stepper. Lets the admin re-skin the input for products where
            // "Quantity" reads oddly — e.g. "Dollars" for an admin-fulfilled
            // currency package, "Hours" for a service package. Blank falls
            // back to the default "Quantity" label client-side.
            type: DataTypes.STRING(64),
            allowNull: false,
            defaultValue: '',
        },
        allow_quantity: {
            // Product-level master switch for the quantity stepper. The
            // storefront ANDs this with the per-package `allow_quantity`
            // (migration 006) so the admin can flip a whole product off
            // without walking each package — but per-package granularity
            // is preserved.
            type: DataTypes.TINYINT,
            allowNull: false,
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