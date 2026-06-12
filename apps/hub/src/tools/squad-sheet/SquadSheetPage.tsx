import { useEffect, useRef, useState } from "react";
import {
  drawSquadSheetArt,
  downloadBlob,
  etherscanAddressUrl,
  exportSquadSheetPng,
  getHolderTokens,
  isEthAddress,
  normalizeEthAddress,
} from "@normie/shared";
import { audioManager } from "../../audio/audioManager";

export function SquadSheetPage() {
  const [wallet, setWallet] = useState("");
  const [title, setTitle] = useState("MY NORMIES");
  const [hideAddress, setHideAddress] = useState(false);
  const [normieIds, setNormieIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const load = async () => {
    const addr = normalizeEthAddress(wallet);
    if (!isEthAddress(addr)) {
      setError("Enter a valid wallet address (0x…)");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const ids = await getHolderTokens(addr);
      if (ids.length === 0) {
        setError("No Normies found for this wallet");
        return;
      }
      setNormieIds(ids.sort((a, b) => a - b));
      audioManager.playSfx("uiClick");
    } catch {
      setError("Could not load holdings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (normieIds.length === 0 || !canvasRef.current) return;
    let cancelled = false;
    const canvas = canvasRef.current;
    const width = 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setRendering(true);
    void drawSquadSheetArt(ctx, {
      normieIds,
      walletAddress: normalizeEthAddress(wallet),
      hideWalletAddress: hideAddress,
      title,
      width,
    })
      .catch(() => {
        if (!cancelled) setError("Could not render squad sheet");
      })
      .finally(() => {
        if (!cancelled) setRendering(false);
      });

    return () => {
      cancelled = true;
    };
  }, [normieIds, wallet, title, hideAddress]);

  const handleExport = async () => {
    if (normieIds.length === 0) return;
    setExporting(true);
    try {
      const blob = await exportSquadSheetPng({
        normieIds,
        walletAddress: normalizeEthAddress(wallet),
        hideWalletAddress: hideAddress,
        title,
      });
      downloadBlob(blob, "normie-squad-sheet.png");
      audioManager.playSfx("uiClick");
    } catch {
      setError("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const addr = normalizeEthAddress(wallet);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wide">Squad Sheet</h1>
        <p className="font-mono text-xs mt-1 text-[#48494b]">
          Paste a wallet — export every Normie you hold as a printable contact sheet.
        </p>
      </div>

      <div className="normie-card space-y-4">
        <label className="block space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-wide text-[#48494b]">Wallet address</span>
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="0x…"
            className="w-full border-2 border-[#48494b] px-3 py-2 font-mono text-sm bg-white"
          />
        </label>
        <label className="block space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-wide text-[#48494b]">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border-2 border-[#48494b] px-3 py-2 font-mono text-sm bg-white"
          />
        </label>
        <label className="font-mono text-xs flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideAddress}
            onChange={(e) => setHideAddress(e.target.checked)}
            className="accent-[#48494b]"
          />
          Hide wallet address on sheet
        </label>
        <button type="button" className="normie-btn text-xs" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Load holdings"}
        </button>
        {error && <p className="font-mono text-xs text-red-700">{error}</p>}
        {normieIds.length > 0 && isEthAddress(addr) && (
          <p className="font-mono text-xs text-[#48494b]">
            {normieIds.length} Normie{normieIds.length === 1 ? "" : "s"} ·{" "}
            <a href={etherscanAddressUrl(addr)} target="_blank" rel="noreferrer" className="underline">
              Etherscan
            </a>
          </p>
        )}
      </div>

      {normieIds.length > 0 && (
        <div className="normie-card space-y-4 overflow-x-auto">
          {rendering && (
            <p className="font-mono text-xs text-[#48494b]">Rendering {normieIds.length} Normies…</p>
          )}
          <canvas ref={canvasRef} className="border-2 border-[#48494b] max-w-full normie-pixelated" />
          <button type="button" className="normie-btn text-xs" onClick={handleExport} disabled={exporting || rendering}>
            {exporting ? "Exporting…" : "Download PNG"}
          </button>
        </div>
      )}
    </div>
  );
}
