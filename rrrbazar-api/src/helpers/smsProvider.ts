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

  // MiMSMS requires a JSON body.
  const payload = {
    UserName: "sksohanpc@gmail.com",
    Apikey: key,
    MobileNumber: phone,
    CampaignId: "null",
    SenderName: senderId || "8809643902677",
    TransactionType: "T",
    Message: message,
  };

  console.log(`[SMS] Preparing to send SMS to ${phone}`);
  console.log(`[SMS] URL: ${url}`);
  console.log(`[SMS] Payload (sanitized):`, { ...payload, Apikey: "REDACTED" });

  let timeoutHandle: any;
  try {
    const requestPromise = fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload),
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

    console.log(`[SMS] Response Status: ${response.status} ${response.statusText}`);
    
    const contentType = response.headers?.get?.("content-type") || "";
    let body: any;
    try {
      if (contentType.includes("application/json")) {
        body = await response.json();
      } else {
        body = await response.text();
      }
    } catch (parseErr) {
      console.error(`[SMS] Failed to parse response body:`, parseErr);
      body = "(unparseable response)";
    }

    console.log(`[SMS] Response Body:`, body);

    if (!response.ok) {
      const errorMsg = `SMS gateway returned HTTP ${response.status} ${
        response.statusText || ""
      }`.trim();
      console.warn(`[SMS] Request failed: ${errorMsg}`);
      return {
        ok: false,
        error: errorMsg,
        body,
      };
    }

    // MiMSMS success: {"statusCode":"200","status":"Success",...}
    // Generic fallback for other providers: {"error":0} or {"success":true}
    if (body && typeof body === "object") {
      const statusCode = String(body.statusCode || "");
      const status = String(body.status || "").toLowerCase();
      
      const isMiMSuccess = statusCode === "200" && (status === "success" || status === "ok");
      const isGenericError = body.error !== undefined && Number(body.error) !== 0;
      const isGenericFailure = body.success === false;

      // If it doesn't look like a success, determine the error message
      if (!isMiMSuccess && (isGenericError || isGenericFailure || (body.status && status !== "success"))) {
        const gatewayError = body.responseResult || body.msg || body.message || "SMS gateway reported a failure.";
        console.warn(`[SMS] Gateway reported error: ${gatewayError}`, body);
        return {
          ok: false,
          error: gatewayError,
          body,
        };
      }
    }

    return { ok: true, body };
  } catch (e: any) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    console.error(`[SMS] Exception during SMS request:`, e);
    return {
      ok: false,
      error: e?.message || "SMS gateway request failed.",
    };
  }
}

export default sendOtpSms;
