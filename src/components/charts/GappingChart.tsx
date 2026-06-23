"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ErrorBar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ClubAnalysis } from "@/lib/analysis";
import type { GapAnalysis } from "@/lib/stats/gapping";

const COLORS = {
  ok: "#2f9e54",
  inversion: "#e11d48",
  hole: "#f59e0b",
  overlap: "#f59e0b",
};

export function GappingChart({
  clubs,
  gapping,
}: {
  clubs: ClubAnalysis[];
  gapping: GapAnalysis;
}) {
  const flagByClub = new Map(
    gapping.rows.map((r) => [r.club, r.flags.find((f) => f !== "ok") ?? "ok"]),
  );

  const data = clubs
    .filter((c) => Number.isFinite(c.mean))
    .map((c) => ({
      club: c.club,
      carry: Number(c.mean.toFixed(1)),
      err: Number.isFinite(c.ci.halfWidth) ? Number(c.ci.halfWidth.toFixed(1)) : 0,
      flag: flagByClub.get(c.club) ?? "ok",
    }));

  if (data.length === 0)
    return <p className="text-sm text-slate-500">No data to chart yet.</p>;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="club" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          label={{
            value: "Carry (yds)",
            angle: -90,
            position: "insideLeft",
            style: { fontSize: 12, fill: "#64748b" },
          }}
        />
        <Tooltip
          formatter={(v: number, name) =>
            name === "carry" ? [`${v} yds`, "Carry"] : [v, name]
          }
          labelFormatter={(l) => `Club: ${l}`}
        />
        <Bar dataKey="carry" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={COLORS[d.flag as keyof typeof COLORS] ?? COLORS.ok} />
          ))}
          <ErrorBar dataKey="err" width={4} strokeWidth={1.5} stroke="#334155" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
