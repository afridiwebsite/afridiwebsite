const config = require('../config/CommonPatternConfig');
import { Sequelize, DataTypes, Model, literal } from 'sequelize';

export default (sequelize: Sequelize) => {
    class SpinReward extends Model {
        public id!: number;
        public label!: string;
        public type!: string;
        public amount!: number;
        public weight!: number;
        public color!: string;
        public icon!: string;
        public is_active!: number;
        public serial!: number;
        // Only meaningful when `type === 'try_again'`. The number of bonus
        // free spins the user is granted on landing here. The spin that
        // lands on a try-again segment is itself refunded (no cost deducted,
        // no daily-limit slot consumed); `try_again_count` adds further
        // free spins on top of that refund.
        public try_again_count!: number;
    }

    SpinReward.init(
        {
            label:  { type: DataTypes.STRING,  allowNull: false },
            // Reward type — defaults to 'coin'. Recognized values today:
            //   'coin'       → credit `amount` to user.coins
            //   'wallet'     → credit `amount` to user.wallet
            //   'try_again'  → refund this spin and grant `try_again_count`
            //                  additional free spins
            //   'none'       → log result, no effect (legacy)
            type:   { type: DataTypes.STRING,  allowNull: false, defaultValue: 'coin' },
            amount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
            weight: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
            color:  { type: DataTypes.STRING,  allowNull: true, defaultValue: null },
            icon:   { type: DataTypes.STRING,  allowNull: true, defaultValue: null },
            is_active: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
            serial: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
            try_again_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
            created_at: { type: DataTypes.DATE, allowNull: true, defaultValue: literal('NOW()') },
            updated_at: { type: DataTypes.DATE, allowNull: true, defaultValue: literal('NOW()') },
        },
        {
            tableName: 'spin_rewards',
            modelName: 'SpinReward',
            sequelize,
            ...config.config,
        },
    );

    if (process.env.AUTO_MIGRATION === 'ON' || process.env.AUTO_MIGRATION_NEW === 'ON') {
        SpinReward.sync({ alter: true }).then();
    }

    return SpinReward;
};
