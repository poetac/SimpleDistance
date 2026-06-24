// Display formatting. Data is stored canonically (yards, mph); this layer
// converts to the user's chosen DISPLAY units for both numbers and the prose the
// analysis engine generates. The default formatter is yards/mph, so anything
// that doesn't pass a formatter behaves exactly as before.

import type { AppSettings } from "./domain/types";

export const YARDS_PER_METER = 1.09361;
export const MPH_PER_MS = 2.23694;

export type DisplayDistance = "yards" | "meters";
export type DisplaySpeed = "mph" | "ms";

export interface Formatter {
  distanceUnit: DisplayDistance;
  speedUnit: DisplaySpeed;
  /** Unit suffix, plural noun form: "yds" | "m". */
  dUnit: string;
  /** Unit suffix, adjectival form for "12-yd gap": "yd" | "m". */
  dUnitAdj: string;
  /** Speed unit suffix: "mph" | "m/s". */
  sUnit: string;
  /** Convert canonical yards to the display number (no unit). */
  dVal(yards: number): number;
  /** Convert canonical mph to the display number (no unit). */
  sVal(mph: number): number;
  /** Convert a display-unit distance back to canonical yards. */
  toYards(displayValue: number): number;
  /** Convert a display-unit speed back to canonical mph. */
  toMph(displayValue: number): number;
  /** Display number string from canonical yards. */
  d(yards: number, digits?: number): string;
  /** Display number + unit from canonical yards, e.g. "150 yds" / "137 m". */
  dist(yards: number, digits?: number): string;
  /** Display number + unit from canonical mph, e.g. "112 mph" / "50 m/s". */
  speed(mph: number, digits?: number): string;
}

export function makeFormatter(
  distanceUnit: DisplayDistance = "yards",
  speedUnit: DisplaySpeed = "mph",
): Formatter {
  const dVal = (yards: number) =>
    distanceUnit === "meters" ? yards / YARDS_PER_METER : yards;
  const sVal = (mph: number) => (speedUnit === "ms" ? mph / MPH_PER_MS : mph);
  const dUnit = distanceUnit === "meters" ? "m" : "yds";
  const dUnitAdj = distanceUnit === "meters" ? "m" : "yd";
  const sUnit = speedUnit === "ms" ? "m/s" : "mph";

  return {
    distanceUnit,
    speedUnit,
    dUnit,
    dUnitAdj,
    sUnit,
    dVal,
    sVal,
    toYards: (v) => (distanceUnit === "meters" ? v * YARDS_PER_METER : v),
    toMph: (v) => (speedUnit === "ms" ? v * MPH_PER_MS : v),
    d: (yards, digits = 0) => dVal(yards).toFixed(digits),
    dist: (yards, digits = 0) => `${dVal(yards).toFixed(digits)} ${dUnit}`,
    speed: (mph, digits = 0) => `${sVal(mph).toFixed(digits)} ${sUnit}`,
  };
}

/** Default yards/mph formatter — used when none is supplied. */
export const YARDS: Formatter = makeFormatter("yards", "mph");

export function formatterFromSettings(settings: AppSettings): Formatter {
  return makeFormatter(settings.displayDistance, settings.displaySpeed);
}
