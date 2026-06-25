// Strike efficiency from smash factor (ball speed / club speed). Compared to a
// broad, hedged expected range per club category. A low mean smash is a
// strike-quality HYPOTHESIS to check (thin/heel/toe contact, wrong shaft) —
// never a verdict. Needs club-speed data; degrades gracefully without it.

import { mean } from "./descriptive";
import { SMASH_EXPECTED, SMASH_LOW_MARGIN } from "./constants";
import type { ClubCategory } from "../domain/clubs";

export interface StrikeEfficiency {
  n: number;
  meanSmash?: number;
  expected?: [number, number];
  /** True when mean smash is materially below the expected low end. */
  flagged: boolean;
  note: string;
}

export function strikeEfficiency(
  smash: number[],
  category: ClubCategory,
): StrikeEfficiency {
  const xs = smash.filter((v) => Number.isFinite(v) && v > 0);
  const n = xs.length;
  const expected = SMASH_EXPECTED[category];
  if (n < 3) {
    return { n, expected, flagged: false, note: "Not enough smash-factor data." };
  }
  const meanSmash = mean(xs);
  const [lo, hi] = expected;
  const flagged = meanSmash < lo - SMASH_LOW_MARGIN;

  let note: string;
  if (flagged) {
    note = `Mean smash ${meanSmash.toFixed(2)} is below the typical ${lo.toFixed(2)}–${hi.toFixed(2)} for this club — possibly off-centre strike. Worth checking contact/lie/shaft.`;
  } else if (meanSmash > hi) {
    note = `Mean smash ${meanSmash.toFixed(2)} is high for this club (typical ${lo.toFixed(2)}–${hi.toFixed(2)}) — efficient strike, or check the loft/ball.`;
  } else {
    note = `Mean smash ${meanSmash.toFixed(2)} sits in the typical ${lo.toFixed(2)}–${hi.toFixed(2)} band — efficient strike.`;
  }
  return { n, meanSmash, expected, flagged, note };
}
