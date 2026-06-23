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

## Prioritized backlog (pick top-down; each item lists acceptance criteria)

### 1. Per-shot manual outlier control
The engine already supports `Shot.excluded`, but the UI never sets it. Add an "exclude this
shot" toggle on the Shots list and Club detail, persist it, and have `analyzeBag` honor a
user exclusion independently of the automatic IQR exclusion (so a user can re-include an
auto-excluded shot or exclude a clean one).
- **Accept:** toggling persists across reload; the dashboard's excluded count and a club's N
  reflect manual exclusions; a new unit test asserts manual `excluded` shots are dropped from
  stats while remaining in the stored data.

### 2. Trend robustness across uneven sessions
`classifyTrend` interpolates from neighbor clubs per session. Strengthen it: (a) weight
session deviations by sample size, (b) expose a configurable minimum-sessions/SE threshold in
Settings (still named constants as defaults), (c) handle bags where a neighbor is missing in
some sessions more gracefully.
- **Accept:** new tests cover a 3-session dataset where one session is tiny (should down-weight,
  not flip the verdict); existing 5-iron acceptance test still passes; thresholds remain in
  `constants.ts` with Settings overrides.

### 3. "What changed since last session" view
A diff view comparing the most recent session's per-club means/flags against the prior
trustworthy baseline, with plain-English deltas ("7-iron +4 yds vs baseline; still within CI").
- **Accept:** a pure `diffSessions(...)` (tested) feeds a new route/section; no false alarms
  when the change is within the CI; clearly labels insufficient-sample clubs.

### 4. Dispersion & shot-quality stats
Add a tested dispersion module: side mean/SD, an ellipse or P75 lateral spread, and a
strike-consistency proxy from smash/ball-speed variance where present. Surface on club detail.
- **Accept:** pure module with tests; degrades gracefully when side/launch data is absent
  (Inrange) rather than rendering NaN.

### 5. Real ImportAdapter for a second real format + adapter-driven import
Wire the import flow to actually use the `ImportAdapter` registry (currently the UI calls the
shared transform directly). Add one more real launch-monitor CSV preset (e.g. Garmin/Foresight
header set) behind the adapter interface, with a sample file and detection test.
- **Accept:** `detect()` auto-selects the new preset on its sample; round-trips to the same
  canonical schema; no refactor of the pipeline required to add it (that's the whole point).

### 6. Replace native confirm() flows with accessible in-page confirmations
Destructive actions (clear all, reseed, restore replace/merge) currently use `confirm()`.
Replace with an accessible in-page dialog (focus-trapped, ESC to close, labelled) and a clear
merge-vs-replace choice for restore.
- **Accept:** keyboard-only users can complete every destructive flow; no `confirm()`/`alert()`
  left; lint clean.

### 7. Optional: PWA/offline packaging & data portability polish
Make it installable/offline-first and add an "import a previously exported CSV/JSON" shortcut
from the dashboard empty state.

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
