import { useEffect, useState } from "react";
import { getPixels, normieImageUrl } from "../api/normies";
import { normiePlaceholderDataUrl, pixelsToDataUrl, placeholderPixelString } from "../pixel/render";

interface PixelImageProps {
  tokenId: number;
  size?: number;
  className?: string;
  src?: string;
}

export function PixelImage({ tokenId, size = 80, className = "", src }: PixelImageProps) {
  const primary = src ?? normieImageUrl(tokenId);
  const [resolvedSrc, setResolvedSrc] = useState(primary);
  const [stage, setStage] = useState<"png" | "pixels">("png");

  useEffect(() => {
    setResolvedSrc(src ?? normieImageUrl(tokenId));
    setStage("png");
  }, [tokenId, src]);

  const handleError = () => {
    if (stage === "png") {
      setStage("pixels");
      void getPixels(tokenId)
        .then((pixels) => {
          if (pixels.length >= 1600) setResolvedSrc(pixelsToDataUrl(pixels, size));
          else setResolvedSrc(normiePlaceholderDataUrl(tokenId, size));
        })
        .catch(() => setResolvedSrc(pixelsToDataUrl(placeholderPixelString(tokenId), size)));
    }
  };

  return (
    <img
      src={resolvedSrc}
      alt={`Normie #${tokenId}`}
      width={size}
      height={size}
      className={`normie-pixelated ${className}`}
      loading="lazy"
      onError={handleError}
    />
  );
}
