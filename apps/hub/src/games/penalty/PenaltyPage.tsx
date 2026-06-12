import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { PixelImage, TokenPicker } from "@normie/shared";
import { PenaltyGame } from "./PenaltyGame";
import type { PenaltyMode } from "./engine/PenaltyEngine";
import "./penalty.css";

type Screen = "setup" | "play";

export function PenaltyPage() {
  const [params] = useSearchParams();
  const initial = parseInt(params.get("id") ?? "42", 10);
  const [screen, setScreen] = useState<Screen>("setup");
  const [mode, setMode] = useState<PenaltyMode>("solo");
  const [kickerId, setKickerId] = useState(isNaN(initial) ? 42 : initial);
  const [squad, setSquad] = useState<number[]>([
    isNaN(initial) ? 42 : initial,
    615,
    100,
    200,
    300,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wide">Normie Penalty Shootout</h1>
        <p className="font-mono text-xs mt-1">
          Aim, set power, beat the keeper. Traits change curve, reach, and sweet spot.
        </p>
      </div>

      {screen === "setup" ? (
        <div className="space-y-4 max-w-lg">
          <div>
            <p className="font-mono text-xs uppercase mb-2">Game mode</p>
            <div className="penalty-mode-btns">
              <button
                type="button"
                className={`normie-btn text-xs ${mode === "solo" ? "active" : "normie-btn-outline"}`}
                onClick={() => setMode("solo")}
              >
                Solo (5 shots)
              </button>
              <button
                type="button"
                className={`normie-btn text-xs ${mode === "shootout" ? "active" : "normie-btn-outline"}`}
                onClick={() => setMode("shootout")}
              >
                Shootout vs AI
              </button>
            </div>
          </div>

          <TokenPicker value={kickerId} onChange={setKickerId} />

          {mode === "shootout" && (
            <div>
              <p className="font-mono text-xs uppercase mb-2">Squad (AI uses #615 as keeper)</p>
              <div className="flex flex-wrap gap-2">
                {squad.map((id, i) => (
                  <div key={i} className="border-2 border-[#48494b] p-1">
                    <PixelImage tokenId={id} size={40} />
                    <span className="font-mono text-[10px]">#{id}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button type="button" className="normie-btn w-full" onClick={() => setScreen("play")}>
            Kick Off
          </button>
        </div>
      ) : (
        <PenaltyGame
          mode={mode}
          kickerId={kickerId}
          squadIds={squad}
          onBack={() => setScreen("setup")}
        />
      )}
    </div>
  );
}
