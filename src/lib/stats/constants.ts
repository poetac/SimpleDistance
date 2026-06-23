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
