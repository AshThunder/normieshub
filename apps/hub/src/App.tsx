import { Navigate, Route, Routes } from "react-router-dom";
import { AudioProvider } from "./audio/AudioProvider";
import { HubShell } from "./components/HubShell";
import { HomePage } from "./pages/HomePage";
import { ExplorePage } from "./explore/ExplorePage";
import { SlingshotPage } from "./games/slingshot/SlingshotPage";
import { RunnerPage } from "./games/runner/RunnerPage";
import { CirclePage } from "./games/circle/CirclePage";
import { BannerPage } from "./games/banner/BannerPage";
import { ConvertPage } from "./games/convert/ConvertPage";
import { PenaltyPage } from "./games/penalty/PenaltyPage";
import { DefensePage } from "./games/defense/DefensePage";
import { SnakePage } from "./games/snake/SnakePage";
import { BlockBuilderPage } from "./games/block-builder/BlockBuilderPage";
import { PlaylistPage } from "./playlist/PlaylistPage";
import { CanvasLabPage } from "./tools/canvas-lab/CanvasLabPage";
import { IdCardPage } from "./tools/id-card/IdCardPage";
import { FindNormiePage } from "./tools/find-normie/FindNormiePage";
import { SquadSheetPage } from "./tools/squad-sheet/SquadSheetPage";
import { BurnMemorialPage } from "./tools/burn-memorial/BurnMemorialPage";

export default function App() {
  return (
    <AudioProvider>
      <HubShell>
        <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/games/slingshot" element={<SlingshotPage />} />
        <Route path="/games/runner" element={<RunnerPage />} />
        <Route path="/games/penalty" element={<PenaltyPage />} />
        <Route path="/games/defense" element={<DefensePage />} />
        <Route path="/games/snake" element={<SnakePage />} />
        <Route path="/games/block-builder" element={<BlockBuilderPage />} />
        <Route path="/games/circle" element={<CirclePage />} />
        <Route path="/games/banner" element={<BannerPage />} />
        <Route path="/games/normie-me" element={<ConvertPage />} />
        <Route path="/playlist" element={<PlaylistPage />} />
        <Route path="/tools" element={<Navigate to="/?tab=tools" replace />} />
        <Route path="/tools/canvas-lab" element={<CanvasLabPage />} />
        <Route path="/tools/id-card" element={<IdCardPage />} />
        <Route path="/tools/find-normie" element={<FindNormiePage />} />
        <Route path="/tools/squad-sheet" element={<SquadSheetPage />} />
        <Route path="/tools/burn-memorial" element={<BurnMemorialPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        </Routes>
      </HubShell>
    </AudioProvider>
  );
}
