
const config = require('../config/CommonPatternConfig')
import { DataTypes, literal, Model, Sequelize } from 'sequelize';

export default (sequelize: Sequelize) => {
    class Otp extends Model {
        public id!: number;
        public user_id!: number;
        public otp!: string;
        public created_at!: Date;
    }


    Otp.init({
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        otp: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        type: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "phone_verify"
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
        tableName: 'otps',
        modelName: 'Otp',
        sequelize,
        ...config.config
    });

    if (process.env.AUTO_MIGRATION === 'ON') {
        Otp.sync({ alter: true }).then()
    }

    return Otp
}