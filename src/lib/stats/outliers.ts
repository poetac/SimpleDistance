// Outlier detection for mishits. We never silently drop data — these functions
// only *flag* indices; the caller decides whether to exclude and always reports
// how many were excluded.

import { quartiles, median, mad } from "./descriptive";
import { IQR_FENCE_MULTIPLIER, ROBUST_Z_CUTOFF } from "./constants";

export interface OutlierResult {
  /** Indices (into the input array) judged to be outliers. */
  outlierIndices: number[];
  /** Boolean mask aligned with the input array. */
  mask: boolean[];
  lowerFence: number;
  upperFence: number;
}

/**
 * Tukey IQR fences. Values outside [Q1 - k·IQR, Q3 + k·IQR] are outliers.
 * Robust and distribution-agnostic — good default for right-skewed carry data.
 */
export function iqrOutliers(
  xs: number[],
  k: number = IQR_FENCE_MULTIPLIER,
): OutlierResult {
  if (xs.length < 4) {
    return {
      outlierIndices: [],
      mask: xs.map(() => false),
      lowerFence: -Infinity,
      upperFence: Infinity,
    };
  }
  const { q1, q3, iqr } = quartiles(xs);
  const lowerFence = q1 - k * iqr;
  const upperFence = q3 + k * iqr;
  const mask = xs.map((x) => x < lowerFence || x > upperFence);
  const outlierIndices = mask.flatMap((b, i) => (b ? [i] : []));
  return { outlierIndices, mask, lowerFence, upperFence };
}

/**
 * Modified z-score using the median and MAD (robust to the very outliers we are
 * trying to detect). |z| > cutoff flags an outlier.
 */
export function robustZOutliers(
  xs: number[],
  cutoff: number = ROBUST_Z_CUTOFF,
): OutlierResult {
  if (xs.length < 4) {
    return {
      outlierIndices: [],
      mask: xs.map(() => false),
      lowerFence: -Infinity,
      upperFence: Infinity,
    };
  }
  const med = median(xs);
  const scale = mad(xs);
  if (scale === 0) {
    return {
      outlierIndices: [],
      mask: xs.map(() => false),
      lowerFence: -Infinity,
      upperFence: Infinity,
    };
  }
  const mask = xs.map((x) => Math.abs((x - med) / scale) > cutoff);
  const outlierIndices = mask.flatMap((b, i) => (b ? [i] : []));
  return {
    outlierIndices,
    mask,
    lowerFence: med - cutoff * scale,
    upperFence: med + cutoff * scale,
  };
}
