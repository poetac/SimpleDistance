// "Playing numbers": the carries a golfer actually plays to. The mean is for
// gapping; on the course you want the robust stock (median) and a conservative
// "reliable" carry you'll clear (100 - p)% of the time — plus a consistency
// read from the carry coefficient of variation.

import { mean, median, stdDev, percentile } from "./descriptive";
import {
  CONSISTENCY_CV_A,
  CONSISTENCY_CV_B,
  CONSISTENCY_CV_C,
  CONSISTENCY_CV_D,
  RELIABLE_CARRY_PERCENTILE,
} from "./constants";

export type ConsistencyGrade = "A" | "B" | "C" | "D" | "F";

export interface PlayingNumbers {
  n: number;
  /** Robust stock carry (median). */
  stock: number;
  /** Conservative carry you'll reach ~(100 - RELIABLE_CARRY_PERCENTILE)% of the time. */
  reliable: number;
  p25: number;
  p75: number;
  p90: number;
  /** Middle-50% spread (P75 − P25), a robust dispersion of distance. */
  iqr: number;
  /** Carry coefficient of variation (%), undefined for n < 2. */
  carryCv?: number;
  consistencyGrade?: ConsistencyGrade;
}

function gradeFromCv(cv: number): ConsistencyGrade {
  if (cv <= CONSISTENCY_CV_A) return "A";
  if (cv <= CONSISTENCY_CV_B) return "B";
  if (cv <= CONSISTENCY_CV_C) return "C";
  if (cv <= CONSISTENCY_CV_D) return "D";
  return "F";
}

export function playingNumbers(carries: number[]): PlayingNumbers {
  const xs = carries.filter((v) => Number.isFinite(v));
  const n = xs.length;
  const stock = median(xs);
  const p25 = percentile(xs, 25);
  const p75 = percentile(xs, 75);
  const result: PlayingNumbers = {
    n,
    stock,
    reliable: percentile(xs, RELIABLE_CARRY_PERCENTILE),
    p25,
    p75,
    p90: percentile(xs, 90),
    iqr: p75 - p25,
  };
  if (n >= 2) {
    const m = mean(xs);
    if (m > 0) {
      const cv = (stdDev(xs) / m) * 100;
      result.carryCv = cv;
      result.consistencyGrade = gradeFromCv(cv);
    }
  }
  return result;
}
