import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { openDb } from './connection.js';
import { ensureDatabaseReady } from '../server/bootstrap.js';
import { buildDigitalTwinExport } from '../output/exportDigitalTwin.js';
import { deleteBatteryType, getBatteryType, insertBatteryType, listBatteryTypes, updateBatteryType } from './queries.js';

const createdDirs: string[] = [];

function makeTempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'offgridos-battery-types-'));
  createdDirs.push(dir);
  return join(dir, 'project.db');
}

afterEach(() => {
  while (createdDirs.length > 0) {
    rmSync(createdDirs.pop()!, { recursive: true, force: true });
  }
});

describe('battery type catalog helpers', () => {
  it('insert, update, export, and delete battery types without binding errors', () => {
    const dbPath = makeTempDbPath();
    ensureDatabaseReady(dbPath);
    const db = openDb(dbPath);

    try {
      const initialCount = listBatteryTypes(db).length;

      insertBatteryType(db, {
        battery_type_id: 'test-battery-1',
        brand: 'TestBrand',
        model: 'Test Battery 1',
        chemistry: 'LiFePO4',
        nominal_voltage: 48,
        capacity_ah: 100,
        capacity_kwh: 4.8,
        max_charge_rate: 50,
        max_discharge_rate: 50,
        victron_can: true,
        cooling: 'passive',
        price: 500,
        source: 'https://example.com',
        url: 'https://example.com',
        notes: 'temporary test',
      });

      const inserted = getBatteryType(db, 'test-battery-1');
      expect(inserted).not.toBeNull();
      expect(inserted?.price_per_kwh).toBe(104.17);
      expect(listBatteryTypes(db)).toHaveLength(initialCount + 1);

      updateBatteryType(db, {
        battery_type_id: 'test-battery-1',
        brand: 'TestBrand',
        model: 'Test Battery 1 Updated',
        chemistry: 'LiFePO4',
        nominal_voltage: 48,
        capacity_ah: 100,
        capacity_kwh: 4.8,
        max_charge_rate: 55,
        max_discharge_rate: 55,
        victron_can: true,
        cooling: 'active',
        price: 480,
        source: 'https://example.com',
        url: 'https://example.com',
        notes: 'updated test',
      });

      const updated = getBatteryType(db, 'test-battery-1');
      expect(updated).not.toBeNull();
      expect(updated?.model).toBe('Test Battery 1 Updated');
      expect(updated?.cooling).toBe('active');
      expect(updated?.price_per_kwh).toBe(100);

      const exportData = buildDigitalTwinExport(db, dbPath);
      expect(exportData.entities.battery_types).toHaveLength(initialCount + 1);
      expect(exportData.derived.summary.battery_type_count).toBe(initialCount + 1);

      deleteBatteryType(db, 'test-battery-1');
      expect(getBatteryType(db, 'test-battery-1')).toBeNull();
      expect(listBatteryTypes(db)).toHaveLength(initialCount);
    } finally {
      db.close();
    }
  });
});
