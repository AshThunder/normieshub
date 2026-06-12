import { BlockBuilderGame } from "./BlockBuilderGame";
import "./block-builder.css";

export function BlockBuilderPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wide">Normie Block Builder</h1>
        <div className="font-mono text-xs mt-2 space-y-1 text-[#48494b] max-w-xl">
          <p>Classic 7 tetrominoes on a 10×20 grid. Stack blocks, clear full rows, and collect random Normie faces.</p>
          <p>Score follows standard Tetris line bonuses (100 / 300 / 500 / 800 × level). Speed ramps every 10 lines cleared.</p>
          <p>When the stack fills, download a poster PNG of your score and collected Normies.</p>
          <p className="hidden sm:block pt-1">
            Controls: ← → move · ↑ rotate · ↓ soft drop · Space hard drop
          </p>
        </div>
      </div>

      <BlockBuilderGame />
    </div>
  );
}
