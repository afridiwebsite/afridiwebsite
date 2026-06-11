import axios from "axios";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import urljoin from "url-join";
import Alert from "../../components/Alert/Alert";
import Loader from "../../components/Loader/Loader";
import { setLocal, setSession } from "../../utils/localStorage.utils";
import { evaluateLoginAccess } from "../../utils/authAccess.utils";
import AccessDenied from "./AccessDenied";

const API = process.env.REACT_APP_API_ENDPOINT;
const HOME_URL = (process.env.REACT_APP_ADMIN_BASENAME || "") + "/";

export default function Login() {
  // The form is only rendered when the visitor arrived via the authorized
  // external link (or the gate is disabled in dev). Evaluated once on mount.
  const [accessAllowed] = useState(() => evaluateLoginAccess());

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  // Single-page login: email → Send OTP → verify OTP → password → Login.
  // The Login button stays disabled until the emailed code is verified.
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [remember, setRemember] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  // Persist only the non-sensitive user hint. localStorage when "remember me"
  // is on (survives restarts, mirroring the long-lived cookie), sessionStorage
  // otherwise (cleared on tab close). The real auth is the httpOnly cookie the
  // API set on this response.
  const storeUserHint = (user, rememberMe) => {
    if (rememberMe) setLocal("user", user);
    else setSession("user", user);
  };

  // Step 1 — email a one-time code to the account email (no password needed).
  const sendOtp = () => {
    if (!identity) {
      setErrorMsg("Enter your email first.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    setInfoMsg("");

    axios
      .post(
        urljoin(API, "/admin/login/send-otp"),
        { identity },
        { withCredentials: true },
      )
      .then((res) => {
        const data = res.data.data || {};
        setOtpSent(true);
        setOtpVerified(false);
        setOtp("");
        setInfoMsg(
          `A one-time code was sent${data.email_hint ? ` to ${data.email_hint}` : ""}.`,
        );
      })
      .catch((error) => {
        setErrorMsg(
          error?.response?.data?.message || "Could not send the code. Try again.",
        );
      })
      .finally(() => setLoading(false));
  };

  // Step 2 — verify the code (no session issued). Unlocks the Login button.
  const verifyOtp = () => {
    if (!otp) {
      setErrorMsg("Enter the code we emailed you.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    setInfoMsg("");

    axios
      .post(
        urljoin(API, "/admin/login/verify-otp"),
        { identity, otp },
        { withCredentials: true },
      )
      .then(() => {
        setOtpVerified(true);
        setInfoMsg("Code verified. Enter your password to sign in.");
      })
      .catch((error) => {
        setOtpVerified(false);
        setErrorMsg(
          error?.response?.data?.message || "Invalid or expired code.",
        );
      })
      .finally(() => setLoading(false));
  };

  // Step 3 — final sign-in with email + password + the verified OTP.
  const submitLogin = (e) => {
    e.preventDefault();
    if (!otpVerified) return;
    setLoading(true);
    setErrorMsg("");

    axios
      .post(
        urljoin(API, "/admin/login"),
        { identity, password, otp, remember: remember ? 1 : 0 },
        { withCredentials: true },
      )
      .then((res) => {
        const data = res.data.data || {};
        storeUserHint(data.user, remember);
        window.location.href = HOME_URL;
      })
      .catch((error) => {
        setErrorMsg(
          error?.response?.data?.message || "Wrong email or password",
        );
        setLoading(false);
      });
  };

  // Changing the email after a code was sent invalidates the prior code/verify
  // — reset the OTP state so the admin re-sends to the new address.
  const onIdentityChange = (value) => {
    setIdentity(value);
    if (otpSent || otpVerified) {
      setOtpSent(false);
      setOtpVerified(false);
      setOtp("");
      setInfoMsg("");
    }
  };

  // Not reached via the authorized link → show the restriction notice, never
  // the form.
  if (!accessAllowed) {
    return <AccessDenied />;
  }

  return (
    <>
      <div className="container mx-auto px-4 h-full">
        <div className="flex content-center items-center justify-center h-full">
          <div className="w-full sm:w-[70%] lg:w-[450px] px-4">
            <div className="relative overflow-hidden flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border border-gray-300">
              {loading && <Loader absolute />}

              <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
                <div className="text-blueGray-400 text-center mb-3 font-bold">
                  <small>Sign in</small>
                </div>
                {errorMsg && <Alert text={errorMsg} />}
                {!errorMsg && infoMsg && (
                  <p className="text-sm text-emerald-600 font-semibold text-center mb-3">
                    {infoMsg}
                  </p>
                )}

                <form onSubmit={submitLogin}>
                  {/* Email + Send OTP */}
                  <div className="relative w-full mb-3">
                    <label className="form_label" htmlFor="login-email">
                      Email
                    </label>
                    <div className="flex items-stretch gap-2">
                      <input
                        id="login-email"
                        name="identity"
                        type="email"
                        className="form_input flex-1 !mb-0"
                        placeholder="Email"
                        required
                        value={identity}
                        onChange={(e) => onIdentityChange(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={sendOtp}
                        disabled={loading || !identity}
                        className="whitespace-nowrap px-4 h-max rounded bg-blueGray-700 text-white text-xs font-bold uppercase active:bg-blueGray-600 disabled:opacity-50 disabled:cursor-not-allowed ease-linear transition-all duration-150"
                      >
                        {otpSent ? "Resend OTP" : "Send OTP"}
                      </button>
                    </div>
                  </div>

                  {/* OTP + Verify — appears after a code is sent */}
                  {otpSent && (
                    <div className="relative w-full mb-3">
                      <label className="form_label" htmlFor="login-otp">
                        Verification code
                      </label>
                      <div className="flex items-stretch gap-2">
                        <input
                          id="login-otp"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          className="form_input flex-1 !mb-0 tracking-widest text-center"
                          placeholder="______"
                          value={otp}
                          disabled={otpVerified}
                          onChange={(e) => setOtp(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={verifyOtp}
                          disabled={loading || otpVerified || !otp}
                          className="whitespace-nowrap px-4 rounded bg-indigo-600 text-white text-xs font-bold uppercase active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed ease-linear transition-all duration-150"
                        >
                          {otpVerified ? "Verified ✓" : "Verify"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Password */}
                  <div className="relative w-full mb-3">
                    <label className="form_label" htmlFor="login-password">
                      Password
                    </label>
                    <input
                      id="login-password"
                      type="password"
                      className="form_input"
                      placeholder="Password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        name="remember"
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="form-checkbox border-0 rounded text-blueGray-700 ml-1 w-5 h-5 ease-linear transition-all duration-150"
                      />
                      <span className="ml-2 text-sm font-semibold text-blueGray-600 select-none">
                        Remember me
                      </span>
                    </label>
                  </div>

                  <div className="text-center mt-6">
                    <button
                      className="form_button disabled:opacity-50 disabled:cursor-not-allowed"
                      type="submit"
                      disabled={loading || !otpVerified || !password}
                      title={
                        !otpVerified
                          ? "Verify the emailed code first"
                          : undefined
                      }
                    >
                      Sign In
                    </button>
                    {!otpVerified && (
                      <p className="text-xs text-blueGray-400 mt-2">
                        Verify the code emailed to you to enable sign in.
                      </p>
                    )}
                  </div>
                </form>
              </div>
            </div>
            <div className="flex flex-wrap mt-6 relative">
              <div className="w-full text-center">
                <Link to="/forgot-password" className="text-blueGray-200">
                  <small>Forgot password?</small>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
