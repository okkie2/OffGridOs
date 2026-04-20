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

function tableExists(db: Database.Database, table: string): boolean {
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
        'location',
        'roof_faces',
        'panel_types',
        'roof_panels',
        'arrays',
        'strings',
        'array_to_mppt_mappings',
        'roof_face_configurations',
        'battery_bank_configurations',
        'inverter_configurations',
        'mppt_types',
        'battery_types',
        'inverter_types',
      ];

      const first = snapshotCounts(db, tables);

      expect(first.location).toBe(1);
      expect(first.roof_faces).toBeGreaterThan(0);
      expect(first.panel_types).toBeGreaterThan(0);
      expect(first.roof_panels).toBeGreaterThan(0);
      expect(first.arrays).toBeGreaterThan(0);
      expect(first.strings).toBeGreaterThan(0);
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

  it('migrates legacy tables into the current schema', () => {
    const db = makeTempDatabase();
    try {
      db.exec(`
        CREATE TABLE inverters (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          inverter_id TEXT UNIQUE NOT NULL,
          model TEXT NOT NULL,
          input_voltage_v REAL NOT NULL,
          output_voltage_v REAL NOT NULL,
          continuous_power_w REAL NOT NULL,
          peak_power_va REAL NOT NULL,
          max_charge_current_a REAL NOT NULL,
          efficiency_pct REAL,
          price REAL,
          notes TEXT
        );

        CREATE TABLE roof_face_designs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          roof_face_id TEXT UNIQUE NOT NULL,
          panels_per_string INTEGER,
          parallel_strings INTEGER,
          selected_mppt_type_id TEXT
        );

        CREATE TABLE battery_bank_designs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          battery_bank_id TEXT UNIQUE NOT NULL,
          selected_battery_type_id TEXT,
          configured_battery_count INTEGER NOT NULL DEFAULT 1,
          batteries_per_string INTEGER NOT NULL DEFAULT 1,
          parallel_strings INTEGER NOT NULL DEFAULT 1
        );

        INSERT INTO inverters (
          inverter_id,
          model,
          input_voltage_v,
          output_voltage_v,
          continuous_power_w,
          peak_power_va,
          max_charge_current_a,
          efficiency_pct,
          price,
          notes
        ) VALUES (
          'victron-mp2-48-5000',
          'Migrated Multiplus',
          48,
          230,
          4100,
          5100,
          71,
          95.5,
          1234,
          'legacy inverter row'
        );

        INSERT INTO roof_face_designs (
          roof_face_id,
          panels_per_string,
          parallel_strings,
          selected_mppt_type_id
        ) VALUES (
          'flat-ne',
          7,
          2,
          NULL
        );

        INSERT INTO battery_bank_designs (
          battery_bank_id,
          selected_battery_type_id,
          configured_battery_count,
          batteries_per_string,
          parallel_strings
        ) VALUES (
          'house-bank',
          NULL,
          6,
          3,
          2
        );
      `);

      initSchema(db);

      expect(tableExists(db, 'inverters')).toBe(false);
      expect(tableExists(db, 'roof_face_designs')).toBe(false);
      expect(tableExists(db, 'battery_bank_designs')).toBe(false);
      expect(tableExists(db, 'arrays')).toBe(true);
      expect(tableExists(db, 'strings')).toBe(true);
      expect(tableExists(db, 'array_to_mppt_mappings')).toBe(true);
      expect(tableExists(db, 'inverter_types')).toBe(true);
      expect(tableExists(db, 'inverter_configurations')).toBe(true);
      expect(tableExists(db, 'roof_face_configurations')).toBe(true);
      expect(tableExists(db, 'battery_bank_configurations')).toBe(true);

      expect(countRows(db, 'inverter_types')).toBeGreaterThan(0);
      expect(countRows(db, 'inverter_configurations')).toBe(1);
      expect(countRows(db, 'arrays')).toBeGreaterThan(0);
      expect(countRows(db, 'strings')).toBeGreaterThan(0);
      expect(countRows(db, 'array_to_mppt_mappings')).toBeGreaterThan(0);
      expect(countRows(db, 'roof_face_configurations')).toBe(1);
      expect(countRows(db, 'battery_bank_configurations')).toBe(1);

      const migratedInverter = db.prepare('SELECT * FROM inverter_types WHERE inverter_id = ?').get('victron-mp2-48-5000') as { model: string; continuous_power_w: number; notes: string } | undefined;
      expect(migratedInverter).toBeDefined();
      expect(migratedInverter?.model).toBe('Migrated Multiplus');
      expect(migratedInverter?.continuous_power_w).toBe(4100);
      expect(migratedInverter?.notes).toBe('legacy inverter row');

      const migratedRoofFaceConfiguration = db.prepare('SELECT panels_per_string, parallel_strings, selected_mppt_type_id FROM roof_face_configurations WHERE roof_face_id = ?').get('flat-ne') as { panels_per_string: number; parallel_strings: number; selected_mppt_type_id: string | null } | undefined;
      expect(migratedRoofFaceConfiguration).toEqual({
        panels_per_string: 7,
        parallel_strings: 2,
        selected_mppt_type_id: null,
      });

      const migratedBatteryConfiguration = db.prepare('SELECT selected_battery_type_id, configured_battery_count, batteries_per_string, parallel_strings FROM battery_bank_configurations WHERE battery_bank_id = ?').get('house-bank') as {
        selected_battery_type_id: string | null;
        configured_battery_count: number;
        batteries_per_string: number;
        parallel_strings: number;
      } | undefined;
      expect(migratedBatteryConfiguration).toEqual({
        selected_battery_type_id: null,
        configured_battery_count: 6,
        batteries_per_string: 3,
        parallel_strings: 2,
      });
    } finally {
      db.close();
    }
  });
});
