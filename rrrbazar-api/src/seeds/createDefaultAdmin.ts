/**
 * Seed: create a default admin with every permission.
 *
 * Run:
 *   npm run seed                                  # uses defaults below
 *   SEED_ADMIN_EMAIL=root@x.com \
 *     SEED_ADMIN_PASSWORD=changeme \
 *     SEED_ADMIN_USERNAME=root \
 *     npm run seed
 *
 * Idempotent: re-running upserts the admin password and refreshes the
 * full permission grant. Safe to run on a populated DB.
 */
require('dotenv').config();

import adminRouter from '../routes/admin.route';
import Schema, { } from '../models';
import { sequelize } from '../models/Schemas';

const DEFAULTS = {
    email: process.env.SEED_ADMIN_EMAIL || 'admin@local.test',
    username: process.env.SEED_ADMIN_USERNAME || 'admin',
    password: process.env.SEED_ADMIN_PASSWORD || 'admin1234',
    first_name: process.env.SEED_ADMIN_FIRST_NAME || 'Super',
    last_name: process.env.SEED_ADMIN_LAST_NAME || 'Admin',
};

const { Admin, AuthModule, AdminAuth, SpinReward } = Schema;

// Eight default spin wheel segments seeded on first run. Weights are tuned
// so small wins are common and the jackpot is rare. Only inserted when the
// table is empty so an admin's manual edits never get overwritten.
const DEFAULT_SPIN_REWARDS: Array<{
    label: string;
    type: string;
    amount: number;
    weight: number;
    color: string;
    serial: number;
    try_again_count?: number;
}> = [
    { label: '1 Coin',      type: 'coin',       amount: 1,   weight: 35, color: '#f59e0b', serial: 1 },
    { label: '3 Coins',     type: 'coin',       amount: 3,   weight: 25, color: '#10b981', serial: 2 },
    { label: '5 Coins',     type: 'coin',       amount: 5,   weight: 18, color: '#3b82f6', serial: 3 },
    // Try Again refunds the spin and grants `try_again_count` bonus free
    // spins. Default is 1 — admins can crank it via the spin-rewards UI.
    { label: 'Try Again',   type: 'try_again',  amount: 0,   weight: 12, color: '#94a3b8', serial: 4, try_again_count: 1 },
    { label: '10 Coins',    type: 'coin',       amount: 10,  weight: 10, color: '#a855f7', serial: 5 },
    { label: '25 Coins',    type: 'coin',       amount: 25,  weight: 6,  color: '#06b6d4', serial: 6 },
    { label: '50 Coins',    type: 'coin',       amount: 50,  weight: 3,  color: '#ef4444', serial: 7 },
    { label: 'Jackpot 100', type: 'coin',       amount: 100, weight: 1,  color: '#facc15', serial: 8 },
];

// Endpoints we always want present as `auth_module` rows, regardless of
// whether the live router introspection picks them up. Useful when a new
// feature ships and the seed needs to backfill permissions for existing
// installs without a server restart between deploy and seed.
const ENSURED_ENDPOINTS: Array<{ path: string; method: string }> = [
    // Spin wheel admin CRUD
    { path: '/spin-rewards',            method: 'GET'  },
    { path: '/spin-rewards/create',     method: 'POST' },
    { path: '/spin-rewards/update/:id', method: 'POST' },
    { path: '/spin-rewards/delete/:id', method: 'POST' },
    // Site settings (needed to save spin cost / daily limit / day rewards
    // and the new support_email / telegram_number / youtube_link fields)
    { path: '/site-settings',        method: 'GET'  },
    { path: '/site-settings/update', method: 'POST' },
    // Admin profile
    { path: '/profile',              method: 'GET'  },
    { path: '/profile/update',       method: 'POST' },
    // Topup product dynamic inputs (admin defines the order form per product)
    { path: '/topup-product/:id/inputs',     method: 'POST' },
    { path: '/topup-product/:id/categories', method: 'POST' },
    // Category CRUD
    { path: '/categories',          method: 'GET'  },
    { path: '/category/:id',        method: 'GET'  },
    { path: '/category/create',     method: 'POST' },
    { path: '/category/update/:id', method: 'POST' },
    { path: '/category/delete/:id', method: 'POST' },
    // Saved order-comment templates (used by the Orders edit modal)
    { path: '/order-comments',             method: 'GET'  },
    { path: '/order-comments',             method: 'POST' },
    { path: '/order-comments/:id',         method: 'POST' },
    { path: '/order-comments/:id/delete',  method: 'POST' },
    // Voucher pool (per-package redemption codes for is_voucher products)
    { path: '/packages/:id/voucher',       method: 'GET'  },
    { path: '/packages/add-voucher',       method: 'POST' },
    { path: '/packages/delete-voucher/:id', method: 'POST' },
    { path: '/packages/bulk-delete-voucher', method: 'POST' },
    { path: '/voucher/auto-distribute',              method: 'POST' },
    { path: '/voucher/available-voucher-by-package', method: 'GET' },
    { path: '/voucher-products-with-packages',       method: 'GET' },
    { path: '/topup-package/:id/voucher-maps',       method: 'GET' },
    { path: '/topup-package/:id/voucher-maps',       method: 'POST' },
    // Per-user aggregate stats — drives the EditUser admin page.
    { path: '/user/:id/stats',                        method: 'GET'  },
    // Tutorial CRUD (admin) — surfaces video guides on the storefront's
    // /tutorials page, linked from the user popover + mobile sidebar.
    { path: '/tutorials',           method: 'GET'  },
    { path: '/tutorial/:id',        method: 'GET'  },
    { path: '/tutorial/create',     method: 'POST' },
    { path: '/tutorial/update/:id', method: 'POST' },
    { path: '/tutorial/delete/:id', method: 'POST' },
    // Bulk / single bot-dispatch retry (admin Orders page action menu).
    { path: '/orders/bot-retry',    method: 'POST' },
    // PUBG-bot catalogue proxy — populates the SKU dropdown on the
    // Add/Edit Package form by forwarding to GamersPay's
    // /api/v1/products/{game} with the admin's X-API-Key.
    { path: '/pubg-bot/products',   method: 'POST' },
];

// Walk an Express 4 OR Express 5 router/app stack and pull out
// every (path, METHOD) pair. Express 5 moved `_router` -> `router`;
// Express 4 keeps `_router` and exposes `router` as a deprecated
// getter that *throws* on access — so try the safe properties first
// and guard the Express 5 path with a try/catch.
function listAdminEndpoints(): Array<{ path: string; method: string }> {
    const root: any = adminRouter as any;
    let stack: any[] | undefined;
    if (Array.isArray(root?.stack)) {
        stack = root.stack; // express.Router()
    } else if (root?._router?.stack) {
        stack = root._router.stack; // Express 4 app
    } else {
        try {
            stack = root?.router?.stack; // Express 5 app
        } catch {
            stack = undefined; // Express 4 deprecation getter
        }
    }
    stack = stack || [];

    const out: Array<{ path: string; method: string }> = [];
    for (const layer of stack) {
        if (!layer?.route) continue;
        const path: string = layer.route.path;
        const methods: Record<string, boolean> = layer.route.methods || {};
        for (const method of Object.keys(methods)) {
            if (!methods[method] || method === '_all') continue;
            out.push({ path, method: method.toUpperCase() });
        }
    }
    return out;
}

async function syncAuthModulesFromAdminRouter() {
    const discovered = listAdminEndpoints();

    // Merge router-discovered endpoints with the explicit ensured list,
    // de-duped on (path, method). This way:
    //   - New routes added since the last seed get picked up automatically.
    //   - Endpoints in `ENSURED_ENDPOINTS` are guaranteed present even if
    //     the live router didn't expose them (e.g. older built bundle).
    const seen = new Set<string>();
    const merged: Array<{ path: string; method: string }> = [];
    const push = (ep: { path: string; method: string }) => {
        const k = `${ep.method.toUpperCase()} ${ep.path}`;
        if (seen.has(k)) return;
        seen.add(k);
        merged.push({ path: ep.path, method: ep.method.toUpperCase() });
    };
    discovered.forEach(push);
    ENSURED_ENDPOINTS.forEach(push);

    let created = 0;
    for (const ep of merged) {
        const [, isNew] = await AuthModule.findOrCreate({
            where: { auth_url: ep.path, method: ep.method },
            defaults: { auth_url: ep.path, method: ep.method },
        });
        if (isNew) created++;
    }
    return { total: merged.length, created, discovered: discovered.length };
}

async function ensureAdmin() {
    const existing = await Admin.findOne({ where: { email: DEFAULTS.email } });
    if (existing) {
        // refresh password so the seed can be used as a reset escape hatch
        existing.password = DEFAULTS.password; // beforeUpdate hook hashes
        existing.username = DEFAULTS.username;
        existing.first_name = DEFAULTS.first_name;
        existing.last_name = DEFAULTS.last_name;
        existing.status = 1;
        await existing.save();
        return { admin: existing, fresh: false };
    }
    const admin = await Admin.create({
        email: DEFAULTS.email,
        username: DEFAULTS.username,
        password: DEFAULTS.password, // beforeCreate hook hashes
        first_name: DEFAULTS.first_name,
        last_name: DEFAULTS.last_name,
        status: 1,
    });
    return { admin, fresh: true };
}

async function seedDefaultSpinRewards() {
    // Only seed when the table is empty — we never want to overwrite an
    // admin's tuned weights / labels.
    const existing = await SpinReward.count();
    if (existing > 0) return { created: 0, existing };
    await SpinReward.bulkCreate(
        DEFAULT_SPIN_REWARDS.map((r) => ({
            ...r,
            // Only carry try_again_count on the try-again row; others get
            // the default 0 so they can never accidentally grant free spins.
            try_again_count:
                r.type === 'try_again' ? (r.try_again_count ?? 1) : 0,
            is_active: 1,
        })),
    );
    return { created: DEFAULT_SPIN_REWARDS.length, existing: 0 };
}

async function grantAllPermissions(adminId: number) {
    const modules = await AuthModule.findAll();
    // Wipe and re-grant — keeps the admin permission set in sync with the
    // current router whenever the seed is re-run.
    await AdminAuth.destroy({ where: { admin_id: adminId } });
    if (modules.length === 0) return 0;
    await AdminAuth.bulkCreate(
        modules.map((m: any) => ({ admin_id: adminId, auth_module_id: m.id }))
    );
    return modules.length;
}

(async () => {
    try {
        console.log('→ Authenticating DB…');
        await sequelize.authenticate();

        console.log('→ Syncing auth_module rows from the admin router…');
        const { total, created, discovered } = await syncAuthModulesFromAdminRouter();
        console.log(`  discovered ${discovered} from router + ${ENSURED_ENDPOINTS.length} ensured (${total} total), ${created} new module rows.`);

        console.log(`→ Upserting admin <${DEFAULTS.email}>…`);
        const { admin, fresh } = await ensureAdmin();
        console.log(`  ${fresh ? 'created' : 'updated'} admin id=${admin.id}`);

        console.log('→ Granting every permission to the admin…');
        const granted = await grantAllPermissions(admin.id);
        console.log(`  granted ${granted} permissions.`);

        console.log('→ Seeding default spin rewards…');
        const spin = await seedDefaultSpinRewards();
        if (spin.created > 0) {
            console.log(`  inserted ${spin.created} default rewards.`);
        } else {
            console.log(`  skipped (${spin.existing} reward(s) already configured).`);
        }

        console.log('\n✅ Seed complete.');
        console.log('   email:    ' + DEFAULTS.email);
        console.log('   username: ' + DEFAULTS.username);
        console.log('   password: ' + DEFAULTS.password);
        console.log('   (override via SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars)');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed failed:', err);
        process.exit(1);
    }
})();
