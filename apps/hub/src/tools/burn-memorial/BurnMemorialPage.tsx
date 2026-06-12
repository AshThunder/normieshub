import { useEffect, useRef, useState } from "react";
import {
  drawBurnMemorialArt,
  downloadBlob,
  exportBurnMemorialPng,
  getBurnedInfo,
  MEMORIAL_CARD_H,
  MEMORIAL_CARD_W,
  tryGetOwner,
} from "@normie/shared";
import { audioManager } from "../../audio/audioManager";
import { TokenIdInput } from "../shared/TokenIdInput";

const PREVIEW_W = 360;
const PREVIEW_H = Math.round(MEMORIAL_CARD_H * (PREVIEW_W / MEMORIAL_CARD_W));

export function BurnMemorialPage() {
  const [tokenId, setTokenId] = useState("");
  const [memorial, setMemorial] = useState<Parameters<typeof drawBurnMemorialArt>[1] | null>(null);
  const [notBurned, setNotBurned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const load = async () => {
    const id = parseInt(tokenId, 10);
    if (Number.isNaN(id) || id < 0 || id > 9999) {
      setError("Enter a valid Normie ID");
      return;
    }
    setLoading(true);
    setError("");
    setNotBurned(false);
    setMemorial(null);
    try {
      const burnedInfo = await getBurnedInfo(id);

      if (burnedInfo) {
        setMemorial({
          tokenId: id,
          receiverTokenId: burnedInfo.commitment?.receiverTokenId,
          burnedAt: burnedInfo.timestamp,
          txHash: burnedInfo.txHash,
        });
        audioManager.playSfx("uiClick");
        return;
      }

      const owner = await tryGetOwner(id);
      if (owner && owner !== "unknown") {
        setNotBurned(true);
        setError(`Normie #${id} is still owned — memorial is for burned tokens only`);
        return;
      }

      if (owner === "unknown") {
        setError("Could not verify burn status — indexer may be temporarily unavailable. Try again shortly.");
        return;
      }

      setError(`No burn record found for Normie #${id}`);
    } catch {
      setError("Could not load burn record — try again shortly");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!memorial || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = PREVIEW_W;
    canvas.height = PREVIEW_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    void drawBurnMemorialArt(ctx, { ...memorial, width: PREVIEW_W, height: PREVIEW_H }).catch(() =>
      setError("Could not render memorial"),
    );
  }, [memorial]);

  const handleExport = async () => {
    if (!memorial) return;
    setExporting(true);
    try {
      const blob = await exportBurnMemorialPng(memorial);
      downloadBlob(blob, `normie-memorial-${memorial.tokenId}.png`);
      audioManager.playSfx("uiClick");
    } catch {
      setError("Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wide">Burn Memorial</h1>
        <p className="font-mono text-xs mt-1 text-[#48494b]">
          Commemorate a burned Normie — gone from supply, preserved on Ethereum forever.
        </p>
      </div>

      <div className="normie-card space-y-4">
        <TokenIdInput value={tokenId} onChange={setTokenId} label="Burned Normie ID" />
        <button type="button" className="normie-btn text-xs" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Load memorial"}
        </button>
        {error && <p className="font-mono text-xs text-red-700">{error}</p>}
        {notBurned && (
          <p className="font-mono text-xs text-[#48494b]">
            Try Canvas Lab burn preview to simulate sacrifices for a living Normie.
          </p>
        )}
      </div>

      {memorial && (
        <div className="normie-card space-y-4 flex flex-col items-center bg-[#2a2b2d] text-[#e3e5e4]">
          <canvas
            ref={canvasRef}
            className="border-2 border-[#e3e5e4]/30 normie-pixelated"
            style={{ width: PREVIEW_W, height: PREVIEW_H }}
          />
          <button
            type="button"
            className="normie-btn text-xs bg-[#e3e5e4] text-[#48494b]"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? "Exporting…" : "Download memorial PNG"}
          </button>
        </div>
      )}
    </div>
  );
}
