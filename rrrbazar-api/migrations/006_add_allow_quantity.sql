-- Per-package opt-in for the quantity stepper on /topup/:id.
--
-- A product being voucher-type (topup_products.is_voucher = 1) used to be
-- enough to surface the quantity input. We now want admin-level control of
-- which packages actually allow bulk buying — defaulting OFF so existing
-- packages behave the same until an admin flips it on.
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

CALL add_col_if_missing('topuppackages', 'allow_quantity', '`allow_quantity` TINYINT(1) DEFAULT 0');

DROP PROCEDURE add_col_if_missing;
