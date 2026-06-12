![Normies Hub — trait-powered games, tools, and collection explore](docs/screenshots/hub-banner.png)

# Normies Hub

Live demo: [normieshub.vercel.app](https://normieshub.vercel.app/) · Built on the [Normies API](https://api.normies.art)

## Games

| Experience | Description |
|------------|-------------|
| **Normie Slingshot** | Angry Birds-style launcher — trait abilities smash pixel block fortresses |
| **Normie Run** | Temple Run endless runner — collect cards, export your pixel self |
| **Normie Penalty Shootout** | Solo scoring or AI shootout — traits affect curve, power, and dives |
| **Normies Defense** | Tower defense on 3 maps — place Normies, upgrade, survive 10 waves |
| **Normie Snake** | Classic snake — eat faces to grow your chain (mobile D-pad included) |
| **Normie Block Builder** | Tetris-style stacking — clear lines to collect Normies, export a poster |

## Tools

| Tool | Description |
|------|-------------|
| **Canvas Lab** | XOR simulator & burn preview — flip pixels, merge layers, estimate action points |
| **Find My Normie** | Photo or X profile → scan the collection for your closest pixel match |
| **Normie Me** | X profile, upload, or URL → 40×40 Normie pixel portrait |
| **Normie ID Card** | Official or personalised card with portrait, name, and tagline |
| **Squad Sheet** | Wallet holdings as a printable contact sheet |
| **Burn Memorial** | Commemorative card for burned Normies |
| **Normie Banner** | X headers & social cards — parade, spotlight, mosaic, collector flex |
| **Normie Circle** | Your pixel self at the center, ringed by random Normies |
| **Normies Playlist** | Ten Suno tracks — on-chain lore, canvas, burns, and the collective |
| **Collection Grid** | Browse all 10,000 Normies — filter, inspect, OpenSea listings |

## Setup

Requires [pnpm](https://pnpm.io/) 10+ and Node 20+.

```bash
pnpm install
cp .env.example apps/hub/.env   # optional: OpenSea listings in /explore
pnpm generate-traits            # quick fallback trait index (~1 min)
# or: pnpm fetch-traits         # full on-chain traits (slow)
pnpm --filter @normie/hub generate-audio   # only if public/audio/ is missing
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

### Environment variables

Copy `.env.example` to `apps/hub/.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENSEA_API_KEY` | No | Live listing badges on `/explore` ([OpenSea API](https://docs.opensea.io/reference/api-overview)) |
| `VITE_NORMIES_API_BASE` | No | Override Normies API base (default: `https://api.normies.art`) |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start hub dev server |
| `pnpm build` | Production build (`@normie/shared` + hub) |
| `pnpm typecheck` | Typecheck all packages |
| `pnpm fetch-traits` | Fetch all 10k traits from API into `apps/hub/public/traits-index.json` |
| `pnpm generate-traits` | Generate fallback trait index (fast) |
| `pnpm --filter @normie/hub generate-audio` | Generate WAV music/SFX in `apps/hub/public/audio/` |

## Project structure

```
apps/hub/          React + Vite frontend, Vercel serverless API helpers
packages/shared/   Shared pixel export utilities & constants
api/               Vercel serverless routes (listings, Normies proxy, X avatars)
scripts/           Trait fetch/generate scripts
docs/screenshots/  README showcase images (not served by the app)
```

## Deploy (Vercel)

Set **Root Directory** to `apps/hub` and enable **Include files outside the root directory**.

| Setting | Value |
|---------|--------|
| Root Directory | `apps/hub` |
| Output Directory | `dist` |
| Build Command | `cd ../.. && pnpm build` |
| Install Command | `cd ../.. && pnpm install` |

Paths are relative to `apps/hub` — do **not** set Output Directory to `apps/hub/dist`.

`apps/hub/vercel.json` mirrors these settings. API routes live in `apps/hub/api/`.

Set **`OPENSEA_API_KEY`** in Vercel project settings for live OpenSea listings on `/explore`.

**Live site:** [normieshub.vercel.app](https://normieshub.vercel.app/)

## Screenshots

Exportable PNGs and hub UI — generated in-browser from on-chain Normie pixels. Images live in [`docs/screenshots/`](docs/screenshots/).

### Hub & games

| | |
|---|---|
| **Hub** — games tab | **Normie Snake** — eat faces to grow your chain |
| ![Hub games](docs/screenshots/hub-games.png) | ![Normie Snake](docs/screenshots/normie-snake.png) |
| **Normie Run** — score card with your pixel self and collected faces | **Block Builder** — poster after clearing lines |
| ![Normie Run](docs/screenshots/normie-run-3431.png) | ![Block Builder](docs/screenshots/block-builder-2702.png) |
| **Block Builder** — another haul | |
| ![Block Builder 2460](docs/screenshots/block-builder-2460.png) | |

### Tools & explore

| | |
|---|---|
| **Collection Grid** — browse all 10,000 Normies | **Normie Circle** — your pixel self ringed by Normies |
| ![Collection Grid](docs/screenshots/collection-grid.png) | ![Normie Circle](docs/screenshots/normie-circle.png) |
| **Canvas Lab** — XOR edit preview | **Squad Sheet** — wallet holdings contact sheet |
| ![Canvas Lab XOR](docs/screenshots/canvas-lab-42-xor.png) | ![Squad Sheet](docs/screenshots/squad-sheet.png) |
| **Burn Memorial** — commemorative burned Normie card | **Normie Banner** — X header export |
| ![Burn Memorial](docs/screenshots/burn-memorial-1241.png) | ![Banner](docs/screenshots/banner-x-header.png) |

<details>
<summary>Canvas Lab — light edit (28 px changed)</summary>

![Canvas Lab edit](docs/screenshots/canvas-lab-42-edit.png)

</details>

## Hackathon

Submit at [hackathon.normies.art](https://hackathon.normies.art/) — category **Game**.

## License

MIT
