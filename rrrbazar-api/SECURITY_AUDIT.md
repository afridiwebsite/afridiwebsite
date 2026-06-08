# Security & Accuracy Audit — rrrbazar-api

**Scope:** `src/routes/user.route.ts`, `src/routes/admin.route.ts`, the shared auth
middleware, and the money/coin/order controllers they call (`user.controller.ts`,
`coin.controller.ts`, `spin.controller.ts`).
**Date:** 2026-06-08
**Status:** Multiple exploitable vulnerabilities found. **Not production-safe as-is.**

Two root causes account for most of the financial findings:

1. **No idempotency** on payment/order callbacks → replays double-credit.
2. **No DB transactions or row locks** on any balance mutation → concurrent
   requests race and create coins/money out of nothing.

Findings are ordered by priority (exploitability × impact). Severity legend:
🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low/accuracy.

---

## 🔴 P0 — Critical: active money / privilege leakage

### P0-1. Payment webhook trusts attacker-controlled amount with a hardcoded shared secret
- **Where:** `uddoktaPay` — `user.controller.ts:2661-2713`; route `user.route.ts:71` (`/webhook`, public).
- **Problem:**
  - The only auth is `metadataObj.token == envToken`, and `envToken` falls back to a
    **hardcoded literal committed in source** (`"18b2ca74b5fe2f63d8293687d94fde987925c98f"`).
  - The credited `amount` and `status` are read **straight from the request body**.
  - There is **no server-side verify-payment call** to UddoktaPay to confirm the
    payment actually happened or its real amount.
- **Exploit:** Anyone who knows the token (anyone with repo access, or if the env var
  is unset) can POST to `/webhook`:
  ```json
  { "status":"completed", "amount":"999999",
    "metadata":{ "id":<victimId>, "token":"18b2…", "paymentmethod":1 } }
  ```
  → arbitrary wallet inflation / full payment bypass.
- **Fix:** Require the gateway's real signature header; call UddoktaPay's verify
  endpoint with `invoice_id` server-side; credit only the **verified** amount, never
  `req.body.amount`. Remove the hardcoded fallback token and fail closed if the env
  var is missing.

### P0-2. Payment webhook has zero idempotency → wallet double/triple-credit
- **Where:** `uddoktaPay` — `user.controller.ts:2701-2723` (wallet credit), `2736` (`Order.create`).
- **Problem:** On `status == "completed"` it does `user.wallet += amount` and
  `admin.wallet += amount` every call, with **no check that this
  `transaction_id`/`invoice_id` was already processed**. The handler returns HTTP 200
  even on its internal error branches, so gateway retries are likely. The
  `metadataObj.order` branch re-runs `Order.create` and re-emits vouchers on each retry.
- **Exploit:** Gateway retry or manual replay credits the wallet and duplicates the
  order/voucher N times from a single payment.
- **Fix:** Unique DB constraint on `transaction_id`/`invoice_id`; look up the existing
  Transaction first and no-op if already terminal. Wrap credit + transaction insert in
  one DB transaction.

### P0-3. Order double-spend via wallet race (no lock)
- **Where:** `topupPackageOrder` — `user.controller.ts:1344-1415`.
- **Problem:** `if (wallet < amount) reject` and `user.wallet -= amount` are separated
  by awaits with no row lock; read-modify-write. Also the deduction clamps to zero
  instead of failing (`1409-1413`): `if (wallet - amount >= 0) … else user.wallet = 0`.
- **Exploit:** Fire N concurrent `/packageorder` requests against a wallet that covers
  one. All pass the balance check, all dispatch, only the last `save()` wins → **N
  products for the price of one**. Under the clamp, a raced user is charged less than
  price but still fulfilled. Stock (`1494-1501`) and offer-item (`1308-1311`)
  decrements race the same way → oversell.
- **Fix:** Wrap in `sequelize.transaction()` with `lock: LOCK.UPDATE` on the user row,
  or use atomic `decrement` with a `WHERE wallet >= amount` guard and verify rows
  affected.

### P0-4. Admin authorization bypass when a route is not in the AuthModule table
- **Where:** `auth.middleware.ts:15-49`.
- **Problem:** Looks up `AuthModule` by URL+method, then checks `AdminAuth` with
  `auth_module_id: authModule?.id`. If the route isn't registered, `authModule` is
  `null`, so the clause becomes `auth_module_id: undefined`. Sequelize **drops
  `undefined` keys**, reducing the query to `{ admin_id }` → it matches the admin's
  first permission row and **grants access**.
- **Exploit:** Any new/unsynced admin route is accessible to any sub-admin regardless
  of their actual permissions. Combined with P0-5 (public `/permission/sync`), the
  permission table is also externally writable.
- **Fix:** If `authModule` is null, **deny**. Never run the `AdminAuth` lookup with an
  undefined module id.

### P0-5. `/permission/sync` is public (unauthenticated write + endpoint enumeration)
- **Where:** `admin.route.ts:247-265` — no `auth` middleware.
- **Problem:** Anyone can hit it to enumerate every endpoint and write rows into
  `AuthModule` via `findOrCreate`.
- **Fix:** Add `auth` (admin-only). Consider making it a CLI/migration task instead of
  an HTTP route.

### P0-6. `/get-uc-balance-sheet/:package_id` is public
- **Where:** `admin.route.ts:50` — no `auth`; controller `admin.controller.ts:2615`.
- **Problem:** The only data route on the admin router with no middleware. Inventory /
  financial balance-sheet data is publicly readable by package id.
- **Fix:** Add `auth`.

### P0-7. `/users-search` is unauthenticated PII dump
- **Where:** `user.route.ts:25` (no `userAuth`); controller `user.controller.ts:300-330`.
- **Problem:** Returns `username [email] [phone]` for matches. With `q=""` the filter
  is `%%`, matching **every user** → full email/phone dump of the user base. (No SQLi —
  Sequelize parameterizes — the issue is exposure.)
- **Fix:** Require auth; enforce a non-empty minimum query length and pagination.

---

## 🟠 P1 — High: race conditions creating coins / money

> Shared cause: no `sequelize.transaction()` / row lock anywhere in these controllers.
> Every balance update is a non-atomic read-modify-write.

### P1-1. Daily coin-claim race → unlimited claims
- **Where:** `coin.controller.ts:100-133`.
- **Problem:** `streakState()` reads `last_coin_claim_at`, checks `canClaim`, then later
  writes it. Concurrent `/coins/claim` calls all read the old timestamp, all pass, all
  credit. No unique guard.
- **Fix:** Lock the user row inside a transaction; or enforce a unique constraint per
  (user, claim-day) on `CoinTransaction`.

### P1-2. Coin convert race → money minted from nothing
- **Where:** `coin.controller.ts:172-194`.
- **Problem:** Balance check and `user.coins -= amount; user.wallet += money` are
  non-atomic. Concurrent converts both pass `< coinAmount` → wallet credited twice for
  the same coins; can also drive coins negative.
- **Fix:** Transaction + locked row, or atomic conditional decrement.

### P1-3. Spin race → free spins, daily-limit bypass, double reward
- **Where:** `spin.controller.ts:133-227`.
- **Problem:** Daily-limit `count()`, cost check, cost deduction, and reward credit are
  separate awaits with no lock. Concurrent spins bypass the daily limit and can deduct
  one cost while two land winning rewards.
- **Fix:** Serialize per user with a locked row inside a transaction.

### P1-4. `/check_order` callback is unauthenticated and force-completes orders
- **Where:** `user.route.ts:72`; controller `user.controller.ts:1610`.
- **Problem:** Completes orders and triggers coin/cashback awards keyed only on
  `orderid` from the body. Anyone can POST `{orderid, status:"success"}` to complete a
  pending order and **trigger the coin/cashback award** with no bot delivery.
- **Fix:** Authenticate the bot callback (shared secret / signature); make the dispatch
  transition idempotent.

---

## 🟠 P1 — High: account / OTP abuse

### P1-5. Password-reset & OTP flow: SMS bombing + brute-forceable OTP
- **Where:** `user.route.ts:42-45,69` → `user.controller.ts:2383-2440`
  (`resetPasswordDirect`); also `/verification/otp/*`, `/verify-otp`.
- **Problem:**
  - No rate limiting → an attacker who knows a victim's email/phone can trigger
    unlimited SMS (cost abuse + harassment).
  - OTP is `Math.floor(random*90000)+10000` → a **5-digit code**, and the verify
    endpoints have no attempt throttling → brute-forceable account takeover / SMS-credit
    drain.
- **Fix:** Per-identity + per-IP rate limits; widen OTP to 6 digits; cap verify
  attempts and expire codes.

---

## 🟡 P2 — Medium

### P2-1. JWT verified *after* it is trusted; no algorithm pinning
- **Where:** `user-auth.middleware.ts:16-32`, `auth.middleware.ts:27-56`.
- **Problem:** Both `jwt.decode()` (no signature check) and use `tokenData` for DB
  lookups + expiry before calling `jwt.verify()` near the end. Verify does run before
  `next()`, so a forged token is ultimately rejected — but the ordering is fragile (one
  early `return` above the verify becomes an auth bypass), and `verify` is called with
  no `algorithms` allowlist.
- **Fix:** `jwt.verify(token, secret, { algorithms: ['HS256'] })` **first**, then read
  claims from the verified payload.

### P2-2. `addWallet` pending-order gate is weak and racy
- **Where:** `user.controller.ts:1960-1971`.
- **Problem:** `count > 5` permits 5 concurrent pending top-ups and is itself
  check-then-act racy.
- **Fix:** Tighten the limit and enforce inside a transaction.

### P2-3. Money stored / computed as floating point
- **Where:** wallet/coin arithmetic throughout `user.controller.ts`, `coin.controller.ts`,
  `spin.controller.ts` (JS `Number` `+`/`-`, `toFixed(2)`).
- **Problem:** Accrues rounding drift even though the Transaction column is
  `DECIMAL(10,2)`.
- **Fix:** Use integer minor units or a decimal library consistently.

### P2-4. `offer_items` / stock decremented before payment on auto_payment path
- **Where:** `user.controller.ts:1308-1311` (offer), pre-`fastPay` return at `1464-1465`.
- **Problem:** For `auto_payment`, `offer_items` is decremented but the order is created
  later (in the webhook). Abandoned payments leak offer/stock counts.
- **Fix:** Decrement only on confirmed payment, inside the order transaction.

---

## ⚪ P3 — Accuracy / correctness (non-security)

### P3-1. `/inventories/cart-products` is unreachable
- **Where:** `user.route.ts:61-63`. `/inventories/:id` is declared first and matches
  `cart-products` as `:id`, so the literal route is dead.
- **Fix:** Declare `/inventories/cart-products` **before** `/inventories/:id`.

### P3-2. Duplicate unipin route block
- **Where:** `admin.route.ts:110-116` vs `126-132` — the five unipin routes are
  registered twice (identical). Second block is dead/confusing.
- **Fix:** Delete the duplicate.

---

## Suggested remediation order

1. **P0-1 / P0-2** — Webhook: signature + server-side verify + idempotency key + credit
   the verified amount. *(Stops the active infinite-money path.)*
2. **P0-4 / P0-5 / P0-6 / P0-7** — Close the open admin/auth holes (deny on null
   AuthModule; add `auth` to `/permission/sync`, `/get-uc-balance-sheet`; auth
   `/users-search`).
3. **P0-3 + P1-1..P1-4** — Wrap every balance mutation (order, addWallet, convert,
   claim, spin, webhook, check_order) in `sequelize.transaction()` with
   `lock: LOCK.UPDATE`, or atomic guarded `decrement`/`increment`. Authenticate
   `/check_order`.
4. **P1-5** — Rate-limit OTP/SMS/reset; 6-digit OTP; cap verify attempts.
5. **P2 / P3** — JWT verify-first, float→decimal, deferred stock decrement, routing
   fixes.
