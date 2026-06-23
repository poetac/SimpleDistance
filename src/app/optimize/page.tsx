"use client";

import Link from "next/link";
import { useData } from "@/components/DataProvider";
import { usePageTitle } from "@/components/usePageTitle";
import { clubLabel } from "@/lib/domain/clubs";
import { fmt } from "@/components/badges";

export default function OptimizePage() {
  usePageTitle("Optimize");
  const { loading, analysis } = useData();

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (!analysis || analysis.clubs.length === 0)
    return (
      <div className="card p-8 text-center">
        <h1 className="text-xl font-bold">No shots yet</h1>
        <p className="mt-2 text-slate-500">
          Import or add shots to build your optimal gapping ladder.
        </p>
        <Link href="/import" className="btn-primary mt-4 inline-flex">
          Import data
        </Link>
      </div>
    );

  const o = analysis.optimization;
  const hasInversion = analysis.bagAdvice.items.some((i) => i.kind === "inversion");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bag optimizer</h1>
        <p className="text-sm text-slate-500">
          An even <strong>{fmt(o.targetGapYards, 0)}-yd</strong> target ladder across your
          scoring clubs, with anchors kept as-is. Targets are decision support — built only
          from clubs with a trustworthy sample.
        </p>
      </div>

      {hasInversion && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Heads up: your bag has an inversion (a longer club carrying shorter than a shorter
          one). Resolve that first — once those carries are corrected, this ladder will
          re-sort and sharpen.
        </p>
      )}

      {/* Action summary */}
      <section className="card border-l-4 border-l-fairway-500 p-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">What to do</h2>
          <span className="text-sm text-slate-500">
            Proposed {o.proposedCount} / {o.budget} full-swing clubs (+ putter)
          </span>
        </div>
        <ul className="space-y-1 text-sm">
          {o.summary.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="text-fairway-600">
                •
              </span>
              {s}
            </li>
          ))}
        </ul>
      </section>

      {/* Anchors */}
      {o.anchors.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-1 font-semibold">Long game (anchors)</h2>
          <p className="mb-2 text-sm text-slate-500">
            Kept as-is — these gaps aren&apos;t evened out by adding clubs.
          </p>
          <div className="flex flex-wrap gap-2 text-sm">
            {o.anchors.map((a) => (
              <span key={a.club} className="rounded-lg bg-slate-100 px-3 py-1.5">
                <strong>{clubLabel(a.club)}</strong>{" "}
                <span className="text-slate-500">{fmt(a.carry, 0)} yds</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Ladder */}
      <section className="card overflow-x-auto">
        <table className="data">
          <caption className="sr-only">
            Target carry ladder: each evenly-spaced slot with the current club that fills it,
            its deviation, and status (matched, adjust, or gap).
          </caption>
          <thead>
            <tr>
              <th scope="col">Target carry</th>
              <th scope="col">Current club</th>
              <th scope="col">Carry</th>
              <th scope="col">Δ vs target</th>
              <th scope="col">Status</th>
              <th scope="col">Note</th>
            </tr>
          </thead>
          <tbody>
            {o.ladder.map((s, i) => (
              <tr
                key={i}
                className={s.status === "gap" ? "bg-amber-50" : "hover:bg-slate-50"}
              >
                <td className="font-semibold">{fmt(s.targetCarry, 0)} yds</td>
                <td>{s.currentClub ? clubLabel(s.currentClub) : "—"}</td>
                <td>{s.currentCarry != null ? `${fmt(s.currentCarry, 0)}` : "—"}</td>
                <td className={s.status === "adjust" ? "font-semibold text-amber-700" : ""}>
                  {s.deviation != null
                    ? `${s.deviation >= 0 ? "+" : ""}${fmt(s.deviation, 0)}`
                    : "—"}
                </td>
                <td>
                  {s.status === "matched" ? (
                    <span className="badge-ok">Matched</span>
                  ) : s.status === "adjust" ? (
                    <span className="badge-warn">Adjust</span>
                  ) : (
                    <span className="badge-danger">Add a club</span>
                  )}
                </td>
                <td className="text-sm text-slate-600">{s.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Redundant */}
      {o.redundant.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-1 font-semibold">Redundant clubs</h2>
          <ul className="space-y-1 text-sm text-slate-600">
            {o.redundant.map((r, i) => (
              <li key={i}>
                <strong>{clubLabel(r.club)}</strong> ({fmt(r.carry, 0)} yds) duplicates{" "}
                {clubLabel(r.nearClub)} — within {fmt(r.gapYards, 0)} yds. Candidate to drop.
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
