// Orchestrates the pure stats module over a set of shots into a full bag
// analysis. Framework-agnostic and deterministic so it can be unit-tested and
// reused by any UI.

import type { AppSettings, ClubId, Shot } from "./domain/types";
import { clubLabel, clubOrderIndex } from "./domain/clubs";
import {
  mean,
  median,
  trimmedMean,
  meanConfidenceInterval,
  shotsNeededForHalfWidth,
  classifyAdequacy,
  iqrOutliers,
  analyzeGapping,
  classifyTrend,
  equipmentHints,
  type ConfidenceInterval,
  type AdequacyVerdict,
  type TrendVerdict,
  type EquipmentHint,
  type GapAnalysis,
  type ClubMetricSummary,
} from "./stats";
import type { ClubSessionStats } from "./stats/trend";

export interface ClubAnalysis {
  club: ClubId;
  label: string;
  n: number; // clean shot count (used for stats)
  rawCount: number; // all shots for this club
  excludedCount: number;
  metricValues: number[]; // clean values of the chosen metric
  mean: number;
  median: number;
  trimmedMean: number;
  ci: ConfidenceInterval;
  shotsNeeded: { additionalNeeded: number; totalNeeded: number };
  adequacy: AdequacyVerdict;
  trend: TrendVerdict;
  hints: EquipmentHint[];
  sessions: string[];
  shots: Shot[];
}

export interface Recommendation {
  priority: number; // lower = address first
  club?: ClubId;
  category: "inversion" | "trend" | "sample" | "hole" | "overlap" | "equipment";
  text: string;
}

export interface BagAnalysis {
  clubs: ClubAnalysis[];
  gapping: GapAnalysis;
  recommendations: Recommendation[];
  totalShots: number;
  totalExcluded: number;
  settings: AppSettings;
}

function metricOf(shot: Shot, metric: AppSettings["metric"]): number | undefined {
  return metric === "total" ? shot.totalYards : shot.carryYards;
}

function summarizeMetrics(shots: Shot[]): Omit<ClubMetricSummary, "club"> {
  const pick = (f: (s: Shot) => number | undefined) => {
    const xs = shots.map(f).filter((v): v is number => typeof v === "number");
    return xs.length ? mean(xs) : undefined;
  };
  return {
    carry: pick((s) => s.carryYards),
    ballSpeed: pick((s) => s.ballSpeedMph),
    spin: pick((s) => s.spinRpm),
    launchAngle: pick((s) => s.launchAngleDeg),
    smash: pick((s) => s.smashFactor),
  };
}

export function analyzeBag(allShots: Shot[], settings: AppSettings): BagAnalysis {
  // Group by club.
  const byClub = new Map<ClubId, Shot[]>();
  for (const s of allShots) {
    if (!byClub.has(s.club)) byClub.set(s.club, []);
    byClub.get(s.club)!.push(s);
  }

  const clubs: ClubAnalysis[] = [];
  let totalExcluded = 0;

  // First pass: per-club clean values + outlier flags.
  const cleanShotsByClub = new Map<ClubId, Shot[]>();

  for (const [club, shots] of byClub) {
    const withMetric = shots.filter((s) => metricOf(s, settings.metric) != null);
    const values = withMetric.map((s) => metricOf(s, settings.metric)!);

    let excludedMask: boolean[] = values.map(() => false);
    if (settings.excludeOutliers) {
      excludedMask = iqrOutliers(values).mask;
    }
    const cleanShots = withMetric.filter((_, i) => !excludedMask[i]);
    const cleanValues = values.filter((_, i) => !excludedMask[i]);
    const excludedCount = excludedMask.filter(Boolean).length;
    totalExcluded += excludedCount;
    cleanShotsByClub.set(club, cleanShots);

    const ci = meanConfidenceInterval(cleanValues);
    const need = shotsNeededForHalfWidth(
      cleanValues,
      settings.targetCiHalfWidthYards,
    );
    const adequacy = classifyAdequacy(
      cleanValues.length,
      Number.isFinite(need.additionalNeeded) ? need.additionalNeeded : undefined,
    );

    clubs.push({
      club,
      label: clubLabel(club),
      n: cleanValues.length,
      rawCount: shots.length,
      excludedCount,
      metricValues: cleanValues,
      mean: mean(cleanValues),
      median: median(cleanValues),
      trimmedMean: trimmedMean(cleanValues),
      ci,
      shotsNeeded: {
        additionalNeeded: need.additionalNeeded,
        totalNeeded: need.totalNeeded,
      },
      adequacy,
      // filled in below
      trend: undefined as unknown as TrendVerdict,
      hints: [],
      sessions: [...new Set(shots.map((s) => s.sessionId))],
      shots,
    });
  }

  // Build per-club-per-session value arrays for trend analysis (clean shots).
  const perClubSession: ClubSessionStats[] = [];
  for (const [club, cleanShots] of cleanShotsByClub) {
    const bySession = new Map<string, number[]>();
    for (const s of cleanShots) {
      const v = metricOf(s, settings.metric);
      if (v == null) continue;
      if (!bySession.has(s.sessionId)) bySession.set(s.sessionId, []);
      bySession.get(s.sessionId)!.push(v);
    }
    for (const [sessionId, vals] of bySession) {
      perClubSession.push({ club, sessionId, values: vals });
    }
  }

  // Second pass: trend + equipment hints per club.
  const meanByClub = new Map<ClubId, number>();
  for (const c of clubs) meanByClub.set(c.club, c.mean);

  for (const c of clubs) {
    c.trend = classifyTrend(c.club, perClubSession);

    // Neighbors = nearest present clubs on each side by canonical order.
    const sorted = [...clubs].sort(
      (a, b) => clubOrderIndex(a.club) - clubOrderIndex(b.club),
    );
    const idx = sorted.findIndex((x) => x.club === c.club);
    const neighborAnalyses = [sorted[idx - 1], sorted[idx + 1]].filter(Boolean);

    const targetSummary: ClubMetricSummary = {
      club: c.club,
      ...summarizeMetrics(cleanShotsByClub.get(c.club) ?? []),
    };
    const neighborSummaries: ClubMetricSummary[] = neighborAnalyses.map((n) => ({
      club: n.club,
      ...summarizeMetrics(cleanShotsByClub.get(n.club) ?? []),
    }));

    const dev = Number.isFinite(c.trend.overallDeviationYards)
      ? c.trend.overallDeviationYards
      : 0;
    c.hints = equipmentHints(targetSummary, neighborSummaries, dev);
  }

  // Gapping across the bag (only clubs with a usable mean).
  const gapping = analyzeGapping(
    clubs
      .filter((c) => Number.isFinite(c.mean))
      .map((c) => ({ club: c.club, carry: c.mean })),
  );

  const recommendations = buildRecommendations(clubs, gapping);

  return {
    clubs: clubs.sort(
      (a, b) => clubOrderIndex(a.club) - clubOrderIndex(b.club),
    ),
    gapping,
    recommendations,
    totalShots: allShots.length,
    totalExcluded,
    settings,
  };
}

function buildRecommendations(
  clubs: ClubAnalysis[],
  gapping: GapAnalysis,
): Recommendation[] {
  const recs: Recommendation[] = [];
  const byClub = new Map(clubs.map((c) => [c.club, c]));

  // 1. Inversions — most actionable structural problem.
  for (const inv of gapping.inversions) {
    const longer = byClub.get(inv.longer);
    const realTrend = longer?.trend.classification === "real-trend";
    const hintText = longer?.hints[0]?.hypothesis;
    recs.push({
      priority: realTrend ? 1 : 2,
      club: inv.longer,
      category: "inversion",
      text:
        `${clubLabelSafe(inv.longer)} is carrying ${inv.deficit.toFixed(0)} yds SHORTER than your ${clubLabelSafe(inv.shorter)} — an inversion. ` +
        (realTrend
          ? `This is a persistent trend across sessions. ${hintText ? hintText : "Get its loft/lie checked."}`
          : `Confirm with more shots before acting; it may still be noise.`),
    });
  }

  // 2. Real trends not already covered by an inversion.
  const invClubs = new Set(gapping.inversions.map((i) => i.longer));
  for (const c of clubs) {
    if (c.trend.classification === "real-trend" && !invClubs.has(c.club)) {
      const hint = c.hints[0];
      recs.push({
        priority: 3,
        club: c.club,
        category: "trend",
        text:
          `${c.label} shows a real, persistent ${c.trend.direction} trend (${Math.abs(c.trend.overallDeviationYards).toFixed(0)} yds vs neighbors). ` +
          (hint ? hint.hypothesis : "Worth investigating equipment vs swing."),
      });
    }
  }

  // 3. Insufficient sample sizes on otherwise interesting clubs.
  for (const c of clubs) {
    if (c.adequacy.level === "insufficient") {
      recs.push({
        priority: 5,
        club: c.club,
        category: "sample",
        text: `Collect more ${c.label} data — ${c.adequacy.message}`,
      });
    }
  }

  // 4. Holes in the bag.
  for (const hole of gapping.holes) {
    recs.push({
      priority: 4,
      category: "hole",
      text: `Large ${hole.gap.toFixed(0)}-yd gap between ${clubLabelSafe(hole.a)} and ${clubLabelSafe(hole.b)} — a hole in your bag. Consider a club or loft change to fill it.`,
    });
  }

  // 5. Overlaps.
  for (const ov of gapping.overlaps) {
    recs.push({
      priority: 6,
      category: "overlap",
      text: `${clubLabelSafe(ov.a)} and ${clubLabelSafe(ov.b)} carry within ${ov.gap.toFixed(0)} yds — they overlap. One may be redundant.`,
    });
  }

  return recs.sort((a, b) => a.priority - b.priority);
}

function clubLabelSafe(club: ClubId): string {
  return clubLabel(club);
}
