import { useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { getTraits, PixelImage, TokenPicker } from "@normie/shared";
import { loadTraitsIndex, randomNormieIds } from "../../data/traits-index";
import { DEFENSE_MAPS } from "./maps";
import { DefenseGame } from "./DefenseGame";
import type { SquadMember } from "./engine/DefenseEngine";
import {
  loadDefenseProgress,
  saveDefenseProgress,
  starsFromLives,
} from "./progress";
import "./defense.css";

type Screen = "maps" | "squad" | "play";

async function buildSquad(ids: number[]): Promise<SquadMember[]> {
  return Promise.all(
    ids.map(async (tokenId) => {
      try {
        const traits = await getTraits(tokenId);
        const type = traits.attributes.find((a) => a.trait_type === "Type")?.value ?? "Human";
        const expression = traits.attributes.find((a) => a.trait_type === "Expression")?.value;
        return { tokenId, type, expression, placed: false };
      } catch {
        return { tokenId, type: "Human", placed: false };
      }
    }),
  );
}

export function DefensePage() {
  const [params] = useSearchParams();
  const initial = parseInt(params.get("id") ?? "42", 10);
  const [screen, setScreen] = useState<Screen>("maps");
  const [mapId, setMapId] = useState(0);
  const [progress, setProgress] = useState(loadDefenseProgress());
  const [squadIds, setSquadIds] = useState<number[]>([
    isNaN(initial) ? 42 : initial,
    615,
    100,
    200,
    300,
  ]);
  const [pickerIdx, setPickerIdx] = useState(0);
  const [squad, setSquad] = useState<SquadMember[]>([]);
  const [enemyIds, setEnemyIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTraitsIndex().then(() => {
      setEnemyIds(randomNormieIds(30));
    });
  }, []);

  const startMap = (id: number) => {
    if (id > progress.unlockedMaps) return;
    setMapId(id);
    setScreen("squad");
  };

  const launchGame = useCallback(async () => {
    setLoading(true);
    const members = await buildSquad(squadIds);
    setSquad(members);
    setLoading(false);
    setScreen("play");
  }, [squadIds]);

  const handleWin = (lives: number) => {
    const stars = starsFromLives(lives);
    const prevStars = progress.mapStars[mapId] ?? 0;
    const next = {
      unlockedMaps: Math.max(progress.unlockedMaps, mapId + 1),
      mapStars: {
        ...progress.mapStars,
        [mapId]: Math.max(prevStars, stars) as 1 | 2 | 3,
      },
    };
    setProgress(next);
    saveDefenseProgress(next);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wide">Normies Defense</h1>
        <div className="font-mono text-xs mt-2 space-y-1 text-[#48494b] max-w-xl">
          <p>
            Tower defense on a winding path. Enemies spawn at the left and march toward your base on
            the right — stop them with up to 5 Normie towers.
          </p>
          <p>
            Between waves you get a build window to place and upgrade towers. Each Normie type shoots
            differently. Survive all 10 waves to clear the map.
          </p>
        </div>
      </div>

      {screen === "maps" && (
        <div className="space-y-4">
          <div className="defense-instructions">
            <p className="defense-instructions-title">How to play</p>
            <ol>
              <li>Pick a map — each has 10 waves, harder maps unlock as you earn stars.</li>
              <li>Choose 5 Normies for your squad. Each can become one tower.</li>
              <li>During the build window: tap a slot on the map, then tap a squad Normie to deploy.</li>
              <li>Upgrade placed towers with coins between waves. Start the next wave when ready.</li>
            </ol>
          </div>
          <p className="font-mono text-xs uppercase">Select map</p>
          <div className="defense-map-grid">
            {DEFENSE_MAPS.map((m) => {
              const locked = m.id > progress.unlockedMaps;
              const stars = progress.mapStars[m.id];
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`defense-map-cell ${locked ? "locked" : ""}`}
                  disabled={locked}
                  onClick={() => startMap(m.id)}
                >
                  <span className="font-bold text-sm block">{m.name}</span>
                  <span className="font-mono text-[10px]">10 waves</span>
                  {stars && <span className="block text-xs mt-1">{"★".repeat(stars)}</span>}
                  {locked && <span className="font-mono text-[10px] block mt-1">Locked</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {screen === "squad" && (
        <div className="space-y-4 max-w-lg">
          <p className="font-mono text-xs">
            Map: <strong>{DEFENSE_MAPS[mapId]?.name}</strong>
          </p>
          <div className="defense-instructions">
            <p className="defense-instructions-title">Your squad</p>
            <ol>
              <li>Pick 5 Normies — each becomes one tower for this run.</li>
              <li>Tap a slot below to edit, then use the picker to load a different ID.</li>
              <li>Normie type (Human, Alien, etc.) sets tower range, damage, and special effects.</li>
            </ol>
          </div>
          <p className="font-mono text-xs uppercase">Squad slots (5 Normies)</p>
          <div className="flex flex-wrap gap-2">
            {squadIds.map((id, i) => (
              <button
                key={i}
                type="button"
                className={`border-2 border-[#48494b] p-1 ${pickerIdx === i ? "ring-2 ring-[#1a1a1a]" : ""}`}
                onClick={() => setPickerIdx(i)}
              >
                <PixelImage tokenId={id} size={48} />
                <span className="font-mono text-[10px]">#{id}</span>
              </button>
            ))}
          </div>
          <TokenPicker
            value={squadIds[pickerIdx]}
            onChange={(id) => {
              const next = [...squadIds];
              next[pickerIdx] = id;
              setSquadIds(next);
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="normie-btn normie-btn-outline flex-1 text-xs"
              onClick={() => setScreen("maps")}
            >
              Back
            </button>
            <button
              type="button"
              className="normie-btn flex-1"
              disabled={loading}
              onClick={() => void launchGame()}
            >
              {loading ? "Loading..." : "Defend"}
            </button>
          </div>
        </div>
      )}

      {screen === "play" && squad.length > 0 && (
        <DefenseGame
          mapId={mapId}
          squad={squad}
          enemyIds={enemyIds}
          onWin={handleWin}
          onLose={() => {}}
          onBack={() => setScreen("maps")}
        />
      )}
    </div>
  );
}
