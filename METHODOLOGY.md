# METHODOLOGY

How SimpleDistance turns raw shots into verdicts — every statistic, threshold, and
classification in plain terms, plus what it deliberately does **not** claim.

> **This is decision support, not a club fitting.** Numbers here help you decide where to
> look and what to collect more data on. Physical causes (loft, lie, shaft, strike) are
> presented as *hypotheses to check with a fitter/coach*, never as diagnoses.

All thresholds below are named constants in
[`src/lib/stats/constants.ts`](./src/lib/stats/constants.ts) and are easy to tune in one
place.

---

## 1. Which distance, and which "average"

- **Primary metric: carry distance** (configurable to total in Settings). Carry is what
  governs gapping and club selection.
- Carry data is **right-skewed** and contains mishits, so we report three centers:
  - **Mean** — the headline stock number (after outlier handling).
  - **Median** — robust middle value; if it diverges from the mean, the distribution is
    skewed.
  - **Trimmed mean** (10% each tail) — a robust average shown on the club detail page.

## 2. Outlier handling (mishits)

Mishits would otherwise drag the "stock" number around. We detect them but **never silently
drop data**.

- **Method:** Tukey **IQR fences** — values outside `[Q1 − 1.5·IQR, Q3 + 1.5·IQR]` are
  flagged. (`IQR_FENCE_MULTIPLIER = 1.5`.) A MAD-based **robust z-score** (`> 3.5`) is also
  available in the stats module.
- Outlier detection only runs with ≥4 shots.
- Excluded shots are **counted and shown** on the dashboard (e.g. `N (−2)`), and exclusion
  is **toggleable** in Settings. Nothing is deleted from your data — it's only set aside
  from the active statistics.

## 3. Confidence interval on the stock yardage

- We report a two-sided **Student-t confidence interval** on the mean
  (`CONFIDENCE_LEVEL = 0.95`): `mean ± t*(n−1) · s/√n`.
- The t critical value uses an in-repo implementation of **Hill's algorithm** with an
  **Acklam inverse-normal**, validated against published critical-value tables in
  [`distributions.test.ts`](./src/lib/stats/distributions.test.ts) (e.g. df=10 → 2.228,
  df→∞ → 1.96).
- The CI **half-width is the "± yards"** you see. It shrinks as your sample grows — this is
  the visual proof that more shots = a more trustworthy number.
- A CI is undefined for n < 2 and shown as `—`.
- **Optional percentile bootstrap.** Carry is right-skewed, so the t-interval's normal-mean
  assumption is weakest for small/skewed samples — exactly when it matters. Settings → *CI
  method* switches to a **percentile bootstrap** ([`bootstrap.ts`](./src/lib/stats/bootstrap.ts)):
  resample the shots with replacement 2,000× (seeded, so it's reproducible), recompute the mean
  each time, and take the 2.5/97.5 percentiles. It makes no distributional assumption and yields
  an *asymmetric* interval (the club detail shows the real lower–upper bounds, since `±` would
  hide the asymmetry). The t-interval stays the default.

### Shots-needed estimate

From `half-width ≈ t*·s/√N`, we solve for the **N** that reaches a target half-width
(default `±2 yds`, `DEFAULT_TARGET_CI_HALF_WIDTH_YARDS`), iterating because `t*` itself
depends on N. The club detail view reports the **additional** clean shots needed. Holding
the observed spread fixed is an assumption — your real spread may change as you hit more.

## 4. Sample-size adequacy verdict

A plain verdict on whether a club's average can be trusted yet
([`adequacy.ts`](./src/lib/stats/adequacy.ts)):

| Verdict | Condition | Meaning |
|---|---|---|
| **Insufficient** | n < `MIN_SHOTS_LOW_CONFIDENCE` (7) | Too few shots — apparent problems are likely noise; collect more before concluding. |
| **Low confidence** | 7 ≤ n < `MIN_SHOTS_TRUSTWORTHY` (15) | Directional but not rock-solid. |
| **Trustworthy** | n ≥ 15 | Stable enough to act on. |

**Rationale / assumption:** with the per-club carry spreads typical of amateurs (σ ≈ 5–8
yds), ~7 shots is the rough floor for any read and ~15 gets the 95% CI into single-digit
yards. These are deliberately simple, tunable cutoffs — not a power calculation.

## 5. Gapping analysis (overlaps, holes, inversions)

Clubs are ordered by a fixed **canonical order** (driver → woods → hybrids → irons →
wedges). For each adjacent pair (the longer-numbered club L above the shorter S below) we
take `gap = L.carry − S.carry`, which should be positive, and flag
([`gapping.ts`](./src/lib/stats/gapping.ts)):

| Flag | Condition | Meaning |
|---|---|---|
| **Inversion** | `gap < 0` | The club that should go *farther* actually goes *shorter* — the 5-iron case. The strongest signal. |
| **Overlap** | `0 ≤ gap < OVERLAP_GAP_YARDS` (5) | Two clubs go nearly the same distance — one may be redundant. |
| **Hole** | `gap > HOLE_GAP_YARDS` (20) | A distance gap nothing covers. |
| **OK** | otherwise (≈ `EXPECTED_GAP_YARDS` 12) | Healthy spacing. |

## 6. Real-trend vs noise classifier

The core question: is a club's odd distance a **persistent trait** or just a **bad session**?
([`trend.ts`](./src/lib/stats/trend.ts))

1. A club's carry is *expected* to sit between its neighbors. For a target club we estimate
   an **expected carry by linearly interpolating its neighbor clubs' carries** by canonical
   position. (One-sided extrapolation is treated as no expectation — we don't guess.)
2. We do this **per session**, using only clubs with ≥3 clean shots that session.
3. Per session we get a **deviation** (`expected − observed`; positive = the club is *short*)
   and express it in **standard errors** of that session's mean. A session deviation is
   "strong" when it exceeds **both** `TREND_DEVIATION_SE = 1.5` SE **and**
   `TREND_MIN_YARDS = 4` yds.
4. Verdict:
   - **Real trend** — strong deviations of the **same sign** in ≥ `TREND_MIN_SESSIONS` (2)
     independent sessions. Persistent across sessions ⇒ not noise.
   - **Insufficient** — fewer than 2 sessions have enough shots/neighbor context. A single
     session *cannot* separate a real trend from a one-off; we say so.
   - **Likely noise** — a deviation that doesn't persist strongly or flips sign.

**Assumptions:** sessions are treated as independent; neighbor interpolation assumes the
neighbors themselves are roughly correct (a whole-bag systematic bias won't be flagged as a
single-club trend — by design).

## 7. Equipment-vs-swing hints (hypotheses only)

When launch data is present, we offer **corroborating hypotheses**, always hedged, always
with the evidence shown ([`equipment.ts`](./src/lib/stats/equipment.ts)). They only trigger
when there's already a carry deviation to explain:

- **Short carry + normal ball speed** (within `BALL_SPEED_INLINE_PCT = 3%` of neighbors) →
  leans **equipment**: the club delivers speed but not distance, consistent with a launch/
  spin or loft issue → "worth a loft/lie check."
- **Short carry + low ball speed** → leans **swing**: points to strike/speed with that club
  more than equipment.
- **Short carry + high spin** (> `SPIN_ANOMALY_PCT = 15%` above neighbors) → weak corroboration
  of a weak-loft / contact hypothesis (extra spin eats carry).
- **Long carry + high ball speed** → possible strong/de-lofted setup (weak signal).

These are explicitly labeled with a *lean* (equipment / swing / unclear) and a *weak* or
*moderate* confidence. **None of them is a diagnosis.**

## 7b. Bag optimization (the 14-club ladder)

`optimizeBag` ([`src/lib/bagOptimizer.ts`](./src/lib/bagOptimizer.ts)) turns the reliable
carries into a prescriptive target and checks it against the bag limit:

- **Inputs are reliable clubs only** — clubs with an *insufficient* sample are excluded so a
  noisy mean can't reshape the ladder. Bag advice (§5/§8) is likewise confidence-gated:
  advice that leans on an unreliable club is marked **tentative** and de-prioritized.
- **Anchors vs. ladder:** the **driver and woods are anchors**, kept as-is — you can't evenly
  fill driver→wood gaps with extra clubs. The even ladder covers only the **gappable region**
  (hybrids/irons/wedges), where a loft or club change is actionable.
- **Target gap:** defaults to the player's demonstrated typical gap (median consecutive gap of
  reliable scoring clubs); configurable.
- **Ladder:** endpoints are pinned to the player's longest and shortest gappable clubs, with
  evenly-spaced interior slots at the target gap. Each club is assigned to its nearest slot:
  a slot with a club within ~0.4× the target is **matched**, farther is **adjust** (a loft
  tweak centers it), an empty slot is a **gap** (add a club ~target carry), and a second club
  crowding a slot is **redundant** (a candidate to drop).
- **Budget:** default 14 clubs minus a putter = **13 full-swing slots**. The optimizer reports
  the proposed count (anchors + kept + added − redundant) and whether you have room to add or
  need to drop. If the bag has an inversion, the UI advises fixing it first, since corrected
  carries re-sort the ladder. As always, this is decision support, not a fitting.

## 8. Recommendations (prioritization)

The dashboard sorts actions so you address the highest-leverage problem first
([`analysis.ts`](./src/lib/analysis.ts)):

1. **Inversions backed by a real trend** (e.g. "Get the 5-iron's loft/lie checked").
2. Inversions not yet confirmed (collect more first).
3. Other **real trends**.
4. **Holes** in the bag.
5. **Insufficient-sample** clubs ("collect ~N more").
6. **Overlaps** (possible redundancy).

## 9. Units

Imports are unit-aware. Distances normalize to **yards** (`× 1.09361` from meters), speeds
to **mph** (`× 2.23694` from m/s, `× 0.621371` from km/h). Source unit comes from the preset
and a magnitude heuristic, and is overridable in the import UI. Header hints (e.g. `(m)`,
`m/s`) win over heuristics.

## 10. Worked example — the seed 5-iron

The demo dataset ([`src/lib/db/seed.ts`](./src/lib/db/seed.ts)) is deterministic and spans
two sessions. The 5-iron is set ~17 yds short of its ~183-yd neighbor expectation with
**normal ball speed but elevated spin**; the 6- and 7-irons run slightly long. The app
should (and the test suite [`analysis.test.ts`](./src/lib/analysis.test.ts) asserts it does):

- Flag a **5I→6I inversion**.
- Classify the 5-iron as a **real trend (short)**, not noise (it persists across both sessions).
- Call the 5-iron sample **trustworthy** (enough shots — so it's not dismissed as small-sample).
- Surface an **equipment-leaning hint** (normal ball speed + short carry + high spin → loft
  check), clearly hedged.
- Put **"Get the 5-iron checked"** at the top of the recommendations.

## Limitations (read me)

- Per-browser storage; not synced across devices.
- Trend detection needs ≥2 sessions with shared neighbor clubs; sparse bags limit it.
- Neighbor interpolation can't see a *whole-bag* systematic bias, and assumes a normal-ish
  loft progression.
- Equipment hints require launch-monitor fields; with carry-only data they won't appear.
- Thresholds are pragmatic defaults, not the output of a formal power analysis. Tune them in
  `constants.ts` for your game.
