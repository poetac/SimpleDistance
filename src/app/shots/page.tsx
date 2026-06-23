"use client";

import { useMemo, useRef, useState } from "react";
import { useData } from "@/components/DataProvider";
import { normalizeClub, clubLabel, clubOrderIndex } from "@/lib/domain/clubs";
import type { Shot } from "@/lib/domain/types";
import { fmt } from "@/components/badges";
import { usePageTitle } from "@/components/usePageTitle";

const EMPTY = {
  club: "",
  sessionId: "",
  carryYards: "",
  totalYards: "",
  ballSpeedMph: "",
  clubSpeedMph: "",
  spinRpm: "",
  launchAngleDeg: "",
  sideYards: "",
};

export default function ShotsPage() {
  usePageTitle("Shots");
  const { loading, shots, addShots, saveShot, removeShot, aliases } = useData();
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<Shot | null>(null);
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState("");
  const clubInputRef = useRef<HTMLInputElement>(null);

  function startEdit(s: Shot) {
    setEditing(s);
    setForm({
      club: s.rawClub ?? s.club,
      sessionId: s.sessionId,
      carryYards: s.carryYards?.toString() ?? "",
      totalYards: s.totalYards?.toString() ?? "",
      ballSpeedMph: s.ballSpeedMph?.toString() ?? "",
      clubSpeedMph: s.clubSpeedMph?.toString() ?? "",
      spinRpm: s.spinRpm?.toString() ?? "",
      launchAngleDeg: s.launchAngleDeg?.toString() ?? "",
      sideYards: s.sideYards?.toString() ?? "",
    });
    setMsg("");
    // Move focus to the form so keyboard/SR users land on the edit fields.
    requestAnimationFrame(() => {
      clubInputRef.current?.focus();
      clubInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function cancelEdit() {
    setEditing(null);
    setForm({ ...EMPTY });
    setMsg("");
  }

  const aliasMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const a of aliases) m[a.raw.toLowerCase()] = a.club;
    return m;
  }, [aliases]);

  const normalizedClub = form.club ? normalizeClub(form.club, aliasMap) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (!normalizedClub) {
      setMsg("Enter a recognizable club (e.g. 7i, PW, 56).");
      return;
    }
    const carry = num(form.carryYards);
    const total = num(form.totalYards);
    if (carry == null && total == null) {
      setMsg("Enter at least a carry or total distance.");
      return;
    }
    const shot: Shot = {
      id: editing?.id ?? `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      club: normalizedClub,
      rawClub: form.club,
      sessionId: form.sessionId.trim() || `manual-${new Date().toISOString().slice(0, 10)}`,
      timestamp: editing?.timestamp ?? new Date().toISOString(),
      carryYards: carry,
      totalYards: total,
      ballSpeedMph: num(form.ballSpeedMph),
      clubSpeedMph: num(form.clubSpeedMph),
      spinRpm: num(form.spinRpm),
      launchAngleDeg: num(form.launchAngleDeg),
      sideYards: num(form.sideYards),
      // preserve fields not exposed in the form when editing
      launchDirectionDeg: editing?.launchDirectionDeg,
      apexFt: editing?.apexFt,
      descentAngleDeg: editing?.descentAngleDeg,
      smashFactor: editing?.smashFactor,
      source: editing?.source ?? "manual",
    };
    if (editing) {
      await saveShot(shot);
      setEditing(null);
      setForm({ ...EMPTY });
      setMsg(`Updated ${clubLabel(normalizedClub)} shot.`);
    } else {
      await addShots([shot]);
      setForm((f) => ({ ...EMPTY, club: f.club, sessionId: f.sessionId }));
      setMsg(`Added ${clubLabel(normalizedClub)} shot.`);
    }
  }

  const sorted = useMemo(() => {
    const list = filter
      ? shots.filter((s) => s.club === filter)
      : shots;
    return [...list].sort(
      (a, b) =>
        clubOrderIndex(a.club) - clubOrderIndex(b.club) ||
        (a.sessionId < b.sessionId ? -1 : 1),
    );
  }, [shots, filter]);

  const clubsPresent = useMemo(
    () =>
      [...new Set(shots.map((s) => s.club))].sort(
        (a, b) => clubOrderIndex(a) - clubOrderIndex(b),
      ),
    [shots],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Shots</h1>

      {/* Manual entry */}
      <section className={`card p-4 ${editing ? "ring-2 ring-fairway-400" : ""}`}>
        <h2 className="mb-3 font-semibold">
          {editing ? "Edit shot" : "Add a shot manually"}
        </h2>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Club *" hint={normalizedClub ? `→ ${normalizedClub}` : "e.g. 7i, PW, 56"}>
            <input
              ref={clubInputRef}
              className="input"
              value={form.club}
              onChange={(e) => setForm({ ...form, club: e.target.value })}
              placeholder="7i"
            />
          </Field>
          <Field label="Session">
            <input
              className="input"
              value={form.sessionId}
              onChange={(e) => setForm({ ...form, sessionId: e.target.value })}
              placeholder="2026-06-23"
            />
          </Field>
          <Field label="Carry (yds)">
            <input className="input" value={form.carryYards} onChange={(e) => setForm({ ...form, carryYards: e.target.value })} inputMode="decimal" />
          </Field>
          <Field label="Total (yds)">
            <input className="input" value={form.totalYards} onChange={(e) => setForm({ ...form, totalYards: e.target.value })} inputMode="decimal" />
          </Field>
          <Field label="Ball speed (mph)">
            <input className="input" value={form.ballSpeedMph} onChange={(e) => setForm({ ...form, ballSpeedMph: e.target.value })} inputMode="decimal" />
          </Field>
          <Field label="Club speed (mph)">
            <input className="input" value={form.clubSpeedMph} onChange={(e) => setForm({ ...form, clubSpeedMph: e.target.value })} inputMode="decimal" />
          </Field>
          <Field label="Spin (rpm)">
            <input className="input" value={form.spinRpm} onChange={(e) => setForm({ ...form, spinRpm: e.target.value })} inputMode="decimal" />
          </Field>
          <Field label="Side (yds, + right)">
            <input className="input" value={form.sideYards} onChange={(e) => setForm({ ...form, sideYards: e.target.value })} inputMode="decimal" />
          </Field>
          <div className="flex items-end gap-2">
            <button className="btn-primary w-full" type="submit">
              {editing ? "Save changes" : "Add shot"}
            </button>
            {editing && (
              <button type="button" className="btn-ghost" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>
        {msg && <p className="mt-2 text-sm text-slate-500">{msg}</p>}
      </section>

      {/* Shot list */}
      <section className="card">
        <div className="flex items-center justify-between p-4">
          <h2 className="font-semibold">
            {shots.length} shots
          </h2>
          <select
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">All clubs</option>
            {clubsPresent.map((c) => (
              <option key={c} value={c}>
                {clubLabel(c)}
              </option>
            ))}
          </select>
        </div>
        <div className="max-h-[28rem] overflow-auto">
          <table className="data">
            <thead className="sticky top-0 bg-white">
              <tr>
                <th scope="col">Club</th>
                <th scope="col">Session</th>
                <th scope="col">Carry</th>
                <th scope="col">Total</th>
                <th scope="col">Ball</th>
                <th scope="col">Spin</th>
                <th scope="col">Side</th>
                <th scope="col">Src</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="font-medium">{clubLabel(s.club)}</td>
                  <td className="text-slate-500">{s.sessionId}</td>
                  <td>{fmt(s.carryYards ?? NaN, 1)}</td>
                  <td>{fmt(s.totalYards ?? NaN, 1)}</td>
                  <td>{fmt(s.ballSpeedMph ?? NaN, 1)}</td>
                  <td>{s.spinRpm ?? "—"}</td>
                  <td>{fmt(s.sideYards ?? NaN, 1)}</td>
                  <td className="text-xs text-slate-500">{s.source}</td>
                  <td className="whitespace-nowrap">
                    <button
                      className="text-xs text-fairway-700 hover:underline"
                      aria-label={`Edit ${clubLabel(s.club)} shot, ${fmt(s.carryYards ?? NaN, 0)} yard carry, session ${s.sessionId}`}
                      onClick={() => startEdit(s)}
                    >
                      edit
                    </button>
                    <button
                      className="ml-2 text-xs text-rose-600 hover:underline"
                      aria-label={`Delete ${clubLabel(s.club)} shot, ${fmt(s.carryYards ?? NaN, 0)} yard carry, session ${s.sessionId}`}
                      onClick={() => removeShot(s.id)}
                    >
                      delete
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-500">
                    No shots yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 flex items-center justify-between">
        <span className="font-medium text-slate-600">{label}</span>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function num(raw: string): number | undefined {
  const v = Number(raw);
  return raw.trim() !== "" && Number.isFinite(v) ? v : undefined;
}
