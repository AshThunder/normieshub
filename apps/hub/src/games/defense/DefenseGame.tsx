import { useEffect, useRef, useState } from "react";
import { PixelImage } from "@normie/shared";
import { UPGRADE_COST } from "./waves";
import {
  DefenseEngine,
  type DefenseHud,
  type SquadMember,
} from "./engine/DefenseEngine";
import "./defense.css";

interface DefenseGameProps {
  mapId: number;
  squad: SquadMember[];
  enemyIds: number[];
  onWin: (lives: number) => void;
  onLose: () => void;
  onBack: () => void;
}

const defaultHud: DefenseHud = {
  lives: 15,
  coins: 90,
  wave: 0,
  maxWaves: 10,
  enemiesLeft: 0,
  phase: "prep",
  selectedSlot: null,
  message: "",
  towers: [],
  squad: [],
  nextWave: null,
  prepSeconds: 0,
  placingSeconds: 0,
  towersPlaced: 0,
};

function phaseLabel(hud: DefenseHud): string {
  if (hud.phase === "prep") {
    if (hud.placingSeconds > 0) return `Deploying tower… ${hud.placingSeconds}s`;
    return `Build window — ${hud.prepSeconds}s until next wave`;
  }
  if (hud.phase === "wave") return `Wave ${hud.wave} — defend the base`;
  if (hud.phase === "won") return "Victory";
  return "Defeated";
}

function prepStepHint(hud: DefenseHud): string {
  if (hud.placingSeconds > 0) return "Wait for deployment to finish.";
  if (hud.selectedSlot === null) return "Step 1: Tap an empty numbered slot on the map.";
  const occupied = hud.towers.some((t) => t.slotId === hud.selectedSlot);
  if (occupied) return "Tower selected — upgrade below, or tap another slot.";
  return "Step 2: Tap a Normie below to deploy to the selected slot.";
}

export function DefenseGame({
  mapId,
  squad,
  enemyIds,
  onWin,
  onLose,
  onBack,
}: DefenseGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DefenseEngine | null>(null);
  const [hud, setHud] = useState<DefenseHud>(defaultHud);

  const onWinRef = useRef(onWin);
  const onLoseRef = useRef(onLose);
  onWinRef.current = onWin;
  onLoseRef.current = onLose;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new DefenseEngine(canvas, {
      onHud: setHud,
      onWin: (lives) => onWinRef.current(lives),
      onLose: () => onLoseRef.current(),
    });

    engineRef.current = engine;
    void engine.start(mapId, squad, enemyIds);

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [mapId, squad, enemyIds]);

  const place = (tokenId: number) => {
    engineRef.current?.placeTower(tokenId);
  };

  const upgrade = () => {
    if (hud.selectedSlot !== null) {
      engineRef.current?.upgradeTower(hud.selectedSlot);
    }
  };

  const selectedTower = hud.towers.find((t) => t.slotId === hud.selectedSlot);
  const upgradeCost =
    selectedTower && selectedTower.level < 3
      ? UPGRADE_COST[selectedTower.level] ?? 0
      : 0;

  const isPrep = hud.phase === "prep";
  const deploying = hud.placingSeconds > 0;
  const bannerClass = hud.phase === "wave" ? "wave" : isPrep ? "between" : "";

  return (
    <div className="defense-layout">
      <div className="defense-playfield">
        <div className={`defense-phase-banner ${bannerClass}`}>{phaseLabel(hud)}</div>

        <div className="defense-canvas-wrap">
          <canvas ref={canvasRef} />
        </div>
      </div>

      <aside className="defense-panel">
        <div className="defense-hud">
          <div className="defense-hud-stat">
            <span>Lives</span>
            <strong>{hud.lives}</strong>
          </div>
          <div className="defense-hud-stat">
            <span>Coins</span>
            <strong>{hud.coins}</strong>
          </div>
          <div className="defense-hud-stat">
            <span>Wave</span>
            <strong>
              {hud.wave}/{hud.maxWaves}
            </strong>
          </div>
          <div className="defense-hud-stat">
            <span>Towers</span>
            <strong>{hud.towersPlaced}/5</strong>
          </div>
        </div>

        {isPrep && hud.nextWave && (
          <div className="defense-wave-preview">
            <strong>
              {hud.wave === 0 ? "Wave 1 incoming" : `Next: wave ${hud.nextWave.wave}`}
            </strong>
            <br />
            {hud.nextWave.count} enemies
            {hud.nextWave.boss ? " + boss" : ""}
            <br />
            <span className="defense-prep-timer">{hud.prepSeconds}s to place</span>
          </div>
        )}

        {hud.phase === "wave" && (
          <div className="defense-instructions">
            <p className="defense-instructions-title">Combat</p>
            <p>
              Towers shoot automatically. {hud.enemiesLeft} enemies left this wave. Protect the base
              — you have {hud.lives} lives.
            </p>
            <p className="defense-instructions-note">
              The build window opens when this wave clears. Use coins then to place or upgrade towers.
            </p>
          </div>
        )}

        {hud.message && <p className="defense-message">{hud.message}</p>}

        {isPrep && (
          <>
            <div className="defense-instructions">
              <p className="defense-instructions-title">Build window</p>
              <p className="defense-instructions-hint">{prepStepHint(hud)}</p>
              <ol>
                <li>Tap an empty numbered slot on the map (1–8).</li>
                <li>Tap a Normie in your squad to deploy (~1.2s).</li>
                <li>Repeat until you have up to 5 towers placed.</li>
                <li>Tap a placed tower to upgrade it with coins.</li>
                <li>Press Start Wave when ready — or wait for the timer.</li>
              </ol>
              <p className="defense-instructions-note">
                Enemies follow the path from Spawn → Base. Each leak costs a life. Kills earn coins.
              </p>
            </div>
            <div className="defense-squad">
              {hud.squad.map((m) => (
                <button
                  key={m.tokenId}
                  type="button"
                  className={`defense-squad-item ${hud.selectedSlot !== null && !m.placed ? "selected-slot-hint" : ""}`}
                  disabled={m.placed || hud.selectedSlot === null || deploying}
                  onClick={() => place(m.tokenId)}
                >
                  <PixelImage tokenId={m.tokenId} size={36} />
                  <span className="font-mono text-[10px] block">#{m.tokenId}</span>
                  <span className="font-mono text-[9px] block">{m.type}</span>
                </button>
              ))}
            </div>

            {selectedTower && selectedTower.level < 3 && !deploying && (
              <button
                type="button"
                className="normie-btn text-xs w-full"
                disabled={hud.coins < upgradeCost}
                onClick={upgrade}
              >
                Upgrade slot {selectedTower.slotId + 1} → Lv{selectedTower.level + 1} ({upgradeCost}
                c)
              </button>
            )}

            <div className="defense-actions">
              <button
                type="button"
                className="normie-btn w-full"
                onClick={() => engineRef.current?.startWave()}
                disabled={deploying || hud.towersPlaced === 0}
              >
                {hud.wave === 0 ? "Start Wave 1 early" : `Start Wave ${hud.wave + 1} early`}
              </button>
            </div>
          </>
        )}

        {(hud.phase === "won" || hud.phase === "lost") && (
          <div className="text-center space-y-3">
            <p className="font-bold uppercase">
              {hud.phase === "won" ? "Map Cleared!" : "Defeated"}
            </p>
            <button type="button" className="normie-btn text-xs w-full" onClick={onBack}>
              Back to Maps
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
