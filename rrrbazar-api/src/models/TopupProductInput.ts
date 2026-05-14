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
