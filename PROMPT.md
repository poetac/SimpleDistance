# One-Shot Build Prompt: "SimpleDistance" — Golf Stock-Yardage & Bag-Optimization App

> Paste everything below the line into a fresh, capable coding session. It is written to be
> built in a single pass into a runnable web app, with clear acceptance criteria.

---

## Role & Goal

You are a senior full-stack engineer **and** a golf-performance data analyst. Build a runnable
web application called **SimpleDistance** that helps an amateur golfer determine their *true*
stock yardages per club and optimize their bag — separating real, actionable trends (equipment,
loft gaps, distance gaps) from session-to-session noise and insufficient sample sizes.

Deliver a **working web app in one shot**: it must run locally with a single documented command
and be usable end-to-end (import data → see analysis) without further instructions from me.

## The Problem (domain context — read carefully, it drives the math)

Amateur golfers struggle to know their actual club yardages because distances fluctuate from
session to session. A single off session makes it *feel* like a club is misbehaving, but the
truth is often one of three things, and the app's job is to tell them apart:

1. **Noise / insufficient sample** — too few shots to draw any conclusion; the apparent problem
   is statistically meaningless.
2. **A real, persistent trend** — the club genuinely carries shorter/longer than it should
   relative to the rest of the bag, consistently across sessions.
3. **A diagnosable cause** — distance gaps, loft gaps, or launch/spin signatures that point
   toward equipment (e.g. a bent/weak loft, wrong shaft) vs swing inconsistency.

**Concrete worked example that must work as an acceptance test:** The user's **5-iron** appears
to carry *significantly shorter* than expected, while the **6-iron and 7-iron** both carry
*longer than average*. The app must, from imported shot data, report whether the 5-iron gap is
(a) not yet statistically significant given the shot count, (b) a real, consistent trend, and if
real, surface supporting signals (e.g. abnormal launch/spin/ball-speed vs the neighboring irons,
compressed or inverted gapping) that hint at equipment vs swing — without over-claiming.

## Primary Output: Bag Optimization

The headline feature is **overall bag optimization**. Everything else feeds it:

- **Per-club stock yardage** with a confidence interval and an explicit *sample-size adequacy*
  verdict ("trustworthy" vs "hit more shots — need ~N more for a stable average").
- **Gapping analysis** across the whole bag: ordered carry distances, the gap (yards) between
  consecutive clubs, and flags for **overlaps** (clubs going the same distance), **holes** (gaps
  too large), and **inversions** (a longer club going shorter than a shorter club — the 5-iron
  case).
- **Anomaly vs real-trend classifier** per club: is an observed deviation explainable by noise,
  or is it a persistent signal across sessions?
- **Equipment-vs-swing hints**: where launch monitor data includes ball speed, club/launch angle,
  spin rate, and smash factor, use them as corroborating evidence (e.g. a club whose ball speed
  is in line with neighbors but whose carry is short, with high/low spin, vs one whose ball speed
  itself is low). Present these as *hypotheses to check*, clearly hedged — never a diagnosis.
- A plain-English **recommendations** summary: what to address first (e.g. "Get 5-iron loft/lie
  checked," "Collect more 4-iron data," "Consider closing the 8-iron→9-iron gap").

## Data Import

Support, in priority order:

1. **CSV import** (build first, must work): a flexible **column-mapping** step so the user maps
   their file's columns onto the app's canonical schema. Persist mappings per source so re-imports
   are one click.
2. **Manual shot entry**: quick form to add/edit individual shots.
3. **Pluggable source adapters** (design now, only stub the auto ones): an `ImportAdapter`
   interface so vendor-specific auto-import can be added later **without refactoring**. Most
   consumer trackers lack official public APIs, so do **not** attempt live vendor integrations in
   this build — just leave clean extension points and document them.

**Trackers to support first: TrackMan and Inrange.** I have access to both for testing, so ship a
ready-made column mapping/preset for each. Do not hardcode to their exact headers — auto-detect
where possible and fall back to the mapping UI. Typical fields to expect and normalize:

- **Canonical shot schema:** `club`, `timestamp`/`session_id`, `carry_yards`, `total_yards`,
  `ball_speed_mph`, `club_speed_mph`, `smash_factor`, `launch_angle_deg`, `spin_rpm`,
  `launch_direction_deg`, `side_yards`, `apex_ft`, `descent_angle_deg`. Treat all metrics beyond
  `club` + a distance as optional and degrade gracefully when absent (Inrange exposes fewer
  fields than TrackMan).
- Normalize club names (e.g. "5i", "5 Iron", "Iron 5", "I5" → `5I`; handle woods, hybrids,
  wedges by loft like `52`, `56`, `60`). Provide a club-alias table the user can edit.
- Be unit-aware: detect/convert meters↔yards and m/s↔mph. Many range systems default to meters.

## Statistics — be correct and honest

- Use **carry distance** as the primary yardage metric (configurable to total). Report median and
  trimmed mean alongside the mean; carry data is right-skewed and has mishit outliers.
- **Outlier handling:** detect and optionally exclude obvious mishits (e.g. via IQR or robust
  z-score on carry and ball speed), but always show how many shots were excluded and let the user
  toggle it. Never silently drop data.
- **Confidence intervals** on the mean (t-interval) per club; show the CI width shrinking as N
  grows. Give a concrete *shots-needed* estimate to reach a target CI width (e.g. ±2 yards).
- **Sample-size adequacy:** explicit thresholds with rationale (state your assumptions, e.g.
  "fewer than ~7 clean shots → low confidence"). Make thresholds constants that are easy to tune.
- **Real-trend vs noise:** when multiple sessions exist, compare a club's deviation across
  sessions; a deviation that persists across independent sessions is "real," one that appears in
  a single session is "likely noise." Be explicit about the test/heuristic used.
- **Do not over-claim.** Every verdict states its confidence and the data behind it. The
  equipment-vs-swing output is framed as hypotheses with the supporting signal shown.

## Tech Stack (optimize for one-shot runnability)

- **Single repo, single command to run.** Prefer **Next.js (TypeScript) + React**, **Tailwind**
  for UI, **Recharts** (or similar) for charts. Use a local **SQLite via Prisma** (or a simple
  file/IndexedDB store) so there is no external DB setup. CSV parsing via `papaparse`. Stats in a
  small, well-tested pure-TS module (no heavyweight deps).
- If you choose a different stack, it must still be **`npm install && npm run dev`-simple** with
  no cloud accounts, API keys, or external services required to run.
- Keep the statistics in a **pure, framework-agnostic module** with unit tests, so logic is
  verifiable independent of the UI.

## UI / UX

- **Dashboard:** bag overview table (club, N, mean/median carry, CI, adequacy verdict, gap to next
  club, flags) + a gapping chart (carry per club with CI error bars, highlighting overlaps/holes/
  inversions).
- **Import flow:** upload CSV → preview → map columns (with TrackMan/Inrange presets) → confirm.
- **Club detail view:** distribution of carries, dispersion (side), session-over-session trend,
  and the anomaly/real-trend verdict with supporting metrics.
- **Recommendations panel:** prioritized, plain-English actions.
- Include the **5-iron scenario as seed/demo data** so the app demonstrates the headline insight
  immediately on first run.

## Deliverables (produce all of these)

1. Complete, runnable codebase with the structure above.
2. **Seed dataset** reproducing the 5-iron-short / 6&7-iron-long scenario across ≥2 sessions, plus
   sample TrackMan-style and Inrange-style CSVs in a `/samples` folder.
3. **Unit tests** for the stats module (CI, outlier detection, adequacy thresholds, gapping flags,
   trend-vs-noise) and at least one test asserting the app correctly classifies the seed 5-iron.
4. **README** with: one-command run instructions, the canonical schema, how column mapping works,
   how to add a new `ImportAdapter`, and a clear statement of statistical assumptions/limitations.
5. A short **METHODOLOGY.md** explaining every statistic, threshold, and verdict in plain terms,
   including caveats ("this is decision support, not a club fitting").

## Constraints & Guardrails

- Everything must run **offline / locally**; no paid APIs or accounts to launch the app.
- Prefer correctness and clarity over feature breadth. A smaller app where the bag-optimization
  math is right and explained beats a broad app that guesses.
- Make all statistical thresholds and unit assumptions **named constants**, documented in
  METHODOLOGY.md.
- Hedge all equipment/swing conclusions; present evidence, not verdicts, for physical causes.

## Build Order (so a single pass produces something runnable early)

1. Scaffold app + canonical schema + SQLite/Prisma (or local store).
2. Pure-TS stats module + unit tests (this is the core — get it right first).
3. CSV import + column mapping + TrackMan/Inrange presets + unit normalization + club-name
   normalization.
4. Seed data (5-iron scenario) + sample CSVs.
5. Dashboard, gapping chart, club detail, recommendations.
6. Manual entry + `ImportAdapter` interface stubs for future auto-import.
7. README + METHODOLOGY + final pass to ensure `npm run dev` works from clean clone.

**Begin now. Make reasonable assumptions where details are unspecified, state them in the README,
and produce the full working app.**
