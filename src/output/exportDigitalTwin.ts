import fs from 'fs';
import path from 'path';
import type Database from 'better-sqlite3';
import type {
  BatteryType,
  BatteryBankConfiguration,
  CabinetType,
  InverterType,
  Location,
  MpptType,
  PanelType,
  ProjectPreferences,
  Surface,
  SurfaceConfiguration,
  PvArray,
  PvString,
  ArrayToMpptMapping,
  ConversionDevice,
} from '../domain/types.js';
import {
  getLocation,
  getProject,
  getProjectPreferences,
  listCabinetTypes,
  listBatteryTypes,
  listConversionDevices,
  listArrayToMpptMappings,
  listInverterConfigurations,
  listLoadCircuits,
  listLoads,
  listMpptTypes,
  listPanelTypes,
  listProjectConverters,
  listBatteryBankConfigurations,
  listLocations,
  listPvArrays,
  listPvStrings,
  listSurfaceConfigurations,
  listSurfaces,
} from '../db/queries.js';
import {
  evaluateArrayToMpptFit,
  pickDerivedMpptType,
} from '../calc/arrayToMppt.js';
import { DEFAULT_PROJECT_ID } from '../config/project.js';

interface ExportArray {
  array_id: string;
  surface_id: string;
  name: string;
  string_ids: string[];
  panel_assignment_ids: string[];
  panel_type_id?: string;
  panel_count: number;
  panels_per_string: number | null;
  parallel_strings: number | null;
  installed_wp: number;
  notes?: string;
}

interface ExportMpptConfiguration {
  mppt_configuration_id: string;
  surface_id: string;
  array_id: string;
  mppt_type_id?: string;
  name: string;
  provisional: boolean;
  notes?: string;
}

interface ExportBatteryBank {
  battery_bank_id: string;
  battery_type_id?: string;
  selected_cabinet_type_id?: string | null;
  name: string;
  module_count: number;
  nominal_voltage_v?: number | null;
  capacity_kwh?: number | null;
  provisional: boolean;
  notes?: string;
}

interface ExportSolarMonthlyProfile {
  surface_id: string;
  surface_name: string;
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

interface ExportString {
  string_id: string;
  array_id: string;
  surface_id: string;
  string_index: number;
  panel_type_id?: string | null;
  panel_count: number;
}

interface ExportInverterConfiguration {
  inverter_configuration_id: string;
  inverter_id?: string;
  selected_cabinet_type_id?: string | null;
  name: string;
  provisional: boolean;
  title?: string | null;
  description?: string | null;
  image_data_url?: string | null;
  notes?: string | null;
}

interface ExportConversionDevice {
  converter_type_id: string;
  title: string;
  description: string | null;
  device_type: string;
  input_voltage_v: number | null;
  output_voltage_v: number | null;
  continuous_power_w: number | null;
  peak_power_va: number | null;
  max_charge_current_a: number | null;
  efficiency_pct: number | null;
  output_ac_voltage_v: number | null;
  frequency_hz: number | null;
  surge_power_w: number | null;
  output_dc_voltage_v: number | null;
  max_output_current_a: number | null;
  price: number | null;
  price_source_url: string | null;
  notes: string | null;
}

interface ExportLoadCircuit {
  load_circuit_id: string;
  converter_id: string | null;
  converter_type_id: string;
  title: string;
  description: string | null;
}

interface ExportLoad {
  load_id: string;
  load_circuit_id: string;
  title: string;
  description: string | null;
  nominal_current_a: number | null;
  nominal_power_w: number | null;
  startup_current_a: number | null;
  surge_power_w: number | null;
  standby_power_w: number | null;
  expected_usage_hours_per_day: number;
  daily_energy_kwh: number | null;
  duty_profile: string | null;
  notes: string | null;
  usage_kw: number;
  spike_kw: number;
  sleeping_kw: number;
}

interface ExportProject {
  project_id: string;
  name: string;
  locations: Array<{
    id: number;
    project_id: string;
    location_id: string;
    title?: string | null;
    country: string;
    place_name: string;
    description: string | null;
    notes: string | null;
    latitude: number;
    longitude: number;
    northing: number | null;
    easting: number | null;
    site_photo_data_url: string | null;
  }>;
  active_location_id: string | null;
  location: {
    title?: string | null;
    country: string;
    place_name: string;
    description: string | null;
    notes: string | null;
    latitude: number;
    longitude: number;
    northing: number | null;
    easting: number | null;
    site_photo_data_url: string | null;
  } | null;
  current_assumptions: {
    surface_to_array_default: '1:1';
    array_to_mppt_default: '1:1';
    mppt_configurations_provisional: boolean;
  };
  project_preferences: ProjectPreferences;
  preferences?: ProjectPreferences;
}

interface ExportSurfaceConfiguration {
  surface_id: string;
  panels_per_string: number | null;
  parallel_strings: number | null;
  selected_mppt_type_id?: string | null;
}

interface ExportBatteryBankConfiguration {
  battery_bank_id: string;
  title?: string | null;
  description?: string | null;
  image_data_url?: string | null;
  notes?: string | null;
  selected_battery_type_id?: string | null;
  selected_cabinet_type_id?: string | null;
  configured_battery_count: number;
  batteries_per_string: number;
  parallel_strings: number;
}

interface ExportProjectConverter {
  converter_id: string;
  title: string;
  description: string | null;
  converter_type_id: string;
}

interface DigitalTwinExport {
  project: ExportProject;
  entities: {
    surfaces: Surface[];
    surface_configurations: ExportSurfaceConfiguration[];
    battery_bank_configurations: ExportBatteryBankConfiguration[];
    cabinet_types: CabinetType[];
    panel_types: PanelType[];
    pv_strings: ExportString[];
    pv_arrays: ExportArray[];
    mppt_types: MpptType[];
    mppt_configurations: ExportMpptConfiguration[];
    battery_types: BatteryType[];
    battery_banks: ExportBatteryBank[];
    inverter_types: InverterType[];
    inverter_configurations: ExportInverterConfiguration[];
    converter_types: ExportConversionDevice[];
    converters: ExportProjectConverter[];
    load_circuits: ExportLoadCircuit[];
    loads: ExportLoad[];
    solar_monthly_profiles: ExportSolarMonthlyProfile[];
    generators: [];
    load_monthly_profiles: [];
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
        fit_status?: 'optimal' | 'fully_utilized' | 'clipping_expected' | 'underutilized';
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
        fit_status?: 'optimal' | 'underutilized';
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
    conversion_device_to_load_circuit: [];
    load_circuit_to_load: [];
  };
  derived: {
    string_states: [];
    array_states: Array<{
      array_id: string;
      installed_wp: number;
      surface_id: string;
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
      load_kwh: number | null;
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
      surface_count: number;
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
  surfaces: Surface[],
  pvArrays: ExportArray[],
  location: Location | null,
): { solarMonthlyProfiles: ExportSolarMonthlyProfile[]; projectMonthlySolarOutput: ExportProjectMonthlySolarOutput[] } {
  const surfaceById = new Map(surfaces.map((surface) => [surface.surface_id, surface]));
  const solarMonthlyProfiles: ExportSolarMonthlyProfile[] = [];

  for (const pvArray of pvArrays) {
    const surface = surfaceById.get(pvArray.surface_id);
    if (!surface) continue;

    const yieldRows = estimateFaceYieldTable({
      installedWp: pvArray.installed_wp,
      azimuthDeg: surface.orientation_deg,
      tiltDeg: surface.tilt_deg,
      latitudeDeg: location?.latitude ?? 52,
    });

    for (const row of yieldRows) {
      solarMonthlyProfiles.push({
        surface_id: surface.surface_id,
        surface_name: surface.name,
        month: row.month,
        average_daily_kwh: row.averageDailyKwh,
        monthly_kwh: row.monthlyKwh,
        installed_wp: pvArray.installed_wp,
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
      notes: 'Sum of the surface monthly solar output estimates.',
    };
  });

  return { solarMonthlyProfiles, projectMonthlySolarOutput };
}

function toProject(projectId: string, projectTitle: string, locations: Location[], activeLocation: Location | null, projectPreferences: ProjectPreferences): ExportProject {
  return {
    project_id: projectId,
    name: projectTitle,
    locations: locations.map((location) => ({
      id: location.id,
      project_id: location.project_id,
      location_id: location.location_id,
      title: location.title ?? null,
      country: location.country,
      place_name: location.place_name,
      description: location.description ?? null,
      notes: location.notes ?? null,
      latitude: location.latitude,
      longitude: location.longitude,
      northing: location.northing ?? null,
      easting: location.easting ?? null,
      site_photo_data_url: location.site_photo_data_url ?? null,
    })),
    active_location_id: activeLocation?.location_id ?? null,
    location: activeLocation ? {
      title: activeLocation.title ?? null,
      country: activeLocation.country,
      place_name: activeLocation.place_name,
      description: activeLocation.description ?? null,
      notes: activeLocation.notes ?? null,
      latitude: activeLocation.latitude,
      longitude: activeLocation.longitude,
      northing: activeLocation.northing ?? null,
      easting: activeLocation.easting ?? null,
      site_photo_data_url: activeLocation.site_photo_data_url ?? null,
    } : null,
    current_assumptions: {
      surface_to_array_default: '1:1',
      array_to_mppt_default: '1:1',
      mppt_configurations_provisional: true,
    },
    project_preferences: projectPreferences,
    preferences: projectPreferences,
  };
}

function buildArrays(
  pvArrays: PvArray[],
  pvStrings: PvString[],
  panelTypes: PanelType[],
): { pvArrays: ExportArray[]; arrayStates: DigitalTwinExport['derived']['array_states']; totalInstalledWp: number } {
  const panelTypeById = new Map(panelTypes.map((panelType) => [panelType.panel_type_id, panelType]));
  const stringsByArrayId = new Map<string, PvString[]>();
  for (const string of pvStrings) {
    const existing = stringsByArrayId.get(string.array_id) ?? [];
    existing.push(string);
    stringsByArrayId.set(string.array_id, existing);
  }

  const exportedPvArrays: ExportArray[] = [];
  const arrayStates: DigitalTwinExport['derived']['array_states'] = [];
  let totalInstalledWp = 0;

  for (const pvArray of pvArrays) {
    const stringRows = stringsByArrayId.get(pvArray.array_id) ?? [];
    const primaryPanelType = pvArray.panel_type_id ? panelTypeById.get(pvArray.panel_type_id) : undefined;
    const panelsPerString = pvArray.panels_per_string && pvArray.panels_per_string > 0
      ? pvArray.panels_per_string
      : pvArray.panel_count > 0
        ? pvArray.panel_count
        : null;
    const parallelStrings = pvArray.parallel_strings && pvArray.parallel_strings > 0
      ? pvArray.parallel_strings
      : pvArray.panel_count > 0
        ? 1
        : null;
    const inputVoltage = panelsPerString && primaryPanelType ? panelsPerString * primaryPanelType.vmp : null;
    const inputCurrent = parallelStrings && primaryPanelType ? primaryPanelType.imp * parallelStrings : null;

    exportedPvArrays.push({
      array_id: pvArray.array_id,
      surface_id: pvArray.surface_id,
      name: pvArray.name,
      string_ids: stringRows.map((stringRow) => stringRow.string_id),
      panel_assignment_ids: [],
      panel_type_id: pvArray.panel_type_id ?? undefined,
      panel_count: pvArray.panel_count,
      panels_per_string: panelsPerString,
      parallel_strings: parallelStrings,
      installed_wp: pvArray.installed_wp,
      notes: pvArray.notes ?? undefined,
    });

    arrayStates.push({
      array_id: pvArray.array_id,
      installed_wp: pvArray.installed_wp,
      surface_id: pvArray.surface_id,
      panel_count: pvArray.panel_count,
      input_voltage_v: inputVoltage,
      input_current_a: inputCurrent,
    });

    totalInstalledWp += pvArray.installed_wp;
  }

  return { pvArrays: exportedPvArrays, arrayStates, totalInstalledWp };
}

function buildMpptConfigurations(
  pvArrays: ExportArray[],
  arrayToMpptMappings: ArrayToMpptMapping[],
  panelTypes: PanelType[],
  mpptTypes: MpptType[],
): ExportMpptConfiguration[] {
  const panelTypesById = new Map(panelTypes.map((panelType) => [panelType.panel_type_id, panelType]));
  const mappingByArrayId = new Map(arrayToMpptMappings.map((mapping) => [mapping.array_id, mapping]));
  return pvArrays.map((pvArray) => {
    const panelType = pvArray.panel_type_id ? panelTypesById.get(pvArray.panel_type_id) : undefined;
    const mapping = mappingByArrayId.get(pvArray.array_id);
    const selectedMpptType = mapping?.selected_mppt_type_id
      ? mpptTypes.find((mpptType) => mpptType.mppt_type_id === mapping.selected_mppt_type_id)
      : undefined;
    const panelsPerString = pvArray.panels_per_string && pvArray.panels_per_string > 0 ? pvArray.panels_per_string : pvArray.panel_count;
    const parallelStrings = pvArray.parallel_strings && pvArray.parallel_strings > 0 ? pvArray.parallel_strings : (pvArray.panel_count > 0 ? 1 : 0);
    const derivedMpptType = panelType
      ? pickDerivedMpptType(panelType, pvArray.panel_count, pvArray.installed_wp, mpptTypes, 48, panelsPerString, parallelStrings)
      : undefined;
    const mpptType = selectedMpptType ?? derivedMpptType;
    return {
      mppt_configuration_id: `mppt-configuration-${pvArray.surface_id}`,
      surface_id: pvArray.surface_id,
      array_id: pvArray.array_id,
      mppt_type_id: mpptType?.mppt_type_id,
      name: mpptType ? `${pvArray.name} ${mpptType.model}` : `${pvArray.name} MPPT`,
      provisional: !selectedMpptType,
      notes: selectedMpptType
        ? 'Uses the saved array-to-MPPT mapping from the project database.'
        : derivedMpptType
          ? 'Derived provisional MPPT choice based on the current saved array layout.'
          : 'No provisional MPPT could be derived from the current array assumptions.',
    };
  });
}

function buildArrayToMpptRelationships(
  pvArrays: ExportArray[],
  arrayToMpptMappings: ArrayToMpptMapping[],
  mpptConfigurations: ExportMpptConfiguration[],
  panelTypes: PanelType[],
  mpptTypes: MpptType[],
): DigitalTwinExport['relationships']['array_to_mppt'] {
  const panelTypesById = new Map(panelTypes.map((panelType) => [panelType.panel_type_id, panelType]));
  const mpptTypesById = new Map(mpptTypes.map((mpptType) => [mpptType.mppt_type_id, mpptType]));

  return mpptConfigurations.map((mpptConfiguration) => {
    const pvArray = pvArrays.find((item) => item.array_id === mpptConfiguration.array_id)!;
    const panelType = pvArray.panel_type_id ? panelTypesById.get(pvArray.panel_type_id) : undefined;
    const mpptType = mpptConfiguration.mppt_type_id ? mpptTypesById.get(mpptConfiguration.mppt_type_id) : undefined;
    const panelsPerString = pvArray.panels_per_string && pvArray.panels_per_string > 0 ? pvArray.panels_per_string : pvArray.panel_count;
    const parallelStrings = pvArray.parallel_strings && pvArray.parallel_strings > 0 ? pvArray.parallel_strings : (pvArray.panel_count > 0 ? 1 : 0);

    if (!panelType || !mpptType || pvArray.panel_count <= 0) {
      return {
        relationship_id: `${mpptConfiguration.array_id}__${mpptConfiguration.mppt_configuration_id}`,
        from_array_id: mpptConfiguration.array_id,
        to_mppt_configuration_id: mpptConfiguration.mppt_configuration_id,
        input_voltage_v: null,
        input_current_a: null,
        input_power_w: pvArray.installed_wp,
        evaluation: {
          electrical_status: 'outside_limits',
          reasons: ['missing_mppt_fit_data'],
          notes: 'No provisional MPPT fit could be derived from the current panel and MPPT data.',
        },
      };
    }

    const fit = evaluateArrayToMpptFit({
      panelType,
      panelCount: pvArray.panel_count,
      installedWp: pvArray.installed_wp,
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
  projectPreferences: ProjectPreferences,
): BatteryType | undefined {
  if (projectPreferences.preferred_battery_type_id) {
    const preferred = batteryTypes.find((batteryType) => batteryType.battery_type_id === projectPreferences.preferred_battery_type_id);
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
  cabinetTypes: CabinetType[],
  projectPreferences: ProjectPreferences,
  batteryBankConfigurations: BatteryBankConfiguration[],
  location: Location | null,
): ExportBatteryBank[] {
  const design = batteryBankConfigurations[0] ?? null;
  if (!design) {
    return [];
  }

  const selectedBatteryType = design?.selected_battery_type_id
    ? batteryTypes.find((batteryType) => batteryType.battery_type_id === design.selected_battery_type_id) ?? null
    : null;
  const selectedCabinetType = design?.selected_cabinet_type_id
    ? cabinetTypes.find((cabinetType) => cabinetType.cabinet_type_id === design.selected_cabinet_type_id) ?? null
    : null;
  const configuredBatteryCount = design?.configured_battery_count ?? 1;
  const batteriesPerString = design?.batteries_per_string ?? 1;
  const parallelStrings = design?.parallel_strings ?? 1;
  const batteryBankId = design?.battery_bank_id ?? `battery-bank-${location?.location_id ?? 'main'}`;

  return [{
    battery_bank_id: batteryBankId,
    battery_type_id: selectedBatteryType?.battery_type_id,
    selected_cabinet_type_id: selectedCabinetType?.cabinet_type_id ?? null,
    name: design.title?.trim() || 'Battery bank',
    module_count: Math.max(configuredBatteryCount, 1),
    nominal_voltage_v: selectedBatteryType?.nominal_voltage ?? null,
    capacity_kwh: selectedBatteryType ? Number((selectedBatteryType.capacity_kwh * Math.max(configuredBatteryCount, 1)).toFixed(2)) : null,
    provisional: !selectedBatteryType,
    notes: design.notes?.trim() || (
      selectedBatteryType
        ? `Uses the saved battery-bank configuration (${batteriesPerString}s ${parallelStrings}p).`
        : 'No battery type has been selected for this battery bank.'
    ),
  }];
}

function pickDerivedInverter(inverterTypes: InverterType[]): InverterType | undefined {
  return [...inverterTypes].sort((left, right) => left.continuous_power_w - right.continuous_power_w)[0];
}

function conversionDeviceToInverterType(device: ConversionDevice): InverterType | null {
  if (device.device_type !== 'inverter') {
    return null;
  }

  if (
    device.input_voltage_v == null
    || device.output_voltage_v == null
    || device.continuous_power_w == null
    || device.peak_power_va == null
    || device.max_charge_current_a == null
  ) {
    return null;
  }

  return {
    id: device.id,
    inverter_id: device.converter_type_id,
    brand: '',
    model: device.title,
    input_voltage_v: device.input_voltage_v,
    output_voltage_v: device.output_voltage_v,
    continuous_power_w: device.continuous_power_w,
    peak_power_va: device.peak_power_va,
    max_charge_current_a: device.max_charge_current_a,
    efficiency_pct: device.efficiency_pct ?? null,
    price: device.price ?? null,
    price_source_url: device.price_source_url ?? null,
    notes: device.notes ?? undefined,
  };
}

function buildInverterConfigurations(
  inverterConfigurations: Array<{
    inverter_configuration_id: string;
    selected_inverter_type_id?: string | null;
    selected_cabinet_type_id?: string | null;
    title?: string | null;
    description?: string | null;
    image_data_url?: string | null;
    notes?: string | null;
  }>,
  inverterTypes: InverterType[],
): ExportInverterConfiguration[] {
  const inverterTypesById = new Map(inverterTypes.map((inverterType) => [inverterType.inverter_id, inverterType]));

  return inverterConfigurations.map((configuration) => {
    const selectedInverter = configuration.selected_inverter_type_id
      ? inverterTypesById.get(configuration.selected_inverter_type_id)
      : undefined;
    const derivedInverter = selectedInverter ?? pickDerivedInverter(inverterTypes);

    return {
      inverter_configuration_id: configuration.inverter_configuration_id,
      inverter_id: selectedInverter?.inverter_id ?? derivedInverter?.inverter_id,
      selected_cabinet_type_id: configuration.selected_cabinet_type_id ?? null,
      name: selectedInverter?.model ?? derivedInverter?.model ?? 'Main inverter',
      provisional: !selectedInverter,
      title: configuration.title ?? null,
      description: configuration.description ?? null,
      image_data_url: configuration.image_data_url ?? null,
      notes: configuration.notes ?? null,
    };
  });
}

function buildMpptToBatteryBankRelationships(
  mpptConfigurations: ExportMpptConfiguration[],
  batteryBanks: ExportBatteryBank[],
  mpptTypes: MpptType[],
  batteryTypes: BatteryType[],
): DigitalTwinExport['relationships']['mppt_to_battery_bank'] {
  const batteryBank = batteryBanks[0];
  if (!batteryBank) {
    return [];
  }
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
        fit_status: withinLimits ? (voltageDelta <= 1 ? 'optimal' : 'underutilized') : undefined,
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
  if (!batteryBank || !inverterConfiguration) {
    return [];
  }
  const inverterTypesById = new Map(inverterTypes.map((inverter) => [inverter.inverter_id, inverter]));
  const inverter = inverterConfiguration?.inverter_id ? inverterTypesById.get(inverterConfiguration.inverter_id) : undefined;

  if (!inverter || batteryBank.nominal_voltage_v == null) {
    return [{
      relationship_id: `${batteryBank.battery_bank_id}__${inverterConfiguration.inverter_configuration_id}`,
      from_battery_bank_id: batteryBank.battery_bank_id,
      to_inverter_configuration_id: inverterConfiguration.inverter_configuration_id,
      nominal_voltage_v: batteryBank.nominal_voltage_v ?? null,
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
    load_kwh: null,
    generator_kwh: null,
    battery_charge_kwh: null,
    battery_discharge_kwh: null,
    surplus_kwh: null,
    deficit_kwh: null,
    notes: 'Monthly balance is not calculated yet in the current export foundation.',
  }));
}

export function buildDigitalTwinExport(db: Database.Database, dbPath: string, projectId: string, locationId?: string | null): DigitalTwinExport {
  const project = getProject(db, projectId);
  const locations = listLocations(db, projectId);
  const location = getLocation(db, projectId, locationId) ?? locations[0] ?? null;
  const activeLocationId = location?.location_id ?? null;
  const projectPreferences = getProjectPreferences(db, projectId);
  const surfaces = listSurfaces(db, projectId, activeLocationId);
  const surfaceConfigurations = listSurfaceConfigurations(db, projectId, activeLocationId);
  const batteryBankConfigurations = listBatteryBankConfigurations(db, projectId, activeLocationId);
  const cabinetTypes = listCabinetTypes(db);
  const panelTypes = listPanelTypes(db);
  const mpptTypes = listMpptTypes(db);
  const batteryTypes = listBatteryTypes(db);
  const conversionDevices = listConversionDevices(db);
  const projectConverters = listProjectConverters(db, projectId, activeLocationId);
  const inverterTypes = conversionDevices
    .map((device) => conversionDeviceToInverterType(device))
    .filter((device): device is InverterType => device != null);
  const inverterConfigurations = listInverterConfigurations(db, projectId);
  const loadCircuits = listLoadCircuits(db, projectId, activeLocationId);
  const loads = listLoads(db, projectId, activeLocationId);
  const pvArrays = listPvArrays(db, projectId, activeLocationId);
  const pvStrings = listPvStrings(db, projectId, activeLocationId);
  const arrayToMpptMappings = listArrayToMpptMappings(db, projectId, activeLocationId);

  const { pvArrays: exportedPvArrays, arrayStates, totalInstalledWp } = buildArrays(pvArrays, pvStrings, panelTypes);
  const { solarMonthlyProfiles, projectMonthlySolarOutput } = buildSolarMonthlyProfiles(surfaces, exportedPvArrays, location);
  const mpptConfigurations = buildMpptConfigurations(exportedPvArrays, arrayToMpptMappings, panelTypes, mpptTypes);
  const arrayToMppt = buildArrayToMpptRelationships(exportedPvArrays, arrayToMpptMappings, mpptConfigurations, panelTypes, mpptTypes);
  const batteryBanks = buildBatteryBanks(batteryTypes, cabinetTypes, projectPreferences, batteryBankConfigurations, location);
  const derivedInverterConfigurations = buildInverterConfigurations(inverterConfigurations, inverterTypes);
  const mpptToBatteryBank = buildMpptToBatteryBankRelationships(mpptConfigurations, batteryBanks, mpptTypes, batteryTypes);
  const batteryBankStates = buildBatteryBankStates(batteryBanks, mpptToBatteryBank);
  const batteryBankToInverter = buildBatteryBankToInverterRelationships(batteryBanks, derivedInverterConfigurations, inverterTypes);
  const hasOutsideLimits = [
    ...arrayToMppt.map((relationship) => relationship.evaluation.electrical_status),
    ...mpptToBatteryBank.map((relationship) => relationship.evaluation.electrical_status),
    ...batteryBankToInverter.map((relationship) => relationship.evaluation.electrical_status),
  ].some((status) => status === 'outside_limits');

  return {
    project: toProject(projectId, project?.title ?? projectId, locations, location, projectPreferences),
    entities: {
      surfaces,
      surface_configurations: surfaceConfigurations.map((design) => ({
        surface_id: design.surface_id,
        panels_per_string: design.panels_per_string ?? null,
        parallel_strings: design.parallel_strings ?? null,
        selected_mppt_type_id: design.selected_mppt_type_id ?? null,
      })),
      battery_bank_configurations: batteryBankConfigurations.map((design) => ({
        battery_bank_id: design.battery_bank_id,
        title: design.title ?? null,
        description: design.description ?? null,
        image_data_url: design.image_data_url ?? null,
        notes: design.notes ?? null,
        selected_battery_type_id: design.selected_battery_type_id ?? null,
        selected_cabinet_type_id: design.selected_cabinet_type_id ?? null,
        configured_battery_count: design.configured_battery_count,
        batteries_per_string: design.batteries_per_string,
        parallel_strings: design.parallel_strings,
      })),
      cabinet_types: cabinetTypes,
      panel_types: panelTypes,
      pv_strings: pvStrings.map((string) => ({
        string_id: string.string_id,
        array_id: string.array_id,
        surface_id: string.surface_id,
        string_index: string.string_index,
        panel_type_id: string.panel_type_id ?? null,
        panel_count: string.panel_count,
      })),
      pv_arrays: exportedPvArrays,
      mppt_types: mpptTypes,
      mppt_configurations: mpptConfigurations,
      battery_types: batteryTypes,
      battery_banks: batteryBanks,
      inverter_types: inverterTypes,
      inverter_configurations: derivedInverterConfigurations,
      converter_types: conversionDevices.map((device) => ({
        converter_type_id: device.converter_type_id,
        title: device.title,
        description: device.description ?? null,
        device_type: device.device_type,
        input_voltage_v: device.input_voltage_v ?? null,
        output_voltage_v: device.output_voltage_v ?? null,
        continuous_power_w: device.continuous_power_w ?? null,
        peak_power_va: device.peak_power_va ?? null,
        max_charge_current_a: device.max_charge_current_a ?? null,
        efficiency_pct: device.efficiency_pct ?? null,
        output_ac_voltage_v: device.output_ac_voltage_v ?? null,
        frequency_hz: device.frequency_hz ?? null,
        surge_power_w: device.surge_power_w ?? null,
        output_dc_voltage_v: device.output_dc_voltage_v ?? null,
        max_output_current_a: device.max_output_current_a ?? null,
        price: device.price ?? null,
        price_source_url: device.price_source_url ?? null,
        notes: device.notes ?? null,
      })),
      converters: projectConverters.map((converter) => ({
        converter_id: converter.converter_id,
        title: converter.title,
        description: converter.description ?? null,
        converter_type_id: converter.converter_type_id,
      })),
      load_circuits: loadCircuits.map((circuit) => ({
        load_circuit_id: circuit.load_circuit_id,
        converter_id: circuit.converter_id ?? null,
        converter_type_id: circuit.converter_type_id,
        title: circuit.title,
        description: circuit.description ?? null,
      })),
      loads: loads.map((load) => ({
        load_id: load.load_id,
        load_circuit_id: load.load_circuit_id,
        title: load.title,
        description: load.description ?? null,
        nominal_current_a: load.nominal_current_a ?? null,
        nominal_power_w: load.nominal_power_w ?? null,
        startup_current_a: load.startup_current_a ?? null,
        surge_power_w: load.surge_power_w ?? null,
        standby_power_w: load.standby_power_w ?? null,
        expected_usage_hours_per_day: load.expected_usage_hours_per_day,
        daily_energy_kwh: load.daily_energy_kwh ?? null,
        duty_profile: load.duty_profile ?? null,
        notes: load.notes ?? null,
        usage_kw: load.usage_kw ?? ((load.nominal_power_w ?? 0) / 1000),
        spike_kw: load.spike_kw ?? ((load.surge_power_w ?? 0) / 1000),
        sleeping_kw: load.sleeping_kw ?? ((load.standby_power_w ?? 0) / 1000),
      })),
      solar_monthly_profiles: solarMonthlyProfiles,
      generators: [],
      load_monthly_profiles: [],
      generator_monthly_profiles: [],
    },
    relationships: {
      array_to_mppt: arrayToMppt,
      mppt_to_battery_bank: mpptToBatteryBank,
      battery_bank_to_inverter: batteryBankToInverter,
      conversion_device_to_load_circuit: [],
      load_circuit_to_load: [],
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
          message: 'PV arrays, PV strings, and array-to-MPPT mappings are persisted in SQLite and synchronized from the current surface configuration.',
          related_ids: exportedPvArrays.map((pvArray) => pvArray.array_id),
        },
        {
          severity: hasOutsideLimits ? 'warning' : 'info',
          scope: 'array_to_mppt',
          message: hasOutsideLimits
            ? 'At least one provisional array-to-MPPT fit is outside limits under the current single-string assumption.'
            : 'Array-to-MPPT fit has been evaluated from the persisted array topology and current MPPT catalog.',
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
        surface_count: surfaces.length,
        array_count: exportedPvArrays.length,
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

export function writeDigitalTwinExport(db: Database.Database, dbPath: string, outPath: string, projectId = DEFAULT_PROJECT_ID): string {
  const exportData = buildDigitalTwinExport(db, dbPath, projectId);
  const resolvedOutPath = path.resolve(outPath);
  fs.writeFileSync(resolvedOutPath, `${JSON.stringify(exportData, null, 2)}\n`, 'utf-8');
  return resolvedOutPath;
}
