"use client";

import { useMemo } from "react";
import { useData } from "@/components/DataProvider";
import { usePageTitle } from "@/components/usePageTitle";
import type { SessionEnvironment, SessionMeta } from "@/lib/domain/types";

interface SessionRow {
  id: string;
  shotCount: number;
  clubs: number;
  meta?: SessionMeta;
}

export default function SessionsPage() {
  usePageTitle("Sessions");
  const { loading, shots, sessionMeta, saveSessionMeta } = useData();

  const metaById = useMemo(() => {
    const m: Record<string, SessionMeta> = {};
    for (const s of sessionMeta) m[s.id] = s;
    return m;
  }, [sessionMeta]);

  const rows: SessionRow[] = useMemo(() => {
    const bySession = new Map<string, Set<string>>();
    const counts = new Map<string, number>();
    for (const s of shots) {
      counts.set(s.sessionId, (counts.get(s.sessionId) ?? 0) + 1);
      if (!bySession.has(s.sessionId)) bySession.set(s.sessionId, new Set());
      bySession.get(s.sessionId)!.add(s.club);
    }
    return [...counts.keys()]
      .sort()
      .map((id) => ({
        id,
        shotCount: counts.get(id) ?? 0,
        clubs: bySession.get(id)?.size ?? 0,
        meta: metaById[id],
      }));
  }, [shots, metaById]);

  function update(id: string, patch: Partial<SessionMeta>) {
    saveSessionMeta({ ...(metaById[id] ?? { id }), ...patch, id });
  }

  if (loading) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
        <p className="text-sm text-slate-500">
          Tag each session with its conditions. The Changes view uses these to warn
          when it&apos;s comparing across different conditions (e.g. indoor vs outdoor).
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">No sessions yet.</div>
      ) : (
        <section className="card overflow-x-auto">
          <table className="data">
            <caption className="sr-only">
              Each session with its shot count, clubs, and editable conditions.
            </caption>
            <thead>
              <tr>
                <th scope="col">Session</th>
                <th scope="col">Shots</th>
                <th scope="col">Clubs</th>
                <th scope="col">Name</th>
                <th scope="col">Environment</th>
                <th scope="col">Ball</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="font-medium">{r.id}</td>
                  <td>{r.shotCount}</td>
                  <td>{r.clubs}</td>
                  <td>
                    <input
                      className="input"
                      placeholder="e.g. Tuesday range"
                      defaultValue={r.meta?.name ?? ""}
                      aria-label={`Name for session ${r.id}`}
                      onBlur={(e) => update(r.id, { name: e.target.value || undefined })}
                    />
                  </td>
                  <td>
                    <select
                      className="input"
                      value={r.meta?.environment ?? "unknown"}
                      aria-label={`Environment for session ${r.id}`}
                      onChange={(e) =>
                        update(r.id, {
                          environment: e.target.value as SessionEnvironment,
                        })
                      }
                    >
                      <option value="unknown">Unknown</option>
                      <option value="outdoor">Outdoor</option>
                      <option value="indoor">Indoor</option>
                    </select>
                  </td>
                  <td>
                    <input
                      className="input"
                      placeholder="e.g. Pro V1"
                      defaultValue={r.meta?.ball ?? ""}
                      aria-label={`Ball for session ${r.id}`}
                      onBlur={(e) => update(r.id, { ball: e.target.value || undefined })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
