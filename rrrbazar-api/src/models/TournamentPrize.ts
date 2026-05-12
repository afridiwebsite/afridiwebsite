const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'

export default (sequelize: Sequelize) => {
    class TournamentPrize extends Model {
        public id!: number;
        public name!: string;
        public place!: number;
        public amount!: number;
        public tournament_id!: number;
    }

    TournamentPrize.init({
        name: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        place: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        tournament_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        amount: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: literal("NOW()")
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: literal("NOW()")
        }
    }, {
        tableName: 'tournament_prizes',
        modelName: 'TournamentPrize',
        sequelize,
        ...config.config
    });


    if (process.env.AUTO_MIGRATION === 'ON') {
        TournamentPrize.sync({ alter: true }).then()
    }

    return TournamentPrize
}