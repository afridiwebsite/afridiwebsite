/**
 * SMS gateway client. Phase A of the verification module.
 *
 * The gateway URL, API key, and sender ID all come from SiteSettings —
 * never hard-coded — so the admin can swap providers from the SMS
 * settings page without a deploy. Today's default points at sms.net.bd's
 * sendsms endpoint (https://portal.sms.net.bd/) which expects
 * `api_key`, `msg`, `to`, and optional `sender_id` as form fields.
 *
 * Most simple SMS gateways follow the same shape (form-encoded POST with
 * an api_key field), so this helper stays provider-agnostic by sending
 * the same payload to whatever URL is configured. If we onboard a
 * gateway with a wildly different contract later, branch off the URL
 * hostname here instead of teaching every call site about providers.
 *
 * Never throws — every failure is returned as `{ ok: false, error, body? }`
 * so the caller can decide whether to surface the error or carry on.
 */

import fetch from "node-fetch";

export interface SendSmsOptions {
  phone: string;
  message: string;
  providerUrl: string;
  apiKey: string;
  senderId?: string;
  // Default 15s — long enough for a sluggish gateway, short enough that
  // the user isn't staring at a frozen "Send OTP" button.
  timeoutMs?: number;
}

export interface SendSmsResult {
  ok: boolean;
  /** Raw upstream body (parsed JSON if possible, else string). */
  body?: any;
  /** Human-readable failure message — safe to surface to admins. */
  error?: string;
}

/**
 * Render the configured message template, substituting {code} and
 * {minutes}. Anything else passes through verbatim so admins can drop
 * in their own placeholders later (e.g. {site_name}) by widening this
 * function — no template engine needed.
 */
export function renderOtpMessage(
  template: string,
  vars: { code: string; minutes?: number },
): string {
  const minutes = vars.minutes ?? 5;
  return String(template || "")
    .replace(/\{code\}/g, String(vars.code))
    .replace(/\{minutes\}/g, String(minutes));
}

export async function sendOtpSms(opts: SendSmsOptions): Promise<SendSmsResult> {
  const {
    phone,
    message,
    providerUrl,
    apiKey,
    senderId,
    timeoutMs = 15_000,
  } = opts;

  const url = String(providerUrl || "").trim();
  const key = String(apiKey || "").trim();
  if (!url) {
    return { ok: false, error: "SMS gateway URL is not configured." };
  }
  if (!key) {
    return { ok: false, error: "SMS gateway API key is not configured." };
  }
  if (!phone) {
    return { ok: false, error: "Recipient phone number is missing." };
  }
  if (!message) {
    return { ok: false, error: "SMS message body is empty." };
  }

  // Form-encoded POST is the lowest-common-denominator shape across the
  // simple gateways we care about (sms.net.bd, mim.net.bd, MIM-like
  // local providers). If a future gateway insists on JSON we'll branch
  // here on hostname/contentType rather than forcing the call site to
  // know.
  const form = new URLSearchParams();
  form.set("api_key", key);
  form.set("msg", message);
  form.set("to", phone);
  if (senderId) form.set("sender_id", senderId);

  let timeoutHandle: any;
  try {
    const requestPromise = fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error(`SMS gateway timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
    });
    const response = (await Promise.race([
      requestPromise,
      timeoutPromise,
    ])) as any;
    clearTimeout(timeoutHandle);

    const contentType = response.headers?.get?.("content-type") || "";
    let body: any;
    try {
      body = contentType.includes("application/json")
        ? await response.json()
        : await response.text();
    } catch {
      body = "(unparseable response)";
    }

    if (!response.ok) {
      return {
        ok: false,
        error: `SMS gateway returned HTTP ${response.status} ${
          response.statusText || ""
        }`.trim(),
        body,
      };
    }

    // sms.net.bd success returns `{"error":0,"msg":"..."}`. Any non-zero
    // `error` (or `success: false`) on a 200 means delivery was rejected.
    if (body && typeof body === "object") {
      const errCode = (body as any).error;
      const success = (body as any).success;
      if (
        (errCode !== undefined && Number(errCode) !== 0) ||
        success === false
      ) {
        return {
          ok: false,
          error:
            (body as any).msg ||
            (body as any).message ||
            "SMS gateway reported a failure on a 200 response.",
          body,
        };
      }
    }

    return { ok: true, body };
  } catch (e: any) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    return {
      ok: false,
      error: e?.message || "SMS gateway request failed.",
    };
  }
}

export default sendOtpSms;
