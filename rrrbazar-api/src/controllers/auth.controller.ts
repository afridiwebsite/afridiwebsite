const bcrypt = require('bcryptjs');
import express from 'express';
import urljoin from 'url-join';
import { Op } from 'sequelize';
import Schema from '../models';
import util from '../utils/common.utils';
import responseUtils from '../utils/response.utils';
import {
  createAdminSession,
  resolveAdminSession,
  revokeAdminSession,
  revokeOtherAdminSessions,
  clearAdminSessionCookie,
  readCookie,
  clientIp,
  userAgent,
  ADMIN_COOKIE_NAME,
} from '../utils/adminSession.utils';
import {
  generateOtpCode,
  hashOtp,
  otpExpiry,
  verifyOtp,
  sendAdminOtpEmail,
  ADMIN_OTP_EXPIRY_MINUTES,
} from '../utils/adminOtp.utils';
import {
  setUserAuthCookie,
  clearUserAuthCookie,
} from '../utils/userCookie.utils';
const { generateToken } = require('../utils/auth.utils')
const { OAuth2Client } = require('google-auth-library');

const {
  User,
  Admin,
  AdminLoginAudit,
} = Schema;

// Append a row to the admin login audit trail. Never throws — auditing must
// never block or fail a login.
async function auditAdminLogin(
  req: express.Request,
  opts: { admin_id?: number | null; identity: string; success: boolean; reason: string },
) {
  try {
    await AdminLoginAudit.create({
      admin_id: opts.admin_id ?? null,
      identity: String(opts.identity || '').slice(0, 255),
      success: opts.success ? 1 : 0,
      reason: String(opts.reason || '').slice(0, 64),
      ip: clientIp(req),
      user_agent: userAgent(req),
    });
  } catch (e) {
    console.log('auditAdminLogin failed (non-fatal):', (e as any)?.message || e);
  }
}

// Mask an email for display in a hint, e.g. "alice@gmail.com" -> "a***@gmail.com".
// Reveals just enough for the admin to recognise the destination without
// exposing the full address.
function maskEmail(email: string): string {
  const e = String(email || '').trim();
  const at = e.indexOf('@');
  if (at <= 0) return '••••';
  const local = e.slice(0, at);
  const domain = e.slice(at);
  const head = local.slice(0, 1);
  return `${head}${'•'.repeat(Math.max(2, local.length - 1))}${domain}`;
}

// Resolve the admin that the forgot-password flow targets: the (first) admin
// who has an otp_email configured. The reset page carries no identity input,
// so the destination is derived server-side. Returns null when no admin has
// set an otp_email.
async function findOtpAdmin() {
  return Admin.findOne({
    where: {
      otp_email: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
    },
    order: [['id', 'ASC']],
  });
}

// Finalise a successful admin login: mint a revocable server-side session +
// httpOnly cookie, issue the legacy body JWT (transitional), strip secrets
// from the user object, and send the standard success payload. Shared by the
// password-only path and the OTP-verified path so both behave identically.
async function issueAdminLoginSuccess(
  req: express.Request,
  res: express.Response,
  admin: any,
  remember: boolean,
  response: responseUtils,
) {
  // Best-effort session (see adminLogin note): a not-yet-migrated DB must not
  // break login — the body JWT still authenticates the current client.
  try {
    await createAdminSession(admin, req, res, remember);
  } catch (e) {
    console.log('createAdminSession failed (non-fatal, falling back to JWT):', (e as any)?.message || e);
  }

  const token = generateToken(
    { user_id: admin.id, user_email: admin.email },
    remember ? '300h' : '24h',
  );

  const userObj: any = admin.toJSON();
  delete userObj.password;
  delete userObj.login_otp;
  delete userObj.login_otp_expires_at;
  delete userObj.reset_otp;
  delete userObj.reset_otp_expires_at;

  userObj.image_url = urljoin(util.getImagePath(req), userObj.image || '');
  userObj.image_thumb_url = urljoin(util.getImagePath(req), 'thumb', userObj.image || '');

  response.message = 'Login Success';
  response.data = { user: userObj, token };
  return res.send(response.getResponse());
}
/******************************************************************************
 *                              User Controller
 ******************************************************************************/
class AuthController {
  async adminLogin(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const identity = String(req.body.identity || '')
    const remember = req.body.remember == 1

    const admin = await Admin.findOne({
      where: {
        email: identity
      }
    })

    console.log(admin,'admin')
    if (!admin) {
      await auditAdminLogin(req, { identity, success: false, reason: 'no_user' })
      response.status = 400
      response.message = 'Invalid User info';
      response.success = false;
      return res.status(400).send(response.getResponse())
    }
    const compare = await bcrypt.compare(req.body.password, admin.password);
    if (!compare) {
      await auditAdminLogin(req, { admin_id: admin.id, identity, success: false, reason: 'password' })
      response.status = 400
      response.message = 'Invalid User info';
      response.success = false;
      return res.status(400).send(response.getResponse())
    }

    // Two-factor step-up: if the admin has an otp_email on file, password
    // alone is not enough — we email a one-time code and require it via
    // verify-otp before issuing any session. Admins without an otp_email keep
    // the password-only flow ("OTP only when set").
    const otpEmail = String(admin.otp_email || '').trim()
    if (otpEmail) {
      const code = generateOtpCode()
      admin.login_otp = hashOtp(code)
      admin.login_otp_expires_at = otpExpiry()
      await admin.save()

      const send = await sendAdminOtpEmail(otpEmail, code)
      if (!send.ok) {
        await auditAdminLogin(req, { admin_id: admin.id, identity, success: false, reason: 'otp_failed' })
        response.status = 502
        response.success = false
        response.message = send.error || 'Could not send the login OTP. Try again.'
        return res.status(502).send(response.getResponse())
      }

      await auditAdminLogin(req, { admin_id: admin.id, identity, success: false, reason: 'otp_sent' })
      response.message = 'OTP sent to your registered email.'
      response.data = {
        otp_required: true,
        identity: admin.email,
        // Masked hint so the UI can say where the code went without leaking
        // the full address.
        email_hint: maskEmail(otpEmail),
        expires_in_minutes: ADMIN_OTP_EXPIRY_MINUTES,
      }
      return res.send(response.getResponse())
    }

    // No otp_email → password is sufficient. Issue the session immediately.
    await auditAdminLogin(req, { admin_id: admin.id, identity, success: true, reason: 'success' })
    return issueAdminLoginSuccess(req, res, admin, remember, response)
  }

  // Step 2 of an OTP-gated login. Verifies the SMS code minted by adminLogin
  // and, on success, issues the session. The code is single-use (cleared on
  // success) and time-limited.
  async adminLoginVerifyOtp(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const identity = String(req.body.identity || '')
    const otp = String(req.body.otp || '')
    const remember = req.body.remember == 1

    console.log('log',otp)

    const admin = await Admin.findOne({ where: { email: identity } })
    if (!admin) {
      await auditAdminLogin(req, { identity, success: false, reason: 'otp_failed' })
      response.status = 400
      response.success = false
      response.message = 'Invalid or expired code.'
      return res.status(400).send(response.getResponse())
    }

    const ok = verifyOtp(otp, admin.login_otp, admin.login_otp_expires_at)
    if (!ok) {
      await auditAdminLogin(req, { admin_id: admin.id, identity, success: false, reason: 'otp_failed' })
      response.status = 400
      response.success = false
      response.message = 'Invalid or expired code.'
      return res.status(400).send(response.getResponse())
    }

    // Consume the code so it can't be replayed.
    admin.login_otp = null
    admin.login_otp_expires_at = null
    await admin.save()

    await auditAdminLogin(req, { admin_id: admin.id, identity, success: true, reason: 'success' })
    return issueAdminLoginSuccess(req, res, admin, remember, response)
  }

  // Forgot-password info: tell the (access-gated) reset page whether an OTP
  // email is configured, and a masked hint of where the code would go. The
  // reset page has no identity input — the destination is the admin's
  // otp_email, resolved server-side.
  async adminForgotPasswordOtpInfo(_req: express.Request, res: express.Response) {
    const response = new responseUtils()
    try {
      const admin = await findOtpAdmin()
      const otpEmail = String(admin?.otp_email || '').trim()
      response.data = otpEmail
        ? { has_otp_email: true, email_hint: maskEmail(otpEmail) }
        : { has_otp_email: false, email_hint: '' }
    } catch (e) {
      console.log('adminForgotPasswordOtpInfo error (non-fatal):', (e as any)?.message || e)
      response.data = { has_otp_email: false, email_hint: '' }
    }
    return res.send(response.getResponse())
  }

  // Forgot-password step 1: email a reset code to the admin's otp_email. The
  // target admin is resolved server-side (the one with an otp_email set), so
  // the reset page sends no identity. Returns a clear result on whether an
  // OTP email is configured — the page is access-gated, so revealing this is
  // acceptable here.
  async adminForgotPasswordRequest(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    try {
      const admin = await findOtpAdmin()
      const otpEmail = String(admin?.otp_email || '').trim()
      if (!admin || !otpEmail) {
        response.status = 400
        response.success = false
        response.message = 'No OTP email is set. Set one from the admin profile first.'
        return res.status(400).send(response.getResponse())
      }

      const code = generateOtpCode()
      admin.reset_otp = hashOtp(code)
      admin.reset_otp_expires_at = otpExpiry()
      await admin.save()

      const send = await sendAdminOtpEmail(otpEmail, code)
      if (!send.ok) {
        response.status = 502
        response.success = false
        response.message = send.error || 'Could not send the reset code. Try again.'
        return res.status(502).send(response.getResponse())
      }

      response.message = `A reset code has been sent to ${maskEmail(otpEmail)}.`
      response.data = {
        sent: true,
        email_hint: maskEmail(otpEmail),
        expires_in_minutes: ADMIN_OTP_EXPIRY_MINUTES,
      }
      return res.send(response.getResponse())
    } catch (e) {
      console.log('adminForgotPasswordRequest error (non-fatal):', (e as any)?.message || e)
      response.status = 502
      response.success = false
      response.message = 'Could not send the reset code. Try again.'
      return res.status(502).send(response.getResponse())
    }
  }

  // Forgot-password step 2: verify the reset code + set the new password. The
  // target admin is the otp_email admin (resolved server-side — no identity
  // from the client). On success every existing session for the admin is
  // revoked, so a leaked session can't survive a password reset.
  async adminResetPassword(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const otp = String(req.body.otp || '')
    const newPassword = String(req.body.password || '')

    if (newPassword.length < 6) {
      response.status = 400
      response.success = false
      response.message = 'Password must be at least 6 characters.'
      return res.status(400).send(response.getResponse())
    }

    const admin = await findOtpAdmin()
    if (!admin || !verifyOtp(otp, admin.reset_otp, admin.reset_otp_expires_at)) {
      response.status = 400
      response.success = false
      response.message = 'Invalid or expired code.'
      return res.status(400).send(response.getResponse())
    }

    // beforeUpdate hook hashes the password. Clear the reset code so it's
    // single-use.
    admin.password = newPassword
    admin.reset_otp = null
    admin.reset_otp_expires_at = null
    await admin.save()

    // Security: a password reset invalidates all existing sessions.
    try {
      await revokeOtherAdminSessions(admin.id)
    } catch (e) {
      console.log('revoke sessions on reset failed (non-fatal):', (e as any)?.message || e)
    }

    response.message = 'Password reset successfully. Please sign in.'
    return res.send(response.getResponse())
  }

  // Revoke the current session and clear the cookie. Deliberately does NOT
  // use the permission-checking `auth` middleware (logout must always work,
  // even for an admin whose route grants changed) — it validates the session
  // cookie directly here.
  async adminLogout(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    try {
      const cookieToken = readCookie(req, ADMIN_COOKIE_NAME)
      if (cookieToken) {
        const session = await resolveAdminSession(cookieToken)
        if (session) await revokeAdminSession(session)
      }
    } catch (e) {
      console.log('adminLogout error (non-fatal):', (e as any)?.message || e)
    }
    clearAdminSessionCookie(res)
    response.message = 'Logged out'
    res.send(response.getResponse())
  }

  async getTokenData(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    const token = generateToken({
      user_id: req.query.id,
      user_email: req.query.email
    }, '30000h')

    response.message = 'Login Success';
    response.data = {
      token
    }
    res.send(response.getResponse())
  }

  userLogin = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    try {
      const response = new responseUtils()
      const user = await User.findOne({
        where: {
          email: req.body.email
        }
      })
      if (!user) {
        response.status = 400
        response.message = 'Invalid User info';
        response.success = false;
        return res.status(400).send(response.getResponse())
      }
      const compare = await bcrypt.compare(req.body.password, user.password);
      if (!compare) {
        response.status = 400
        response.message = 'Invalid User info';
        response.success = false;
        return res.status(400).send(response.getResponse())
      }

      const token = generateToken({
        user_id: user.id,
        user_email: user.email
      }, '30000h')

      const userObj: any = user.toJSON();
      delete userObj.password

      userObj.image_url = urljoin(util.getImagePath(req), userObj.image || '');
      userObj.image_thumb_url = urljoin(util.getImagePath(req), 'thumb', userObj.image || '');

      // Deliver the session as a Secure httpOnly cookie. The token is still
      // returned in the body for transition, but the client no longer persists
      // it — the cookie is the source of truth.
      setUserAuthCookie(res, token);

      response.message = 'Login Success';
      response.data = {
        user: userObj,
        token
      }
      res.send(response.response)
    } catch (error) {
      console.log(error);
      res.send(response.internalError)
    }
  }

  // Clears the httpOnly auth cookie. The user JWT is stateless, so there's no
  // server-side session to revoke — clearing the cookie is the logout.
  userLogout = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    clearUserAuthCookie(res)
    response.message = 'Logged out'
    res.send(response.getResponse())
  }

  async userRegistration(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      return res.status(400).send("Manual Registration Currently Disabled")
      const { username, email, password, phone } = req.body
      const newUser = await User.create({
        username,
        email,
        password,
        phone,
        is_phone_verify: 0,
        is_email_verify: 0,
      })
      const token = generateToken({
        user_id: newUser.id,
        user_email: newUser.email
      }, '30000h')

      response.data = { user: newUser, token }
      response.message = 'Account created successfully'
      res.send(response.response)
    } catch (error) {
      console.log(error);
      return res.status(400).send(response.internalError)
    }
  }

  googleLogin = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    const client = new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT_ID);
    try {

      const ticket = await client.verifyIdToken({
        idToken: req.body.idToken,
        audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      const userPicture = payload?.picture
      const user = await User.findOne({
        where: {
          email: payload.email
        }
      })

      if (!user) {
        response.message = 'No User Found, Signup First'
        response.status = 400;
        response.success = false
        return res.status(400).send(response.getResponse())
      }

      const token = generateToken({
        user_id: user.id,
        user_email: user.email
      }, '30000h')

      const userObj: any = user.toJSON();
      delete userObj.password

      if (userPicture) {
        userObj.avatar = userPicture
        user.avatar = userPicture
        await user.save()
      }
      console.log({ userObj });
      userObj.profile_image_url = urljoin(util.getImagePath(req), userObj.profile_image || '');
      userObj.profile_image_thumb_url = urljoin(util.getImagePath(req), 'thumb', userObj.profile_image || '');

      setUserAuthCookie(res, token);

      response.message = 'Login Success';
      response.data = {
        user: userObj,
        token
      }
      res.send(response.getResponse())
    } catch (error) {
      console.log(error);
      return res.status(400).send(response.internalError)
    }

  }

  googleSignup = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    const client = new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT_ID);
    try {

      const ticket = await client.verifyIdToken({
        idToken: req.body.idToken,
        audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      const userPicture = payload?.picture
      const user = await User.findOne({
        where: {
          email: payload.email
        }
      })

      /**
       * Check if an user alrady exist with this email then login user
       */
      if (user) {

        const token = generateToken({
          user_id: user.id,
          user_email: user.email
        }, '30000h')

        const userObj: any = user.toJSON();
        delete userObj.password

        setUserAuthCookie(res, token);

        response.data = {
          user: userObj,
          token
        }
        return res.send(response.response)
      }

      /**
       * 
       * Or create a new user
       * 
       */

      const newUser = await User.create({
        email: payload?.email,
        username: payload?.email.split('@')[0],
        image: payload?.picture,
        avatar: payload?.picture,
      })

      delete (newUser as any).password

      const newUserToken = generateToken({
        user_id: newUser.id,
        user_email: newUser.email
      }, '30000h')

      setUserAuthCookie(res, newUserToken);

      response.data = {
        user: newUser,
        token: newUserToken
      }

      res.send(response.response)

    } catch (error) {
      console.log(error);
      return res.status(400).send(response.internalError)
    }

  }
}

/******************************************************************************
 *                               Export
 ******************************************************************************/
export default new AuthController();
;
