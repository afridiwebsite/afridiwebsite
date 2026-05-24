import crypto from "crypto";
import express, { NextFunction } from "express";
import createError from "http-errors";
import { Op, Sequelize } from "sequelize";
import Schema from "../models";
import responseUtils from "../utils/response.utils";
import smsHelper from "../helpers/sms";
import fastPay from "../helpers/fastpay";
import autoOrder from "../helpers/autoorder";
import playerName from "../helpers/playername";
const {
  User,
  Banner,
  Notice,
  Admin,
  TopupProduct,
  TopupProductInput,
  Product,
  TopupPackage,
  PaymentMethod,
  Transaction,
  ProductOrder,
  Order,
  Otp,
  PasswordReset,
  TopupPaymentMethod,
  Inventorie,
  EarnWallet,
  WithdrawEarnWallet,
  StoreUnipin,
  AutoServer,
  CoinTransaction,
  SiteSetting,
  Voucher,
  PackageVoucherMap,
} = Schema;

// Allocate one unused voucher to an order. Wraps the find+assign so the
// race window between the two is small. Returns the voucher row or null
// if the pool is empty.
async function emitProductVoucher(packageId: number, orderId: number) {
  const voucher = await Voucher.findOne({
    where: { is_used: 0, package_id: packageId },
    order: [["id", "ASC"]],
  });
  if (!voucher) return null;
  voucher.is_used = 1;
  voucher.order_id = orderId;
  await voucher.save();
  return voucher;
}

// Release a previously emitted voucher back to the pool. Used when an
// auto-delivery order partially allocates and we need to roll back.
async function releaseVoucher(voucher: any) {
  if (!voucher) return;
  voucher.is_used = 0;
  voucher.order_id = null;
  await voucher.save();
}

// Parse the package's stored tags into an array of trimmed, non-empty
// strings. Stored as JSON in the `tags` TEXT column; accepts an
// already-parsed array too (defensive).
function parseTags(raw: any): string[] {
  let arr: any = raw;
  if (typeof arr === "string") {
    const s = arr.trim();
    if (s.length === 0) return [];
    try {
      arr = JSON.parse(s);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .map((v: any) => String(v == null ? "" : v).trim())
    .filter((v: string) => v.length > 0);
}
/******************************************************************************
 *                              User Controller
 ******************************************************************************/
class UserController {
  async getUsers(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    const query = req.query.q || "";

    const limit: any = parseInt(req.query.limit?.toString() || "20");
    const page: any = parseInt(req.query.page?.toString() || "1");

    const user_count = await User.count();

    const data = await User.findAll({
      offset: (page - 1) * limit,
      limit: limit,
      where: {
        [Op.or]: [
          {
            email: { [Op.like]: `%${query}%` },
          },
          {
            phone: { [Op.like]: `%${query}%` },
          },
          {
            id: { [Op.like]: `%${query}%` },
          },
        ],
      },
      // order: [
      //   ['created_at', 'DESC'],
      // ],
    });
    response.data = { data, user_count };
    res.send(response.response);
  }

  async updateUser(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    const id = req.params.id as any;
    const { phone, wallet, address, city, zip_code, password } = req.body;

    const user = await User.findByPk(id);

    if (!user) {
      response.message = "User not found to update";
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response);
    }

    if (phone) {
      user.phone = phone;
    }
    if (wallet) {
      user.wallet = wallet;
    }
    user.address = address;
    user.city = city;
    user.zip_code = zip_code;
    if (password) {
      user.password = password;
    }
    await user.save();

    response.message = "User updated successfully";
    res.send(response.response);
  }

  async getUserById(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    const id = req.params.id as any;

    const data = await User.findByPk(id);

    if (!data) {
      response.message = "User not found";
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response);
    }

    response.data = data;
    res.send(response.response);
  }

  async deleteUser(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    const id = req.params.id as any;

    const data = await User.destroy({
      where: {
        id,
      },
    });

    response.message = "User deleted successfully";
    res.send(response.response);
  }

  userEarnWallet = async (
    req: express.Request,
    res: express.Response,
    next: NextFunction,
  ) => {
    const response = new responseUtils();
    try {
      const user_id = req.params.id as any;
      const user = await User.findByPk(user_id);

      if (!user) {
        throw createError(400, "Something wronge with user");
      }

      const wallet = await EarnWallet.findOne({
        where: {
          user_id: user_id,
        },
        order: [["id", "DESC"]],
      });

      response.data = wallet ? wallet : { total_amount: 0 };
      return res.send(response.response);
    } catch (error) {
      next(error);
    }
  };

  userEarnWalletUpdate = async (
    req: express.Request,
    res: express.Response,
    next: NextFunction,
  ) => {
    const response = new responseUtils();
    try {
      const user_id = req.params.id as any;
      const { type, amount } = req.body;
      const user = await User.findByPk(user_id);
      if (!user) {
        throw createError(400, "Something wronge with user");
      }
      const wallet = await EarnWallet.findOne({
        where: {
          user_id: user_id,
        },
        order: [["id", "DESC"]],
      });

      if (!amount) throw createError(400, "Enter amount");

      let newAmount = 0;

      if (wallet) {
        newAmount = wallet.total_amount;
      }

      if (type === "add") {
        newAmount = Number(newAmount) + Number(amount);
      } else if (type === "deduct") {
        if (Number(newAmount) < Number(amount)) {
          throw createError(400, "Insufficient balance");
        }
        newAmount = Number(newAmount) - Number(amount);
      } else {
        throw createError(400, "Action type missing");
      }

      await EarnWallet.create({
        user_id: user_id,
        total_amount: newAmount,
        amount,
        purpose: "Add by admin",
      });

      response.message = "Wallet updated successfully";

      return res.send(response.response);
    } catch (error) {
      console.log(error);
      next(error);
    }
  };

  myEarnWallet = async (
    req: express.Request,
    res: express.Response,
    next: NextFunction,
  ) => {
    const response = new responseUtils();
    try {
      const user_id = req.user.id;
      const user = await User.findByPk(user_id);

      if (!user) {
        throw createError(400, "Something wronge with user");
      }

      const wallet = await EarnWallet.findOne({
        where: {
          user_id: user_id,
        },
        order: [["id", "DESC"]],
      });

      response.data = wallet ? wallet : { total_amount: 0 };
      return res.send(response.response);
    } catch (error) {
      next(error);
    }
  };

  getUserSearch = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const query = req.query.q || "";
      const user = await User.findAll({
        attributes: [
          "id",
          [
            Sequelize.fn(
              "concat",
              Sequelize.col("username"),
              " [",
              Sequelize.col("email"),
              "] [",
              Sequelize.col("phone"),
              "]",
            ),
            "name",
          ],
        ],
        where: {
          [Op.or]: [
            {
              id: { [Op.like]: `%${query}%` },
            },
            {
              username: { [Op.like]: `%${query}%` },
            },
            {
              email: {
                [Op.like]: `%${query}%`,
              },
            },
            {
              phone: {
                [Op.like]: `%${query}%`,
              },
            },
          ],
        },
        limit: 10,
      });
      response.data = user;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  getBanners = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const banners = await Banner.findAll({
        where: {
          isactive: 1,
        },
      });
      response.data = banners;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  getNotices = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const notices = await Notice.findAll();
      response.data = notices;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  getNoticModal = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const notices = await Notice.findOne({
        where: {
          for_home_modal: 1,
          type: "normal",
          is_active: 1,
        },
        order: [["id", "ASC"]],
      });
      response.data = notices || {};
      console.log(notices);
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  getNoticHeader = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const notices = await Notice.findAll({
        where: {
          type: {
            [Op.in]: ["marquee", "navbar_bottom"],
          },
          is_active: 1,
        },
        order: [["id", "ASC"]],
      });
      response.data = notices || [];
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  // Admin voucher-pool overview. One row per package belonging to a
  // voucher-type product (is_voucher = 1), including packages whose pool
  // is still empty so the admin can see what needs seeding. Each row is
  // augmented with its product name and current Ready/Used/Total counts.
  getVoucherStatsByPackage = async (
    req: express.Request,
    res: express.Response,
  ) => {
    const response = new responseUtils();
    try {
      const products = await TopupProduct.findAll({
        where: { is_voucher: 1 },
        attributes: ["id", "name"],
        raw: true,
      });
      if (products.length === 0) {
        response.data = [];
        return res.send(response.response);
      }
      const productById = new Map(products.map((p: any) => [p.id, p]));

      const packs = await TopupPackage.findAll({
        where: { product_id: { [Op.in]: products.map((p: any) => p.id) } },
        attributes: ["id", "name", "product_id"],
        raw: true,
      });
      if (packs.length === 0) {
        response.data = [];
        return res.send(response.response);
      }

      const stats = await Voucher.findAll({
        where: { package_id: { [Op.in]: packs.map((p: any) => p.id) } },
        attributes: [
          "package_id",
          [
            Sequelize.fn(
              "SUM",
              Sequelize.literal("CASE WHEN is_used = 0 THEN 1 ELSE 0 END"),
            ),
            "unused",
          ],
          [
            Sequelize.fn(
              "SUM",
              Sequelize.literal("CASE WHEN is_used = 1 THEN 1 ELSE 0 END"),
            ),
            "used",
          ],
          [Sequelize.fn("COUNT", Sequelize.col("id")), "total"],
        ],
        group: ["package_id"],
        raw: true,
      });
      const statsByPackage = new Map<number, any>();
      for (const s of stats as any[]) statsByPackage.set(s.package_id, s);

      const data = (packs as any[]).map((p) => {
        const product = productById.get(p.product_id);
        const stat = statsByPackage.get(p.id);
        return {
          package_id: p.id,
          package_name: p.name || `Package #${p.id}`,
          product_id: p.product_id || null,
          product_name: (product as any)?.name || "—",
          total: Number(stat?.total) || 0,
          used: Number(stat?.used) || 0,
          unused: Number(stat?.unused) || 0,
        };
      });
      // Sort by package name to keep the order stable across refreshes.
      data.sort((a, b) => a.package_name.localeCompare(b.package_name));

      response.data = data;
      res.send(response.response);
    } catch (error) {
      console.log("getVoucherStatsByPackage error", error);
      res.status(400).send(response.internalError);
    }
  };

  getTopupProducts = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const products = await TopupProduct.findAll({
        where: {
          is_active: 1,
        },
        order: [["serial", "ASC"]],
      });
      response.data = products;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  getTopupPackagesByProductId = async (
    req: express.Request,
    res: express.Response,
  ) => {
    const response = new responseUtils();
    try {
      const product_id = req.params.id as any;

      const product = await TopupProduct.findByPk(product_id, {
        include: [
          {
            model: TopupProductInput,
            as: "inputs",
            required: false,
            // Don't leak the verify URL to the client — the verify endpoint
            // looks it up server-side by input id.
            attributes: [
              "id",
              "title",
              "is_player_id",
              "verify_player_name",
              "serial",
            ],
          },
        ],
        order: [[{ model: TopupProductInput, as: "inputs" }, "serial", "ASC"]],
      });

      if (!product) {
        response.message = "TopupProduct not found";
        return res.status(400).send(response.internalError);
      }

      const packages = await TopupPackage.findAll({
        where: {
          product_id,
        },
        order: [["serial", "ASC"]],
      });
      // response.data = { ...product, topuppackage: packages }
      response.data = { product, packages };
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  // Verify a player ID against the admin-configured verify_url for a given
  // input. The verify_url may contain a "{value}" placeholder; if it's
  // missing we just append the value. Response is whatever the upstream
  // service returns (proxied so the client doesn't see the URL or hit CORS).
  verifyPlayerInput = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const input_id = req.params.input_id as any;
      const value = String(req.query.value || "").trim();

      if (!value) {
        response.message = "Missing value";
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response);
      }

      const input = await TopupProductInput.findByPk(input_id);
      if (!input) {
        response.message = "Input not found";
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response);
      }
      if (!input.verify_player_name || !input.verify_url) {
        response.message = "Verification is not configured for this input";
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response);
      }

      // The admin form enforces this, but double-check server-side: the URL
      // is meaningless without a place to inject the entered ID.
      if (!input.verify_url.includes("{value}")) {
        response.message =
          "Verify URL is misconfigured — missing {value} tag. Ask the admin to fix the product.";
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response);
      }
      const encoded = encodeURIComponent(value);
      const url = input.verify_url.replace(/\{value\}/g, encoded);

      // Lazy require axios so we don't pull it into the top of the file just
      // for this one branch.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const axios = require("axios");
      const headers: Record<string, string> = {};
      if (input.api_token) {
        headers.Authorization = `Bearer ${input.api_token}`;
      }
      const upstream = await axios.get(url, { timeout: 8000, headers });
      const body = upstream.data;

      // Region lock: if admin pinned a region for this input, the upstream
      // response is only considered valid when its region matches. Even a
      // successful upstream hit is rejected on mismatch (account is real, but
      // not eligible for this product).
      if (input.region_lock) {
        const expected = String(input.region_lock).trim().toUpperCase();
        const actual = String(body?.player_info?.region ?? body?.region ?? "")
          .trim()
          .toUpperCase();
        if (!actual || actual !== expected) {
          response.message = actual
            ? `Region mismatch — this product is only available for ${expected} accounts (got ${actual}).`
            : `Region check failed — upstream response did not include a region (required: ${expected}).`;
          response.status = 400;
          response.success = false;
          return res.status(400).send(response.response);
        }
      }

      response.data = body;
      return res.send(response.data);
    } catch (error) {
      console.log("verifyPlayerInput error", (error as any)?.message || error);
      res.status(400).send(response.internalError);
    }
  };

  // Returns the topuppackage IDs the current user is currently BLOCKED from
  // re-ordering. The client uses this to disable already-claimed packs on
  // /topup/:id without leaking other users' history.
  //
  // Two modes:
  //   order_once = 1 → any prior order by this user blocks forever
  //   order_once = 2 → only orders in the last 24 h block (daily cooldown)
  myOrderedOncePackages = async (
    req: express.Request,
    res: express.Response,
  ) => {
    const response = new responseUtils();
    try {
      const user_id = req.user.id;
      const limitedPacks = await TopupPackage.findAll({
        where: { order_once: { [Op.in]: [1, 2] } },
        attributes: ["id", "order_once"],
        raw: true,
      });
      if (limitedPacks.length === 0) {
        response.data = { ordered_package_ids: [] };
        return res.send(response.response);
      }
      const onceIds = (limitedPacks as any[])
        .filter((p) => Number(p.order_once) === 1)
        .map((p) => p.id);
      const dailyIds = (limitedPacks as any[])
        .filter((p) => Number(p.order_once) === 2)
        .map((p) => p.id);

      const blocked = new Set<number>();

      if (onceIds.length > 0) {
        const orders = await Order.findAll({
          where: { user_id, topuppackage_id: { [Op.in]: onceIds } },
          attributes: ["topuppackage_id"],
          raw: true,
        });
        for (const o of orders as any[]) blocked.add(o.topuppackage_id);
      }

      if (dailyIds.length > 0) {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const orders = await Order.findAll({
          where: {
            user_id,
            topuppackage_id: { [Op.in]: dailyIds },
            created_at: { [Op.gte]: cutoff },
          },
          attributes: ["topuppackage_id"],
          raw: true,
        });
        for (const o of orders as any[]) blocked.add(o.topuppackage_id);
      }

      response.data = { ordered_package_ids: Array.from(blocked) };
      return res.send(response.response);
    } catch (error) {
      console.log(
        "myOrderedOncePackages error",
        (error as any)?.message || error,
      );
      res.status(400).send(response.internalError);
    }
  };

  getPaymentMethod = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();

    try {
      const paymentMethods = await PaymentMethod.findAll({
        where: {
          status: 1,
        },
      });
      response.data = paymentMethods;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  userTransaction = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();

    const id = req.user.id;

    try {
      const userTransactions = await Transaction.findAll({
        where: {
          user_id: id,
        },
        order: [["id", "DESC"]],
      });

      response.data = userTransactions;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  // Sum of money the current user has added to their wallet — every
  // completed Transaction row counts. Used by the profile page.
  myAddedTotal = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const id = req.user.id;
      const total = await Transaction.sum("amount", {
        where: {
          user_id: id,
          status: "completed",
        },
      });
      response.data = { total: Number(total) || 0 };
      res.send(response.response);
    } catch (error) {
      console.log("myAddedTotal error", error);
      res.status(400).send(response.internalError);
    }
  };

  myOrder = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();

    const id = req.user.id;

    try {
      const orders = await Order.findAll({
        where: {
          user_id: id,
        },
        include: [
          {
            model: Voucher,
            required: false,
            attributes: ["id", "data"],
          },
          {
            model: TopupProduct,
            required: false,
            attributes: ["id", "name", "logo", "redeem_link", "is_voucher"],
          },
        ],
        order: [["created_at", "DESC"]],
        attributes: { exclude: ["uc", "ingamepassword", "bprice"] },
      });

      response.data = orders;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  orderList = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();

    const product_id = req.params.product_id;

    try {
      const orders = await Order.findAll({
        attributes: [
          "id",
          "name",
          "playerid",
          "status",
          "created_at",
          "updated_at",
          "amount",
          "user_id",
          "product_id",
          [
            // Qualify the columns — Order, User, and TopupProduct all have a
            // created_at/updated_at, so MySQL throws "ambiguous" without the
            // table prefix once the joins are applied.
            Sequelize.literal(
              "TIMESTAMPDIFF(SECOND, `Order`.`created_at`, `Order`.`updated_at`)",
            ),
            "diff_in_seconds",
          ],
        ],
        include: [
          {
            model: User,
            attributes: ["id", "username", "email", "avatar"],
            required: false,
          },
          {
            model: TopupProduct,
            attributes: ["id", "name", "logo"],
            required: false,
          },
        ],
        where: {
          product_id: product_id,
        },
        order: [[Sequelize.col("Order.created_at"), "DESC"]],
        limit: product_id == "16" ? 500 : 20,
      });

      response.data = orders;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  getProductOrders = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();

    try {
      const orders = await Order.findAll({
        attributes: [
          "id",
          "name",
          "playerid",
          "status",
          "created_at",
          "updated_at",
          "user_id",
          "product_id",
          [
            // Qualify with `Order` so the joined User / TopupProduct tables
            // don't make MySQL complain about ambiguous created_at/updated_at.
            Sequelize.literal(
              "TIMESTAMPDIFF(SECOND, `Order`.`created_at`, `Order`.`updated_at`)",
            ),
            "diff_in_seconds",
          ],
        ],
        include: [
          {
            model: User,
            attributes: ["id", "username", "email", "avatar"],
            required: false,
          },
          {
            model: TopupProduct,
            attributes: ["id", "name", "logo"],
            required: false,
          },
        ],
        order: [[Sequelize.col("Order.created_at"), "DESC"]],
        limit: 20,
      });

      response.data = orders;
      res.send(response.response);
    } catch (error) {
      console.log("getProductOrders error:", error);
      res.status(400).send(response.internalError);
    }
  };

  getUserWithdrawRequest = async (
    req: express.Request,
    res: express.Response,
  ) => {
    const response = new responseUtils();
    try {
      const reqeusts = await WithdrawEarnWallet.findAll({
        where: {
          user_id: req.user.id,
        },
        order: [["id", "DESC"]],
      });

      response.data = reqeusts;

      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  async topupPackageOrder(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const {
        topuppackage_id,
        product_id,
        name,
        accounttype,
        ingameid,
        ingamepassword,
        playerid,
        phone,
        payment_mathod,
        securitycode,
        quantity: rawQuantity,
      } = req.body;

      let user_id = req.user.id;

      const topupPackage = await TopupPackage.findByPk(topuppackage_id);

      if (!topupPackage) {
        response.message = "Topup package not found";
        return res.status(400).send(response.response);
      }

      // Enforce per-player-ID re-order limit. Mode 1 = forever; mode 2 =
      // 24-h cooldown. Only meaningful when the product has a Player ID
      // input configured — without one we have no key to scope "used"
      // against, so the limit has no effect.
      const orderOnceMode = Number((topupPackage as any).order_once);
      if (orderOnceMode === 1 || orderOnceMode === 2) {
        const playerIdInputCount = await TopupProductInput.count({
          where: { topup_product_id: product_id, is_player_id: 1 },
        });
        const trimmedPlayerId = String(playerid || "").trim();
        if (playerIdInputCount > 0 && trimmedPlayerId) {
          const where: any = {
            playerid: trimmedPlayerId,
            topuppackage_id,
          };
          if (orderOnceMode === 2) {
            where.created_at = {
              [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000),
            };
          }
          const previous = await Order.count({ where });
          if (previous > 0) {
            response.message =
              orderOnceMode === 2
                ? "This player ID has already claimed this package in the last 24 hours — try again later."
                : "This player ID has already claimed this package — it's limited to one per player ID.";
            return res.status(400).send(response.response);
          }
        }
      }
      // const topupPaymentMethods = await PaymentMethod.query().where("is_active", 1).fetch()
      // const payments = topupPaymentMethods.rows.map(data => data.payment_method)

      const unitPrice = parseFloat(topupPackage.price);
      const unitBprice = parseFloat(topupPackage.bprice);

      let product = await TopupProduct.findByPk(product_id);

      if (!product) {
        response.message = "TopupProduct not found";
        return res.status(400).send(response.response);
      }

      // Quantity only applies to voucher-pool products; everything else is
      // implicitly a quantity of 1. Clamp to a sane upper bound to keep
      // accidental bulk orders bounded.
      const isVoucherProduct = (product as any).is_voucher == 1;
      const quantity = isVoucherProduct
        ? Math.min(
            Math.max(parseInt(String(rawQuantity || "1"), 10) || 1, 1),
            100,
          )
        : 1;
      let amount = unitPrice * quantity;
      let bprice = unitBprice * quantity;
      if (product.is_active == 0) {
        response.message = "TopupProduct is not available for order";
        return res.status(400).send(response.response);
      }

      // Quantity-tracked stock gate. We re-read the live count from the
      // already-loaded `topupPackage` and reject upfront so we never charge
      // a wallet or open a payment session against a sold-out package.
      const stockTracking = Number((topupPackage as any).stock_tracking) === 1;
      const stockBefore = Number((topupPackage as any).stock_quantity) || 0;
      if (stockTracking) {
        if (stockBefore <= 0) {
          response.message = "This package is out of stock.";
          return res.status(400).send(response.response);
        }
        if (stockBefore < quantity) {
          response.message = `Only ${stockBefore} unit(s) available — reduce quantity and try again.`;
          return res.status(400).send(response.response);
        }
      }

      if (product.is_offer == 1 && product.offer_items > 0) {
        product.offer_items = product.offer_items - 1;
        product = await product.save();
      }

      if (product.is_offer == 1 && product.offer_items <= 0) {
        response.message = "This offer is not available at this time";
        return res.status(400).send(response.response);
      }

      if (product.is_offer == 1) {
        const checkOrder = await Order.count({
          where: {
            playerid: playerid,
            product_id: product_id,
          },
        });
        if (checkOrder > 0) {
          response.message =
            "This offer has already been taken by this player ID";
          return res.status(400).send(response.response);
        }
      }

      // if (bprice > product.price) {
      //   response.message = 'Stock out';
      //   return res.status(400).send(response.response);
      // }

      const user = await User.findByPk(user_id);

      if (!user) {
        response.message = "User not found";
        return res.status(400).send(response.response);
      }

      let wallet = user.wallet;

      if (wallet < amount && payment_mathod != "auto_payment") {
        response.message = "Not enough balance";
        return res.status(400).send(response.response);
      }

      let order_status = "pending";
      let unipin_code = "";
      let hold_unipin_id = 0;

      if (topupPackage.type == "2") {
        const store_unipin = await StoreUnipin.findOne({
          where: {
            status: 1,
            uc: topupPackage.uc,
          },
          order: Sequelize.literal("RAND()"),
        });
        if (!store_unipin) {
          response.message =
            "UniPin Stock Out For This Product (" + topupPackage.name + ")";
          return res.status(404).send(response.response);
        }

        order_status = "completed";
        unipin_code = store_unipin.code;

        if (payment_mathod != "auto_payment") {
          store_unipin.status = 2;
          store_unipin.user_id = user_id;
          await store_unipin.save();
        } else {
          hold_unipin_id = store_unipin.id;
          store_unipin.status = 5;
          await store_unipin.save();
        }
      }

      const user_order_data = {
        topuppackage_id,
        product_id,
        name: topupPackage.name,
        accounttype,
        payment_status: 1,
        ingameid,
        ingamepassword,
        playerid,
        phone,
        securitycode,
        status: order_status,
        payment_mathod: "wallet",
        brief_note: unipin_code == "" ? "" : "UniPin: " + unipin_code,
        user_id,
        amount,
        bprice,
      };

      if (payment_mathod === "pay") {
        // product.price = product.price - bprice;
        // await product.save();

        // Updating user wallet
        if (wallet - amount >= 0) {
          user.wallet = user.wallet - amount;
        } else {
          user.wallet = 0;
        }

        await user.save();
      } else if (payment_mathod === "auto_payment") {
        // The order itself is not yet persisted — the webhook creates it once
        // payment is confirmed. To keep UddoktaPay's metadata flat (some
        // providers truncate or mishandle nested objects on the callback) we
        // JSON-stringify the order payload into a single `order` field.
        const orderPayload = {
          topuppackage_id,
          product_id,
          accounttype,
          ingameid,
          ingamepassword,
          playerid,
          phone,
          securitycode,
          status: order_status,
          payment_mathod: "wallet",
          brief_note: unipin_code == "" ? "" : "UniPin: " + unipin_code,
          user_id,
          amount,
          bprice,
        };

        const meta_data = {
          token:
            process.env.UDDOKTAPAY_API_KEY ||
            "18b2ca74b5fe2f63d8293687d94fde987925c98f",
          id: user.id,
          paymentmethod: 1, // UddoktaPay method ID
          unipin_id: hold_unipin_id,
          order: JSON.stringify(orderPayload),
        };

        const webhookUrl = `${process.env.API_URL || "https://api.rrrbazar.com"}/api/v1/webhook`;
        const redirectUrl = `${process.env.CLIENT_URL || "https://rrrbazar.com"}/profile/order`;

        try {
          const fastPayData = await fastPay({
            full_name: user.email,
            email: user.email,
            amount: amount,
            metadata: meta_data,
            redirect_url: redirectUrl,
            cancel_url: redirectUrl,
            webhook_url: webhookUrl,
          });

          response.data = fastPayData;
          return res.send(response.data);
        } catch (err: any) {
          console.error(
            "[topupPackageOrder] fastPay failed:",
            err?.message,
            err?.body,
          );
          response.message =
            "Could not start payment session. Please try again or contact support.";
          response.status = 502;
          response.success = false;
          return res.status(502).send(response.response);
        }
      } else {
        response.message = "Invalid payment method";
        return res.status(400).send(response.internalError);
      }

      const order = await Order.create(user_order_data);

      // Decrement tracked stock now that we have a persisted order. Voucher
      // pool exhaustion no longer destroys the order — it just parks it in
      // "pending" for manual fulfilment, so we don't need to restore the
      // count on those branches either.
      if (stockTracking) {
        (topupPackage as any).stock_quantity = Math.max(
          0,
          stockBefore - quantity,
        );
        await (topupPackage as any).save();
      }

      // Voucher-pool products: pull `quantity` codes from the pool and
      // complete the order. If the pool can't fulfil the full requested
      // quantity we keep the order open in "pending" so an admin (or a
      // restock) can finish delivery later — release any partial codes so
      // they're not wasted on a stuck order. Wallet stays charged.
      if (isVoucherProduct) {
        const emitted: any[] = [];
        let pool_exhausted = false;
        for (let i = 0; i < quantity; i++) {
          const v = await emitProductVoucher(topupPackage.id, order.id);
          if (!v) {
            pool_exhausted = true;
            break;
          }
          emitted.push(v);
        }
        if (pool_exhausted) {
          // Return the partial allocation back to the pool — the order will
          // be re-allocated later when stock returns. Without this we'd
          // hold N-1 vouchers idle against a stuck order.
          for (const v of emitted) await releaseVoucher(v);
          order.status = "pending";
          order.brief_note = "Awaiting voucher restock";
          (order as any).details =
            `<span style="color:orange;"><strong>Voucher pool ran dry</strong> — only ${emitted.length} of ${quantity} unit(s) were available at order time. Order kept pending for manual fulfilment.</span>`;
          await order.save();

          const {
            uc: ucAliasPv,
            ingamepassword: ingamepasswordAliasPv,
            bprice: bpriceAliasPv,
            ...filteredOrderPv
          } = order.get({ plain: true });
          response.message =
            "Order placed — your vouchers will be delivered once stock is restocked.";
          response.data = filteredOrderPv;
          return res.send(response.response);
        }

        order.status = "completed";
        order.brief_note =
          emitted.length === 1
            ? `Voucher: ${emitted[0].data}`
            : `Vouchers (${emitted.length}) delivered`;
        (order as any).details =
          `<strong>Allocated Vouchers:</strong><ul style="text-align:left; margin-top:8px; list-style-type:disc; padding-left:20px;">${emitted.map((v) => `<li>${v.data}</li>`).join("")}</ul>`;
        await order.save();

        // Coin reward still applies to voucher purchases (multiplied by
        // quantity, since each unit earns the coins).
        try {
          const coinReward = Number(topupPackage.coin_value || 0) * quantity;
          if (coinReward > 0) {
            user.coins = (user.coins || 0) + coinReward;
            await user.save();
            await CoinTransaction.create({
              user_id: user.id,
              amount: coinReward,
              type: "purchase",
              note: `Order #${order.id} (${topupPackage.name} × ${quantity})`,
              reference_id: order.id,
            });
          }
        } catch (e) {
          // never block order on coin rewarding failure
        }

        const {
          uc: ucAliasV,
          ingamepassword: ingamepasswordAliasV,
          bprice: bpriceAliasV,
          ...filteredOrderV
        } = order.get({ plain: true });
        response.message = "Order placed successfully";
        response.data = filteredOrderV;
        return res.send(response.response);
      }

      // Award coins for purchase — coin reward is configured per package.
      try {
        const coinReward = Number(topupPackage.coin_value || 0);
        if (coinReward > 0) {
          user.coins = (user.coins || 0) + coinReward;
          await user.save();
          await CoinTransaction.create({
            user_id: user.id,
            amount: coinReward,
            type: "purchase",
            note: `Order #${order.id} (${topupPackage.name})`,
            reference_id: order.id,
          });
        }
      } catch (e) {
        // never block order on coin rewarding failure
      }

      // AUTO-DELIVERY START — when the ordered package has auto_delivery on,
      // its `PackageVoucherMap` rows determine how many vouchers to allocate
      // (one per mapping) and how many times the auto-bot runs. All-or-
      // nothing: if any pool is empty we release the ones we already
      // grabbed, refund the wallet and abort.

      const tagsParsed = parseTags((topupPackage as any).tags);
      const shellValueRaw = String((topupPackage as any).shell || "").trim();
      const isShellPackage = Number((topupPackage as any).is_shell) === 1;

      console.log("[topupPackageOrder] branch decision", {
        order_id: order.id,
        package_id: topupPackage.id,
        auto_delivery: (topupPackage as any).auto_delivery,
        is_shell: (topupPackage as any).is_shell,
        shell_value_present: shellValueRaw.length > 0,
        tag_count: tagsParsed.length,
        bot_url: (topupPackage as any).bot_url,
        uc: topupPackage.uc,
        current_status: order.status,
      });

      // Shell packages must have a shell value AND at least one tag.
      // Reject the order before any side effects (no voucher allocation,
      // no bot dispatch) so the package can be fixed.
      if (isShellPackage && (!shellValueRaw || tagsParsed.length === 0)) {
        console.warn(
          "[topupPackageOrder] shell package missing config — rejecting",
          {
            order_id: order.id,
            package_id: topupPackage.id,
            shell_value_present: shellValueRaw.length > 0,
            tag_count: tagsParsed.length,
          },
        );
        response.message = !shellValueRaw
          ? "This package is misconfigured (no shell value). Please contact support."
          : "This package is misconfigured (no tags). Please contact support.";
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response);
      }

      if ((topupPackage as any).auto_delivery == 1) {
        // Shell mode short-circuit: when the package is configured as a
        // shell delivery, the bot is fired once per saved tag and NO
        // voucher is consumed from the pool. We resolve this before
        // loading PackageVoucherMap rows so a leftover mapping (from when
        // the package wasn't yet shell) can't accidentally emit and burn
        // pool vouchers.
        if (isShellPackage) {
          const botUrl = String((topupPackage as any).bot_url || "").trim();
          const total = tagsParsed.length;
          console.log(
            "[topupPackageOrder][auto-delivery][shell-only] entering (no voucher consumed)",
            {
              order_id: order.id,
              package_id: topupPackage.id,
              bot_url: botUrl,
              tag_count: total,
            },
          );

          const botErrors: string[] = [];
          let bot_failures = 0;

          if (!botUrl) {
            console.warn(
              "[topupPackageOrder][auto-delivery][shell-only] bot_url missing",
              { order_id: order.id, package_id: topupPackage.id },
            );
            botErrors.push("auto-bot URL is not configured for this package");
          } else {
            for (let i = 0; i < total; i++) {
              const tagValue = tagsParsed[i];
              console.log(
                `[topupPackageOrder][auto-delivery][shell-only] dispatch ${i + 1}/${total} → POST ${botUrl}`,
                {
                  order_id: order.id,
                  playerid,
                  uc: topupPackage.uc,
                  tag: tagValue,
                },
              );
              try {
                // Shell mode: bot payload's `code` carries the shell value,
                // `pacakge`/`package` carries the current tag. No voucher
                // consumed.
                const ok = await autoOrder(
                  order.id,
                  playerid,
                  topupPackage.uc,
                  "",
                  botUrl,
                  tagValue,
                  shellValueRaw,
                );
                console.log(
                  `[topupPackageOrder][auto-delivery][shell-only] dispatch ${i + 1}/${total} result:`,
                  { order_id: order.id, ok },
                );
                if (!ok) {
                  bot_failures += 1;
                  botErrors.push(
                    `shell dispatch #${i + 1}/${total} (tag "${tagValue}") rejected (no response from ${botUrl})`,
                  );
                }
              } catch (e: any) {
                bot_failures += 1;
                const msg =
                  (e && (e.message || e.code || e.toString())) ||
                  "unknown error";
                console.error(
                  `[topupPackageOrder][auto-delivery][shell-only] dispatch ${i + 1}/${total} threw`,
                  { order_id: order.id, err: msg },
                );
                botErrors.push(
                  `shell dispatch #${i + 1}/${total} (tag "${tagValue}") threw: ${String(msg).slice(0, 200)}`,
                );
              }
            }
          }

          order.status = "In Progress";
          let detailHtml = `<strong>Shell dispatches: ${total - bot_failures}/${total} ok, ${bot_failures} failed</strong>`;
          if (!botUrl)
            detailHtml += "<br/><span style='color:red;'>URL missing</span>";
          if (botErrors.length > 0) {
            detailHtml +=
              "<ul style='text-align:left; margin-top:8px; list-style-type:disc; padding-left:20px;'>";
            for (const err of botErrors) {
              detailHtml += `<li>${err}</li>`;
            }
            detailHtml += "</ul>";
          }
          (order as any).details = detailHtml;
          await order.save();

          const {
            uc: ucAliasShellTop,
            ingamepassword: ingamepasswordAliasShellTop,
            bprice: bpriceAliasShellTop,
            ...filteredOrderShellTop
          } = order.get({ plain: true });
          response.message = "Order placed successfully";
          response.data = filteredOrderShellTop;
          return res.send(response.response);
        }

        const maps = await PackageVoucherMap.findAll({
          where: { topup_package_id: topupPackage.id },
          raw: true,
        });

        console.log(
          "[topupPackageOrder][auto-delivery] entering branch, maps:",
          {
            order_id: order.id,
            map_count: maps.length,
            maps,
          },
        );
        if (maps.length === 0) {
          // No voucher mappings is normal for shell-only auto-delivery —
          // the dedicated shell-only branch above picks it up. Otherwise
          // we fall through to the legacy bot path.
          console.warn(
            "[topupPackageOrder][auto-delivery] no PackageVoucherMap rows — falling through to legacy bot path",
            {
              order_id: order.id,
              package_id: topupPackage.id,
              is_shell: (topupPackage as any).is_shell,
            },
          );
        }
        if (maps.length > 0) {
          const emitted: any[] = [];
          let pool_exhausted = false;
          for (const m of maps as any[]) {
            const v = await emitProductVoucher(m.voucher_package_id, order.id);
            if (!v) {
              pool_exhausted = true;
              break;
            }
            emitted.push(v);
          }

          if (pool_exhausted) {
            // Same policy as the voucher-product branch: keep the order
            // open in "pending" so it can be fulfilled when stock returns.
            // Release any partially-emitted vouchers so they're free for
            // other orders in the meantime.
            for (const v of emitted) await releaseVoucher(v);
            order.status = "pending";
            order.brief_note =
              "ভাউচার স্টক শেষ। নতুন স্টক আসার অপেক্ষায় রয়েছে। সহায়তার জন্য সাপোর্ট টিমের সাথে যোগাযোগ করুন।";
            (order as any).details =
              "<span style='color:orange;'><strong>Auto-delivery skipped:</strong> one of the linked voucher pools was empty at order time. Order kept pending for manual fulfilment.</span>";
            await order.save();

            const {
              uc: ucAliasAdP,
              ingamepassword: ingamepasswordAliasAdP,
              bprice: bpriceAliasAdP,
              ...filteredOrderAdP
            } = order.get({ plain: true });
            response.message =
              "Order placed — your vouchers will be delivered once stock is restocked.";
            response.data = filteredOrderAdP;
            return res.send(response.response);
          }

          // Fire the bot once per emitted voucher. Failures are captured in
          // a structured array so we can surface specific messages on the
          // order — admin can read why a delivery is stuck without digging
          // into the server logs.
          const botUrl = String((topupPackage as any).bot_url || "").trim();
          const botErrors: string[] = [];
          let bot_failures = 0;

          if (!botUrl) {
            console.warn(
              "[topupPackageOrder][auto-delivery] bot_url missing on package",
              {
                order_id: order.id,
                package_id: topupPackage.id,
                package_name: topupPackage.name,
              },
            );
            botErrors.push("auto-bot URL is not configured for this package");
          } else {
            console.log("found emitted", emitted, topupPackage);
            // This branch only runs for non-shell auto-delivery: shell
            // packages short-circuited above. Fire the bot once per
            // emitted voucher.
            for (const v of emitted) {
              try {
                const ok = await autoOrder(
                  order.id,
                  playerid,
                  topupPackage.uc,
                  v.data,
                  botUrl,
                  topupPackage.name,
                  "",
                );
                console.log("autoOrder", ok);
                if (!ok) {
                  bot_failures += 1;
                  botErrors.push(
                    `bot rejected voucher #${v.id} (no response from ${botUrl})`,
                  );
                }
              } catch (e: any) {
                bot_failures += 1;
                const msg =
                  (e && (e.message || e.code || e.toString())) ||
                  "unknown error";
                botErrors.push(
                  `bot call threw for voucher #${v.id}: ${String(msg).slice(0, 200)}`,
                );
              }
            }
          }

          // Auto-delivered orders always start "In Progress": the vouchers
          // are emitted and the bot has been dispatched, but the upstream
          // confirmation comes back later via the checkOrder webhook, which
          // flips the order to "completed" once the bot reports success.
          order.status = "In Progress";
          // User-facing note only reports the successful allocation.

          // Internal context for the admin: reports why the delivery might
          // be stuck or skipped.
          let detailHtml = `<strong>Bot failures: ${bot_failures}</strong>`;
          if (!botUrl)
            detailHtml += "<br/><span style='color:red;'>URL missing</span>";
          if (botErrors.length > 0) {
            detailHtml +=
              "<ul style='text-align:left; margin-top:8px; list-style-type:disc; padding-left:20px;'>";
            for (const err of botErrors) {
              detailHtml += `<li>${err}</li>`;
            }
            detailHtml += "</ul>";
          }
          (order as any).details = detailHtml;

          await order.save();

          const {
            uc: ucAliasAd,
            ingamepassword: ingamepasswordAliasAd,
            bprice: bpriceAliasAd,
            ...filteredOrderAd
          } = order.get({ plain: true });
          response.message = "Order placed successfully";
          response.data = filteredOrderAd;
          return res.send(response.response);
        }
        // Note: shell-only mode is handled by the early short-circuit at
        // the top of the auto-delivery block (no voucher consumed). If we
        // reach here with no maps and not in shell mode, we fall through
        // to the legacy bot path below.
      }
      // AUTO-DELIVERY END

      // AUTO BOT SET IN CODE START
      console.log("[topupPackageOrder][regular-bot] guard check", {
        order_id: order.id,
        status: order.status,
        uc: topupPackage.uc,
        will_enter: order.status == "pending" && topupPackage.uc > 0,
        // Common reason shell never hits the bot: the package has no UC
        // tier set, so this branch is skipped entirely and the function
        // returns with the order still pending and no autoOrder call.
      });
      if (order.status == "pending" && topupPackage.uc > 0) {
        const store_unipin_auto = await StoreUnipin.findOne({
          where: {
            status: 1,
            uc: topupPackage.uc,
          },
          order: Sequelize.literal("RAND()"),
        });
        if (!store_unipin_auto) {
          // No voucher in stock for this UC tier — record the reason on the
          // order so the admin sees it without trawling logs.
          (order as any).details =
            `<span style="color:orange;"><strong>Auto-bot skipped:</strong> No UniPin voucher in stock for UC tier ${topupPackage.uc}.</span>`;
          await order.save();
          const {
            uc: ucAlias,
            ingamepassword: ingamepasswordAlias,
            bprice: bpriceAlias,
            ...filteredOrder1
          } = order.get({ plain: true });
          response.message = "Order placed successfully";
          response.data = filteredOrder1;
          return res.send(response.response);
        }

        const send_unipin = store_unipin_auto.code;

        store_unipin_auto.status = order.id;
        await store_unipin_auto.save();

        const pkgBotUrl = String((topupPackage as any).bot_url || "").trim();
        let botStatus: any = null;
        let botError: string | null = null;

        if (!pkgBotUrl) {
          // Auto-bot URL not configured. Don't even attempt — note the
          // reason on the order and leave it pending for a human to retry.
          console.warn(
            "[topupPackageOrder][regular-bot] bot_url missing on package",
            {
              order_id: order.id,
              package_id: topupPackage.id,
              package_name: topupPackage.name,
            },
          );
          botError = "auto-bot URL is not configured for this package";
        } else {
          // Shell packages short-circuited above, so this is a single
          // dispatch with the emitted voucher in `code`.
          console.log(
            `[topupPackageOrder][regular-bot] dispatch → POST ${pkgBotUrl}`,
            {
              order_id: order.id,
              playerid,
              uc: topupPackage.uc,
              voucher_masked: send_unipin
                ? `${String(send_unipin).substring(0, 4)}...`
                : "(none)",
            },
          );
          try {
            const ok = await autoOrder(
              order.id,
              playerid,
              topupPackage.uc,
              send_unipin,
              pkgBotUrl,
              topupPackage.name,
              "",
            );
            console.log(`[topupPackageOrder][regular-bot] dispatch result:`, {
              order_id: order.id,
              ok,
            });
            if (!ok) {
              botError = `bot returned no acceptance (no response from ${pkgBotUrl})`;
              botStatus = null;
            } else {
              botStatus = ok;
            }
          } catch (e: any) {
            const msg =
              (e && (e.message || e.code || e.toString())) || "unknown error";
            console.error(`[topupPackageOrder][regular-bot] dispatch threw`, {
              order_id: order.id,
              err: msg,
            });
            botError = `bot call threw: ${String(msg).slice(0, 200)}`;
            botStatus = null;
          }
        }

        if (botStatus) {
          order.status = "In Progress";
          order.uc = send_unipin;
          order.ingamepassword = botStatus;
        } else {
          // Bot didn't accept the job — return the reserved voucher to the
          // pool so it can be re-sold, and leave the order pending for the
          // admin to either retry or refund. Capture the specific failure
          // reason in details.
          store_unipin_auto.status = 1;
          await store_unipin_auto.save();
          order.status = "pending";
          order.uc = "";
          if (botError) {
            (order as any).details =
              `<span style="color:red;"><strong>Auto-bot failed:</strong> ${botError}</span>`;
          }
        }
        await order.save();
      }
      // AUTO BOT SET IN CODE END

      // if (product.is_offer == 1) {
      //   product.offer_items = (product.offer_items - 1);
      //   await product.save();
      // }
      const {
        uc: ucAlias,
        ingamepassword: ingamepasswordAlias,
        bprice: bpriceAlias,
        ...filteredOrder
      } = order.get({ plain: true });

      response.message = "Order placed successfully";
      response.data = filteredOrder;
      return res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  }

  async checkOrder(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const { orderid, status, content } = req.body;

      console.log(orderid, status, content, req.body, "check order");

      const botUrl = req.headers["cf-connecting-ip"];

      const order = await Order.findByPk(orderid);
      if (!order) {
        response.message = "order not found";
        return res.status(404).send(response.response);
      }

      // Bot callback dispatch.
      //
      //   status === "success"
      //     → order completed, content (if any) recorded in details.
      //   content matches a known user-facing error
      //     ("Invalid player ID", "Invalid region")
      //     → order CANCELLED with a Bengali brief_note explaining why,
      //       plus admin-facing details. The user sees the Bengali line on
      //       their order page; no retry possible without correcting the
      //       inputs.
      //   anything else (empty content, unknown content, generic failure)
      //     → treated as a server-side failure: order stays pending so it
      //       can be retried/refunded, brief_note explains in Bengali that
      //       a server error occurred, details captures whatever raw text
      //       the bot returned.
      const safeContent = String(content || "").trim();
      const isSuccess = status == "success";
      const isInvalidPlayer = /^invalid\s*player\s*id$/i.test(safeContent);
      const isInvalidRegion = /^invalid\s*region$/i.test(safeContent);
      const isKnownUserError = isInvalidPlayer || isInvalidRegion;

      let mystatus: string;
      if (isSuccess) {
        mystatus = "completed";
      } else if (isKnownUserError) {
        mystatus = "cancel";
      } else {
        // Generic / server failure — keep pending so an admin can retry.
        mystatus = "pending";
      }
      order.status = mystatus;

      if (mystatus === "completed") {
        (order as any).details = safeContent
          ? `<span style="color:#059669;"><strong>Bot delivered:</strong> ${safeContent}</span>`
          : "<span style='color:#059669;'><strong>Bot delivered successfully.</strong></span>";
      } else if (isInvalidPlayer) {
        order.brief_note =
          "আপনার দেওয়া প্লেয়ার আইডি সঠিক নয়। অনুগ্রহ করে সঠিক আইডি দিয়ে আবার অর্ডার করুন।";
        (order as any).details =
          '<span style="color:#dc2626;"><strong>Cancelled — Invalid player ID</strong> reported by the upstream bot. Order will not be retried.</span>';
        // Free the reserved voucher so it isn't burnt on a dead order.
        order.uc = "";
      } else if (isInvalidRegion) {
        order.brief_note =
          "আপনার আইডির রিজিয়ন এই প্যাকেজের জন্য সাপোর্টেড নয়। অনুগ্রহ করে সঠিক রিজিয়নের আইডি দিয়ে আবার অর্ডার করুন।";
        (order as any).details =
          '<span style="color:#dc2626;"><strong>Cancelled — Invalid region</strong> reported by the upstream bot. Order will not be retried.</span>';
        order.uc = "";
      } else {
        // Server failure with no specific error code. Bengali message tells
        // the user to wait or contact support; details captures whatever
        // the bot returned (often empty) for the admin.
        order.brief_note =
          "সার্ভারে একটি ত্রুটি দেখা দিয়েছে। আপনার অর্ডারটি পেন্ডিং অবস্থায় রয়েছে — কিছুক্ষণের মধ্যেই সমাধান করা হবে। সমস্যা চলতে থাকলে অনুগ্রহ করে সাপোর্টে যোগাযোগ করুন।";
        (order as any).details = safeContent
          ? `<span style="color:#dc2626;"><strong>Bot reported:</strong> ${safeContent}</span>`
          : "<span style='color:#dc2626;'><strong>Server failure</strong> — bot returned no specific error. Order kept pending for manual retry.</span>";
        // Bot didn't deliver — release the reserved voucher for retry.
        order.uc = "";
      }
      await order.save();

      const vouchers = await Voucher.findAll({
        where: {
          order_id: orderid,
          package_id: order.topuppackage_id,
        },
        order: Sequelize.literal("RAND()"),
      });
      if (vouchers.length == 0) {
        response.message = "NOT FOUND";
        return res.status(404).send(response.response);
      }
      // On success → mark voucher used (2). On failure → return it to the
      // pool (1) so it can be re-sold, instead of leaving it held (5).
      let promises: any[] = [];
      vouchers.forEach((voucher) => {
        voucher.is_used = mystatus == "completed" ? 1 : 0;
        promises.push(voucher.save());
      });

      const voucherSave = await Promise.all(promises);

      console.log(voucherSave, "save");

      if (mystatus == "Failed") {
        // const user = await User.findByPk(order.user_id);
        // if (!user) {
        //   response.message = 'User not found';
        //   return res.status(400).send(response.response);
        // }
        // user.wallet = user.wallet + order.amount;
        // await user.save();
      }

      const bot = await AutoServer.findOne({
        where: {
          status: 2,
          ip_url: {
            [Op.like]: "%" + botUrl + "%",
          },
        },
      });

      if (!bot) {
        response.message = "NOT FOUND";
        return res.status(404).send(response.response);
      }

      bot.status = status == "failure_captcha_pending" ? 3 : 1;
      //bot.total_order = bot.total_order + 1;
      await bot.save();

      response.message = "Order updated successfully";
      return res.send(response.response);
    } catch (error) {
      res.status(400).send(response.internalError);
    }
  }

  async addWallet(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const { purpose, amount, number, paymentmethod } = req.body;

      let user_id = req.user.id;

      const user = await User.findByPk(user_id);

      if (!user) {
        response.message = "User not found";
        return res.status(400).send(response.response);
      }

      if (!user_id || amount < 0) {
        response.message = "Please Refresh The Page And Send Again";
        return res.status(400).send(response.response);
      }

      const pm = await PaymentMethod.findByPk(paymentmethod);
      console.log(pm, "test");
      if (!pm) {
        response.message = "Payment method not found";
        return res.status(400).send(response.response);
      }

      const checkPendingOrder = await Transaction.count({
        where: {
          user_id,
          status: "pending",
        },
      });

      if (checkPendingOrder > 5) {
        response.message =
          "You Have Already A Pending Order. Please Completed To Add Another Order";
        return res.status(400).send(response.response);
      }

      // 'direct' → kick straight to the FastPay/UddoktaPay flow; no sender
      // number needed, no admin verification step. The webhook completes the
      // transaction on its own.
      if (pm.type === "direct") {
        const meta_data = {
          token: process.env.UDDOKTAPAY_API_KEY,
          id: user.id,
          phone: user.phone,
          wallet: user.wallet,
          city: user.city,
          address: user.address,
          zip_code: user.zip_code,
          paymentmethod: paymentmethod,
        };
        const webhookUrl = `${process.env.API_URL || "https://api.rrrbazar.com"}/api/v1/webhook`;
        try {
          const fastPayData = await fastPay({
            full_name: user.email,
            email: user.email,
            amount: amount,
            metadata: meta_data,
            redirect_url: `${process.env.CLIENT_URL || "https://rrrbazar.com"}/profile/transaction`,
            cancel_url: `${process.env.CLIENT_URL || "https://rrrbazar.com"}/profile/add-money`,
            webhook_url: webhookUrl,
          });
          response.data = fastPayData;
          return res.send(response.data);
        } catch (err: any) {
          console.error("[addWallet] fastPay failed:", err?.message, err?.body);
          response.message =
            "Could not start payment session. Please try again or contact support.";
          response.status = 502;
          response.success = false;
          return res.status(502).send(response.response);
        }
      }

      // 'normal' → user is sending money out-of-band and reports the sender
      // number; admin verifies and marks completed.
      const createTransaction = await Transaction.create({
        user_id,
        purpose,
        amount,
        number,
        paymentmethod_id: paymentmethod,
        status: "pending",
      });

      response.data = createTransaction;
      return res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  }

  async userProfile(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    const id = req.user.id;
    try {
      const user = await User.findByPk(id);

      if (!user) {
        response.message = "No user found";
        return res.status(400).send(response.response);
      }

      response.data = user;
      return res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  }

  async searchResetPasswordUser(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const { identity } = req.body;

      const user = await User.findOne({
        where: {
          ...(isNaN(identity)
            ? {
                email: identity,
              }
            : {
                phone: identity,
              }),
        },
      });

      if (!user) {
        response.message = "User not found";
        return res.status(400).send(response.response);
      }

      response.data = user;
      return res.send(response.response);
    } catch (error) {
      console.log(error);
      return res.status(400).send(response.internalError);
    }
  }

  async resetPassword(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const { token, password, confirm_password } = req.body;
      const passwordReset = await PasswordReset.findOne({
        where: {
          token: { [Op.like]: `%${token}%` },
        },
        order: [["id", "DESC"]],
      });

      if (!passwordReset) {
        response.message = "Invaild Token";
        return res.status(400).send(response.response);
      }

      const currTime = new Date();
      const otpTime = new Date(passwordReset.created_at);
      const diffTime = currTime.getTime() - otpTime.getTime();
      if (diffTime > 600000) {
        // 10 min to expire token
        response.message = "Expired token";
        return res.status(400).send(response.response);
      }

      if (!password) {
        response.message = "New password required";
        return res.status(400).send(response.response);
      }

      if (password !== confirm_password) {
        response.message = "Confrim password not match";
        return res.status(400).send(response.response);
      }

      const user = await User.findByPk(passwordReset.user_id);
      if (!user) {
        response.message = "User not found";
        return res.status(400).send(response.response);
      }

      user.password = password;
      await user.save();

      response.message = "Password reset Success";
      res.send(response.response);
    } catch (error) {
      console.log(error);
      return res.status(400).send(response.internalError);
    }
  }

  async resetPasswordOtp(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const { id } = req.params as any;
      const user = await User.findByPk(id);

      if (!user) {
        response.message = "User not found";
        return res.status(400).send(response.response);
      }

      const otpCode = Math.floor(Math.random() * 90000) + 10000;
      await smsHelper(
        user.phone,
        `Your ${process.env.APP_NAME} OTP Code is ` + otpCode,
      );

      await Otp.create({
        user_id: user.id,
        otp: otpCode,
        type: "reset_password",
      });

      response.data = { action: "reset_password" };

      return res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  }

  async resetPasswordVerify(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const { id } = req.params as any;
      const user = await User.findByPk(id);

      if (!user) {
        response.message = "User not found";
        return res.status(400).send(response.response);
      }

      // let otp = await Otp.query()
      //   .where({ 'user_id': user.id, type: 'reset_password' })
      //   .last();
      let otp = await Otp.findOne({
        where: {
          user_id: user.id,
          type: "reset_password",
        },
        order: [["id", "DESC"]],
      });

      if (!otp) {
        response.message = "Invalid Otp";
        return res.status(400).send(response.response);
      }

      if (otp.otp != req.body.otp) {
        response.message = "Invalid Otp";
        return res.status(400).send(response.response);
      }

      const currTime = new Date();
      const otpTime = new Date(otp.created_at);
      const diffTime = currTime.getTime() - otpTime.getTime();
      if (diffTime > 600000) {
        // 10 min to expire otp
        response.message = "Otp is expired, Please resend otp code";
        return res.status(400).send(response.response);
      }

      const token = crypto.randomBytes(40).toString("hex");

      const returnData = await PasswordReset.create({
        user_id: user.id,
        token,
      });

      response.data = { reset_token: returnData.token };

      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  }

  async getActivePaymentMethods(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const topupPaymentMethods = await TopupPaymentMethod.findAll({
        where: {
          is_active: 1,
        },
      });
      const payments = topupPaymentMethods.map((data) => data.payment_method);
      response.data = payments;

      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  }

  async changePhone(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const { phone } = req.body;
      const id = req.user.id;
      let user = await User.findByPk(id);

      if (!user) {
        response.message = "User not found";
        return res.status(400).send(response.response);
      }

      user.phone = phone;
      user.is_phone_verify = 0;
      await user.save();
      response.message = "Phone changed successfully";
      res.send(response.response);
    } catch (error) {
      res.status(500).send(response.internalError);
    }
  }
  async verifyPhone(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const id = req.user.id;
      const otpCode = Math.floor(Math.random() * 90000) + 10000;

      let user = await User.findByPk(id);

      if (!user) {
        response.message = "User not found";
        return res.status(400).send(response.response);
      }

      await Otp.create({
        user_id: id,
        otp: otpCode,
        type: "phone_verify",
      });
      await smsHelper(
        user.phone,
        `Your ${process.env.APP_NAME} OTP Code is ` + otpCode,
      );

      res.send({ action: "phone_verify" });
    } catch (error) {
      res.status(500).send(response.internalError);
    }
  }

  async verifyOtp(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const { otp } = req.body;
      const id = req.user.id;
      let user = await User.findByPk(id);

      // let otp = await Otp.query().where('user_id', user.id).last();
      let findOtp = await Otp.findOne({
        where: {
          user_id: id,
        },
        order: [["created_at", "DESC"]],
      });

      if (!findOtp || !user) {
        response.message = "Failed to verify ypur otp";
        return res.status(400).send(response.response);
      }

      if (findOtp.otp != otp) {
        response.message = "Invalid Otp";
        return res.status(400).send(response.response);
      }

      const currTime = new Date();
      const otpTime = new Date(otp.created_at);
      const diffTime = currTime.getTime() - otpTime.getTime();
      if (diffTime > 600000) {
        // 10 min to expire otp
        response.message = "Expired Otp";
        return res.status(400).send(response.response);
      }

      if (otp.type === "phone_verify") {
        user.is_phone_verify = 1;
        await user.save();
      }

      response.message = "OTP verified successfully";
      res.send(response.response);
    } catch (error) {
      res.status(500).send(response.internalError);
    }
  }

  async getInventories(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const limit: any = parseInt(req.query.limit?.toString() || "10");
      const data = await Inventorie.findAll({
        limit: limit,
      });

      response.data = data;
      res.send(response.response);
    } catch (error) {
      res.status(500).send(response.internalError);
    }
  }

  async getInventoriesById(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const id = req.params.id as any;

      const data = await Inventorie.findByPk(id);

      if (!data) {
        response.message = "TopupProduct not found";
        return res.status(400).send(response.response);
      }
      response.data = data;
      res.send(response.response);
    } catch (error) {
      res.status(500).send(response.internalError);
    }
  }

  async cartProducts(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const ids = (req.query?.product_ids as any).split(",");
      const data = await Inventorie.findAll({
        where: {
          id: ids,
        },
      });

      response.data = data;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  }
  async resetPasswordDirect(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const { identity } = req.body;

      const user: any = await User.findOne({
        where: {
          ...(isNaN(identity)
            ? {
                email: identity,
              }
            : {
                phone: identity,
              }),
        },
      });

      if (!user) {
        response.message = "User not found";
        return res.status(400).send(response.internalError);
      }

      const otpCode = Math.floor(Math.random() * 90000) + 10000;
      await smsHelper(
        user.phone,
        `Your ${process.env.APP_NAME} OTP Code is ` + otpCode,
      );

      await Otp.create({
        user_id: user.id,
        otp: otpCode,
        type: "reset_password",
      });

      const user_phone: string = user.phone;
      const splitPhone = user_phone.split("");
      const firstPartOfNumber = splitPhone.slice(0, 3).join("");
      const lastPartOfNumber = splitPhone
        .slice(Math.max(user_phone.length - 3, 1))
        .join("");
      const startCount =
        user_phone.length -
        (firstPartOfNumber.length + lastPartOfNumber.length);
      const stars = [...new Array(startCount)].map((e) => "*").join("");
      const hiddenPhone = firstPartOfNumber + stars + lastPartOfNumber;

      delete user.phone;

      response.data = {
        user: user,
        starsPhone: hiddenPhone,
      };
      return res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  }
  productOrder = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const productId = req.body.product_id;
      const user = await User.findByPk(req.user.id);

      const product = await Product.findByPk(productId);

      if (!product) {
        response.message = "Product not found";
        return res.status(400).send(response.response);
      }
      if (!user) {
        response.message = "User not found";
        return res.status(400).send(response.response);
      }

      if (product.quantity <= 0) {
        response.message = "Product is stock out";
        return res.status(400).send(response.response);
      }

      if (user.wallet < product.sale_price) {
        response.message = "You do not have enough money";
        return res.status(400).send(response.response);
      }

      product.quantity = product.quantity - 1;

      user.wallet = user.wallet - product.sale_price;
      await user.save();
      await product.save();

      await ProductOrder.create({
        product_id: product.id,
        user_id: user.id,
        amount: product.sale_price,
        status: "pending",
      });

      response.message = "Order placed successfully";
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  getMyShopList = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const limit: any = parseInt(req.query.limit?.toString() || "15");
      const page: any = parseInt(req.query.page?.toString() || "1");

      const userId = req.user.id;
      const totalCount = await ProductOrder.count({
        where: {
          user_id: userId,
        },
      });
      const shopLists = await ProductOrder.findAll({
        where: {
          user_id: userId,
        },
        offset: (page - 1) * limit,
        limit: limit,
        order: [["id", "DESC"]],
        include: [
          // {
          //     model: User,
          // },
          {
            model: Product,
          },
        ],
      });

      response.data = {
        nextPage:
          parseInt(page) * parseInt(limit) < totalCount
            ? parseInt(page) + 1
            : undefined,
        data: shopLists,
      };
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  getWithdrawEarnWallet = async (
    req: express.Request,
    res: express.Response,
  ) => {
    const response = new responseUtils();
    try {
      const { amount, number, payment_method } = req.body;

      const userId = req.user.id;
      const user = await User.findByPk(userId);

      if (!user) {
        response.message = "User not found";
        return res.status(400).send(response.response);
      }

      const earnWallet = await EarnWallet.findOne({
        where: {
          user_id: userId,
        },
        order: [["id", "DESC"]],
      });

      if (!earnWallet) {
        response.message = "You do not have enough money";
        return res.status(400).send(response.response);
      }

      if (earnWallet.total_amount < amount) {
        response.message = "You do not have enough money";
        return res.status(400).send(response.response);
      }

      await EarnWallet.create({
        user_id: userId,
        amount: amount,
        total_amount: earnWallet.total_amount - amount,
        purpose: "withdraw",
      });

      await WithdrawEarnWallet.create({
        user_id: userId,
        amount,
        number,
        payment_method,
        status: "pending",
      });

      response.message = "Withdraw request placed successfully";
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  async getPlayerName(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const allowedDomains = [
        process.env.CLIENT_URL || "https://rrrbazar.com",
        "https://www.rrrbazar.com",
      ];
      const origin = req.get("Origin") || req.get("Referer");

      // Check if the request is from one of the allowed domains
      if (!origin || !allowedDomains.includes(new URL(origin).origin)) {
        return res.status(403).send("Access denied: Unauthorized domain");
      }

      const playerid = req.params.playerid;

      const playerData = await playerName(playerid);
      response.data = playerData;
      return res.send(response.data);
    } catch (error) {
      res.status(400).send(response.internalError);
    }
  }

  uddoktaPay = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const {
        full_name,
        email,
        amount,
        invoice_id,
        metadata,
        payment_method,
        sender_number,
        transaction_id,
        status,
        paymentmethod,
      } = req.body;

      //const uak = req.headers['RT_UDDOKTAPAY_API_KEY'];

      let metadataObj = metadata;
      if (typeof metadata === "string") {
        try {
          metadataObj = JSON.parse(metadata);
        } catch (e) {
          console.error("Failed to parse metadata", e);
        }
      }

      if (!metadataObj || !metadataObj.id) {
        console.error(
          "Webhook Error: User metadata not found or invalid",
          metadataObj,
        );
        return res.send({
          status: "failure",
          statusCode: 400,
          message: "User metadata not found!",
        });
      }

      const user = await User.findByPk(metadataObj.id);
      if (!user) {
        console.error("Webhook Error: User not found for ID", metadataObj.id);
        return res.send({
          status: "failure",
          statusCode: 400,
          message: "User not found!",
        });
      }

      const envToken =
        process.env.UDDOKTAPAY_API_KEY ||
        "18b2ca74b5fe2f63d8293687d94fde987925c98f";
      if (
        metadataObj.token == null ||
        metadataObj.token == "" ||
        typeof metadataObj.token === "undefined"
      ) {
        console.error("Webhook Error: Token missing in metadata");
        return res.send({
          status: "failure",
          statusCode: 403,
          message: "api issue found!",
        });
      }

      if (metadataObj.token != envToken) {
        console.error("Webhook Error: Unauthorized Action! Token mismatch.", {
          received: metadataObj.token,
          expected: envToken,
        });
        return res.send({
          status: "failure",
          statusCode: 403,
          message: "Unauthorized Action!",
        });
      }

      const pm = await PaymentMethod.findByPk(metadataObj.paymentmethod);
      if (pm && pm.seller_id) {
        metadataObj.seller_id = Number(pm.seller_id);
      } else if (pm && pm.info && !isNaN(Number(pm.info))) {
        // Legacy fallback: pre-migration payment methods stored the seller
        // id on the `info` column. Once direct rows have been re-saved with
        // a real seller_id, this branch becomes dead code.
        metadataObj.seller_id = parseInt(pm.info);
      } else {
        metadataObj.seller_id = 13;
      }

      const createTransaction = await Transaction.create({
        user_id: metadataObj.id,
        purpose: "fastPay",
        amount: parseFloat(amount),
        number: sender_number,
        paymentmethod_id: metadataObj.paymentmethod,
        action_by: metadataObj.seller_id,
        status: status.toLowerCase(),
      });

      if (status.toLowerCase() == "completed") {
        if (user && !metadataObj?.order) {
          user.wallet = Number(user.wallet) + Number(amount);
          await user.save();

          if (metadataObj.seller_id) {
            const admin = await Admin.findByPk(metadataObj.seller_id);
            if (admin) {
              admin.wallet = Number(admin.wallet) + Number(amount);
              await admin.save();
            }
          }
        }

        if (metadataObj?.order) {
          let orderData = metadataObj.order;
          if (typeof orderData === "string") {
            try {
              orderData = JSON.parse(orderData);
            } catch (e) {
              console.error("Failed to parse nested order data", e);
            }
          }

          if (typeof orderData === "object" && orderData !== null) {
            const order = await Order.create(orderData);

            // Voucher-pool product? Emit a code and complete the order
            // before falling into the UC/bot branch below. No refund path
            // here — payment is already captured; on empty pool the order
            // is left pending with a brief note so admin can intervene.
            try {
              const orderProduct = await TopupProduct.findByPk(
                order.product_id,
              );
              if (orderProduct && (orderProduct as any).is_voucher == 1) {
                const voucher = await emitProductVoucher(
                  order.topuppackage_id,
                  order.id,
                );
                if (voucher) {
                  order.status = "completed";
                  order.brief_note = `Voucher: ${voucher.data}`;
                  await order.save();
                } else {
                  (order as any).details =
                    "<span style='color:red;'><strong>Voucher pool empty</strong> — needs manual fulfilment</span>";
                  await order.save();
                }
              }
            } catch (e) {
              console.error("webhook voucher emit failed", e);
            }

            // Award coins for purchase
            try {
              const topupPackage = await TopupPackage.findByPk(
                order.topuppackage_id,
              );
              if (topupPackage) {
                const coinReward = Number(topupPackage.coin_value || 0);
                if (coinReward > 0) {
                  user.coins = (user.coins || 0) + coinReward;
                  await user.save();
                  await CoinTransaction.create({
                    user_id: user.id,
                    amount: coinReward,
                    type: "purchase",
                    note: `Order #${order.id} (${topupPackage.name})`,
                    reference_id: order.id,
                  });
                }

                // AUTO BOT SET IN CODE START
                if (order.status == "pending" && topupPackage.uc > 0) {
                  const store_unipin_auto = await StoreUnipin.findOne({
                    where: {
                      status: 1,
                      uc: topupPackage.uc,
                    },
                    order: Sequelize.literal("RAND()"),
                  });
                  if (store_unipin_auto) {
                    const myunipincode = store_unipin_auto.code;
                    store_unipin_auto.status = order.id;
                    await store_unipin_auto.save();

                    const tagsHere = parseTags((topupPackage as any).tags);
                    const shellValueHere = String(
                      (topupPackage as any).shell || "",
                    ).trim();
                    const shellActiveHere =
                      Number((topupPackage as any).is_shell) === 1 &&
                      shellValueHere.length > 0 &&
                      tagsHere.length > 0;
                    const dispatches = shellActiveHere ? tagsHere : [""];
                    let botStatus: any = null;
                    for (let i = 0; i < dispatches.length; i++) {
                      const tagValue = dispatches[i];
                      botStatus = await autoOrder(
                        order.id,
                        order.playerid,
                        topupPackage.uc,
                        myunipincode,
                        (topupPackage as any).bot_url || "",
                        shellActiveHere ? tagValue : topupPackage.name,
                        shellActiveHere ? shellValueHere : "",
                      );
                      if (!botStatus) break;
                    }
                    if (botStatus) {
                      order.status = "In Progress";
                      order.uc = myunipincode;
                      order.ingamepassword = botStatus;
                    } else {
                      // Bot rejected — return the voucher and reset the order
                      // to pending so it can be retried or refunded.
                      store_unipin_auto.status = 1;
                      await store_unipin_auto.save();
                      order.status = "pending";
                      order.uc = "";
                    }
                    await order.save();
                  }
                }
                // AUTO BOT SET IN CODE END
              }
            } catch (e) {
              console.error("Error in webhook order processing (coins/bot)", e);
            }
          } else {
            console.error("Webhook Error: order data is invalid", orderData);
          }
        }

        if (metadataObj?.unipin_id && metadataObj?.unipin_id > 0) {
          let store_unipin = await StoreUnipin.findByPk(metadataObj?.unipin_id);
          if (store_unipin) {
            store_unipin.status = 2;
            store_unipin.user_id = metadataObj?.id;
            await store_unipin.save();
          }
        }
      }

      response.data = createTransaction;
      return res.send(response.data);
    } catch (error) {
      console.error("uddoktaPay error", error);
      res.status(400).send(response.internalError);
    }
  };

  // getMyShopList = async (req: express.Request, res: express.Response) => {
  //   const response = new responseUtils;
  //   try {

  //   } catch (error) {
  //     console.log(error)
  //     res.status(400).send(response.internalError)
  //   }

  // }
}

/******************************************************************************
 *                               Export
 ******************************************************************************/
export default new UserController();
