import { describe, it, expect } from "vitest";
import { invNormalCdf, studentTCritical } from "./distributions";

describe("inverse normal CDF", () => {
  it("matches known quantiles", () => {
    expect(invNormalCdf(0.5)).toBeCloseTo(0, 6);
    expect(invNormalCdf(0.975)).toBeCloseTo(1.95996, 4);
    expect(invNormalCdf(0.025)).toBeCloseTo(-1.95996, 4);
    expect(invNormalCdf(0.95)).toBeCloseTo(1.64485, 4);
  });
});

describe("Student t critical values (two-sided)", () => {
  // Published 95% two-sided critical values.
  const table: Array<[number, number]> = [
    [1, 12.706],
    [2, 4.303],
    [3, 3.182],
    [5, 2.571],
    [10, 2.228],
    [20, 2.086],
    [30, 2.042],
    [100, 1.984],
  ];

  for (const [df, expected] of table) {
    it(`df=${df} -> ${expected}`, () => {
      expect(studentTCritical(0.05, df)).toBeCloseTo(expected, 2);
    });
  }

  it("approaches 1.96 as df grows", () => {
    expect(studentTCritical(0.05, 100000)).toBeCloseTo(1.96, 2);
  });
});
