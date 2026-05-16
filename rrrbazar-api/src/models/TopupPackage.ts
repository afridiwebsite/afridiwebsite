
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