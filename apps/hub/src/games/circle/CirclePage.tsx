import { useState } from "react";
import {
  downloadBlob,
  exportCirclePng,
  loadImageDataFromFile,
  loadXProfilePixels,
  normalizeXHandle,
  photoToNormiePixels,
  randomNormieIds,
  CIRCLE_NORMIE_COUNT,
} from "@normie/shared";
import { audioManager } from "../../audio/audioManager";
import { CirclePreview } from "./CirclePreview";

export function CirclePage() {
  const [handle, setHandle] = useState("");
  const [userPixels, setUserPixels] = useState<string | null>(null);
  const [normieIds, setNormieIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const generate = async (pixels?: string) => {
    setLoading(true);
    setError("");
    try {
      const clean = normalizeXHandle(handle);
      let resolved = pixels;
      if (!resolved) {
        if (!clean) {
          setError("Enter your X handle or upload a photo");
          return;
        }
        resolved = await loadXProfilePixels(clean);
      }
      setUserPixels(resolved);
      setNormieIds(randomNormieIds(CIRCLE_NORMIE_COUNT));
      audioManager.playSfx("uiClick");
    } catch {
      setError("Could not load profile — check the handle or try a photo upload");
    } finally {
      setLoading(false);
    }
  };

  const shuffleNormies = () => {
    setNormieIds(randomNormieIds(CIRCLE_NORMIE_COUNT));
    audioManager.playSfx("uiClick");
  };

  const handleFile = async (file: File) => {
    setLoading(true);
    setError("");
    try {
      const data = await loadImageDataFromFile(file);
      await generate(photoToNormiePixels(data));
    } catch {
      setError("Could not process image");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!userPixels) return;
    setExporting(true);
    try {
      const blob = await exportCirclePng({
        userPixels,
        normieIds,
        handle: normalizeXHandle(handle) || undefined,
        size: 1200,
      });
      const name = normalizeXHandle(handle) || "normie";
      downloadBlob(blob, `normie-circle-${name}.png`);
      audioManager.playSfx("uiClick");
    } catch {
      setError("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const shareText = encodeURIComponent(
    `My Normie Circle — pixel me surrounded by ${CIRCLE_NORMIE_COUNT} on-chain Normies. normies.art`,
  );

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wide">Normie Circle</h1>
        <p className="font-mono text-xs mt-1">
          Your pixel self at the center, surrounded by {CIRCLE_NORMIE_COUNT} random Normies — like an X
          interaction circle, but on-chain.
        </p>
      </div>

      <div className="normie-card space-y-3">
        <label className="font-mono text-xs uppercase">X handle</label>
        <div className="flex gap-2">
          <input
            className="normie-input flex-1"
            placeholder="@yourhandle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void generate()}
          />
          <button type="button" className="normie-btn" onClick={() => void generate()} disabled={loading}>
            {loading ? "…" : "Generate"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase text-[#48494b]">or</span>
          <input
            type="file"
            accept="image/*"
            className="font-mono text-xs flex-1"
            onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])}
          />
        </div>
        {error && <p className="text-red-600 text-xs font-mono">{error}</p>}
      </div>

      {userPixels && (
        <>
          <CirclePreview
            userPixels={userPixels}
            normieIds={normieIds}
            handle={normalizeXHandle(handle) || undefined}
          />

          <div className="flex flex-wrap gap-2 justify-center">
            <button type="button" className="normie-btn" onClick={() => void handleDownload()} disabled={exporting}>
              {exporting ? "Exporting…" : "Download PNG"}
            </button>
            <button type="button" className="normie-btn normie-btn-outline" onClick={shuffleNormies}>
              Shuffle Normies
            </button>
            <a
              href={`https://twitter.com/intent/tweet?text=${shareText}`}
              target="_blank"
              rel="noreferrer"
              className="normie-btn normie-btn-outline inline-block"
            >
              Share on X
            </a>
          </div>

          <p className="font-mono text-[10px] text-center text-[#48494b]">
            Normies: {normieIds.slice(0, 5).map((id) => `#${id}`).join(", ")}
            {normieIds.length > 5 ? ` +${normieIds.length - 5} more` : ""}
          </p>
        </>
      )}
    </div>
  );
}
