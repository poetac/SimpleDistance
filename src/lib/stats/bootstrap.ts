// Percentile bootstrap confidence intervals. Distribution-free — no normality
// assumption — which suits right-skewed carry data better than the t-interval
// for small or skewed samples. Deterministic (seeded PRNG) so results are
// reproducible and testable.

import { mean, median } from "./descriptive";
import type { ConfidenceInterval } from "./confidence";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function percentileSorted(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0];
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (rank - lo) * (sorted[hi] - sorted[lo]);
}

export interface BootstrapOptions {
  level?: number;
  iterations?: number;
  seed?: number;
  statistic?: "mean" | "median";
}

/**
 * Percentile bootstrap CI for a statistic of `xs`. Returns a ConfidenceInterval
 * (the `point`/mean field is the chosen statistic on the original sample; the
 * interval is asymmetric, so `halfWidth` is half the interval width).
 */
export function bootstrapCI(
  xs: number[],
  opts: BootstrapOptions = {},
): ConfidenceInterval {
  const level = opts.level ?? 0.95;
  const iterations = opts.iterations ?? 2000;
  const seed = opts.seed ?? 1234567;
  const statFn = opts.statistic === "median" ? median : mean;
  const n = xs.length;

  const point = statFn(xs);
  if (n < 2) {
    return { mean: point, halfWidth: NaN, lower: NaN, upper: NaN, n, level };
  }

  const rng = mulberry32(seed);
  const stats = new Array<number>(iterations);
  const sample = new Array<number>(n);
  for (let b = 0; b < iterations; b++) {
    for (let i = 0; i < n; i++) {
      sample[i] = xs[Math.floor(rng() * n)];
    }
    stats[b] = statFn(sample);
  }
  stats.sort((a, b) => a - b);

  const alpha = (1 - level) * 100;
  const lower = percentileSorted(stats, alpha / 2);
  const upper = percentileSorted(stats, 100 - alpha / 2);
  return { mean: point, halfWidth: (upper - lower) / 2, lower, upper, n, level };
}
