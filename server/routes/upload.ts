import { Router } from "express";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const router = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "public/uploads");

const ALLOWED_MIME = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
  "image/svg+xml", "image/bmp", "image/tiff", "image/avif", "image/heic",
  "application/pdf",
]);

router.post("/upload", async (req, res) => {
  if (!req.body) return res.status(400).json({ error: "base64, mimeType et fileName sont requis" });
  const { base64, mimeType, fileName, bucket = "site-assets" } = req.body;

  if (!base64 || !mimeType || !fileName) {
    return res.status(400).json({ error: "base64, mimeType et fileName sont requis" });
  }

  if (!ALLOWED_MIME.has(mimeType)) {
    return res.status(400).json({ error: `Type de fichier non autorisé: ${mimeType}` });
  }

  try {
    const buffer = Buffer.from(base64, "base64");

    if (buffer.length > 20 * 1024 * 1024) {
      return res.status(413).json({ error: "Fichier trop volumineux (max 20 Mo)" });
    }

    const ext = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const safeBucket = (bucket as string).replace(/[^a-zA-Z0-9_-]/g, "");
    const bucketDir = path.join(UPLOAD_DIR, safeBucket);
    await mkdir(bucketDir, { recursive: true });

    const filePath = path.join(bucketDir, uniqueName);
    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/${safeBucket}/${uniqueName}`;
    return res.json({ ok: true, url: publicUrl });
  } catch (err: any) {
    req.log?.error(err);
    console.error("[upload]", err?.message ?? err);
    return res.status(500).json({ error: err.message || "Upload échoué" });
  }
});

export default router;
