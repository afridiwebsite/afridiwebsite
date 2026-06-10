const config = require('../config/CommonPatternConfig');
import { Sequelize, DataTypes, Model, literal } from 'sequelize';
import { Schema } from './Schemas';

// One row per logged-in admin device. The raw session token is delivered to
// the browser in a Secure httpOnly cookie and NEVER stored here — only its
// SHA-256 hash, so a DB dump can't be replayed as a live session. A session
// is "active" while revoked_at IS NULL and expires_at is in the future;
// logout / "log out other devices" set revoked_at. This table is the backbone
// for device tracking, remote logout, and OTP-gated login.
export default (sequelize: Sequelize) => {
    class AdminSession extends Model {
        public id!: number;
        public admin_id!: number;
        public token_hash!: string;
        public user_agent!: string;
        public ip!: string;
        public remember!: number;
        public last_seen_at!: Date | null;
        public expires_at!: Date;
        public revoked_at!: Date | null;
        public readonly created_at!: Date;
        public readonly updated_at!: Date;

        static associate({ Admin }: typeof Schema) {
            this.belongsTo(Admin, { foreignKey: 'admin_id', constraints: false });
        }
    }

    AdminSession.init({
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        admin_id: { type: DataTypes.INTEGER, allowNull: false },
        token_hash: { type: DataTypes.CHAR(64), allowNull: false },
        user_agent: { type: DataTypes.STRING(512), allowNull: true, defaultValue: '' },
        ip: { type: DataTypes.STRING(64), allowNull: true, defaultValue: '' },
        remember: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
        last_seen_at: { type: DataTypes.DATE, allowNull: true },
        expires_at: { type: DataTypes.DATE, allowNull: false },
        revoked_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: literal('CURRENT_TIMESTAMP'),
        },
    }, {
        tableName: 'admin_sessions',
        modelName: 'AdminSession',
        sequelize,
        timestamps: false,
        indexes: [
            { name: 'uq_admin_sessions_token', unique: true, fields: ['token_hash'] },
            { name: 'idx_admin_sessions_admin', fields: ['admin_id'] },
            { name: 'idx_admin_sessions_expiry', fields: ['expires_at'] },
        ],
        ...config.config,
    });

    if (process.env.AUTO_MIGRATION === 'ON') {
        AdminSession.sync({ alter: true }).then();
    }

    return AdminSession;
};
