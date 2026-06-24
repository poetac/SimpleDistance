import { describe, it, expect } from "vitest";
import { classifyExclusions, cleanValues } from "./exclusion";
import { DEFAULT_SETTINGS, type Shot } from "./domain/types";

function shot(id: string, carry: number, excluded?: boolean): Shot {
  return { id, club: "7I", sessionId: "s1", carryYards: carry, excluded };
}

describe("per-shot exclusion (tri-state)", () => {
  const base = [160, 161, 162, 163, 164, 165].map((c, i) => shot(`a${i}`, c));

  it("includes clean shots and auto-excludes a mishit when enabled", () => {
    const shots = [...base, shot("mishit", 90)];
    const res = classifyExclusions(shots, DEFAULT_SETTINGS);
    const mishit = res.find((e) => e.shot.id === "mishit")!;
    expect(mishit.excluded).toBe(true);
    expect(mishit.reason).toBe("auto-outlier");
    expect(cleanValues(shots, DEFAULT_SETTINGS)).not.toContain(90);
  });

  it("respects a manual force-exclude on an otherwise clean shot", () => {
    const shots = [...base, shot("x", 163, true)];
    const res = classifyExclusions(shots, DEFAULT_SETTINGS);
    const x = res.find((e) => e.shot.id === "x")!;
    expect(x.excluded).toBe(true);
    expect(x.reason).toBe("manual-exclude");
  });

  it("respects a manual force-include even on an outlier", () => {
    const shots = [...base, shot("keep", 90, false)];
    const res = classifyExclusions(shots, DEFAULT_SETTINGS);
    const keep = res.find((e) => e.shot.id === "keep")!;
    expect(keep.excluded).toBe(false);
    expect(keep.reason).toBe("manual-include");
    expect(cleanValues(shots, DEFAULT_SETTINGS)).toContain(90);
  });

  it("does not auto-exclude when outlier exclusion is off", () => {
    const shots = [...base, shot("mishit", 90)];
    const res = classifyExclusions(shots, { ...DEFAULT_SETTINGS, excludeOutliers: false });
    expect(res.find((e) => e.shot.id === "mishit")!.excluded).toBe(false);
  });

  it("supports the robust-z (MAD) outlier method", () => {
    const shots = [...base, shot("mishit", 90)];
    const res = classifyExclusions(shots, { ...DEFAULT_SETTINGS, outlierMethod: "robustz" });
    const mishit = res.find((e) => e.shot.id === "mishit")!;
    expect(mishit.excluded).toBe(true);
    expect(mishit.reason).toBe("auto-outlier");
  });

  it("flags shots missing the chosen metric as no-metric (not counted as outliers)", () => {
    const noMetric: Shot = { id: "n", club: "7I", sessionId: "s1", totalYards: 170 };
    const res = classifyExclusions([...base, noMetric], DEFAULT_SETTINGS);
    const n = res.find((e) => e.shot.id === "n")!;
    expect(n.excluded).toBe(true);
    expect(n.reason).toBe("no-metric");
  });
});
