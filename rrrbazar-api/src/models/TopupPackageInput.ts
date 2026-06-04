const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'
import { Schema } from './Schemas'

// Mirror of TopupProductInput, scoped to a package instead of the product.
// When the parent package's `has_custom_inputs` flag is on, the storefront
// reads from these rows instead of the product-level inputs — letting a
// single product carry packages with different account-info fields (e.g.
// one package needs Player ID + Server, another only needs an email).
export default (sequelize: Sequelize) => {
    class TopupPackageInput extends Model {
        public id!: number;
        public topup_package_id!: number;
        public title!: string;
        public is_player_id!: number;
        public verify_player_name!: number;
        public verify_url!: string;
        public api_token!: string;
        public region_lock!: string;
        public verify_type!: string;
        public verify_game!: string;
        public serial!: number;

        static associate({ TopupPackage }: typeof Schema) {
            this.belongsTo(TopupPackage, {
                foreignKey: 'topup_package_id',
                constraints: false,
            })
        }
    }

    TopupPackageInput.init({
        topup_package_id: {
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
        tableName: 'topup_package_inputs',
        modelName: 'TopupPackageInput',
        sequelize,
        ...config.config,
    })

    if (process.env.AUTO_MIGRATION === 'ON') {
        TopupPackageInput.sync({ alter: true }).then()
    }

    return TopupPackageInput
}
