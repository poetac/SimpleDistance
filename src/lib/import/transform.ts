// Pure transform: mapped raw rows -> canonical Shots. Unit-aware, alias-aware,
// and forgiving (collects warnings instead of throwing). Fully unit-tested.

import type { Shot } from "../domain/types";
import { normalizeClub } from "../domain/clubs";
import type { ColumnMapping } from "./mapping";
import type { RawTable } from "./adapter";
import {
  metersToYards,
  msToMph,
  kmhToMph,
  type DetectedDistanceUnit,
  type DetectedSpeedUnit,
} from "./units";

export interface TransformOptions {
  distanceUnit: DetectedDistanceUnit;
  speedUnit: DetectedSpeedUnit;
  source: string;
  aliases?: Record<string, string>;
  fallbackSessionId?: string;
}

export interface SkipReasons {
  missingClub: number;
  unrecognizedClub: number;
  missingDistance: number;
}

export interface TransformResult {
  shots: Shot[];
  warnings: string[];
  /** Raw club labels that could not be normalized (route to alias UI). */
  unmappedClubs: string[];
  rowsParsed: number;
  rowsSkipped: number;
  /** Why rows were quarantined, so the UI can explain skips precisely. */
  skipReasons: SkipReasons;
}

/**
 * Locale-aware numeric parse. Handles both "1,234.5" (US) and "1.234,5" /
 * "150,5" (European) without silently turning a decimal comma into a thousands
 * grouping (which would 10x distances for European exporters, e.g. Inrange).
 *
 * Rule: when both separators are present, the LAST one is the decimal point.
 * With a single comma, it's a decimal unless it groups exactly 3 trailing
 * digits (then it's a thousands separator).
 */
function num(raw: string | undefined): number | undefined {
  if (raw == null) return undefined;
  let s = raw.trim().replace(/[^0-9.,\-]/g, "");
  if (s === "" || s === "-" || s === "." || s === ",") return undefined;

  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  if (hasDot && hasComma) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      // comma is the decimal, dots are thousands
      s = s.replace(/\./g, "").replace(/,/g, ".");
    } else {
      // dot is the decimal, commas are thousands
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length !== 3) {
      s = parts[0] + "." + parts[1]; // decimal comma
    } else {
      s = s.replace(/,/g, ""); // thousands grouping
    }
  }

  const v = Number(s);
  return Number.isFinite(v) ? v : undefined;
}

/** Non-negative distance: rejects nonsensical negative carries/totals/apex. */
function nonNeg(v: number | undefined): number | undefined {
  return v != null && v >= 0 ? v : undefined;
}

function toYards(v: number | undefined, unit: DetectedDistanceUnit): number | undefined {
  if (v == null) return undefined;
  return unit === "meters" ? metersToYards(v) : v;
}

/** Distance in yards, guaranteed non-negative (or undefined). */
function dist(
  raw: string | undefined,
  unit: DetectedDistanceUnit,
): number | undefined {
  return nonNeg(toYards(num(raw), unit));
}

function toMph(v: number | undefined, unit: DetectedSpeedUnit): number | undefined {
  if (v == null) return undefined;
  if (unit === "ms") return msToMph(v);
  if (unit === "kmh") return kmhToMph(v);
  return v;
}

let idCounter = 0;
function makeId(source: string): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return `${source}-${g.crypto.randomUUID()}`;
  idCounter += 1;
  return `${source}-${Date.now().toString(36)}-${idCounter}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function rowsToShots(
  table: RawTable,
  mapping: ColumnMapping,
  opts: TransformOptions,
): TransformResult {
  const warnings: string[] = [];
  const unmapped = new Set<string>();
  const shots: Shot[] = [];
  const skipReasons: SkipReasons = {
    missingClub: 0,
    unrecognizedClub: 0,
    missingDistance: 0,
  };
  let skipped = 0;

  const get = (row: Record<string, string>, field: keyof ColumnMapping) => {
    const header = mapping[field];
    return header ? row[header] : undefined;
  };

  const fallbackSession =
    opts.fallbackSessionId || `${opts.source}-${new Date().toISOString().slice(0, 10)}`;

  table.rows.forEach((row, i) => {
    const rawClub = get(row, "club");
    if (!rawClub || rawClub.trim() === "") {
      skipReasons.missingClub++;
      skipped++;
      return;
    }
    const club = normalizeClub(rawClub, opts.aliases);
    if (!club) {
      unmapped.add(rawClub.trim());
      skipReasons.unrecognizedClub++;
      skipped++;
      return;
    }

    const carry = dist(get(row, "carryYards"), opts.distanceUnit);
    const total = dist(get(row, "totalYards"), opts.distanceUnit);
    if (carry == null && total == null) {
      warnings.push(
        `Row ${i + 1} (${rawClub}): no valid carry or total distance — skipped.`,
      );
      skipReasons.missingDistance++;
      skipped++;
      return;
    }

    const ts = get(row, "timestamp");
    const sessionFromCol = get(row, "sessionId");

    shots.push({
      id: makeId(opts.source),
      club,
      rawClub: rawClub.trim(),
      timestamp: ts && ts.trim() !== "" ? ts.trim() : undefined,
      sessionId:
        (sessionFromCol && sessionFromCol.trim()) ||
        (ts && ts.trim() ? ts.trim().slice(0, 10) : "") ||
        fallbackSession,
      carryYards: carry,
      totalYards: total,
      // side can legitimately be negative (left of target); apex cannot.
      sideYards: toYards(num(get(row, "sideYards")), opts.distanceUnit),
      apexFt: nonNeg(num(get(row, "apexFt"))),
      ballSpeedMph: toMph(num(get(row, "ballSpeedMph")), opts.speedUnit),
      clubSpeedMph: toMph(num(get(row, "clubSpeedMph")), opts.speedUnit),
      smashFactor: num(get(row, "smashFactor")),
      launchAngleDeg: num(get(row, "launchAngleDeg")),
      spinRpm: num(get(row, "spinRpm")),
      launchDirectionDeg: num(get(row, "launchDirectionDeg")),
      descentAngleDeg: num(get(row, "descentAngleDeg")),
      source: opts.source,
    });
  });

  if (unmapped.size > 0) {
    warnings.push(
      `${unmapped.size} club label(s) could not be recognized: ${[...unmapped].join(", ")}. Add aliases in Settings.`,
    );
  }

  return {
    shots,
    warnings,
    unmappedClubs: [...unmapped],
    rowsParsed: shots.length,
    rowsSkipped: skipped,
    skipReasons,
  };
}
