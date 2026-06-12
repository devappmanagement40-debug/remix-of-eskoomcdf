/**
 * Optimize Supabase Storage image URLs by using the render/image endpoint
 * with width, height, and format parameters for on-the-fly resizing.
 */
export function optimizeStorageUrl(
  url: string,
  width: number,
  height?: number,
  format: "webp" | "origin" = "webp"
): string {
  if (!url) return url;

  // Only transform Supabase storage URLs
  const match = url.match(
    /^(https:\/\/[^/]+\/storage\/v1\/)object\/public\/(.+?)(\?.*)?$/
  );
  if (!match) return url;

  const [, base, path] = match;
  const params = new URLSearchParams();
  params.set("width", String(width));
  if (height) params.set("height", String(height));
  if (format !== "origin") params.set("format", format);
  params.set("quality", "80");

  return `${base}render/image/public/${path}?${params.toString()}`;
}
