const config = require('../config/CommonPatternConfig');
import { Sequelize, DataTypes, Model, literal } from 'sequelize';

// Storage for verification OTP codes. We never write the plaintext code —
// only its SHA-256 hash. Verification = hash the submitted code and
// compare. `attempts` is bumped on every failed compare so we can rate-
// limit, and `used` makes a code single-use after a successful verify.
//
// Distinct from the legacy `Otp` model (account-creation OTP) so we can
// tune retention, rate limits, and hashing independently without
// breaking signup. Lifecycle is short — rows expire in 5 minutes; the
// table never gets very large.
export default (sequelize: Sequelize) => {
    class OtpAttempt extends Model {
        public id!: number;
        public user_id!: number | null;
        public phone!: string;
        public code_hash!: string;
        public expires_at!: Date;
        public attempts!: number;
        public used!: number;
        public provider_response!: string | null;
    }

    OtpAttempt.init({
        user_id: { type: DataTypes.INTEGER, allowNull: true },
        phone: { type: DataTypes.STRING(32), allowNull: false },
        code_hash: { type: DataTypes.STRING(128), allowNull: false },
        expires_at: { type: DataTypes.DATE, allowNull: false },
        attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        used: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
        provider_response: { type: DataTypes.TEXT, allowNull: true },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: literal('CURRENT_TIMESTAMP'),
        },
    }, {
        tableName: 'otp_attempts',
        modelName: 'OtpAttempt',
        sequelize,
        timestamps: false,
        indexes: [
            { fields: ['phone'] },
            { fields: ['user_id'] },
            { fields: ['expires_at'] },
        ],
        ...config.config,
    });

    if (process.env.AUTO_MIGRATION === 'ON') {
        OtpAttempt.sync({ alter: true }).then();
    }

    return OtpAttempt;
};
