
const config = require('../config/CommonPatternConfig')
import { DataTypes, literal, Model, Sequelize } from 'sequelize';

export default (sequelize: Sequelize) => {
    class PasswordReset extends Model {
        public id!: number;
        public user_id!: number;
        public token!: string;
        public created_at!: Date;
    }


    PasswordReset.init({
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        token: {
            type: DataTypes.STRING,
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
        tableName: 'password_resets',
        modelName: 'PasswordReset',
        sequelize,
        ...config.config
    });

    if (process.env.AUTO_MIGRATION === 'ON') {
        PasswordReset.sync({ alter: true }).then()
    }

    return PasswordReset
}