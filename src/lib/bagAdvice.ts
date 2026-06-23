// Bag-recommendation engine: turns the ordered carry distances into prescriptive,
// honest advice — a target gap progression, where a club could be added to fill a
// hole, which clubs are redundant, and where an inversion needs attention.
//
// Honesty guardrails:
//  - The "typical gap" is the median consecutive gap among the SCORING clubs
//    (hybrids/irons/wedges), so the naturally large driver/wood gaps don't make
//    everything look like a hole.
//  - Hole/overlap advice is only generated within that scoring region, where a
//    club or loft change is actually actionable.
//  - Suggested carries are presented as approximate targets, not promises.

import type { ClubId } from "./domain/types";
import { clubLabel, clubOrderIndex, categoryOf, type ClubCategory } from "./domain/clubs";
import { median } from "./stats/descriptive";
import { OVERLAP_GAP_YARDS, HOLE_GAP_YARDS } from "./stats/constants";

/** A consecutive gap that is this multiple of the typical gap is a hole. */
export const HOLE_FACTOR = 1.6;
/** A consecutive gap this fraction of the typical gap (or smaller) is an overlap. */
export const OVERLAP_FACTOR = 0.55;

export interface BagClub {
  club: ClubId;
  carry: number;
  category: ClubCategory;
  /** Sample-confidence of this club's carry. Defaults to trustworthy. */
  confidence?: ClubConfidence;
}

export type ClubConfidence = "insufficient" | "low" | "trustworthy";

export type AdviceKind = "inversion" | "hole" | "overlap";

export interface BagAdviceItem {
  kind: AdviceKind;
  clubs: ClubId[];
  text: string;
  /** Approximate target carry for a club that would fill a hole. */
  suggestedCarry?: number;
  priority: number;
  /** True when an involved club's carry isn't yet statistically reliable. */
  tentative: boolean;
}

export interface BagAdvice {
  /** Median consecutive gap among reliable scoring clubs, the progression target. */
  typicalGapYards: number;
  items: BagAdviceItem[];
}

const SCORING: ClubCategory[] = ["hybrid", "iron", "wedge"];

function reliable(c: BagClub): boolean {
  return (c.confidence ?? "trustworthy") !== "insufficient";
}

/**
 * Build bag advice from per-club representative carries. Clubs are sorted by
 * canonical order; gaps are computed between adjacent clubs. Advice that leans
 * on a club whose carry isn't yet statistically reliable is flagged `tentative`
 * so a small, noisy sample can't masquerade as a structural problem.
 */
export function adviseBag(input: BagClub[]): BagAdvice {
  const clubs = input
    .filter((c) => Number.isFinite(c.carry))
    .sort((a, b) => clubOrderIndex(a.club) - clubOrderIndex(b.club));

  // Typical gap from RELIABLE scoring-club consecutive pairs (robust to both
  // top-of-bag spread and noisy small samples).
  const scoringGaps: number[] = [];
  for (let i = 1; i < clubs.length; i++) {
    const longer = clubs[i - 1];
    const shorter = clubs[i];
    if (
      SCORING.includes(longer.category) &&
      SCORING.includes(shorter.category) &&
      reliable(longer) &&
      reliable(shorter)
    ) {
      const gap = longer.carry - shorter.carry;
      if (gap > 0) scoringGaps.push(gap);
    }
  }
  const typicalGapYards = scoringGaps.length ? median(scoringGaps) : NaN;
  const target = Number.isFinite(typicalGapYards) ? typicalGapYards : HOLE_GAP_YARDS / 1.6;

  const items: BagAdviceItem[] = [];

  const tentativeNote = (longer: BagClub, shorter: BagClub): string => {
    const weak = [longer, shorter].filter((c) => !reliable(c)).map((c) => clubLabel(c.club));
    return weak.length
      ? ` Tentative — collect more data on ${weak.join(" and ")} to confirm.`
      : "";
  };

  for (let i = 1; i < clubs.length; i++) {
    const longer = clubs[i - 1];
    const shorter = clubs[i];
    const gap = longer.carry - shorter.carry;
    const tentative = !reliable(longer) || !reliable(shorter);

    // Inversion: the longer-club slot actually carries shorter.
    if (gap < 0) {
      items.push({
        kind: "inversion",
        clubs: [longer.club, shorter.club],
        priority: tentative ? 2 : 1,
        tentative,
        text:
          `${clubLabel(longer.club)} carries ${Math.abs(gap).toFixed(0)} yds shorter than ${clubLabel(shorter.club)} — an inversion. Have its loft/lie checked or confirm the gap with more shots.` +
          tentativeNote(longer, shorter),
      });
      continue;
    }

    // Hole/overlap advice only within the actionable scoring region.
    const actionable =
      SCORING.includes(longer.category) && SCORING.includes(shorter.category);
    if (!actionable) continue;

    if (gap > Math.max(HOLE_GAP_YARDS, target * HOLE_FACTOR)) {
      const fits = Math.max(1, Math.round(gap / target) - 1);
      const suggestedCarry = shorter.carry + gap / (fits + 1);
      items.push({
        kind: "hole",
        clubs: [longer.club, shorter.club],
        priority: tentative ? 4 : 2,
        tentative,
        suggestedCarry,
        text:
          `${gap.toFixed(0)}-yd gap between ${clubLabel(longer.club)} and ${clubLabel(shorter.club)} (typical gap ~${target.toFixed(0)} yds). Consider ${fits === 1 ? "a club" : `${fits} clubs`} carrying ~${suggestedCarry.toFixed(0)} yds — a loft tweak or an added club would fill it.` +
          tentativeNote(longer, shorter),
      });
    } else if (gap < Math.min(OVERLAP_GAP_YARDS, target * OVERLAP_FACTOR)) {
      items.push({
        kind: "overlap",
        clubs: [longer.club, shorter.club],
        priority: tentative ? 4 : 3,
        tentative,
        text:
          `${clubLabel(longer.club)} and ${clubLabel(shorter.club)} carry within ${gap.toFixed(0)} yds (typical gap ~${target.toFixed(0)} yds) — they overlap. One may be redundant; widening the loft gap would spread them out.` +
          tentativeNote(longer, shorter),
      });
    }
  }

  return { typicalGapYards, items: items.sort((a, b) => a.priority - b.priority) };
}

export { categoryOf };
