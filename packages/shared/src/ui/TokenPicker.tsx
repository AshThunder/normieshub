import { useCallback, useEffect, useState } from "react";
import { getTraits } from "../api/normies";
import { TOKEN_MAX, TOKEN_MIN } from "../constants";
import { getSlingshotAbility } from "../traits/stats";
import { PixelImage } from "./PixelImage";
import { TraitBadge } from "./TraitBadge";

interface TokenPickerProps {
  value: number;
  onChange: (id: number) => void;
  showAbility?: boolean;
}

export function TokenPicker({ value, onChange, showAbility = false }: TokenPickerProps) {
  const [input, setInput] = useState(String(value));
  const [traits, setTraits] = useState<string[]>([]);
  const [type, setType] = useState("Human");
  const [error, setError] = useState("");

  const loadTraits = useCallback(async (id: number) => {
    try {
      setError("");
      const data = await getTraits(id);
      setTraits(data.attributes.map((a) => `${a.trait_type}: ${a.value}`));
      const t = data.attributes.find((a) => a.trait_type === "Type")?.value ?? "Human";
      setType(t);
    } catch {
      setTraits([]);
      setType("Human");
      setError("");
    }
  }, []);

  useEffect(() => {
    setInput(String(value));
    void loadTraits(value);
  }, [value, loadTraits]);

  const commit = () => {
    const id = parseInt(input, 10);
    if (isNaN(id) || id < TOKEN_MIN || id > TOKEN_MAX) {
      setError(`ID must be ${TOKEN_MIN}–${TOKEN_MAX}`);
      return;
    }
    onChange(id);
    void loadTraits(id);
  };

  const ability = showAbility ? getSlingshotAbility(type) : null;

  return (
    <div className="normie-card space-y-3 min-w-0">
      <div className="flex flex-col sm:flex-row gap-3 items-start min-w-0">
        <PixelImage tokenId={value} size={80} className="border-2 border-[#48494b] shrink-0" />
        <div className="flex-1 min-w-0 w-full space-y-2">
          <label className="font-mono text-xs uppercase text-[#48494b]">Normie ID</label>
          <div className="flex flex-col sm:flex-row gap-2 min-w-0">
            <input
              className="normie-input flex-1 min-w-0 w-full"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commit()}
            />
            <button type="button" className="normie-btn w-full sm:w-auto shrink-0" onClick={commit}>
              Load
            </button>
          </div>
          {error && <p className="text-red-600 text-xs font-mono">{error}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {traits.slice(0, 4).map((t) => {
          const [, v] = t.split(": ");
          return <TraitBadge key={t} label={t} value={v ?? t} />;
        })}
      </div>
      {ability && (
        <p className="font-mono text-xs text-[#48494b]">
          <strong>{ability.name}:</strong> {ability.description}
        </p>
      )}
    </div>
  );
}
