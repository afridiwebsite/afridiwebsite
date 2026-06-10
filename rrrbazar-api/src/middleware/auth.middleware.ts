const jwt = require('jsonwebtoken')
import Response from '../utils/response.utils'
import Schema from '../models'
import express from 'express';
import {
    ADMIN_COOKIE_NAME,
    readCookie,
    resolveAdminSession,
} from '../utils/adminSession.utils';
const {
    Admin,
    AuthModule,
    AdminAuth
} = Schema;

// Admin auth guard.
//
// Resolution order (transitional — both paths supported so the rollout
// doesn't lock anyone out while the client migrates off localStorage):
//   1. Server-side session cookie (new, secure path). The raw token lives in
//      a Secure httpOnly cookie; we hash + look it up and reject revoked or
//      expired sessions. This is what makes remote logout possible.
//   2. Legacy stateless JWT in the Authorization header (old path). Kept
//      working until the client fully moves to cookies, then it can be
//      dropped.
// Either way we resolve a concrete `admin`, then enforce the per-route
// AuthModule/AdminAuth permission grant exactly as before.
const auth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const response = new Response()
    try {
        const routeUrl = req.route.path;

        const authModule = await AuthModule.findOne({
            where: {
                auth_url: routeUrl,
                method: req.method.toUpperCase()
            }
        })

        let admin: any = null;

        // Authentication failure → 401 (client clears the session + bounces to
        // login). Kept distinct from the 403 permission failure below so the
        // client doesn't log a user out just because they hit an endpoint
        // they aren't granted.
        const denyAuth = () => {
            response.status = 401;
            response.success = false;
            response.message = 'Unauthenticated';
            return res.status(401).send(response.getResponse());
        };

        // ---- 1. Session cookie (preferred) --------------------------------
        const cookieToken = readCookie(req, ADMIN_COOKIE_NAME);
        if (cookieToken) {
            const session = await resolveAdminSession(cookieToken);
            if (!session) return denyAuth();
            admin = await Admin.findByPk(session.admin_id);
            if (!admin) return denyAuth();
            (req as any).adminSession = session;
        } else {
            // ---- 2. Legacy JWT header (transitional fallback) -------------
            const token = req.headers.authorization;
            if (!token) return denyAuth();

            let tokenData: any = null;
            try {
                tokenData = jwt.decode(token);
            } catch {
                return denyAuth();
            }
            if (!tokenData?.user_id) return denyAuth();

            admin = await Admin.findOne({
                where: {
                    id: tokenData.user_id,
                    email: tokenData.user_email,
                }
            })
            if (!admin) return denyAuth();

            if (!tokenData.exp || Date.now() >= tokenData.exp * 1000) return denyAuth();

            try {
                jwt.verify(token, process.env.JWT_SECRET)
            } catch {
                return denyAuth();
            }
        }

        // ---- Per-route permission grant (applies to both paths) -----------
        // Authenticated but not granted this route → 403 (forbidden), NOT a
        // logout.
        const adminAuth = await AdminAuth.findOne({
            where: {
                auth_module_id: authModule?.id,
                admin_id: admin.id
            }
        })

        if (!adminAuth) {
            response.status = 403;
            response.success = false;
            response.message = 'Access Denied'
            return res.status(403).send(response.getResponse())
        }

        req.admin = admin;

        next();

    } catch (e) {
        console.log("Admin Auth Error:", e);
        response.status = 401;
        response.success = false;
        response.message = 'Unauthenticated'
        return res.status(401).send(response.getResponse())
    }
}

export default auth;
