export interface ListingInfo {
  price: string;
  currency: string;
}

export interface ListingsIndex {
  map: Map<number, ListingInfo>;
  error?: string;
}

let cache: ListingsIndex | null = null;

export async function loadListingsIndex(): Promise<ListingsIndex> {
  if (cache) return cache;

  try {
    const res = await fetch("/api/listings");
    const contentType = res.headers.get("content-type") ?? "";
    if (!res.ok || !contentType.includes("application/json")) {
      return { map: new Map(), error: "api_unavailable" };
    }

    const data = (await res.json()) as {
      listed?: Record<string, ListingInfo>;
      error?: string;
    };

    const map = new Map<number, ListingInfo>();
    for (const [id, entry] of Object.entries(data.listed ?? {})) {
      map.set(Number(id), entry);
    }

    const result = { map, error: data.error };
    if (!data.error && map.size > 0) {
      cache = result;
    }
    return result;
  } catch {
    return { map: new Map(), error: "fetch_failed" };
  }
}
