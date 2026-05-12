const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'

export default (sequelize: Sequelize) => {
    class Inventorie extends Model {
        public id!: number;
        public name!: string;
        public image!: string;
        public price!: string;
        public detail!: string;
        public category!: number;
        public active!: number;

    }

    Inventorie.init({
        name: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: ''
        },
        image: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: ''
        },
        price: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: ''
        },
        detail: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: ''
        },
        category: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
        },
        active: {
            type: DataTypes.INTEGER,
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
        tableName: 'inventories',
        modelName: 'Inventorie',
        sequelize,
        ...config.config
    });


    if (process.env.AUTO_MIGRATION === 'ON') {
        Inventorie.sync({ alter: true }).then()
    }

    return Inventorie
}