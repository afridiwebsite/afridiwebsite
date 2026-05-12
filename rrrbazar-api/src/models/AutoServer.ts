import { Schema } from "./Schemas";
const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'
import moment from "moment";
import defaultFormat from "../config/dateFormatConfig";

export default (sequelize: Sequelize) => {
    class AutoServer extends Model {
        public id!: number;
        public name!: string;
        public ip_url!: string;
        public status!: number;
        public total_order!: number;
    }

    AutoServer.init({
        name: {
            type: DataTypes.STRING,
        },
        ip_url: {
            type: DataTypes.STRING,
        },
        status: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        total_order: {
            type: DataTypes.INTEGER,
        }
    }, {
        tableName: 'autoserver',
        modelName: 'AutoServer',
        sequelize,
        ...config.config
    });

    if (process.env.AUTO_MIGRATION === 'ON') {
        AutoServer.sync({ alter: true }).then()
    }

    return AutoServer
}
