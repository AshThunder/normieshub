import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  burnedNormieImageUrl,
  etherscanAddressUrl,
  getCanvasInfo,
  getMetadata,
  getOwner,
  normieImageUrl,
  openSeaUrl,
  PixelImage,
  TraitBadge,
} from "@normie/shared";
import type { ListingInfo } from "../data/listings-index";

interface NormieDetailProps {
  tokenId: number;
  onClose: () => void;
  initialListing?: ListingInfo | null;
  listingsLoaded?: boolean;
}

export function NormieDetail({ tokenId, onClose, initialListing, listingsLoaded = false }: NormieDetailProps) {
  const [metadata, setMetadata] = useState<Awaited<ReturnType<typeof getMetadata>> | null>(null);
  const [owner, setOwner] = useState<string | null | undefined>(undefined);
  const [canvas, setCanvas] = useState<Awaited<ReturnType<typeof getCanvasInfo>> | null>(null);
  const [listing, setListing] = useState<ListingInfo | null>(initialListing ?? null);
  const [burned, setBurned] = useState(false);

  useEffect(() => {
    setMetadata(null);
    setOwner(undefined);
    setListing(initialListing ?? null);
    setBurned(false);

    Promise.all([
      getMetadata(tokenId).then(setMetadata).catch(() => null),
      getOwner(tokenId).then((o) => setOwner(o?.owner ?? null)),
      getCanvasInfo(tokenId).then(setCanvas).catch(() => null),
      ...(listingsLoaded
        ? []
        : [
            fetch(`/api/listing?tokenId=${tokenId}`)
              .then((r) => (r.ok ? r.json() : null))
              .then((d) => d && setListing(d)),
          ]),
    ]);
  }, [tokenId, initialListing, listingsLoaded]);

  useEffect(() => {
    if (owner === null) setBurned(true);
  }, [owner]);

  const traits = metadata?.attributes.filter(
    (a) => !a.display_type && a.trait_type !== "Customized",
  ) ?? [];

  const level = metadata?.attributes.find((a) => a.trait_type === "Level")?.value;
  const pixelCount = metadata?.attributes.find((a) => a.trait_type === "Pixel Count")?.value;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="normie-card max-w-md w-full max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex justify-between items-start">
          <h2 className="font-bold text-lg">Normie #{tokenId}</h2>
          <button type="button" className="normie-btn text-xs" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="flex justify-center">
          <PixelImage
            tokenId={tokenId}
            size={200}
            src={burned ? burnedNormieImageUrl(tokenId) : undefined}
          />
        </div>

        {burned && <span className="normie-badge bg-red-800 text-white">Burned</span>}

        <div className="flex flex-wrap gap-1">
          {traits.map((t) => (
            <TraitBadge key={t.trait_type} label={t.trait_type} value={String(t.value)} />
          ))}
        </div>

        {(level !== undefined || pixelCount !== undefined) && (
          <p className="font-mono text-xs">
            Level: {level ?? "—"} · Pixels: {pixelCount ?? "—"}
            {canvas?.customized && " · Customized"}
          </p>
        )}

        {owner && owner !== null && (
          <p className="font-mono text-xs break-all">
            Owner:{" "}
            <a href={etherscanAddressUrl(owner)} target="_blank" rel="noreferrer" className="underline">
              {owner.slice(0, 6)}...{owner.slice(-4)}
            </a>
          </p>
        )}

        {listing?.price && (
          <p className="font-mono text-sm font-bold">
            Listed: {listing.price} {listing.currency ?? "ETH"}
          </p>
        )}

        <a
          href={openSeaUrl(tokenId)}
          target="_blank"
          rel="noreferrer"
          className="normie-btn normie-btn-outline inline-block text-xs"
        >
          View on OpenSea
        </a>

        <div className="flex flex-wrap gap-2">
          <a
            href={normieImageUrl(tokenId)}
            download={`normie-${tokenId}.png`}
            className="normie-btn text-xs"
          >
            Download PNG
          </a>
          <Link to={`/games/slingshot?id=${tokenId}`} className="normie-btn normie-btn-outline text-xs">
            Slingshot
          </Link>
          <Link to={`/games/runner?id=${tokenId}`} className="normie-btn normie-btn-outline text-xs">
            Runner
          </Link>
          <Link to={`/games/penalty?id=${tokenId}`} className="normie-btn normie-btn-outline text-xs">
            Penalty
          </Link>
          <Link to={`/games/defense?id=${tokenId}`} className="normie-btn normie-btn-outline text-xs">
            Defense
          </Link>
          <Link to={`/games/snake?id=${tokenId}`} className="normie-btn normie-btn-outline text-xs">
            Snake
          </Link>
        </div>
      </div>
    </div>
  );
}
