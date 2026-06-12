import { useEffect, useRef } from "react";
import { drawCircleArt } from "@normie/shared";

interface CirclePreviewProps {
  userPixels: string;
  normieIds: number[];
  handle?: string;
}

export function CirclePreview({ userPixels, normieIds, handle }: CirclePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = 640;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;
    void drawCircleArt(ctx, { userPixels, normieIds, handle, size }).catch(() => {});

    return () => {
      cancelled = true;
      void cancelled;
    };
  }, [userPixels, normieIds, handle]);

  return (
    <canvas
      ref={canvasRef}
      className="normie-pixelated w-full max-w-[640px] mx-auto border-2 border-[#48494b] bg-[#e3e5e4]"
      width={640}
      height={640}
    />
  );
}
