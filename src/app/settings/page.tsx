"use client";

import { useEffect, useRef, useState } from "react";
import { useData } from "@/components/DataProvider";
import { usePageTitle } from "@/components/usePageTitle";
import { normalizeClub, clubLabel } from "@/lib/domain/clubs";
import { CANONICAL_CLUB_ORDER } from "@/lib/domain/clubs";
import type { AppSettings } from "@/lib/domain/types";
import { getImports, exportBundle, type BackupBundle } from "@/lib/db";
import type { ImportRecord } from "@/lib/domain/types";
import { shotsToCsv } from "@/lib/export";
import { downloadFile, readFileAsText } from "@/lib/download";
import { ConfirmDialog, type DialogAction } from "@/components/ConfirmDialog";

type DialogState =
  | { kind: "clear" }
  | { kind: "reseed" }
  | { kind: "restore"; bundle: unknown }
  | null;

export default function SettingsPage() {
  const {
    settings,
    updateSettings,
    aliases,
    saveAlias,
    removeAlias,
    reseed,
    clearAll,
    restore,
    shots,
  } = useData();

  usePageTitle("Settings");
  const [local, setLocal] = useState<AppSettings>(settings);
  const [aliasRaw, setAliasRaw] = useState("");
  const [aliasClub, setAliasClub] = useState("");
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [restoreMsg, setRestoreMsg] = useState("");
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  async function exportJson() {
    const bundle = await exportBundle();
    downloadFile(
      `simpledistance-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(bundle, null, 2),
      "application/json",
    );
  }

  function exportCsv() {
    downloadFile(
      `simpledistance-shots-${new Date().toISOString().slice(0, 10)}.csv`,
      shotsToCsv(shots),
      "text/csv",
    );
  }

  async function handleRestore(file: File) {
    setRestoreMsg("");
    try {
      const text = await readFileAsText(file);
      const bundle = JSON.parse(text);
      setDialog({ kind: "restore", bundle });
    } catch {
      setRestoreMsg("Could not read that backup file.");
    }
  }

  async function runRestore(bundle: unknown, mode: "merge" | "replace") {
    setDialog(null);
    try {
      const n = await restore(bundle as BackupBundle, mode);
      setRestoreMsg(`Restored ${n} shots (${mode}).`);
    } catch (e) {
      setRestoreMsg(e instanceof Error ? e.message : "Could not restore that backup.");
    }
  }

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

          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Distance unit</span>
            <select
              className="input"
              value={local.displayDistance}
              onChange={(e) =>
                commit({ displayDistance: e.target.value as "yards" | "meters" })
              }
            >
              <option value="yards">Yards</option>
              <option value="meters">Meters</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Speed unit</span>
            <select
              className="input"
              value={local.displaySpeed}
              onChange={(e) => commit({ displaySpeed: e.target.value as "mph" | "ms" })}
            >
              <option value="mph">mph</option>
              <option value="ms">m/s</option>
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

          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">
              Trend: min sessions
            </span>
            <input
              type="number"
              min={1}
              step={1}
              className="input w-28"
              value={local.trendMinSessions}
              onChange={(e) =>
                commit({ trendMinSessions: Math.max(1, Math.round(Number(e.target.value) || 2)) })
              }
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">
              Trend: deviation (SE)
            </span>
            <input
              type="number"
              min={0.5}
              step={0.1}
              className="input w-28"
              value={local.trendDeviationSE}
              onChange={(e) =>
                commit({ trendDeviationSE: Number(e.target.value) || 1.5 })
              }
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">CI method</span>
            <select
              className="input"
              value={local.ciMethod}
              onChange={(e) => commit({ ciMethod: e.target.value as "t" | "bootstrap" })}
            >
              <option value="t">t-interval</option>
              <option value="bootstrap">Bootstrap</option>
            </select>
          </label>
        </div>
        <p className="text-xs text-slate-500">
          The t-interval assumes a roughly normal mean; the percentile bootstrap makes no
          distributional assumption and handles skewed/small samples more honestly.
        </p>
        <p className="text-xs text-slate-500">
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
            <span className="text-xs text-slate-500">
              auto-detect would map this to:{" "}
              {normalizeClub(aliasRaw) ?? "nothing"}
            </span>
          )}
        </form>

        {aliases.length === 0 ? (
          <p className="text-sm text-slate-500">No custom aliases yet.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th scope="col">Raw label</th>
                <th scope="col">Maps to</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
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
                      className="text-xs text-rose-600 hover:underline"
                      aria-label={`Remove alias mapping ${a.raw} to ${a.club}`}
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
          <p className="text-sm text-slate-500">Nothing imported yet.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th scope="col">File</th>
                <th scope="col">Source</th>
                <th scope="col">Shots</th>
                <th scope="col">When</th>
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
        <h2 className="mb-1 font-semibold">Data</h2>
        <p className="mb-3 text-sm text-slate-500">
          Your shots live only in this browser. Export a backup to keep or move
          them.
        </p>
        <div className="flex flex-wrap gap-3">
          <button className="btn-ghost" onClick={exportJson} disabled={shots.length === 0}>
            Export backup (JSON)
          </button>
          <button className="btn-ghost" onClick={exportCsv} disabled={shots.length === 0}>
            Export shots (CSV)
          </button>
          <button className="btn-ghost" onClick={() => restoreInputRef.current?.click()}>
            Restore backup…
          </button>
          <input
            ref={restoreInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleRestore(f);
              e.target.value = "";
            }}
          />
          <button className="btn-ghost" onClick={() => setDialog({ kind: "reseed" })}>
            Reset to demo data
          </button>
          <button
            className="btn-ghost text-rose-600"
            onClick={() => setDialog({ kind: "clear" })}
          >
            Clear all data
          </button>
        </div>
        {restoreMsg && <p className="mt-2 text-sm text-slate-500">{restoreMsg}</p>}
      </section>

      <ConfirmDialog
        open={dialog?.kind === "clear"}
        title="Delete all data?"
        body="This permanently removes all shots and import history from this browser. It cannot be undone."
        onCancel={() => setDialog(null)}
        actions={[
          {
            label: "Delete everything",
            variant: "danger",
            onClick: () => {
              clearAll();
              setDialog(null);
            },
          },
        ]}
      />

      <ConfirmDialog
        open={dialog?.kind === "reseed"}
        title="Reset to demo data?"
        body="This replaces all current shots with the demo 5-iron dataset."
        onCancel={() => setDialog(null)}
        actions={[
          {
            label: "Reset to demo",
            onClick: () => {
              reseed();
              setDialog(null);
            },
          },
        ]}
      />

      <ConfirmDialog
        open={dialog?.kind === "restore"}
        title="Restore backup"
        body="Replace your current shots with the backup, or merge the backup into what you already have?"
        onCancel={() => setDialog(null)}
        actions={
          (dialog?.kind === "restore"
            ? [
                {
                  label: "Merge",
                  variant: "primary",
                  onClick: () => runRestore(dialog.bundle, "merge"),
                },
                {
                  label: "Replace",
                  variant: "danger",
                  onClick: () => runRestore(dialog.bundle, "replace"),
                },
              ]
            : []) as DialogAction[]
        }
      />
    </div>
  );
}
