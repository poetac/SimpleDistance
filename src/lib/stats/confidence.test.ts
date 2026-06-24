import { describe, it, expect } from "vitest";
import { meanConfidenceInterval, shotsNeededForHalfWidth } from "./confidence";

describe("mean confidence interval", () => {
  it("computes a t-interval", () => {
    const data = [170, 172, 168, 175, 169, 171, 173, 167];
    const ci = meanConfidenceInterval(data);
    expect(ci.n).toBe(8);
    expect(ci.mean).toBeCloseTo(170.625, 3);
    expect(ci.halfWidth).toBeGreaterThan(0);
    expect(ci.lower).toBeLessThan(ci.mean);
    expect(ci.upper).toBeGreaterThan(ci.mean);
  });

  it("is undefined for n<2", () => {
    const ci = meanConfidenceInterval([170]);
    expect(Number.isNaN(ci.halfWidth)).toBe(true);
  });

  it("CI half-width shrinks as N grows (same spread)", () => {
    const base = [165, 170, 175];
    const small = meanConfidenceInterval(base);
    const big = meanConfidenceInterval([...base, ...base, ...base, ...base]);
    expect(big.halfWidth).toBeLessThan(small.halfWidth);
  });
});

describe("shots needed for target precision", () => {
  it("requests more shots when CI is too wide", () => {
    const data = [160, 170, 180, 165, 175]; // sd ~ 7.9
    const res = shotsNeededForHalfWidth(data, 2);
    expect(res.achievable).toBe(true);
    expect(res.totalNeeded).toBeGreaterThan(data.length);
    expect(res.additionalNeeded).toBeGreaterThan(0);
  });

  it("needs zero additional when already precise enough", () => {
    const tight = Array.from({ length: 40 }, (_, i) => 170 + (i % 2));
    const res = shotsNeededForHalfWidth(tight, 2);
    expect(res.additionalNeeded).toBe(0);
  });
});
