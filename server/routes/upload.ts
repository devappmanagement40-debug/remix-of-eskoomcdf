import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const UPLOADS_DIR = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "public/uploads");

function useSupabase() {
  return !!(SUPABASE_URL && SUPABASE_SERVICE_KEY);
}

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

async function ensureBucketPublic(supabase: ReturnType<typeof createClient>, bucket: string) {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b: any) => b.name === bucket);
  if (!exists) {
    await supabase.storage.createBucket(bucket, { public: true });
  }
}

function ensureLocalDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

router.post("/upload", async (req, res) => {
  if (!req.body) return res.status(400).json({ error: "base64, mimeType and fileName are required" });
  const { base64, mimeType, fileName, bucket = "site-assets" } = req.body;

  if (!base64 || !mimeType || !fileName) {
    return res.status(400).json({ error: "base64, mimeType and fileName are required" });
  }

  const buffer = Buffer.from(base64, "base64");
  const ext = fileName.split(".").pop()?.toLowerCase() || "bin";
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  try {
    if (useSupabase()) {
      const supabase = getSupabase();
      await ensureBucketPublic(supabase, bucket);

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(uniqueName, buffer, { contentType: mimeType, upsert: false });

      if (uploadError) {
        console.error("[upload] Supabase Storage error:", uploadError.message);
        return res.status(500).json({ error: uploadError.message || "Upload failed" });
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(uniqueName);
      return res.json({ ok: true, url: data.publicUrl });
    } else {
      const bucketDir = path.join(UPLOADS_DIR, bucket);
      ensureLocalDir(bucketDir);
      fs.writeFileSync(path.join(bucketDir, uniqueName), buffer);
      return res.json({ ok: true, url: `/uploads/${bucket}/${uniqueName}` });
    }
  } catch (err: any) {
    console.error("[upload] Error:", err?.message);
    return res.status(500).json({ error: err.message || "Upload failed" });
  }
});

export default router;
