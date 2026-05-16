import { Schema } from "./Schemas";
const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'
import moment from "moment";
import defaultFormat from "../config/dateFormatConfig";

export default (sequelize: Sequelize) => {
    class Transaction extends Model {
        public id!: number;
        public user_id!: number;
        public amount!: number;
        public paymentmethod_id!: number;
        // public transaction_id!: string;
        public status!: string;
        public purpose!: string;
        public number!: string;
        public action_by!: number;

        static associate({ PaymentMethod, Admin }: typeof Schema) {
            this.belongsTo(PaymentMethod, {
                foreignKey: "paymentmethod_id",
                constraints: false,
            });

            this.belongsTo(Admin, {
                foreignKey: "action_by",
                constraints: false,
            });


        }
    }



    Transaction.init({
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        paymentmethod_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        completed_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: '',
        },
        purpose: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: '',
        },
        number: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: '',
        },
        action_by: {
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
        tableName: 'transactions',
        modelName: 'Transaction',
        sequelize,
        ...config.config
    });

    if (process.env.AUTO_MIGRATION === 'ON') {
        Transaction.sync({ alter: true }).then()
    }

    return Transaction
}
