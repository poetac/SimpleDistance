import { describe, it, expect } from "vitest";
import {
  metersToYards,
  yardsToMeters,
  msToMph,
  kmhToMph,
  detectDistanceUnit,
  detectSpeedUnit,
} from "./units";

describe("unit conversions", () => {
  it("meters <-> yards round-trip", () => {
    expect(metersToYards(100)).toBeCloseTo(109.361, 2);
    expect(yardsToMeters(109.361)).toBeCloseTo(100, 2);
  });
  it("m/s and km/h to mph", () => {
    expect(msToMph(50)).toBeCloseTo(111.847, 2);
    expect(kmhToMph(100)).toBeCloseTo(62.137, 2);
  });
});

describe("unit detection", () => {
  it("honors header hints over heuristics", () => {
    expect(detectDistanceUnit([100, 120], "Carry (m)")).toBe("meters");
    expect(detectDistanceUnit([100, 120], "Carry (yds)")).toBe("yards");
    expect(detectSpeedUnit([50, 55], "Ball Speed (m/s)")).toBe("ms");
    expect(detectSpeedUnit([160, 170], "Ball Speed (km/h)")).toBe("kmh");
  });

  it("detects speed unit by magnitude when no header hint", () => {
    expect(detectSpeedUnit([45, 50, 55])).toBe("ms"); // too slow for mph ball speed
    expect(detectSpeedUnit([150, 160, 170])).toBe("mph");
    expect(detectSpeedUnit([250, 270, 300])).toBe("kmh");
  });
});
