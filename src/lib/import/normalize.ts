// Timestamp and signed-value normalization for messy exports.

/**
 * Normalize a timestamp into an ISO string + a YYYY-MM-DD date (used for the
 * session key). Handles ISO, common date-time strings, and epoch seconds/ms.
 * Falls back to the raw value when it can't be parsed (never throws).
 */
export function normalizeTimestamp(raw?: string): { iso?: string; date?: string } {
  if (raw == null) return {};
  const s = raw.trim();
  if (s === "") return {};

  // Epoch seconds or milliseconds.
  if (/^\d{9,}$/.test(s)) {
    const n = Number(s);
    const ms = s.length >= 12 ? n : n * 1000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) {
      const iso = d.toISOString();
      return { iso, date: iso.slice(0, 10) };
    }
  }

  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) {
    const iso = new Date(parsed).toISOString();
    return { iso, date: iso.slice(0, 10) };
  }

  // Unparseable: keep the original, derive a best-effort date prefix.
  const dateMatch = s.match(/\d{4}-\d{2}-\d{2}/);
  return { iso: s, date: dateMatch ? dateMatch[0] : s.slice(0, 10) };
}
