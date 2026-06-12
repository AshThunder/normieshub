import type { TraitsIndexEntry } from "../api/types";
import { PixelImage } from "./PixelImage";
import { TraitBadge } from "./TraitBadge";

interface NormieCardProps {
  entry: TraitsIndexEntry | { id: number; type?: string };
  compact?: boolean;
}

export function NormieCard({ entry, compact = false }: NormieCardProps) {
  const full = "type" in entry && entry.type;
  return (
    <div className="normie-card flex flex-col items-center gap-2">
      <PixelImage tokenId={entry.id} size={compact ? 48 : 80} />
      <span className="font-mono text-sm font-bold">#{entry.id}</span>
      {full && !compact && (
        <div className="flex flex-wrap gap-1 justify-center">
          <TraitBadge label="Type" value={(entry as TraitsIndexEntry).type} />
          <TraitBadge label="Expression" value={(entry as TraitsIndexEntry).expression} />
        </div>
      )}
    </div>
  );
}
