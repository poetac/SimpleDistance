// Generates the sample CSVs in /samples from the deterministic seed dataset.
// TrackMan-style: yards + mph, rich columns. Inrange-style: meters + m/s, fewer
// columns and slightly different header names — to exercise auto-detection,
// presets, and unit conversion. Run: npx tsx scripts/gen-samples.ts

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { generateSeedShots } from "../src/lib/db/seed";

const shots = generateSeedShots();
const outDir = join(process.cwd(), "samples");
mkdirSync(outDir, { recursive: true });

const Y2M = 1 / 1.09361;
const MPH2MS = 1 / 2.23694;

function csv(rows: string[][]): string {
  return rows.map((r) => r.join(",")).join("\n") + "\n";
}
function r1(n: number | undefined): string {
  return n == null ? "" : (Math.round(n * 10) / 10).toString();
}

// --- TrackMan-style (yards, mph) ---
const tmHeader = [
  "Date",
  "Session",
  "Club",
  "Carry",
  "Total",
  "Ball Speed",
  "Club Speed",
  "Smash Factor",
  "Launch Angle",
  "Spin Rate",
  "Launch Direction",
  "Carry Side",
  "Height",
  "Landing Angle",
];
const tmRows = shots.map((s) => [
  s.timestamp ?? "",
  s.sessionId,
  s.club,
  r1(s.carryYards),
  r1(s.totalYards),
  r1(s.ballSpeedMph),
  r1(s.clubSpeedMph),
  s.smashFactor != null ? s.smashFactor.toFixed(2) : "",
  r1(s.launchAngleDeg),
  s.spinRpm != null ? String(s.spinRpm) : "",
  r1(s.launchDirectionDeg),
  r1(s.sideYards),
  s.apexFt != null ? String(s.apexFt) : "",
  r1(s.descentAngleDeg),
]);
writeFileSync(join(outDir, "trackman-sample.csv"), csv([tmHeader, ...tmRows]));

// --- Inrange-style (meters, m/s, fewer fields, club aliases) ---
const clubAlias: Record<string, string> = {
  DR: "Driver",
  "3W": "3 Wood",
  "4I": "Iron 4",
  "5I": "Iron 5",
  "6I": "Iron 6",
  "7I": "Iron 7",
  "8I": "Iron 8",
  "9I": "Iron 9",
  PW: "PW",
  "52": "52",
  "56": "56",
  "60": "60",
};
const inHeader = ["Time", "Bay", "Selected Club", "Carry (m)", "Total (m)", "Ball Speed (m/s)", "Launch", "Direction"];
const inRows = shots.map((s) => [
  s.timestamp ?? "",
  s.sessionId,
  clubAlias[s.club] ?? s.club,
  r1(s.carryYards != null ? s.carryYards * Y2M : undefined),
  r1(s.totalYards != null ? s.totalYards * Y2M : undefined),
  r1(s.ballSpeedMph != null ? s.ballSpeedMph * MPH2MS : undefined),
  r1(s.launchAngleDeg),
  r1(s.launchDirectionDeg),
]);
writeFileSync(join(outDir, "inrange-sample.csv"), csv([inHeader, ...inRows]));

// eslint-disable-next-line no-console
console.log(
  `Wrote ${tmRows.length} TrackMan rows and ${inRows.length} Inrange rows to /samples`,
);
