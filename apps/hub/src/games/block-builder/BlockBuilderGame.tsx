import { useEffect, useRef, useState } from "react";
import { BlockBuilderEngine } from "./engine/BlockBuilderEngine";
import type { BlockBuilderHud, BlockBuilderResult } from "./engine/types";
import { EndScreen } from "./EndScreen";
import { MobileControls } from "./MobileControls";
import "./block-builder.css";

const defaultHud: BlockBuilderHud = {
  score: 0,
  lines: 0,
  level: 1,
  collected: 0,
  status: "playing",
  message: "",
  difficulty: "medium",
};

export function BlockBuilderGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BlockBuilderEngine | null>(null);
  const [hud, setHud] = useState<BlockBuilderHud>(defaultHud);
  const [result, setResult] = useState<BlockBuilderResult | null>(null);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let active = true;
    setResult(null);
    setHud(defaultHud);

    const engine = new BlockBuilderEngine(canvas, {
      onHud: (next) => {
        if (active) setHud(next);
      },
      onGameOver: (r) => {
        if (active) setResult(r);
      },
    });

    engineRef.current = engine;
    engine.start();

    return () => {
      active = false;
      engine.destroy();
      engineRef.current = null;
    };
  }, [runKey]);

  if (result) {
    return (
      <EndScreen
        result={result}
        onRestart={() => {
          setResult(null);
          setRunKey((k) => k + 1);
        }}
      />
    );
  }

  const engine = () => engineRef.current;

  return (
    <div className="space-y-3 block-builder-play">
      <div className="block-builder-hud">
        <div>
          <span>Score</span>
          <strong>{hud.score}</strong>
        </div>
        <div>
          <span>Lines</span>
          <strong>{hud.lines}</strong>
        </div>
        <div>
          <span>Level</span>
          <strong>{hud.level}</strong>
        </div>
        <div>
          <span>Normies</span>
          <strong>{hud.collected}</strong>
        </div>
      </div>

      {hud.message && (
        <p className="font-mono text-xs text-center text-[#48494b]">{hud.message}</p>
      )}

      <p className="font-mono text-xs text-center hidden sm:block text-[#48494b]">
        Arrows move/rotate · Down soft drop · Space hard drop
      </p>

      <div className="block-builder-canvas-wrap">
        <canvas ref={canvasRef} />
      </div>

      <MobileControls
        onLeft={() => engine()?.moveLeft()}
        onRotate={() => engine()?.rotateCW()}
        onRight={() => engine()?.moveRight()}
        onDrop={() => engine()?.hardDrop()}
      />
    </div>
  );
}
