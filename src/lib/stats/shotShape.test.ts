import { describe, it, expect } from "vitest";
import { shotShape } from "./shotShape";

describe("shot shape (face-to-path)", () => {
  it("calls face closed to an in-to-out path a draw", () => {
    // path +3 (in-to-out), face +1 -> face-to-path -2 -> draw
    const s = shotShape({ face: [1, 1.2, 0.8], path: [3, 3.2, 2.8] });
    expect(s.shape).toBe("draw");
    expect(s.meanFaceToPath!).toBeLessThan(0);
  });

  it("calls face well open to path a slice", () => {
    const s = shotShape({ face: [7, 8, 7.5], path: [0, -1, 0] });
    expect(s.shape).toBe("slice");
    expect(s.label).toMatch(/slice/);
  });

  it("calls near-zero face-to-path straight", () => {
    const s = shotShape({ face: [1, 1, 1], path: [1, 0.5, 1.2] });
    expect(s.shape).toBe("straight");
  });

  it("returns unknown without face or path", () => {
    expect(shotShape({ face: [1, 2] }).shape).toBe("unknown");
    expect(shotShape({}).shape).toBe("unknown");
  });
});
