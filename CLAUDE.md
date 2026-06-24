# CLAUDE.md

Guidance for Claude Code (and humans) working in this repo.

## What this is

**SimpleDistance** — a runnable web app that turns a corpus of golf shot data into true
per-club stock yardages and an optimized bag, separating real trends from session noise and
small-sample artifacts. Product spec: [`PROMPT.md`](./PROMPT.md). Statistics reference:
[`METHODOLOGY.md`](./METHODOLOGY.md). Continue-from-here plan: [`docs/NEXT_SESSION.md`](./docs/NEXT_SESSION.md).

## Commands

```bash
npm install
npm run dev         # http://localhost:3000 (auto-seeds the 5-iron demo)
npm test            # Vitest — keep green; add tests with every behavior change
npm run typecheck   # tsc --noEmit
npm run lint        # eslint-config-next (incl. jsx-a11y)
npm run build       # next build
npx tsx scripts/gen-samples.ts   # regenerate sample CSVs from the seed
node scripts/gen-icons.mjs       # regenerate PWA icons
```

CI (`.github/workflows/ci.yml`) runs typecheck + lint + test + build on every push/PR.

## Architecture (layers, inner → outer)

- `src/lib/domain/` — canonical `Shot` schema, `SessionMeta`, club normalization/ordering/category.
- `src/lib/stats/` — **pure, framework-agnostic, unit-tested** statistics: descriptive,
  distributions (in-repo Student-t + inverse-normal), confidence (t-interval), bootstrap CI,
  outliers (IQR + robust-z), adequacy, gapping, trend, equipment, dispersion, stopping. All
  thresholds are **named constants** in `stats/constants.ts`.
- `src/lib/` (app-level pure modules) — `exclusion` (tri-state per-shot), `bagAdvice`,
  `bagOptimizer`, `sessionDiff`, `report`, `format` (display-unit formatter), and
  `analysis.ts` which orchestrates everything into a `BagAnalysis`.
- `src/lib/import/` — schema/detection, presets (TrackMan/Inrange/Garmin), mapping, units,
  locale-aware transform, csv, sanity checks, and the `ImportAdapter` registry.
- `src/lib/db/` — IndexedDB store (`idb`) + deterministic seed. Storage is isolated here.
- `src/components/` — `DataProvider` (React context over the DB; analysis memo; undo),
  `useFormatter`, charts (Recharts), `ConfirmDialog`, etc.
- `src/app/` — Next.js App Router pages: dashboard, optimize, changes, import, shots,
  sessions, settings, club/[club].

## Conventions (do not break)

1. **Stats stay pure and tested.** New analytics go in a pure module with Vitest tests,
   callable without the UI. No stats logic in components.
2. **All thresholds are named constants** in `stats/constants.ts`, documented in METHODOLOGY.
3. **Never over-claim.** Every verdict states confidence + the data behind it. Equipment/swing
   output is *hypotheses with evidence*, always hedged — never a diagnosis.
4. **Never silently drop or rescale data.** Outliers are flagged/counted and toggleable; unit
   conversions are user-confirmable.
5. **Canonical units.** Data is stored in **yards/mph/degrees**. Display conversion goes
   through `src/lib/format.ts` (`Formatter`) — thread it through any new prose/number, default
   yards so existing output is unchanged.
6. **Offline/local only.** No paid APIs/accounts. `npm run dev` works from a clean clone.
7. **Keep it green.** `typecheck && lint && test && build` must pass. The headline 5-iron
   acceptance test (`src/lib/analysis.test.ts`) must keep passing.

## Testing notes

- Pure modules: plain Vitest (node env).
- Component/integration tests: add `// @vitest-environment jsdom` and `import "fake-indexeddb/auto"`.
  `src/test/setup.ts` stubs `ResizeObserver` (Recharts needs it). JSX uses the automatic runtime.
