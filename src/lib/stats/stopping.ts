// Stopping power & total-distance analysis. How a club lands — descent angle and
// roll (total minus carry) — judged for scoring clubs where "stops vs releases"
// is actionable. Pure; degrades to undefined/unknown when data is absent.

import { mean } from "./descriptive";
import { SOFT_ROLL_FRACTION, HOT_ROLL_FRACTION } from "./constants";
import { YARDS, type Formatter } from "../format";

export type Landing = "soft" | "medium" | "hot" | "unknown";

export interface StoppingInput {
  /** Per-shot descent angles (deg), where available. */
  descent?: number[];
  /** Per-shot roll = total - carry (yds), where both were present. */
  roll?: number[];
  /** Per-shot total distances (yds), where available. */
  total?: number[];
  /** True for irons/wedges, where a soft/hot verdict is meaningful. */
  scoringClub?: boolean;
  /** Display formatter for the note prose (defaults to yards). */
  fmt?: Formatter;
}

export interface StoppingStats {
  descentAngleMean?: number;
  rollYardsMean?: number;
  /** roll / total, the share of distance from release. */
  rollFraction?: number;
  landing: Landing;
  note: string;
}

function avg(xs?: number[]): number | undefined {
  const v = (xs ?? []).filter((x) => Number.isFinite(x));
  return v.length ? mean(v) : undefined;
}

export function stoppingStats(input: StoppingInput): StoppingStats {
  const descentAngleMean = avg(input.descent);
  const rollYardsMean = avg(input.roll);
  const totalMean = avg(input.total);
  const rollFraction =
    rollYardsMean != null && totalMean != null && totalMean > 0
      ? rollYardsMean / totalMean
      : undefined;

  let landing: Landing = "unknown";
  if (input.scoringClub && rollFraction != null) {
    landing =
      rollFraction <= SOFT_ROLL_FRACTION
        ? "soft"
        : rollFraction >= HOT_ROLL_FRACTION
          ? "hot"
          : "medium";
  }

  const fmt = input.fmt ?? YARDS;
  let note: string;
  if (rollFraction == null && descentAngleMean == null) {
    note = "No roll or descent data available to judge stopping power.";
  } else if (!input.scoringClub) {
    note =
      rollYardsMean != null
        ? `Releases ~${fmt.dist(rollYardsMean)} on average — expected for a long club.`
        : `Descends at ~${descentAngleMean!.toFixed(0)}°.`;
  } else if (landing === "soft") {
    note = `Lands soft — only ~${(rollFraction! * 100).toFixed(0)}% of distance from roll. Good stopping power.`;
  } else if (landing === "hot") {
    note = `Releases hot — ~${(rollFraction! * 100).toFixed(0)}% of distance from roll. It may run out on firm greens.`;
  } else {
    note = `Moderate release (~${(rollFraction! * 100).toFixed(0)}% roll).`;
  }

  return { descentAngleMean, rollYardsMean, rollFraction, landing, note };
}
