# Migrations

Plain SQL files. Apply once per database, in numerical order. All are
re-runnable (idempotent) — `IF NOT EXISTS` / `DROP ... IF EXISTS` guards
mean you can safely run them again.

| File | What it does |
|------|--------------|
| `001_add_categories_coins_settings.sql` | Adds `categories`, `product_categories`, `site_settings`, `coin_transactions` tables, plus `coin_value` / `coins` / `last_coin_claim_at` columns on existing tables. |
| `002_create_mysql_functions.sql` | Creates the `COUNT_VOUCHER(package_id)` stored function used by `/api/v1/topuppackage/:product_id`. Without this, that endpoint returns a MySQL "FUNCTION x does not exist" error. |
| `003_move_coin_value_to_packages.sql` | Backfills `topuppackages.coin_value` from the parent product where the package value is still 0/NULL, then drops `topup_products.coin_value`. Coin rewards are now configured per-package. |
| `004_daily_streak_system.sql` | Adds `users.claim_streak` plus seven `day_N_reward` columns on `site_settings` for the 7-day daily-login bonus. |
| `005_spin_system.sql` | Adds `spin_rewards` and `spin_results` tables, `site_settings.spin_cost_coins` / `spin_daily_limit` columns, and seeds six default wheel rewards. |
| `006_add_allow_quantity.sql` | Adds `topuppackages.allow_quantity` — per-package opt-in for the quantity stepper on /topup/:id (voucher-type products only). |
| `007_widen_brief_note.sql` | Widens `orders.brief_note` from VARCHAR(255) to TEXT. Required after the reward-block HTML started getting appended to brief_note — Bengali cancel copy + the reward block pushed the combined string past 255 bytes, triggering `ER_DATA_TOO_LONG` writes. |
| `008_quantity_and_prefix.sql` | Adds `orders.quantity` (default 1) so refunds/admin views/reward sync have a single source of truth for unit count, and `topup_products.quantity_prefix` so the admin can re-label the storefront quantity stepper (e.g. "Dollars"). Together they extend the existing `allow_quantity` flag to non-voucher products. |
| `009_product_allow_quantity.sql` | Adds `topup_products.allow_quantity` — product-level master switch for the quantity stepper. Storefront ORs it with the per-package flag from 006 so the admin can enable quantity at either level (per-package was originally voucher-only, so AND-ing them would have restricted quantity to vouchers). |
| `010_verification_module.sql` | Phase A of the KYC / user verification module. Adds the master toggle `site_settings.verification_enabled` plus four admin-configurable SMS gateway columns, the `verification_submissions` table (one row per user+step, statuses under_review/verified/rejected), and the `otp_attempts` table (hashed codes, expiry, attempts counter). No UX is exposed yet — the storefront forms, admin review, and order-block enforcement land in later phases. Toggle off ⇒ everything is a no-op. |

## Apply

```powershell
# from topupman-api/
mysql -u <user> -p <database> < migrations/001_add_categories_coins_settings.sql
mysql -u <user> -p <database> < migrations/002_create_mysql_functions.sql
mysql -u <user> -p <database> < migrations/003_move_coin_value_to_packages.sql
mysql -u <user> -p <database> < migrations/006_add_allow_quantity.sql
mysql -u <user> -p <database> < migrations/007_widen_brief_note.sql
```

Or from a GUI (Workbench / DBeaver) — paste the file contents and run.
