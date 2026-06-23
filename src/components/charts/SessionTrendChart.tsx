"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SessionDeviation } from "@/lib/stats/trend";

/** Session-over-session observed vs expected carry. */
export function SessionTrendChart({
  perSession,
}: {
  perSession: SessionDeviation[];
}) {
  if (perSession.length === 0)
    return (
      <p className="text-sm text-slate-500">
        Need at least one session with neighbor context to chart the trend.
      </p>
    );

  const data = perSession.map((s, i) => ({
    session: s.sessionId.length > 10 ? `S${i + 1}` : s.sessionId,
    observed: Number(s.observedMean.toFixed(1)),
    expected: Number(s.expectedMean.toFixed(1)),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="session" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} domain={["dataMin - 8", "dataMax + 8"]} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="observed"
          stroke="#2f9e54"
          strokeWidth={2}
          name="Observed carry"
        />
        <Line
          type="monotone"
          dataKey="expected"
          stroke="#94a3b8"
          strokeDasharray="5 4"
          strokeWidth={2}
          name="Expected (neighbors)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
