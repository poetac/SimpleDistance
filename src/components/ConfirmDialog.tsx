"use client";

import { useEffect, useRef } from "react";

export interface DialogAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "danger" | "ghost";
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body?: React.ReactNode;
  actions: DialogAction[];
  onCancel: () => void;
}

/**
 * Accessible modal confirmation: role=dialog + aria-modal, focus moved in on
 * open and restored on close, Tab focus-trapped within, Escape and backdrop
 * click cancel. Replaces native confirm()/alert().
 */
export function ConfirmDialog({
  open,
  title,
  body,
  actions,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Focus the first focusable control in the dialog.
    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => !el.hasAttribute("disabled"));

    focusables()[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key === "Tab") {
        const els = focusables();
        if (els.length === 0) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-lg font-bold">
          {title}
        </h2>
        {body && <div className="mt-2 text-sm text-slate-600">{body}</div>}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          {actions.map((a, i) => (
            <button
              key={i}
              className={
                a.variant === "danger"
                  ? "btn bg-rose-600 text-white hover:bg-rose-700"
                  : a.variant === "ghost"
                    ? "btn-ghost"
                    : "btn-primary"
              }
              onClick={a.onClick}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
