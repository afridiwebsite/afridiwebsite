-- Daily login streak system.
--
-- Adds:
--   * users.claim_streak — last claimed day in the rolling 7-day cycle (0–7).
--     0 = user has never claimed, 1–7 = which day of the streak.
--   * site_settings.day_1_reward .. day_7_reward — coin amounts per streak day,
--     configurable from the admin Site Settings page.
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

CALL add_col_if_missing('users',         'claim_streak',  '`claim_streak` INT DEFAULT 0');
CALL add_col_if_missing('site_settings', 'day_1_reward',  '`day_1_reward` INT DEFAULT 2');
CALL add_col_if_missing('site_settings', 'day_2_reward',  '`day_2_reward` INT DEFAULT 4');
CALL add_col_if_missing('site_settings', 'day_3_reward',  '`day_3_reward` INT DEFAULT 6');
CALL add_col_if_missing('site_settings', 'day_4_reward',  '`day_4_reward` INT DEFAULT 8');
CALL add_col_if_missing('site_settings', 'day_5_reward',  '`day_5_reward` INT DEFAULT 10');
CALL add_col_if_missing('site_settings', 'day_6_reward',  '`day_6_reward` INT DEFAULT 12');
CALL add_col_if_missing('site_settings', 'day_7_reward',  '`day_7_reward` INT DEFAULT 14');

DROP PROCEDURE add_col_if_missing;
