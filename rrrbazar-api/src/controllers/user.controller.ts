import crypto from "crypto";
import express, { NextFunction } from "express";
import createError from "http-errors";
import { Op, Sequelize } from "sequelize";
import Schema from "../models";
import responseUtils from "../utils/response.utils";
import smsHelper from "../helpers/sms";
import fastPay from "../helpers/fastpay";
import playerName from "../helpers/playername";
import syncOrderCoinsForStatus from "../helpers/orderCoinSync";
import syncOrderCashbackForStatus from "../helpers/orderCashbackSync";
import buildRewardNoteHtml, {
  stripRewardNote,
} from "../helpers/orderRewardNote";
import {
  aggregateOrderFromDispatches,
  buildOrderDetailsHtml,
  createAndSendDispatch,
} from "../helpers/dispatchBot";
import {
  dispatchOrder,
  handleVoucherProduct,
  parseTags,
} from "../helpers/topupOrderHandler";
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
  BotDispatch,
} = Schema;

// Voucher pool emission, tag parsing, and per-bot dispatch live in
// ../helpers/topupOrderHandler — see that file for the per-bot-type
// logic (uc-bot, shell-bot, like-bot, pubg-bot, legacy UniPin).
/******************************************************************************
 *                              User Controller
 ******************************************************************************/
class UserController {
  async getUsers(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    const query = req.query.q || "";
    const user_type = req.query.user_type as string | undefined;

    const limit: any = parseInt(req.query.limit?.toString() || "20");
    const page: any = parseInt(req.query.page?.toString() || "1");

    // Build a filter that combines the free-text search (email/phone/id)
    // with the optional user_type narrowing. user_type is only honoured
    // when it matches one of the known shapes — anything else falls back
    // to "no filter" so callers can't injectraw values.
    const where: any = {
      [Op.or]: [
        { email: { [Op.like]: `%${query}%` } },
        { phone: { [Op.like]: `%${query}%` } },
        { id: { [Op.like]: `%${query}%` } },
      ],
    };
    if (typeof user_type === 'string') {
      const utl = user_type.toLowerCase();
      if (utl === 'reseller') where.user_type = 'reseller';
      else if (utl === 'normal') where.user_type = { [Op.or]: ['normal', null, ''] };
    }

    // user_count tracks the filtered slice so the pagination total in
    // the admin UI lines up with the rows returned.
    const user_count = await User.count({ where });

    const data = await User.findAll({
      offset: (page - 1) * limit,
      limit: limit,
      where,
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
      const product_id = req.query.product_id;
      const where: any = {
        for_home_modal: 1,
        type: "normal",
        is_active: 1,
      };

      if (product_id) {
        where.product_id = product_id;
      } else {
        where.product_id = null;
      }

      const notices = await Notice.findOne({
        where,
        order: [["id", "DESC"]],
      });
      response.data = notices || {};

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
  // Four modes:
  //   order_once = 1 → any prior order by this user (matched on playerid)
  //                    blocks forever                  — Player-scoped
  //   order_once = 2 → only orders in the current day  — Player-scoped daily
  //   order_once = 3 → any prior order by this user blocks forever — User-scoped
  //   order_once = 4 → only orders in the current day                — User-scoped daily
  //
  // For modes 1 & 2 we still scope by user_id when listing — exposing
  // other users' player-id activity here would leak history. The frontend
  // only needs to know what THIS user can no longer order.
  myOrderedOncePackages = async (
    req: express.Request,
    res: express.Response,
  ) => {
    const response = new responseUtils();
    try {
      const user_id = req.user.id;
      const limitedPacks = await TopupPackage.findAll({
        where: { order_once: { [Op.in]: [1, 2, 3, 4] } },
        attributes: ["id", "order_once"],
        raw: true,
      });
      if (limitedPacks.length === 0) {
        response.data = { ordered_package_ids: [] };
        return res.send(response.response);
      }
      // Bucket per mode. Modes 1 & 3 share "forever" semantics; 2 & 4 share
      // "today only" — the only axis that matters for the query is the
      // time window, since we always filter by user_id.
      const foreverIds = (limitedPacks as any[])
        .filter((p) => Number(p.order_once) === 1 || Number(p.order_once) === 3)
        .map((p) => p.id);
      const dailyIds = (limitedPacks as any[])
        .filter((p) => Number(p.order_once) === 2 || Number(p.order_once) === 4)
        .map((p) => p.id);

      const blocked = new Set<number>();

      if (foreverIds.length > 0) {
        const orders = await Order.findAll({
          where: { user_id, topuppackage_id: { [Op.in]: foreverIds } },
          attributes: ["topuppackage_id"],
          raw: true,
        });
        for (const o of orders as any[]) blocked.add(o.topuppackage_id);
      }

      if (dailyIds.length > 0) {
        // Calendar-day reset — anchor to today's local midnight so the
        // storefront gray-out lifts at the same instant as the order
        // endpoint's block does.
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const orders = await Order.findAll({
          where: {
            user_id,
            topuppackage_id: { [Op.in]: dailyIds },
            created_at: { [Op.gte]: startOfToday },
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

      // Enforce per-package re-order limit. Four modes:
      //   1 = once forever per Player ID  (needs Player ID input)
      //   2 = once/day per Player ID      (needs Player ID input)
      //   3 = once forever per user account
      //   4 = once/day per user account
      // Modes 1 & 2 silently no-op when the product has no Player ID input
      // (nothing to scope against). Modes 3 & 4 always apply since every
      // request carries a user_id.
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
            // Calendar-day reset: anchor to today's local midnight, not a
            // rolling 24-hour window. An order placed at 11:00 PM unblocks
            // at midnight the same way an order placed at 1:00 AM does.
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            where.created_at = {
              [Op.gte]: startOfToday,
            };
          }
          const previous = await Order.count({ where });
          if (previous > 0) {
            response.message =
              orderOnceMode === 2
                ? "এই প্লেয়ার আইডি থেকে আজ ইতোমধ্যে প্যাকেজটি নেওয়া হয়েছে — মধ্যরাতের পরে আবার চেষ্টা করুন।"
                : "এই প্লেয়ার আইডি থেকে ইতোমধ্যে প্যাকেজটি নেওয়া হয়েছে — প্রতি প্লেয়ার আইডিতে শুধুমাত্র একবার নেওয়া যাবে।";
            return res.status(400).send(response.response);
          }
        }
      } else if (orderOnceMode === 3 || orderOnceMode === 4) {
        // User-scoped: count this user's prior orders of this package.
        // No Player ID dependency — applies even on products that don't
        // ask for one (vouchers, info-only products, etc.).
        const where: any = {
          user_id,
          topuppackage_id,
        };
        if (orderOnceMode === 4) {
          // Same calendar-day reset as mode 2 — unblocks at local midnight.
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          where.created_at = {
            [Op.gte]: startOfToday,
          };
        }
        const previous = await Order.count({ where });
        if (previous > 0) {
          response.message =
            orderOnceMode === 4
              ? "আপনি আজ ইতোমধ্যে এই প্যাকেজটি নিয়েছেন — মধ্যরাতের পরে আবার চেষ্টা করুন।"
              : "আপনি ইতোমধ্যে এই প্যাকেজটি নিয়েছেন — প্রতি অ্যাকাউন্ট থেকে শুধুমাত্র একবার নেওয়া যাবে।";
          return res.status(400).send(response.response);
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

      // Orders that complete inline at creation (type=2 / UniPin direct
      // path) need their coin reward awarded now — they never hit the
      // checkOrder webhook. Idempotent: the voucher branch below has its
      // own quantity-multiplied award, so the helper no-ops there.
      if (order.status === "completed") {
        await syncOrderCoinsForStatus(order, "completed");
        // Cashback (money reward + reseller cashback) follows the same
        // gate. Multiplier defaults to 1 — UniPin path is single-unit.
        await syncOrderCashbackForStatus(order, "completed");

        // Surface the reward to the user on /profile/order. Append (don't
        // overwrite) — brief_note already carries the "UniPin: <code>"
        // prefix that the storefront uses to render the redeem block.
        const rewardHtml = buildRewardNoteHtml({
          rewardType: (topupPackage as any).reward_type,
          coinValue: (topupPackage as any).coin_value,
          cashbackAmount: (topupPackage as any).cashback_amount,
          resellerCashback: (topupPackage as any).reseller_cashback,
          isReseller:
            String((user as any).user_type || "").toLowerCase() === "reseller",
        });
        if (rewardHtml) {
          order.brief_note = stripRewardNote(order.brief_note) + rewardHtml;
          await order.save();
        }
      }

      // Voucher-pool products: pull `quantity` codes from the package's
      // own pool and complete the order inline. Handler manages pool-
      // exhaustion fallback (parks order pending + persists placeholder
      // dispatches) and inline coin reward.
      if (isVoucherProduct) {
        const { responseMessage } = await handleVoucherProduct({
          order,
          topupPackage,
          user,
          quantity,
        });
        const {
          uc: _ucAliasV,
          ingamepassword: _ingamepasswordAliasV,
          bprice: _bpriceAliasV,
          ...filteredOrderV
        } = order.get({ plain: true });
        response.message = responseMessage;
        response.data = filteredOrderV;
        return res.send(response.response);
      }

      // Coin reward is deferred for non-voucher orders. They reach
      // "completed" asynchronously via the checkOrder webhook once the bot
      // reports success — awarding here would credit users for orders that
      // later cancel (invalid player / region) or stay pending forever.
      // The voucher branch above awards directly because its orders
      // complete inline.

      // Shell packages must have a shell value AND at least one tag.
      // The admin-side controller enforces this on save, but double-check
      // here so a stale row can't slip through and produce a half-broken
      // dispatch. Order is already created (matches pre-refactor
      // behaviour — wallet stays charged for admin to manually resolve).
      const tagsParsed = parseTags((topupPackage as any).tags);
      const shellValueRaw = String((topupPackage as any).shell || "").trim();
      const isShellPackage = Number((topupPackage as any).is_shell) === 1;
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

      // Per-bot-type dispatch (uc-bot, shell-bot, like-bot, pubg-bot, or
      // legacy UniPin). The handler mutates and saves the order; we just
      // surface its response message back to the storefront.
      const { responseMessage } = await dispatchOrder({
        order,
        topupPackage,
        playerid,
      });

      const {
        uc: _ucAlias,
        ingamepassword: _ingamepasswordAlias,
        bprice: _bpriceAlias,
        ...filteredOrder
      } = order.get({ plain: true });
      response.message = responseMessage;
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

      // Bots may echo `dispatch_id` back from the callback URL we built
      // in autoOrder. Accept it from either body or query — some bots
      // POST query params into the body, others preserve them on the URL.
      const dispatchIdRaw =
        (req.body && (req.body as any).dispatch_id) ??
        (req.query && (req.query as any).dispatch_id);
      const dispatchId = Number(dispatchIdRaw) || 0;

      console.log("[checkOrder] callback received", {
        orderid,
        status,
        content,
        body: req.body,
        dispatch_id: dispatchId,
      });

      const order = await Order.findByPk(orderid);
      if (!order) {
        response.message = "order not found";
        return res.status(404).send(response.response);
      }

      // Classify the callback. Same as before: success / known user error
      // / generic failure. The classification applies to whichever
      // BotDispatch row(s) we're updating.
      const safeContent = String(content || "").trim();
      const isSuccess = status == "success";
      const isInvalidPlayer = /^invalid\s*player\s*id$/i.test(safeContent);
      const isInvalidRegion = /^invalid\s*(player\s*)?region/i.test(
        safeContent,
      );
      const isNotFoundPackage = /^package\s*not\s*found/i.test(safeContent);
      const isInvalidLiteral = /invalid\s*literal\s*for\s*int/i.test(
        safeContent,
      );
      const isKnownUserError =
        isInvalidPlayer ||
        isInvalidRegion ||
        isNotFoundPackage ||
        isInvalidLiteral;

      const dispatchStatus: "success" | "failed" | "cancelled" = isSuccess
        ? "success"
        : isKnownUserError
          ? "cancelled"
          : "failed";
      const dispatchError = isSuccess
        ? null
        : isInvalidPlayer
          ? "Invalid player ID"
          : isInvalidRegion
            ? "Invalid region"
            : isNotFoundPackage
              ? "Package not found"
              : isInvalidLiteral
                ? "Input parse error (base 10)"
                : safeContent || "bot reported failure";

      // Update the dispatch row(s) the callback is for.
      //   dispatch_id present → just that one
      //   dispatch_id missing → mark all currently-`sent` rows for this
      //                         order, since the bot didn't pin the
      //                         specific one.
      let targetedDispatchIds: number[] = [];
      if (dispatchId > 0) {
        const d = await BotDispatch.findByPk(dispatchId);
        if (d && Number(d.order_id) === Number(orderid)) {
          d.status = dispatchStatus;
          d.error_reason = dispatchError;
          (d as any).response_content = safeContent;
          await d.save();
          targetedDispatchIds = [d.id];
        } else {
          console.warn(
            "[checkOrder] dispatch_id did not match order — falling back",
            { dispatch_id: dispatchId, orderid },
          );
        }
      }
      if (targetedDispatchIds.length === 0) {
        const sentRows = await BotDispatch.findAll({
          where: { order_id: orderid, status: "sent" },
        });
        for (const d of sentRows) {
          d.status = dispatchStatus;
          d.error_reason = dispatchError;
          (d as any).response_content = safeContent;
          await d.save();
          targetedDispatchIds.push(d.id);
        }
      }

      // Re-aggregate the order's terminal status from all of its
      // dispatches via the shared helper (same logic the admin retry
      // endpoint uses, so both stay consistent).
      const agg = await aggregateOrderFromDispatches(Number(orderid));

      let mystatus: string;
      if (agg.status === null) {
        // Legacy order, no dispatch tracking — preserve previous semantics.
        mystatus = isSuccess
          ? "completed"
          : isKnownUserError
            ? "cancel"
            : "pending";
      } else {
        mystatus = agg.status;
      }

      // Capture the DB status before overwriting — needed for the refund
      // guard below so we only refund once on the first cancel transition.
      const previousOrderStatus = order.status;
      order.status = mystatus;

      // Compose user-facing brief_note + details. The details cell now
      // surfaces the per-dispatch failures (built by the helper) so the
      // admin can read each reason without opening any other view.
      if (mystatus === "completed") {
        // brief_note used to be cleared on completion. Now it carries the
        // reward block so the storefront's order list can render the
        // coin/cashback + reseller bonus the user just earned. Fetch the
        // package + user inline (cheap — one PK lookup each) so we don't
        // need to thread them through from the caller.
        try {
          const [pkg, rewardUser] = await Promise.all([
            TopupPackage.findByPk((order as any).topuppackage_id),
            User.findByPk((order as any).user_id),
          ]);
          const rewardHtml = buildRewardNoteHtml({
            rewardType: (pkg as any)?.reward_type,
            coinValue: (pkg as any)?.coin_value,
            cashbackAmount: (pkg as any)?.cashback_amount,
            resellerCashback: (pkg as any)?.reseller_cashback,
            isReseller:
              String((rewardUser as any)?.user_type || "").toLowerCase() ===
              "reseller",
          });
          // checkOrder is the deferred path — no UniPin/voucher prefix to
          // preserve here, so the reward block stands alone (or empty if
          // the package has no reward configured).
          order.brief_note = rewardHtml;
        } catch (e) {
          console.error("[checkOrder] reward note build failed", {
            order_id: (order as any).id,
            err: (e as any)?.message || e,
          });
          order.brief_note = "";
        }
        (order as any).details =
          agg.status === null
            ? safeContent
              ? `<span style="color:#059669;"><strong>Bot delivered:</strong> ${safeContent}</span>`
              : "<span style='color:#059669;'><strong>Bot delivered successfully.</strong></span>"
            : buildOrderDetailsHtml(agg);
      } else if (mystatus === "cancel") {
        // Cancel can be reached two ways:
        //   - explicit Invalid player/region callback
        //   - all failed dispatches at the retry cap (not retryable)
        if (isInvalidPlayer) {
          order.brief_note =
            "আপনার দেওয়া প্লেয়ার আইডি সঠিক নয়। অনুগ্রহ করে সঠিক আইডি দিয়ে আবার অর্ডার করুন।";
        } else if (isInvalidRegion) {
          order.brief_note =
            "আপনার আইডির রিজিয়ন এই প্যাকেজের জন্য সাপোর্টেড নয়। অনুগ্রহ করে সঠিক রিজিয়নের আইডি দিয়ে আবার অর্ডার করুন।";
        } else if (isNotFoundPackage) {
          order.brief_note =
            "⚠️আপনার আইডিতে এই প্যাকেজটি একবার নেওয়া হয়েছে। অনুগ্রহ করে আপনার আইডি অথবা সার্ভার চেক করুন।🔰";
        } else if (isInvalidLiteral) {
          order.brief_note =
            "আপনার দেওয়া আইডিটি সঠিক নয় (সংখ্যা হতে হবে)। অনুগ্রহ করে সঠিক আইডি দিয়ে আবার অর্ডার করুন।";
        } else if (agg.cappedFailedCount > 0) {
          order.brief_note =
            "অর্ডারটি ডেলিভারি করা যায়নি এবং পুনরায় চেষ্টা করার সীমা শেষ হয়ে গেছে। অনুগ্রহ করে সাপোর্টে যোগাযোগ করুন।";
        }
        (order as any).details =
          agg.status === null
            ? isInvalidPlayer
              ? '<span style="color:#dc2626;"><strong>Cancelled — Invalid player ID</strong> reported by the upstream bot. Order will not be retried.</span>'
              : isInvalidRegion
                ? '<span style="color:#dc2626;"><strong>Cancelled — Invalid region</strong> reported by the upstream bot. Order will not be retried.</span>'
                : isNotFoundPackage
                  ? '<span style="color:#dc2626;"><strong>Cancelled — Package not found</strong> reported by the upstream bot. Order will not be retried.</span>'
                  : isInvalidLiteral
                    ? '<span style="color:#dc2626;"><strong>Cancelled — Input parse error</strong> (bot failed to parse numeric input). Order will not be retried.</span>'
                    : '<span style="color:#dc2626;"><strong>Cancelled</strong> by the upstream bot.</span>'
            : buildOrderDetailsHtml(agg);
        order.uc = "";

        // Refund wallet — mirrors the admin manual-cancel path exactly.
        // Guard: only on the FIRST transition into "cancel" so a repeated
        // checkOrder callback for the same order doesn't double-credit.
        if (previousOrderStatus !== "cancel") {
          try {
            const [refundUser, refundProduct] = await Promise.all([
              User.findByPk((order as any).user_id),
              TopupProduct.findByPk((order as any).product_id),
            ]);
            if (refundUser) {
              refundUser.wallet =
                Number(refundUser.wallet) + Number((order as any).amount);
              await refundUser.save();
            }
            if (refundProduct && (order as any).bprice) {
              refundProduct.price =
                Number(refundProduct.price) + parseFloat((order as any).bprice);
              await refundProduct.save();
            }
          } catch (e) {
            console.error("[checkOrder] wallet refund failed", {
              order_id: (order as any).id,
              err: (e as any)?.message || e,
            });
          }
        }
      } else if (mystatus === "In Progress") {
        order.brief_note =
          "সার্ভারে একটি ত্রুটি দেখা দিয়েছে। আপনার অর্ডারটি পেন্ডিং অবস্থায় রয়েছে — কিছুক্ষণের মধ্যেই সমাধান করা হবে। সমস্যা চলতে থাকলে অনুগ্রহ করে সাপোর্টে যোগাযোগ করুন।";
        (order as any).details = buildOrderDetailsHtml(agg);
      } else if (mystatus === "pending" && agg.status === "pending") {
        // Bot rejected every dispatch with no in-flight calls — order
        // surfaces as pending so the admin can retry from the Details
        // modal. Per-dispatch reasons are in the details HTML.
        order.brief_note =
          "সার্ভারে একটি ত্রুটি দেখা দিয়েছে। আপনার অর্ডারটি পেন্ডিং অবস্থায় রয়েছে — কিছুক্ষণের মধ্যেই সমাধান করা হবে। সমস্যা চলতে থাকলে অনুগ্রহ করে সাপোর্টে যোগাযোগ করুন।";
        (order as any).details = buildOrderDetailsHtml(agg);
      } else if (mystatus === "pending" && agg.status === null) {
        // Legacy single-callback fallthrough — kept for orders that
        // existed before the BotDispatch table.
        order.brief_note =
          "সার্ভারে একটি ত্রুটি দেখা দিয়েছে। আপনার অর্ডারটি পেন্ডিং অবস্থায় রয়েছে — কিছুক্ষণের মধ্যেই সমাধান করা হবে। সমস্যা চলতে থাকলে অনুগ্রহ করে সাপোর্টে যোগাযোগ করুন।";
        (order as any).details = safeContent
          ? `<span style="color:#dc2626;"><strong>Bot reported:</strong> ${safeContent}</span>`
          : "<span style='color:#dc2626;'><strong>Server failure</strong> — bot returned no specific error. Order kept pending for manual retry.</span>";
        order.uc = "";
      }
      await order.save();

      // Coin reward sync — award on "completed", reverse on "cancel".
      // Idempotent: re-running checkOrder for the same order never
      // double-credits or double-reverses.
      await syncOrderCoinsForStatus(order, mystatus);
      // Cashback (money reward + reseller cashback) follows the same
      // terminal transitions and is independently idempotent.
      await syncOrderCashbackForStatus(order, mystatus);

      // Voucher state mirrors order outcome. For modern orders we use the
      // per-dispatch tracking to ensure we only release vouchers that
      // actually failed (and weren't consumed). Legacy orders stay on the
      // all-or-nothing aggregate logic.
      const CONSUMED_PATTERNS = [
        /Failed to create order in unipin-orders table/i,
        /Consumed Voucher/i,
        /Already Used/i,
      ];

      const vouchers = await Voucher.findAll({
        where: { order_id: orderid },
      });

      if (vouchers.length > 0) {
        const promises: any[] = [];
        for (const voucher of vouchers) {
          // Consumed is terminal: once a voucher has been flagged as
          // consumed by the upstream bot, never demote it back to
          // "used"/"unused" — a later callback for the same order can
          // arrive with a generic success/cancel message that doesn't
          // re-trip the consumed-pattern match, and silently downgrading
          // would let the code be re-emitted from the pool.
          if (Number(voucher.is_used) === 2) {
            continue;
          }

          let shouldBeUsed = 1;

          const d = await BotDispatch.findOne({
            where: { order_id: orderid, voucher_id: voucher.id },
          });
          const reason =
            (d
              ? (d as any).error_reason || (d as any).response_content
              : safeContent) || "";

          const vIsConsumed = CONSUMED_PATTERNS.some((p) => p.test(reason));

          if (mystatus === "cancel") {
            // Only release if NOT consumed.
            shouldBeUsed = vIsConsumed ? 2 : 0; // 2 for Consumed
          } else {
            // completed, pending, In Progress all keep the voucher reserved/used
            shouldBeUsed = vIsConsumed ? 2 : 1;
          }

          voucher.is_used = shouldBeUsed;
          promises.push(voucher.save());
        }
        await Promise.all(promises);
      }

      response.message = "Order updated successfully";
      response.data = {
        order_status: mystatus,
        dispatch_counts: agg.counts,
        targeted_dispatch_ids: targetedDispatchIds,
      };
      return res.send(response.response);
    } catch (error) {
      console.error("[checkOrder] failed", error);
      res.status(400).send(response.internalError);
    }
  }

  async addWallet(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const { purpose, amount: rawAmount, number, paymentmethod } = req.body;

      let user_id = req.user.id;

      const user = await User.findByPk(user_id);

      if (!user) {
        response.message = "User not found";
        return res.status(400).send(response.response);
      }

      // Coerce to a real number — the client sends amount as a string from
      // the Yup-validated text input, and DECIMAL(10,2) on the Transaction
      // column means anything beyond 2 decimal places gets truncated by the
      // DB. The string `"10.5"` < `0` returns false (NaN comparison) so
      // without parseFloat the guard below silently lets bad payloads
      // through. UddoktaPay also expects a numeric `amount`.
      const amount = Number.parseFloat(String(rawAmount));
      if (!user_id || !Number.isFinite(amount) || amount <= 0) {
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
                // Single-unit emit (webhook metadata has no quantity).
                const voucher = await Voucher.findOne({
                  where: {
                    is_used: 0,
                    package_id: order.topuppackage_id,
                  },
                  order: [["id", "ASC"]],
                });
                if (voucher) {
                  voucher.is_used = 1;
                  voucher.order_id = order.id;
                  await voucher.save();
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

            // Coin reward is deferred to checkOrder (awarded only after the
            // bot confirms delivery). Continue with the bot dispatch below.
            try {
              const topupPackage = await TopupPackage.findByPk(
                order.topuppackage_id,
              );
              if (topupPackage) {
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
                    const dispatchList = shellActiveHere ? tagsHere : [""];
                    let botStatus: any = null;
                    for (let i = 0; i < dispatchList.length; i++) {
                      const tagValue = dispatchList[i];
                      const { ok } = await createAndSendDispatch({
                        order_id: order.id,
                        player_id: order.playerid,
                        uc: topupPackage.uc,
                        bot_url: (topupPackage as any).bot_url || "",
                        code: shellActiveHere ? shellValueHere : myunipincode,
                        package_name_sent: shellActiveHere
                          ? tagValue
                          : topupPackage.name,
                        tag: shellActiveHere ? tagValue : null,
                      });
                      botStatus = ok;
                      if (!ok) break;
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
