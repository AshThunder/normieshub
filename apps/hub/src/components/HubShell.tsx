import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { HUB_HOST, HUB_URL } from "@normie/shared";
import { SoundControls } from "./SoundControls";

const NAV = [
  { to: "/", label: "Hub" },
  { to: "/games/slingshot", label: "Slingshot" },
  { to: "/games/runner", label: "Runner" },
  { to: "/games/penalty", label: "Penalty" },
  { to: "/games/defense", label: "Defense" },
  { to: "/games/snake", label: "Snake" },
  { to: "/games/block-builder", label: "Block Builder" },
  { to: "/games/circle", label: "Circle" },
  { to: "/games/banner", label: "Banner" },
  { to: "/games/normie-me", label: "Normie Me" },
  { to: "/playlist", label: "Playlist" },
  { to: "/?tab=tools", label: "Tools" },
  { to: "/explore", label: "Explore" },
];

function isNavActive(to: string, pathname: string, search: string): boolean {
  if (to === "/?tab=tools") {
    return (
      (pathname === "/" && new URLSearchParams(search).get("tab") === "tools") ||
      pathname.startsWith("/tools/")
    );
  }
  if (to === "/") {
    return pathname === "/" && !search.includes("tab=");
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

function navLinkClass(active: boolean) {
  return `px-3 py-1.5 text-xs uppercase font-mono border-2 transition-colors ${
    active
      ? "bg-[#48494b] text-[#e3e5e4] border-[#1a1a1a]"
      : "bg-[#e3e5e4] text-[#48494b] border-[#48494b] hover:bg-[#48494b] hover:text-[#e3e5e4]"
  }`;
}

export function HubShell({ children }: { children: React.ReactNode }) {
  const { pathname, search } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <header className="border-b-2 border-[#48494b] bg-[#f5f5f4] px-3 sm:px-4 py-3">
        <div className="max-w-6xl mx-auto space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/"
              className="text-lg sm:text-xl font-bold tracking-widest text-[#1a1a1a] shrink-0"
              onClick={() => setMenuOpen(false)}
            >
              NORMIES HUB
            </Link>
            <div className="flex items-center gap-2">
              <SoundControls />
              <button
                type="button"
                className="md:hidden normie-btn text-xs px-3 py-1.5"
                aria-expanded={menuOpen}
                aria-controls="hub-nav"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? "Close" : "Menu"}
              </button>
            </div>
          </div>

          <nav
            id="hub-nav"
            className={`${menuOpen ? "flex" : "hidden"} md:flex flex-wrap gap-1.5`}
          >
            {NAV.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={navLinkClass(isNavActive(to, pathname, search))}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 min-w-0">
        {children}
      </main>
      <footer className="border-t-2 border-[#48494b] py-3 px-3 text-center text-xs font-mono text-[#48494b]">
        Built on{" "}
        <a href="https://api.normies.art" className="underline" target="_blank" rel="noreferrer">
          api.normies.art
        </a>
        {" · "}
        <a href={HUB_URL} className="underline" target="_blank" rel="noreferrer">
          {HUB_HOST}
        </a>
      </footer>
    </div>
  );
}
