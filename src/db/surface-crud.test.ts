import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openDb } from './connection.js';
import { ensureDatabaseReady } from '../server/bootstrap.js';
import { buildDigitalTwinExport } from '../output/exportDigitalTwin.js';
import {
  createRoofFace,
  deleteRoofFace,
  getArrayToMpptMapping,
  getPvArrayByRoofFace,
  getRoofFace,
  getRoofFaceConfiguration,
  listRoofFaces,
  syncPvTopologyForRoofFace,
  updateRoofFace,
  upsertRoofFaceConfiguration,
  upsertRoofPanel,
} from './queries.js';

const createdDirs: string[] = [];

function makeTempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'offgridos-surface-crud-'));
  createdDirs.push(dir);
  return join(dir, 'project.db');
}

afterEach(() => {
  while (createdDirs.length > 0) {
    rmSync(createdDirs.pop()!, { recursive: true, force: true });
  }
});

describe('surface CRUD helpers', () => {
  it('given a new surface, when it is created, then it receives synced PV topology and export data', () => {
    const dbPath = makeTempDbPath();
    ensureDatabaseReady(dbPath);
    const db = openDb(dbPath);

    try {
      const roofFaceId = 'surface-crud-create';
      createRoofFace(db, {
        roof_face_id: roofFaceId,
        name: 'Surface CRUD Create',
        orientation_deg: 135,
        tilt_deg: 25,
        usable_area_m2: undefined,
        notes: 'temporary test surface',
      });

      const surface = getRoofFace(db, roofFaceId);
      expect(surface).not.toBeNull();
      expect(surface?.name).toBe('Surface CRUD Create');

      const array = getPvArrayByRoofFace(db, roofFaceId);
      expect(array).not.toBeNull();
      expect(array?.roof_face_id).toBe(roofFaceId);
      expect(array?.panel_count).toBe(0);

      const exportData = buildDigitalTwinExport(db, dbPath);
      expect(exportData.entities.roof_faces.some((item) => item.roof_face_id === roofFaceId)).toBe(true);
      expect(exportData.entities.arrays.some((item) => item.roof_face_id === roofFaceId)).toBe(true);
      expect(exportData.entities.strings.some((item) => item.roof_face_id === roofFaceId)).toBe(false);
      expect(exportData.relationships.array_to_mppt.some((item) => item.from_array_id === `array-${roofFaceId}`)).toBe(true);
    } finally {
      db.close();
    }
  });

  it('given an existing surface list, when a new surface is created, then it is appended last and starts without an MPPT assignment', () => {
    const dbPath = makeTempDbPath();
    ensureDatabaseReady(dbPath);
    const db = openDb(dbPath);

    try {
      const before = listRoofFaces(db).map((item) => item.roof_face_id);
      const roofFaceId = 'surface-crud-append-last';

      createRoofFace(db, {
        roof_face_id: roofFaceId,
        name: 'Surface CRUD Append Last',
        orientation_deg: 180,
        tilt_deg: 25,
        usable_area_m2: undefined,
        notes: undefined,
      });

      const after = listRoofFaces(db).map((item) => item.roof_face_id);
      expect(after.at(-1)).toBe(roofFaceId);
      expect(after.slice(0, -1)).toEqual(before);

      const configuration = getRoofFaceConfiguration(db, roofFaceId);
      expect(configuration).toBeNull();

      const mapping = getArrayToMpptMapping(db, `array-${roofFaceId}`);
      expect(mapping).not.toBeNull();
      expect(mapping?.selected_mppt_type_id).toBeNull();
    } finally {
      db.close();
    }
  });

  it('given an existing surface, when it is updated, then the surface and derived array stay in sync', () => {
    const dbPath = makeTempDbPath();
    ensureDatabaseReady(dbPath);
    const db = openDb(dbPath);

    try {
      const roofFaceId = 'surface-crud-update';
      createRoofFace(db, {
        roof_face_id: roofFaceId,
        name: 'Surface CRUD Update',
        orientation_deg: 90,
        tilt_deg: 30,
        usable_area_m2: undefined,
        notes: undefined,
      });

      updateRoofFace(db, {
        roof_face_id: roofFaceId,
        name: 'Surface CRUD Updated',
        orientation_deg: 180,
        tilt_deg: 15,
        usable_area_m2: 24,
        notes: 'updated test surface',
      });
      syncPvTopologyForRoofFace(db, roofFaceId);

      const surface = getRoofFace(db, roofFaceId);
      expect(surface?.name).toBe('Surface CRUD Updated');
      expect(surface?.orientation_deg).toBe(180);
      expect(surface?.tilt_deg).toBe(15);

      const array = getPvArrayByRoofFace(db, roofFaceId);
      expect(array?.name).toBe('Surface CRUD Updated');

      const exportData = buildDigitalTwinExport(db, dbPath);
      const exportedSurface = exportData.entities.roof_faces.find((item) => item.roof_face_id === roofFaceId);
      const exportedArray = exportData.entities.arrays.find((item) => item.roof_face_id === roofFaceId);

      expect(exportedSurface?.name).toBe('Surface CRUD Updated');
      expect(exportedArray?.name).toBe('Surface CRUD Updated');
      expect(exportedArray?.panel_count).toBe(0);
    } finally {
      db.close();
    }
  });

  it('given an existing surface with topology, when it is deleted, then the surface and dependent rows disappear', () => {
    const dbPath = makeTempDbPath();
    ensureDatabaseReady(dbPath);
    const db = openDb(dbPath);

    try {
      const roofFaceId = 'surface-crud-delete';
      const panelTypeId = 'aiko-475-all-black';

      createRoofFace(db, {
        roof_face_id: roofFaceId,
        name: 'Surface CRUD Delete',
        orientation_deg: 270,
        tilt_deg: 20,
        usable_area_m2: undefined,
        notes: undefined,
      });

      upsertRoofPanel(db, {
        roof_face_id: roofFaceId,
        panel_type_id: panelTypeId,
        count: 4,
      });

      upsertRoofFaceConfiguration(db, {
        roof_face_id: roofFaceId,
        panels_per_string: 2,
        parallel_strings: 2,
        selected_mppt_type_id: null,
      });

      expect(getRoofFace(db, roofFaceId)).not.toBeNull();
      expect(getPvArrayByRoofFace(db, roofFaceId)).not.toBeNull();
      expect(getArrayToMpptMapping(db, `array-${roofFaceId}`)).not.toBeNull();

      deleteRoofFace(db, roofFaceId);

      expect(getRoofFace(db, roofFaceId)).toBeNull();
      expect(getPvArrayByRoofFace(db, roofFaceId)).toBeNull();
      expect(getArrayToMpptMapping(db, `array-${roofFaceId}`)).toBeNull();
      expect(listRoofFaces(db).some((item) => item.roof_face_id === roofFaceId)).toBe(false);

      const exportData = buildDigitalTwinExport(db, dbPath);
      expect(exportData.entities.roof_faces.some((item) => item.roof_face_id === roofFaceId)).toBe(false);
      expect(exportData.entities.arrays.some((item) => item.roof_face_id === roofFaceId)).toBe(false);
      expect(exportData.entities.strings.some((item) => item.roof_face_id === roofFaceId)).toBe(false);
      expect(exportData.relationships.array_to_mppt.some((item) => item.from_array_id === `array-${roofFaceId}`)).toBe(false);
    } finally {
      db.close();
    }
  });
});
