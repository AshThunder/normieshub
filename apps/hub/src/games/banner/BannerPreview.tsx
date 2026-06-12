import { useEffect, useRef } from "react";
import {
  BANNER_FORMATS,
  drawBannerArt,
  drawBannerSafeZone,
  type BannerFormat,
  type BannerPngOptions,
  type BannerTemplate,
} from "@normie/shared";

interface BannerPreviewProps {
  format: BannerFormat;
  template: BannerTemplate;
  normieIds: number[];
  featuredId: number;
  userPixels?: string;
  title: string;
  tagline: string;
  description: string;
  handle?: string;
  showSafeZone: boolean;
}

const PREVIEW_WIDTH = 640;

export function BannerPreview({
  format,
  template,
  normieIds,
  featuredId,
  userPixels,
  title,
  tagline,
  description,
  handle,
  showSafeZone,
}: BannerPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawGen = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || normieIds.length === 0) return;

    const dims = BANNER_FORMATS[format];
    const w = PREVIEW_WIDTH;
    const h = Math.round(dims.h * (PREVIEW_WIDTH / dims.w));
    const gen = ++drawGen.current;

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const options: BannerPngOptions = {
      format,
      template,
      normieIds,
      featuredId,
      userPixels,
      title: title || undefined,
      tagline: tagline || undefined,
      description: description || undefined,
      handle,
      width: w,
      height: h,
    };

    void drawBannerArt(ctx, options)
      .then(() => {
        if (gen !== drawGen.current) return;
        if (showSafeZone) drawBannerSafeZone(ctx, format, w, h);
      })
      .catch(() => {});
  }, [
    format,
    template,
    normieIds,
    featuredId,
    userPixels,
    title,
    tagline,
    description,
    handle,
    showSafeZone,
  ]);

  const dims = BANNER_FORMATS[format];
  const aspectH = Math.round((dims.h / dims.w) * PREVIEW_WIDTH);

  return (
    <canvas
      ref={canvasRef}
      className="normie-pixelated w-full max-w-[640px] mx-auto border-2 border-[#48494b] bg-[#e3e5e4]"
      width={PREVIEW_WIDTH}
      height={aspectH}
    />
  );
}
