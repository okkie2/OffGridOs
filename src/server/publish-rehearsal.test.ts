import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { buildDigitalTwinExport } from '../output/exportDigitalTwin.js';
import { getBatteryBankConfiguration, getInverterConfiguration, getLocation, getSurfaceConfiguration, upsertBatteryBankConfiguration, upsertInverterConfiguration, upsertLocation, upsertSurfaceConfiguration, upsertSurfacePanelAssignment } from '../db/queries.js';
import { openDb } from '../db/connection.js';
import { ensureDatabaseReady, withDb } from './bootstrap.js';

const createdDirs: string[] = [];

function makeTempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'offgridos-publish-'));
  createdDirs.push(dir);
  return join(dir, 'data', 'project.db');
}

afterEach(() => {
  while (createdDirs.length > 0) {
    rmSync(createdDirs.pop()!, { recursive: true, force: true });
  }
});

describe('publish rehearsal', () => {
  it('persists representative production state across a restart', () => {
    const dbPath = makeTempDbPath();

    ensureDatabaseReady(dbPath);
    expect(existsSync(dbPath)).toBe(true);

    withDb(dbPath, (db) => {
      upsertLocation(db, {
        country: 'NL',
        place_name: 'Warten',
        description: 'Farm site in Friesland',
        notes: 'Representative persisted location state',
        latitude: 53.126579,
        longitude: 5.899564,
        northing: 557800.12,
        easting: 181200.45,
        site_photo_data_url: 'data:image/png;base64,test-location-photo',
      });

      upsertSurfacePanelAssignment(db, {
        surface_id: 'flat-ne',
        panel_type_id: 'aiko-475-all-black',
        count: 4,
      });

      upsertSurfaceConfiguration(db, {
        surface_id: 'flat-ne',
        panels_per_string: 2,
        parallel_strings: 2,
        selected_mppt_type_id: 'victron-mrs-48-6000-100-450-100',
      });

      upsertBatteryBankConfiguration(db, {
        battery_bank_id: 'battery-bank-main',
        selected_battery_type_id: 'pylontech-us5000-1c',
        configured_battery_count: 4,
        batteries_per_string: 2,
        parallel_strings: 2,
      });

      upsertInverterConfiguration(db, {
        inverter_configuration_id: 'inverter-configuration-main',
        selected_inverter_type_id: 'victron-mp2-48-10000',
      });
    });

    const db = openDb(dbPath);
    try {
      const location = getLocation(db);
      const roofFaceConfiguration = getSurfaceConfiguration(db, 'flat-ne');
      const batteryBankConfiguration = getBatteryBankConfiguration(db, 'battery-bank-main');
      const inverterConfiguration = getInverterConfiguration(db, 'inverter-configuration-main');
      const exportData = buildDigitalTwinExport(db, dbPath);

      expect(location).not.toBeNull();
      expect(location?.place_name).toBe('Warten');
      expect(location?.description).toBe('Farm site in Friesland');
      expect(location?.notes).toBe('Representative persisted location state');
      expect(location?.site_photo_data_url).toBe('data:image/png;base64,test-location-photo');
      expect(location?.northing).toBeCloseTo(557800.12);
      expect(location?.easting).toBeCloseTo(181200.45);

      expect(roofFaceConfiguration).not.toBeNull();
      expect(roofFaceConfiguration?.panels_per_string).toBe(2);
      expect(roofFaceConfiguration?.parallel_strings).toBe(2);
      expect(roofFaceConfiguration?.selected_mppt_type_id).toBe('victron-mrs-48-6000-100-450-100');

      expect(batteryBankConfiguration).not.toBeNull();
      expect(batteryBankConfiguration?.configured_battery_count).toBe(4);
      expect(batteryBankConfiguration?.batteries_per_string).toBe(2);
      expect(batteryBankConfiguration?.parallel_strings).toBe(2);

      expect(inverterConfiguration).not.toBeNull();
      expect(inverterConfiguration?.selected_inverter_type_id).toBe('victron-mp2-48-10000');

      const flatNeArray = exportData.entities.pv_arrays.find((array) => array.surface_id === 'flat-ne');
      expect(flatNeArray).toBeDefined();
      expect(flatNeArray?.panel_count).toBe(4);
      expect(flatNeArray?.panels_per_string).toBe(2);
      expect(flatNeArray?.parallel_strings).toBe(2);

      const flatNeStrings = exportData.entities.pv_strings.filter((string) => string.surface_id === 'flat-ne');
      expect(flatNeStrings).toHaveLength(2);
      expect(flatNeStrings[0]?.panel_count).toBe(2);

      const flatNeMppt = exportData.entities.mppt_configurations.find((mppt) => mppt.surface_id === 'flat-ne');
      expect(flatNeMppt).toBeDefined();
      expect(flatNeMppt?.mppt_type_id).toBe('victron-mrs-48-6000-100-450-100');
      expect(flatNeMppt?.provisional).toBe(false);

      expect(exportData.entities.inverter_configurations[0]?.inverter_id).toBe('victron-mp2-48-10000');
      expect(exportData.project.location?.place_name).toBe('Warten');
      expect(exportData.project.location?.description).toBe('Farm site in Friesland');
      expect(exportData.project.location?.notes).toBe('Representative persisted location state');
      expect(exportData.project.location?.site_photo_data_url).toBe('data:image/png;base64,test-location-photo');
      expect(exportData.derived.summary.array_count).toBeGreaterThan(0);
      expect(exportData.derived.summary.mppt_configuration_count).toBeGreaterThan(0);
    } finally {
      db.close();
    }
  });
});
