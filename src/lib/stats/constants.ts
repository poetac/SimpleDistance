// All statistical thresholds and tuning constants live here as NAMED constants,
// documented in METHODOLOGY.md. Change them in one place to tune the app.

/** Minimum clean shots below which a club's average is "low confidence". */
export const MIN_SHOTS_LOW_CONFIDENCE = 7;

/** At/above this many clean shots a club's average is treated as "trustworthy". */
export const MIN_SHOTS_TRUSTWORTHY = 15;

/** Default target CI half-width (yards) for the "shots needed" estimate. */
export const DEFAULT_TARGET_CI_HALF_WIDTH_YARDS = 2;

/** Confidence level for the t-interval on the mean (two-sided). */
export const CONFIDENCE_LEVEL = 0.95;

/** IQR multiplier for Tukey-fence outlier detection. */
export const IQR_FENCE_MULTIPLIER = 1.5;

/** Robust z-score (modified, MAD-based) cutoff for outlier flagging. */
export const ROBUST_Z_CUTOFF = 3.5;

/**
 * Gapping flags.
 * Adjacent irons/wedges are expected to differ by roughly this many yards.
 */
export const EXPECTED_GAP_YARDS = 12;
/** Below this gap, two adjacent clubs "overlap" (going the same distance). */
export const OVERLAP_GAP_YARDS = 5;
/** Above this gap there is a "hole" in the bag. */
export const HOLE_GAP_YARDS = 20;

/**
 * Real-trend vs noise.
 * A club's per-session mean deviation from its neighbor-interpolated expectation,
 * expressed in standard errors. A deviation that persists with the same sign
 * across independent sessions and exceeds this size is treated as "real".
 */
export const TREND_DEVIATION_SE = 1.5;
/** Minimum independent sessions required to call a trend "real" (not noise). */
export const TREND_MIN_SESSIONS = 2;
/** Yards of deviation below which we don't bother flagging anything as a trend. */
export const TREND_MIN_YARDS = 4;

/**
 * Equipment-vs-swing hint thresholds. These only ever produce *hypotheses*.
 * A club whose ball speed matches neighbors (within this %) but whose carry is
 * short suggests a delivery/spin issue rather than a speed (swing) issue.
 */
export const BALL_SPEED_INLINE_PCT = 0.03;
/** Spin that is this fraction above/below the neighbor average is "abnormal". */
export const SPIN_ANOMALY_PCT = 0.15;

/** Unit detection: a max plausible carry in yards for a full shot. Above this,
 *  values are assumed to be a different unit or a bad row. */
export const MAX_PLAUSIBLE_CARRY_YARDS = 400;

/**
 * Stopping power (irons/wedges only). Roll as a fraction of total distance:
 * below SOFT it stops quickly, above HOT it releases a lot.
 */
export const SOFT_ROLL_FRACTION = 0.06;
export const HOT_ROLL_FRACTION = 0.14;

/**
 * Carry-consistency grade thresholds, expressed as the coefficient of variation
 * (carry SD / mean, %). Tighter is better. Deliberately generous and tunable.
 */
export const CONSISTENCY_CV_A = 2.5;
export const CONSISTENCY_CV_B = 4.0;
export const CONSISTENCY_CV_C = 6.0;
export const CONSISTENCY_CV_D = 8.0;

/**
 * Percentile used for the "reliable" carry — the distance you'll carry at least
 * (100 - this)% of the time. A conservative number to clear a front hazard.
 */
export const RELIABLE_CARRY_PERCENTILE = 20;

/**
 * Directional bias: average side beyond this many yards (with a consistent sign)
 * is flagged as a left/right tendency rather than centered scatter.
 */
export const DIRECTION_BIAS_YARDS = 4;

/**
 * Strike efficiency: broad, hedged smash-factor expectations per club category.
 * A club whose mean smash is more than SMASH_LOW_MARGIN below the low end is a
 * strike-quality hypothesis to check — never a verdict.
 */
export const SMASH_EXPECTED: Record<string, [number, number]> = {
  driver: [1.44, 1.52],
  wood: [1.42, 1.50],
  hybrid: [1.38, 1.48],
  iron: [1.25, 1.45],
  wedge: [1.0, 1.30],
};
export const SMASH_LOW_MARGIN = 0.05;

/**
 * Time-series drift: a club's session means regressed against session order.
 * Needs at least this many sessions; the slope must exceed MIN_SLOPE (yds per
 * session) with an R² above MIN_R2 to be called a directional drift.
 */
export const TIME_TREND_MIN_SESSIONS = 3;
export const TIME_TREND_MIN_SLOPE = 1.5;
export const TIME_TREND_MIN_R2 = 0.5;

/**
 * Shot shape from face-to-path (face angle − club path, degrees).
 * Below SMALL it's effectively straight; above BIG it's a hook/slice.
 */
export const CURVE_SMALL_DEG = 2;
export const CURVE_BIG_DEG = 6;

/**
 * Bag coverage: the share of a gap a club can comfortably flex up/down. A dead
 * zone opens between two clubs when their gap exceeds twice this control radius
 * (expressed as a fraction of the typical gap, with an absolute floor).
 */
export const COVERAGE_CONTROL_FACTOR = 0.6;
export const COVERAGE_CONTROL_FLOOR_YARDS = 8;

