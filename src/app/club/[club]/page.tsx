"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useData } from "@/components/DataProvider";
import { DistributionChart } from "@/components/charts/DistributionChart";
import { SessionTrendChart } from "@/components/charts/SessionTrendChart";
import { AdequacyBadge, TrendBadge, fmt } from "@/components/badges";
import { mean as avg } from "@/lib/stats/descriptive";

export default function ClubDetail() {
  const params = useParams();
  const clubId = decodeURIComponent(
    Array.isArray(params.club) ? params.club[0] : (params.club as string),
  );
  const { loading, analysis, settings } = useData();

  if (loading) return <p className="text-slate-500">Loading…</p>;
  const club = analysis?.clubs.find((c) => c.club === clubId);
  if (!club)
    return (
      <div className="card p-6">
        <p>No data for {clubId}.</p>
        <Link href="/" className="mt-2 inline-block text-fairway-600">
          ← Back to dashboard
        </Link>
      </div>
    );

  const sideValues = club.shots
    .map((s) => s.sideYards)
    .filter((v): v is number => typeof v === "number");
  const avgSide = sideValues.length ? avg(sideValues) : NaN;
  const metricLabel = settings.metric === "carry" ? "carry" : "total";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-fairway-600 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{club.label}</h1>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={`Mean ${metricLabel}`} value={`${fmt(club.mean, 1)} yds`} />
        <Stat label="Median" value={`${fmt(club.median, 1)} yds`} />
        <Stat
          label="95% CI"
          value={
            Number.isFinite(club.ci.halfWidth)
              ? `±${fmt(club.ci.halfWidth, 1)} yds`
              : "—"
          }
        />
        <Stat
          label="Clean shots"
          value={`${club.n}${club.excludedCount ? ` (−${club.excludedCount})` : ""}`}
        />
      </div>

      {/* Adequacy + trend verdicts */}
      <section className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <AdequacyBadge level={club.adequacy.level} />
          <TrendBadge cls={club.trend.classification} />
        </div>
        <p className="mt-2 text-sm text-slate-600">{club.adequacy.message}</p>
        <p className="mt-1 text-sm text-slate-600">{club.trend.message}</p>
        {club.shotsNeeded.additionalNeeded > 0 && (
          <p className="mt-1 text-sm text-slate-500">
            To reach ±{settings.targetCiHalfWidthYards} yds, collect about{" "}
            <strong>{club.shotsNeeded.additionalNeeded}</strong> more clean shots
            (≈{club.shotsNeeded.totalNeeded} total).
          </p>
        )}
      </section>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-1 font-semibold">Carry distribution</h2>
          <p className="mb-3 text-sm text-slate-500">
            Trimmed mean {fmt(club.trimmedMean, 1)} yds — robust to mishits.
          </p>
          <DistributionChart values={club.metricValues} />
        </section>

        <section className="card p-4">
          <h2 className="mb-1 font-semibold">Session-over-session</h2>
          <p className="mb-3 text-sm text-slate-500">
            Observed vs neighbor-interpolated expectation per session.
          </p>
          <SessionTrendChart perSession={club.trend.perSession} />
        </section>
      </div>

      {/* Dispersion */}
      <section className="card p-4">
        <h2 className="mb-1 font-semibold">Dispersion</h2>
        {Number.isFinite(avgSide) ? (
          <p className="text-sm text-slate-600">
            Average side: <strong>{fmt(Math.abs(avgSide), 1)} yds</strong>{" "}
            {avgSide >= 0 ? "right" : "left"} of target across {sideValues.length}{" "}
            shots with side data.
          </p>
        ) : (
          <p className="text-sm text-slate-500">
            No side/offline data available for this club.
          </p>
        )}
      </section>

      {/* Equipment hints */}
      <section className="card p-4">
        <h2 className="mb-1 font-semibold">
          Equipment-vs-swing hints
          <span className="ml-2 text-xs font-normal text-slate-400">
            hypotheses to check — never a diagnosis
          </span>
        </h2>
        {club.hints.length === 0 ? (
          <p className="text-sm text-slate-500">
            No notable equipment/swing signals for this club, or insufficient
            launch-monitor data to form a hypothesis.
          </p>
        ) : (
          <ul className="space-y-3">
            {club.hints.map((h, i) => (
              <li key={i} className="rounded-md bg-slate-50 p-3">
                <div className="flex items-center gap-2">
                  <span
                    className={
                      h.leaning === "equipment"
                        ? "badge-warn"
                        : h.leaning === "swing"
                          ? "badge-muted"
                          : "badge-muted"
                    }
                  >
                    leans {h.leaning}
                  </span>
                  <span className="text-xs text-slate-400">{h.confidence} signal</span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{h.hypothesis}</p>
                <p className="mt-1 text-xs text-slate-500">Evidence: {h.evidence}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}
