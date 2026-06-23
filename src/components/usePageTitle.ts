"use client";

import { useEffect } from "react";

/**
 * Set the document title per route. Pages are client components, so Next's
 * server-only `metadata` export isn't available; this keeps browser tabs and
 * screen-reader page announcements meaningful.
 */
export function usePageTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · SimpleDistance`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
