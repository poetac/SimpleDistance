import { describe, it, expect } from "vitest";
import { normalizeTimestamp } from "./normalize";

describe("timestamp normalization", () => {
  it("normalizes an ISO datetime to a date", () => {
    const r = normalizeTimestamp("2026-05-18T10:00:00");
    expect(r.date).toBe("2026-05-18");
    expect(r.iso).toMatch(/^2026-05-18T/);
  });

  it("parses epoch seconds and milliseconds", () => {
    expect(normalizeTimestamp("1609459200").date).toBe("2021-01-01"); // seconds
    expect(normalizeTimestamp("1609459200000").date).toBe("2021-01-01"); // ms
  });

  it("parses a common US date string", () => {
    expect(normalizeTimestamp("01/15/2026").date).toBe("2026-01-15");
  });

  it("keeps unparseable input without throwing", () => {
    const r = normalizeTimestamp("not a date");
    expect(r.iso).toBe("not a date");
    expect(r).toBeDefined();
  });

  it("handles empty/undefined", () => {
    expect(normalizeTimestamp(undefined).iso).toBeUndefined();
    expect(normalizeTimestamp("   ").iso).toBeUndefined();
  });
});
