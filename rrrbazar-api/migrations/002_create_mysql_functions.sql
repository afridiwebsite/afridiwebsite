-- MySQL stored functions referenced by the API.
--
-- Apply with:
--   mysql -u <user> -p <database> < migrations/002_create_mysql_functions.sql
--
-- The DROP IF EXISTS makes this safe to re-run.

DROP FUNCTION IF EXISTS COUNT_VOUCHER;

DELIMITER $$

-- COUNT_VOUCHER(package_id)
-- Returns the number of AVAILABLE (status = 1) UniPin vouchers that could
-- satisfy an order for the given topup package.
--
-- Matching logic mirrors the runtime in user.controller.ts: a voucher is
-- considered available if its `uc` value equals the package's `uc` value AND
-- its status is 1 ("in stock"). Used to expose a "voucher" count next to
-- each package in /api/v1/topuppackage/:product_id.
CREATE FUNCTION COUNT_VOUCHER(pkg_id INT)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE pkg_uc INT;
    DECLARE voucher_count INT;

    SELECT uc INTO pkg_uc
    FROM topuppackages
    WHERE id = pkg_id
    LIMIT 1;

    IF pkg_uc IS NULL THEN
        RETURN 0;
    END IF;

    SELECT COUNT(*) INTO voucher_count
    FROM store_unipin
    WHERE uc = pkg_uc
      AND status = 1;

    RETURN IFNULL(voucher_count, 0);
END $$

DELIMITER ;
