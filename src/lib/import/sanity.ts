// Post-import plausibility checks. Catches gross mistakes — a wrong column
// mapped to carry, or a unit mix-up — by comparing each club's mean carry to a
// broad plausible band for its category. Pure and tested; produces warnings, it
// never blocks or alters the import.

import type { Shot } from "../domain/types";
import { categoryOf, clubLabel, type ClubCategory } from "../domain/clubs";
import { mean } from "../stats/descriptive";
import { MAX_PLAUSIBLE_CARRY_YARDS } from "../stats/constants";

/** Broad plausible carry ranges (yards) per category — deliberately generous. */
const PLAUSIBLE: Record<ClubCategory, [number, number]> = {
  driver: [150, MAX_PLAUSIBLE_CARRY_YARDS],
  wood: [120, 320],
  hybrid: [110, 290],
  iron: [70, 260],
  wedge: [20, 170],
};

export function importSanity(shots: Shot[]): string[] {
  const warnings: string[] = [];
  if (shots.length === 0) return warnings;

  const overMax = shots.filter(
    (s) => s.carryYards != null && s.carryYards > MAX_PLAUSIBLE_CARRY_YARDS,
  ).length;
  if (overMax > 0) {
    warnings.push(
      `${overMax} shot(s) carry over ${MAX_PLAUSIBLE_CARRY_YARDS} yds — check the carry column mapping and units.`,
    );
  }

  // Per-club mean vs. its plausible band.
  const byClub = new Map<string, number[]>();
  for (const s of shots) {
    if (s.carryYards == null) continue;
    if (!byClub.has(s.club)) byClub.set(s.club, []);
    byClub.get(s.club)!.push(s.carryYards);
  }
  for (const [club, carries] of byClub) {
    if (carries.length < 3) continue;
    const m = mean(carries);
    const [lo, hi] = PLAUSIBLE[categoryOf(club)];
    if (m < lo || m > hi) {
      warnings.push(
        `${clubLabel(club)} averages ${m.toFixed(0)} yds, outside the expected ${lo}–${hi} yds — possibly a wrong column or a meters/yards mix-up.`,
      );
    }
  }

  return warnings;
}
