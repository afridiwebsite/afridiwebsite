-- Advanced admin security module — Phase 1 schema.
--
-- Backbone for moving admin auth off stateless localStorage JWTs onto
-- server-side, revocable sessions, plus the audit + OTP scaffolding the
-- later phases build on:
--
--   * admin_sessions      — one row per logged-in device. The session token
--                           is delivered to the browser in a Secure httpOnly
--                           cookie; only its SHA-256 hash is stored here so a
--                           DB leak can't be replayed. Enables device listing,
--                           remote logout, and hard revocation.
--   * admin_login_audits  — append-only log of every login attempt (success
--                           or failure) with IP + user agent, for the audit
--                           trail surface.
--   * admins.login_otp / reset_otp (+ *_expires_at) — short-lived SMS OTP
--                           codes for login step-up and password reset
--                           (Phase 2). Stored hashed, never in plaintext.
--
-- Idempotent — re-running is safe.

CREATE TABLE IF NOT EXISTS `admin_sessions` (
    `id`            BIGINT NOT NULL AUTO_INCREMENT,
    `admin_id`      INT NOT NULL,
    -- SHA-256 of the raw session token. Unique so a token maps to one row.
    `token_hash`    CHAR(64) NOT NULL,
    `user_agent`    VARCHAR(512) NULL DEFAULT '',
    `ip`            VARCHAR(64) NULL DEFAULT '',
    -- 1 = "remember me" (long-lived); 0 = session-length.
    `remember`      TINYINT NOT NULL DEFAULT 0,
    `last_seen_at`  DATETIME NULL,
    `expires_at`    DATETIME NOT NULL,
    -- Non-null once the session is revoked (logout / "log out other devices"
    -- / forced). A revoked or expired row is treated as logged-out.
    `revoked_at`    DATETIME NULL DEFAULT NULL,
    `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_admin_sessions_token` (`token_hash`),
    KEY `idx_admin_sessions_admin` (`admin_id`),
    KEY `idx_admin_sessions_expiry` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `admin_login_audits` (
    `id`          BIGINT NOT NULL AUTO_INCREMENT,
    -- Nullable: a failed attempt with an unknown identity has no admin_id.
    `admin_id`    INT NULL DEFAULT NULL,
    -- The identity (email) the attempt was made against, even on failure.
    `identity`    VARCHAR(255) NULL DEFAULT '',
    `success`     TINYINT NOT NULL DEFAULT 0,
    -- Short machine-ish reason: 'password' | 'success' | 'otp_sent' |
    -- 'otp_failed' | 'no_user' | 'locked' etc.
    `reason`      VARCHAR(64) NULL DEFAULT '',
    `ip`          VARCHAR(64) NULL DEFAULT '',
    `user_agent`  VARCHAR(512) NULL DEFAULT '',
    `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_admin_login_audits_admin` (`admin_id`),
    KEY `idx_admin_login_audits_created` (`created_at`)
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

-- SMS OTP scaffolding (Phase 2). Hashed codes + expiry; nullable so existing
-- admins are unaffected until they use the flow.
CALL add_col_if_missing('admins', 'login_otp',            "`login_otp` VARCHAR(255) NULL DEFAULT NULL");
CALL add_col_if_missing('admins', 'login_otp_expires_at', "`login_otp_expires_at` DATETIME NULL DEFAULT NULL");
CALL add_col_if_missing('admins', 'reset_otp',            "`reset_otp` VARCHAR(255) NULL DEFAULT NULL");
CALL add_col_if_missing('admins', 'reset_otp_expires_at', "`reset_otp_expires_at` DATETIME NULL DEFAULT NULL");

DROP PROCEDURE add_col_if_missing;
