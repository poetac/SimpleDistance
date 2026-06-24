// 14-club bag optimizer. Given the player's reliable carry distances, it builds
// an even target "gap ladder" across the gappable (hybrid/iron/wedge) range and
// maps the current bag onto it: which clubs match, which need a loft adjust,
// where a club is missing (gap), and which are redundant — then checks it all
// against the 14-club limit and says what to add or drop.
//
// Honesty / assumptions (documented in METHODOLOGY.md):
//  - Driver and woods are ANCHORS (kept as-is). You can't meaningfully even out
//    the driver→wood gaps by adding clubs, so the ladder only covers the
//    gappable region (hybrids/irons/wedges), where loft/club changes are real.
//  - Endpoints of the ladder are pinned to the player's longest and shortest
//    gappable clubs, so those match exactly and the interior is evenly spaced.
//  - Only RELIABLE clubs (sufficient sample) are used; callers pass trustworthy
//    carries. Targets are decision support, not a fitting.
//  - Default budget is 14 clubs total minus a putter = 13 full-swing slots.

import type { ClubId } from "./domain/types";
import { clubLabel, clubOrderIndex, categoryOf, type ClubCategory } from "./domain/clubs";
import { median } from "./stats/descriptive";
import { YARDS, type Formatter } from "./format";

export const DEFAULT_FULL_SWING_BUDGET = 13; // 14 clubs minus a putter

export interface OptClub {
  club: ClubId;
  carry: number;
  category: ClubCategory;
}

export interface OptimizerOptions {
  /** Target gap (yds). Defaults to the player's demonstrated typical gap. */
  targetGapYards?: number;
  /** Full-swing club budget (excludes the putter). */
  budget?: number;
  /** Display formatter for note/summary prose (defaults to yards). */
  fmt?: Formatter;
}

export type SlotStatus = "matched" | "adjust" | "gap";

export interface LadderSlot {
  targetCarry: number;
  status: SlotStatus;
  currentClub?: ClubId;
  currentCarry?: number;
  /** current - target (yds); positive = current flies longer than the slot. */
  deviation?: number;
  note: string;
}

export interface RedundantClub {
  club: ClubId;
  carry: number;
  nearClub: ClubId;
  gapYards: number;
}

export interface BagOptimization {
  targetGapYards: number;
  /** Long-game clubs kept as-is (driver/woods). */
  anchors: Array<{ club: ClubId; carry: number }>;
  ladder: LadderSlot[];
  redundant: RedundantClub[];
  /** Slots with no nearby club — candidates to add. */
  gaps: LadderSlot[];
  /** Proposed full-swing club count after add/drop. */
  proposedCount: number;
  currentCount: number;
  budget: number;
  summary: string[];
}

const ANCHOR: ClubCategory[] = ["driver", "wood"];
const GAPPABLE: ClubCategory[] = ["hybrid", "iron", "wedge"];

export function optimizeBag(
  input: OptClub[],
  opts: OptimizerOptions = {},
): BagOptimization {
  const budget = opts.budget ?? DEFAULT_FULL_SWING_BUDGET;
  const fmt = opts.fmt ?? YARDS;
  const clubs = input
    .filter((c) => Number.isFinite(c.carry))
    .sort((a, b) => clubOrderIndex(a.club) - clubOrderIndex(b.club));

  const anchors = clubs
    .filter((c) => ANCHOR.includes(c.category))
    .map((c) => ({ club: c.club, carry: c.carry }));
  const ladderClubs = clubs.filter((c) => GAPPABLE.includes(c.category));
  const currentCount = anchors.length + ladderClubs.length;

  // Typical gap among gappable clubs (consecutive, positive).
  const gaps: number[] = [];
  for (let i = 1; i < ladderClubs.length; i++) {
    const g = ladderClubs[i - 1].carry - ladderClubs[i].carry;
    if (g > 0) gaps.push(g);
  }
  const typical = gaps.length ? median(gaps) : 12;
  const targetGapYards = opts.targetGapYards && opts.targetGapYards > 0 ? opts.targetGapYards : typical;

  if (ladderClubs.length < 2) {
    return {
      targetGapYards,
      anchors,
      ladder: [],
      redundant: [],
      gaps: [],
      proposedCount: currentCount,
      currentCount,
      budget,
      summary: ["Not enough reliable scoring clubs to build a gapping ladder yet."],
    };
  }

  const top = ladderClubs[0].carry;
  const bottom = ladderClubs[ladderClubs.length - 1].carry;
  const span = top - bottom;

  // Degenerate bag: every scoring club carries (nearly) the same distance.
  if (span < 1) {
    return {
      targetGapYards,
      anchors,
      ladder: [],
      redundant: [],
      gaps: [],
      proposedCount: currentCount,
      currentCount,
      budget,
      summary: [
        `Your scoring clubs all carry about ${fmt.dist(top)} — there's no spread to build a ladder from. Spread their lofts out, or add longer/shorter clubs.`,
      ],
    };
  }

  const slotCount = Math.max(2, Math.round(span / targetGapYards) + 1);
  const step = span / (slotCount - 1);
  const targets = Array.from({ length: slotCount }, (_, i) => top - i * step);

  // Assign each ladder club to its nearest target slot.
  const bySlot = new Map<number, OptClub[]>();
  for (const c of ladderClubs) {
    let best = 0;
    for (let i = 1; i < targets.length; i++) {
      if (Math.abs(c.carry - targets[i]) < Math.abs(c.carry - targets[best])) best = i;
    }
    if (!bySlot.has(best)) bySlot.set(best, []);
    bySlot.get(best)!.push(c);
  }

  const adjustTol = targetGapYards * 0.4;
  const ladder: LadderSlot[] = [];
  const redundant: RedundantClub[] = [];

  targets.forEach((targetCarry, i) => {
    const here = (bySlot.get(i) ?? []).sort(
      (a, b) => Math.abs(a.carry - targetCarry) - Math.abs(b.carry - targetCarry),
    );
    if (here.length === 0) {
      ladder.push({
        targetCarry,
        status: "gap",
        note: `No club near ${fmt.dist(targetCarry)} — add a club carrying ~${fmt.dist(targetCarry)}.`,
      });
      return;
    }
    const keep = here[0];
    const deviation = keep.carry - targetCarry;
    const status: SlotStatus = Math.abs(deviation) > adjustTol ? "adjust" : "matched";
    ladder.push({
      targetCarry,
      status,
      currentClub: keep.club,
      currentCarry: keep.carry,
      deviation,
      note:
        status === "matched"
          ? `${clubLabel(keep.club)} fits this slot (${fmt.dist(keep.carry)}).`
          : `${clubLabel(keep.club)} carries ${fmt.dist(keep.carry)}, ${fmt.d(Math.abs(deviation))} ${fmt.dUnitAdj} ${deviation > 0 ? "long" : "short"} of the ${fmt.d(targetCarry)}-${fmt.dUnitAdj} slot — a loft tweak would center it.`,
    });
    for (const extra of here.slice(1)) {
      redundant.push({
        club: extra.club,
        carry: extra.carry,
        nearClub: keep.club,
        gapYards: Math.abs(extra.carry - keep.carry),
      });
    }
  });

  const gapSlots = ladder.filter((s) => s.status === "gap");
  const keptLadder = ladder.filter((s) => s.status !== "gap").length;
  // Proposed bag: anchors + kept ladder clubs + added (gaps), redundant dropped.
  const proposedCount = anchors.length + keptLadder + gapSlots.length;

  const summary: string[] = [];
  summary.push(
    `Scoring clubs span ${fmt.d(bottom)}–${fmt.dist(top)}; at a ${fmt.d(targetGapYards)}-${fmt.dUnitAdj} target that's ${slotCount} evenly-spaced slots.`,
  );
  for (const g of gapSlots) {
    summary.push(`Add a club carrying ~${fmt.dist(g.targetCarry)} to fill a gap.`);
  }
  for (const r of redundant) {
    summary.push(
      `${clubLabel(r.club)} duplicates ${clubLabel(r.nearClub)} (within ${fmt.dist(r.gapYards)}) — a candidate to drop.`,
    );
  }
  const free = budget - proposedCount;
  if (free > 0) {
    summary.push(
      `Your proposed set uses ${proposedCount} of ${budget} full-swing slots — room for ${free} more (e.g. another wedge or a long-game option).`,
    );
  } else if (free < 0) {
    summary.push(
      `Your proposed set needs ${proposedCount} full-swing slots but you have ${budget} — drop ${-free} (start with the redundant clubs above).`,
    );
  } else {
    summary.push(`Your proposed set uses all ${budget} full-swing slots exactly.`);
  }

  return {
    targetGapYards,
    anchors,
    ladder,
    redundant,
    gaps: gapSlots,
    proposedCount,
    currentCount,
    budget,
    summary,
  };
}

export { categoryOf };
