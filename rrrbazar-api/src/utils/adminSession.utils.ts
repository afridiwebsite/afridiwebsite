/**
 * Admin server-side session helpers.
 *
 * Replaces the old stateless-JWT-in-localStorage model with revocable,
 * server-tracked sessions delivered via a Secure httpOnly cookie:
 *
 *   - login mints a random 256-bit token, stores ONLY its SHA-256 hash in
 *     admin_sessions, and sets the raw token as an httpOnly cookie. JS on the
 *     page can't read it (no XSS theft), and a DB leak can't be replayed
 *     (only the hash is stored).
 *   - every request hashes the incoming cookie and looks the row up; a
 *     revoked or expired row = logged out. This is what makes "log out other
 *     devices" and hard revocation possible — impossible with stateless JWTs.
 *
 * No external cookie dependency: cookies are parsed from the raw header and
 * written with Express's built-in res.cookie / res.clearCookie.
 */
import crypto from "crypto";
import express from "express";
import Schema from "../models";

const { AdminSession } = Schema;

// Cookie + lifetime configuration. Cross-subdomain admin panels (admin.* →
// api.*) need SameSite=None;Secure to send the cookie cross-site, so these
// are env-tunable rather than hard-coded.
export const ADMIN_COOKIE_NAME = process.env.ADMIN_COOKIE_NAME || "admin_session";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
const COOKIE_SAMESITE = (process.env.COOKIE_SAMESITE || "lax").toLowerCase() as
  | "lax"
  | "strict"
  | "none";
// Default Secure on in production; SameSite=None *requires* Secure.
const COOKIE_SECURE =
  String(process.env.COOKIE_SECURE || "").toLowerCase() === "true" ||
  COOKIE_SAMESITE === "none" ||
  process.env.NODE_ENV === "production";

// Session lifetimes. "Remember me" gets a long-lived session; otherwise a
// shorter one. Both are server-side — the client never decides expiry.
const REMEMBER_DAYS = Number(process.env.ADMIN_SESSION_REMEMBER_DAYS || 30);
const DEFAULT_HOURS = Number(process.env.ADMIN_SESSION_HOURS || 24);

export const sha256 = (raw: string): string =>
  crypto.createHash("sha256").update(String(raw)).digest("hex");

// Best-effort client IP, honouring a reverse proxy's X-Forwarded-For.
export const clientIp = (req: express.Request): string => {
  const fwd = (req.headers["x-forwarded-for"] as string) || "";
  const first = fwd.split(",")[0]?.trim();
  return (first || req.socket?.remoteAddress || "").slice(0, 64);
};

export const userAgent = (req: express.Request): string =>
  String(req.headers["user-agent"] || "").slice(0, 512);

// Minimal cookie-header parser (avoids pulling in cookie-parser).
export const readCookie = (
  req: express.Request,
  name: string,
): string | null => {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
};

/**
 * Create a new session for an admin and write the cookie. Returns the raw
 * token too (handy for tests / non-browser clients), but the browser only
 * ever needs the cookie.
 */
export async function createAdminSession(
  admin: any,
  req: express.Request,
  res: express.Response,
  remember: boolean,
): Promise<{ rawToken: string; session: any }> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const ttlMs = remember
    ? REMEMBER_DAYS * 24 * 60 * 60 * 1000
    : DEFAULT_HOURS * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs);

  const session = await AdminSession.create({
    admin_id: admin.id,
    token_hash: sha256(rawToken),
    user_agent: userAgent(req),
    ip: clientIp(req),
    remember: remember ? 1 : 0,
    last_seen_at: new Date(),
    expires_at: expiresAt,
  });

  res.cookie(ADMIN_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAMESITE,
    domain: COOKIE_DOMAIN,
    expires: remember ? expiresAt : undefined, // session cookie when not remembered
    path: "/",
  });

  return { rawToken, session };
}

/**
 * Resolve a raw session token to its live session row. Returns null when the
 * token is unknown, revoked, or expired. On success bumps last_seen_at
 * (throttled to once a minute to avoid a write on every request).
 */
export async function resolveAdminSession(rawToken: string): Promise<any | null> {
  if (!rawToken) return null;
  const session = await AdminSession.findOne({
    where: { token_hash: sha256(rawToken) },
  });
  if (!session) return null;
  if (session.revoked_at) return null;
  if (new Date(session.expires_at).getTime() <= Date.now()) return null;

  const last = session.last_seen_at
    ? new Date(session.last_seen_at).getTime()
    : 0;
  if (Date.now() - last > 60_000) {
    session.last_seen_at = new Date();
    await session.save();
  }
  return session;
}

export async function revokeAdminSession(session: any): Promise<void> {
  if (!session || session.revoked_at) return;
  session.revoked_at = new Date();
  await session.save();
}

/**
 * Revoke every active session for an admin except (optionally) one — the
 * "log out other devices" action.
 */
export async function revokeOtherAdminSessions(
  adminId: number,
  keepSessionId?: number,
): Promise<number> {
  const { Op } = require("sequelize");
  const where: any = { admin_id: adminId, revoked_at: null };
  if (keepSessionId) where.id = { [Op.ne]: keepSessionId };
  const [count] = await AdminSession.update(
    { revoked_at: new Date() },
    { where },
  );
  return count;
}

export function clearAdminSessionCookie(res: express.Response): void {
  res.clearCookie(ADMIN_COOKIE_NAME, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAMESITE,
    domain: COOKIE_DOMAIN,
    path: "/",
  });
}
