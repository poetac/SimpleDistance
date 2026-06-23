import { describe, it, expect } from "vitest";
import { stoppingStats } from "./stopping";

describe("stopping power", () => {
  it("classifies a wedge that stops quickly as soft", () => {
    const s = stoppingStats({
      roll: [1, 2, 1.5],
      total: [100, 101, 100],
      descent: [48, 50, 49],
      scoringClub: true,
    });
    expect(s.landing).toBe("soft");
    expect(s.rollFraction!).toBeLessThan(0.06);
    expect(s.note).toMatch(/soft/i);
  });

  it("classifies a hot-releasing iron", () => {
    const s = stoppingStats({
      roll: [28, 31, 29],
      total: [170, 172, 171], // ~17% roll, above the hot threshold
      scoringClub: true,
    });
    expect(s.landing).toBe("hot");
    expect(s.note).toMatch(/release|run out/i);
  });

  it("does not judge a long club as soft/hot", () => {
    const s = stoppingStats({
      roll: [25, 28, 26],
      total: [275, 280, 278],
      scoringClub: false,
    });
    expect(s.landing).toBe("unknown");
    expect(s.note).toMatch(/expected for a long club/i);
  });

  it("degrades gracefully with no roll/descent data", () => {
    const s = stoppingStats({ scoringClub: true });
    expect(s.landing).toBe("unknown");
    expect(s.rollFraction).toBeUndefined();
    expect(s.note).toMatch(/No roll or descent/i);
  });
});
