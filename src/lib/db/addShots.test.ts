// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { addShots, getAllShots, clearAllShots, putShot } from "./index";
import type { Shot } from "../domain/types";

function shot(overrides: Partial<Shot> = {}): Shot {
  return {
    id: "trackman-abc",
    club: "7I",
    sessionId: "2026-06-25",
    carryYards: 162,
    totalYards: 170,
    ...overrides,
  };
}

describe("addShots idempotent re-import", () => {
  beforeEach(async () => {
    await clearAllShots();
  });

  it("overwrites a shot with the same id instead of duplicating it", async () => {
    await addShots([shot()]);
    await addShots([shot({ carryYards: 163 })]); // same id, re-imported
    const all = await getAllShots();
    expect(all).toHaveLength(1);
    expect(all[0].carryYards).toBe(163);
  });

  it("preserves a user's manual exclude override on re-import", async () => {
    await addShots([shot()]);
    await putShot(shot({ excluded: true })); // user force-excludes it
    await addShots([shot({ carryYards: 164 })]); // CSV re-import (no excluded)
    const all = await getAllShots();
    expect(all).toHaveLength(1);
    expect(all[0].excluded).toBe(true); // override survived
    expect(all[0].carryYards).toBe(164); // data still refreshed
  });

  it("lets an explicit override in the incoming shot win", async () => {
    await putShot(shot({ excluded: true }));
    await addShots([shot({ excluded: false })]);
    const all = await getAllShots();
    expect(all[0].excluded).toBe(false);
  });
});
