import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { TraitsIndexEntry } from "@normie/shared";
import { loadListingsIndex, type ListingInfo } from "../data/listings-index";
import { loadTraitsIndex } from "../data/traits-index";
import { NormieGrid } from "./NormieGrid";

export function ExplorePage() {
  const [searchParams] = useSearchParams();
  const initialId = parseInt(searchParams.get("id") ?? "", 10);
  const initialTokenId = !Number.isNaN(initialId) && initialId >= 0 && initialId <= 9999 ? initialId : null;

  const [entries, setEntries] = useState<TraitsIndexEntry[]>([]);
  const [listedMap, setListedMap] = useState<Map<number, ListingInfo>>(new Map());
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [listingsLoaded, setListingsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadTraitsIndex(), loadListingsIndex()]).then(([traits, listings]) => {
      setEntries(traits);
      setListedMap(listings.map);
      setListingsError(listings.error ?? null);
      setListingsLoaded(!listings.error);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wide">Collection Grid</h1>
        <p className="font-mono text-xs mt-1">
          All 10,000 Normies. Click any face for traits, owner, and marketplace links.
        </p>
      </div>

      {loading ? (
        <p className="font-mono text-sm">Loading index...</p>
      ) : (
        <NormieGrid
          entries={entries}
          listedMap={listedMap}
          listingsError={listingsError}
          listingsLoaded={listingsLoaded}
          initialTokenId={initialTokenId}
        />
      )}
    </div>
  );
}
