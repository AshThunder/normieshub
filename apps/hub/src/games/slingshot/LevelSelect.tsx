import { PixelImage } from "@normie/shared";
import { SLINGSHOT_LEVELS } from "./levels";
import "./slingshot.css";

const STORAGE_KEY = "normie_slingshot_stars";

export function loadStars(): Record<number, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveStars(stars: Record<number, number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stars));
}

interface LevelSelectProps {
  onSelect: (index: number) => void;
  onBack: () => void;
}

export function LevelSelect({ onSelect, onBack }: LevelSelectProps) {
  const stars = loadStars();
  const completed = Object.keys(stars).length;
  const percent = Math.round((completed / SLINGSHOT_LEVELS.length) * 100);

  return (
    <div className="slingshot-level-select space-y-4">
      <div>
        <h2 className="text-xl font-bold uppercase tracking-wide">Select Level</h2>
        <p className="font-mono text-xs mt-1">
          Launch your squad at enemy Normies. Clear all targets to win.
        </p>
      </div>

      <div className="level-progress-bar">
        <div className="level-progress-fill" style={{ width: `${percent}%` }} />
        <span className="level-progress-text">
          {completed} / {SLINGSHOT_LEVELS.length} cleared ({percent}%)
        </span>
      </div>

      <div className="level-grid">
        {SLINGSHOT_LEVELS.map((lvl, idx) => {
          const unlocked = idx === 0 || stars[idx - 1] !== undefined || stars[idx] !== undefined;
          const starCount = stars[idx];
          return (
            <button
              key={lvl.id}
              type="button"
              className={`level-cell ${!unlocked ? "locked" : ""} ${starCount ? "completed" : ""}`}
              disabled={!unlocked}
              onClick={() => onSelect(idx)}
            >
              <PixelImage tokenId={lvl.targetNormieId} size={64} />
              <span className="level-label">
                #{String(lvl.id).padStart(2, "0")} {lvl.name}
              </span>
              {starCount !== undefined && (
                <span className="level-stars">{"★".repeat(starCount)}{"☆".repeat(3 - starCount)}</span>
              )}
            </button>
          );
        })}
      </div>

      <button type="button" className="normie-btn normie-btn-outline" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
