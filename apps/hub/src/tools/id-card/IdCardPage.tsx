import { useEffect, useRef, useState } from "react";
import {
  drawIdCardArt,
  downloadBlob,
  exportIdCardPng,
  getCanvasInfo,
  getMetadata,
  getTraitValue,
  ID_CARD_H,
  ID_CARD_W,
  loadImageDataFromFile,
  loadXProfilePixels,
  normalizeXHandle,
  photoToNormiePixels,
  type IdCardPngOptions,
} from "@normie/shared";
import { audioManager } from "../../audio/audioManager";
import { TokenIdInput } from "../shared/TokenIdInput";

type CardMode = "normie" | "personal";

const PREVIEW_W = 390;
const PREVIEW_H = Math.round(ID_CARD_H * (PREVIEW_W / ID_CARD_W));

export function IdCardPage() {
  const [mode, setMode] = useState<CardMode>("normie");
  const [tokenId, setTokenId] = useState("42");
  const [xHandle, setXHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [tagline, setTagline] = useState("");
  const [userPixels, setUserPixels] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [cardOptions, setCardOptions] = useState<IdCardPngOptions | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateNormieCard = async () => {
    const id = parseInt(tokenId, 10);
    if (Number.isNaN(id) || id < 0 || id > 9999) {
      setError("Enter a valid Normie ID");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [metadata, canvas] = await Promise.all([
        getMetadata(id),
        getCanvasInfo(id).catch(() => null),
      ]);
      setCardOptions({
        tokenId: id,
        metadata,
        level: getTraitValue(metadata, "Level") ?? canvas?.level,
        pixelCount: getTraitValue(metadata, "Pixel Count"),
        actionPoints: getTraitValue(metadata, "Action Points") ?? canvas?.actionPoints,
        customized: canvas?.customized ?? getTraitValue(metadata, "Customized") === "Yes",
      });
      audioManager.playSfx("uiClick");
    } catch {
      setError("Could not load Normie — check the ID");
    } finally {
      setLoading(false);
    }
  };

  const generatePersonalCard = async () => {
    if (!userPixels && !normalizeXHandle(xHandle)) {
      setError("Enter your X handle or upload a photo");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const pixels = userPixels ?? (await loadXProfilePixels(normalizeXHandle(xHandle)));
      setUserPixels(pixels);
      const clean = normalizeXHandle(xHandle);
      setCardOptions({
        userPixels: pixels,
        displayName: displayName.trim() || (clean ? `@${clean}` : "NORMIE"),
        tagline: tagline.trim() || "On-chain generative faces",
      });
      audioManager.playSfx("uiClick");
    } catch {
      setError("Could not load your pixel portrait — check the X handle or upload a photo");
    } finally {
      setLoading(false);
    }
  };

  const generate = () => (mode === "normie" ? generateNormieCard() : generatePersonalCard());

  const handleFile = async (file: File) => {
    setLoading(true);
    setError("");
    try {
      const data = await loadImageDataFromFile(file);
      setUserPixels(photoToNormiePixels(data));
      audioManager.playSfx("uiClick");
    } catch {
      setError("Could not read image file");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!cardOptions || !canvasRef.current) return;
    let cancelled = false;
    const canvas = canvasRef.current;
    canvas.width = PREVIEW_W;
    canvas.height = PREVIEW_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    void drawIdCardArt(ctx, { ...cardOptions, width: PREVIEW_W, height: PREVIEW_H }).catch(() => {
      if (!cancelled) setError("Could not render card preview");
    });

    return () => {
      cancelled = true;
    };
  }, [cardOptions]);

  const handleExport = async () => {
    if (!cardOptions) return;
    setExporting(true);
    try {
      const blob = await exportIdCardPng(cardOptions);
      const name =
        cardOptions.tokenId !== undefined
          ? `normie-id-${cardOptions.tokenId}`
          : `normie-personal-${normalizeXHandle(xHandle) || "card"}`;
      downloadBlob(blob, `${name}.png`);
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
        <h1 className="text-2xl font-bold uppercase tracking-wide">Normie ID Card</h1>
        <p className="font-mono text-xs mt-1 text-[#48494b]">
          Official collection card or a personalised card with your pixel portrait.
        </p>
      </div>

      <div className="flex gap-1">
        {(["normie", "personal"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setCardOptions(null);
              setError("");
            }}
            className={`normie-btn text-[10px] px-3 py-1 uppercase ${
              mode === m ? "bg-[#48494b] text-[#e3e5e4]" : "normie-btn-outline"
            }`}
          >
            {m === "normie" ? "Normie card" : "Personal card"}
          </button>
        ))}
      </div>

      <div className="normie-card space-y-4">
        {mode === "normie" ? (
          <>
            <TokenIdInput value={tokenId} onChange={setTokenId} />
            <button type="button" className="normie-btn text-xs" onClick={generate} disabled={loading}>
              {loading ? "Generating…" : "Generate card"}
            </button>
          </>
        ) : (
          <>
            <label className="block space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wide text-[#48494b]">X handle</span>
              <input
                type="text"
                value={xHandle}
                onChange={(e) => setXHandle(e.target.value)}
                placeholder="@you"
                className="w-full border-2 border-[#48494b] px-3 py-2 font-mono text-sm bg-white"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wide text-[#48494b]">
                Or upload photo
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])}
                className="font-mono text-xs w-full"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wide text-[#48494b]">Display name</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full border-2 border-[#48494b] px-3 py-2 font-mono text-sm bg-white"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wide text-[#48494b]">Tagline</span>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="On-chain generative faces"
                className="w-full border-2 border-[#48494b] px-3 py-2 font-mono text-sm bg-white"
              />
            </label>
            <button type="button" className="normie-btn text-xs" onClick={generate} disabled={loading}>
              {loading ? "Generating…" : "Generate card"}
            </button>
          </>
        )}
        {error && <p className="font-mono text-xs text-red-700">{error}</p>}
      </div>

      {cardOptions && (
        <div className="normie-card space-y-4 flex flex-col items-center">
          <canvas ref={canvasRef} className="border-2 border-[#48494b] max-w-full h-auto normie-pixelated" />
          <button type="button" className="normie-btn text-xs" onClick={handleExport} disabled={exporting}>
            {exporting ? "Exporting…" : "Download PNG"}
          </button>
        </div>
      )}
    </div>
  );
}
