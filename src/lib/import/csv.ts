// Client-side CSV parsing (papaparse) into a RawTable. Kept thin so the pure,
// testable transform logic stays in transform.ts.

import Papa from "papaparse";
import type { RawTable } from "./adapter";

// Delimiters we let papaparse choose between: comma, semicolon (European),
// tab (TSV), and pipe. Auto-guessing keeps the import resilient to exports that
// don't use a comma.
const DELIMITERS_TO_GUESS = [",", ";", "\t", "|"];

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

const PARSE_OPTS = {
  header: true as const,
  skipEmptyLines: "greedy" as const,
  delimitersToGuess: DELIMITERS_TO_GUESS,
  transformHeader: (h: string) => stripBom(h).trim(),
};

function toTable(result: Papa.ParseResult<Record<string, string>>): RawTable {
  const headers =
    result.meta.fields?.map((f) => stripBom(f).trim()) ??
    Object.keys(result.data[0] ?? {});
  return { headers, rows: result.data };
}

export function parseCsvText(text: string): RawTable {
  return toTable(Papa.parse<Record<string, string>>(stripBom(text), PARSE_OPTS));
}

export function parseCsvFile(file: File): Promise<RawTable> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      ...PARSE_OPTS,
      complete: (result) => resolve(toTable(result)),
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
