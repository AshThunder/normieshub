import { loadAudioSettings, saveAudioSettings } from "./storage";
import { initAudioContext, playSfxInternal, preloadSfxClips } from "./sfx";
import type { AudioSettings, MusicTrackId, SfxName } from "./types";

type Listener = (settings: AudioSettings) => void;

/** Minimum ms between repeats for rapid-fire SFX. */
const SFX_THROTTLE_MS: Partial<Record<SfxName, number>> = {
  towerShoot: 140,
  towerHit: 90,
  impact: 55,
  stretch: 70,
  laneSwitch: 120,
  enemyKill: 100,
};

class AudioManager {
  private settings: AudioSettings = loadAudioSettings();
  private listeners = new Set<Listener>();
  private unlocked = false;
  private musicEl: HTMLAudioElement | null = null;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;
  private sfxLastPlayed = new Map<SfxName, number>();

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn(this.getSettings());
  }

  private persist() {
    saveAudioSettings(this.settings);
    this.emit();
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    initAudioContext();
    void preloadSfxClips();
  }

  setSfxEnabled(enabled: boolean) {
    this.settings.sfxEnabled = enabled;
    this.persist();
  }

  setSfxVolume(volume: number) {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume));
    this.persist();
  }

  setMusicTrack(_track: MusicTrackId) {
    this.stopMusic();
  }

  suppressHubMusic() {
    this.stopMusic();
  }

  releaseHubMusic() {}

  private stopMusic() {
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    if (this.musicEl) {
      this.musicEl.pause();
      this.musicEl = null;
    }
  }

  playSfx(name: SfxName, options?: { impactScale?: number; minIntervalMs?: number }) {
    if (!this.settings.sfxEnabled) return;
    const throttleMs = options?.minIntervalMs ?? SFX_THROTTLE_MS[name];
    if (throttleMs) {
      const now = performance.now();
      const last = this.sfxLastPlayed.get(name) ?? 0;
      if (now - last < throttleMs) return;
      this.sfxLastPlayed.set(name, now);
    }
    this.unlock();
    playSfxInternal(name, this.settings.sfxVolume, options?.impactScale ?? 1);
  }

  /** Slingshot-compatible API */
  sfx = {
    init: () => this.unlock(),
    stretch: () => this.playSfx("stretch"),
    shoot: () => this.playSfx("shoot"),
    impact: (n = 1) => this.playSfx("impact", { impactScale: n }),
    shatter: () => this.playSfx("shatter"),
    win: () => this.playSfx("win"),
    lose: () => this.playSfx("lose"),
  };
}

export const audioManager = new AudioManager();
