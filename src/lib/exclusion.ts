// Per-shot exclusion logic, shared by the analysis engine and the UI so both
// agree on exactly which shots feed the statistics.
//
// Tri-state `Shot.excluded`:
//   true       -> user force-excluded (always dropped from stats)
//   false      -> user force-included (kept even if it's an automatic outlier)
//   undefined  -> defer to automatic IQR outlier detection (when enabled)
//
// We never delete data — excluded shots remain stored and are surfaced with a
// reason so the user can change their mind.

import type { AppSettings, Shot, YardageMetric } from "./domain/types";
import { iqrOutliers, robustZOutliers } from "./stats/outliers";

export type ExclusionReason =
  | "included"
  | "manual-exclude"
  | "manual-include"
  | "auto-outlier"
  | "no-metric";

export interface ShotExclusion {
  shot: Shot;
  value: number | undefined;
  excluded: boolean;
  reason: ExclusionReason;
}

export function metricValue(shot: Shot, metric: YardageMetric): number | undefined {
  return metric === "total" ? shot.totalYards : shot.carryYards;
}

/**
 * Classify every shot for a single club into included/excluded with a reason.
 * Automatic outlier detection runs only over shots that aren't already manually
 * overridden, so a force-included shot can't be auto-dropped and a force-excluded
 * shot doesn't skew the fences.
 */
export function classifyExclusions(
  shots: Shot[],
  settings: AppSettings,
): ShotExclusion[] {
  const metric = settings.metric;

  // Candidates for automatic detection: have a metric value and no manual override.
  const autoCandidates: Array<{ idx: number; value: number }> = [];
  shots.forEach((s, idx) => {
    const v = metricValue(s, metric);
    if (v != null && s.excluded == null) autoCandidates.push({ idx, value: v });
  });

  const autoOutlier = new Set<number>();
  if (settings.excludeOutliers && autoCandidates.length >= 4) {
    const values = autoCandidates.map((c) => c.value);
    const mask =
      settings.outlierMethod === "robustz"
        ? robustZOutliers(values).mask
        : iqrOutliers(values).mask;
    mask.forEach((isOut, i) => {
      if (isOut) autoOutlier.add(autoCandidates[i].idx);
    });
  }

  return shots.map((shot, idx) => {
    const value = metricValue(shot, metric);
    if (value == null) {
      return { shot, value, excluded: true, reason: "no-metric" };
    }
    if (shot.excluded === true) {
      return { shot, value, excluded: true, reason: "manual-exclude" };
    }
    if (shot.excluded === false) {
      return { shot, value, excluded: false, reason: "manual-include" };
    }
    if (autoOutlier.has(idx)) {
      return { shot, value, excluded: true, reason: "auto-outlier" };
    }
    return { shot, value, excluded: false, reason: "included" };
  });
}

/** Convenience: the clean metric values that feed the statistics for a club. */
export function cleanValues(shots: Shot[], settings: AppSettings): number[] {
  return classifyExclusions(shots, settings)
    .filter((e) => !e.excluded && e.value != null)
    .map((e) => e.value as number);
}
