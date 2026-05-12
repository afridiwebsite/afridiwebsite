-- One-shot migration for: categories (many-to-many), site_settings, coin system.
-- Safe to run multiple times — uses IF NOT EXISTS / conditional ALTERs.

-- 1) New tables (Sequelize sync({alter:true}) will also create these if the
--    AUTO_MIGRATION_NEW=ON env var is set, but creating them by hand is faster
--    if you don't want to alter the existing big tables).

CREATE TABLE IF NOT EXISTS categories (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) DEFAULT NULL,
    emoji VARCHAR(8) DEFAULT '',
    serial INT DEFAULT 0,
    is_active INT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uniq_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_categories (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    topup_product_id INT NOT NULL,
    category_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_topup_product_id (topup_product_id),
    KEY idx_category_id (category_id),
    UNIQUE KEY uniq_product_category (topup_product_id, category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS site_settings (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    site_name VARCHAR(255) DEFAULT 'TopupMan',
    logo VARCHAR(255) DEFAULT '',
    primary_color VARCHAR(16) DEFAULT '#2563eb',
    secondary_color VARCHAR(16) DEFAULT '#1e40af',
    accent_color VARCHAR(16) DEFAULT '#f59e0b',
    coin_to_money_rate DOUBLE DEFAULT 0.01,
    daily_claim_amount INT DEFAULT 10,
    daily_claim_interval_hours INT DEFAULT 24,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS coin_transactions (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    amount INT NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'earn',
    note VARCHAR(255) DEFAULT '',
    reference_id INT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2) New columns on existing tables. Wrapped in prepared statements so the
--    script doesn't error if the column already exists. Run the whole block
--    once in your MySQL client.

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

CALL add_col_if_missing('topup_products', 'coin_value', '`coin_value` INT DEFAULT 0');
CALL add_col_if_missing('topuppackages',  'coin_value', '`coin_value` INT DEFAULT 0');
CALL add_col_if_missing('users',          'coins',     '`coins` INT DEFAULT 0');
CALL add_col_if_missing('users',          'last_coin_claim_at', '`last_coin_claim_at` DATETIME DEFAULT NULL');

DROP PROCEDURE add_col_if_missing;
