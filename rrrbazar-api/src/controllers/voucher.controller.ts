import express from 'express';
import { Op, Sequelize } from 'sequelize';
import Schema from '../models';
import responseUtils from '../utils/response.utils';

const { Voucher, TopupPackage, TopupProduct } = Schema;

/**
 * Admin-side CRUD for the voucher pool. One row per redemption code,
 * scoped by `package_id`. The user-facing emit path lives in
 * `user.controller.ts` (see `emitProductVoucher`).
 */
class VoucherController {
  // GET /admin/packages/:id/voucher  → { product, package, vouchers, stats }
  listByPackage = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const package_id = req.params.id as any;
      const search = (req.query.q as string) || '';
      const status = (req.query.status as string) || ''; // 'used' | 'unused' | ''

      const pack = await TopupPackage.findByPk(package_id);
      if (!pack) {
        response.message = 'Package not found';
        return res.status(400).send(response.internalError);
      }
      const product = await TopupProduct.findByPk(pack.product_id);

      const where: any = { package_id };
      if (search) where.data = { [Op.like]: `%${search}%` };
      if (status === 'used') where.is_used = 1;
      else if (status === 'unused') where.is_used = 0;

      const vouchers = await Voucher.findAll({
        where,
        order: [['id', 'DESC']],
        limit: 500,
      });

      // Pool-level stats so the admin sees how many codes are left without
      // having to count rows on the client.
      const counts = await Voucher.findAll({
        where: { package_id },
        attributes: [
          'is_used',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        ],
        group: ['is_used'],
        raw: true,
      });
      const stats = { total: 0, used: 0, unused: 0 };
      for (const row of counts as any[]) {
        const c = Number(row.count) || 0;
        stats.total += c;
        if (Number(row.is_used) === 1) stats.used += c;
        else stats.unused += c;
      }

      response.data = { product, package: pack, vouchers, stats };
      res.send(response.response);
    } catch (error) {
      console.log('voucher.listByPackage error', error);
      res.status(400).send(response.internalError);
    }
  };

  // POST /admin/packages/add-voucher  body: { data: string[], package_id }
  bulkAdd = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const { data, package_id } = req.body;
      if (!package_id) {
        response.message = 'package_id is required';
        return res.status(400).send(response.internalError);
      }
      if (!Array.isArray(data) || data.length === 0) {
        response.message = 'No voucher codes provided';
        return res.status(400).send(response.internalError);
      }

      const pack = await TopupPackage.findByPk(package_id);
      if (!pack) {
        response.message = 'Package not found';
        return res.status(400).send(response.internalError);
      }

      const rows = data
        .map((v: any) => String(v || '').trim())
        .filter((v: string) => v.length > 0)
        .map((v: string) => ({ package_id, data: v, is_used: 0 }));

      if (rows.length === 0) {
        response.message = 'All submitted lines were empty';
        return res.status(400).send(response.internalError);
      }

      await Voucher.bulkCreate(rows);
      response.message = `${rows.length} voucher(s) added`;
      res.send(response.response);
    } catch (error) {
      console.log('voucher.bulkAdd error', error);
      res.status(400).send(response.internalError);
    }
  };

  // POST /admin/packages/delete-voucher/:id
  remove = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const id = req.params.id as any;
      const voucher = await Voucher.findByPk(id);
      if (!voucher) {
        response.message = 'Voucher not found';
        return res.status(400).send(response.internalError);
      }
      // Refuse to delete codes that have already been emitted — that record
      // is the only link between an order and the code we shipped.
      if (voucher.is_used === 1) {
        response.message = 'Cannot delete a voucher that has already been used';
        return res.status(400).send(response.internalError);
      }
      await voucher.destroy();
      response.message = 'Voucher deleted';
      res.send(response.response);
    } catch (error) {
      console.log('voucher.remove error', error);
      res.status(400).send(response.internalError);
    }
  };
}

export default new VoucherController();
