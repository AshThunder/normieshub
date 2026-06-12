import type { VercelRequest, VercelResponse } from "@vercel/node";

const UPSTREAM = "https://api.normies.art";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const segments = req.query.path;
  const path = Array.isArray(segments) ? segments.join("/") : (segments ?? "");
  if (!path) {
    return res.status(400).json({ error: "path required" });
  }

  const url = `${UPSTREAM}/${path}`;

  try {
    const upstream = await fetch(url, {
      headers: {
        Accept: req.headers.accept ?? "*/*",
        "User-Agent": "NormieHub/1.0 (+https://normieshub.vercel.app)",
      },
    });

    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    const cache = upstream.headers.get("cache-control");
    if (cache) res.setHeader("Cache-Control", cache);

    const body = Buffer.from(await upstream.arrayBuffer());
    return res.status(upstream.status).send(body);
  } catch {
    return res.status(502).json({ error: "Normies API unavailable" });
  }
}
