const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'

export default (sequelize: Sequelize) => {
    class Banner extends Model {
        public id!: number;
        public note!: string;
        public banner!: string;
        public link!: string;
        public isactive!: number;
    }

    Banner.init({
        note: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: ''
        },
        banner: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: ''
        },
        link: {
            type: DataTypes.STRING,
            defaultValue: ''
        },
        isactive: {
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
        tableName: 'banners',
        modelName: 'Banner',
        sequelize,
        ...config.config
    });


    if (process.env.AUTO_MIGRATION === 'ON') {
        Banner.sync({ alter: true }).then()
    }

    return Banner
}