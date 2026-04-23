import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { initSchema } from './schema.js';
import { getArrayToMpptMapping, getSurfaceConfiguration } from './queries.js';

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
      expect(first.pv_arrays).toBe(0);
      expect(first.pv_strings).toBe(0);
      expect(first.array_to_mppt_mappings).toBe(0);
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

  it('preserves bootability even when stale MPPT references exist in legacy derived rows', () => {
    const db = makeTempDatabase();
    try {
      db.exec('PRAGMA foreign_keys = OFF;');
      initSchema(db);

      db.prepare(`
        INSERT INTO pv_arrays (array_id, surface_id, name, panel_type_id, panel_count, panels_per_string, parallel_strings, installed_wp, notes)
        VALUES ('array-flat-ne', 'flat-ne', 'Flat NE', NULL, 0, NULL, NULL, 0, 'legacy row')
      `).run();

      db.prepare(`
        INSERT INTO array_to_mppt_mappings (mapping_id, array_id, selected_mppt_type_id)
        VALUES ('array-mppt-flat-ne', 'array-flat-ne', NULL)
      `).run();

      db.prepare(`
        UPDATE surface_configurations
        SET selected_mppt_type_id = 'missing-mppt'
        WHERE surface_id = 'flat-ne'
      `).run();

      db.prepare(`
        UPDATE array_to_mppt_mappings
        SET selected_mppt_type_id = 'missing-mppt'
        WHERE array_id = 'array-flat-ne'
      `).run();
      db.exec('PRAGMA foreign_keys = ON;');

      expect(() => initSchema(db)).not.toThrow();
      expect(getArrayToMpptMapping(db, 'array-flat-ne')?.selected_mppt_type_id ?? null).toBe('missing-mppt');
    } finally {
      db.close();
    }
  });

  it('leaves legacy PV array ids untouched during bootstrap', () => {
    const db = makeTempDatabase();
    try {
      db.exec('PRAGMA foreign_keys = OFF;');
      initSchema(db);

      db.prepare(`
        INSERT INTO pv_arrays (array_id, surface_id, name, panel_type_id, panel_count, panels_per_string, parallel_strings, installed_wp, notes)
        VALUES ('legacy-flat-ne', 'flat-ne', 'Flat NE', NULL, 0, NULL, NULL, 0, 'legacy row')
      `).run();

      db.prepare(`
        INSERT INTO array_to_mppt_mappings (mapping_id, array_id, selected_mppt_type_id)
        VALUES ('array-mppt-flat-ne', 'legacy-flat-ne', NULL)
      `).run();

      db.prepare(`
        INSERT INTO pv_strings (string_id, array_id, surface_id, string_index, panel_type_id, panel_count)
        VALUES ('string-flat-ne-1', 'legacy-flat-ne', 'flat-ne', 1, NULL, 0)
      `).run();

      db.exec('PRAGMA foreign_keys = ON;');

      expect(() => initSchema(db)).not.toThrow();
      expect(db.prepare('SELECT array_id FROM pv_arrays WHERE surface_id = ?').get('flat-ne')).toEqual({ array_id: 'legacy-flat-ne' });
      expect(db.prepare('SELECT COUNT(*) AS count FROM pv_strings WHERE array_id = ?').get('legacy-flat-ne')).toEqual({ count: 1 });
      expect(getArrayToMpptMapping(db, 'legacy-flat-ne')?.selected_mppt_type_id ?? null).toBeNull();
    } finally {
      db.close();
    }
  });

  it('leaves corrupted legacy array-to-mppt rows untouched during bootstrap', () => {
    const db = makeTempDatabase();
    try {
      db.exec('PRAGMA foreign_keys = OFF;');
      initSchema(db);

      db.prepare(`
        INSERT INTO pv_arrays (array_id, surface_id, name, panel_type_id, panel_count, panels_per_string, parallel_strings, installed_wp, notes)
        VALUES ('array-flat-ne', 'flat-ne', 'Flat NE', NULL, 0, NULL, NULL, 0, 'legacy row')
      `).run();

      db.prepare(`
        INSERT INTO array_to_mppt_mappings (mapping_id, array_id, selected_mppt_type_id)
        VALUES ('array-mppt-flat-ne', 'array-flat-ne', NULL)
      `).run();

      db.prepare(`
        UPDATE array_to_mppt_mappings
        SET array_id = 'broken-array-id', selected_mppt_type_id = 'missing-mppt'
        WHERE mapping_id = 'array-mppt-flat-ne'
      `).run();
      db.exec('PRAGMA foreign_keys = ON;');

      expect(() => initSchema(db)).not.toThrow();
      expect(getArrayToMpptMapping(db, 'broken-array-id')?.selected_mppt_type_id ?? null).toBe('missing-mppt');
      expect(db.prepare('SELECT COUNT(*) AS count FROM array_to_mppt_mappings WHERE mapping_id = ?').get('array-mppt-flat-ne')).toEqual({ count: 1 });
    } finally {
      db.close();
    }
  });

  it('does not rebuild corrupted derived pv topology rows on bootstrap', () => {
    const db = makeTempDatabase();
    try {
      db.exec('PRAGMA foreign_keys = OFF;');
      initSchema(db);
      db.exec('PRAGMA foreign_keys = ON;');

      expect(() => initSchema(db)).not.toThrow();
      expect(db.prepare('SELECT COUNT(*) AS count FROM pv_arrays').get()).toEqual({ count: 0 });
      expect(db.prepare('SELECT COUNT(*) AS count FROM pv_strings').get()).toEqual({ count: 0 });
      expect(db.prepare('SELECT COUNT(*) AS count FROM array_to_mppt_mappings').get()).toEqual({ count: 0 });
    } finally {
      db.close();
    }
  });
});
