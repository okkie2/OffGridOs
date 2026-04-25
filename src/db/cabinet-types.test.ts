import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { openDb } from './connection.js';
import { ensureDatabaseReady } from '../server/bootstrap.js';
import { buildDigitalTwinExport } from '../output/exportDigitalTwin.js';
import { deleteCabinetType, getCabinetType, insertCabinetType, listCabinetTypes, updateCabinetType } from './queries.js';

const createdDirs: string[] = [];

function makeTempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'offgridos-cabinet-types-'));
  createdDirs.push(dir);
  return join(dir, 'project.db');
}

afterEach(() => {
  while (createdDirs.length > 0) {
    rmSync(createdDirs.pop()!, { recursive: true, force: true });
  }
});

describe('cabinet type catalog helpers', () => {
  it('insert, update, export, and delete cabinet types without binding errors', () => {
    const dbPath = makeTempDbPath();
    ensureDatabaseReady(dbPath);
    const db = openDb(dbPath);

    try {
      const initialCount = listCabinetTypes(db).length;

      insertCabinetType(db, {
        cabinet_type_id: 'test-cabinet-1',
        title: 'Test Cabinet 1',
        description: 'temporary test',
        depth_mm: 600,
        width_mm: 800,
        height_mm: 2000,
        units: '42U',
        price: 1200,
        price_source_url: 'https://example.com',
        condensation_protection: true,
        insect_protection: true,
        dust_protection: true,
        outside_protection: false,
        frost_protection: true,
        fire_protection: false,
        ip_rating: 'IP55',
        insurance_rating: 'Class 60',
      });

      const inserted = getCabinetType(db, 'test-cabinet-1');
      expect(inserted).not.toBeNull();
      expect(inserted?.units).toBe('42U');
      expect(listCabinetTypes(db)).toHaveLength(initialCount + 1);

      updateCabinetType(db, {
        cabinet_type_id: 'test-cabinet-1',
        title: 'Test Cabinet 1 Updated',
        description: 'updated test',
        depth_mm: 650,
        width_mm: 850,
        height_mm: 2100,
        units: '48U',
        price: 1250,
        price_source_url: 'https://example.com',
        condensation_protection: true,
        insect_protection: false,
        dust_protection: true,
        outside_protection: false,
        frost_protection: true,
        fire_protection: false,
        ip_rating: 'IP65',
        insurance_rating: 'Class 60',
      });

      const updated = getCabinetType(db, 'test-cabinet-1');
      expect(updated).not.toBeNull();
      expect(updated?.title).toBe('Test Cabinet 1 Updated');
      expect(updated?.units).toBe('48U');

      const exportData = buildDigitalTwinExport(db, dbPath);
      expect(exportData.entities.cabinet_types).toHaveLength(initialCount + 1);

      deleteCabinetType(db, 'test-cabinet-1');
      expect(getCabinetType(db, 'test-cabinet-1')).toBeNull();
      expect(listCabinetTypes(db)).toHaveLength(initialCount);
    } finally {
      db.close();
    }
  });
});
