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
client-side **IndexedDB** (`idb`). Vitest tests. ESLint (eslint-config-next). CI runs
typecheck + lint + test + build.

**Pure, framework-agnostic stats** in `src/lib/stats/` — fully unit-tested, all thresholds
are named constants in `constants.ts`:
- `descriptive.ts` (mean/median/trimmed mean/sd/MAD/percentiles), `distributions.ts`
  (in-repo Student-t via Hill + Acklam inverse-normal), `confidence.ts` (t CI + shots-needed),
  `outliers.ts` (IQR + robust-z), `adequacy.ts` (sample-size verdicts), `gapping.ts`
  (overlap/hole/inversion), `trend.ts` (real-trend-vs-noise via neighbor interpolation across
  sessions), `equipment.ts` (hedged equipment-vs-swing hypotheses).
- `src/lib/analysis.ts` orchestrates these over a `Shot[]` into a `BagAnalysis` +
  prioritized recommendations. `analyzeBag(shots, settings)` is pure and deterministic.

**Domain & import:** `src/lib/domain/` (canonical `Shot` schema, club normalization/order);
`src/lib/import/` (schema + detection regexes, TrackMan/Inrange presets, auto column mapping,
locale-aware unit-aware `transform.ts`, `csv.ts`, and an `ImportAdapter` interface + registry
with built-in adapters — auto-import is a documented stub, no live vendor APIs).

**Persistence:** `src/lib/db/index.ts` — IndexedDB store (shots/aliases/imports/settings),
deterministic seed of the 5-iron scenario, JSON/CSV export + restore. Storage is isolated
here; the rest of the app is storage-agnostic.

**UI:** `src/app/` — dashboard (bag table + gapping chart + recommendations + session filter),
club detail (distribution, session trend, dispersion scatter, equipment hints), shots
(add/edit/delete + list), settings (metric/outliers/target-CI, alias editor, import history,
backup/restore/reseed/clear). `src/components/` — `DataProvider` (React context over the DB),
`Nav`, `Recommendations`, `badges`, charts, `usePageTitle`.

**Docs:** `README.md`, `METHODOLOGY.md`, sample CSVs in `samples/`, generator in
`scripts/gen-samples.ts`.

## Conventions to keep (non-negotiable)

1. **Statistics stay pure and tested.** New stats logic goes in `src/lib/stats/` (or a pure
   module), with Vitest tests, and is callable without the UI. No stats in components.
2. **All thresholds are named constants** in `constants.ts`, documented in `METHODOLOGY.md`.
3. **Never over-claim.** Every verdict states confidence and the data behind it. Equipment/
   swing output is *hypotheses with evidence*, always hedged — never a diagnosis.
4. **Never silently drop or rescale data.** Outliers are flagged and counted, exclusion is
   toggleable; unit conversions are user-confirmable.
5. **Offline/local only.** No paid APIs, accounts, or services to run. `npm run dev` must work
   from a clean clone.
6. **Keep it green:** `npm run typecheck && npm run lint && npm test && npm run build` must
   pass. Add tests with every behavior change. Maintain the a11y baseline (landmarks, labels,
   `scope`, focus, chart text alternatives).

## Already shipped beyond the original spec (do NOT redo)

- **Per-shot manual exclusions** — tri-state `Shot.excluded` honored by `analyzeBag` via the
  shared `src/lib/exclusion.ts`; toggles on Shots list + Club detail.
- **Trend robustness** — `classifyTrend` takes `TrendOptions`, sample-size-weighted overall
  deviation; `trendMinSessions`/`trendDeviationSE` in Settings.
- **Session insights** — `src/lib/sessionDiff.ts` + `/changes` route (CI-aware, no false alarms).
- **Dispersion module** — `src/lib/stats/dispersion.ts` surfaced on Club detail.
- **Adapter-driven import + Garmin preset** — flow routes through the `ImportAdapter` registry
  (`detectFileAdapter`), Garmin signature-header fingerprinting, `samples/garmin-sample.csv`.
- **Accessible confirm dialogs** — `ConfirmDialog` (focus-trap/ESC) replaces native `confirm()`.
- **Installable offline PWA** — manifest, service worker, generated icons.

Test suite is ~104 tests across the stats, exclusion, sessionDiff, dispersion, import/adapter,
and analysis modules. CI runs typecheck + lint + test + build.

## Fresh backlog (pick top-down; each item lists acceptance criteria)

### ✅ Done (recent rounds)
- **Bag-recommendation engine** (`src/lib/bagAdvice.ts`), **confidence-gated**: holes/overlaps/
  inversions with target carries, scoped to the scoring region; advice leaning on a low-sample
  club is marked `tentative` and de-prioritized. Feeds a "Bag structure" panel.
- **14-club bag optimizer** (`src/lib/bagOptimizer.ts`): even target gap ladder, anchors,
  matched/adjust/gap/redundant, budget check. `/optimize` route.
- **Stopping-power** (`src/lib/stats/stopping.ts`): roll/descent → soft/medium/hot.
- **Session/round metadata** (`sessions` store, `/sessions` page) + mixed-condition warning in
  `/changes` via `sessionDiff`'s `conditionWarning`.
- **Hardened import pipeline**: delimiter (`,`/`;`/tab/`|`) + BOM detection, hyphen/underscore
  club labels, categorized skip report, `importSanity` plausibility checks.
- **Component/integration + pipeline-validation tests**: jsdom + Testing Library +
  fake-indexeddb (`ConfirmDialog`, `DataProvider`), plus an independent synthetic-corpus test
  proving the corpus→recommendations stack generalizes beyond the demo seed. Suite ~146 tests.

### ✅ Also done
- **Undo** for destructive actions (clear/reseed/restore/delete) via a pre-action snapshot +
  `UndoBanner`.
- **Import-flow component test** (jsdom) driving upload → map → confirm.
- **Display-unit toggle** (yards/meters, mph/m·s) — a `Formatter` threaded through every engine
  prose generator and all UI numbers/charts; data stays canonical. `src/lib/format.ts`.

### Note: Playwright E2E smoke (deferred — environment-blocked)
A real-browser E2E smoke was attempted but the sandbox's network policy blocks Playwright's
browser-binary CDN (separate from npm), so it can't be installed or verified here. The jsdom
integration tests (`src/app/page.test.tsx`, `src/components/*.test.tsx`) already render the real
Dashboard/Optimize/import flow against seeded IndexedDB, covering the data→analysis→render path.
A future session with open network can add `@playwright/test`, a chromium install, a `webServer`
config pointing at `npm run dev`, and a smoke spec (load dashboard → navigate to /optimize →
toggle meters in settings → assert unit changes), wired as a **separate** CI job so it doesn't
slow the unit run.

### Remaining ideas

### 1. Session/round metadata
Let users name sessions and tag conditions (indoor/outdoor, wind, temperature, ball). Use tags
to caveat comparisons (e.g. don't compare an indoor session's carry to outdoor).
- **Accept:** schema + store changes are backward compatible; `/changes` warns when comparing
  across differing conditions; tests cover the tagging + comparison gating.

### 2. Display-unit toggle (careful — cross-cutting)
A global meters/yards (and m/s) *display* toggle, independent of stored canonical yards/mph.
Note: many human-readable strings (recommendations, trend/adequacy messages, bag advice) bake
"yds" into prose, so a correct toggle needs those generators to be unit-aware (pass a formatter
in) — not just the table numbers and chart axes. Do it thoroughly or not at all.
- **Accept:** stored data stays canonical; numbers, chart axes AND generated prose all convert;
  tested formatter; no mixed-unit displays.

### 3. Import flow component test
The integration tests cover persistence but not the upload→map→confirm UI. Add a Testing Library
test driving the import page with a small in-memory CSV (the transform is already unit-tested;
this covers the wiring).
- **Accept:** runs in CI; asserts a mapped import adds shots and shows the done screen.

### 4. Data safety polish
Undo for destructive actions (or a trash/restore window), an export reminder, and migration to
OPFS/larger storage if datasets grow.

### 5. Playwright smoke (optional)
One end-to-end test of the seeded dashboard + a navigation, gated behind a separate script so it
doesn't slow the unit run.

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
