-- SMS gateway account username.
--
-- The verification module migrated from sms.net.bd (form-POST, api_key only)
-- to MiMSMS-style JSON gateways, which authenticate the account with a
-- username/login *in addition* to the API key. This column makes that
-- username admin-configurable on the SMS provider settings page instead of
-- being hard-coded in helpers/smsProvider.ts.
--
-- Nullable-default '' so existing rows keep working until an admin fills it.
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

CALL add_col_if_missing('site_settings', 'sms_provider_username', "`sms_provider_username` VARCHAR(128) NOT NULL DEFAULT ''");

DROP PROCEDURE add_col_if_missing;
