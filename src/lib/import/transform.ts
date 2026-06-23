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

export interface TransformResult {
  shots: Shot[];
  warnings: string[];
  /** Raw club labels that could not be normalized (route to alias UI). */
  unmappedClubs: string[];
  rowsParsed: number;
  rowsSkipped: number;
}

function num(raw: string | undefined): number | undefined {
  if (raw == null) return undefined;
  const cleaned = raw.replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return undefined;
  const v = Number(cleaned);
  return Number.isFinite(v) ? v : undefined;
}

function toYards(v: number | undefined, unit: DetectedDistanceUnit): number | undefined {
  if (v == null) return undefined;
  return unit === "meters" ? metersToYards(v) : v;
}

function toMph(v: number | undefined, unit: DetectedSpeedUnit): number | undefined {
  if (v == null) return undefined;
  if (unit === "ms") return msToMph(v);
  if (unit === "kmh") return kmhToMph(v);
  return v;
}

let idCounter = 0;
function makeId(source: string): string {
  idCounter += 1;
  return `${source}-${Date.now().toString(36)}-${idCounter}`;
}

export function rowsToShots(
  table: RawTable,
  mapping: ColumnMapping,
  opts: TransformOptions,
): TransformResult {
  const warnings: string[] = [];
  const unmapped = new Set<string>();
  const shots: Shot[] = [];
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
      skipped++;
      return;
    }
    const club = normalizeClub(rawClub, opts.aliases);
    if (!club) {
      unmapped.add(rawClub.trim());
      skipped++;
      return;
    }

    const carry = toYards(num(get(row, "carryYards")), opts.distanceUnit);
    const total = toYards(num(get(row, "totalYards")), opts.distanceUnit);
    if (carry == null && total == null) {
      warnings.push(`Row ${i + 1} (${rawClub}): no carry or total distance — skipped.`);
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
      sideYards: toYards(num(get(row, "sideYards")), opts.distanceUnit),
      apexFt: num(get(row, "apexFt")),
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
  };
}
