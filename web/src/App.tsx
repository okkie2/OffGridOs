import React from 'react';
import { useEffect, useState, type ChangeEvent, type MouseEvent } from 'react';

declare const __BUILD_INFO__: string;

function generateCatalogId(model: string): string {
  return model.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'catalog-item';
}

function generateUniqueCatalogId(model: string, existingIds: string[]): string {
  const baseId = generateCatalogId(model);
  const usedIds = new Set(existingIds);
  let candidate = baseId;
  let suffix = 2;

  while (usedIds.has(candidate)) {
    candidate = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

type Status = 'within_limits' | 'outside_limits';
type FitStatus = 'optimal' | 'acceptable' | 'clipping_expected' | 'underutilized';

interface Surface {
  surface_id: string;
  name: string;
  description?: string | null;
  orientation_deg: number;
  tilt_deg: number;
  usable_area_m2?: number | null;
  notes?: string;
  photo_data_url?: string | null;
}

interface ArrayState {
  array_id: string;
  installed_wp: number;
  surface_id: string;
  panel_count: number;
}

interface PanelType {
  panel_type_id: string;
  model: string;
  wp: number;
  voc: number;
  vmp: number;
  isc: number;
  imp: number;
  length_mm?: number | null;
  width_mm?: number | null;
}

interface SurfaceConfiguration {
  surface_id: string;
  panels_per_string: number | null;
  parallel_strings: number | null;
  selected_mppt_type_id?: string | null;
}

interface BatteryType {
  battery_type_id: string;
  model: string;
  chemistry: string;
  nominal_voltage: number;
  capacity_ah: number;
  capacity_kwh: number;
  max_charge_rate?: number | null;
  max_discharge_rate?: number | null;
  victron_can: boolean;
  cooling: 'active' | 'passive';
  price?: number | null;
  price_per_kwh?: number | null;
  source?: string | null;
  url?: string | null;
  notes?: string;
}

interface BatteryTypeDraft {
  battery_type_id: string;
  model: string;
  chemistry: string;
  nominal_voltage: string;
  capacity_ah: string;
  capacity_kwh: string;
  max_charge_rate: string;
  max_discharge_rate: string;
  victron_can: boolean;
  cooling: 'active' | 'passive';
  price: string;
  source: string;
  notes: string;
}

interface PanelTypeDraft {
  panel_type_id: string;
  model: string;
  wp: string;
  voc: string;
  vmp: string;
  isc: string;
  imp: string;
  length_mm: string;
  width_mm: string;
  notes: string;
}

interface MpptTypeDraft {
  mppt_type_id: string;
  model: string;
  tracker_count: string;
  max_voc: string;
  max_pv_power: string;
  max_pv_input_current_a: string;
  max_pv_short_circuit_current_a: string;
  max_charge_current: string;
  nominal_battery_voltage: string;
  notes: string;
}

interface InverterTypeDraft {
  inverter_id: string;
  model: string;
  input_voltage_v: string;
  output_voltage_v: string;
  continuous_power_w: string;
  peak_power_va: string;
  max_charge_current_a: string;
  efficiency_pct: string;
  price: string;
  notes: string;
}

interface BatteryBankConfiguration {
  battery_bank_id: string;
  title?: string | null;
  description?: string | null;
  image_data_url?: string | null;
  notes?: string | null;
  selected_battery_type_id?: string | null;
  configured_battery_count: number;
  batteries_per_string: number;
  parallel_strings: number;
}

interface MpptType {
  mppt_type_id: string;
  model: string;
  tracker_count: number;
  max_voc: number;
  max_pv_power: number;
  max_pv_input_current_a?: number | null;
  max_pv_short_circuit_current_a?: number | null;
  max_charge_current: number;
  nominal_battery_voltage: number;
}

interface InverterType {
  inverter_id: string;
  model: string;
  input_voltage_v: number;
  output_voltage_v: number;
  continuous_power_w: number;
  peak_power_va: number;
  max_charge_current_a: number;
  efficiency_pct?: number | null;
  price?: number | null;
  notes?: string;
}

interface ArrayEntity {
  array_id: string;
  surface_id: string;
  name: string;
  panel_assignment_ids: string[];
  panel_type_id?: string;
  panel_count: number;
}

interface MpptConfiguration {
  mppt_configuration_id: string;
  surface_id: string;
  array_id: string;
  mppt_type_id?: string;
  name: string;
  provisional: boolean;
}

interface BatteryBank {
  battery_bank_id: string;
  battery_type_id?: string;
  name: string;
  module_count: number;
  nominal_voltage_v?: number;
  capacity_kwh?: number;
  provisional: boolean;
}

interface SolarMonthlyProfile {
  surface_id: string;
  surface_name: string;
  month: string;
  average_daily_kwh: number;
  monthly_kwh: number;
  installed_wp: number;
  notes: string;
}

interface ProjectMonthlySolarOutput {
  month: string;
  average_daily_kwh: number;
  monthly_kwh: number;
  notes: string;
}

interface InverterConfiguration {
  inverter_configuration_id: string;
  inverter_id?: string;
  name: string;
  provisional: boolean;
}

interface ArrayToMpptRelationship {
  relationship_id: string;
  from_array_id: string;
  to_mppt_configuration_id: string;
  input_voltage_v: number | null;
  input_current_a: number | null;
  input_power_w: number;
  evaluation: {
    electrical_status: Status;
    fit_status?: FitStatus;
    reasons: string[];
    notes?: string;
  };
}

interface MpptToBatteryBankRelationship {
  relationship_id: string;
  from_mppt_configuration_id: string;
  to_battery_bank_id: string;
  output_voltage_v: number | null;
  max_charge_current_a: number | null;
  evaluation: {
    electrical_status: Status;
    fit_status?: 'optimal' | 'acceptable';
    reasons: string[];
    notes?: string;
  };
}

interface BatteryBankToInverterRelationship {
  relationship_id: string;
  from_battery_bank_id: string;
  to_inverter_configuration_id: string;
  nominal_voltage_v: number | null;
  continuous_power_w: number | null;
  evaluation: {
    electrical_status: Status;
    reasons: string[];
    notes?: string;
  };
}

interface InverterOutput {
  inverter_configuration_id: string;
  input_voltage_v: number | null;
  output_voltage_v: number | null;
  output_current_a: number | null;
  output_power_w: number | null;
}

interface MonthlyBalanceRow {
  month: string;
  solar_kwh: number | null;
  consumer_kwh: number | null;
  surplus_kwh: number | null;
  deficit_kwh: number | null;
  notes?: string;
}

interface DigitalTwinExport {
  project: {
    project_id?: string;
    name: string;
    location: {
      title?: string | null;
      country: string;
      place_name: string;
      description?: string | null;
      notes?: string | null;
      latitude: number;
      longitude: number;
      northing?: number | null;
      easting?: number | null;
      site_photo_data_url?: string | null;
    } | null;
    project_preferences: {
      daily_consumption_kwh?: number | null;
      preferred_inverter_type_id?: string | null;
    };
  };
  entities: {
    surfaces: Surface[];
    surface_configurations: SurfaceConfiguration[];
    panel_types: PanelType[];
    battery_types: BatteryType[];
    battery_bank_configurations: BatteryBankConfiguration[];
    pv_arrays: ArrayEntity[];
    arrays?: ArrayEntity[];
    mppt_types: MpptType[];
    mppt_configurations: MpptConfiguration[];
    battery_banks: BatteryBank[];
    inverter_types: InverterType[];
    inverter_configurations: InverterConfiguration[];
    inverter_outputs: InverterOutput[];
    solar_monthly_profiles: SolarMonthlyProfile[];
  };
  relationships: {
    array_to_mppt: ArrayToMpptRelationship[];
    mppt_to_battery_bank: MpptToBatteryBankRelationship[];
    battery_bank_to_inverter: BatteryBankToInverterRelationship[];
  };
  derived: {
    array_states: ArrayState[];
    battery_bank_states: Array<{
      battery_bank_id: string;
      module_count: number;
      nominal_voltage_v: number | null;
      capacity_kwh: number | null;
      total_mppt_charge_current_a: number | null;
    }>;
    project_monthly_solar_output: ProjectMonthlySolarOutput[];
    monthly_balance: MonthlyBalanceRow[];
    warnings: Array<{
      severity: 'info' | 'warning';
      scope: string;
      message: string;
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
}

function readPersistentState<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function usePersistentState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readPersistentState(key, fallback));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new Event('offgridos-local-storage-change'));
    } catch {
      // Ignore storage failures and keep the UI usable.
    }
  }, [key, value]);

  return [value, setValue] as const;
}

function useLocalStorageRevision(): number {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((current) => current + 1);
    window.addEventListener('storage', bump);
    window.addEventListener('offgridos-local-storage-change', bump as EventListener);
    return () => {
      window.removeEventListener('storage', bump);
      window.removeEventListener('offgridos-local-storage-change', bump as EventListener);
    };
  }, []);

  return revision;
}

async function fetchProjectData(): Promise<DigitalTwinExport> {
  const response = await fetch('/api/digital-twin');
  if (!response.ok) {
    throw new Error(`Failed to load project data (${response.status})`);
  }
  return response.json() as Promise<DigitalTwinExport>;
}

function readSurfaceLabel(surface: Surface): string {
  return surface.name;
}

function buildGoogleMapsIframeSrc(latitude: number, longitude: number): string {
  const lat = latitude.toFixed(6);
  const lng = longitude.toFixed(6);
  return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=19&t=k&output=embed`;
}

type LocalSurfaceSummary = {
  surface_id: string;
  name: string;
  orientation_deg: number;
  tilt_deg: number;
  array_name: string;
  panel_count: number;
  installed_wp: number;
  mppt_name: string;
  status: Status | null;
  fit?: FitStatus;
};

function getProjectStorageKey(data: DigitalTwinExport): string {
  return data.project.project_id ?? 'offgridos-project';
}

function getLocationDisplayName(data: DigitalTwinExport): string {
  return data.project.location?.title?.trim()
    || data.project.location?.place_name
    || 'Location not set';
}

function buildLocalSurfaceSummaries(data: DigitalTwinExport): LocalSurfaceSummary[] {
  const projectId = getProjectStorageKey(data);
  const configurationBySurfaceId = new Map(data.entities.surface_configurations.map((configuration) => [configuration.surface_id, configuration]));

  return data.entities.surfaces.map((surface) => {
    const array = (data.entities.pv_arrays ?? data.entities.arrays ?? []).find((item) => item.surface_id === surface.surface_id);
    const arrayState = data.derived.array_states.find((item) => item.surface_id === surface.surface_id);
    const projectMppt = array ? data.entities.mppt_configurations.find((item) => item.array_id === array.array_id) : null;
    const relation = array ? data.relationships.array_to_mppt.find((item) => item.from_array_id === array.array_id) : null;
    const storagePrefix = `${projectId}:surface:${surface.surface_id}`;
    const persistedConfiguration = configurationBySurfaceId.get(surface.surface_id);
    const panelTypeId = readPersistentState<string>(
      `${storagePrefix}:panel-type`,
      array?.panel_type_id ?? data.entities.panel_types[0]?.panel_type_id ?? '',
    );
    const panelType = panelTypeId
      ? data.entities.panel_types.find((item) => item.panel_type_id === panelTypeId) ?? null
      : null;
    const configuredPanelCount = readPersistentState<number>(
      `${storagePrefix}:panel-count`,
      Math.max(arrayState?.panel_count ?? array?.panel_count ?? 0, 0),
    );
    const panelsPerString = readPersistentState<number>(
      `${storagePrefix}:panels-per-string`,
      Math.max(persistedConfiguration?.panels_per_string ?? arrayState?.panel_count ?? array?.panel_count ?? 0, 0),
    );
    const parallelStrings = readPersistentState<number>(
      `${storagePrefix}:parallel-strings`,
      Math.max(persistedConfiguration?.parallel_strings ?? (configuredPanelCount > 0 ? 1 : 0), 0),
    );
    const selectedMpptTypeId = readPersistentState<string>(
      `${storagePrefix}:mppt-type`,
      persistedConfiguration?.selected_mppt_type_id ?? projectMppt?.mppt_type_id ?? '',
    );
    const selectedMpptType = selectedMpptTypeId
      ? data.entities.mppt_types.find((item) => item.mppt_type_id === selectedMpptTypeId) ?? null
      : null;
    const arrayConfig = panelType
      ? evaluateArrayConfiguration(
        panelType,
        Math.max(configuredPanelCount, 0),
        Math.max(panelsPerString, 0),
        Math.max(parallelStrings, 0),
      )
      : null;
    const mpptCompatibility = arrayConfig && arrayConfig.configuredPanelCount > 0 && selectedMpptType
      ? evaluateMpptCompatibility(arrayConfig, selectedMpptType)
      : null;
    const localSurfaceName = readStoredSurfaceLabel(projectId, surface);

    return {
      surface_id: surface.surface_id,
      name: localSurfaceName,
      orientation_deg: readPersistentState<number>(`${storagePrefix}:azimuth`, surface.orientation_deg),
      tilt_deg: readPersistentState<number>(`${storagePrefix}:tilt`, surface.tilt_deg),
      array_name: localSurfaceName,
      panel_count: arrayConfig?.configuredPanelCount ?? Math.max(configuredPanelCount, 0),
      installed_wp: arrayConfig?.arrayPower ?? 0,
      mppt_name: selectedMpptType?.model ?? '',
      status: mpptCompatibility?.status ?? null,
      fit: mpptCompatibility?.fit ?? null,
    };
  });
}

type Route =
  | { kind: 'overview' }
  | { kind: 'location' }
  | { kind: 'solar-yield' }
  | { kind: 'about' }
  | { kind: 'catalogs' }
  | { kind: 'catalog'; catalog: 'panel-types' | 'mppt-types' | 'battery-types' | 'inverter-types' }
  | { kind: 'battery-array' }
  | { kind: 'inverter-array' }
  | { kind: 'surface'; surfaceId: string };

const CATALOG_ROUTES: Array<{
  catalog: 'panel-types' | 'mppt-types' | 'battery-types' | 'inverter-types';
  label: string;
}> = [
  { catalog: 'panel-types', label: 'Panel types' },
  { catalog: 'mppt-types', label: 'MPPT types' },
  { catalog: 'battery-types', label: 'Battery types' },
  { catalog: 'inverter-types', label: 'Inverter types' },
];

const MONTH_LABELS: Record<string, string> = {
  january: 'Jan',
  february: 'Feb',
  march: 'Mar',
  april: 'Apr',
  may: 'May',
  june: 'Jun',
  july: 'Jul',
  august: 'Aug',
  september: 'Sep',
  october: 'Oct',
  november: 'Nov',
  december: 'Dec',
};

const MONTH_KEYS = [
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

const MONTH_DAY_COUNT: Record<(typeof MONTH_KEYS)[number], number> = {
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

const MONTHLY_REFERENCE_KWH_PER_KWP_DAY: Record<(typeof MONTH_KEYS)[number], number> = {
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

const MONTHLY_IDEAL_TILT_DEG: Record<(typeof MONTH_KEYS)[number], number> = {
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

const MONTHLY_LATITUDE_WEIGHT: Record<(typeof MONTH_KEYS)[number], number> = {
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

function formatWp(wp: number): string {
  return `${wp.toLocaleString('en-US')} Wp`;
}

function formatKw(watts: number): string {
  return `${(watts / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })} kW`;
}

function formatKwh(kwh: number): string {
  return `${kwh.toLocaleString('en-US', { maximumFractionDigits: 2 })} kWh`;
}

function formatAmps(amps: number): string {
  return `${amps.toLocaleString('en-US', { maximumFractionDigits: 2 })} A`;
}

function formatVolts(volts: number): string {
  return `${volts.toLocaleString('en-US', { maximumFractionDigits: 1 })} V`;
}

function formatDailyYield(kwh: number | null | undefined): string {
  if (typeof kwh !== 'number' || !Number.isFinite(kwh)) {
    return '';
  }

  return kwh.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatWholeKwh(kwh: number | null | undefined): string {
  if (typeof kwh !== 'number' || !Number.isFinite(kwh)) {
    return '';
  }

  return kwh.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function emptyBatteryDraft(): BatteryTypeDraft {
  return {
    battery_type_id: '',
    model: '',
    chemistry: 'LiFePO4',
    nominal_voltage: '48',
    capacity_ah: '100',
    capacity_kwh: '5.12',
    max_charge_rate: '',
    max_discharge_rate: '',
    victron_can: true,
    cooling: 'passive',
    price: '',
    source: '',
    notes: '',
  };
}

function batteryDraftFromType(battery: BatteryType | null): BatteryTypeDraft {
  if (!battery) return emptyBatteryDraft();

  return {
    battery_type_id: battery.battery_type_id,
    model: battery.model,
    chemistry: battery.chemistry,
    nominal_voltage: String(battery.nominal_voltage),
    capacity_ah: String(battery.capacity_ah),
    capacity_kwh: String(battery.capacity_kwh),
    max_charge_rate: battery.max_charge_rate != null ? String(battery.max_charge_rate) : '',
    max_discharge_rate: battery.max_discharge_rate != null ? String(battery.max_discharge_rate) : '',
    victron_can: battery.victron_can,
    cooling: battery.cooling,
    price: battery.price != null ? String(battery.price) : '',
    source: battery.source ?? battery.url ?? '',
    notes: battery.notes ?? '',
  };
}

function emptyPanelDraft(): PanelTypeDraft {
  return {
    panel_type_id: '',
    model: '',
    wp: '450',
    voc: '40',
    vmp: '34',
    isc: '14',
    imp: '13',
    length_mm: '',
    width_mm: '',
    notes: '',
  };
}

function panelDraftFromType(panel: PanelType | null): PanelTypeDraft {
  if (!panel) return emptyPanelDraft();

  return {
    panel_type_id: panel.panel_type_id,
    model: panel.model,
    wp: String(panel.wp),
    voc: String(panel.voc),
    vmp: String(panel.vmp),
    isc: String(panel.isc),
    imp: String(panel.imp),
    length_mm: panel.length_mm != null ? String(panel.length_mm) : '',
    width_mm: panel.width_mm != null ? String(panel.width_mm) : '',
    notes: panel.notes ?? '',
  };
}

function emptyMpptDraft(): MpptTypeDraft {
  return {
    mppt_type_id: '',
    model: '',
    tracker_count: '2',
    max_voc: '250',
    max_pv_power: '6000',
    max_pv_input_current_a: '',
    max_pv_short_circuit_current_a: '',
    max_charge_current: '120',
    nominal_battery_voltage: '48',
    notes: '',
  };
}

function mpptDraftFromType(mppt: MpptType | null): MpptTypeDraft {
  if (!mppt) return emptyMpptDraft();

  return {
    mppt_type_id: mppt.mppt_type_id,
    model: mppt.model,
    tracker_count: String(mppt.tracker_count),
    max_voc: String(mppt.max_voc),
    max_pv_power: String(mppt.max_pv_power),
    max_pv_input_current_a: mppt.max_pv_input_current_a != null ? String(mppt.max_pv_input_current_a) : '',
    max_pv_short_circuit_current_a: mppt.max_pv_short_circuit_current_a != null ? String(mppt.max_pv_short_circuit_current_a) : '',
    max_charge_current: String(mppt.max_charge_current),
    nominal_battery_voltage: String(mppt.nominal_battery_voltage),
    notes: mppt.notes ?? '',
  };
}

function emptyInverterDraft(): InverterTypeDraft {
  return {
    inverter_id: '',
    model: '',
    input_voltage_v: '48',
    output_voltage_v: '230',
    continuous_power_w: '5000',
    peak_power_va: '8000',
    max_charge_current_a: '100',
    efficiency_pct: '',
    price: '',
    notes: '',
  };
}

function inverterDraftFromType(inverter: InverterType | null): InverterTypeDraft {
  if (!inverter) return emptyInverterDraft();

  return {
    inverter_id: inverter.inverter_id,
    model: inverter.model,
    input_voltage_v: String(inverter.input_voltage_v),
    output_voltage_v: String(inverter.output_voltage_v),
    continuous_power_w: String(inverter.continuous_power_w),
    peak_power_va: String(inverter.peak_power_va),
    max_charge_current_a: String(inverter.max_charge_current_a),
    efficiency_pct: inverter.efficiency_pct != null ? String(inverter.efficiency_pct) : '',
    price: inverter.price != null ? String(inverter.price) : '',
    notes: inverter.notes ?? '',
  };
}

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
  month: (typeof MONTH_KEYS)[number];
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

  return MONTH_KEYS.map((month) => {
    const referenceDaily = MONTHLY_REFERENCE_KWH_PER_KWP_DAY[month];
    const idealTilt = MONTHLY_IDEAL_TILT_DEG[month];
    const tiltFactor = Math.max(0.55, Math.min(1, 1 - (Math.abs(input.tiltDeg - idealTilt) / 90) * 0.45));
    const latitudeFactor = Math.max(0.75, Math.min(1.25, 1 + (latitudeDelta / 14) * MONTHLY_LATITUDE_WEIGHT[month]));
    const averageDailyKwh = Number((installedKw * referenceDaily * orientationFactor * tiltFactor * latitudeFactor * performanceRatio).toFixed(2));
    const monthlyKwh = Number((averageDailyKwh * MONTH_DAY_COUNT[month]).toFixed(1));
    return { month, averageDailyKwh, monthlyKwh };
  });
}

function estimateFaceYieldForMonth(input: {
  installedWp: number;
  azimuthDeg: number;
  tiltDeg: number;
  latitudeDeg: number;
  month: (typeof MONTH_KEYS)[number];
}): {
  averageDailyKwh: number;
  monthlyKwh: number;
} {
  return estimateFaceYieldTable({
    installedWp: input.installedWp,
    azimuthDeg: input.azimuthDeg,
    tiltDeg: input.tiltDeg,
    latitudeDeg: input.latitudeDeg,
  }).find((row) => row.month === input.month) ?? { averageDailyKwh: 0, monthlyKwh: 0 };
}

function statusTone(status: Status, fit?: FitStatus): string {
  if (status === 'outside_limits') return 'danger';
  if (fit === 'clipping_expected') return 'warn';
  if (fit === 'underutilized') return 'cool';
  if (fit === 'acceptable') return 'ok';
  return 'good';
}

function StatusBadge({ status, fit }: { status: Status | null; fit?: FitStatus }) {
  if (!status) {
    return <span className="status" aria-hidden="true" />;
  }

  const tone = statusTone(status, fit);
  const text = status === 'outside_limits'
    ? 'Outside limits'
    : fit
      ? fit.replaceAll('_', ' ')
      : 'Electrical OK';
  return <span className={`status status-${tone}`}>{text}</span>;
}

function verdictLabel(status: Status | null, fit?: FitStatus): string {
  if (!status) {
    return 'Not evaluated';
  }

  if (status === 'outside_limits') {
    return 'Outside limits';
  }

  if (fit) {
    return fit.replaceAll('_', ' ');
  }

  return 'Within limits';
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <article className="summary-card">
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
      {detail ? <div className="summary-detail">{detail}</div> : null}
    </article>
  );
}

function findWeakestMonth(rows: MonthlyBalanceRow[]): MonthlyBalanceRow | null {
  return rows[0] ?? null;
}

function getFactorPairs(panelCount: number): Array<{ panelsPerString: number; parallelStrings: number }> {
  const safeCount = Math.max(0, panelCount);
  if (safeCount === 0) {
    return [{ panelsPerString: 0, parallelStrings: 0 }];
  }
  const pairs: Array<{ panelsPerString: number; parallelStrings: number }> = [];

  for (let panelsPerString = 1; panelsPerString <= safeCount; panelsPerString += 1) {
    if (safeCount % panelsPerString === 0) {
      pairs.push({
        panelsPerString,
        parallelStrings: safeCount / panelsPerString,
      });
    }
  }

  return pairs;
}

function evaluateArrayConfiguration(
  panelType: PanelType,
  configuredPanelBudget: number,
  panelsPerString: number,
  parallelStrings: number,
): {
  configuredPanelCount: number;
  usesConfiguredPanelsExactly: boolean;
  stringVoc: number;
  stringVmp: number;
  stringCurrent: number;
  arrayCurrent: number;
  stringIsc: number;
  arrayIsc: number;
  arrayPower: number;
  reasons: string[];
} {
  if (configuredPanelBudget === 0 || panelsPerString === 0 || parallelStrings === 0) {
    return {
      configuredPanelCount: 0,
      usesConfiguredPanelsExactly: configuredPanelBudget === 0,
      stringVoc: 0,
      stringVmp: 0,
      stringCurrent: 0,
      arrayCurrent: 0,
      stringIsc: 0,
      arrayIsc: 0,
      arrayPower: 0,
      reasons: ['face_discounted'],
    };
  }

  const configuredPanelCount = panelsPerString * parallelStrings;
  const usesConfiguredPanelsExactly = configuredPanelCount === configuredPanelBudget;
  const stringVoc = Number((panelsPerString * panelType.voc).toFixed(1));
  const stringVmp = Number((panelsPerString * panelType.vmp).toFixed(1));
  const stringCurrent = Number(panelType.imp.toFixed(2));
  const arrayCurrent = Number((panelType.imp * parallelStrings).toFixed(2));
  const stringIsc = Number(panelType.isc.toFixed(2));
  const arrayIsc = Number((panelType.isc * parallelStrings).toFixed(2));
  const arrayPower = panelType.wp * configuredPanelCount;
  const reasons: string[] = [];

  if (!usesConfiguredPanelsExactly) {
    reasons.push(configuredPanelCount < configuredPanelBudget ? 'not_all_panels_assigned' : 'more_panels_than_assigned');
  } else {
    reasons.push('all_assigned_panels_used');
  }

  return {
    configuredPanelCount,
    usesConfiguredPanelsExactly,
    stringVoc,
    stringVmp,
    stringCurrent,
    arrayCurrent,
    stringIsc,
    arrayIsc,
    arrayPower,
    reasons,
  };
}

function evaluateMpptCompatibility(
  arrayConfig: {
    stringVoc: number;
    stringVmp: number;
    stringCurrent: number;
    arrayCurrent: number;
    stringIsc: number;
    arrayIsc: number;
    arrayPower: number;
  },
  mpptType: MpptType | null,
): {
  chargeCurrent: number;
  status: Status;
  fit?: FitStatus;
  reasons: string[];
} {
  const chargeCurrent = Number((arrayConfig.arrayPower / (mpptType?.nominal_battery_voltage ?? 48)).toFixed(2));
  if (!mpptType) {
    return {
      chargeCurrent,
      status: 'outside_limits',
      reasons: ['missing_mppt_type'],
    };
  }

  const trackerCount = Math.max(mpptType.tracker_count, 1);
  const perTrackerPowerLimit = mpptType.max_pv_power / trackerCount;
  const powerRatio = arrayConfig.arrayPower / perTrackerPowerLimit;
  const outsideLimits = arrayConfig.stringVoc > mpptType.max_voc
    || (mpptType.max_pv_input_current_a != null && arrayConfig.arrayCurrent > mpptType.max_pv_input_current_a)
    || (mpptType.max_pv_short_circuit_current_a != null && arrayConfig.arrayIsc > mpptType.max_pv_short_circuit_current_a)
    || chargeCurrent > mpptType.max_charge_current
    || powerRatio > 1.1;

  const reasons: string[] = [];
  if (arrayConfig.stringVoc > mpptType.max_voc) reasons.push('voltage_too_high');
  if (mpptType.max_pv_input_current_a != null && arrayConfig.arrayCurrent > mpptType.max_pv_input_current_a) {
    reasons.push('pv_input_current_too_high');
  }
  if (mpptType.max_pv_short_circuit_current_a != null && arrayConfig.arrayIsc > mpptType.max_pv_short_circuit_current_a) {
    reasons.push('pv_short_circuit_current_too_high');
  }
  if (chargeCurrent > mpptType.max_charge_current) reasons.push('charge_current_too_high');
  if (powerRatio > 1.1) reasons.push('power_too_high');

  let fit: FitStatus | undefined;
  if (!outsideLimits) {
    if (powerRatio > 1.0) {
      fit = 'clipping_expected';
      reasons.push('clipping_expected');
    } else if (powerRatio >= 0.9) {
      fit = 'optimal';
      reasons.push('well_matched');
    } else if (powerRatio >= 0.7) {
      fit = 'acceptable';
      reasons.push('acceptable_headroom');
    } else {
      fit = 'underutilized';
      reasons.push('low_utilization');
    }
  }

  return {
    chargeCurrent,
    status: outsideLimits ? 'outside_limits' : 'within_limits',
    fit,
    reasons,
  };
}

function evaluateBatteryArrayConfiguration(
  batteryType: BatteryType,
  configuredBatteryBudget: number,
  batteriesPerString: number,
  parallelStrings: number,
): {
  configuredBatteryCount: number;
  usesConfiguredBatteriesExactly: boolean;
  stringVoltage: number;
  stringCapacityKwh: number;
  totalCapacityKwh: number;
  maxChargeCurrentA: number | null;
  maxDischargeCurrentA: number | null;
  maxDischargePowerW: number | null;
  reasons: string[];
} {
  const configuredBatteryCount = batteriesPerString * parallelStrings;
  const usesConfiguredBatteriesExactly = configuredBatteryCount === configuredBatteryBudget;
  const stringVoltage = Number((batteriesPerString * batteryType.nominal_voltage).toFixed(1));
  const stringCapacityKwh = Number((batteriesPerString * batteryType.capacity_kwh).toFixed(2));
  const totalCapacityKwh = Number((configuredBatteryCount * batteryType.capacity_kwh).toFixed(2));
  const maxChargeCurrentA = batteryType.max_charge_rate != null
    ? Number((batteryType.max_charge_rate * parallelStrings).toFixed(2))
    : null;
  const maxDischargeCurrentA = batteryType.max_discharge_rate != null
    ? Number((batteryType.max_discharge_rate * parallelStrings).toFixed(2))
    : null;
  const maxDischargePowerW = maxDischargeCurrentA != null
    ? Number((maxDischargeCurrentA * stringVoltage).toFixed(0))
    : null;
  const reasons: string[] = [];

  if (!usesConfiguredBatteriesExactly) {
    reasons.push(configuredBatteryCount < configuredBatteryBudget ? 'not_all_batteries_assigned' : 'more_batteries_than_assigned');
  } else {
    reasons.push('all_assigned_batteries_used');
  }

  return {
    configuredBatteryCount,
    usesConfiguredBatteriesExactly,
    stringVoltage,
    stringCapacityKwh,
    totalCapacityKwh,
    maxChargeCurrentA,
    maxDischargeCurrentA,
    maxDischargePowerW,
    reasons,
  };
}

function buildBatteryVoltageOptions(
  batteryType: BatteryType | null,
  configuredBatteryCount: number,
): Array<{
  voltage: number;
  batteriesPerString: number;
  parallelStrings: number;
}> {
  if (!batteryType) return [];

  return getFactorPairs(configuredBatteryCount).map((pair) => ({
    voltage: Number((pair.panelsPerString * batteryType.nominal_voltage).toFixed(1)),
    batteriesPerString: pair.panelsPerString,
    parallelStrings: pair.parallelStrings,
  }));
}

function evaluateBatteryArraySizing(
  totalInputPowerW: number,
  outputVoltageV: number | null,
  totalCapacityKwh: number | null,
  maxChargeCurrentA: number | null,
  estimatedDailyYieldKwh: number,
): {
  headline: string;
  tone: 'good' | 'ok' | 'warn' | 'danger' | 'cool';
  estimatedChargeCurrentA: number | null;
  estimatedHoursToFull: number | null;
  reasons: string[];
} {
  const estimatedChargeCurrentA = outputVoltageV != null && outputVoltageV > 0
    ? Number((totalInputPowerW / outputVoltageV).toFixed(2))
    : null;
  const estimatedHoursToFull = totalInputPowerW > 0 && totalCapacityKwh != null
    ? Number((totalCapacityKwh / (totalInputPowerW / 1000)).toFixed(1))
    : null;
  const estimatedDaysToFull = estimatedDailyYieldKwh > 0 && totalCapacityKwh != null
    ? Number((totalCapacityKwh / estimatedDailyYieldKwh).toFixed(1))
    : null;
  const reasons: string[] = [];

  if (totalInputPowerW <= 0) {
    return {
      headline: 'No upstream charging input',
      tone: 'cool',
      estimatedChargeCurrentA,
      estimatedHoursToFull,
      reasons: ['No active MPPT input is currently assigned to this battery array.'],
    };
  }

  if (maxChargeCurrentA != null && estimatedChargeCurrentA != null && estimatedChargeCurrentA > maxChargeCurrentA) {
    reasons.push(`Estimated charge current ${formatAmps(estimatedChargeCurrentA)} exceeds the battery array charge limit of ${formatAmps(maxChargeCurrentA)}.`);
    return {
      headline: 'Battery array too small for charging current',
      tone: 'danger',
      estimatedChargeCurrentA,
      estimatedHoursToFull,
      reasons,
    };
  }

  if (estimatedDaysToFull != null && estimatedDaysToFull < 1) {
    reasons.push(`In ${estimatedDailyYieldKwh.toLocaleString('en-US', { maximumFractionDigits: 1 })} kWh/day conditions the bank could fill in about ${estimatedDaysToFull} day.`);
    reasons.push('This points to a relatively small battery array for the selected month.');
    return {
      headline: 'Battery array is relatively small',
      tone: 'warn',
      estimatedChargeCurrentA,
      estimatedHoursToFull,
      reasons,
    };
  }

  if (estimatedDaysToFull != null && estimatedDaysToFull > 4) {
    reasons.push(`In ${estimatedDailyYieldKwh.toLocaleString('en-US', { maximumFractionDigits: 1 })} kWh/day conditions the bank would need about ${estimatedDaysToFull} days to fill.`);
    reasons.push('This points to a relatively large battery array for the selected month.');
    return {
      headline: 'Battery array is relatively large',
      tone: 'cool',
      estimatedChargeCurrentA,
      estimatedHoursToFull,
      reasons,
    };
  }

  if (estimatedDaysToFull != null) {
    reasons.push(`In ${estimatedDailyYieldKwh.toLocaleString('en-US', { maximumFractionDigits: 1 })} kWh/day conditions the bank would fill in about ${estimatedDaysToFull} days.`);
  }
  if (estimatedHoursToFull != null) {
    reasons.push(`At peak upstream power the bank would fill in about ${estimatedHoursToFull} hours.`);
  }
  reasons.push('The battery array is in a reasonable range for the selected month and current upstream MPPT charging power.');
  return {
    headline: 'Battery array is in a reasonable range',
    tone: 'good',
    estimatedChargeCurrentA,
    estimatedHoursToFull,
    reasons,
  };
}

function evaluateBatteryRefillRule(input: {
  totalCapacityKwh: number | null;
  sunniestMonthDailyYieldKwh: number;
}): {
  headline: string;
  tone: 'good' | 'ok' | 'warn' | 'danger' | 'cool';
  requiredRefillKwh: number | null;
  refillRatio: number | null;
  reasons: string[];
} {
  if (input.totalCapacityKwh == null) {
    return {
      headline: 'Battery capacity unknown',
      tone: 'cool',
      requiredRefillKwh: null,
      refillRatio: null,
      reasons: ['Battery capacity is not available, so the refill rule cannot be judged yet.'],
    };
  }

  const requiredRefillKwh = Number((input.totalCapacityKwh * 0.6).toFixed(2));
  if (input.sunniestMonthDailyYieldKwh <= 0) {
    return {
      headline: 'No solar refill available',
      tone: 'danger',
      requiredRefillKwh,
      refillRatio: 0,
      reasons: ['The current configured surfaces do not produce usable daily solar yield in the best month estimate.'],
    };
  }

  const refillRatio = Number((input.sunniestMonthDailyYieldKwh / requiredRefillKwh).toFixed(2));
  const reasons: string[] = [
    `20% to 80% refill needs about ${requiredRefillKwh.toLocaleString('en-US', { maximumFractionDigits: 2 })} kWh.`,
    `Best-month daily solar is estimated at ${input.sunniestMonthDailyYieldKwh.toLocaleString('en-US', { maximumFractionDigits: 2 })} kWh/day.`,
  ];

  if (refillRatio < 0.9) {
    reasons.push('The battery array is too large to refill from 20% to 80% in one best-month day.');
    return {
      headline: 'Battery array too large for one-day refill',
      tone: 'danger',
      requiredRefillKwh,
      refillRatio,
      reasons,
    };
  }

  if (refillRatio > 1.5) {
    reasons.push('The battery array is relatively small compared with the best-month daily solar yield.');
    return {
      headline: 'Battery array is relatively small',
      tone: 'warn',
      requiredRefillKwh,
      refillRatio,
      reasons,
    };
  }

  reasons.push('The battery array can be refilled from 20% to 80% in about one best-month day.');
  return {
    headline: 'Battery array fits the refill rule',
    tone: 'good',
    requiredRefillKwh,
    refillRatio,
    reasons,
  };
}

function evaluateInverterCompatibility(
  batteryArrayConfig: {
    stringVoltage: number;
    maxChargeCurrentA: number | null;
    maxDischargeCurrentA: number | null;
    maxDischargePowerW: number | null;
  },
  inverterType: InverterType | null,
): {
  status: Status;
  fit?: FitStatus;
  reasons: string[];
} {
  if (!inverterType) {
    return {
      status: 'outside_limits',
      reasons: ['missing_inverter_type'],
    };
  }

  const outsideLimits = batteryArrayConfig.stringVoltage > inverterType.input_voltage_v * 1.1
    || batteryArrayConfig.stringVoltage < inverterType.input_voltage_v * 0.85
    || (batteryArrayConfig.maxDischargeCurrentA != null && batteryArrayConfig.maxDischargeCurrentA > inverterType.max_charge_current_a)
    || (batteryArrayConfig.maxDischargePowerW != null && batteryArrayConfig.maxDischargePowerW > inverterType.continuous_power_w);

  const reasons: string[] = [];
  if (batteryArrayConfig.stringVoltage > inverterType.input_voltage_v * 1.1) reasons.push('voltage_too_high');
  if (batteryArrayConfig.stringVoltage < inverterType.input_voltage_v * 0.85) reasons.push('voltage_too_low');
  if (batteryArrayConfig.maxDischargeCurrentA != null && batteryArrayConfig.maxDischargeCurrentA > inverterType.max_charge_current_a) {
    reasons.push('current_too_high');
  }
  if (batteryArrayConfig.maxDischargePowerW != null && batteryArrayConfig.maxDischargePowerW > inverterType.continuous_power_w) {
    reasons.push('power_too_high');
  }

  let fit: FitStatus | undefined;
  if (!outsideLimits) {
    const powerRatio = batteryArrayConfig.maxDischargePowerW != null
      ? batteryArrayConfig.maxDischargePowerW / inverterType.continuous_power_w
      : 0;
    if (powerRatio >= 0.9) {
      fit = 'optimal';
      reasons.push('well_matched');
    } else if (powerRatio >= 0.7) {
      fit = 'acceptable';
      reasons.push('acceptable_headroom');
    } else {
      fit = 'underutilized';
      reasons.push('low_utilization');
    }
  }

  return {
    status: outsideLimits ? 'outside_limits' : 'within_limits',
    fit,
    reasons,
  };
}

function getRoute(): Route {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash === '' || hash === '/') {
    return { kind: 'overview' };
  }
  if (hash === '/overview') {
    return { kind: 'overview' };
  }
  if (hash === '/location') {
    return { kind: 'location' };
  }
  if (hash === '/surfaces') {
    return { kind: 'location' };
  }
  if (hash === '/solar-yield') {
    return { kind: 'solar-yield' };
  }
  if (hash === '/about') {
    return { kind: 'about' };
  }
  if (hash === '/catalogs') {
    return { kind: 'catalogs' };
  }
  if (hash === '/panel-types') {
    return { kind: 'catalog', catalog: 'panel-types' };
  }
  if (hash === '/mppt-types') {
    return { kind: 'catalog', catalog: 'mppt-types' };
  }
  if (hash === '/battery-types') {
    return { kind: 'catalog', catalog: 'battery-types' };
  }
  if (hash === '/inverter-types') {
    return { kind: 'catalog', catalog: 'inverter-types' };
  }
  if (hash === '/battery-array') {
    return { kind: 'battery-array' };
  }
  if (hash === '/inverter-array') {
    return { kind: 'inverter-array' };
  }
  if (hash.startsWith('/surfaces/')) {
    const surfaceId = hash.slice('/surfaces/'.length);
    if (surfaceId) return { kind: 'surface', surfaceId };
  }
  if (hash.startsWith('/panel-arrays/')) {
    const surfaceId = hash.slice('/panel-arrays/'.length);
    if (surfaceId) return { kind: 'surface', surfaceId };
  }
  if (hash.startsWith('/mppts/')) {
    const surfaceId = hash.slice('/mppts/'.length);
    if (surfaceId) return { kind: 'surface', surfaceId };
  }
  return { kind: 'location' };
}

function navigateTo(route: Route): void {
  if (route.kind === 'overview') {
    window.location.hash = '/overview';
    return;
  }
  if (route.kind === 'location') {
    window.location.hash = '/location';
    return;
  }
  if (route.kind === 'solar-yield') {
    window.location.hash = '/solar-yield';
    return;
  }
  if (route.kind === 'about') {
    window.location.hash = '/about';
    return;
  }
  if (route.kind === 'catalogs') {
    window.location.hash = '/catalogs';
    return;
  }
  if (route.kind === 'catalog') {
    window.location.hash = `/${route.catalog}`;
    return;
  }
  if (route.kind === 'battery-array') {
    window.location.hash = '/battery-array';
    return;
  }
  if (route.kind === 'inverter-array') {
    window.location.hash = '/inverter-array';
    return;
  }
  window.location.hash = `/surfaces/${route.surfaceId}`;
}

function routeHref(route: Route): string {
  if (route.kind === 'overview') return '#/overview';
  if (route.kind === 'location') return '#/location';
  if (route.kind === 'solar-yield') return '#/solar-yield';
  if (route.kind === 'about') return '#/about';
  if (route.kind === 'catalogs') return '#/catalogs';
  if (route.kind === 'catalog') return `#/${route.catalog}`;
  if (route.kind === 'battery-array') return '#/battery-array';
  if (route.kind === 'inverter-array') return '#/inverter-array';
  return `#/surfaces/${route.surfaceId}`;
}

function Sidebar({ route, data }: { route: Route; data: DigitalTwinExport | null }) {
  const go = (next: Route) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    navigateTo(next);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-text">OffGridOS</div>
        <div className="sidebar-logo-sub">Digital Twin</div>
      </div>
      <nav className="sidebar-nav">
        <a href={routeHref({ kind: 'overview' })} onClick={go({ kind: 'overview' })} className={`sidebar-nav-item ${route.kind === 'overview' ? 'active' : ''}`}>
          Overview
        </a>
        <a href={routeHref({ kind: 'location' })} onClick={go({ kind: 'location' })} className={`sidebar-nav-item ${route.kind === 'location' || route.kind === 'surface' ? 'active' : ''}`}>
          Location
        </a>
        {data && (route.kind === 'location' || route.kind === 'surface') ? (
          <div className="sidebar-subnav">
            {data.entities.surfaces.map((surface) => (
              <a
                key={surface.surface_id}
                href={routeHref({ kind: 'surface', surfaceId: surface.surface_id })}
                onClick={go({ kind: 'surface', surfaceId: surface.surface_id })}
                className={`sidebar-subnav-item ${route.kind === 'surface' && route.surfaceId === surface.surface_id ? 'active' : ''}`}
              >
                {readSurfaceLabel(surface)}
              </a>
            ))}
          </div>
        ) : null}
        <a href={routeHref({ kind: 'solar-yield' })} onClick={go({ kind: 'solar-yield' })} className={`sidebar-nav-item ${route.kind === 'solar-yield' ? 'active' : ''}`}>
          Solar yield
        </a>
        <a href={routeHref({ kind: 'battery-array' })} onClick={go({ kind: 'battery-array' })} className={`sidebar-nav-item ${route.kind === 'battery-array' ? 'active' : ''}`}>
          Battery array
        </a>
        <a href={routeHref({ kind: 'inverter-array' })} onClick={go({ kind: 'inverter-array' })} className={`sidebar-nav-item ${route.kind === 'inverter-array' ? 'active' : ''}`}>
          Inverter array
        </a>
        <span className="sidebar-nav-item sidebar-nav-disabled">Loads</span>
        <span className="sidebar-nav-item sidebar-nav-disabled">Alerts</span>
        <a href={routeHref({ kind: 'catalogs' })} onClick={go({ kind: 'catalogs' })} className={`sidebar-nav-item ${route.kind === 'catalogs' || route.kind === 'catalog' ? 'active' : ''}`}>
          Catalogs
        </a>
        {data && (route.kind === 'catalogs' || route.kind === 'catalog') ? (
          <div className="sidebar-subnav">
            {CATALOG_ROUTES.map((catalog) => (
              <a
                key={catalog.catalog}
                href={routeHref({ kind: 'catalog', catalog: catalog.catalog })}
                onClick={go({ kind: 'catalog', catalog: catalog.catalog })}
                className={`sidebar-subnav-item ${route.kind === 'catalog' && route.catalog === catalog.catalog ? 'active' : ''}`}
              >
                {catalog.label}
              </a>
            ))}
          </div>
        ) : null}
      </nav>
      <div className="sidebar-footer">
        <span className="sidebar-nav-item sidebar-nav-disabled">New project</span>
        <a
          href={routeHref({ kind: 'about' })}
          onClick={go({ kind: 'about' })}
          className={`sidebar-nav-item ${route.kind === 'about' ? 'active' : ''}`}
        >
          About
        </a>
        <span className="sidebar-footer-stamp">{typeof __BUILD_INFO__ !== 'undefined' ? __BUILD_INFO__ : ''}</span>
      </div>
    </aside>
  );
}

function Breadcrumbs({ route, surfaceName }: { route: Route; surfaceName?: string }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {route.kind === 'surface' ? (
        <>
          <button type="button" className="crumb crumb-link" onClick={() => navigateTo({ kind: 'overview' })}>
            Overview
          </button>
          <span className="crumb-sep">/</span>
          <button type="button" className="crumb crumb-link" onClick={() => navigateTo({ kind: 'location' })}>
            Location
          </button>
          <span className="crumb-sep">/</span>
          <span className="crumb crumb-current">{surfaceName ?? route.surfaceId}</span>
        </>
      ) : null}
      {route.kind === 'solar-yield' ? (
        <>
          <span className="crumb-sep">/</span>
          <span className="crumb crumb-current">Solar yield</span>
        </>
      ) : null}
    </nav>
  );
}

function SurfaceDetail({
  data,
  surfaceId,
  refreshProjectData,
}: {
  data: DigitalTwinExport;
  surfaceId: string;
  refreshProjectData: () => Promise<void>;
}) {
  const surface = data.entities.surfaces.find((item) => item.surface_id === surfaceId);
  const persistedConfiguration = data.entities.surface_configurations.find((item) => item.surface_id === surfaceId) ?? null;
  const array = (data.entities.pv_arrays ?? data.entities.arrays).find((item) => item.surface_id === surfaceId);
  const arrayId = array?.array_id ?? `array-${surfaceId}`;
  const arrayState = data.derived.array_states.find((item) => item.surface_id === surfaceId);
  const projectMppt = array ? data.entities.mppt_configurations.find((item) => item.array_id === array.array_id) : null;
  const relation = array ? data.relationships.array_to_mppt.find((item) => item.from_array_id === array.array_id) : null;
  const mpptType = projectMppt?.mppt_type_id
    ? data.entities.mppt_types.find((item) => item.mppt_type_id === projectMppt.mppt_type_id) ?? null
    : null;
  const installedPanelCount = arrayState?.panel_count ?? array?.panel_count ?? 0;
  const storagePrefix = `${data.project.project_id}:surface:${surfaceId}`;
  const [surfaceNameDraft, setSurfaceNameDraft] = useState(surface?.name ?? surfaceId);
  const [surfaceDescription, setSurfaceDescription] = useState(surface?.description ?? '');
  const [surfaceAzimuthDraft, setSurfaceAzimuthDraft] = usePersistentState(`${storagePrefix}:azimuth`, surface?.orientation_deg ?? 0);
  const [surfaceTiltDraft, setSurfaceTiltDraft] = usePersistentState(`${storagePrefix}:tilt`, surface?.tilt_deg ?? 0);
  const [surfaceAreaHeightDraft, setSurfaceAreaHeightDraft] = useState(
    surface?.area_height_m != null ? String(surface.area_height_m) : '',
  );
  const [surfaceAreaWidthDraft, setSurfaceAreaWidthDraft] = useState(
    surface?.area_width_m != null ? String(surface.area_width_m) : '',
  );
  const [selectedPanelTypeId, setSelectedPanelTypeId] = usePersistentState(
    `${storagePrefix}:panel-type`,
    array?.panel_type_id ?? data.entities.panel_types[0]?.panel_type_id ?? '',
  );
  const [configuredPanelCount, setConfiguredPanelCount] = usePersistentState(
    `${storagePrefix}:panel-count`,
    Math.max(installedPanelCount, 0),
  );
  const [panelsPerString, setPanelsPerString] = usePersistentState(
    `${storagePrefix}:panels-per-string`,
    Math.max(persistedConfiguration?.panels_per_string ?? installedPanelCount, 0),
  );
  const [parallelStrings, setParallelStrings] = usePersistentState(
    `${storagePrefix}:parallel-strings`,
    Math.max(persistedConfiguration?.parallel_strings ?? (installedPanelCount > 0 ? 1 : 0), 0),
  );
  const [selectedMpptTypeId, setSelectedMpptTypeId] = usePersistentState(
    `${storagePrefix}:mppt-type`,
    persistedConfiguration?.selected_mppt_type_id ?? projectMppt?.mppt_type_id ?? '',
  );
  const [photo, setPhoto] = useState<string | null>(surface?.photo_data_url ?? null);
  const [surfaceNotes, setSurfaceNotes] = useState(surface?.notes ?? '');
  const [isSavingSurface, setIsSavingSurface] = useState(false);
  const [surfaceSaveMessage, setSurfaceSaveMessage] = useState<string | null>(null);
  const [surfaceSaveError, setSurfaceSaveError] = useState<string | null>(null);
  const [isSavingPanels, setIsSavingPanels] = useState(false);
  const [panelSaveMessage, setPanelSaveMessage] = useState<string | null>(null);
  const [panelSaveError, setPanelSaveError] = useState<string | null>(null);
  const [isSavingSurfaceDesign, setIsSavingSurfaceDesign] = useState(false);
  const [surfaceDesignSaveMessage, setSurfaceDesignSaveMessage] = useState<string | null>(null);
  const [surfaceDesignSaveError, setSurfaceDesignSaveError] = useState<string | null>(null);
  const factorPairs = getFactorPairs(configuredPanelCount);
  const panelsPerStringOptions = factorPairs.map((pair) => pair.panelsPerString);
  const parallelStringOptions = factorPairs.map((pair) => pair.parallelStrings);

  useEffect(() => {
    if (configuredPanelCount === 0) {
      if (panelsPerString !== 0) setPanelsPerString(0);
      if (parallelStrings !== 0) setParallelStrings(0);
      return;
    }

    if (!panelsPerStringOptions.includes(panelsPerString)) {
      const fallbackPanelsPerString = panelsPerStringOptions[panelsPerStringOptions.length - 1] ?? 1;
      setPanelsPerString(fallbackPanelsPerString);
      setParallelStrings(Math.max(1, configuredPanelCount / fallbackPanelsPerString));
      return;
    }

    const derivedParallelStrings = Math.max(1, configuredPanelCount / panelsPerString);
    if (parallelStrings !== derivedParallelStrings) {
      setParallelStrings(derivedParallelStrings);
    }
  }, [configuredPanelCount, panelsPerString, parallelStrings, panelsPerStringOptions]);

  useEffect(() => {
    setSurfaceNameDraft(surface?.name ?? surfaceId);
    setSurfaceDescription(surface?.description ?? '');
    setPhoto(surface?.photo_data_url ?? null);
    setSurfaceAreaHeightDraft(surface?.area_height_m != null ? String(surface.area_height_m) : '');
    setSurfaceAreaWidthDraft(surface?.area_width_m != null ? String(surface.area_width_m) : '');
    setSurfaceNotes(surface?.notes ?? '');
  }, [surface?.surface_id, surface?.name, surface?.description, surface?.photo_data_url, surface?.area_height_m, surface?.area_width_m, surface?.notes, surfaceId]);

  if (!surface) {
    return (
      <section className="panel error-panel">
        <Breadcrumbs route={{ kind: 'surface', surfaceId }} surfaceName={surfaceId} />
        <h1>Surface not found</h1>
        <p>No surface detail is available for `{surfaceId}` in the current export.</p>
      </section>
    );
  }

  const selectedPanelType = selectedPanelTypeId
    ? data.entities.panel_types.find((item) => item.panel_type_id === selectedPanelTypeId) ?? null
    : null;
  const panelType = selectedPanelType ?? (array?.panel_type_id
    ? data.entities.panel_types.find((item) => item.panel_type_id === array.panel_type_id) ?? null
    : null);
  const arrayConfig = panelType
    ? evaluateArrayConfiguration(
      panelType,
      configuredPanelCount,
      Math.max(0, panelsPerString),
      Math.max(0, parallelStrings),
    )
    : null;
  const mpptCompatibility = arrayConfig
    ? evaluateMpptCompatibility(arrayConfig, data.entities.mppt_types.find((item) => item.mppt_type_id === selectedMpptTypeId) ?? null)
    : null;
  const selectedMpptType = selectedMpptTypeId
    ? data.entities.mppt_types.find((item) => item.mppt_type_id === selectedMpptTypeId) ?? null
    : null;
  const livePanelCount = arrayConfig?.configuredPanelCount ?? arrayState?.panel_count ?? 0;
  const liveInstalledWp = arrayConfig ? arrayConfig.arrayPower : arrayState?.installed_wp ?? 0;
  const liveArrayName = (surfaceNameDraft || surface.name).trim() || array.name;
  const projectStorageKey = getProjectStorageKey(data);
  const storedLatitude = readPersistentState<string>(
    `${projectStorageKey}:location:latitude`,
    data.project.location?.latitude != null ? String(data.project.location.latitude) : '',
  );
  const numericLatitude = Number(storedLatitude);
  const effectiveLatitude = Number.isFinite(numericLatitude) && storedLatitude !== ''
    ? numericLatitude
    : (data.project.location?.latitude ?? 52);
  const estimatedYieldRows = estimateFaceYieldTable({
    installedWp: liveInstalledWp,
    azimuthDeg: surfaceAzimuthDraft,
    tiltDeg: surfaceTiltDraft,
    latitudeDeg: effectiveLatitude,
  });

  async function handleSaveSurfaceDetails(options?: { photoOverride?: string | null }) {
    const trimmedName = surfaceNameDraft.trim();
    const nameToPersist = trimmedName || surface.name;
    const descriptionToPersist = surfaceDescription.trim();
    const photoToPersist = options?.photoOverride === undefined ? photo : options.photoOverride;
    const areaHeightM = surfaceAreaHeightDraft.trim() === '' ? null : Number(surfaceAreaHeightDraft);
    const areaWidthM = surfaceAreaWidthDraft.trim() === '' ? null : Number(surfaceAreaWidthDraft);

    if (!nameToPersist) {
      setSurfaceSaveError('Surface name is required before saving.');
      setSurfaceSaveMessage(null);
      return;
    }

    setIsSavingSurface(true);
    setSurfaceSaveError(null);
    setSurfaceSaveMessage(null);

    try {
      const response = await fetch(`/api/surfaces/${encodeURIComponent(surfaceId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: nameToPersist,
          description: descriptionToPersist,
          orientation_deg: surfaceAzimuthDraft,
          tilt_deg: surfaceTiltDraft,
          area_height_m: areaHeightM,
          area_width_m: areaWidthM,
          notes: surfaceNotes.trim(),
          photo_data_url: photoToPersist,
        }),
      });

      const payload = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? `Failed to save face (${response.status})`);
      }

      try {
        window.localStorage.setItem(`${storagePrefix}:azimuth`, JSON.stringify(surfaceAzimuthDraft));
        window.localStorage.setItem(`${storagePrefix}:tilt`, JSON.stringify(surfaceTiltDraft));
        window.dispatchEvent(new Event('offgridos-local-storage-change'));
      } catch {
        // Keep the save successful even if local draft syncing fails.
      }

      setSurfaceSaveMessage('Surface details saved to the project database.');
      await refreshProjectData();
    } catch (error) {
      setSurfaceSaveError(error instanceof Error ? error.message : 'Failed to save surface details.');
      setSurfaceSaveMessage(null);
    } finally {
      setIsSavingSurface(false);
    }
  }

  async function handleSavePanelSetup() {
    if (configuredPanelCount > 0 && !selectedPanelTypeId) {
      setPanelSaveError('Choose a panel type before saving panel setup.');
      setPanelSaveMessage(null);
      return;
    }

    setIsSavingPanels(true);
    setPanelSaveError(null);
    setPanelSaveMessage(null);

    try {
      const response = await fetch(`/api/surface-panel-assignments/${encodeURIComponent(surfaceId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          panel_type_id: configuredPanelCount > 0 ? selectedPanelTypeId : null,
          count: configuredPanelCount,
        }),
      });

      const payload = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? `Failed to save panel setup (${response.status})`);
      }

      try {
        window.localStorage.setItem(`${storagePrefix}:panel-type`, JSON.stringify(selectedPanelTypeId));
        window.localStorage.setItem(`${storagePrefix}:panel-count`, JSON.stringify(configuredPanelCount));
        window.dispatchEvent(new Event('offgridos-local-storage-change'));
      } catch {
        // Keep the save successful even if local draft syncing fails.
      }

      setPanelSaveMessage(
        configuredPanelCount > 0
          ? 'Panel configuration and count saved to the project database.'
          : 'Panels removed from this surface in the project database.',
      );
      await refreshProjectData();
    } catch (error) {
      setPanelSaveError(error instanceof Error ? error.message : 'Failed to save panel setup.');
      setPanelSaveMessage(null);
    } finally {
      setIsSavingPanels(false);
    }
  }

  async function handleSaveSurfaceDesign() {
    if (configuredPanelCount === 0) {
      if (panelsPerString !== 0 || parallelStrings !== 0) {
        setSurfaceDesignSaveError('Surfaces with 0 panels must also use 0 panels per string and 0 parallel strings.');
        setSurfaceDesignSaveMessage(null);
        return;
      }
    } else if (panelsPerString <= 0 || parallelStrings <= 0 || panelsPerString * parallelStrings !== configuredPanelCount) {
      setSurfaceDesignSaveError('Panels per string multiplied by parallel strings must match the configured panel count before saving.');
      setSurfaceDesignSaveMessage(null);
      return;
    }

    setIsSavingSurfaceDesign(true);
    setSurfaceDesignSaveError(null);
    setSurfaceDesignSaveMessage(null);

    try {
      const response = await fetch(`/api/surface-configurations/${encodeURIComponent(surfaceId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          panels_per_string: panelsPerString,
          parallel_strings: parallelStrings,
          selected_mppt_type_id: selectedMpptTypeId || null,
        }),
      });

      const payload = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? `Failed to save surface configuration (${response.status})`);
      }

      try {
        window.localStorage.setItem(`${storagePrefix}:panels-per-string`, JSON.stringify(panelsPerString));
        window.localStorage.setItem(`${storagePrefix}:parallel-strings`, JSON.stringify(parallelStrings));
        window.localStorage.setItem(`${storagePrefix}:mppt-type`, JSON.stringify(selectedMpptTypeId));
        window.dispatchEvent(new Event('offgridos-local-storage-change'));
      } catch {
        // Keep the save successful even if local draft syncing fails.
      }

      setSurfaceDesignSaveMessage('Panel array layout and MPPT choice saved to the project database.');
      await refreshProjectData();
    } catch (error) {
      setSurfaceDesignSaveError(error instanceof Error ? error.message : 'Failed to save surface configuration.');
      setSurfaceDesignSaveMessage(null);
    } finally {
      setIsSavingSurfaceDesign(false);
    }
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const nextPhoto = e.target?.result as string;
      setPhoto(nextPhoto);
      void handleSaveSurfaceDetails({ photoOverride: nextPhoto });
    };
    reader.readAsDataURL(file);
  }

  return (
    <section className="detail-shell">
      <div className="detail-grid detail-intro-grid">
        <section className="panel panel-span-2 panel-with-actions">
          <Breadcrumbs route={{ kind: 'surface', surfaceId }} surfaceName={surface.name} />
          <div className="section-head">
            <h2>Surface information</h2>
          </div>
          <h1 className="detail-page-title">{surface.name}</h1>
          {surfaceSaveError ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--danger)' }}>{surfaceSaveError}</p> : null}
          {surfaceSaveMessage ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--accent-strong)' }}>{surfaceSaveMessage}</p> : null}
          <div className="roof-config-inline">
            <label className="config-field">
              <span>Surface name</span>
              <input
                type="text"
                value={surfaceNameDraft}
                onChange={(event) => setSurfaceNameDraft(event.target.value)}
              />
            </label>
            <label className="config-field config-field-span-2">
              <span>Description</span>
              <input
                type="text"
                value={surfaceDescription}
                onChange={(event) => setSurfaceDescription(event.target.value)}
              />
            </label>
            <label className="config-field">
              <span>Height (m)</span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={surfaceAreaHeightDraft}
                onChange={(event) => setSurfaceAreaHeightDraft(event.target.value)}
              />
            </label>
            <label className="config-field">
              <span>Width (m)</span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={surfaceAreaWidthDraft}
                onChange={(event) => setSurfaceAreaWidthDraft(event.target.value)}
              />
            </label>
            <label className="config-field">
              <span>Azimuth</span>
              <input
                type="number"
                min={0}
                max={360}
                step={1}
                value={surfaceAzimuthDraft}
                onChange={(event) => setSurfaceAzimuthDraft(Math.max(0, Math.min(360, Number(event.target.value) || 0)))}
              />
            </label>
            <label className="config-field">
              <span>Tilt</span>
              <input
                type="number"
                min={0}
                max={90}
                step={1}
                value={surfaceTiltDraft}
                onChange={(event) => setSurfaceTiltDraft(Math.max(0, Math.min(90, Number(event.target.value) || 0)))}
              />
            </label>
          </div>
          <div className="button-row button-row-end">
            <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveSurfaceDetails()} disabled={isSavingSurface}>
              {isSavingSurface ? 'Saving...' : 'Save'}
            </button>
          </div>
        </section>

        <section className="panel panel-with-actions">
          <div className="section-head">
            <h2>Surface photo</h2>
            <p>Optional visual reference for this surface, saved in the project database when you click Save.</p>
          </div>
          {photo ? (
            <div className="photo-frame">
              <img src={photo} alt={`${surfaceNameDraft || surface.name} surface`} className="photo-image" />
              <button
                type="button"
                className="button button-secondary button-sm photo-remove"
                onClick={() => {
                  setPhoto(null);
                  void handleSaveSurfaceDetails({ photoOverride: null });
                }}
              >
                Remove
              </button>
            </div>
          ) : (
            <label className="upload-dropzone">
              <span>Click to upload a photo</span>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
            </label>
          )}
          <div className="button-row button-row-end">
            <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveSurfaceDetails()} disabled={isSavingSurface}>
              {isSavingSurface ? 'Saving...' : 'Save'}
            </button>
          </div>
        </section>
      </div>

      <section className="detail-grid storage-detail-grid">
        <section className="panel panel-with-actions">
          <div className="section-head">
            <h2>Panel</h2>
            <p>Choose panel type and count.</p>
          </div>
          {panelSaveError ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--danger)' }}>{panelSaveError}</p> : null}
          {panelSaveMessage ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--accent-strong)' }}>{panelSaveMessage}</p> : null}
          <div className="fit-card">
            <div className="panel-config-grid config-control-row">
              <label className="config-field config-field-span-2">
                <span>Selected panel</span>
                <select
                  value={selectedPanelTypeId}
                  onChange={(event) => setSelectedPanelTypeId(event.target.value)}
                >
                  {data.entities.panel_types.map((option) => (
                    <option key={option.panel_type_id} value={option.panel_type_id}>
                      {option.model} · {formatWp(option.wp)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="config-field">
                <span>Panel count</span>
                <input
                  type="number"
                  min={0}
                  value={configuredPanelCount}
                  onChange={(event) => setConfiguredPanelCount(Math.max(0, Number(event.target.value) || 0))}
                />
              </label>
            </div>
            {panelType ? (
              <dl className="detail-stats panel-spec-grid">
                <div>
                  <dt>Wp</dt>
                  <dd>{formatWp(panelType.wp)}</dd>
                </div>
                <div>
                  <dt>Voc</dt>
                  <dd>{formatVolts(panelType.voc)}</dd>
                </div>
                <div>
                  <dt>Vmp</dt>
                  <dd>{formatVolts(panelType.vmp)}</dd>
                </div>
                <div>
                  <dt>Isc</dt>
                  <dd>{formatAmps(panelType.isc)}</dd>
                </div>
                <div>
                  <dt>Imp</dt>
                  <dd>{formatAmps(panelType.imp)}</dd>
                </div>
                <div>
                  <dt>Height</dt>
                  <dd>{panelType.length_mm != null ? `${panelType.length_mm} mm` : 'n/a'}</dd>
                </div>
                <div>
                  <dt>Width</dt>
                  <dd>{panelType.width_mm != null ? `${panelType.width_mm} mm` : 'n/a'}</dd>
                </div>
                <div>
                  <dt>Wp/m²</dt>
                  <dd>{panelType.wp_per_m2 != null ? `${panelType.wp_per_m2} W/m²` : 'n/a'}</dd>
                </div>
              </dl>
            ) : (
              <p className="fit-note">Choose a panel type to see its panel attributes.</p>
            )}
          </div>
          <div className="button-row button-row-end">
            <button type="button" className="button button-secondary button-sm" onClick={() => void handleSavePanelSetup()} disabled={isSavingPanels}>
              {isSavingPanels ? 'Saving...' : 'Save'}
            </button>
          </div>
        </section>

        <section className="panel panel-with-actions">
          <div className="section-head">
            <h2>Panel array</h2>
            <p>Set the preferred string layout for this surface array.</p>
          </div>
          {surfaceDesignSaveError ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--danger)' }}>{surfaceDesignSaveError}</p> : null}
          {surfaceDesignSaveMessage ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--accent-strong)' }}>{surfaceDesignSaveMessage}</p> : null}
          {arrayConfig?.configuredPanelCount ? (
            <>
              <div className="fit-card">
                <div className="config-grid config-control-row">
                  <label className="config-field">
                    <span>Panels per string</span>
                    <select
                      value={panelsPerString}
                      onChange={(event) => {
                        const nextPanelsPerString = Math.max(0, Number(event.target.value) || 0);
                        setPanelsPerString(nextPanelsPerString);
                        setParallelStrings(nextPanelsPerString > 0 ? Math.max(1, configuredPanelCount / nextPanelsPerString) : 0);
                      }}
                    >
                      {panelsPerStringOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="config-field">
                    <span>Parallel strings</span>
                    <select
                      value={parallelStrings}
                      onChange={(event) => {
                        const nextParallelStrings = Math.max(0, Number(event.target.value) || 0);
                        setParallelStrings(nextParallelStrings);
                        setPanelsPerString(nextParallelStrings > 0 ? Math.max(1, configuredPanelCount / nextParallelStrings) : 0);
                      }}
                    >
                      {parallelStringOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <dl className="detail-stats compact-stats">
                  <div>
                    <dt>Array Voc</dt>
                    <dd>{formatVolts(arrayConfig.stringVoc)}</dd>
                  </div>
                  <div>
                    <dt>Array voltage</dt>
                    <dd>{formatVolts(arrayConfig.stringVmp)}</dd>
                  </div>
                  <div>
                    <dt>Array Isc</dt>
                    <dd>{formatAmps(arrayConfig.arrayIsc)}</dd>
                  </div>
                  <div>
                    <dt>Array power</dt>
                    <dd>{formatWp(arrayConfig.arrayPower)}</dd>
                  </div>
                </dl>
              </div>
              <div className="button-row button-row-end">
                <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveSurfaceDesign()} disabled={isSavingSurfaceDesign}>
                  {isSavingSurfaceDesign ? 'Saving...' : 'Save'}
                </button>
              </div>
            </>
          ) : (
            <p className="fit-note">
              Configure and save at least one panel before configuring string layout.
            </p>
          )}
        </section>

        <section className="panel panel-with-actions">
          <div className="section-head">
            <h2>MPPT</h2>
            <p>Choose the MPPT.</p>
          </div>
          {arrayConfig?.configuredPanelCount ? (
            <>
              <div className="fit-card">
                <div className="config-grid config-control-row mppt-config-row">
                  <label className="config-field config-field-span-2">
                    <span>Selected MPPT</span>
                    <select
                      value={selectedMpptTypeId}
                      onChange={(event) => setSelectedMpptTypeId(event.target.value)}
                    >
                      {data.entities.mppt_types.map((option) => (
                        <option key={option.mppt_type_id} value={option.mppt_type_id}>
                          {option.model}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {selectedMpptType ? (
                  <dl className="detail-stats mppt-limits">
                    <div>
                      <dt>Max Voc</dt>
                      <dd>{formatVolts(selectedMpptType.max_voc)}</dd>
                    </div>
                    <div>
                      <dt>Trackers</dt>
                      <dd>{selectedMpptType.tracker_count}</dd>
                    </div>
                    <div>
                      <dt>PV power / tracker</dt>
                      <dd>{formatWp(selectedMpptType.max_pv_power / Math.max(selectedMpptType.tracker_count, 1))}</dd>
                    </div>
                    <div>
                      <dt>Max PV power</dt>
                      <dd>{formatWp(selectedMpptType.max_pv_power)}</dd>
                    </div>
                    <div>
                      <dt>Max charge current</dt>
                      <dd>{formatAmps(selectedMpptType.max_charge_current)}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="fit-note">Choose an MPPT to see its MPPT attributes.</p>
                )}
              </div>
              <div className="button-row button-row-end">
                <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveSurfaceDesign()} disabled={isSavingSurfaceDesign}>
                  {isSavingSurfaceDesign ? 'Saving...' : 'Save'}
                </button>
              </div>
            </>
          ) : (
            <p className="fit-note">
              Configure and save at least one panel before selecting an MPPT.
            </p>
          )}
        </section>

        <section className="panel panel-span-2 balanced-row-panel summary-panel">
          <div className="section-head">
            <h2>Evaluation</h2>
            <p>Evaluation of the panel-array and MPPT combination.</p>
          </div>
          {panelType ? (
            <div className="fit-card">
              {arrayConfig ? (
                <div className="evaluation-section">
                  <div className="outcome-panel">
                    <div className="outcome-summary">
                      <div className="outcome-status-line">
                        <p className="result-label">Evaluation</p>
                        <StatusBadge status={mpptCompatibility?.status ?? 'outside_limits'} fit={mpptCompatibility?.fit} />
                      </div>
                      <ul className="reason-list">
                        {mpptCompatibility?.reasons.map((reason) => (
                          <li key={reason}>{reason.replaceAll('_', ' ')}</li>
                        )) ?? null}
                      </ul>
                    </div>
                    {mpptCompatibility && selectedMpptType ? (
                      <dl className="detail-stats outcome-checks">
                        <div className={arrayConfig.stringVoc > selectedMpptType.max_voc ? 'check-fail' : 'check-pass'}>
                          <dt>Voltage check</dt>
                          <dd>{formatVolts(arrayConfig.stringVoc)} / {formatVolts(selectedMpptType.max_voc)}</dd>
                        </div>
                        <div className={arrayConfig.arrayPower > selectedMpptType.max_pv_power / Math.max(selectedMpptType.tracker_count, 1) * 1.1 ? 'check-fail' : 'check-pass'}>
                          <dt>Power check / tracker</dt>
                          <dd>{formatWp(arrayConfig.arrayPower)} / {formatWp(selectedMpptType.max_pv_power / Math.max(selectedMpptType.tracker_count, 1))}</dd>
                        </div>
                        <div className={selectedMpptType.max_pv_input_current_a != null && arrayConfig.arrayCurrent > selectedMpptType.max_pv_input_current_a ? 'check-fail' : 'check-pass'}>
                          <dt>PV input current / tracker</dt>
                          <dd>{formatAmps(arrayConfig.arrayCurrent)} / {selectedMpptType.max_pv_input_current_a != null ? formatAmps(selectedMpptType.max_pv_input_current_a) : 'n/a'}</dd>
                        </div>
                        <div className={selectedMpptType.max_pv_short_circuit_current_a != null && arrayConfig.arrayIsc > selectedMpptType.max_pv_short_circuit_current_a ? 'check-fail' : 'check-pass'}>
                          <dt>PV short-circuit current / tracker</dt>
                          <dd>{formatAmps(arrayConfig.arrayIsc)} / {selectedMpptType.max_pv_short_circuit_current_a != null ? formatAmps(selectedMpptType.max_pv_short_circuit_current_a) : 'n/a'}</dd>
                        </div>
                        <div>
                          <dt>Battery charge current</dt>
                          <dd>{formatAmps(mpptCompatibility.chargeCurrent)}</dd>
                        </div>
                      </dl>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="fit-note">Choose a panel type before the technical summary can be calculated.</p>
          )}
        </section>
        <section className="panel balanced-row-panel notes-panel">
          <div className="section-head">
            <h2>Notes</h2>
            <p>Notes for this surface, saved in the project database when you click Save.</p>
          </div>
          <label className="field">
            <span>Notes</span>
            <textarea
              value={surfaceNotes}
              onChange={(event) => setSurfaceNotes(event.target.value)}
              rows={8}
              placeholder="Add installation notes, shading observations, access constraints, or design intent here."
            />
          </label>
          <div className="button-row button-row-end">
            <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveSurfaceDetails()} disabled={isSavingSurface}>
              {isSavingSurface ? 'Saving...' : 'Save'}
            </button>
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Expected yield</h2>
          <p>Estimated from location latitude, face azimuth, tilt, and installed PV. This is a planning estimate, not a measured result.</p>
        </div>
        <div className="yield-table-wrap">
          <table className="yield-table">
            <thead>
              <tr>
                <th>Metric</th>
                {estimatedYieldRows.map((row) => (
                  <th key={row.month}>{MONTH_LABELS[row.month]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>kWh/day</th>
                {estimatedYieldRows.map((row) => (
                  <td key={`day-${row.month}`}>{formatDailyYield(row.averageDailyKwh)}</td>
                ))}
              </tr>
              <tr>
                <th>kWh/month</th>
                {estimatedYieldRows.map((row) => (
                  <td key={`month-${row.month}`}>{row.monthlyKwh.toLocaleString('en-US', { maximumFractionDigits: 1 })}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </section>
  );
}

type PageContext = {
  data: DigitalTwinExport;
  route: Route;
  weakestMonth: MonthlyBalanceRow | null;
  localSurfaceSummaries: LocalSurfaceSummary[];
  localTotalInstalledWp: number;
  arrayStateBySurface: Map<string, ArrayState>;
  mpptByArray: Map<string, MpptConfiguration>;
  relationByArray: Map<string, ArrayToMpptRelationship>;
  mpptToBatteryBankByMpptId: Map<string, MpptToBatteryBankRelationship>;
  arrayById: Map<string, ArrayEntity>;
  mpptById: Map<string, MpptConfiguration>;
  batteryBank: BatteryBank | null;
  batteryBankState: {
    battery_bank_id: string;
    module_count: number;
    nominal_voltage_v: number | null;
    capacity_kwh: number | null;
    total_mppt_charge_current_a: number | null;
  } | null;
  projectInverter: InverterConfiguration | null;
  batteryToInverter: BatteryBankToInverterRelationship | null;
  refreshProjectData: () => Promise<void>;
};

function OverviewPage({
  data,
  route,
  weakestMonth,
  localSurfaceSummaries,
  localTotalInstalledWp,
  arrayStateBySurface,
  mpptByArray,
  relationByArray,
  mpptToBatteryBankByMpptId,
  arrayById,
  mpptById,
  batteryBank,
  batteryBankState,
  projectInverter,
  batteryToInverter,
}: PageContext) {
  return (
    <>
      <div className="topbar">
        <h1 className="topbar-title">{data.project.name}</h1>
      </div>

      <header className="hero panel">
        <div className="hero-strip">
          <SummaryCard label="Installed PV" value={formatWp(localTotalInstalledWp)} />
      <SummaryCard label="Surfaces" value={String(localSurfaceSummaries.length)} />
          <SummaryCard label="Arrays" value={String(localSurfaceSummaries.length)} />
          <SummaryCard label="MPPTs" value={String(localSurfaceSummaries.length)} />
          <SummaryCard
            label="Battery capacity"
            value={batteryBankState?.capacity_kwh != null ? `${batteryBankState.capacity_kwh} kWh` : 'n/a'}
          />
          <SummaryCard
            label="Inverter"
            value={batteryToInverter?.continuous_power_w != null ? formatKw(batteryToInverter.continuous_power_w) : 'n/a'}
          />
        </div>
      </header>

      <section className="chain panel">
        <div className="section-head">
          <h2>System chain</h2>
        </div>
        <div className="chain-row">
          <div className="chain-node">
            <div className="chain-node-label">Surfaces</div>
            <div className="chain-node-metric">{localSurfaceSummaries.length}</div>
          </div>
          <div className="chain-arrow">→</div>
          <div className="chain-node">
            <div className="chain-node-label">Arrays</div>
            <div className="chain-node-metric">{localSurfaceSummaries.length}</div>
          </div>
          <div className="chain-arrow">→</div>
          <div className="chain-node">
            <div className="chain-node-label">MPPTs</div>
            <div className="chain-node-metric">{localSurfaceSummaries.length}</div>
          </div>
          <div className="chain-arrow">→</div>
          <div className="chain-node">
            <div className="chain-node-label">Battery bank</div>
            <div className="chain-node-metric">
              {batteryBankState?.capacity_kwh != null ? `${batteryBankState.capacity_kwh} kWh` : batteryBank?.name ?? 'n/a'}
            </div>
          </div>
          <div className="chain-arrow">→</div>
          <div className="chain-node">
            <div className="chain-node-label">Inverter</div>
            <div className="chain-node-metric">
              {batteryToInverter?.continuous_power_w != null ? formatKw(batteryToInverter.continuous_power_w) : projectInverter?.name ?? 'n/a'}
            </div>
          </div>
        </div>
      </section>

      <section className="status-strip panel">
        <div className="section-head">
          <h2>Array → MPPT fit</h2>
        </div>
        <div className="status-list">
          {data.relationships.array_to_mppt.map((relation) => {
            const array = arrayById.get(relation.from_array_id);
            const mppt = mpptById.get(relation.to_mppt_configuration_id);
            return (
              <article key={relation.relationship_id} className="status-card">
                <div className="status-card-top">
                  <span className="status-title">{array?.name ?? relation.from_array_id}</span>
                  <StatusBadge status={relation.evaluation.electrical_status} fit={relation.evaluation.fit_status} />
                </div>
                <p>{mppt?.name ?? relation.to_mppt_configuration_id}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="overview-grid">
        <section className="panel panel-with-actions">
          <div className="section-head">
            <h2>Surfaces</h2>
            <p>Surface summary, array setup, and MPPT judgment together on one page.</p>
          </div>
          <div className="surface-grid">
            {localSurfaceSummaries.map((surface) => {
              return (
                <div
                  key={surface.surface_id}
                  className="surface-card"
                >
                  <div className="surface-card-top">
                    <div>
                      <h3>{surface.name}</h3>
                      <p className="surface-card-meta">{surface.orientation_deg}° · {surface.tilt_deg}° tilt</p>
                    </div>
                    <StatusBadge status={surface.status} fit={surface.fit} />
                  </div>
                  <dl className="mini-stats">
                    <div>
                      <dt>Array</dt>
                      <dd>{surface.array_name}</dd>
                    </div>
                    <div>
                      <dt>Panels</dt>
                      <dd>{surface.panel_count}</dd>
                    </div>
                    <div>
                      <dt>Installed</dt>
                      <dd>{formatWp(surface.installed_wp)}</dd>
                    </div>
                    <div>
                      <dt>MPPT</dt>
                      <dd>{surface.mppt_name}</dd>
                    </div>
                  </dl>
                  <div className="button-row">
                    <button
                      type="button"
                      className="button button-secondary button-sm"
                      onClick={() => navigateTo({ kind: 'surface', surfaceId: surface.surface_id })}
                    >
                      Detail
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>Battery array</h2>
            <p>The export now derives one provisional battery bank and inverter so the chain continues past the MPPT layer.</p>
          </div>
          <div className="status-list">
            <article className="status-card">
              <div className="status-card-top">
                <span className="status-title">Battery bank</span>
                <StatusBadge status={batteryToInverter?.evaluation.electrical_status ?? 'within_limits'} />
              </div>
              <p>{batteryBank?.name ?? 'No provisional battery bank'}</p>
              <dl className="mini-stats">
                <div>
                  <dt>Modules</dt>
                  <dd>{batteryBankState?.module_count ?? 0}</dd>
                </div>
                <div>
                  <dt>Voltage</dt>
                  <dd>{batteryBankState?.nominal_voltage_v != null ? `${batteryBankState.nominal_voltage_v} V` : 'n/a'}</dd>
                </div>
                <div>
                  <dt>Capacity</dt>
                  <dd>{batteryBankState?.capacity_kwh != null ? `${batteryBankState.capacity_kwh} kWh` : 'n/a'}</dd>
                </div>
                <div>
                  <dt>MPPT charge</dt>
                  <dd>{batteryBankState?.total_mppt_charge_current_a != null ? `${batteryBankState.total_mppt_charge_current_a} A` : 'n/a'}</dd>
                </div>
              </dl>
            </article>

            <article className="status-card">
              <div className="status-card-top">
                <span className="status-title">Inverter</span>
                <StatusBadge status={batteryToInverter?.evaluation.electrical_status ?? 'within_limits'} />
              </div>
              <p>{projectInverter?.name ?? 'No provisional inverter'}</p>
              <dl className="mini-stats">
                <div>
                  <dt>Bank link</dt>
                  <dd>{batteryToInverter ? 'Connected' : 'Pending'}</dd>
                </div>
                <div>
                  <dt>Power</dt>
                  <dd>{batteryToInverter?.continuous_power_w != null ? formatKw(batteryToInverter.continuous_power_w) : 'n/a'}</dd>
                </div>
                <div>
                  <dt>Voltage</dt>
                  <dd>{batteryToInverter?.nominal_voltage_v != null ? `${batteryToInverter.nominal_voltage_v} V` : 'n/a'}</dd>
                </div>
                <div>
                  <dt>Fit</dt>
                  <dd>{batteryToInverter?.evaluation.reasons[0]?.replaceAll('_', ' ') ?? 'n/a'}</dd>
                </div>
              </dl>
            </article>
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Monthly balance</h2>
        </div>
        <div className="section-head">
          <h3>Project solar output</h3>
          <p>Summed average daily and monthly solar output across all surface configurations.</p>
        </div>
        <div className="yield-table-wrap">
          <table className="yield-table">
            <thead>
              <tr>
                <th>Metric</th>
                {data.derived.project_monthly_solar_output.map((row) => (
                  <th key={row.month}>{MONTH_LABELS[row.month] ?? row.month}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>kWh/day</th>
                {data.derived.project_monthly_solar_output.map((row) => (
                  <td key={`project-day-${row.month}`}>{formatDailyYield(row.average_daily_kwh)}</td>
                ))}
              </tr>
              <tr>
                <th>kWh/month</th>
                {data.derived.project_monthly_solar_output.map((row) => (
                  <td key={`project-month-${row.month}`}>{row.monthly_kwh.toLocaleString('en-US', { maximumFractionDigits: 1 })}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="month-list">
          {data.derived.monthly_balance.map((row) => {
            const hasData = row.solar_kwh != null || row.consumer_kwh != null;
            return (
              <div key={row.month} className={`month-row ${weakestMonth?.month === row.month ? 'month-row-active' : ''}`}>
                <span>{MONTH_LABELS[row.month] ?? row.month}</span>
                {hasData ? (
                  <span>
                    {row.solar_kwh != null ? `${row.solar_kwh} kWh solar` : ''}
                    {row.solar_kwh != null && row.consumer_kwh != null ? ' · ' : ''}
                    {row.consumer_kwh != null ? `${row.consumer_kwh} kWh load` : ''}
                  </span>
                ) : (
                  <span className="month-empty">{row.notes ?? 'No data yet'}</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

    </>
  );
}

function LocationPage({ data, localSurfaceSummaries, refreshProjectData }: PageContext) {
  const storagePrefix = `${data.project.project_id}:location`;
  const defaultLocationName = data.project.location?.title ?? '18Mad Boerderij';
  const [title, setTitle] = usePersistentState(
    `${storagePrefix}:title`,
    defaultLocationName,
  );
  const [country, setCountry] = usePersistentState(`${storagePrefix}:country`, data.project.location?.country ?? '');
  const [description, setDescription] = usePersistentState(`${storagePrefix}:description`, data.project.location?.description ?? '');
  const [notes, setNotes] = usePersistentState(`${storagePrefix}:notes`, data.project.location?.notes ?? '');
  const [latitude, setLatitude] = usePersistentState(
    `${storagePrefix}:latitude`,
    data.project.location?.latitude != null ? String(data.project.location.latitude) : '',
  );
  const [longitude, setLongitude] = usePersistentState(
    `${storagePrefix}:longitude`,
    data.project.location?.longitude != null ? String(data.project.location.longitude) : '',
  );
  const [photo, setPhoto] = useState<string | null>(data.project.location?.site_photo_data_url ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingSurface, setIsCreatingSurface] = useState(false);
  const [focusedSurfaceId, setFocusedSurfaceId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [surfaceMessage, setSurfaceMessage] = useState<string | null>(null);
  const [surfaceError, setSurfaceError] = useState<string | null>(null);
  const numericLatitude = Number(latitude);
  const numericLongitude = Number(longitude);
  const hasMapCoordinates = Number.isFinite(numericLatitude) && Number.isFinite(numericLongitude);

  async function handleSaveLocation(photoOverride?: string | null) {
    const numericLatitude = Number(latitude);
    const numericLongitude = Number(longitude);
    const nextPhoto = photoOverride === undefined ? photo : photoOverride;

    if (!country.trim()) {
      setSaveError('Country is required before saving.');
      setSaveMessage(null);
      return;
    }

    if (!Number.isFinite(numericLatitude) || numericLatitude < -90 || numericLatitude > 90) {
      setSaveError('Latitude must be a number between -90 and 90.');
      setSaveMessage(null);
      return;
    }

    if (!Number.isFinite(numericLongitude) || numericLongitude < -180 || numericLongitude > 180) {
      setSaveError('Longitude must be a number between -180 and 180.');
      setSaveMessage(null);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/location', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim() || null,
          place_name: data.project.location?.place_name ?? 'Warten',
          country: country.trim(),
          description: description.trim(),
          notes: notes.trim(),
          latitude: numericLatitude,
          longitude: numericLongitude,
          site_photo_data_url: nextPhoto,
        }),
      });

      const payload = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? `Failed to save location (${response.status})`);
      }

      setSaveMessage('Shared location saved to the project database.');
      setSaveError(null);
      await refreshProjectData();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save location.');
      setSaveMessage(null);
    } finally {
      setIsSaving(false);
    }
  }

  function buildSurfaceId(): string {
    return `surface-${Date.now()}`;
  }

  async function handleCreateSurface() {
    setIsCreatingSurface(true);
    setSurfaceError(null);
    setSurfaceMessage(null);

    const surfaceId = buildSurfaceId();

    try {
      const response = await fetch('/api/surfaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          surface_id: surfaceId,
          name: 'Unnamed surface',
          orientation_deg: 0,
          tilt_deg: 30,
        }),
      });

      const payload = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? `Failed to create surface (${response.status})`);
      }

      setSurfaceMessage('Surface created in the project database.');
      setSurfaceError(null);
      setFocusedSurfaceId(surfaceId);
      await refreshProjectData();
    } catch (error) {
      setSurfaceError(error instanceof Error ? error.message : 'Failed to create surface.');
      setSurfaceMessage(null);
    } finally {
      setIsCreatingSurface(false);
    }
  }

  async function handleDeleteSurface(surfaceId: string, surfaceLabel: string) {
    const confirmed = window.confirm(`Delete surface "${surfaceLabel}"? This will remove its panels, topology, and configuration.`);
    if (!confirmed) {
      return;
    }

    setSurfaceError(null);
    setSurfaceMessage(null);

    try {
      const response = await fetch(`/api/surfaces/${encodeURIComponent(surfaceId)}`, {
        method: 'DELETE',
      });

      const payload = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? `Failed to delete surface (${response.status})`);
      }

      setSurfaceMessage('Surface deleted from the project database.');
      await refreshProjectData();
    } catch (error) {
      setSurfaceError(error instanceof Error ? error.message : 'Failed to delete surface.');
    }
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const nextPhoto = e.target?.result as string;
      setPhoto(nextPhoto);
      void handleSaveLocation(nextPhoto);
    };
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    setPhoto(data.project.location?.site_photo_data_url ?? null);
  }, [data.project.location?.site_photo_data_url]);

  useEffect(() => {
    const savedTitle = data.project.location?.title?.trim();
    if (savedTitle) {
      setTitle(savedTitle);
      return;
    }

    const currentTitle = title.trim();
    if (currentTitle === '' || currentTitle === data.project.location?.place_name) {
      setTitle(defaultLocationName);
    }
  }, [data.project.location?.place_name, data.project.location?.title, defaultLocationName, setTitle, title]);

  useEffect(() => {
    setDescription(data.project.location?.description ?? '');
  }, [data.project.location?.description, setDescription]);

  useEffect(() => {
    setNotes(data.project.location?.notes ?? '');
  }, [data.project.location?.notes, setNotes]);

  useEffect(() => {
    if (!focusedSurfaceId) return;

    const element = document.getElementById(`surface-card-${focusedSurfaceId}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const clearTimer = window.setTimeout(() => {
      setFocusedSurfaceId(null);
    }, 2200);

    return () => {
      window.clearTimeout(clearTimer);
    };
  }, [focusedSurfaceId, localSurfaceSummaries.length]);

  return (
    <>
      <div className="topbar">
        <h1 className="topbar-title">{title.trim() || defaultLocationName}</h1>
      </div>

      <div className="detail-grid" style={{ marginBottom: 16 }}>
        <section className="panel" style={{ gridColumn: 'span 2' }}>
          <div className="section-head">
            <h2>Start information</h2>
            <p>Shared location inputs for the whole site and all configured surfaces.</p>
          </div>
          <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--muted)', fontSize: '0.86rem' }}>
            Location name, country, description, notes, coordinates, and location image save to SQLite.
          </p>
          {saveError ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--danger)' }}>{saveError}</p> : null}
          {saveMessage ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--accent-strong)' }}>{saveMessage}</p> : null}
          <div className="roof-config-inline">
            <label className="config-field">
              <span>Location name</span>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 18Mad Boerderij" />
            </label>
            <label className="config-field">
              <span>Country</span>
              <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Netherlands" />
            </label>
            <label className="config-field config-field-span-2">
              <span>Description</span>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short shared description of the location" />
            </label>
            <label className="config-field">
              <span>Latitude</span>
              <input
                type="number"
                step="0.0001"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g. 52.3702"
              />
            </label>
            <label className="config-field">
              <span>Longitude</span>
              <input
                type="number"
                step="0.0001"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g. 4.8952"
              />
            </label>
          </div>
          <label className="field" style={{ marginTop: 16 }}>
            <span>Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              onInput={(event) => setNotes(event.currentTarget.value)}
              rows={5}
              placeholder="Shared context for the whole location, such as access, shading context, planning assumptions, or owner notes."
            />
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="button button-secondary" onClick={() => void handleSaveLocation()} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>Site photo</h2>
            <p>Optional visual reference for the location and configured surfaces.</p>
          </div>
          {photo ? (
            <div className="photo-frame">
              <img src={photo} alt="Location" className="photo-image" />
              <button
                type="button"
                className="button button-secondary button-sm photo-remove"
                onClick={() => {
                  setPhoto(null);
                  void handleSaveLocation(null);
                }}
              >
                Remove
              </button>
            </div>
          ) : (
            <label className="upload-dropzone">
              <span>Click to upload a photo</span>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
            </label>
          )}
          <div className="button-row button-row-end">
            <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveLocation()} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
          <div className="section-head" style={{ marginTop: 20 }}>
            <h2>Satellite map</h2>
            <p>Google Maps centered on the saved coordinates.</p>
          </div>
          {hasMapCoordinates ? (
            <div className="map-frame">
              <iframe
                title="Location satellite map"
                src={buildGoogleMapsIframeSrc(numericLatitude, numericLongitude)}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          ) : (
            <p style={{ margin: 0, color: 'var(--muted)' }}>Add valid latitude and longitude values to show the map.</p>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="section-head">
          <h2>Surfaces</h2>
          <p>{localSurfaceSummaries.length} configured surfaces</p>
        </div>
        <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--muted)', fontSize: '0.86rem' }}>
          A surface is one usable plane for PV placement, such as one roof side, dormer face, wall face, or flat roof zone.
        </p>
        {surfaceError ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--danger)' }}>{surfaceError}</p> : null}
        {surfaceMessage ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--accent-strong)' }}>{surfaceMessage}</p> : null}
        <div className="surface-grid">
          {localSurfaceSummaries.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <p style={{ marginTop: 0, marginBottom: 0 }}>No surfaces yet. Add the first one below.</p>
            </div>
          ) : null}
          {localSurfaceSummaries.map((surface) => {
            return (
              <div
                key={surface.surface_id}
                id={`surface-card-${surface.surface_id}`}
                className={`surface-card-stack ${focusedSurfaceId === surface.surface_id ? 'surface-card-highlight' : ''}`}
              >
                <div className="surface-card">
                  <div className="surface-card-top">
                    <div>
                      <h3>{surface.name}</h3>
                    </div>
                  </div>
                  <div className="button-row">
                    <button
                      type="button"
                      className="button button-secondary button-sm"
                      onClick={() => {
                        navigateTo({ kind: 'surface', surfaceId: surface.surface_id });
                      }}
                    >
                      Detail
                    </button>
                    <button
                      type="button"
                      className="button button-danger button-sm"
                      onClick={() => {
                        void handleDeleteSurface(surface.surface_id, surface.name);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="roof-config-inline" style={{ marginTop: 16 }}>
          <div className="config-field" style={{ alignSelf: 'end' }}>
            <span>&nbsp;</span>
            <button type="button" className="button button-secondary" onClick={() => void handleCreateSurface()} disabled={isCreatingSurface}>
              {isCreatingSurface ? 'Creating...' : 'Add surface'}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

function AboutPage() {
  return (
    <>
      <div className="topbar">
        <h1 className="topbar-title">About</h1>
      </div>

      <section className="detail-shell">
        <div className="detail-grid detail-intro-grid">
          <section className="panel panel-span-2">
            <div className="section-head">
              <h2>About OffGridOS</h2>
              <p>OffGridOS is designed and maintained by Joost Okkinga.</p>
            </div>
            <div className="stack" style={{ gap: 16 }}>
              <p style={{ margin: 0, maxWidth: 760, color: 'var(--muted)' }}>
                It is a single-project planning tool for the 18Mad Boerderij digital twin, built around a local-first SQLite database, a Node server, and a React interface.
              </p>
              <div className="hero-strip">
                <SummaryCard label="Maintained by" value="Joost Okkinga" />
                <SummaryCard label="Source code" value="Codeberg" detail="codeberg.org/okkingaj/OffGridOS" />
              </div>
              <div className="button-row">
                <a
                  className="button button-secondary"
                  href="https://codeberg.org/okkingaj/OffGridOS"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Codeberg repo
                </a>
              </div>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}

function SolarYieldPage({
  data,
  localSurfaceSummaries,
  localTotalInstalledWp,
}: Pick<PageContext, 'data' | 'localSurfaceSummaries' | 'localTotalInstalledWp'>) {
  const projectStorageKey = getProjectStorageKey(data);
  const storedLatitude = readPersistentState<string>(
    `${projectStorageKey}:location:latitude`,
    data.project.location?.latitude != null ? String(data.project.location.latitude) : '',
  );
  const numericLatitude = Number(storedLatitude);
  const effectiveLatitude = Number.isFinite(numericLatitude) && storedLatitude !== ''
    ? numericLatitude
    : (data.project.location?.latitude ?? 52);

  const surfaceYieldRows = localSurfaceSummaries.map((surface) => {
    const yieldRows = estimateFaceYieldTable({
      installedWp: surface.installed_wp,
      azimuthDeg: surface.orientation_deg,
      tiltDeg: surface.tilt_deg,
      latitudeDeg: effectiveLatitude,
    });
    const annualKwh = Number(yieldRows.reduce((sum, row) => sum + row.monthlyKwh, 0).toFixed(1));
    const averageDailyKwh = Number((annualKwh / 365).toFixed(2));

    return {
      surface,
      yieldRows,
      annualKwh,
      averageDailyKwh,
    };
  });

  const monthlyTotals = MONTH_KEYS.map((month) => ({
    month,
    averageDailyKwh: Number(surfaceYieldRows.reduce((sum, item) => {
      const match = item.yieldRows.find((row) => row.month === month);
      return sum + (match?.averageDailyKwh ?? 0);
    }, 0).toFixed(2)),
    monthlyKwh: Number(surfaceYieldRows.reduce((sum, item) => {
      const match = item.yieldRows.find((row) => row.month === month);
      return sum + (match?.monthlyKwh ?? 0);
    }, 0).toFixed(1)),
  }));

  const totalAnnualKwh = Number(surfaceYieldRows.reduce((sum, item) => sum + item.annualKwh, 0).toFixed(1));
  const totalAverageDailyKwh = Number((totalAnnualKwh / 365).toFixed(2));

  return (
    <>
      <div className="topbar">
        <h1 className="topbar-title">{data.project.name}</h1>
      </div>

      <section className="detail-shell">
        <div className="detail-grid detail-intro-grid">
          <section className="panel panel-span-2">
            <Breadcrumbs route={{ kind: 'solar-yield' }} />
            <div className="section-head">
              <h2>Start information</h2>
              <p>Solar yield is derived from the location latitude plus all configured surfaces and their PV setup.</p>
            </div>
            <div className="hero-strip">
              <SummaryCard label="Location" value={getLocationDisplayName(data)} detail={data.project.location?.country ?? 'No country set'} />
              <SummaryCard label="Latitude" value={effectiveLatitude.toLocaleString('en-US', { maximumFractionDigits: 4 })} />
              <SummaryCard label="Surfaces" value={String(localSurfaceSummaries.length)} />
              <SummaryCard label="Installed PV" value={formatWp(localTotalInstalledWp)} />
              <SummaryCard label="Avg daily yield" value={formatKwh(totalAverageDailyKwh)} />
              <SummaryCard label="Annual yield" value={formatKwh(totalAnnualKwh)} />
            </div>
          </section>
        </div>

        <section className="panel">
          <div className="section-head">
            <h2>Surface summary</h2>
            <p>One row per surface, including the current verdict and total expected yield.</p>
          </div>
          <div className="yield-table-wrap">
            <table className="yield-table">
              <thead>
                <tr>
                  <th>Surface</th>
                  <th>Verdict</th>
                  <th>Installed PV</th>
                  <th>Azimuth</th>
                  <th>Tilt</th>
                  <th>Avg kWh/day</th>
                  <th>Annual kWh</th>
                </tr>
              </thead>
              <tbody>
                {surfaceYieldRows.map(({ surface, averageDailyKwh, annualKwh }) => (
                  <tr key={surface.surface_id}>
                    <th>{surface.name}</th>
                    <td>
                      <div className="yield-verdict-cell">
                        <StatusBadge status={surface.status} fit={surface.fit} />
                        <span>{verdictLabel(surface.status, surface.fit)}</span>
                      </div>
                    </td>
                    <td>{formatWp(surface.installed_wp)}</td>
                    <td>{surface.orientation_deg}°</td>
                    <td>{surface.tilt_deg}°</td>
                    <td>{formatDailyYield(averageDailyKwh)}</td>
                    <td>{annualKwh.toLocaleString('en-US', { maximumFractionDigits: 1 })}</td>
                  </tr>
                ))}
                <tr>
                  <th>Total</th>
                  <td>{localSurfaceSummaries.some((surface) => surface.status != null) ? 'Mixed' : 'Not evaluated'}</td>
                  <td>{formatWp(localTotalInstalledWp)}</td>
                  <td>-</td>
                  <td>-</td>
                  <td>{formatDailyYield(totalAverageDailyKwh)}</td>
                  <td>{totalAnnualKwh.toLocaleString('en-US', { maximumFractionDigits: 1 })}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>Monthly expected yield</h2>
            <p>Columns show months. Rows show each surface, with the last row giving the average daily yield total for that month.</p>
          </div>
          <div className="yield-table-wrap">
            <table className="yield-table">
              <thead>
                <tr>
                  <th>Expected yield</th>
                  {MONTH_KEYS.map((month) => (
                    <th key={month}>{MONTH_LABELS[month]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {surfaceYieldRows.map(({ surface, yieldRows }) => (
                  <tr key={`monthly-${surface.surface_id}`}>
                    <th>{surface.name}</th>
                    {yieldRows.map((row) => (
                      <td key={`${surface.surface_id}-${row.month}`}>{formatDailyYield(row.averageDailyKwh)}</td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th>Total avg kWh/day</th>
                  {monthlyTotals.map((row) => (
                    <td key={`total-day-${row.month}`}>{formatDailyYield(row.averageDailyKwh)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </>
  );
}

function BatteryArrayPage({
  data,
  batteryBank,
  batteryBankState,
  refreshProjectData,
}: PageContext) {
  const storagePrefix = `${data.project.project_id}:battery-array`;
  const persistedDesign = data.entities.battery_bank_configurations.find((item) => item.battery_bank_id === 'battery-bank-main') ?? null;
  const [batteryTitle, setBatteryTitle] = useState(persistedDesign?.title ?? batteryBank?.name ?? '');
  const [batteryDescription, setBatteryDescription] = useState(persistedDesign?.description ?? '');
  const [batteryImage, setBatteryImage] = useState<string | null>(persistedDesign?.image_data_url ?? null);
  const [batteryNotes, setBatteryNotes] = useState(persistedDesign?.notes ?? '');
  const [selectedBatteryTypeId, setSelectedBatteryTypeId] = usePersistentState(
    `${storagePrefix}:battery-type`,
    persistedDesign?.selected_battery_type_id ?? batteryBank?.battery_type_id ?? data.entities.battery_types[0]?.battery_type_id ?? '',
  );
  const [configuredBatteryCount, setConfiguredBatteryCount] = usePersistentState(
    `${storagePrefix}:battery-count`,
    Math.max(persistedDesign?.configured_battery_count ?? batteryBankState?.module_count ?? batteryBank?.module_count ?? 1, 1),
  );
  const [batteriesPerString, setBatteriesPerString] = usePersistentState(
    `${storagePrefix}:batteries-per-string`,
    Math.max(persistedDesign?.batteries_per_string ?? batteryBankState?.module_count ?? batteryBank?.module_count ?? 1, 1),
  );
  const [parallelStrings, setParallelStrings] = usePersistentState(
    `${storagePrefix}:parallel-strings`,
    Math.max(persistedDesign?.parallel_strings ?? 1, 1),
  );
  const [isSavingBatteryDesign, setIsSavingBatteryDesign] = useState(false);
  const [batteryDesignSaveMessage, setBatteryDesignSaveMessage] = useState<string | null>(null);
  const [batteryDesignSaveError, setBatteryDesignSaveError] = useState<string | null>(null);

  const selectedBatteryType = selectedBatteryTypeId
    ? data.entities.battery_types.find((item) => item.battery_type_id === selectedBatteryTypeId) ?? null
    : null;
  const batteryFactorPairs = getFactorPairs(configuredBatteryCount);
  const batteriesPerStringOptions = batteryFactorPairs.map((pair) => pair.panelsPerString);
  const parallelStringOptions = batteryFactorPairs.map((pair) => pair.parallelStrings);
  const batteryVoltageOptions = buildBatteryVoltageOptions(selectedBatteryType, configuredBatteryCount);
  const batteryArrayConfig = selectedBatteryType
    ? evaluateBatteryArrayConfiguration(
      selectedBatteryType,
      configuredBatteryCount,
      Math.max(1, batteriesPerString),
      Math.max(1, parallelStrings),
    )
    : null;
  const activeUpstreamRelations = data.relationships.array_to_mppt.filter((relation) => {
    const array = data.entities.arrays.find((item) => item.array_id === relation.from_array_id);
    return (array?.panel_count ?? 0) > 0;
  });
  const totalUpstreamInputPowerW = activeUpstreamRelations.reduce((sum, relation) => sum + relation.input_power_w, 0);
  const targetBatteryVoltage = batteryArrayConfig?.stringVoltage ?? batteryBankState?.nominal_voltage_v ?? batteryBank?.nominal_voltage_v ?? null;
  const dailyConsumptionKwh = data.project.project_preferences.daily_consumption_kwh ?? null;
  const projectMonthlySolarByMonth = new Map(
    data.derived.project_monthly_solar_output.map((row) => [row.month, row] as const),
  );
  const bestMonth = data.derived.project_monthly_solar_output
    .map((row) => ({
      month: row.month,
      totalDailyKwh: row.average_daily_kwh,
    }))
    .sort((left, right) => right.totalDailyKwh - left.totalDailyKwh)[0] ?? null;
  const worstMonth = data.derived.project_monthly_solar_output
    .map((row) => ({
      month: row.month,
      totalDailyKwh: row.average_daily_kwh,
    }))
    .sort((left, right) => left.totalDailyKwh - right.totalDailyKwh)[0] ?? null;
  const refillEnergyKwh = batteryArrayConfig
    ? Number((batteryArrayConfig.totalCapacityKwh * 0.6).toFixed(2))
    : null;
  const daysToRefillBestMonth = refillEnergyKwh != null && (bestMonth?.totalDailyKwh ?? 0) > 0
    ? Number((refillEnergyKwh / (bestMonth?.totalDailyKwh ?? 1)).toFixed(1))
    : null;
  const daysToRefillWorstMonth = refillEnergyKwh != null && (worstMonth?.totalDailyKwh ?? 0) > 0
    ? Number((refillEnergyKwh / (worstMonth?.totalDailyKwh ?? 1)).toFixed(1))
    : null;
  const estimatedChargeCurrentA = targetBatteryVoltage != null && targetBatteryVoltage > 0
    ? Number((totalUpstreamInputPowerW / targetBatteryVoltage).toFixed(2))
    : null;
  const chargeCurrentExceeded = batteryArrayConfig?.maxChargeCurrentA != null
    && estimatedChargeCurrentA != null
    && estimatedChargeCurrentA > batteryArrayConfig.maxChargeCurrentA;
  const batteryRefillRule = batteryArrayConfig
    ? evaluateBatteryRefillRule({
      totalCapacityKwh: batteryArrayConfig.totalCapacityKwh,
      sunniestMonthDailyYieldKwh: bestMonth?.totalDailyKwh ?? 0,
    })
    : null;
  const evaluationVerdict = chargeCurrentExceeded
    ? {
      headline: 'Battery bank exceeds the charge-current limit',
      tone: 'danger' as const,
      reasons: [
        `Estimated charge current ${formatAmps(estimatedChargeCurrentA)} exceeds the battery-array charge limit of ${formatAmps(batteryArrayConfig?.maxChargeCurrentA ?? 0)}.`,
        'Reduce upstream PV charging power or increase the battery-bank charge-current capability.',
      ],
    }
    : batteryRefillRule;
  const monthlyCapacityRows = MONTH_KEYS.map((month) => {
    const monthYield = projectMonthlySolarByMonth.get(month)?.average_daily_kwh ?? 0;
    return {
      month,
      averageDailyYieldKwh: monthYield,
      expectedConsumptionKwh: dailyConsumptionKwh,
      daysToCharge20To80: refillEnergyKwh != null && monthYield > 0
        ? Number((refillEnergyKwh / monthYield).toFixed(1))
        : null,
    };
  });

  useEffect(() => {
    setBatteryTitle(persistedDesign?.title ?? batteryBank?.name ?? '');
    setBatteryDescription(persistedDesign?.description ?? '');
    setBatteryImage(persistedDesign?.image_data_url ?? null);
    setBatteryNotes(persistedDesign?.notes ?? '');
  }, [persistedDesign?.title, persistedDesign?.description, persistedDesign?.image_data_url, persistedDesign?.notes, batteryBank?.name]);

  async function handleSaveBatteryDesign(options?: { imageOverride?: string | null }) {
    if (!selectedBatteryTypeId) {
      setBatteryDesignSaveError('Choose a battery type before saving the battery bank.');
      setBatteryDesignSaveMessage(null);
      return;
    }

    if (configuredBatteryCount < 1 || batteriesPerString < 1 || parallelStrings < 1) {
      setBatteryDesignSaveError('Battery count, batteries per string, and parallel strings must all be at least 1.');
      setBatteryDesignSaveMessage(null);
      return;
    }

    if (configuredBatteryCount !== batteriesPerString * parallelStrings) {
      setBatteryDesignSaveError('Battery count must equal batteries per string multiplied by parallel strings before saving.');
      setBatteryDesignSaveMessage(null);
      return;
    }

    const imageToPersist = options?.imageOverride === undefined ? batteryImage : options.imageOverride;

    setIsSavingBatteryDesign(true);
    setBatteryDesignSaveError(null);
    setBatteryDesignSaveMessage(null);

    try {
      const response = await fetch('/api/battery-bank-configuration', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: batteryTitle.trim(),
          description: batteryDescription.trim(),
          image_data_url: imageToPersist,
          notes: batteryNotes.trim(),
          selected_battery_type_id: selectedBatteryTypeId,
          configured_battery_count: configuredBatteryCount,
          batteries_per_string: batteriesPerString,
          parallel_strings: parallelStrings,
        }),
      });

      const payload = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? `Failed to save battery bank (${response.status})`);
      }

      try {
        window.localStorage.setItem(`${storagePrefix}:battery-type`, JSON.stringify(selectedBatteryTypeId));
        window.localStorage.setItem(`${storagePrefix}:battery-count`, JSON.stringify(configuredBatteryCount));
        window.localStorage.setItem(`${storagePrefix}:batteries-per-string`, JSON.stringify(batteriesPerString));
        window.localStorage.setItem(`${storagePrefix}:parallel-strings`, JSON.stringify(parallelStrings));
        window.dispatchEvent(new Event('offgridos-local-storage-change'));
      } catch {
        // Keep the save successful even if draft syncing fails.
      }

      setBatteryDesignSaveMessage('Battery bank saved to the project database.');
      await refreshProjectData();
    } catch (error) {
      setBatteryDesignSaveError(error instanceof Error ? error.message : 'Failed to save the battery bank.');
      setBatteryDesignSaveMessage(null);
    } finally {
      setIsSavingBatteryDesign(false);
    }
  }

  useEffect(() => {
    if (!batteriesPerStringOptions.includes(batteriesPerString)) {
      const fallbackBatteriesPerString = batteriesPerStringOptions[batteriesPerStringOptions.length - 1] ?? 1;
      setBatteriesPerString(fallbackBatteriesPerString);
      setParallelStrings(Math.max(1, configuredBatteryCount / fallbackBatteriesPerString));
      return;
    }

    const derivedParallelStrings = Math.max(1, configuredBatteryCount / batteriesPerString);
    if (parallelStrings !== derivedParallelStrings) {
      setParallelStrings(derivedParallelStrings);
    }
  }, [configuredBatteryCount, batteriesPerString, parallelStrings, batteriesPerStringOptions]);

  function handleBatteryImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const nextImage = loadEvent.target?.result as string;
      setBatteryImage(nextImage);
      void handleSaveBatteryDesign({ imageOverride: nextImage });
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      <div className="topbar">
        <h1 className="topbar-title">{data.project.name}</h1>
      </div>

      <section className="detail-shell">
        <div className="detail-grid detail-intro-grid">
          <section className="panel panel-with-actions">
            <div className="section-head">
              <h2>About</h2>
            </div>
            {batteryDesignSaveError ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--danger)' }}>{batteryDesignSaveError}</p> : null}
            <label className="config-field" style={{ display: 'block', marginBottom: 8 }}>
              <span>Title</span>
              <input type="text" value={batteryTitle} onChange={(event) => setBatteryTitle(event.target.value)} />
            </label>
            <label className="config-field" style={{ display: 'block' }}>
              <span>Description</span>
              <input type="text" value={batteryDescription} onChange={(event) => setBatteryDescription(event.target.value)} />
            </label>
            <div className="button-row button-row-end">
              <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveBatteryDesign()} disabled={isSavingBatteryDesign}>
                {isSavingBatteryDesign ? 'Saving...' : 'Save'}
              </button>
            </div>
          </section>

          <section className="panel panel-with-actions">
            <div className="section-head">
              <h2>Notes</h2>
            </div>
            <textarea
              className="field-textarea"
              value={batteryNotes}
              onChange={(event) => setBatteryNotes(event.target.value)}
              rows={5}
              placeholder="Add battery-bank notes, installation assumptions, room constraints, or maintenance context."
            />
            <div className="button-row button-row-end">
              <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveBatteryDesign()} disabled={isSavingBatteryDesign}>
                {isSavingBatteryDesign ? 'Saving...' : 'Save'}
              </button>
            </div>
          </section>

          <section className="panel panel-with-actions">
            <div className="section-head">
              <h2>Image</h2>
              <p>Battery location</p>
            </div>
            {batteryImage ? (
              <div className="photo-frame">
                <img src={batteryImage} alt={batteryTitle.trim() || 'Battery bank'} className="photo-image" />
                <button
                  type="button"
                  className="button button-secondary button-sm photo-remove"
                  onClick={() => {
                    setBatteryImage(null);
                    void handleSaveBatteryDesign({ imageOverride: null });
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="upload-dropzone">
                <span>Click to upload an image</span>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBatteryImageChange} />
              </label>
            )}
            <div className="button-row button-row-end">
              <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveBatteryDesign()} disabled={isSavingBatteryDesign}>
                {isSavingBatteryDesign ? 'Saving...' : 'Save'}
              </button>
            </div>
          </section>
        </div>

        <section className="detail-grid-2">
          <section className="panel panel-with-actions">
            <div className="section-head">
              <h2>Battery selection</h2>
              <p>Choose the preferred system voltage, battery type, and amount of batteries.</p>
            </div>
            <div className="config-grid config-control-row">
              <label className="config-field">
                <span>Preferred system voltage</span>
                <select
                  value={batteryArrayConfig?.stringVoltage ?? (batteryVoltageOptions[0]?.voltage ?? '')}
                  onChange={(event) => {
                    const nextVoltage = Number(event.target.value);
                    const match = batteryVoltageOptions.find((option) => option.voltage === nextVoltage);
                    if (!match) return;
                    setBatteriesPerString(match.batteriesPerString);
                    setParallelStrings(match.parallelStrings);
                  }}
                >
                  {batteryVoltageOptions.map((option) => (
                    <option key={`${option.voltage}-${option.batteriesPerString}-${option.parallelStrings}`} value={option.voltage}>
                      {formatVolts(option.voltage)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="config-field config-field-span-2">
                <span>Selected battery type</span>
                <select value={selectedBatteryTypeId} onChange={(event) => setSelectedBatteryTypeId(event.target.value)}>
                  {data.entities.battery_types.map((option) => (
                    <option key={option.battery_type_id} value={option.battery_type_id}>
                      {option.model}
                    </option>
                  ))}
                </select>
              </label>
              <label className="config-field">
                <span>Amount of batteries</span>
                <input
                  type="number"
                  min={1}
                  value={configuredBatteryCount}
                  onChange={(event) => setConfiguredBatteryCount(Math.max(1, Number(event.target.value) || 1))}
                />
              </label>
            </div>
            {selectedBatteryType ? (
              <dl className="detail-stats panel-spec-grid">
                <div>
                  <dt>Nominal voltage</dt>
                  <dd>{formatVolts(selectedBatteryType.nominal_voltage)}</dd>
                </div>
                <div>
                  <dt>Capacity</dt>
                  <dd>{formatKwh(selectedBatteryType.capacity_kwh)}</dd>
                </div>
                <div>
                  <dt>Ah</dt>
                  <dd>{selectedBatteryType.capacity_ah} Ah</dd>
                </div>
                <div>
                  <dt>Chemistry</dt>
                  <dd>{selectedBatteryType.chemistry}</dd>
                </div>
              </dl>
            ) : (
              <p className="fit-note">No battery type is available yet for this battery bank.</p>
            )}
            <div className="button-row button-row-end">
              <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveBatteryDesign()} disabled={isSavingBatteryDesign}>
                {isSavingBatteryDesign ? 'Saving...' : 'Save'}
              </button>
            </div>
          </section>

          <section className="panel panel-with-actions">
            <div className="section-head">
              <h2>Battery array</h2>
              <p>Choose the preferred batteries per string and preferred number of parallel strings.</p>
            </div>
            {selectedBatteryType ? (
              <>
                <div className="fit-card">
                  <div className="config-grid config-control-row">
                    <label className="config-field">
                      <span>Preferred batteries per string</span>
                      <select
                        value={batteriesPerString}
                        onChange={(event) => {
                          const nextBatteriesPerString = Math.max(1, Number(event.target.value) || 1);
                          setBatteriesPerString(nextBatteriesPerString);
                          setParallelStrings(Math.max(1, configuredBatteryCount / nextBatteriesPerString));
                        }}
                      >
                        {batteriesPerStringOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="config-field">
                      <span>Preferred number of parallel strings</span>
                      <select
                        value={parallelStrings}
                        onChange={(event) => {
                          const nextParallelStrings = Math.max(1, Number(event.target.value) || 1);
                          setParallelStrings(nextParallelStrings);
                          setBatteriesPerString(Math.max(1, configuredBatteryCount / nextParallelStrings));
                        }}
                      >
                        {parallelStringOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {batteryArrayConfig ? (
                    <>
                      <dl className="detail-stats compact-stats">
                        <div>
                          <dt>String voltage</dt>
                          <dd>{formatVolts(batteryArrayConfig.stringVoltage)}</dd>
                        </div>
                        <div>
                          <dt>String capacity</dt>
                          <dd>{formatKwh(batteryArrayConfig.stringCapacityKwh)}</dd>
                        </div>
                        <div>
                          <dt>Total capacity</dt>
                          <dd>{formatKwh(batteryArrayConfig.totalCapacityKwh)}</dd>
                        </div>
                        {batteryArrayConfig.maxChargeCurrentA != null ? (
                          <div>
                            <dt>Max charge current</dt>
                            <dd>{formatAmps(batteryArrayConfig.maxChargeCurrentA)}</dd>
                          </div>
                        ) : null}
                        {batteryArrayConfig.maxDischargeCurrentA != null ? (
                          <div>
                            <dt>Max discharge current</dt>
                            <dd>{formatAmps(batteryArrayConfig.maxDischargeCurrentA)}</dd>
                          </div>
                        ) : null}
                        {batteryArrayConfig.maxDischargePowerW != null ? (
                          <div>
                            <dt>Max discharge power</dt>
                            <dd>{formatKw(batteryArrayConfig.maxDischargePowerW)}</dd>
                          </div>
                        ) : null}
                      </dl>
                      {!batteryArrayConfig.usesConfiguredBatteriesExactly ? (
                        <p className="fit-note">
                          Batteries per string × parallel strings = {batteryArrayConfig.configuredBatteryCount}, but {configuredBatteryCount} batteries are assigned. Adjust to match exactly.
                        </p>
                      ) : null}
                    </>
                  ) : null}
                </div>
                <div className="button-row button-row-end">
                  <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveBatteryDesign()} disabled={isSavingBatteryDesign}>
                    {isSavingBatteryDesign ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </>
            ) : (
              <p className="fit-note">Choose a battery type before configuring the battery array.</p>
            )}
          </section>
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>Solar yield - Battery bank evaluation</h2>
            <p>Evaluation of the solar-yield and battery-bank combination.</p>
          </div>
          {batteryArrayConfig && evaluationVerdict ? (
            <div className="fit-card">
              <div className="fit-head">
                <div>
                  <strong>{evaluationVerdict.headline}</strong>
                </div>
                <span className={`status status-${evaluationVerdict.tone}`}>{evaluationVerdict.headline}</span>
              </div>
              <ul className="reason-list">
                {evaluationVerdict.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
                {batteryRefillRule && evaluationVerdict !== batteryRefillRule
                  ? batteryRefillRule.reasons.map((reason) => <li key={`refill-${reason}`}>{reason}</li>)
                  : null}
              </ul>
              <dl className="detail-stats outcome-checks">
                <div>
                  <dt>Best month</dt>
                  <dd>{bestMonth ? MONTH_LABELS[bestMonth.month] : 'n/a'}</dd>
                </div>
                <div>
                  <dt>Worst month</dt>
                  <dd>{worstMonth ? MONTH_LABELS[worstMonth.month] : 'n/a'}</dd>
                </div>
                <div>
                  <dt>Required recharge energy</dt>
                  <dd>{refillEnergyKwh != null ? formatKwh(refillEnergyKwh) : 'n/a'}</dd>
                </div>
                <div className={chargeCurrentExceeded ? 'check-fail' : 'check-pass'}>
                  <dt>Estimated charge current</dt>
                  <dd>{estimatedChargeCurrentA != null ? formatAmps(estimatedChargeCurrentA) : 'n/a'}</dd>
                </div>
                <div className={chargeCurrentExceeded ? 'check-fail' : 'check-pass'}>
                  <dt>Battery charge limit</dt>
                  <dd>{batteryArrayConfig.maxChargeCurrentA != null ? formatAmps(batteryArrayConfig.maxChargeCurrentA) : 'n/a'}</dd>
                </div>
                <div>
                  <dt>20% → 80% in best month</dt>
                  <dd>{daysToRefillBestMonth != null ? `${daysToRefillBestMonth} d` : 'n/a'}</dd>
                </div>
                <div>
                  <dt>20% → 80% in worst month</dt>
                  <dd>{daysToRefillWorstMonth != null ? `${daysToRefillWorstMonth} d` : 'n/a'}</dd>
                </div>
                <div>
                  <dt>Upstream PV input</dt>
                  <dd>{formatWp(totalUpstreamInputPowerW)}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="fit-note">Choose a battery type and configure the battery array before the evaluation can be calculated.</p>
          )}
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>Battery capacity</h2>
            <p>Battery-bank electrical details and monthly charge context across the year.</p>
          </div>
          <dl className="detail-stats compact-stats" style={{ marginBottom: 16 }}>
            <div>
              <dt>Total capacity</dt>
              <dd>{batteryArrayConfig ? formatKwh(batteryArrayConfig.totalCapacityKwh) : 'n/a'}</dd>
            </div>
            <div>
              <dt>Preferred system voltage</dt>
              <dd>{targetBatteryVoltage != null ? formatVolts(targetBatteryVoltage) : 'n/a'}</dd>
            </div>
            <div>
              <dt>Expected consumption / day</dt>
              <dd>{dailyConsumptionKwh != null ? formatDailyYield(dailyConsumptionKwh) : 'n/a'}</dd>
            </div>
            <div>
              <dt>Recharge energy 20% → 80%</dt>
              <dd>{refillEnergyKwh != null ? formatKwh(refillEnergyKwh) : 'n/a'}</dd>
            </div>
          </dl>
          <div className="yield-table-wrap">
            <table className="yield-table">
              <thead>
                <tr>
                  <th>Battery capacity</th>
                  {MONTH_KEYS.map((month) => (
                    <th key={month}>{MONTH_LABELS[month]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>Expected yield / day</th>
                  {monthlyCapacityRows.map((row) => (
                    <td key={`capacity-yield-${row.month}`}>{formatDailyYield(row.averageDailyYieldKwh)}</td>
                  ))}
                </tr>
                <tr>
                  <th>Expected consumption / day</th>
                  {monthlyCapacityRows.map((row) => (
                    <td key={`capacity-consumption-${row.month}`}>
                      {row.expectedConsumptionKwh != null ? formatDailyYield(row.expectedConsumptionKwh) : 'n/a'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th>Avg days to charge 20% → 80%</th>
                  {monthlyCapacityRows.map((row) => (
                    <td key={`capacity-charge-${row.month}`}>
                      {row.daysToCharge20To80 != null ? `${row.daysToCharge20To80} d` : 'n/a'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </>
  );
}

function InverterArrayPage({
  data,
  batteryBank,
  batteryBankState,
  refreshProjectData,
}: PageContext) {
  const batteryStoragePrefix = `${data.project.project_id}:battery-array`;
  const [selectedBatteryTypeId] = usePersistentState(
    `${batteryStoragePrefix}:battery-type`,
    batteryBank?.battery_type_id ?? data.entities.battery_types[0]?.battery_type_id ?? '',
  );
  const [configuredBatteryCount] = usePersistentState(
    `${batteryStoragePrefix}:battery-count`,
    Math.max(batteryBankState?.module_count ?? batteryBank?.module_count ?? 1, 1),
  );
  const [batteriesPerString] = usePersistentState(
    `${batteryStoragePrefix}:batteries-per-string`,
    Math.max(batteryBankState?.module_count ?? batteryBank?.module_count ?? 1, 1),
  );
  const [parallelStrings] = usePersistentState(
    `${batteryStoragePrefix}:parallel-strings`,
    1,
  );
  const currentBatteryType = selectedBatteryTypeId
    ? data.entities.battery_types.find((item) => item.battery_type_id === selectedBatteryTypeId) ?? null
    : null;
  const storagePrefix = `${data.project.project_id}:inverter-array`;
  const [selectedInverterTypeId, setSelectedInverterTypeId] = usePersistentState(
    `${storagePrefix}:inverter-type`,
    data.entities.inverter_configurations[0]?.selected_inverter_type_id ?? data.entities.inverter_types[0]?.inverter_id ?? '',
  );
  const persistedInverterConfig = data.entities.inverter_configurations[0] ?? null;
  const [inverterTitle, setInverterTitle] = useState(persistedInverterConfig?.title ?? '');
  const [inverterDescription, setInverterDescription] = useState(persistedInverterConfig?.description ?? '');
  const [inverterImage, setInverterImage] = useState<string | null>(persistedInverterConfig?.image_data_url ?? null);
  const [inverterNotes, setInverterNotes] = useState(persistedInverterConfig?.notes ?? '');
  const [isSavingInverterDesign, setIsSavingInverterDesign] = useState(false);
  const [inverterDesignSaveError, setInverterDesignSaveError] = useState<string | null>(null);

  const selectedInverterType = selectedInverterTypeId
    ? data.entities.inverter_types.find((item) => item.inverter_id === selectedInverterTypeId) ?? null
    : null;
  const batteryArrayConfig = currentBatteryType
    ? evaluateBatteryArrayConfiguration(
      currentBatteryType,
      Math.max(configuredBatteryCount, 1),
      Math.max(batteriesPerString, 1),
      Math.max(parallelStrings, 1),
    )
    : null;
  const inverterCompatibility = batteryArrayConfig
    ? evaluateInverterCompatibility(batteryArrayConfig, selectedInverterType)
    : null;
  async function handleSaveInverterDesign(options?: { imageOverride?: string | null }) {
    if (!selectedInverterTypeId) {
      setInverterDesignSaveError('Choose an inverter type before saving the inverter configuration.');
      return;
    }

    const imageToPersist = options?.imageOverride === undefined ? inverterImage : options.imageOverride;

    setIsSavingInverterDesign(true);
    setInverterDesignSaveError(null);

    try {
      const response = await fetch('/api/inverter-configuration', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_inverter_type_id: selectedInverterTypeId,
          title: inverterTitle.trim(),
          description: inverterDescription.trim(),
          image_data_url: imageToPersist,
          notes: inverterNotes.trim(),
        }),
      });

      const payload = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? `Failed to save inverter configuration (${response.status})`);
      }

      try {
        window.localStorage.setItem(`${storagePrefix}:inverter-type`, JSON.stringify(selectedInverterTypeId));
        window.dispatchEvent(new Event('offgridos-local-storage-change'));
      } catch {
        // Keep the save successful even if draft syncing fails.
      }

      await refreshProjectData();
    } catch (error) {
      setInverterDesignSaveError(error instanceof Error ? error.message : 'Failed to save inverter configuration.');
    } finally {
      setIsSavingInverterDesign(false);
    }
  }

  function handleInverterImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const nextImage = loadEvent.target?.result as string;
      setInverterImage(nextImage);
      void handleSaveInverterDesign({ imageOverride: nextImage });
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      <div className="topbar">
        <h1 className="topbar-title">{data.project.name}</h1>
      </div>

      <section className="detail-shell">
        <div className="detail-grid detail-intro-grid">
          <section className="panel panel-with-actions">
            <div className="section-head">
              <h2>About</h2>
            </div>
            {inverterDesignSaveError ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--danger)' }}>{inverterDesignSaveError}</p> : null}
            <label className="config-field" style={{ display: 'block', marginBottom: 8 }}>
              <span>Title</span>
              <input type="text" value={inverterTitle} onChange={(event) => setInverterTitle(event.target.value)} />
            </label>
            <label className="config-field" style={{ display: 'block' }}>
              <span>Description</span>
              <input type="text" value={inverterDescription} onChange={(event) => setInverterDescription(event.target.value)} />
            </label>
            <div className="button-row button-row-end">
              <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveInverterDesign()} disabled={isSavingInverterDesign}>
                {isSavingInverterDesign ? 'Saving...' : 'Save'}
              </button>
            </div>
          </section>

          <section className="panel panel-with-actions">
            <div className="section-head">
              <h2>Notes</h2>
            </div>
            <textarea
              className="field-textarea"
              value={inverterNotes}
              onChange={(event) => setInverterNotes(event.target.value)}
              rows={5}
              placeholder="Add inverter notes, installation assumptions, or maintenance context."
            />
            <div className="button-row button-row-end">
              <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveInverterDesign()} disabled={isSavingInverterDesign}>
                {isSavingInverterDesign ? 'Saving...' : 'Save'}
              </button>
            </div>
          </section>

          <section className="panel panel-with-actions">
            <div className="section-head">
              <h2>Image</h2>
              <p>Inverter location</p>
            </div>
            {inverterImage ? (
              <div className="photo-frame">
                <img src={inverterImage} alt={inverterTitle.trim() || 'Inverter'} className="photo-image" />
                <button
                  type="button"
                  className="button button-secondary button-sm photo-remove"
                  onClick={() => {
                    setInverterImage(null);
                    void handleSaveInverterDesign({ imageOverride: null });
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="upload-dropzone">
                <span>Click to upload an image</span>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleInverterImageChange} />
              </label>
            )}
            <div className="button-row button-row-end">
              <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveInverterDesign()} disabled={isSavingInverterDesign}>
                {isSavingInverterDesign ? 'Saving...' : 'Save'}
              </button>
            </div>
          </section>
        </div>

        <div className="detail-grid">
          <section className="panel panel-with-actions">
            <div className="section-head">
              <h2>Inverter selection</h2>
            </div>
            <label className="config-field">
              <span>Selected inverter</span>
              <select
                value={selectedInverterTypeId}
                onChange={(event) => setSelectedInverterTypeId(event.target.value)}
                disabled={data.entities.inverter_types.length === 0}
              >
                {data.entities.inverter_types.length === 0 ? <option value="">No inverter catalog available</option> : null}
                {data.entities.inverter_types.map((option) => (
                  <option key={option.inverter_id} value={option.inverter_id}>
                    {option.model}
                  </option>
                ))}
              </select>
            </label>
            {selectedInverterType ? (
              <dl className="detail-stats panel-spec-grid" style={{ marginTop: 16 }}>
                <div>
                  <dt>Input voltage</dt>
                  <dd>{formatVolts(selectedInverterType.input_voltage_v)}</dd>
                </div>
                <div>
                  <dt>Output voltage</dt>
                  <dd>{formatVolts(selectedInverterType.output_voltage_v)}</dd>
                </div>
                <div>
                  <dt>Continuous power</dt>
                  <dd>{formatKw(selectedInverterType.continuous_power_w)}</dd>
                </div>
                <div>
                  <dt>Peak power</dt>
                  <dd>{selectedInverterType.peak_power_va.toLocaleString('en-US')} VA</dd>
                </div>
                <div>
                  <dt>Max current</dt>
                  <dd>{formatAmps(selectedInverterType.max_charge_current_a)}</dd>
                </div>
              </dl>
            ) : null}
            {data.entities.inverter_types.length === 0 ? (
              <p className="fit-note">No inverter catalog entries are available yet.</p>
            ) : null}
            <div className="button-row button-row-end">
              <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveInverterDesign()} disabled={isSavingInverterDesign || data.entities.inverter_types.length === 0}>
                {isSavingInverterDesign ? 'Saving...' : 'Save'}
              </button>
            </div>
          </section>

          <section className="panel panel-span-2">
            <div className="section-head">
              <h2>Battery - Inverter evaluation</h2>
            </div>
            {batteryArrayConfig && selectedInverterType ? (
              <div className="fit-card">
                <div className="fit-head">
                  <strong>{selectedInverterType.model}</strong>
                  <StatusBadge status={inverterCompatibility?.status ?? 'outside_limits'} fit={inverterCompatibility?.fit} />
                </div>
                <ul className="reason-list">
                  {inverterCompatibility?.reasons.map((reason) => (
                    <li key={reason}>{reason.replaceAll('_', ' ')}</li>
                  )) ?? null}
                </ul>
                <dl className="detail-stats mppt-checks">
                  <div className={batteryArrayConfig.stringVoltage > selectedInverterType.input_voltage_v * 1.1 || batteryArrayConfig.stringVoltage < selectedInverterType.input_voltage_v * 0.85 ? 'check-fail' : 'check-pass'}>
                    <dt>Voltage check</dt>
                    <dd>{formatVolts(batteryArrayConfig.stringVoltage)} / {formatVolts(selectedInverterType.input_voltage_v)}</dd>
                  </div>
                  <div className={batteryArrayConfig.maxDischargeCurrentA != null && batteryArrayConfig.maxDischargeCurrentA > selectedInverterType.max_charge_current_a ? 'check-fail' : 'check-pass'}>
                    <dt>Current check</dt>
                    <dd>{batteryArrayConfig.maxDischargeCurrentA != null ? formatAmps(batteryArrayConfig.maxDischargeCurrentA) : 'n/a'} / {formatAmps(selectedInverterType.max_charge_current_a)}</dd>
                  </div>
                  <div className={batteryArrayConfig.maxDischargePowerW != null && batteryArrayConfig.maxDischargePowerW > selectedInverterType.continuous_power_w ? 'check-fail' : 'check-pass'}>
                    <dt>Power check</dt>
                    <dd>{batteryArrayConfig.maxDischargePowerW != null ? formatKw(batteryArrayConfig.maxDischargePowerW) : 'n/a'} / {formatKw(selectedInverterType.continuous_power_w)}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="fit-note">Choose a battery type and an inverter before the evaluation can be calculated.</p>
            )}
          </section>
        </div>
      </section>
    </>
  );
}

function BatteryCatalogPage({
  data,
  refreshProjectData,
}: {
  data: DigitalTwinExport;
  refreshProjectData: () => Promise<void>;
}) {
  const [selectedBatteryTypeId, setSelectedBatteryTypeId] = useState(() => data.entities.battery_types[0]?.battery_type_id ?? '');
  const [draft, setDraft] = useState<BatteryTypeDraft>(() => batteryDraftFromType(data.entities.battery_types[0] ?? null));
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedBattery = selectedBatteryTypeId
    ? data.entities.battery_types.find((item) => item.battery_type_id === selectedBatteryTypeId) ?? null
    : null;

  useEffect(() => {
    if (selectedBatteryTypeId) {
      const current = data.entities.battery_types.find((item) => item.battery_type_id === selectedBatteryTypeId) ?? null;
      setDraft(batteryDraftFromType(current));
    } else {
      setDraft(emptyBatteryDraft());
    }
  }, [data, selectedBatteryTypeId]);

  function startAddNew() {
    setSelectedBatteryTypeId('');
    setSaveError(null);
    setSaveMessage(null);
    setDraft(emptyBatteryDraft());
  }

  async function handleSave() {
    const model = draft.model.trim();
    const batteryTypeId = selectedBattery ? selectedBatteryTypeId : generateUniqueCatalogId(model, data.entities.battery_types.map((battery) => battery.battery_type_id));
    const chemistry = draft.chemistry.trim();
    const nominalVoltage = Number(draft.nominal_voltage);
    const capacityAh = Number(draft.capacity_ah);
    const capacityKwh = Number(draft.capacity_kwh);
    const maxChargeRate = draft.max_charge_rate.trim() === '' ? null : Number(draft.max_charge_rate);
    const maxDischargeRate = draft.max_discharge_rate.trim() === '' ? null : Number(draft.max_discharge_rate);
    const price = draft.price.trim() === '' ? null : Number(draft.price);
    const source = draft.source.trim() === '' ? null : draft.source.trim();
    const notes = draft.notes.trim() === '' ? null : draft.notes.trim();

    if (!model || !chemistry || !Number.isFinite(nominalVoltage) || nominalVoltage <= 0 || !Number.isFinite(capacityAh) || capacityAh <= 0 || !Number.isFinite(capacityKwh) || capacityKwh <= 0) {
      setSaveError('Fill in the model, chemistry, nominal voltage, capacity Ah, and capacity kWh.');
      return;
    }

    if ((maxChargeRate != null && !Number.isFinite(maxChargeRate)) || (maxDischargeRate != null && !Number.isFinite(maxDischargeRate)) || (price != null && !Number.isFinite(price))) {
      setSaveError('Optional numeric fields must be valid numbers when provided.');
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const isEdit = Boolean(selectedBattery);
      const response = await fetch(isEdit ? `/api/battery-types/${encodeURIComponent(selectedBatteryTypeId)}` : '/api/battery-types', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          battery_type_id: batteryTypeId,
          model,
          chemistry,
          nominal_voltage: nominalVoltage,
          capacity_ah: capacityAh,
          capacity_kwh: capacityKwh,
          max_charge_rate: maxChargeRate,
          max_discharge_rate: maxDischargeRate,
          victron_can: draft.victron_can,
          cooling: draft.cooling,
          price,
          source,
          notes,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to save battery type (${response.status})`);
      }

      await refreshProjectData();
      setSelectedBatteryTypeId(batteryTypeId);
      setDraft(batteryDraftFromType({
        battery_type_id: batteryTypeId,
        model,
        chemistry,
        nominal_voltage: nominalVoltage,
        capacity_ah: capacityAh,
        capacity_kwh: capacityKwh,
        max_charge_rate: maxChargeRate,
        max_discharge_rate: maxDischargeRate,
        victron_can: draft.victron_can,
        cooling: draft.cooling,
        price,
        price_per_kwh: null,
        source,
        url: source,
        notes,
      }));
      setSaveMessage(`Battery type "${batteryTypeId}" saved.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save battery type.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedBattery) return;

    const confirmed = window.confirm(`Delete battery type "${selectedBattery.battery_type_id}"?`);
    if (!confirmed) return;

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const response = await fetch(`/api/battery-types/${encodeURIComponent(selectedBattery.battery_type_id)}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to delete battery type (${response.status})`);
      }

      await refreshProjectData();
      const nextBattery = data.entities.battery_types.find((item) => item.battery_type_id !== selectedBattery.battery_type_id) ?? null;
      setSelectedBatteryTypeId(nextBattery?.battery_type_id ?? '');
      setDraft(batteryDraftFromType(nextBattery));
      setSaveMessage(`Battery type "${selectedBattery.battery_type_id}" deleted.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to delete battery type.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Configuration data</p>
          <h1>Battery catalog</h1>
          <p className="hero-copy">
            Edit the reusable battery catalog that the battery-array flow and export use for project configuration.
          </p>
        </div>
      </section>

      <section className="detail-grid">
        <section className="panel">
          <div className="section-head">
            <h2>Catalog entries</h2>
            <p>Select a battery type to edit, or create a new catalog entry.</p>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <button type="button" className="button button-secondary" onClick={startAddNew}>Add battery type</button>
            <div className="catalog-list">
              {data.entities.battery_types.map((battery) => (
                <div
                  key={battery.battery_type_id}
                  className={`catalog-card ${selectedBatteryTypeId === battery.battery_type_id ? 'active' : ''}`}
                >
                  <strong>{battery.model}</strong>
                  <span>{battery.battery_type_id}</span>
                  <span>{battery.capacity_kwh} kWh · {battery.nominal_voltage} V · {battery.cooling}</span>
                  <div className="button-row button-row-start">
                    <button
                      type="button"
                      className="button button-secondary button-sm"
                      onClick={() => {
                        setSelectedBatteryTypeId(battery.battery_type_id);
                        setSaveError(null);
                        setSaveMessage(null);
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>{selectedBattery ? 'Edit battery type' : 'Add battery type'}</h2>
            <p>Changes update the SQLite catalog and are available after refresh.</p>
          </div>
          <div className="stack" style={{ gap: 16 }}>
            <div className="field">
              <span>Battery type ID</span>
              <p className="muted">
                {selectedBattery ? selectedBattery.battery_type_id : (draft.model.trim() ? generateUniqueCatalogId(draft.model.trim(), data.entities.battery_types.map((battery) => battery.battery_type_id)) : 'Generated after save')}
              </p>
            </div>
            <label className="field">
              <span>Model</span>
              <input
                value={draft.model}
                onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))}
                placeholder="Pylontech US5000-1C"
              />
            </label>
            <div className="detail-grid two-col">
              <label className="field">
                <span>Chemistry</span>
                <input
                  value={draft.chemistry}
                  onChange={(event) => setDraft((current) => ({ ...current, chemistry: event.target.value }))}
                  placeholder="LiFePO4"
                />
              </label>
              <label className="field">
                <span>Cooling</span>
                <select
                  value={draft.cooling}
                  onChange={(event) => setDraft((current) => ({ ...current, cooling: event.target.value as 'active' | 'passive' }))}
                >
                  <option value="passive">passive</option>
                  <option value="active">active</option>
                </select>
              </label>
            </div>
            <div className="detail-grid two-col">
              <label className="field">
                <span>Nominal voltage</span>
                <input
                  type="number"
                  value={draft.nominal_voltage}
                  onChange={(event) => setDraft((current) => ({ ...current, nominal_voltage: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Capacity (kWh)</span>
                <input
                  type="number"
                  value={draft.capacity_kwh}
                  onChange={(event) => setDraft((current) => ({ ...current, capacity_kwh: event.target.value }))}
                />
              </label>
            </div>
            <div className="detail-grid two-col">
              <label className="field">
                <span>Capacity (Ah)</span>
                <input
                  type="number"
                  value={draft.capacity_ah}
                  onChange={(event) => setDraft((current) => ({ ...current, capacity_ah: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Victron CAN</span>
                <input
                  type="checkbox"
                  checked={draft.victron_can}
                  onChange={(event) => setDraft((current) => ({ ...current, victron_can: event.target.checked }))}
                />
              </label>
            </div>
            <div className="detail-grid two-col">
              <label className="field">
                <span>Max charge rate</span>
                <input
                  type="number"
                  value={draft.max_charge_rate}
                  onChange={(event) => setDraft((current) => ({ ...current, max_charge_rate: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Max discharge rate</span>
                <input
                  type="number"
                  value={draft.max_discharge_rate}
                  onChange={(event) => setDraft((current) => ({ ...current, max_discharge_rate: event.target.value }))}
                />
              </label>
            </div>
            <div className="detail-grid two-col">
              <label className="field">
                <span>Price</span>
                <input
                  type="number"
                  value={draft.price}
                  onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Source URL</span>
                <input
                  value={draft.source}
                  onChange={(event) => setDraft((current) => ({ ...current, source: event.target.value }))}
                  placeholder="https://..."
                />
              </label>
            </div>
            <label className="field">
              <span>Notes</span>
              <textarea
                value={draft.notes}
                onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                rows={4}
              />
            </label>
            <div className="stack" style={{ gap: 8 }}>
              <button type="button" className="button button-secondary" onClick={() => void handleSave()} disabled={isSaving || !draft.model.trim()}>
                {isSaving ? 'Saving…' : selectedBattery ? 'Save battery type' : 'Create battery type'}
              </button>
              {selectedBattery ? (
                <button type="button" className="button button-danger" onClick={() => void handleDelete()} disabled={isSaving}>
                  Delete battery type
                </button>
              ) : null}
              {saveError ? <p className="save-error">{saveError}</p> : null}
              {saveMessage ? <p className="save-message">{saveMessage}</p> : null}
            </div>
          </div>
          {selectedBattery ? (
            <dl className="detail-stats panel-spec-grid" style={{ marginTop: 16 }}>
              <div>
                <dt>Capacity</dt>
                <dd>{selectedBattery.capacity_kwh} kWh</dd>
              </div>
              <div>
                <dt>Voltage</dt>
                <dd>{selectedBattery.nominal_voltage} V</dd>
              </div>
              <div>
                <dt>Charge rate</dt>
                <dd>{selectedBattery.max_charge_rate != null ? `${selectedBattery.max_charge_rate} A` : 'n/a'}</dd>
              </div>
              <div>
                <dt>Discharge rate</dt>
                <dd>{selectedBattery.max_discharge_rate != null ? `${selectedBattery.max_discharge_rate} A` : 'n/a'}</dd>
              </div>
              <div>
                <dt>Price</dt>
                <dd>{selectedBattery.price != null ? `€${selectedBattery.price.toLocaleString('en-US')}` : 'n/a'}</dd>
              </div>
              <div>
                <dt>Price / kWh</dt>
                <dd>{selectedBattery.price_per_kwh != null ? `€${selectedBattery.price_per_kwh}` : 'n/a'}</dd>
              </div>
            </dl>
          ) : null}
        </section>
      </section>
    </>
  );
}

function CatalogsPage() {
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Configuration data</p>
          <h1>Catalogs</h1>
          <p className="hero-copy">
            Manage the reusable product catalogs used by the project configuration: panels, MPPTs, batteries, and inverters.
          </p>
        </div>
      </section>
      <section className="detail-grid two-col">
        {CATALOG_ROUTES.map((catalog) => (
          <section className="panel" key={catalog.catalog}>
            <div className="section-head">
              <h2>{catalog.label}</h2>
              <p>Open the CRUD screen for {catalog.label.toLowerCase()}.</p>
            </div>
            <div className="stack" style={{ gap: 12 }}>
              <button type="button" className="button button-secondary" onClick={() => navigateTo({ kind: 'catalog', catalog: catalog.catalog })}>
                Open {catalog.label}
              </button>
            </div>
          </section>
        ))}
      </section>
    </>
  );
}

function PanelCatalogPage({
  data,
  refreshProjectData,
}: {
  data: DigitalTwinExport;
  refreshProjectData: () => Promise<void>;
}) {
  const [selectedPanelTypeId, setSelectedPanelTypeId] = useState(() => data.entities.panel_types[0]?.panel_type_id ?? '');
  const [draft, setDraft] = useState<PanelTypeDraft>(() => panelDraftFromType(data.entities.panel_types[0] ?? null));
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedPanel = selectedPanelTypeId
    ? data.entities.panel_types.find((item) => item.panel_type_id === selectedPanelTypeId) ?? null
    : null;

  useEffect(() => {
    if (selectedPanelTypeId) {
      const current = data.entities.panel_types.find((item) => item.panel_type_id === selectedPanelTypeId) ?? null;
      setDraft(panelDraftFromType(current));
    } else {
      setDraft(emptyPanelDraft());
    }
  }, [data, selectedPanelTypeId]);

  function startAddNew() {
    setSelectedPanelTypeId('');
    setSaveError(null);
    setSaveMessage(null);
    setDraft(emptyPanelDraft());
  }

  async function handleSave() {
    const model = draft.model.trim();
    const panelTypeId = selectedPanel ? selectedPanelTypeId : generateUniqueCatalogId(model, data.entities.panel_types.map((panel) => panel.panel_type_id));
    const wp = Number(draft.wp);
    const voc = Number(draft.voc);
    const vmp = Number(draft.vmp);
    const isc = Number(draft.isc);
    const imp = Number(draft.imp);
    const lengthMm = Number(draft.length_mm);
    const widthMm = Number(draft.width_mm);
    const notes = draft.notes.trim() === '' ? null : draft.notes.trim();

    if (!model || !Number.isFinite(wp) || wp <= 0 || !Number.isFinite(voc) || voc <= 0 || !Number.isFinite(vmp) || vmp <= 0 || !Number.isFinite(isc) || isc <= 0 || !Number.isFinite(imp) || imp <= 0 || !Number.isFinite(lengthMm) || lengthMm <= 0 || !Number.isFinite(widthMm) || widthMm <= 0) {
      setSaveError('Fill in the model, WP, Voc, Vmp, Isc, Imp, length, and width.');
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const isEdit = Boolean(selectedPanel);
      const response = await fetch(isEdit ? `/api/panel-types/${encodeURIComponent(selectedPanelTypeId)}` : '/api/panel-types', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panel_type_id: panelTypeId,
          model,
          wp,
          voc,
          vmp,
          isc,
          imp,
          length_mm: lengthMm,
          width_mm: widthMm,
          notes,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to save panel type (${response.status})`);
      }

      await refreshProjectData();
      setSelectedPanelTypeId(panelTypeId);
      setDraft(panelDraftFromType({
        panel_type_id: panelTypeId,
        model,
        wp,
        voc,
        vmp,
        isc,
        imp,
        length_mm: lengthMm,
        width_mm: widthMm,
        notes,
      } as PanelType));
      setSaveMessage(`Panel type "${panelTypeId}" saved.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save panel type.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedPanel) return;

    const confirmed = window.confirm(`Delete panel type "${selectedPanel.panel_type_id}"?`);
    if (!confirmed) return;

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const response = await fetch(`/api/panel-types/${encodeURIComponent(selectedPanel.panel_type_id)}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to delete panel type (${response.status})`);
      }

      await refreshProjectData();
      const nextPanel = data.entities.panel_types.find((item) => item.panel_type_id !== selectedPanel.panel_type_id) ?? null;
      setSelectedPanelTypeId(nextPanel?.panel_type_id ?? '');
      setDraft(panelDraftFromType(nextPanel));
      setSaveMessage(`Panel type "${selectedPanel.panel_type_id}" deleted.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to delete panel type.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Configuration data</p>
          <h1>Panel types</h1>
          <p className="hero-copy">
            Edit the reusable panel catalog used by the surface configuration and export flow.
          </p>
        </div>
      </section>

      <section className="detail-grid">
        <section className="panel">
          <div className="section-head">
            <h2>Catalog entries</h2>
            <p>Select a panel type to edit, or create a new catalog entry.</p>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <button type="button" className="button button-secondary" onClick={startAddNew}>Add panel type</button>
            <div className="catalog-list">
              {data.entities.panel_types.map((panel) => (
                <div
                  key={panel.panel_type_id}
                  className={`catalog-card ${selectedPanelTypeId === panel.panel_type_id ? 'active' : ''}`}
                >
                  <strong>{panel.model}</strong>
                  <span>{panel.panel_type_id}</span>
                  <span>{panel.wp} Wp · {panel.voc} V</span>
                  <div className="button-row button-row-start">
                    <button
                      type="button"
                      className="button button-secondary button-sm"
                      onClick={() => {
                        setSelectedPanelTypeId(panel.panel_type_id);
                        setSaveError(null);
                        setSaveMessage(null);
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>{selectedPanel ? 'Edit panel type' : 'Add panel type'}</h2>
            <p>Changes update the SQLite catalog and are available after refresh.</p>
          </div>
          <div className="stack" style={{ gap: 16 }}>
            <div className="field">
              <span>Panel type ID</span>
              <p className="muted">
                {selectedPanel ? selectedPanel.panel_type_id : (draft.model.trim() ? generateUniqueCatalogId(draft.model.trim(), data.entities.panel_types.map((panel) => panel.panel_type_id)) : 'Generated after save')}
              </p>
            </div>
            <label className="field">
              <span>Model</span>
              <input
                value={draft.model}
                onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))}
                placeholder="AIKO 475 Wp All Black"
              />
            </label>
            <div className="detail-grid two-col">
              <label className="field"><span>Wp</span><input type="number" value={draft.wp} onChange={(event) => setDraft((current) => ({ ...current, wp: event.target.value }))} /></label>
              <label className="field"><span>Voc</span><input type="number" value={draft.voc} onChange={(event) => setDraft((current) => ({ ...current, voc: event.target.value }))} /></label>
            </div>
            <div className="detail-grid two-col">
              <label className="field"><span>Vmp</span><input type="number" value={draft.vmp} onChange={(event) => setDraft((current) => ({ ...current, vmp: event.target.value }))} /></label>
              <label className="field"><span>Isc</span><input type="number" value={draft.isc} onChange={(event) => setDraft((current) => ({ ...current, isc: event.target.value }))} /></label>
            </div>
            <div className="detail-grid two-col">
              <label className="field"><span>Imp</span><input type="number" value={draft.imp} onChange={(event) => setDraft((current) => ({ ...current, imp: event.target.value }))} /></label>
              <label className="field"><span>Length (mm)</span><input type="number" value={draft.length_mm} onChange={(event) => setDraft((current) => ({ ...current, length_mm: event.target.value }))} /></label>
            </div>
            <div className="detail-grid two-col">
              <label className="field"><span>Width (mm)</span><input type="number" value={draft.width_mm} onChange={(event) => setDraft((current) => ({ ...current, width_mm: event.target.value }))} /></label>
              <span />
            </div>
            <label className="field">
              <span>Notes</span>
              <textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} rows={4} />
            </label>
            <div className="stack" style={{ gap: 8 }}>
              <button type="button" className="button button-secondary" onClick={() => void handleSave()} disabled={isSaving || !draft.model.trim()}>
                {isSaving ? 'Saving…' : selectedPanel ? 'Save panel type' : 'Create panel type'}
              </button>
              {selectedPanel ? (
                <button type="button" className="button button-danger" onClick={() => void handleDelete()} disabled={isSaving}>
                  Delete panel type
                </button>
              ) : null}
              {saveError ? <p className="save-error">{saveError}</p> : null}
              {saveMessage ? <p className="save-message">{saveMessage}</p> : null}
            </div>
          </div>
          {selectedPanel ? (
            <dl className="detail-stats panel-spec-grid" style={{ marginTop: 16 }}>
              <div><dt>Power</dt><dd>{selectedPanel.wp} Wp</dd></div>
              <div><dt>Voc</dt><dd>{selectedPanel.voc} V</dd></div>
              <div><dt>Vmp</dt><dd>{selectedPanel.vmp} V</dd></div>
              <div><dt>Isc</dt><dd>{selectedPanel.isc} A</dd></div>
              <div><dt>Imp</dt><dd>{selectedPanel.imp} A</dd></div>
              <div><dt>Size</dt><dd>{selectedPanel.length_mm != null && selectedPanel.width_mm != null ? `${selectedPanel.length_mm} × ${selectedPanel.width_mm} mm` : 'n/a'}</dd></div>
            </dl>
          ) : null}
        </section>
      </section>
    </>
  );
}

function MpptCatalogPage({
  data,
  refreshProjectData,
}: {
  data: DigitalTwinExport;
  refreshProjectData: () => Promise<void>;
}) {
  const [selectedMpptTypeId, setSelectedMpptTypeId] = useState(() => data.entities.mppt_types[0]?.mppt_type_id ?? '');
  const [draft, setDraft] = useState<MpptTypeDraft>(() => mpptDraftFromType(data.entities.mppt_types[0] ?? null));
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedMppt = selectedMpptTypeId
    ? data.entities.mppt_types.find((item) => item.mppt_type_id === selectedMpptTypeId) ?? null
    : null;

  useEffect(() => {
    if (selectedMpptTypeId) {
      const current = data.entities.mppt_types.find((item) => item.mppt_type_id === selectedMpptTypeId) ?? null;
      setDraft(mpptDraftFromType(current));
    } else {
      setDraft(emptyMpptDraft());
    }
  }, [data, selectedMpptTypeId]);

  function startAddNew() {
    setSelectedMpptTypeId('');
    setSaveError(null);
    setSaveMessage(null);
    setDraft(emptyMpptDraft());
  }

  async function handleSave() {
    const model = draft.model.trim();
    const mpptTypeId = selectedMppt ? selectedMpptTypeId : generateUniqueCatalogId(model, data.entities.mppt_types.map((mppt) => mppt.mppt_type_id));
    const trackerCount = Number(draft.tracker_count);
    const maxVoc = Number(draft.max_voc);
    const maxPvPower = Number(draft.max_pv_power);
    const maxPvInputCurrentA = draft.max_pv_input_current_a.trim() === '' ? null : Number(draft.max_pv_input_current_a);
    const maxPvShortCircuitCurrentA = draft.max_pv_short_circuit_current_a.trim() === '' ? null : Number(draft.max_pv_short_circuit_current_a);
    const maxChargeCurrent = Number(draft.max_charge_current);
    const nominalBatteryVoltage = Number(draft.nominal_battery_voltage);
    const notes = draft.notes.trim() === '' ? null : draft.notes.trim();

    if (!model || !Number.isInteger(trackerCount) || trackerCount < 1 || !Number.isFinite(maxVoc) || maxVoc <= 0 || !Number.isFinite(maxPvPower) || maxPvPower <= 0 || !Number.isFinite(maxChargeCurrent) || maxChargeCurrent <= 0 || !Number.isFinite(nominalBatteryVoltage) || nominalBatteryVoltage <= 0) {
      setSaveError('Fill in the model, tracker count, max Voc, max PV power, max charge current, and nominal battery voltage.');
      return;
    }

    if ((maxPvInputCurrentA != null && !Number.isFinite(maxPvInputCurrentA)) || (maxPvShortCircuitCurrentA != null && !Number.isFinite(maxPvShortCircuitCurrentA))) {
      setSaveError('Optional PV current fields must be valid numbers when provided.');
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const isEdit = Boolean(selectedMppt);
      const response = await fetch(isEdit ? `/api/mppt-types/${encodeURIComponent(selectedMpptTypeId)}` : '/api/mppt-types', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mppt_type_id: mpptTypeId,
          model,
          tracker_count: trackerCount,
          max_voc: maxVoc,
          max_pv_power: maxPvPower,
          max_pv_input_current_a: maxPvInputCurrentA,
          max_pv_short_circuit_current_a: maxPvShortCircuitCurrentA,
          max_charge_current: maxChargeCurrent,
          nominal_battery_voltage: nominalBatteryVoltage,
          notes,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to save MPPT type (${response.status})`);
      }

      await refreshProjectData();
      setSelectedMpptTypeId(mpptTypeId);
      setDraft(mpptDraftFromType({
        mppt_type_id: mpptTypeId,
        model,
        tracker_count: trackerCount,
        max_voc: maxVoc,
        max_pv_power: maxPvPower,
        max_pv_input_current_a: maxPvInputCurrentA,
        max_pv_short_circuit_current_a: maxPvShortCircuitCurrentA,
        max_charge_current: maxChargeCurrent,
        nominal_battery_voltage: nominalBatteryVoltage,
        notes,
      } as MpptType));
      setSaveMessage(`MPPT type "${mpptTypeId}" saved.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save MPPT type.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedMppt) return;

    const confirmed = window.confirm(`Delete MPPT type "${selectedMppt.mppt_type_id}"?`);
    if (!confirmed) return;

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const response = await fetch(`/api/mppt-types/${encodeURIComponent(selectedMppt.mppt_type_id)}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to delete MPPT type (${response.status})`);
      }

      await refreshProjectData();
      const nextMppt = data.entities.mppt_types.find((item) => item.mppt_type_id !== selectedMppt.mppt_type_id) ?? null;
      setSelectedMpptTypeId(nextMppt?.mppt_type_id ?? '');
      setDraft(mpptDraftFromType(nextMppt));
      setSaveMessage(`MPPT type "${selectedMppt.mppt_type_id}" deleted.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to delete MPPT type.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Configuration data</p>
          <h1>MPPT types</h1>
          <p className="hero-copy">
            Edit the reusable MPPT catalog used by the surface configuration and charging checks.
          </p>
        </div>
      </section>

      <section className="detail-grid">
        <section className="panel">
          <div className="section-head">
            <h2>Catalog entries</h2>
            <p>Select an MPPT type to edit, or create a new catalog entry.</p>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <button type="button" className="button button-secondary" onClick={startAddNew}>Add MPPT type</button>
            <div className="catalog-list">
              {data.entities.mppt_types.map((mppt) => (
                <div
                  key={mppt.mppt_type_id}
                  className={`catalog-card ${selectedMpptTypeId === mppt.mppt_type_id ? 'active' : ''}`}
                >
                  <strong>{mppt.model}</strong>
                  <span>{mppt.mppt_type_id}</span>
                  <span>{mppt.tracker_count} trackers · {mppt.max_voc} V max</span>
                  <div className="button-row button-row-start">
                    <button
                      type="button"
                      className="button button-secondary button-sm"
                      onClick={() => {
                        setSelectedMpptTypeId(mppt.mppt_type_id);
                        setSaveError(null);
                        setSaveMessage(null);
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>{selectedMppt ? 'Edit MPPT type' : 'Add MPPT type'}</h2>
            <p>Changes update the SQLite catalog and are available after refresh.</p>
          </div>
          <div className="stack" style={{ gap: 16 }}>
            <div className="field">
              <span>MPPT type ID</span>
              <p className="muted">
                {selectedMppt ? selectedMppt.mppt_type_id : (draft.model.trim() ? generateUniqueCatalogId(draft.model.trim(), data.entities.mppt_types.map((mppt) => mppt.mppt_type_id)) : 'Generated after save')}
              </p>
            </div>
            <label className="field">
              <span>Model</span>
              <input
                value={draft.model}
                onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))}
                placeholder="Victron SmartSolar 250/100"
              />
            </label>
            <div className="detail-grid two-col">
              <label className="field"><span>Tracker count</span><input type="number" value={draft.tracker_count} onChange={(event) => setDraft((current) => ({ ...current, tracker_count: event.target.value }))} /></label>
              <label className="field"><span>Max Voc</span><input type="number" value={draft.max_voc} onChange={(event) => setDraft((current) => ({ ...current, max_voc: event.target.value }))} /></label>
            </div>
            <div className="detail-grid two-col">
              <label className="field"><span>Max PV power</span><input type="number" value={draft.max_pv_power} onChange={(event) => setDraft((current) => ({ ...current, max_pv_power: event.target.value }))} /></label>
              <label className="field"><span>Max charge current</span><input type="number" value={draft.max_charge_current} onChange={(event) => setDraft((current) => ({ ...current, max_charge_current: event.target.value }))} /></label>
            </div>
            <div className="detail-grid two-col">
              <label className="field"><span>Max PV input current</span><input type="number" value={draft.max_pv_input_current_a} onChange={(event) => setDraft((current) => ({ ...current, max_pv_input_current_a: event.target.value }))} /></label>
              <label className="field"><span>Max PV short-circuit current</span><input type="number" value={draft.max_pv_short_circuit_current_a} onChange={(event) => setDraft((current) => ({ ...current, max_pv_short_circuit_current_a: event.target.value }))} /></label>
            </div>
            <div className="detail-grid two-col">
              <label className="field"><span>Nominal battery voltage</span><input type="number" value={draft.nominal_battery_voltage} onChange={(event) => setDraft((current) => ({ ...current, nominal_battery_voltage: event.target.value }))} /></label>
              <span />
            </div>
            <label className="field">
              <span>Notes</span>
              <textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} rows={4} />
            </label>
            <div className="stack" style={{ gap: 8 }}>
              <button type="button" className="button button-secondary" onClick={() => void handleSave()} disabled={isSaving || !draft.model.trim()}>
                {isSaving ? 'Saving…' : selectedMppt ? 'Save MPPT type' : 'Create MPPT type'}
              </button>
              {selectedMppt ? (
                <button type="button" className="button button-danger" onClick={() => void handleDelete()} disabled={isSaving}>
                  Delete MPPT type
                </button>
              ) : null}
              {saveError ? <p className="save-error">{saveError}</p> : null}
              {saveMessage ? <p className="save-message">{saveMessage}</p> : null}
            </div>
          </div>
          {selectedMppt ? (
            <dl className="detail-stats panel-spec-grid" style={{ marginTop: 16 }}>
              <div><dt>Tracker count</dt><dd>{selectedMppt.tracker_count}</dd></div>
              <div><dt>Max Voc</dt><dd>{selectedMppt.max_voc} V</dd></div>
              <div><dt>Max PV power</dt><dd>{selectedMppt.max_pv_power} W</dd></div>
              <div><dt>Max charge current</dt><dd>{selectedMppt.max_charge_current} A</dd></div>
              <div><dt>Nominal battery voltage</dt><dd>{selectedMppt.nominal_battery_voltage} V</dd></div>
              <div><dt>PV input current</dt><dd>{selectedMppt.max_pv_input_current_a != null ? `${selectedMppt.max_pv_input_current_a} A` : 'n/a'}</dd></div>
            </dl>
          ) : null}
        </section>
      </section>
    </>
  );
}

function InverterCatalogPage({
  data,
  refreshProjectData,
}: {
  data: DigitalTwinExport;
  refreshProjectData: () => Promise<void>;
}) {
  const [selectedInverterTypeId, setSelectedInverterTypeId] = useState(() => data.entities.inverter_types[0]?.inverter_id ?? '');
  const [draft, setDraft] = useState<InverterTypeDraft>(() => inverterDraftFromType(data.entities.inverter_types[0] ?? null));
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedInverter = selectedInverterTypeId
    ? data.entities.inverter_types.find((item) => item.inverter_id === selectedInverterTypeId) ?? null
    : null;

  useEffect(() => {
    if (selectedInverterTypeId) {
      const current = data.entities.inverter_types.find((item) => item.inverter_id === selectedInverterTypeId) ?? null;
      setDraft(inverterDraftFromType(current));
    } else {
      setDraft(emptyInverterDraft());
    }
  }, [data, selectedInverterTypeId]);

  function startAddNew() {
    setSelectedInverterTypeId('');
    setSaveError(null);
    setSaveMessage(null);
    setDraft(emptyInverterDraft());
  }

  async function handleSave() {
    const model = draft.model.trim();
    const inverterId = selectedInverter ? selectedInverterTypeId : generateUniqueCatalogId(model, data.entities.inverter_types.map((inverter) => inverter.inverter_id));
    const inputVoltageV = Number(draft.input_voltage_v);
    const outputVoltageV = Number(draft.output_voltage_v);
    const continuousPowerW = Number(draft.continuous_power_w);
    const peakPowerVA = Number(draft.peak_power_va);
    const maxChargeCurrentA = Number(draft.max_charge_current_a);
    const efficiencyPct = draft.efficiency_pct.trim() === '' ? null : Number(draft.efficiency_pct);
    const price = draft.price.trim() === '' ? null : Number(draft.price);
    const notes = draft.notes.trim() === '' ? null : draft.notes.trim();

    if (!model || !Number.isFinite(inputVoltageV) || inputVoltageV <= 0 || !Number.isFinite(outputVoltageV) || outputVoltageV <= 0 || !Number.isFinite(continuousPowerW) || continuousPowerW <= 0 || !Number.isFinite(peakPowerVA) || peakPowerVA <= 0 || !Number.isFinite(maxChargeCurrentA) || maxChargeCurrentA <= 0) {
      setSaveError('Fill in the model, input voltage, output voltage, continuous power, peak power, and max charge current.');
      return;
    }

    if ((efficiencyPct != null && !Number.isFinite(efficiencyPct)) || (price != null && !Number.isFinite(price))) {
      setSaveError('Optional numeric fields must be valid numbers when provided.');
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const isEdit = Boolean(selectedInverter);
      const response = await fetch(isEdit ? `/api/inverter-types/${encodeURIComponent(selectedInverterTypeId)}` : '/api/inverter-types', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inverter_id: inverterId,
          model,
          input_voltage_v: inputVoltageV,
          output_voltage_v: outputVoltageV,
          continuous_power_w: continuousPowerW,
          peak_power_va: peakPowerVA,
          max_charge_current_a: maxChargeCurrentA,
          efficiency_pct: efficiencyPct,
          price,
          notes,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to save inverter type (${response.status})`);
      }

      await refreshProjectData();
      setSelectedInverterTypeId(inverterId);
      setDraft(inverterDraftFromType({
        inverter_id: inverterId,
        model,
        input_voltage_v: inputVoltageV,
        output_voltage_v: outputVoltageV,
        continuous_power_w: continuousPowerW,
        peak_power_va: peakPowerVA,
        max_charge_current_a: maxChargeCurrentA,
        efficiency_pct: efficiencyPct,
        price,
        notes,
      } as InverterType));
      setSaveMessage(`Inverter type "${inverterId}" saved.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save inverter type.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedInverter) return;

    const confirmed = window.confirm(`Delete inverter type "${selectedInverter.inverter_id}"?`);
    if (!confirmed) return;

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const response = await fetch(`/api/inverter-types/${encodeURIComponent(selectedInverter.inverter_id)}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to delete inverter type (${response.status})`);
      }

      await refreshProjectData();
      const nextInverter = data.entities.inverter_types.find((item) => item.inverter_id !== selectedInverter.inverter_id) ?? null;
      setSelectedInverterTypeId(nextInverter?.inverter_id ?? '');
      setDraft(inverterDraftFromType(nextInverter));
      setSaveMessage(`Inverter type "${selectedInverter.inverter_id}" deleted.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to delete inverter type.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Configuration data</p>
          <h1>Inverter types</h1>
          <p className="hero-copy">
            Edit the reusable inverter catalog used by the battery and inverter configuration flow.
          </p>
        </div>
      </section>

      <section className="detail-grid">
        <section className="panel">
          <div className="section-head">
            <h2>Catalog entries</h2>
            <p>Select an inverter type to edit, or create a new catalog entry.</p>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <button type="button" className="button button-secondary" onClick={startAddNew}>Add inverter type</button>
            <div className="catalog-list">
              {data.entities.inverter_types.map((inverter) => (
                <div
                  key={inverter.inverter_id}
                  className={`catalog-card ${selectedInverterTypeId === inverter.inverter_id ? 'active' : ''}`}
                >
                  <strong>{inverter.model}</strong>
                  <span>{inverter.inverter_id}</span>
                  <span>{inverter.input_voltage_v} V · {inverter.continuous_power_w} W</span>
                  <div className="button-row button-row-start">
                    <button
                      type="button"
                      className="button button-secondary button-sm"
                      onClick={() => {
                        setSelectedInverterTypeId(inverter.inverter_id);
                        setSaveError(null);
                        setSaveMessage(null);
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>{selectedInverter ? 'Edit inverter type' : 'Add inverter type'}</h2>
            <p>Changes update the SQLite catalog and are available after refresh.</p>
          </div>
          <div className="stack" style={{ gap: 16 }}>
            <div className="field">
              <span>Inverter ID</span>
              <p className="muted">
                {selectedInverter ? selectedInverter.inverter_id : (draft.model.trim() ? generateUniqueCatalogId(draft.model.trim(), data.entities.inverter_types.map((inverter) => inverter.inverter_id)) : 'Generated after save')}
              </p>
            </div>
            <label className="field">
              <span>Model</span>
              <input
                value={draft.model}
                onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))}
                placeholder="Victron MultiPlus-II 48/10000/140-100"
              />
            </label>
            <div className="detail-grid two-col">
              <label className="field"><span>Input voltage</span><input type="number" value={draft.input_voltage_v} onChange={(event) => setDraft((current) => ({ ...current, input_voltage_v: event.target.value }))} /></label>
              <label className="field"><span>Output voltage</span><input type="number" value={draft.output_voltage_v} onChange={(event) => setDraft((current) => ({ ...current, output_voltage_v: event.target.value }))} /></label>
            </div>
            <div className="detail-grid two-col">
              <label className="field"><span>Continuous power</span><input type="number" value={draft.continuous_power_w} onChange={(event) => setDraft((current) => ({ ...current, continuous_power_w: event.target.value }))} /></label>
              <label className="field"><span>Peak power</span><input type="number" value={draft.peak_power_va} onChange={(event) => setDraft((current) => ({ ...current, peak_power_va: event.target.value }))} /></label>
            </div>
            <div className="detail-grid two-col">
              <label className="field"><span>Max charge current</span><input type="number" value={draft.max_charge_current_a} onChange={(event) => setDraft((current) => ({ ...current, max_charge_current_a: event.target.value }))} /></label>
              <label className="field"><span>Efficiency %</span><input type="number" value={draft.efficiency_pct} onChange={(event) => setDraft((current) => ({ ...current, efficiency_pct: event.target.value }))} /></label>
            </div>
            <div className="detail-grid two-col">
              <label className="field"><span>Price</span><input type="number" value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} /></label>
              <span />
            </div>
            <label className="field">
              <span>Notes</span>
              <textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} rows={4} />
            </label>
            <div className="stack" style={{ gap: 8 }}>
              <button type="button" className="button button-secondary" onClick={() => void handleSave()} disabled={isSaving || !draft.model.trim()}>
                {isSaving ? 'Saving…' : selectedInverter ? 'Save inverter type' : 'Create inverter type'}
              </button>
              {selectedInverter ? (
                <button type="button" className="button button-danger" onClick={() => void handleDelete()} disabled={isSaving}>
                  Delete inverter type
                </button>
              ) : null}
              {saveError ? <p className="save-error">{saveError}</p> : null}
              {saveMessage ? <p className="save-message">{saveMessage}</p> : null}
            </div>
          </div>
          {selectedInverter ? (
            <dl className="detail-stats panel-spec-grid" style={{ marginTop: 16 }}>
              <div><dt>Input voltage</dt><dd>{selectedInverter.input_voltage_v} V</dd></div>
              <div><dt>Output voltage</dt><dd>{selectedInverter.output_voltage_v} V</dd></div>
              <div><dt>Continuous power</dt><dd>{selectedInverter.continuous_power_w} W</dd></div>
              <div><dt>Peak power</dt><dd>{selectedInverter.peak_power_va} VA</dd></div>
              <div><dt>Max current</dt><dd>{selectedInverter.max_charge_current_a} A</dd></div>
              <div><dt>Efficiency</dt><dd>{selectedInverter.efficiency_pct != null ? `${selectedInverter.efficiency_pct}%` : 'n/a'}</dd></div>
            </dl>
          ) : null}
        </section>
      </section>
    </>
  );
}

export function App() {
  const [data, setData] = useState<DigitalTwinExport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>(() => getRoute());
  useLocalStorageRevision();

  async function refreshProjectData(): Promise<void> {
    try {
      setError(null);
      const nextData = await fetchProjectData();
      setData(nextData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project data.');
    }
  }

  useEffect(() => {
    void refreshProjectData();
  }, []);

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (error) {
    return (
      <div className="layout">
        <Sidebar route={route} data={data} />
        <main className="app-shell">
          <section className="panel error-panel">
            <p>{error}</p>
            <p>Start the OffGridOS server and reload.</p>
          </section>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="layout">
        <Sidebar route={route} data={data} />
        <main className="app-shell">
          <section className="panel error-panel">
            <p>Loading project data...</p>
          </section>
        </main>
      </div>
    );
  }

  const weakestMonth = findWeakestMonth(data.derived.monthly_balance);
  const localSurfaceSummaries = buildLocalSurfaceSummaries(data);
  const localTotalInstalledWp = localSurfaceSummaries.reduce((total, surface) => total + surface.installed_wp, 0);
  const arrayStateBySurface = new Map(data.derived.array_states.map((state) => [state.surface_id, state]));
  const mpptByArray = new Map(data.entities.mppt_configurations.map((item) => [item.array_id, item]));
  const relationByArray = new Map(data.relationships.array_to_mppt.map((item) => [item.from_array_id, item]));
  const mpptToBatteryBankByMpptId = new Map(
    data.relationships.mppt_to_battery_bank.map((item) => [item.from_mppt_configuration_id, item]),
  );
  const arrayById = new Map((data.entities.pv_arrays ?? data.entities.arrays).map((item) => [item.array_id, item]));
  const mpptById = new Map(data.entities.mppt_configurations.map((item) => [item.mppt_configuration_id, item]));
  const batteryBank = data.entities.battery_banks[0] ?? null;
  const batteryBankState = batteryBank
    ? data.derived.battery_bank_states.find((item) => item.battery_bank_id === batteryBank.battery_bank_id) ?? null
    : null;
  const projectInverter = data.entities.inverter_configurations[0] ?? null;
  const batteryToInverter = projectInverter
    ? data.relationships.battery_bank_to_inverter.find((item) => item.to_inverter_configuration_id === projectInverter.inverter_configuration_id) ?? null
    : null;

  const context: PageContext = {
    data,
    route,
    weakestMonth,
    localSurfaceSummaries,
    localTotalInstalledWp,
    arrayStateBySurface,
    mpptByArray,
    relationByArray,
    mpptToBatteryBankByMpptId,
    arrayById,
    mpptById,
    batteryBank,
    batteryBankState,
    projectInverter,
    batteryToInverter,
    refreshProjectData,
  };

  if (route.kind === 'surface') {
    return (
      <div className="layout">
        <Sidebar route={route} data={data} />
        <main className="app-shell">
          <SurfaceDetail
            key={`surface:${route.surfaceId}`}
            data={data}
            surfaceId={route.surfaceId}
            refreshProjectData={refreshProjectData}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="layout">
      <Sidebar route={route} data={data} />
      <main className="app-shell">
        {route.kind === 'overview' ? (
          <OverviewPage {...context} />
        ) : route.kind === 'location' ? (
          <LocationPage {...context} />
        ) : route.kind === 'about' ? (
          <AboutPage />
        ) : route.kind === 'solar-yield' ? (
          <SolarYieldPage {...context} />
        ) : route.kind === 'catalogs' ? (
          <CatalogsPage />
        ) : route.kind === 'catalog' && route.catalog === 'panel-types' ? (
          <PanelCatalogPage data={data} refreshProjectData={refreshProjectData} />
        ) : route.kind === 'catalog' && route.catalog === 'mppt-types' ? (
          <MpptCatalogPage data={data} refreshProjectData={refreshProjectData} />
        ) : route.kind === 'catalog' && route.catalog === 'battery-types' ? (
          <BatteryCatalogPage data={data} refreshProjectData={refreshProjectData} />
        ) : route.kind === 'catalog' && route.catalog === 'inverter-types' ? (
          <InverterCatalogPage data={data} refreshProjectData={refreshProjectData} />
        ) : route.kind === 'battery-array' ? (
          <BatteryArrayPage {...context} />
        ) : route.kind === 'inverter-array' ? (
          <InverterArrayPage {...context} />
        ) : (
          <LocationPage {...context} />
        )}
      </main>
    </div>
  );
}
