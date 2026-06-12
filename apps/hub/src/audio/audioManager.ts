import { loadAudioSettings, saveAudioSettings } from "./storage";
import { MUSIC_TRACKS } from "./music";
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
  private currentTrack: MusicTrackId | null = null;
  private hubMusicSuppressed = false;
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
    this.applyMusicVolume();
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    initAudioContext();
    void preloadSfxClips();
    if (this.settings.musicEnabled && this.currentTrack) {
      this.playMusic(this.currentTrack, false);
    }
  }

  setMusicEnabled(enabled: boolean) {
    this.settings.musicEnabled = enabled;
    this.persist();
    if (!enabled) this.stopMusic();
    else if (this.currentTrack) this.playMusic(this.currentTrack, false);
  }

  setSfxEnabled(enabled: boolean) {
    this.settings.sfxEnabled = enabled;
    this.persist();
  }

  setMusicVolume(volume: number) {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume));
    this.persist();
  }

  setSfxVolume(volume: number) {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume));
    this.persist();
  }

  private applyMusicVolume() {
    if (!this.musicEl) return;
    const target = this.settings.musicEnabled ? this.settings.musicVolume : 0;
    this.musicEl.volume = target;
  }

  setMusicTrack(track: MusicTrackId) {
    this.currentTrack = track;
    if (this.hubMusicSuppressed || !this.unlocked || !this.settings.musicEnabled) return;
    this.playMusic(track, true);
  }

  suppressHubMusic() {
    this.hubMusicSuppressed = true;
    this.stopMusic();
  }

  releaseHubMusic() {
    this.hubMusicSuppressed = false;
    if (this.unlocked && this.settings.musicEnabled && this.currentTrack) {
      this.playMusic(this.currentTrack, false);
    }
  }

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

  private playMusic(track: MusicTrackId, fade: boolean) {
    const src = MUSIC_TRACKS[track];
    if (this.musicEl?.src.endsWith(src)) {
      if (this.musicEl.paused) void this.musicEl.play().catch(() => {});
      this.applyMusicVolume();
      return;
    }

    const prev = this.musicEl;
    const next = new Audio(src);
    next.loop = true;
    next.preload = "auto";

    const startNext = () => {
      this.musicEl = next;
      this.applyMusicVolume();
      if (fade) next.volume = 0;
      void next.play().catch(() => {});
      if (fade) {
        const target = this.settings.musicVolume;
        const steps = 12;
        let step = 0;
        if (this.fadeTimer) clearInterval(this.fadeTimer);
        this.fadeTimer = setInterval(() => {
          step++;
          next.volume = (target * step) / steps;
          if (prev) prev.volume = Math.max(0, target * (1 - step / steps));
          if (step >= steps) {
            if (this.fadeTimer) clearInterval(this.fadeTimer);
            this.fadeTimer = null;
            prev?.pause();
          }
        }, 25);
      }
    };

    if (prev && fade) {
      startNext();
    } else {
      prev?.pause();
      startNext();
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
