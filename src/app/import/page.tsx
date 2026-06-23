"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/components/DataProvider";
import { parseCsvFile, columnValues } from "@/lib/import/csv";
import { getAdapter, type RawTable } from "@/lib/import/adapter";
import { autoDetectMapping, type ColumnMapping } from "@/lib/import/mapping";
import {
  detectFileAdapter,
  presetIdForAdapter,
} from "@/lib/import/builtinAdapters";
import { CANONICAL_FIELDS, REQUIRED_FIELDS, type CanonicalField } from "@/lib/import/schema";
import { PRESETS } from "@/lib/import/presets";
import { detectDistanceUnit, detectSpeedUnit } from "@/lib/import/units";
import { importSanity } from "@/lib/import/sanity";
import { getAliasMap, addImport } from "@/lib/db";
import { usePageTitle } from "@/components/usePageTitle";

type Step = "upload" | "map" | "done";

export default function ImportPage() {
  usePageTitle("Import");
  const { addShots, reload } = useData();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [table, setTable] = useState<RawTable | null>(null);
  const [fileName, setFileName] = useState("");
  const [presetId, setPresetId] = useState<string>("");
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [distanceUnit, setDistanceUnit] = useState<"yards" | "meters">("yards");
  const [speedUnit, setSpeedUnit] = useState<"mph" | "ms" | "kmh">("mph");
  const [result, setResult] = useState<{
    added: number;
    warnings: string[];
    skipped: number;
    skipReasons?: { missingClub: number; unrecognizedClub: number; missingDistance: number };
  } | null>(null);
  const [error, setError] = useState<string>("");

  async function handleFile(file: File) {
    setError("");
    try {
      const parsed = await parseCsvFile(file);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setError("That file has no readable rows.");
        return;
      }
      setTable(parsed);
      setFileName(file.name);

      // Route detection through the ImportAdapter registry.
      const adapter = detectFileAdapter(parsed);
      const detectedPreset = presetIdForAdapter(adapter);
      setPresetId(detectedPreset);
      const { mapping: autoMap, preset } = autoDetectMapping(
        parsed.headers,
        detectedPreset || undefined,
      );
      setMapping(autoMap);

      // Unit detection: preset default, then per-column heuristic.
      const carryHeader = autoMap.carryYards;
      const distGuess =
        preset?.distanceUnit ??
        detectDistanceUnit(columnValues(parsed, carryHeader), carryHeader);
      const speedHeader = autoMap.ballSpeedMph;
      const speedGuess =
        preset?.speedUnit ??
        detectSpeedUnit(columnValues(parsed, speedHeader), speedHeader);
      setDistanceUnit(distGuess);
      setSpeedUnit(speedGuess);

      setStep("map");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse file.");
    }
  }

  function applyPreset(id: string) {
    setPresetId(id);
    if (!table) return;
    const { mapping: autoMap, preset } = autoDetectMapping(table.headers, id || undefined);
    setMapping(autoMap);
    if (preset) {
      setDistanceUnit(preset.distanceUnit);
      setSpeedUnit(preset.speedUnit);
    }
  }

  const missingRequired = useMemo(
    () => REQUIRED_FIELDS.filter((f) => !mapping[f]),
    [mapping],
  );

  async function confirmImport() {
    if (!table) return;
    const aliases = await getAliasMap();
    const source = presetId || "csv";
    // Parse through the selected ImportAdapter, passing the user's confirmed
    // mapping/units as overrides.
    const adapter = getAdapter(`${source}-csv`) ?? getAdapter("csv")!;
    const res = adapter.parse(table, {
      aliases,
      fallbackSessionId: `${source}-${fileName.replace(/\.csv$/i, "")}`,
      mappingOverride: mapping,
      distanceUnit,
      speedUnit,
    });
    const skipped = res.rowsSkipped ?? table.rows.length - res.shots.length;
    const warnings = [...res.warnings, ...importSanity(res.shots)];
    if (res.shots.length > 0) {
      await addShots(res.shots);
      await addImport({
        id: `${source}-${Date.now()}`,
        source,
        fileName,
        importedAt: new Date().toISOString(),
        shotCount: res.shots.length,
        mapping: res.mapping as Record<string, string>,
      });
    }
    await reload();
    setResult({
      added: res.shots.length,
      warnings,
      skipped,
      skipReasons: res.skipReasons,
    });
    setStep("done");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Import shots</h1>

      <Steps step={step} />

      {error && (
        <div className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {step === "upload" && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload a CSV: drop a file here, or press Enter to browse"
          className="card flex cursor-pointer flex-col items-center justify-center gap-3 border-dashed p-10 text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          onClick={() => fileInput.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInput.current?.click();
            }
          }}
        >
          <p className="text-slate-600">
            Drop a TrackMan or Inrange CSV here, or choose a file.
          </p>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <button
            className="btn-primary"
            onClick={(e) => {
              e.stopPropagation();
              fileInput.current?.click();
            }}
          >
            Choose CSV
          </button>
          <p className="text-xs text-slate-500">
            Sample files live in <code>/samples</code>. Everything stays in your
            browser.
          </p>
        </div>
      )}

      {step === "map" && table && (
        <div className="space-y-4">
          {/* Preset + units */}
          <div className="card flex flex-wrap items-end gap-4 p-4">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-600">Source preset</span>
              <select
                className="rounded-lg border border-slate-300 px-2 py-1.5"
                value={presetId}
                onChange={(e) => applyPreset(e.target.value)}
              >
                <option value="">Auto / Generic</option>
                {PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-600">Distance unit</span>
              <select
                className="rounded-lg border border-slate-300 px-2 py-1.5"
                value={distanceUnit}
                onChange={(e) => setDistanceUnit(e.target.value as "yards" | "meters")}
              >
                <option value="yards">Yards</option>
                <option value="meters">Meters</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-600">Speed unit</span>
              <select
                className="rounded-lg border border-slate-300 px-2 py-1.5"
                value={speedUnit}
                onChange={(e) => setSpeedUnit(e.target.value as "mph" | "ms" | "kmh")}
              >
                <option value="mph">mph</option>
                <option value="ms">m/s</option>
                <option value="kmh">km/h</option>
              </select>
            </label>
            <p className="text-xs text-slate-500">
              {table.rows.length} rows · {table.headers.length} columns detected
            </p>
          </div>

          {/* Column mapping */}
          <div className="card p-4">
            <h2 className="mb-3 font-semibold">Map columns</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {CANONICAL_FIELDS.map((f) => (
                <div key={f.key} className="flex items-center justify-between gap-3 text-sm">
                  <label htmlFor={`map-${f.key}`} className="text-slate-600">
                    {f.label}
                    {f.required && (
                      <span className="text-rose-600" aria-hidden="true">
                        {" "}*
                      </span>
                    )}
                    {f.required && <span className="sr-only"> (required)</span>}
                  </label>
                  <select
                    id={`map-${f.key}`}
                    className="w-1/2 rounded-lg border border-slate-300 px-2 py-1.5"
                    value={mapping[f.key] ?? ""}
                    onChange={(e) =>
                      setMapping((m) => ({
                        ...m,
                        [f.key]: e.target.value || undefined,
                      }) as ColumnMapping)
                    }
                  >
                    <option value="">— none —</option>
                    {table.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {missingRequired.length > 0 && (
              <p className="mt-3 text-sm text-rose-600">
                Map required fields:{" "}
                {missingRequired
                  .map((f) => CANONICAL_FIELDS.find((d) => d.key === f)?.label)
                  .join(", ")}
              </p>
            )}
          </div>

          {/* Preview */}
          <div className="card overflow-x-auto p-0">
            <PreviewTable table={table} mapping={mapping} />
          </div>

          <div className="flex justify-between">
            <button className="btn-ghost" onClick={() => setStep("upload")}>
              ← Back
            </button>
            <button
              className="btn-primary"
              disabled={missingRequired.length > 0}
              onClick={confirmImport}
            >
              Import {table.rows.length} rows
            </button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-fairway-700">
            Imported {result.added} shots
          </h2>
          {result.skipped > 0 && (
            <p className="mt-1 text-sm text-slate-500">
              {result.skipped} row{result.skipped === 1 ? "" : "s"} skipped
              {result.skipReasons &&
                (() => {
                  const r = result.skipReasons!;
                  const parts = [
                    r.missingClub && `${r.missingClub} missing club`,
                    r.unrecognizedClub && `${r.unrecognizedClub} unrecognized club`,
                    r.missingDistance && `${r.missingDistance} missing distance`,
                  ].filter(Boolean);
                  return parts.length ? ` — ${parts.join(", ")}.` : ".";
                })()}
            </p>
          )}
          {result.warnings.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-amber-700">
              {result.warnings.map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex gap-2">
            <button className="btn-primary" onClick={() => router.push("/")}>
              View dashboard
            </button>
            <button
              className="btn-ghost"
              onClick={() => {
                setStep("upload");
                setTable(null);
                setResult(null);
              }}
            >
              Import another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Steps({ step }: { step: Step }) {
  const order: Step[] = ["upload", "map", "done"];
  const labels: Record<Step, string> = {
    upload: "Upload",
    map: "Map columns",
    done: "Done",
  };
  return (
    <ol className="flex gap-2 text-sm">
      {order.map((s, i) => {
        const active = order.indexOf(step) >= i;
        return (
          <li
            key={s}
            className={`rounded-full px-3 py-1 ${
              active ? "bg-fairway-100 text-fairway-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            {i + 1}. {labels[s]}
          </li>
        );
      })}
    </ol>
  );
}

function PreviewTable({ table, mapping }: { table: RawTable; mapping: ColumnMapping }) {
  const mapped = Object.entries(mapping).filter(([, h]) => h) as [CanonicalField, string][];
  const rows = table.rows.slice(0, 6);
  return (
    <table className="data">
      <thead>
        <tr>
          {mapped.map(([field, header]) => (
            <th key={field} scope="col">
              {CANONICAL_FIELDS.find((f) => f.key === field)?.label}
              <span className="block text-[10px] font-normal normal-case text-slate-500">
                {header}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {mapped.map(([field, header]) => (
              <td key={field}>{r[header]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
