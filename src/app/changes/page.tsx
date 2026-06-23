"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useData } from "@/components/DataProvider";
import { usePageTitle } from "@/components/usePageTitle";
import { diffLatestSession } from "@/lib/sessionDiff";
import { fmt } from "@/components/badges";

export default function ChangesPage() {
  usePageTitle("Changes");
  const { loading, shots, settings } = useData();

  const diff = useMemo(
    () => diffLatestSession(shots, settings),
    [shots, settings],
  );

  if (loading) return <p className="text-slate-500">Loading…</p>;

  if (!diff)
    return (
      <div className="card p-8 text-center">
        <h1 className="text-xl font-bold">Not enough sessions yet</h1>
        <p className="mt-2 text-slate-500">
          Once you have at least two sessions, this view compares your latest
          session against everything before it.
        </p>
        <Link href="/import" className="btn-primary mt-4 inline-flex">
          Import another session
        </Link>
      </div>
    );

  const changed = diff.rows.filter((r) => !r.insufficient && !r.withinNoise);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Since last session</h1>
        <p className="text-sm text-slate-500">
          Latest session <strong>{diff.latestSessionId}</strong> vs baseline of{" "}
          {diff.baselineSessionIds.length} prior session
          {diff.baselineSessionIds.length === 1 ? "" : "s"}. A change is only
          called real when it exceeds the combined confidence intervals.
        </p>
      </div>

      <section
        className={`card border-l-4 p-4 ${changed.length ? "border-l-amber-500" : "border-l-fairway-500"}`}
      >
        {changed.length === 0 ? (
          <p className="text-sm text-slate-600">
            Nothing moved outside its normal range this session. Your bag is
            holding steady.
          </p>
        ) : (
          <>
            <h2 className="mb-2 font-semibold">
              {changed.length} club{changed.length === 1 ? "" : "s"} moved outside
              the usual range
            </h2>
            <ul className="space-y-1 text-sm">
              {changed.map((r) => (
                <li key={r.club}>
                  <strong>{r.label}:</strong> {r.note}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card overflow-x-auto">
        <table className="data">
          <caption className="sr-only">
            Per-club comparison of the latest session mean carry against the
            baseline mean, with the change and whether it is within normal
            variation.
          </caption>
          <thead>
            <tr>
              <th scope="col">Club</th>
              <th scope="col">This session</th>
              <th scope="col">Baseline</th>
              <th scope="col">Change</th>
              <th scope="col">Read</th>
            </tr>
          </thead>
          <tbody>
            {diff.rows.map((r) => (
              <tr key={r.club} className="hover:bg-slate-50">
                <td className="font-semibold">{r.label}</td>
                <td>
                  {fmt(r.latestMean, 1)}{" "}
                  <span className="text-xs text-slate-500">(n={r.latestN})</span>
                </td>
                <td>
                  {fmt(r.baselineMean, 1)}{" "}
                  <span className="text-xs text-slate-500">(n={r.baselineN})</span>
                </td>
                <td
                  className={
                    r.insufficient
                      ? "text-slate-400"
                      : r.withinNoise
                        ? "text-slate-600"
                        : "font-semibold text-amber-700"
                  }
                >
                  {r.deltaYards >= 0 ? "+" : ""}
                  {fmt(r.deltaYards, 1)}
                </td>
                <td>
                  {r.insufficient ? (
                    <span className="badge-muted">Insufficient</span>
                  ) : r.withinNoise ? (
                    <span className="badge-ok">Steady</span>
                  ) : (
                    <span className="badge-warn">Moved</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
