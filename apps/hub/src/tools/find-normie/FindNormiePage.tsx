import { useState } from "react";
import {
  downloadBlob,
  exportPixelPng,
  fetchPixelsBatch,
  getPixels,
  loadImageDataFromFile,
  loadImageDataFromUrl,
  loadXProfilePixels,
  normalizeXHandle,
  NORMIE_TYPES,
  photoToNormiePixels,
  pixelsToDataUrl,
  rankPixelMatches,
  sampleNormieIds,
  type NormieMatch,
  PixelImage,
} from "@normie/shared";
import { loadTraitsIndex } from "../../data/traits-index";
import { audioManager } from "../../audio/audioManager";

type Source = "x" | "file" | "url";

const SEARCH_SIZES = { quick: 200, deep: 800 } as const;

export function FindNormiePage() {
  const [source, setSource] = useState<Source>("x");
  const [handle, setHandle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [depth, setDepth] = useState<keyof typeof SEARCH_SIZES>("quick");
  const [userPixels, setUserPixels] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [matches, setMatches] = useState<NormieMatch[]>([]);
  const [progress, setProgress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const convertFromPixels = (binary: string) => {
    setUserPixels(binary);
    setPreview(pixelsToDataUrl(binary, 160));
    setMatches([]);
    setError("");
  };

  const convertX = async () => {
    const clean = normalizeXHandle(handle);
    if (!clean) {
      setError("Enter your X handle");
      return;
    }
    setLoading(true);
    try {
      const binary = await loadXProfilePixels(clean);
      convertFromPixels(binary);
    } catch {
      setError("Could not load X profile");
    } finally {
      setLoading(false);
    }
  };

  const convertUrl = async () => {
    if (!imageUrl.trim()) {
      setError("Enter an image URL");
      return;
    }
    setLoading(true);
    try {
      const data = await loadImageDataFromUrl(imageUrl.trim());
      convertFromPixels(photoToNormiePixels(data));
    } catch {
      setError("Could not load image URL");
    } finally {
      setLoading(false);
    }
  };

  const convertFile = async (file: File) => {
    setLoading(true);
    try {
      const data = await loadImageDataFromFile(file);
      convertFromPixels(photoToNormiePixels(data));
    } catch {
      setError("Could not read file");
    } finally {
      setLoading(false);
    }
  };

  const search = async () => {
    if (!userPixels) {
      setError("Convert a photo first");
      return;
    }
    setLoading(true);
    setError("");
    setMatches([]);
    try {
      const index = await loadTraitsIndex();
      const pool = typeFilter ? index.filter((e) => e.type === typeFilter).map((e) => e.id) : undefined;
      const sampleCount = SEARCH_SIZES[depth];
      const ids = sampleNormieIds(sampleCount, pool);
      setProgress(`Scanning 0 / ${ids.length}…`);

      const candidates = new Map<number, string>();
      const batchSize = 24;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const batchMap = await fetchPixelsBatch(batch, getPixels, batchSize);
        for (const [id, px] of batchMap) candidates.set(id, px);
        setProgress(`Scanning ${Math.min(i + batchSize, ids.length)} / ${ids.length}…`);
      }

      const ranked = rankPixelMatches(userPixels, candidates, 12);
      setMatches(ranked);
      setProgress("");
      audioManager.playSfx("uiClick");
    } catch {
      setError("Search failed — try again");
      setProgress("");
    } finally {
      setLoading(false);
    }
  };

  const exportMatch = async (id: number) => {
    try {
      const px = await getPixels(id);
      const blob = await exportPixelPng({ pixels: px, size: 400 });
      downloadBlob(blob, `normie-${id}.png`);
    } catch {
      setError("Export failed");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wide">Find My Normie</h1>
        <p className="font-mono text-xs mt-1 text-[#48494b]">
          Convert your face to pixels, then scan the collection for your closest on-chain match.
        </p>
      </div>

      <div className="normie-card space-y-4">
        <div className="flex gap-1">
          {(["x", "file", "url"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSource(s)}
              className={`normie-btn text-[10px] px-3 py-1 uppercase ${
                source === s ? "bg-[#48494b] text-[#e3e5e4]" : "normie-btn-outline"
              }`}
            >
              {s === "x" ? "X profile" : s}
            </button>
          ))}
        </div>

        {source === "x" && (
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@handle"
            className="w-full border-2 border-[#48494b] px-3 py-2 font-mono text-sm"
          />
        )}
        {source === "url" && (
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
            className="w-full border-2 border-[#48494b] px-3 py-2 font-mono text-sm"
          />
        )}
        {source === "file" && (
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && void convertFile(e.target.files[0])}
            className="font-mono text-xs"
          />
        )}

        {source !== "file" && (
          <button
            type="button"
            className="normie-btn text-xs"
            onClick={source === "x" ? convertX : convertUrl}
            disabled={loading}
          >
            {loading ? "Converting…" : "Convert to Normie"}
          </button>
        )}

        {preview && userPixels && (
          <div className="flex gap-4 items-center">
            <img
              src={preview}
              alt="Your pixel self"
              className="normie-pixelated border-2 border-[#48494b] w-24 h-24 bg-[#e3e5e4]"
            />
            <p className="font-mono text-xs text-[#48494b]">40×40 pixel portrait ready</p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block space-y-1">
            <span className="font-mono text-[10px] uppercase text-[#48494b]">Type filter</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full border-2 border-[#48494b] px-3 py-2 font-mono text-sm bg-white"
            >
              <option value="">All types</option>
              {NORMIE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="font-mono text-[10px] uppercase text-[#48494b]">Search depth</span>
            <select
              value={depth}
              onChange={(e) => setDepth(e.target.value as keyof typeof SEARCH_SIZES)}
              className="w-full border-2 border-[#48494b] px-3 py-2 font-mono text-sm bg-white"
            >
              <option value="quick">Quick (~200)</option>
              <option value="deep">Deep (~800)</option>
            </select>
          </label>
        </div>

        <button type="button" className="normie-btn text-xs" onClick={search} disabled={loading || !userPixels}>
          {loading ? progress || "Searching…" : "Find closest Normies"}
        </button>
        {error && <p className="font-mono text-xs text-red-700">{error}</p>}
      </div>

      {matches.length > 0 && (
        <ol className="space-y-2">
          {matches.map((m, i) => (
            <li key={m.id} className="normie-card py-3 px-4 flex gap-3 items-center">
              <span className="font-mono text-xs w-6 text-[#48494b]">{i + 1}</span>
              <PixelImage tokenId={m.id} size={56} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">Normie #{m.id}</p>
                <p className="font-mono text-[10px] text-[#48494b]">
                  {Math.round(m.score * 100)}% match · {m.distance} pixel diff
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <a href={`/explore?id=${m.id}`} className="normie-btn normie-btn-outline text-[10px] px-2 py-1">
                  View
                </a>
                <button
                  type="button"
                  className="normie-btn text-[10px] px-2 py-1"
                  onClick={() => void exportMatch(m.id)}
                >
                  PNG
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
