import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { PixelImage, type TraitsIndexEntry } from "@normie/shared";
import type { ListingInfo } from "../data/listings-index";
import { filterTraits } from "../data/traits-index";
import { NormieDetail } from "./NormieDetail";

const GAP = 2;
const PADDING = 2;
const MIN_CELL = 36;

function useGridMetrics(containerRef: RefObject<HTMLDivElement | null>) {
  const [metrics, setMetrics] = useState({ cols: 24, cell: 40 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const width = el.clientWidth - PADDING * 2;
      const cols = Math.max(1, Math.floor((width + GAP) / (MIN_CELL + GAP)));
      const cell = Math.floor((width - (cols - 1) * GAP) / cols);
      setMetrics({ cols, cell });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  return metrics;
}

interface NormieGridProps {
  entries: TraitsIndexEntry[];
  listedMap: Map<number, ListingInfo>;
  listingsError?: string | null;
  listingsLoaded?: boolean;
  initialTokenId?: number | null;
}

export function NormieGrid({ entries, listedMap, listingsError, listingsLoaded = false, initialTokenId }: NormieGridProps) {
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState(initialTokenId != null ? String(initialTokenId) : "");
  const [listedOnly, setListedOnly] = useState(false);
  const [selected, setSelected] = useState<number | null>(initialTokenId ?? null);
  const parentRef = useRef<HTMLDivElement>(null);
  const { cols, cell } = useGridMetrics(parentRef);

  const filtered = useMemo(() => {
    let result = filterTraits(entries, {
      type: typeFilter || undefined,
      search: search || undefined,
    });
    if (listedOnly) {
      result = result.filter((e) => listedMap.has(e.id));
    }
    return result;
  }, [entries, typeFilter, search, listedOnly, listedMap]);

  const rowCount = Math.ceil(filtered.length / cols);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => cell + GAP,
    overscan: 5,
  });

  const imageSize = Math.max(16, cell - 4);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="normie-input text-xs"
          placeholder="Search ID or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="normie-input text-xs"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All types</option>
          <option value="Human">Human</option>
          <option value="Cat">Cat</option>
          <option value="Alien">Alien</option>
          <option value="Agent">Agent</option>
        </select>
        <label className="font-mono text-xs flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={listedOnly}
            onChange={(e) => setListedOnly(e.target.checked)}
            className="accent-[#1a1a1a]"
          />
          Listed on OpenSea
        </label>
        <span className="font-mono text-xs">{filtered.length} Normies</span>
        {listedMap.size > 0 && (
          <span className="font-mono text-xs text-[#48494b]">
            {listedMap.size} listed
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-[#48494b]">
        <span className="flex items-center gap-1.5">
          <span
            className="relative inline-block border border-[#48494b]/40 bg-[#e3e5e4]"
            style={{ width: 14, height: 14 }}
          />
          Not listed
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="relative inline-block ring-2 ring-[#1a1a1a] bg-[#e3e5e4]"
            style={{ width: 14, height: 14 }}
          >
            <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-[#1a1a1a]" />
          </span>
          Listed on OpenSea
        </span>
        {listingsError === "no_api_key" && (
          <span>Set OPENSEA_API_KEY for listing badges</span>
        )}
        {listingsError === "api_unavailable" && (
          <span>Listing API unavailable — redeploy with server routes enabled</span>
        )}
        {listingsError && listingsError !== "no_api_key" && listingsError !== "api_unavailable" && (
          <span>Listings unavailable</span>
        )}
      </div>

      <div
        ref={parentRef}
        className="border-2 border-[#48494b] h-[70vh] overflow-auto bg-[#f5f5f4]"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = virtualRow.index;
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  display: "grid",
                  gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
                  gap: GAP,
                  padding: PADDING,
                }}
              >
                {Array.from({ length: cols }, (_, col) => {
                  const idx = row * cols + col;
                  const entry = filtered[idx];
                  if (!entry) return <div key={col} />;
                  const listing = listedMap.get(entry.id);
                  const isListed = Boolean(listing);
                  const title = isListed
                    ? `#${entry.id} — ${entry.type} · ${listing!.price} ${listing!.currency}`
                    : `#${entry.id} — ${entry.type}`;

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      className={`normie-pixelated relative overflow-hidden bg-[#e3e5e4] hover:scale-105 transition-transform ${
                        isListed
                          ? "ring-2 ring-[#1a1a1a]"
                          : "border border-[#48494b]/40 hover:border-[#1a1a1a]"
                      }`}
                      style={{ width: cell, height: cell }}
                      onClick={() => setSelected(entry.id)}
                      title={title}
                    >
                      <PixelImage tokenId={entry.id} size={imageSize} />
                      {isListed && (
                        <span
                          className="absolute top-0 right-0 bg-[#1a1a1a]"
                          style={{ width: 6, height: 6 }}
                          aria-hidden
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {selected !== null && (
        <NormieDetail
          tokenId={selected}
          initialListing={listedMap.get(selected) ?? null}
          listingsLoaded={listingsLoaded}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
