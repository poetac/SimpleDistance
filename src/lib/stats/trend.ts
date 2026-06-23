// Real-trend vs noise classifier.
//
// Idea: a club's carry is "expected" to fall between its neighbors in the bag.
// For a target club we estimate an expected carry by interpolating the neighbor
// clubs' carries (by canonical order position) and measure the deviation. We do
// this PER SESSION. A deviation that persists with the same sign across
// independent sessions, and is large in both yards and standard errors, is
// "real". One that shows up in a single session is "likely noise".

import type { ClubId } from "../domain/types";
import { clubOrderIndex } from "../domain/clubs";
import { mean, stdError } from "./descriptive";
import {
  TREND_DEVIATION_SE,
  TREND_MIN_SESSIONS,
  TREND_MIN_YARDS,
} from "./constants";

/** Clean carry values for one club in one session. */
export interface ClubSessionStats {
  club: ClubId;
  sessionId: string;
  values: number[];
}

export type TrendClass = "insufficient" | "noise" | "real-trend";
export type TrendDirection = "short" | "long" | "none";

export interface SessionDeviation {
  sessionId: string;
  n: number;
  observedMean: number;
  expectedMean: number;
  /** expected - observed; positive = club is SHORT of expectation. */
  deviationYards: number;
  /** deviation expressed in standard errors of the observed session mean. */
  deviationSE: number;
  strong: boolean;
}

export interface TrendVerdict {
  club: ClubId;
  classification: TrendClass;
  direction: TrendDirection;
  /** Mean of per-session deviations (yards). Positive = short. */
  overallDeviationYards: number;
  sessionsConsidered: number;
  sessionsStrongAgreeing: number;
  perSession: SessionDeviation[];
  message: string;
}

/** Minimum shots for a club to contribute a session mean. */
const MIN_SHOTS_PER_SESSION = 3;

/**
 * Estimate a club's expected carry from its neighbors' carries in one session,
 * interpolating by canonical order index. Returns null if no usable neighbor.
 */
function expectedFromNeighbors(
  target: ClubId,
  sessionMeans: Map<ClubId, number>,
): number | null {
  const targetIdx = clubOrderIndex(target);
  let longer: { idx: number; carry: number } | null = null; // lower order index
  let shorter: { idx: number; carry: number } | null = null; // higher order index

  for (const [club, carry] of sessionMeans) {
    if (club === target) continue;
    const idx = clubOrderIndex(club);
    if (!Number.isFinite(carry)) continue;
    if (idx < targetIdx) {
      if (!longer || idx > longer.idx) longer = { idx, carry };
    } else if (idx > targetIdx) {
      if (!shorter || idx < shorter.idx) shorter = { idx, carry };
    }
  }

  if (longer && shorter) {
    // Linear interpolation by order index.
    const t = (targetIdx - longer.idx) / (shorter.idx - longer.idx);
    return longer.carry + t * (shorter.carry - longer.carry);
  }
  // Single-sided: extrapolation is unreliable, so don't claim an expectation.
  return null;
}

export function classifyTrend(
  target: ClubId,
  perClubSession: ClubSessionStats[],
): TrendVerdict {
  // Group by session.
  const bySession = new Map<string, ClubSessionStats[]>();
  for (const cs of perClubSession) {
    if (!bySession.has(cs.sessionId)) bySession.set(cs.sessionId, []);
    bySession.get(cs.sessionId)!.push(cs);
  }

  const perSession: SessionDeviation[] = [];

  for (const [sessionId, clubs] of bySession) {
    const targetStats = clubs.find((c) => c.club === target);
    if (!targetStats || targetStats.values.length < MIN_SHOTS_PER_SESSION) {
      continue;
    }
    const sessionMeans = new Map<ClubId, number>();
    for (const c of clubs) {
      if (c.values.length >= MIN_SHOTS_PER_SESSION) {
        sessionMeans.set(c.club, mean(c.values));
      }
    }
    const expected = expectedFromNeighbors(target, sessionMeans);
    if (expected == null) continue;

    const observedMean = mean(targetStats.values);
    const se = stdError(targetStats.values) || Number.EPSILON;
    const deviationYards = expected - observedMean;
    const deviationSE = deviationYards / se;
    const strong =
      Math.abs(deviationSE) >= TREND_DEVIATION_SE &&
      Math.abs(deviationYards) >= TREND_MIN_YARDS;

    perSession.push({
      sessionId,
      n: targetStats.values.length,
      observedMean,
      expectedMean: expected,
      deviationYards,
      deviationSE,
      strong,
    });
  }

  const sessionsConsidered = perSession.length;
  const overallDeviationYards =
    sessionsConsidered > 0
      ? mean(perSession.map((s) => s.deviationYards))
      : NaN;

  const direction: TrendDirection =
    sessionsConsidered === 0 || Math.abs(overallDeviationYards) < TREND_MIN_YARDS
      ? "none"
      : overallDeviationYards > 0
        ? "short"
        : "long";

  // Strong sessions agreeing in the overall direction.
  const sessionsStrongAgreeing = perSession.filter(
    (s) =>
      s.strong &&
      Math.sign(s.deviationYards) === Math.sign(overallDeviationYards),
  ).length;

  let classification: TrendClass;
  let message: string;

  if (sessionsConsidered < TREND_MIN_SESSIONS) {
    classification = "insufficient";
    const dirWord =
      direction === "none" ? "in line with neighbors" : `${direction} of expectation`;
    message =
      sessionsConsidered === 0
        ? `Not enough neighbor context to assess ${target}.`
        : `Only ${sessionsConsidered} session with enough shots — ${target} looks ${dirWord}, but a single session can't separate a real trend from noise. Collect another session.`;
  } else if (
    sessionsStrongAgreeing >= TREND_MIN_SESSIONS &&
    direction !== "none"
  ) {
    classification = "real-trend";
    message = `${target} consistently carries ${Math.abs(overallDeviationYards).toFixed(1)} yds ${direction} of its neighbor-interpolated expectation across ${sessionsStrongAgreeing} of ${sessionsConsidered} sessions — this is a real, persistent trend, not session noise.`;
  } else {
    classification = "noise";
    message = `${target}'s deviation (${overallDeviationYards >= 0 ? "+" : ""}${overallDeviationYards.toFixed(1)} yds vs expectation) does not persist strongly across sessions — most likely noise rather than a real trend.`;
  }

  return {
    club: target,
    classification,
    direction,
    overallDeviationYards,
    sessionsConsidered,
    sessionsStrongAgreeing,
    perSession,
    message,
  };
}
