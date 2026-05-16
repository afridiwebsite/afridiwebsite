import { Schema } from "./Schemas";
const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'
import moment from "moment";
import defaultFormat from "../config/dateFormatConfig";

export default (sequelize: Sequelize) => {
    class AdminTransaction extends Model {
        public id!: number;
        public admin_id!: number;
        public amount!: number;
        public status!: string;
        public number!: string;
        public completed_by!: number;

        static associate({ Admin }: typeof Schema) {
            this.belongsTo(Admin, {
                foreignKey: "admin_id",
                constraints: false,
            });


        }
    }



    AdminTransaction.init({
        admin_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
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
        number: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: '',
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
        tableName: 'admin_transactions',
        modelName: 'AdminTransaction',
        sequelize,
        ...config.config
    });

    if (process.env.AUTO_MIGRATION === 'ON') {
        AdminTransaction.sync({ alter: true }).then()
    }

    return AdminTransaction
}
