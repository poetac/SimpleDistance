"use client";

import { useMemo } from "react";
import { useData } from "./DataProvider";
import { formatterFromSettings, type Formatter } from "@/lib/format";

/** Display formatter bound to the user's unit settings (yards/mph by default). */
export function useFormatter(): Formatter {
  const { settings } = useData();
  return useMemo(() => formatterFromSettings(settings), [settings]);
}
