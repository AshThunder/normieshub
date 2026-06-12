import { useCallback, useEffect, useRef, useState } from "react";
import { audioManager } from "../audio/audioManager";
import { NormieVisualizer, type VisualizerMode } from "./NormieVisualizer";
import { PLAYLIST_TRACKS } from "./tracks";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PlaylistPage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const indexRef = useRef(0);
  const playingRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [vizMode, setVizMode] = useState<VisualizerMode>("wave");

  const track = PLAYLIST_TRACKS[currentIndex];

  const loadTrack = useCallback((index: number, autoplay = false) => {
    const el = audioRef.current;
    if (!el) return;
    const next = PLAYLIST_TRACKS[index];
    if (!next) return;
    indexRef.current = index;
    el.src = next.src;
    el.load();
    setCurrentIndex(index);
    setProgress(0);
    if (autoplay) {
      audioManager.unlock();
      audioManager.suppressHubMusic();
      void el.play().then(() => {
        playingRef.current = true;
        setPlaying(true);
      }).catch(() => {
        playingRef.current = false;
        setPlaying(false);
      });
    } else {
      playingRef.current = false;
      setPlaying(false);
    }
  }, []);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    audioManager.unlock();
    audioManager.playSfx("uiClick");
    if (playingRef.current) {
      el.pause();
      playingRef.current = false;
      setPlaying(false);
      audioManager.releaseHubMusic();
      return;
    }
    audioManager.suppressHubMusic();
    void el.play().then(() => {
      playingRef.current = true;
      setPlaying(true);
    }).catch(() => {
      playingRef.current = false;
      setPlaying(false);
    });
  };

  const playIndex = (index: number) => {
    audioManager.playSfx("uiClick");
    if (index === indexRef.current && audioRef.current) {
      togglePlay();
      return;
    }
    loadTrack(index, true);
  };

  const prev = () => {
    audioManager.playSfx("uiClick");
    const next = indexRef.current === 0 ? PLAYLIST_TRACKS.length - 1 : indexRef.current - 1;
    loadTrack(next, playingRef.current);
  };

  const next = () => {
    audioManager.playSfx("uiClick");
    const nextIdx = (indexRef.current + 1) % PLAYLIST_TRACKS.length;
    loadTrack(nextIdx, playingRef.current);
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    el.src = PLAYLIST_TRACKS[0].src;

    const onTime = () => setProgress(el.currentTime);
    const onMeta = () => setDuration(el.duration);
    const onEnd = () => {
      const nextIdx = (indexRef.current + 1) % PLAYLIST_TRACKS.length;
      loadTrack(nextIdx, true);
    };

    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnd);

    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnd);
      el.pause();
      audioManager.releaseHubMusic();
    };
  }, [loadTrack]);

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    const t = (Number(e.target.value) / 100) * duration;
    el.currentTime = t;
    setProgress(t);
  };

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <audio ref={audioRef} preload="metadata" />

      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wide">Normies Playlist</h1>
        <p className="font-mono text-xs mt-1 text-[#48494b]">
          Ten official tracks — on-chain lore, canvas, burns, and the collective. Produced with Suno.
        </p>
      </div>

      <div className="normie-card space-y-4 border-[#48494b] bg-[#48494b] text-[#e3e5e4]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wide text-[#e3e5e4]/60">
            Now playing · {track.id} / {PLAYLIST_TRACKS.length}
          </p>
          <h2 className="text-xl font-bold uppercase tracking-wide mt-1">{track.title}</h2>
          <p className="font-mono text-xs text-[#e3e5e4]/80 mt-1">{track.theme}</p>
        </div>

        <div className="space-y-2">
          <div className="flex gap-1" role="group" aria-label="Visualizer mode">
            {(["wave", "stream"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  audioManager.playSfx("uiClick");
                  setVizMode(m);
                }}
                className={`normie-btn text-[10px] px-3 py-1 uppercase tracking-wide ${
                  vizMode === m
                    ? "bg-[#e3e5e4] text-[#48494b] border-[#e3e5e4]"
                    : "normie-btn-outline border-[#e3e5e4]/40 text-[#e3e5e4]/80"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <NormieVisualizer
            audioRef={audioRef}
            playing={playing}
            trackSeed={track.id}
            mode={vizMode}
          />
        </div>

        <div className="space-y-1">
          <input
            type="range"
            min={0}
            max={100}
            value={progressPct}
            onChange={seek}
            className="w-full accent-[#e3e5e4]"
            aria-label="Seek"
          />
          <div className="flex justify-between font-mono text-[10px] text-[#e3e5e4]/70">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <button type="button" className="normie-btn normie-btn-outline text-xs px-3" onClick={prev}>
            Prev
          </button>
          <button
            type="button"
            className="normie-btn text-sm px-6 bg-[#e3e5e4] text-[#48494b] border-[#e3e5e4]"
            onClick={togglePlay}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button type="button" className="normie-btn normie-btn-outline text-xs px-3" onClick={next}>
            Next
          </button>
        </div>
      </div>

      <ol className="space-y-2">
        {PLAYLIST_TRACKS.map((t, i) => {
          const active = i === currentIndex;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => playIndex(i)}
                className={`w-full text-left normie-card py-3 px-4 flex gap-3 items-start transition-colors ${
                  active ? "bg-[#48494b] text-[#e3e5e4]" : "hover:bg-white"
                }`}
              >
                <span
                  className={`font-mono text-xs shrink-0 w-6 ${active ? "text-[#e3e5e4]/70" : "text-[#48494b]"}`}
                >
                  {String(t.id).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-bold text-sm uppercase tracking-wide block">{t.title}</span>
                  <span
                    className={`font-mono text-[10px] block mt-0.5 ${active ? "text-[#e3e5e4]/75" : "text-[#48494b]"}`}
                  >
                    {t.theme}
                  </span>
                </span>
                {active && playing && (
                  <span className="font-mono text-[10px] uppercase shrink-0 animate-pulse">▶</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <p className="font-mono text-[10px] text-center text-[#48494b]">
        Official Normies lore ·{" "}
        <a href="https://api.normies.art" target="_blank" rel="noreferrer" className="underline">
          api.normies.art
        </a>
        {" · "}
        <a href="https://normies.art" target="_blank" rel="noreferrer" className="underline">
          normies.art
        </a>
      </p>
    </div>
  );
}
