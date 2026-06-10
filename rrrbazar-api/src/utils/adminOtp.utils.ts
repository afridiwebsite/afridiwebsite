/**
 * Admin SMS OTP helpers — used by both login step-up and password reset.
 *
 * Codes are 6 digits, short-lived, and stored ONLY as a SHA-256 hash on the
 * admin row (admins.login_otp / reset_otp). Verification re-hashes the
 * submitted code and compares — the plaintext is never persisted. Delivery
 * reuses the same MiMSMS gateway + message template the user-verification
 * module uses, read from SiteSettings so there's a single place to configure
 * the gateway.
 */
import crypto from "crypto";
import Schema from "../models";
import { renderOtpMessage, sendOtpSms } from "../helpers/smsProvider";

const { SiteSetting } = Schema;

export const ADMIN_OTP_EXPIRY_MINUTES = Number(
  process.env.ADMIN_OTP_EXPIRY_MINUTES || 5,
);

// 6-digit numeric code, zero-padded, drawn from a CSPRNG.
export const generateOtpCode = (): string =>
  String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

export const hashOtp = (code: string): string =>
  crypto.createHash("sha256").update(String(code)).digest("hex");

export const otpExpiry = (minutes: number = ADMIN_OTP_EXPIRY_MINUTES): Date =>
  new Date(Date.now() + minutes * 60_000);

// True when `code` matches `storedHash` and `expiresAt` is still in the
// future. Constant-ish comparison via timingSafeEqual on equal-length hashes.
export function verifyOtp(
  code: string,
  storedHash: string | null,
  expiresAt: Date | null,
): boolean {
  if (!storedHash || !expiresAt) return false;
  if (new Date(expiresAt).getTime() <= Date.now()) return false;
  const a = Buffer.from(hashOtp(String(code || "")), "hex");
  const b = Buffer.from(String(storedHash), "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Send an OTP code to an admin's phone via the configured SMS gateway.
 * Returns the smsProvider result ({ ok, error?, body? }) so callers can
 * decide whether to surface a gateway failure.
 */
export async function sendAdminOtpSms(
  phone: string,
  code: string,
  minutes: number = ADMIN_OTP_EXPIRY_MINUTES,
) {
  const settings: any = await SiteSetting.findOne();
  const template =
    settings?.sms_message_template ||
    "Your verification code is {code}. It expires in {minutes} minutes.";
  const message = renderOtpMessage(template, { code, minutes });
  return sendOtpSms({
    phone,
    message,
    providerUrl: settings?.sms_provider_url,
    userName: settings?.sms_provider_username,
    apiKey: settings?.sms_provider_api_key,
    senderId: settings?.sms_provider_sender_id,
  });
}
