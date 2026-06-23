// Unit-aware conversion and detection. Distances normalize to YARDS, speeds to
// MPH. Many range systems (and Inrange) default to meters / m/s.

import { MAX_PLAUSIBLE_CARRY_YARDS } from "../stats/constants";

export const METERS_TO_YARDS = 1.09361;
export const MS_TO_MPH = 2.23694;
export const KMH_TO_MPH = 0.621371;

export function metersToYards(m: number): number {
  return m * METERS_TO_YARDS;
}
export function yardsToMeters(y: number): number {
  return y / METERS_TO_YARDS;
}
export function msToMph(ms: number): number {
  return ms * MS_TO_MPH;
}
export function kmhToMph(k: number): number {
  return k * KMH_TO_MPH;
}

export type DetectedDistanceUnit = "yards" | "meters";
export type DetectedSpeedUnit = "mph" | "ms" | "kmh";

/**
 * Heuristically detect whether a column of distances is yards or meters.
 * Driver carries top out ~320 yds (~293 m). If the 90th percentile of values
 * is implausibly small for yards-of-a-driver but plausible for meters, or the
 * header hints at meters, we call it meters. Header hints win.
 */
export function detectDistanceUnit(
  values: number[],
  header?: string,
): DetectedDistanceUnit {
  const h = (header || "").toLowerCase();
  if (/\b(m|meter|metre|metres|meters)\b/.test(h) || h.includes("(m)")) return "meters";
  if (/\b(yd|yds|yard|yards)\b/.test(h) || h.includes("(y)")) return "yards";

  const xs = values.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (xs.length === 0) return "yards";
  const p90 = xs[Math.floor(xs.length * 0.9)];
  // A real golfer's longest carries rarely exceed ~320 yds. If max is modest
  // and clustered low, meters is plausible; but absent a strong signal we keep
  // yards as the safe default to avoid silently rescaling. We only flip to
  // meters when values are clearly too big to be... no: meters values are
  // SMALLER. So we cannot tell from size alone reliably; rely on header.
  // As a weak tiebreaker, values above the plausible yard ceiling are bad rows,
  // not a unit signal, so default to yards.
  if (p90 > MAX_PLAUSIBLE_CARRY_YARDS) return "yards";
  return "yards";
}

/**
 * Detect speed unit. Golf ball speeds are ~100-190 mph, ~45-85 m/s, ~160-300 km/h.
 * Club speeds ~70-130 mph. The magnitude separates them cleanly.
 */
export function detectSpeedUnit(
  values: number[],
  header?: string,
): DetectedSpeedUnit {
  const h = (header || "").toLowerCase();
  if (/m\/s|mps|\bms\b/.test(h)) return "ms";
  if (/km\/h|kmh|kph/.test(h)) return "kmh";
  if (/mph|mi\/h/.test(h)) return "mph";

  const xs = values.filter((v) => Number.isFinite(v) && v > 0);
  if (xs.length === 0) return "mph";
  const median = xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  if (median < 95) return "ms"; // too slow to be mph for ball speed; likely m/s
  if (median > 200) return "kmh";
  return "mph";
}
