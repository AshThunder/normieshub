import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { TokenPicker, normalizeXHandle } from "@normie/shared";
import { RunnerGame } from "./RunnerGame";
import { audioManager } from "../../audio/audioManager";

type RunnerSource = "normie" | "x";

const SOURCE_TABS: { id: RunnerSource; label: string }[] = [
  { id: "normie", label: "Normie" },
  { id: "x", label: "X Profile" },
];

export function RunnerPage() {
  const [params] = useSearchParams();
  const initial = parseInt(params.get("id") ?? "0", 10);
  const initialX = params.get("x") ?? "";
  const [source, setSource] = useState<RunnerSource>(initialX ? "x" : "normie");
  const [tokenId, setTokenId] = useState(isNaN(initial) ? 0 : initial);
  const [xHandle, setXHandle] = useState(initialX);
  const [started, setStarted] = useState(false);
  const [runConfig, setRunConfig] = useState<{ tokenId: number; xHandle: string } | null>(null);

  const startRun = () => {
    if (source === "x" && !normalizeXHandle(xHandle)) return;
    setRunConfig({
      tokenId,
      xHandle: source === "x" ? xHandle : "",
    });
    setStarted(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wide">Normie Run</h1>
        <p className="font-mono text-xs mt-1">
          Endless runner. Dodge enemy Normies, collect cards. Run as a Normie or your pixel X avatar.
        </p>
      </div>

      {!started ? (
        <div className="space-y-4 max-w-md">
          <div className="flex gap-1">
            {SOURCE_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  audioManager.playSfx("uiClick");
                  setSource(id);
                }}
                className={`normie-btn text-xs px-4 py-1.5 uppercase tracking-wide flex-1 ${
                  source === id ? "bg-[#48494b] text-[#e3e5e4]" : "normie-btn-outline"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {source === "normie" ? (
            <div className="space-y-2">
              <TokenPicker value={tokenId} onChange={setTokenId} />
              <p className="font-mono text-[10px] text-[#48494b]">
                Your selected Normie becomes the runner. Trait type affects speed and abilities.
              </p>
            </div>
          ) : (
            <div className="normie-card space-y-2">
              <label className="font-mono text-xs uppercase text-[#48494b]">X handle</label>
              <input
                className="normie-input w-full"
                placeholder="@yourhandle"
                value={xHandle}
                onChange={(e) => setXHandle(e.target.value)}
              />
              <p className="font-mono text-[10px] text-[#48494b]">
                Fetches your profile photo and pixel-converts it into your runner.
              </p>
            </div>
          )}

          <button
            type="button"
            className="normie-btn w-full"
            onClick={startRun}
            disabled={source === "x" && !normalizeXHandle(xHandle)}
          >
            Start Run
          </button>
        </div>
      ) : (
        runConfig && (
          <RunnerGame
            tokenId={runConfig.tokenId}
            xHandle={runConfig.xHandle}
            onBack={() => {
              setStarted(false);
              setRunConfig(null);
            }}
          />
        )
      )}
    </div>
  );
}
