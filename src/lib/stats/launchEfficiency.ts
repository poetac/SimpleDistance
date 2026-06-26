// Launch efficiency for the driver and fairway woods — the one place where
// launch angle + spin most directly trade against carry distance. We compare a
// club's mean launch and mean back spin against broad, speed-agnostic windows
// and surface the classic distance-robbing pattern (low launch, high spin) as a
// HYPOTHESIS to test on a launch monitor. Never a diagnosis: optimal numbers
// depend heavily on club-head speed, so the windows are wide and the output is
// always hedged. Only meaningful for driver/wood; degrades gracefully.

import { mean } from "./descriptive";
import {
  LAUNCH_WINDOWS,
  SPIN_WINDOWS,
  LAUNCH_EFFICIENCY_MIN_SHOTS,
} from "./constants";
import type { ClubCategory } from "../domain/clubs";

export type LaunchPattern =
  | "optimal"
  | "low-launch-high-spin"
  | "high-launch-low-spin"
  | "high-spin"
  | "low-launch"
  | "high-launch"
  | "low-spin"
  | "n/a";

export interface LaunchEfficiency {
  n: number;
  meanLaunch?: number;
  meanSpin?: number;
  launchWindow?: [number, number];
  spinWindow?: [number, number];
  pattern: LaunchPattern;
  /** True when a recognised distance-robbing pattern is present. */
  flagged: boolean;
  note: string;
}

/**
 * Evaluate launch/spin efficiency for a driver or fairway wood.
 * `launch` and `spin` are per-shot arrays (already cleaned of exclusions);
 * they need not be the same length — each is summarised independently.
 */
export function launchEfficiency(opts: {
  launch?: number[];
  spin?: number[];
  category: ClubCategory;
}): LaunchEfficiency {
  const { category } = opts;
  const launchWindow = LAUNCH_WINDOWS[category];
  const spinWindow = SPIN_WINDOWS[category];

  if (!launchWindow || !spinWindow) {
    return {
      n: 0,
      pattern: "n/a",
      flagged: false,
      note: "Launch-efficiency tuning applies to the driver and fairway woods.",
    };
  }

  const launch = (opts.launch ?? []).filter((v) => Number.isFinite(v));
  const spin = (opts.spin ?? []).filter((v) => Number.isFinite(v) && v > 0);
  const n = Math.min(launch.length, spin.length);

  if (
    launch.length < LAUNCH_EFFICIENCY_MIN_SHOTS ||
    spin.length < LAUNCH_EFFICIENCY_MIN_SHOTS
  ) {
    return {
      n,
      launchWindow,
      spinWindow,
      pattern: "n/a",
      flagged: false,
      note: "Not enough launch + spin data for a launch-efficiency read.",
    };
  }

  const meanLaunch = mean(launch);
  const meanSpin = mean(spin);
  const [launchLo, launchHi] = launchWindow;
  const [spinLo, spinHi] = spinWindow;

  const launchBelow = meanLaunch < launchLo;
  const launchAbove = meanLaunch > launchHi;
  const spinBelow = meanSpin < spinLo;
  const spinAbove = meanSpin > spinHi;

  const club = category === "driver" ? "Driver" : "This wood";
  const numbers = `launches ~${meanLaunch.toFixed(1)}° with ~${Math.round(meanSpin)} rpm`;
  const test = "Worth confirming on a launch monitor before changing anything.";

  let pattern: LaunchPattern;
  let flagged = false;
  let note: string;

  if (launchBelow && spinAbove) {
    pattern = "low-launch-high-spin";
    flagged = true;
    note = `${club} ${numbers} — a low-launch, high-spin pattern that classically costs carry (the ball climbs steeply and drops short). *Hypothesis:* hitting up more / teeing higher, or a loft or shaft change, could add distance. ${test}`;
  } else if (launchAbove && spinBelow) {
    pattern = "high-launch-low-spin";
    flagged = true;
    note = `${club} ${numbers} — a high-launch, low-spin pattern that can knuckle and fall out of the air late. *Hypothesis:* a touch less loft or a slightly steeper strike may hold the flight. ${test}`;
  } else if (spinAbove) {
    pattern = "high-spin";
    flagged = true;
    note = `${club} ${numbers}. Spin sits above the typical ${spinLo}–${spinHi} rpm window — extra spin can balloon the flight and shorten carry. *Hypothesis:* a strike or loft tweak might trim it. ${test}`;
  } else if (launchBelow) {
    pattern = "low-launch";
    flagged = true;
    note = `${club} ${numbers}. Launch is below the typical ${launchLo}–${launchHi}° window — launching it higher often adds carry. *Hypothesis:* tee height or angle of attack. ${test}`;
  } else if (launchAbove) {
    pattern = "high-launch";
    note = `${club} ${numbers}. Launch runs above the typical ${launchLo}–${launchHi}° window — fine if spin stays low, but worth an eye on peak height and descent.`;
  } else if (spinBelow) {
    pattern = "low-spin";
    note = `${club} ${numbers}. Spin is below the typical ${spinLo}–${spinHi} rpm window — usually good for distance, just watch that the flight still holds into wind.`;
  } else {
    pattern = "optimal";
    note = `${club} ${numbers} — both inside the typical ${launchLo}–${launchHi}° / ${spinLo}–${spinHi} rpm windows. Efficient launch conditions.`;
  }

  return {
    n,
    meanLaunch,
    meanSpin,
    launchWindow,
    spinWindow,
    pattern,
    flagged,
    note,
  };
}
