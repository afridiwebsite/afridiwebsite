const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'

export default (sequelize: Sequelize) => {
    class Tutorial extends Model {
        public id!: number;
        public title!: string;
        public description!: string;
        public video_link!: string;
        public is_active!: number;
        public serial!: number;
    }

    Tutorial.init({
        title: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: ''
        },
        description: {
            // Rich text from the admin editor.
            type: DataTypes.TEXT('long'),
            allowNull: true,
        },
        video_link: {
            // Full URL the storefront opens in a new tab when the user
            // clicks the tutorial card (YouTube, Vimeo, anything).
            type: DataTypes.STRING(1024),
            allowNull: true,
            defaultValue: '',
        },
        is_active: {
            type: DataTypes.TINYINT,
            allowNull: true,
            defaultValue: 1,
        },
        serial: {
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
        tableName: 'tutorials',
        modelName: 'Tutorial',
        sequelize,
        ...config.config
    });

    if (process.env.AUTO_MIGRATION === 'ON') {
        Tutorial.sync({ alter: true }).then()
    }

    return Tutorial
}
