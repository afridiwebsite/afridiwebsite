const config = require('../config/CommonPatternConfig')
import moment from 'moment';
import { DataTypes, literal, Model, Sequelize } from 'sequelize';
import defaultFormat from '../config/dateFormatConfig';



export default (sequelize: Sequelize) => {
  class TournamentPlayer extends Model {
    public id!: number;
    public user_id!: number;
    public game_name!: string;
    public kills!: number;
    public ranking!: number;
    public tournament_id!: number;
  }

  TournamentPlayer.init({
    tournament_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    game_name: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ''
    },
    kills: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ranking: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: literal("NOW()"),
      get() {
        return moment(this.getDataValue('created_at')).format(defaultFormat);
      }
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: literal("NOW()"),
      get() {
        return moment(this.getDataValue('updated_at')).format(defaultFormat);
      }
    }
  }, {
    tableName: 'tournament_players',
    modelName: 'TournamentPlayer',
    sequelize,
    ...config.config
  });

  if (process.env.AUTO_MIGRATION === 'ON') {
    TournamentPlayer.sync({ alter: true }).then()
  }

  return TournamentPlayer
}