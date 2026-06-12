import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchTokenListing } from "../../apps/hub/lib/opensea-listings";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const tokenId = req.query.tokenId as string;
  if (!tokenId) {
    return res.status(400).json({ error: "tokenId required" });
  }

  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) {
    return res.status(404).json({ error: "No listing API configured" });
  }

  const listing = await fetchTokenListing(apiKey, tokenId);
  if (!listing) {
    return res.status(404).json({ error: "Not listed" });
  }

  return res.status(200).json(listing);
}
