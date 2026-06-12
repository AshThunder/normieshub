import { useState } from "react";
import {
  downloadBlob,
  exportBlockBuilderPng,
  PixelImage,
} from "@normie/shared";
import type { BlockBuilderResult } from "./engine/types";

interface EndScreenProps {
  result: BlockBuilderResult;
  onRestart: () => void;
}

export function EndScreen({ result, onRestart }: EndScreenProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const handleExport = async () => {
    setExporting(true);
    setError("");
    try {
      const blob = await exportBlockBuilderPng({
        normieIds: result.collectedNormieIds,
        score: result.score,
        linesCleared: result.linesCleared,
      });
      downloadBlob(blob, `normie-block-builder-${result.score}.png`);
    } catch {
      setError("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const shareText = encodeURIComponent(
    `I cleared ${result.linesCleared} lines and collected ${result.collectedNormieIds.length} Normies in Block Builder! Score: ${result.score}`,
  );

  return (
    <div className="normie-card max-w-lg mx-auto space-y-4">
      <h2 className="text-xl font-bold uppercase">Build Complete</h2>
      <p className="font-mono text-2xl">Score: {result.score}</p>
      <p className="font-mono text-sm text-[#48494b]">
        {result.linesCleared} lines cleared · {result.collectedNormieIds.length} Normies collected
      </p>

      <div>
        <p className="font-mono text-xs uppercase mb-2">
          Collected Normies{result.collectedNormieIds.length > 0 ? ` (${result.collectedNormieIds.length})` : ""}
        </p>
        <div className="flex gap-2 flex-wrap">
          {result.collectedNormieIds.length === 0 ? (
            <p className="text-xs font-mono">No lines cleared this run</p>
          ) : (
            result.collectedNormieIds.map((id, i) => (
              <div key={`${id}-${i}`} className="flex flex-col items-center gap-1">
                <PixelImage tokenId={id} size={48} />
                <span className="font-mono text-[10px]">#{id}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {error && <p className="text-red-600 text-xs font-mono">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="normie-btn" onClick={handleExport} disabled={exporting}>
          {exporting ? "Exporting…" : "Download PNG"}
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
          Build Again
        </button>
      </div>
    </div>
  );
}
