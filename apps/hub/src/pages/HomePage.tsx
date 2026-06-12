import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { audioManager } from "../audio/audioManager";

type HubTab = "all" | "games" | "tools";
type HubCategory = "game" | "tool";

const EXPERIENCES: {
  to: string;
  title: string;
  desc: string;
  category: HubCategory;
  ready: boolean;
}[] = [
  {
    to: "/games/slingshot",
    title: "Normie Slingshot",
    desc: "Angry Birds-style launcher. Trait abilities smash pixel block fortresses.",
    category: "game",
    ready: true,
  },
  {
    to: "/games/runner",
    title: "Normie Run",
    desc: "Temple Run endless runner. Collect cards, export your pixel self.",
    category: "game",
    ready: true,
  },
  {
    to: "/games/penalty",
    title: "Normie Penalty Shootout",
    desc: "Solo scoring or AI shootout. Traits affect curve, power, and dives.",
    category: "game",
    ready: true,
  },
  {
    to: "/games/defense",
    title: "Normies Defense",
    desc: "Tower defense on 3 maps. Place Normies, upgrade, survive 10 waves.",
    category: "game",
    ready: true,
  },
  {
    to: "/games/snake",
    title: "Normie Snake",
    desc: "Classic snake — 3 Normies to start, eat faces to grow your chain.",
    category: "game",
    ready: true,
  },
  {
    to: "/games/block-builder",
    title: "Normie Block Builder",
    desc: "Tetris-style stacking — clear lines to collect Normies, export a poster at game over.",
    category: "game",
    ready: true,
  },
  {
    to: "/tools/canvas-lab",
    title: "Canvas Lab",
    desc: "XOR simulator & burn preview — flip pixels, merge layers, estimate action points.",
    category: "tool",
    ready: true,
  },
  {
    to: "/tools/find-normie",
    title: "Find My Normie",
    desc: "Photo or X profile → scan the collection for your closest pixel match.",
    category: "tool",
    ready: true,
  },
  {
    to: "/games/normie-me",
    title: "Normie Me",
    desc: "X profile, upload, or URL → 40×40 Normie pixel portrait. Download & share.",
    category: "tool",
    ready: true,
  },
  {
    to: "/tools/id-card",
    title: "Normie ID Card",
    desc: "Official Normie card or personalised card with your pixel portrait, name, and tagline.",
    category: "tool",
    ready: true,
  },
  {
    to: "/tools/squad-sheet",
    title: "Squad Sheet",
    desc: "Wallet holdings as a printable contact sheet — every Normie you own.",
    category: "tool",
    ready: true,
  },
  {
    to: "/tools/burn-memorial",
    title: "Burn Memorial",
    desc: "Commemorative card for burned Normies — preserved on-chain forever.",
    category: "tool",
    ready: true,
  },
  {
    to: "/playlist",
    title: "Normies Playlist",
    desc: "Ten Suno tracks — on-chain lore, canvas, burns, and the collective.",
    category: "tool",
    ready: true,
  },
  {
    to: "/games/banner",
    title: "Normie Banner",
    desc: "X headers & social cards — parade, spotlight, mosaic, or collector flex.",
    category: "tool",
    ready: true,
  },
  {
    to: "/games/circle",
    title: "Normie Circle",
    desc: "Your pixel self at the center, ringed by random Normies. Download & share.",
    category: "tool",
    ready: true,
  },
  {
    to: "/explore",
    title: "Collection Grid",
    desc: "Browse all 10,000 Normies. Filter, inspect, find listings.",
    category: "tool",
    ready: true,
  },
];

const TABS: { id: HubTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "games", label: "Games" },
  { id: "tools", label: "Tools" },
];

function tabFromParam(value: string | null): HubTab {
  if (value === "games" || value === "tools") return value;
  return "all";
}

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<HubTab>(() => tabFromParam(searchParams.get("tab")));

  useEffect(() => {
    setTab(tabFromParam(searchParams.get("tab")));
  }, [searchParams]);

  const selectTab = (id: HubTab) => {
    audioManager.playSfx("uiClick");
    setTab(id);
    if (id === "all") {
      setSearchParams({});
    } else {
      setSearchParams({ tab: id });
    }
  };

  const filtered = EXPERIENCES.filter((exp) => {
    if (tab === "all") return true;
    if (tab === "games") return exp.category === "game";
    return exp.category === "tool";
  });

  return (
    <div className="space-y-8">
      <section className="text-center space-y-3 py-4 sm:py-8">
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-widest text-[#1a1a1a]">
          NORMIES HUB
        </h1>
        <p className="font-mono text-xs sm:text-sm max-w-2xl mx-auto text-[#48494b] leading-relaxed px-1">
          10,000 on-chain pixel faces — play trait-powered games, create sharable art, explore the
          collection, and practice canvas edits.
        </p>
      </section>

      <div className="flex justify-center gap-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => selectTab(id)}
            className={`normie-btn text-xs px-4 py-1.5 uppercase tracking-wide ${
              tab === id ? "bg-[#48494b] text-[#e3e5e4]" : "normie-btn-outline"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {filtered.map((exp) => (
          <Link
            key={exp.to}
            to={exp.to}
            className="normie-card block hover:bg-white transition-colors group"
          >
            <div className="flex justify-between items-start mb-2 gap-2">
              <h2 className="font-bold text-base sm:text-lg uppercase tracking-wide group-hover:text-[#1a1a1a]">
                {exp.title}
              </h2>
              {exp.ready && (
                <span className="normie-badge bg-[#48494b] text-[#e3e5e4] shrink-0">
                  {exp.category === "game" ? "Play" : "Open"}
                </span>
              )}
            </div>
            <p className="font-mono text-xs text-[#48494b]">{exp.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
