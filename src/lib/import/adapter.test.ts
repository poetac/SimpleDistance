import { describe, it, expect } from "vitest";
import type { RawTable } from "./adapter";
import { detectPreset } from "./mapping";
import { detectFileAdapter, presetIdForAdapter } from "./builtinAdapters";

const garminTable: RawTable = {
  headers: [
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
    "Spin Rate",
    "Spin Axis",
    "Apex Height",
  ],
  rows: [
    {
      Date: "2026-06-01",
      "Club Name": "7 Iron",
      "Club Type": "Iron",
      "Ball Speed": "113.2",
      "Club Head Speed": "81.0",
      "Smash Factor": "1.40",
      "Carry Distance": "162.0",
      "Total Distance": "168.0",
      "Roll Distance": "6.0",
      "Launch Angle": "17.5",
      "Spin Rate": "6000",
      "Spin Axis": "-2.1",
      "Apex Height": "92",
    },
  ],
};

describe("ImportAdapter registry + Garmin preset", () => {
  it("fingerprints Garmin over look-alike presets via signature headers", () => {
    expect(detectPreset(garminTable.headers)).toBe("garmin");
  });

  it("detectFileAdapter routes the Garmin file to the garmin adapter", () => {
    const adapter = detectFileAdapter(garminTable);
    expect(adapter.id).toBe("garmin-csv");
    expect(presetIdForAdapter(adapter)).toBe("garmin");
  });

  it("the adapter parses to the canonical schema in yards/mph", () => {
    const adapter = detectFileAdapter(garminTable);
    const res = adapter.parse(garminTable, { fallbackSessionId: "g1" });
    expect(res.distanceUnit).toBe("yards");
    expect(res.shots).toHaveLength(1);
    expect(res.shots[0].club).toBe("7I");
    expect(res.shots[0].carryYards).toBeCloseTo(162, 0);
    expect(res.shots[0].ballSpeedMph).toBeCloseTo(113.2, 1);
  });

  it("falls back to the generic CSV adapter for unknown files", () => {
    const unknown: RawTable = {
      headers: ["Stick", "Distance"],
      rows: [{ Stick: "7 Iron", Distance: "162" }],
    };
    expect(detectFileAdapter(unknown).id).toBe("csv");
  });

  it("still detects TrackMan and Inrange correctly after adding Garmin", () => {
    expect(
      detectPreset(["Club", "Carry", "Total", "Ball Speed", "Club Speed", "Spin Rate"]),
    ).toBe("trackman");
    expect(
      detectPreset(["Selected Club", "Carry (m)", "Ball Speed (m/s)", "Bay"]),
    ).toBe("inrange");
  });
});
