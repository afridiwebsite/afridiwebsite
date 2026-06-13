const express = require("express");
import multer from "multer";
import path from "path";
const router = express.Router();

// Derive a safe extension. Gallery / photo-picker files on Android often
// arrive with no extension (or a name with multiple dots), so the old
// `originalname.split(".")[1]` produced bogus names like "images-123.undefined".
// Prefer the real extension, fall back to the mimetype subtype, then ".jpg".
const safeExt = (file: any) => {
  let ext = path.extname(String(file.originalname || "")).toLowerCase();
  if (!ext || ext === ".") {
    const sub = String(file.mimetype || "").split("/")[1] || "jpg";
    ext = "." + sub;
  }
  // jpeg subtype → .jpeg is fine; strip anything non-alphanumeric (e.g.
  // "svg+xml" → "svgxml") so the filename stays clean.
  return ext.replace(/[^.a-z0-9]/g, "");
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/images/");
  },
  filename: function (req, file, cb) {
    cb(null, "images-" + Date.now() + safeExt(file));
  },
});

// Default 15 MB; override with UPLOAD_MAX_MB in .env
const UPLOAD_MAX_BYTES =
  (Number(process.env.UPLOAD_MAX_MB) || 30) * 1024 * 1024;

const imageUpload = multer({
  storage: storage,
  limits: { fileSize: UPLOAD_MAX_BYTES },
});

import uploadController from "../controllers/upload.controller";

const handleMulterError = (err: any, req: any, res: any, next: any) => {
  if (err && err.name === "MulterError") {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? `File too large. Max allowed is ${UPLOAD_MAX_BYTES / 1024 / 1024} MB.`
        : err.message || "Upload failed";
    return res
      .status(413)
      .send({ success: false, status: 413, message, data: {} });
  }
  return next(err);
};

router.post(
  "/upload/image",
  imageUpload.single("image"),
  handleMulterError,
  uploadController.uploadImage,
);
router.post(
  "/upload/icon",
  imageUpload.single("icon"),
  handleMulterError,
  uploadController.uploadIcon,
);

export default router;
