-- Admin OTP email — recipient for login step-up + password-reset codes.
--
-- The security module originally delivered admin OTPs over SMS (to
-- admins.phone). We now deliver them by email instead, to a dedicated
-- `otp_email` address the admin sets on their profile (kept separate from
-- the account `email` so the login identity and the code destination can
-- differ). Nullable so existing admins are unaffected until they set it.
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

CALL add_col_if_missing('admins', 'otp_email', "`otp_email` VARCHAR(255) NULL DEFAULT NULL");

DROP PROCEDURE add_col_if_missing;
