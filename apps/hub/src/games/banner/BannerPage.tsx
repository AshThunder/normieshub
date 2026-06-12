import { useState } from "react";
import {
  BANNER_SQUAD_COUNT,
  downloadBlob,
  exportBannerPng,
  etherscanAddressUrl,
  getHolderTokens,
  HUB_URL,
  isEthAddress,
  loadImageDataFromFile,
  loadXProfilePixels,
  normalizeEthAddress,
  normalizeXHandle,
  photoToNormiePixels,
  randomNormieIds,
  squadFromHoldings,
  type BannerFormat,
  type BannerTemplate,
} from "@normie/shared";
import { audioManager } from "../../audio/audioManager";
import { BannerPreview } from "./BannerPreview";

const TEMPLATES: { id: BannerTemplate; label: string; hint: string }[] = [
  { id: "parade", label: "Squad Parade", hint: "Row of Normies marching across the banner" },
  { id: "spotlight", label: "Spotlight", hint: "Featured Normie hero with flanking squad" },
  { id: "mosaic", label: "Pixel Mosaic", hint: "Grid of faces with bold headline overlay" },
  { id: "collector", label: "Collector Flex", hint: "MY NORMIES squad with IDs and description" },
];

export function BannerPage() {
  const [format, setFormat] = useState<BannerFormat>("x-header");
  const [template, setTemplate] = useState<BannerTemplate>("parade");
  const [normieIds, setNormieIds] = useState<number[]>([]);
  const [userPixels, setUserPixels] = useState<string | undefined>();
  const [handle, setHandle] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [holdingIds, setHoldingIds] = useState<number[] | null>(null);
  const [title, setTitle] = useState("NORMIE SQUAD");
  const [tagline, setTagline] = useState("10,000 faces. One chain.");
  const [description, setDescription] = useState("Pixel portraits on Ethereum — collect, play, share.");
  const [showSafeZone, setShowSafeZone] = useState(true);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [warn, setWarn] = useState("");

  const featuredId = normieIds[0] ?? 0;

  const resolveSquad = async (): Promise<number[]> => {
    const wallet = normalizeEthAddress(walletAddress);
    if (!wallet) {
      setHoldingIds(null);
      return randomNormieIds(BANNER_SQUAD_COUNT);
    }
    if (!isEthAddress(wallet)) {
      throw new Error("Invalid wallet address — use 0x… format");
    }
    const holdings = await getHolderTokens(wallet);
    if (holdings.length === 0) {
      throw new Error("No Normies found for this wallet");
    }
    setHoldingIds(holdings);
    return squadFromHoldings(holdings, BANNER_SQUAD_COUNT);
  };

  const generate = async (pixels?: string) => {
    setLoading(true);
    setError("");
    setWarn("");
    try {
      const warnings: string[] = [];
      const clean = normalizeXHandle(handle);
      let resolved = pixels;
      if (!resolved && clean) {
        try {
          resolved = await loadXProfilePixels(clean);
        } catch {
          warnings.push("Could not load X profile — banner generated without pixel self");
        }
      }
      setUserPixels(resolved);
      const squad = await resolveSquad();
      setNormieIds(squad);
      if (normalizeEthAddress(walletAddress) && squad.length < BANNER_SQUAD_COUNT) {
        warnings.push(`Using all ${squad.length} Normies from your wallet`);
      }
      if (warnings.length > 0) setWarn(warnings.join(" · "));
      audioManager.playSfx("uiClick");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate banner");
    } finally {
      setLoading(false);
    }
  };

  const shuffleNormies = () => {
    if (holdingIds && holdingIds.length > 0) {
      setNormieIds(squadFromHoldings(holdingIds, BANNER_SQUAD_COUNT));
    } else {
      setNormieIds(randomNormieIds(BANNER_SQUAD_COUNT));
    }
    audioManager.playSfx("uiClick");
  };

  const handleFile = async (file: File) => {
    setLoading(true);
    setError("");
    setWarn("");
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
    if (normieIds.length === 0) return;
    setExporting(true);
    setError("");
    try {
      const blob = await exportBannerPng({
        format,
        template,
        normieIds,
        featuredId,
        userPixels,
        title: title || undefined,
        tagline: tagline || undefined,
        description: description || undefined,
        handle: normalizeXHandle(handle) || undefined,
      });
      const name = normalizeXHandle(handle) || "normie";
      downloadBlob(blob, `normie-banner-${format}-${name}.png`);
      audioManager.playSfx("uiClick");
    } catch {
      setError("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const shareText = encodeURIComponent(
    `My Normie Banner — ${title || "pixel squad"} · ${HUB_URL}`,
  );

  const ready = normieIds.length > 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wide">Normie Banner</h1>
        <p className="font-mono text-xs mt-1">
          Create X headers and social cards with Normie squads, custom copy, and optional pixel self.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="normie-card space-y-4">
          <div>
            <label className="font-mono text-xs uppercase">Format</label>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                className={`normie-btn flex-1 text-xs ${format === "x-header" ? "" : "normie-btn-outline"}`}
                onClick={() => setFormat("x-header")}
              >
                X Header 1500×500
              </button>
              <button
                type="button"
                className={`normie-btn flex-1 text-xs ${format === "social-card" ? "" : "normie-btn-outline"}`}
                onClick={() => setFormat("social-card")}
              >
                Social 1200×630
              </button>
            </div>
          </div>

          <div>
            <label className="font-mono text-xs uppercase">Template</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  title={t.hint}
                  className={`normie-btn text-[10px] px-2 ${template === t.id ? "" : "normie-btn-outline"}`}
                  onClick={() => setTemplate(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-mono text-xs uppercase">Wallet address (optional)</label>
            <input
              className="normie-input w-full mt-1 font-mono text-xs"
              placeholder="0x… your holdings"
              value={walletAddress}
              onChange={(e) => {
                setWalletAddress(e.target.value);
                setHoldingIds(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && void generate()}
            />
            <p className="font-mono text-[10px] text-[#48494b] mt-1">
              Paste an address to use your on-chain Normies instead of a random squad.
            </p>
            {holdingIds && (
              <div className="mt-2 border-2 border-[#48494b] bg-[#48494b] text-[#e3e5e4] px-3 py-2.5 flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-[#e3e5e4]/70">
                    Your collection
                  </p>
                  <p className="font-bold text-xl leading-tight tabular-nums">
                    {holdingIds.length}
                    <span className="ml-1.5 text-xs font-normal uppercase tracking-wide">
                      Normie{holdingIds.length === 1 ? "" : "s"}
                    </span>
                  </p>
                </div>
                {isEthAddress(walletAddress) && (
                  <a
                    href={etherscanAddressUrl(normalizeEthAddress(walletAddress))}
                    target="_blank"
                    rel="noreferrer"
                    className="normie-btn normie-btn-outline text-[10px] px-2 py-1 shrink-0 bg-[#e3e5e4] text-[#48494b] border-[#e3e5e4] hover:bg-white"
                  >
                    Etherscan
                  </a>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="font-mono text-xs uppercase">Title</label>
            <input
              className="normie-input w-full mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={32}
              placeholder="NORMIE SQUAD"
            />
          </div>

          <div>
            <label className="font-mono text-xs uppercase">Tagline</label>
            <input
              className="normie-input w-full mt-1"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={60}
              placeholder="10,000 faces. One chain."
            />
          </div>

          <div>
            <label className="font-mono text-xs uppercase">Description</label>
            <textarea
              className="normie-input w-full mt-1 min-h-[64px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={140}
              placeholder="Extra copy for social cards and collector flex"
            />
          </div>

          <div>
            <label className="font-mono text-xs uppercase">X handle (optional)</label>
            <div className="flex gap-2 mt-1">
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
            <div className="flex items-center gap-2 mt-2">
              <span className="font-mono text-[10px] uppercase text-[#48494b]">or photo</span>
              <input
                type="file"
                accept="image/*"
                className="font-mono text-xs flex-1"
                onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])}
              />
            </div>
          </div>

          {format === "x-header" && (
            <label className="flex items-center gap-2 font-mono text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={showSafeZone}
                onChange={(e) => setShowSafeZone(e.target.checked)}
              />
              Show X safe-zone guides
            </label>
          )}

          {warn && <p className="text-amber-700 text-xs font-mono">{warn}</p>}
          {error && <p className="text-red-600 text-xs font-mono">{error}</p>}

          {!ready && (
            <button
              type="button"
              className="normie-btn w-full"
              onClick={() => void generate()}
              disabled={loading}
            >
              {loading ? "Generating…" : "Generate Banner"}
            </button>
          )}
        </div>

        <div className="space-y-4">
          {ready ? (
            <>
              <BannerPreview
                format={format}
                template={template}
                normieIds={normieIds}
                featuredId={featuredId}
                userPixels={userPixels}
                title={title}
                tagline={tagline}
                description={description}
                handle={normalizeXHandle(handle) || undefined}
                showSafeZone={showSafeZone}
              />

              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  className="normie-btn"
                  onClick={() => void handleDownload()}
                  disabled={exporting}
                >
                  {exporting ? "Exporting…" : "Download PNG"}
                </button>
                <button type="button" className="normie-btn normie-btn-outline" onClick={shuffleNormies}>
                  Shuffle Squad
                </button>
                <button
                  type="button"
                  className="normie-btn normie-btn-outline"
                  onClick={() => void generate()}
                  disabled={loading}
                >
                  Regenerate
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
                {holdingIds ? "Your squad" : "Squad"}:{" "}
                {normieIds.slice(0, 5).map((id) => `#${id}`).join(", ")}
                {normieIds.length > 5 ? ` +${normieIds.length - 5} more` : ""}
              </p>
            </>
          ) : (
            <div className="normie-card flex items-center justify-center min-h-[200px] font-mono text-xs text-[#48494b]">
              Generate to preview your banner
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
