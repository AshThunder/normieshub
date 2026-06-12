import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { audioManager } from "./audioManager";
import type { AudioSettings } from "./types";

interface AudioContextValue {
  settings: AudioSettings;
  unlock: () => void;
  setSfxEnabled: (v: boolean) => void;
  setSfxVolume: (v: number) => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AudioSettings>(() => audioManager.getSettings());

  useEffect(() => {
    const unsub = audioManager.subscribe(setSettings);
    return () => {
      unsub();
    };
  }, []);

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
      setSfxEnabled: (v) => audioManager.setSfxEnabled(v),
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
