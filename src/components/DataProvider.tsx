"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AppSettings, ClubAlias, SessionMeta, Shot } from "@/lib/domain/types";
import { DEFAULT_SETTINGS } from "@/lib/domain/types";
import { analyzeBag, type BagAnalysis } from "@/lib/analysis";
import { registerBuiltinAdapters } from "@/lib/import/builtinAdapters";
import * as db from "@/lib/db";

// Populate the ImportAdapter registry once so the extension seam is live.
registerBuiltinAdapters();

interface DataContextValue {
  loading: boolean;
  shots: Shot[];
  settings: AppSettings;
  aliases: ClubAlias[];
  sessionMeta: SessionMeta[];
  analysis: BagAnalysis | null;
  reload: () => Promise<void>;
  saveSessionMeta: (meta: SessionMeta) => Promise<void>;
  updateSettings: (s: AppSettings) => Promise<void>;
  addShots: (shots: Shot[]) => Promise<void>;
  saveShot: (shot: Shot) => Promise<void>;
  removeShot: (id: string) => Promise<void>;
  saveAlias: (alias: ClubAlias) => Promise<void>;
  removeAlias: (raw: string) => Promise<void>;
  reseed: () => Promise<void>;
  clearAll: () => Promise<void>;
  restore: (bundle: db.BackupBundle, mode: "merge" | "replace") => Promise<number>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [shots, setShots] = useState<Shot[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [aliases, setAliases] = useState<ClubAlias[]>([]);
  const [sessionMeta, setSessionMeta] = useState<SessionMeta[]>([]);

  const reload = useCallback(async () => {
    const [allShots, s, al, sm] = await Promise.all([
      db.getAllShots(),
      db.getSettings(),
      db.getAliases(),
      db.getAllSessionMeta(),
    ]);
    setShots(allShots);
    setSettings(s);
    setAliases(al);
    setSessionMeta(sm);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await db.ensureSeeded();
        if (active) await reload();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [reload]);

  const analysis = useMemo(
    () => (shots.length ? analyzeBag(shots, settings) : null),
    [shots, settings],
  );

  const value: DataContextValue = {
    loading,
    shots,
    settings,
    aliases,
    sessionMeta,
    analysis,
    reload,
    saveSessionMeta: async (meta) => {
      await db.putSessionMeta(meta);
      await reload();
    },
    updateSettings: async (s) => {
      await db.saveSettings(s);
      setSettings(s);
    },
    addShots: async (newShots) => {
      await db.addShots(newShots);
      await reload();
    },
    saveShot: async (shot) => {
      await db.putShot(shot);
      await reload();
    },
    removeShot: async (id) => {
      await db.deleteShot(id);
      await reload();
    },
    saveAlias: async (alias) => {
      await db.putAlias(alias);
      await reload();
    },
    removeAlias: async (raw) => {
      await db.deleteAlias(raw);
      await reload();
    },
    reseed: async () => {
      await db.reseed();
      await reload();
    },
    clearAll: async () => {
      await db.clearAllShots();
      await reload();
    },
    restore: async (bundle, mode) => {
      const res = await db.importBundle(bundle, mode);
      await reload();
      return res.shots;
    },
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
