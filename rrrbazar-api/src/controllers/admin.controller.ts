import axios from 'axios';
import express from 'express';
import moment from 'moment';
import { Op, QueryTypes } from 'sequelize';
import Schema from '../models';
import { sequelize } from '../models/Schemas';
import responseUtils from '../utils/response.utils';
import syncOrderCoinsForStatus from '../helpers/orderCoinSync';
import syncOrderCashbackForStatus from '../helpers/orderCashbackSync';
import buildRewardNoteHtml, { stripRewardNote } from '../helpers/orderRewardNote';
import { canPromoteToReseller } from './verificationAdmin.controller';
import {
  aggregateOrderFromDispatches,
  buildOrderDetailsHtml,
  executeDispatch,
  MAX_DISPATCH_ATTEMPTS,
} from '../helpers/dispatchBot';
import {
  checkPubgOrderStatusOnce,
  getDispatchApiKey,
  getDispatchUpstreamOrderId,
  parsePubgBotBody,
  processPubgResponse,
} from '../helpers/topupOrderHandler';
import {
  revokeAdminSession,
  revokeOtherAdminSessions,
  readCookie,
  resolveAdminSession,
  ADMIN_COOKIE_NAME,
} from '../utils/adminSession.utils';
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// import bcrypt from 'bcryptjs'

const {
  User,
  Order,
  AuthModule,
  Admin,
  AdminAuth,
  TopupPackagePermission,
  TopupPackage,
  Transaction,
  AdminTransaction,
  PaymentMethod,
  TopupProduct,
  TopupProductInput,
  TopupPackageInput,
  WithdrawEarnWallet,
  EarnWallet,
  StoreUnipin,
  AutoServer,
  CoinTransaction,
  OrderComment,
  Voucher,
  SiteSetting,
  BotDispatch,
  AdminSession,
  AdminLoginAudit,
} = Schema;

// Crude HTML → plaintext for the saved-comment picker. Doesn't try to be
// perfect, just enough that an admin selecting a template gets readable text
// to send through the existing order_note flow.
const htmlToPlain = (html: string) =>
  String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// Reserved keyword for the Player ID input. Only one input per product is
// allowed to have this title; assigning it also auto-enables isactivefortopup.
const PLAYER_ID_TITLE = 'Player ID';
const isPlayerIdTitle = (t: any) =>
  String(t || '').trim().toLowerCase() === PLAYER_ID_TITLE.toLowerCase();

// Shared admin-orders filter builder. Both the paginated list endpoint
// (getOrders) and the aggregate total-spent endpoint run off the exact
// same WHERE clause so the headline figure can never disagree with the
// rows the admin is looking at. Mirrors the query params accepted by the
// admin Orders search UI: user_id, order_id, status, uc, start_date,
// end_date. `payment_status = 1` is always applied so unpaid/abandoned
// rows never count.
async function buildAdminOrderFilter(query: any) {
  const { user_id, order_id, status, uc, start_date, end_date } = query;
  const filter: any = {};

  filter.payment_status = 1;

  if (user_id) filter.user_id = user_id;
  if (order_id) filter.id = order_id;
  if (status) filter.status = status;

  // Date range — both ends inclusive, both optional. The admin filter UI
  // sends ISO YYYY-MM-DD strings; we anchor end_date to 23:59:59 so the
  // same-day case (start == end) returns rows from the whole day.
  if (start_date || end_date) {
    const range: any = {};
    if (start_date) {
      const s = new Date(String(start_date));
      if (!isNaN(s.getTime())) {
        s.setHours(0, 0, 0, 0);
        range[Op.gte] = s;
      }
    }
    if (end_date) {
      const e = new Date(String(end_date));
      if (!isNaN(e.getTime())) {
        e.setHours(23, 59, 59, 999);
        range[Op.lte] = e;
      }
    }
    if (Object.getOwnPropertySymbols(range).length > 0) {
      filter.created_at = range;
    }
  }

  if (uc) {
    // Single search box on the admin orders page: matches the legacy
    // `Order.uc` field, the `Order.playerid` field, OR a voucher code on
    // the joined Voucher table. Pre-resolving the matching voucher
    // order_ids keeps the filter compatible with `Order.count` (which
    // can't OR across joined columns directly).
    const voucherOrderIds = (
      await Voucher.findAll({
        where: { data: { [Op.like]: `%${uc}%` } },
        attributes: ['order_id'],
        raw: true,
      })
    )
      .map((v: any) => v.order_id)
      .filter((id: any) => id != null);
    const orClauses: any[] = [
      { uc: { [Op.like]: `%${uc}%` } },
      { playerid: { [Op.like]: `%${uc}%` } },
    ];
    if (voucherOrderIds.length) {
      orClauses.push({ id: { [Op.in]: voucherOrderIds } });
    }
    filter[Op.or] = orClauses;
  }

  return filter;
}
/******************************************************************************
 *                              User Controller
 ******************************************************************************/
class AdminController {
  async publishPermission(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    res.send(response.getResponse())
  }

  async getOrders(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    try {
      const filter = await buildAdminOrderFilter(req.query);

      // Status priority overrides the date sort: "In Progress" orders (e.g.
      // auto-pay orders that just cleared the webhook and were dispatched to
      // the bot) surface at the very top, then pending, then everything else.
      // Within each status group, newest first. This works across pagination
      // since it's applied in the DB ORDER BY, not on the returned page.
      let order_by_str = sequelize.literal(
        "CASE WHEN `Order`.`status` = 'In Progress' THEN 1 WHEN `Order`.`status` = 'pending' THEN 2 ELSE 3 END, `Order`.`created_at` desc, `Order`.`id` desc"
      );


      const limit: any = parseInt(req.query.limit?.toString() || '20')
      const page: any = parseInt(req.query.page?.toString() || '1')

      const orderCount = await Order.count({ where: filter })

      const orders = await Order.findAll({
        offset: (page - 1) * limit,
        limit: limit,
        where: filter,
        order: order_by_str,
        include: [
          {
            model: Admin,
            required: false,
            attributes: ['first_name', 'last_name']
          },
          {
            // Voucher (when allocated for is_voucher products) — surfaced
            // in the admin orders table so it can be shown in the UC column.
            // `is_used` is included so the client can filter out vouchers
            // the upstream bot reported as consumed (is_used = 2) — those
            // never delivered to the customer and shouldn't be rendered as
            // a delivered code.
            model: Voucher,
            required: false,
            attributes: ['id', 'data', 'is_used'],
          },
          {
            // Package info — the admin orders table needs `is_shell` /
            // `shell` so the UC column can show the shell string for
            // shell-mode auto-delivery orders (which don't carry a voucher).
            model: TopupPackage,
            required: false,
            attributes: ['id', 'name', 'is_shell', 'shell', 'tags', 'seller'],
          },
          {
            // Per-dispatch bot rows so the admin Orders table + modal can
            // surface failure granularity and offer Retry.
            model: BotDispatch,
            required: false,
            attributes: [
              'id', 'voucher_id', 'voucher_package_id', 'tag', 'code',
              'package_name_sent', 'bot_url', 'status', 'error_reason',
              'attempt_count', 'last_attempted_at', 'created_at', 'updated_at',
            ],
          },
        ]
      })


      response.data = { orders, order_count: orderCount };

      res.send(response.getResponse())
    } catch (error) {
      console.log(error);
      response.message = 'Internal Error! Try again';
      response.status = 400;
      response.success = false
      return res.status(400).send(response.response);
    }
  }

  // GET /admin/orders/total-spent
  //
  // Aggregate companion to getOrders: returns the summed `amount` (what
  // was debited from the user's wallet) plus a matching order count for
  // the same filter set the Orders page exposes — user_id, date range,
  // status, uc/playerid. Powers the "Total Spent" card on top of the
  // admin Orders page so an admin can see, e.g., how much a single user
  // spent in a date range.
  //
  // Cancelled orders are excluded by default because their amount was
  // refunded to the wallet on cancel and therefore isn't money actually
  // spent. If the admin explicitly filters by `status` (including
  // `cancel`), we honour that instead so the card always agrees with the
  // table below it.
  async getOrdersTotalSpent(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    try {
      const filter = await buildAdminOrderFilter(req.query);

      if (!req.query.status) {
        filter.status = { [Op.ne]: 'cancel' };
      }

      const result: any = await Order.findOne({
        where: filter,
        attributes: [
          [
            sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0),
            'total_spent',
          ],
          [sequelize.fn('COUNT', sequelize.col('id')), 'order_count'],
        ],
        raw: true,
      });

      response.data = {
        total_spent: Number(result?.total_spent || 0),
        order_count: Number(result?.order_count || 0),
      };

      res.send(response.getResponse())
    } catch (error) {
      console.log(error);
      response.message = 'Internal Error! Try again';
      response.status = 400;
      response.success = false
      return res.status(400).send(response.response);
    }
  }

  async updateOrderStatus(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    const order_id = (req.params.id as any);
    const admin = (req.admin as any);
    const statusToUpdate = req.body.status;
    const orderNote = req.body.order_note;
    const completedById = admin.id;
    const order = await Order.findByPk(order_id);

    if (!order) {
      response.message = 'Order not found';
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response)
    }

    if(order.status == 'in_progress' && order.completed_by && order.completed_by != req.admin.id) {
      response.message = `This admin cannot make action`;
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response)
    }

    // Status modification is allowed regardless of the current status —
    // admins occasionally need to correct already-completed/cancelled
    // orders. The cancel-refund path below is still gated on the new
    // status to avoid double-refunding on repeated cancel writes.

    // Only refund on the transition INTO 'cancel' from a non-cancelled
    // state. Without this guard, an admin saving the modal twice on an
    // already-cancelled order would credit the wallet a second time.
    if (statusToUpdate == 'cancel' && order.status !== 'cancel') {
      let product = await TopupProduct.findByPk(order.product_id);
      let user = await User.findByPk(order.user_id);

      if (!user || !product) {
        response.message = `Something went wrong!`;
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response)
      }

      product.price = product.price + parseFloat((order as any).bprice)
      user.wallet = Number(user.wallet) + Number((order as any).amount)

      await product.save()
      await user.save()
    }

    const previousStatus = order.status;
    order.status = statusToUpdate;
    // Strip any prior reward block off the admin's typed note so a
    // stale reward from a previous completion doesn't get embedded
    // inside their text. The fresh block (if any) is appended below.
    order.brief_note = stripRewardNote(orderNote);
    order.completed_by = completedById;

    // When the admin marks an order completed, append the reward HTML
    // so the storefront's /profile/order shows the bonus alongside
    // their typed note. Mirrors what the bot-callback path does in
    // user.controller.ts checkOrder. Failures are logged but never
    // block the status update.
    if (statusToUpdate === 'completed') {
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
            String((rewardUser as any)?.user_type || '').toLowerCase() ===
            'reseller',
          // Multiply the displayed reward by the order's unit count so a
          // bulk order shows the per-unit reward × quantity. coin/cashback
          // sync helpers already auto-pick this from order.quantity.
          quantity: Math.max(1, Number((order as any).quantity) || 1),
        });
        if (rewardHtml) {
          order.brief_note = String(order.brief_note || '') + rewardHtml;
        }
      } catch (e) {
        console.error('[admin.updateOrderStatus] reward note build failed', {
          order_id: order.id,
          err: (e as any)?.message || e,
        });
      }
    }

    await order.save()

    // Sync coin rewards on terminal transitions. Award on first move to
    // "completed", reverse on first move to "cancel". The helper is
    // idempotent — saving the modal twice won't double-credit.
    console.log('[admin.updateOrderStatus] coin sync decision', {
      order_id: order.id,
      previousStatus,
      statusToUpdate,
      will_call_sync: statusToUpdate !== previousStatus,
      topuppackage_id: (order as any).topuppackage_id,
      user_id: order.user_id,
    });
    if (statusToUpdate !== previousStatus) {
      await syncOrderCoinsForStatus(order, statusToUpdate);
      // Cashback follows the same terminal-transition gate. Idempotent
      // so saving the modal twice does not double-credit.
      await syncOrderCashbackForStatus(order, statusToUpdate);
    }

    response.message = 'Order updated successfully';
    response.data = order
    res.send(response.response)
  }

  /**
   * Server-side proxy for the GamersPay PUBG-bot product catalogue.
   *
   * The admin Add/Edit Package form needs to populate the SKU dropdown
   * dynamically — different games (pubg, ff_*) have different SKU lists,
   * and the upstream catalogue can change without warning. We proxy the
   * call rather than firing it from the browser so:
   *   - the X-API-Key header doesn't leave the server (no CORS exposure),
   *   - the admin's API key doesn't end up in the browser's network tab
   *     reflected back from the upstream.
   *
   * Body: { game: string, api_key: string }
   * Returns the raw upstream payload, e.g.
   *   { game, display_name, items: [{ sku, price, display }] }
   */
  async getPubgBotProducts(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const game = String(req.body?.game || '').trim();
      const apiKey = String(req.body?.api_key || '').trim();
      if (!game || !apiKey) {
        response.message = 'game and api_key are required';
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response);
      }
      const url = `https://api.gamerspay.app/api/v1/products/${encodeURIComponent(game)}`;
      const upstream = await axios.get(url, {
        timeout: 10000,
        headers: { 'X-API-Key': apiKey },
        // Don't throw on 4xx — we want to surface the upstream error
        // message to the admin instead of swallowing it as a generic 500.
        validateStatus: () => true,
      });
      if (upstream.status < 200 || upstream.status >= 300) {
        const upstreamMsg =
          (upstream.data && (upstream.data.message || upstream.data.error)) ||
          `upstream returned HTTP ${upstream.status}`;
        response.message = `GamersPay rejected the request: ${upstreamMsg}`;
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response);
      }
      response.data = upstream.data;
      return res.send(response.response);
    } catch (error: any) {
      console.error(
        '[getPubgBotProducts] failed',
        error?.message || error,
      );
      response.message =
        'Could not reach GamersPay product catalogue. Try again in a moment.';
      response.status = 502;
      response.success = false;
      return res.status(502).send(response.response);
    }
  }

  /**
   * Resend the auto-bot for every `failed` BotDispatch row belonging to
   * each order in `order_ids`. Cancelled dispatches (Invalid player ID,
   * Invalid region) are intentionally NOT retried — those are permanent.
   * Dispatches already at the retry cap (MAX_DISPATCH_ATTEMPTS) are
   * skipped and reported back so the admin knows to escalate manually.
   *
   * Body: { order_ids: number[] }   (single is fine too)
   *
   * Response.data: per-order summary
   *   [{ order_id, retried, sent, still_failed, skipped_capped, error? }]
   *
   * The actual order-status transition happens later via the bot's
   * checkOrder callback. Immediately after retry the order stays at
   * whatever aggregate state checkOrder computed last time; the dispatch
   * rows are flipped to `sent` (or `failed` if the POST itself errored).
   */
  async retryBotDispatches(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    try {
      const raw = req.body?.order_ids;
      const idArr: number[] = (Array.isArray(raw) ? raw : [raw])
        .map((v: any) => Number(v))
        .filter((v: number) => Number.isFinite(v) && v > 0);
      if (idArr.length === 0) {
        response.message = 'order_ids (array) is required';
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response);
      }

      console.log('[retryBotDispatches] requested', { order_ids: idArr });

      const summary: any[] = [];
      for (const order_id of idArr) {
        const order = await Order.findByPk(order_id);
        if (!order) {
          summary.push({ order_id, error: 'order not found' });
          continue;
        }
        const topupPackage = await TopupPackage.findByPk(
          (order as any).topuppackage_id,
        );
        const ucForCall = Number((topupPackage as any)?.uc) || 0;

        const failed = await BotDispatch.findAll({
          where: { order_id, status: 'failed' },
        });
        if (failed.length === 0) {
          summary.push({
            order_id,
            retried: 0,
            sent: 0,
            still_failed: 0,
            skipped_capped: 0,
            message: 'no failed dispatches to retry',
          });
          continue;
        }

        let sent = 0;
        let stillFailed = 0;
        let skippedCapped = 0;
        let poolStillEmpty = 0;
        // Set when any pubg-bot dispatch on this order was handled via
        // processPubgResponse — skip the aggregate-based finalize below
        // so we don't overwrite the carefully-crafted pubg brief_note +
        // details.
        let pubgFinalized = false;

        console.log('[retryBotDispatches] processing dispatches', {
          order_id,
          failed_count: failed.length,
          dispatch_ids: failed.map((d) => d.id),
        });

        for (const dispatch of failed) {
          console.log('[retryBotDispatches] dispatch state', {
            order_id,
            dispatch_id: dispatch.id,
            status: dispatch.status,
            attempt_count: dispatch.attempt_count,
            voucher_id: dispatch.voucher_id,
            voucher_package_id: dispatch.voucher_package_id,
            code_present: !!dispatch.code,
            code_masked: dispatch.code
              ? `${String(dispatch.code).substring(0, 4)}...`
              : '(none)',
            bot_url: dispatch.bot_url || '(empty)',
            error_reason: dispatch.error_reason,
          });

          if (
            Number(dispatch.attempt_count || 0) >= MAX_DISPATCH_ATTEMPTS
          ) {
            console.log('[retryBotDispatches] skipping — at retry cap', {
              dispatch_id: dispatch.id,
              attempt_count: dispatch.attempt_count,
              MAX_DISPATCH_ATTEMPTS,
            });
            skippedCapped += 1;
            continue;
          }

          // If the bot reported the previous voucher was already consumed or
          // rejected at the unipin layer, the code is permanently invalid —
          // discard it (leave is_used = 1 so it never re-enters the pool)
          // and reset the dispatch to placeholder state so the allocation
          // branch below picks up a fresh voucher.
          const CONSUMED_PATTERNS = [
            /Failed to create order in unipin-orders table/i,
            /Consumed Voucher/i,
            /Already Used/i,
          ];
          const isConsumedVoucherError =
            !!dispatch.voucher_id &&
            CONSUMED_PATTERNS.some((p) => p.test(dispatch.error_reason || ''));

          if (isConsumedVoucherError) {
            const oldVoucher = await Voucher.findByPk(dispatch.voucher_id as number);
            const poolPackageId = oldVoucher
              ? (oldVoucher as any).package_id
              : dispatch.voucher_package_id;

            // Explicitly mark the consumed voucher as used so it can never
            // be re-emitted from the pool, regardless of how it was saved
            // when originally allocated.
            if (oldVoucher) {
              (oldVoucher as any).is_used = 2; // 2 for Consumed
              await oldVoucher.save();
            }

            console.log('[retryBotDispatches] consumed-voucher error — voucher flagged used, will re-allocate fresh', {
              dispatch_id: dispatch.id,
              old_voucher_id: dispatch.voucher_id,
              pool_package_id: poolPackageId,
              error_reason: dispatch.error_reason,
            });

            dispatch.voucher_id = null;
            dispatch.code = '';
            if (poolPackageId) dispatch.voucher_package_id = poolPackageId;
            await dispatch.save();
          }

          // Force re-allocation if the linked voucher is already marked as
          // consumed (status 2) by any other means. Carry the voucher's
          // pool over to `voucher_package_id` so the placeholder branch
          // below knows which pool to draw a fresh code from — without
          // this, a dispatch that only ever had voucher_id (no pool
          // tracking) would fall through to executeDispatch with empty
          // code and get rejected.
          if (dispatch.voucher_id) {
            const vRow = await Voucher.findByPk(dispatch.voucher_id);
            if (vRow && Number((vRow as any).is_used) === 2) {
              console.log('[retryBotDispatches] linked voucher is consumed — resetting for re-allocation', {
                dispatch_id: dispatch.id,
                voucher_id: dispatch.voucher_id,
                pool_package_id: (vRow as any).package_id,
              });
              dispatch.voucher_id = null;
              dispatch.code = '';
              if (!dispatch.voucher_package_id) {
                dispatch.voucher_package_id = (vRow as any).package_id;
              }
              await dispatch.save();
            }
          }

          // Placeholder for a voucher-pool-exhausted dispatch: try to
          // emit a fresh voucher from the linked pool first. If the pool
          // still has no stock, leave the row as `failed` with the same
          // reason and bump attempt_count via executeDispatch so the cap
          // eventually triggers cancellation.
          const isVoucherPlaceholder =
            !dispatch.voucher_id &&
            dispatch.voucher_package_id &&
            !dispatch.code;

          console.log('[retryBotDispatches] voucher-placeholder check', {
            dispatch_id: dispatch.id,
            is_voucher_placeholder: isVoucherPlaceholder,
            has_voucher_id: !!dispatch.voucher_id,
            has_voucher_package_id: !!dispatch.voucher_package_id,
            has_code: !!dispatch.code,
          });

          if (isVoucherPlaceholder) {
            console.log('[retryBotDispatches] entering voucher-emit branch', {
              dispatch_id: dispatch.id,
              voucher_package_id: dispatch.voucher_package_id,
            });

            const v = await Voucher.findOne({
              where: {
                is_used: 0,
                package_id: dispatch.voucher_package_id,
              },
              order: [['id', 'ASC']],
            });

            console.log('[retryBotDispatches] voucher pool query result', {
              dispatch_id: dispatch.id,
              voucher_package_id: dispatch.voucher_package_id,
              found: !!v,
              voucher_id: v ? (v as any).id : null,
            });

            if (!v) {
              // Bump attempt counter so repeated retries against a stuck
              // pool eventually trip the cap and auto-cancel.
              dispatch.attempt_count =
                Number(dispatch.attempt_count || 0) + 1;
              dispatch.last_attempted_at = new Date();
              dispatch.error_reason =
                'No voucher available in pool — awaiting restock';
              await dispatch.save();
              poolStillEmpty += 1;
              stillFailed += 1;
              console.log('[retryBotDispatches] pool still empty — bumped attempt_count', {
                dispatch_id: dispatch.id,
                new_attempt_count: dispatch.attempt_count,
              });
              continue;
            }
            (v as any).is_used = 1;
            (v as any).order_id = order_id;
            await v.save();
            dispatch.voucher_id = v.id;
            dispatch.code = (v as any).data || '';
            await dispatch.save();

            console.log('[retryBotDispatches] voucher allocated to dispatch', {
              dispatch_id: dispatch.id,
              voucher_id: v.id,
              bot_url: dispatch.bot_url || '(empty)',
            });

            // Pure voucher-pool product: no bot_url means delivery is
            // done by allocating the voucher directly — no bot needed.
            // Mark the dispatch success and complete the order inline so
            // the customer can see their code without a bot round-trip.
            if (!String(dispatch.bot_url || '').trim()) {
              dispatch.status = 'success';
              dispatch.attempt_count = Number(dispatch.attempt_count || 0) + 1;
              dispatch.last_attempted_at = new Date();
              await dispatch.save();

              // Pull all sibling dispatches for this order. If every one is
              // now success, complete the order and surface the codes.
              const allDispatches = await BotDispatch.findAll({ where: { order_id } });
              const allSuccess = allDispatches.every((d: any) => d.status === 'success');
              console.log('[retryBotDispatches] no-bot voucher path — all_success check', {
                dispatch_id: dispatch.id,
                order_id,
                total_dispatches: allDispatches.length,
                all_success: allSuccess,
              });
              if (allSuccess) {
                const codes = allDispatches
                  .map((d: any) => d.code)
                  .filter(Boolean);
                order.status = 'completed';
                order.brief_note =
                  codes.length === 1
                    ? `Voucher: ${codes[0]}`
                    : `Vouchers (${codes.length}) delivered`;
                (order as any).details = `<strong>Allocated Vouchers:</strong><ul style="text-align:left; margin-top:8px; list-style-type:disc; padding-left:20px;">${codes.map((c: string) => `<li>${c}</li>`).join('')}</ul>`;
                await order.save();
                await syncOrderCoinsForStatus(order, 'completed');
                console.log('[retryBotDispatches] order completed inline (no-bot)', { order_id });
              }
              sent += 1;
              continue;
            }
          } else {
            console.log('[retryBotDispatches] NOT a placeholder — dispatch already has voucher/code, proceeding to executeDispatch with existing code', {
              dispatch_id: dispatch.id,
              voucher_id: dispatch.voucher_id,
              code_masked: dispatch.code
                ? `${String(dispatch.code).substring(0, 4)}...`
                : '(none)',
            });
          }

          // PUBG-bot retry has a different shape than the legacy bots:
          // before re-firing the POST we GET /orders/{upstream_id} to see
          // if the provider has already resolved the order. If it has, we
          // finalize via processPubgResponse and skip the POST entirely.
          // Only if the upstream is still pending_review (or we don't have
          // an upstream order_id captured) do we fall through to
          // executeDispatch + processPubgResponse to fire a fresh POST.
          const isPubgBot =
            String((dispatch as any).bot_type || '').toLowerCase().trim() ===
            'pubg-bot';

          if (isPubgBot) {
            const upstreamOrderId = getDispatchUpstreamOrderId(dispatch);
            const apiKey = getDispatchApiKey(dispatch);
            console.log('[retryBotDispatches] pubg-bot — preflight GET', {
              dispatch_id: dispatch.id,
              has_upstream_order_id: !!upstreamOrderId,
              has_api_key: !!apiKey,
            });

            if (upstreamOrderId && apiKey) {
              const checkResult = await checkPubgOrderStatusOnce(
                upstreamOrderId,
                apiKey,
              );
              const upstreamStatus = String(checkResult.parsed?.status || '')
                .toLowerCase()
                .trim();
              const upstreamResolved =
                checkResult.transportOk &&
                !!upstreamStatus &&
                upstreamStatus !== 'pending_review';

              console.log('[retryBotDispatches] pubg-bot GET result', {
                dispatch_id: dispatch.id,
                transport_ok: checkResult.transportOk,
                upstream_status: upstreamStatus || '(empty)',
                upstream_resolved: upstreamResolved,
              });

              if (upstreamResolved) {
                // Persist what we saw and bump the attempt counter so the
                // cap still applies if this dispatch is retried again.
                (dispatch as any).response_content = checkResult.respContent;
                (dispatch as any).attempt_count =
                  Number(dispatch.attempt_count || 0) + 1;
                (dispatch as any).last_attempted_at = new Date();
                await dispatch.save();

                await processPubgResponse({
                  order,
                  topupPackage,
                  dispatch,
                  parsed: checkResult.parsed,
                  respContent: checkResult.respContent,
                  transportOk: checkResult.transportOk,
                  errReason: checkResult.errReason,
                });

                // processPubgResponse owns the order finalization for
                // pubg-bot — skip the aggregate-based finalize below by
                // jumping straight to the next dispatch.
                pubgFinalized = true;
                sent += 1;
                continue;
              }
              // Upstream still pending_review or transport blip — re-fire
              // the POST below. The new response_content will overwrite
              // whatever the GET captured, which is fine because
              // processPubgResponse runs again after the POST.
            }

            // Fall through to executeDispatch — re-fires the original
            // POST payload (envelope on dispatch.code). Then we parse
            // the response and finalize via processPubgResponse so the
            // order isn't left stuck on a partial transport update.
            console.log(
              '[retryBotDispatches] pubg-bot — firing POST via executeDispatch',
              { dispatch_id: dispatch.id, order_id },
            );

            const { ok: pubgOk, error_reason: pubgErr } = await executeDispatch(
              dispatch,
              {
                player_id: order.playerid || '',
                uc: ucForCall,
              },
            );

            const refreshedPubg =
              (await BotDispatch.findByPk(dispatch.id)) || dispatch;
            const respContentPubg = String(
              (refreshedPubg as any)?.response_content ?? '',
            );
            const errReasonPubg = String(
              (refreshedPubg as any)?.error_reason ?? pubgErr ?? '',
            );
            const parsedPubg = parsePubgBotBody(respContentPubg);

            await processPubgResponse({
              order,
              topupPackage,
              dispatch: refreshedPubg,
              parsed: parsedPubg,
              respContent: respContentPubg,
              transportOk: !!pubgOk,
              errReason: errReasonPubg,
            });

            pubgFinalized = true;
            if (pubgOk) sent += 1;
            else stillFailed += 1;
            continue;
          }

          console.log('[retryBotDispatches] calling executeDispatch', {
            dispatch_id: dispatch.id,
            order_id,
            player_id: order.playerid || '',
            uc: ucForCall,
            bot_url: dispatch.bot_url || '(empty)',
          });

          const { ok, error_reason } = await executeDispatch(dispatch, {
            player_id: order.playerid || '',
            uc: ucForCall,
          });

          console.log('[retryBotDispatches] executeDispatch result', {
            dispatch_id: dispatch.id,
            ok: !!ok,
            error_reason,
          });

          if (ok) sent += 1;
          else stillFailed += 1;
        }

        // Re-aggregate the order. If after this retry batch every failed
        // dispatch is capped (no retryable ones left) the helper flips
        // the order to "cancel" — admin can't progress it further. We
        // also refresh the order.details HTML so the Details column
        // reflects the new state immediately (the bot callbacks will
        // re-render again later as they arrive).
        //
        // Skip this entirely when a pubg-bot dispatch was finalized via
        // processPubgResponse — the aggregate would clobber the pubg
        // brief_note/details and (for pending_review) map sent → "In
        // Progress" which is the wrong customer-facing status.
        const agg = await aggregateOrderFromDispatches(order_id);
        if (agg.status && !pubgFinalized) {
          const previousStatus = order.status;
          order.status = agg.status;
          (order as any).details = buildOrderDetailsHtml(agg);
          if (agg.status === 'cancel' && agg.cappedFailedCount > 0) {
            order.brief_note =
              'অর্ডারটি ডেলিভারি করা যায়নি এবং পুনরায় চেষ্টা করার সীমা শেষ হয়ে গেছে। অনুগ্রহ করে সাপোর্টে যোগাযোগ করুন।';
          } else if (agg.status === 'pending') {
            order.brief_note =
              'সার্ভারে একটি ত্রুটি দেখা দিয়েছে। আপনার অর্ডারটি পেন্ডিং অবস্থায় রয়েছে — কিছুক্ষণের মধ্যেই সমাধান করা হবে। সমস্যা চলতে থাকলে অনুগ্রহ করে সাপোর্টে যোগাযোগ করুন।';
          }
          await order.save();
          // Reverse any previously-awarded coins on auto-cancel via the
          // shared sync helper (it's a no-op when nothing to reverse).
          if (
            previousStatus !== agg.status &&
            (agg.status === 'cancel' || agg.status === 'completed')
          ) {
            await syncOrderCoinsForStatus(order, agg.status);
          }
        }

        summary.push({
          order_id,
          retried: sent + stillFailed,
          sent,
          still_failed: stillFailed,
          skipped_capped: skippedCapped,
          pool_still_empty: poolStillEmpty,
          order_status: agg.status || order.status,
        });
      }

      response.message = 'Retry triggered';
      response.data = summary;
      return res.send(response.response);
    } catch (error) {
      console.error('[retryBotDispatches] failed', error);
      response.message = 'Internal Error! Try again';
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response);
    }
  }

  async getAdminOrders(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    try {
      const { user_id, status, order_id } = req.query;

      const adminId = req.admin.id;
      // const adminId = req.params.id;
      const filter: any = {};

      filter.payment_status = 1

      if (user_id) {
        filter.user_id = user_id
      }
      if (order_id) {
        filter.id = order_id
      }

      if (status) {
        filter.status = status
      }

      const limit: any = parseInt(req.query.limit?.toString() || '20')
      const page: any = parseInt(req.query.page?.toString() || '1')

      const packagesForAdmin = await TopupPackagePermission.findAll({
        where: {
          admin_id: adminId,
        },
        raw: true,
        attributes: ['topup_package_id'],
      })

      const bindPackageIdInArray = packagesForAdmin.map(pack => pack.topup_package_id.toString())

      const orderCount = await Order.count({
        where: {
          [Op.or]: [
            { topuppackage_id: bindPackageIdInArray },
            { topuppackage_id: null }
          ],
          ...filter
        },
      })

      const getAdminOrdersByPackageId = await Order.findAll({
        offset: (page - 1) * limit,
        limit: limit,
        where: {
          [Op.or]: [
            { topuppackage_id: bindPackageIdInArray },
            { topuppackage_id: null }
          ],
          ...filter
        },
        order: [
          ['created_at', 'DESC'],
        ],
        include: [
          {
            model: Admin,
            required: false,
            attributes: ['first_name', 'last_name']
          },
          {
            model: Voucher,
            required: false,
            attributes: ['id', 'data', 'is_used'],
          },
          {
            model: TopupPackage,
            required: false,
            attributes: ['id', 'name', 'is_shell', 'shell', 'tags', 'seller'],
          },
          {
            model: BotDispatch,
            required: false,
            attributes: [
              'id', 'voucher_id', 'voucher_package_id', 'tag', 'code',
              'package_name_sent', 'bot_url', 'status', 'error_reason',
              'attempt_count', 'last_attempted_at', 'created_at', 'updated_at',
            ],
          },
        ]
      })

      response.data = { orders: getAdminOrdersByPackageId, order_count: orderCount };
      res.send(response.response)
    } catch (error) {
      console.log(error);
      response.message = 'Internal Error! Try again';
      response.status = 400;
      response.success = false
      return res.status(400).send(response.response);
    }
  }

  async getAuthModules(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    // const limit: any = parseInt(req.query.limit?.toString() || '20')
    // const page: any = parseInt(req.query.page?.toString() || '1')

    // const auths = await AuthModule.findAll({
    //   offset: (page - 1) * limit,
    //   limit: limit,
    // })

    const auths = await AuthModule.findAll()

    response.data = auths;
    res.send(response.getResponse())
  }

  async activeAuthModules(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    try {
      const id = (req.params.id as any);

      const authModule = await AuthModule.findByPk(id)

      if (!authModule) {
        response.message = 'Auth module not found';
        response.status = 400;
        response.success = false
        return res.send(response.response);
      }

      if (authModule.status == 1) {
        response.status = 400;
        response.message = 'Auth module is already activated';
        response.success = false;
        return res.status(400).send(response.response);
      }

      authModule.name = req.body.name;
      authModule.description = req.body.description || '';
      authModule.slug = req.body.slug;
      authModule.description = req.body.description || '';
      authModule.status = 1;
      await authModule.save();

      res.send(response.response)
    } catch (error) {
      console.log(error);
      response.message = 'Internal Error! Try again';
      response.status = 400;
      response.success = false
      return res.status(400).send(response.response);
    }

  }

  async addAdminPermission(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    try {
      const auths = await AuthModule.findByPk(req.body.auth_module_id)
      const admin = await Admin.findByPk(req.body.admin_id)
      if (!auths || !admin) {
        response.status = 400;
        response.message = 'Something went wrong';
        response.success = true
        return res.status(400).send(response.getResponse())
      }

      const existsPermission = await AdminAuth.findOne({
        where: {
          admin_id: req.body.admin_id,
          auth_module_id: req.body.auth_module_id
        }
      })

      if (existsPermission) {
        response.status = 400;
        response.message = 'Permission Already Applied';
        response.success = true
        return res.status(400).send(response.getResponse())
      }

      await AdminAuth.create({
        admin_id: req.body.admin_id,
        auth_module_id: req.body.auth_module_id
      })

      res.send(response.getResponse())
    } catch (error) {
      console.log(error)
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }

  getAdminProfile = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    try {
      const admin = await Admin.findByPk((req as any).admin.id);
      // Never leak the password hash or the OTP hashes to the client.
      const safe: any = admin ? admin.toJSON() : null;
      if (safe) {
        delete safe.password;
        delete safe.login_otp;
        delete safe.login_otp_expires_at;
        delete safe.reset_otp;
        delete safe.reset_otp_expires_at;
      }
      response.data = safe;
      res.send(response.response);
    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  updateAdminProfile = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    try {
      const admin = await Admin.findByPk((req as any).admin.id);
      if (!admin) {
        response.message = 'Admin not found';
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response);
      }

      const { first_name, last_name, email, phone, otp_email, gender, date_of_birth, image } = req.body;

      if (first_name !== undefined) admin.first_name = first_name;
      if (last_name !== undefined) admin.last_name = last_name;
      if (email !== undefined) admin.email = email;
      if (phone !== undefined) admin.phone = phone;
      if (otp_email !== undefined) admin.otp_email = otp_email;
      if (gender !== undefined) admin.gender = gender;
      if (date_of_birth !== undefined) admin.date_of_birth = date_of_birth;
      if (image !== undefined) admin.image = image;

      await admin.save();

      response.message = 'Profile updated successfully';
      response.data = admin;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  }

  async getAdmins(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    try {
      const limit: any = parseInt(req.query.limit?.toString() || '20')
      const page: any = parseInt(req.query.page?.toString() || '1')

      const admins = await Admin.findAll({
        offset: (page - 1) * limit,
        limit: limit,
      })

      response.data = admins;
      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      return res.status(400).send(response.internalError)
    }
  }

  async deleteAdmin(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const id = (req.params.id as any);
    try {
      await Admin.destroy({
        where: {
          id
        }
      })

      response.message = 'Admin deleted.';
      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      return res.status(400).send(response.internalError)
    }
  }

  async getAdminById(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const id = (req.params.id as any);
    try {

      const admin = await Admin.findOne({
        where: {
          id,
        }
      })

      if (!admin) {
        response.message = 'Admin not found';
        response.success = false;
        response.status = 400;
        return res.status(400).send(response.response)
      }

      response.data = admin;
      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }

  async getAdminAuthById(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    try {
      const adminId = (req.params.id as any)

      if (!adminId) throw new Error('Access Denied')
      const admin = await Admin.findByPk(adminId);

      if (!admin) {
        response.message = 'Admin not found';
        response.success = false;
        response.status = 400;
        return res.status(400).send(response.response)
      }

      const authsFromAdmin = await AdminAuth.findAll({
        where: {
          admin_id: adminId,
        },
        attributes: ['auth_module_id']
      })

      const authsOnlyArray = authsFromAdmin.map(ath => ath.auth_module_id)

      response.data = authsOnlyArray;
      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }

  async updateAdminAuth(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    try {
      const adminId = req.body.admin_id;
      const authIds = req.body.auth_ids;

      await AdminAuth.destroy({
        where: {
          admin_id: adminId,
        }
      })

      if (authIds.length > 0) {
        for (let authId of authIds) {
          await AdminAuth.create({
            auth_module_id: authId,
            admin_id: adminId
          })
        }
      }

      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }


  getWithdrawEarnWallet = async (req: express.Request, res: express.Response) => {

    const response = new responseUtils()
    const query = req.query.q || ''

    const limit: any = parseInt(req.query.limit?.toString() || '20')
    const page: any = parseInt(req.query.page?.toString() || '1')

    const whereQuery = {
      [Op.or]: [
        {
          number: { [Op.like]: `%${query}%` }
        },
        {
          user_id: { [Op.like]: `%${query}%` }
        }
      ]
    };

    try {
      const totalRow = await WithdrawEarnWallet.count({
        where: whereQuery
      })
      const requests = await WithdrawEarnWallet.findAll({
        offset: (page - 1) * limit,
        limit: limit,
        where: whereQuery,
        order: [
          ['created_at', 'DESC'],
        ],
      })
      response.data = { transactions: requests, total: totalRow };
      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      return res.status(400).send(response.internalError)
    }
  }

  async getAllTransaction(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const query = req.query.q || ''
    const transactionIdFilter = req.query.transaction_id

    const limit: any = parseInt(req.query.limit?.toString() || '20')
    const page: any = parseInt(req.query.page?.toString() || '1')

    const whereQuery: any = {
      [Op.or]: [
        {
          number: { [Op.like]: `%${query}%` }
        },
        {
          user_id: { [Op.like]: `%${query}%` }
        }
      ]
    };

    // Narrow further by transaction id when the admin provides one — this
    // wins over the loose `q` search.
    if (transactionIdFilter) {
      whereQuery.id = transactionIdFilter
    }

    try {
      const totalRow = await Transaction.count({
        where: whereQuery
      })
      const transactions = await Transaction.findAll({
        offset: (page - 1) * limit,
        limit: limit,
        include: [
          {
            model: PaymentMethod
          },
          {
            model: Admin,
            attributes: ['first_name', 'last_name']
          }
        ],
        where: whereQuery,
        order: [
          ['created_at', 'DESC'],
        ],
      })
      response.data = { transactions, total: totalRow };
      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }

  getMyTransaction = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    const query = req.query.q || ''

    const limit: any = parseInt(req.query.limit?.toString() || '20')
    const page: any = parseInt(req.query.page?.toString() || '1')

    const whereQuery = {
      admin_id: req.admin.id,
      [Op.or]: [
        {
          number: { [Op.like]: `%${query}%` }
        },
        {
          admin_id: { [Op.like]: `%${query}%` }
        }
      ]
    };

    try {
      const totalRow = await AdminTransaction.count({
        where: whereQuery
      })
      const transactions = await AdminTransaction.findAll({
        offset: (page - 1) * limit,
        limit: limit,
        where: whereQuery,
        include: {
          model: Admin
        },
        order: [
          ['created_at', 'DESC'],
        ],
      })
      response.data = { transactions, total: totalRow };
      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }

  getAllAdminTransaction = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    const query = req.query.q || ''

    const limit: any = parseInt(req.query.limit?.toString() || '20')
    const page: any = parseInt(req.query.page?.toString() || '1')

    const whereQuery = {
      [Op.or]: [
        {
          number: { [Op.like]: `%${query}%` }
        },
        {
          admin_id: { [Op.like]: `%${query}%` }
        }
      ]
    };

    try {
      const totalRow = await AdminTransaction.count({
        where: whereQuery
      })
      const transactions = await AdminTransaction.findAll({
        offset: (page - 1) * limit,
        limit: limit,
        where: whereQuery,
        include: {
          model: Admin
        },
        order: [
          ['created_at', 'DESC'],
        ],
      })
      response.data = { transactions, total: totalRow };
      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }

  getAdminTransactionById = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    const id = (req.params.id as any);

    try {

      const transaction = await AdminTransaction.findByPk(id)

      if (!transaction) {
        response.message = 'Admin Transaction not found'
        return res.status(400).send(response.internalError)
      }

      response.data = transaction;
      res.send(response.response);

    } catch (error) {
      console.log(error)
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }

  async getTransactionById(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const id = (req.params.id as any);

    try {

      const transaction = await Transaction.findByPk(id)

      if (!transaction) {
        response.message = 'Transaction not found'
        return res.status(400).send(response.internalError)
      }

      response.data = transaction;
      res.send(response.response);

    } catch (error) {
      console.log(error)
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }


  adminWalletRequest = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils;
    try {
      const {
        amount,
        number,
      } = req.body;

      let admin_id = req.admin.id

      const admin = await Admin.findByPk(admin_id);

      if(!admin) {
        response.message = 'Admin not found';
        response.success = false;
        return res.status(400).send(response.response)
      }

      if (amount < 0) {
        response.message = 'Please Refresh The Page And Send Again';
        return res.status(400).send(response.response)
      }

      if(admin.wallet < amount) {
        response.message = 'Enter a valid amount';
        response.success = false;
        return res.status(400).send(response.response)
      }

      const checkPendingOrder = await AdminTransaction.count({
        where: {
          admin_id,
          status: 'pending'
        }
      })


      if (checkPendingOrder > 0) {
        response.message = 'You Have Already A Pending Order. Please Completed To Add Another Order';
        return res.status(400).send(response.response)
      }

      const createTransaction = await AdminTransaction.create({
        admin_id,
        amount,
        number,
        status: 'pending'
      })

      admin.wallet = Number(admin.wallet) - Number(amount);
      admin.save();

      response.data = createTransaction;
      return res.send(response.response)

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError);
    }
  }

  updateAdminTransaction = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    try {
      const transactionId = parseInt(req.body.transaction_id);
      var status = req.body.status

      const transaction = await AdminTransaction.findByPk(transactionId);

      if (!transaction) {
        response.message = 'Admin Transaction not found'
        response.status = 400;
        response.success = false
        return res.status(400).send(response.response)
      }

      let admin = await Admin.findByPk(transaction.admin_id);

      if (!admin) {
        response.message = 'Admin Not found'
        response.status = 400;
        response.success = false
        return res.status(400).send(response.response)
      }

      if (status == 'cancel' && transaction.status == 'pending') {
        admin.wallet = Number(admin.wallet) + Number(transaction.amount)
        await admin.save();
      }

      transaction.status = status;
      await transaction.save();

      response.message = 'Transaction updated successfully'

      // await sleep(2000)
      res.send(response.response)
      
    } catch (error) {

      console.log(error);
      res.send(response.internalError);
      
    }

  }


  async updateTransaction(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const transactionId = parseInt(req.body.transaction_id);
    var status = req.body.status
    var old_status = req.body.old_status

    const transaction = await Transaction.findByPk(transactionId);

    if (!transaction) {
      response.message = 'Transaction not found'
      response.status = 400;
      response.success = false
      return res.status(400).send(response.response)
    }

    let user = await User.findByPk(transaction.user_id);

    if (!user) {
      response.message = 'User not found to update transaction'
      response.status = 400;
      response.success = false
      return res.status(400).send(response.response)
    }

    if (status == 'completed' && transaction.purpose == 'addwallet' && transaction.status == 'pending' && old_status != 'completed') {
      const admin = await Admin.findByPk(req.admin.id);
      if(admin) {
        admin.wallet = admin.wallet + transaction.amount;
        await admin.save();
      }
      user.wallet = Number(user.wallet) + Number(transaction.amount)
      await user.save();
    }

    transaction.status = status;
    transaction.action_by = req.admin.id;
    await transaction.save();

    response.message = 'Transaction updated successfully'

    // await sleep(2000)
    res.send(response.response)

  }

  updateAdminTransactionFullRow = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()

    try {

      const id = (req.params.id as any);
      const { amount, status, number } = req.body

      const transaction = await AdminTransaction.findByPk(id);

      if (!transaction) {
        response.message = 'Transaction not found'
        response.status = 400;
        response.success = false
        return res.status(400).send(response.response)
      }

      transaction.amount = Number(amount);
      transaction.number = number;
      if (transaction.status === 'cancel') transaction.status = status;
      await transaction.save()

      res.send(response.response)
      
    } catch (error) {
      console.log(error)
      res.send(response.internalError)
    }

  }

  async updateTransactionFullRow(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    const id = (req.params.id as any);
    const { amount, status, number } = req.body

    const transaction = await Transaction.findByPk(id);

    if (!transaction) {
      response.message = 'Transaction not found'
      response.status = 400;
      response.success = false
      return res.status(400).send(response.response)
    }

    transaction.amount = Number(amount);
    transaction.number = number;
    if (transaction.status === 'cancel') transaction.status = status;
    await transaction.save()

    res.send(response.response)

  }

  async cancelAllTransaction(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    try {
      const totalCount = await Transaction.count({ where: { status: 'pending' } })
      await Transaction.update(
        {
          status: 'cancel'
        },
        {
          where: {
            status: 'pending'
          }
        })

      response.message = 'All pending transaction cancelled successfully';
      response.data = { total: totalCount }
      res.send(response.response)
    } catch (error) {
      console.log(error);
      response.message = 'Internal Error! Try again';
      response.status = 400;
      response.success = false
      return res.status(400).send(response.response);
    }


    response.message = 'Transaction updated successfully'

    // await sleep(2000)
    res.send(response.response)

  }

  checkUsername = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    const username = req.params.username;
    const user = await Admin.findOne({
      where: {
        username,
      },
    });

    if (user) {
      response.message = 'Username already Exist'
      response.data = { status: 'NOT_AVAILABLE' }
    } else {
      response.data = { status: 'AVAILABLE' }
    }

    res.send(response.response)
  }

  updateWithdrawEarnWallet = async (req: express.Request, res: express.Response) => {

    const response = new responseUtils()

    try {

      const requestId = parseInt(req.body.withdraw_earn_wallet_id);
      var status = req.body.status
  

      const wewReq = await WithdrawEarnWallet.findByPk(requestId);

      if (!wewReq) {
        response.message = 'Request not found'
        response.status = 400;
        response.success = false
        return res.status(400).send(response.response)
      }

      

      let user = await User.findByPk(wewReq.user_id);

      if (!user) {
        response.message = 'User not found to update transaction'
        response.status = 400;
        response.success = false
        return res.status(400).send(response.response)
      }

      if(status === 'cancel') {

        let currentAmount = 0;

        const earnWallet = await EarnWallet.findOne({
          where: {
            user_id: user.id,
          },
          order: [
            ['id', 'DESC']
          ],
        })

        if(earnWallet) {
          currentAmount = earnWallet.total_amount;
        }

  
        await EarnWallet.create({
          user_id: user.id,
          amount: wewReq.amount,
          total_amount: currentAmount + wewReq.amount,
          purpose: 'Cancelling withdraw request',
        })
      }

      

      wewReq.status = status;
      await wewReq.save();

      response.message = 'Withdraw Request successfully'

      // await sleep(2000)
      res.send(response.response)
      
    } catch (error) {
      console.log(error)
      res.send(response.internalError) 
    }
  }

  async createNewAdmin(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    try {
      const {
        first_name,
        last_name,
        username,
        gender,
        date_of_birth,
        email,
        phone,
        password
      } = req.body;

      const adminByEmail = await Admin.findOne({
        where: {
          email
        }
      })

      if (adminByEmail) {
        response.message = 'Email Already Exists';
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response)
      }

      const adminByUsername = await Admin.findOne({
        where: {
          username
        }
      })

      if (adminByUsername) {
        response.message = 'Username Already Exists';
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response)
      }

      const admin = new Admin();
      admin.first_name = first_name;
      admin.last_name = last_name;
      admin.username = username;
      admin.email = email;
      admin.password = password;

      if (gender) {
        admin.gender = gender;
      }

      if (phone) {
        admin.phone = phone;
      }

      await admin.save()

      // Every admin gets every permission. Grant all auth modules and all
      // topup packages on creation so a new admin can immediately do
      // everything (mirrors the all-access policy backfilled for existing
      // admins by migration 017). Best-effort: a grant failure logs but never
      // fails the create — the backfill / Manage pages can reconcile later.
      try {
        const [modules, packages] = await Promise.all([
          AuthModule.findAll({ attributes: ['id'] }),
          TopupPackage.findAll({ attributes: ['id'] }),
        ])
        if (modules.length > 0) {
          await AdminAuth.bulkCreate(
            modules.map((m: any) => ({ admin_id: admin.id, auth_module_id: m.id }))
          )
        }
        if (packages.length > 0) {
          await TopupPackagePermission.bulkCreate(
            packages.map((p: any) => ({ admin_id: admin.id, topup_package_id: p.id }))
          )
        }
      } catch (grantErr) {
        console.log('createNewAdmin: granting all permissions failed (non-fatal):', (grantErr as any)?.message || grantErr)
      }

      response.message = 'Admin Created Success'
      res.send(response.response)
    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  async getDashboardStats(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    // Dashboard stats are store-wide for every admin: no per-admin scoping.
    // `filter` is kept empty so the spreads below stay no-ops.
    const filter: any = {};

    try {
      const totalUser = await User.count()

      const TODAY_START = moment().startOf('day').toDate();
      const NOW = moment().endOf('day').toDate();
      const MONTH_START = moment().startOf('month').toDate();

      const todaysOrder = await Order.count({
        where: {
          payment_status: 1,
          created_at: {
            [Op.gte]: TODAY_START,
            [Op.lte]: NOW
          },
          ...filter
        }
      })

      const todaysCompletedOrder = await Order.count({
        where: {
          payment_status: 1,
          status: 'completed',
          created_at: {
            [Op.gte]: TODAY_START,
            [Op.lte]: NOW
          },
          ...filter
        }
      })

      const todaysUser = await User.count({
        where: {
          created_at: {
            [Op.gte]: TODAY_START,
            [Op.lte]: NOW
          }
        }
      })

      const totalWallet = await User.sum('wallet')

      const todaysTotalWallet = await Transaction.sum('amount', {
        where: {
          status: 'completed',
          created_at: {
            [Op.gte]: TODAY_START,
            [Op.lte]: NOW
          }
        }
      })

      const todaysCompletedOrderBPrice = await Order.sum('bprice', {
        where: {
          payment_status: 1,
          status: 'completed',
          created_at: {
            [Op.gte]: TODAY_START,
            [Op.lte]: NOW
          },
          ...filter
        }
      })

      const todaysCompletedOrderAmount = await Order.sum('amount', {
        where: {
          payment_status: 1,
          status: 'completed',
          created_at: {
            [Op.gte]: TODAY_START,
            [Op.lte]: NOW
          },
          ...filter
        }
      })

      const monthlyCompletedOrderBPrice = await Order.sum('bprice', {
        where: {
          payment_status: 1,
          status: 'completed',
          created_at: {
            [Op.gte]: MONTH_START,
            [Op.lte]: NOW
          },
          ...filter
        }
      })

      const monthlyCompletedOrderAmount = await Order.sum('amount', {
        where: {
          payment_status: 1,
          status: 'completed',
          created_at: {
            [Op.gte]: MONTH_START,
            [Op.lte]: NOW
          },
          ...filter
        }
      })

      const totalOrder = await Order.count({
        where: {
          payment_status: 1,
          ...filter
        }
      })

      const totalCompletedOrderAmount = await Order.sum('amount', {
        where: {
          payment_status: 1,
          status: 'completed',
          ...filter
        }
      })

      // Coins earned today across users — `claim` (spin reward) and
      // `purchase` (order-based award) are the positive earn types;
      // `convert`/`refund` are excluded so this reflects coins gained.
      const todaysCoinsEarned = await CoinTransaction.sum('amount', {
        where: {
          type: { [Op.in]: ['claim', 'purchase'] },
          created_at: {
            [Op.gte]: TODAY_START,
            [Op.lte]: NOW
          }
        }
      })

      const todaysConvertedCoins = await CoinTransaction.sum('amount', {
        where: {
          type: 'convert',
          created_at: {
            [Op.gte]: TODAY_START,
            [Op.lte]: NOW
          }
        }
      })

      const monthlyConvertedCoins = await CoinTransaction.sum('amount', {
        where: {
          type: 'convert',
          created_at: {
            [Op.gte]: MONTH_START,
            [Op.lte]: NOW
          }
        }
      })

      const totalCoinsAcrossUsers = await User.sum('coins')

      // Cashback paid out — helpers/orderCashbackSync.ts writes Transaction
      // rows with `purpose = 'Cashback #<order_id>'` for the package money
      // reward and `'Reseller cashback #<order_id>'` for the reseller bonus.
      // Refunds are stored as `'Cashback refund #...'` / `'Reseller cashback
      // refund #...'`, so a LIKE on the non-refund prefixes captures gross
      // paid amounts without manual exclusion clauses.
      const cashbackPurposeWhere = {
        [Op.or]: [
          { purpose: { [Op.like]: 'Cashback #%' } },
          { purpose: { [Op.like]: 'Reseller cashback #%' } },
        ],
      } as const;
      const todaysCashback = await Transaction.sum('amount', {
        where: {
          ...cashbackPurposeWhere,
          status: 'completed',
          created_at: { [Op.gte]: TODAY_START, [Op.lte]: NOW },
        } as any,
      });
      const monthlyCashback = await Transaction.sum('amount', {
        where: {
          ...cashbackPurposeWhere,
          status: 'completed',
          created_at: { [Op.gte]: MONTH_START, [Op.lte]: NOW },
        } as any,
      });

      const settings = await SiteSetting.findOne()
      const rate = settings?.coin_to_money_rate || 0

      const uniAvaiCount = await StoreUnipin.findAll({
        attributes: ["package_id", [sequelize.fn('COUNT', 'id'), 'TotalAvailable']],
        where: {
          status: 1
        },
        group: ["package_id"]
      })

      response.data = {
        totalUser,
        todaysOrder,
        todaysCompletedOrderBPrice: Number(todaysCompletedOrderBPrice || 0),
        todaysCompletedOrderAmount: Number(todaysCompletedOrderAmount || 0),
        todaysProfileAmount: Number((todaysCompletedOrderAmount || 0) - (todaysCompletedOrderBPrice || 0)),
        monthlyCompletedOrderBPrice: Number(monthlyCompletedOrderBPrice || 0),
        monthlyCompletedOrderAmount: Number(monthlyCompletedOrderAmount || 0),
        monthlyProfitAmount: Number((monthlyCompletedOrderAmount || 0) - (monthlyCompletedOrderBPrice || 0)),
        totalOrder,
        totalCompletedOrderAmount: Number(totalCompletedOrderAmount || 0),
        todaysCompletedOrder,
        totalWallet: Number(totalWallet || 0),
        todaysTotalWallet: Number(todaysTotalWallet || 0),
        todaysUser,
        uniPin: uniAvaiCount,
        todaysCoinsEarned: Number(todaysCoinsEarned || 0),
        todaysCoinsEarnedMoney: Number((todaysCoinsEarned || 0) * rate),
        todaysConvertedCoins: Math.abs(Number(todaysConvertedCoins || 0)),
        monthlyConvertedCoins: Math.abs(Number(monthlyConvertedCoins || 0)),
        todaysConvertedMoney: Math.abs(Number((todaysConvertedCoins || 0) * rate)),
        monthlyConvertedMoney: Math.abs(Number((monthlyConvertedCoins || 0) * rate)),
        totalCoinsAcrossUsers: Number(totalCoinsAcrossUsers || 0),
        totalCoinsMoney: Number((totalCoinsAcrossUsers || 0) * rate),
        todaysCashback: Number(todaysCashback || 0),
        monthlyCashback: Number(monthlyCashback || 0),
      }

      res.send(response.getResponse())

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  async changePassword(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const { old_password, new_password, confirm_password } = req.body;
    try {
      const admin = await Admin.findByPk(req.admin.id)

      if (!admin) {
        response.message = 'Admin not found';
        return res.status(400).send(response.internalError)
      }

      if (new_password !== confirm_password) {
        response.message = 'New and confirm password not matched';
        return res.status(400).send(response.internalError)
      }

      const isVerified = await bcrypt.compare(old_password, admin.password);

      if (!isVerified) {
        response.message = 'Password not matched';
        return res.status(400).send(response.internalError)
      }
      admin.password = confirm_password
      await admin.save()

      response.message = 'Password changed'

      // Security: changing the password invalidates every OTHER session, so a
      // stolen session can't outlive a password change. The current device
      // (this request's session) is kept logged in.
      try {
        const currentSessionId = (req as any).adminSession?.id;
        await revokeOtherAdminSessions(admin.id, currentSessionId);
      } catch (e) {
        console.log('revoke other sessions on change-password failed (non-fatal):', (e as any)?.message || e);
      }

      res.send(response.response)

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  // ---- Device / session management -----------------------------------------
  // The security module's "currently logged-in devices" surface. Lists the
  // admin's own active (non-revoked, non-expired) sessions, flags which one is
  // the current device, and lets them revoke a specific device or all others
  // ("log out everywhere else").

  listMySessions = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    try {
      const adminId = (req as any).admin.id;
      const currentToken = readCookie(req, ADMIN_COOKIE_NAME);
      const current = currentToken ? await resolveAdminSession(currentToken) : null;
      const currentId = current?.id ?? (req as any).adminSession?.id ?? null;

      const sessions = await AdminSession.findAll({
        where: { admin_id: adminId, revoked_at: null, expires_at: { [Op.gt]: new Date() } },
        order: [['last_seen_at', 'DESC']],
        attributes: ['id', 'user_agent', 'ip', 'remember', 'last_seen_at', 'expires_at', 'created_at'],
      });

      response.data = sessions.map((s: any) => ({
        id: s.id,
        user_agent: s.user_agent,
        ip: s.ip,
        remember: s.remember,
        last_seen_at: s.last_seen_at,
        expires_at: s.expires_at,
        created_at: s.created_at,
        current: currentId != null && Number(s.id) === Number(currentId),
      }));
      res.send(response.response);
    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  revokeMySession = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    try {
      const adminId = (req as any).admin.id;
      const sessionId = Number(req.params.id);
      // Scope to the caller's own sessions — an admin can never revoke another
      // admin's device here.
      const session = await AdminSession.findOne({
        where: { id: sessionId, admin_id: adminId },
      });
      if (!session) {
        response.message = 'Session not found';
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response);
      }
      await revokeAdminSession(session);
      response.message = 'Device logged out';
      res.send(response.response);
    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  revokeOtherSessions = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    try {
      const adminId = (req as any).admin.id;
      const currentToken = readCookie(req, ADMIN_COOKIE_NAME);
      const current = currentToken ? await resolveAdminSession(currentToken) : null;
      const keepId = current?.id ?? (req as any).adminSession?.id;
      const revoked = await revokeOtherAdminSessions(adminId, keepId);
      response.message = `Logged out ${revoked} other device(s)`;
      response.data = { revoked };
      res.send(response.response);
    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  // ---- Login audit trail ---------------------------------------------------
  // Recent login attempts (success + failure) for the current admin, newest
  // first. Powers the security module's "login history" panel.
  listMyLoginAudit = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    try {
      const adminId = (req as any).admin.id;
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit?.toString() || '50')));
      const rows = await AdminLoginAudit.findAll({
        where: { admin_id: adminId },
        order: [['created_at', 'DESC']],
        limit,
        attributes: ['id', 'success', 'reason', 'ip', 'user_agent', 'created_at'],
      });
      response.data = rows;
      res.send(response.response);
    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  async orderCompletedByAdmin(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    try {
      const data = await sequelize.query(`Select admins.*, (select COUNT(orders.id) from orders where orders.completed_by = admins.id and orders.status = 'completed') as total_order, 
      (select COUNT(orders.id) from orders where orders.completed_by = admins.id and orders.status = 'completed' and DATE_FORMAT(orders.created_at, '%Y-%m-%d') = CURDATE()) as today_order from admins`, {
        type: QueryTypes.SELECT
      })

      response.data = data
      res.send(response.response)

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  async getOrderChartData(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    try {

      const day = (day: number) => {
        return {
          where: {
            payment_status: 1,
            created_at: {
              [Op.gte]: moment().subtract(day, 'days').toDate(),
              [Op.lte]: moment().subtract(day - 1, 'days').toDate()
            }
          }
        }
      }

      const day_1 = await Order.count(day(1)) // return Today order count
      const day_2 = await Order.count(day(2)) // return yesterday order count
      const day_3 = await Order.count(day(3))
      const day_4 = await Order.count(day(4))
      const day_5 = await Order.count(day(5))
      const day_6 = await Order.count(day(6))
      const day_7 = await Order.count(day(7))

      response.data = {
        data: [
          day_7,
          day_6,
          day_5,
          day_4,
          day_3,
          day_2,
          day_1,
        ],
        dates: [
          moment().subtract(6, 'days').format('MM/DD/Y'),
          moment().subtract(5, 'days').format('MM/DD/Y'),
          moment().subtract(4, 'days').format('MM/DD/Y'),
          moment().subtract(3, 'days').format('MM/DD/Y'),
          moment().subtract(2, 'days').format('MM/DD/Y'),
          moment().subtract(1, 'days').format('MM/DD/Y'),
          moment().subtract(0, 'days').format('MM/DD/Y'),
        ]
      }
      res.send(response.response)

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }


  async getUsersForSendSms(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    const limit: any = parseInt(req.query.limit?.toString() || '50')
    const page: any = parseInt(req.query.page?.toString() || '1')

    try {

      const users = await User.findAll({
        where: {
          phone: {
            [Op.ne]: '0'
          },
        },
        offset: (page - 1) * limit,
        limit: limit,
        order: [
          ['id', 'DESC']
        ]
      })

      response.data = users
      res.send(response.response)

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  async sendSmsToUser(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    try {

      const { phones, message } = req.body
      res.end();

      for await (let phone of phones) {
        // const index = phones.indexOf(phone);
        await axios.get(`https://api.sms.net.bd/sendsms?api_key=${process.env.SMS_HASH_TOKEN}&msg=${message}&to=${phone}`).then(res => {
          console.log(res.data);
        }).catch(err => {
          console.log(err);
        })
      }

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  async createUniPinData(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    try {
      const {
        code,
        status,
        package_id
      } = req.body;

      const admin = (req.admin as any);

      const topupPackage = await TopupPackage.findByPk(package_id)

      if (!topupPackage) {
        response.message = 'Package Not Found';
        return res.status(404).send(response.response);
      }

      const code_list = code.split(/\r?\n/);

      for (let val of code_list) {
        await StoreUnipin.create({
          code: val.trim(),
          status: status,
          package_id: package_id,
          uc: topupPackage.uc,
          created_by: admin?.id
        })
      }

      response.message = 'Unipin Voucher Store Success'
      res.send(response.response)
    } catch (error) {
      //response.data = error
      res.status(400).send(response.internalError)
    }
  }

  async fetchUniPinData(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    const filter: any = {};

    const query_user = req.query.user || ''
    const query_status = req.query.status || ''
    const query_package = req.query.package || ''
    const query_voucher = req.query.voucher || ''

    const limit: any = parseInt(req.query.limit?.toString() || '50')
    const page: any = parseInt(req.query.page?.toString() || '1')

    try {

      if (query_user) {
        filter.user_id = query_user
      }

      if (query_package) {
        filter.package_id = query_package
      }

      if (query_status) {
        filter.status = query_status
      }

      if (query_voucher) {
        filter.code = query_voucher
      }

      const voucherCount = await StoreUnipin.count({
        where: {
          ...filter
        }
      })

      const sups = await StoreUnipin.findAll({
        where: {
          ...filter
        },
        offset: (page - 1) * limit,
        limit: limit,
        order: [
          ['id', 'DESC']
        ]
      })

      response.data = {vouchers: sups, voucher_count: voucherCount}
      res.send(response.response)

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  async deleteUniPin(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const id = (req.params.id as any);
    try {
      await StoreUnipin.destroy({
        where: {
          id
        }
      })

      response.message = 'Voucher deleted.';
      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      return res.status(400).send(response.internalError)
    }
  }

  async updateUniPin(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const id = (req.params.id as any);
    try {
      const status = req.body.status;
      const package_id = req.body.package_id;

      const admin = (req.admin as any);

      const topupPackage = await TopupPackage.findByPk(package_id)

      if (!topupPackage) {
        response.message = 'Package Not Found';
        return res.status(404).send(response.response);
      }

      const upin = await StoreUnipin.findByPk(id);
      if (!upin) {
        response.message = 'Voucher not found';
        return res.status(400).send(response.internalError)
      }

      upin.status = status;
      upin.package_id = package_id;
      upin.uc = topupPackage.uc;
      upin.updated_by = admin?.id;
      await upin.save();

      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }

  async fetchUniPin(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const id = (req.params.id as any);
    try {

      const upin = await StoreUnipin.findByPk(id);
      if (!upin) {
        response.message = 'Voucher not found';
        return res.status(400).send(response.internalError)
      }
      response.data = upin;

      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }

  async createBotServer(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    try {
      const {
        name,
        ip_url,
        status
      } = req.body;

      const admin = (req.admin as any);

      const autoBotServer = await AutoServer.findByPk(ip_url)

      if (!autoBotServer) {
        await AutoServer.create({
          name: name,
          ip_url: ip_url,
          status: status,
          created_by: admin?.id
        })
      } else {
        response.message = 'Already Exist This Server';
        return res.status(404).send(response.response);
      }

      response.message = 'Bot Server Store Success'
      res.send(response.response)
    } catch (error) {
      //response.data = error
      res.status(400).send(response.internalError)
    }
  }

  async fetchBotServerData(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    const filter: any = {};

    const query_name = req.query.name || ''
    const query_ip_url = req.query.ip_url || ''
    const query_status = req.query.status || ''

    const limit: any = parseInt(req.query.limit?.toString() || '50')
    const page: any = parseInt(req.query.page?.toString() || '1')

    try {

      if (query_name) {
        filter.name = query_name
      }

      if (query_ip_url) {
        filter.ip_url = query_ip_url
      }

      if (query_status) {
        filter.status = query_status
      }

      const sups = await AutoServer.findAll({
        where: {
          ...filter
        },
        offset: (page - 1) * limit,
        limit: limit,
        order: [
          ['id', 'DESC']
        ]
      })

      response.data = sups
      res.send(response.response)

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  async deleteBotServer(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const id = (req.params.id as any);
    try {
      await AutoServer.destroy({
        where: {
          id
        }
      })

      response.message = 'Bot Server deleted.';
      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      return res.status(400).send(response.internalError)
    }
  }

  async updateBotServer(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const id = (req.params.id as any);
    try {
      const name = req.body.name;
      const ip_url = req.body.ip_url;
      const status = req.body.status;

      const admin = (req.admin as any);

      const bot_server = await AutoServer.findByPk(id)

      if (!bot_server) {
        response.message = 'Bot Server Not Found';
        return res.status(404).send(response.response);
      }

      bot_server.status = status;
      bot_server.ip_url = ip_url;
      bot_server.name = name;
      bot_server.total_order = 0;
      await bot_server.save();

      res.status(200).send(response.response);

    } catch (error) {
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }

  async fetchBotServer(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const id = (req.params.id as any);
    try {

      const bot_server = await AutoServer.findByPk(id);
      if (!bot_server) {
        response.message = 'Bot Server not found';
        return res.status(400).send(response.internalError)
      }
      response.data = bot_server;

      res.status(200).send(response.response);

    } catch (error) {
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }

  async getUCBalanceSheet(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const package_id = req.params.package_id
    try {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const today = currentDate.getDate();
      const firstDayOfMonth = `${year}-${month.toString().padStart(2, '0')}-01`;

      const openingBalance = await StoreUnipin.findAll({
        attributes: [
          'package_id',
          [sequelize.fn('COUNT', sequelize.col('id')), 'opening_balance']
        ],
        where: {
          created_at: { [Op.lt]: `${firstDayOfMonth} 00:00:00` },
          updated_at: { [Op.gt]: sequelize.literal(`TO_SECONDS("${firstDayOfMonth} 00:00:00")`) },
          package_id: package_id
        },
        group: ['package_id']
      });

      if (!openingBalance) {
        response.message = 'NOT FOUND DATA';
        //response.success = false;
        //response.status = 400;
        //return res.status(400).send(response.response)
      }


      const credit_balance = await StoreUnipin.findAll({
        attributes: [
          [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%d-%m-%Y'), 'uc_date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'added']
        ],
        where: {
          [Op.and]: [
            sequelize.where(sequelize.fn('MONTH', sequelize.col('created_at')), month),
            { topuppackage_id: package_id }
          ]
        },
        group: [sequelize.col('uc_date')],
        order: [[sequelize.col('uc_date'), 'ASC']]
      });
      
      if (!credit_balance) {
        response.message = 'NOT FOUND DATA credit_balance';
        //response.success = false;
        //response.status = 400;
        //return res.status(400).send(response.response)
      }

      const debit_balance = await Order.findAll({
        attributes: [
          [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%d-%m-%Y'), 'or_date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'uc_used']
        ],
        where: {
          [Op.and]: [
            sequelize.where(sequelize.fn('MONTH', sequelize.col('created_at')), month),
            { topuppackage_id: package_id }
          ]
        },
        group: [sequelize.col('or_date')],
        order: [[sequelize.col('or_date'), 'ASC']]
      });
      
      if (!credit_balance) {
        response.message = 'NOT FOUND DATA debit_balance';
        //response.success = false;
        //response.status = 400;
        //return res.status(400).send(response.response)
      }

      response.data = {openingBalance, credit_balance, debit_balance};
      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }

  // Replace the dynamic input definitions for a topup product. The admin form
  // posts the full desired list — this destroys old rows and inserts new ones.
  //
  // Rules:
  //  - Title "Player ID" is reserved. At most one input per product may use it.
  //  - When a Player ID input exists, the parent product's isactivefortopup is
  //    forced to 1 (the legacy flag that drove the simple Player-ID-only UX).
  //  - verify_url is only stored when verify_player_name is checked.
  assignProductInputs = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    try {
      const product_id = Number((req.params.id as any))
      const rawInputs: any[] = Array.isArray(req.body.inputs) ? req.body.inputs : []

      const product = await TopupProduct.findByPk(product_id)
      if (!product) {
        response.message = 'TopupProduct not found'
        response.status = 400
        response.success = false
        return res.status(400).send(response.response)
      }

      // Normalize, drop empties (title is required), and tag is_player_id.
      // The Player ID input now picks one of three verify backends via
      // `verify_type`:
      //   'none'      — no name check
      //   'dynamic'   — admin-configured verify_url + {value} placeholder
      //   'gamerspay' — POST to api.gamerspay.app/api/v1/validate with the
      //                 chosen game + the customer-supplied playerid
      // `verify_player_name` is still persisted (legacy readers expect it)
      // and is derived as `verify_type !== 'none'`.
      const cleaned = rawInputs
        .map((it: any, idx: number) => {
          const title = String(it?.title || '').trim()
          if (!title) return null
          const playerIdMatch = isPlayerIdTitle(title)

          // Resolve verify_type. Fall back to legacy boolean if missing
          // (older admin clients still send only verify_player_name).
          let verifyType = String(it?.verify_type || '').trim().toLowerCase()
          if (!['none', 'dynamic', 'gamerspay'].includes(verifyType)) {
            verifyType = it?.verify_player_name ? 'dynamic' : 'none'
          }
          // Only the Player ID input ever runs verification.
          if (!playerIdMatch) verifyType = 'none'

          const verify = verifyType !== 'none' ? 1 : 0
          // Per-type field whitelist — anything not relevant to the chosen
          // type is zeroed so a switch from dynamic→gamerspay (or back)
          // doesn't leave stale config behind.
          const verifyUrl =
            verifyType === 'dynamic' ? String(it?.verify_url || '').trim() : ''
          const verifyGame =
            verifyType === 'gamerspay'
              ? String(it?.verify_game || '').trim().toLowerCase()
              : ''
          const apiToken = verify ? String(it?.api_token || '').trim() : ''
          const regionLock =
            verifyType === 'dynamic'
              ? String(it?.region_lock || '').trim().toUpperCase()
              : ''

          return {
            topup_product_id: product_id,
            title: playerIdMatch ? PLAYER_ID_TITLE : title, // normalize casing
            is_player_id: playerIdMatch ? 1 : 0,
            verify_player_name: verify,
            verify_type: verifyType,
            verify_url: verifyUrl,
            verify_game: verifyGame,
            api_token: apiToken,
            region_lock: regionLock,
            serial: typeof it?.serial === 'number' ? it.serial : idx,
          }
        })
        .filter(Boolean) as any[]

      // Enforce: at most one Player ID input.
      const playerIdCount = cleaned.filter((it) => it.is_player_id === 1).length
      if (playerIdCount > 1) {
        response.message = `Only one input can use the reserved title "${PLAYER_ID_TITLE}"`
        response.status = 400
        response.success = false
        return res.status(400).send(response.response)
      }

      await TopupProductInput.destroy({ where: { topup_product_id: product_id } })
      if (cleaned.length) {
        await TopupProductInput.bulkCreate(cleaned)
      }

      // If the product now has a Player ID input, force isactivefortopup = 1.
      // (We don't auto-unset it when the input is removed — that's a separate
      // explicit choice the admin can make in the product form.)
      if (playerIdCount === 1 && product.isactivefortopup !== 1) {
        product.isactivefortopup = 1
        await product.save()
      }

      response.data = { count: cleaned.length }
      res.send(response.response)
    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  // GET /admin/topup-package/:id/inputs
  // Returns the package-level dynamic input rows (sans api_token, which is
  // never sent client-side). Mirrors how TopupProduct.inputs is exposed.
  getPackageInputs = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    try {
      const package_id = Number((req.params.id as any))
      const inputs = await TopupPackageInput.findAll({
        where: { topup_package_id: package_id },
        order: [['serial', 'ASC']],
        attributes: [
          'id',
          'title',
          'is_player_id',
          'verify_player_name',
          'verify_type',
          'verify_url',
          'verify_game',
          'region_lock',
          'api_token',
          'serial',
        ],
        raw: true,
      })
      response.data = inputs
      res.send(response.response)
    } catch (error) {
      console.log('getPackageInputs error', error)
      res.status(400).send(response.internalError)
    }
  }

  // POST /admin/topup-package/:id/inputs
  // Replace the dynamic input definitions for a single package. Same shape
  // and validation rules as assignProductInputs — the admin form posts the
  // full desired list, this destroys old rows and inserts new ones. Unlike
  // the product flow there's no isactivefortopup side-effect here; the
  // package-level override is gated by `has_custom_inputs` on the package
  // row itself.
  assignPackageInputs = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    try {
      const package_id = Number((req.params.id as any))
      const rawInputs: any[] = Array.isArray(req.body.inputs) ? req.body.inputs : []

      const pack = await TopupPackage.findByPk(package_id)
      if (!pack) {
        response.message = 'TopupPackage not found'
        response.status = 400
        response.success = false
        return res.status(400).send(response.response)
      }

      const cleaned = rawInputs
        .map((it: any, idx: number) => {
          const title = String(it?.title || '').trim()
          if (!title) return null
          const playerIdMatch = isPlayerIdTitle(title)

          let verifyType = String(it?.verify_type || '').trim().toLowerCase()
          if (!['none', 'dynamic', 'gamerspay'].includes(verifyType)) {
            verifyType = it?.verify_player_name ? 'dynamic' : 'none'
          }
          // Only the Player ID input ever runs verification — matches the
          // product-level rule so admins don't get a different mental model
          // between product and package configs.
          if (!playerIdMatch) verifyType = 'none'

          const verify = verifyType !== 'none' ? 1 : 0
          const verifyUrl =
            verifyType === 'dynamic' ? String(it?.verify_url || '').trim() : ''
          const verifyGame =
            verifyType === 'gamerspay'
              ? String(it?.verify_game || '').trim().toLowerCase()
              : ''
          const apiToken = verify ? String(it?.api_token || '').trim() : ''
          const regionLock =
            verifyType === 'dynamic'
              ? String(it?.region_lock || '').trim().toUpperCase()
              : ''

          return {
            topup_package_id: package_id,
            title: playerIdMatch ? PLAYER_ID_TITLE : title,
            is_player_id: playerIdMatch ? 1 : 0,
            verify_player_name: verify,
            verify_type: verifyType,
            verify_url: verifyUrl,
            verify_game: verifyGame,
            api_token: apiToken,
            region_lock: regionLock,
            serial: typeof it?.serial === 'number' ? it.serial : idx,
          }
        })
        .filter(Boolean) as any[]

      const playerIdCount = cleaned.filter((it) => it.is_player_id === 1).length
      if (playerIdCount > 1) {
        response.message = `Only one input can use the reserved title "${PLAYER_ID_TITLE}"`
        response.status = 400
        response.success = false
        return res.status(400).send(response.response)
      }

      await TopupPackageInput.destroy({ where: { topup_package_id: package_id } })
      if (cleaned.length) {
        await TopupPackageInput.bulkCreate(cleaned)
      }

      response.data = { count: cleaned.length }
      res.send(response.response)
    } catch (error) {
      console.log('assignPackageInputs error', error)
      res.status(400).send(response.internalError)
    }
  }

  updateUser = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const id = req.params.id as any;
      const { wallet, coins, password, user_type } = req.body;
      const user = await User.findByPk(id);

      if (!user) {
        response.message = 'User not found';
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response);
      }

      const admin = (req as any).admin;

      // Reseller toggle. Only persists the two recognised values so a
      // malformed payload can't store garbage. Cashback wiring keys off
      // 'reseller' (case-insensitive) so the comparison stays the same.
      //
      // When the verification module is on, promotion to reseller is
      // gated on step 4 being verified — see canPromoteToReseller. The
      // admin UI already greys the checkbox out in that case but we
      // enforce it server-side too so a stale form can't slip through.
      if (typeof user_type === 'string') {
        const next = user_type.toLowerCase() === 'reseller' ? 'reseller' : 'normal';
        if (next === 'reseller' && String((user as any).user_type || '').toLowerCase() !== 'reseller') {
          const allowed = await canPromoteToReseller(Number((user as any).id));
          if (!allowed) {
            response.success = false;
            response.status = 400;
            response.message =
              'Cannot promote: step 4 (Work info) of the user verification is not verified yet.';
            return res.status(400).send(response.response);
          }
        }
        (user as any).user_type = next;
      }

      // Handle wallet update and transaction
      if (wallet !== undefined && Number(wallet) !== Number(user.wallet)) {
        const diff = Number(wallet) - Number(user.wallet);
        await Transaction.create({
          user_id: user.id,
          amount: Math.abs(diff),
          status: 'completed',
          purpose: diff > 0 ? 'Admin Credit' : 'Admin Debit',
          action_by: admin.id,
        });
        user.wallet = Number(wallet);
      }

      // Handle coins update and transaction
      if (coins !== undefined && Number(coins) !== Number(user.coins)) {
        const diff = Number(coins) - Number(user.coins);
        await CoinTransaction.create({
          user_id: user.id,
          amount: Math.abs(diff),
          type: diff > 0 ? 'Admin Credit' : 'Admin Debit',
          note: `Adjusted by Admin: ${admin.username}`,
        });
        user.coins = Number(coins);
      }

      if (password) {
        user.password = password;
      }

      await user.save();

      response.message = 'User updated successfully';
      response.data = user;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  }

  // Aggregate stats for a single user — used by the admin EditUser page to
  // mirror the storefront's Profile cards (Total Added, Spent, Orders…).
  userStats = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    try {
      const id = req.params.id as any
      const user = await User.findByPk(id)
      if (!user) {
        response.message = 'User not found'
        response.status = 400
        response.success = false
        return res.status(400).send(response.response)
      }

      const total_added = await Transaction.sum('amount', {
        where: { user_id: id, status: 'completed' },
      })
      const total_spent = await Order.sum('amount', {
        where: { user_id: id, status: 'completed' },
      })
      const total_order = await Order.count({ where: { user_id: id } })

      response.data = {
        id: user.id,
        wallet: Number(user.wallet) || 0,
        coins: Number(user.coins) || 0,
        total_added: Number(total_added) || 0,
        total_spent: Number(total_spent) || 0,
        total_order: Number(total_order) || 0,
        user_type: String((user as any).user_type || 'normal'),
        cashback_total: Number((user as any).cashback_total) || 0,
      }
      res.send(response.response)
    } catch (error) {
      console.log('userStats error', error)
      res.status(400).send(response.internalError)
    }
  }

  // -------- Order comment templates --------
  // Admins save reusable comment templates with rich text. The Orders edit
  // modal lets the admin pick from the saved list or type a custom note;
  // either way the order's brief_note is set to plain text.

  listOrderComments = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    try {
      const comments = await OrderComment.findAll({
        order: [['id', 'DESC']],
      })
      response.data = comments
      res.send(response.response)
    } catch (error) {
      console.log('listOrderComments error:', error)
      res.status(400).send(response.internalError)
    }
  }

  createOrderComment = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    try {
      const html = String(req.body.html || '').trim()
      const label = String(req.body.label || '').trim()
      const plain_text = htmlToPlain(html)

      if (!plain_text) {
        response.message = 'Comment cannot be empty'
        response.status = 400
        response.success = false
        return res.status(400).send(response.response)
      }

      const created = await OrderComment.create({
        html,
        plain_text,
        // Use the first ~80 chars of plain text as the picker label if the
        // admin didn't supply one.
        label: label || plain_text.slice(0, 80),
      })
      response.data = created
      response.message = 'Comment template saved'
      res.send(response.response)
    } catch (error) {
      console.log('createOrderComment error:', error)
      res.status(400).send(response.internalError)
    }
  }

  updateOrderComment = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    try {
      const id = req.params.id as any
      const comment = await OrderComment.findByPk(id)
      if (!comment) {
        response.message = 'Comment not found'
        response.status = 400
        response.success = false
        return res.status(400).send(response.response)
      }
      const html = String(req.body.html || '').trim()
      const label = String(req.body.label || '').trim()
      const plain_text = htmlToPlain(html)
      if (!plain_text) {
        response.message = 'Comment cannot be empty'
        response.status = 400
        response.success = false
        return res.status(400).send(response.response)
      }
      comment.html = html
      comment.plain_text = plain_text
      comment.label = label || plain_text.slice(0, 80)
      await comment.save()
      response.data = comment
      response.message = 'Comment template updated'
      res.send(response.response)
    } catch (error) {
      console.log('updateOrderComment error:', error)
      res.status(400).send(response.internalError)
    }
  }

  deleteOrderComment = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    try {
      const id = req.params.id as any
      await OrderComment.destroy({ where: { id } })
      response.message = 'Comment template deleted'
      res.send(response.response)
    } catch (error) {
      console.log('deleteOrderComment error:', error)
      res.status(400).send(response.internalError)
    }
  }

}



/******************************************************************************
 *                               Export
 ******************************************************************************/
export default new AdminController();

