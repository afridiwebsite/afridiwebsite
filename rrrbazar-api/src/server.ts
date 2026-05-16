console.error("!!! API SERVER FILE LOADING !!!");
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import loggerMiddleware from "./middleware/logger.middleware";
import HttpException from "./utils/HttpException.utils";
import errorMiddleware from "./middleware/error.middleware";
import userRouter from "./routes/user.route";
import adminRoute from "./routes/admin.route";
import uploadRoute from "./routes/upload.route";
import authController from "./controllers/auth.controller";
import adminController from "./controllers/admin.controller";
import { registerUserValidator } from "./middleware/validators/registerUserValidator";

const app = express();
app.use(loggerMiddleware);

app.use(cors());
// Express 5: use a regex catch-all instead of "*"
// @ts-ignore: Unreachable code error
app.options(/.*/, cors());

app.use(express.static("uploads"));
app.use(express.json({ limit: "2mb" }));
// UddoktaPay sometimes posts the webhook as application/x-www-form-urlencoded.
// Without this, req.body would be empty and the webhook handler would 400.
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

const port = Number(process.env.PORT || 3005);

// Boot-time env snapshot so we can see exactly what URLs/keys are in play
// when the payment + webhook flow runs. Keys are partially masked so the
// log can be shared without leaking the secret.
const mask = (v?: string) =>
  !v ? "<unset>" : v.length <= 8 ? "***" : v.slice(0, 4) + "…" + v.slice(-4);
console.log("[env] CLIENT_URL =", process.env.CLIENT_URL || "<unset>");
console.log("[env] API_URL    =", process.env.API_URL    || "<unset>");
console.log(
  "[env] UDDOKTAPAY_CHECKOUT_URL =",
  process.env.UDDOKTAPAY_CHECKOUT_URL || "<unset (fallback: https://pay.rrrbazar.com/api/checkout)>",
);
console.log("[env] UDDOKTAPAY_API_KEY      =", mask(process.env.UDDOKTAPAY_API_KEY));
console.log(
  "[env] webhook target          =",
  `${process.env.API_URL || "https://api.rrrbazar.com"}/api/v1/webhook`,
);

app.use(`/api/v1/`, userRouter);
app.use("/api/v1/", uploadRoute);
app.use(`/api/admin/`, adminRoute);
app.get("/api/admin/check-username/:username", adminController.checkUsername);

app.use("/api/admin/login", authController.adminLogin);

app.post("/api/v1/login", authController.userLogin);
app.post(
  "/api/v1/register",
  registerUserValidator,
  authController.userRegistration,
);
app.post("/api/v1/google-login", authController.googleLogin);
app.post("/api/v1/google-signup", authController.googleSignup);

app.all(/.*/, (req, res, next) => {
  const err = new HttpException(404, "Endpoint Not Found");
  next(err);
});


app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`🚀 Server running on ${port}`);
}).on("error", (err) => {
  console.error("LISTEN ERROR", err);
});

export default app;
