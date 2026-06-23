// IndexedDB persistence (client-only) via `idb`. All data lives in the browser
// — no server, no external DB. On first run we auto-seed the 5-iron scenario.

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  AppSettings,
  ClubAlias,
  ImportRecord,
  Shot,
} from "../domain/types";
import { DEFAULT_SETTINGS } from "../domain/types";
import { generateSeedShots } from "./seed";

const DB_NAME = "simpledistance";
const DB_VERSION = 1;

interface SDSchema extends DBSchema {
  shots: {
    key: string;
    value: Shot;
    indexes: { byClub: string; bySession: string };
  };
  aliases: { key: string; value: ClubAlias };
  imports: { key: string; value: ImportRecord };
  meta: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<SDSchema>> | null = null;

function getDb(): Promise<IDBPDatabase<SDSchema>> {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is only available in the browser.");
  }
  if (!dbPromise) {
    dbPromise = openDB<SDSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const shots = db.createObjectStore("shots", { keyPath: "id" });
        shots.createIndex("byClub", "club");
        shots.createIndex("bySession", "sessionId");
        db.createObjectStore("aliases", { keyPath: "raw" });
        db.createObjectStore("imports", { keyPath: "id" });
        db.createObjectStore("meta");
      },
    });
  }
  return dbPromise;
}

/** Seed demo data on first run only. Idempotent and concurrency-safe
 *  (React StrictMode mounts effects twice in dev). */
let seedingPromise: Promise<void> | null = null;
export function ensureSeeded(): Promise<void> {
  if (!seedingPromise) seedingPromise = doSeed();
  return seedingPromise;
}

async function doSeed(): Promise<void> {
  const db = await getDb();
  const seeded = await db.get("meta", "seeded");
  if (seeded) return;
  const shots = generateSeedShots();
  const tx = db.transaction("shots", "readwrite");
  await Promise.all(shots.map((s) => tx.store.put(s)));
  await tx.done;
  await db.put("imports", {
    id: "seed-import",
    source: "seed",
    fileName: "Demo data (5-iron scenario)",
    importedAt: new Date().toISOString(),
    shotCount: shots.length,
    mapping: {},
  });
  await db.put("meta", true, "seeded");
}

export async function getAllShots(): Promise<Shot[]> {
  const db = await getDb();
  return db.getAll("shots");
}

export async function getShotsByClub(club: string): Promise<Shot[]> {
  const db = await getDb();
  return db.getAllFromIndex("shots", "byClub", club);
}

export async function addShots(shots: Shot[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("shots", "readwrite");
  await Promise.all(shots.map((s) => tx.store.put(s)));
  await tx.done;
}

export async function putShot(shot: Shot): Promise<void> {
  const db = await getDb();
  await db.put("shots", shot);
}

export async function deleteShot(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("shots", id);
}

export async function clearAllShots(): Promise<void> {
  const db = await getDb();
  await db.clear("shots");
  await db.clear("imports");
}

export async function reseed(): Promise<void> {
  const db = await getDb();
  await db.clear("shots");
  await db.clear("imports");
  await db.delete("meta", "seeded");
  seedingPromise = null; // allow ensureSeeded to run again
  await ensureSeeded();
}

// --- Aliases ---
export async function getAliases(): Promise<ClubAlias[]> {
  const db = await getDb();
  return db.getAll("aliases");
}

export async function getAliasMap(): Promise<Record<string, string>> {
  const aliases = await getAliases();
  const map: Record<string, string> = {};
  for (const a of aliases) map[a.raw.toLowerCase()] = a.club;
  return map;
}

export async function putAlias(alias: ClubAlias): Promise<void> {
  const db = await getDb();
  await db.put("aliases", { ...alias, raw: alias.raw.toLowerCase() });
}

export async function deleteAlias(raw: string): Promise<void> {
  const db = await getDb();
  await db.delete("aliases", raw.toLowerCase());
}

// --- Imports ---
export async function getImports(): Promise<ImportRecord[]> {
  const db = await getDb();
  return db.getAll("imports");
}

export async function addImport(rec: ImportRecord): Promise<void> {
  const db = await getDb();
  await db.put("imports", rec);
}

// --- Backup / restore (browser-only storage means the user owns the data) ---
export interface BackupBundle {
  version: 1;
  exportedAt: string;
  shots: Shot[];
  aliases: ClubAlias[];
  settings: AppSettings;
}

export async function exportBundle(): Promise<BackupBundle> {
  const [shots, aliases, settings] = await Promise.all([
    getAllShots(),
    getAliases(),
    getSettings(),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    shots,
    aliases,
    settings,
  };
}

/**
 * Restore a backup. `mode: "replace"` clears existing shots first; `mode:
 * "merge"` keeps them (shots with duplicate ids are overwritten).
 */
export async function importBundle(
  bundle: BackupBundle,
  mode: "merge" | "replace" = "merge",
): Promise<{ shots: number }> {
  if (!bundle || bundle.version !== 1 || !Array.isArray(bundle.shots)) {
    throw new Error("Unrecognized backup file.");
  }
  const db = await getDb();
  if (mode === "replace") {
    await db.clear("shots");
  }
  const tx = db.transaction("shots", "readwrite");
  await Promise.all(bundle.shots.map((s) => tx.store.put(s)));
  await tx.done;
  for (const a of bundle.aliases ?? []) await putAlias(a);
  if (bundle.settings) await saveSettings(bundle.settings);
  await db.put("meta", true, "seeded");
  return { shots: bundle.shots.length };
}

// --- Settings ---
export async function getSettings(): Promise<AppSettings> {
  const db = await getDb();
  const s = (await db.get("meta", "settings")) as AppSettings | undefined;
  return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDb();
  await db.put("meta", settings, "settings");
}
