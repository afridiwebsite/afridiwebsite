const config = require('../config/CommonPatternConfig');
import { Sequelize, DataTypes, Model, literal } from 'sequelize';
import { Schema } from './Schemas';

// Pool of voucher codes for "voucher" products. One row = one redemption
// code; once consumed, `is_used` flips to 1 and `order_id` records the
// order it was emitted to. This is independent of the UC/UniPin
// (`StoreUnipin`) flow and is keyed strictly by `package_id`.
export default (sequelize: Sequelize) => {
  class Voucher extends Model {
    public id!: number;
    public package_id!: number;
    public data!: string;
    public is_used!: number;
    public order_id!: number | null;

    static associate({ TopupPackage, Order }: typeof Schema) {
      this.belongsTo(TopupPackage, {
        foreignKey: 'package_id',
        constraints: false,
      });
      this.belongsTo(Order, {
        foreignKey: 'order_id',
        constraints: false,
      });
    }
  }

  Voucher.init(
    {
      package_id: { type: DataTypes.INTEGER, allowNull: false },
      data: { type: DataTypes.STRING(1024), allowNull: false },
      is_used: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
      order_id: { type: DataTypes.INTEGER, allowNull: true },
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
      tableName: 'vouchers',
      modelName: 'Voucher',
      sequelize,
      indexes: [
        { fields: ['package_id', 'is_used'] },
      ],
      ...config.config,
    },
  );

  if (process.env.AUTO_MIGRATION === 'ON') {
    Voucher.sync({ alter: true }).then();
  }

  return Voucher;
};
