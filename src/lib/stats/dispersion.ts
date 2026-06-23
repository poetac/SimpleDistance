// Dispersion and strike-consistency stats. Pure; takes plain arrays so it stays
// decoupled from the Shot type. Every field degrades to undefined when the
// underlying data is absent (e.g. Inrange exposes no side data) rather than
// emitting NaN.

import { mean, stdDev, percentile } from "./descriptive";

export interface DispersionInput {
  /** Side/offline yards, + = right of target. */
  side?: number[];
  /** Carry yards (for vertical consistency). */
  carry?: number[];
  ballSpeed?: number[];
  smash?: number[];
}

export interface DispersionStats {
  sideN: number;
  /** Mean side (+ right). undefined when no side data. */
  sideMean?: number;
  /** SD of side dispersion. */
  sideSd?: number;
  /** 75th percentile of |side| — a robust "most shots land within" figure. */
  p75AbsSide?: number;
  /** SD of carry distance. */
  carrySd?: number;
  /** Ball-speed coefficient of variation (%) — a strike-consistency proxy. */
  ballSpeedCv?: number;
  /** Smash-factor coefficient of variation (%). */
  smashCv?: number;
}

function finite(xs?: number[]): number[] {
  return (xs ?? []).filter((v) => Number.isFinite(v));
}

function cv(xs: number[]): number | undefined {
  if (xs.length < 2) return undefined;
  const m = mean(xs);
  if (m === 0) return undefined;
  return (stdDev(xs) / Math.abs(m)) * 100;
}

export function dispersionStats(input: DispersionInput): DispersionStats {
  const side = finite(input.side);
  const carry = finite(input.carry);
  const ballSpeed = finite(input.ballSpeed);
  const smash = finite(input.smash);

  return {
    sideN: side.length,
    sideMean: side.length ? mean(side) : undefined,
    sideSd: side.length >= 2 ? stdDev(side) : undefined,
    p75AbsSide: side.length ? percentile(side.map(Math.abs), 75) : undefined,
    carrySd: carry.length >= 2 ? stdDev(carry) : undefined,
    ballSpeedCv: cv(ballSpeed),
    smashCv: cv(smash),
  };
}
