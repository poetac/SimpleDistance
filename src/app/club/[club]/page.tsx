"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useData } from "@/components/DataProvider";
import { DistributionChart } from "@/components/charts/DistributionChart";
import { SessionTrendChart } from "@/components/charts/SessionTrendChart";
import { DispersionChart } from "@/components/charts/DispersionChart";
import { AdequacyBadge, TrendBadge, fmt } from "@/components/badges";
import { mean as avg } from "@/lib/stats/descriptive";
import { clubLabel } from "@/lib/domain/clubs";
import { usePageTitle } from "@/components/usePageTitle";
import { useFormatter } from "@/components/useFormatter";
import { classifyExclusions, type ExclusionReason } from "@/lib/exclusion";

export default function ClubDetail() {
  const params = useParams();
  const clubId = decodeURIComponent(
    Array.isArray(params.club) ? params.club[0] : (params.club as string),
  );
  usePageTitle(clubLabel(clubId));
  const { loading, analysis, settings, saveShot } = useData();
  const f = useFormatter();

  if (loading) return <p className="text-slate-500">Loading…</p>;
  const club = analysis?.clubs.find((c) => c.club === clubId);
  if (!club)
    return (
      <div className="card p-6">
        <h1 className="text-lg font-bold">No data for {clubLabel(clubId)}</h1>
        <p className="mt-2 text-sm text-slate-600">
          You don&apos;t have any shots recorded for this club yet.
        </p>
        <div className="mt-3 flex gap-2">
          <Link href="/import" className="btn-primary">
            Import shots
          </Link>
          <Link href="/shots" className="btn-ghost">
            Add manually
          </Link>
          <Link href="/" className="btn-ghost">
            ← Dashboard
          </Link>
        </div>
      </div>
    );

  const sideValues = club.shots
    .map((s) => s.sideYards)
    .filter((v): v is number => typeof v === "number");
  const avgSide = sideValues.length ? avg(sideValues) : NaN;
  const metricLabel = settings.metric === "carry" ? "carry" : "total";
  const d = club.dispersion;
  const exclusions = classifyExclusions(club.shots, settings);

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
        <Stat label={`Mean ${metricLabel}`} value={f.dist(club.mean, 1)} />
        <Stat label="Median" value={f.dist(club.median, 1)} />
        <Stat
          label="95% CI"
          value={
            Number.isFinite(club.ci.halfWidth)
              ? `±${f.dist(club.ci.halfWidth, 1)}`
              : "—"
          }
        />
        <Stat
          label="Clean shots"
          value={`${club.n}${club.excludedCount ? ` (−${club.excludedCount})` : ""}`}
        />
      </div>

      {/* Playing numbers */}
      <section className="card p-4">
        <h2 className="mb-1 font-semibold">
          Playing numbers
          {club.playing.consistencyGrade && (
            <span
              className={`ml-2 ${club.playing.consistencyGrade <= "B" ? "badge-ok" : club.playing.consistencyGrade === "C" ? "badge-warn" : "badge-danger"}`}
            >
              Consistency {club.playing.consistencyGrade}
            </span>
          )}
        </h2>
        <p className="mb-3 text-sm text-slate-500">
          The mean is for gapping; on the course play your stock and a reliable carry.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <DispChip label="Stock (median)" value={f.dist(club.playing.stock, 0)} />
          <DispChip
            label="Reliable carry"
            value={f.dist(club.playing.reliable, 0)}
          />
          <DispChip label="P25–P75" value={`${f.d(club.playing.p25, 0)}–${f.dist(club.playing.p75, 0)}`} />
          <DispChip label="Long (P90)" value={f.dist(club.playing.p90, 0)} />
          {club.playing.carryCv != null && (
            <DispChip label="Carry CV" value={`${fmt(club.playing.carryCv, 1)}%`} />
          )}
        </div>
        <p className="mt-2 text-sm text-slate-600">{club.tendency.label}</p>
        {club.efficiency.meanSmash != null && (
          <p
            className={`mt-1 text-sm ${club.efficiency.flagged ? "text-amber-700" : "text-slate-600"}`}
          >
            {club.efficiency.note}
          </p>
        )}
      </section>

      {/* Adequacy + trend verdicts */}
      <section className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <AdequacyBadge level={club.adequacy.level} />
          <TrendBadge cls={club.trend.classification} />
        </div>
        <p className="mt-2 text-sm text-slate-600">{club.adequacy.message}</p>
        {Number.isFinite(club.ci.lower) && (
          <p className="mt-1 text-sm text-slate-600">
            95% {settings.ciMethod === "bootstrap" ? "bootstrap" : "t"} CI:{" "}
            <strong>
              {f.d(club.ci.lower, 1)}–{f.dist(club.ci.upper, 1)}
            </strong>{" "}
            (mean {f.dist(club.mean, 1)}).
          </p>
        )}
        <p className="mt-1 text-sm text-slate-600">{club.trend.message}</p>
        {club.shotsNeeded.additionalNeeded > 0 && (
          <p className="mt-1 text-sm text-slate-500">
            To reach ±{f.dist(settings.targetCiHalfWidthYards)}, collect about{" "}
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
            Trimmed mean {f.dist(club.trimmedMean, 1)} — robust to mishits.
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
        <h2 className="mb-1 font-semibold">Dispersion (shot pattern)</h2>
        {Number.isFinite(avgSide) ? (
          <p className="mb-3 text-sm text-slate-600">
            Average side: <strong>{f.dist(Math.abs(avgSide), 1)}</strong>{" "}
            {avgSide >= 0 ? "right" : "left"} of target across {sideValues.length}{" "}
            shots with side data.
          </p>
        ) : (
          <p className="mb-3 text-sm text-slate-500">
            No side/offline data available for this club.
          </p>
        )}
        <div className="mb-3 flex flex-wrap gap-3 text-sm">
          {d.sideSd != null && (
            <DispChip label="Side SD" value={`±${f.dist(d.sideSd, 1)}`} />
          )}
          {d.p75AbsSide != null && (
            <DispChip label="75% within" value={f.dist(d.p75AbsSide, 1)} />
          )}
          {d.carrySd != null && (
            <DispChip label="Carry SD" value={`±${f.dist(d.carrySd, 1)}`} />
          )}
          {d.ballSpeedCv != null && (
            <DispChip
              label="Strike consistency"
              value={`${fmt(d.ballSpeedCv, 1)}% ball-speed CV`}
            />
          )}
        </div>
        <DispersionChart shots={club.shots} />
      </section>

      {/* Stopping power */}
      <section className="card p-4">
        <h2 className="mb-1 font-semibold">
          Stopping power
          {club.stopping.landing !== "unknown" && (
            <span
              className={`ml-2 ${
                club.stopping.landing === "soft"
                  ? "badge-ok"
                  : club.stopping.landing === "hot"
                    ? "badge-warn"
                    : "badge-muted"
              }`}
            >
              {club.stopping.landing}
            </span>
          )}
        </h2>
        <p className="text-sm text-slate-600">{club.stopping.note}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          {club.stopping.rollYardsMean != null && (
            <DispChip label="Avg roll" value={f.dist(club.stopping.rollYardsMean, 1)} />
          )}
          {club.stopping.descentAngleMean != null && (
            <DispChip
              label="Descent angle"
              value={`${fmt(club.stopping.descentAngleMean, 1)}°`}
            />
          )}
        </div>
      </section>

      {/* Equipment hints */}
      <section className="card p-4">
        <h2 className="mb-1 font-semibold">
          Equipment-vs-swing hints
          <span className="ml-2 text-xs font-normal text-slate-500">
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
                  <span className="text-xs text-slate-500">{h.confidence} signal</span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{h.hypothesis}</p>
                <p className="mt-1 text-xs text-slate-500">Evidence: {h.evidence}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Shots & exclusions */}
      <section className="card p-4">
        <h2 className="mb-1 font-semibold">Shots &amp; exclusions</h2>
        <p className="mb-3 text-sm text-slate-500">
          Choose which shots feed this club&apos;s stats. “Auto” defers to mishit
          detection; you can force-include an auto-flagged shot or force-exclude a
          clean one. Nothing is ever deleted.
        </p>
        <div className="max-h-96 overflow-auto">
          <table className="data">
            <caption className="sr-only">
              Every shot for this club with its session, carry, exclusion status,
              and a control to include or exclude it from statistics.
            </caption>
            <thead className="sticky top-0 bg-white">
              <tr>
                <th scope="col">Session</th>
                <th scope="col">Carry ({f.dUnit})</th>
                <th scope="col">Status</th>
                <th scope="col">In stats?</th>
              </tr>
            </thead>
            <tbody>
              {exclusions.map((e) => (
                <tr
                  key={e.shot.id}
                  className={e.excluded ? "text-slate-400" : ""}
                >
                  <td>{e.shot.sessionId}</td>
                  <td>{e.shot.carryYards != null ? f.d(e.shot.carryYards, 1) : "—"}</td>
                  <td>
                    <ReasonBadge reason={e.reason} />
                  </td>
                  <td>
                    <select
                      className="rounded border border-slate-300 px-1 py-0.5 text-xs"
                      aria-label={`Inclusion for ${clubLabel(e.shot.club)} ${fmt(e.shot.carryYards ?? NaN, 0)} yard shot, session ${e.shot.sessionId}`}
                      value={
                        e.shot.excluded === true
                          ? "exclude"
                          : e.shot.excluded === false
                            ? "include"
                            : "auto"
                      }
                      onChange={(ev) => {
                        const v = ev.target.value;
                        saveShot({
                          ...e.shot,
                          excluded:
                            v === "exclude" ? true : v === "include" ? false : undefined,
                        });
                      }}
                    >
                      <option value="auto">Auto</option>
                      <option value="include">Always include</option>
                      <option value="exclude">Always exclude</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function DispChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-lg bg-slate-100 px-3 py-1.5">
      <span className="text-slate-500">{label}: </span>
      <strong>{value}</strong>
    </span>
  );
}

function ReasonBadge({ reason }: { reason: ExclusionReason }) {
  switch (reason) {
    case "auto-outlier":
      return <span className="badge-warn">Auto-excluded</span>;
    case "manual-exclude":
      return <span className="badge-danger">Excluded</span>;
    case "manual-include":
      return <span className="badge-ok">Force-included</span>;
    case "no-metric":
      return <span className="badge-muted">No {""}data</span>;
    default:
      return <span className="badge-ok">Included</span>;
  }
}
