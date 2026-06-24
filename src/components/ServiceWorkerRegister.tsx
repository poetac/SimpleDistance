"use client";

import { useEffect } from "react";

/**
 * Registers the offline-first service worker in production. No-op in dev so it
 * never serves a stale bundle while you're iterating.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline support is best-effort */
      });
    }
  }, []);
  return null;
}
