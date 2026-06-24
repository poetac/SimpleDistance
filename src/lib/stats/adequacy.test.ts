import { describe, it, expect } from "vitest";
import { classifyAdequacy } from "./adequacy";
import { MIN_SHOTS_LOW_CONFIDENCE, MIN_SHOTS_TRUSTWORTHY } from "./constants";

describe("sample-size adequacy", () => {
  it("classifies below low-confidence threshold as insufficient", () => {
    const v = classifyAdequacy(MIN_SHOTS_LOW_CONFIDENCE - 1);
    expect(v.level).toBe("insufficient");
  });

  it("classifies the middle band as low", () => {
    const v = classifyAdequacy(MIN_SHOTS_LOW_CONFIDENCE);
    expect(v.level).toBe("low");
  });

  it("classifies at/above trustworthy threshold as trustworthy", () => {
    const v = classifyAdequacy(MIN_SHOTS_TRUSTWORTHY);
    expect(v.level).toBe("trustworthy");
  });

  it("weaves in a shots-needed hint", () => {
    const v = classifyAdequacy(MIN_SHOTS_TRUSTWORTHY, 5);
    expect(v.message).toMatch(/5 more/);
  });
});
