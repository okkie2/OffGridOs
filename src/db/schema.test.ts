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

function hasTable(db: Database.Database, table: string): boolean {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table) as { name?: string } | undefined;
  return Boolean(row);
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
        'cabinet_types',
        'conversion_devices',
        'load_circuits',
        'loads',
        'surface_panel_assignments',
        'pv_arrays',
        'pv_strings',
        'array_to_mppt_mappings',
        'surface_configurations',
        'battery_bank_configurations',
        'dc_busbars',
        'inverter_configurations',
        'mppt_types',
        'battery_types',
        'inverter_types',
      ];

      const first = snapshotCounts(db, tables);

      expect(first.locations).toBe(1);
      expect(first.surfaces).toBeGreaterThan(0);
      expect(first.panel_types).toBeGreaterThan(0);
      expect(first.cabinet_types).toBe(0);
      expect(first.conversion_devices).toBeGreaterThan(0);
      expect(first.load_circuits).toBe(0);
      expect(first.loads).toBe(0);
      expect(first.surface_panel_assignments).toBeGreaterThan(0);
      expect(first.pv_arrays).toBe(0);
      expect(first.pv_strings).toBe(0);
      expect(first.array_to_mppt_mappings).toBe(0);
      expect(first.mppt_types).toBeGreaterThan(0);
      expect(first.battery_types).toBeGreaterThan(0);
      expect(first.dc_busbars).toBe(0);
      expect(first.inverter_types).toBeGreaterThan(0);
      expect(first.inverter_configurations).toBe(1);

      initSchema(db);

      const second = snapshotCounts(db, tables);
      expect(second).toEqual(first);
    } finally {
      db.close();
    }
  });

  it('creates a cabinet lookup column on the battery-bank configuration table', () => {
    const db = makeTempDatabase();
    try {
      initSchema(db);

      const columns = db.prepare("PRAGMA table_info('battery_bank_configurations')").all() as Array<{ name: string }>;
      expect(columns.some((column) => column.name === 'selected_cabinet_type_id')).toBe(true);
      expect(columns.some((column) => column.name === 'selected_dc_busbar_id')).toBe(true);
    } finally {
      db.close();
    }
  });

  it('creates a busbar lookup column on the inverter configuration table', () => {
    const db = makeTempDatabase();
    try {
      initSchema(db);

      const columns = db.prepare("PRAGMA table_info('inverter_configurations')").all() as Array<{ name: string }>;
      expect(columns.some((column) => column.name === 'selected_dc_busbar_id')).toBe(true);
    } finally {
      db.close();
    }
  });

  it('drops the legacy location table and preserves its data when needed', () => {
    const db = makeTempDatabase();
    try {
      db.exec(`
        CREATE TABLE location (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          country TEXT NOT NULL,
          place_name TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          northing REAL,
          easting REAL
        );
      `);
      db.prepare(`
        INSERT INTO location (country, place_name, latitude, longitude, northing, easting)
        VALUES ('NL', 'Legacy site', 52.1, 5.1, 100, 200)
      `).run();

      initSchema(db);

      expect(hasTable(db, 'location')).toBe(false);
      expect(hasTable(db, 'locations')).toBe(true);
      expect(countRows(db, 'locations')).toBe(1);
      const row = db.prepare('SELECT country, place_name, latitude, longitude, northing, easting FROM locations LIMIT 1').get() as {
        country: string;
        place_name: string;
        latitude: number;
        longitude: number;
        northing: number | null;
        easting: number | null;
      };
      expect(row).toEqual({
        country: 'NL',
        place_name: 'Legacy site',
        latitude: 52.1,
        longitude: 5.1,
        northing: 100,
        easting: 200,
      });
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
