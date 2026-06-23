// Ready-made column-mapping presets for TrackMan and Inrange.
//
// These are HINTS, not hardcoding: auto-detection (schema.ts detect regexes)
// runs first; presets fill gaps and supply sensible header names. Users can
// always override in the mapping UI. Header strings are matched case- and
// whitespace-insensitively, so minor export variations still line up.

import type { CanonicalField } from "./schema";

export interface ImportPreset {
  id: string;
  label: string;
  description: string;
  /** Default unit assumptions for this source. */
  distanceUnit: "yards" | "meters";
  speedUnit: "mph" | "ms" | "kmh";
  /** canonicalField -> list of candidate source header names. */
  headers: Partial<Record<CanonicalField, string[]>>;
}

export const PRESETS: ImportPreset[] = [
  {
    id: "trackman",
    label: "TrackMan",
    description:
      "TrackMan range/combine exports. Rich launch data in yards & mph by default.",
    distanceUnit: "yards",
    speedUnit: "mph",
    headers: {
      club: ["Club", "Club Name", "Club Type"],
      carryYards: ["Carry", "Carry (yds)", "Carry Distance"],
      totalYards: ["Total", "Total (yds)", "Total Distance"],
      ballSpeedMph: ["Ball Speed", "Ball Speed (mph)"],
      clubSpeedMph: ["Club Speed", "Club Speed (mph)", "Club Head Speed"],
      smashFactor: ["Smash Factor", "Smash"],
      launchAngleDeg: ["Launch Angle", "Launch Ang.", "Launch V"],
      spinRpm: ["Spin Rate", "Spin", "Spin Rate (rpm)"],
      launchDirectionDeg: ["Launch Direction", "Launch H", "Launch Dir."],
      sideYards: ["Carry Side", "Side", "Side (yds)"],
      apexFt: ["Height", "Apex", "Max Height (ft)"],
      descentAngleDeg: ["Landing Angle", "Descent Angle"],
      timestamp: ["Date", "Time", "Date/Time"],
      sessionId: ["Session", "Session Name"],
    },
  },
  {
    id: "inrange",
    label: "Inrange",
    description:
      "Inrange range exports. Fewer fields than TrackMan; distances often in meters.",
    distanceUnit: "meters",
    speedUnit: "ms",
    headers: {
      club: ["Club", "Selected Club"],
      carryYards: ["Carry", "Carry (m)", "Carry Distance"],
      totalYards: ["Total", "Total (m)", "Total Distance"],
      ballSpeedMph: ["Ball Speed", "Ball Speed (m/s)", "Speed"],
      launchAngleDeg: ["Launch", "Launch Angle"],
      launchDirectionDeg: ["Direction", "Azimuth"],
      sideYards: ["Side", "Offline (m)"],
      timestamp: ["Time", "Date"],
      sessionId: ["Session", "Bay"],
    },
  },
];

export function getPreset(id: string): ImportPreset | undefined {
  return PRESETS.find((p) => p.id === id);
}
