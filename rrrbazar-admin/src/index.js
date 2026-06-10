import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import 'react-toastify/dist/ReactToastify.css';
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./assets/styles/index.css";


// Secret admin URL prefix: when REACT_APP_ADMIN_BASENAME is set (e.g.
// "/a8f3c1"), the whole panel is served under that path so the admin URL
// can't be guessed. Unset → served at root, exactly as before. Must match
// the API's ADMIN_URL_SECRET slug.
const BASENAME = process.env.REACT_APP_ADMIN_BASENAME || "/";

ReactDOM.render(
  <BrowserRouter basename={BASENAME}>
    <App />
  </BrowserRouter>,
  document.getElementById("root")
);
