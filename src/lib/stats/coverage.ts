// Bag coverage: across your playable carry range, what share can you actually
// hit, and where are the "dead zones" no club covers? Each club is assumed to
// flex roughly ± a control radius (a fraction of the typical gap); a dead zone
// opens between two clubs whose gap exceeds twice that radius. Pure and tested.

import { COVERAGE_CONTROL_FACTOR, COVERAGE_CONTROL_FLOOR_YARDS } from "./constants";

export interface DeadZone {
  fromYards: number;
  toYards: number;
  widthYards: number;
}

export interface BagCoverage {
  minCarry: number;
  maxCarry: number;
  rangeYards: number;
  controlRadius: number;
  deadZones: DeadZone[];
  /** Fraction of the playable range within a club's control radius (0–1). */
  coverage: number;
}

/** `carries` are per-club representative carries (any order); `typicalGap` in yards. */
export function bagCoverage(carries: number[], typicalGap: number): BagCoverage {
  const xs = carries.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  const controlRadius = Math.max(
    COVERAGE_CONTROL_FLOOR_YARDS,
    (Number.isFinite(typicalGap) && typicalGap > 0 ? typicalGap : 12) *
      COVERAGE_CONTROL_FACTOR,
  );

  if (xs.length < 2) {
    return {
      minCarry: xs[0] ?? NaN,
      maxCarry: xs[0] ?? NaN,
      rangeYards: 0,
      controlRadius,
      deadZones: [],
      coverage: xs.length === 1 ? 1 : 0,
    };
  }

  const minCarry = xs[0];
  const maxCarry = xs[xs.length - 1];
  const rangeYards = maxCarry - minCarry;

  const deadZones: DeadZone[] = [];
  let deadTotal = 0;
  for (let i = 1; i < xs.length; i++) {
    const gap = xs[i] - xs[i - 1];
    if (gap > 2 * controlRadius) {
      const fromYards = xs[i - 1] + controlRadius;
      const toYards = xs[i] - controlRadius;
      const widthYards = toYards - fromYards;
      deadZones.push({ fromYards, toYards, widthYards });
      deadTotal += widthYards;
    }
  }

  const coverage = rangeYards > 0 ? Math.max(0, 1 - deadTotal / rangeYards) : 1;
  return { minCarry, maxCarry, rangeYards, controlRadius, deadZones, coverage };
}
