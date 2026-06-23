import { describe, it, expect } from "vitest";
import { analyzeGapping } from "./gapping";

describe("gapping analysis", () => {
  it("flags a healthy bag as ok", () => {
    const res = analyzeGapping([
      { club: "7I", carry: 162 },
      { club: "6I", carry: 174 },
      { club: "5I", carry: 186 },
    ]);
    expect(res.inversions).toHaveLength(0);
    expect(res.overlaps).toHaveLength(0);
    expect(res.holes).toHaveLength(0);
  });

  it("detects an inversion (longer club carries shorter)", () => {
    const res = analyzeGapping([
      { club: "5I", carry: 166 }, // should be longest, but is short
      { club: "6I", carry: 178 },
      { club: "7I", carry: 168 },
    ]);
    expect(res.inversions.length).toBeGreaterThan(0);
    const inv = res.inversions.find((i) => i.longer === "5I" && i.shorter === "6I");
    expect(inv).toBeDefined();
    expect(inv!.deficit).toBeCloseTo(12, 0);
  });

  it("detects an overlap", () => {
    const res = analyzeGapping([
      { club: "5I", carry: 184 },
      { club: "6I", carry: 182 },
    ]);
    expect(res.overlaps).toHaveLength(1);
  });

  it("detects a hole", () => {
    const res = analyzeGapping([
      { club: "5I", carry: 200 },
      { club: "6I", carry: 170 },
    ]);
    expect(res.holes).toHaveLength(1);
    expect(res.holes[0].gap).toBeCloseTo(30, 0);
  });

  it("orders clubs by canonical order regardless of input order", () => {
    const res = analyzeGapping([
      { club: "PW", carry: 126 },
      { club: "DR", carry: 268 },
      { club: "7I", carry: 162 },
    ]);
    expect(res.rows.map((r) => r.club)).toEqual(["DR", "7I", "PW"]);
  });
});
