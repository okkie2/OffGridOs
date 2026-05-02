import type Database from 'better-sqlite3';
import type { DigitalTwinExport } from './exportDigitalTwin.js';
import { buildDigitalTwinExport } from './exportDigitalTwin.js';
import type { Surface } from '../domain/types.js';
import {
  createSurface,
  createProject,
  deleteProject,
  upsertArrayToMpptMapping,
  setProjectPreference,
  upsertBatteryBankConfiguration,
  upsertConversionDevice,
  upsertInverterConfiguration,
  upsertLoad,
  upsertLoadCircuit,
  upsertLocation,
  upsertPvArray,
  upsertPvString,
  upsertProjectConverter,
  upsertSurfaceConfiguration,
  getPanelType,
  insertPanelType,
  updatePanelType,
  getCabinetType,
  insertCabinetType,
  updateCabinetType,
  getMpptType,
  insertMpptType,
  updateMpptType,
  getBatteryType,
  insertBatteryType,
  updateBatteryType,
  getInverterType,
  insertInverterType,
  updateInverterType,
} from '../db/queries.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('Invalid digital twin export payload.');
  }
  return value.trim();
}

function upsertPanelTypeRecord(db: Database.Database, row: DigitalTwinExport['entities']['panel_types'][number]): void {
  const { id: _id, ...data } = row;
  if (getPanelType(db, data.panel_type_id)) {
    updatePanelType(db, data);
  } else {
    insertPanelType(db, data);
  }
}

function upsertCabinetTypeRecord(db: Database.Database, row: DigitalTwinExport['entities']['cabinet_types'][number]): void {
  const { id: _id, ...data } = row;
  if (getCabinetType(db, data.cabinet_type_id)) {
    updateCabinetType(db, data);
  } else {
    insertCabinetType(db, data);
  }
}

function upsertMpptTypeRecord(db: Database.Database, row: DigitalTwinExport['entities']['mppt_types'][number]): void {
  const { id: _id, ...data } = row;
  if (getMpptType(db, data.mppt_type_id)) {
    updateMpptType(db, data);
  } else {
    insertMpptType(db, data);
  }
}

function upsertBatteryTypeRecord(db: Database.Database, row: DigitalTwinExport['entities']['battery_types'][number]): void {
  const { id: _id, ...data } = row;
  if (getBatteryType(db, data.battery_type_id)) {
    updateBatteryType(db, data);
  } else {
    insertBatteryType(db, data);
  }
}

function upsertInverterTypeRecord(db: Database.Database, row: DigitalTwinExport['entities']['inverter_types'][number]): void {
  const { id: _id, ...data } = row;
  if (getInverterType(db, data.inverter_id)) {
    updateInverterType(db, data);
  } else {
    insertInverterType(db, data);
  }
}

export function importDigitalTwinExport(db: Database.Database, dbPath: string, payload: unknown): DigitalTwinExport {
  if (!isRecord(payload) || !isRecord(payload.project) || !isRecord(payload.entities)) {
    throw new Error('Invalid digital twin export payload.');
  }

  const exportData = payload as unknown as DigitalTwinExport;
  const projectId = readString(exportData.project.project_id);
  const projectTitle = typeof exportData.project.name === 'string' && exportData.project.name.trim() !== ''
    ? exportData.project.name.trim()
    : projectId;
  const locations = Array.isArray(exportData.project.locations) ? exportData.project.locations : [];
  const projectPreferences = isRecord(exportData.project.project_preferences)
    ? exportData.project.project_preferences
    : (isRecord(exportData.project.preferences) ? exportData.project.preferences : {});
  const activeLocationId = typeof exportData.project.active_location_id === 'string' && exportData.project.active_location_id.trim() !== ''
    ? exportData.project.active_location_id.trim()
    : null;
  const mpptTypeByConfigurationId = new Map(
    (exportData.entities.mppt_configurations ?? []).map((configuration) => [
      configuration.mppt_configuration_id,
      configuration.mppt_type_id ?? null,
    ]),
  );

  db.transaction(() => {
    deleteProject(db, projectId);
    createProject(db, projectId, projectTitle);

    for (const rawLocation of locations) {
      if (!isRecord(rawLocation)) {
        continue;
      }

      const { project_id: _projectId, location_id: locationId, ...locationData } = rawLocation;
      if (typeof locationId !== 'string' || locationId.trim() === '') {
        continue;
      }

      upsertLocation(db, locationData as Parameters<typeof upsertLocation>[1], projectId, locationId);
    }

    for (const [key, value] of Object.entries(projectPreferences)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        setProjectPreference(db, projectId, key, String(value));
      } else if (typeof value === 'string' && value.trim() !== '') {
        setProjectPreference(db, projectId, key, value.trim());
      } else if (typeof value === 'boolean') {
        setProjectPreference(db, projectId, key, value ? 'true' : 'false');
      }
    }

    for (const row of exportData.entities.panel_types ?? []) {
      upsertPanelTypeRecord(db, row);
    }
    for (const row of exportData.entities.cabinet_types ?? []) {
      upsertCabinetTypeRecord(db, row);
    }
    for (const row of exportData.entities.mppt_types ?? []) {
      upsertMpptTypeRecord(db, row);
    }
    for (const row of exportData.entities.battery_types ?? []) {
      upsertBatteryTypeRecord(db, row);
    }
    for (const row of exportData.entities.inverter_types ?? []) {
      upsertInverterTypeRecord(db, row);
    }
    for (const row of exportData.entities.converter_types ?? []) {
      upsertConversionDevice(db, row);
    }

    for (const rawSurface of exportData.entities.surfaces ?? []) {
      if (!isRecord(rawSurface)) {
        continue;
      }
      const { id: _id, project_id: _projectId, location_id: _locationId, ...surfaceData } = rawSurface;
      const locationId = typeof rawSurface.location_id === 'string' && rawSurface.location_id.trim() !== ''
        ? rawSurface.location_id.trim()
        : activeLocationId;
      createSurface(db, surfaceData as Omit<Surface, 'id' | 'project_id' | 'location_id'>, projectId, locationId);
    }

    for (const row of exportData.entities.surface_configurations ?? []) {
      upsertSurfaceConfiguration(db, row);
    }
    for (const row of exportData.entities.battery_bank_configurations ?? []) {
      upsertBatteryBankConfiguration(db, row, projectId, activeLocationId);
    }
    for (const row of exportData.entities.inverter_configurations ?? []) {
      upsertInverterConfiguration(db, {
        inverter_configuration_id: row.inverter_configuration_id,
        selected_inverter_type_id: row.inverter_id ?? null,
        selected_cabinet_type_id: row.selected_cabinet_type_id ?? null,
        selected_dc_busbar_id: null,
        title: row.title ?? null,
        description: row.description ?? null,
        image_data_url: row.image_data_url ?? null,
        notes: row.notes ?? null,
      }, projectId, activeLocationId);
    }
    for (const row of exportData.entities.converters ?? []) {
      upsertProjectConverter(db, row, projectId, activeLocationId);
    }
    for (const row of exportData.entities.load_circuits ?? []) {
      upsertLoadCircuit(db, row, projectId, activeLocationId);
    }
    for (const row of exportData.entities.loads ?? []) {
      upsertLoad(db, row, projectId, activeLocationId);
    }

    for (const row of exportData.entities.pv_arrays ?? []) {
      upsertPvArray(db, row);
    }
    for (const row of exportData.entities.pv_strings ?? []) {
      upsertPvString(db, row);
    }
    for (const relation of exportData.relationships.array_to_mppt ?? []) {
      upsertArrayToMpptMapping(db, {
        mapping_id: relation.relationship_id,
        array_id: relation.from_array_id,
        selected_mppt_type_id: mpptTypeByConfigurationId.get(relation.to_mppt_configuration_id) ?? null,
        project_id: projectId,
        location_id: activeLocationId,
      });
    }
  })();

  return buildDigitalTwinExport(db, dbPath, projectId, activeLocationId);
}
