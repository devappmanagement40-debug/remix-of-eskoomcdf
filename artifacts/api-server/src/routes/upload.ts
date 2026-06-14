import { Router } from "express";

const router = Router();

const SUPABASE_URL = process.env.VITE_SUPABASE_PROJECT_URL;

async function getServiceKey(): Promise<string | null> {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

async function ensureBucket(supabaseUrl: string, serviceKey: string, bucket: string) {
  const res = await fetch(`${supabaseUrl}/storage/v1/bucket/${bucket}`, {
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
  });
  if (!res.ok) {
    await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: bucket, name: bucket, public: true }),
    });
  }
}

router.post("/upload", async (req, res) => {
  const { base64, mimeType, fileName, bucket = "site-assets" } = req.body;

  if (!base64 || !mimeType || !fileName) {
    return res.status(400).json({ error: "base64, mimeType and fileName are required" });
  }

  if (!SUPABASE_URL) {
    return res.status(500).json({ error: "VITE_SUPABASE_PROJECT_URL not configured" });
  }

  const serviceKey = await getServiceKey();
  if (!serviceKey) {
    return res.status(500).json({
      error: "SUPABASE_SERVICE_ROLE_KEY not configured. Please add it to your Replit secrets.",
    });
  }

  try {
    const buffer = Buffer.from(base64, "base64");
    const ext = fileName.split(".").pop()?.toLowerCase() || "bin";
    const uniquePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    await ensureBucket(SUPABASE_URL, serviceKey, bucket);

    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${bucket}/${uniquePath}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          "Content-Type": mimeType,
          "x-upsert": "true",
        },
        body: buffer,
      }
    );

    if (!uploadRes.ok) {
      const errData = await uploadRes.json().catch(() => ({}));
      return res.status(500).json({ error: (errData as any).message || "Upload failed" });
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${uniquePath}`;
    return res.json({ ok: true, url: publicUrl });
  } catch (err: any) {
    req.log.error(err);
    return res.status(500).json({ error: err.message || "Upload failed" });
  }
});

export default router;
