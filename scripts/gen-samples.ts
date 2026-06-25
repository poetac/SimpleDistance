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

// --- TrackMan-style (yards, mph; rich export with delivery + TrackMan-only
// hallmark columns Face to Path / Curve / Hang Time that fingerprint it) ---
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
  "Spin Axis",
  "Spin Loft",
  "Launch Direction",
  "Carry Side",
  "Height",
  "Landing Angle",
  "Attack Angle",
  "Club Path",
  "Face Angle",
  "Face to Path",
  "Curve",
  "Hang Time",
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
  r1((s.launchDirectionDeg ?? 0) * -1.5), // spin axis proxy
  r1((s.launchAngleDeg ?? 0) + 12), // spin loft proxy
  r1(s.launchDirectionDeg),
  r1(s.sideYards),
  s.apexFt != null ? String(s.apexFt) : "",
  r1(s.descentAngleDeg),
  r1(s.attackAngleDeg),
  r1(s.clubPathDeg),
  r1(s.faceAngleDeg),
  r1((s.faceAngleDeg ?? 0) - (s.clubPathDeg ?? 0)), // face to path (signature col)
  r1(s.sideYards), // curve proxy (signature col)
  r1(4 + (s.apexFt ?? 0) / 40), // hang time proxy (signature col)
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

// --- Garmin Approach R10-style (yards, mph, full names + spin axis signature) ---
const garminName: Record<string, string> = {
  DR: "Driver",
  "3W": "3 Wood",
  "4I": "4 Iron",
  "5I": "5 Iron",
  "6I": "6 Iron",
  "7I": "7 Iron",
  "8I": "8 Iron",
  "9I": "9 Iron",
  PW: "Pitching Wedge",
  "52": "Gap Wedge",
  "56": "Sand Wedge",
  "60": "Lob Wedge",
};
const garminType: Record<string, string> = {
  DR: "Driver",
  "3W": "Wood",
};
const gHeader = [
  "Date",
  "Club Name",
  "Club Type",
  "Ball Speed",
  "Club Head Speed",
  "Smash Factor",
  "Carry Distance",
  "Total Distance",
  "Roll Distance",
  "Launch Angle",
  "Launch Direction",
  "Spin Rate",
  "Spin Axis",
  "Apex Height",
  "Descent Angle",
];
const gRows = shots.map((s) => {
  const carry = s.carryYards ?? 0;
  const total = s.totalYards ?? carry;
  return [
    s.timestamp ?? "",
    garminName[s.club] ?? s.club,
    garminType[s.club] ?? (/^\d{2}$/.test(s.club) ? "Wedge" : "Iron"),
    r1(s.ballSpeedMph),
    r1(s.clubSpeedMph),
    s.smashFactor != null ? s.smashFactor.toFixed(2) : "",
    r1(carry),
    r1(total),
    r1(total - carry),
    r1(s.launchAngleDeg),
    r1(s.launchDirectionDeg),
    s.spinRpm != null ? String(s.spinRpm) : "",
    r1((s.launchDirectionDeg ?? 0) * -1.5), // spin axis proxy
    s.apexFt != null ? String(s.apexFt) : "",
    r1(s.descentAngleDeg),
  ];
});
writeFileSync(join(outDir, "garmin-sample.csv"), csv([gHeader, ...gRows]));

// --- Foresight GCQuad-style (yards/mph, full delivery; Peak Height + Side Spin) ---
const fsHeader = [
  "Date",
  "Club",
  "Ball Speed",
  "Club Speed",
  "Smash Factor",
  "Carry",
  "Total",
  "Launch Angle",
  "Launch Direction",
  "Back Spin",
  "Side Spin",
  "Peak Height",
  "Descent Angle",
  "Angle of Attack",
  "Club Path",
  "Face Angle",
];
const fsRows = shots.map((s) => [
  s.timestamp ?? "",
  s.club,
  r1(s.ballSpeedMph),
  r1(s.clubSpeedMph),
  s.smashFactor != null ? s.smashFactor.toFixed(2) : "",
  r1(s.carryYards),
  r1(s.totalYards),
  r1(s.launchAngleDeg),
  r1(s.launchDirectionDeg),
  s.spinRpm != null ? String(s.spinRpm) : "",
  s.sideSpinRpm != null ? String(s.sideSpinRpm) : "",
  s.apexFt != null ? String(s.apexFt) : "",
  r1(s.descentAngleDeg),
  r1(s.attackAngleDeg),
  r1(s.clubPathDeg),
  r1(s.faceAngleDeg),
]);
writeFileSync(join(outDir, "foresight-sample.csv"), csv([fsHeader, ...fsRows]));

// --- FlightScope Mevo+-style (yards/mph; Spin Loft + Lateral signatures) ---
const flHeader = [
  "Time",
  "Club Type",
  "Ball Speed",
  "Club Speed",
  "Smash Factor",
  "Carry",
  "Total",
  "Vertical Launch",
  "Horizontal Launch",
  "Spin Rate",
  "Spin Loft",
  "Side Spin",
  "Lateral",
  "Apex",
  "Angle of Attack",
  "Club Path",
  "Face Angle",
];
const flRows = shots.map((s) => [
  s.timestamp ?? "",
  s.club,
  r1(s.ballSpeedMph),
  r1(s.clubSpeedMph),
  s.smashFactor != null ? s.smashFactor.toFixed(2) : "",
  r1(s.carryYards),
  r1(s.totalYards),
  r1(s.launchAngleDeg),
  r1(s.launchDirectionDeg),
  s.spinRpm != null ? String(s.spinRpm) : "",
  r1((s.launchAngleDeg ?? 0) + 12), // spin loft proxy (uncaptured signature col)
  s.sideSpinRpm != null ? String(s.sideSpinRpm) : "",
  r1(s.sideYards),
  s.apexFt != null ? String(s.apexFt) : "",
  r1(s.attackAngleDeg),
  r1(s.clubPathDeg),
  r1(s.faceAngleDeg),
]);
writeFileSync(join(outDir, "flightscope-sample.csv"), csv([flHeader, ...flRows]));

// --- SkyTrak-style (yards/mph; Side Angle + Side Total signatures) ---
const skHeader = [
  "Date",
  "Club",
  "Ball Speed",
  "Club Speed",
  "Smash Factor",
  "Carry",
  "Total",
  "Launch Angle",
  "Side Angle",
  "Back Spin",
  "Side Total",
  "Peak Height",
  "Descent Angle",
];
const skRows = shots.map((s) => [
  s.timestamp ?? "",
  s.club,
  r1(s.ballSpeedMph),
  r1(s.clubSpeedMph),
  s.smashFactor != null ? s.smashFactor.toFixed(2) : "",
  r1(s.carryYards),
  r1(s.totalYards),
  r1(s.launchAngleDeg),
  r1(s.launchDirectionDeg),
  s.spinRpm != null ? String(s.spinRpm) : "",
  r1(s.sideYards),
  s.apexFt != null ? String(s.apexFt) : "",
  r1(s.descentAngleDeg),
]);
writeFileSync(join(outDir, "skytrak-sample.csv"), csv([skHeader, ...skRows]));

// --- Rapsodo MLM2PRO-style (yards/mph; Shot Type + Apex Time signatures) ---
const shotType = (s: (typeof shots)[number]) => {
  const f2p = (s.faceAngleDeg ?? 0) - (s.clubPathDeg ?? 0);
  return Math.abs(f2p) < 2 ? "Straight" : f2p < 0 ? "Draw" : "Fade";
};
const rpHeader = [
  "Date",
  "Club",
  "Ball Speed",
  "Club Speed (Estimated)",
  "Smash Factor (Estimated)",
  "Carry",
  "Total",
  "Launch Angle",
  "Launch Direction",
  "Spin Rate",
  "Apex Height",
  "Apex Time",
  "Descent Angle",
  "Shot Type",
];
const rpRows = shots.map((s) => [
  s.timestamp ?? "",
  s.club,
  r1(s.ballSpeedMph),
  r1(s.clubSpeedMph),
  s.smashFactor != null ? s.smashFactor.toFixed(2) : "",
  r1(s.carryYards),
  r1(s.totalYards),
  r1(s.launchAngleDeg),
  r1(s.launchDirectionDeg),
  s.spinRpm != null ? String(s.spinRpm) : "",
  s.apexFt != null ? String(s.apexFt) : "",
  r1(4 + (s.apexFt ?? 0) / 40), // apex time proxy (signature col)
  r1(s.descentAngleDeg),
  shotType(s),
]);
writeFileSync(join(outDir, "rapsodo-sample.csv"), csv([rpHeader, ...rpRows]));

// --- Uneekor QED/EYE XO-style (yards/mph; Flight Time + Dynamic Loft signatures) ---
const unHeader = [
  "Date",
  "Club",
  "Ball Speed",
  "Club Speed",
  "Smash Factor",
  "Carry",
  "Total",
  "Vertical Angle",
  "Horizontal Angle",
  "Back Spin",
  "Side Spin",
  "Apex",
  "Descent Angle",
  "Attack Angle",
  "Club Path",
  "Face Angle",
  "Dynamic Loft",
  "Flight Time",
];
const unRows = shots.map((s) => [
  s.timestamp ?? "",
  s.club,
  r1(s.ballSpeedMph),
  r1(s.clubSpeedMph),
  s.smashFactor != null ? s.smashFactor.toFixed(2) : "",
  r1(s.carryYards),
  r1(s.totalYards),
  r1(s.launchAngleDeg),
  r1(s.launchDirectionDeg),
  s.spinRpm != null ? String(s.spinRpm) : "",
  s.sideSpinRpm != null ? String(s.sideSpinRpm) : "",
  s.apexFt != null ? String(s.apexFt) : "",
  r1(s.descentAngleDeg),
  r1(s.attackAngleDeg),
  r1(s.clubPathDeg),
  r1(s.faceAngleDeg),
  r1((s.launchAngleDeg ?? 0) + 9), // dynamic loft proxy (signature col)
  r1(4 + (s.apexFt ?? 0) / 35), // flight time proxy (signature col)
]);
writeFileSync(join(outDir, "uneekor-sample.csv"), csv([unHeader, ...unRows]));

// --- Full Swing KIT-style (yards/mph; Side Carry + Shot Shape signatures) ---
const fwShape = (s: (typeof shots)[number]) => {
  const f2p = (s.faceAngleDeg ?? 0) - (s.clubPathDeg ?? 0);
  return Math.abs(f2p) < 2 ? "Straight" : f2p < 0 ? "Draw" : "Fade";
};
const fwHeader = [
  "Date",
  "Club",
  "Ball Speed",
  "Club Speed",
  "Smash Factor",
  "Carry",
  "Total",
  "Launch Angle",
  "Launch Direction",
  "Spin Rate",
  "Side Carry",
  "Side Total",
  "Apex",
  "Descent Angle",
  "Club Path",
  "Face Angle",
  "Shot Shape",
];
const fwRows = shots.map((s) => [
  s.timestamp ?? "",
  s.club,
  r1(s.ballSpeedMph),
  r1(s.clubSpeedMph),
  s.smashFactor != null ? s.smashFactor.toFixed(2) : "",
  r1(s.carryYards),
  r1(s.totalYards),
  r1(s.launchAngleDeg),
  r1(s.launchDirectionDeg),
  s.spinRpm != null ? String(s.spinRpm) : "",
  r1(s.sideYards),
  r1(s.sideYards),
  s.apexFt != null ? String(s.apexFt) : "",
  r1(s.descentAngleDeg),
  r1(s.clubPathDeg),
  r1(s.faceAngleDeg),
  fwShape(s),
]);
writeFileSync(join(outDir, "fullswing-sample.csv"), csv([fwHeader, ...fwRows]));

// eslint-disable-next-line no-console
console.log(
  `Wrote ${tmRows.length} TrackMan, ${inRows.length} Inrange, ${gRows.length} Garmin, ${fsRows.length} Foresight, ${flRows.length} FlightScope, ${skRows.length} SkyTrak, ${rpRows.length} Rapsodo, ${unRows.length} Uneekor, ${fwRows.length} Full Swing rows to /samples`,
);
