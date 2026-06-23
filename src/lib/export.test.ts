import { describe, it, expect } from "vitest";
import { shotsToCsv } from "./export";
import { parseCsvText } from "./import/csv";
import { autoDetectMapping } from "./import/mapping";
import { rowsToShots } from "./import/transform";
import type { Shot } from "./domain/types";

const shots: Shot[] = [
  {
    id: "1",
    club: "7I",
    sessionId: "2026-06-01",
    carryYards: 162.3,
    totalYards: 168.0,
    ballSpeedMph: 113.2,
    spinRpm: 6000,
    sideYards: -3.1,
  },
  {
    id: "2",
    club: "PW",
    sessionId: "2026-06-01",
    carryYards: 126.1,
    ballSpeedMph: 98.4,
  },
];

describe("CSV export", () => {
  it("emits a header and one row per shot", () => {
    const csv = shotsToCsv(shots);
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("Club");
    expect(lines[0]).toContain("Carry (yds)");
  });

  it("round-trips back through the generic importer", () => {
    const csv = shotsToCsv(shots);
    const table = parseCsvText(csv);
    const { mapping } = autoDetectMapping(table.headers);
    const res = rowsToShots(table, mapping, {
      distanceUnit: "yards",
      speedUnit: "mph",
      source: "reimport",
    });
    expect(res.shots).toHaveLength(2);
    expect(res.shots[0].club).toBe("7I");
    expect(res.shots[0].carryYards).toBeCloseTo(162.3, 1);
    expect(res.shots[1].club).toBe("PW");
  });
});
