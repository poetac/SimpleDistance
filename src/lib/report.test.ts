import { describe, it, expect } from "vitest";
import { buildBagReport } from "./report";
import { analyzeBag } from "./analysis";
import { generateSeedShots } from "./db/seed";
import { DEFAULT_SETTINGS } from "./domain/types";
import { makeFormatter } from "./format";

describe("bag report", () => {
  const bag = analyzeBag(generateSeedShots(), DEFAULT_SETTINGS);

  it("produces a markdown report with the key sections", () => {
    const md = buildBagReport(bag, makeFormatter("yards", "mph"), "2026-06-24");
    expect(md).toMatch(/^# SimpleDistance — Bag Report/);
    expect(md).toContain("## Stock yardages");
    expect(md).toContain("## Bag structure");
    expect(md).toContain("## Bag optimizer");
    expect(md).toContain("## Recommendations");
    expect(md).toContain("5 Iron");
    expect(md).toContain("Generated 2026-06-24");
    expect(md).toMatch(/decision support, not a club fitting/);
  });

  it("renders distances in the chosen display unit", () => {
    const yd = buildBagReport(bag, makeFormatter("yards", "mph"), "d");
    const m = buildBagReport(bag, makeFormatter("meters", "ms"), "d");
    expect(yd).toContain("Mean (yds)");
    expect(m).toContain("Mean (m)");
    expect(m).not.toContain("Mean (yds)");
  });
});
