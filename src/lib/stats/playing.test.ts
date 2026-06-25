import { describe, it, expect } from "vitest";
import { playingNumbers } from "./playing";

describe("playing numbers", () => {
  const tight = Array.from({ length: 20 }, (_, i) => 160 + (i % 3) - 1); // ~159-161
  const loose = [140, 150, 155, 160, 162, 165, 168, 172, 178, 185];

  it("reports a robust stock and a conservative reliable carry", () => {
    const p = playingNumbers(loose);
    expect(p.stock).toBeCloseTo((162 + 165) / 2, 1); // median of 10
    expect(p.reliable).toBeLessThan(p.stock); // a low percentile
    expect(p.p90).toBeGreaterThan(p.stock);
    expect(p.iqr).toBeGreaterThan(0);
  });

  it("grades a tight club better than a loose one", () => {
    const a = playingNumbers(tight);
    const b = playingNumbers(loose);
    expect(a.carryCv!).toBeLessThan(b.carryCv!);
    expect("ABCDF".indexOf(a.consistencyGrade!)).toBeLessThan(
      "ABCDF".indexOf(b.consistencyGrade!),
    );
    expect(a.consistencyGrade).toBe("A");
  });

  it("omits CV/grade for n < 2", () => {
    const p = playingNumbers([160]);
    expect(p.carryCv).toBeUndefined();
    expect(p.consistencyGrade).toBeUndefined();
  });
});
