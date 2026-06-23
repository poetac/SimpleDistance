import { describe, it, expect } from "vitest";
import { adviseBag, type BagClub } from "./bagAdvice";
import { categoryOf } from "./domain/clubs";

function bag(entries: Array<[string, number]>): BagClub[] {
  return entries.map(([club, carry]) => ({ club, carry, category: categoryOf(club) }));
}

const healthyIrons = bag([
  ["4I", 195],
  ["5I", 183],
  ["6I", 171],
  ["7I", 159],
  ["8I", 147],
  ["9I", 135],
  ["PW", 123],
]);

describe("bag advice engine", () => {
  it("computes a typical gap and flags nothing on a clean iron set", () => {
    const a = adviseBag(healthyIrons);
    expect(a.typicalGapYards).toBeCloseTo(12, 0);
    expect(a.items).toHaveLength(0);
  });

  it("does NOT flag the naturally large driver/wood gaps as holes", () => {
    const withWoods = bag([
      ["DR", 270],
      ["3W", 240],
      ["5W", 215],
      ...healthyIrons.map((c) => [c.club, c.carry] as [string, number]),
    ]);
    const a = adviseBag(withWoods);
    expect(a.items.filter((i) => i.kind === "hole")).toHaveLength(0);
  });

  it("flags a hole and suggests a target carry to fill it", () => {
    const a = adviseBag(
      bag([
        ["4I", 195],
        ["5I", 183],
        ["6I", 171],
        ["7I", 150], // 21-yd gap below the 6I
        ["8I", 138],
      ]),
    );
    const hole = a.items.find((i) => i.kind === "hole");
    expect(hole).toBeDefined();
    expect(hole!.clubs).toEqual(["6I", "7I"]);
    expect(hole!.suggestedCarry).toBeCloseTo(160.5, 0);
  });

  it("flags an overlap between two too-close clubs", () => {
    const a = adviseBag(
      bag([
        ["6I", 171],
        ["7I", 169],
        ["8I", 157],
      ]),
    );
    expect(a.items.some((i) => i.kind === "overlap" && i.clubs[0] === "6I")).toBe(true);
  });

  it("flags an inversion (longer club carries shorter)", () => {
    const a = adviseBag(
      bag([
        ["6I", 171],
        ["7I", 175],
      ]),
    );
    const inv = a.items.find((i) => i.kind === "inversion");
    expect(inv).toBeDefined();
    expect(inv!.priority).toBe(1);
    expect(inv!.tentative).toBe(false);
    expect(inv!.text.toLowerCase()).toMatch(/inversion|loft/);
  });

  it("marks advice tentative and de-prioritizes it when a club's sample is insufficient", () => {
    const a = adviseBag([
      { club: "4I", carry: 195, category: "iron", confidence: "trustworthy" },
      { club: "5I", carry: 183, category: "iron", confidence: "trustworthy" },
      { club: "6I", carry: 171, category: "iron", confidence: "trustworthy" },
      // 7I is short but barely sampled -> the resulting hole is tentative.
      { club: "7I", carry: 150, category: "iron", confidence: "insufficient" },
      { club: "8I", carry: 138, category: "iron", confidence: "trustworthy" },
    ]);
    const hole = a.items.find((i) => i.kind === "hole");
    expect(hole).toBeDefined();
    expect(hole!.tentative).toBe(true);
    expect(hole!.priority).toBe(4);
    expect(hole!.text).toMatch(/Tentative/);
  });

  it("excludes unreliable clubs from the typical-gap calculation", () => {
    const a = adviseBag([
      { club: "6I", carry: 171, category: "iron", confidence: "trustworthy" },
      { club: "7I", carry: 159, category: "iron", confidence: "trustworthy" },
      // A wild, barely-sampled wedge gap shouldn't move the typical gap.
      { club: "8I", carry: 100, category: "iron", confidence: "insufficient" },
    ]);
    expect(a.typicalGapYards).toBeCloseTo(12, 0);
  });
});
