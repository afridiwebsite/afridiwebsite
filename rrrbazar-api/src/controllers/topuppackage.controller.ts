import Schema from "../models";
import express from "express";
import { Sequelize } from "sequelize";
import responseUtils from "../utils/response.utils";

const {
  User,
  Order,
  AuthModule,
  Admin,
  AdminAuth,
  TopupPackage,
  TopupPackagePermission,
  StoreUnipin,
} = Schema;

// Accepts the array the admin form sends, or a stringified array, and
// returns a clean array of trimmed, non-empty strings. Anything that
// isn't an array (or string that parses to one) collapses to [].
function normalizeTagList(raw: any): string[] {
  let arr: any = raw;
  if (typeof arr === "string") {
    try {
      arr = JSON.parse(arr);
    } catch {
      arr = [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .map((v: any) => String(v == null ? "" : v).trim())
    .filter((s: string) => s.length > 0);
}

// Whitelist of supported bot types — anything else is collapsed to 'none'
// so an admin form can't accidentally save a typo into the column.
const ALLOWED_BOT_TYPES = new Set([
  "none",
  "uc-bot",
  "shell-bot",
  "like-bot",
  "pubg-bot",
]);

function normalizeBotType(raw: any): string {
  const v = String(raw || "").toLowerCase().trim();
  return ALLOWED_BOT_TYPES.has(v) ? v : "none";
}

function normalizeBotConfig(raw: any): Record<string, any> {
  if (raw == null) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return {};
    }
  }
  return {};
}

// Pull the relevant config slice for a given bot type, dropping unrelated
// keys so the stored JSON stays tidy. Returns the cleaned config object
// alongside a validation error message (null = ok).
function pickBotConfigFor(
  botType: string,
  raw: Record<string, any>,
): { config: Record<string, any>; error: string | null } {
  if (botType === "like-bot") {
    const key = String(raw?.key || "").trim();
    const server = String(raw?.server_name || "").trim() || "bd";
    if (!key) {
      return {
        config: {},
        error: 'Like-bot requires a "key" in bot_config',
      };
    }
    return { config: { key, server_name: server }, error: null };
  }
  if (botType === "pubg-bot") {
    // PUBG-bot needs the GamersPay X-API-Key plus the catalogue
    // identifiers (game + sku) — the orders URL is hardcoded server-
    // side. Without the validation+passthrough below, the controller
    // would strip these and save bot_config as `{}`, leaving the
    // package unable to dispatch.
    const key = String(raw?.key || "").trim();
    const game = String(raw?.game || "").trim();
    const sku = String(raw?.sku || "").trim();
    if (!key) {
      return {
        config: {},
        error: 'PUBG-bot requires a "key" in bot_config',
      };
    }
    if (!game) {
      return {
        config: {},
        error: 'PUBG-bot requires a "game" in bot_config',
      };
    }
    if (!sku) {
      return {
        config: {},
        error: 'PUBG-bot requires a "sku" in bot_config',
      };
    }
    return { config: { key, game, sku }, error: null };
  }
  // Other types currently take no config.
  return { config: {}, error: null };
}

/******************************************************************************
 *                              User Controller
 ******************************************************************************/
class TopupPackageController {
  async getTopupPackages(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    try {
      const topupPackages = await TopupPackage.findAll();
      response.data = topupPackages;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      response.message = "Internal Error! Try again";
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response);
    }
  }
  async getTopupPackageById(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    const id = req.params.id as any;

    try {
      const data = await TopupPackage.findByPk(id);
      response.data = data || [];
      res.send(response.response);
    } catch (error) {
      console.log(error);
      response.message = "Internal Error! Try again";
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response);
    }
  }

  async createTopupPackage(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    const {
      product_id,
      name,
      price,
      bprice,
      in_stock,
      serial,
      logo,
      coin_value,
      description,
      order_once,
      bot_url,
      auto_delivery,
      allow_quantity,
      stock_tracking,
      stock_quantity,
      is_shell,
      shell,
      tags,
      bot_type,
      bot_config,
      reward_type,
      cashback_amount,
      reseller_cashback,
      has_custom_inputs,
    } = req.body;

    try {
      // The new admin form sends `bot_type` directly; for backward
      // compat we also accept legacy auto_delivery + is_shell and
      // derive bot_type from them.
      let resolvedBotType = normalizeBotType(bot_type);
      if (resolvedBotType === "none") {
        if (auto_delivery == 1 && is_shell == 1) resolvedBotType = "shell-bot";
        else if (auto_delivery == 1) resolvedBotType = "uc-bot";
      }

      const shellOn = resolvedBotType === "shell-bot";
      const ucOn = resolvedBotType === "uc-bot";
      const isAutoOn = shellOn || ucOn;
      const cleanShell = shellOn ? String(shell || "").trim() : "";
      const cleanTags = shellOn ? normalizeTagList(tags) : [];

      // Shell packages must have a shell code AND at least one tag.
      if (shellOn && (!cleanShell || cleanTags.length === 0)) {
        response.message = !cleanShell
          ? "Shell value is required for Shell-bot"
          : "At least one tag is required for Shell-bot";
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response);
      }

      // Pick the type-specific config slice (e.g. like-bot key + server).
      const { config: pickedConfig, error: configError } = pickBotConfigFor(
        resolvedBotType,
        normalizeBotConfig(bot_config),
      );
      if (configError) {
        response.message = configError;
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response);
      }

      // Normalise the reward picker so unknown values fall back to 'coin'
      // (the legacy shape) and the off-mode field is zeroed — matching
      // the admin form's own exclusivity rule.
      const normRewardType =
        String(reward_type || "coin").toLowerCase() === "money"
          ? "money"
          : "coin";
      const normCoinValue =
        normRewardType === "money" ? 0 : Number(coin_value) || 0;
      const normCashback =
        normRewardType === "money" ? Number(cashback_amount) || 0 : 0;
      const normResellerCashback = Math.max(0, Number(reseller_cashback) || 0);

      const topupPackage = await TopupPackage.create({
        product_id,
        name,
        price,
        bprice,
        in_stock,
        serial,
        logo,
        coin_value: normCoinValue,
        description: description || "",
        // Re-order limit modes:
        //   0 = none, 1/2 = Player-scoped (forever/daily),
        //   3/4 = User-scoped (forever/daily). Anything else collapses to
        //   0 so a malformed payload can't store an unsupported mode.
        order_once: [1, 2, 3, 4].includes(Number(order_once))
          ? Number(order_once)
          : 0,
        bot_url: String(bot_url || "").trim(),
        // Legacy flags stay in sync with bot_type so any downstream
        // consumer that still reads them keeps working.
        auto_delivery: isAutoOn ? 1 : 0,
        allow_quantity: allow_quantity == 1 ? 1 : 0,
        stock_tracking: stock_tracking == 1 ? 1 : 0,
        stock_quantity:
          stock_tracking == 1 ? Math.max(0, Number(stock_quantity) || 0) : 0,
        is_shell: shellOn ? 1 : 0,
        shell: cleanShell,
        tags: JSON.stringify(cleanTags),
        bot_type: resolvedBotType,
        bot_config: JSON.stringify(pickedConfig),
        reward_type: normRewardType,
        cashback_amount: normCashback,
        reseller_cashback: normResellerCashback,
        has_custom_inputs: has_custom_inputs == 1 ? 1 : 0,
      });

      response.message = "Created successfully";
      response.data = topupPackage;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      response.message = "Internal Error! Try again";
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response);
    }
  }

  async updateTopupPackage(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    const id = req.params.id as any;
    const {
      product_id,
      name,
      price,
      bprice,
      in_stock,
      serial,
      logo,
      coin_value,
      description,
      order_once,
      bot_url,
      auto_delivery,
      allow_quantity,
      stock_tracking,
      stock_quantity,
      is_shell,
      shell,
      tags,
      bot_type,
      bot_config,
      reward_type,
      cashback_amount,
      reseller_cashback,
      has_custom_inputs,
    } = req.body;

    try {
      const topupPackage = await TopupPackage.findByPk(id);
      if (!topupPackage) {
        response.message = "Package not found to update";
        return res.status(400).send(response.internalError);
      }

      topupPackage.product_id = product_id;
      topupPackage.name = name;
      topupPackage.price = price;
      topupPackage.bprice = bprice;
      topupPackage.serial = serial;
      topupPackage.logo = logo;
      if (in_stock == 1 || in_stock == 0) {
        topupPackage.in_stock = in_stock;
      }
      if (coin_value !== undefined) {
        topupPackage.coin_value = Number(coin_value) || 0;
      }
      // Reward shape. We only touch a field when the caller actually
      // sent it, so a partial update (e.g. status edit) doesn't blow
      // away a reward saved by an earlier full edit. When reward_type
      // is provided, both reward fields are reconciled to match.
      if (reward_type !== undefined) {
        const normRewardType =
          String(reward_type).toLowerCase() === "money" ? "money" : "coin";
        (topupPackage as any).reward_type = normRewardType;
        if (normRewardType === "money") {
          (topupPackage as any).cashback_amount =
            cashback_amount !== undefined
              ? Number(cashback_amount) || 0
              : Number((topupPackage as any).cashback_amount) || 0;
          // Money mode → ensure the coin field is zero so it can't double-credit.
          topupPackage.coin_value = 0;
        } else {
          (topupPackage as any).cashback_amount = 0;
          if (coin_value !== undefined) {
            topupPackage.coin_value = Number(coin_value) || 0;
          }
        }
      } else if (cashback_amount !== undefined) {
        (topupPackage as any).cashback_amount = Number(cashback_amount) || 0;
      }
      if (reseller_cashback !== undefined) {
        (topupPackage as any).reseller_cashback = Math.max(
          0,
          Number(reseller_cashback) || 0,
        );
      }
      if (description !== undefined) {
        topupPackage.description = description;
      }
      if (order_once !== undefined) {
        // See createTopupPackage above for mode meanings (0–4).
        topupPackage.order_once = [1, 2, 3, 4].includes(Number(order_once))
          ? Number(order_once)
          : 0;
      }
      if (bot_url !== undefined) {
        topupPackage.bot_url = String(bot_url || "").trim();
      }
      if (allow_quantity !== undefined) {
        topupPackage.allow_quantity = allow_quantity == 1 ? 1 : 0;
      }
      if (stock_tracking !== undefined) {
        topupPackage.stock_tracking = stock_tracking == 1 ? 1 : 0;
        // When tracking is turned off, zero the count so it doesn't
        // linger and surprise anyone re-enabling later. When on, take
        // the value if provided.
        if (topupPackage.stock_tracking === 0) {
          topupPackage.stock_quantity = 0;
        } else if (stock_quantity !== undefined) {
          topupPackage.stock_quantity = Math.max(
            0,
            Number(stock_quantity) || 0,
          );
        }
      } else if (
        stock_quantity !== undefined &&
        topupPackage.stock_tracking === 1
      ) {
        topupPackage.stock_quantity = Math.max(0, Number(stock_quantity) || 0);
      }

      // Bot type resolution. Priority:
      //   1. Explicit `bot_type` in the request (new admin form).
      //   2. Legacy auto_delivery/is_shell flags (older clients).
      //   3. Existing saved bot_type if neither was provided.
      let resolvedBotType: string;
      if (bot_type !== undefined) {
        resolvedBotType = normalizeBotType(bot_type);
      } else if (auto_delivery !== undefined || is_shell !== undefined) {
        const ad =
          auto_delivery !== undefined
            ? auto_delivery == 1
            : topupPackage.auto_delivery == 1;
        const sh =
          is_shell !== undefined ? is_shell == 1 : topupPackage.is_shell == 1;
        resolvedBotType = ad ? (sh ? "shell-bot" : "uc-bot") : "none";
      } else {
        resolvedBotType = normalizeBotType(topupPackage.bot_type);
      }

      const shellWillBeOn = resolvedBotType === "shell-bot";
      const ucWillBeOn = resolvedBotType === "uc-bot";
      const isAutoOn = shellWillBeOn || ucWillBeOn;

      if (shellWillBeOn) {
        // Resolve the new shell/tags values from the request, falling
        // back to current saved values when not provided.
        const nextShell =
          shell !== undefined
            ? String(shell || "").trim()
            : String(topupPackage.shell || "").trim();
        const nextTags =
          tags !== undefined
            ? normalizeTagList(tags)
            : normalizeTagList(topupPackage.tags);
        if (!nextShell || nextTags.length === 0) {
          response.message = !nextShell
            ? "Shell value is required for Shell-bot"
            : "At least one tag is required for Shell-bot";
          response.status = 400;
          response.success = false;
          return res.status(400).send(response.response);
        }
        topupPackage.is_shell = 1;
        topupPackage.shell = nextShell;
        topupPackage.tags = JSON.stringify(nextTags);
      } else {
        topupPackage.is_shell = 0;
        topupPackage.shell = "";
        topupPackage.tags = "[]";
      }

      topupPackage.auto_delivery = isAutoOn ? 1 : 0;
      topupPackage.bot_type = resolvedBotType;

      // Bot config — only persisted for types that actually use it.
      const rawConfig =
        bot_config !== undefined
          ? normalizeBotConfig(bot_config)
          : normalizeBotConfig(topupPackage.bot_config);
      const { config: pickedConfig, error: configError } = pickBotConfigFor(
        resolvedBotType,
        rawConfig,
      );
      if (configError) {
        response.message = configError;
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response);
      }
      topupPackage.bot_config = JSON.stringify(pickedConfig);

      if (has_custom_inputs !== undefined) {
        (topupPackage as any).has_custom_inputs =
          has_custom_inputs == 1 ? 1 : 0;
      }

      await topupPackage.save();

      response.message = "Updated successfully";
      res.send(response.response);
    } catch (error) {
      console.log(error);
      response.message = "Internal Error! Try again";
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response);
    }
  }

  async deleteTopupPackage(req: express.Request, res: express.Response) {
    const response = new responseUtils();

    const id = req.params.id as any;

    try {
      await TopupPackage.destroy({ where: { id } });
      response.message = "Deleted successfully";
      res.send(response.response);
    } catch (error) {
      console.log(error);
      response.message = "Internal Error! Try again";
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response);
    }
  }

  async getTopupPackagesByProductId(
    req: express.Request,
    res: express.Response,
  ) {
    const response = new responseUtils();
    const id = req.params.id as any;

    try {
      const topupPackages = await TopupPackage.findAll({
        where: {
          product_id: id,
        },
        order: [["serial", "ASC"]],
        attributes: [
          "id",
          "product_id",
          "name",
          "type",
          "price",
          "bprice",
          "in_stock",
          "serial",
          "logo",
          [
            Sequelize.fn("COUNT_VOUCHER", Sequelize.col("TopupPackage.id")),
            "voucher",
          ],
        ],
      });
      response.data = topupPackages;
      res.send(response.response);
    } catch (error: any) {
      console.log(error);
      response.message = error?.message;
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response);
    }
  }

  async getTopupPackagePermissionByAdminId(
    req: express.Request,
    res: express.Response,
  ) {
    const response = new responseUtils();
    const id = req.params.id as any;

    try {
      const topupPackages = await TopupPackagePermission.findAll({
        where: {
          admin_id: id,
        },
        raw: true,
        attributes: ["topup_package_id"],
      });

      const onlyArray = topupPackages.map((e) => e.topup_package_id);

      response.data = onlyArray;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      response.message = "Internal Error! Try again";
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response);
    }
  }

  async addPermission(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    const body = req.body;

    try {
      await TopupPackagePermission.destroy({
        where: {
          admin_id: body.admin_id,
        },
      });

      for (const packageId of body.topup_package_id) {
        await TopupPackagePermission.create({
          admin_id: body.admin_id,
          topup_package_id: packageId,
        });
      }
      res.send(response.response);
    } catch (error) {
      console.log(error);
      response.message = "Internal Error! Try again";
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response);
    }
  }
  async updateDollarRate(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    const { product_id, dollar_rate } = req.body;

    try {
      const packages = await TopupPackage.findAll({ where: { product_id } });

      if (!packages) {
        response.message = "No packages found to update";
        return res.status(400).send(response.response);
      }

      packages.forEach(async (pakg) => {
        const updatedPrice =
          pakg.bprice == "0"
            ? pakg.price
            : parseInt(pakg.bprice) * parseFloat(dollar_rate);
        const toCeil = Math.ceil(Number(updatedPrice));
        pakg.price = toCeil.toString();
        await pakg.save();
      });

      res.send(response.response);
    } catch (error) {
      console.log(error);
      response.message = "Internal Error! Try again";
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response);
    }
  }

  async getPackagesGroupedByCategory(
    req: express.Request,
    res: express.Response,
  ) {
    const response = new responseUtils();

    try {
      const { Category, TopupProduct, TopupPackage } = Schema;

      const categories = await Category.findAll({
        include: [
          {
            model: TopupProduct,
            as: "topup_products",
            include: [
              {
                model: TopupPackage,
                as: "packages",
                attributes: ["id", "name", "price", "bprice", "in_stock", "serial"],
              },
            ],
          },
        ],
        order: [
          ["serial", "ASC"],
          [{ model: TopupProduct, as: "topup_products" }, "serial", "ASC"],
          [
            { model: TopupProduct, as: "topup_products" },
            { model: TopupPackage, as: "packages" },
            "serial",
            "ASC",
          ],
        ],
      });

      // Products with no categories
      const uncategorizedProducts = await TopupProduct.findAll({
        include: [
          {
            model: Category,
            as: "categories",
            required: false,
          },
          {
            model: TopupPackage,
            as: "packages",
            attributes: ["id", "name", "price", "bprice", "in_stock", "serial"],
          },
        ],
        where: Sequelize.literal("`categories`.`id` IS NULL"),
        order: [
          ["serial", "ASC"],
          [{ model: TopupPackage, as: "packages" }, "serial", "ASC"],
        ],
      });

      const formattedCategories = categories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        products: cat.topup_products || [],
      }));

      if (uncategorizedProducts.length > 0) {
        formattedCategories.push({
          id: 0,
          name: "Uncategorized",
          products: uncategorizedProducts,
        });
      }

      response.data = formattedCategories;
      res.send(response.response);
    } catch (error: any) {
      console.log(error);
      response.message = error?.message || "Internal Error! Try again";
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response);
    }
  }
}

/******************************************************************************
 *                               Export
 ******************************************************************************/
export default new TopupPackageController();
