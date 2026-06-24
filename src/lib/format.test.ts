import { describe, it, expect } from "vitest";
import { makeFormatter } from "./format";
import { adviseBag } from "./bagAdvice";
import { categoryOf } from "./domain/clubs";

describe("display formatter", () => {
  it("formats yards/mph by default", () => {
    const f = makeFormatter("yards", "mph");
    expect(f.d(150)).toBe("150");
    expect(f.dist(150)).toBe("150 yds");
    expect(f.dUnitAdj).toBe("yd");
    expect(f.speed(112)).toBe("112 mph");
  });

  it("converts to meters and m/s", () => {
    const f = makeFormatter("meters", "ms");
    expect(f.dVal(150)).toBeCloseTo(137.16, 1);
    expect(f.dist(150)).toBe("137 m");
    expect(f.dUnitAdj).toBe("m");
    expect(f.speed(112)).toBe("50 m/s"); // 112 mph ≈ 50.07 m/s
  });
});

describe("engine prose honors the formatter", () => {
  const holeBag = [
    ["4I", 195],
    ["5I", 183],
    ["6I", 171],
    ["7I", 150], // hole below the 6I
    ["8I", 138],
  ].map(([club, carry]) => ({
    club: club as string,
    carry: carry as number,
    category: categoryOf(club as string),
  }));

  it("emits yards prose by default", () => {
    const a = adviseBag(holeBag);
    const hole = a.items.find((i) => i.kind === "hole")!;
    expect(hole.text).toMatch(/yds/);
    expect(hole.text).toMatch(/-yd gap/);
  });

  it("emits meters prose with a meters formatter", () => {
    const a = adviseBag(holeBag, makeFormatter("meters", "mph"));
    const hole = a.items.find((i) => i.kind === "hole")!;
    expect(hole.text).toMatch(/ m\b/);
    expect(hole.text).toMatch(/-m gap/);
    expect(hole.text).not.toMatch(/yds/);
  });
});
