import { Router } from "express";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(__dirname, "../../public/uploads");

router.post("/upload", async (req, res) => {
  if (!req.body) return res.status(400).json({ error: "base64, mimeType and fileName are required" });
  const { base64, mimeType, fileName } = req.body;

  if (!base64 || !mimeType || !fileName) {
    return res.status(400).json({ error: "base64, mimeType and fileName are required" });
  }

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });

    const buffer = Buffer.from(base64, "base64");
    const ext = fileName.split(".").pop()?.toLowerCase() || "bin";
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);

    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/${uniqueName}`;
    return res.json({ ok: true, url: publicUrl });
  } catch (err: any) {
    req.log.error(err);
    return res.status(500).json({ error: err.message || "Upload failed" });
  }
});

export default router;
