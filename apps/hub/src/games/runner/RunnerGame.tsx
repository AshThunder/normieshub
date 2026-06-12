import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import {
  getPixels,
  getTraits,
  loadXProfilePixels,
  normiePlaceholderDataUrl,
  normalizeXHandle,
  pixelsToDataUrl,
} from "@normie/shared";
import { randomNormieIds } from "../../data/traits-index";
import { RunnerScene } from "./scenes/RunnerScene";
import { EndScreen } from "./EndScreen";
import { MobileLanePad } from "./MobileLanePad";
import "./runner.css";

function getRunnerScene(game: Phaser.Game | null): RunnerScene | null {
  const scene = game?.scene.getScene("RunnerScene");
  return scene instanceof RunnerScene ? scene : null;
}

interface RunnerGameProps {
  tokenId: number;
  xHandle: string;
  onBack: () => void;
}

async function resolveNormieDataUrl(id: number): Promise<string> {
  try {
    const pixels = await getPixels(id);
    if (pixels.length >= 1600) return pixelsToDataUrl(pixels, 48);
  } catch {
    /* fallback below */
  }
  return normiePlaceholderDataUrl(id, 48);
}

async function resolvePlayerDataUrl(tokenId: number, xHandle: string): Promise<string> {
  const handle = normalizeXHandle(xHandle);
  if (handle) {
    try {
      const pixels = await loadXProfilePixels(handle);
      return pixelsToDataUrl(pixels, 48);
    } catch {
      /* fall back to selected Normie */
    }
  }
  return resolveNormieDataUrl(tokenId);
}

export function RunnerGame({ tokenId, xHandle, onBack }: RunnerGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [collected, setCollected] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!containerRef.current || !playing || gameOver) return;

    let active = true;
    let onResize: (() => void) | undefined;
    let resizeObserver: ResizeObserver | undefined;

    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const traits = await getTraits(tokenId);
        const normieType = traits.attributes.find((a) => a.trait_type === "Type")?.value ?? "Human";
        if (!active) return;

        const playerImageUrl = await resolvePlayerDataUrl(tokenId, xHandle);
        if (!active) return;

        const normiePool = randomNormieIds(12, tokenId);
        if (!normiePool.includes(tokenId)) normiePool.push(tokenId);

        const normieTextureUrls: Record<number, string> = {};
        await Promise.all(
          normiePool.map(async (id) => {
            normieTextureUrls[id] = await resolveNormieDataUrl(id);
          }),
        );
        if (!active) return;

        gameRef.current?.destroy(true);

        const parent = containerRef.current!;
        const g = new Phaser.Game({
          type: Phaser.AUTO,
          width: 800,
          height: 600,
          parent,
          backgroundColor: "#e3e5e4",
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 800,
            height: 600,
          },
          scene: [RunnerScene],
        });

        onResize = () => g.scale.refresh();
        window.addEventListener("resize", onResize);
        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(() => g.scale.refresh());
          resizeObserver.observe(parent);
        }

        g.scene.start("RunnerScene", {
          tokenId,
          normieType,
          playerImageUrl,
          normieTextureUrls,
          onCardCollect: (id: number) => {
            if (!active) return;
            setCollected((prev) => [...prev, id]);
          },
          onGameOver: (s: number) => {
            if (!active) return;
            setScore(s);
            setGameOver(true);
          },
        });

        gameRef.current = g;
      } catch {
        if (active) setLoadError("Could not load runner assets. Check your Normie ID or X handle.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      if (onResize) window.removeEventListener("resize", onResize);
      resizeObserver?.disconnect();
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [tokenId, xHandle, playing, gameOver]);

  if (gameOver) {
    return (
      <EndScreen
        score={score}
        collectedIds={collected}
        xHandle={xHandle}
        onRestart={() => {
          setCollected([]);
          setScore(0);
          setGameOver(false);
          setPlaying(true);
        }}
      />
    );
  }

  const shiftLane = (dir: number) => {
    getRunnerScene(gameRef.current)?.shiftLane(dir);
  };

  return (
    <div className="space-y-4 runner-play">
      <p className="font-mono text-xs text-center hidden sm:block">
        Arrow keys or tap left/right to switch lanes
      </p>
      {loading && <p className="font-mono text-xs text-center">Loading Normies…</p>}
      {loadError && <p className="font-mono text-xs text-center text-red-600">{loadError}</p>}
      <div ref={containerRef} className="runner-canvas-wrap" />
      <MobileLanePad onLeft={() => shiftLane(-1)} onRight={() => shiftLane(1)} />
      <button type="button" className="normie-btn normie-btn-outline mx-auto block" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
