import { describe, it, expect } from "vitest";
import { timeTrend } from "./timeTrend";

function pts(means: number[]) {
  return means.map((mean, i) => ({ sessionId: `s${i}`, mean }));
}

describe("time-series drift", () => {
  it("is insufficient with fewer than 3 sessions", () => {
    expect(timeTrend(pts([160, 165])).direction).toBe("insufficient");
  });

  it("detects a steady lengthening drift", () => {
    const t = timeTrend(pts([158, 162, 166, 170, 174]));
    expect(t.direction).toBe("lengthening");
    expect(t.slopePerSession!).toBeCloseTo(4, 0);
    expect(t.rSquared!).toBeGreaterThan(0.9);
  });

  it("detects a shortening drift", () => {
    const t = timeTrend(pts([175, 170, 166, 161, 157]));
    expect(t.direction).toBe("shortening");
    expect(t.slopePerSession!).toBeLessThan(0);
  });

  it("calls noisy-but-flat sessions stable", () => {
    const t = timeTrend(pts([162, 159, 163, 160, 161, 162]));
    expect(t.direction).toBe("stable");
    expect(t.message).toMatch(/Stable/);
  });
});
