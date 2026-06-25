// Directional tendency: is the miss pattern biased left/right, or centered?
// Pure; takes side values (+ = right of target, yards). Degrades to "centered"
// / undefined when there's no side data.

import { mean } from "./descriptive";
import { DIRECTION_BIAS_YARDS } from "./constants";

export type Bias = "left" | "right" | "centered";

export interface DirectionTendency {
  n: number;
  meanSide?: number;
  bias: Bias;
  leftPct?: number;
  rightPct?: number;
  label: string;
}

export function directionTendency(side: number[]): DirectionTendency {
  const xs = side.filter((v) => Number.isFinite(v));
  const n = xs.length;
  if (n === 0) {
    return { n: 0, bias: "centered", label: "No side data." };
  }
  const meanSide = mean(xs);
  const leftPct = (xs.filter((v) => v < 0).length / n) * 100;
  const rightPct = (xs.filter((v) => v > 0).length / n) * 100;

  let bias: Bias = "centered";
  if (meanSide >= DIRECTION_BIAS_YARDS) bias = "right";
  else if (meanSide <= -DIRECTION_BIAS_YARDS) bias = "left";

  const label =
    bias === "centered"
      ? `Centered — averages ${Math.abs(meanSide).toFixed(1)} yds ${meanSide >= 0 ? "right" : "left"}, no strong bias.`
      : `Tends ${Math.abs(meanSide).toFixed(1)} yds ${bias} of target (${(bias === "right" ? rightPct : leftPct).toFixed(0)}% of shots miss ${bias}).`;

  return { n, meanSide, bias, leftPct, rightPct, label };
}
