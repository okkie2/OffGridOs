import fs from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { openDb } from '../db/connection.js';
import { initSchema } from '../db/schema.js';

type ForeignKeyCheckRow = {
  table: string;
  rowid: number;
  parent: string;
  fkid: number;
};

function collectDatabaseDiagnostics(db: Database.Database): Record<string, unknown> {
  const tableCounts = {
    locations: (db.prepare('SELECT COUNT(*) AS count FROM locations').get() as { count: number } | undefined)?.count ?? 0,
    surfaces: (db.prepare('SELECT COUNT(*) AS count FROM surfaces').get() as { count: number } | undefined)?.count ?? 0,
    surface_panel_assignments: (db.prepare('SELECT COUNT(*) AS count FROM surface_panel_assignments').get() as { count: number } | undefined)?.count ?? 0,
    pv_arrays: (db.prepare('SELECT COUNT(*) AS count FROM pv_arrays').get() as { count: number } | undefined)?.count ?? 0,
    pv_strings: (db.prepare('SELECT COUNT(*) AS count FROM pv_strings').get() as { count: number } | undefined)?.count ?? 0,
    array_to_mppt_mappings: (db.prepare('SELECT COUNT(*) AS count FROM array_to_mppt_mappings').get() as { count: number } | undefined)?.count ?? 0,
    surface_configurations: (db.prepare('SELECT COUNT(*) AS count FROM surface_configurations').get() as { count: number } | undefined)?.count ?? 0,
    mppt_types: (db.prepare('SELECT COUNT(*) AS count FROM mppt_types').get() as { count: number } | undefined)?.count ?? 0,
  };

  const foreignKeyViolations = (db.prepare('PRAGMA foreign_key_check').all() as ForeignKeyCheckRow[]).slice(0, 20);

  return {
    tableCounts,
    foreignKeyViolations,
  };
}

export function ensureDatabaseReady(dbPath: string): void {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = openDb(dbPath);
  try {
    console.log(`[db] ensureDatabaseReady start path=${dbPath}`);
    initSchema(db);
    console.log(`[db] ensureDatabaseReady complete path=${dbPath}`);
  } catch (error) {
    const diagnostics = collectDatabaseDiagnostics(db);
    console.error('[db] ensureDatabaseReady failed', {
      dbPath,
      error: error instanceof Error ? { name: error.name, message: error.message } : error,
      diagnostics,
    });
    throw error;
  } finally {
    db.close();
  }
}

export function withDb<T>(dbPath: string, fn: (db: Database.Database) => T): T {
  const db = openDb(dbPath);
  try {
    return fn(db);
  } finally {
    db.close();
  }
}
