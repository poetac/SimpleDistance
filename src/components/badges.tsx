import type { AdequacyLevel } from "@/lib/stats/adequacy";
import type { GapFlag } from "@/lib/stats/gapping";
import type { TrendClass } from "@/lib/stats/trend";

export function AdequacyBadge({ level }: { level: AdequacyLevel }) {
  if (level === "trustworthy")
    return <span className="badge-ok">Trustworthy</span>;
  if (level === "low") return <span className="badge-warn">Low confidence</span>;
  return <span className="badge-danger">Insufficient</span>;
}

export function FlagBadge({ flag }: { flag: GapFlag }) {
  switch (flag) {
    case "inversion":
      return <span className="badge-danger">Inversion</span>;
    case "hole":
      return <span className="badge-warn">Hole</span>;
    case "overlap":
      return <span className="badge-warn">Overlap</span>;
    default:
      return <span className="badge-ok">OK</span>;
  }
}

export function TrendBadge({ cls }: { cls: TrendClass }) {
  if (cls === "real-trend")
    return <span className="badge-danger">Real trend</span>;
  if (cls === "noise") return <span className="badge-muted">Likely noise</span>;
  return <span className="badge-muted">Insufficient</span>;
}

export function fmt(n: number, digits = 0): string {
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}
