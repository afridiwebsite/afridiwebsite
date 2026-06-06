const config = require('../config/CommonPatternConfig')
import moment from 'moment';
import { Sequelize, DataTypes, Model, literal } from 'sequelize'
import defaultFormat from '../config/dateFormatConfig';
import { Schema } from './Schemas';

export default (sequelize: Sequelize) => {
    class Order extends Model {
        public id!: number;
        public product_id!: number;
        public phone!: string;
        public payment_mathod!: number;
        public payment_status!: number;
        public payment_data!: string;
        public brief_note!: string;
        public name!: string;
        public accounttype!: string;
        public ingameid!: string;
        public ingamepassword!: string;
        public securitycode!: string;
        public playerid!: string;
        public topuppackage_id!: number;
        public status!: string;
        public user_id!: number;
        public amount!: number;
        public bprice!: Float64Array;
        public quantity!: number;
        public uc!: string;
        public details!: string;
        public completed_by!: number;


        static associate({ Admin, User, TopupProduct, TopupPackage, Voucher, BotDispatch }: typeof Schema) {
            this.belongsTo(Admin, {
                foreignKey: "completed_by",
                constraints: false,
            });
            this.belongsTo(User, {
                foreignKey: "user_id",
                constraints: false,
            });
            this.belongsTo(TopupProduct, {
                foreignKey: "product_id",
                constraints: false,
            });
            // Needed by the admin orders table so the UC column can show
            // a shell package's configured shell string instead of an
            // (empty) voucher.
            this.belongsTo(TopupPackage, {
                foreignKey: "topuppackage_id",
                constraints: false,
            });
            this.hasMany(Voucher, {
                foreignKey: "order_id",
                constraints: false,
            });
            // Per-dispatch bot rows — admin orders include + retry endpoint
            // both read these.
            this.hasMany(BotDispatch, {
                foreignKey: "order_id",
                constraints: false,
            });
        }


    }

    Order.init({
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: '',
        },
        payment_mathod: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: '',
        },
        payment_status: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
        },
        payment_data: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: '',
        },
        brief_note: {
            // TEXT (not STRING/VARCHAR(255)) because brief_note now carries
            // the appended reward-block HTML from helpers/orderRewardNote.ts
            // on top of whatever the existing flow already wrote. See
            // migrations/007_widen_brief_note.sql.
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: '',
        },
        name: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: '',
        },
        accounttype: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: '',
        },
        ingameid: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: '',
        },
        ingamepassword: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: '',
        },
        securitycode: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: '',
        },
        playerid: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: '',
        },
        topuppackage_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        status: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: '',
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        amount: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        bprice: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: '',
        },
        quantity: {
            // Per-order unit count. Defaults to 1 so legacy/non-quantity
            // packages stay equivalent to the pre-migration behaviour;
            // packages with `allow_quantity = 1` can persist N > 1 here so
            // refund math, reward sync, and the admin view all read the
            // same source of truth instead of inferring from `amount`.
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
        },
        uc: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: '',
        },
        details: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: '',
        },
        completed_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: literal("NOW()"),
            get() {
                return moment(this.getDataValue('created_at')).format(defaultFormat);
            }
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: literal("NOW()"),
            get() {
                return moment(this.getDataValue('updated_at')).format(defaultFormat);
            }
        }
    }, {
        tableName: 'orders',
        modelName: 'Order',
        sequelize,
        ...config.config
    });

    if (process.env.AUTO_MIGRATION === 'ON') {
        Order.sync({ alter: true }).then()
    }

    return Order
}