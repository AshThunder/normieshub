interface TraitBadgeProps {
  label: string;
  value: string;
}

export function TraitBadge({ label, value }: TraitBadgeProps) {
  return (
    <span className="normie-badge" title={label}>
      {value}
    </span>
  );
}
