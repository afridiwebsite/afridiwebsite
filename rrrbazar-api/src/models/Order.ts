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
        public uc!: string;
        public details!: string;
        public completed_by!: number;


        static associate({ Admin, User, TopupProduct, Voucher }: typeof Schema) {
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
            this.hasMany(Voucher, {
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
            type: DataTypes.STRING,
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