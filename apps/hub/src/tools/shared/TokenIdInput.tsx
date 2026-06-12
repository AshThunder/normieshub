interface TokenIdInputProps {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
}

export function TokenIdInput({
  value,
  onChange,
  label = "Normie ID",
  placeholder = "0–9999",
}: TokenIdInputProps) {
  return (
    <label className="block space-y-1">
      <span className="font-mono text-[10px] uppercase tracking-wide text-[#48494b]">{label}</span>
      <input
        type="number"
        min={0}
        max={9999}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border-2 border-[#48494b] px-3 py-2 font-mono text-sm bg-white"
      />
    </label>
  );
}
