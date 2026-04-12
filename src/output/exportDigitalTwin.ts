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
  panel_type_id?: string;
  panel_count: number;
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
      input_voltage_v: number | null;
      input_current_a: number | null;
      input_power_w: number;
      evaluation: {
        electrical_status: 'within_limits' | 'outside_limits';
        fit_status?: 'optimal' | 'acceptable' | 'clipping_expected' | 'underutilized';
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
      input_voltage_v: number | null;
      input_current_a: number | null;
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
      has_outside_limits: boolean;
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
    const primaryAssignment = assignments[0];
    const primaryPanelType = primaryAssignment ? panelTypeById.get(primaryAssignment.panel_type_id) : undefined;
    const inputVoltage = primaryAssignment && primaryPanelType ? primaryAssignment.count * primaryPanelType.vmp : null;
    const inputCurrent = primaryPanelType ? primaryPanelType.imp : null;
    const arrayId = `array-${roofFace.roof_face_id}`;

    arrays.push({
      array_id: arrayId,
      roof_face_id: roofFace.roof_face_id,
      name: roofFace.name,
      string_ids: [],
      panel_assignment_ids: assignments.map((assignment) => `roof-panel-${assignment.id}`),
      panel_type_id: primaryAssignment?.panel_type_id,
      panel_count: panelCount,
      installed_wp: installedWp,
      notes: assignments.length === 0
        ? 'No panel assignment currently present for this roof face.'
        : 'Provisional assumption: current export treats each roof-face assignment as one series string for first MPPT-fit estimation.',
    });

    arrayStates.push({
      array_id: arrayId,
      installed_wp: installedWp,
      roof_face_id: roofFace.roof_face_id,
      panel_count: panelCount,
      input_voltage_v: inputVoltage,
      input_current_a: inputCurrent,
    });

    totalInstalledWp += installedWp;
  }

  return { arrays, arrayStates, totalInstalledWp };
}

function pickDerivedMpptType(array: ExportArray, panelTypesById: Map<string, PanelType>, mpptTypes: MpptType[]): MpptType | undefined {
  if (!array.panel_type_id) return undefined;
  const panelType = panelTypesById.get(array.panel_type_id);
  if (!panelType || array.panel_count <= 0) return undefined;

  const assumedVoc = array.panel_count * panelType.voc;
  const assumedChargeCurrent = array.installed_wp / 48;
  const candidates = mpptTypes.filter((mpptType) =>
    mpptType.max_voc >= assumedVoc
    && mpptType.max_pv_power >= array.installed_wp
    && mpptType.max_charge_current >= assumedChargeCurrent
    && mpptType.nominal_battery_voltage === 48,
  );

  return candidates.sort((left, right) => {
    if (left.max_voc !== right.max_voc) return left.max_voc - right.max_voc;
    if (left.max_pv_power !== right.max_pv_power) return left.max_pv_power - right.max_pv_power;
    return left.max_charge_current - right.max_charge_current;
  })[0];
}

function buildProjectMppts(
  arrays: ExportArray[],
  panelTypes: PanelType[],
  mpptTypes: MpptType[],
): ExportProjectMppt[] {
  const panelTypesById = new Map(panelTypes.map((panelType) => [panelType.panel_type_id, panelType]));
  return arrays.map((array) => {
    const derivedMpptType = pickDerivedMpptType(array, panelTypesById, mpptTypes);
    return {
      project_mppt_id: `project-mppt-${array.roof_face_id}`,
      roof_face_id: array.roof_face_id,
      array_id: array.array_id,
      mppt_type_id: derivedMpptType?.mppt_type_id,
      name: derivedMpptType ? `${array.name} ${derivedMpptType.model}` : `${array.name} MPPT`,
      provisional: true,
      notes: derivedMpptType
        ? 'Derived provisional MPPT choice based on a first single-string-per-roof-face assumption.'
        : 'No provisional MPPT could be derived from the current array assumptions.',
    };
  });
}

function buildArrayToMpptRelationships(
  arrays: ExportArray[],
  projectMppts: ExportProjectMppt[],
  panelTypes: PanelType[],
  mpptTypes: MpptType[],
): DigitalTwinExport['relationships']['array_to_mppt'] {
  const panelTypesById = new Map(panelTypes.map((panelType) => [panelType.panel_type_id, panelType]));
  const mpptTypesById = new Map(mpptTypes.map((mpptType) => [mpptType.mppt_type_id, mpptType]));

  return projectMppts.map((projectMppt) => {
    const array = arrays.find((item) => item.array_id === projectMppt.array_id)!;
    const panelType = array.panel_type_id ? panelTypesById.get(array.panel_type_id) : undefined;
    const mpptType = projectMppt.mppt_type_id ? mpptTypesById.get(projectMppt.mppt_type_id) : undefined;

    if (!panelType || !mpptType || array.panel_count <= 0) {
      return {
        relationship_id: `${projectMppt.array_id}__${projectMppt.project_mppt_id}`,
        from_array_id: projectMppt.array_id,
        to_project_mppt_id: projectMppt.project_mppt_id,
        input_voltage_v: null,
        input_current_a: null,
        input_power_w: array.installed_wp,
        evaluation: {
          electrical_status: 'outside_limits',
          reasons: ['missing_mppt_fit_data'],
          notes: 'No provisional MPPT fit could be derived from the current panel and MPPT data.',
        },
      };
    }

    const inputVoc = array.panel_count * panelType.voc;
    const inputVmp = array.panel_count * panelType.vmp;
    const inputCurrent = panelType.imp;
    const chargeCurrent = array.installed_wp / 48;
    const outsideLimits = inputVoc > mpptType.max_voc
      || array.installed_wp > mpptType.max_pv_power
      || chargeCurrent > mpptType.max_charge_current;

    let fitStatus: DigitalTwinExport['relationships']['array_to_mppt'][number]['evaluation']['fit_status'];
    const reasons = ['single_string_assumption'];

    if (outsideLimits) {
      if (inputVoc > mpptType.max_voc) reasons.push('voltage_too_high');
      if (array.installed_wp > mpptType.max_pv_power) reasons.push('power_too_high');
      if (chargeCurrent > mpptType.max_charge_current) reasons.push('charge_current_too_high');
    } else {
      const powerRatio = array.installed_wp / mpptType.max_pv_power;
      if (powerRatio >= 0.9) {
        fitStatus = 'optimal';
        reasons.push('well_matched');
      } else if (powerRatio >= 0.7) {
        fitStatus = 'acceptable';
        reasons.push('acceptable_headroom');
      } else {
        fitStatus = 'underutilized';
        reasons.push('low_utilization');
      }
    }

    return {
      relationship_id: `${projectMppt.array_id}__${projectMppt.project_mppt_id}`,
      from_array_id: projectMppt.array_id,
      to_project_mppt_id: projectMppt.project_mppt_id,
      input_voltage_v: Number(inputVmp.toFixed(1)),
      input_current_a: Number(inputCurrent.toFixed(2)),
      input_power_w: array.installed_wp,
      evaluation: {
        electrical_status: outsideLimits ? 'outside_limits' : 'within_limits',
        fit_status: outsideLimits ? undefined : fitStatus,
        reasons,
        notes: outsideLimits
          ? 'First-fit calculation indicates this provisional single-string array exceeds one or more MPPT limits.'
          : 'First-fit calculation uses a provisional single-string-per-roof-face assumption to estimate MPPT suitability.',
      },
    };
  });
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
  const projectMppts = buildProjectMppts(arrays, panelTypes, mpptTypes);
  const arrayToMppt = buildArrayToMpptRelationships(arrays, projectMppts, panelTypes, mpptTypes);
  const hasOutsideLimits = arrayToMppt.some((relationship) => relationship.evaluation.electrical_status === 'outside_limits');

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
      array_to_mppt: arrayToMppt,
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
          severity: hasOutsideLimits ? 'warning' : 'info',
          scope: 'array_to_mppt',
          message: hasOutsideLimits
            ? 'At least one provisional array-to-MPPT fit is outside limits under the current single-string assumption.'
            : 'Provisional array-to-MPPT fit has been derived from the current roof-face panel assignments.',
          related_ids: arrayToMppt.map((relationship) => relationship.from_array_id),
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
        has_outside_limits: hasOutsideLimits,
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
