/**
 * topupPackageOrder used to be one long function in user.controller.ts
 * with branches for every bot kind. As the catalogue of supported bots
 * grew (uc-bot, shell-bot, like-bot, pubg-bot …) that single function
 * stopped being readable.
 *
 * This module owns the *post-order-creation* dispatch logic: emitting
 * vouchers, persisting BotDispatch rows, and firing the right bot for
 * the package's configured `bot_type`. user.controller.ts still owns
 * validation, payment, and order creation; once it has a saved Order
 * + the user's playerid it hands off to `dispatchOrder()` below.
 */

import { Sequelize } from "sequelize";
import Schema from "../models";
import { createAndSendDispatch } from "./dispatchBot";

const {
  BotDispatch,
  CoinTransaction,
  PackageVoucherMap,
  StoreUnipin,
  Voucher,
} = Schema;

export type BotType = "none" | "uc-bot" | "shell-bot" | "like-bot" | "pubg-bot";

// Result returned to the caller (topupPackageOrder) so it knows what
// brief_note / details to set and what message to send back to the user.
export interface DispatchResult {
  // What HTTP message the storefront should show.
  responseMessage: string;
  // Optional override (defaults to 200). Used for special cases like
  // "voucher pool empty — order parked pending".
  alternateResponseMessage?: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Resolve the effective bot type. Priority:
 *   1. explicit `bot_type` column on the package
 *   2. legacy `auto_delivery` + `is_shell` flags (rows that haven't been
 *      migrated yet)
 *   3. 'none'
 */
export function resolveBotType(pkg: any): BotType {
  const explicit = String(pkg?.bot_type || "")
    .toLowerCase()
    .trim() as BotType;
  if (
    explicit === "uc-bot" ||
    explicit === "shell-bot" ||
    explicit === "like-bot" ||
    explicit === "pubg-bot" ||
    explicit === "none"
  ) {
    if (explicit !== "none") return explicit;
  }
  // Legacy fallback
  if (pkg?.auto_delivery == 1 && pkg?.is_shell == 1) return "shell-bot";
  if (pkg?.auto_delivery == 1) return "uc-bot";
  return "none";
}

/** Parse a TopupPackage.bot_config JSON blob into an object (defensive). */
export function parseBotConfig(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      const v = JSON.parse(raw);
      if (v && typeof v === "object" && !Array.isArray(v)) return v;
    } catch {
      /* fall through */
    }
  }
  return {};
}

/** Parse the JSON-encoded tags column into a clean string array. */
export function parseTags(raw: any): string[] {
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

/** Build the Like-bot GET URL from the package config + the order's playerid. */
export function buildLikeBotUrl(pkg: any, playerid: string): string {
  const cfg = parseBotConfig(pkg?.bot_config);
  const key = String(cfg.key || "").trim();
  const server = String(cfg.server_name || "bd").trim() || "bd";
  const uid = String(playerid || "").trim();
  if (!key || !uid) return "";
  const q = new URLSearchParams({
    key,
    server_name: server,
    uid,
  }).toString();
  return `https://api.fflike.shop/api/like?${q}`;
}

async function emitVoucher(packageId: number, orderId: number): Promise<any> {
  const voucher = await Voucher.findOne({
    where: { is_used: 0, package_id: packageId },
    order: [["id", "ASC"]],
  });
  if (!voucher) return null;
  (voucher as any).is_used = 1;
  (voucher as any).order_id = orderId;
  await voucher.save();
  return voucher;
}

async function releaseVoucher(voucher: any): Promise<void> {
  if (!voucher) return;
  voucher.is_used = 0;
  voucher.order_id = null;
  await voucher.save();
}

function appendBotErrorsHtml(html: string, errors: string[]): string {
  if (errors.length === 0) return html;
  return (
    html +
    "<ul style='text-align:left; margin-top:8px; list-style-type:disc; padding-left:20px;'>" +
    errors.map((e) => `<li>${e}</li>`).join("") +
    "</ul>"
  );
}

/* -------------------------------------------------------------------------- */
/*  Voucher-product handler                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Voucher-product orders: pull `quantity` codes from the package's own
 * voucher pool and complete the order inline. Independent of bot_type
 * (the voucher IS the deliverable). If the pool can't fulfil the full
 * quantity we park the order pending and persist placeholders so the
 * admin retry endpoint can finish later.
 *
 * Awards coin reward inline (qty × coin_value) because these orders never
 * reach checkOrder.
 */
export async function handleVoucherProduct(opts: {
  order: any;
  topupPackage: any;
  user: any;
  quantity: number;
}): Promise<DispatchResult> {
  const { order, topupPackage, user, quantity } = opts;

  const emitted: any[] = [];
  let pool_exhausted = false;
  for (let i = 0; i < quantity; i++) {
    const v = await emitVoucher(topupPackage.id, order.id);
    if (!v) {
      pool_exhausted = true;
      break;
    }
    emitted.push(v);
  }

  if (pool_exhausted) {
    // Release partial allocation so codes aren't held idle against a
    // stuck order.
    for (const v of emitted) await releaseVoucher(v);
    order.status = "pending";
    order.brief_note = "Awaiting voucher restock";
    (order as any).details =
      `<span style="color:orange;"><strong>Voucher pool ran dry</strong> — only ${emitted.length} of ${quantity} unit(s) were available at order time. Order kept pending for manual fulfilment.</span>`;
    await order.save();

    // One placeholder BotDispatch per requested unit so admin retry can
    // re-allocate when stock returns. For voucher products bot_url is
    // typically empty — retryBotDispatches handles that by completing
    // the order directly without firing a bot.
    for (let i = 0; i < quantity; i++) {
      try {
        await BotDispatch.create({
          order_id: order.id,
          voucher_id: null,
          voucher_package_id: topupPackage.id,
          tag: null,
          code: "",
          package_name_sent: topupPackage.name || "",
          bot_url: String(topupPackage.bot_url || ""),
          bot_type: "",
          status: "failed",
          error_reason: "No voucher available in pool — awaiting restock",
          attempt_count: 0,
        });
      } catch (e) {
        console.error(
          "[handleVoucherProduct] failed to persist placeholder dispatch",
          { order_id: order.id, unit: i, err: (e as any)?.message || e },
        );
      }
    }

    return {
      responseMessage:
        "Order placed — your vouchers will be delivered once stock is restocked.",
    };
  }

  order.status = "completed";
  order.brief_note =
    emitted.length === 1
      ? `Voucher: ${emitted[0].data}`
      : `Vouchers (${emitted.length}) delivered`;
  (order as any).details =
    `<strong>Allocated Vouchers:</strong><ul style="text-align:left; margin-top:8px; list-style-type:disc; padding-left:20px;">${emitted.map((v) => `<li>${v.data}</li>`).join("")}</ul>`;
  await order.save();

  // Award coin reward inline — voucher orders never reach checkOrder,
  // so the deferred path in syncOrderCoinsForStatus won't credit them.
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
    // Never block an order on coin rewarding failure.
    console.error("[handleVoucherProduct] coin reward failed", {
      order_id: order.id,
      err: (e as any)?.message || e,
    });
  }

  return { responseMessage: "Order placed successfully" };
}

/* -------------------------------------------------------------------------- */
/*  Per-bot handlers                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Shell-bot: send the package's configured shell value in `code` once per
 * tag. No voucher consumed. Fails the order outright when the package is
 * missing shell value or tags.
 */
async function handleShellBot(opts: {
  order: any;
  topupPackage: any;
  playerid: string;
}): Promise<DispatchResult> {
  const { order, topupPackage, playerid } = opts;
  const tagsParsed = parseTags(topupPackage.tags);
  const shellValue = String(topupPackage.shell || "").trim();
  const botUrl = String(topupPackage.bot_url || "").trim();

  // Misconfiguration is caught by topupPackageOrder's pre-check too, but
  // keep a guard here so the helper is safe to call standalone.
  if (!shellValue || tagsParsed.length === 0) {
    order.status = "pending";
    (order as any).details =
      "<span style='color:#dc2626;'><strong>Shell-bot misconfigured:</strong> shell value or tags missing.</span>";
    await order.save();
    return {
      responseMessage:
        "Order placed — package shell config is incomplete, awaiting admin fix.",
    };
  }

  const botErrors: string[] = [];
  let bot_failures = 0;
  const total = tagsParsed.length;

  if (!botUrl) {
    botErrors.push("auto-bot URL is not configured for this package");
  } else {
    for (let i = 0; i < total; i++) {
      const tagValue = tagsParsed[i];
      const { ok } = await createAndSendDispatch({
        order_id: order.id,
        player_id: playerid,
        uc: topupPackage.uc,
        bot_url: botUrl,
        code: shellValue,
        package_name_sent: tagValue,
        tag: tagValue,
        bot_type: "shell-bot",
      });
      if (!ok) {
        bot_failures += 1;
        botErrors.push(
          `shell dispatch #${i + 1}/${total} (tag "${tagValue}") rejected — see dispatches list`,
        );
      }
    }
  }

  order.status = "In Progress";
  let detailHtml = `<strong>Shell dispatches: ${total - bot_failures}/${total} ok, ${bot_failures} failed</strong>`;
  if (!botUrl) detailHtml += "<br/><span style='color:red;'>URL missing</span>";
  detailHtml = appendBotErrorsHtml(detailHtml, botErrors);
  (order as any).details = detailHtml;
  await order.save();

  return { responseMessage: "Order placed successfully" };
}

/**
 * UC-bot: voucher-pool auto-delivery. Emit one voucher per
 * PackageVoucherMap row, then POST each to the bot. If any pool runs
 * out we park the order pending and persist placeholders so the admin
 * retry endpoint can fulfil it later.
 *
 * Falls back to the legacy single-bot UniPin path when the package has
 * no maps configured (older packages that just wire `bot_url + uc`).
 */
async function handleUcBot(opts: {
  order: any;
  topupPackage: any;
  playerid: string;
}): Promise<DispatchResult> {
  const { order, topupPackage, playerid } = opts;
  const botUrl = String(topupPackage.bot_url || "").trim();

  const maps = await PackageVoucherMap.findAll({
    where: { topup_package_id: topupPackage.id },
    raw: true,
  });

  // No maps — fall through to the legacy single-bot StoreUnipin path.
  if (maps.length === 0) {
    return handleLegacyUnipinBot(opts);
  }

  const emitted: any[] = [];
  let pool_exhausted = false;
  for (const m of maps as any[]) {
    const v = await emitVoucher(m.voucher_package_id, order.id);
    if (!v) {
      pool_exhausted = true;
      break;
    }
    emitted.push(v);
  }

  if (pool_exhausted) {
    for (const v of emitted) await releaseVoucher(v);

    // Persist one placeholder BotDispatch per expected dispatch so the
    // admin retry endpoint can re-emit + re-fire when stock returns.
    for (const m of maps as any[]) {
      try {
        await BotDispatch.create({
          order_id: order.id,
          voucher_id: null,
          voucher_package_id: m.voucher_package_id,
          tag: null,
          code: "",
          package_name_sent: topupPackage.name || "",
          bot_url: botUrl,
          bot_type: "uc-bot",
          status: "failed",
          error_reason: "No voucher available in pool — awaiting restock",
          attempt_count: 0,
        });
      } catch (e) {
        console.error("[handleUcBot] failed to persist placeholder dispatch", {
          order_id: order.id,
          err: (e as any)?.message || e,
        });
      }
    }
    order.status = "pending";
    order.brief_note =
      "ভাউচার স্টক শেষ। নতুন স্টক আসার অপেক্ষায় রয়েছে। সহায়তার জন্য সাপোর্ট টিমের সাথে যোগাযোগ করুন।";
    (order as any).details =
      "<span style='color:orange;'><strong>Auto-delivery skipped:</strong> one of the linked voucher pools was empty at order time. Order kept pending — admin can retry once stock returns.</span>";
    await order.save();
    return {
      responseMessage:
        "Order placed — your vouchers will be delivered once stock is restocked.",
    };
  }

  // Fire the bot once per emitted voucher.
  const botErrors: string[] = [];
  let bot_failures = 0;
  if (!botUrl) {
    botErrors.push("auto-bot URL is not configured for this package");
  } else {
    for (const v of emitted) {
      const { ok } = await createAndSendDispatch({
        order_id: order.id,
        player_id: playerid,
        uc: topupPackage.uc,
        bot_url: botUrl,
        code: (v as any).data,
        package_name_sent: topupPackage.name,
        voucher_id: (v as any).id,
        bot_type: "uc-bot",
      });
      if (!ok) {
        bot_failures += 1;
        botErrors.push(
          `bot rejected voucher #${(v as any).id} — see dispatches list`,
        );
      }
    }
  }

  order.status = "In Progress";
  let detailHtml = `<strong>Bot failures: ${bot_failures}</strong>`;
  if (!botUrl) detailHtml += "<br/><span style='color:red;'>URL missing</span>";
  detailHtml = appendBotErrorsHtml(detailHtml, botErrors);
  (order as any).details = detailHtml;
  await order.save();

  return { responseMessage: "Order placed successfully" };
}

/**
 * Like-bot: synchronous GET to api.fflike.shop with the package's key +
 * server_name + the order's playerid. Outcome is decided inline from the
 * response body — no /check_order callback expected.
 */
async function handleLikeBot(opts: {
  order: any;
  topupPackage: any;
  playerid: string;
}): Promise<DispatchResult> {
  const { order, topupPackage, playerid } = opts;
  const url = buildLikeBotUrl(topupPackage, playerid);

  if (!url) {
    order.status = "pending";
    (order as any).details =
      "<span style='color:#dc2626;'><strong>Like-bot misconfigured:</strong> missing API key or playerid.</span>";
    await order.save();
    return {
      responseMessage:
        "Order placed — like-bot config is incomplete, awaiting admin fix.",
    };
  }

  const { ok } = await createAndSendDispatch({
    order_id: order.id,
    player_id: playerid,
    uc: topupPackage.uc || 0,
    bot_url: url,
    code: "",
    package_name_sent: topupPackage.name,
    bot_type: "like-bot",
  });

  // Like-bot terminates synchronously: ok = success, !ok = failed.
  if (ok) {
    order.status = "completed";
    order.brief_note = "Likes delivered";
    (order as any).details =
      "<span style='color:#059669;'><strong>Like-bot delivered successfully.</strong></span>";
  } else {
    order.status = "pending";
    (order as any).details =
      "<span style='color:#dc2626;'><strong>Like-bot failed:</strong> see dispatches list for the upstream reason.</span>";
  }
  await order.save();
  return { responseMessage: "Order placed successfully" };
}

/** PUBG-bot placeholder. Currently rejects with a clear "coming soon". */
async function handlePubgBot(opts: { order: any }): Promise<DispatchResult> {
  const { order } = opts;
  order.status = "pending";
  (order as any).details =
    "<span style='color:#dc2626;'><strong>PUBG-bot not yet supported.</strong> Order awaiting manual fulfilment.</span>";
  await order.save();
  return {
    responseMessage:
      "Order placed — PUBG-bot dispatch is not yet supported, awaiting admin fulfilment.",
  };
}

/**
 * Legacy single-bot UniPin path. Used as the fallback for uc-bot packages
 * that haven't been wired up with PackageVoucherMap rows. Reserves one
 * StoreUnipin code, fires the bot, and rolls back the reservation on
 * failure.
 */
async function handleLegacyUnipinBot(opts: {
  order: any;
  topupPackage: any;
  playerid: string;
}): Promise<DispatchResult> {
  const { order, topupPackage, playerid } = opts;

  if (!(order.status == "pending" && topupPackage.uc > 0)) {
    // Nothing to do — order is past pending or package has no UC tier.
    return { responseMessage: "Order placed successfully" };
  }

  const store_unipin_auto = await StoreUnipin.findOne({
    where: { status: 1, uc: topupPackage.uc },
    order: Sequelize.literal("RAND()"),
  });
  if (!store_unipin_auto) {
    (order as any).details =
      `<span style="color:orange;"><strong>Auto-bot skipped:</strong> No UniPin voucher in stock for UC tier ${topupPackage.uc}.</span>`;
    await order.save();
    return { responseMessage: "Order placed successfully" };
  }

  const send_unipin = (store_unipin_auto as any).code;
  (store_unipin_auto as any).status = order.id;
  await store_unipin_auto.save();

  const pkgBotUrl = String(topupPackage.bot_url || "").trim();
  let botStatus: any = null;
  let botError: string | null = null;

  if (!pkgBotUrl) {
    botError = "auto-bot URL is not configured for this package";
  } else {
    const { ok, error_reason } = await createAndSendDispatch({
      order_id: order.id,
      player_id: playerid,
      uc: topupPackage.uc,
      bot_url: pkgBotUrl,
      code: send_unipin,
      package_name_sent: topupPackage.name,
      bot_type: "uc-bot",
    });
    if (!ok) {
      botError =
        error_reason ||
        `bot returned no acceptance (no response from ${pkgBotUrl})`;
    } else {
      botStatus = ok;
    }
  }

  if (botStatus) {
    order.status = "In Progress";
    order.uc = send_unipin;
    order.ingamepassword = botStatus;
  } else {
    (store_unipin_auto as any).status = 1;
    await store_unipin_auto.save();
    order.status = "pending";
    order.uc = "";
    if (botError) {
      (order as any).details =
        `<span style="color:red;"><strong>Auto-bot failed:</strong> ${botError}</span>`;
    }
  }
  await order.save();
  return { responseMessage: "Order placed successfully" };
}

/* -------------------------------------------------------------------------- */
/*  Public entry                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Dispatch an order to the appropriate bot based on the package's
 * `bot_type`. Mutates and saves the order (status / details / brief_note)
 * and returns the user-facing message that topupPackageOrder should
 * surface in its response.
 *
 * Callers must have already validated the package's bot config (shell-bot
 * needs shell + tags; like-bot needs key + uid). This handler still
 * makes a best-effort soft-fail when something's wrong so the order
 * isn't lost.
 */
export async function dispatchOrder(opts: {
  order: any;
  topupPackage: any;
  playerid: string;
}): Promise<DispatchResult> {
  const botType = resolveBotType(opts.topupPackage);

  console.log("[dispatchOrder] routing", {
    order_id: opts.order.id,
    package_id: opts.topupPackage.id,
    bot_type: botType,
  });

  switch (botType) {
    case "shell-bot":
      return handleShellBot(opts);
    case "uc-bot":
      return handleUcBot(opts);
    case "like-bot":
      return handleLikeBot(opts);
    case "pubg-bot":
      return handlePubgBot(opts);
    case "none":
    default:
      // No auto-bot configured. Fall through to the legacy UniPin path if
      // the package has a UC tier — older packages still rely on it.
      return handleLegacyUnipinBot(opts);
  }
}
