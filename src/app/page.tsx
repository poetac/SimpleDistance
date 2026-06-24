"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useData } from "@/components/DataProvider";
import { GappingChart } from "@/components/charts/GappingChart";
import { AdequacyBadge, FlagBadge, TrendBadge, fmt } from "@/components/badges";
import { Recommendations } from "@/components/Recommendations";
import { usePageTitle } from "@/components/usePageTitle";
import { useFormatter } from "@/components/useFormatter";
import { analyzeBag } from "@/lib/analysis";
import { buildBagReport } from "@/lib/report";
import { downloadFile } from "@/lib/download";

export default function Dashboard() {
  usePageTitle("Dashboard");
  const { loading, analysis: fullAnalysis, settings, shots } = useData();
  const f = useFormatter();
  const [session, setSession] = useState("");

  const sessions = useMemo(
    () => [...new Set(shots.map((s) => s.sessionId))].sort(),
    [shots],
  );

  const analysis = useMemo(() => {
    if (!session) return fullAnalysis;
    return analyzeBag(
      shots.filter((s) => s.sessionId === session),
      settings,
    );
  }, [session, shots, settings, fullAnalysis]);

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
            {metricLabel} distance · {f.d(settings.targetCiHalfWidthYards)}-{f.dUnitAdj} target CI
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sessions.length > 1 && (
            <select
              className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
              value={session}
              onChange={(e) => setSession(e.target.value)}
            >
              <option value="">All sessions</option>
              {sessions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
          <button
            className="btn-ghost"
            onClick={() =>
              downloadFile(
                `simpledistance-report-${new Date().toISOString().slice(0, 10)}.md`,
                buildBagReport(analysis, f, new Date().toLocaleDateString()),
                "text/markdown",
              )
            }
          >
            Download report
          </button>
          <Link href="/import" className="btn-primary">
            Import data
          </Link>
        </div>
      </div>

      {session && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Viewing a single session ({session}). Real-trend-vs-noise needs multiple
          sessions, so trend verdicts show as “insufficient” here — switch to{" "}
          <button className="underline" onClick={() => setSession("")}>
            All sessions
          </button>{" "}
          for the full analysis.
        </p>
      )}

      <Recommendations recs={analysis.recommendations} />

      {analysis.dataPlan.length > 0 && (
        <section className="card border-l-4 border-l-slate-400 p-4">
          <h2 className="mb-1 font-semibold">Collect more data to trust these</h2>
          <p className="mb-2 text-sm text-slate-500">
            Shots to reach a trustworthy sample ({analysis.dataPlan.reduce((s, p) => s + p.neededForTrustworthy, 0)} total).
          </p>
          <ul className="flex flex-wrap gap-2 text-sm">
            {analysis.dataPlan.map((p) => (
              <li
                key={p.club}
                className={`rounded-lg px-3 py-1.5 ${p.level === "insufficient" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}
              >
                <strong>{p.label}</strong>: +{p.neededForTrustworthy}{" "}
                <span className="text-xs opacity-70">(have {p.currentN})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-4">
        <h2 className="mb-1 font-semibold">Gapping</h2>
        <p className="mb-3 text-sm text-slate-500">
          {metricLabel} per club with 95% confidence error bars. Red = inversion,
          amber = overlap/hole.
        </p>
        <GappingChart clubs={analysis.clubs} gapping={analysis.gapping} />
      </section>

      <section className="card p-4">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="font-semibold">Bag structure</h2>
          {Number.isFinite(analysis.bagAdvice.typicalGapYards) && (
            <span className="text-sm text-slate-500">
              Typical gap ~{f.dist(analysis.bagAdvice.typicalGapYards, 0)}
            </span>
          )}
        </div>
        {analysis.bagAdvice.items.length === 0 ? (
          <p className="text-sm text-slate-600">
            Your scoring clubs are evenly spaced — no holes, overlaps, or
            inversions detected.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {analysis.bagAdvice.items.map((item, i) => (
              <li
                key={i}
                className={`rounded-md border-l-4 bg-slate-50 px-3 py-2 ${
                  item.kind === "inversion"
                    ? "border-l-rose-500"
                    : item.kind === "hole"
                      ? "border-l-amber-500"
                      : "border-l-amber-400"
                }`}
              >
                <span className="mr-2 font-semibold capitalize">{item.kind}:</span>
                {item.tentative && <span className="badge-muted mr-2">tentative</span>}
                {item.text}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card overflow-x-auto">
        <table className="data">
          <caption className="sr-only">
            Per-club stock yardages: sample size, mean and median carry, 95%
            confidence interval, gap to the next club, sample-size verdict, trend
            classification, and gapping flags.
          </caption>
          <thead>
            <tr>
              <th scope="col">Club</th>
              <th scope="col">N</th>
              <th scope="col">Mean ({f.dUnit})</th>
              <th scope="col">Median ({f.dUnit})</th>
              <th scope="col">95% CI</th>
              <th scope="col">Gap ({f.dUnit})</th>
              <th scope="col">Sample</th>
              <th scope="col">Trend</th>
              <th scope="col">Flags</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
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
                      <span
                        className="ml-1 text-xs text-slate-500"
                        title={`${c.excludedCount} mishit outlier(s) excluded`}
                      >
                        (−{c.excludedCount})
                      </span>
                    )}
                  </td>
                  <td>{f.d(c.mean, 1)}</td>
                  <td>{f.d(c.median, 1)}</td>
                  <td className="text-slate-500">
                    {Number.isFinite(c.ci.halfWidth)
                      ? `±${f.d(c.ci.halfWidth, 1)}`
                      : "—"}
                  </td>
                  <td>
                    {row?.gapToLonger != null ? `${f.d(row.gapToLonger, 0)}` : "—"}
                  </td>
                  <td>
                    <AdequacyBadge level={c.adequacy.level} />
                  </td>
                  <td>
                    {c.trend.classification === "real-trend" ? (
                      <TrendBadge cls={c.trend.classification} />
                    ) : (
                      <span className="text-xs text-slate-500">
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
