import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { getSecret } from "../secrets";

const router = Router();

function getSupabase() {
  const url = getSecret("SUPABASE_URL");
  const key = getSecret("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function ensureBucketPublic(supabase: ReturnType<typeof createClient>, bucket: string) {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b: any) => b.name === bucket);
  if (!exists) {
    await supabase.storage.createBucket(bucket, { public: true });
  }
}

router.post("/upload", async (req, res) => {
  if (!req.body) return res.status(400).json({ error: "base64, mimeType and fileName are required" });
  const { base64, mimeType, fileName, bucket = "site-assets" } = req.body;

  if (!base64 || !mimeType || !fileName) {
    return res.status(400).json({ error: "base64, mimeType and fileName are required" });
  }

  try {
    const supabase = getSupabase();
    await ensureBucketPublic(supabase, bucket);

    const buffer = Buffer.from(base64, "base64");
    const ext = fileName.split(".").pop()?.toLowerCase() || "bin";
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = `${uniqueName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, { contentType: mimeType, upsert: false });

    if (uploadError) {
      console.error("[upload] Supabase Storage error:", uploadError.message);
      return res.status(500).json({ error: uploadError.message || "Upload failed" });
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return res.json({ ok: true, url: data.publicUrl });
  } catch (err: any) {
    console.error("[upload] Error:", err?.message);
    return res.status(500).json({ error: err.message || "Upload failed" });
  }
});

export default router;
