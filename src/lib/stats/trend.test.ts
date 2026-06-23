import { describe, it, expect } from "vitest";
import { classifyTrend, type ClubSessionStats } from "./trend";

function rep(value: number, n: number, jitter = 1): number[] {
  return Array.from({ length: n }, (_, i) => value + ((i % 3) - 1) * jitter);
}

describe("real-trend vs noise classifier", () => {
  it("calls a persistent cross-session deviation a real trend", () => {
    const data: ClubSessionStats[] = [];
    for (const session of ["s1", "s2"]) {
      data.push({ club: "4I", sessionId: session, values: rep(193, 12) });
      data.push({ club: "5I", sessionId: session, values: rep(166, 14) }); // short
      data.push({ club: "6I", sessionId: session, values: rep(178, 12) });
    }
    const v = classifyTrend("5I", data);
    expect(v.classification).toBe("real-trend");
    expect(v.direction).toBe("short");
    expect(v.overallDeviationYards).toBeGreaterThan(4);
    expect(v.sessionsStrongAgreeing).toBeGreaterThanOrEqual(2);
  });

  it("calls a single-session deviation insufficient (cannot confirm)", () => {
    const data: ClubSessionStats[] = [
      { club: "4I", sessionId: "s1", values: rep(193, 12) },
      { club: "5I", sessionId: "s1", values: rep(166, 14) },
      { club: "6I", sessionId: "s1", values: rep(178, 12) },
    ];
    const v = classifyTrend("5I", data);
    expect(v.classification).toBe("insufficient");
  });

  it("calls an inconsistent deviation noise", () => {
    const data: ClubSessionStats[] = [
      // short in s1, long in s2 -> not persistent
      { club: "4I", sessionId: "s1", values: rep(193, 12) },
      { club: "5I", sessionId: "s1", values: rep(170, 14) },
      { club: "6I", sessionId: "s1", values: rep(178, 12) },
      { club: "4I", sessionId: "s2", values: rep(193, 12) },
      { club: "5I", sessionId: "s2", values: rep(190, 14) },
      { club: "6I", sessionId: "s2", values: rep(178, 12) },
    ];
    const v = classifyTrend("5I", data);
    expect(["noise", "insufficient"]).toContain(v.classification);
    expect(v.classification).not.toBe("real-trend");
  });
});
