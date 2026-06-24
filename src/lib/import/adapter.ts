// Pluggable import-source adapters.
//
// This interface is the extension point for future vendor auto-import. We do
// NOT ship live vendor integrations (most consumer trackers lack public APIs).
// To add a source later, implement ImportAdapter and register it — no changes
// to the import pipeline are required. See README "Adding an ImportAdapter".

import type { Shot } from "../domain/types";
import type { CanonicalField } from "./schema";

export interface RawTable {
  headers: string[];
  rows: Record<string, string>[];
}

export interface AdapterContext {
  /** Alias map (raw club label lowercased -> canonical id). */
  aliases?: Record<string, string>;
  /** Session id to assign when the source has none. */
  fallbackSessionId?: string;
  /** User-confirmed column mapping (overrides the adapter's auto-mapping). */
  mappingOverride?: Partial<Record<CanonicalField, string>>;
  /** User-confirmed unit overrides. */
  distanceUnit?: "yards" | "meters";
  speedUnit?: "mph" | "ms" | "kmh";
}

export interface ImportResult {
  shots: Shot[];
  warnings: string[];
  /** The mapping actually used (for persistence / re-import). */
  mapping: Partial<Record<CanonicalField, string>>;
  distanceUnit: "yards" | "meters";
  speedUnit: "mph" | "ms" | "kmh";
  /** Total rows skipped and why (for a clear quarantine report). */
  rowsSkipped?: number;
  skipReasons?: {
    missingClub: number;
    unrecognizedClub: number;
    missingDistance: number;
    duplicate: number;
  };
  unmappedClubs?: string[];
}

export interface ImportAdapter {
  /** Stable id, e.g. "trackman-csv". */
  id: string;
  label: string;
  /** "file" adapters take an uploaded file/table; "auto" adapters fetch live. */
  kind: "file" | "auto";
  /**
   * Whether this adapter recognizes a given table (e.g. by header signature).
   * Used to auto-select a preset on upload.
   */
  detect?(table: RawTable): boolean;
  /** Parse a table into canonical shots. */
  parse(table: RawTable, ctx: AdapterContext): ImportResult;
}

/** Simple in-memory registry so adapters can be added without refactoring. */
const registry = new Map<string, ImportAdapter>();

export function registerAdapter(adapter: ImportAdapter): void {
  registry.set(adapter.id, adapter);
}

export function getAdapter(id: string): ImportAdapter | undefined {
  return registry.get(id);
}

export function listAdapters(): ImportAdapter[] {
  return [...registry.values()];
}

/**
 * STUB: example shape of a future auto-import adapter. It intentionally throws
 * — it exists to document how a live source would slot in without changing the
 * pipeline. Consumer trackers generally have no public API, so this stays a stub.
 */
export const exampleAutoAdapterStub: ImportAdapter = {
  id: "vendor-auto-stub",
  label: "Vendor Auto-Import (stub)",
  kind: "auto",
  parse() {
    throw new Error(
      "Auto-import is not implemented. Implement ImportAdapter.parse() against a vendor API/export and register it.",
    );
  },
};
