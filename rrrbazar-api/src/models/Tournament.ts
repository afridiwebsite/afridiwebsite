
const bcrypt = require('bcryptjs');
const config = require('../config/CommonPatternConfig')
import moment from 'moment';
import { DataTypes, literal, Model, Sequelize } from 'sequelize';
import defaultFormat from '../config/dateFormatConfig';
import { Schema } from './Schemas';



export default (sequelize: Sequelize) => {
  class Tournament extends Model {
    public id!: number;
    public title!: string;
    public start_time!: Date;
    public per_kill!: number;
    public version!: string;
    public entry_fee!: number;
    public map!: string;
    public type!: string;
    public room_details!: string;
    public total_prize!: number;
    public status!: string;
    public user_limit!: string;
    public image!: string;
    public is_prize_added!: number;
    public is_show_in_home_page!: number;
    public rules!: string;
    public live_link!: string;

    static associate({ TournamentPrize }: typeof Schema) {
      this.hasMany(TournamentPrize, {
        foreignKey: "tournament_id",
        constraints: false
      })
    }

  }

  Tournament.init({
    title: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ''
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    per_kill: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    entry_fee: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    live_link: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    map: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('solo', 'duo', 'squad'),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('open', 'running', 'ended'),
    },
    version: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    room_details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rules: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    user_limit: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    total_prize: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    is_prize_added: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_show_in_home_page: {
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
    tableName: 'tournaments',
    modelName: 'Tournament',
    sequelize,
    ...config.config
  });

  if (process.env.AUTO_MIGRATION === 'ON') {
    Tournament.sync({ alter: true }).then()
  }

  return Tournament
}