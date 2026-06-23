// "What changed since last session" — compares the most recent session's
// per-club carry against a baseline built from all prior sessions. It is
// deliberately conservative: a change is only called meaningful when it exceeds
// the combined confidence intervals, so normal session-to-session variation
// doesn't raise a false alarm.

import type { AppSettings, ClubId, Shot } from "./domain/types";
import { clubLabel, clubOrderIndex } from "./domain/clubs";
import { meanConfidenceInterval } from "./stats/confidence";
import { cleanValues } from "./exclusion";
import { MIN_SHOTS_LOW_CONFIDENCE } from "./stats/constants";

export interface ClubSessionDelta {
  club: ClubId;
  label: string;
  latestMean: number;
  latestN: number;
  baselineMean: number;
  baselineN: number;
  /** latest - baseline (positive = farther this session). */
  deltaYards: number;
  /** True when |delta| sits within the combined CI (i.e. likely just noise). */
  withinNoise: boolean;
  /** True when either side has too few clean shots to compare. */
  insufficient: boolean;
  note: string;
}

export interface SessionDiff {
  latestSessionId: string;
  baselineSessionIds: string[];
  rows: ClubSessionDelta[];
  /** Set when the latest session's conditions differ from the baseline's. */
  conditionWarning?: string;
}

/** Order sessions oldest→newest. Uses max timestamp when present, else the id. */
function orderSessions(shots: Shot[]): string[] {
  const lastSeen = new Map<string, string>();
  for (const s of shots) {
    const key = s.timestamp || s.sessionId;
    const prev = lastSeen.get(s.sessionId);
    if (prev == null || key > prev) lastSeen.set(s.sessionId, key);
  }
  return [...lastSeen.entries()]
    .sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0))
    .map(([id]) => id);
}

/**
 * Diff the latest session against all prior sessions. Returns null when there
 * are fewer than two sessions (nothing to compare).
 */
export function diffLatestSession(
  shots: Shot[],
  settings: AppSettings,
  envBySession?: Record<string, string>,
): SessionDiff | null {
  const sessions = orderSessions(shots);
  if (sessions.length < 2) return null;

  const latestSessionId = sessions[sessions.length - 1];
  const baselineSessionIds = sessions.slice(0, -1);

  // Caveat the comparison when conditions differ (e.g. indoor vs outdoor).
  let conditionWarning: string | undefined;
  if (envBySession) {
    const known = (id: string) => {
      const e = envBySession[id];
      return e && e !== "unknown" ? e : undefined;
    };
    const latestEnv = known(latestSessionId);
    const baselineEnvs = new Set(
      baselineSessionIds.map(known).filter((e): e is string => !!e),
    );
    if (latestEnv && (baselineEnvs.size > 1 || (baselineEnvs.size === 1 && !baselineEnvs.has(latestEnv)))) {
      conditionWarning = `This session was ${latestEnv}, but the baseline mixes ${[...baselineEnvs].join(" / ")} conditions — distance differences may reflect conditions, not your swing or equipment.`;
    }
  }

  const latestShots = shots.filter((s) => s.sessionId === latestSessionId);
  const baselineShots = shots.filter((s) => s.sessionId !== latestSessionId);

  const clubsInLatest = [...new Set(latestShots.map((s) => s.club))].sort(
    (a, b) => clubOrderIndex(a) - clubOrderIndex(b),
  );

  const rows: ClubSessionDelta[] = clubsInLatest.map((club) => {
    const latestVals = cleanValues(
      latestShots.filter((s) => s.club === club),
      settings,
    );
    const baselineVals = cleanValues(
      baselineShots.filter((s) => s.club === club),
      settings,
    );

    const latestCi = meanConfidenceInterval(latestVals);
    const baselineCi = meanConfidenceInterval(baselineVals);
    const deltaYards = latestCi.mean - baselineCi.mean;

    const insufficient =
      latestVals.length < MIN_SHOTS_LOW_CONFIDENCE ||
      baselineVals.length < MIN_SHOTS_LOW_CONFIDENCE;

    // Combined uncertainty: if the change is smaller than the summed CI
    // half-widths, the two means are statistically indistinguishable.
    const combined =
      (Number.isFinite(latestCi.halfWidth) ? latestCi.halfWidth : 0) +
      (Number.isFinite(baselineCi.halfWidth) ? baselineCi.halfWidth : 0);
    const withinNoise = Math.abs(deltaYards) <= combined;

    const dir = deltaYards >= 0 ? "longer" : "shorter";
    const mag = Math.abs(deltaYards).toFixed(1);
    let note: string;
    if (insufficient) {
      note = `Not enough clean shots to compare ${clubLabel(club)} reliably (this session ${latestVals.length}, baseline ${baselineVals.length}).`;
    } else if (withinNoise) {
      note = `${mag} yds ${dir} than baseline — within normal variation, no real change.`;
    } else {
      note = `${mag} yds ${dir} than baseline — outside its usual range; worth watching.`;
    }

    return {
      club,
      label: clubLabel(club),
      latestMean: latestCi.mean,
      latestN: latestVals.length,
      baselineMean: baselineCi.mean,
      baselineN: baselineVals.length,
      deltaYards,
      withinNoise,
      insufficient,
      note,
    };
  });

  return { latestSessionId, baselineSessionIds, rows, conditionWarning };
}
