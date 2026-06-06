-- KYC / user verification module — Phase A (foundation only).
--
-- This migration only lays the schema + SiteSettings flags needed to gate
-- the rest of the feature behind a master toggle. The actual step forms,
-- review UI, and order-block enforcement land in later phases. Splitting
-- the work this way means you can apply this migration and ship the SMS
-- provider config page without exposing the half-built customer flow.
--
-- What's added:
--   * site_settings.verification_enabled        — master ON/OFF for the
--                                                  whole verification UX.
--                                                  When 0 every gate, tag,
--                                                  and order-block is a
--                                                  no-op regardless of what
--                                                  data already exists in
--                                                  the tables below.
--   * site_settings.sms_provider_url            — admin-configurable SMS
--   * site_settings.sms_provider_api_key          gateway. Defaults seeded
--   * site_settings.sms_provider_sender_id        to the sms.net.bd shape
--   * site_settings.sms_message_template          the user specified.
--
--   * verification_submissions                  — one row per (user, step).
--                                                  Step 1 = phone+personal,
--                                                  2 = NID/passport,
--                                                  3 = face capture,
--                                                  4 = work info.
--                                                  `data` carries the
--                                                  step-specific payload as
--                                                  JSON; `status` rotates
--                                                  through under_review →
--                                                  verified / rejected.
--                                                  Unique on (user_id, step)
--                                                  so resubmits update in
--                                                  place.
--   * otp_attempts                              — phone OTP send/verify log
--                                                  keyed by phone + a hashed
--                                                  code. Expires + attempt
--                                                  counter live alongside so
--                                                  we can rate-limit and
--                                                  auto-expire stale codes
--                                                  without a sweeper.
--
-- Idempotent — re-running is safe (column adds use the same guard helper
-- as migrations 008/009; table creates use IF NOT EXISTS).

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

-- SiteSettings additions ------------------------------------------------
CALL add_col_if_missing('site_settings', 'verification_enabled',  '`verification_enabled` TINYINT(1) NOT NULL DEFAULT 0');
CALL add_col_if_missing('site_settings', 'sms_provider_url',      '`sms_provider_url` VARCHAR(512) NOT NULL DEFAULT ''https://api.sms.net.bd/sendsms''');
CALL add_col_if_missing('site_settings', 'sms_provider_api_key',  '`sms_provider_api_key` VARCHAR(255) NOT NULL DEFAULT ''''');
CALL add_col_if_missing('site_settings', 'sms_provider_sender_id','`sms_provider_sender_id` VARCHAR(64) NOT NULL DEFAULT ''''');
CALL add_col_if_missing('site_settings', 'sms_message_template',  '`sms_message_template` VARCHAR(255) NOT NULL DEFAULT ''Your verification code is {code}. It expires in 5 minutes.''');

DROP PROCEDURE add_col_if_missing;

-- Verification submissions ----------------------------------------------
CREATE TABLE IF NOT EXISTS `verification_submissions` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `user_id` INT NOT NULL,
    -- 1 = phone + personal info (gates ordering when master toggle is on)
    -- 2 = NID or passport
    -- 3 = face verification + picture
    -- 4 = work info (gates the Reseller checkbox in admin)
    `step` TINYINT NOT NULL,
    -- Step-specific payload. Sparse JSON so we don't have to migrate every
    -- time a step adds a new field.
    `data` JSON NULL,
    -- Tri-state. New submissions start at 'under_review'; the admin moves
    -- them to 'verified' or 'rejected'. Rejected rows surface back to the
    -- user with `rejection_reason` so they know what to fix.
    `status` ENUM('under_review','verified','rejected') NOT NULL DEFAULT 'under_review',
    `rejection_reason` TEXT NULL,
    -- Which admin took the last review action, and when. Useful for the
    -- admin audit log later.
    `reviewed_by` INT NULL,
    `reviewed_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    -- Resubmits update in place — only one active row per (user, step).
    UNIQUE KEY `uniq_user_step` (`user_id`, `step`),
    KEY `idx_status` (`status`),
    KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- OTP attempts ----------------------------------------------------------
-- We store the CODE HASH, never the plaintext. Lookup by phone + code at
-- verify time, hash the submitted code, and compare. `attempts` is bumped
-- on every failed compare so we can rate-limit ("too many attempts, request
-- a new code"). `used = 1` makes a code single-use even if it hasn't
-- expired yet.
CREATE TABLE IF NOT EXISTS `otp_attempts` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `user_id` INT NULL,
    `phone` VARCHAR(32) NOT NULL,
    `code_hash` VARCHAR(128) NOT NULL,
    `expires_at` DATETIME NOT NULL,
    `attempts` INT NOT NULL DEFAULT 0,
    `used` TINYINT(1) NOT NULL DEFAULT 0,
    `provider_response` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_phone` (`phone`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
