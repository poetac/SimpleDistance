"use client";

import Link from "next/link";
import { useData } from "@/components/DataProvider";
import { GappingChart } from "@/components/charts/GappingChart";
import { AdequacyBadge, FlagBadge, TrendBadge, fmt } from "@/components/badges";
import { Recommendations } from "@/components/Recommendations";

export default function Dashboard() {
  const { loading, analysis, settings } = useData();

  if (loading)
    return <p className="text-slate-500">Loading your bag…</p>;

  if (!analysis || analysis.clubs.length === 0)
    return (
      <div className="card p-8 text-center">
        <h1 className="text-xl font-bold">No shots yet</h1>
        <p className="mt-2 text-slate-500">
          Import a CSV or add shots manually to see your bag analysis.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href="/import" className="btn-primary">
            Import CSV
          </Link>
          <Link href="/shots" className="btn-ghost">
            Add shots
          </Link>
        </div>
      </div>
    );

  const metricLabel = settings.metric === "carry" ? "Carry" : "Total";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bag Optimization</h1>
          <p className="text-sm text-slate-500">
            {analysis.totalShots} shots · {analysis.clubs.length} clubs ·{" "}
            {analysis.totalExcluded} mishit
            {analysis.totalExcluded === 1 ? "" : "s"} excluded ·{" "}
            {metricLabel} distance · {settings.targetCiHalfWidthYards}-yd target CI
          </p>
        </div>
        <Link href="/import" className="btn-primary">
          Import data
        </Link>
      </div>

      <Recommendations recs={analysis.recommendations} />

      <section className="card p-4">
        <h2 className="mb-1 font-semibold">Gapping</h2>
        <p className="mb-3 text-sm text-slate-500">
          {metricLabel} per club with 95% confidence error bars. Red = inversion,
          amber = overlap/hole.
        </p>
        <GappingChart clubs={analysis.clubs} gapping={analysis.gapping} />
      </section>

      <section className="card overflow-x-auto">
        <table className="data">
          <thead>
            <tr>
              <th>Club</th>
              <th>N</th>
              <th>Mean</th>
              <th>Median</th>
              <th>95% CI</th>
              <th>Gap</th>
              <th>Sample</th>
              <th>Trend</th>
              <th>Flags</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {analysis.clubs.map((c) => {
              const row = analysis.gapping.rows.find((r) => r.club === c.club);
              return (
                <tr key={c.club} className="hover:bg-slate-50">
                  <td className="font-semibold">{c.label}</td>
                  <td>
                    {c.n}
                    {c.excludedCount > 0 && (
                      <span className="ml-1 text-xs text-slate-400">
                        (−{c.excludedCount})
                      </span>
                    )}
                  </td>
                  <td>{fmt(c.mean, 1)}</td>
                  <td>{fmt(c.median, 1)}</td>
                  <td className="text-slate-500">
                    {Number.isFinite(c.ci.halfWidth)
                      ? `±${fmt(c.ci.halfWidth, 1)}`
                      : "—"}
                  </td>
                  <td>
                    {row?.gapToLonger != null ? `${fmt(row.gapToLonger, 0)}` : "—"}
                  </td>
                  <td>
                    <AdequacyBadge level={c.adequacy.level} />
                  </td>
                  <td>
                    {c.trend.classification === "real-trend" ? (
                      <TrendBadge cls={c.trend.classification} />
                    ) : (
                      <span className="text-xs text-slate-400">
                        {c.trend.direction === "none" ? "—" : c.trend.classification}
                      </span>
                    )}
                  </td>
                  <td className="space-x-1">
                    {(row?.flags ?? ["ok"]).map((f, i) => (
                      <FlagBadge key={i} flag={f} />
                    ))}
                  </td>
                  <td>
                    <Link
                      href={`/club/${encodeURIComponent(c.club)}`}
                      className="text-sm font-medium text-fairway-600 hover:underline"
                    >
                      Detail →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
