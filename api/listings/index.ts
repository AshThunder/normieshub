import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchAllListings } from "../../apps/hub/lib/opensea-listings";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const result = await fetchAllListings(process.env.OPENSEA_API_KEY);
  res.setHeader("Cache-Control", "public, max-age=300");
  return res.status(200).json(result);
}
