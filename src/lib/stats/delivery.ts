// Delivery consistency: how repeatable the strike is, read from the shot-to-shot
// coefficient of variation of spin and launch angle. High variation is a
// strike/delivery-consistency HYPOTHESIS, not a verdict. Pure; degrades when the
// data is absent. (Distinct from carry consistency, which is the outcome.)

import { mean, stdDev } from "./descriptive";
import {
  SPIN_CV_TIGHT,
  SPIN_CV_VARIABLE,
  LAUNCH_CV_TIGHT,
  LAUNCH_CV_VARIABLE,
} from "./constants";

export type ConsistencyBand = "tight" | "moderate" | "variable";

export interface DeliveryConsistency {
  spinCv?: number;
  launchCv?: number;
  spinBand?: ConsistencyBand;
  launchBand?: ConsistencyBand;
  note: string;
}

function cv(xs: number[]): number | undefined {
  const v = xs.filter((x) => Number.isFinite(x));
  if (v.length < 3) return undefined;
  const m = mean(v);
  if (m <= 0) return undefined;
  return (stdDev(v) / m) * 100;
}

function band(value: number, tight: number, variable: number): ConsistencyBand {
  return value <= tight ? "tight" : value >= variable ? "variable" : "moderate";
}

export function deliveryConsistency(input: {
  spin?: number[];
  launch?: number[];
}): DeliveryConsistency {
  const spinCv = cv(input.spin ?? []);
  const launchCv = cv(input.launch ?? []);
  const spinBand = spinCv != null ? band(spinCv, SPIN_CV_TIGHT, SPIN_CV_VARIABLE) : undefined;
  const launchBand =
    launchCv != null ? band(launchCv, LAUNCH_CV_TIGHT, LAUNCH_CV_VARIABLE) : undefined;

  const parts: string[] = [];
  if (spinCv != null) parts.push(`spin ${spinCv.toFixed(0)}% (${spinBand})`);
  if (launchCv != null) parts.push(`launch ${launchCv.toFixed(0)}% (${launchBand})`);

  let note: string;
  if (parts.length === 0) {
    note = "No spin/launch data to assess delivery consistency.";
  } else {
    const variable = spinBand === "variable" || launchBand === "variable";
    note =
      `Delivery variation — ${parts.join(", ")}.` +
      (variable ? " The wide spread suggests inconsistent strike — worth watching contact." : "");
  }

  return { spinCv, launchCv, spinBand, launchBand, note };
}
