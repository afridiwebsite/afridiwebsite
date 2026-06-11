import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import NotPermitted from "./views/auth/NotPermitted";
import { getLocal, getSession } from "./utils/localStorage.utils";
import 'react-toastify/dist/ReactToastify.css';
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./assets/styles/index.css";


// Secret admin URL prefix: when REACT_APP_ADMIN_BASENAME is set (e.g.
// "/a8f3c1"), the whole panel is served under that path so the admin URL
// can't be guessed. Unset → served at root, exactly as before. Must match
// the API's ADMIN_URL_SECRET slug.
const BASENAME = process.env.REACT_APP_ADMIN_BASENAME || "/";

const isNotPermittedPath = window.location.pathname === "/not-permitted" || window.location.pathname === "/not-permitted/";

// Is the panel running as the installed PWA (standalone display mode)?
// iOS Safari exposes navigator.standalone; everyone else reports it via the
// display-mode media query (standalone / fullscreen / minimal-ui).
const isStandalone =
  ["standalone", "fullscreen", "minimal-ui"].some(
    (mode) => window.matchMedia && window.matchMedia(`(display-mode: ${mode})`).matches
  ) || window.navigator.standalone === true;

const isLoggedIn = Boolean(getLocal("user") || getSession("user"));

if (isNotPermittedPath && isStandalone && !isLoggedIn) {
  // Inside the installed app, an unauthenticated user landing on the
  // dead-end "not permitted" page is just "not logged in yet" — send them
  // straight to login. The not-permitted page stays the behaviour for a
  // plain browser tab. replace() so it doesn't pollute history.
  const loginPath = (BASENAME === "/" ? "" : BASENAME) + "/login";
  window.location.replace(loginPath);
} else {
  ReactDOM.render(
    isNotPermittedPath ? (
      <NotPermitted />
    ) : (
      <BrowserRouter basename={BASENAME}>
        <App />
      </BrowserRouter>
    ),
    document.getElementById("root")
  );
}
