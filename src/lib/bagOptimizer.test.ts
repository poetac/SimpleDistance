import { describe, it, expect } from "vitest";
import { optimizeBag, type OptClub } from "./bagOptimizer";
import { categoryOf } from "./domain/clubs";

function bag(entries: Array<[string, number]>): OptClub[] {
  return entries.map(([club, carry]) => ({ club, carry, category: categoryOf(club) }));
}

const evenSet = bag([
  ["DR", 270],
  ["3W", 240],
  ["4I", 195],
  ["5I", 183],
  ["6I", 171],
  ["7I", 159],
  ["8I", 147],
  ["9I", 135],
  ["PW", 123],
]);

describe("bag optimizer", () => {
  it("matches an evenly-gapped set with no gaps or redundancy", () => {
    const o = optimizeBag(evenSet);
    expect(o.targetGapYards).toBeCloseTo(12, 0);
    expect(o.anchors.map((a) => a.club)).toEqual(["DR", "3W"]);
    expect(o.gaps).toHaveLength(0);
    expect(o.redundant).toHaveLength(0);
    expect(o.ladder.every((s) => s.status === "matched")).toBe(true);
  });

  it("identifies a missing slot and suggests a target carry", () => {
    const o = optimizeBag(
      bag([
        ["4I", 195],
        ["5I", 183],
        ["6I", 171],
        // no 7I (~159)
        ["8I", 147],
        ["9I", 135],
        ["PW", 123],
      ]),
    );
    expect(o.gaps.length).toBeGreaterThanOrEqual(1);
    const gap = o.gaps[0];
    expect(gap.targetCarry).toBeCloseTo(159, 0);
    expect(o.summary.some((s) => /Add a club carrying ~15\d yds/.test(s))).toBe(true);
  });

  it("flags a redundant club crowding a slot", () => {
    const o = optimizeBag(
      bag([
        ["5I", 183],
        ["6I", 171],
        ["7I", 169], // crowds the 6I
        ["8I", 147],
        ["9I", 135],
        ["PW", 123],
      ]),
    );
    expect(o.redundant.length).toBeGreaterThanOrEqual(1);
    expect(o.summary.some((s) => /candidate to drop/.test(s))).toBe(true);
  });

  it("suggests an adjust when a club is off its slot but present", () => {
    const o = optimizeBag(
      bag([
        ["4I", 195],
        ["5I", 183],
        ["6I", 165], // ~6 short of the 171 slot
        ["7I", 159],
        ["8I", 147],
        ["9I", 135],
        ["PW", 123],
      ]),
      { targetGapYards: 12 },
    );
    expect(o.ladder.some((s) => s.status === "adjust")).toBe(true);
  });

  it("reports remaining budget room", () => {
    const o = optimizeBag(evenSet);
    expect(o.proposedCount).toBe(o.currentCount);
    expect(o.summary.some((s) => /room for \d+ more/.test(s))).toBe(true);
  });

  it("warns when the proposed set exceeds the budget", () => {
    // A dense set + gaps that push proposed clubs over a small budget.
    const o = optimizeBag(evenSet, { budget: 6 });
    expect(o.proposedCount).toBeGreaterThan(6);
    expect(o.summary.some((s) => /drop \d+/.test(s))).toBe(true);
  });
});
