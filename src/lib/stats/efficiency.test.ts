import { describe, it, expect } from "vitest";
import { strikeEfficiency } from "./efficiency";

describe("strike efficiency", () => {
  it("flags a low-smash iron as a strike-quality hypothesis", () => {
    const e = strikeEfficiency([1.15, 1.18, 1.16, 1.17], "iron");
    expect(e.flagged).toBe(true);
    expect(e.note).toMatch(/off-centre|contact|below/i);
  });

  it("does not flag an efficient driver", () => {
    const e = strikeEfficiency([1.48, 1.49, 1.47, 1.5], "driver");
    expect(e.flagged).toBe(false);
    expect(e.note).toMatch(/typical|efficient/i);
  });

  it("degrades without enough data", () => {
    const e = strikeEfficiency([1.4], "iron");
    expect(e.flagged).toBe(false);
    expect(e.note).toMatch(/Not enough/);
  });
});
