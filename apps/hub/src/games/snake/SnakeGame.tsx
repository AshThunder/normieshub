import { useEffect, useRef, useState } from "react";
import { SnakeEngine, type SnakeDifficulty, type SnakeHud } from "./engine/SnakeEngine";
import { MobileControls } from "./MobileControls";
import "./snake.css";

interface SnakeGameProps {
  headTokenId: number;
  difficulty: SnakeDifficulty;
  onBack: () => void;
}

const defaultHud: SnakeHud = {
  score: 0,
  eaten: 0,
  length: 1,
  highScore: 0,
  status: "ready",
  message: "",
  difficulty: "medium",
};

export function SnakeGame({ headTokenId, difficulty, onBack }: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SnakeEngine | null>(null);
  const [hud, setHud] = useState<SnakeHud>(defaultHud);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new SnakeEngine(canvas, { onHud: setHud });
    engineRef.current = engine;
    void engine.start(headTokenId, difficulty);

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [headTokenId, difficulty]);

  const engine = () => engineRef.current;

  return (
    <div className="space-y-3 snake-play">
      <div className="snake-hud">
        <div className="snake-hud-stat">
          <span>Score</span>
          <strong>{hud.score}</strong>
        </div>
        <div className="snake-hud-stat">
          <span>Eaten</span>
          <strong>{hud.eaten}</strong>
        </div>
        <div className="snake-hud-stat">
          <span>Length</span>
          <strong>{hud.length}</strong>
        </div>
        <div className="snake-hud-stat">
          <span>Best</span>
          <strong>{Math.max(hud.highScore, hud.score)}</strong>
        </div>
      </div>

      <div className="snake-wrap">
        <canvas ref={canvasRef} />
      </div>

      <p className="font-mono text-xs text-center max-w-md mx-auto">{hud.message}</p>

      <MobileControls
        onUp={() => engine()?.steer("up")}
        onDown={() => engine()?.steer("down")}
        onLeft={() => engine()?.steer("left")}
        onRight={() => engine()?.steer("right")}
        showRetry={hud.status === "dead"}
        onRetry={() => engine()?.retry()}
      />

      <p className="font-mono text-xs text-center hidden sm:block text-[#48494b]">
        Arrows or WASD to move · Space to retry
      </p>

      <div className="flex justify-center">
        <button type="button" className="normie-btn normie-btn-outline text-xs" onClick={onBack}>
          Change Normie
        </button>
      </div>
    </div>
  );
}
