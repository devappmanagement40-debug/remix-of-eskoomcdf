import { Router } from "express";
import fs from "node:fs";
import path from "node:path";

const router = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");

function ensureUploadDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

router.post("/upload", async (req, res) => {
  if (!req.body) return res.status(400).json({ error: "base64, mimeType and fileName are required" });
  const { base64, mimeType, fileName, bucket = "site-assets" } = req.body;

  if (!base64 || !mimeType || !fileName) {
    return res.status(400).json({ error: "base64, mimeType and fileName are required" });
  }

  try {
    const buffer = Buffer.from(base64, "base64");
    const ext = fileName.split(".").pop()?.toLowerCase() || "bin";
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const bucketDir = path.join(UPLOAD_DIR, bucket);
    ensureUploadDir(bucketDir);

    const filePath = path.join(bucketDir, uniqueName);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${bucket}/${uniqueName}`;
    return res.json({ ok: true, url: publicUrl });
  } catch (err: any) {
    req.log.error(err);
    return res.status(500).json({ error: err.message || "Upload failed" });
  }
});

export default router;
