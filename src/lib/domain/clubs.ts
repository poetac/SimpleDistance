// Club identity, normalization and ordering.
//
// Clubs are normalized to canonical ids so that "5i", "5 Iron", "Iron 5", "I5"
// all collapse to "5I". Woods/hybrids/wedges are handled too. Wedges are keyed
// by loft (e.g. "52", "56", "60") when expressed that way.

import type { ClubId } from "./types";

/**
 * Canonical ordering of clubs from longest (driver) to shortest (LW).
 * Used to order the bag and to compute gaps between *adjacent* clubs.
 * The `order` index increases as expected carry decreases.
 */
export const CANONICAL_CLUB_ORDER: ClubId[] = [
  "DR",
  "3W",
  "5W",
  "7W",
  "2H",
  "3H",
  "4H",
  "5H",
  "1I",
  "2I",
  "3I",
  "4I",
  "5I",
  "6I",
  "7I",
  "8I",
  "9I",
  "PW",
  "AW", // gap/approach wedge
  "48",
  "50",
  "52",
  "54",
  "56",
  "58",
  "60",
  "GW",
  "SW",
  "LW",
];

export function clubOrderIndex(club: ClubId): number {
  const idx = CANONICAL_CLUB_ORDER.indexOf(club);
  // Unknown clubs sort to the end but keep a stable order.
  return idx === -1 ? CANONICAL_CLUB_ORDER.length : idx;
}

/** Human-friendly label for a canonical club id. */
export function clubLabel(club: ClubId): string {
  const map: Record<string, string> = {
    DR: "Driver",
    "3W": "3 Wood",
    "5W": "5 Wood",
    "7W": "7 Wood",
    "2H": "2 Hybrid",
    "3H": "3 Hybrid",
    "4H": "4 Hybrid",
    "5H": "5 Hybrid",
    PW: "Pitching Wedge",
    AW: "Approach Wedge",
    GW: "Gap Wedge",
    SW: "Sand Wedge",
    LW: "Lob Wedge",
  };
  if (map[club]) return map[club];
  if (/^\d+I$/.test(club)) return `${club.slice(0, -1)} Iron`;
  if (/^\d{2}$/.test(club)) return `${club}° Wedge`;
  return club;
}

export type ClubCategory = "driver" | "wood" | "hybrid" | "iron" | "wedge";

/** Coarse category for a canonical club id, used to scope gapping advice. */
export function categoryOf(club: ClubId): ClubCategory {
  if (club === "DR") return "driver";
  if (/^\dW$/.test(club)) return "wood";
  if (/^\dH$/.test(club)) return "hybrid";
  if (/^\dI$/.test(club)) return "iron";
  if (/^\d{2}$/.test(club)) return "wedge";
  if (["PW", "AW", "GW", "SW", "LW"].includes(club)) return "wedge";
  return "iron";
}

const WORD_NUMBERS: Record<string, string> = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
};

/**
 * Normalize a raw club label to a canonical ClubId.
 * Returns null when the label can't be confidently interpreted, so callers can
 * route it to the alias-mapping UI instead of guessing.
 *
 * The optional `aliases` map (raw -> canonical, case-insensitive) is consulted
 * first so user overrides always win.
 */
export function normalizeClub(
  raw: string,
  aliases?: Record<string, ClubId>,
): ClubId | null {
  if (!raw) return null;
  const original = raw.trim();
  const key = original.toLowerCase();

  if (aliases && aliases[key]) return aliases[key];

  // Spell out word-numbers ("five iron" -> "5 iron").
  let s = key;
  for (const [word, digit] of Object.entries(WORD_NUMBERS)) {
    s = s.replace(new RegExp(`\\b${word}\\b`, "g"), digit);
  }
  // Hyphens/underscores act as separators ("3-iron", "pitching_wedge").
  s = s.replace(/[-_]+/g, " ").replace(/[°º]/g, "").replace(/\s+/g, " ").trim();

  // Driver
  if (/\b(driver|dr|d)\b/.test(s) || s === "1w") return "DR";

  // Woods: "3 wood", "3w", "wood 3", "fairway 3"
  const wood = s.match(/\b(\d)\s*(?:w|wd|wood)\b/) || s.match(/\bwood\s*(\d)\b/);
  if (wood) return `${wood[1]}W`;

  // Hybrids / rescues
  const hybrid =
    s.match(/\b(\d)\s*(?:h|hy|hyb|hybrid|rescue|util|utility)\b/) ||
    s.match(/\b(?:hybrid|rescue)\s*(\d)\b/);
  if (hybrid) return `${hybrid[1]}H`;

  // Driving iron / utility iron -> treat as a 1-iron slot.
  if (/\b(driving\s*iron|utility\s*iron|di)\b/.test(s)) return "1I";

  // Named wedges
  if (/\b(pw|pitching wedge|p\.?w\.?)\b/.test(s) || s === "p") return "PW";
  if (/\b(aw|approach wedge|a\.?w\.?)\b/.test(s)) return "AW";
  if (/\b(gw|gap wedge|g\.?w\.?)\b/.test(s)) return "GW";
  if (/\b(sw|sand wedge|s\.?w\.?)\b/.test(s)) return "SW";
  if (/\b(lw|lob wedge|l\.?w\.?)\b/.test(s)) return "LW";

  // Loft-keyed wedges: "52", "56°", "60 deg", "wedge 56" (45°–64°)
  const loft =
    s.match(/\b(4[5-9]|5\d|6[0-4])\s*(?:deg|degree|degrees|°|wedge|w)?\b/) ||
    s.match(/\bwedge\s*(4[5-9]|5\d|6[0-4])\b/);
  if (loft) return loft[1];

  // Irons: "5 iron", "5i", "iron 5", "i5", just "5"
  const iron =
    s.match(/\b(\d)\s*(?:i|ir|iron)\b/) ||
    s.match(/\biron\s*(\d)\b/) ||
    s.match(/^i\s*(\d)$/) ||
    s.match(/^(\d)$/);
  if (iron) {
    const n = Number(iron[1]);
    if (n >= 1 && n <= 9) return `${n}I`;
  }

  return null;
}
