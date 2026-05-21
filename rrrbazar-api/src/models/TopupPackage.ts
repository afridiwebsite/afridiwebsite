
const bcrypt = require('bcryptjs');
const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'
import { Schema } from './Schemas';



export default (sequelize: Sequelize) => {
    class TopupPackage extends Model {
        public id!: number;
        public product_id!: number;
        public uc!: number;
        public name!: string;
        public type!: string;
        public price!: string;
        public bprice!: string;
        public in_stock!: number;
        public serial!: number;
        public logo!: string;
        public coin_value!: number;
        public description!: string;
        public order_once!: number;
        public bot_url!: string;
        public auto_delivery!: number;
        public allow_quantity!: number;
        // Quantity-tracked stock. `stock_tracking = 1` opts the package in;
        // each successful order decrements `stock_quantity` and the package
        // is treated as out-of-stock once the count hits 0.
        public stock_tracking!: number;
        public stock_quantity!: number;
        // Shell-mode delivery. When `is_shell = 1` the auto-bot is told to
        // use the configured `shell` string in the `code` field instead of
        // the emitted voucher code. Lets a single auto-bot pipeline handle
        // both voucher delivery and shell/code-injection style products.
        public is_shell!: number;
        public shell!: string;

        static associate({ StoreUnipin }: typeof Schema) {
            this.hasMany(StoreUnipin, {
                foreignKey: "package_id",
                constraints: false,
            });
        }
    }

    TopupPackage.init({
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        uc: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        type: {
            type: DataTypes.STRING,
            allowNull: true
        },
        price: {
            type: DataTypes.STRING,
            allowNull: true
        },
        bprice: {
            type: DataTypes.STRING,
            allowNull: true
        },
        in_stock: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        serial: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        logo: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        coin_value: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        description: {
            // Rich HTML description (text editor output) — can include inline
            // <img> tags. Surfaced to the storefront as a hover tooltip on each
            // package card.
            type: DataTypes.TEXT('long'),
            allowNull: true,
        },
        order_once: {
            // Per-package re-order limit, keyed by the Player ID input.
            //   0 = no limit
            //   1 = once forever per player ID
            //   2 = once per 24 h per player ID (daily cooldown)
            // The order endpoint queries Order.playerid + topuppackage_id and
            // narrows by created_at when mode = 2 so the cooldown resets after
            // the window elapses.
            type: DataTypes.TINYINT,
            allowNull: true,
            defaultValue: 0,
        },
        bot_url: {
            // Per-package auto-bot endpoint. When set, autoOrder will POST
            // the order details to this URL instead of picking a bot row
            // from the AutoServer table. Lets us scope a bot to a specific
            // game/package without maintaining a separate routing table.
            type: DataTypes.STRING(512),
            allowNull: true,
            defaultValue: '',
        },
        auto_delivery: {
            // 1 = on order, draw one voucher from each mapped voucher
            // package (see PackageVoucherMap) and run the auto-bot once
            // per voucher. The bot count is therefore = number of mapped
            // voucher packages.
            type: DataTypes.TINYINT,
            allowNull: true,
            defaultValue: 0,
        },
        allow_quantity: {
            // Per-package opt-in for the quantity stepper on /topup/:id.
            // Only meaningful for packages whose parent product is a
            // voucher-type (is_voucher = 1); the storefront gates the
            // stepper on this flag in addition to the product type so an
            // admin can ship single-unit voucher packages alongside bulk
            // ones.
            type: DataTypes.TINYINT,
            allowNull: true,
            defaultValue: 0,
        },
        stock_tracking: {
            type: DataTypes.TINYINT,
            allowNull: true,
            defaultValue: 0,
        },
        stock_quantity: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
        },
        is_shell: {
            type: DataTypes.TINYINT,
            allowNull: true,
            defaultValue: 0,
        },
        shell: {
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
        tableName: 'topuppackages',
        modelName: 'TopupPackage',
        sequelize,
        ...config.config
    });

    if (process.env.AUTO_MIGRATION === 'ON') {
        TopupPackage.sync({ alter: true }).then()
    }

    return TopupPackage
}