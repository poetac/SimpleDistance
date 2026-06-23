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
}

export type AdviceKind = "inversion" | "hole" | "overlap";

export interface BagAdviceItem {
  kind: AdviceKind;
  clubs: ClubId[];
  text: string;
  /** Approximate target carry for a club that would fill a hole. */
  suggestedCarry?: number;
  priority: number;
}

export interface BagAdvice {
  /** Median consecutive gap among scoring clubs, the progression target. */
  typicalGapYards: number;
  items: BagAdviceItem[];
}

const SCORING: ClubCategory[] = ["hybrid", "iron", "wedge"];

/**
 * Build bag advice from per-club representative carries. Clubs are sorted by
 * canonical order; gaps are computed between adjacent clubs.
 */
export function adviseBag(input: BagClub[]): BagAdvice {
  const clubs = input
    .filter((c) => Number.isFinite(c.carry))
    .sort((a, b) => clubOrderIndex(a.club) - clubOrderIndex(b.club));

  // Typical gap from scoring-club consecutive pairs (robust to top-of-bag spread).
  const scoringGaps: number[] = [];
  for (let i = 1; i < clubs.length; i++) {
    const longer = clubs[i - 1];
    const shorter = clubs[i];
    if (SCORING.includes(longer.category) && SCORING.includes(shorter.category)) {
      const gap = longer.carry - shorter.carry;
      if (gap > 0) scoringGaps.push(gap);
    }
  }
  const typicalGapYards = scoringGaps.length ? median(scoringGaps) : NaN;
  const target = Number.isFinite(typicalGapYards) ? typicalGapYards : HOLE_GAP_YARDS / 1.6;

  const items: BagAdviceItem[] = [];

  for (let i = 1; i < clubs.length; i++) {
    const longer = clubs[i - 1];
    const shorter = clubs[i];
    const gap = longer.carry - shorter.carry;

    // Inversion: the longer-club slot actually carries shorter.
    if (gap < 0) {
      items.push({
        kind: "inversion",
        clubs: [longer.club, shorter.club],
        priority: 1,
        text: `${clubLabel(longer.club)} carries ${Math.abs(gap).toFixed(0)} yds shorter than ${clubLabel(shorter.club)} — an inversion. Have its loft/lie checked or confirm the gap with more shots.`,
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
        priority: 2,
        suggestedCarry,
        text: `${gap.toFixed(0)}-yd gap between ${clubLabel(longer.club)} and ${clubLabel(shorter.club)} (typical gap ~${target.toFixed(0)} yds). Consider ${fits === 1 ? "a club" : `${fits} clubs`} carrying ~${suggestedCarry.toFixed(0)} yds — a loft tweak or an added club would fill it.`,
      });
    } else if (gap < Math.min(OVERLAP_GAP_YARDS, target * OVERLAP_FACTOR)) {
      items.push({
        kind: "overlap",
        clubs: [longer.club, shorter.club],
        priority: 3,
        text: `${clubLabel(longer.club)} and ${clubLabel(shorter.club)} carry within ${gap.toFixed(0)} yds (typical gap ~${target.toFixed(0)} yds) — they overlap. One may be redundant; widening the loft gap would spread them out.`,
      });
    }
  }

  return { typicalGapYards, items: items.sort((a, b) => a.priority - b.priority) };
}

export { categoryOf };
