import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import 'react-toastify/dist/ReactToastify.css';
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./assets/styles/index.css";


ReactDOM.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
  document.getElementById("root")
);
