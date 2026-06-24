import { describe, it, expect } from "vitest";
import { directionTendency } from "./tendency";

describe("direction tendency", () => {
  it("flags a consistent right bias", () => {
    const t = directionTendency([6, 8, 5, 9, 7, 6, 10]);
    expect(t.bias).toBe("right");
    expect(t.meanSide!).toBeGreaterThan(4);
    expect(t.label).toMatch(/right/);
  });

  it("flags a left bias", () => {
    const t = directionTendency([-6, -8, -5, -9, -7]);
    expect(t.bias).toBe("left");
  });

  it("calls a balanced pattern centered", () => {
    const t = directionTendency([-5, 4, -3, 2, 0, 1, -2]);
    expect(t.bias).toBe("centered");
    expect(t.leftPct! + t.rightPct!).toBeLessThanOrEqual(100);
  });

  it("handles no side data", () => {
    expect(directionTendency([]).bias).toBe("centered");
  });
});
