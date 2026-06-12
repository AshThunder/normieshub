import { useEffect, useRef, useState } from "react";
import { PixelImage, getSlingshotAbility, getTraits } from "@normie/shared";
import { SlingshotEngine, type SlingshotHud } from "./engine/SlingshotEngine";
import { SLINGSHOT_LEVELS } from "./levels";
import { loadStars, saveStars } from "./LevelSelect";
import { MobileJoystick } from "./MobileJoystick";
import "./slingshot.css";

interface SlingshotGameProps {
  levelIndex: number;
  squadIds: number[];
  onComplete: (won: boolean, stars?: number) => void;
  onBack: () => void;
}

const defaultHud: SlingshotHud = {
  score: 0,
  birdsLeft: 0,
  enemiesLeft: 0,
  abilityReady: false,
  currentBirdId: null,
  queuedBirdIds: [],
};

export function SlingshotGame({ levelIndex, squadIds, onComplete, onBack }: SlingshotGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SlingshotEngine | null>(null);
  const [hud, setHud] = useState<SlingshotHud>(defaultHud);
  const [overlay, setOverlay] = useState<"win" | "lose" | null>(null);
  const [stars, setStars] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const [abilityLabel, setAbilityLabel] = useState("");

  const level = SLINGSHOT_LEVELS[levelIndex];
  const squadKey = squadIds.join(",");

  useEffect(() => {
    let active = true;
    setOverlay(null);
    setHud(defaultHud);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new SlingshotEngine(canvas, {
      onScore: () => {},
      onHud: (next) => {
        if (active) setHud(next);
      },
      onWin: (finalScore, birdsLeft) => {
        if (!active) return;
        let s = 1;
        if (birdsLeft >= 2) s = 3;
        else if (birdsLeft >= 1) s = 2;
        setStars(s);
        const existing = loadStars();
        if ((existing[levelIndex] ?? 0) < s) {
          existing[levelIndex] = s;
          saveStars(existing);
        }
        setHud((h) => ({ ...h, score: finalScore }));
        setOverlay("win");
      },
      onLose: (finalScore) => {
        if (!active) return;
        setHud((h) => ({ ...h, score: finalScore }));
        setOverlay("lose");
      },
    });

    engineRef.current = engine;
    void engine.loadLevel(level, squadIds);

    return () => {
      active = false;
      engine.destroy();
      engineRef.current = null;
    };
  }, [levelIndex, squadKey, retryKey, level]);

  useEffect(() => {
    if (!hud.currentBirdId) return;
    getTraits(hud.currentBirdId)
      .then((d) => {
        const t = d.attributes.find((a) => a.trait_type === "Type")?.value ?? "Human";
        setAbilityLabel(getSlingshotAbility(t).name);
      })
      .catch(() => setAbilityLabel("Special"));
  }, [hud.currentBirdId]);

  return (
    <div className="space-y-3 slingshot-play">
      <div className="slingshot-hud-grid">
        <div>
          <span className="hud-label">Level</span>
          <span className="hud-value">#{String(level.id).padStart(2, "0")}</span>
        </div>
        <div>
          <span className="hud-label">Score</span>
          <span className="hud-value">{hud.score}</span>
        </div>
        <div>
          <span className="hud-label">Squad</span>
          <span className="hud-dots">
            {hud.queuedBirdIds.map((id) => (
              <span key={id} className="hud-dot" title={`#${id}`}>
                ●
              </span>
            ))}
          </span>
        </div>
        <div>
          <span className="hud-label">Targets</span>
          <span className="hud-value">{hud.enemiesLeft}</span>
        </div>
      </div>

      {hud.abilityReady && (
        <p className="slingshot-ability-hint font-mono text-xs text-center animate-pulse">
          Tap to use {abilityLabel}!
        </p>
      )}

      <div className="slingshot-canvas-wrap">
        <canvas ref={canvasRef} />
      </div>

      <MobileJoystick
        onMove={(nx, ny) => engineRef.current?.joystickMove(nx, ny)}
        onRelease={() => engineRef.current?.joystickRelease()}
      />

      <p className="font-mono text-xs text-center text-[#48494b] hidden sm:block">
        Drag backward to aim · Dotted line shows trajectory · Tap mid-air for trait ability
      </p>

      {overlay === "win" && (
        <div className="slingshot-overlay">
          <PixelImage tokenId={level.targetNormieId} size={100} />
          <h3 className="font-bold uppercase mt-2">Squad Wins!</h3>
          <p className="font-mono text-xs text-[#48494b]">
            Enemy #{level.targetNormieId} cleared
          </p>
          <p className="font-mono text-sm mt-1">Score: {hud.score}</p>
          <p className="text-lg my-2">{"★".repeat(stars)}{"☆".repeat(3 - stars)}</p>
          <div className="flex gap-2 justify-center flex-wrap mt-3">
            {levelIndex < SLINGSHOT_LEVELS.length - 1 ? (
              <button type="button" className="normie-btn" onClick={() => onComplete(true, stars)}>
                Next Level
              </button>
            ) : (
              <button type="button" className="normie-btn" onClick={() => onComplete(true, stars)}>
                All 20 Complete!
              </button>
            )}
            <button type="button" className="normie-btn normie-btn-outline" onClick={onBack}>
              Level Select
            </button>
          </div>
        </div>
      )}

      {overlay === "lose" && (
        <div className="slingshot-overlay">
          <h3 className="font-bold uppercase">Squad Defeated</h3>
          <p className="font-mono text-sm">Score: {hud.score}</p>
          <div className="flex gap-2 justify-center mt-3">
            <button type="button" className="normie-btn" onClick={() => setRetryKey((k) => k + 1)}>
              Retry
            </button>
            <button type="button" className="normie-btn normie-btn-outline" onClick={onBack}>
              Level Select
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
