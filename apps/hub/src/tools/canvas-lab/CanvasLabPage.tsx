import { useCallback, useMemo, useState } from "react";
import {
  countTransformFlips,
  downloadBlob,
  emptyTransform,
  estimateBurnActionPoints,
  exportCanvasLabPng,
  getCanvasInfo,
  getCanvasPixels,
  getCanvasStatus,
  getOriginalPixels,
  getPixels,
  mergeTransforms,
  toggleTransformAt,
  xorPixels,
} from "@normie/shared";
import { audioManager } from "../../audio/audioManager";
import { PixelGridEditor } from "../shared/PixelGridEditor";
import { TokenIdInput } from "../shared/TokenIdInput";

type Tab = "lab" | "burn";

function parseIds(raw: string): number[] {
  return raw
    .split(/[,\s]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 9999);
}

export function CanvasLabPage() {
  const [tab, setTab] = useState<Tab>("lab");
  const [tokenId, setTokenId] = useState("42");
  const [xorId, setXorId] = useState("");
  const [receiverId, setReceiverId] = useState("42");
  const [sacrificeIds, setSacrificeIds] = useState("");
  const [original, setOriginal] = useState<string | null>(null);
  const [transform, setTransform] = useState(emptyTransform());
  const [baseFlips, setBaseFlips] = useState(0);
  const [currentAp, setCurrentAp] = useState(0);
  const [burnEstimate, setBurnEstimate] = useState<ReturnType<typeof estimateBurnActionPoints> | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const composited = useMemo(
    () => (original ? xorPixels(original, transform) : null),
    [original, transform],
  );

  const sessionFlips = countTransformFlips(transform) - baseFlips;
  const burnBudget = burnEstimate ? currentAp + burnEstimate.estimatedActionPoints : currentAp;
  const flipsLeft = Math.max(0, burnBudget - sessionFlips);

  const loadNormie = async (id: number) => {
    const [orig, layer, info] = await Promise.all([
      getOriginalPixels(id),
      getCanvasPixels(id).catch(() => emptyTransform()),
      getCanvasInfo(id).catch(() => null),
    ]);
    setOriginal(orig);
    setTransform(layer.padEnd(1600, "0"));
    setBaseFlips(countTransformFlips(layer));
    setCurrentAp(info?.actionPoints ?? 0);
    return orig;
  };

  const handleLoad = async () => {
    const id = parseInt(tokenId, 10);
    if (Number.isNaN(id) || id < 0 || id > 9999) {
      setError("Enter a valid Normie ID (0–9999)");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await loadNormie(id);
      audioManager.playSfx("uiClick");
    } catch {
      setError("Could not load Normie — check the ID");
    } finally {
      setLoading(false);
    }
  };

  const handleXorMerge = async () => {
    if (!original) {
      setError("Load a Normie first");
      return;
    }
    const id = parseInt(xorId, 10);
    if (Number.isNaN(id) || id < 0 || id > 9999) {
      setError("Enter a valid XOR partner ID");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const partnerPixels = await getPixels(id);
      const partnerLayer = xorPixels(original, partnerPixels.padEnd(1600, "0"));
      setTransform((t) => mergeTransforms(t, partnerLayer));
      audioManager.playSfx("uiClick");
    } catch {
      setError("Could not load XOR partner");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = useCallback(
    (x: number, y: number) => {
      if (tab === "burn" && flipsLeft <= 0) return;
      setTransform((t) => toggleTransformAt(t, x, y));
      audioManager.playSfx("uiClick");
    },
    [tab, flipsLeft],
  );

  const handleResetTransform = () => {
    setTransform(emptyTransform());
    setBaseFlips(0);
    audioManager.playSfx("uiClick");
  };

  const handleRestoreOnChain = async () => {
    const id = parseInt(tab === "burn" ? receiverId : tokenId, 10);
    if (Number.isNaN(id)) return;
    setLoading(true);
    try {
      const layer = await getCanvasPixels(id);
      setTransform(layer.padEnd(1600, "0"));
      setBaseFlips(countTransformFlips(layer));
    } catch {
      setError("Could not restore on-chain transform");
    } finally {
      setLoading(false);
    }
  };

  const handleBurnPreview = async () => {
    const recv = parseInt(receiverId, 10);
    const sacrifices = parseIds(sacrificeIds);
    if (Number.isNaN(recv) || recv < 0 || recv > 9999) {
      setError("Enter a valid receiver ID");
      return;
    }
    if (sacrifices.length === 0) {
      setError("Enter sacrifice IDs (comma-separated)");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [status, , ...sacrificePixels] = await Promise.all([
        getCanvasStatus(),
        loadNormie(recv),
        ...sacrifices.map((id) => getPixels(id)),
      ]);
      const pixelCounts = sacrificePixels.map((px) => {
        let n = 0;
        for (let i = 0; i < px.length; i++) if (px[i] === "1") n++;
        return n;
      });
      setBurnEstimate(estimateBurnActionPoints(pixelCounts, status));
      setTab("burn");
      audioManager.playSfx("uiClick");
    } catch {
      setError("Could not load burn preview data");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!composited || !original) return;
    const id = parseInt(tab === "burn" ? receiverId : tokenId, 10);
    const partner = parseInt(xorId, 10);
    setExporting(true);
    try {
      const blob = await exportCanvasLabPng({
        original,
        composited,
        tokenId: id,
        xorPartnerId: !Number.isNaN(partner) && partner >= 0 && partner <= 9999 ? partner : undefined,
        pixelsChanged: countTransformFlips(transform),
      });
      downloadBlob(blob, `normie-canvas-${id}-edit.png`);
      audioManager.playSfx("uiClick");
    } catch {
      setError("Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wide">Canvas Lab</h1>
        <p className="font-mono text-xs mt-1 text-[#48494b]">
          Practice NormiesCanvas edits off-chain — same flip logic as the real contract.
        </p>
      </div>

      <div className="flex gap-1">
        {(["lab", "burn"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`normie-btn text-[10px] px-3 py-1 uppercase ${
              tab === t ? "bg-[#48494b] text-[#e3e5e4]" : "normie-btn-outline"
            }`}
          >
            {t === "lab" ? "XOR Lab" : "Burn Preview"}
          </button>
        ))}
      </div>

      {tab === "lab" ? (
        <div className="space-y-4">
          <div className="border-2 border-[#48494b] bg-[#48494b] text-[#e3e5e4] p-4 font-mono text-xs space-y-3 leading-relaxed">
            <p className="font-bold uppercase tracking-wide text-sm">How XOR Lab works</p>
            <ol className="list-decimal list-inside space-y-2 text-[#e3e5e4]">
              <li>
                Enter a <strong className="text-white">Normie ID</strong> and click{" "}
                <strong className="text-white">Load Normie</strong>.
              </li>
              <li>
                <strong className="text-white">Original</strong> shows the minted face. It never changes.
              </li>
              <li>
                <strong className="text-white">Your edit</strong> is the preview of on-chain canvas changes.
                Click any pixel to flip it on ↔ off.
              </li>
              <li>
                Optional: enter a second ID and click <strong className="text-white">XOR with Normie</strong> to
                blend that face into yours (pixel-by-pixel mix).
              </li>
              <li>
                Pink highlight = pixels you flipped. The counter = total pixels changed.
              </li>
              <li>
                <strong className="text-white">Download before + after PNG</strong> saves mint vs your edit side by
                side. Nothing is written on-chain — this is practice only.
              </li>
            </ol>
          </div>

          <div className="normie-card space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <TokenIdInput value={tokenId} onChange={setTokenId} />
            <TokenIdInput value={xorId} onChange={setXorId} label="XOR partner ID" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="normie-btn text-xs" onClick={handleLoad} disabled={loading}>
              {loading ? "Loading…" : "Load Normie"}
            </button>
            <button type="button" className="normie-btn normie-btn-outline text-xs" onClick={handleXorMerge} disabled={loading || !xorId || !original}>
              XOR with Normie
            </button>
            <button type="button" className="normie-btn normie-btn-outline text-xs" onClick={handleResetTransform}>
              Clear flips
            </button>
            <button type="button" className="normie-btn normie-btn-outline text-xs" onClick={handleRestoreOnChain} disabled={loading}>
              Restore on-chain
            </button>
          </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border-2 border-[#48494b] bg-[#48494b] text-[#e3e5e4] p-4 font-mono text-xs space-y-3 leading-relaxed">
            <p className="font-bold uppercase tracking-wide text-sm">How Burn Preview works</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <strong className="text-white">Receiver ID</strong> — the Normie you want to edit on-chain.
              </li>
              <li>
                <strong className="text-white">Sacrifice IDs</strong> — Normies you would burn (comma-separated).
                Burning removes them from supply and gives the receiver action points (AP).
              </li>
              <li>
                Click <strong className="text-white">Load burn preview</strong> to see estimated AP earned and your
                flip budget.
              </li>
              <li>
                Click pixels on <strong className="text-white">Your edit</strong> to simulate spending AP. Each flip
                uses 1 AP. When AP hits 0, you can&apos;t flip more.
              </li>
              <li>AP estimate is approximate — real burns use on-chain tier math.</li>
            </ol>
          </div>

          <div className="normie-card space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <TokenIdInput value={receiverId} onChange={setReceiverId} label="Receiver Normie ID" />
            <label className="block space-y-1 sm:col-span-2">
              <span className="font-mono text-[10px] uppercase tracking-wide text-[#48494b]">
                Sacrifice IDs (comma-separated)
              </span>
              <input
                type="text"
                value={sacrificeIds}
                onChange={(e) => setSacrificeIds(e.target.value)}
                placeholder="100, 200, 300"
                className="w-full border-2 border-[#48494b] px-3 py-2 font-mono text-sm bg-white"
              />
            </label>
          </div>
          <button type="button" className="normie-btn text-xs" onClick={handleBurnPreview} disabled={loading}>
            {loading ? "Loading…" : "Load burn preview"}
          </button>
          {burnEstimate && (
            <div className="font-mono text-xs bg-[#48494b] text-[#e3e5e4] p-3 space-y-1">
              <p>Sacrifices: {burnEstimate.sacrificeCount} · {burnEstimate.totalSacrificePixels} pixels</p>
              <p>Tier rate: {burnEstimate.tierPercent}% · Est. AP earned: +{burnEstimate.estimatedActionPoints}</p>
              <p>Current AP: {currentAp} · Budget for flips: {burnBudget}</p>
              <p className="text-[#e3e5e4]/70">Estimate only — on-chain burn math may differ.</p>
            </div>
          )}
          </div>
        </div>
      )}

      {error && <p className="font-mono text-xs text-red-700">{error}</p>}

      {composited && original && (
        <div className="normie-card space-y-4">
          <div className="grid sm:grid-cols-2 gap-6 justify-items-center max-w-lg mx-auto">
            <div className="space-y-1 text-center">
              <PixelGridEditor pixels={original} size={240} label="Original (mint)" />
              <p className="font-mono text-[10px] text-[#48494b]">Normie #{tab === "burn" ? receiverId : tokenId} as minted</p>
            </div>
            <div className="space-y-1 text-center">
              <PixelGridEditor
                pixels={composited}
                transform={transform}
                highlightTransform
                size={240}
                label="Your edit"
                onToggle={handleToggle}
                disabled={tab === "burn" && flipsLeft <= 0}
              />
              <p className="font-mono text-[10px] text-[#48494b]">
                {countTransformFlips(transform)} pixel{countTransformFlips(transform) === 1 ? "" : "s"} changed
                {tab === "burn" && ` · ${flipsLeft} AP left`}
              </p>
            </div>
          </div>
          <p className="font-mono text-[10px] text-center text-[#48494b]">
            Download is a before/after sheet: <strong>original mint</strong> and your{" "}
            <strong>blended edit</strong> side by side.
          </p>
          <button type="button" className="normie-btn text-xs" onClick={handleExport} disabled={exporting}>
            {exporting ? "Exporting…" : "Download before + after PNG"}
          </button>
        </div>
      )}
    </div>
  );
}
