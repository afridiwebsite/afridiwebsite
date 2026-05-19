const config = require('../config/CommonPatternConfig');
import { Sequelize, DataTypes, Model, literal } from 'sequelize';

// Many-to-many join between a "trigger" package (the one being purchased)
// and the voucher-pool packages that should each emit one code on order.
// The number of rows for a given `topup_package_id` is how many vouchers
// will be allocated (and how many times the auto-bot will run) per order.
export default (sequelize: Sequelize) => {
  class PackageVoucherMap extends Model {
    public id!: number;
    public topup_package_id!: number;
    public voucher_package_id!: number;
  }

  PackageVoucherMap.init(
    {
      topup_package_id:   { type: DataTypes.INTEGER, allowNull: false },
      voucher_package_id: { type: DataTypes.INTEGER, allowNull: false },
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
    },
    {
      tableName: 'package_voucher_maps',
      modelName: 'PackageVoucherMap',
      sequelize,
      indexes: [
        { fields: ['topup_package_id'] },
        { fields: ['voucher_package_id'] },
      ],
      ...config.config,
    },
  );

  if (process.env.AUTO_MIGRATION === 'ON') {
    PackageVoucherMap.sync({ alter: true }).then();
  }

  return PackageVoucherMap;
};
