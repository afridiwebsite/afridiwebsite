import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import urljoin from "url-join";
import Alert from "../../components/Alert/Alert";
import Loader from "../../components/Loader/Loader";
import { evaluateLoginAccess } from "../../utils/authAccess.utils";
import AccessDenied from "./AccessDenied";

const API = process.env.REACT_APP_API_ENDPOINT;

// Email-based password reset. The code is always sent to the OTP email
// configured on the admin profile — this page takes no email input. On mount
// it asks the API whether an OTP email is set and shows a masked hint of it;
// step 1 emails the reset code, step 2 takes the OTP + a new password. On
// success every existing session is revoked server-side, so the admin must
// sign in again.
export default function ForgotPassword() {
  const [accessAllowed] = useState(() => evaluateLoginAccess());
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [step, setStep] = useState("request"); // request → reset → done

  // Whether an OTP email is configured + a masked hint of it. `null` while the
  // initial lookup is in flight.
  const [otpEmail, setOtpEmail] = useState(null); // { has_otp_email, email_hint }

  const otpRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!accessAllowed) return;
    let cancelled = false;
    axios
      .get(urljoin(API, "/admin/forgot-password/otp-info"), {
        withCredentials: true,
      })
      .then((res) => {
        if (cancelled) return;
        setOtpEmail(res?.data?.data || { has_otp_email: false, email_hint: "" });
      })
      .catch(() => {
        if (cancelled) return;
        setOtpEmail({ has_otp_email: false, email_hint: "" });
      });
    return () => {
      cancelled = true;
    };
  }, [accessAllowed]);

  const requestOtp = (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setInfoMsg("");

    axios
      .post(
        urljoin(API, "/admin/forgot-password"),
        {},
        { withCredentials: true },
      )
      .then((res) => {
        setInfoMsg(res?.data?.message || "A reset code has been sent.");
        setStep("reset");
        setLoading(false);
      })
      .catch((error) => {
        setErrorMsg(
          error?.response?.data?.message || "Could not send the code. Try again.",
        );
        setLoading(false);
      });
  };

  const resetPassword = (e) => {
    e.preventDefault();
    const otp = otpRef.current.value;
    const password = passwordRef.current.value;
    const confirm = confirmRef.current.value;

    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    axios
      .post(
        urljoin(API, "/admin/reset-password"),
        { otp, password },
        { withCredentials: true },
      )
      .then(() => {
        setStep("done");
        setLoading(false);
      })
      .catch((error) => {
        setErrorMsg(error?.response?.data?.message || "Invalid or expired code.");
        setLoading(false);
      });
  };

  if (!accessAllowed) {
    return <AccessDenied />;
  }

  return (
    <div className="container mx-auto px-4 h-full">
      <div className="flex content-center items-center justify-center h-full">
        <div className="w-full sm:w-[70%] lg:w-[450px] px-4">
          <div className="relative overflow-hidden flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border border-gray-300">
            {loading && <Loader absolute />}
            <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
              <div className="text-blueGray-400 text-center mb-3 font-bold">
                <small>Reset password</small>
              </div>
              {errorMsg && <Alert text={errorMsg} />}
              {infoMsg && (
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2 mb-3">
                  {infoMsg}
                </p>
              )}

              {step === "request" && (
                <>
                  {otpEmail === null ? (
                    <p className="text-sm text-blueGray-500 text-center py-4">
                      Checking your reset options…
                    </p>
                  ) : otpEmail.has_otp_email ? (
                    <form onSubmit={requestOtp}>
                      <p className="text-sm text-blueGray-500 mb-4">
                        We'll send a one-time reset code to your OTP email
                        {otpEmail.email_hint ? ` (${otpEmail.email_hint})` : ""}.
                      </p>
                      <div className="text-center mt-6">
                        <button className="form_button" type="submit">
                          Send code
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3 mb-3">
                      No OTP email is set for this admin account, so a reset code
                      can't be sent. Sign in and set an OTP email from your
                      profile first.
                    </p>
                  )}
                </>
              )}

              {step === "reset" && (
                <form onSubmit={resetPassword}>
                  <div className="relative w-full mb-3">
                    <label className="form_label" htmlFor="fp-otp">
                      Verification code
                    </label>
                    <input
                      id="fp-otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      className="form_input tracking-widest text-center"
                      placeholder="______"
                      required
                      ref={otpRef}
                    />
                  </div>
                  <div className="relative w-full mb-3">
                    <label className="form_label" htmlFor="fp-pass">
                      New password
                    </label>
                    <input
                      id="fp-pass"
                      type="password"
                      className="form_input"
                      placeholder="New password"
                      required
                      minLength={6}
                      ref={passwordRef}
                    />
                  </div>
                  <div className="relative w-full mb-3">
                    <label className="form_label" htmlFor="fp-confirm">
                      Confirm password
                    </label>
                    <input
                      id="fp-confirm"
                      type="password"
                      className="form_input"
                      placeholder="Confirm password"
                      required
                      minLength={6}
                      ref={confirmRef}
                    />
                  </div>
                  <div className="text-center mt-6">
                    <button className="form_button" type="submit">
                      Reset password
                    </button>
                  </div>
                </form>
              )}

              {step === "done" && (
                <div className="text-center">
                  <p className="text-sm text-green-700 mb-4">
                    Password reset successfully. All devices have been signed
                    out for security.
                  </p>
                  <Link to="/login" className="form_button inline-block">
                    Back to sign in
                  </Link>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap mt-6 relative">
            <div className="w-full text-center">
              <Link to="/login" className="text-blueGray-200">
                <small>Back to sign in</small>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
