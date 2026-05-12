const bcrypt = require('bcryptjs');
const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'



export default (sequelize: Sequelize) => {
    class TopupPackagePermission extends Model {
        public id!: number;
        public admin_id!: number;
        public topup_package_id!: number;
    }

    TopupPackagePermission.init({
        admin_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        topup_package_id: {
            type: DataTypes.INTEGER,
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
        tableName: 'topup_package_permissions',
        modelName: 'TopupPackagePermission',
        sequelize,
        ...config.config
    });

    if (process.env.AUTO_MIGRATION === 'ON') {
        TopupPackagePermission.sync({ alter: true }).then().catch(error => console.log(error))
    }

    return TopupPackagePermission
}