"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFormatter } from "@/components/useFormatter";

/** Simple histogram of carry values (input is canonical yards). */
export function DistributionChart({ values: yardValues }: { values: number[] }) {
  const f = useFormatter();
  if (yardValues.length < 2)
    return <p className="text-sm text-slate-500">Not enough shots to chart.</p>;

  const values = yardValues.map((v) => f.dVal(v));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binCount = Math.min(12, Math.max(5, Math.round(Math.sqrt(values.length))));
  const width = (max - min) / binCount || 1;
  const bins = Array.from({ length: binCount }, (_, i) => ({
    label: `${Math.round(min + i * width)}`,
    count: 0,
  }));
  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count++;
  }

  return (
    <div
      role="img"
      aria-label={`Carry distribution histogram across ${values.length} shots, ranging from ${Math.round(min)} to ${Math.round(max)} ${f.dUnit}.`}
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={bins} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip labelFormatter={(l) => `~${l} ${f.dUnit}`} />
          <Bar dataKey="count" fill="#2f9e54" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
