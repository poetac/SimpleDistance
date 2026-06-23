// Unit-aware conversion and detection. Distances normalize to YARDS, speeds to
// MPH. Many range systems (and Inrange) default to meters / m/s.

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
 * Detect whether a distance column is yards or meters.
 *
 * Honest note: magnitude ALONE cannot disambiguate — a driver in meters
 * (~270 m) overlaps a mid-iron in yards (~170 yds), so any size-based guess
 * would silently mis-scale real data. We therefore rely on the header hint, and
 * otherwise default to yards. The import UI exposes a unit selector (seeded from
 * the source preset) so the user can confirm/override, and the preview shows the
 * values — nothing is rescaled behind their back.
 *
 * `values` is accepted for API symmetry with detectSpeedUnit and future use.
 */
export function detectDistanceUnit(
  _values: number[],
  header?: string,
): DetectedDistanceUnit {
  const h = (header || "").toLowerCase();
  if (/\b(m|meter|metre|metres|meters)\b/.test(h) || h.includes("(m)")) return "meters";
  if (/\b(yd|yds|yard|yards)\b/.test(h) || h.includes("(y)")) return "yards";
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
