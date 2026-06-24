import { describe, it, expect } from "vitest";
import { rowsToShots } from "./transform";
import type { RawTable } from "./adapter";
import { autoDetectMapping, detectPreset } from "./mapping";

const trackmanTable: RawTable = {
  headers: ["Club", "Carry", "Total", "Ball Speed", "Spin Rate", "Launch Angle"],
  rows: [
    { Club: "5 Iron", Carry: "166.2", Total: "172.1", "Ball Speed": "120.3", "Spin Rate": "6500", "Launch Angle": "17.4" },
    { Club: "6i", Carry: "178.0", Total: "184.0", "Ball Speed": "117.1", "Spin Rate": "5500", "Launch Angle": "16.0" },
  ],
};

describe("auto mapping + transform", () => {
  it("auto-detects TrackMan headers", () => {
    expect(detectPreset(trackmanTable.headers)).toBe("trackman");
    const { mapping } = autoDetectMapping(trackmanTable.headers, "trackman");
    expect(mapping.club).toBe("Club");
    expect(mapping.carryYards).toBe("Carry");
    expect(mapping.ballSpeedMph).toBe("Ball Speed");
  });

  it("transforms rows to canonical shots in yards/mph", () => {
    const { mapping } = autoDetectMapping(trackmanTable.headers, "trackman");
    const res = rowsToShots(trackmanTable, mapping, {
      distanceUnit: "yards",
      speedUnit: "mph",
      source: "trackman",
    });
    expect(res.shots).toHaveLength(2);
    expect(res.shots[0].club).toBe("5I");
    expect(res.shots[0].carryYards).toBeCloseTo(166.2, 1);
    expect(res.shots[1].club).toBe("6I");
  });

  it("converts meters and m/s for an Inrange-style file", () => {
    const table: RawTable = {
      headers: ["Club", "Carry", "Ball Speed"],
      rows: [{ Club: "7 Iron", Carry: "150", "Ball Speed": "50" }], // 150 m, 50 m/s
    };
    const { mapping } = autoDetectMapping(table.headers, "inrange");
    const res = rowsToShots(table, mapping, {
      distanceUnit: "meters",
      speedUnit: "ms",
      source: "inrange",
    });
    expect(res.shots[0].carryYards).toBeCloseTo(164, 0); // 150 m ≈ 164 yds
    expect(res.shots[0].ballSpeedMph).toBeCloseTo(111.8, 0); // 50 m/s ≈ 111.8 mph
  });

  it("parses European decimal commas without 10x-ing distances", () => {
    const table: RawTable = {
      headers: ["Club", "Carry", "Ball Speed"],
      rows: [{ Club: "7 Iron", Carry: "150,5", "Ball Speed": "112,4" }],
    };
    const { mapping } = autoDetectMapping(table.headers);
    const res = rowsToShots(table, mapping, {
      distanceUnit: "yards",
      speedUnit: "mph",
      source: "x",
    });
    expect(res.shots[0].carryYards).toBeCloseTo(150.5, 1); // not 1505
    expect(res.shots[0].ballSpeedMph).toBeCloseTo(112.4, 1); // not 1124
  });

  it("treats a comma grouping of 3 digits as thousands", () => {
    const table: RawTable = {
      headers: ["Club", "Carry", "Spin Rate"],
      rows: [{ Club: "DR", Carry: "250", "Spin Rate": "2,600" }],
    };
    const { mapping } = autoDetectMapping(table.headers);
    const res = rowsToShots(table, mapping, {
      distanceUnit: "yards",
      speedUnit: "mph",
      source: "x",
    });
    expect(res.shots[0].spinRpm).toBeCloseTo(2600, 0);
  });

  it("rejects negative distances rather than corrupting averages", () => {
    const table: RawTable = {
      headers: ["Club", "Carry", "Total"],
      rows: [
        { Club: "7 Iron", Carry: "-150", Total: "168" },
        { Club: "7 Iron", Carry: "-5", Total: "-5" }, // both invalid -> skipped
      ],
    };
    const { mapping } = autoDetectMapping(table.headers);
    const res = rowsToShots(table, mapping, {
      distanceUnit: "yards",
      speedUnit: "mph",
      source: "x",
    });
    expect(res.shots).toHaveLength(1);
    expect(res.shots[0].carryYards).toBeUndefined(); // negative dropped
    expect(res.shots[0].totalYards).toBeCloseTo(168, 0);
    expect(res.rowsSkipped).toBe(1);
  });

  it("does not let a 'Carry Side' column steal the carry mapping", () => {
    const table: RawTable = {
      headers: ["Club", "Carry Side", "Carry"],
      rows: [{ Club: "7 Iron", "Carry Side": "-3", Carry: "162" }],
    };
    const { mapping } = autoDetectMapping(table.headers);
    expect(mapping.carryYards).toBe("Carry");
    expect(mapping.sideYards).toBe("Carry Side");
  });

  it("collects unmapped club labels instead of guessing", () => {
    const table: RawTable = {
      headers: ["Club", "Carry"],
      rows: [{ Club: "mystery stick", Carry: "150" }],
    };
    const { mapping } = autoDetectMapping(table.headers);
    const res = rowsToShots(table, mapping, {
      distanceUnit: "yards",
      speedUnit: "mph",
      source: "x",
    });
    expect(res.shots).toHaveLength(0);
    expect(res.unmappedClubs).toContain("mystery stick");
  });
});
