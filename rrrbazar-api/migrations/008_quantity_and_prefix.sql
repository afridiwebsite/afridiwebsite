-- Generalised per-order quantity + admin-configurable quantity prefix.
--
-- Before this migration the quantity stepper on /topup/:id was hard-gated
-- to voucher-pool products. Non-voucher packages (e.g. "1 USD" admin-
-- fulfilled top-ups) had no way to express "buy N of this". We now:
--
--   * persist the unit count on every order (`orders.quantity`, default 1)
--     so refund math, admin views, and reward sync all have a single source
--     of truth instead of inferring from `amount`.
--   * give the admin a per-product label they want shown in front of the
--     quantity stepper on the storefront — e.g. "Dollars", "Hours". When
--     blank, the storefront keeps showing the default "Quantity".
--
-- Idempotent — re-running is safe.
--
-- See also: 006_add_allow_quantity.sql which introduced the per-package
-- opt-in flag this feature now extends to non-voucher products.

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

CALL add_col_if_missing('orders', 'quantity', '`quantity` INT NOT NULL DEFAULT 1');
CALL add_col_if_missing('topup_products', 'quantity_prefix', '`quantity_prefix` VARCHAR(64) NOT NULL DEFAULT ''''');

DROP PROCEDURE add_col_if_missing;
