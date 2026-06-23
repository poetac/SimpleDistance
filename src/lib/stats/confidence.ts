// Confidence intervals on the mean and the "shots needed" estimate.

import { mean, stdDev, stdError } from "./descriptive";
import { studentTCritical } from "./distributions";
import { CONFIDENCE_LEVEL } from "./constants";

export interface ConfidenceInterval {
  mean: number;
  /** Half-width of the interval (the "± yards"). */
  halfWidth: number;
  lower: number;
  upper: number;
  /** Number of observations. */
  n: number;
  /** Confidence level used (e.g. 0.95). */
  level: number;
}

/**
 * Two-sided t confidence interval for the population mean.
 * Returns NaN-filled fields when n < 2 (a CI is undefined).
 */
export function meanConfidenceInterval(
  xs: number[],
  level: number = CONFIDENCE_LEVEL,
): ConfidenceInterval {
  const n = xs.length;
  const m = mean(xs);
  if (n < 2) {
    return { mean: m, halfWidth: NaN, lower: NaN, upper: NaN, n, level };
  }
  const se = stdError(xs);
  const tStar = studentTCritical(1 - level, n - 1);
  const halfWidth = tStar * se;
  return { mean: m, halfWidth, lower: m - halfWidth, upper: m + halfWidth, n, level };
}

/**
 * Estimate how many TOTAL clean shots are needed to reach a target CI
 * half-width, holding the observed standard deviation fixed.
 *
 * From half-width h ≈ t* · s / sqrt(N), solving for N gives N ≈ (t*·s/h)².
 * Because t* depends on N, we iterate to a fixed point. Returns the total N
 * (not the additional shots) and the additional shots beyond current count.
 */
export function shotsNeededForHalfWidth(
  xs: number[],
  targetHalfWidth: number,
  level: number = CONFIDENCE_LEVEL,
): { totalNeeded: number; additionalNeeded: number; achievable: boolean } {
  const n = xs.length;
  if (n < 2 || targetHalfWidth <= 0) {
    return { totalNeeded: NaN, additionalNeeded: NaN, achievable: false };
  }
  const s = stdDev(xs);
  if (s === 0) {
    // Already perfectly tight.
    return { totalNeeded: 2, additionalNeeded: Math.max(0, 2 - n), achievable: true };
  }

  let nEst = n;
  for (let i = 0; i < 50; i++) {
    const df = Math.max(1, Math.round(nEst) - 1);
    const tStar = studentTCritical(1 - level, df);
    const next = Math.pow((tStar * s) / targetHalfWidth, 2);
    if (Math.abs(next - nEst) < 0.01) {
      nEst = next;
      break;
    }
    nEst = next;
  }

  const totalNeeded = Math.ceil(nEst);
  return {
    totalNeeded,
    additionalNeeded: Math.max(0, totalNeeded - n),
    achievable: true,
  };
}
