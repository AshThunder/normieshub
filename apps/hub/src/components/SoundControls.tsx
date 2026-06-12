import { useState } from "react";
import { useAudio } from "../audio/AudioProvider";

export function SoundControls() {
  const { settings, unlock, setSfxEnabled, setSfxVolume } = useAudio();
  const [open, setOpen] = useState(false);

  const toggleSfx = () => {
    unlock();
    setSfxEnabled(!settings.sfxEnabled);
  };

  return (
    <div className="relative flex items-center gap-1">
      <button
        type="button"
        className={`px-2 py-1 text-[10px] uppercase font-mono border-2 border-[#48494b] ${
          settings.sfxEnabled ? "bg-[#48494b] text-[#e3e5e4]" : "bg-[#e3e5e4] text-[#48494b]"
        }`}
        onClick={toggleSfx}
        title={settings.sfxEnabled ? "SFX on" : "SFX off"}
        aria-label={settings.sfxEnabled ? "Mute sound effects" : "Unmute sound effects"}
      >
        FX
      </button>
      <button
        type="button"
        className="px-2 py-1 text-[10px] font-mono border-2 border-[#48494b] bg-[#e3e5e4] text-[#48494b]"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Volume settings"
      >
        {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-52 border-2 border-[#48494b] bg-[#f5f5f4] p-3 shadow-sm">
          <label className="block font-mono text-[10px] uppercase">
            SFX volume
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.sfxVolume * 100)}
              onChange={(e) => {
                unlock();
                setSfxVolume(Number(e.target.value) / 100);
              }}
              className="w-full mt-1 accent-[#48494b]"
            />
          </label>
        </div>
      )}
    </div>
  );
}
