import Database from 'better-sqlite3';
import { existsSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openDb } from '../db/connection.js';
import { ensureDatabaseReady } from './bootstrap.js';

const createdDirs: string[] = [];

function makeTempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'offgridos-deploy-'));
  createdDirs.push(dir);
  return join(dir, 'data', 'project.db');
}

function countRows(db: Database.Database, table: string): number {
  return (db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count;
}

afterEach(() => {
  while (createdDirs.length > 0) {
    rmSync(createdDirs.pop()!, { recursive: true, force: true });
  }
});

describe('ensureDatabaseReady', () => {
  it('creates the database inside a nested persistent path and seeds it repeatably', () => {
    const dbPath = makeTempDbPath();

    ensureDatabaseReady(dbPath);
    expect(existsSync(dbPath)).toBe(true);

    let db = openDb(dbPath);
    try {
      expect(countRows(db, 'locations')).toBe(1);
      expect(countRows(db, 'surfaces')).toBeGreaterThan(0);
      expect(countRows(db, 'panel_types')).toBeGreaterThan(0);
      expect(countRows(db, 'surface_panel_assignments')).toBeGreaterThan(0);
      expect(countRows(db, 'pv_arrays')).toBeGreaterThan(0);
      expect(countRows(db, 'pv_strings')).toBeGreaterThan(0);
      expect(countRows(db, 'array_to_mppt_mappings')).toBeGreaterThan(0);
      expect(countRows(db, 'inverter_configurations')).toBe(1);
    } finally {
      db.close();
    }

    ensureDatabaseReady(dbPath);
    db = openDb(dbPath);
    try {
      expect(countRows(db, 'locations')).toBe(1);
      expect(countRows(db, 'surfaces')).toBeGreaterThan(0);
      expect(countRows(db, 'panel_types')).toBeGreaterThan(0);
      expect(countRows(db, 'surface_panel_assignments')).toBeGreaterThan(0);
      expect(countRows(db, 'pv_arrays')).toBeGreaterThan(0);
      expect(countRows(db, 'pv_strings')).toBeGreaterThan(0);
      expect(countRows(db, 'array_to_mppt_mappings')).toBeGreaterThan(0);
      expect(countRows(db, 'inverter_configurations')).toBe(1);
    } finally {
      db.close();
    }
  });
});
