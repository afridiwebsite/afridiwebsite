
const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'



export default (sequelize: Sequelize) => {
    class AuthModule extends Model {
        public id!: number;
        public auth_module_id!: number;

    }

    AuthModule.init({
        auth_module_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        admin_id: {
            type: DataTypes.INTEGER,
            allowNull: true
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
        tableName: 'admin_auth',
        modelName: 'AdminAuth',
        sequelize,
        ...config.config
    });



    if (process.env.AUTO_MIGRATION === 'ON') {
        AuthModule.sync({ alter: true }).then()
    }

    return AuthModule
}