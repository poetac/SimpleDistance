// Per-club time-series drift: regress session-mean carry against session order.
// Complements sessionDiff (latest-vs-baseline) by asking "is this club steadily
// drifting longer or shorter across ALL my sessions?". Pure and tested; honest
// about small samples.

import { mean } from "./descriptive";
import {
  TIME_TREND_MIN_SESSIONS,
  TIME_TREND_MIN_SLOPE,
  TIME_TREND_MIN_R2,
} from "./constants";

export type DriftDirection = "lengthening" | "shortening" | "stable" | "insufficient";

export interface SessionMeanPoint {
  sessionId: string;
  mean: number;
}

export interface TimeTrend {
  sessionsConsidered: number;
  /** Yards per session (least-squares slope). */
  slopePerSession?: number;
  /** Total drift across the span (slope × (n−1)). */
  totalDrift?: number;
  rSquared?: number;
  direction: DriftDirection;
  message: string;
}

/** `points` must be in chronological order (oldest → newest). */
export function timeTrend(points: SessionMeanPoint[]): TimeTrend {
  const ys = points.map((p) => p.mean).filter((v) => Number.isFinite(v));
  const n = ys.length;
  if (n < TIME_TREND_MIN_SESSIONS) {
    return {
      sessionsConsidered: n,
      direction: "insufficient",
      message: `Need at least ${TIME_TREND_MIN_SESSIONS} sessions to read a drift (have ${n}).`,
    };
  }

  const xs = ys.map((_, i) => i);
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const rSquared = sxx === 0 || syy === 0 ? 0 : (sxy * sxy) / (sxx * syy);
  const totalDrift = slope * (n - 1);

  let direction: DriftDirection = "stable";
  if (Math.abs(slope) >= TIME_TREND_MIN_SLOPE && rSquared >= TIME_TREND_MIN_R2) {
    direction = slope > 0 ? "lengthening" : "shortening";
  }

  const message =
    direction === "stable"
      ? `Stable across ${n} sessions — no consistent drift in carry.`
      : `Drifting ~${Math.abs(slope).toFixed(1)} yds ${direction === "lengthening" ? "longer" : "shorter"} per session across ${n} sessions (${Math.abs(totalDrift).toFixed(0)} yds total). Could be the swing warming up, fitness, or equipment — worth watching.`;

  return { sessionsConsidered: n, slopePerSession: slope, totalDrift, rSquared, direction, message };
}
