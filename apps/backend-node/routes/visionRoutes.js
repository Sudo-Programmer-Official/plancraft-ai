import express from "express";
import multer from "multer";
import path from "path";
import { requireAuth } from "../middleware/auth.js";
import { uploadBufferToStorage } from "../services/firebaseAdmin.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.VISION_MAX_UPLOAD_BYTES || 6 * 1024 * 1024), // 6MB default
  },
});

router.post("/vision/upload", requireAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: "No file provided" });
    }

    const userId = req.user?.uid || req.headers["x-user-id"] || "anon";
    const mime = req.file.mimetype || "application/octet-stream";
    const original = req.file.originalname || "upload";
    const ext = path.extname(original) || ".bin";
    const safeExt = ext.replace(/[^.\w]/g, "") || ".bin";
    const key = `vision-uploads/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`;

    const url = await uploadBufferToStorage(req.file.buffer, key, mime, true);
    return res.json({
      imageUrl: url,
      path: key,
      contentType: mime,
    });
  } catch (err) {
    console.error("❌ Vision upload failed", err);
    return res.status(500).json({ error: "Failed to upload image" });
  }
});

export default router;
