import { describe, it, expect } from "vitest";
import { dispersionStats } from "./dispersion";

describe("dispersion stats", () => {
  it("computes side mean, sd and P75 of absolute side", () => {
    const d = dispersionStats({ side: [-6, -2, 0, 3, 5, -4, 2] });
    expect(d.sideN).toBe(7);
    expect(d.sideMean).toBeCloseTo(-0.2857, 3);
    expect(d.sideSd).toBeGreaterThan(0);
    expect(d.p75AbsSide).toBeGreaterThan(0);
  });

  it("computes a strike-consistency CV from ball speed", () => {
    const steady = dispersionStats({ ballSpeed: [120, 120.5, 119.5, 120.2] });
    const erratic = dispersionStats({ ballSpeed: [110, 125, 100, 130] });
    expect(steady.ballSpeedCv!).toBeLessThan(erratic.ballSpeedCv!);
  });

  it("degrades gracefully when data is absent (no NaN)", () => {
    const d = dispersionStats({ carry: [150, 152, 148] });
    expect(d.sideN).toBe(0);
    expect(d.sideMean).toBeUndefined();
    expect(d.p75AbsSide).toBeUndefined();
    expect(d.ballSpeedCv).toBeUndefined();
    expect(d.carrySd).toBeGreaterThan(0);
  });
});
