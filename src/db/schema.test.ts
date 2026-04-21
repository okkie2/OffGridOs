import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { initSchema } from './schema.js';

type CountRow = { count: number };

const createdDirs: string[] = [];

function makeTempDatabase(): Database.Database {
  const dir = mkdtempSync(join(tmpdir(), 'offgridos-schema-'));
  createdDirs.push(dir);
  return new Database(join(dir, 'project.db'));
}

function countRows(db: Database.Database, table: string): number {
  return (db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as CountRow).count;
}

function snapshotCounts(db: Database.Database, tables: string[]): Record<string, number> {
  return Object.fromEntries(tables.map((table) => [table, countRows(db, table)]));
}

afterEach(() => {
  while (createdDirs.length > 0) {
    rmSync(createdDirs.pop()!, { recursive: true, force: true });
  }
});

describe('initSchema', () => {
  it('is repeatable on a fresh database', () => {
    const db = makeTempDatabase();
    try {
      initSchema(db);

      const tables = [
        'locations',
        'surfaces',
        'panel_types',
        'surface_panel_assignments',
        'pv_arrays',
        'pv_strings',
        'array_to_mppt_mappings',
        'surface_configurations',
        'battery_bank_configurations',
        'inverter_configurations',
        'mppt_types',
        'battery_types',
        'inverter_types',
      ];

      const first = snapshotCounts(db, tables);

      expect(first.locations).toBe(1);
      expect(first.surfaces).toBeGreaterThan(0);
      expect(first.panel_types).toBeGreaterThan(0);
      expect(first.surface_panel_assignments).toBeGreaterThan(0);
      expect(first.pv_arrays).toBeGreaterThan(0);
      expect(first.pv_strings).toBeGreaterThan(0);
      expect(first.array_to_mppt_mappings).toBeGreaterThan(0);
      expect(first.mppt_types).toBeGreaterThan(0);
      expect(first.battery_types).toBeGreaterThan(0);
      expect(first.inverter_types).toBeGreaterThan(0);
      expect(first.inverter_configurations).toBe(1);

      initSchema(db);

      const second = snapshotCounts(db, tables);
      expect(second).toEqual(first);
    } finally {
      db.close();
    }
  });
});
