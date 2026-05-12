import { Schema } from "./Schemas";
const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'
import moment from "moment";
import defaultFormat from "../config/dateFormatConfig";

export default (sequelize: Sequelize) => {
    class StoreUnipin extends Model {
        public id!: number;
        public code!: string;
        public status!: number;
        public user_id!: number;
        public package_id !: number;
        public uc !: number;
        public created_by!: number;
        public updated_by!: number;

        static associate({ TopupPackage }: typeof Schema) {
            this.belongsTo(TopupPackage, {
                foreignKey: "package_id",
                constraints: false,
            });
        }
    }

    StoreUnipin.init({
        code: {
            type: DataTypes.STRING,
        },
        status: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        package_id: {
            type: DataTypes.INTEGER,
        },
        uc: {
            type: DataTypes.INTEGER,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: literal("NOW()"),
            get() {
                return moment(this.getDataValue('created_at')).format(defaultFormat);
            }
        },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: true,
            get() {
                return moment(this.getDataValue('updated_at')).format(defaultFormat);
            }
        },
        updated_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
        }
    }, {
        tableName: 'store_unipin',
        modelName: 'StoreUnipin',
        sequelize,
        ...config.config
    });

    if (process.env.AUTO_MIGRATION === 'ON') {
        StoreUnipin.sync({ alter: true }).then()
    }

    return StoreUnipin
}
