
const bcrypt = require('bcryptjs');
const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'
import { Schema } from './Schemas';



export default (sequelize: Sequelize) => {
  class Admin extends Model {
    public id!: number;
    public first_name!: string;
    public last_name!: string;
    public email!: string;
    public username!: string;
    public gender!: string;
    public date_of_birth!: Date;
    public image!: string;
    public phone!: string;
    public wallet!: number;
    public password!: string;
    public status!: number;
    public readonly created_at!: Date;
    public readonly updated_at!: Date;

    static associate({ Order }: typeof Schema) {
      this.hasMany(Order, {
        foreignKey: "completed_by",
        constraints: false
      })
    }


  }


  Admin.init({
    first_name: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ''
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ''
    },
    username: {
      type: DataTypes.STRING,
      defaultValue: ''
    },
    gender: {
      type: DataTypes.ENUM('male', 'female'),
    },
    date_of_birth: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    wallet: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
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
    tableName: 'admins',
    modelName: 'Admin',
    sequelize,
    ...config.config
  });

  Admin.beforeCreate(async (admin: Admin, options: any) => {
    if (admin.password) {
      admin.password = await bcrypt.hash(admin.password, 8);
    }
  });

  Admin.beforeUpdate(async (admin: Admin, options: any) => {
    if (admin.changed('password')) {
      admin.password = await bcrypt.hash(admin.password, 8);
    }
  })

  if (process.env.AUTO_MIGRATION === 'ON') {
    Admin.sync({ alter: true }).then()
  }

  return Admin
}