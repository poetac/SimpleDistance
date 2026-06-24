// Export canonical shots to CSV (yards/mph/degrees). Round-trips through the
// generic importer because it emits the canonical headers the schema detects.

import type { Shot } from "./domain/types";

const COLUMNS: Array<{ header: string; get: (s: Shot) => string | number | undefined }> = [
  { header: "Club", get: (s) => s.club },
  { header: "Session", get: (s) => s.sessionId },
  { header: "Timestamp", get: (s) => s.timestamp },
  { header: "Carry (yds)", get: (s) => s.carryYards },
  { header: "Total (yds)", get: (s) => s.totalYards },
  { header: "Ball Speed (mph)", get: (s) => s.ballSpeedMph },
  { header: "Club Speed (mph)", get: (s) => s.clubSpeedMph },
  { header: "Smash Factor", get: (s) => s.smashFactor },
  { header: "Launch Angle", get: (s) => s.launchAngleDeg },
  { header: "Spin Rate", get: (s) => s.spinRpm },
  { header: "Launch Direction", get: (s) => s.launchDirectionDeg },
  { header: "Side (yds)", get: (s) => s.sideYards },
  { header: "Apex (ft)", get: (s) => s.apexFt },
  { header: "Descent Angle", get: (s) => s.descentAngleDeg },
];

function cell(v: string | number | undefined): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function shotsToCsv(shots: Shot[]): string {
  const header = COLUMNS.map((c) => c.header).join(",");
  const rows = shots.map((s) => COLUMNS.map((c) => cell(c.get(s))).join(","));
  return [header, ...rows].join("\n") + "\n";
}
