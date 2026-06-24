"use client";

import { useData } from "@/components/DataProvider";

/** A dismissable banner offering one-step undo of the last destructive action. */
export function UndoBanner() {
  const { undo, runUndo } = useData();
  if (!undo) return null;
  return (
    <div
      role="status"
      className="mx-auto mt-3 flex max-w-6xl items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800"
    >
      <span>{undo.label}.</span>
      <button className="btn-ghost border-amber-300 py-1" onClick={() => runUndo()}>
        Undo
      </button>
    </div>
  );
}
