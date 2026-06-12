import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const handle = req.query.handle;
  const username = Array.isArray(handle) ? handle[0] : handle;
  if (!username) {
    return res.status(400).json({ error: "handle required" });
  }

  const url = `https://unavatar.io/x/${encodeURIComponent(username)}`;

  try {
    const upstream = await fetch(url, { redirect: "follow" });
    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const body = Buffer.from(await upstream.arrayBuffer());
    return res.status(upstream.status).send(body);
  } catch {
    return res.status(502).json({ error: "X avatar unavailable" });
  }
}
