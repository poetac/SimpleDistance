// Descriptive statistics — pure functions, no dependencies.

export function mean(xs: number[]): number {
  if (xs.length === 0) return NaN;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

/** Sample standard deviation (n-1 denominator). */
export function stdDev(xs: number[]): number {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  const variance =
    xs.reduce((acc, x) => acc + (x - m) * (x - m), 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

/** Standard error of the mean. */
export function stdError(xs: number[]): number {
  if (xs.length < 2) return NaN;
  return stdDev(xs) / Math.sqrt(xs.length);
}

/**
 * Symmetric trimmed mean: drops `proportion` of values from each tail.
 * Robust to the mishit outliers common in right-skewed carry data.
 */
export function trimmedMean(xs: number[], proportion = 0.1): number {
  if (xs.length === 0) return NaN;
  if (proportion <= 0) return mean(xs);
  const s = [...xs].sort((a, b) => a - b);
  const k = Math.floor(s.length * proportion);
  const trimmed = s.slice(k, s.length - k);
  return trimmed.length ? mean(trimmed) : median(xs);
}

/** Percentile via linear interpolation (p in [0,100]). */
export function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  if (s.length === 1) return s[0];
  const rank = (p / 100) * (s.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return s[lo];
  return s[lo] + (rank - lo) * (s[hi] - s[lo]);
}

export function quartiles(xs: number[]): { q1: number; q2: number; q3: number; iqr: number } {
  const q1 = percentile(xs, 25);
  const q2 = percentile(xs, 50);
  const q3 = percentile(xs, 75);
  return { q1, q2, q3, iqr: q3 - q1 };
}

/** Median absolute deviation, scaled to be a consistent estimator of sigma. */
export function mad(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const med = median(xs);
  const absDev = xs.map((x) => Math.abs(x - med));
  return median(absDev) * 1.4826;
}
