// Sample-size adequacy verdicts.

import {
  MIN_SHOTS_LOW_CONFIDENCE,
  MIN_SHOTS_TRUSTWORTHY,
} from "./constants";

export type AdequacyLevel = "insufficient" | "low" | "trustworthy";

export interface AdequacyVerdict {
  level: AdequacyLevel;
  n: number;
  /** Plain-English summary including a shots-needed hint when relevant. */
  message: string;
}

/**
 * Classify a club's sample size.
 *  - < MIN_SHOTS_LOW_CONFIDENCE  → "insufficient" (apparent problems are likely noise)
 *  - < MIN_SHOTS_TRUSTWORTHY     → "low"          (directional, not yet stable)
 *  - otherwise                   → "trustworthy"
 *
 * `additionalForTightCi` (optional) is the shots-needed estimate from
 * shotsNeededForHalfWidth, woven into the message when provided.
 */
export function classifyAdequacy(
  n: number,
  additionalForTightCi?: number,
): AdequacyVerdict {
  if (n < MIN_SHOTS_LOW_CONFIDENCE) {
    const need = MIN_SHOTS_LOW_CONFIDENCE - n;
    return {
      level: "insufficient",
      n,
      message: `Only ${n} clean shot${n === 1 ? "" : "s"} — not enough to draw a conclusion. Hit ~${need} more to reach a basic read.`,
    };
  }
  if (n < MIN_SHOTS_TRUSTWORTHY) {
    const extra =
      additionalForTightCi && additionalForTightCi > 0
        ? ` ~${additionalForTightCi} more shots would tighten the average to the target precision.`
        : "";
    return {
      level: "low",
      n,
      message: `${n} clean shots — directional but not rock-solid.${extra}`,
    };
  }
  const extra =
    additionalForTightCi && additionalForTightCi > 0
      ? ` Add ~${additionalForTightCi} more to hit the target CI width.`
      : "";
  return {
    level: "trustworthy",
    n,
    message: `${n} clean shots — trustworthy average.${extra}`,
  };
}
