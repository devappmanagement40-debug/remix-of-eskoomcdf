import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

const ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
  "image/svg+xml", "image/avif", "image/bmp", "image/tiff",
];

function getUploadsDir(): string {
  if (process.env.UPLOAD_DIR) return process.env.UPLOAD_DIR;
  const cwd = process.cwd();
  // When running from artifacts/api-server, go up two levels to repo root
  const fromApiServer = path.resolve(cwd, "../..", "public", "uploads");
  if (fs.existsSync(path.resolve(cwd, "../..", "public"))) return fromApiServer;
  // When running from repo root (production)
  return path.resolve(cwd, "public", "uploads");
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

router.post("/upload", async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ error: "base64, mimeType et fileName sont requis" });
  }

  const { base64, mimeType, fileName, bucket = "site-assets" } = req.body;

  if (!base64 || !mimeType || !fileName) {
    return res.status(400).json({ error: "base64, mimeType et fileName sont requis" });
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return res.status(400).json({ error: `Type de fichier non supporté: ${mimeType}. Types acceptés: JPEG, PNG, GIF, WebP, SVG, AVIF, BMP, TIFF` });
  }

  try {
    const buffer = Buffer.from(base64, "base64");

    if (buffer.length > 20 * 1024 * 1024) {
      return res.status(400).json({ error: "Fichier trop volumineux. Maximum 20 MB." });
    }

    const ext = (fileName.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const uploadsDir = getUploadsDir();
    const bucketDir = path.join(uploadsDir, bucket);
    ensureDir(bucketDir);

    const filePath = path.join(bucketDir, uniqueName);
    fs.writeFileSync(filePath, buffer);

    const url = `/uploads/${bucket}/${uniqueName}`;
    console.log(`[upload] ✅ Saved: ${url} (${buffer.length} bytes)`);
    return res.json({ ok: true, url });
  } catch (err: any) {
    console.error("[upload] Error:", err?.message);
    return res.status(500).json({ error: err.message || "Échec de l'upload" });
  }
});

export default router;
