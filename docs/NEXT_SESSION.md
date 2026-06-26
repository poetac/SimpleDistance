# Follow-up Build Prompt — SimpleDistance (continue)

> Paste everything below the line into a fresh, capable coding session to continue building
> SimpleDistance. It tells you exactly what already exists so you don't rebuild it, the
> conventions to keep, and a prioritized backlog with acceptance criteria. Original product
> spec: [`../PROMPT.md`](../PROMPT.md). Statistics reference: [`../METHODOLOGY.md`](../METHODOLOGY.md).

---

## Role & context

You are a senior full-stack engineer **and** golf-performance data analyst extending
**SimpleDistance**, a runnable web app that finds a golfer's true stock yardages and
optimizes their bag — separating real trends from session noise and small-sample artifacts.
The app already runs end-to-end with `npm install && npm run dev`. **Do not regress the
one-command run, the offline/local-only guarantee, or the test suite.**

## What already exists (do NOT rebuild)

**Stack:** Next.js 14 (App Router) + React + TypeScript, Tailwind, Recharts, `papaparse`,
client-side **IndexedDB** (`idb`). Vitest (215 tests). ESLint (eslint-config-next). CI runs
typecheck + lint + test + build.

**Pure, framework-agnostic stats** in `src/lib/stats/` — fully unit-tested, all thresholds
are named constants in `constants.ts`:
- `descriptive.ts` (mean/median/trimmed mean/sd/MAD/percentiles), `distributions.ts`
  (in-repo Student-t via Hill + Acklam inverse-normal), `confidence.ts` (t CI + shots-needed),
  `bootstrap.ts` (percentile bootstrap CI), `outliers.ts` (IQR + robust-z),
  `adequacy.ts` (sample-size verdicts), `gapping.ts` (overlap/hole/inversion),
  `trend.ts` (real-trend-vs-noise via neighbor interpolation across sessions),
  `equipment.ts` (hedged equipment-vs-swing hypotheses), `dispersion.ts` (side/carry spread),
  `stopping.ts` (roll/descent → soft/medium/hot for scoring clubs).
- `playing.ts` (stock/reliable/P25/P75/P90/A–F grade), `tendency.ts` (left/right/centered),
  `efficiency.ts` (smash factor vs expected band), `shotShape.ts` (face-to-path → draw/fade/
  hook/slice), `timeTrend.ts` (session regression drift), `delivery.ts` (spin/launch CV
  repeatability), `coverage.ts` (bag dead-zone map), `launchEfficiency.ts` (driver/wood
  launch+spin pattern — low-launch/high-spin etc, hedged hypothesis).
- `src/lib/analysis.ts` orchestrates these over a `Shot[]` into a `BagAnalysis` +
  prioritized recommendations + capture progress. `analyzeBag(shots, settings)` is pure and
  deterministic.

**Domain & import:** `src/lib/domain/` (canonical `Shot` schema, club normalization/order/
category); `src/lib/import/` (schema + detection regexes, **9 presets** — TrackMan, Inrange,
Garmin, Foresight, FlightScope, SkyTrak, Rapsodo, Uneekor, Full Swing — all fingerprinted
by vendor signature headers with no collisions, auto column mapping, locale-aware unit-aware
`transform.ts` with deterministic content-hashed shot ids for idempotent re-import, `csv.ts`,
`ImportAdapter` registry with built-in adapters).

**Persistence:** `src/lib/db/index.ts` — IndexedDB store (shots/aliases/imports/sessions/
settings), deterministic seed of the 5-iron scenario, JSON/CSV export + restore, idempotent
`addShots` that preserves user's manual include/exclude overrides on re-import. Storage is
isolated here; the rest of the app is storage-agnostic.

**UI:** `src/app/` — dashboard (bag table + gapping chart + recommendations + capture progress
panel + session filter + bag structure/coverage), club detail (playing numbers, tendency,
efficiency, shot shape, delivery consistency, launch efficiency, distribution, session trend,
dispersion scatter, stopping, equipment hints, per-shot toggle), optimize (14-club bag
optimizer), changes (session diff with CI-aware comparison + condition warnings), sessions
(metadata/tagging), shots (add/edit/delete + list), settings (metric/outliers/target-CI,
display units, alias editor, import history, backup/restore/reseed/clear), import (upload →
auto-detect → map → confirm).

**Components:** `DataProvider` (React context over the DB + undo), `Nav`, `Recommendations`,
`ConfirmDialog` (focus-trap/ESC), `UndoBanner`, `badges`, `useFormatter` (yards/meters
display toggle threaded through all prose generators), `usePageTitle`, charts (Gapping,
Distribution, Dispersion, SessionTrend), `ServiceWorkerRegister`.

**Other:** installable offline PWA (manifest, service worker, generated icons), 9 sample CSVs
in `samples/`, generator in `scripts/gen-samples.ts`, `scripts/gen-icons.mjs`.

**Docs:** `README.md`, `METHODOLOGY.md`, `CLAUDE.md`, `PROMPT.md` (original spec).

## Conventions to keep (non-negotiable)

1. **Statistics stay pure and tested.** New stats logic goes in `src/lib/stats/` (or a pure
   module), with Vitest tests, and is callable without the UI. No stats in components.
2. **All thresholds are named constants** in `constants.ts`, documented in `METHODOLOGY.md`.
3. **Never over-claim.** Every verdict states confidence and the data behind it. Equipment/
   swing output is *hypotheses with evidence*, always hedged — never a diagnosis.
4. **Never silently drop or rescale data.** Outliers are flagged and counted, exclusion is
   toggleable; unit conversions are user-confirmable.
5. **Canonical units.** Data is stored in **yards/mph/degrees**. Display conversion goes
   through `src/lib/format.ts` (`Formatter`) — thread it through any new prose/number, default
   yards so existing output is unchanged.
6. **Offline/local only.** No paid APIs, accounts, or services to run. `npm run dev` must work
   from a clean clone.
7. **Keep it green:** `npm run typecheck && npm run lint && npm test && npm run build` must
   pass. Add tests with every behavior change. Maintain the a11y baseline (landmarks, labels,
   `scope`, focus, chart text alternatives).
8. **Always add new stats modules to `src/lib/stats/index.ts`** (barrel export). This is a
   recurring mistake — forgetting causes cascading import failures.

## Ideas for next expansion

### 1. Coverage visualization
The bag coverage dead-zone analysis exists (`coverage.ts`) but is prose-only on the dashboard.
A visual carry-range bar chart showing each club's control radius and the dead zones between
them would make it immediately actionable.
- **Accept:** visual component in `src/components/charts/`, rendered on dashboard; accessible;
  tested; shows dead zones distinctly.

### 2. Before/after equipment comparison
When a user has sessions with old vs new clubs, a side-by-side comparison showing carry, spin,
launch, dispersion changes per club. Useful after a fitting or club purchase.
- **Accept:** pure module with tests; UI surface (could be on `/changes` or a new route);
  hedged output; handles missing clubs gracefully.

### 3. Scoring-distance analysis
Wedge-specific analysis: approach shot clustering (how tight is 100/125/150?), scoring
dispersion, and a "proximity estimate" from carry + side. A different lens than the stock-
yardage view.
- **Accept:** pure stats module; wedge-category gated; tested; UI card on club detail for
  wedges.

### 4. Multi-round / on-course tracking
Track actual on-course round data (club selection per hole, result) alongside range sessions.
Compare range stock yardages to on-course performance.
- **Accept:** schema extension (backward compatible); separate view; no regression to range
  analysis.

### 5. Playwright E2E smoke (deferred — environment-blocked)
A real-browser E2E smoke was attempted but the sandbox's network policy blocks Playwright's
browser-binary CDN. The jsdom integration tests already cover the data→analysis→render path.
A future session with open network can add Playwright with the pre-installed Chromium at
`/opt/pw-browsers/chromium`.

### 6. More import presets
Bushnell Launch Pro, Swing Caddie, Voice Caddie, Awesome Golf. Each needs distinctive
signature headers and a sample CSV.

## How to run & verify

```bash
npm install
npm run dev        # http://localhost:3000  (auto-seeds the 5-iron demo)
npm test           # Vitest — keep green, add tests for new behavior
npm run typecheck && npm run lint && npm run build
npx tsx scripts/gen-samples.ts   # regenerate sample CSVs if the seed changes
```

The headline acceptance test (`src/lib/analysis.test.ts`) asserts the seed 5-iron is
classified as an inversion + real trend (short) + trustworthy sample + equipment-leaning hint
and surfaced as the top recommendation. **Keep that test passing.**

**Begin with item 1 unless told otherwise. State any assumptions in the README, keep changes
tested and the build green, and don't regress the offline one-command run.**
