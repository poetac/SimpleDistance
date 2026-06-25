import { describe, it, expect } from "vitest";
import { deliveryConsistency } from "./delivery";

describe("delivery consistency", () => {
  it("calls a repeatable strike tight", () => {
    const d = deliveryConsistency({
      spin: [6500, 6550, 6480, 6520, 6510],
      launch: [17, 17.2, 16.9, 17.1, 17.0],
    });
    expect(d.spinBand).toBe("tight");
    expect(d.launchBand).toBe("tight");
  });

  it("flags a wildly variable spin as variable", () => {
    const d = deliveryConsistency({
      spin: [4000, 8000, 5000, 9000, 6000],
      launch: [12, 22, 14, 20, 16],
    });
    expect(d.spinBand).toBe("variable");
    expect(d.note).toMatch(/inconsistent strike|watching contact/i);
  });

  it("degrades without data", () => {
    expect(deliveryConsistency({}).note).toMatch(/No spin\/launch/);
  });
});
