// Concrete built-in adapters, registered on import. These demonstrate that the
// ImportAdapter seam is real: each preset becomes a file adapter that reuses the
// shared auto-mapping + transform. A future vendor auto-import implements the
// same interface and registers itself here — no pipeline changes required.

import { PRESETS } from "./presets";
import {
  registerAdapter,
  exampleAutoAdapterStub,
  type ImportAdapter,
} from "./adapter";
import { autoDetectMapping, detectPreset } from "./mapping";
import { rowsToShots } from "./transform";

function makeFileAdapter(presetId: string): ImportAdapter {
  const preset = PRESETS.find((p) => p.id === presetId)!;
  return {
    id: `${presetId}-csv`,
    label: `${preset.label} CSV`,
    kind: "file",
    detect: (table) => detectPreset(table.headers) === presetId,
    parse: (table, ctx) => {
      const { mapping } = autoDetectMapping(table.headers, presetId);
      const res = rowsToShots(table, mapping, {
        distanceUnit: preset.distanceUnit,
        speedUnit: preset.speedUnit,
        source: presetId,
        aliases: ctx.aliases,
        fallbackSessionId: ctx.fallbackSessionId,
      });
      return {
        shots: res.shots,
        warnings: res.warnings,
        mapping,
        distanceUnit: preset.distanceUnit,
        speedUnit: preset.speedUnit,
      };
    },
  };
}

let registered = false;
export function registerBuiltinAdapters(): void {
  if (registered) return;
  for (const preset of PRESETS) registerAdapter(makeFileAdapter(preset.id));
  registerAdapter(exampleAutoAdapterStub);
  registered = true;
}
