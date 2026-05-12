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

const { Admin, AuthModule, AdminAuth } = Schema;

// Walk an Express 4 OR Express 5 router/app stack and pull out
// every (path, METHOD) pair. Express 5 moved `_router` -> `router`,
// which is why express-list-endpoints@7 returns 0 entries here.
function listAdminEndpoints(): Array<{ path: string; method: string }> {
    const root: any = adminRouter as any;
    const stack: any[] =
        root?.router?.stack || // Express 5 app
        root?._router?.stack || // Express 4 app
        root?.stack || // express.Router()
        [];

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
    const endpoints = listAdminEndpoints();
    let created = 0;
    for (const ep of endpoints) {
        const [, isNew] = await AuthModule.findOrCreate({
            where: { auth_url: ep.path, method: ep.method },
            defaults: { auth_url: ep.path, method: ep.method },
        });
        if (isNew) created++;
    }
    return { total: endpoints.length, created };
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
        const { total, created } = await syncAuthModulesFromAdminRouter();
        console.log(`  found ${total} endpoints, ${created} new module rows.`);

        console.log(`→ Upserting admin <${DEFAULTS.email}>…`);
        const { admin, fresh } = await ensureAdmin();
        console.log(`  ${fresh ? 'created' : 'updated'} admin id=${admin.id}`);

        console.log('→ Granting every permission to the admin…');
        const granted = await grantAllPermissions(admin.id);
        console.log(`  granted ${granted} permissions.`);

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
