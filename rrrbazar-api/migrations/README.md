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

## Apply

```powershell
# from topupman-api/
mysql -u <user> -p <database> < migrations/001_add_categories_coins_settings.sql
mysql -u <user> -p <database> < migrations/002_create_mysql_functions.sql
mysql -u <user> -p <database> < migrations/003_move_coin_value_to_packages.sql
```

Or from a GUI (Workbench / DBeaver) — paste the file contents and run.
