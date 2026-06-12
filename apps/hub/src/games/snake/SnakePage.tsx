import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { TokenPicker } from "@normie/shared";
import { SnakeGame } from "./SnakeGame";
import { SNAKE_SPEED, type SnakeDifficulty } from "./engine/SnakeEngine";
import { loadSnakeScores, migrateSnakeScores, type SnakeScores } from "./snake-scores";
import "./snake.css";

type Screen = "setup" | "play";

export function SnakePage() {
  const [params] = useSearchParams();
  const initial = parseInt(params.get("id") ?? "42", 10);
  const [screen, setScreen] = useState<Screen>("setup");
  const [tokenId, setTokenId] = useState(isNaN(initial) ? 42 : initial);
  const [difficulty, setDifficulty] = useState<SnakeDifficulty>("medium");
  const [highScores, setHighScores] = useState<SnakeScores>(loadSnakeScores);

  useEffect(() => {
    migrateSnakeScores();
    setHighScores(loadSnakeScores());
  }, []);

  const refreshScores = () => setHighScores(loadSnakeScores());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wide">Normie Snake</h1>
        <p className="font-mono text-xs mt-1">
          Start with your Normie as the head. Each one you eat joins the body — eat 12,
          get 12 unique faces plus your head.
        </p>
      </div>

      {screen === "setup" ? (
        <div className="space-y-4 max-w-md">
          <div>
            <p className="font-mono text-xs uppercase mb-2">Difficulty</p>
            <div className="snake-difficulty-btns">
              {(Object.keys(SNAKE_SPEED) as SnakeDifficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`normie-btn text-xs ${difficulty === d ? "active" : "normie-btn-outline"}`}
                  onClick={() => setDifficulty(d)}
                >
                  {SNAKE_SPEED[d].label}
                  {highScores[d] > 0 && (
                    <span className="block text-[9px] opacity-80">best {highScores[d]}</span>
                  )}
                </button>
              ))}
            </div>
            <p className="font-mono text-[10px] mt-2 text-[#48494b]">
              {difficulty === "easy" && "Slower crawl — good for learning the grid."}
              {difficulty === "medium" && "Balanced speed with gradual ramp-up."}
              {difficulty === "hard" && "Fast from the start — speed ramps quickly."}
            </p>
          </div>

          <TokenPicker value={tokenId} onChange={setTokenId} />
          <button type="button" className="normie-btn w-full" onClick={() => setScreen("play")}>
            Play
          </button>
        </div>
      ) : (
        <SnakeGame
          headTokenId={tokenId}
          difficulty={difficulty}
          onBack={() => {
            refreshScores();
            setScreen("setup");
          }}
        />
      )}
    </div>
  );
}
