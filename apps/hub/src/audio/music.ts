import type { MusicTrackId } from "./types";

export const MUSIC_TRACKS: Record<MusicTrackId, string> = {
  hub: "/audio/music/hub.wav",
  action: "/audio/music/action.wav",
  arcade: "/audio/music/arcade.wav",
  defense: "/audio/music/defense.wav",
  dungeon: "/audio/music/dungeon.wav",
};

/** Map pathname to background music track. */
export function musicTrackForPath(pathname: string): MusicTrackId {
  if (pathname.startsWith("/games/slingshot") || pathname.startsWith("/games/runner")) {
    return "action";
  }
  if (
    pathname.startsWith("/games/snake") ||
    pathname.startsWith("/games/penalty") ||
    pathname.startsWith("/games/block-builder")
  ) {
    return "arcade";
  }
  if (pathname.startsWith("/games/defense")) return "defense";
  return "hub";
}
