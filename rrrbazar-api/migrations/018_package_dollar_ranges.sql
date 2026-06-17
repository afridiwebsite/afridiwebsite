-- Dollar range pricing system for topup packages.
--
-- Extends the per-package quantity flow (migrations 006 / 012) with a second
-- sale style. A package's quantity behaviour is now selected by
-- `topuppackages.quantity_mode`:
--
--   * 'amount' (default, the legacy "Dollar input system"): the customer
--     enters a quantity and pays unit_price × quantity + charge_amount.
--   * 'range'  (the new "Dollar range system"): the admin defines a set of
--     ranges in `topuppackages.dollar_ranges` (JSON). Each range carries a
--     taka band, a dollar band, and a flat price. On the storefront the
--     customer picks a currency (taka / dollar), enters an amount, and the
--     matching range's flat price OVERRIDES the package price for that order.
--
-- `dollar_ranges` is a JSON array of:
--   { lower_taka, upper_taka, lower_dollar, upper_dollar, price }
-- (all DECIMAL-style numbers, 2dp).
--
-- Order-side, range sales keep `orders.quantity = 1` so every downstream
-- multiplier (coins, cashback, voucher pull, stock) stays single-unit and
-- safe. The money figure the customer entered is recorded separately in
-- `orders.range_amount`, and the chosen currency symbol in
-- `orders.quantity_unit`, so the admin Orders table and the user's order
-- list can show e.g. "$5" / "৳500".
--
-- Idempotent — re-running is safe.

DROP PROCEDURE IF EXISTS add_col_if_missing;
DELIMITER $$
CREATE PROCEDURE add_col_if_missing(
    IN tbl VARCHAR(64),
    IN col VARCHAR(64),
    IN ddl VARCHAR(512)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col
    ) THEN
        SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN ', ddl);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$
DELIMITER ;

CALL add_col_if_missing('topuppackages', 'quantity_mode', "`quantity_mode` VARCHAR(16) NOT NULL DEFAULT 'amount'");
CALL add_col_if_missing('topuppackages', 'dollar_ranges', "`dollar_ranges` TEXT NULL");
CALL add_col_if_missing('orders', 'range_amount', '`range_amount` DECIMAL(10,2) NOT NULL DEFAULT 0');
CALL add_col_if_missing('orders', 'quantity_unit', "`quantity_unit` VARCHAR(8) NOT NULL DEFAULT ''");

DROP PROCEDURE add_col_if_missing;
