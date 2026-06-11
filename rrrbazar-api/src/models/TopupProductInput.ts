const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'
import { Schema } from './Schemas'

export default (sequelize: Sequelize) => {
    class TopupProductInput extends Model {
        public id!: number;
        public topup_product_id!: number;
        public title!: string;
        public is_player_id!: number;
        public verify_player_name!: number;
        public verify_url!: string;
        public api_token!: string;
        public region_lock!: string;
        // Verification backend for the Player ID input.
        //   'none'     — no name check at all
        //   'dynamic'  — admin-configured verify_url with a {value} placeholder
        //                (the existing flow — GET request, region_lock honoured)
        //   'gamerspay'— POST to api.gamerspay.app/api/v1/validate with
        //                X-API-Key header + { game, playerid } body. The game
        //                key lives in verify_game; api_token holds the API key.
        // verify_player_name is kept as a 1/0 derived flag so older readers
        // ("is verify configured?") keep working — it's 1 whenever
        // verify_type !== 'none'.
        public verify_type!: string;
        public verify_game!: string;
        // Only meaningful for verify_type === 'dynamic'. When 1, the storefront
        // blocks the order until the customer runs a successful name check for
        // the entered Player ID (gamerspay is always mandatory, so it doesn't
        // need this flag).
        public verify_required!: number;
        public serial!: number;

        static associate({ TopupProduct }: typeof Schema) {
            this.belongsTo(TopupProduct, {
                foreignKey: 'topup_product_id',
                constraints: false,
            })
        }
    }

    TopupProductInput.init({
        topup_product_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        is_player_id: {
            type: DataTypes.TINYINT,
            allowNull: false,
            defaultValue: 0,
        },
        verify_player_name: {
            type: DataTypes.TINYINT,
            allowNull: false,
            defaultValue: 0,
        },
        verify_url: {
            type: DataTypes.STRING(512),
            allowNull: true,
            defaultValue: '',
        },
        api_token: {
            type: DataTypes.STRING(512),
            allowNull: true,
            defaultValue: '',
        },
        region_lock: {
            type: DataTypes.STRING(16),
            allowNull: true,
            defaultValue: '',
        },
        verify_type: {
            type: DataTypes.STRING(16),
            allowNull: true,
            defaultValue: 'none',
        },
        verify_game: {
            type: DataTypes.STRING(32),
            allowNull: true,
            defaultValue: '',
        },
        verify_required: {
            type: DataTypes.TINYINT,
            allowNull: false,
            defaultValue: 0,
        },
        serial: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
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
        tableName: 'topup_product_inputs',
        modelName: 'TopupProductInput',
        sequelize,
        ...config.config,
    })

    if (process.env.AUTO_MIGRATION === 'ON') {
        TopupProductInput.sync({ alter: true }).then()
    }

    return TopupProductInput
}
