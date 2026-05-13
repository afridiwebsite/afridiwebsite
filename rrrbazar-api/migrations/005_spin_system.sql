-- Configurable spin / gacha system.
--
-- Adds:
--   * spin_rewards         — admin-configurable list of wheel segments.
--   * spin_results         — historical record per user spin.
--   * site_settings.spin_cost_coins — coins charged per spin (0 = free).
--   * site_settings.spin_daily_limit — max spins per 24h window (0 = no cap).
--
-- Reward `type` defaults to 'coin'; column kept open-ended so future types
-- (e.g. 'wallet', 'voucher', 'badge') can be added without schema changes.
--
-- Idempotent — re-running is safe.

CREATE TABLE IF NOT EXISTS spin_rewards (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    label VARCHAR(255) NOT NULL,
    type  VARCHAR(64)  NOT NULL DEFAULT 'coin',
    amount INT NOT NULL DEFAULT 0,
    weight INT NOT NULL DEFAULT 1,
    color  VARCHAR(32) DEFAULT NULL,
    icon   VARCHAR(64) DEFAULT NULL,
    is_active TINYINT NOT NULL DEFAULT 1,
    serial INT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_is_active (is_active),
    KEY idx_serial (serial)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS spin_results (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    spin_reward_id INT DEFAULT NULL,
    type   VARCHAR(64) NOT NULL DEFAULT 'coin',
    amount INT NOT NULL DEFAULT 0,
    label  VARCHAR(255) DEFAULT NULL,
    note   VARCHAR(255) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_user_id (user_id),
    KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

CALL add_col_if_missing('site_settings', 'spin_cost_coins',  '`spin_cost_coins` INT DEFAULT 0');
CALL add_col_if_missing('site_settings', 'spin_daily_limit', '`spin_daily_limit` INT DEFAULT 0');

DROP PROCEDURE add_col_if_missing;

-- Seed 8 default rewards so the wheel renders out-of-the-box. Weights are
-- tuned so small wins are common and the jackpot is rare. Only runs on a
-- truly empty table.
INSERT INTO spin_rewards (label, type, amount, weight, color, serial)
SELECT * FROM (
    SELECT '1 Coin'      AS label, 'coin' AS type, 1   AS amount, 35 AS weight, '#f59e0b' AS color, 1 AS serial UNION ALL
    SELECT '3 Coins',     'coin',  3,   25, '#10b981', 2 UNION ALL
    SELECT '5 Coins',     'coin',  5,   18, '#3b82f6', 3 UNION ALL
    SELECT 'Try Again',   'none',  0,   12, '#94a3b8', 4 UNION ALL
    SELECT '10 Coins',    'coin',  10,  10, '#a855f7', 5 UNION ALL
    SELECT '25 Coins',    'coin',  25,  6,  '#06b6d4', 6 UNION ALL
    SELECT '50 Coins',    'coin',  50,  3,  '#ef4444', 7 UNION ALL
    SELECT 'Jackpot 100', 'coin',  100, 1,  '#facc15', 8
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM spin_rewards LIMIT 1);
