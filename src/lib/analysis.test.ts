import { describe, it, expect } from "vitest";
import { analyzeBag } from "./analysis";
import { generateSeedShots } from "./db/seed";
import { DEFAULT_SETTINGS } from "./domain/types";

describe("seed 5-iron acceptance test", () => {
  const shots = generateSeedShots();
  const bag = analyzeBag(shots, DEFAULT_SETTINGS);
  const byClub = new Map(bag.clubs.map((c) => [c.club, c]));

  it("produces a full bag of clubs", () => {
    expect(bag.clubs.length).toBeGreaterThanOrEqual(10);
    expect(byClub.has("5I")).toBe(true);
    expect(byClub.has("6I")).toBe(true);
    expect(byClub.has("7I")).toBe(true);
  });

  it("the 5-iron carries shorter than the 6-iron (inversion present)", () => {
    const fiveI = byClub.get("5I")!;
    const sixI = byClub.get("6I")!;
    expect(fiveI.mean).toBeLessThan(sixI.mean);
    const inv = bag.gapping.inversions.find((i) => i.longer === "5I");
    expect(inv).toBeDefined();
  });

  it("classifies the 5-iron deviation as a REAL trend (short), not noise", () => {
    const fiveI = byClub.get("5I")!;
    expect(fiveI.trend.classification).toBe("real-trend");
    expect(fiveI.trend.direction).toBe("short");
    expect(fiveI.trend.sessionsConsidered).toBeGreaterThanOrEqual(2);
  });

  it("the 5-iron has enough shots to be trustworthy (not dismissable as small sample)", () => {
    expect(byClub.get("5I")!.adequacy.level).not.toBe("insufficient");
  });

  it("surfaces an equipment-vs-swing hint for the 5-iron (loft/spin leaning)", () => {
    const fiveI = byClub.get("5I")!;
    expect(fiveI.hints.length).toBeGreaterThan(0);
    // Ball speed is in line with neighbors but carry is short -> equipment lean.
    expect(fiveI.hints.some((h) => h.leaning === "equipment")).toBe(true);
  });

  it("6-iron and 7-iron carry long of their neighbor expectation", () => {
    const sixI = byClub.get("6I")!;
    const sevenI = byClub.get("7I")!;
    // Negative overall deviation = long of expectation.
    expect(sixI.trend.overallDeviationYards).toBeLessThan(0);
    expect(sevenI.trend.overallDeviationYards).toBeLessThan(0);
  });

  it("recommends addressing the 5-iron first", () => {
    expect(bag.recommendations.length).toBeGreaterThan(0);
    const top = bag.recommendations[0];
    expect(top.club).toBe("5I");
    expect(top.text.toLowerCase()).toMatch(/5 iron|inversion|loft/);
  });
});
