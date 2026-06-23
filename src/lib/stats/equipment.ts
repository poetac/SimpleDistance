// Equipment-vs-swing hints.
//
// IMPORTANT: these are HYPOTHESES TO CHECK, never diagnoses. We only ever say
// "the data is consistent with X — worth checking", and we always show the
// supporting signal. Launch-monitor metrics are optional; when absent we say so
// and produce fewer/no hints rather than guessing.

import type { ClubId } from "../domain/types";
import { mean } from "./descriptive";
import { BALL_SPEED_INLINE_PCT, SPIN_ANOMALY_PCT } from "./constants";

export interface ClubMetricSummary {
  club: ClubId;
  carry?: number;
  ballSpeed?: number;
  spin?: number;
  launchAngle?: number;
  smash?: number;
}

export type HintConfidence = "weak" | "moderate";

export interface EquipmentHint {
  club: ClubId;
  /** Short hypothesis, always hedged. */
  hypothesis: string;
  /** The supporting signal in plain terms. */
  evidence: string;
  leaning: "equipment" | "swing" | "unclear";
  confidence: HintConfidence;
}

function avgOf(values: Array<number | undefined>): number | undefined {
  const xs = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  return xs.length ? mean(xs) : undefined;
}

/**
 * Generate hedged equipment-vs-swing hints for a target club, using its
 * immediate neighbors as the reference.
 *
 * @param target   metrics for the club under inspection
 * @param neighbors metrics for the adjacent clubs (longer & shorter)
 * @param carryDeviationYards expected-minus-observed carry (positive = short),
 *        typically from the trend analysis; used to gate hint generation.
 */
export function equipmentHints(
  target: ClubMetricSummary,
  neighbors: ClubMetricSummary[],
  carryDeviationYards: number,
): EquipmentHint[] {
  const hints: EquipmentHint[] = [];
  const isShort = carryDeviationYards > 0;
  const isLong = carryDeviationYards < 0;

  const nbBallSpeed = avgOf(neighbors.map((n) => n.ballSpeed));
  const nbSpin = avgOf(neighbors.map((n) => n.spin));

  // --- Ball-speed reasoning (separates "speed/contact" from "delivery") ---
  if (target.ballSpeed != null && nbBallSpeed != null && nbBallSpeed > 0) {
    const rel = (target.ballSpeed - nbBallSpeed) / nbBallSpeed;
    const inline = Math.abs(rel) <= BALL_SPEED_INLINE_PCT;

    if (isShort && inline) {
      hints.push({
        club: target.club,
        leaning: "equipment",
        confidence: "moderate",
        hypothesis: `Carry is short even though ball speed is normal — consistent with a launch/spin or loft issue rather than a swing-speed problem. Worth a loft/lie check.`,
        evidence: `Ball speed ${target.ballSpeed.toFixed(1)} mph is within ${(BALL_SPEED_INLINE_PCT * 100).toFixed(0)}% of neighbors (~${nbBallSpeed.toFixed(1)} mph), so the club is delivering speed but not converting it to distance.`,
      });
    } else if (isShort && rel < -BALL_SPEED_INLINE_PCT) {
      hints.push({
        club: target.club,
        leaning: "swing",
        confidence: "moderate",
        hypothesis: `Carry is short and so is ball speed — points toward contact/strike or swing-speed with this club more than equipment.`,
        evidence: `Ball speed ${target.ballSpeed.toFixed(1)} mph is ${(Math.abs(rel) * 100).toFixed(0)}% below neighbors (~${nbBallSpeed.toFixed(1)} mph).`,
      });
    } else if (isLong && rel > BALL_SPEED_INLINE_PCT) {
      hints.push({
        club: target.club,
        leaning: "equipment",
        confidence: "weak",
        hypothesis: `Carry and ball speed both run high — could be a strong (de-lofted) setup on this club. Worth confirming loft.`,
        evidence: `Ball speed ${target.ballSpeed.toFixed(1)} mph is ${(rel * 100).toFixed(0)}% above neighbors (~${nbBallSpeed.toFixed(1)} mph).`,
      });
    }
  }

  // --- Spin reasoning (corroborating) ---
  if (target.spin != null && nbSpin != null && nbSpin > 0) {
    const rel = (target.spin - nbSpin) / nbSpin;
    if (isShort && rel > SPIN_ANOMALY_PCT) {
      hints.push({
        club: target.club,
        leaning: "equipment",
        confidence: "weak",
        hypothesis: `Elevated spin alongside short carry can come from a weak/added loft or a shaft/contact mismatch — a check is reasonable.`,
        evidence: `Spin ${Math.round(target.spin)} rpm is ${(rel * 100).toFixed(0)}% above neighbors (~${Math.round(nbSpin)} rpm); extra spin eats carry.`,
      });
    } else if (isShort && rel < -SPIN_ANOMALY_PCT) {
      hints.push({
        club: target.club,
        leaning: "unclear",
        confidence: "weak",
        hypothesis: `Low spin with short carry is unusual — could be a strike low on the face (gear effect) or a launch issue. Watch strike quality.`,
        evidence: `Spin ${Math.round(target.spin)} rpm is ${(Math.abs(rel) * 100).toFixed(0)}% below neighbors (~${Math.round(nbSpin)} rpm).`,
      });
    }
  }

  return hints;
}
