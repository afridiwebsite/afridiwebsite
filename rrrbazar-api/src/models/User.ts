
const bcrypt = require('bcryptjs');
const config = require('../config/CommonPatternConfig')
import moment from 'moment';
import { DataTypes, literal, Model, Sequelize } from 'sequelize';
import defaultFormat from '../config/dateFormatConfig';



export default (sequelize: Sequelize) => {
  class User extends Model {
    public id!: number;
    public username!: string;
    public account_status!: string;
    public is_admin!: number;
    public is_phone_verify!: number;
    public email!: string;
    public wallet!: number;
    public coins!: number;
    public last_coin_claim_at!: Date;
    public claim_streak!: number;
    public password!: string;
    public city!: string;
    public address!: string;
    public zip_code!: string;
    public phone!: string;
    public avatar!: string;
    public readonly created_at!: Date;
    public readonly updated_at!: Date;
  }

  User.init({
    username: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    account_status: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    is_admin: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    is_phone_verify: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    wallet: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    coins: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    last_coin_claim_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    claim_streak: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    zip_code: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
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
      defaultValue: literal("NOW()")
    }
  }, {
    tableName: 'users',
    modelName: 'User',
    sequelize,
    ...config.config
  });


  User.beforeCreate(async (user: User, options: any) => {
    if (user.password) {
      user.password = await bcrypt.hash(user.password, 8);
    }
  });

  User.beforeUpdate(async (user: User, options: any) => {
    if (user.changed('password')) {
      user.password = await bcrypt.hash(user.password, 8);
    }
  });

  if (process.env.AUTO_MIGRATION === 'ON') {
    User.sync({ alter: true }).then()
  }

  return User
}