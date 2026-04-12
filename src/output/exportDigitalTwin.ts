import fs from 'fs';
import path from 'path';
import type Database from 'better-sqlite3';
import type {
  BatteryType,
  Inverter,
  Location,
  MpptType,
  PanelType,
  Preferences,
  RoofFace,
  RoofPanelAssignment,
} from '../domain/types.js';
import {
  getLocation,
  getPreferences,
  listBatteryTypes,
  listInverters,
  listMpptTypes,
  listPanelTypes,
  listRoofFaces,
  listRoofPanels,
} from '../db/queries.js';

interface ExportArray {
  array_id: string;
  roof_face_id: string;
  name: string;
  string_ids: string[];
  panel_assignment_ids: string[];
  installed_wp: number;
  notes?: string;
}

interface ExportProjectMppt {
  project_mppt_id: string;
  roof_face_id: string;
  array_id: string;
  mppt_type_id?: string;
  name: string;
  provisional: boolean;
  notes?: string;
}

interface ExportProject {
  project_id: string;
  name: string;
  location: {
    country: string;
    place_name: string;
    latitude: number;
    longitude: number;
  } | null;
  current_assumptions: {
    roof_face_to_array_default: '1:1';
    array_to_mppt_default: '1:1';
    project_mppts_provisional: boolean;
  };
  preferences: Preferences;
}

interface DigitalTwinExport {
  project: ExportProject;
  entities: {
    roof_faces: RoofFace[];
    panel_types: PanelType[];
    strings: [];
    arrays: ExportArray[];
    mppt_types: MpptType[];
    project_mppts: ExportProjectMppt[];
    battery_types: BatteryType[];
    battery_banks: [];
    inverter_types: Inverter[];
    project_inverters: [];
    branch_circuits: [];
    consumers: [];
    generators: [];
    consumer_monthly_profiles: [];
    generator_monthly_profiles: [];
    solar_monthly_profiles: [];
  };
  relationships: {
    array_to_mppt: Array<{
      relationship_id: string;
      from_array_id: string;
      to_project_mppt_id: string;
      evaluation: {
        electrical_status: 'within_limits';
        reasons: string[];
        notes: string;
      };
    }>;
    mppt_to_battery_bank: [];
    battery_bank_to_inverter: [];
    inverter_to_branch_circuit: [];
    branch_circuit_to_consumer: [];
  };
  derived: {
    string_states: [];
    array_states: Array<{
      array_id: string;
      installed_wp: number;
      roof_face_id: string;
      panel_count: number;
    }>;
    battery_bank_states: [];
    monthly_balance: Array<{
      month: string;
      solar_kwh: number | null;
      consumer_kwh: number | null;
      generator_kwh: number | null;
      battery_charge_kwh: number | null;
      battery_discharge_kwh: number | null;
      surplus_kwh: number | null;
      deficit_kwh: number | null;
      notes: string;
    }>;
    warnings: Array<{
      severity: 'info' | 'warning';
      scope: string;
      message: string;
      related_ids: string[];
    }>;
    summary: {
      total_installed_wp: number;
      roof_face_count: number;
      array_count: number;
      project_mppt_count: number;
      battery_type_count: number;
      inverter_type_count: number;
      has_outside_limits: false;
    };
  };
  meta: {
    generated_at: string;
    source_db_path: string;
    export_version: 1;
    units: {
      power: 'W';
      energy: 'kWh';
      voltage: 'V';
      current: 'A';
    };
  };
}

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const;

function toProject(location: Location | null, preferences: Preferences): ExportProject {
  return {
    project_id: 'offgridos-project',
    name: 'OffGridOS Baseline',
    location: location ? {
      country: location.country,
      place_name: location.place_name,
      latitude: location.latitude,
      longitude: location.longitude,
    } : null,
    current_assumptions: {
      roof_face_to_array_default: '1:1',
      array_to_mppt_default: '1:1',
      project_mppts_provisional: true,
    },
    preferences,
  };
}

function buildArrays(
  roofFaces: RoofFace[],
  roofPanels: RoofPanelAssignment[],
  panelTypes: PanelType[],
): { arrays: ExportArray[]; arrayStates: DigitalTwinExport['derived']['array_states']; totalInstalledWp: number } {
  const panelTypeById = new Map(panelTypes.map((panelType) => [panelType.panel_type_id, panelType]));
  const assignmentsByFace = new Map<string, RoofPanelAssignment[]>();

  for (const assignment of roofPanels) {
    const assignments = assignmentsByFace.get(assignment.roof_face_id) ?? [];
    assignments.push(assignment);
    assignmentsByFace.set(assignment.roof_face_id, assignments);
  }

  const arrays: ExportArray[] = [];
  const arrayStates: DigitalTwinExport['derived']['array_states'] = [];
  let totalInstalledWp = 0;

  for (const roofFace of roofFaces) {
    const assignments = assignmentsByFace.get(roofFace.roof_face_id) ?? [];
    const installedWp = assignments.reduce((sum, assignment) => {
      const panelType = panelTypeById.get(assignment.panel_type_id);
      return sum + (panelType ? panelType.wp * assignment.count : 0);
    }, 0);
    const panelCount = assignments.reduce((sum, assignment) => sum + assignment.count, 0);
    const arrayId = `array-${roofFace.roof_face_id}`;

    arrays.push({
      array_id: arrayId,
      roof_face_id: roofFace.roof_face_id,
      name: roofFace.name,
      string_ids: [],
      panel_assignment_ids: assignments.map((assignment) => `roof-panel-${assignment.id}`),
      installed_wp: installedWp,
      notes: assignments.length === 0 ? 'No panel assignment currently present for this roof face.' : undefined,
    });

    arrayStates.push({
      array_id: arrayId,
      installed_wp: installedWp,
      roof_face_id: roofFace.roof_face_id,
      panel_count: panelCount,
    });

    totalInstalledWp += installedWp;
  }

  return { arrays, arrayStates, totalInstalledWp };
}

function buildProjectMppts(arrays: ExportArray[]): ExportProjectMppt[] {
  return arrays.map((array) => ({
    project_mppt_id: `project-mppt-${array.roof_face_id}`,
    roof_face_id: array.roof_face_id,
    array_id: array.array_id,
    name: `${array.name} MPPT`,
    provisional: true,
    notes: 'Derived placeholder until explicit project MPPT selections are stored.',
  }));
}

function buildMonthlyBalance(): DigitalTwinExport['derived']['monthly_balance'] {
  return MONTHS.map((month) => ({
    month,
    solar_kwh: null,
    consumer_kwh: null,
    generator_kwh: null,
    battery_charge_kwh: null,
    battery_discharge_kwh: null,
    surplus_kwh: null,
    deficit_kwh: null,
    notes: 'Monthly balance is not calculated yet in the current export foundation.',
  }));
}

export function buildDigitalTwinExport(db: Database.Database, dbPath: string): DigitalTwinExport {
  const location = getLocation(db);
  const preferences = getPreferences(db);
  const roofFaces = listRoofFaces(db);
  const panelTypes = listPanelTypes(db);
  const roofPanels = listRoofPanels(db);
  const mpptTypes = listMpptTypes(db);
  const batteryTypes = listBatteryTypes(db);
  const inverterTypes = listInverters(db);

  const { arrays, arrayStates, totalInstalledWp } = buildArrays(roofFaces, roofPanels, panelTypes);
  const projectMppts = buildProjectMppts(arrays);

  return {
    project: toProject(location, preferences),
    entities: {
      roof_faces: roofFaces,
      panel_types: panelTypes,
      strings: [],
      arrays,
      mppt_types: mpptTypes,
      project_mppts: projectMppts,
      battery_types: batteryTypes,
      battery_banks: [],
      inverter_types: inverterTypes,
      project_inverters: [],
      branch_circuits: [],
      consumers: [],
      generators: [],
      consumer_monthly_profiles: [],
      generator_monthly_profiles: [],
      solar_monthly_profiles: [],
    },
    relationships: {
      array_to_mppt: projectMppts.map((projectMppt) => ({
        relationship_id: `${projectMppt.array_id}__${projectMppt.project_mppt_id}`,
        from_array_id: projectMppt.array_id,
        to_project_mppt_id: projectMppt.project_mppt_id,
        evaluation: {
          electrical_status: 'within_limits',
          reasons: ['provisional_project_mppt'],
          notes: 'This relationship is a structural placeholder until explicit project MPPT selections and calculator outputs exist.',
        },
      })),
      mppt_to_battery_bank: [],
      battery_bank_to_inverter: [],
      inverter_to_branch_circuit: [],
      branch_circuit_to_consumer: [],
    },
    derived: {
      string_states: [],
      array_states: arrayStates,
      battery_bank_states: [],
      monthly_balance: buildMonthlyBalance(),
      warnings: [
        {
          severity: 'info',
          scope: 'export',
          message: 'Arrays and project MPPTs are currently derived from roof-face assignments and are not yet persisted explicitly.',
          related_ids: arrays.map((array) => array.array_id),
        },
        {
          severity: 'info',
          scope: 'monthly_balance',
          message: 'Monthly balance values are placeholders until the first calculation pipeline is implemented.',
          related_ids: [],
        },
      ],
      summary: {
        total_installed_wp: totalInstalledWp,
        roof_face_count: roofFaces.length,
        array_count: arrays.length,
        project_mppt_count: projectMppts.length,
        battery_type_count: batteryTypes.length,
        inverter_type_count: inverterTypes.length,
        has_outside_limits: false,
      },
    },
    meta: {
      generated_at: new Date().toISOString(),
      source_db_path: dbPath,
      export_version: 1,
      units: {
        power: 'W',
        energy: 'kWh',
        voltage: 'V',
        current: 'A',
      },
    },
  };
}

export function writeDigitalTwinExport(db: Database.Database, dbPath: string, outPath: string): string {
  const exportData = buildDigitalTwinExport(db, dbPath);
  const resolvedOutPath = path.resolve(outPath);
  fs.writeFileSync(resolvedOutPath, `${JSON.stringify(exportData, null, 2)}\n`, 'utf-8');
  return resolvedOutPath;
}
