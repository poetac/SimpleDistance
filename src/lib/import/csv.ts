// Client-side CSV parsing (papaparse) into a RawTable. Kept thin so the pure,
// testable transform logic stays in transform.ts.

import Papa from "papaparse";
import type { RawTable } from "./adapter";

export function parseCsvText(text: string): RawTable {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const headers =
    result.meta.fields?.map((f) => f.trim()) ?? Object.keys(result.data[0] ?? {});
  return { headers, rows: result.data };
}

export function parseCsvFile(file: File): Promise<RawTable> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        const headers =
          result.meta.fields?.map((f) => f.trim()) ??
          Object.keys(result.data[0] ?? {});
        resolve({ headers, rows: result.data });
      },
      error: (err) => reject(err),
    });
  });
}

/** Collect numeric values for a given header, for unit detection. */
export function columnValues(table: RawTable, header?: string): number[] {
  if (!header) return [];
  return table.rows
    .map((r) => Number(String(r[header] ?? "").replace(/[^0-9.\-]/g, "")))
    .filter((v) => Number.isFinite(v));
}
