const config = require('../config/CommonPatternConfig');
import { Sequelize, DataTypes, Model, literal } from 'sequelize';
import { Schema } from './Schemas';

// One row per (user, step). Each step lives in its own row so:
//   - admins can approve/reject independently,
//   - the UNIQUE(user_id, step) constraint forces resubmits to UPDATE
//     in place instead of piling up history rows,
//   - the storefront tag system can render each step's current status
//     without joining anything fancy.
//
// `data` is a sparse JSON blob — step-specific schemas live in the
// controller (helpers/verificationSchemas.ts). Keeping it JSON means new
// fields don't need a migration; the trade-off is admins have to trust
// the controller to validate. See verification.controller.ts.
//
// Steps are numbered 1-4 to match the spec in the SiteSettings doc:
//   1 = phone OTP + personal info  (gates ordering)
//   2 = NID or passport            (document upload)
//   3 = face verification          (selfie upload)
//   4 = work info                  (gates Reseller flag in admin)
export default (sequelize: Sequelize) => {
    class VerificationSubmission extends Model {
        public id!: number;
        public user_id!: number;
        public step!: number;
        public data!: any;
        public status!: 'under_review' | 'verified' | 'rejected';
        public rejection_reason!: string | null;
        public reviewed_by!: number | null;
        public reviewed_at!: Date | null;

        static associate({ User, Admin }: typeof Schema) {
            this.belongsTo(User, {
                foreignKey: 'user_id',
                constraints: false,
            });
            this.belongsTo(Admin, {
                foreignKey: 'reviewed_by',
                as: 'reviewer',
                constraints: false,
            });
        }
    }

    VerificationSubmission.init({
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        step: { type: DataTypes.TINYINT, allowNull: false },
        // MySQL JSON column. Sequelize 6 reads/writes this as a plain
        // object, so callers don't have to JSON.stringify themselves.
        data: { type: DataTypes.JSON, allowNull: true },
        status: {
            type: DataTypes.ENUM('under_review', 'verified', 'rejected'),
            allowNull: false,
            defaultValue: 'under_review',
        },
        rejection_reason: { type: DataTypes.TEXT, allowNull: true },
        reviewed_by: { type: DataTypes.INTEGER, allowNull: true },
        reviewed_at: { type: DataTypes.DATE, allowNull: true },
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
        tableName: 'verification_submissions',
        modelName: 'VerificationSubmission',
        sequelize,
        indexes: [
            { unique: true, fields: ['user_id', 'step'] },
            { fields: ['status'] },
        ],
        ...config.config,
    });

    if (process.env.AUTO_MIGRATION === 'ON') {
        VerificationSubmission.sync({ alter: true }).then();
    }

    return VerificationSubmission;
};
