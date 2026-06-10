import axios from "axios";
import React, { useRef, useState } from "react";
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

  // Two-step flow: "credentials" → (optional) "otp" when the admin has a
  // phone on file and the API returns otp_required.
  const [step, setStep] = useState("credentials");
  const [identity, setIdentity] = useState("");
  const [remember, setRemember] = useState(false);
  const [phoneHint, setPhoneHint] = useState("");

  const passwordRef = useRef(null);
  const otpRef = useRef(null);

  // Persist only the non-sensitive user hint. localStorage when "remember me"
  // is on (survives restarts, mirroring the long-lived cookie), sessionStorage
  // otherwise (cleared on tab close). The real auth is the httpOnly cookie the
  // API set on this response.
  const storeUserHint = (user, rememberMe) => {
    if (rememberMe) setLocal("user", user);
    else setSession("user", user);
  };

  const submitCredentials = (e) => {
    e.preventDefault();
    const id = e.target.identity.value;
    const password = passwordRef.current.value;
    const rememberMe = e.target.remember.checked;

    setLoading(true);
    setErrorMsg("");
    setIdentity(id);
    setRemember(rememberMe);

    axios
      .post(
        urljoin(API, "/admin/login"),
        { identity: id, password, remember: rememberMe ? 1 : 0 },
        { withCredentials: true },
      )
      .then((res) => {
        const data = res.data.data || {};
        if (data.otp_required) {
          setPhoneHint(data.phone_hint || "");
          setStep("otp");
          setLoading(false);
          return;
        }
        storeUserHint(data.user, rememberMe);
        window.location.href = HOME_URL;
      })
      .catch((error) => {
        setErrorMsg(
          error?.response?.data?.message || "Wrong email or password",
        );
        setLoading(false);
      });
  };

  const submitOtp = (e) => {
    e.preventDefault();
    const otp = otpRef.current.value;
    setLoading(true);
    setErrorMsg("");

    axios
      .post(
        urljoin(API, "/admin/login/verify-otp"),
        { identity, otp, remember: remember ? 1 : 0 },
        { withCredentials: true },
      )
      .then((res) => {
        const data = res.data.data || {};
        storeUserHint(data.user, remember);
        window.location.href = HOME_URL;
      })
      .catch((error) => {
        setErrorMsg(
          error?.response?.data?.message || "Invalid or expired code",
        );
        setLoading(false);
      });
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
                  <small>
                    {step === "otp" ? "Enter verification code" : "Sign in"}
                  </small>
                </div>
                {errorMsg && <Alert text={errorMsg} />}

                {step === "credentials" ? (
                  <form onSubmit={submitCredentials}>
                    <div className="relative w-full mb-3">
                      <label className="form_label" htmlFor="login-email">
                        Email
                      </label>
                      <input
                        id="login-email"
                        name="identity"
                        type="email"
                        className="form_input"
                        placeholder="Email"
                        required
                        defaultValue={identity}
                      />
                    </div>

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
                        ref={passwordRef}
                      />
                    </div>
                    <div>
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          name="remember"
                          type="checkbox"
                          className="form-checkbox border-0 rounded text-blueGray-700 ml-1 w-5 h-5 ease-linear transition-all duration-150"
                        />
                        <span className="ml-2 text-sm font-semibold text-blueGray-600 select-none">
                          Remember me
                        </span>
                      </label>
                    </div>

                    <div className="text-center mt-6">
                      <button className="form_button" type="submit">
                        Sign In
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={submitOtp}>
                    <p className="text-sm text-blueGray-500 mb-3">
                      We sent a one-time code to your registered phone
                      {phoneHint ? ` (${phoneHint})` : ""}. Enter it below to
                      finish signing in.
                    </p>
                    <div className="relative w-full mb-3">
                      <label className="form_label" htmlFor="login-otp">
                        Verification code
                      </label>
                      <input
                        id="login-otp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        className="form_input tracking-widest text-center"
                        placeholder="______"
                        required
                        ref={otpRef}
                      />
                    </div>
                    <div className="text-center mt-6">
                      <button className="form_button" type="submit">
                        Verify &amp; Sign In
                      </button>
                    </div>
                    <div className="text-center mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setStep("credentials");
                          setErrorMsg("");
                        }}
                        className="text-sm text-blueGray-500 underline"
                      >
                        Back
                      </button>
                    </div>
                  </form>
                )}
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
