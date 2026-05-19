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
  // GET /admin/packages/:id/voucher
  //   query: q, status (used|unused), start_date, end_date,
  //          order_by (id|status), order_dir (ASC|DESC),
  //          page, limit
  //   → { product, package, vouchers, stats, total, page, limit }
  listByPackage = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const package_id = req.params.id as any;
      const search = (req.query.q as string) || '';
      const status = (req.query.status as string) || ''; // 'used' | 'unused' | ''
      const startDate = (req.query.start_date as string) || '';
      const endDate = (req.query.end_date as string) || '';
      const orderBy = ((req.query.order_by as string) || 'id').toLowerCase();
      const orderDir = ((req.query.order_dir as string) || 'DESC').toUpperCase();
      const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
      const limit = Math.min(
        Math.max(parseInt((req.query.limit as string) || '25', 10), 1),
        200,
      );

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

      // Date range — created_at is the only timestamp that makes sense for
      // filtering "when was the code seeded". Inclusive on both ends.
      const createdAtRange: any = {};
      if (startDate) createdAtRange[Op.gte] = new Date(startDate + 'T00:00:00');
      if (endDate) createdAtRange[Op.lte] = new Date(endDate + 'T23:59:59');
      if (Object.getOwnPropertySymbols(createdAtRange).length) {
        where.created_at = createdAtRange;
      }

      // Sort: by `is_used` (status) or by `id` (insertion order proxy).
      const dir = orderDir === 'ASC' ? 'ASC' : 'DESC';
      const order: any[] =
        orderBy === 'status'
          ? [['is_used', dir], ['id', 'DESC']]
          : [['id', dir]];

      const { rows: vouchers, count: total } = await Voucher.findAndCountAll({
        where,
        order,
        offset: (page - 1) * limit,
        limit,
      });

      // Pool-level stats so the admin sees how many codes are left without
      // having to count rows on the client. These are NOT scoped by filters —
      // they always reflect the whole pool.
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

      response.data = {
        product,
        package: pack,
        vouchers,
        stats,
        total,
        page,
        limit,
      };
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
  // Note: used vouchers can be deleted as well — admins may want to purge
  // codes whose orders are already settled. The link to the order remains
  // discoverable via `Voucher.order_id` on the order side until the row is
  // physically removed.
  remove = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const id = req.params.id as any;
      const voucher = await Voucher.findByPk(id);
      if (!voucher) {
        response.message = 'Voucher not found';
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

  // POST /admin/packages/bulk-delete-voucher  body: { ids: number[] }
  bulkRemove = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const raw = req.body?.ids;
      const ids = Array.isArray(raw)
        ? raw.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n) && n > 0)
        : [];
      if (ids.length === 0) {
        response.message = 'No voucher ids provided';
        return res.status(400).send(response.internalError);
      }
      const removed = await Voucher.destroy({ where: { id: { [Op.in]: ids } } });
      response.message = `${removed} voucher(s) deleted`;
      response.data = { deleted: removed };
      res.send(response.response);
    } catch (error) {
      console.log('voucher.bulkRemove error', error);
      res.status(400).send(response.internalError);
    }
  };
}

export default new VoucherController();
