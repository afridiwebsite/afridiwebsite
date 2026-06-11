-- Grant every admin every permission (all-access policy).
--
-- The admin permission model (auth_module + admin_auth route grants, and
-- topup_package_permissions for order/package access) was previously managed
-- per-admin. We now want every admin to have every permission: new admins are
-- granted everything at creation time (admin.controller.createNewAdmin), and
-- this migration backfills the same for all existing admins.
--
-- Idempotent — only inserts the (admin, permission) pairs that are missing, so
-- re-running is safe and won't create duplicates.

-- 1) Route/auth-module permissions: one admin_auth row per (admin, module).
INSERT INTO `admin_auth` (`admin_id`, `auth_module_id`, `created_at`, `updated_at`)
SELECT a.`id`, m.`id`, NOW(), NOW()
FROM `admins` a
CROSS JOIN `auth_module` m
WHERE NOT EXISTS (
    SELECT 1 FROM `admin_auth` aa
    WHERE aa.`admin_id` = a.`id` AND aa.`auth_module_id` = m.`id`
);

-- 2) Order/package permissions: one topup_package_permissions row per
--    (admin, package).
INSERT INTO `topup_package_permissions` (`admin_id`, `topup_package_id`, `created_at`, `updated_at`)
SELECT a.`id`, p.`id`, NOW(), NOW()
FROM `admins` a
CROSS JOIN `topuppackages` p
WHERE NOT EXISTS (
    SELECT 1 FROM `topup_package_permissions` tp
    WHERE tp.`admin_id` = a.`id` AND tp.`topup_package_id` = p.`id`
);
