"use client";

import { useEffect, useState } from "react";
import { useData } from "@/components/DataProvider";
import { normalizeClub, clubLabel } from "@/lib/domain/clubs";
import { CANONICAL_CLUB_ORDER } from "@/lib/domain/clubs";
import type { AppSettings } from "@/lib/domain/types";
import { getImports } from "@/lib/db";
import type { ImportRecord } from "@/lib/domain/types";

export default function SettingsPage() {
  const {
    settings,
    updateSettings,
    aliases,
    saveAlias,
    removeAlias,
    reseed,
    clearAll,
    shots,
  } = useData();

  const [local, setLocal] = useState<AppSettings>(settings);
  const [aliasRaw, setAliasRaw] = useState("");
  const [aliasClub, setAliasClub] = useState("");
  const [imports, setImports] = useState<ImportRecord[]>([]);

  useEffect(() => setLocal(settings), [settings]);
  useEffect(() => {
    getImports().then(setImports);
  }, [shots]);

  function commit(next: Partial<AppSettings>) {
    const merged = { ...local, ...next };
    setLocal(merged);
    updateSettings(merged);
  }

  async function addAlias(e: React.FormEvent) {
    e.preventDefault();
    if (!aliasRaw.trim() || !aliasClub) return;
    await saveAlias({ raw: aliasRaw.trim(), club: aliasClub });
    setAliasRaw("");
    setAliasClub("");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      {/* Analysis settings */}
      <section className="card space-y-4 p-4">
        <h2 className="font-semibold">Analysis</h2>

        <div className="flex flex-wrap items-center gap-6">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Yardage metric</span>
            <select
              className="input"
              value={local.metric}
              onChange={(e) => commit({ metric: e.target.value as "carry" | "total" })}
            >
              <option value="carry">Carry (recommended)</option>
              <option value="total">Total</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={local.excludeOutliers}
              onChange={(e) => commit({ excludeOutliers: e.target.checked })}
            />
            <span className="font-medium text-slate-600">
              Exclude mishit outliers (IQR fences)
            </span>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">
              Target CI half-width (yds)
            </span>
            <input
              type="number"
              min={0.5}
              step={0.5}
              className="input w-28"
              value={local.targetCiHalfWidthYards}
              onChange={(e) =>
                commit({ targetCiHalfWidthYards: Number(e.target.value) || 2 })
              }
            />
          </label>
        </div>
        <p className="text-xs text-slate-400">
          Outlier exclusion never deletes data — excluded shots are only dropped
          from the active statistics and counted in the dashboard.
        </p>
      </section>

      {/* Club aliases */}
      <section className="card p-4">
        <h2 className="mb-1 font-semibold">Club aliases</h2>
        <p className="mb-3 text-sm text-slate-500">
          Map any label your tracker uses to a canonical club. Aliases win over
          auto-detection on every import.
        </p>
        <form onSubmit={addAlias} className="mb-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Raw label</span>
            <input
              className="input"
              value={aliasRaw}
              onChange={(e) => setAliasRaw(e.target.value)}
              placeholder="The Big Stick"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Canonical club</span>
            <select
              className="input"
              value={aliasClub}
              onChange={(e) => setAliasClub(e.target.value)}
            >
              <option value="">Select…</option>
              {CANONICAL_CLUB_ORDER.map((c) => (
                <option key={c} value={c}>
                  {clubLabel(c)} ({c})
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary" type="submit">
            Add alias
          </button>
          {aliasRaw && (
            <span className="text-xs text-slate-400">
              auto-detect would map this to:{" "}
              {normalizeClub(aliasRaw) ?? "nothing"}
            </span>
          )}
        </form>

        {aliases.length === 0 ? (
          <p className="text-sm text-slate-400">No custom aliases yet.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Raw label</th>
                <th>Maps to</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {aliases.map((a) => (
                <tr key={a.raw}>
                  <td>{a.raw}</td>
                  <td>
                    {clubLabel(a.club)} ({a.club})
                  </td>
                  <td>
                    <button
                      className="text-xs text-rose-500 hover:underline"
                      onClick={() => removeAlias(a.raw)}
                    >
                      remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Import history */}
      <section className="card p-4">
        <h2 className="mb-3 font-semibold">Import history</h2>
        {imports.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing imported yet.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>File</th>
                <th>Source</th>
                <th>Shots</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {imports.map((im) => (
                <tr key={im.id}>
                  <td>{im.fileName}</td>
                  <td>{im.source}</td>
                  <td>{im.shotCount}</td>
                  <td className="text-slate-500">
                    {new Date(im.importedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Data management */}
      <section className="card p-4">
        <h2 className="mb-3 font-semibold">Data</h2>
        <div className="flex flex-wrap gap-3">
          <button
            className="btn-ghost"
            onClick={() => {
              if (confirm("Reload the demo 5-iron dataset? This replaces all current shots."))
                reseed();
            }}
          >
            Reset to demo data
          </button>
          <button
            className="btn-ghost text-rose-600"
            onClick={() => {
              if (confirm("Delete ALL shots and imports? This cannot be undone."))
                clearAll();
            }}
          >
            Clear all data
          </button>
        </div>
      </section>
    </div>
  );
}
