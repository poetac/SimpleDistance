// Concrete built-in adapters, registered on import. These demonstrate that the
// ImportAdapter seam is real: each preset becomes a file adapter that reuses the
// shared auto-mapping + transform, and a generic CSV adapter covers unknown
// sources. A future vendor auto-import implements the same interface and
// registers itself here — no pipeline changes required.

import { PRESETS, getPreset } from "./presets";
import {
  registerAdapter,
  getAdapter,
  listAdapters,
  exampleAutoAdapterStub,
  type ImportAdapter,
  type RawTable,
} from "./adapter";
import { autoDetectMapping, detectPreset } from "./mapping";
import { rowsToShots } from "./transform";

function makeFileAdapter(presetId: string): ImportAdapter {
  const preset = getPreset(presetId)!;
  return {
    id: `${presetId}-csv`,
    label: `${preset.label} CSV`,
    kind: "file",
    detect: (table) => detectPreset(table.headers) === presetId,
    parse: (table, ctx) => {
      const mapping =
        ctx.mappingOverride ?? autoDetectMapping(table.headers, presetId).mapping;
      const distanceUnit = ctx.distanceUnit ?? preset.distanceUnit;
      const speedUnit = ctx.speedUnit ?? preset.speedUnit;
      const res = rowsToShots(table, mapping, {
        distanceUnit,
        speedUnit,
        source: presetId,
        aliases: ctx.aliases,
        fallbackSessionId: ctx.fallbackSessionId,
      });
      return {
        shots: res.shots,
        warnings: res.warnings,
        mapping,
        distanceUnit,
        speedUnit,
        rowsSkipped: res.rowsSkipped,
        skipReasons: res.skipReasons,
        unmappedClubs: res.unmappedClubs,
      };
    },
  };
}

/** Fallback adapter for files that don't match any preset. */
const genericCsvAdapter: ImportAdapter = {
  id: "csv",
  label: "Generic CSV",
  kind: "file",
  parse: (table, ctx) => {
    const mapping = ctx.mappingOverride ?? autoDetectMapping(table.headers).mapping;
    const distanceUnit = ctx.distanceUnit ?? "yards";
    const speedUnit = ctx.speedUnit ?? "mph";
    const res = rowsToShots(table, mapping, {
      distanceUnit,
      speedUnit,
      source: "csv",
      aliases: ctx.aliases,
      fallbackSessionId: ctx.fallbackSessionId,
    });
    return {
      shots: res.shots,
      warnings: res.warnings,
      mapping,
      distanceUnit,
      speedUnit,
      rowsSkipped: res.rowsSkipped,
      skipReasons: res.skipReasons,
      unmappedClubs: res.unmappedClubs,
    };
  },
};

let registered = false;
export function registerBuiltinAdapters(): void {
  if (registered) return;
  for (const preset of PRESETS) registerAdapter(makeFileAdapter(preset.id));
  registerAdapter(genericCsvAdapter);
  registerAdapter(exampleAutoAdapterStub);
  registered = true;
}

/**
 * Pick the file adapter for a table: the first preset adapter whose detect()
 * fingerprints the headers, else the generic CSV adapter. This is how the
 * import flow routes through the registry without hardcoding sources.
 */
export function detectFileAdapter(table: RawTable): ImportAdapter {
  registerBuiltinAdapters();
  const hit = listAdapters().find(
    (a) => a.kind === "file" && a.id !== "csv" && a.detect?.(table),
  );
  return hit ?? getAdapter("csv")!;
}

/** The preset id for an adapter, or "" for the generic CSV adapter. */
export function presetIdForAdapter(adapter: ImportAdapter): string {
  return adapter.id === "csv" ? "" : adapter.id.replace(/-csv$/, "");
}
