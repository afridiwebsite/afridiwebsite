/**
 * SMS gateway client (MiMSMS HTTP API). Phase A of the verification module.
 *
 * Sends through MiMSMS's single-SMS JSON endpoint (see config.md):
 *   POST https://api.mimsms.com/api/SmsSending/SMS
 *   Content-Type: application/json
 *   {
 *     "UserName": "you@example.com",
 *     "Apikey": "XXXXXXXX",
 *     "MobileNumber": "8801xxxxxxxxx",   // intl format, no leading '+'
 *     "CampaignId": "null",
 *     "SenderName": "MiM Digital",       // approved sender — REQUIRED
 *     "TransactionType": "T",
 *     "Message": "..."
 *   }
 * Success response: { "statusCode": "200", "status": "Success",
 *                     "trxnId": "...", "responseResult": "SMS Send Successfuly" }.
 *
 * The gateway URL, account username, API key, and sender ID all come from
 * SiteSettings — never hard-coded — so the admin can rotate credentials or
 * swap the approved sender from the SMS settings page without a deploy.
 * UserName, Apikey AND SenderName are all REQUIRED by MiMSMS; the helper
 * rejects the send up-front if any is missing rather than round-tripping a
 * guaranteed-to-fail request.
 *
 * Never throws — every failure is returned as `{ ok: false, error, body? }`
 * so the caller can decide whether to surface the error or carry on.
 */

import fetch from "node-fetch";

export interface SendSmsOptions {
  phone: string;
  message: string;
  providerUrl: string;
  /**
   * Gateway account username/login. MiMSMS-style JSON gateways require it
   * alongside the API key. Sourced from SiteSettings (sms_provider_username)
   * so no specific account is ever hard-coded here.
   */
  userName: string;
  apiKey: string;
  /**
   * Approved sender name/ID, sent as `SenderName`. REQUIRED by MiMSMS — the
   * gateway rejects any send without an approved sender, so this is not
   * optional. Sourced from SiteSettings (sms_provider_sender_id).
   */
  senderId: string;
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
    userName,
    apiKey,
    senderId,
    timeoutMs = 15_000,
  } = opts;

  // Short correlation id + tagged loggers so concurrent/interleaved sends
  // stay readable, and a start timestamp for round-trip timing.
  const reqId = Math.random().toString(36).slice(2, 8).toUpperCase();
  const dbg = (...args: any[]) => console.log(`[SMS ${reqId}]`, ...args);
  const warn = (...args: any[]) => console.warn(`[SMS ${reqId}]`, ...args);
  const startedAt = Date.now();

  const url = String(providerUrl || "").trim();
  const user = String(userName || "").trim();
  const key = String(apiKey || "").trim();
  const sender = String(senderId || "").trim();
  const to = String(phone || "").trim();
  const text = String(message || "");

  dbg("──────────────────────────────────────────────");
  dbg("Send requested:", {
    url: url || "(empty)",
    userName: user || "(empty)",
    senderName: sender || "(empty)",
    mobileNumber: to || "(empty)",
    apiKey: key ? `present (len ${key.length}, …${key.slice(-4)})` : "(empty)",
    messageLength: text.length,
    timeoutMs,
  });

  // ── Pre-flight validation ────────────────────────────────────────────
  // MiMSMS requires UserName, Apikey AND SenderName (see config.md). Any of
  // them missing is a guaranteed upstream reject, so fail fast with a
  // precise message instead of paying a round-trip to learn the same thing.
  if (!url) {
    warn("Abort: gateway URL is not configured.");
    return { ok: false, error: "SMS gateway URL is not configured." };
  }
  if (!user) {
    warn("Abort: gateway username is not configured.");
    return { ok: false, error: "SMS gateway username is not configured." };
  }
  if (!key) {
    warn("Abort: gateway API key is not configured.");
    return { ok: false, error: "SMS gateway API key is not configured." };
  }
  if (!sender) {
    // SenderName is mandatory for MiMSMS — surface it as its own clear error.
    warn("Abort: sender ID is not configured (MiMSMS requires an approved SenderName).");
    return {
      ok: false,
      error:
        "SMS sender ID is not configured. MiMSMS requires an approved SenderName.",
    };
  }
  if (!to) {
    warn("Abort: recipient phone number is missing.");
    return { ok: false, error: "Recipient phone number is missing." };
  }
  if (!text) {
    warn("Abort: message body is empty.");
    return { ok: false, error: "SMS message body is empty." };
  }

  // Heads-up (not an error): MiMSMS wants intl format without a leading '+',
  // e.g. 8801xxxxxxxxx. We pass the number through untouched so the admin
  // stays in control, but flag it so a malformed number is easy to spot.
  if (to.startsWith("+")) {
    warn(
      `MobileNumber "${to}" starts with '+'. MiMSMS expects intl format ` +
        `WITHOUT the leading '+' (e.g. 8801xxxxxxxxx) — this may be rejected.`,
    );
  }

  // MiMSMS single-SMS contract (config.md): CampaignId is the literal string
  // "null" and TransactionType "T" (transactional).
  const payload = {
    UserName: user,
    Apikey: key,
    MobileNumber: to,
    CampaignId: "null",
    SenderName: sender,
    TransactionType: "T",
    Message: text,
  };

  dbg(`POST ${url}`);
  dbg("Request headers:", {
    "Content-Type": "application/json",
    Accept: "application/json",
  });
  dbg("Request payload (Apikey redacted):", {
    ...payload,
    Apikey: `***${key.slice(-4)}`,
  });

  let timeoutHandle: any;
  try {
    const requestPromise = fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
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

    const elapsedMs = Date.now() - startedAt;
    dbg(
      `Response after ${elapsedMs}ms: HTTP ${response.status} ${
        response.statusText || ""
      }`.trim(),
    );
    // Dump response headers (best-effort — Headers shape varies by runtime).
    try {
      const hdrs: Record<string, string> = {};
      if (typeof response.headers?.forEach === "function") {
        response.headers.forEach((v: string, k: string) => {
          hdrs[k] = v;
        });
      }
      dbg("Response headers:", hdrs);
    } catch {
      /* header introspection is best-effort */
    }

    // Read the body as raw text first so we ALWAYS have something to log,
    // even when the gateway mislabels the content-type, then try to parse
    // it as JSON. (A response body can only be consumed once.)
    let raw = "";
    try {
      raw = await response.text();
    } catch (readErr) {
      warn("Failed to read response body:", readErr);
    }
    dbg("Raw response body:", raw || "(empty)");

    let body: any = raw;
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        dbg("Response body is not valid JSON — keeping it as raw text.");
        body = raw;
      }
    }

    if (!response.ok) {
      const errorMsg = `SMS gateway returned HTTP ${response.status} ${
        response.statusText || ""
      }`.trim();
      warn("Request failed:", errorMsg);
      return { ok: false, error: errorMsg, body };
    }

    // Success per config.md: { statusCode: "200", status: "Success", ... }.
    // Generic fallback for other providers: {"error":0} or {"success":true}.
    if (body && typeof body === "object") {
      const statusCode = String(body.statusCode || "");
      const status = String(body.status || "").toLowerCase();

      const isMiMSuccess =
        statusCode === "200" && (status === "success" || status === "ok");
      const isGenericError =
        body.error !== undefined && Number(body.error) !== 0;
      const isGenericFailure = body.success === false;

      dbg("Parsed gateway result:", {
        statusCode: statusCode || "(none)",
        status: status || "(none)",
        trxnId: body.trxnId || "(none)",
        responseResult: body.responseResult || body.message || body.msg || "(none)",
        isMiMSuccess,
      });

      // If it doesn't look like a success, determine the error message.
      if (
        !isMiMSuccess &&
        (isGenericError ||
          isGenericFailure ||
          (body.status && status !== "success"))
      ) {
        const gatewayError =
          body.responseResult ||
          body.msg ||
          body.message ||
          "SMS gateway reported a failure.";
        warn("Gateway reported error:", gatewayError, body);
        return { ok: false, error: gatewayError, body };
      }

      dbg(
        `SMS accepted by gateway in ${elapsedMs}ms` +
          (body.trxnId ? ` (trxnId ${body.trxnId})` : ""),
      );
    } else {
      dbg(
        "Gateway returned a non-object body on HTTP 200 — treating as success.",
      );
    }

    return { ok: true, body };
  } catch (e: any) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    const elapsedMs = Date.now() - startedAt;
    console.error(`[SMS ${reqId}] Exception after ${elapsedMs}ms:`, e);
    return {
      ok: false,
      error: e?.message || "SMS gateway request failed.",
    };
  }
}

export default sendOtpSms;
