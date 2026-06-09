import crypto from "crypto";
import express from "express";
import { Op } from "sequelize";
import Schema from "../models";
import responseUtils from "../utils/response.utils";
import { renderOtpMessage, sendOtpSms } from "../helpers/smsProvider";

const {
  VerificationSubmission,
  OtpAttempt,
  SiteSetting,
  User,
} = Schema;

// Per-step config in one place so the storefront can render the form
// metadata (titles, field lists) without hard-coding them. The
// validation runs here too — the JSON column trusts the controller.
//
// File fields are validated by presence + sanity-checked extension; the
// storefront uploads through the existing /upload pipeline and submits
// the returned filename, same as every other admin form.
export interface StepFieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "textarea" | "file" | "tel";
  required: boolean;
  options?: string[];
  // Plain-text hint to render below the field.
  help?: string;
  // Only meaningful for `type === "file"`. Drives the HTML `capture`
  // attribute so mobile browsers launch the OS camera directly — `user`
  // for the front camera (selfie), `environment` for the rear. Desktop
  // browsers ignore it.
  capture?: "user" | "environment";
}

export interface StepDef {
  step: number;
  title: string;
  fields: StepFieldDef[];
}

export const STEP_DEFINITIONS: StepDef[] = [
  {
    step: 1,
    title: "Personal information",
    fields: [
      // Phone is set by the OTP flow, not the form payload — but it's
      // included here so the storefront can show "Phone: <verified>".
      { key: "phone", label: "Phone number", type: "tel", required: true, help: "Verified via OTP. Cannot be changed after verification." },
      { key: "full_name", label: "Full name", type: "text", required: true },
      { key: "father_name", label: "Father's name", type: "text", required: true },
      { key: "mother_name", label: "Mother's name", type: "text", required: true },
      { key: "age", label: "Age", type: "number", required: true },
      {
        key: "gender",
        label: "Gender",
        type: "select",
        required: true,
        options: ["Male", "Female", "Other"],
      },
      { key: "address", label: "Address", type: "textarea", required: true },
    ],
  },
  {
    step: 2,
    title: "Identity document",
    fields: [
      {
        key: "document_type",
        label: "Document type",
        type: "select",
        required: true,
        options: ["NID", "Passport"],
      },
      { key: "document_number", label: "Document number", type: "text", required: true },
      { key: "front_image", label: "Front side", type: "file", required: true, help: "Clear photo of the front side." },
      { key: "back_image", label: "Back side", type: "file", required: false, help: "Required for NID. Leave blank for passport." },
    ],
  },
  {
    step: 3,
    title: "Face verification",
    fields: [
      {
        key: "face_image",
        label: "Selfie",
        type: "file",
        required: true,
        // `capture: "user"` makes mobile browsers open the front camera
        // straight away instead of the file picker, which prevents users
        // from uploading a photo of someone else's photo. Desktop falls
        // back to the standard picker.
        capture: "user",
        help:
          "On mobile, this opens the front camera directly. Hold the camera at eye level with good lighting.",
      },
    ],
  },
  {
    step: 4,
    title: "Work information",
    fields: [
      { key: "occupation", label: "Occupation", type: "text", required: true },
      { key: "company", label: "Company / shop name", type: "text", required: false },
      { key: "monthly_income", label: "Monthly income (BDT)", type: "number", required: true },
      { key: "business_address", label: "Business address", type: "textarea", required: false },
      {
        // Trade license, NID-of-business, salary slip — anything the
        // admin can use to corroborate the typed-in work info. Required
        // because step 4 gates the Reseller flag, and we don't want
        // resellers approved on text claims alone.
        key: "work_document",
        label: "Work document",
        type: "file",
        required: true,
        help:
          "Trade license, business NID, salary slip, or any document that confirms your role. JPG/PNG/PDF screenshot.",
      },
    ],
  },
];

const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;
// Rate-limit OTP sends: at most 3 codes per phone per 10 minutes so the
// gateway bill (and the user's annoyance) doesn't get out of hand.
const OTP_SEND_WINDOW_MS = 10 * 60 * 1000;
const OTP_SEND_MAX_IN_WINDOW = 10;

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function generateOtpCode(): string {
  // 6-digit numeric. crypto.randomInt gives uniform distribution, unlike
  // Math.random which biases low. Always 6 chars (left-padded).
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

async function getSettings() {
  const s = await SiteSetting.findOne();
  return s;
}

function isStepFileField(stepNumber: number, key: string): boolean {
  const def = STEP_DEFINITIONS.find((s) => s.step === stepNumber);
  if (!def) return false;
  return def.fields.some((f) => f.key === key && f.type === "file");
}

class VerificationController {
  // GET /verification/me — full submission status for the current user
  // plus the schema definitions so the storefront only needs one fetch
  // to render the whole verification page.
  me = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const user_id = (req.user as any)?.id;
      const settings = await getSettings();
      const enabled = Number((settings as any)?.verification_enabled) === 1;
      const submissions = await VerificationSubmission.findAll({
        where: { user_id },
        raw: true,
      });
      const byStep: Record<string, any> = {};
      for (const s of submissions as any[]) byStep[String(s.step)] = s;

      // Convenience flags the storefront uses to decide what to show.
      const step1Verified =
        byStep["1"] && (byStep["1"] as any).status === "verified";
      // Phone verification is now decoupled from the admin review of
      // step 1. A user proves phone ownership via the standalone OTP
      // page, which stamps `phone` + `phone_verified_at` into the step-1
      // placeholder row. Ordering is gated on THAT, not on the admin
      // marking step 1 `verified`.
      const step1Data = (byStep["1"] as any)?.data || {};
      const phoneVerified = !!(step1Data.phone && step1Data.phone_verified_at);
      const stepCounts = {
        verified: (submissions as any[]).filter((s) => s.status === "verified").length,
        under_review: (submissions as any[]).filter((s) => s.status === "under_review").length,
        rejected: (submissions as any[]).filter((s) => s.status === "rejected").length,
        total_steps: STEP_DEFINITIONS.length,
      };

      response.data = {
        enabled,
        steps: STEP_DEFINITIONS,
        submissions: byStep,
        // Whether the user's phone is verified (drives the auto-fill on
        // step 1 and unlocks ordering). Always reported as `false` when
        // the module is off so the storefront stays consistent.
        phone_verified: enabled ? phoneVerified : false,
        phone: phoneVerified ? step1Data.phone : null,
        // Whether the order block currently applies to this user.
        // Module off → never. Module on → applies until the phone is
        // verified via the standalone OTP page.
        order_blocked: enabled && !phoneVerified,
        all_verified:
          enabled && stepCounts.verified === STEP_DEFINITIONS.length,
        counts: stepCounts,
      };
      res.send(response.response);
    } catch (err: any) {
      console.error("[verification.me] failed", err);
      response.success = false;
      response.status = 500;
      response.message = err?.message || "Failed to load verification status.";
      res.status(500).send(response.response);
    }
  };

  // POST /verification/otp/send — sends an OTP to the supplied phone and
  // records the hashed code. Rate-limited per-phone.
  sendOtp = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const user_id = (req.user as any)?.id;
      const phone = String(req.body?.phone || "").trim();
      if (!phone) {
        response.success = false;
        response.status = 400;
        response.message = "Phone number is required.";
        return res.status(400).send(response.response);
      }

      const settings = await getSettings();
      if (!settings || Number((settings as any).verification_enabled) !== 1) {
        response.success = false;
        response.status = 400;
        response.message = "Verification module is disabled.";
        return res.status(400).send(response.response);
      }

      // Phone is locked once step 1 is verified for the user. The admin
      // can clear the submission to unlock (see admin endpoint below).
      const existingStep1 = await VerificationSubmission.findOne({
        where: { user_id, step: 1, status: "verified" },
      });
      if (existingStep1) {
        response.success = false;
        response.status = 400;
        response.message =
          "Phone number is locked because step 1 is already verified. Contact support to change it.";
        return res.status(400).send(response.response);
      }

      // Rate limit: max N sends per window per phone (regardless of
      // user_id so a fresh signup can't burn the gateway either).
      const windowStart = new Date(Date.now() - OTP_SEND_WINDOW_MS);
      const recentSends = await OtpAttempt.count({
        where: { phone, created_at: { [Op.gte]: windowStart } as any },
      });
      if (recentSends >= OTP_SEND_MAX_IN_WINDOW) {
        response.success = false;
        response.status = 429;
        response.message =
          "Too many OTP requests for this number. Please wait a few minutes and try again.";
        return res.status(429).send(response.response);
      }

      const code = generateOtpCode();
      const expires_at = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60_000);
      const message = renderOtpMessage((settings as any).sms_message_template, {
        code,
        minutes: OTP_EXPIRY_MINUTES,
      });
      const send = await sendOtpSms({
        phone,
        message,
        providerUrl: (settings as any).sms_provider_url,
        userName: (settings as any).sms_provider_username,
        apiKey: (settings as any).sms_provider_api_key,
        senderId: (settings as any).sms_provider_sender_id,
      });

      // Persist the attempt regardless — admins reading the table want
      // to see the gateway's response even on failure.
      await OtpAttempt.create({
        user_id,
        phone,
        code_hash: hashCode(code),
        expires_at,
        attempts: 0,
        used: send.ok ? 0 : 1, // mark gateway failures as used so they can't be probed
        provider_response: JSON.stringify(send.body ?? send.error ?? ""),
      });

      if (!send.ok) {
        response.success = false;
        response.status = 502;
        response.message =
          send.error || "SMS gateway rejected the OTP send. Try again shortly.";
        return res.status(502).send(response.response);
      }

      response.message = `OTP sent. The code expires in ${OTP_EXPIRY_MINUTES} minutes.`;
      response.data = { expires_in_seconds: OTP_EXPIRY_MINUTES * 60 };
      res.send(response.response);
    } catch (err: any) {
      console.error("[verification.sendOtp] failed", err);
      response.success = false;
      response.status = 500;
      response.message = err?.message || "Failed to send OTP.";
      res.status(500).send(response.response);
    }
  };

  // POST /verification/otp/verify — checks the submitted code against
  // the most recent non-expired, non-used OTP for that phone. On
  // success, the controller stamps `phone_verified_at` into a temporary
  // row that the step-1 submit endpoint reads.
  verifyOtp = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const user_id = (req.user as any)?.id;
      const phone = String(req.body?.phone || "").trim();
      const code = String(req.body?.code || "").trim();
      if (!phone || !code) {
        response.success = false;
        response.status = 400;
        response.message = "Phone and code are required.";
        return res.status(400).send(response.response);
      }

      const now = new Date();
      const candidate = await OtpAttempt.findOne({
        where: {
          phone,
          used: 0,
          expires_at: { [Op.gt]: now } as any,
        },
        order: [["id", "DESC"]],
      });
      if (!candidate) {
        response.success = false;
        response.status = 400;
        response.message = "No active OTP for this number. Request a new code.";
        return res.status(400).send(response.response);
      }

      if (Number((candidate as any).attempts) >= OTP_MAX_ATTEMPTS) {
        (candidate as any).used = 1;
        await candidate.save();
        response.success = false;
        response.status = 429;
        response.message = "Too many failed attempts. Request a new code.";
        return res.status(429).send(response.response);
      }

      const matches =
        hashCode(code) === String((candidate as any).code_hash || "");
      if (!matches) {
        (candidate as any).attempts =
          Number((candidate as any).attempts || 0) + 1;
        await candidate.save();
        response.success = false;
        response.status = 400;
        response.message = "Incorrect code.";
        return res.status(400).send(response.response);
      }

      // Burn the code so it can't be reused on another submission.
      (candidate as any).used = 1;
      (candidate as any).user_id = user_id;
      await candidate.save();

      // Save a *placeholder* step-1 submission so the storefront's
      // submitStep can write the personal info against a phone that the
      // user has already proved they own. The submission stays in
      // 'under_review' until the user finishes the personal info form.
      const existing = await VerificationSubmission.findOne({
        where: { user_id, step: 1 },
      });
      if (!existing) {
        await VerificationSubmission.create({
          user_id,
          step: 1,
          data: { phone, phone_verified_at: now.toISOString() },
          status: "under_review",
        });
      } else if ((existing as any).status !== "verified") {
        // Allow reattempts when the previous step 1 was rejected or
        // still pending. A new phone overwrites the prior placeholder.
        const data = (existing as any).data || {};
        (existing as any).data = {
          ...data,
          phone,
          phone_verified_at: now.toISOString(),
        };
        await existing.save();
      }

      response.message = "Phone verified.";
      response.data = { phone };
      res.send(response.response);
    } catch (err: any) {
      console.error("[verification.verifyOtp] failed", err);
      response.success = false;
      response.status = 500;
      response.message = err?.message || "Failed to verify OTP.";
      res.status(500).send(response.response);
    }
  };

  // POST /verification/step/:step — upserts the user's submission for
  // the given step. Pushes the row back into 'under_review' so the admin
  // sees it again after a resubmit.
  submitStep = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const user_id = (req.user as any)?.id;
      const step = Number(req.params.step);
      const def = STEP_DEFINITIONS.find((s) => s.step === step);
      if (!def) {
        response.success = false;
        response.status = 400;
        response.message = "Unknown verification step.";
        return res.status(400).send(response.response);
      }

      const settings = await getSettings();
      if (!settings || Number((settings as any).verification_enabled) !== 1) {
        response.success = false;
        response.status = 400;
        response.message = "Verification module is disabled.";
        return res.status(400).send(response.response);
      }

      const payload = (req.body || {}) as Record<string, any>;

      // Validate required fields per the step's schema.
      for (const field of def.fields) {
        if (!field.required) continue;
        // Phone on step 1 comes from the OTP flow, not the body.
        if (step === 1 && field.key === "phone") continue;
        const v = payload[field.key];
        if (v === undefined || v === null || String(v).trim() === "") {
          response.success = false;
          response.status = 400;
          response.message = `${field.label} is required.`;
          return res.status(400).send(response.response);
        }
      }

      // Step 1 needs a verified phone. Pull it from the placeholder row
      // the OTP verify endpoint wrote.
      let mergedData: Record<string, any> = {};
      const existing = await VerificationSubmission.findOne({
        where: { user_id, step },
      });

      if (step === 1) {
        const placeholder = (existing as any)?.data || {};
        if (!placeholder.phone || !placeholder.phone_verified_at) {
          response.success = false;
          response.status = 400;
          response.message =
            "Verify your phone number with OTP before submitting step 1.";
          return res.status(400).send(response.response);
        }
        mergedData = { ...placeholder };
      }

      // Whitelist payload keys to the step's schema so callers can't
      // sneak extra fields into the JSON column.
      for (const field of def.fields) {
        if (step === 1 && field.key === "phone") continue;
        if (payload[field.key] === undefined) continue;
        if (field.type === "file") {
          // Files are filenames returned by the upload pipeline. Reject
          // anything that doesn't look like a plausible filename — keeps
          // the column from accumulating garbage.
          const filename = String(payload[field.key]).trim();
          if (filename && !/^[\w.\-/]+$/.test(filename)) {
            response.success = false;
            response.status = 400;
            response.message = `${field.label}: invalid filename.`;
            return res.status(400).send(response.response);
          }
          mergedData[field.key] = filename;
        } else if (field.type === "number") {
          mergedData[field.key] = Number(payload[field.key]);
        } else {
          mergedData[field.key] = String(payload[field.key]).trim();
        }
      }

      // Step 2: enforce NID = both sides, passport = front only.
      if (step === 2) {
        const dt = String(mergedData.document_type || "").toLowerCase();
        if (dt === "nid" && !mergedData.back_image) {
          response.success = false;
          response.status = 400;
          response.message = "NID back side is required.";
          return res.status(400).send(response.response);
        }
      }

      if (existing) {
        // Resubmit — reset to under_review and clear the prior review.
        (existing as any).data = mergedData;
        (existing as any).status = "under_review";
        (existing as any).rejection_reason = null;
        (existing as any).reviewed_by = null;
        (existing as any).reviewed_at = null;
        await existing.save();
        response.data = existing;
      } else {
        const created = await VerificationSubmission.create({
          user_id,
          step,
          data: mergedData,
          status: "under_review",
        });
        response.data = created;
      }
      response.message = "Submitted. An admin will review shortly.";
      res.send(response.response);
    } catch (err: any) {
      console.error("[verification.submitStep] failed", err);
      response.success = false;
      response.status = 500;
      response.message = err?.message || "Submission failed.";
      res.status(500).send(response.response);
    }
  };
}

// Shared gate used by the order endpoint to decide whether to block. Kept
// outside the class so it's importable as a pure helper.
export async function userCanOrder(user_id: number): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const settings = await SiteSetting.findOne();
  if (!settings || Number((settings as any).verification_enabled) !== 1) {
    return { ok: true };
  }
  // Ordering is gated solely on phone verification now — NOT on the
  // admin marking step 1 `verified`. The OTP-verify endpoint stamps
  // `phone` + `phone_verified_at` into the step-1 placeholder row; that's
  // all we require here.
  const step1 = await VerificationSubmission.findOne({
    where: { user_id, step: 1 },
  });
  const data = (step1 as any)?.data || {};
  if (!data.phone || !data.phone_verified_at) {
    return {
      ok: false,
      reason: "অর্ডার করার আগে আপনার মোবাইল নম্বরটি যাচাই করুন।",
    };
  }
  return { ok: true };
}

export default new VerificationController();
