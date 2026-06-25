import { describe, it, expect } from "vitest";
import { buildCaptureProgress } from "./analysis";
import { MIN_SHOTS_TRUSTWORTHY } from "./stats/constants";
import type { ClubAnalysis } from "./analysis";

type Stub = Pick<ClubAnalysis, "club" | "label" | "n" | "rawCount" | "adequacy">;

function stub(club: string, n: number, raw: number, level: string): Stub {
  return {
    club: club as ClubAnalysis["club"],
    label: club,
    n,
    rawCount: raw,
    adequacy: { level: level as never, n, message: "" },
  };
}

describe("capture progress", () => {
  it("counts ready clubs and clamps the progress fraction", () => {
    const cp = buildCaptureProgress([
      stub("7I", 20, 22, "trustworthy"),
      stub("DR", 3, 4, "insufficient"),
      stub("PW", 10, 11, "low"),
    ]);
    expect(cp.target).toBe(MIN_SHOTS_TRUSTWORTHY);
    expect(cp.started).toBe(3);
    expect(cp.ready).toBe(1);
    const dr = cp.items.find((i) => i.club === "DR")!;
    expect(dr.fraction).toBeCloseTo(3 / MIN_SHOTS_TRUSTWORTHY);
    const seven = cp.items.find((i) => i.club === "7I")!;
    expect(seven.fraction).toBe(1); // clamped, not 20/15
  });

  it("sorts least-complete clubs first so gaps surface at a glance", () => {
    const cp = buildCaptureProgress([
      stub("7I", 15, 15, "trustworthy"),
      stub("DR", 2, 2, "insufficient"),
      stub("PW", 8, 8, "low"),
    ]);
    expect(cp.items.map((i) => i.club)).toEqual(["DR", "PW", "7I"]);
  });
});
