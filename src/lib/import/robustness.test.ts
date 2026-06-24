import { describe, it, expect } from "vitest";
import { parseCsvText } from "./csv";
import { autoDetectMapping } from "./mapping";
import { rowsToShots } from "./transform";
import { importSanity } from "./sanity";
import type { Shot } from "../domain/types";

function parseAndTransform(text: string, unit: "yards" | "meters" = "yards") {
  const table = parseCsvText(text);
  const { mapping } = autoDetectMapping(table.headers);
  return {
    table,
    ...rowsToShots(table, mapping, { distanceUnit: unit, speedUnit: "mph", source: "x" }),
  };
}

describe("import robustness — delimiters, BOM, ragged rows", () => {
  it("auto-detects a semicolon delimiter with European decimals", () => {
    const res = parseAndTransform("Club;Carry\n7 Iron;150,5\n6 Iron;162,0");
    expect(res.table.headers).toEqual(["Club", "Carry"]);
    expect(res.shots).toHaveLength(2);
    expect(res.shots[0].carryYards).toBeCloseTo(150.5, 1);
  });

  it("handles a tab-separated file", () => {
    const res = parseAndTransform("Club\tCarry\n7 Iron\t162");
    expect(res.shots[0].club).toBe("7I");
    expect(res.shots[0].carryYards).toBeCloseTo(162, 0);
  });

  it("strips a UTF-8 BOM from the first header", () => {
    const res = parseAndTransform("﻿Club,Carry\n7 Iron,162");
    expect(res.table.headers[0]).toBe("Club");
    expect(res.shots).toHaveLength(1);
  });

  it("tolerates ragged rows and blank lines", () => {
    const res = parseAndTransform(
      "Club,Carry,Total\n7 Iron,162\n\n  \nPW,126,132\n",
    );
    expect(res.shots).toHaveLength(2);
    expect(res.shots[1].totalYards).toBeCloseTo(132, 0);
  });

  it("parses L/R side suffixes into signed yards (+ = right)", () => {
    const res = parseAndTransform(
      "Club,Carry,Side\n7 Iron,162,3.2 R\n7 Iron,160,4.1 L\n7 Iron,161,2.0",
    );
    expect(res.shots[0].sideYards).toBeCloseTo(3.2, 1);
    expect(res.shots[1].sideYards).toBeCloseTo(-4.1, 1);
    expect(res.shots[2].sideYards).toBeCloseTo(2.0, 1);
  });

  it("drops exact within-file duplicate rows", () => {
    const res = parseAndTransform(
      "Club,Carry,Ball Speed\n7 Iron,162,113\n7 Iron,162,113\n6 Iron,178,117",
    );
    expect(res.shots).toHaveLength(2);
    expect(res.skipReasons.duplicate).toBe(1);
  });

  it("derives the session from a normalized timestamp", () => {
    const res = parseAndTransform(
      "Club,Carry,Date\n7 Iron,162,2026-05-18T10:00:00\n6 Iron,178,2026-05-18T10:01:00",
    );
    expect(res.shots[0].sessionId).toBe("2026-05-18");
  });

  it("reports categorized skip reasons", () => {
    const res = parseAndTransform(
      "Club,Carry\n7 Iron,162\n,150\nbanana stick,140\nPW,\n",
    );
    expect(res.shots).toHaveLength(1); // only the 7 Iron
    expect(res.skipReasons.missingClub).toBe(1);
    expect(res.skipReasons.unrecognizedClub).toBe(1);
    expect(res.skipReasons.missingDistance).toBe(1);
  });
});

describe("import fuzz / property test", () => {
  function mulberry32(seed: number) {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rng = mulberry32(42);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
  const clubs = ["7 Iron", "PW", "Driver", "56", "5i", "", "banana", "  ", "3-wood"];
  const nums = ["162", "150,5", "-3", "3.2 R", "4 L", "", "abc", "1,234.5", "999999", "0"];

  it("never throws and keeps shots + skipped == rows on random messy input", () => {
    const headers = ["Club", "Carry", "Total", "Ball Speed", "Side", "Date"];
    for (let iter = 0; iter < 200; iter++) {
      const rows = Array.from({ length: Math.floor(rng() * 8) }, () => ({
        Club: pick(clubs),
        Carry: pick(nums),
        Total: pick(nums),
        "Ball Speed": pick(nums),
        Side: pick(nums),
        Date: pick(["2026-05-18", "1609459200", "junk", ""]),
      }));
      const { mapping } = autoDetectMapping(headers);
      const res = rowsToShots({ headers, rows }, mapping, {
        distanceUnit: "yards",
        speedUnit: "mph",
        source: "fuzz",
      });
      // Every row is either a shot or counted as skipped — exactly once.
      expect(res.shots.length + res.rowsSkipped).toBe(rows.length);
      // No shot has a negative carry/total (those are rejected).
      for (const s of res.shots) {
        expect((s.carryYards ?? 0) >= 0).toBe(true);
        expect((s.totalYards ?? 0) >= 0).toBe(true);
        expect(s.club).toBeTruthy();
      }
    }
  });
});

describe("import sanity checks", () => {
  function shot(club: string, carry: number): Shot {
    return { id: Math.random().toString(), club, sessionId: "s", carryYards: carry };
  }

  it("flags an implausible per-club mean (likely wrong column/unit)", () => {
    const shots = [shot("PW", 600), shot("PW", 590), shot("PW", 610)];
    const warnings = importSanity(shots);
    expect(warnings.some((w) => /Pitching Wedge averages/.test(w))).toBe(true);
  });

  it("flags carries beyond the plausible ceiling", () => {
    const warnings = importSanity([shot("DR", 999)]);
    expect(warnings.some((w) => /over 400 yds/.test(w))).toBe(true);
  });

  it("is silent on a normal bag", () => {
    const shots = [
      shot("DR", 265),
      shot("DR", 270),
      shot("DR", 268),
      shot("7I", 160),
      shot("7I", 162),
      shot("7I", 158),
    ];
    expect(importSanity(shots)).toHaveLength(0);
  });
});
