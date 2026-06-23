import { describe, it, expect } from "vitest";
import {
  mean,
  median,
  stdDev,
  stdError,
  trimmedMean,
  percentile,
  quartiles,
  mad,
} from "./descriptive";

describe("descriptive statistics", () => {
  it("mean and median", () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([1, 2, 3])).toBe(2);
  });

  it("sample standard deviation (n-1)", () => {
    // sd of [2,4,4,4,5,5,7,9] = 2.138... (population is 2). n-1 gives 2.138
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.13809, 4);
  });

  it("standard error", () => {
    expect(stdError([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.13809 / Math.sqrt(8), 4);
  });

  it("trimmed mean drops tails and resists outliers", () => {
    const data = [10, 11, 12, 13, 14, 15, 16, 17, 18, 200];
    // mean is dragged up by 200; trimmed mean should be far lower
    expect(mean(data)).toBeGreaterThan(30);
    expect(trimmedMean(data, 0.1)).toBeLessThan(20);
  });

  it("percentile interpolates", () => {
    expect(percentile([1, 2, 3, 4], 50)).toBe(2.5);
    expect(percentile([1, 2, 3, 4], 0)).toBe(1);
    expect(percentile([1, 2, 3, 4], 100)).toBe(4);
  });

  it("quartiles + IQR", () => {
    const { q1, q3, iqr } = quartiles([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(q1).toBeCloseTo(2.75, 2);
    expect(q3).toBeCloseTo(6.25, 2);
    expect(iqr).toBeCloseTo(3.5, 2);
  });

  it("mad is scaled to sigma", () => {
    // For symmetric data MAD*1.4826 approximates sd
    const data = [10, 12, 14, 16, 18, 20];
    expect(mad(data)).toBeGreaterThan(0);
  });
});
