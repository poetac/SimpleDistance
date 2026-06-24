import { describe, it, expect } from "vitest";
import { analyzeBag } from "./analysis";
import { DEFAULT_SETTINGS, type Shot } from "./domain/types";

let id = 0;
function shots(club: string, mean: number, n: number): Shot[] {
  return Array.from({ length: n }, (_, i) => {
    id += 1;
    return {
      id: `dp${id}`,
      club,
      sessionId: "s1",
      carryYards: mean + ((i % 3) - 1),
    };
  });
}

describe("data-collection plan", () => {
  // 7I trustworthy (18), 6I low (9), 5I insufficient (4).
  const bag = analyzeBag(
    [...shots("7I", 160, 18), ...shots("6I", 172, 9), ...shots("5I", 184, 4)],
    DEFAULT_SETTINGS,
  );

  it("lists only not-yet-trustworthy clubs, insufficient first", () => {
    const plan = bag.dataPlan;
    expect(plan.map((p) => p.club)).toEqual(["5I", "6I"]);
    expect(plan.find((p) => p.club === "7I")).toBeUndefined();
  });

  it("computes shots needed to reach the trustworthy threshold", () => {
    const five = bag.dataPlan.find((p) => p.club === "5I")!;
    expect(five.level).toBe("insufficient");
    expect(five.currentN).toBe(4);
    expect(five.neededForTrustworthy).toBe(15 - 4);
  });
});
