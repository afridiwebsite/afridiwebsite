-- Product-level quantity opt-in. Companion to migration 008.
--
-- Migration 006 introduced `topuppackages.allow_quantity` as a per-package
-- switch (originally voucher-only). Migration 008 generalised that flow to
-- non-voucher products by persisting `orders.quantity` and adding the
-- product-level `quantity_prefix` label. What was still missing: a single
-- glanceable marker on the product itself telling the admin "this product
-- supports quantity input" — without it, the admin has to walk every
-- package to see which (if any) are quantity-enabled.
--
-- This migration adds that marker as `topup_products.allow_quantity`. The
-- storefront treats the two flags as an OR: the stepper renders when
-- EITHER the product or the selected package has the flag on. The
-- per-package flag (migration 006) was originally a voucher-only
-- convention, so AND-ing it with the product flag would have effectively
-- restricted quantity to voucher products — the opposite of what we want.
-- OR lets the admin enable quantity at the product level for whole
-- catalogues, or at the package level for one-off cases.
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

CALL add_col_if_missing('topup_products', 'allow_quantity', '`allow_quantity` TINYINT(1) NOT NULL DEFAULT 0');

DROP PROCEDURE add_col_if_missing;
