
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
            // 1 = each user may only order this package once. The order
            // endpoint checks Order.user_id + topuppackage_id and rejects
            // repeats with a clear message.
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