import { loadEnv } from "vite";
import { fetchAllListings, fetchTokenListing } from "../lib/opensea-listings";

const env = loadEnv("development", process.cwd(), "");
const mode = process.argv[2];

if (mode === "all") {
  const result = await fetchAllListings(env.OPENSEA_API_KEY);
  process.stdout.write(JSON.stringify(result));
} else if (mode === "one") {
  const tokenId = process.argv[3];
  if (!tokenId) process.exit(1);
  const result = await fetchTokenListing(env.OPENSEA_API_KEY, tokenId);
  process.stdout.write(JSON.stringify(result));
} else {
  process.exit(1);
}
