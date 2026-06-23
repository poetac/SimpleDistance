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
