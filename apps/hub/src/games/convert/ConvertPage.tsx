import { useState } from "react";
import {
  downloadBlob,
  exportPixelPng,
  loadImageDataFromFile,
  loadImageDataFromUrl,
  loadXProfilePixels,
  normalizeXHandle,
  photoToNormiePixels,
  pixelsToDataUrl,
} from "@normie/shared";
import { audioManager } from "../../audio/audioManager";
import { PixelPreview } from "./PixelPreview";

type Source = "x" | "file" | "url";

export function ConvertPage() {
  const [source, setSource] = useState<Source>("x");
  const [handle, setHandle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [pixels, setPixels] = useState<string | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const convertFromPixels = (binary: string, previewSrc?: string) => {
    setPixels(binary);
    setOriginalPreview(previewSrc ?? null);
    setError("");
    audioManager.playSfx("uiClick");
  };

  const convertX = async () => {
    const clean = normalizeXHandle(handle);
    if (!clean) {
      setError("Enter your X handle");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const binary = await loadXProfilePixels(clean);
      convertFromPixels(binary, `/api/x-avatar/${encodeURIComponent(clean)}`);
    } catch {
      setError("Could not load X profile — check the handle");
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
    setError("");
    try {
      const data = await loadImageDataFromUrl(imageUrl.trim());
      convertFromPixels(photoToNormiePixels(data), imageUrl.trim());
    } catch {
      setError("Could not load image from URL");
    } finally {
      setLoading(false);
    }
  };

  const convertFile = async (file: File) => {
    setLoading(true);
    setError("");
    try {
      const data = await loadImageDataFromFile(file);
      const url = URL.createObjectURL(file);
      convertFromPixels(photoToNormiePixels(data), url);
    } catch {
      setError("Could not process file");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!pixels) return;
    setExporting(true);
    try {
      const label = source === "x" ? normalizeXHandle(handle) : undefined;
      const blob = await exportPixelPng({ pixels, size: 1000, label });
      const name = label || "normie";
      downloadBlob(blob, `normie-${name}.png`);
      audioManager.playSfx("uiClick");
    } catch {
      setError("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const shareText = encodeURIComponent("I turned my photo into a Normie pixel face. normies.art");

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wide">Normie Me</h1>
        <p className="font-mono text-xs mt-1">
          Turn any photo — X profile, upload, or URL — into a 40×40 Normie-style pixel portrait.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["x", "file", "url"] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={`normie-btn text-xs ${source !== s ? "normie-btn-outline" : ""}`}
            onClick={() => setSource(s)}
          >
            {s === "x" ? "X Profile" : s === "file" ? "Upload" : "Image URL"}
          </button>
        ))}
      </div>

      <div className="normie-card space-y-3">
        {source === "x" && (
          <>
            <label className="font-mono text-xs uppercase">X handle</label>
            <div className="flex gap-2">
              <input
                className="normie-input flex-1"
                placeholder="@yourhandle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void convertX()}
              />
              <button type="button" className="normie-btn" onClick={() => void convertX()} disabled={loading}>
                {loading ? "…" : "Convert"}
              </button>
            </div>
          </>
        )}

        {source === "file" && (
          <>
            <label className="font-mono text-xs uppercase">Photo</label>
            <input
              type="file"
              accept="image/*"
              className="font-mono text-xs w-full"
              onChange={(e) => e.target.files?.[0] && void convertFile(e.target.files[0])}
            />
            {loading && <p className="font-mono text-xs">Converting…</p>}
          </>
        )}

        {source === "url" && (
          <>
            <label className="font-mono text-xs uppercase">Image URL</label>
            <div className="flex gap-2">
              <input
                className="normie-input flex-1 text-xs"
                placeholder="https://…"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void convertUrl()}
              />
              <button type="button" className="normie-btn" onClick={() => void convertUrl()} disabled={loading}>
                {loading ? "…" : "Convert"}
              </button>
            </div>
          </>
        )}

        {error && <p className="text-red-600 text-xs font-mono">{error}</p>}
      </div>

      {pixels && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-6 items-center">
            {originalPreview && (
              <div className="space-y-2 text-center">
                <p className="font-mono text-xs uppercase">Original</p>
                <img
                  src={originalPreview}
                  alt="Original"
                  className="w-full max-w-[200px] mx-auto border-2 border-[#48494b] object-cover aspect-square"
                />
              </div>
            )}
            <div className={`space-y-2 text-center ${!originalPreview ? "sm:col-span-2" : ""}`}>
              <p className="font-mono text-xs uppercase">Normie</p>
              <PixelPreview pixels={pixels} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <button type="button" className="normie-btn" onClick={() => void handleDownload()} disabled={exporting}>
              {exporting ? "Exporting…" : "Download PNG"}
            </button>
            <a
              href={pixelsToDataUrl(pixels, 400)}
              download="normie-preview.png"
              className="normie-btn normie-btn-outline inline-block"
            >
              Quick save
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${shareText}`}
              target="_blank"
              rel="noreferrer"
              className="normie-btn normie-btn-outline inline-block"
            >
              Share on X
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
