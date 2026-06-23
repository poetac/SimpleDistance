import { describe, it, expect } from "vitest";
import { normalizeClub, clubLabel, clubOrderIndex } from "./clubs";

describe("club normalization", () => {
  const cases: Array<[string, string]> = [
    ["5i", "5I"],
    ["5 Iron", "5I"],
    ["Iron 5", "5I"],
    ["I5", "5I"],
    ["five iron", "5I"],
    ["7", "7I"],
    ["Driver", "DR"],
    ["DR", "DR"],
    ["3 Wood", "3W"],
    ["3w", "3W"],
    ["4 Hybrid", "4H"],
    ["4H", "4H"],
    ["PW", "PW"],
    ["Pitching Wedge", "PW"],
    ["52", "52"],
    ["56°", "56"],
    ["60 deg", "60"],
    ["Sand Wedge", "SW"],
  ];

  for (const [raw, expected] of cases) {
    it(`${raw} -> ${expected}`, () => {
      expect(normalizeClub(raw)).toBe(expected);
    });
  }

  it("returns null for unknown labels", () => {
    expect(normalizeClub("banana")).toBeNull();
    expect(normalizeClub("")).toBeNull();
  });

  it("user aliases win", () => {
    expect(normalizeClub("the big stick", { "the big stick": "DR" })).toBe("DR");
  });

  it("labels and ordering are sensible", () => {
    expect(clubLabel("5I")).toBe("5 Iron");
    expect(clubLabel("56")).toBe("56° Wedge");
    expect(clubOrderIndex("DR")).toBeLessThan(clubOrderIndex("5I"));
    expect(clubOrderIndex("5I")).toBeLessThan(clubOrderIndex("PW"));
  });
});
