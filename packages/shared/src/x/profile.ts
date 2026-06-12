import { loadImageDataFromUrl, photoToNormiePixels } from "../pixel/render";

export function normalizeXHandle(handle: string): string {
  return handle.trim().replace(/^@/, "").split("/").pop()?.split("?")[0] ?? "";
}

/** Same-origin proxy avoids CORS when loading X profile photos. */
export function xAvatarProxyUrl(handle: string): string {
  const clean = normalizeXHandle(handle);
  if (!clean) throw new Error("X handle required");
  return `/api/x-avatar/${encodeURIComponent(clean)}`;
}

const UNAVATAR_BASES = ["https://unavatar.io/x", "https://unavatar.io/twitter"] as const;

async function fetchUnavatarBlob(handle: string): Promise<Blob> {
  let lastError: Error | null = null;
  for (const base of UNAVATAR_BASES) {
    try {
      const res = await fetch(`${base}/${encodeURIComponent(handle)}`, { redirect: "follow" });
      if (!res.ok) {
        lastError = new Error(`unavatar ${res.status}`);
        continue;
      }
      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) {
        lastError = new Error("not an image");
        continue;
      }
      return blob;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error("fetch failed");
    }
  }
  throw lastError ?? new Error("X avatar unavailable");
}

async function loadAvatarImageData(handle: string): Promise<ImageData> {
  const clean = normalizeXHandle(handle);
  try {
    return await loadImageDataFromUrl(xAvatarProxyUrl(clean));
  } catch {
    const blob = await fetchUnavatarBlob(clean);
    const objectUrl = URL.createObjectURL(blob);
    try {
      return await loadImageDataFromUrl(objectUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

export async function loadXProfilePixels(handle: string): Promise<string> {
  const data = await loadAvatarImageData(handle);
  return photoToNormiePixels(data);
}
