import { describe, it, expect } from "vitest";
import { diffLatestSession } from "./sessionDiff";
import { DEFAULT_SETTINGS, type Shot } from "./domain/types";

let id = 0;
function mk(club: string, session: string, carry: number): Shot {
  id += 1;
  return { id: `s${id}`, club, sessionId: session, carryYards: carry };
}

/** n shots around `mean` with small spread. */
function many(club: string, session: string, mean: number, n: number): Shot[] {
  return Array.from({ length: n }, (_, i) => mk(club, session, mean + ((i % 3) - 1)));
}

describe("session diff", () => {
  it("returns null with fewer than two sessions", () => {
    expect(diffLatestSession(many("7I", "s1", 162, 10), DEFAULT_SETTINGS)).toBeNull();
  });

  it("does NOT flag a within-CI change as a real change", () => {
    const shots = [
      ...many("7I", "s1", 162, 12),
      ...many("7I", "s2", 163, 12), // ~1 yd diff, well within noise
    ];
    const diff = diffLatestSession(shots, DEFAULT_SETTINGS)!;
    const row = diff.rows.find((r) => r.club === "7I")!;
    expect(row.insufficient).toBe(false);
    expect(row.withinNoise).toBe(true);
    expect(row.note).toMatch(/within normal variation/);
  });

  it("flags a large, well-sampled change as outside the usual range", () => {
    const shots = [
      ...many("7I", "s1", 162, 15),
      ...many("7I", "s2", 150, 15), // 12 yds shorter, tight spread
    ];
    const diff = diffLatestSession(shots, DEFAULT_SETTINGS)!;
    const row = diff.rows.find((r) => r.club === "7I")!;
    expect(row.withinNoise).toBe(false);
    expect(row.deltaYards).toBeLessThan(0);
    expect(row.note).toMatch(/outside its usual range/);
  });

  it("labels insufficient-sample clubs instead of alarming", () => {
    const shots = [
      ...many("7I", "s1", 162, 12),
      mk("7I", "s2", 150), // only 1 shot this session
      mk("7I", "s2", 152),
    ];
    const diff = diffLatestSession(shots, DEFAULT_SETTINGS)!;
    const row = diff.rows.find((r) => r.club === "7I")!;
    expect(row.insufficient).toBe(true);
    expect(row.note).toMatch(/Not enough clean shots/);
  });

  it("warns when comparing across different conditions", () => {
    const shots = [
      ...many("7I", "2026-01-01", 160, 10), // baseline outdoor
      ...many("7I", "2026-03-01", 150, 10), // latest indoor
    ];
    const diff = diffLatestSession(shots, DEFAULT_SETTINGS, {
      "2026-01-01": "outdoor",
      "2026-03-01": "indoor",
    })!;
    expect(diff.conditionWarning).toMatch(/indoor/);
    expect(diff.conditionWarning).toMatch(/conditions/);
  });

  it("does not warn when conditions match or are unknown", () => {
    const shots = [
      ...many("7I", "2026-01-01", 160, 10),
      ...many("7I", "2026-03-01", 150, 10),
    ];
    expect(
      diffLatestSession(shots, DEFAULT_SETTINGS, {
        "2026-01-01": "outdoor",
        "2026-03-01": "outdoor",
      })!.conditionWarning,
    ).toBeUndefined();
    // No env data -> no warning.
    expect(diffLatestSession(shots, DEFAULT_SETTINGS)!.conditionWarning).toBeUndefined();
  });

  it("picks the most recent session as latest", () => {
    const shots = [
      ...many("7I", "2026-01-01", 160, 8),
      ...many("7I", "2026-03-01", 165, 8),
    ];
    const diff = diffLatestSession(shots, DEFAULT_SETTINGS)!;
    expect(diff.latestSessionId).toBe("2026-03-01");
    expect(diff.baselineSessionIds).toEqual(["2026-01-01"]);
  });
});
