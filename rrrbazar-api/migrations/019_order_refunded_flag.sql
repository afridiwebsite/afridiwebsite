-- Persisted, atomically-claimed refund guard on orders.
--
-- THE BUG THIS FIXES — multi-dispatch double-refund:
-- Shell-bot (and uc-bot) orders fan out into one BotDispatch row per tag /
-- voucher, and each dispatch produces its own /check_order callback. The
-- old cancel-refund guard read orders.status into memory at the top of each
-- callback and only refunded when that in-memory snapshot wasn't already
-- "cancel". When two callbacks for the same order arrived together, both
-- read the pre-cancel status, both flipped the order to "cancel", and both
-- credited the wallet — so a single charge was refunded N times. Shell
-- orders hit this routinely because they always fan out.
--
-- The `refunded` flag is now the idempotency key: the refund is performed
-- inside a conditional UPDATE (refunded false->true) so only one caller can
-- ever win the claim, regardless of how many concurrent cancel callbacks
-- land. See src/helpers/refundOrder.ts.
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

-- Existing orders default to NOT refunded. Already-cancelled orders from
-- before this migration keep refunded = 0; that's intentional — their
-- refund already happened under the old code, and the flag only gates
-- FUTURE refund attempts (a re-cancel of an already-cancelled order won't
-- re-credit because admin/checkOrder still only refund on the transition
-- INTO cancel).
CALL add_col_if_missing('orders', 'refunded', '`refunded` TINYINT(1) NOT NULL DEFAULT 0');

DROP PROCEDURE add_col_if_missing;
