import { useEffect, useRef } from "react";
import { drawPixelGrid } from "@normie/shared";

interface PixelPreviewProps {
  pixels: string;
  size?: number;
}

export function PixelPreview({ pixels, size = 400 }: PixelPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scale = size / 40;
    ctx.fillStyle = "#e3e5e4";
    ctx.fillRect(0, 0, size, size);
    drawPixelGrid(ctx, pixels, 0, 0, scale);
  }, [pixels, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="normie-pixelated border-2 border-[#48494b] bg-[#e3e5e4] w-full max-w-[400px] mx-auto"
    />
  );
}
