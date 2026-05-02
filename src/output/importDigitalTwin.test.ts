import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openDb } from '../db/connection.js';
import { ensureDatabaseReady } from '../server/bootstrap.js';
import { buildDigitalTwinExport } from './exportDigitalTwin.js';
import { importDigitalTwinExport } from './importDigitalTwin.js';
import {
  createSurface,
  setPref,
  upsertConversionDevice,
  upsertLocation,
  upsertLoad,
  upsertLoadCircuit,
  upsertProjectConverter,
  upsertSurfaceConfiguration,
  upsertSurfacePanelAssignment,
  upsertInverterConfiguration,
} from '../db/queries.js';
import { DEFAULT_PROJECT_ID } from '../config/project.js';

const createdDirs: string[] = [];

function makeTempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'offgridos-import-export-'));
  createdDirs.push(dir);
  return join(dir, 'project.db');
}

afterEach(() => {
  while (createdDirs.length > 0) {
    rmSync(createdDirs.pop()!, { recursive: true, force: true });
  }
});

describe('importDigitalTwinExport', () => {
  it('round-trips a durable project export into a fresh database', () => {
    const sourcePath = makeTempDbPath();
    const projectId = DEFAULT_PROJECT_ID;
    ensureDatabaseReady(sourcePath);
    const sourceDb = openDb(sourcePath);

    try {
      const importedLocationId = 'import-location';
      upsertLocation(sourceDb, {
        title: 'Imported Location',
        country: 'NL',
        place_name: 'Importville',
        description: 'Location added for durable import/export coverage.',
        notes: 'Round-trip test location',
        latitude: 52.123456,
        longitude: 5.123456,
        northing: null,
        easting: null,
        site_photo_data_url: null,
      }, projectId, importedLocationId);

      const surfaceId = 'import-surface';
      createSurface(sourceDb, {
        surface_id: surfaceId,
        name: 'Import Surface',
        description: 'Surface used to exercise export/import round-tripping.',
        sort_order: 999,
        orientation_deg: 180,
        tilt_deg: 30,
        usable_area_m2: 18,
        area_height_m: null,
        area_width_m: null,
        notes: 'Round-trip surface',
        photo_data_url: null,
      }, projectId, importedLocationId);

      upsertSurfacePanelAssignment(sourceDb, {
        surface_id: surfaceId,
        panel_type_id: 'aiko-475-all-black',
        count: 3,
      });

      upsertSurfaceConfiguration(sourceDb, {
        surface_id: surfaceId,
        panels_per_string: 3,
        parallel_strings: 1,
        selected_mppt_type_id: 'victron-100-20',
      });

      const converterTypeId = 'import-test-converter-type';
      upsertConversionDevice(sourceDb, {
        converter_type_id: converterTypeId,
        title: 'Import Test Converter',
        description: 'A converter type added for round-trip coverage.',
        device_type: 'dc_dc_converter',
        input_voltage_v: 48,
        output_voltage_v: 12,
        continuous_power_w: 120,
        peak_power_va: 120,
        max_charge_current_a: 10,
        efficiency_pct: 88,
        output_ac_voltage_v: null,
        frequency_hz: null,
        surge_power_w: null,
        output_dc_voltage_v: 12,
        max_output_current_a: 10,
        price: 99,
        price_source_url: 'https://example.com/import-test-converter',
        notes: 'Round-trip converter type',
      });

      const converterId = 'import-test-converter';
      upsertProjectConverter(sourceDb, {
        converter_id: converterId,
        title: 'Imported Converter',
        description: 'Project-level converter instance added for round-trip coverage.',
        converter_type_id: converterTypeId,
      }, projectId, importedLocationId);

      const circuitId = 'import-test-circuit';
      upsertLoadCircuit(sourceDb, {
        load_circuit_id: circuitId,
        converter_id: converterId,
        converter_type_id: converterTypeId,
        title: 'Imported Circuit',
        description: 'Load circuit used in the round-trip coverage test.',
      }, projectId, importedLocationId);

      const loadId = 'import-test-load';
      upsertLoad(sourceDb, {
        load_id: loadId,
        load_circuit_id: circuitId,
        title: 'Imported Load',
        description: 'Small imported load',
        nominal_current_a: 0.5,
        nominal_power_w: 12,
        startup_current_a: null,
        surge_power_w: null,
        standby_power_w: 1,
        expected_usage_hours_per_day: 4,
        daily_energy_kwh: 0.048,
        duty_profile: 'evening',
        notes: 'Round-trip load',
        usage_kw: 0.012,
        spike_kw: 0.012,
        sleeping_kw: 0.001,
      }, projectId, importedLocationId);

      setPref(sourceDb, projectId, 'preferred_mppt_type_id', 'victron-100-20');
      upsertInverterConfiguration(sourceDb, {
        inverter_configuration_id: 'import-test-inverter-configuration',
        selected_inverter_type_id: 'victron-mrs-48-6000-100-450-100',
        selected_cabinet_type_id: null,
        selected_dc_busbar_id: null,
        title: 'Imported inverter configuration',
        description: 'Round-trip inverter configuration',
        image_data_url: null,
        notes: 'Round-trip inverter configuration',
      }, projectId, importedLocationId);

      const sourceExport = buildDigitalTwinExport(sourceDb, sourcePath, projectId, importedLocationId);
      expect(sourceExport.project.locations.some((location) => location.location_id === importedLocationId)).toBe(true);
      expect(sourceExport.entities.load_circuits.some((circuit) => circuit.load_circuit_id === circuitId)).toBe(true);
      expect(sourceExport.entities.loads.some((load) => load.load_id === loadId)).toBe(true);
      expect(sourceExport.entities.converter_types.some((converter) => converter.converter_type_id === converterTypeId)).toBe(true);
      expect(sourceExport.entities.pv_arrays.some((array) => array.surface_id === surfaceId)).toBe(true);
      expect(sourceExport.entities.pv_strings.some((string) => string.surface_id === surfaceId)).toBe(true);

      const targetPath = makeTempDbPath();
      ensureDatabaseReady(targetPath);
      const targetDb = openDb(targetPath);

      try {
        const importedExport = importDigitalTwinExport(targetDb, targetPath, sourceExport);

        expect(importedExport.project.project_id).toBe(projectId);
        expect(importedExport.project.locations.some((location) => location.location_id === importedLocationId)).toBe(true);
        expect(importedExport.entities.surfaces.some((surface) => surface.surface_id === surfaceId)).toBe(true);
        expect(importedExport.entities.converter_types.some((converter) => converter.converter_type_id === converterTypeId)).toBe(true);
        expect(importedExport.entities.converters.some((converter) => converter.converter_id === converterId)).toBe(true);
        expect(importedExport.entities.load_circuits.some((circuit) => circuit.load_circuit_id === circuitId)).toBe(true);
        expect(importedExport.entities.loads.some((load) => load.load_id === loadId)).toBe(true);
        expect(importedExport.entities.pv_arrays.some((array) => array.surface_id === surfaceId)).toBe(true);
        expect(importedExport.entities.pv_strings.some((string) => string.surface_id === surfaceId)).toBe(true);
        expect(importedExport.relationships.array_to_mppt.some((relation) => relation.from_array_id === `array-${surfaceId}`)).toBe(true);

        const roundTripExport = buildDigitalTwinExport(targetDb, targetPath, projectId, importedLocationId);
        expect(roundTripExport.project.project_id).toBe(sourceExport.project.project_id);
        expect(roundTripExport.entities.load_circuits.map((circuit) => circuit.load_circuit_id)).toContain(circuitId);
        expect(roundTripExport.entities.loads.map((load) => load.load_id)).toContain(loadId);
        expect(roundTripExport.entities.converter_types.map((converter) => converter.converter_type_id)).toContain(converterTypeId);
      } finally {
        targetDb.close();
      }
    } finally {
      sourceDb.close();
    }
  });
});
