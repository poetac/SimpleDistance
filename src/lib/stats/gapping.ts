// Gapping analysis across the bag.

import type { ClubId } from "../domain/types";
import { clubOrderIndex } from "../domain/clubs";
import {
  OVERLAP_GAP_YARDS,
  HOLE_GAP_YARDS,
} from "./constants";

export type GapFlag = "overlap" | "hole" | "inversion" | "ok";

export interface ClubCarry {
  club: ClubId;
  /** Representative carry (mean or median per settings). */
  carry: number;
}

export interface GapRow {
  club: ClubId;
  carry: number;
  /** Carry of the next (shorter-numbered, longer-hitting) club above it. */
  prevClub?: ClubId;
  /** Gap to the next-longer club (positive = this club is shorter, as expected). */
  gapToLonger?: number;
  flags: GapFlag[];
}

export interface GapAnalysis {
  rows: GapRow[];
  /** Distinct flag findings for quick display. */
  overlaps: Array<{ a: ClubId; b: ClubId; gap: number }>;
  holes: Array<{ a: ClubId; b: ClubId; gap: number }>;
  inversions: Array<{ longer: ClubId; shorter: ClubId; deficit: number }>;
}

/**
 * Build a gapping analysis from per-club representative carries.
 *
 * Clubs are sorted by canonical order (driver → wedges). For each adjacent
 * pair (longer club L above, shorter club S below) we compute the expected
 * positive gap L.carry - S.carry and flag:
 *  - inversion: the longer club actually carries SHORTER than the shorter club
 *  - overlap:   they carry within OVERLAP_GAP_YARDS of each other
 *  - hole:      the gap exceeds HOLE_GAP_YARDS
 */
export function analyzeGapping(carries: ClubCarry[]): GapAnalysis {
  const sorted = [...carries]
    .filter((c) => Number.isFinite(c.carry))
    .sort((a, b) => clubOrderIndex(a.club) - clubOrderIndex(b.club));

  const rows: GapRow[] = [];
  const overlaps: GapAnalysis["overlaps"] = [];
  const holes: GapAnalysis["holes"] = [];
  const inversions: GapAnalysis["inversions"] = [];

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const flags: GapFlag[] = [];
    let gapToLonger: number | undefined;
    let prevClub: ClubId | undefined;

    if (i > 0) {
      const longer = sorted[i - 1]; // carries farther (or should)
      prevClub = longer.club;
      const gap = longer.carry - cur.carry; // expected > 0
      gapToLonger = gap;

      if (gap < 0) {
        flags.push("inversion");
        inversions.push({
          longer: longer.club,
          shorter: cur.club,
          deficit: -gap,
        });
      } else if (gap < OVERLAP_GAP_YARDS) {
        flags.push("overlap");
        overlaps.push({ a: longer.club, b: cur.club, gap });
      } else if (gap > HOLE_GAP_YARDS) {
        flags.push("hole");
        holes.push({ a: longer.club, b: cur.club, gap });
      }
    }

    if (flags.length === 0) flags.push("ok");
    rows.push({ club: cur.club, carry: cur.carry, prevClub, gapToLonger, flags });
  }

  return { rows, overlaps, holes, inversions };
}
