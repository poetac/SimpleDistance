import { describe, it, expect } from "vitest";
import { bagCoverage } from "./coverage";

describe("bag coverage", () => {
  it("fully covers an evenly-gapped set", () => {
    const c = bagCoverage([123, 135, 147, 159, 171, 183, 195], 12);
    expect(c.minCarry).toBe(123);
    expect(c.maxCarry).toBe(195);
    expect(c.deadZones).toHaveLength(0);
    expect(c.coverage).toBeCloseTo(1, 5);
  });

  it("finds a dead zone where a large gap exceeds twice the control radius", () => {
    // 12-yd typical gap -> control radius ~7.2; a 40-yd jump opens a dead zone.
    const c = bagCoverage([120, 132, 144, 184, 196], 12);
    expect(c.deadZones.length).toBe(1);
    expect(c.deadZones[0].fromYards).toBeGreaterThan(144);
    expect(c.deadZones[0].toYards).toBeLessThan(184);
    expect(c.coverage).toBeLessThan(1);
  });

  it("uses a control-radius floor for tiny typical gaps", () => {
    const c = bagCoverage([100, 110, 120], 1);
    expect(c.controlRadius).toBeGreaterThanOrEqual(8);
  });

  it("handles fewer than two clubs", () => {
    expect(bagCoverage([150], 12).coverage).toBe(1);
    expect(bagCoverage([], 12).deadZones).toHaveLength(0);
  });
});
