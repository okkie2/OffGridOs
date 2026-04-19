import fs from 'fs';
import path from 'path';
import type Database from 'better-sqlite3';
import type {
  BatteryType,
  BatteryBankConfiguration,
  InverterType,
  Location,
  MpptType,
  PanelType,
  Preferences,
  RoofFace,
  RoofFaceConfiguration,
  RoofPanelAssignment,
} from '../domain/types.js';
import {
  getLocation,
  getPreferences,
  listBatteryTypes,
  listInverterTypes,
  listMpptTypes,
  listPanelTypes,
  listBatteryBankConfigurations,
  listRoofFaceConfigurations,
  listRoofFaces,
  listRoofPanels,
} from '../db/queries.js';
import {
  evaluateArrayToMpptFit,
  pickDerivedMpptType,
} from '../calc/arrayToMppt.js';

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

interface ExportMpptConfiguration {
  mppt_configuration_id: string;
  roof_face_id: string;
  array_id: string;
  mppt_type_id?: string;
  name: string;
  provisional: boolean;
  notes?: string;
}

interface ExportBatteryBank {
  battery_bank_id: string;
  battery_type_id?: string;
  name: string;
  module_count: number;
  nominal_voltage_v?: number | null;
  capacity_kwh?: number | null;
  provisional: boolean;
  notes?: string;
}

interface ExportSolarMonthlyProfile {
  roof_face_id: string;
  roof_face_name: string;
  month: string;
  average_daily_kwh: number;
  monthly_kwh: number;
  installed_wp: number;
  notes: string;
}

interface ExportProjectMonthlySolarOutput {
  month: string;
  average_daily_kwh: number;
  monthly_kwh: number;
  notes: string;
}

interface ExportInverterConfiguration {
  inverter_configuration_id: string;
  inverter_id?: string;
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
    northing: number | null;
    easting: number | null;
  } | null;
  current_assumptions: {
    roof_face_to_array_default: '1:1';
    array_to_mppt_default: '1:1';
    mppt_configurations_provisional: boolean;
  };
  preferences: Preferences;
}

interface ExportRoofFaceConfiguration {
  roof_face_id: string;
  panels_per_string: number | null;
  parallel_strings: number | null;
  selected_mppt_type_id?: string | null;
}

interface ExportBatteryBankConfiguration {
  battery_bank_id: string;
  selected_battery_type_id?: string | null;
  configured_battery_count: number;
  batteries_per_string: number;
  parallel_strings: number;
}

interface DigitalTwinExport {
  project: ExportProject;
  entities: {
    roof_faces: RoofFace[];
    roof_face_configurations: ExportRoofFaceConfiguration[];
    battery_bank_configurations: ExportBatteryBankConfiguration[];
    panel_types: PanelType[];
    strings: [];
    arrays: ExportArray[];
    mppt_types: MpptType[];
    mppt_configurations: ExportMpptConfiguration[];
    battery_types: BatteryType[];
    battery_banks: ExportBatteryBank[];
    inverter_types: InverterType[];
    inverter_configurations: ExportInverterConfiguration[];
    solar_monthly_profiles: ExportSolarMonthlyProfile[];
    branch_circuits: [];
    consumers: [];
    generators: [];
    consumer_monthly_profiles: [];
    generator_monthly_profiles: [];
  };
  relationships: {
    array_to_mppt: Array<{
      relationship_id: string;
      from_array_id: string;
      to_mppt_configuration_id: string;
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
    mppt_to_battery_bank: Array<{
      relationship_id: string;
      from_mppt_configuration_id: string;
      to_battery_bank_id: string;
      output_voltage_v: number | null;
      max_charge_current_a: number | null;
      evaluation: {
        electrical_status: 'within_limits' | 'outside_limits';
        fit_status?: 'optimal' | 'acceptable';
        reasons: string[];
        notes: string;
      };
    }>;
    battery_bank_to_inverter: Array<{
      relationship_id: string;
      from_battery_bank_id: string;
      to_inverter_configuration_id: string;
      nominal_voltage_v: number | null;
      continuous_power_w: number | null;
      evaluation: {
        electrical_status: 'within_limits' | 'outside_limits';
        reasons: string[];
        notes: string;
      };
    }>;
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
    battery_bank_states: Array<{
      battery_bank_id: string;
      module_count: number;
      nominal_voltage_v: number | null;
      capacity_kwh: number | null;
      total_mppt_charge_current_a: number | null;
    }>;
    project_monthly_solar_output: ExportProjectMonthlySolarOutput[];
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
      mppt_configuration_count: number;
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

const MONTH_DAY_COUNT: Record<(typeof MONTHS)[number], number> = {
  january: 31,
  february: 28,
  march: 31,
  april: 30,
  may: 31,
  june: 30,
  july: 31,
  august: 31,
  september: 30,
  october: 31,
  november: 30,
  december: 31,
};

const MONTHLY_REFERENCE_KWH_PER_KWP_DAY: Record<(typeof MONTHS)[number], number> = {
  january: 0.7,
  february: 1.4,
  march: 2.6,
  april: 3.8,
  may: 4.6,
  june: 4.9,
  july: 4.8,
  august: 4.2,
  september: 3.1,
  october: 1.9,
  november: 0.9,
  december: 0.6,
};

const MONTHLY_IDEAL_TILT_DEG: Record<(typeof MONTHS)[number], number> = {
  january: 65,
  february: 60,
  march: 50,
  april: 40,
  may: 30,
  june: 20,
  july: 20,
  august: 25,
  september: 35,
  october: 45,
  november: 55,
  december: 65,
};

const MONTHLY_LATITUDE_WEIGHT: Record<(typeof MONTHS)[number], number> = {
  january: -0.35,
  february: -0.3,
  march: -0.2,
  april: -0.1,
  may: 0,
  june: 0.1,
  july: 0.1,
  august: 0.05,
  september: -0.05,
  october: -0.15,
  november: -0.25,
  december: -0.35,
};

function angularDifferenceDeg(left: number, right: number): number {
  const raw = Math.abs(left - right) % 360;
  return raw > 180 ? 360 - raw : raw;
}

function estimateFaceYieldTable(input: {
  installedWp: number;
  azimuthDeg: number;
  tiltDeg: number;
  latitudeDeg: number;
}): Array<{
  month: (typeof MONTHS)[number];
  averageDailyKwh: number;
  monthlyKwh: number;
}> {
  const installedKw = input.installedWp / 1000;
  const azimuthDiff = angularDifferenceDeg(input.azimuthDeg, 180);
  const tiltSensitivity = Math.max(0, Math.min(1, input.tiltDeg / 60));
  const orientationBase = 0.2 + 0.8 * Math.max(0, Math.cos((azimuthDiff * Math.PI) / 180));
  const orientationFactor = Math.max(0.2, Math.min(1, (1 - tiltSensitivity) + tiltSensitivity * orientationBase));
  const latitudeDelta = input.latitudeDeg - 52;
  const performanceRatio = 0.83;

  return MONTHS.map((month) => {
    const referenceDaily = MONTHLY_REFERENCE_KWH_PER_KWP_DAY[month];
    const idealTilt = MONTHLY_IDEAL_TILT_DEG[month];
    const tiltFactor = Math.max(0.55, Math.min(1, 1 - (Math.abs(input.tiltDeg - idealTilt) / 90) * 0.45));
    const latitudeFactor = Math.max(0.75, Math.min(1.25, 1 + (latitudeDelta / 14) * MONTHLY_LATITUDE_WEIGHT[month]));
    const averageDailyKwh = Number((installedKw * referenceDaily * orientationFactor * tiltFactor * latitudeFactor * performanceRatio).toFixed(2));
    const monthlyKwh = Number((averageDailyKwh * MONTH_DAY_COUNT[month]).toFixed(1));
    return { month, averageDailyKwh, monthlyKwh };
  });
}

function buildSolarMonthlyProfiles(
  roofFaces: RoofFace[],
  arrays: ExportArray[],
  location: Location | null,
): { solarMonthlyProfiles: ExportSolarMonthlyProfile[]; projectMonthlySolarOutput: ExportProjectMonthlySolarOutput[] } {
  const roofFaceById = new Map(roofFaces.map((roofFace) => [roofFace.roof_face_id, roofFace]));
  const solarMonthlyProfiles: ExportSolarMonthlyProfile[] = [];

  for (const array of arrays) {
    const roofFace = roofFaceById.get(array.roof_face_id);
    if (!roofFace) continue;

    const yieldRows = estimateFaceYieldTable({
      installedWp: array.installed_wp,
      azimuthDeg: roofFace.orientation_deg,
      tiltDeg: roofFace.tilt_deg,
      latitudeDeg: location?.latitude ?? 52,
    });

    for (const row of yieldRows) {
      solarMonthlyProfiles.push({
        roof_face_id: roofFace.roof_face_id,
        roof_face_name: roofFace.name,
        month: row.month,
        average_daily_kwh: row.averageDailyKwh,
        monthly_kwh: row.monthlyKwh,
        installed_wp: array.installed_wp,
        notes: 'Provisional planning estimate based on installed PV, roof geometry, and location latitude.',
      });
    }
  }

  const projectMonthlySolarOutput = MONTHS.map((month) => {
    const monthRows = solarMonthlyProfiles.filter((row) => row.month === month);
    const averageDailyKwh = Number(monthRows.reduce((sum, row) => sum + row.average_daily_kwh, 0).toFixed(2));
    const monthlyKwh = Number(monthRows.reduce((sum, row) => sum + row.monthly_kwh, 0).toFixed(1));
    return {
      month,
      average_daily_kwh: averageDailyKwh,
      monthly_kwh: monthlyKwh,
      notes: 'Sum of the roof-face monthly solar output estimates.',
    };
  });

  return { solarMonthlyProfiles, projectMonthlySolarOutput };
}

function toProject(location: Location | null, preferences: Preferences): ExportProject {
  return {
    project_id: 'offgridos-project',
    name: 'OffGridOS Baseline',
    location: location ? {
      country: location.country,
      place_name: location.place_name,
      latitude: location.latitude,
      longitude: location.longitude,
      northing: location.northing ?? null,
      easting: location.easting ?? null,
    } : null,
    current_assumptions: {
      roof_face_to_array_default: '1:1',
      array_to_mppt_default: '1:1',
      mppt_configurations_provisional: true,
    },
    preferences,
  };
}

function buildArrays(
  roofFaces: RoofFace[],
  roofFaceConfigurations: RoofFaceConfiguration[],
  roofPanels: RoofPanelAssignment[],
  panelTypes: PanelType[],
): { arrays: ExportArray[]; arrayStates: DigitalTwinExport['derived']['array_states']; totalInstalledWp: number } {
  const panelTypeById = new Map(panelTypes.map((panelType) => [panelType.panel_type_id, panelType]));
  const designByFaceId = new Map(roofFaceConfigurations.map((design) => [design.roof_face_id, design]));
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
    const design = designByFaceId.get(roofFace.roof_face_id);
    const panelsPerString = design?.panels_per_string && design.panels_per_string > 0
      ? design.panels_per_string
      : panelCount > 0
        ? panelCount
        : null;
    const parallelStrings = design?.parallel_strings && design.parallel_strings > 0
      ? design.parallel_strings
      : panelCount > 0
        ? 1
        : null;
    const inputVoltage = panelsPerString && primaryPanelType ? panelsPerString * primaryPanelType.vmp : null;
    const inputCurrent = parallelStrings && primaryPanelType ? primaryPanelType.imp * parallelStrings : null;
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

function buildMpptConfigurations(
  arrays: ExportArray[],
  roofFaceConfigurations: RoofFaceConfiguration[],
  panelTypes: PanelType[],
  mpptTypes: MpptType[],
): ExportMpptConfiguration[] {
  const panelTypesById = new Map(panelTypes.map((panelType) => [panelType.panel_type_id, panelType]));
  const designByFaceId = new Map(roofFaceConfigurations.map((design) => [design.roof_face_id, design]));
  return arrays.map((array) => {
    const design = designByFaceId.get(array.roof_face_id);
    const panelType = array.panel_type_id ? panelTypesById.get(array.panel_type_id) : undefined;
    const selectedMpptType = design?.selected_mppt_type_id
      ? mpptTypes.find((mpptType) => mpptType.mppt_type_id === design.selected_mppt_type_id)
      : undefined;
    const panelsPerString = design?.panels_per_string && design.panels_per_string > 0 ? design.panels_per_string : array.panel_count;
    const parallelStrings = design?.parallel_strings && design.parallel_strings > 0 ? design.parallel_strings : (array.panel_count > 0 ? 1 : 0);
    const derivedMpptType = panelType
      ? pickDerivedMpptType(panelType, array.panel_count, array.installed_wp, mpptTypes, 48, panelsPerString, parallelStrings)
      : undefined;
    const mpptType = selectedMpptType ?? derivedMpptType;
    return {
      mppt_configuration_id: `mppt-configuration-${array.roof_face_id}`,
      roof_face_id: array.roof_face_id,
      array_id: array.array_id,
      mppt_type_id: mpptType?.mppt_type_id,
      name: mpptType ? `${array.name} ${mpptType.model}` : `${array.name} MPPT`,
      provisional: !selectedMpptType,
      notes: selectedMpptType
        ? 'Uses the saved face-level MPPT choice.'
        : derivedMpptType
          ? 'Derived provisional MPPT choice based on the current saved or assumed face layout.'
          : 'No provisional MPPT could be derived from the current array assumptions.',
    };
  });
}

function buildArrayToMpptRelationships(
  arrays: ExportArray[],
  roofFaceConfigurations: RoofFaceConfiguration[],
  mpptConfigurations: ExportMpptConfiguration[],
  panelTypes: PanelType[],
  mpptTypes: MpptType[],
): DigitalTwinExport['relationships']['array_to_mppt'] {
  const panelTypesById = new Map(panelTypes.map((panelType) => [panelType.panel_type_id, panelType]));
  const mpptTypesById = new Map(mpptTypes.map((mpptType) => [mpptType.mppt_type_id, mpptType]));
  const designByFaceId = new Map(roofFaceConfigurations.map((design) => [design.roof_face_id, design]));

  return mpptConfigurations.map((mpptConfiguration) => {
    const array = arrays.find((item) => item.array_id === mpptConfiguration.array_id)!;
    const design = designByFaceId.get(array.roof_face_id);
    const panelType = array.panel_type_id ? panelTypesById.get(array.panel_type_id) : undefined;
    const mpptType = mpptConfiguration.mppt_type_id ? mpptTypesById.get(mpptConfiguration.mppt_type_id) : undefined;
    const panelsPerString = design?.panels_per_string && design.panels_per_string > 0 ? design.panels_per_string : array.panel_count;
    const parallelStrings = design?.parallel_strings && design.parallel_strings > 0 ? design.parallel_strings : (array.panel_count > 0 ? 1 : 0);

    if (!panelType || !mpptType || array.panel_count <= 0) {
      return {
        relationship_id: `${mpptConfiguration.array_id}__${mpptConfiguration.mppt_configuration_id}`,
        from_array_id: mpptConfiguration.array_id,
        to_mppt_configuration_id: mpptConfiguration.mppt_configuration_id,
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

    const fit = evaluateArrayToMpptFit({
      panelType,
      panelCount: array.panel_count,
      installedWp: array.installed_wp,
      mpptType,
      panelsPerString,
      parallelStrings,
    });

    return {
      relationship_id: `${mpptConfiguration.array_id}__${mpptConfiguration.mppt_configuration_id}`,
      from_array_id: mpptConfiguration.array_id,
      to_mppt_configuration_id: mpptConfiguration.mppt_configuration_id,
      input_voltage_v: fit.input_vmp_v,
      input_current_a: fit.input_current_a,
      input_power_w: fit.input_power_w,
      evaluation: {
        electrical_status: fit.electrical_status,
        fit_status: fit.fit_status,
        reasons: fit.reasons,
        notes: fit.notes,
      },
    };
  });
}

function pickDerivedBatteryType(
  batteryTypes: BatteryType[],
  preferences: Preferences,
): BatteryType | undefined {
  if (preferences.preferred_battery_type_id) {
    const preferred = batteryTypes.find((batteryType) => batteryType.battery_type_id === preferences.preferred_battery_type_id);
    if (preferred) return preferred;
  }

  const compatible = batteryTypes.filter((batteryType) =>
    batteryType.victron_can
    && batteryType.nominal_voltage >= 48
    && batteryType.nominal_voltage <= 52,
  );

  return compatible.sort((left, right) => {
    const leftPrice = left.price_per_kwh ?? Number.POSITIVE_INFINITY;
    const rightPrice = right.price_per_kwh ?? Number.POSITIVE_INFINITY;
    if (leftPrice !== rightPrice) return leftPrice - rightPrice;
    return right.capacity_kwh - left.capacity_kwh;
  })[0];
}

function buildBatteryBanks(
  batteryTypes: BatteryType[],
  preferences: Preferences,
  batteryBankConfigurations: BatteryBankConfiguration[],
): ExportBatteryBank[] {
  const design = batteryBankConfigurations[0] ?? null;
  const selectedBatteryType = design?.selected_battery_type_id
    ? batteryTypes.find((batteryType) => batteryType.battery_type_id === design.selected_battery_type_id) ?? null
    : null;
  const derivedBatteryType = selectedBatteryType ?? pickDerivedBatteryType(batteryTypes, preferences);
  const configuredBatteryCount = design?.configured_battery_count ?? 1;
  const batteriesPerString = design?.batteries_per_string ?? 1;
  const parallelStrings = design?.parallel_strings ?? 1;

  return [{
    battery_bank_id: 'battery-bank-main',
    battery_type_id: derivedBatteryType?.battery_type_id,
    name: derivedBatteryType ? `${derivedBatteryType.model} bank` : 'Main battery bank',
    module_count: Math.max(configuredBatteryCount, 1),
    nominal_voltage_v: derivedBatteryType?.nominal_voltage,
    capacity_kwh: derivedBatteryType ? Number((derivedBatteryType.capacity_kwh * Math.max(configuredBatteryCount, 1)).toFixed(2)) : null,
    provisional: !selectedBatteryType,
    notes: selectedBatteryType
      ? `Uses the saved battery-bank configuration (${batteriesPerString}s ${parallelStrings}p).`
      : derivedBatteryType
        ? 'Derived provisional battery-bank choice uses one module of the preferred or best-priced compatible battery type.'
        : 'No provisional battery-bank choice could be derived from the current preferences and battery catalog.',
  }];
}

function pickDerivedInverter(inverterTypes: InverterType[]): InverterType | undefined {
  return [...inverterTypes].sort((left, right) => left.continuous_power_w - right.continuous_power_w)[0];
}

function buildInverterConfigurations(inverterTypes: InverterType[], preferences: Preferences): ExportInverterConfiguration[] {
  const preferredInverter = preferences.preferred_inverter_type_id
    ? inverterTypes.find((inverter) => inverter.inverter_id === preferences.preferred_inverter_type_id)
    : undefined;
  const derivedInverter = preferredInverter ?? pickDerivedInverter(inverterTypes);

  return [{
    inverter_configuration_id: 'inverter-configuration-main',
    inverter_id: derivedInverter?.inverter_id,
    name: derivedInverter ? derivedInverter.model : 'Main inverter',
    provisional: !preferredInverter,
    notes: preferredInverter
      ? 'Uses the saved inverter preference from the project settings.'
      : derivedInverter
        ? 'Derived provisional inverter choice currently uses the smallest catalog inverter until load-side configuration is modeled.'
        : 'No provisional inverter choice could be derived from the current inverter catalog.',
  }];
}

function buildMpptToBatteryBankRelationships(
  mpptConfigurations: ExportMpptConfiguration[],
  batteryBanks: ExportBatteryBank[],
  mpptTypes: MpptType[],
  batteryTypes: BatteryType[],
): DigitalTwinExport['relationships']['mppt_to_battery_bank'] {
  const batteryBank = batteryBanks[0];
  const mpptTypesById = new Map(mpptTypes.map((mpptType) => [mpptType.mppt_type_id, mpptType]));
  const batteryTypesById = new Map(batteryTypes.map((batteryType) => [batteryType.battery_type_id, batteryType]));
  const batteryType = batteryBank?.battery_type_id ? batteryTypesById.get(batteryBank.battery_type_id) : undefined;

  return mpptConfigurations.map((mpptConfiguration) => {
    const mpptType = mpptConfiguration.mppt_type_id ? mpptTypesById.get(mpptConfiguration.mppt_type_id) : undefined;

    if (!batteryBank || !batteryType || !mpptType) {
      return {
        relationship_id: `${mpptConfiguration.mppt_configuration_id}__battery-bank-main`,
        from_mppt_configuration_id: mpptConfiguration.mppt_configuration_id,
        to_battery_bank_id: batteryBank?.battery_bank_id ?? 'battery-bank-main',
        output_voltage_v: null,
        max_charge_current_a: null,
        evaluation: {
          electrical_status: 'outside_limits',
          reasons: ['missing_storage_chain_data'],
          notes: 'No provisional MPPT-to-battery-bank evaluation could be derived from the current MPPT and battery configurations.',
        },
      };
    }

    const voltageDelta = Math.abs(mpptType.nominal_battery_voltage - batteryType.nominal_voltage);
    const withinLimits = voltageDelta <= 4;

    return {
      relationship_id: `${mpptConfiguration.mppt_configuration_id}__${batteryBank.battery_bank_id}`,
      from_mppt_configuration_id: mpptConfiguration.mppt_configuration_id,
      to_battery_bank_id: batteryBank.battery_bank_id,
      output_voltage_v: batteryType.nominal_voltage,
      max_charge_current_a: mpptType.max_charge_current,
      evaluation: {
        electrical_status: withinLimits ? 'within_limits' : 'outside_limits',
        fit_status: withinLimits ? (voltageDelta <= 1 ? 'optimal' : 'acceptable') : undefined,
        reasons: withinLimits
          ? ['provisional_battery_bank', voltageDelta <= 1 ? 'battery_voltage_alignment' : 'battery_voltage_near_nominal']
          : ['provisional_battery_bank', 'battery_voltage_mismatch'],
        notes: withinLimits
          ? 'This provisional relationship checks nominal battery voltage compatibility only. Module-count sizing and battery current limits are not modeled yet.'
          : 'This provisional relationship indicates the selected battery nominal voltage does not align closely enough with the MPPT nominal battery voltage.',
      },
    };
  });
}

function buildBatteryBankStates(
  batteryBanks: ExportBatteryBank[],
  mpptToBatteryBank: DigitalTwinExport['relationships']['mppt_to_battery_bank'],
): DigitalTwinExport['derived']['battery_bank_states'] {
  return batteryBanks.map((batteryBank) => {
    const related = mpptToBatteryBank.filter((relationship) => relationship.to_battery_bank_id === batteryBank.battery_bank_id);
    const totalChargeCurrent = related.reduce((sum, relationship) => sum + (relationship.max_charge_current_a ?? 0), 0);

    return {
      battery_bank_id: batteryBank.battery_bank_id,
      module_count: batteryBank.module_count,
      nominal_voltage_v: batteryBank.nominal_voltage_v ?? null,
      capacity_kwh: batteryBank.capacity_kwh ?? null,
      total_mppt_charge_current_a: related.length > 0 ? Number(totalChargeCurrent.toFixed(2)) : null,
    };
  });
}

function buildBatteryBankToInverterRelationships(
  batteryBanks: ExportBatteryBank[],
  inverterConfigurations: ExportInverterConfiguration[],
  inverterTypes: InverterType[],
): DigitalTwinExport['relationships']['battery_bank_to_inverter'] {
  const batteryBank = batteryBanks[0];
  const inverterConfiguration = inverterConfigurations[0];
  const inverterTypesById = new Map(inverterTypes.map((inverter) => [inverter.inverter_id, inverter]));
  const inverter = inverterConfiguration?.inverter_id ? inverterTypesById.get(inverterConfiguration.inverter_id) : undefined;

  if (!batteryBank || !inverterConfiguration || !inverter || batteryBank.nominal_voltage_v == null) {
    return [{
      relationship_id: `${batteryBank?.battery_bank_id ?? 'battery-bank-main'}__${inverterConfiguration?.inverter_configuration_id ?? 'inverter-configuration-main'}`,
      from_battery_bank_id: batteryBank?.battery_bank_id ?? 'battery-bank-main',
      to_inverter_configuration_id: inverterConfiguration?.inverter_configuration_id ?? 'inverter-configuration-main',
      nominal_voltage_v: batteryBank?.nominal_voltage_v ?? null,
      continuous_power_w: inverter?.continuous_power_w ?? null,
      evaluation: {
        electrical_status: 'outside_limits',
        reasons: ['missing_inverter_chain_data'],
        notes: 'No provisional battery-bank-to-inverter evaluation could be derived from the current battery and inverter configurations.',
      },
    }];
  }

  const voltageDelta = Math.abs(inverter.input_voltage_v - batteryBank.nominal_voltage_v);
  const withinLimits = voltageDelta <= 4;

  return [{
    relationship_id: `${batteryBank.battery_bank_id}__${inverterConfiguration.inverter_configuration_id}`,
    from_battery_bank_id: batteryBank.battery_bank_id,
    to_inverter_configuration_id: inverterConfiguration.inverter_configuration_id,
    nominal_voltage_v: batteryBank.nominal_voltage_v,
    continuous_power_w: inverter.continuous_power_w,
    evaluation: {
      electrical_status: withinLimits ? 'within_limits' : 'outside_limits',
      reasons: withinLimits
        ? ['provisional_inverter_configuration', 'battery_voltage_near_nominal', 'load_profile_not_modeled']
        : ['provisional_inverter_configuration', 'battery_voltage_mismatch'],
      notes: withinLimits
        ? 'This provisional relationship checks DC nominal voltage compatibility only. Inverter sizing against real AC demand is not modeled yet.'
        : 'This provisional relationship indicates the selected inverter input voltage does not align closely enough with the provisional battery-bank configuration voltage.',
    },
  }];
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
  const roofFaceConfigurations = listRoofFaceConfigurations(db);
  const batteryBankConfigurations = listBatteryBankConfigurations(db);
  const panelTypes = listPanelTypes(db);
  const roofPanels = listRoofPanels(db);
  const mpptTypes = listMpptTypes(db);
  const batteryTypes = listBatteryTypes(db);
  const inverterTypes = listInverterTypes(db);

  const { arrays, arrayStates, totalInstalledWp } = buildArrays(roofFaces, roofFaceConfigurations, roofPanels, panelTypes);
  const { solarMonthlyProfiles, projectMonthlySolarOutput } = buildSolarMonthlyProfiles(roofFaces, arrays, location);
  const mpptConfigurations = buildMpptConfigurations(arrays, roofFaceConfigurations, panelTypes, mpptTypes);
  const arrayToMppt = buildArrayToMpptRelationships(arrays, roofFaceConfigurations, mpptConfigurations, panelTypes, mpptTypes);
  const batteryBanks = buildBatteryBanks(batteryTypes, preferences, batteryBankConfigurations);
  const inverterConfigurations = buildInverterConfigurations(inverterTypes, preferences);
  const mpptToBatteryBank = buildMpptToBatteryBankRelationships(mpptConfigurations, batteryBanks, mpptTypes, batteryTypes);
  const batteryBankStates = buildBatteryBankStates(batteryBanks, mpptToBatteryBank);
  const batteryBankToInverter = buildBatteryBankToInverterRelationships(batteryBanks, inverterConfigurations, inverterTypes);
  const hasOutsideLimits = [
    ...arrayToMppt.map((relationship) => relationship.evaluation.electrical_status),
    ...mpptToBatteryBank.map((relationship) => relationship.evaluation.electrical_status),
    ...batteryBankToInverter.map((relationship) => relationship.evaluation.electrical_status),
  ].some((status) => status === 'outside_limits');

  return {
    project: toProject(location, preferences),
    entities: {
      roof_faces: roofFaces,
      roof_face_configurations: roofFaceConfigurations.map((design) => ({
        roof_face_id: design.roof_face_id,
        panels_per_string: design.panels_per_string ?? null,
        parallel_strings: design.parallel_strings ?? null,
        selected_mppt_type_id: design.selected_mppt_type_id ?? null,
      })),
      battery_bank_configurations: batteryBankConfigurations.map((design) => ({
        battery_bank_id: design.battery_bank_id,
        selected_battery_type_id: design.selected_battery_type_id ?? null,
        configured_battery_count: design.configured_battery_count,
        batteries_per_string: design.batteries_per_string,
        parallel_strings: design.parallel_strings,
      })),
      panel_types: panelTypes,
      strings: [],
      arrays,
      mppt_types: mpptTypes,
      mppt_configurations: mpptConfigurations,
      battery_types: batteryTypes,
      battery_banks: batteryBanks,
      inverter_types: inverterTypes,
      inverter_configurations: inverterConfigurations,
      solar_monthly_profiles: solarMonthlyProfiles,
      branch_circuits: [],
      consumers: [],
      generators: [],
      consumer_monthly_profiles: [],
      generator_monthly_profiles: [],
    },
    relationships: {
      array_to_mppt: arrayToMppt,
      mppt_to_battery_bank: mpptToBatteryBank,
      battery_bank_to_inverter: batteryBankToInverter,
      inverter_to_branch_circuit: [],
      branch_circuit_to_consumer: [],
    },
    derived: {
      string_states: [],
      array_states: arrayStates,
      battery_bank_states: batteryBankStates,
      project_monthly_solar_output: projectMonthlySolarOutput,
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
          scope: 'battery_bank',
          message: 'A provisional one-module battery bank has been derived from the preferred or best-priced compatible battery type.',
          related_ids: batteryBanks.map((batteryBank) => batteryBank.battery_bank_id),
        },
        {
          severity: 'info',
          scope: 'battery_bank_to_inverter',
          message: 'Storage-side relationship checks currently validate nominal voltage alignment only. Capacity sizing and AC demand fit are not modeled yet.',
          related_ids: [
            ...mpptToBatteryBank.map((relationship) => relationship.from_mppt_configuration_id),
            ...batteryBankToInverter.map((relationship) => relationship.to_inverter_configuration_id),
          ],
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
        mppt_configuration_count: mpptConfigurations.length,
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
