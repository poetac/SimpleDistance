import { describe, it, expect } from "vitest";
import { launchEfficiency } from "./launchEfficiency";

describe("launch efficiency", () => {
  it("flags the classic low-launch / high-spin driver pattern", () => {
    const d = launchEfficiency({
      launch: [9, 9.5, 8.8, 9.2, 9.1, 9.4],
      spin: [3400, 3500, 3300, 3600, 3450, 3550],
      category: "driver",
    });
    expect(d.pattern).toBe("low-launch-high-spin");
    expect(d.flagged).toBe(true);
    expect(d.note).toMatch(/costs carry|low-launch, high-spin/i);
  });

  it("calls a well-launched driver optimal", () => {
    const d = launchEfficiency({
      launch: [13, 13.5, 12.8, 13.2, 13.1, 12.9],
      spin: [2400, 2500, 2350, 2450, 2480, 2420],
      category: "driver",
    });
    expect(d.pattern).toBe("optimal");
    expect(d.flagged).toBe(false);
  });

  it("flags high-launch / low-spin as a hold-the-flight hypothesis", () => {
    const d = launchEfficiency({
      launch: [18, 18.5, 17.8, 18.2, 18.1, 17.9],
      spin: [1700, 1750, 1650, 1800, 1720, 1680],
      category: "driver",
    });
    expect(d.pattern).toBe("high-launch-low-spin");
    expect(d.flagged).toBe(true);
  });

  it("does not apply to irons", () => {
    const d = launchEfficiency({
      launch: [17, 18, 16, 17, 18, 17],
      spin: [6000, 6200, 5900, 6100, 6050, 6150],
      category: "iron",
    });
    expect(d.pattern).toBe("n/a");
    expect(d.note).toMatch(/driver and fairway woods/i);
  });

  it("degrades without enough data", () => {
    const d = launchEfficiency({
      launch: [12, 13],
      spin: [2400, 2500],
      category: "driver",
    });
    expect(d.pattern).toBe("n/a");
    expect(d.note).toMatch(/Not enough/i);
  });
});
