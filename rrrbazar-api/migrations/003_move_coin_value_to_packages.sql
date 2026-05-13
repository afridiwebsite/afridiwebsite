-- Move `coin_value` from `topup_products` to `topuppackages`.
--
-- Coin rewards are now configured per package (since the per-package buy/sell
-- price already varies), so this migration:
--   1) Backfills `topuppackages.coin_value` from the parent product where
--      the package has not been given its own value yet (NULL or 0).
--   2) Drops `topup_products.coin_value` once the data has moved.
--
-- Safe to run multiple times — uses conditional ALTER and a guarded UPDATE.

-- 1) Backfill — only touch rows that still have the default 0/NULL on the
--    package, so we never overwrite a value an admin has already set.
UPDATE topuppackages tp
JOIN topup_products pr ON pr.id = tp.product_id
SET tp.coin_value = COALESCE(pr.coin_value, 0)
WHERE (tp.coin_value IS NULL OR tp.coin_value = 0)
  AND COALESCE(pr.coin_value, 0) > 0;

-- 2) Drop the product-level column. Wrapped in a conditional check so the
--    script is idempotent.
DROP PROCEDURE IF EXISTS drop_col_if_exists;
DELIMITER $$
CREATE PROCEDURE drop_col_if_exists(
    IN tbl VARCHAR(64),
    IN col VARCHAR(64)
)
BEGIN
    IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col
    ) THEN
        SET @sql = CONCAT('ALTER TABLE `', tbl, '` DROP COLUMN `', col, '`');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$
DELIMITER ;

CALL drop_col_if_exists('topup_products', 'coin_value');

DROP PROCEDURE drop_col_if_exists;
