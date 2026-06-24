/**
 * Concurrency + refund-correctness integration test for the topup order
 * money flow. Runs against the configured MySQL DB (reads the same .env the
 * app uses) — it creates throwaway fixtures, exercises the real code, and
 * cleans up after itself.
 *
 *   npm run test:concurrency
 *
 * Covers the invariants the wallet/stock/offer + refund work is meant to
 * guarantee:
 *
 *   1. Concurrent orders against a wallet that only covers ONE purchase →
 *      exactly one order is created and the wallet never goes negative
 *      (row-locked, atomic deduction in topupPackageOrder).
 *   2. Concurrent stock-tracked orders against 1 unit of stock → exactly
 *      one succeeds (no oversell).
 *   3. Concurrent cancel refunds on one order → the wallet is credited
 *      exactly once (atomic `orders.refunded` claim) — the original
 *      shell-bot multi-callback double-refund bug.
 *   4. Partial-delivery refund → a 3-dispatch order with 2 delivered
 *      refunds only 1/3 of the amount.
 *   5. reverseRefundOnce re-debits exactly once.
 *
 * No external bot calls happen: the test package is configured bot_type
 * 'none' / uc 0 / type '1', so dispatchOrder() short-circuits.
 */

import "dotenv/config";
import { sequelize } from "../models/Schemas";
import Schema from "../models";
import userController from "../controllers/user.controller";
import refundOrderOnce, { reverseRefundOnce } from "../helpers/refundOrder";

const { User, TopupProduct, TopupPackage, Order, BotDispatch } = Schema;

const TAG = "__concurrency_test__";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// Minimal Express res stand-in that records the final status + payload.
function mockRes(): any {
  const r: any = { statusCode: 200, body: null, sent: false };
  r.status = (c: number) => {
    r.statusCode = c;
    return r;
  };
  r.send = (b: any) => {
    r.body = b;
    r.sent = true;
    return r;
  };
  return r;
}

async function callOrder(userId: number, body: any) {
  const req: any = { user: { id: userId }, body };
  const res = mockRes();
  await userController.topupPackageOrder(req, res);
  return res;
}

async function makeProduct(overrides: any = {}) {
  return TopupProduct.create({
    name: `${TAG} product`,
    is_active: 1,
    is_offer: 0,
    is_voucher: 0,
    offer_items: 0,
    ...overrides,
  } as any);
}

async function makePackage(productId: number, overrides: any = {}) {
  return TopupPackage.create({
    product_id: productId,
    name: `${TAG} package`,
    type: "1",
    uc: 0,
    price: "100",
    bprice: "0",
    bot_type: "none",
    auto_delivery: 0,
    is_shell: 0,
    allow_quantity: 0,
    stock_tracking: 0,
    order_once: 0,
    ...overrides,
  } as any);
}

async function makeUser(wallet: number) {
  return User.create({
    email: `${TAG}_${Date.now()}_${Math.random().toString(36).slice(2)}@test.local`,
    username: `${TAG}_user`,
    wallet,
    user_type: "user",
  } as any);
}

async function cleanup() {
  // Order rows reference user/product; delete orders + dispatches first.
  const products = (await TopupProduct.findAll({
    where: { name: `${TAG} product` },
    attributes: ["id"],
  })) as any[];
  const productIds = products.map((p) => p.id);

  const orders = (await Order.findAll({
    where: productIds.length ? { product_id: productIds } : { id: -1 },
    attributes: ["id"],
  })) as any[];
  const orderIds = orders.map((o) => o.id);
  if (orderIds.length) {
    await BotDispatch.destroy({ where: { order_id: orderIds } });
    await Order.destroy({ where: { id: orderIds } });
  }
  if (productIds.length) {
    await TopupPackage.destroy({ where: { product_id: productIds } });
    await TopupProduct.destroy({ where: { id: productIds } });
  }
  await User.destroy({ where: { username: `${TAG}_user` } });
}

/* -------------------------------------------------------------------------- */

async function testWalletDoubleSpend() {
  console.log("\n[1] Concurrent orders vs single-purchase wallet");
  const product = await makeProduct();
  const pkg = await makePackage((product as any).id);
  const user = await makeUser(100); // exactly one order's worth

  const N = 6;
  await Promise.all(
    Array.from({ length: N }, () =>
      callOrder((user as any).id, {
        topuppackage_id: (pkg as any).id,
        product_id: (product as any).id,
        payment_mathod: "pay",
        playerid: "100200300",
        phone: "017",
      }).catch((e) => {
        console.error("   order threw:", e?.message || e);
      }),
    ),
  );

  const fresh: any = await User.findByPk((user as any).id);
  const orderCount = await Order.count({
    where: { user_id: (user as any).id },
  });
  check("exactly 1 order created", orderCount === 1, `got ${orderCount}`);
  check(
    "wallet drained to exactly 0 (no double-spend, no negative)",
    Number(fresh.wallet) === 0,
    `wallet=${fresh.wallet}`,
  );
}

async function testStockOversell() {
  console.log("\n[2] Concurrent orders vs single stock unit");
  const product = await makeProduct();
  const pkg = await makePackage((product as any).id, {
    stock_tracking: 1,
    stock_quantity: 1,
  });
  // Plenty of wallet so stock — not money — is the limiting factor.
  const user = await makeUser(100000);

  const N = 6;
  await Promise.all(
    Array.from({ length: N }, () =>
      callOrder((user as any).id, {
        topuppackage_id: (pkg as any).id,
        product_id: (product as any).id,
        payment_mathod: "pay",
        playerid: "100200300",
        phone: "017",
      }).catch(() => {}),
    ),
  );

  const orderCount = await Order.count({
    where: { user_id: (user as any).id },
  });
  const freshPkg: any = await TopupPackage.findByPk((pkg as any).id);
  check("exactly 1 order created (no oversell)", orderCount === 1, `got ${orderCount}`);
  check(
    "stock decremented to exactly 0",
    Number(freshPkg.stock_quantity) === 0,
    `stock=${freshPkg.stock_quantity}`,
  );
}

async function testConcurrentRefundIdempotent() {
  console.log("\n[3] Concurrent cancel refunds credit the wallet once");
  const product = await makeProduct();
  const user = await makeUser(0);
  const order: any = await Order.create({
    product_id: (product as any).id,
    user_id: (user as any).id,
    amount: 250,
    bprice: "0",
    status: "cancel",
    refunded: false,
    quantity: 1,
  } as any);

  const N = 8;
  const results = await Promise.all(
    Array.from({ length: N }, () => refundOrderOnce(order.id)),
  );
  const wins = results.filter(Boolean).length;
  const fresh: any = await User.findByPk((user as any).id);
  check("exactly one refund call performed the credit", wins === 1, `wins=${wins}`);
  check(
    "wallet credited exactly once (250)",
    Number(fresh.wallet) === 250,
    `wallet=${fresh.wallet}`,
  );
}

async function testPartialRefund() {
  console.log("\n[4] Partial-delivery refund (2 of 3 delivered → 1/3 back)");
  const product = await makeProduct();
  const user = await makeUser(0);
  const order: any = await Order.create({
    product_id: (product as any).id,
    user_id: (user as any).id,
    amount: 300,
    bprice: "0",
    status: "cancel",
    refunded: false,
    quantity: 1,
  } as any);
  await BotDispatch.bulkCreate([
    { order_id: order.id, status: "success", bot_type: "shell-bot", attempt_count: 1 },
    { order_id: order.id, status: "success", bot_type: "shell-bot", attempt_count: 1 },
    { order_id: order.id, status: "cancelled", bot_type: "shell-bot", attempt_count: 1 },
  ] as any);

  const did = await refundOrderOnce(order.id);
  const fresh: any = await User.findByPk((user as any).id);
  check("refund performed", did === true);
  check(
    "refunded only the undelivered third (100 of 300)",
    Number(fresh.wallet) === 100,
    `wallet=${fresh.wallet}`,
  );
}

async function testReverseRefundIdempotent() {
  console.log("\n[5] reverseRefundOnce re-debits once");
  const product = await makeProduct();
  const user = await makeUser(500);
  const order: any = await Order.create({
    product_id: (product as any).id,
    user_id: (user as any).id,
    amount: 200,
    bprice: "0",
    status: "completed",
    refunded: true, // pretend a prior cancel refunded it
    quantity: 1,
  } as any);

  const results = await Promise.all([
    reverseRefundOnce(order.id),
    reverseRefundOnce(order.id),
    reverseRefundOnce(order.id),
  ]);
  const wins = results.filter(Boolean).length;
  const fresh: any = await User.findByPk((user as any).id);
  check("exactly one re-debit performed", wins === 1, `wins=${wins}`);
  check(
    "wallet debited exactly once (500 - 200 = 300)",
    Number(fresh.wallet) === 300,
    `wallet=${fresh.wallet}`,
  );
}

async function main() {
  try {
    await sequelize.authenticate();
  } catch (e: any) {
    console.error(
      "Could not connect to the DB. Check your .env (DB_HOST/DB_NAME/DB_USER/DB_PASSWORD).",
      e?.message || e,
    );
    process.exit(2);
  }

  // Ensure the refund guard column exists (idempotent — no-op if migration
  // 019 already ran). Wrapped so a duplicate-column error is ignored.
  await sequelize
    .query(
      "ALTER TABLE `orders` ADD COLUMN `refunded` TINYINT(1) NOT NULL DEFAULT 0",
    )
    .catch(() => {});

  // Start from a clean slate in case a prior run aborted mid-way.
  await cleanup();

  try {
    await testWalletDoubleSpend();
    await testStockOversell();
    await testConcurrentRefundIdempotent();
    await testPartialRefund();
    await testReverseRefundIdempotent();
  } finally {
    await cleanup();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  // Hard-exit instead of sequelize.close(): with AUTO_MIGRATION=ON every
  // model import fires a background Model.sync({ alter:true }); closing the
  // pool mid-sync throws. We're done, so just terminate.
  process.exit(failed === 0 ? 0 : 1);
}

// A late background sync (AUTO_MIGRATION) can reject after the tests finish;
// it's not a test failure, so don't let it crash the run.
process.on("unhandledRejection", (e: any) => {
  console.warn("(ignored late rejection)", e?.message || e);
});

main();
