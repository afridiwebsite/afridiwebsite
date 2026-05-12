const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'

export default (sequelize: Sequelize) => {
    class Notice extends Model {
        public id!: number;
        public title!: string;
        public image!: string;
        public link!: string;
        public notice!: string;
        public for_home_modal!: number;
        public template!: string;
        public is_active!: number;
    }

    Notice.init({
        title: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: ''
        },
        image: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: ''
        },
        link: {
            type: DataTypes.STRING,
            defaultValue: ''
        },
        notice: {
            type: DataTypes.TEXT,
        },
        for_home_modal: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        template: {
            type: DataTypes.ENUM('only_image', 'title_detail', 'image_title_detail_grid'),
            allowNull: true,
        },
        is_active: {
            type: DataTypes.INTEGER,
            allowNull: true,
            // unique: true,
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
        tableName: 'notices',
        modelName: 'Notice',
        sequelize,
        ...config.config
    });


    if (process.env.AUTO_MIGRATION === 'ON') {
        Notice.sync({ alter: true }).then()
    }

    return Notice
}