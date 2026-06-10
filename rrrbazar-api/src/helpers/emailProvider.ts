/**
 * Email sender (Resend HTTP API). The email counterpart of helpers/smsProvider.
 *
 * Sends through Resend's transactional endpoint:
 *   POST https://api.resend.com/emails
 *   Authorization: Bearer <RESEND_API_KEY>
 *   Content-Type: application/json
 *   { "from": "...", "to": ["..."], "subject": "...", "html": "...", "text": "..." }
 * Success response: { "id": "<message-id>" }.
 *
 * The API key comes from `RESEND_API_KEY` and the sender from `RESEND_FROM`
 * (env) so credentials are never hard-coded and the verified sender can be
 * rotated without a code change. We call the HTTP API directly via node-fetch
 * (already a dependency) rather than pulling in the `resend` SDK.
 *
 * Never throws — every failure is returned as `{ ok: false, error, body? }`
 * so the caller can decide whether to surface the error or carry on, exactly
 * like sendOtpSms.
 */

import fetch from "node-fetch";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
// Resend's shared test sender works without verifying a domain (it can only
// deliver to the account owner's address, which is fine for a single-admin
// panel). Override with a verified sender via RESEND_FROM in production.
const DEFAULT_FROM =
  process.env.RESEND_FROM || "Admin Security <onboarding@resend.dev>";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  /** HTML body. At least one of html/text should be provided. */
  html?: string;
  /** Plain-text fallback body. */
  text?: string;
  /** Override the default sender for this message. */
  from?: string;
  // Default 15s — long enough for a sluggish API, short enough that the
  // caller isn't blocked indefinitely.
  timeoutMs?: number;
}

export interface SendEmailResult {
  ok: boolean;
  /** Raw upstream body (parsed JSON if possible, else string). */
  body?: any;
  /** Human-readable failure message — safe to surface to admins. */
  error?: string;
}

/**
 * Reusable Resend email sender. Validates configuration up-front (API key,
 * sender, recipient, body) so a guaranteed-to-fail request never leaves the
 * process, then POSTs to Resend and normalises the result.
 */
export async function sendEmail(
  opts: SendEmailOptions,
): Promise<SendEmailResult> {
  const { subject, html, text, timeoutMs = 15_000 } = opts;

  const reqId = Math.random().toString(36).slice(2, 8).toUpperCase();
  const dbg = (...args: any[]) => console.log(`[EMAIL ${reqId}]`, ...args);
  const warn = (...args: any[]) => console.warn(`[EMAIL ${reqId}]`, ...args);
  const startedAt = Date.now();

  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const from = String(opts.from || DEFAULT_FROM).trim();
  const to = (Array.isArray(opts.to) ? opts.to : [opts.to])
    .map((t) => String(t || "").trim())
    .filter(Boolean);

  // ── Pre-flight validation ────────────────────────────────────────────
  if (!apiKey) {
    warn("Abort: RESEND_API_KEY is not configured.");
    return { ok: false, error: "Email API key (RESEND_API_KEY) is not configured." };
  }
  if (!from) {
    warn("Abort: sender (RESEND_FROM) is not configured.");
    return { ok: false, error: "Email sender is not configured." };
  }
  if (to.length === 0) {
    warn("Abort: recipient address is missing.");
    return { ok: false, error: "Recipient email address is missing." };
  }
  if (!subject) {
    warn("Abort: subject is empty.");
    return { ok: false, error: "Email subject is empty." };
  }
  if (!html && !text) {
    warn("Abort: body is empty.");
    return { ok: false, error: "Email body is empty." };
  }

  const payload: Record<string, any> = { from, to, subject };
  if (html) payload.html = html;
  if (text) payload.text = text;

  dbg("Send requested:", {
    from,
    to,
    subject,
    hasHtml: !!html,
    hasText: !!text,
    apiKey: `present (len ${apiKey.length}, …${apiKey.slice(-4)})`,
    timeoutMs,
  });

  let timeoutHandle: any;
  try {
    const requestPromise = fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error(`Email API timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
    });

    const response = (await Promise.race([
      requestPromise,
      timeoutPromise,
    ])) as any;
    clearTimeout(timeoutHandle);

    const elapsedMs = Date.now() - startedAt;
    let raw = "";
    try {
      raw = await response.text();
    } catch (readErr) {
      warn("Failed to read response body:", readErr);
    }

    let body: any = raw;
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        body = raw;
      }
    }

    if (!response.ok) {
      // Resend returns { name, message } on error — prefer that.
      const errorMsg =
        (body && typeof body === "object" && (body.message || body.name)) ||
        `Email API returned HTTP ${response.status} ${response.statusText || ""}`.trim();
      warn("Request failed:", errorMsg, body);
      return { ok: false, error: errorMsg, body };
    }

    dbg(
      `Email accepted by Resend in ${elapsedMs}ms` +
        (body && body.id ? ` (id ${body.id})` : ""),
    );
    return { ok: true, body };
  } catch (e: any) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    const elapsedMs = Date.now() - startedAt;
    console.error(`[EMAIL ${reqId}] Exception after ${elapsedMs}ms:`, e);
    return { ok: false, error: e?.message || "Email request failed." };
  }
}

export default sendEmail;
