// Shot-shape from club delivery: face angle vs club path. Face-to-path (face −
// path) drives curvature — face closed to the path draws, open to the path
// fades; the magnitude separates a gentle shape from a hook/slice. Conventions
// are right-handed: face/path + = right/in-to-out. Pure; needs face + path data.

import { mean } from "./descriptive";
import { CURVE_SMALL_DEG, CURVE_BIG_DEG } from "./constants";

export type ShotShape =
  | "straight"
  | "draw"
  | "fade"
  | "hook"
  | "slice"
  | "unknown";

export interface ShotShapeAnalysis {
  n: number;
  meanFace?: number;
  meanPath?: number;
  /** face − path (deg). Negative = draw-spin, positive = fade-spin. */
  meanFaceToPath?: number;
  shape: ShotShape;
  label: string;
}

function avg(xs?: number[]): { m: number; n: number } | null {
  const v = (xs ?? []).filter((x) => Number.isFinite(x));
  return v.length ? { m: mean(v), n: v.length } : null;
}

export function shotShape(input: {
  face?: number[];
  path?: number[];
}): ShotShapeAnalysis {
  const face = avg(input.face);
  const path = avg(input.path);
  if (!face || !path) {
    return { n: 0, shape: "unknown", label: "No face/path data for shot shape." };
  }
  const n = Math.min(face.n, path.n);
  const meanFaceToPath = face.m - path.m;
  const mag = Math.abs(meanFaceToPath);

  let shape: ShotShape;
  if (mag < CURVE_SMALL_DEG) shape = "straight";
  else if (meanFaceToPath < 0) shape = mag >= CURVE_BIG_DEG ? "hook" : "draw";
  else shape = mag >= CURVE_BIG_DEG ? "slice" : "fade";

  const startBias =
    Math.abs(face.m) < 1 ? "on line" : face.m > 0 ? "right" : "left";
  const label =
    shape === "straight"
      ? `Mostly straight (face ${meanFaceToPath >= 0 ? "+" : ""}${meanFaceToPath.toFixed(1)}° to path), starting ${startBias}.`
      : `Predominant ${shape} — face ${meanFaceToPath.toFixed(1)}° ${meanFaceToPath < 0 ? "closed to" : "open to"} path, starting ${startBias}.`;

  return {
    n,
    meanFace: face.m,
    meanPath: path.m,
    meanFaceToPath,
    shape,
    label,
  };
}
