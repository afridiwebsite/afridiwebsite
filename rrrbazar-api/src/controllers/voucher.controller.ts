import express from "express";
import { Op, Sequelize } from "sequelize";
import Schema from "../models";
import responseUtils from "../utils/response.utils";

const { Voucher, TopupPackage, TopupProduct, PackageVoucherMap } = Schema;

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
      const search = (req.query.q as string) || "";
      const status = (req.query.status as string) || ""; // 'used' | 'unused' | ''
      const startDate = (req.query.start_date as string) || "";
      const endDate = (req.query.end_date as string) || "";
      const orderBy = (
        (req.query.order_by as string) || "status"
      ).toLowerCase();
      const orderDir = (
        (req.query.order_dir as string) || "DESC"
      ).toUpperCase();
      const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
      const limit = Math.min(
        Math.max(parseInt((req.query.limit as string) || "25", 10), 1),
        200,
      );

      const pack = await TopupPackage.findByPk(package_id);
      if (!pack) {
        response.message = "Package not found";
        return res.status(400).send(response.internalError);
      }
      const product = await TopupProduct.findByPk(pack.product_id);

      const where: any = { package_id };
      if (search) where.data = { [Op.like]: `%${search}%` };
      if (status === "used") where.is_used = 1;
      else if (status === "unused") where.is_used = 0;
      else if (status === "consumed") where.is_used = 2;

      // Date range — created_at is the only timestamp that makes sense for
      // filtering "when was the code seeded". Inclusive on both ends.
      const createdAtRange: any = {};
      if (startDate) createdAtRange[Op.gte] = new Date(startDate + "T00:00:00");
      if (endDate) createdAtRange[Op.lte] = new Date(endDate + "T23:59:59");
      if (Object.getOwnPropertySymbols(createdAtRange).length) {
        where.created_at = createdAtRange;
      }

      // Sort: by `is_used` (status) or by `id` (insertion order proxy).
      const dir = orderDir === "ASC" ? "ASC" : "DESC";
      const order: any[] =
        orderBy === "status"
          ? [
              ["is_used", dir],
              ["id", "DESC"],
            ]
          : [["id", dir]];

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
          "is_used",
          [Sequelize.fn("COUNT", Sequelize.col("id")), "count"],
        ],
        group: ["is_used"],
        raw: true,
      });
      const stats = { total: 0, used: 0, unused: 0, consumed: 0 };
      for (const row of counts as any[]) {
        const c = Number(row.count) || 0;
        stats.total += c;
        if (Number(row.is_used) === 1) stats.used += c;
        else if (Number(row.is_used) === 2) stats.consumed += c;
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
      console.log("voucher.listByPackage error", error);
      res.status(400).send(response.internalError);
    }
  };

  // POST /admin/packages/add-voucher  body: { data: string[], package_id }
  bulkAdd = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const { data, package_id } = req.body;
      if (!package_id) {
        response.message = "package_id is required";
        return res.status(400).send(response.internalError);
      }
      if (!Array.isArray(data) || data.length === 0) {
        response.message = "No voucher codes provided";
        return res.status(400).send(response.internalError);
      }

      const pack = await TopupPackage.findByPk(package_id);
      if (!pack) {
        response.message = "Package not found";
        return res.status(400).send(response.internalError);
      }

      const rows = data
        .map((v: any) => String(v || "").trim())
        .filter((v: string) => v.length > 0)
        .map((v: string) => ({ package_id, data: v, is_used: 0 }));

      if (rows.length === 0) {
        response.message = "All submitted lines were empty";
        return res.status(400).send(response.internalError);
      }

      await Voucher.bulkCreate(rows);
      response.message = `${rows.length} voucher(s) added`;
      res.send(response.response);
    } catch (error) {
      console.log("voucher.bulkAdd error", error);
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
        response.message = "Voucher not found";
        return res.status(400).send(response.internalError);
      }
      await voucher.destroy();
      response.message = "Voucher deleted";
      res.send(response.response);
    } catch (error) {
      console.log("voucher.remove error", error);
      res.status(400).send(response.internalError);
    }
  };

  // POST /admin/packages/bulk-delete-voucher  body: { ids: number[] }
  bulkRemove = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const raw = req.body?.ids;
      const ids = Array.isArray(raw)
        ? raw
            .map((x: any) => Number(x))
            .filter((n: number) => Number.isFinite(n) && n > 0)
        : [];
      if (ids.length === 0) {
        response.message = "No voucher ids provided";
        return res.status(400).send(response.internalError);
      }
      const removed = await Voucher.destroy({
        where: { id: { [Op.in]: ids } },
      });
      response.message = `${removed} voucher(s) deleted`;
      response.data = { deleted: removed };
      res.send(response.response);
    } catch (error) {
      console.log("voucher.bulkRemove error", error);
      res.status(400).send(response.internalError);
    }
  };

  // POST /admin/voucher/auto-distribute  body: { rawData: string }
  // Distributes vouchers to packages based on a hardcoded mapping of SKUs to
  // package names. Cleans noisy input (e.g. from spreadsheets) automatically.
  autoDistribute = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const { rawData } = req.body;
      if (!rawData) {
        response.message = "rawData is required";
        return res.status(400).send(response.internalError);
      }

      const mapping: Record<string, string> = {
        "BDMB-T-S": "🔰 20-UC Voucher",
        "UPBD-Q-S": "🔰 20-UC Voucher",
        "BDMB-U-S": "🔰 36-UC Voucher",
        "UPBD-R-S": "🔰 36-UC Voucher",
        "BDMB-J-S": "🔰 80-UC Voucher",
        "UPBD-G-S": "🔰 80-UC Voucher",
        "BDMB-I-S": "🔰 160-UC Voucher",
        "UPBD-F-S": "🔰 160-UC Voucher",
        "BDMB-K-S": "🔰 405-UC Voucher",
        "UPBD-H-S": "🔰 405-UC Voucher",
        "BDMB-L-S": "🔰 810-UC Voucher",
        "UPBD-I-S": "🔰 810-UC Voucher",
        "BDMB-M-S": "🔰 1625-UC Voucher",
        "UPBD-J-S": "🔰 1625-UC Voucher",
        "BDMB-Q-S": "🟪 Weekly-UC Vouchers",
        "UPBD-N-S": "🟪 Weekly-UC Vouchers",
        "BDMB-S-S": "🟧Monthly-UC Vouchers",
        "UPBD-P-S": "🟧Monthly-UC Vouchers",
      };

      const keys = Object.keys(mapping);
      const escapedKeys = keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      const regex = new RegExp(`(${escapedKeys.join("|")})`, "g");

      // Split the entire rawData by keys, keeping the keys in the result.
      const segments = String(rawData).split(regex);
      const parsed: { packageName: string; code: string }[] = [];

      // segments[0] is text before the first key (noise/headers).
      // Then it follows: [key, tail, key, tail, ...]
      for (let i = 1; i < segments.length; i += 2) {
        const key = segments[i];
        const tail = segments[i + 1] || "";

        // The tail contains the serial number, voucher code, and any noise 
        // until the next key. Clean and split into words.
        const words = tail
          .replace(/[:\t\r\n]+/g, " ")
          .split(/\s+/)
          .map((w) => w.trim())
          .filter(Boolean);

        // Find the best candidate for the voucher code in this segment's tail.
        const candidates = words.filter((w) => {
          if (/^[0-9]+\.$/.test(w)) return false;
          if (/^\[.*\]$/.test(w)) return false;
          const low = w.toLowerCase();
          if (["ready", "active", "used", "consumed"].includes(low))
            return false;
          return w.length > 5;
        });

        if (candidates.length > 0) {
          // Heuristic: pick the one with most hyphens, then longest.
          candidates.sort((a, b) => {
            const aHyphens = (a.match(/-/g) || []).length;
            const bHyphens = (b.match(/-/g) || []).length;
            if (aHyphens !== bHyphens) return bHyphens - aHyphens;
            return b.length - a.length;
          });

          parsed.push({
            packageName: mapping[key],
            code: candidates[0],
          });
        }
      }

      if (parsed.length === 0) {
        response.message = "No valid vouchers found for mapping";
        return res.status(400).send(response.internalError);
      }

      // Resolve package names to IDs.
      const uniqueNames = [...new Set(parsed.map((p) => p.packageName))];

      console.log(uniqueNames);
      const packages = await TopupPackage.findAll({
        where: { name: { [Op.in]: uniqueNames } },
        attributes: ["id", "name"],
        raw: true,
      });

      const nameToId = new Map((packages as any[]).map((p) => [p.name, p.id]));
      const rows: any[] = [];
      const skippedPackages = new Set<string>();

      for (const item of parsed) {
        const id = nameToId.get(item.packageName);
        if (id) {
          rows.push({
            package_id: id,
            data: item.code,
            is_used: 0,
          });
        } else {
          skippedPackages.add(item.packageName);
        }
      }

      if (rows.length === 0) {
        response.message = `No matching packages found in database for ${uniqueNames.join(", ")}`;
        return res.status(400).send(response.internalError);
      }

      await Voucher.bulkCreate(rows);

      let msg = `${rows.length} voucher(s) distributed across ${uniqueNames.length - skippedPackages.size} package(s).`;
      if (skippedPackages.size > 0) {
        msg += ` Skipped missing packages: ${Array.from(skippedPackages).join(", ")}`;
      }

      response.message = msg;
      res.send(response.response);
    } catch (error) {
      console.log("voucher.autoDistribute error", error);
      res.status(400).send(response.internalError);
    }
  };

  // GET /admin/voucher-products-with-packages
  // Returns voucher-type products (is_voucher = 1) with their packages —
  // used to populate the autodelivery mapping modal.
  voucherProductsWithPackages = async (
    req: express.Request,
    res: express.Response,
  ) => {
    const response = new responseUtils();
    try {
      const products = await TopupProduct.findAll({
        where: { is_voucher: 1 },
        attributes: ["id", "name", "logo"],
        order: [["serial", "ASC"]],
        raw: true,
      });
      if (products.length === 0) {
        response.data = [];
        return res.send(response.response);
      }
      const packs = await TopupPackage.findAll({
        where: { product_id: { [Op.in]: products.map((p: any) => p.id) } },
        attributes: ["id", "name", "product_id"],
        order: [["serial", "ASC"]],
        raw: true,
      });
      const byProduct = new Map<number, any[]>();
      for (const p of packs as any[]) {
        const arr = byProduct.get(p.product_id) || [];
        arr.push({ id: p.id, name: p.name });
        byProduct.set(p.product_id, arr);
      }
      response.data = (products as any[]).map((p) => ({
        id: p.id,
        name: p.name,
        logo: p.logo,
        packages: byProduct.get(p.id) || [],
      }));
      res.send(response.response);
    } catch (error) {
      console.log("voucher.voucherProductsWithPackages error", error);
      res.status(400).send(response.internalError);
    }
  };

  // GET /admin/topup-package/:id/voucher-maps
  // Returns the list of mappings for a package, enriched with the voucher
  // package + product names for display.
  listMaps = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const package_id = req.params.id as any;
      const maps = await PackageVoucherMap.findAll({
        where: { topup_package_id: package_id },
        order: [["id", "ASC"]],
        raw: true,
      });
      if (maps.length === 0) {
        response.data = [];
        return res.send(response.response);
      }
      const voucherPackIds = (maps as any[]).map((m) => m.voucher_package_id);
      const packs = await TopupPackage.findAll({
        where: { id: { [Op.in]: voucherPackIds } },
        attributes: ["id", "name", "product_id"],
        raw: true,
      });
      const productIds = Array.from(
        new Set(packs.map((p: any) => p.product_id).filter(Boolean)),
      );
      const products = productIds.length
        ? await TopupProduct.findAll({
            where: { id: { [Op.in]: productIds } },
            attributes: ["id", "name"],
            raw: true,
          })
        : [];
      const packById = new Map((packs as any[]).map((p) => [p.id, p]));
      const productById = new Map((products as any[]).map((p) => [p.id, p]));
      response.data = (maps as any[]).map((m) => {
        const pack = packById.get(m.voucher_package_id);
        const product = pack ? productById.get(pack.product_id) : null;
        return {
          id: m.id,
          voucher_package_id: m.voucher_package_id,
          voucher_package_name:
            pack?.name || `Package #${m.voucher_package_id}`,
          voucher_product_id: pack?.product_id || null,
          voucher_product_name: product?.name || "—",
        };
      });
      res.send(response.response);
    } catch (error) {
      console.log("voucher.listMaps error", error);
      res.status(400).send(response.internalError);
    }
  };

  // POST /admin/topup-package/:id/voucher-maps
  // Body: { voucher_package_ids: number[] } — replaces the full mapping set.
  saveMaps = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const package_id = Number(req.params.id);
      if (!package_id) {
        response.message = "package_id is required";
        return res.status(400).send(response.internalError);
      }
      const raw = req.body?.voucher_package_ids;
      // Duplicates are now meaningful: each occurrence of the same
      // voucher_package_id emits one extra voucher per order. We keep the
      // multiset as supplied (only filtering out garbage values).
      const voucherIds = Array.isArray(raw)
        ? raw
            .map((x: any) => Number(x))
            .filter((n: number) => Number.isFinite(n) && n > 0)
        : [];
      await PackageVoucherMap.destroy({
        where: { topup_package_id: package_id },
      });
      if (voucherIds.length > 0) {
        await PackageVoucherMap.bulkCreate(
          voucherIds.map((vid) => ({
            topup_package_id: package_id,
            voucher_package_id: vid,
          })),
        );
      }
      response.message = `${voucherIds.length} mapping(s) saved`;
      response.data = { count: voucherIds.length };
      res.send(response.response);
    } catch (error) {
      console.log("voucher.saveMaps error", error);
      res.status(400).send(response.internalError);
    }
  };
}

export default new VoucherController();
