-- Per-package "seller" label.
--
-- Adds a free-text `seller` field to topup packages. It is admin-only
-- metadata: set on the package (next to Buy price) and surfaced nowhere on
-- the storefront — its sole read site is the admin Orders → View modal,
-- shown beside the "Order #id" title so an admin can see which seller an
-- order's package belongs to.
--
-- Nullable with an empty-string default so existing packages keep working.
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

CALL add_col_if_missing('topuppackages', 'seller', "`seller` VARCHAR(255) NULL DEFAULT ''");

DROP PROCEDURE add_col_if_missing;
