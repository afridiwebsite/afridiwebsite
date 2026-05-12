
const config = require('../config/CommonPatternConfig')
import {Sequelize, DataTypes, Model, literal} from 'sequelize'



export default (sequelize: Sequelize) => {
    class AuthModule extends Model {
        public id!: number;
        public name!:string;
        public description!:string;
        public status!:number;
        public slug!:string;
    }
    
    AuthModule.init({

        name: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: ''
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: ''
        },

        auth_url: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: ''
        },

        slug: {
            type: DataTypes.STRING,
            defaultValue: ''
        },

        method: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: ''
        },

        status: {
            type: DataTypes.INTEGER,
            defaultValue: 0
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
        tableName: 'auth_module',
        modelName: 'AuthModule',
        sequelize,
        ...config.config
    });



    if(process.env.AUTO_MIGRATION === 'ON') {
        AuthModule.sync({alter: true}).then()
    }

    return AuthModule
}