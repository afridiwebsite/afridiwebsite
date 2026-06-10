const config = require('../config/CommonPatternConfig');
import { Sequelize, DataTypes, Model, literal } from 'sequelize';

// Append-only audit trail of admin login attempts — success AND failure —
// with IP and user agent. Powers the security module's "login history"
// surface and gives an investigator a record of brute-force / unfamiliar
// logins. `admin_id` is nullable because a failed attempt against an unknown
// identity has no admin to attribute it to (we still record the identity
// string that was tried).
export default (sequelize: Sequelize) => {
    class AdminLoginAudit extends Model {
        public id!: number;
        public admin_id!: number | null;
        public identity!: string;
        public success!: number;
        public reason!: string;
        public ip!: string;
        public user_agent!: string;
        public readonly created_at!: Date;
    }

    AdminLoginAudit.init({
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        admin_id: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
        identity: { type: DataTypes.STRING(255), allowNull: true, defaultValue: '' },
        success: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
        reason: { type: DataTypes.STRING(64), allowNull: true, defaultValue: '' },
        ip: { type: DataTypes.STRING(64), allowNull: true, defaultValue: '' },
        user_agent: { type: DataTypes.STRING(512), allowNull: true, defaultValue: '' },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: literal('CURRENT_TIMESTAMP'),
        },
    }, {
        tableName: 'admin_login_audits',
        modelName: 'AdminLoginAudit',
        sequelize,
        timestamps: false,
        indexes: [
            { name: 'idx_admin_login_audits_admin', fields: ['admin_id'] },
            { name: 'idx_admin_login_audits_created', fields: ['created_at'] },
        ],
        ...config.config,
    });

    if (process.env.AUTO_MIGRATION === 'ON') {
        AdminLoginAudit.sync({ alter: true }).then();
    }

    return AdminLoginAudit;
};
