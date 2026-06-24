import { describe, it, expect } from "vitest";
import { bootstrapCI } from "./bootstrap";
import { mean } from "./descriptive";

describe("percentile bootstrap CI", () => {
  const data = [160, 162, 168, 165, 170, 158, 161, 166, 159, 164];

  it("brackets the sample mean and is deterministic", () => {
    const a = bootstrapCI(data);
    const b = bootstrapCI(data);
    expect(a.lower).toBeLessThan(a.mean);
    expect(a.upper).toBeGreaterThan(a.mean);
    expect(a.mean).toBeCloseTo(mean(data), 6);
    // Same seed -> identical interval.
    expect(a.lower).toBe(b.lower);
    expect(a.upper).toBe(b.upper);
  });

  it("is undefined for n < 2", () => {
    expect(Number.isNaN(bootstrapCI([170]).halfWidth)).toBe(true);
  });

  it("narrows as the sample grows (same spread)", () => {
    const small = bootstrapCI(data);
    const big = bootstrapCI([...data, ...data, ...data, ...data]);
    expect(big.halfWidth).toBeLessThan(small.halfWidth);
  });

  it("handles a right-skewed sample without assuming normality", () => {
    const skewed = [150, 151, 152, 153, 154, 155, 156, 200]; // one long flyer
    const ci = bootstrapCI(skewed);
    expect(ci.lower).toBeLessThan(ci.mean);
    expect(ci.upper).toBeGreaterThan(ci.mean);
    // The upper tail is pulled out by the flyer (asymmetric interval).
    expect(ci.upper - ci.mean).toBeGreaterThan(ci.mean - ci.lower);
  });

  it("supports a median statistic", () => {
    const ci = bootstrapCI(data, { statistic: "median" });
    expect(ci.lower).toBeLessThanOrEqual(ci.mean);
    expect(ci.upper).toBeGreaterThanOrEqual(ci.mean);
  });
});
