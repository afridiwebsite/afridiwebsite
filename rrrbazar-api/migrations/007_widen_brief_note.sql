-- Widen `orders.brief_note` from VARCHAR(255) to TEXT.
--
-- The reward-summary block built in helpers/orderRewardNote.ts is HTML
-- (with inline styles and emoji glyphs) and gets *appended* to whatever
-- brief_note already carries — "UniPin: <code>", "Voucher: <code>",
-- the like-bot summary, or the admin's typed status note. With Bengali
-- copy from the cancel paths plus the reward block on top, the combined
-- string easily exceeds 255 bytes and MySQL rejects the write with:
--
--   ER_DATA_TOO_LONG: Data too long for column 'brief_note' at row 1
--
-- TEXT matches the column shape already used for the larger HTML fields
-- on the same row (`details`, `payment_data`, `securitycode`).
--
-- Idempotent — re-running the conversion against an already-TEXT column
-- is a no-op (MySQL just re-issues the same type).

ALTER TABLE `orders`
    MODIFY COLUMN `brief_note` TEXT NULL;
