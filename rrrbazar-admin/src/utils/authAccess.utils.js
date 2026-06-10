// Gate for the pre-auth pages (login / forgot-password).
//
// The admin login form must not be a freely browsable page: typing /login,
// bookmarking it, or being bounced there by the 401 auto-redirect should NOT
// expose the form. It opens only when the visitor arrived through the
// authorized external link, which carries a secret access key:
//
//   https://<host><basename>/login?key=<REACT_APP_LOGIN_ACCESS_KEY>
//
// On a valid key we set a per-tab sessionStorage flag and strip the key from
// the URL (so it isn't bookmarked / shared / logged), so subsequent in-tab
// navigation — the OTP step, a refresh, or a post-expiry redirect back to
// /login during the same session — keeps working without re-passing the key.
//
// Env-gated: if REACT_APP_LOGIN_ACCESS_KEY is unset the gate is disabled and
// the pages behave normally (keeps local dev frictionless). Set it in prod to
// turn the gate on.

const ACCESS_KEY = process.env.REACT_APP_LOGIN_ACCESS_KEY || "";
const FLAG = "login_access_granted";

// True when the gate is switched off (no key configured).
export const isAccessGateDisabled = () => !ACCESS_KEY;

// Evaluate access on page load. Grants (and remembers) access when the URL
// carries the correct key or the tab was already granted this session.
// Returns true when the form may be shown.
export const evaluateLoginAccess = () => {
  if (!ACCESS_KEY) return true; // gate disabled

  // Already unlocked for this tab.
  try {
    if (sessionStorage.getItem(FLAG) === "1") return true;
  } catch (e) {
    /* sessionStorage unavailable — fall through to key check */
  }

  let provided = null;
  try {
    const params = new URLSearchParams(window.location.search);
    provided = params.get("key") || params.get("k");
  } catch (e) {
    provided = null;
  }

  if (provided && provided === ACCESS_KEY) {
    try {
      sessionStorage.setItem(FLAG, "1");
    } catch (e) {
      /* ignore */
    }
    // Scrub the key from the visible URL.
    try {
      const params = new URLSearchParams(window.location.search);
      params.delete("key");
      params.delete("k");
      const qs = params.toString();
      window.history.replaceState(
        {},
        "",
        window.location.pathname + (qs ? `?${qs}` : ""),
      );
    } catch (e) {
      /* ignore */
    }
    return true;
  }

  return false;
};
