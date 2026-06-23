// Canonical domain types for SimpleDistance.
// These mirror the canonical shot schema described in PROMPT.md. Every metric
// beyond `club` + a distance is optional and must degrade gracefully when absent.

/** A canonical club identifier after normalization, e.g. "5I", "PW", "52", "DR". */
export type ClubId = string;

/** Distance unit as found in a source file, before normalization to yards. */
export type DistanceUnit = "yards" | "meters";

/** Speed unit as found in a source file, before normalization to mph. */
export type SpeedUnit = "mph" | "ms" | "kmh";

/**
 * A single golf shot, normalized to the canonical schema.
 * Distances are stored in YARDS, speeds in MPH, angles in DEGREES.
 */
export interface Shot {
  id: string;
  /** Normalized canonical club id (see normalizeClub). */
  club: ClubId;
  /** Original club label from the source, kept for transparency. */
  rawClub?: string;
  /** ISO timestamp if known. */
  timestamp?: string;
  /** Grouping key for shots hit in the same range/session. */
  sessionId: string;

  // Distances (yards)
  carryYards?: number;
  totalYards?: number;
  sideYards?: number;
  apexFt?: number;

  // Speeds (mph)
  ballSpeedMph?: number;
  clubSpeedMph?: number;
  smashFactor?: number;

  // Angles (degrees)
  launchAngleDeg?: number;
  spinRpm?: number;
  launchDirectionDeg?: number;
  descentAngleDeg?: number;

  /** Source adapter / preset id that produced this shot. */
  source?: string;
  /** Marked as a mishit/outlier by the outlier detector at import or by the user. */
  excluded?: boolean;
}

/** A persisted import session (a CSV the user brought in). */
export interface ImportRecord {
  id: string;
  source: string;
  fileName: string;
  importedAt: string;
  shotCount: number;
  /** The column mapping used, persisted so re-imports are one click. */
  mapping: Record<string, string>;
}

/** User-editable alias mapping raw club label -> canonical club id. */
export interface ClubAlias {
  raw: string;
  club: ClubId;
}

/** Which distance metric to analyze. */
export type YardageMetric = "carry" | "total";

export interface AppSettings {
  /** Primary yardage metric (default carry). */
  metric: YardageMetric;
  /** Whether automatic outlier exclusion is applied in analysis. */
  excludeOutliers: boolean;
  /** Target CI half-width in yards used for the shots-needed estimate. */
  targetCiHalfWidthYards: number;
  /** Independent sessions a deviation must persist across to be a "real trend". */
  trendMinSessions: number;
  /** Per-session deviation size (in standard errors) to count as "strong". */
  trendDeviationSE: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  metric: "carry",
  excludeOutliers: true,
  targetCiHalfWidthYards: 2,
  // Defaults mirror the named constants in stats/constants.ts.
  trendMinSessions: 2,
  trendDeviationSE: 1.5,
};
