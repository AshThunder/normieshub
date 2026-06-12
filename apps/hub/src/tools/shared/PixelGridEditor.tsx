import { GRID_SIZE, PIXEL_OFF, drawPixelGrid } from "@normie/shared";
import { useEffect, useRef } from "react";

interface PixelGridEditorProps {
  pixels: string;
  transform?: string;
  onToggle?: (x: number, y: number) => void;
  disabled?: boolean;
  size?: number;
  label?: string;
  highlightTransform?: boolean;
}

export function PixelGridEditor({
  pixels,
  transform,
  onToggle,
  disabled = false,
  size = 320,
  label,
  highlightTransform = false,
}: PixelGridEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scale = size / GRID_SIZE;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = PIXEL_OFF;
    ctx.fillRect(0, 0, size, size);
    drawPixelGrid(ctx, pixels, 0, 0, scale);

    if (highlightTransform && transform) {
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const idx = y * GRID_SIZE + x;
          if (transform[idx] === "1") {
            ctx.fillStyle = "rgba(255, 80, 80, 0.35)";
            ctx.fillRect(x * scale, y * scale, scale, scale);
          }
        }
      }
    }
  }, [pixels, transform, size, scale, highlightTransform]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !onToggle) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * GRID_SIZE);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * GRID_SIZE);
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) onToggle(x, y);
  };

  return (
    <div className="space-y-1">
      {label && <p className="font-mono text-[10px] uppercase tracking-wide text-[#48494b]">{label}</p>}
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className={`normie-pixelated border-2 border-[#48494b] bg-[#e3e5e4] ${
          onToggle && !disabled ? "cursor-crosshair" : ""
        }`}
        style={{ width: size, height: size }}
        aria-label={label ?? "Pixel grid"}
      />
    </div>
  );
}
