// Auto column-mapping: match source headers to canonical fields using preset
// hints first, then the per-field detection regexes.

import { CANONICAL_FIELDS, type CanonicalField } from "./schema";
import { getPreset, PRESETS, type ImportPreset } from "./presets";

export type ColumnMapping = Partial<Record<CanonicalField, string>>;

/** Normalize a header for fuzzy comparison. */
export function normHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Guess which preset a file came from by how many of its header hints match.
 * Returns the best preset id, or undefined if nothing matches well.
 */
export function detectPreset(headers: string[]): string | undefined {
  const normSet = new Set(headers.map(normHeader));
  let best: { id: string; fieldScore: number; score: number } | undefined;
  for (const preset of PRESETS) {
    let fieldScore = 0;
    for (const candidates of Object.values(preset.headers)) {
      if ((candidates as string[]).some((c) => normSet.has(normHeader(c)))) {
        fieldScore++;
      }
    }
    // Vendor fingerprint headers count heavily so look-alikes don't win on overlap.
    const sigScore = (preset.signature ?? []).filter((h) =>
      normSet.has(normHeader(h)),
    ).length;
    const score = fieldScore + 3 * sigScore;
    if (!best || score > best.score) best = { id: preset.id, fieldScore, score };
  }
  // Require at least two real field matches to claim a preset.
  return best && best.fieldScore >= 2 ? best.id : undefined;
}

/**
 * Build a column mapping from a header list.
 * Priority: preset exact header hints → field detection regexes.
 */
export function autoDetectMapping(
  headers: string[],
  presetId?: string,
): { mapping: ColumnMapping; preset?: ImportPreset } {
  const mapping: ColumnMapping = {};
  const usedHeaders = new Set<string>();
  const preset = presetId ? getPreset(presetId) : undefined;

  // 1. Preset header hints (exact, normalized).
  if (preset) {
    const normToOriginal = new Map(headers.map((h) => [normHeader(h), h]));
    for (const [field, candidates] of Object.entries(preset.headers)) {
      for (const cand of candidates as string[]) {
        const orig = normToOriginal.get(normHeader(cand));
        if (orig && !usedHeaders.has(orig)) {
          mapping[field as CanonicalField] = orig;
          usedHeaders.add(orig);
          break;
        }
      }
    }
  }

  // 2. Detection regexes for anything still unmapped.
  for (const def of CANONICAL_FIELDS) {
    if (mapping[def.key]) continue;
    const match = headers.find(
      (h) => !usedHeaders.has(h) && def.detect.some((re) => re.test(h)),
    );
    if (match) {
      mapping[def.key] = match;
      usedHeaders.add(match);
    }
  }

  return { mapping, preset };
}
