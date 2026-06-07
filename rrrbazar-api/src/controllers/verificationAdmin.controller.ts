import express from "express";
import Schema from "../models";
import responseUtils from "../utils/response.utils";
import { STEP_DEFINITIONS } from "./verification.controller";

const { VerificationSubmission, User, SiteSetting } = Schema;

// Admin-facing endpoints for the user-verification module. Two
// responsibilities:
//   1. read a user's submissions (mounted into EditUser via /admin/user/:id),
//   2. approve/reject a single step.
//
// The Reseller checkbox in EditUser also gates on step 4 being verified;
// that check is enforced server-side too — see `requireStep4ForReseller`
// at the bottom of this file (mounted from the user-update endpoint).
class VerificationAdminController {
  // GET /admin/user/:user_id/verification — all submissions for a user
  // plus the schema definitions so the admin UI can render rejected /
  // resubmitted forms without knowing every field by hand.
  list = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const user_id = req.params.user_id;
      const settings = await SiteSetting.findOne();
      const enabled =
        settings && Number((settings as any).verification_enabled) === 1;

      const submissions = await VerificationSubmission.findAll({
        where: { user_id },
        order: [["step", "ASC"]],
      });
      response.data = {
        enabled,
        steps: enabled ? STEP_DEFINITIONS : [],
        submissions,
      };
      res.send(response.response);
    } catch (err: any) {
      console.error("[verificationAdmin.list] failed", err);
      response.success = false;
      response.status = 500;
      response.message = err?.message || "Failed to load verification data.";
      res.status(500).send(response.response);
    }
  };

  // POST /admin/verification/:id/review — approve or reject a single
  // submission. Body: { status: "verified" | "rejected", rejection_reason?: string }
  review = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const id = req.params.id;
      const { status, rejection_reason } = req.body || {};
      if (status !== "verified" && status !== "rejected") {
        response.success = false;
        response.status = 400;
        response.message = "status must be 'verified' or 'rejected'.";
        return res.status(400).send(response.response);
      }
      if (status === "rejected" && !String(rejection_reason || "").trim()) {
        response.success = false;
        response.status = 400;
        response.message = "A rejection reason is required.";
        return res.status(400).send(response.response);
      }

      const submission = await VerificationSubmission.findByPk(id);
      if (!submission) {
        response.success = false;
        response.status = 404;
        response.message = "Submission not found.";
        return res.status(404).send(response.response);
      }
      (submission as any).status = status;
      (submission as any).rejection_reason =
        status === "rejected" ? String(rejection_reason).trim() : null;
      (submission as any).reviewed_by = (req as any).admin?.id || null;
      (submission as any).reviewed_at = new Date();
      await submission.save();

      // Step 1 sync: when the admin approves step 1, push the verified
      // phone number into User.phone so the rest of the app (checkout,
      // notifications, admin user list) sees it without having to join
      // the verification table. Same direction the spec implies — the
      // phone is "locked" once verified, so it should be the canonical
      // value on the user row too.
      if (
        status === "verified" &&
        Number((submission as any).step) === 1
      ) {
        try {
          const data: any = (submission as any).data || {};
          const phone = String(data.phone || "").trim();
          if (phone) {
            const user = await User.findByPk((submission as any).user_id);
            if (user && user.phone !== phone) {
              user.phone = phone;
              await user.save();
            }
          }
        } catch (e) {
          // Failure to sync the User row shouldn't block the review;
          // log it for follow-up and continue.
          console.error("[verificationAdmin.review] phone sync failed", {
            submission_id: (submission as any).id,
            err: (e as any)?.message || e,
          });
        }
      }

      response.data = submission;
      response.message =
        status === "verified" ? "Submission verified." : "Submission rejected.";
      res.send(response.response);
    } catch (err: any) {
      console.error("[verificationAdmin.review] failed", err);
      response.success = false;
      response.status = 500;
      response.message = err?.message || "Failed to review submission.";
      res.status(500).send(response.response);
    }
  };

  // DELETE /admin/verification/:id — clears a submission so the user can
  // resubmit. The spec calls out that the admin can remove the phone
  // verification specifically; this endpoint covers any step.
  remove = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const id = req.params.id;
      const removed = await VerificationSubmission.destroy({ where: { id } });
      if (!removed) {
        response.success = false;
        response.status = 404;
        response.message = "Submission not found.";
        return res.status(404).send(response.response);
      }
      response.message = "Submission cleared. User can resubmit.";
      res.send(response.response);
    } catch (err: any) {
      console.error("[verificationAdmin.remove] failed", err);
      response.success = false;
      response.status = 500;
      response.message = err?.message || "Failed to clear submission.";
      res.status(500).send(response.response);
    }
  };
}

// Helper used by the user-update endpoint to refuse a Reseller promotion
// when the verification module is on and step 4 isn't verified. Lives
// here so the gate is colocated with the rest of the verification logic.
export async function canPromoteToReseller(user_id: number): Promise<boolean> {
  const settings = await SiteSetting.findOne();
  if (!settings || Number((settings as any).verification_enabled) !== 1) {
    // Module off — no extra gate, current admin behavior wins.
    return true;
  }
  const step4 = await VerificationSubmission.findOne({
    where: { user_id, step: 4, status: "verified" },
  });
  return !!step4;
}

export default new VerificationAdminController();
