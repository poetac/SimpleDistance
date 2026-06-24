"use client";

import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { Shot } from "@/lib/domain/types";
import { useFormatter } from "@/components/useFormatter";

/** Shot pattern: side (x, + = right) vs carry (y). Inputs are canonical yards. */
export function DispersionChart({ shots }: { shots: Shot[] }) {
  const f = useFormatter();
  const points = shots
    .filter((s) => typeof s.sideYards === "number" && typeof s.carryYards === "number")
    .map((s) => ({ side: f.dVal(s.sideYards as number), carry: f.dVal(s.carryYards as number) }));

  if (points.length < 2)
    return (
      <p className="text-sm text-slate-500">
        No side/offline data available to plot a shot pattern.
      </p>
    );

  const maxAbsSide = Math.max(10, ...points.map((p) => Math.abs(p.side))) * 1.15;
  const avgSide = points.reduce((a, p) => a + p.side, 0) / points.length;

  return (
    <div
      role="img"
      aria-label={`Shot pattern scatter of ${points.length} shots, averaging ${Math.abs(avgSide).toFixed(1)} ${f.dUnit} ${avgSide >= 0 ? "right" : "left"} of target. Side on the horizontal axis, carry on the vertical.`}
    >
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="side"
          name="Side"
          domain={[-maxAbsSide, maxAbsSide]}
          tick={{ fontSize: 11 }}
          label={{ value: `← left   Side (${f.dUnit})   right →`, position: "insideBottom", offset: -2, style: { fontSize: 11, fill: "#64748b" } }}
        />
        <YAxis
          type="number"
          dataKey="carry"
          name="Carry"
          tick={{ fontSize: 11 }}
          domain={["dataMin - 5", "dataMax + 5"]}
          label={{ value: `Carry (${f.dUnit})`, angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#64748b" } }}
        />
        <ZAxis range={[50, 50]} />
        <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="4 4" />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          formatter={(v: number, name) => [`${v.toFixed(1)} ${f.dUnit}`, name]}
        />
        <Scatter data={points} fill="#2f9e54" fillOpacity={0.6} />
      </ScatterChart>
    </ResponsiveContainer>
    </div>
  );
}
