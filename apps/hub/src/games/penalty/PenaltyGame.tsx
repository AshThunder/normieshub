import { useEffect, useRef, useState } from "react";
import { getPenaltyModifiers, getTraits } from "@normie/shared";
import {
  PenaltyEngine,
  type PenaltyHud,
  type PenaltyMode,
} from "./engine/PenaltyEngine";
import "./penalty.css";

const HIGH_SCORE_KEY = "normie-penalty-high";

interface PenaltyGameProps {
  mode: PenaltyMode;
  kickerId: number;
  squadIds: number[];
  onBack: () => void;
}

const defaultHud: PenaltyHud = {
  phase: "aim",
  mode: "solo",
  round: 1,
  maxRounds: 5,
  playerGoals: 0,
  playerSaves: 0,
  aiGoals: 0,
  aiSaves: 0,
  isPlayerKicker: true,
  power: 0,
  message: "",
  kickerId: 42,
  keeperId: 615,
};

export function PenaltyGame({ mode, kickerId, squadIds, onBack }: PenaltyGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PenaltyEngine | null>(null);
  const [hud, setHud] = useState<PenaltyHud>(defaultHud);
  const [overlay, setOverlay] = useState<{ won: boolean; goals: number; ai: number } | null>(
    null,
  );
  const [traitLabel, setTraitLabel] = useState("");
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem(HIGH_SCORE_KEY);
    if (stored) setHighScore(parseInt(stored, 10) || 0);
  }, []);

  useEffect(() => {
    getTraits(kickerId)
      .then((d) => {
        const t = d.attributes.find((a) => a.trait_type === "Type")?.value ?? "Human";
        const m = getPenaltyModifiers(t);
        setTraitLabel(`${m.name}: ${m.description}`);
      })
      .catch(() => setTraitLabel(""));
  }, [kickerId]);

  useEffect(() => {
    setOverlay(null);
    const canvas = canvasRef.current;
    if (!canvas) return;

    let active = true;

    const engine = new PenaltyEngine(canvas, {
      onHud: (next) => {
        if (active) setHud(next);
      },
      onComplete: (won, goals, ai) => {
        if (!active) return;
        if (mode === "solo") {
          const prev = parseInt(localStorage.getItem(HIGH_SCORE_KEY) ?? "0", 10) || 0;
          if (goals > prev) {
            localStorage.setItem(HIGH_SCORE_KEY, String(goals));
            setHighScore(goals);
          }
        }
        setOverlay({ won, goals, ai });
      },
    });

    engineRef.current = engine;
    void engine.start(mode, kickerId, squadIds);

    return () => {
      active = false;
      engine.destroy();
      engineRef.current = null;
    };
  }, [mode, kickerId, squadIds.join(",")]);

  return (
    <div className="space-y-3">
      <div className="penalty-hud">
        <div>
          <span className="block text-[10px] uppercase opacity-70">Mode</span>
          {hud.mode === "solo" ? "Solo" : "Shootout"}
        </div>
        <div>
          <span className="block text-[10px] uppercase opacity-70">Round</span>
          {hud.round}/{hud.mode === "solo" ? hud.maxRounds : hud.maxRounds * 2}
        </div>
        <div>
          <span className="block text-[10px] uppercase opacity-70">You</span>
          {hud.playerGoals}G {hud.mode === "shootout" && `${hud.playerSaves}S`}
        </div>
        {hud.mode === "shootout" && (
          <div>
            <span className="block text-[10px] uppercase opacity-70">AI</span>
            {hud.aiGoals}G {hud.aiSaves}S
          </div>
        )}
        {hud.mode === "solo" && (
          <div>
            <span className="block text-[10px] uppercase opacity-70">Best</span>
            {highScore}/5
          </div>
        )}
      </div>

      {traitLabel && <p className="font-mono text-xs text-center">{traitLabel}</p>}
      <p className="font-mono text-xs text-center font-bold">{hud.message}</p>

      <div className="penalty-canvas-wrap">
        <canvas ref={canvasRef} />
      </div>

      <div className="flex gap-2 justify-center">
        <button type="button" className="normie-btn normie-btn-outline text-xs" onClick={onBack}>
          Back
        </button>
      </div>

      {overlay && (
        <div className="penalty-overlay">
          <h3 className="font-bold text-lg uppercase">
            {overlay.won || (mode === "solo" && overlay.goals >= 0) ? "Finished!" : "Defeat"}
          </h3>
          <p className="font-mono text-sm mt-2">
            {mode === "solo"
              ? `You scored ${overlay.goals} / 5`
              : `Final: ${overlay.goals} - ${overlay.ai}`}
          </p>
          {mode === "solo" && overlay.goals >= highScore && (
            <p className="font-mono text-xs mt-1">New best!</p>
          )}
          <button type="button" className="normie-btn mt-4 text-xs" onClick={onBack}>
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
