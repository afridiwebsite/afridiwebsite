const config = require('../config/CommonPatternConfig');
import { Sequelize, DataTypes, Model, literal } from 'sequelize';

export default (sequelize: Sequelize) => {
    class SpinResult extends Model {
        public id!: number;
        public user_id!: number;
        public spin_reward_id!: number | null;
        public type!: string;
        public amount!: number;
        public label!: string;
        public note!: string;
        // 1 when this spin didn't consume a try (either a try-again reward
        // refund, or a bonus spin from a previous try-again). Filtered out
        // of the daily-limit count so retries don't burn the user's quota.
        public is_free!: number;
    }

    SpinResult.init(
        {
            user_id:        { type: DataTypes.INTEGER, allowNull: false },
            spin_reward_id: { type: DataTypes.INTEGER, allowNull: true,  defaultValue: null },
            type:   { type: DataTypes.STRING,  allowNull: false, defaultValue: 'coin' },
            amount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
            label:  { type: DataTypes.STRING,  allowNull: true,  defaultValue: null },
            note:   { type: DataTypes.STRING,  allowNull: true,  defaultValue: null },
            is_free: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
            created_at: { type: DataTypes.DATE, allowNull: true, defaultValue: literal('NOW()') },
            updated_at: { type: DataTypes.DATE, allowNull: true, defaultValue: literal('NOW()') },
        },
        {
            tableName: 'spin_results',
            modelName: 'SpinResult',
            sequelize,
            ...config.config,
        },
    );

    if (process.env.AUTO_MIGRATION === 'ON' || process.env.AUTO_MIGRATION_NEW === 'ON') {
        SpinResult.sync({ alter: true }).then();
    }

    return SpinResult;
};
