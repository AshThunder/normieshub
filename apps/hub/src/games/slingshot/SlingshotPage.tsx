import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { TokenPicker, PixelImage } from "@normie/shared";
import { SlingshotGame } from "./SlingshotGame";
import { LevelSelect } from "./LevelSelect";
import "./slingshot.css";

type Screen = "squad" | "levels" | "play";

export function SlingshotPage() {
  const [params] = useSearchParams();
  const initial = parseInt(params.get("id") ?? "42", 10);
  const [screen, setScreen] = useState<Screen>("squad");
  const [squad, setSquad] = useState<number[]>([
    isNaN(initial) ? 42 : initial,
    0,
    100,
    615,
    1459,
  ]);
  const [pickerIdx, setPickerIdx] = useState(0);
  const [levelIndex, setLevelIndex] = useState(0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wide">Normie Slingshot</h1>
        <p className="font-mono text-xs mt-1">
          Your squad of Normies vs enemy Normies — 20 levels. Drag, release, destroy.
        </p>
      </div>

      {screen === "squad" && (
        <div className="space-y-4 max-w-lg">
          <p className="font-mono text-xs uppercase">Pick your squad (up to 5 Normies — extra used on harder levels)</p>
          <div className="slingshot-squad">
            {squad.map((id, i) => (
              <button
                key={i}
                type="button"
                className={`slingshot-squad-item ${pickerIdx === i ? "ring-2 ring-[#1a1a1a]" : ""}`}
                onClick={() => setPickerIdx(i)}
              >
                <PixelImage tokenId={id} size={48} />
                #{id}
              </button>
            ))}
          </div>
          <TokenPicker
            value={squad[pickerIdx]}
            onChange={(id) => {
              const next = [...squad];
              next[pickerIdx] = id;
              setSquad(next);
            }}
            showAbility
          />
          <button type="button" className="normie-btn w-full" onClick={() => setScreen("levels")}>
            Choose Level
          </button>
        </div>
      )}

      {screen === "levels" && (
        <LevelSelect
          onSelect={(idx) => {
            setLevelIndex(idx);
            setScreen("play");
          }}
          onBack={() => setScreen("squad")}
        />
      )}

      {screen === "play" && (
        <SlingshotGame
          levelIndex={levelIndex}
          squadIds={squad}
          onComplete={(won) => {
            if (won && levelIndex < 19) {
              setLevelIndex((i) => i + 1);
            } else {
              setScreen("levels");
            }
          }}
          onBack={() => setScreen("levels")}
        />
      )}
    </div>
  );
}
