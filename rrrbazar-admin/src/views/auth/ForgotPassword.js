import axios from "axios";
import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import urljoin from "url-join";
import Alert from "../../components/Alert/Alert";
import Loader from "../../components/Loader/Loader";
import { evaluateLoginAccess } from "../../utils/authAccess.utils";
import AccessDenied from "./AccessDenied";

const API = process.env.REACT_APP_API_ENDPOINT;

// SMS-based password reset. Step 1 sends an OTP to the admin's registered
// phone (the API answers generically so it can't be used to probe which
// emails exist). Step 2 takes the OTP + a new password. On success every
// existing session is revoked server-side, so the admin must sign in again.
export default function ForgotPassword() {
  const [accessAllowed] = useState(() => evaluateLoginAccess());
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [step, setStep] = useState("request"); // request → reset → done
  const [identity, setIdentity] = useState("");

  const otpRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const requestOtp = (e) => {
    e.preventDefault();
    const id = e.target.identity.value;
    setLoading(true);
    setErrorMsg("");
    setInfoMsg("");
    setIdentity(id);

    axios
      .post(
        urljoin(API, "/admin/forgot-password"),
        { identity: id },
        { withCredentials: true },
      )
      .then((res) => {
        setInfoMsg(
          res?.data?.message ||
            "If an account with a registered phone exists, an OTP has been sent.",
        );
        setStep("reset");
        setLoading(false);
      })
      .catch((error) => {
        setErrorMsg(error?.response?.data?.message || "Could not send the code. Try again.");
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
        { identity, otp, password },
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
                <form onSubmit={requestOtp}>
                  <div className="relative w-full mb-3">
                    <label className="form_label" htmlFor="fp-email">
                      Account email
                    </label>
                    <input
                      id="fp-email"
                      name="identity"
                      type="email"
                      className="form_input"
                      placeholder="Email"
                      required
                      defaultValue={identity}
                    />
                  </div>
                  <div className="text-center mt-6">
                    <button className="form_button" type="submit">
                      Send code
                    </button>
                  </div>
                </form>
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
