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
  analyzeGapping,
  classifyTrend,
  equipmentHints,
  dispersionStats,
  stoppingStats,
  type ConfidenceInterval,
  type AdequacyVerdict,
  type TrendVerdict,
  type EquipmentHint,
  type GapAnalysis,
  type ClubMetricSummary,
  type DispersionStats,
  type StoppingStats,
} from "./stats";
import type { ClubSessionStats, TrendOptions } from "./stats/trend";
import { classifyExclusions } from "./exclusion";
import { adviseBag, type BagAdvice } from "./bagAdvice";
import { optimizeBag, type BagOptimization } from "./bagOptimizer";
import { categoryOf } from "./domain/clubs";

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
  dispersion: DispersionStats;
  stopping: StoppingStats;
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
  bagAdvice: BagAdvice;
  optimization: BagOptimization;
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
    // Tri-state per-shot exclusion (manual override > auto outlier detection).
    const exclusions = classifyExclusions(shots, settings);
    const cleanEntries = exclusions.filter((e) => !e.excluded && e.value != null);
    const cleanShots = cleanEntries.map((e) => e.shot);
    const cleanValues = cleanEntries.map((e) => e.value as number);
    // Count shots dropped from stats, but not those simply missing the metric.
    const excludedCount = exclusions.filter(
      (e) => e.excluded && e.reason !== "no-metric",
    ).length;
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

    const numeric = (f: (s: Shot) => number | undefined) =>
      cleanShots.map(f).filter((v): v is number => typeof v === "number");
    const dispersion = dispersionStats({
      side: numeric((s) => s.sideYards),
      carry: numeric((s) => s.carryYards),
      ballSpeed: numeric((s) => s.ballSpeedMph),
      smash: numeric((s) => s.smashFactor),
    });
    const cat = categoryOf(club);
    const rolls = cleanShots
      .filter((s) => s.totalYards != null && s.carryYards != null)
      .map((s) => (s.totalYards as number) - (s.carryYards as number));
    const stopping = stoppingStats({
      descent: numeric((s) => s.descentAngleDeg),
      roll: rolls,
      total: numeric((s) => s.totalYards),
      scoringClub: cat === "iron" || cat === "wedge" || cat === "hybrid",
    });

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
      dispersion,
      stopping,
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
  const trendOpts: TrendOptions = {
    minSessions: settings.trendMinSessions,
    deviationSE: settings.trendDeviationSE,
  };

  for (const c of clubs) {
    c.trend = classifyTrend(c.club, perClubSession, trendOpts);

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
  const usableClubs = clubs.filter((c) => Number.isFinite(c.mean));
  const gapping = analyzeGapping(
    usableClubs.map((c) => ({ club: c.club, carry: c.mean })),
  );

  // Prescriptive bag advice (typical gap, holes/overlaps with target carries),
  // confidence-aware so small/noisy samples don't drive structural advice.
  const bagAdvice = adviseBag(
    usableClubs.map((c) => ({
      club: c.club,
      carry: c.mean,
      category: categoryOf(c.club),
      confidence: c.adequacy.level,
    })),
  );

  // 14-club optimization from the reliable clubs (insufficient-sample clubs are
  // excluded so a noisy mean can't reshape the target ladder).
  const optimization = optimizeBag(
    usableClubs
      .filter((c) => c.adequacy.level !== "insufficient")
      .map((c) => ({ club: c.club, carry: c.mean, category: categoryOf(c.club) })),
    {
      targetGapYards: Number.isFinite(bagAdvice.typicalGapYards)
        ? bagAdvice.typicalGapYards
        : undefined,
    },
  );

  const recommendations = buildRecommendations(clubs, bagAdvice);

  return {
    clubs: clubs.sort(
      (a, b) => clubOrderIndex(a.club) - clubOrderIndex(b.club),
    ),
    gapping,
    bagAdvice,
    optimization,
    recommendations,
    totalShots: allShots.length,
    totalExcluded,
    settings,
  };
}

function buildRecommendations(
  clubs: ClubAnalysis[],
  advice: BagAdvice,
): Recommendation[] {
  const recs: Recommendation[] = [];
  const byClub = new Map(clubs.map((c) => [c.club, c]));
  const inversionClubs = new Set<ClubId>();

  // 1-2 & 4 & 6. Structural advice from the bag engine (inversions, holes, overlaps).
  for (const item of advice.items) {
    if (item.kind === "inversion") {
      const longerClub = item.clubs[0];
      inversionClubs.add(longerClub);
      const longer = byClub.get(longerClub);
      const realTrend = longer?.trend.classification === "real-trend";
      const hintText = longer?.hints[0]?.hypothesis;
      recs.push({
        priority: realTrend ? 1 : 2,
        club: longerClub,
        category: "inversion",
        text:
          item.text +
          (realTrend
            ? ` This is a persistent trend across sessions${hintText ? ` — ${hintText}` : "."}`
            : ""),
      });
    } else if (item.kind === "hole") {
      recs.push({ priority: 4, club: item.clubs[0], category: "hole", text: item.text });
    } else {
      recs.push({ priority: 6, club: item.clubs[0], category: "overlap", text: item.text });
    }
  }

  // 3. Real trends not already covered by an inversion.
  for (const c of clubs) {
    if (c.trend.classification === "real-trend" && !inversionClubs.has(c.club)) {
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

  // 5. Insufficient sample sizes on otherwise interesting clubs.
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

  return recs.sort((a, b) => a.priority - b.priority);
}
