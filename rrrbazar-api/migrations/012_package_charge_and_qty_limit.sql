-- Per-package quantity charge + upper limit, plus float quantity support.
--
-- Extends the per-package quantity flow (migration 006) with two optional
-- knobs the admin can dial per package:
--
--   * `charge_amount` (DECIMAL): flat charge added on top of unit_price ×
--     quantity. Lets the admin model "service fee" / "platform charge"
--     style add-ons without inflating the unit price on every package
--     card.
--   * `quantity_limit` (DECIMAL): upper bound on the quantity the customer
--     can enter on the storefront. Defaults to 100 — same value as the
--     hard-coded clamp this migration replaces in user.controller.ts.
--
-- Quantity itself moves from INT to DECIMAL(10,2) so packages that bill
-- by fractional units (e.g. "0.5 hours of boosting", "2.5 dollars worth
-- of credit") can persist accurate counts. Refund math, reward-sync,
-- and admin views already round-trip through Number(), so widening the
-- type is invisible to integer-quantity callers.
--
-- We also persist the charge actually applied on each order in
-- `orders.charge_amount` so a later refund / cancel can put the charge
-- back unambiguously even if the package's configured charge changed
-- between order time and refund time.
--
-- Idempotent — re-running is safe.

DROP PROCEDURE IF EXISTS add_col_if_missing;
DELIMITER $$
CREATE PROCEDURE add_col_if_missing(
    IN tbl VARCHAR(64),
    IN col VARCHAR(64),
    IN ddl VARCHAR(255)
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

CALL add_col_if_missing('topuppackages', 'charge_amount', '`charge_amount` DECIMAL(10,2) NOT NULL DEFAULT 0');
CALL add_col_if_missing('topuppackages', 'quantity_limit', '`quantity_limit` DECIMAL(10,2) NOT NULL DEFAULT 100');
CALL add_col_if_missing('orders', 'charge_amount', '`charge_amount` DECIMAL(10,2) NOT NULL DEFAULT 0');

DROP PROCEDURE add_col_if_missing;

-- Widen orders.quantity to DECIMAL(10,2). MODIFY is idempotent when the
-- column already has the target type — MySQL no-ops the change.
ALTER TABLE `orders` MODIFY COLUMN `quantity` DECIMAL(10,2) NOT NULL DEFAULT 1;
