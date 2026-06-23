# SimpleDistance

Golf shot analyzer that finds your **true stock yardages** and **optimizes your bag** —
separating real, actionable trends (loft/distance gaps, persistent short/long clubs) from
session-to-session noise and insufficient sample sizes.

The headline output is **bag optimization**: per-club stock yardage with a confidence
interval and a sample-size verdict, full gapping analysis (overlaps / holes / inversions),
a real-trend-vs-noise classifier per club, hedged equipment-vs-swing hints, and a
prioritized plain-English recommendations list.

On first run it loads a **demo dataset** reproducing the classic problem: a 5-iron that
carries *short* while the 6-iron and 7-iron carry *long* — and shows you exactly how the
app diagnoses it.

---

## Run it (one command)

```bash
npm install && npm run dev
```

Then open <http://localhost:3000>. That's it — no database, no accounts, no API keys, no
cloud. Everything runs locally and all your data stays in your browser (IndexedDB).

Other scripts:

```bash
npm test          # run the stats + pipeline unit tests (Vitest)
npm run build     # production build
npm run typecheck # tsc --noEmit
npx tsx scripts/gen-samples.ts   # regenerate /samples from the seed dataset
```

CI (`.github/workflows/ci.yml`) runs `typecheck`, `test`, `lint`, and `build` on every push
and PR.

### Accessibility

The UI aims for WCAG-AA basics: a skip-to-content link, `main`/`nav` landmarks, per-route
document titles, `scope`-d table headers with screen-reader captions, contextual
`aria-label`s on row actions, a keyboard-operable CSV drop zone, visible focus rings,
`role="img"` text summaries on every chart so the data isn't conveyed by color/visuals
alone, and **focus-trapped, Escape-dismissable confirmation dialogs** for destructive
actions (no native `confirm()`/`alert()`). `npm run lint` (eslint-config-next, includes
jsx-a11y) is clean.

### Install / offline (PWA)

SimpleDistance ships a web app manifest and an offline-first service worker (registered in
production), so it's **installable** and keeps working **offline** after the first visit —
fitting for range/course use with no signal. All data already lives in IndexedDB, so nothing
needs the network. Regenerate the app icons with `node scripts/gen-icons.mjs`.

### Try it immediately

The app auto-seeds the 5-iron demo, so the dashboard is useful on first load. To exercise
the import flow, use the ready-made files in [`/samples`](./samples):

- `samples/trackman-sample.csv` — TrackMan-style, **yards + mph**, full launch data.
- `samples/inrange-sample.csv` — Inrange-style, **meters + m/s**, fewer columns and
  different club labels (to demonstrate auto-detection, presets, and unit conversion).
- `samples/garmin-sample.csv` — Garmin Approach R10-style, **yards + mph**, with
  vendor-specific signature columns (Spin Axis / Roll Distance) the registry fingerprints.

Go to **Import → choose a sample → confirm**. Both reproduce the identical insight because
units are normalized on import.

### Other things you can do

- **Dashboard:** filter the whole analysis to a single **session** vs. all sessions, plus a
  "Bag structure" panel (typical gap, holes/overlaps/inversions, confidence-gated).
- **Optimize:** a **14-club bag optimizer** — an even target gap ladder across your scoring
  clubs (driver/woods kept as anchors) showing which clubs match, which want a loft adjust,
  where to add a club (with a target carry), which are redundant, and whether you're within
  the 14-club budget. Built only from trustworthy clubs.
- **Changes:** a "what changed since last session" view — your latest session vs. a baseline
  of all prior sessions, flagging only moves that exceed the combined confidence intervals
  (no false alarms for normal variation), labeling insufficient-sample clubs, and **warning
  when it's comparing across different conditions** (e.g. indoor vs. outdoor).
- **Sessions:** tag each session's conditions (name, indoor/outdoor, ball) so the Changes
  view can caveat condition-driven differences.
- **Shots page:** add, **edit**, and delete individual shots; filter by club; toggle whether
  each shot feeds the stats.
- **Club detail:** carry distribution, session-over-session trend, a **dispersion scatter**
  (side vs. carry) with side SD / P75 / strike-consistency stats, hedged equipment-vs-swing
  hints, and a per-shot **Auto / force-include / force-exclude** control (mishits are flagged
  and counted, never deleted).
- **Settings:** choose carry vs. total, toggle outlier exclusion, tune the target CI width and
  the trend thresholds, edit the club-alias table, and **export a JSON backup or CSV** /
  **restore** a backup (merge or replace). Because storage is per-browser, this is how you keep
  or move your data; the exported CSV re-imports cleanly through the generic mapper.
- **Install it:** add to your home screen / install as an app — it works offline.

---

## Tech stack & key assumptions

- **Next.js 14 (App Router) + React + TypeScript**, **Tailwind**, **Recharts**.
- **Client-side IndexedDB** (via `idb`) for storage — chosen so the app is truly
  `npm install && npm run dev`-simple with zero setup and full offline use. Data is
  per-browser; clearing site data clears your shots. (See *Storage* below to swap this.)
- **CSV parsing** via `papaparse`. **Statistics** live in a pure, framework-agnostic,
  unit-tested module under [`src/lib/stats`](./src/lib/stats) — no heavyweight deps; the
  Student-t and inverse-normal quantiles are implemented and tested in-repo.
- Distances are stored in **yards**, speeds in **mph**, angles in **degrees**. Imports are
  unit-aware and convert meters↔yards and m/s·km/h↔mph.

Assumptions made where the spec left room (all tunable, see `METHODOLOGY.md`):

- Carry is the primary metric (toggle to total in Settings).
- "Adjacent clubs" for gapping/trend means adjacent in a fixed canonical club order
  (driver → woods → hybrids → irons → wedges).
- A club needs ≥3 clean shots in a session to contribute a session mean to trend analysis.

---

## Canonical shot schema

Every imported or manual shot is normalized to this shape
([`src/lib/domain/types.ts`](./src/lib/domain/types.ts)). Only `club` plus one distance are
required; everything else is optional and the app degrades gracefully when it's missing.

| Field | Unit | Notes |
|---|---|---|
| `club` | — | Canonical id, e.g. `5I`, `PW`, `56`, `DR` (required) |
| `carryYards` | yards | Primary yardage metric (required: carry **or** total) |
| `totalYards` | yards | Optional |
| `sessionId` | — | Groups shots hit together; drives trend-vs-noise |
| `timestamp` | ISO | Optional |
| `ballSpeedMph`, `clubSpeedMph`, `smashFactor` | mph / — | Optional speed metrics |
| `launchAngleDeg`, `spinRpm`, `launchDirectionDeg`, `descentAngleDeg` | deg / rpm | Optional |
| `sideYards`, `apexFt` | yards / feet | Optional dispersion/flight |

Club names are normalized: `5i`, `5 Iron`, `Iron 5`, `I5`, `five iron`, `5` → `5I`; woods,
hybrids, and wedges (named or loft-keyed like `52`/`56`/`60`) are handled too. Anything the
normalizer can't confidently interpret is **not guessed** — it's surfaced so you can add an
alias (Settings → Club aliases) instead.

---

## How column mapping works

CSV exports vary, so import is a 3-step flow (**Upload → Map columns → Confirm**):

1. **Upload** a CSV. The app reads the headers and tries to **auto-detect the source**
   (TrackMan / Inrange) by how many preset header hints match.
2. **Auto-mapping** runs: preset header hints first, then per-field detection regexes map
   each source column onto the canonical schema
   ([`src/lib/import/mapping.ts`](./src/lib/import/mapping.ts),
   [`schema.ts`](./src/lib/import/schema.ts)). Units are guessed from the preset and a
   per-column heuristic.
3. **You confirm/adjust** the mapping, source preset, and units in the UI, see a live
   preview, and import. Re-imports of the same source reuse the same mapping.

The pipeline is built to be **robust to messy real-world exports**: it auto-detects the
delimiter (comma, **semicolon**, **tab**, or pipe), strips a UTF-8 **BOM**, skips blank/ragged
rows, and tolerates extra columns. Number parsing is **locale-aware**: `150,5` (European
decimal comma) and `1,505` (US thousands) are both read correctly, so meters-and-commas
exports aren't silently 10×'d. Club labels survive hyphens/underscores (`3-iron`,
`pitching_wedge`). Negative carries/totals are rejected rather than corrupting an average.
After import, **plausibility checks** flag a club whose mean carry falls outside a sane band
for its type (a tell-tale of a wrong column or a meters/yards mix-up), and the result screen
gives a **categorized quarantine report** (how many rows were skipped for a missing club,
unrecognized club, or missing distance). Distances are
yards/meters-aware; **speed** auto-detects mph vs m/s vs km/h by header and magnitude, while
**distance** units rely on the header/preset (magnitude alone can't tell a driver-in-meters
from a mid-iron-in-yards) and are always user-confirmable in the import UI.

Presets for **TrackMan**, **Inrange**, and **Garmin** live in
[`src/lib/import/presets.ts`](./src/lib/import/presets.ts). They are *hints*, not hardcoded
column positions — auto-detection always runs and you can override anything. Detection and
parsing both route through the **`ImportAdapter` registry**: on upload, `detectFileAdapter`
fingerprints the file to a preset adapter (using vendor signature headers) or falls back to a
generic CSV adapter; on confirm, the chosen adapter parses the table with your confirmed
mapping/units. Adding a source is just registering another adapter — the flow doesn't change.

---

## Adding a new `ImportAdapter`

Auto-import from consumer launch monitors is intentionally **not** built (most lack public
APIs). Instead there's a clean extension point so a new source slots in **without
refactoring the pipeline** ([`src/lib/import/adapter.ts`](./src/lib/import/adapter.ts)):

```ts
import { registerAdapter, type ImportAdapter } from "@/lib/import/adapter";

const myAdapter: ImportAdapter = {
  id: "mylauncher-csv",
  label: "MyLauncher CSV",
  kind: "file",                       // or "auto" for a future live source
  detect: (table) => table.headers.includes("MyCarry"),
  parse: (table, ctx) => {
    // map columns → call rowsToShots(...) → return { shots, warnings, mapping, units }
  },
};

registerAdapter(myAdapter);
```

The built-in TrackMan/Inrange file adapters in
[`builtinAdapters.ts`](./src/lib/import/builtinAdapters.ts) show the full pattern (they
reuse the shared `autoDetectMapping` + `rowsToShots`). To add a live/auto source later,
implement the same interface with `kind: "auto"` and register it — nothing else changes.
A throwing `exampleAutoAdapterStub` documents that shape.

---

## Statistical assumptions & limitations

Full detail is in [`METHODOLOGY.md`](./METHODOLOGY.md). In short:

- **Honesty over confidence.** Every verdict states its confidence and the data behind it.
  Small samples are labeled *insufficient*, not silently averaged into a "stock" number.
- **Outliers are flagged, never silently dropped.** Mishit exclusion (IQR fences) is shown
  as a count and is toggleable in Settings.
- **Trend vs noise needs multiple sessions.** A deviation seen in one session is reported
  as not-yet-confirmable; "real trend" requires it to persist across independent sessions.
- **Equipment-vs-swing output is hypotheses, not diagnoses.** It shows the supporting
  signal (e.g. normal ball speed but short carry + high spin → "worth a loft check") and is
  always hedged. **This is decision support, not a club fitting.**
- All thresholds (sample sizes, gap sizes, confidence level, trend sensitivity) are named
  constants in [`src/lib/stats/constants.ts`](./src/lib/stats/constants.ts).

---

## Project layout

```
src/
  app/                     # Next.js pages: dashboard, import, shots, settings, club/[club]
  components/              # UI: nav, data provider (IndexedDB context), charts, badges
  lib/
    domain/                # canonical types + club normalization/ordering
    stats/                 # PURE, tested statistics (no framework): CI, outliers,
                           #   adequacy, gapping, trend, equipment, distributions
    import/                # schema, presets, mapping, units, transform, CSV, adapters
    db/                    # IndexedDB store + deterministic seed (5-iron scenario)
    analysis.ts            # orchestrates stats over shots → BagAnalysis + recommendations
samples/                   # TrackMan & Inrange sample CSVs
scripts/gen-samples.ts     # regenerates the samples from the seed
```

### Storage

Storage is isolated behind [`src/lib/db/index.ts`](./src/lib/db/index.ts). To move to a
server DB (e.g. SQLite + Prisma) later, reimplement that module's async functions — the rest
of the app (analysis, UI) is storage-agnostic.
