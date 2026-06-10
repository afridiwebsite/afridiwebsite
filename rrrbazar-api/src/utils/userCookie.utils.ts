/**
 * User auth cookie helpers.
 *
 * The user (storefront) auth stays a stateless JWT, but it now rides in a
 * Secure httpOnly cookie instead of being persisted in localStorage by the
 * client. That removes the XSS-theft surface and — crucially — keeps the
 * session alive across the external payment-portal redirect (the cookie is
 * sent automatically on the return navigation even in a new tab/context,
 * which sessionStorage was not).
 *
 * Cookie attributes reuse the same env knobs as the admin session cookie
 * (COOKIE_DOMAIN / COOKIE_SAMESITE / COOKIE_SECURE) so both surfaces behave
 * consistently cross-subdomain. Reading is done with the shared `readCookie`
 * helper in adminSession.utils, so there's no cookie-parser dependency.
 */
import express from "express";

export const USER_COOKIE_NAME = process.env.USER_COOKIE_NAME || "user_token";

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

// Cookie lifetime. The JWT itself is long-lived (see generateToken callers);
// the cookie maxAge just needs to outlast a normal session. Env-tunable.
const COOKIE_DAYS = Number(process.env.USER_COOKIE_DAYS || 365);

export function setUserAuthCookie(res: express.Response, token: string): void {
  res.cookie(USER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAMESITE,
    domain: COOKIE_DOMAIN,
    maxAge: COOKIE_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearUserAuthCookie(res: express.Response): void {
  res.clearCookie(USER_COOKIE_NAME, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAMESITE,
    domain: COOKIE_DOMAIN,
    path: "/",
  });
}
