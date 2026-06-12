import https from "node:https";

export const NORMIES_CONTRACT = "0x9Eb6E2025B64f340691e424b7fe7022fFDE12438";
export const NORMIES_COLLECTION_SLUG = "normies";

export interface ListingEntry {
  price: string;
  currency: string;
}

export interface ListingsResult {
  listed: Record<string, ListingEntry>;
  fetchedAt: number;
  error?: string;
}

interface OpenSeaOrder {
  price?: {
    value?: string;
    currency?: string;
    current?: { value?: string; currency?: string };
  };
  asset?: {
    identifier?: string;
  };
  protocol_data?: {
    parameters?: {
      offer?: { identifierOrCriteria?: string }[];
    };
  };
}

let cache: { result: ListingsResult; expiresAt: number } | null = null;
const TTL_MS = 10 * 60 * 1000;

function openSeaGet<T>(url: string, apiKey: string): Promise<{ ok: boolean; status: number; data: T }> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const req = https.request(
      {
        hostname: target.hostname,
        path: target.pathname + target.search,
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-API-KEY": apiKey,
          "User-Agent": "NormieHub/1.0",
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const status = res.statusCode ?? 502;
          const body = Buffer.concat(chunks as Uint8Array[]).toString("utf8");
          try {
            resolve({
              ok: status >= 200 && status < 300,
              status,
              data: JSON.parse(body) as T,
            });
          } catch (err) {
            reject(err);
          }
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

function extractPrice(order: OpenSeaOrder): { value: string; currency: string } | null {
  const current = order.price?.current;
  if (current?.value) {
    return { value: current.value, currency: current.currency ?? "ETH" };
  }
  if (order.price?.value) {
    return { value: order.price.value, currency: order.price.currency ?? "ETH" };
  }
  return null;
}

function extractTokenId(order: OpenSeaOrder): string | null {
  return (
    order.asset?.identifier ??
    order.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria ??
    null
  );
}

function addListing(
  listed: Record<string, ListingEntry>,
  tokenId: string,
  price: { value: string; currency: string },
) {
  try {
    const wei = BigInt(price.value);
    const eth = Number(wei) / 1e18;
    const existing = listed[tokenId];
    if (!existing || parseFloat(existing.price) > eth) {
      listed[tokenId] = { price: eth.toFixed(4), currency: price.currency };
    }
  } catch {
    /* skip malformed price */
  }
}

export async function fetchAllListings(apiKey: string | undefined): Promise<ListingsResult> {
  if (!apiKey) {
    return { listed: {}, fetchedAt: Date.now(), error: "no_api_key" };
  }

  if (cache && Date.now() < cache.expiresAt) {
    return cache.result;
  }

  const listed: Record<string, ListingEntry> = {};
  let next: string | undefined;

  try {
    do {
      const url = new URL(
        `https://api.opensea.io/api/v2/listings/collection/${NORMIES_COLLECTION_SLUG}/all`,
      );
      url.searchParams.set("limit", "100");
      if (next) url.searchParams.set("next", next);

      const response = await openSeaGet<{
        listings?: OpenSeaOrder[];
        next?: string;
      }>(url.toString(), apiKey);

      if (!response.ok) {
        if (Object.keys(listed).length > 0) break;
        return {
          listed,
          fetchedAt: Date.now(),
          error: `opensea_${response.status}`,
        };
      }

      for (const order of response.data.listings ?? []) {
        const tokenId = extractTokenId(order);
        const price = extractPrice(order);
        if (!tokenId || !price) continue;
        addListing(listed, tokenId, price);
      }

      next = response.data.next;
    } while (next);

    const result: ListingsResult = { listed, fetchedAt: Date.now() };
    if (Object.keys(listed).length > 0) {
      cache = { result, expiresAt: Date.now() + TTL_MS };
    }
    return result;
  } catch {
    return { listed, fetchedAt: Date.now(), error: "fetch_failed" };
  }
}

export async function fetchTokenListing(
  apiKey: string | undefined,
  tokenId: string,
): Promise<ListingEntry | null> {
  if (!apiKey) return null;

  try {
    const url = `https://api.opensea.io/api/v2/listings/collection/${NORMIES_COLLECTION_SLUG}/nfts/${tokenId}/best`;
    const response = await openSeaGet<OpenSeaOrder & { errors?: string[] }>(url, apiKey);
    if (!response.ok) return null;

    const data = response.data;
    if (data.errors?.length) return null;

    const price = extractPrice(data);
    if (!price) return null;

    const wei = BigInt(price.value);
    const eth = Number(wei) / 1e18;
    return { price: eth.toFixed(4), currency: price.currency };
  } catch {
    return null;
  }
}
