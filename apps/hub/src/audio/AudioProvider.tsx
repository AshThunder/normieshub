import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { audioManager } from "./audioManager";
import { musicTrackForPath } from "./music";
import type { AudioSettings } from "./types";

interface AudioContextValue {
  settings: AudioSettings;
  unlock: () => void;
  setMusicEnabled: (v: boolean) => void;
  setSfxEnabled: (v: boolean) => void;
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [settings, setSettings] = useState<AudioSettings>(() => audioManager.getSettings());

  useEffect(() => {
    const unsub = audioManager.subscribe(setSettings);
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    audioManager.setMusicTrack(musicTrackForPath(pathname));
  }, [pathname]);

  useEffect(() => {
    const unlock = () => audioManager.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const value = useMemo<AudioContextValue>(
    () => ({
      settings,
      unlock: () => audioManager.unlock(),
      setMusicEnabled: (v) => audioManager.setMusicEnabled(v),
      setSfxEnabled: (v) => audioManager.setSfxEnabled(v),
      setMusicVolume: (v) => audioManager.setMusicVolume(v),
      setSfxVolume: (v) => audioManager.setSfxVolume(v),
    }),
    [settings],
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio() {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error("useAudio must be used within AudioProvider");
  return ctx;
}

export function useAudioUnlock() {
  return useCallback(() => audioManager.unlock(), []);
}
