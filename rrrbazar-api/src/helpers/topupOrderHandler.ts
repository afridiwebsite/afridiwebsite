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
import syncOrderCoinsForStatus from "./orderCoinSync";
import syncOrderCashbackForStatus from "./orderCashbackSync";

const {
  BotDispatch,
  CoinTransaction,
  PackageVoucherMap,
  StoreUnipin,
  TopupProduct,
  User,
  Voucher,
} = Schema;

export type BotType = "none" | "uc-bot" | "shell-bot" | "like-bot" | "pubg-bot";

// GamersPay orders endpoint. PUBG-bot packages all dispatch here — no
// per-package URL, so the admin form doesn't ask for one.
const PUBG_BOT_ORDERS_URL = "https://api.gamerspay.app/api/v1/orders";

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

/**
 * Build the Like-bot GET URL.
 *
 * The admin supplies the base URL on `TopupPackage.bot_url` (so we can
 * point at any compatible upstream, not just api.fflike.shop) and the
 * API key on `bot_config.key`. We append `?key=<key>&uid=<playerid>`,
 * switching to `&` when the configured URL already has query params.
 * Anything else the upstream needs (e.g. `server_name`) is the admin's
 * job to bake into the URL itself.
 */
export function buildLikeBotUrl(pkg: any, playerid: string): string {
  const cfg = parseBotConfig(pkg?.bot_config);
  const key = String(cfg.key || "").trim();
  const uid = String(playerid || "").trim();
  const baseUrl = String(pkg?.bot_url || "").trim();
  if (!baseUrl || !key || !uid) return "";
  const sep = baseUrl.includes("?") ? "&" : "?";
  const q = new URLSearchParams({ key, uid }).toString();
  return `${baseUrl}${sep}${q}`;
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
  // Only when the package is configured for coin rewards; money rewards
  // are handled by syncOrderCashbackForStatus below.
  try {
    const rewardType = String(
      (topupPackage as any).reward_type || "coin",
    ).toLowerCase();
    const coinReward =
      rewardType === "money"
        ? 0
        : Number(topupPackage.coin_value || 0) * quantity;
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

  // Money-reward + reseller-cashback path. Idempotent — safe to call
  // even if a retry already credited it. Quantity-aware so bulk voucher
  // orders pay per-unit cashback (matches the coin reward shape above).
  await syncOrderCashbackForStatus(order, "completed", quantity);

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
 *
 * Debug logging: the constructed URL is logged with its `key` query param
 * masked so the API key doesn't end up in plaintext logs, and the raw
 * upstream body (captured on the BotDispatch row by fireLikeBot via
 * executeDispatch) is logged + surfaced into order.details so an admin
 * can see exactly what the like-bot returned without trawling logs.
 */
function maskUrlKey(url: string): string {
  // Replace `key=<value>` with `key=****<last 4>` for safer logging.
  return url.replace(/(key=)([^&]+)/i, (_m, p1, p2) => {
    const v = String(p2 || "");
    const tail = v.length > 4 ? v.slice(-4) : v;
    return `${p1}****${tail}`;
  });
}

async function handleLikeBot(opts: {
  order: any;
  topupPackage: any;
  playerid: string;
}): Promise<DispatchResult> {
  const { order, topupPackage, playerid } = opts;
  const cfg = parseBotConfig(topupPackage?.bot_config);
  const url = buildLikeBotUrl(topupPackage, playerid);
  const maskedUrl = maskUrlKey(url);

  console.log("[handleLikeBot] entering", {
    order_id: order.id,
    package_id: topupPackage.id,
    package_name: topupPackage.name,
    playerid,
    server_name: String(cfg.server_name || "bd"),
    key_present: !!String(cfg.key || "").trim(),
    url: maskedUrl,
  });

  if (!url) {
    console.warn("[handleLikeBot] misconfigured — refusing to fire", {
      order_id: order.id,
      package_id: topupPackage.id,
      key_present: !!String(cfg.key || "").trim(),
      playerid_present: !!String(playerid || "").trim(),
    });
    order.status = "pending";
    (order as any).details =
      "<span style='color:#dc2626;'><strong>Like-bot misconfigured:</strong> missing API key or playerid.</span>";
    await order.save();
    return {
      responseMessage:
        "Order placed — like-bot config is incomplete, awaiting admin fix.",
    };
  }

  const { dispatch, ok, error_reason } = await createAndSendDispatch({
    order_id: order.id,
    player_id: playerid,
    uc: topupPackage.uc || 0,
    bot_url: url,
    code: "",
    package_name_sent: topupPackage.name,
    bot_type: "like-bot",
  });

  // fireLikeBot stashes the upstream body on `response_content` on
  // success and the parsed reason on `error_reason` on failure. Reload
  // the dispatch row so we surface the freshest values in details/logs
  // (createAndSendDispatch returns the pre-save instance).
  const refreshed = await BotDispatch.findByPk(dispatch.id);
  const respContent = String(
    (refreshed as any)?.response_content ?? "",
  );
  const errReason = String(
    (refreshed as any)?.error_reason ?? error_reason ?? "",
  );

  console.log("[handleLikeBot] dispatch result", {
    order_id: order.id,
    dispatch_id: dispatch.id,
    ok: !!ok,
    status: (refreshed as any)?.status,
    error_reason: errReason || null,
    response_preview: respContent ? respContent.slice(0, 500) : null,
  });

  // The transport-layer `ok` from fireLikeBot doesn't say whether the
  // upstream actually delivered any likes — it just means the GET
  // returned 2xx. The real outcome is in the JSON body: a success
  // response carries `LikesGivenByAPI > 0` with a real PlayerNickname,
  // while a "couldn't process this player" reply has
  // `LikesGivenByAPI = 0`, `PlayerNickname = "Unknown"` and
  // `status = "Unknown"`. We parse the body and route on those fields.
  const parsed = parseLikeBotBody(respContent);
  const likesGiven = Number(parsed?.LikesGivenByAPI ?? 0);
  const likesBefore = Number(parsed?.LikesbeforeCommand ?? 0);
  const likesAfter = Number(parsed?.LikesafterCommand ?? 0);
  const nickname = String(parsed?.PlayerNickname ?? "");
  const upstreamStatus = parsed?.status;
  const isDelivered =
    ok &&
    likesGiven > 0 &&
    nickname.length > 0 &&
    nickname.toLowerCase() !== "unknown" &&
    upstreamStatus !== "Unknown";

  console.log("[handleLikeBot] outcome classified", {
    order_id: order.id,
    dispatch_id: dispatch.id,
    transport_ok: !!ok,
    likes_given: likesGiven,
    likes_before: likesBefore,
    likes_after: likesAfter,
    nickname,
    upstream_status: upstreamStatus,
    delivered: isDelivered,
  });

  if (isDelivered) {
    // Flip the BotDispatch row to a real "success" if fireLikeBot left
    // it as a generic "ok" — keeps the dispatches list honest.
    if (refreshed && (refreshed as any).status !== "success") {
      (refreshed as any).status = "success";
      await refreshed.save();
    }
    order.status = "completed";
    // brief_note is rendered with ReactHtmlParser on the storefront's
    // /profile/order page, so a few <br/>-separated key/value lines is
    // the cleanest way to show the per-order summary the customer
    // cares about (who got the likes, before/after counts). The
    // nickname comes straight from the upstream so it's HTML-escaped.
    order.brief_note =
      `Name : ${escapeHtml(nickname || "Unknown")}<br/>` +
      `Before Like : ${likesBefore}<br/>` +
      `Added Like : ${likesGiven}<br/>` +
      `Total Like : ${likesAfter}`;
    (order as any).details =
      `<span style='color:#059669;'><strong>Like-bot delivered successfully.</strong></span>` +
      `<ul style='text-align:left; margin-top:6px; list-style-type:disc; padding-left:20px;'>` +
      `<li><strong>Likes given:</strong> ${likesGiven}</li>` +
      `<li><strong>Before:</strong> ${likesBefore}</li>` +
      `<li><strong>After:</strong> ${likesAfter}</li>` +
      (nickname
        ? `<li><strong>Player:</strong> ${escapeHtml(nickname)}</li>`
        : "") +
      `</ul>` +
      (respContent
        ? `<div style='margin-top:6px;'><strong>Upstream response:</strong>` +
          `<pre style='background:#f3f4f6; padding:6px; border-radius:4px; white-space:pre-wrap; word-break:break-word; font-size:12px; margin-top:4px;'>` +
          escapeHtml(respContent) +
          `</pre></div>`
        : "");
    await order.save();
    // Like-bot orders never hit the checkOrder webhook, so coin reward
    // would otherwise be missed — award it here. syncOrderCoinsForStatus
    // is idempotent (reads existing CoinTransaction rows) so safe to
    // call even if a retry path triggered it before.
    await syncOrderCoinsForStatus(order, "completed");
    await syncOrderCashbackForStatus(order, "completed");
    return { responseMessage: "Order placed successfully" };
  }

  // Failure — upstream couldn't deliver likes. Mark the dispatch as
  // cancelled (parallels how checkOrder treats known user errors like
  // Invalid player ID) so it won't be picked up by retry, cancel the
  // order, and refund the wallet so the customer isn't out of pocket
  // for a delivery that never happened.
  if (refreshed) {
    (refreshed as any).status = "cancelled";
    (refreshed as any).error_reason =
      `Like-bot reported no delivery (status=${String(upstreamStatus)}, likes=${likesGiven})`;
    await refreshed.save();
  }

  const failureReason = errReason || "Like-bot reported no delivery";
  order.status = "cancel";
  order.brief_note =
    "প্লেয়ার আইডিতে লাইক পাঠানো যায়নি — আপনার দেওয়া আইডি যাচাই করুন। অর্ডারটি বাতিল করা হয়েছে এবং অর্থ আপনার ওয়ালেটে ফেরত দেওয়া হয়েছে।";
  (order as any).details =
    `<span style='color:#dc2626;'><strong>Like-bot failed:</strong> ` +
    escapeHtml(failureReason) +
    `</span>` +
    `<ul style='text-align:left; margin-top:6px; list-style-type:disc; padding-left:20px;'>` +
    `<li><strong>Likes given:</strong> ${likesGiven}</li>` +
    `<li><strong>Player nickname:</strong> ${escapeHtml(nickname || "Unknown")}</li>` +
    `<li><strong>Upstream status:</strong> ${escapeHtml(String(upstreamStatus ?? "Unknown"))}</li>` +
    `</ul>` +
    (respContent
      ? `<div style='margin-top:6px;'><strong>Upstream response:</strong>` +
        `<pre style='background:#f3f4f6; padding:6px; border-radius:4px; white-space:pre-wrap; word-break:break-word; font-size:12px; margin-top:4px;'>` +
        escapeHtml(respContent) +
        `</pre></div>`
      : "");
  (order as any).uc = "";
  await order.save();

  // Refund wallet + restore product bprice, mirroring the cancel branch
  // in checkOrder and the admin manual-cancel path.
  try {
    const [refundUser, refundProduct] = await Promise.all([
      User.findByPk((order as any).user_id),
      TopupProduct.findByPk((order as any).product_id),
    ]);
    if (refundUser) {
      (refundUser as any).wallet =
        Number((refundUser as any).wallet) + Number((order as any).amount);
      await refundUser.save();
    }
    if (refundProduct && (order as any).bprice) {
      (refundProduct as any).price =
        Number((refundProduct as any).price) +
        parseFloat((order as any).bprice);
      await refundProduct.save();
    }
  } catch (e) {
    console.error("[handleLikeBot] wallet refund failed", {
      order_id: order.id,
      err: (e as any)?.message || e,
    });
  }

  // Reverse any coin reward that might have been credited (no-op if
  // none — the helper is idempotent).
  await syncOrderCoinsForStatus(order, "cancel");
  await syncOrderCashbackForStatus(order, "cancel");

  return { responseMessage: "Order placed successfully" };
}

// Parse the like-bot's JSON response into an object. Returns {} when
// the body wasn't valid JSON or isn't an object — callers treat that
// as "no useful info" and fall through to the failure branch.
function parseLikeBotBody(raw: string): Record<string, any> {
  const s = String(raw || "").trim();
  if (!s) return {};
  try {
    const v = JSON.parse(s);
    if (v && typeof v === "object" && !Array.isArray(v)) return v;
  } catch {
    /* fall through */
  }
  return {};
}

// Minimal HTML escape for inlining bot response bodies into order.details.
// We don't want a malicious upstream payload to break the admin order modal.
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * PUBG-bot: synchronous POST to the GamersPay orders endpoint (hard-
 * coded at PUBG_BOT_ORDERS_URL). Body is `{ game, sku, player_id }`,
 * API key goes in the `X-API-Key` header. Outcome decided inline from
 * the response body (no /check_order callback), mirroring the like-bot
 * pattern.
 *
 * Status routing (matches the upstream API contract):
 *   completed                  → success, wallet stays charged
 *   errorrisk                  → success (code delivered, flagged for
 *                                manual redemption); brief_note tells the
 *                                user
 *   risk_error_manual_charge   → success; data.code_plaintext is the
 *                                code to redeem at the official center
 *   pending_review             → keep order pending, no refund
 *   failed / success:false     → cancel + refund (same as like-bot)
 *
 * The dispatch row's `code` field carries a JSON envelope
 * (`{ api_key, body }`) so the retry endpoint can re-fire the exact
 * same payload even if the package's bot_config has drifted since.
 */
async function handlePubgBot(opts: {
  order: any;
  topupPackage: any;
  playerid: string;
}): Promise<DispatchResult> {
  const { order, topupPackage, playerid } = opts;
  const cfg = parseBotConfig(topupPackage?.bot_config);
  const apiKey = String(cfg.key || "").trim();
  const game = String(cfg.game || "").trim();
  const sku = String(cfg.sku || "").trim();

  console.log("[handlePubgBot] entering", {
    order_id: order.id,
    package_id: topupPackage.id,
    package_name: topupPackage.name,
    playerid,
    game,
    sku,
    key_present: !!apiKey,
  });

  if (!apiKey || !game || !sku) {
    console.warn("[handlePubgBot] misconfigured — refusing to fire", {
      order_id: order.id,
      package_id: topupPackage.id,
      has_key: !!apiKey,
      has_game: !!game,
      has_sku: !!sku,
    });
    order.status = "pending";
    (order as any).details =
      "<span style='color:#dc2626;'><strong>PUBG-bot misconfigured:</strong> API key, game, or SKU missing.</span>";
    await order.save();
    return {
      responseMessage:
        "Order placed — PUBG-bot config is incomplete, awaiting admin fix.",
    };
  }

  const body: Record<string, any> = {
    game,
    sku,
    player_id: String(playerid || "").trim(),
  };

  // Envelope on the dispatch row — see function-level comment.
  const codeEnvelope = JSON.stringify({ api_key: apiKey, body });

  const { dispatch, ok, error_reason } = await createAndSendDispatch({
    order_id: order.id,
    player_id: playerid,
    uc: topupPackage.uc || 0,
    bot_url: PUBG_BOT_ORDERS_URL,
    code: codeEnvelope,
    package_name_sent: topupPackage.name,
    bot_type: "pubg-bot",
  });

  const refreshed = await BotDispatch.findByPk(dispatch.id);
  const respContent = String((refreshed as any)?.response_content ?? "");
  const errReason = String(
    (refreshed as any)?.error_reason ?? error_reason ?? "",
  );

  const parsed = parsePubgBotBody(respContent);
  const apiSuccess = parsed?.success === true;
  const apiStatus = String(parsed?.status || "")
    .toLowerCase()
    .trim();
  const apiOrderId = String(parsed?.order_id || "");
  const apiMessage = String(parsed?.message || "");
  const apiPlayerName = String(parsed?.player_name || "");
  const amountCharged = parsed?.amount_charged;
  const manualCode = String(parsed?.data?.code_plaintext || "");

  const isDelivered = ok && apiSuccess && apiStatus === "completed";
  const isManualCharge = ok && apiStatus === "risk_error_manual_charge";
  const isErrorRisk = ok && apiStatus === "errorrisk";
  const isPendingReview = ok && apiStatus === "pending_review";

  console.log("[handlePubgBot] outcome classified", {
    order_id: order.id,
    dispatch_id: dispatch.id,
    transport_ok: !!ok,
    api_success: apiSuccess,
    api_status: apiStatus,
    api_order_id: apiOrderId,
    delivered: isDelivered,
    manual_charge: isManualCharge,
    error_risk: isErrorRisk,
    pending_review: isPendingReview,
  });

  // Terminal success: completed, errorrisk (code delivered + flagged),
  // and risk_error_manual_charge (admin gets code_plaintext to hand
  // off). All three mean the wallet charge is justified.
  if (isDelivered || isManualCharge || isErrorRisk) {
    if (refreshed && (refreshed as any).status !== "success") {
      (refreshed as any).status = "success";
      await refreshed.save();
    }
    order.status = "completed";
    const playerLine = apiPlayerName
      ? `Name : ${escapeHtml(apiPlayerName)}<br/>`
      : "";
    if (isManualCharge && manualCode) {
      order.brief_note =
        playerLine +
        `Manual Redemption Code : ${escapeHtml(manualCode)}<br/>` +
        `Redeem at the official PUBG redemption center.`;
    } else if (isErrorRisk) {
      order.brief_note =
        playerLine +
        `Note : ${escapeHtml(apiMessage || "Provider flagged this order for manual review — code delivered.")}`;
    } else {
      order.brief_note =
        playerLine +
        `Order ID : ${escapeHtml(apiOrderId || String(order.id))}`;
    }
    (order as any).details =
      `<span style='color:#059669;'><strong>PUBG-bot delivered successfully.</strong></span>` +
      `<ul style='text-align:left; margin-top:6px; list-style-type:disc; padding-left:20px;'>` +
      `<li><strong>Upstream order:</strong> ${escapeHtml(apiOrderId || "—")}</li>` +
      `<li><strong>Status:</strong> ${escapeHtml(apiStatus)}</li>` +
      (apiPlayerName
        ? `<li><strong>Player:</strong> ${escapeHtml(apiPlayerName)}</li>`
        : "") +
      (amountCharged != null
        ? `<li><strong>Charged (USD):</strong> ${escapeHtml(String(amountCharged))}</li>`
        : "") +
      (apiMessage
        ? `<li><strong>Message:</strong> ${escapeHtml(apiMessage)}</li>`
        : "") +
      (isManualCharge && manualCode
        ? `<li><strong>Manual code:</strong> ${escapeHtml(manualCode)}</li>`
        : "") +
      `</ul>` +
      (respContent
        ? `<div style='margin-top:6px;'><strong>Upstream response:</strong>` +
          `<pre style='background:#f3f4f6; padding:6px; border-radius:4px; white-space:pre-wrap; word-break:break-word; font-size:12px; margin-top:4px;'>` +
          escapeHtml(respContent) +
          `</pre></div>`
        : "");
    await order.save();
    // Like the like-bot path, PUBG-bot orders never hit checkOrder, so
    // award the coin reward here. syncOrderCoinsForStatus is idempotent.
    await syncOrderCoinsForStatus(order, "completed");
    await syncOrderCashbackForStatus(order, "completed");
    return { responseMessage: "Order placed successfully" };
  }

  if (isPendingReview) {
    // Upstream is reviewing — order stays pending, no refund. Park the
    // dispatch row as `sent` so a future poll/callback (if the provider
    // ever adds one) or an admin can resolve it.
    if (refreshed) {
      (refreshed as any).status = "sent";
      await refreshed.save();
    }
    order.status = "pending";
    order.brief_note =
      "অর্ডারটি প্রদানকারীর পর্যালোচনাধীন রয়েছে। কয়েক মিনিটের মধ্যেই আপডেট হবে।";
    (order as any).details =
      `<span style='color:#d97706;'><strong>PUBG-bot held for review.</strong></span>` +
      (apiMessage
        ? `<div style='margin-top:6px;'>${escapeHtml(apiMessage)}</div>`
        : "") +
      (respContent
        ? `<pre style='background:#f3f4f6; padding:6px; border-radius:4px; white-space:pre-wrap; word-break:break-word; font-size:12px; margin-top:6px;'>` +
          escapeHtml(respContent) +
          `</pre>`
        : "");
    await order.save();
    return {
      responseMessage:
        "Order placed — awaiting upstream review, no charge change.",
    };
  }

  // Failure — refund + cancel, identical to handleLikeBot.
  if (refreshed) {
    (refreshed as any).status = "cancelled";
    (refreshed as any).error_reason =
      errReason ||
      apiMessage ||
      `PUBG-bot reported failure (status=${apiStatus || "unknown"})`;
    await refreshed.save();
  }

  const failureReason = errReason || apiMessage || "PUBG-bot reported failure";
  order.status = "cancel";
  order.brief_note =
    "PUBG-bot অর্ডার সম্পন্ন করা যায়নি। অর্ডার বাতিল করা হয়েছে এবং অর্থ আপনার ওয়ালেটে ফেরত দেওয়া হয়েছে।";
  (order as any).details =
    `<span style='color:#dc2626;'><strong>PUBG-bot failed:</strong> ` +
    escapeHtml(failureReason) +
    `</span>` +
    `<ul style='text-align:left; margin-top:6px; list-style-type:disc; padding-left:20px;'>` +
    `<li><strong>Status:</strong> ${escapeHtml(apiStatus || "unknown")}</li>` +
    (apiOrderId
      ? `<li><strong>Upstream order:</strong> ${escapeHtml(apiOrderId)}</li>`
      : "") +
    (apiMessage
      ? `<li><strong>Message:</strong> ${escapeHtml(apiMessage)}</li>`
      : "") +
    `</ul>` +
    (respContent
      ? `<div style='margin-top:6px;'><strong>Upstream response:</strong>` +
        `<pre style='background:#f3f4f6; padding:6px; border-radius:4px; white-space:pre-wrap; word-break:break-word; font-size:12px; margin-top:4px;'>` +
        escapeHtml(respContent) +
        `</pre></div>`
      : "");
  (order as any).uc = "";
  await order.save();

  try {
    const [refundUser, refundProduct] = await Promise.all([
      User.findByPk((order as any).user_id),
      TopupProduct.findByPk((order as any).product_id),
    ]);
    if (refundUser) {
      (refundUser as any).wallet =
        Number((refundUser as any).wallet) + Number((order as any).amount);
      await refundUser.save();
    }
    if (refundProduct && (order as any).bprice) {
      (refundProduct as any).price =
        Number((refundProduct as any).price) +
        parseFloat((order as any).bprice);
      await refundProduct.save();
    }
  } catch (e) {
    console.error("[handlePubgBot] wallet refund failed", {
      order_id: order.id,
      err: (e as any)?.message || e,
    });
  }
  await syncOrderCoinsForStatus(order, "cancel");
  await syncOrderCashbackForStatus(order, "cancel");

  return { responseMessage: "Order placed successfully" };
}

// Parse the pubg-bot's JSON response into an object. Returns {} when
// the body wasn't valid JSON or isn't an object — callers treat that
// as "no useful info" and fall through to the failure branch.
function parsePubgBotBody(raw: string): Record<string, any> {
  const s = String(raw || "").trim();
  if (!s) return {};
  try {
    const v = JSON.parse(s);
    if (v && typeof v === "object" && !Array.isArray(v)) return v;
  } catch {
    /* fall through */
  }
  return {};
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
