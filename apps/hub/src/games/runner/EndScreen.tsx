import { useEffect, useState } from "react";
import {
  downloadBlob,
  exportSharePng,
  HUB_URL,
  loadImageDataFromFile,
  loadImageDataFromUrl,
  loadXProfilePixels,
  normalizeXHandle,
  photoToNormiePixels,
  PixelImage,
} from "@normie/shared";

interface EndScreenProps {
  score: number;
  collectedIds: number[];
  xHandle?: string;
  onRestart: () => void;
}

export function EndScreen({ score, collectedIds, xHandle = "", onRestart }: EndScreenProps) {
  const [userPixels, setUserPixels] = useState<string | undefined>();
  const [profileUrl, setProfileUrl] = useState("");
  const [handleInput, setHandleInput] = useState(xHandle);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handle = normalizeXHandle(xHandle);
    if (!handle) return;
    void loadXProfilePixels(handle)
      .then(setUserPixels)
      .catch(() => {});
  }, [xHandle]);

  const handleFile = async (file: File) => {
    try {
      setError("");
      const data = await loadImageDataFromFile(file);
      setUserPixels(photoToNormiePixels(data));
    } catch {
      setError("Could not process image");
    }
  };

  const handleUrl = async () => {
    if (!profileUrl) return;
    try {
      setError("");
      const data = await loadImageDataFromUrl(profileUrl);
      setUserPixels(photoToNormiePixels(data));
    } catch {
      setError("Could not load URL (CORS may block external images)");
    }
  };

  const handleX = async () => {
    const handle = normalizeXHandle(handleInput);
    if (!handle) return;
    try {
      setError("");
      setUserPixels(await loadXProfilePixels(handle));
    } catch {
      setError("Could not load X profile — check the handle");
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportSharePng({
        normieIds: collectedIds,
        userPixels,
        score,
        title: "NORMIE RUN",
      });
      downloadBlob(blob, `normie-run-${score}.png`);
    } catch {
      setError("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const shareText = encodeURIComponent(
    `I scored ${score} in Normie Run and collected ${collectedIds.length} Normies! ${HUB_URL}`,
  );

  return (
    <div className="normie-card max-w-lg mx-auto space-y-4">
      <h2 className="text-xl font-bold uppercase">Run Complete</h2>
      <p className="font-mono text-2xl">Score: {score}</p>

      <div>
        <p className="font-mono text-xs uppercase mb-2">
          Collected Normies{collectedIds.length > 0 ? ` (${collectedIds.length})` : ""}
        </p>
        <div className="flex gap-2 flex-wrap">
          {collectedIds.length === 0 ? (
            <p className="text-xs font-mono">No cards collected</p>
          ) : (
            collectedIds.map((id, i) => <PixelImage key={`${id}-${i}`} tokenId={id} size={48} />)
          )}
        </div>
      </div>

      <div className="space-y-2 border-t border-[#48494b] pt-4">
        <p className="font-mono text-xs uppercase">Your pixel self (optional)</p>
        <input
          type="file"
          accept="image/*"
          className="font-mono text-xs"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <div className="flex gap-2">
          <input
            className="normie-input flex-1 text-xs"
            placeholder="@xhandle"
            value={handleInput}
            onChange={(e) => setHandleInput(e.target.value)}
          />
          <button type="button" className="normie-btn text-xs" onClick={handleX}>
            Load X
          </button>
        </div>
        <div className="flex gap-2">
          <input
            className="normie-input flex-1 text-xs"
            placeholder="Or image URL"
            value={profileUrl}
            onChange={(e) => setProfileUrl(e.target.value)}
          />
          <button type="button" className="normie-btn text-xs" onClick={handleUrl}>
            Load URL
          </button>
        </div>
        {userPixels && (
          <canvas
            ref={(el) => {
              if (!el || !userPixels) return;
              const ctx = el.getContext("2d")!;
              el.width = 160;
              el.height = 160;
              for (let i = 0; i < 1600; i++) {
                const x = i % 40;
                const y = Math.floor(i / 40);
                ctx.fillStyle = userPixels[i] === "1" ? "#48494b" : "#e3e5e4";
                ctx.fillRect(x * 4, y * 4, 4, 4);
              }
            }}
            className="normie-pixelated border-2 border-[#48494b]"
            width={160}
            height={160}
          />
        )}
      </div>

      {error && <p className="text-red-600 text-xs font-mono">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="normie-btn" onClick={handleExport} disabled={exporting}>
          {exporting ? "Exporting..." : "Download PNG"}
        </button>
        <a
          href={`https://twitter.com/intent/tweet?text=${shareText}`}
          target="_blank"
          rel="noreferrer"
          className="normie-btn normie-btn-outline inline-block"
        >
          Share to X
        </a>
        <button type="button" className="normie-btn normie-btn-outline" onClick={onRestart}>
          Run Again
        </button>
      </div>
    </div>
  );
}
