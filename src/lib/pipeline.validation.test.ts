import { describe, it, expect } from "vitest";
import { analyzeBag } from "./analysis";
import { DEFAULT_SETTINGS, type Shot } from "./domain/types";

// An independent synthetic corpus (NOT the demo seed) to validate that the full
// corpus -> recommendations pipeline generalizes. Scenario: a genuinely WEAK
// 8-iron (lofted ~12 yds short) that persists across two sessions, in an
// otherwise clean bag. We assert the whole stack detects it end to end.

let id = 0;
function shots(club: string, session: string, mean: number, n: number): Shot[] {
  return Array.from({ length: n }, (_, i) => {
    id += 1;
    // Deterministic small spread, symmetric around the mean.
    const jitter = ((i % 5) - 2) * 1.5;
    return {
      id: `v${id}`,
      club,
      sessionId: session,
      carryYards: mean + jitter,
      totalYards: mean + jitter + 6,
      ballSpeedMph: 100 + (mean - 120) * 0.25,
      spinRpm: 6000,
      descentAngleDeg: 45,
      sideYards: ((i % 3) - 1) * 4,
    };
  });
}

function corpus(): Shot[] {
  const out: Shot[] = [];
  // Healthy ladder except the 8-iron, which is ~12 yds short of its slot.
  const profile: Record<string, number> = {
    DR: 250,
    "3W": 225,
    "5I": 185,
    "6I": 173,
    "7I": 161,
    "8I": 137, // should be ~149; it's weak/lofted
    "9I": 125,
    PW: 113,
  };
  for (const session of ["2026-04-01", "2026-05-01"]) {
    for (const [club, mean] of Object.entries(profile)) {
      out.push(...shots(club, session, mean, 14));
    }
  }
  return out;
}

describe("end-to-end pipeline validation (independent corpus)", () => {
  const bag = analyzeBag(corpus(), DEFAULT_SETTINGS);
  const byClub = new Map(bag.clubs.map((c) => [c.club, c]));

  it("ingests the corpus into a full bag", () => {
    expect(bag.clubs.length).toBe(8);
    expect(bag.totalShots).toBe(8 * 2 * 14);
  });

  it("classifies the weak 8-iron as a real short trend", () => {
    const eight = byClub.get("8I")!;
    expect(eight.adequacy.level).toBe("trustworthy");
    expect(eight.trend.classification).toBe("real-trend");
    expect(eight.trend.direction).toBe("short");
  });

  it("surfaces the 7I->8I hole in bag advice (not tentative — well sampled)", () => {
    const holeOrInv = bag.bagAdvice.items.find(
      (i) => i.clubs.includes("8I") && (i.kind === "hole" || i.kind === "inversion"),
    );
    expect(holeOrInv).toBeDefined();
    expect(holeOrInv!.tentative).toBe(false);
  });

  it("the optimizer wants to adjust or fill around the weak 8-iron", () => {
    const o = bag.optimization;
    const flagged =
      o.ladder.some((s) => s.status === "adjust" || s.status === "gap") ||
      o.redundant.length > 0;
    expect(flagged).toBe(true);
  });

  it("puts the 8-iron problem in the recommendations", () => {
    expect(bag.recommendations.some((r) => r.club === "8I")).toBe(true);
  });
});
