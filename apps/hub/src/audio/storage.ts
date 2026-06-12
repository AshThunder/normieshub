import { DEFAULT_AUDIO_SETTINGS, type AudioSettings } from "./types";

const KEY = "normie-audio-settings";

export function loadAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_AUDIO_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    return {
      musicEnabled: false,
      sfxEnabled: parsed.sfxEnabled ?? DEFAULT_AUDIO_SETTINGS.sfxEnabled,
      musicVolume: clamp01(parsed.musicVolume ?? DEFAULT_AUDIO_SETTINGS.musicVolume),
      sfxVolume: clamp01(parsed.sfxVolume ?? DEFAULT_AUDIO_SETTINGS.sfxVolume),
    };
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

export function saveAudioSettings(settings: AudioSettings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
