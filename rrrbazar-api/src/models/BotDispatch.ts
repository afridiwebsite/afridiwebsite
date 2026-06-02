const config = require('../config/CommonPatternConfig');
import { Sequelize, DataTypes, Model, literal } from 'sequelize';
import { Schema } from './Schemas';

/**
 * One row per bot dispatch attempt. An order can have many of these:
 *   - shell-mode orders: one per tag
 *   - voucher-pool auto-delivery: one per emitted voucher
 *   - legacy single-bot: one
 *
 * The row captures *exactly* what was sent to the bot so a retry can re-fire
 * the same request without re-deriving anything from the order/package
 * (which may have drifted in the meantime). Failures from the bot callback
 * (checkOrder) flip `status` to 'failed' or 'cancelled' and stash the reason
 * in `error_reason`; the admin retry endpoint resends every 'failed' row.
 */
export default (sequelize: Sequelize) => {
    class BotDispatch extends Model {
        public id!: number;
        public order_id!: number;
        public voucher_id!: number | null;
        // Set for "no-voucher-available" placeholder dispatches so the
        // retry endpoint knows which voucher pool to draw from when it
        // tries to fulfil the dispatch on a later attempt. Stays null for
        // real dispatches (the voucher was already emitted then) and for
        // shell dispatches (no pool involved).
        public voucher_package_id!: number | null;
        public tag!: string | null;
        public code!: string;
        public package_name_sent!: string;
        public bot_url!: string;
        // Mirrors TopupPackage.bot_type — captured at create time so the
        // retry endpoint can route to the right re-dispatch handler even
        // if the package's bot config has drifted since the original try.
        // Empty/`auto-order` falls back to the legacy POST behaviour
        // (autoOrder).
        public bot_type!: string;
        // pending = row created, not yet POSTed to the bot
        // sent    = POST returned OK, awaiting checkOrder callback
        // success = checkOrder callback reported success
        // failed  = either the POST errored / returned non-ok, or the
        //           callback reported a generic failure
        // cancelled = callback reported a known user-facing error
        //             (Invalid player ID / Invalid region) — NOT retryable
        public status!: 'pending' | 'sent' | 'success' | 'failed' | 'cancelled';
        public response_content!: string | null;
        public error_reason!: string | null;
        public attempt_count!: number;
        public last_attempted_at!: Date | null;

        static associate({ Order, Voucher }: typeof Schema) {
            this.belongsTo(Order, { foreignKey: 'order_id', constraints: false });
            this.belongsTo(Voucher, { foreignKey: 'voucher_id', constraints: false });
        }
    }

    BotDispatch.init({
        order_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        voucher_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        voucher_package_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        tag: {
            type: DataTypes.STRING(512),
            allowNull: true,
        },
        code: {
            // What literally went into the bot payload's `code` field —
            // shell value or voucher code. Captured so retry doesn't have
            // to recompute it.
            type: DataTypes.STRING(512),
            allowNull: true,
            defaultValue: '',
        },
        package_name_sent: {
            // What literally went into bot payload's `pacakge`/`package`
            // fields. For shell dispatches this is the tag; for voucher
            // dispatches it's the package name.
            type: DataTypes.STRING(255),
            allowNull: true,
            defaultValue: '',
        },
        bot_url: {
            type: DataTypes.STRING(512),
            allowNull: true,
            defaultValue: '',
        },
        bot_type: {
            type: DataTypes.STRING(32),
            allowNull: true,
            defaultValue: '',
        },
        status: {
            type: DataTypes.ENUM('pending', 'sent', 'success', 'failed', 'cancelled'),
            allowNull: false,
            defaultValue: 'pending',
        },
        response_content: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        error_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        attempt_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        last_attempted_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: literal('NOW()'),
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: literal('NOW()'),
        },
    }, {
        tableName: 'bot_dispatches',
        modelName: 'BotDispatch',
        sequelize,
        ...config.config,
    });

    if (process.env.AUTO_MIGRATION === 'ON') {
        BotDispatch.sync({ alter: true }).then();
    }

    return BotDispatch;
};
