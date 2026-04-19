import { useEffect, useState, type ChangeEvent, type MouseEvent } from 'react';

type Status = 'within_limits' | 'outside_limits';
type FitStatus = 'optimal' | 'acceptable' | 'clipping_expected' | 'underutilized';

interface RoofFace {
  roof_face_id: string;
  name: string;
  orientation_deg: number;
  tilt_deg: number;
}

interface ArrayState {
  array_id: string;
  installed_wp: number;
  roof_face_id: string;
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

interface RoofFaceConfiguration {
  roof_face_id: string;
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

interface BatteryBankConfiguration {
  battery_bank_id: string;
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
  roof_face_id: string;
  name: string;
  panel_assignment_ids: string[];
  panel_type_id?: string;
  panel_count: number;
}

interface MpptConfiguration {
  mppt_configuration_id: string;
  roof_face_id: string;
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
  roof_face_id: string;
  roof_face_name: string;
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
      country: string;
      place_name: string;
      northing?: number | null;
      easting?: number | null;
    } | null;
    preferences: {
      preferred_inverter_type_id?: string | null;
    };
  };
  entities: {
    roof_faces: RoofFace[];
    roof_face_configurations: RoofFaceConfiguration[];
    panel_types: PanelType[];
    battery_types: BatteryType[];
    battery_bank_configurations: BatteryBankConfiguration[];
    arrays: ArrayEntity[];
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
      roof_face_count: number;
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

function readStoredFaceLabel(projectId: string, roofFace: RoofFace): string {
  const stored = readPersistentState<string>(`${projectId}:roof-face:${roofFace.roof_face_id}:name`, roofFace.name);
  return stored.trim() || roofFace.name;
}

type LocalFaceSummary = {
  roof_face_id: string;
  name: string;
  orientation_deg: number;
  tilt_deg: number;
  array_name: string;
  panel_count: number;
  installed_wp: number;
  mppt_name: string;
  status: Status;
  fit?: FitStatus;
};

function getProjectStorageKey(data: DigitalTwinExport): string {
  return data.project.project_id ?? 'offgridos-project';
}

function buildLocalFaceSummaries(data: DigitalTwinExport): LocalFaceSummary[] {
  const projectId = getProjectStorageKey(data);
  const configurationByFaceId = new Map(data.entities.roof_face_configurations.map((configuration) => [configuration.roof_face_id, configuration]));

  return data.entities.roof_faces.map((roofFace) => {
    const array = data.entities.arrays.find((item) => item.roof_face_id === roofFace.roof_face_id);
    const arrayState = data.derived.array_states.find((item) => item.roof_face_id === roofFace.roof_face_id);
    const projectMppt = array ? data.entities.mppt_configurations.find((item) => item.array_id === array.array_id) : null;
    const relation = array ? data.relationships.array_to_mppt.find((item) => item.from_array_id === array.array_id) : null;
    const storagePrefix = `${projectId}:roof-face:${roofFace.roof_face_id}`;
    const persistedConfiguration = configurationByFaceId.get(roofFace.roof_face_id);
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
      persistedConfiguration?.selected_mppt_type_id ?? projectMppt?.mppt_type_id ?? data.entities.mppt_types[0]?.mppt_type_id ?? '',
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
    const mpptCompatibility = arrayConfig && arrayConfig.configuredPanelCount > 0
      ? evaluateMpptCompatibility(arrayConfig, selectedMpptType)
      : null;
    const localFaceName = readStoredFaceLabel(projectId, roofFace);

    return {
      roof_face_id: roofFace.roof_face_id,
      name: localFaceName,
      orientation_deg: readPersistentState<number>(`${storagePrefix}:azimuth`, roofFace.orientation_deg),
      tilt_deg: readPersistentState<number>(`${storagePrefix}:tilt`, roofFace.tilt_deg),
      array_name: localFaceName,
      panel_count: arrayConfig?.configuredPanelCount ?? Math.max(configuredPanelCount, 0),
      installed_wp: arrayConfig?.arrayPower ?? 0,
      mppt_name: selectedMpptType?.model ?? projectMppt?.name ?? 'Pending',
      status: mpptCompatibility?.status ?? relation?.evaluation.electrical_status ?? 'within_limits',
      fit: mpptCompatibility?.fit ?? relation?.evaluation.fit_status,
    };
  });
}

type Route =
  | { kind: 'overview' }
  | { kind: 'location' }
  | { kind: 'faces' }
  | { kind: 'battery-array' }
  | { kind: 'inverter-array' }
  | { kind: 'face'; roofFaceId: string };

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

function formatDailyYield(kwh: number): string {
  return kwh.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
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

function StatusBadge({ status, fit }: { status: Status; fit?: FitStatus }) {
  const tone = statusTone(status, fit);
  const text = status === 'outside_limits'
    ? 'Outside limits'
    : fit
      ? fit.replaceAll('_', ' ')
      : 'Electrical OK';
  return <span className={`status status-${tone}`}>{text}</span>;
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

  const requiredRefillKwh = Number((input.totalCapacityKwh * 0.8).toFixed(2));
  if (input.sunniestMonthDailyYieldKwh <= 0) {
    return {
      headline: 'No solar refill available',
      tone: 'danger',
      requiredRefillKwh,
      refillRatio: 0,
      reasons: ['The current configured faces do not produce usable daily solar yield in the best month estimate.'],
    };
  }

  const refillRatio = Number((input.sunniestMonthDailyYieldKwh / requiredRefillKwh).toFixed(2));
  const reasons: string[] = [
    `10% to 90% refill needs about ${requiredRefillKwh.toLocaleString('en-US', { maximumFractionDigits: 2 })} kWh.`,
    `Best-month daily solar is estimated at ${input.sunniestMonthDailyYieldKwh.toLocaleString('en-US', { maximumFractionDigits: 2 })} kWh/day.`,
  ];

  if (refillRatio < 0.9) {
    reasons.push('The battery array is too large to refill from 10% to 90% in one best-month day.');
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

  reasons.push('The battery array can be refilled from 10% to 90% in about one best-month day.');
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
  if (hash === '/location') {
    return { kind: 'location' };
  }
  if (hash === '/faces' || hash === '/panel-arrays' || hash === '/mppts') {
    return { kind: 'faces' };
  }
  if (hash === '/battery-array') {
    return { kind: 'battery-array' };
  }
  if (hash === '/inverter-array') {
    return { kind: 'inverter-array' };
  }
  if (hash.startsWith('/faces/')) {
    const roofFaceId = hash.slice('/faces/'.length);
    if (roofFaceId) return { kind: 'face', roofFaceId };
  }
  if (hash.startsWith('/panel-arrays/')) {
    const roofFaceId = hash.slice('/panel-arrays/'.length);
    if (roofFaceId) return { kind: 'face', roofFaceId };
  }
  if (hash.startsWith('/mppts/')) {
    const roofFaceId = hash.slice('/mppts/'.length);
    if (roofFaceId) return { kind: 'face', roofFaceId };
  }
  return { kind: 'overview' };
}

function navigateTo(route: Route): void {
  if (route.kind === 'overview') {
    window.location.hash = '/';
    return;
  }
  if (route.kind === 'location') {
    window.location.hash = '/location';
    return;
  }
  if (route.kind === 'faces') {
    window.location.hash = '/faces';
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
  window.location.hash = `/faces/${route.roofFaceId}`;
}

function routeHref(route: Route): string {
  if (route.kind === 'overview') return '#/';
  if (route.kind === 'location') return '#/location';
  if (route.kind === 'faces') return '#/faces';
  if (route.kind === 'battery-array') return '#/battery-array';
  if (route.kind === 'inverter-array') return '#/inverter-array';
  return `#/faces/${route.roofFaceId}`;
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
          Dashboard
        </a>
        <a href={routeHref({ kind: 'location' })} onClick={go({ kind: 'location' })} className={`sidebar-nav-item ${route.kind === 'location' ? 'active' : ''}`}>
          Location
        </a>
        <a href={routeHref({ kind: 'faces' })} onClick={go({ kind: 'faces' })} className={`sidebar-nav-item ${route.kind === 'faces' || route.kind === 'face' ? 'active' : ''}`}>
          Faces
        </a>
        {data ? (
          <div className="sidebar-subnav">
            {data.entities.roof_faces.map((roofFace) => (
              <a
                key={roofFace.roof_face_id}
                href={routeHref({ kind: 'face', roofFaceId: roofFace.roof_face_id })}
                onClick={go({ kind: 'face', roofFaceId: roofFace.roof_face_id })}
                className={`sidebar-subnav-item ${route.kind === 'face' && route.roofFaceId === roofFace.roof_face_id ? 'active' : ''}`}
              >
                {readStoredFaceLabel(data.project.project_id, roofFace)}
              </a>
            ))}
          </div>
        ) : null}
        <a href={routeHref({ kind: 'battery-array' })} onClick={go({ kind: 'battery-array' })} className={`sidebar-nav-item ${route.kind === 'battery-array' ? 'active' : ''}`}>
          Battery array
        </a>
        <a href={routeHref({ kind: 'inverter-array' })} onClick={go({ kind: 'inverter-array' })} className={`sidebar-nav-item ${route.kind === 'inverter-array' ? 'active' : ''}`}>
          Inverter array
        </a>
        <span className="sidebar-nav-item sidebar-nav-disabled">Loads</span>
        <span className="sidebar-nav-item sidebar-nav-disabled">Alerts</span>
      </nav>
      <div className="sidebar-footer">
        <span className="sidebar-footer-btn">New project</span>
      </div>
    </aside>
  );
}

function Breadcrumbs({ route, roofFaceName }: { route: Route; roofFaceName?: string }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <button type="button" className="crumb crumb-link" onClick={() => navigateTo({ kind: 'overview' })}>
        Overview
      </button>
      {route.kind === 'face' ? (
        <>
          <span className="crumb-sep">/</span>
          <span className="crumb">Faces</span>
          <span className="crumb-sep">/</span>
          <span className="crumb crumb-current">{roofFaceName ?? route.roofFaceId}</span>
        </>
      ) : null}
    </nav>
  );
}

function RoofFaceDetail({
  data,
  roofFaceId,
  refreshProjectData,
}: {
  data: DigitalTwinExport;
  roofFaceId: string;
  refreshProjectData: () => Promise<void>;
}) {
  const roofFace = data.entities.roof_faces.find((item) => item.roof_face_id === roofFaceId);
  const persistedConfiguration = data.entities.roof_face_configurations.find((item) => item.roof_face_id === roofFaceId) ?? null;
  const array = data.entities.arrays.find((item) => item.roof_face_id === roofFaceId);
  const arrayState = data.derived.array_states.find((item) => item.roof_face_id === roofFaceId);
    const projectMppt = array ? data.entities.mppt_configurations.find((item) => item.array_id === array.array_id) : null;
  const relation = array ? data.relationships.array_to_mppt.find((item) => item.from_array_id === array.array_id) : null;
  const mpptType = projectMppt?.mppt_type_id
    ? data.entities.mppt_types.find((item) => item.mppt_type_id === projectMppt.mppt_type_id) ?? null
    : null;
  const installedPanelCount = arrayState?.panel_count ?? array?.panel_count ?? 0;
  const storagePrefix = `${data.project.project_id}:roof-face:${roofFaceId}`;
  const [roofNameDraft, setRoofNameDraft] = usePersistentState(`${storagePrefix}:name`, roofFace.name);
  const [roofAzimuthDraft, setRoofAzimuthDraft] = usePersistentState(`${storagePrefix}:azimuth`, roofFace.orientation_deg);
  const [roofTiltDraft, setRoofTiltDraft] = usePersistentState(`${storagePrefix}:tilt`, roofFace.tilt_deg);
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
    persistedConfiguration?.selected_mppt_type_id ?? projectMppt?.mppt_type_id ?? data.entities.mppt_types[0]?.mppt_type_id ?? '',
  );
  const [isSavingFace, setIsSavingFace] = useState(false);
  const [faceSaveMessage, setFaceSaveMessage] = useState<string | null>(null);
  const [faceSaveError, setFaceSaveError] = useState<string | null>(null);
  const [isSavingPanels, setIsSavingPanels] = useState(false);
  const [panelSaveMessage, setPanelSaveMessage] = useState<string | null>(null);
  const [panelSaveError, setPanelSaveError] = useState<string | null>(null);
  const [isSavingFaceDesign, setIsSavingFaceDesign] = useState(false);
  const [faceDesignSaveMessage, setFaceDesignSaveMessage] = useState<string | null>(null);
  const [faceDesignSaveError, setFaceDesignSaveError] = useState<string | null>(null);
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

  if (!roofFace || !array) {
    return (
      <section className="panel error-panel">
        <Breadcrumbs route={{ kind: 'face', roofFaceId }} roofFaceName={roofFaceId} />
        <h1>Roof face not found</h1>
        <p>No roof-face detail is available for `{roofFaceId}` in the current export.</p>
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
  const liveArrayName = (roofNameDraft || roofFace.name).trim() || array.name;
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
    azimuthDeg: roofAzimuthDraft,
    tiltDeg: roofTiltDraft,
    latitudeDeg: effectiveLatitude,
  });

  async function handleSaveFaceDetails() {
    const trimmedName = roofNameDraft.trim();

    if (!trimmedName) {
      setFaceSaveError('Roof face name is required before saving.');
      setFaceSaveMessage(null);
      return;
    }

    setIsSavingFace(true);
    setFaceSaveError(null);
    setFaceSaveMessage(null);

    try {
      const response = await fetch(`/api/roof-faces/${encodeURIComponent(roofFaceId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          orientation_deg: roofAzimuthDraft,
          tilt_deg: roofTiltDraft,
        }),
      });

      const payload = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? `Failed to save face (${response.status})`);
      }

      try {
        window.localStorage.setItem(`${storagePrefix}:name`, JSON.stringify(trimmedName));
        window.localStorage.setItem(`${storagePrefix}:azimuth`, JSON.stringify(roofAzimuthDraft));
        window.localStorage.setItem(`${storagePrefix}:tilt`, JSON.stringify(roofTiltDraft));
        window.dispatchEvent(new Event('offgridos-local-storage-change'));
      } catch {
        // Keep the save successful even if local draft syncing fails.
      }

      setFaceSaveMessage('Face details saved to the project database.');
      await refreshProjectData();
    } catch (error) {
      setFaceSaveError(error instanceof Error ? error.message : 'Failed to save face details.');
      setFaceSaveMessage(null);
    } finally {
      setIsSavingFace(false);
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
      const response = await fetch(`/api/roof-panels/${encodeURIComponent(roofFaceId)}`, {
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
          : 'Panels removed from this face in the project database.',
      );
      await refreshProjectData();
    } catch (error) {
      setPanelSaveError(error instanceof Error ? error.message : 'Failed to save panel setup.');
      setPanelSaveMessage(null);
    } finally {
      setIsSavingPanels(false);
    }
  }

  async function handleSaveFaceDesign() {
    if (configuredPanelCount === 0) {
      if (panelsPerString !== 0 || parallelStrings !== 0) {
        setFaceDesignSaveError('Faces with 0 panels must also use 0 panels per string and 0 parallel strings.');
        setFaceDesignSaveMessage(null);
        return;
      }
    } else if (panelsPerString <= 0 || parallelStrings <= 0 || panelsPerString * parallelStrings !== configuredPanelCount) {
      setFaceDesignSaveError('Panels per string multiplied by parallel strings must match the configured panel count before saving.');
      setFaceDesignSaveMessage(null);
      return;
    }

    setIsSavingFaceDesign(true);
    setFaceDesignSaveError(null);
    setFaceDesignSaveMessage(null);

    try {
      const response = await fetch(`/api/roof-face-configurations/${encodeURIComponent(roofFaceId)}`, {
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
        throw new Error(payload.error ?? `Failed to save face configuration (${response.status})`);
      }

      try {
        window.localStorage.setItem(`${storagePrefix}:panels-per-string`, JSON.stringify(panelsPerString));
        window.localStorage.setItem(`${storagePrefix}:parallel-strings`, JSON.stringify(parallelStrings));
        window.localStorage.setItem(`${storagePrefix}:mppt-type`, JSON.stringify(selectedMpptTypeId));
        window.dispatchEvent(new Event('offgridos-local-storage-change'));
      } catch {
        // Keep the save successful even if local draft syncing fails.
      }

      setFaceDesignSaveMessage('String layout and MPPT choice saved to the project database.');
      await refreshProjectData();
    } catch (error) {
      setFaceDesignSaveError(error instanceof Error ? error.message : 'Failed to save face configuration.');
      setFaceDesignSaveMessage(null);
    } finally {
      setIsSavingFaceDesign(false);
    }
  }

  return (
    <section className="detail-shell">
      <section className="panel detail-hero">
        <Breadcrumbs route={{ kind: 'face', roofFaceId }} roofFaceName={roofNameDraft || roofFace.name} />
        <div className="detail-hero-grid">
          <div>
            <div className="eyebrow">Face</div>
            <h1>{roofNameDraft || roofFace.name}</h1>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.86rem' }}>
                Face name, azimuth, and tilt now save to SQLite. Panel configuration, panel type, and MPPT configuration still stay local for now.
              </p>
              <button type="button" className="cta-button" onClick={() => void handleSaveFaceDetails()} disabled={isSavingFace}>
                {isSavingFace ? 'Saving...' : 'Save face configuration'}
              </button>
            </div>
            {faceSaveError ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--danger)' }}>{faceSaveError}</p> : null}
            {faceSaveMessage ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--accent-strong)' }}>{faceSaveMessage}</p> : null}
            <div className="roof-config-inline">
              <label className="config-field">
                <span>Roof face name</span>
                <input
                  type="text"
                  value={roofNameDraft}
                  onChange={(event) => setRoofNameDraft(event.target.value)}
                />
              </label>
              <label className="config-field">
                <span>Azimuth</span>
                <input
                  type="number"
                  min={0}
                  max={360}
                  step={1}
                  value={roofAzimuthDraft}
                  onChange={(event) => setRoofAzimuthDraft(Math.max(0, Math.min(360, Number(event.target.value) || 0)))}
                />
              </label>
              <label className="config-field">
                <span>Tilt</span>
                <input
                  type="number"
                  min={0}
                  max={90}
                  step={1}
                  value={roofTiltDraft}
                  onChange={(event) => setRoofTiltDraft(Math.max(0, Math.min(90, Number(event.target.value) || 0)))}
                />
              </label>
            </div>
            <p className="roof-config-note">
              Northing/easting coordinates inherit from the shared location and are configured on the Location page.
            </p>
          </div>
          <div className="hero-grid">
            <SummaryCard label="Array" value={liveArrayName} />
            <SummaryCard label="Configured PV" value={formatWp(liveInstalledWp)} />
            <SummaryCard label="Panel count" value={String(livePanelCount)} />
            <SummaryCard label="Selected MPPT" value={selectedMpptType?.model ?? projectMppt?.name ?? 'Pending'} detail="Currently provisional" />
          </div>
        </div>
      </section>

      <section className="detail-grid storage-detail-grid">
        <section className="panel">
          <div className="section-head">
            <h2>Panel configuration</h2>
          </div>
          <div className="panel-selector">
            <label className="config-field">
              <span>Configured panel</span>
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
          ) : null}
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>Array configuration</h2>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.86rem' }}>
              Selected panel type and panel count now save to SQLite. String layout still stays local for now.
            </p>
            <button type="button" className="cta-button" onClick={() => void handleSavePanelSetup()} disabled={isSavingPanels}>
              {isSavingPanels ? 'Saving...' : 'Save panel configuration'}
            </button>
          </div>
          {panelSaveError ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--danger)' }}>{panelSaveError}</p> : null}
          {panelSaveMessage ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--accent-strong)' }}>{panelSaveMessage}</p> : null}
          <dl className="detail-stats">
            <div>
              <dt>Array ID</dt>
              <dd>{array.array_id}</dd>
            </div>
            <div>
              <dt>Installed Wp</dt>
              <dd>{formatWp(liveInstalledWp)}</dd>
            </div>
          </dl>
          {panelType ? (
            <div className="fit-card">
              <div className="config-grid">
                <label className="config-field">
                  <span>Panel count</span>
                  <input
                    type="number"
                    min={0}
                    value={configuredPanelCount}
                    onChange={(event) => setConfiguredPanelCount(Math.max(0, Number(event.target.value) || 0))}
                  />
                </label>
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

              {arrayConfig ? (
                <>
                  <div className="fit-head">
                    <div>
                      <p>
                        {arrayConfig.configuredPanelCount} panel(s) used from {configuredPanelCount} currently assigned in this local scenario
                      </p>
                    </div>
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
                  {arrayConfig.configuredPanelCount === 0 ? (
                    <p className="fit-note">
                      This face is currently discounted. No panels are assigned in the local scenario.
                    </p>
                  ) : !arrayConfig.usesConfiguredPanelsExactly ? (
                    <p className="fit-note">
                      Panels per string × parallel strings = {arrayConfig.configuredPanelCount}, but {configuredPanelCount} are assigned. Adjust to match exactly.
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : (
            <p>No panel type is available yet for this roof face.</p>
          )}
        </section>

        {arrayConfig?.configuredPanelCount ? (
          <section className="panel">
            <div className="section-head">
            <h2>MPPT configuration and fit</h2>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.86rem' }}>
                String layout and selected MPPT now save to SQLite and feed the server-backed face evaluation.
              </p>
              <button type="button" className="cta-button" onClick={() => void handleSaveFaceDesign()} disabled={isSavingFaceDesign}>
                {isSavingFaceDesign ? 'Saving...' : 'Save face configuration'}
              </button>
            </div>
            {faceDesignSaveError ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--danger)' }}>{faceDesignSaveError}</p> : null}
            {faceDesignSaveMessage ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--accent-strong)' }}>{faceDesignSaveMessage}</p> : null}
            <label className="config-field">
              <span>Configured MPPT</span>
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
                  <dt>PV input current / tracker</dt>
                  <dd>{selectedMpptType.max_pv_input_current_a != null ? formatAmps(selectedMpptType.max_pv_input_current_a) : 'n/a'}</dd>
                </div>
                <div>
                  <dt>PV short-circuit current / tracker</dt>
                  <dd>{selectedMpptType.max_pv_short_circuit_current_a != null ? formatAmps(selectedMpptType.max_pv_short_circuit_current_a) : 'n/a'}</dd>
                </div>
                <div>
                  <dt>Max charge current</dt>
                  <dd>{formatAmps(selectedMpptType.max_charge_current)}</dd>
                </div>
              </dl>
            ) : null}
            {selectedMpptTypeId !== (projectMppt?.mppt_type_id ?? '') ? (
              <p className="fit-note">Local comparison — export keeps the original provisional MPPT configuration until persisted.</p>
            ) : null}
            <div className="mppt-panel-right">
              <div className="mppt-result-head">
                <div>
                  <strong>{selectedMpptType?.model ?? 'No MPPT selected'}</strong>
                  <p className="mppt-result-sub">{projectMppt?.name ?? 'Provisional'}</p>
                </div>
                <StatusBadge status={mpptCompatibility?.status ?? 'outside_limits'} fit={mpptCompatibility?.fit} />
              </div>
              {mpptCompatibility && selectedMpptType ? (
                <dl className="detail-stats mppt-checks">
                  <div className={arrayConfig.stringVoc > selectedMpptType.max_voc ? 'check-fail' : 'check-pass'}>
                    <dt>Voltage check</dt>
                    <dd>{formatVolts(arrayConfig.stringVoc)} / {formatVolts(selectedMpptType.max_voc)}</dd>
                  </div>
                  <div className={selectedMpptType.max_pv_input_current_a != null && arrayConfig.arrayCurrent > selectedMpptType.max_pv_input_current_a ? 'check-fail' : 'check-pass'}>
                    <dt>PV input current / tracker</dt>
                    <dd>{formatAmps(arrayConfig.arrayCurrent)} / {selectedMpptType.max_pv_input_current_a != null ? formatAmps(selectedMpptType.max_pv_input_current_a) : 'n/a'}</dd>
                  </div>
                  <div className={selectedMpptType.max_pv_short_circuit_current_a != null && arrayConfig.arrayIsc > selectedMpptType.max_pv_short_circuit_current_a ? 'check-fail' : 'check-pass'}>
                    <dt>PV short-circuit current / tracker</dt>
                    <dd>{formatAmps(arrayConfig.arrayIsc)} / {selectedMpptType.max_pv_short_circuit_current_a != null ? formatAmps(selectedMpptType.max_pv_short_circuit_current_a) : 'n/a'}</dd>
                  </div>
                  <div className={arrayConfig.arrayPower > selectedMpptType.max_pv_power / Math.max(selectedMpptType.tracker_count, 1) * 1.1 ? 'check-fail' : 'check-pass'}>
                    <dt>Power check / tracker</dt>
                    <dd>{formatWp(arrayConfig.arrayPower)} / {formatWp(selectedMpptType.max_pv_power / Math.max(selectedMpptType.tracker_count, 1))}</dd>
                  </div>
                  <div>
                    <dt>Battery charge current</dt>
                    <dd>{formatAmps(mpptCompatibility.chargeCurrent)}</dd>
                  </div>
                </dl>
              ) : null}
              <ul className="reason-list">
                {mpptCompatibility?.reasons.map((reason) => (
                  <li key={reason}>{reason.replaceAll('_', ' ')}</li>
                )) ?? null}
              </ul>
            </div>
          </section>
        ) : (
          <section className="panel">
            <div className="section-head">
            <h2>MPPT configuration and fit</h2>
            </div>
            <p className="fit-note">
              No MPPT judgment for this face right now because the local panel count is `0`.
            </p>
          </section>
        )}
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
  localFaceSummaries: LocalFaceSummary[];
  localTotalInstalledWp: number;
  arrayStateByRoofFace: Map<string, ArrayState>;
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
  localFaceSummaries,
  localTotalInstalledWp,
  arrayStateByRoofFace,
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
        <span className="topbar-meta">
          {data.project.location
            ? `${data.project.location.place_name}, ${data.project.location.country}`
            : 'Location not set'}
        </span>
      </div>

      <header className="hero panel">
        <div className="hero-strip">
          <SummaryCard label="Installed PV" value={formatWp(localTotalInstalledWp)} />
          <SummaryCard label="Faces" value={String(localFaceSummaries.length)} />
          <SummaryCard label="Arrays" value={String(localFaceSummaries.length)} />
          <SummaryCard label="MPPTs" value={String(localFaceSummaries.length)} />
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
            <div className="chain-node-label">Faces</div>
            <div className="chain-node-metric">{localFaceSummaries.length}</div>
          </div>
          <div className="chain-arrow">→</div>
          <div className="chain-node">
            <div className="chain-node-label">Arrays</div>
            <div className="chain-node-metric">{localFaceSummaries.length}</div>
          </div>
          <div className="chain-arrow">→</div>
          <div className="chain-node">
            <div className="chain-node-label">MPPTs</div>
            <div className="chain-node-metric">{localFaceSummaries.length}</div>
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
        <section className="panel">
          <div className="section-head">
          <h2>Faces</h2>
          </div>
          <div className="roof-grid">
            {localFaceSummaries.map((face) => {
              return (
                <button
                  key={face.roof_face_id}
                  type="button"
                  className="roof-card roof-card-button"
                  onClick={() => navigateTo({ kind: 'face', roofFaceId: face.roof_face_id })}
                >
                  <div className="roof-card-top">
                    <div>
                      <h3>{face.name}</h3>
                      <p>{face.orientation_deg}° · {face.tilt_deg}° tilt</p>
                    </div>
                    <StatusBadge status={face.status} fit={face.fit} />
                  </div>
                  <dl className="mini-stats">
                    <div>
                      <dt>Array</dt>
                      <dd>{face.array_name}</dd>
                    </div>
                    <div>
                      <dt>Panels</dt>
                      <dd>{face.panel_count}</dd>
                    </div>
                    <div>
                      <dt>Installed</dt>
                      <dd>{formatWp(face.installed_wp)}</dd>
                    </div>
                    <div>
                      <dt>MPPT</dt>
                      <dd>{face.mppt_name}</dd>
                    </div>
                  </dl>
                </button>
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
          <p>Summed average daily and monthly solar output across all roof-face configurations.</p>
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

const OBJECT_TYPES = [
  'Residential',
  'Commercial',
  'Industrial',
  'Agricultural',
  'Public / Municipal',
  'Other',
];

function LocationPage({ data, localFaceSummaries, refreshProjectData }: PageContext) {
  const storagePrefix = `${data.project.project_id}:location`;
  const [address, setAddress] = usePersistentState(`${storagePrefix}:address`, data.project.location?.place_name ?? '');
  const [country, setCountry] = usePersistentState(`${storagePrefix}:country`, data.project.location?.country ?? '');
  const [latitude, setLatitude] = usePersistentState(
    `${storagePrefix}:latitude`,
    data.project.location?.latitude != null ? String(data.project.location.latitude) : '',
  );
  const [longitude, setLongitude] = usePersistentState(
    `${storagePrefix}:longitude`,
    data.project.location?.longitude != null ? String(data.project.location.longitude) : '',
  );
  const [northing, setNorthing] = usePersistentState(
    `${storagePrefix}:northing`,
    data.project.location?.northing != null ? String(data.project.location.northing) : '',
  );
  const [easting, setEasting] = usePersistentState(
    `${storagePrefix}:easting`,
    data.project.location?.easting != null ? String(data.project.location.easting) : '',
  );
  const [objectType, setObjectType] = usePersistentState(`${storagePrefix}:object-type`, 'Residential');
  const [sunshineHours, setSunshineHours] = usePersistentState(`${storagePrefix}:sunshine-hours`, '');
  const [photo, setPhoto] = usePersistentState<string | null>(`${storagePrefix}:photo`, null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSaveLocation() {
    const numericLatitude = Number(latitude);
    const numericLongitude = Number(longitude);

    if (!address.trim() || !country.trim()) {
      setSaveError('Location and country are required before saving.');
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

    const numericNorthing = northing.trim() === '' ? null : Number(northing);
    const numericEasting = easting.trim() === '' ? null : Number(easting);
    if (northing.trim() !== '' && !Number.isFinite(numericNorthing)) {
      setSaveError('Northing must be a valid number or blank.');
      setSaveMessage(null);
      return;
    }

    if (easting.trim() !== '' && !Number.isFinite(numericEasting)) {
      setSaveError('Easting must be a valid number or blank.');
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
            place_name: address.trim(),
            country: country.trim(),
            latitude: numericLatitude,
            longitude: numericLongitude,
            northing: numericNorthing,
            easting: numericEasting,
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

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setPhoto(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <>
      <div className="topbar">
        <h1 className="topbar-title">{data.project.name}</h1>
        <span className="topbar-meta">Location</span>
      </div>

      <div className="detail-grid" style={{ marginBottom: 16 }}>
        <section className="panel" style={{ gridColumn: 'span 2' }}>
          <div className="section-head">
            <h2>Start information</h2>
            <p>Shared location inputs for the whole site and all configured faces.</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.86rem' }}>
              Location, country, latitude, longitude, northing, and easting save to SQLite. Site type, sunshine hours, and photo still stay local for now.
            </p>
            <button type="button" className="cta-button" onClick={() => void handleSaveLocation()} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save shared location'}
            </button>
          </div>
          {saveError ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--danger)' }}>{saveError}</p> : null}
          {saveMessage ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--accent-strong)' }}>{saveMessage}</p> : null}
          <div className="roof-config-inline">
            <label className="config-field">
              <span>Location</span>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Kerkstraat 12, Amsterdam" />
            </label>
            <label className="config-field">
              <span>Country</span>
              <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Netherlands" />
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
            <label className="config-field">
              <span>Northing</span>
              <input
                type="number"
                step="0.01"
                value={northing}
                onChange={(e) => setNorthing(e.target.value)}
                placeholder="Optional shared northing"
              />
            </label>
            <label className="config-field">
              <span>Easting</span>
              <input
                type="number"
                step="0.01"
                value={easting}
                onChange={(e) => setEasting(e.target.value)}
                placeholder="Optional shared easting"
              />
            </label>
            <label className="config-field">
              <span>Site type</span>
              <select value={objectType} onChange={(e) => setObjectType(e.target.value)}>
                {OBJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="config-field">
              <span>Sunshine hours / year</span>
              <input
                type="number"
                min={0}
                max={5000}
                step={10}
                value={sunshineHours}
                onChange={(e) => setSunshineHours(e.target.value)}
                placeholder="e.g. 1750"
              />
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>Site photo</h2>
            <p>Optional visual reference for the location and configured faces.</p>
          </div>
          {photo ? (
            <div style={{ position: 'relative' }}>
              <img src={photo} alt="Location" style={{ width: '100%', display: 'block', maxHeight: 260, objectFit: 'cover' }} />
              <button
                type="button"
                onClick={() => setPhoto(null)}
                style={{ position: 'absolute', top: 8, right: 8, background: 'var(--surface)', border: '1px solid var(--border)', padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Remove
              </button>
            </div>
          ) : (
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 180, background: 'var(--surface-low)', cursor: 'pointer', border: '2px dashed var(--border)' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Click to upload a photo</span>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
            </label>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="section-head">
          <h2>Result</h2>
          <p>{localFaceSummaries.length} configured faces</p>
        </div>
        <div className="roof-grid">
          {localFaceSummaries.map((face) => {
            return (
              <button
                key={face.roof_face_id}
                type="button"
                className="roof-card roof-card-button"
                onClick={() => navigateTo({ kind: 'face', roofFaceId: face.roof_face_id })}
              >
                <div className="roof-card-top">
                  <div>
                    <h3>{face.name}</h3>
                    <p>{face.orientation_deg}° · {face.tilt_deg}° tilt</p>
                  </div>
                  <StatusBadge status={face.status} fit={face.fit} />
                </div>
                <dl className="mini-stats">
                  <div><dt>Array</dt><dd>{face.array_name}</dd></div>
                  <div><dt>Panels</dt><dd>{face.panel_count}</dd></div>
                  <div><dt>Installed</dt><dd>{formatWp(face.installed_wp)}</dd></div>
                  <div><dt>MPPT</dt><dd>{face.mppt_name}</dd></div>
                </dl>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}

function FacesPage({
  data,
  localFaceSummaries,
  localTotalInstalledWp,
}: PageContext) {
  const projectStorageKey = getProjectStorageKey(data);
  const storedLatitude = readPersistentState<string>(
    `${projectStorageKey}:location:latitude`,
    data.project.location?.latitude != null ? String(data.project.location.latitude) : '',
  );
  const numericLatitude = Number(storedLatitude);
  const effectiveLatitude = Number.isFinite(numericLatitude) && storedLatitude !== ''
    ? numericLatitude
    : (data.project.location?.latitude ?? 52);
  const faceYieldRows = localFaceSummaries.map((face) => ({
    face,
    yieldRows: estimateFaceYieldTable({
      installedWp: face.installed_wp,
      azimuthDeg: face.orientation_deg,
      tiltDeg: face.tilt_deg,
      latitudeDeg: effectiveLatitude,
    }),
  }));
  const monthlyTotals = data.derived.project_monthly_solar_output;
  return (
    <>
      <div className="topbar">
        <h1 className="topbar-title">{data.project.name}</h1>
        <span className="topbar-meta">
          {data.project.location
            ? `${data.project.location.place_name}, ${data.project.location.country}`
            : 'Location not set'}
        </span>
      </div>

      <header className="hero panel">
        <div className="hero-strip">
          <SummaryCard label="Installed PV" value={formatWp(localTotalInstalledWp)} />
          <SummaryCard label="Faces" value={String(localFaceSummaries.length)} />
          <SummaryCard label="Arrays" value={String(localFaceSummaries.length)} />
          <SummaryCard label="MPPTs" value={String(localFaceSummaries.length)} />
        </div>
      </header>

      <section className="overview-grid">
        <section className="panel">
          <div className="section-head">
            <h2>Faces</h2>
            <p>Face summary, array setup, and MPPT judgment together on one page.</p>
          </div>
          <div className="roof-grid">
            {localFaceSummaries.map((face) => {
              return (
                <button
                  key={face.roof_face_id}
                  type="button"
                  className="roof-card roof-card-button"
                  onClick={() => navigateTo({ kind: 'face', roofFaceId: face.roof_face_id })}
                >
                  <div className="roof-card-top">
                    <div>
                      <h3>{face.name}</h3>
                      <p>{face.orientation_deg}° · {face.tilt_deg}° tilt</p>
                    </div>
                    <StatusBadge status={face.status} fit={face.fit} />
                  </div>
                  <dl className="mini-stats">
                    <div>
                      <dt>Array</dt>
                      <dd>{face.array_name}</dd>
                    </div>
                    <div>
                      <dt>Panels</dt>
                      <dd>{face.panel_count}</dd>
                    </div>
                    <div>
                      <dt>Installed</dt>
                      <dd>{formatWp(face.installed_wp)}</dd>
                    </div>
                    <div>
                      <dt>MPPT</dt>
                      <dd>{face.mppt_name}</dd>
                    </div>
                  </dl>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>Expected yield by face</h2>
            <p>Estimated `kWh/day` and `kWh/month` for each face based on installed PV, azimuth, tilt, and location latitude.</p>
          </div>
          <div className="yield-table-wrap">
            <table className="yield-table">
              <thead>
                <tr>
                  <th>Face</th>
                  {MONTH_KEYS.map((month) => (
                    <th key={month}>{MONTH_LABELS[month]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {faceYieldRows.map(({ face, yieldRows }) => {
                  return (
                    <tr key={face.roof_face_id}>
                      <th>{face.name}</th>
                      {yieldRows.map((row) => (
                        <td key={`${face.roof_face_id}-${row.month}`}>
                          {formatDailyYield(row.averageDailyKwh)} / {row.monthlyKwh.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                <tr>
                  <th>Total</th>
                  {monthlyTotals.map((row) => (
                    <td key={`total-${row.month}`}>
                      {formatDailyYield(row.averageDailyKwh)} / {row.monthlyKwh.toLocaleString('en-US', { maximumFractionDigits: 0 })}
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

function BatteryArrayPage({
  data,
  localFaceSummaries,
  mpptByArray,
  mpptToBatteryBankByMpptId,
  batteryBank,
  batteryBankState,
  refreshProjectData,
}: PageContext) {
  const storagePrefix = `${data.project.project_id}:battery-array`;
  const persistedDesign = data.entities.battery_bank_configurations.find((item) => item.battery_bank_id === 'battery-bank-main') ?? null;
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
  const [selectedMonth, setSelectedMonth] = usePersistentState<(typeof MONTH_KEYS)[number]>(
    `${storagePrefix}:month`,
    'july',
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
  const projectStorageKey = getProjectStorageKey(data);
  const storedLatitude = readPersistentState<string>(
    `${projectStorageKey}:location:latitude`,
    data.project.location?.latitude != null ? String(data.project.location.latitude) : '',
  );
  const numericLatitude = Number(storedLatitude);
  const effectiveLatitude = Number.isFinite(numericLatitude) && storedLatitude !== ''
    ? numericLatitude
    : (data.project.location?.latitude ?? 52);
  const projectMonthlySolarByMonth = new Map(
    data.derived.project_monthly_solar_output.map((row) => [row.month, row] as const),
  );
  const estimatedYieldByFace = localFaceSummaries.map((face) => ({
    roof_face_id: face.roof_face_id,
    name: face.name,
    ...estimateFaceYieldForMonth({
      installedWp: face.installed_wp,
      azimuthDeg: face.orientation_deg,
      tiltDeg: face.tilt_deg,
      latitudeDeg: effectiveLatitude,
      month: selectedMonth,
    }),
  }));
  const faceYieldRows = localFaceSummaries.map((face) => ({
    face,
    yieldRows: estimateFaceYieldTable({
      installedWp: face.installed_wp,
      azimuthDeg: face.orientation_deg,
      tiltDeg: face.tilt_deg,
      latitudeDeg: effectiveLatitude,
    }),
  }));
  const monthlyTotals = MONTH_KEYS.map((month) => ({
    month,
    averageDailyKwh: Number(
      faceYieldRows.reduce((sum, item) => {
        const match = item.yieldRows.find((row) => row.month === month);
        return sum + (match?.averageDailyKwh ?? 0);
      }, 0).toFixed(2),
    ),
    monthlyKwh: Number(
      faceYieldRows.reduce((sum, item) => {
        const match = item.yieldRows.find((row) => row.month === month);
        return sum + (match?.monthlyKwh ?? 0);
      }, 0).toFixed(1),
    ),
  }));
  const selectedProjectMonth = projectMonthlySolarByMonth.get(selectedMonth) ?? null;
  const totalEstimatedDailyYieldKwh = selectedProjectMonth?.average_daily_kwh ?? estimatedYieldByFace.reduce((sum, face) => sum + face.averageDailyKwh, 0);
  const totalEstimatedMonthlyYieldKwh = selectedProjectMonth?.monthly_kwh ?? estimatedYieldByFace.reduce((sum, face) => sum + face.monthlyKwh, 0);
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
  const estimatedDaysToFull = batteryArrayConfig && totalEstimatedDailyYieldKwh > 0
    ? Number((batteryArrayConfig.totalCapacityKwh / totalEstimatedDailyYieldKwh).toFixed(1))
    : null;
  const refillEnergyKwh = batteryArrayConfig
    ? Number((batteryArrayConfig.totalCapacityKwh * 0.8).toFixed(2))
    : null;
  const daysToRefillBestMonth = refillEnergyKwh != null && (bestMonth?.totalDailyKwh ?? 0) > 0
    ? Number((refillEnergyKwh / (bestMonth?.totalDailyKwh ?? 1)).toFixed(1))
    : null;
  const daysToRefillWorstMonth = refillEnergyKwh != null && (worstMonth?.totalDailyKwh ?? 0) > 0
    ? Number((refillEnergyKwh / (worstMonth?.totalDailyKwh ?? 1)).toFixed(1))
    : null;
  const batterySizing = batteryArrayConfig
    ? evaluateBatteryArraySizing(
      totalUpstreamInputPowerW,
      targetBatteryVoltage,
      batteryArrayConfig.totalCapacityKwh,
      batteryArrayConfig.maxChargeCurrentA,
      totalEstimatedDailyYieldKwh,
    )
    : null;
  const batteryRefillRule = batteryArrayConfig
    ? evaluateBatteryRefillRule({
      totalCapacityKwh: batteryArrayConfig.totalCapacityKwh,
      sunniestMonthDailyYieldKwh: bestMonth?.totalDailyKwh ?? 0,
    })
    : null;

  async function handleSaveBatteryDesign() {
    if (!selectedBatteryTypeId) {
      setBatteryDesignSaveError('Choose a battery type before saving the battery configuration.');
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
          selected_battery_type_id: selectedBatteryTypeId,
          configured_battery_count: configuredBatteryCount,
          batteries_per_string: batteriesPerString,
          parallel_strings: parallelStrings,
        }),
      });

      const payload = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? `Failed to save battery configuration (${response.status})`);
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

      setBatteryDesignSaveMessage('Battery configuration saved to the project database.');
      await refreshProjectData();
    } catch (error) {
      setBatteryDesignSaveError(error instanceof Error ? error.message : 'Failed to save battery configuration.');
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

  return (
    <>
      <div className="topbar">
        <h1 className="topbar-title">{data.project.name}</h1>
        <span className="topbar-meta">
          {data.project.location
            ? `${data.project.location.place_name}, ${data.project.location.country}`
            : 'Location not set'}
        </span>
      </div>

      <section className="panel">
        <div className="section-head">
          <h2>Solar available</h2>
          <p>Monthly total solar available for charging across all configured faces.</p>
        </div>
        <div className="yield-table-wrap">
          <table className="yield-table">
            <thead>
              <tr>
                <th>Metric</th>
                {MONTH_KEYS.map((month) => (
                  <th key={month}>{MONTH_LABELS[month]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>kWh/day</th>
                {monthlyTotals.map((row) => (
                  <td key={`battery-day-${row.month}`}>{formatDailyYield(row.averageDailyKwh)}</td>
                ))}
              </tr>
              <tr>
                <th>kWh/month</th>
                {monthlyTotals.map((row) => (
                  <td key={`battery-month-${row.month}`}>{row.monthlyKwh.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel storage-panel">
        <details className="disclosure" open={false}>
          <summary className="disclosure-summary">Upstream MPPT inputs</summary>
          <p className="disclosure-copy">Read-only MPPT inputs from all faces, shown at the current target battery voltage.</p>
          <div className="status-list">
            {data.relationships.array_to_mppt.map((relation) => {
              const array = data.entities.arrays.find((item) => item.array_id === relation.from_array_id);
              if ((array?.panel_count ?? 0) <= 0) return null;
              const roofFace = data.entities.roof_faces.find((item) => item.roof_face_id === array?.roof_face_id);
              const mppt = mpptByArray.get(relation.from_array_id);
              const mpptOutput = mppt ? mpptToBatteryBankByMpptId.get(mppt.mppt_configuration_id) ?? null : null;
              const outputVoltage = batteryArrayConfig?.stringVoltage ?? mpptOutput?.output_voltage_v ?? null;
              const outputPower = relation.input_power_w;
              const outputCurrent = outputVoltage != null && outputVoltage > 0
                ? Number((outputPower / outputVoltage).toFixed(2))
                : null;
              return (
                <article key={relation.relationship_id} className="status-card">
                  <div className="status-card-top">
                    <span className="status-title">{roofFace?.name ?? array?.name ?? relation.from_array_id}</span>
                  </div>
                  <p>{mppt?.name ?? relation.to_mppt_configuration_id}</p>
                  <dl className="mini-stats">
                    <div>
                      <dt>Input PV</dt>
                      <dd>{formatWp(relation.input_power_w)}</dd>
                    </div>
                    <div>
                      <dt>Output V</dt>
                      <dd>{outputVoltage != null ? formatVolts(outputVoltage) : 'n/a'}</dd>
                    </div>
                    <div>
                      <dt>Output power</dt>
                      <dd>{formatKw(outputPower)}</dd>
                    </div>
                    <div>
                      <dt>Output A</dt>
                      <dd>{outputCurrent != null ? formatAmps(outputCurrent) : 'n/a'}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        </details>
      </section>

      <section className="detail-grid">
        <section className="panel">
          <div className="section-head">
            <h2>Battery configuration</h2>
          </div>
          <div className="panel-selector">
            <label className="config-field">
              <span>Selected battery</span>
              <select
                value={selectedBatteryTypeId}
                onChange={(event) => setSelectedBatteryTypeId(event.target.value)}
              >
                {data.entities.battery_types.map((option) => (
                  <option key={option.battery_type_id} value={option.battery_type_id}>
                    {option.model}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {selectedBatteryType ? (
            <dl className="detail-stats panel-spec-grid">
              <div>
                <dt>Voltage</dt>
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
            </dl>
          ) : null}
          <div style={{ marginTop: 16 }}>
            <button type="button" onClick={() => void handleSaveBatteryDesign()} disabled={isSavingBatteryDesign}>
              {isSavingBatteryDesign ? 'Saving…' : 'Save battery configuration'}
            </button>
            {batteryDesignSaveError ? <p className="save-error">{batteryDesignSaveError}</p> : null}
            {batteryDesignSaveMessage ? <p className="save-message">{batteryDesignSaveMessage}</p> : null}
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>Battery array configuration</h2>
          </div>
          {selectedBatteryType ? (
            <div className="fit-card">
              <div className="config-grid">
                <label className="config-field">
                  <span>Battery count</span>
                  <input
                    type="number"
                    min={1}
                    value={configuredBatteryCount}
                    onChange={(event) => setConfiguredBatteryCount(Math.max(1, Number(event.target.value) || 1))}
                  />
                </label>
                <label className="config-field">
                  <span>Target battery voltage</span>
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
                        {formatVolts(option.voltage)} ({option.batteriesPerString}s {option.parallelStrings}p)
                      </option>
                    ))}
                  </select>
                </label>
                <label className="config-field">
                  <span>Selected month</span>
                  <select
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.target.value as (typeof MONTH_KEYS)[number])}
                  >
                    {MONTH_KEYS.map((month) => (
                      <option key={month} value={month}>
                        {MONTH_LABELS[month]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="config-field">
                  <span>Batteries per string</span>
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
                  <span>Parallel strings</span>
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
                  <div className="fit-head">
                    <div>
                      <p>
                        {batteryArrayConfig.configuredBatteryCount} battery(s) used from {configuredBatteryCount} currently assigned in the saved project configuration
                      </p>
                    </div>
                  </div>
                  <dl className="detail-stats compact-stats">
                    <div>
                      <dt>String voltage</dt>
                      <dd>{formatVolts(batteryArrayConfig.stringVoltage)}</dd>
                    </div>
                    <div>
                      <dt>Total capacity</dt>
                      <dd>{formatKwh(batteryArrayConfig.totalCapacityKwh)}</dd>
                    </div>
                    {batteryArrayConfig.maxChargeCurrentA != null ? (
                      <div>
                        <dt>Max charge amps</dt>
                        <dd>{formatAmps(batteryArrayConfig.maxChargeCurrentA)}</dd>
                      </div>
                    ) : null}
                    {batteryArrayConfig.maxDischargeCurrentA != null ? (
                      <div>
                        <dt>Max discharge amps</dt>
                        <dd>{formatAmps(batteryArrayConfig.maxDischargeCurrentA)}</dd>
                      </div>
                    ) : null}
                    {batteryArrayConfig.maxDischargePowerW != null ? (
                      <div>
                        <dt>Max discharge watts</dt>
                        <dd>{formatKw(batteryArrayConfig.maxDischargePowerW)}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {!batteryArrayConfig.usesConfiguredBatteriesExactly ? (
                    <p className="fit-note">
                      Batteries per string × parallel strings = {batteryArrayConfig.configuredBatteryCount}, but {configuredBatteryCount} are assigned. Adjust to match exactly.
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : (
                <p>No battery type is available yet for this battery array.</p>
          )}
        </section>
      </section>

      <section className="detail-grid">
        <section className="panel">
          <div className="section-head">
            <h2>Selected month consequence</h2>
            <p>What the current battery configuration means in the selected month.</p>
          </div>
          {batterySizing ? (
            <>
              <div className="fit-head">
                <div>
                  <strong>{batterySizing.headline}</strong>
                </div>
                <span className={`status status-${batterySizing.tone}`}>{batterySizing.headline}</span>
              </div>
              <dl className="detail-stats compact-stats">
                <div>
                  <dt>Month</dt>
                  <dd>{MONTH_LABELS[selectedMonth]}</dd>
                </div>
                <div>
                  <dt>Solar / day</dt>
                  <dd>{formatDailyYield(totalEstimatedDailyYieldKwh)} kWh</dd>
                </div>
                <div>
                  <dt>Solar / month</dt>
                  <dd>{totalEstimatedMonthlyYieldKwh.toLocaleString('en-US', { maximumFractionDigits: 1 })} kWh</dd>
                </div>
                <div>
                  <dt>Target battery voltage</dt>
                  <dd>{targetBatteryVoltage != null ? formatVolts(targetBatteryVoltage) : 'n/a'}</dd>
                </div>
                <div>
                  <dt>Estimated charge current</dt>
                  <dd>{batterySizing.estimatedChargeCurrentA != null ? formatAmps(batterySizing.estimatedChargeCurrentA) : 'n/a'}</dd>
                </div>
                <div>
                  <dt>Days to fill from solar</dt>
                  <dd>{estimatedDaysToFull != null ? `${estimatedDaysToFull} d` : 'n/a'}</dd>
                </div>
              </dl>
            </>
          ) : null}
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>Refill rule</h2>
            <p>Consequence of the 10% to 90% in one day sizing rule.</p>
          </div>
          {batteryRefillRule ? (
            <>
              <div className="fit-head">
                <div>
                  <strong>{batteryRefillRule.headline}</strong>
                </div>
                <span className={`status status-${batteryRefillRule.tone}`}>{batteryRefillRule.headline}</span>
              </div>
              <dl className="detail-stats compact-stats">
                <div>
                  <dt>Required refill energy</dt>
                  <dd>{batteryRefillRule.requiredRefillKwh != null ? `${batteryRefillRule.requiredRefillKwh.toLocaleString('en-US', { maximumFractionDigits: 2 })} kWh` : 'n/a'}</dd>
                </div>
                <div>
                  <dt>Refill ratio</dt>
                  <dd>{batteryRefillRule.refillRatio != null ? `${batteryRefillRule.refillRatio}x` : 'n/a'}</dd>
                </div>
                <div>
                  <dt>Best month</dt>
                  <dd>{bestMonth ? MONTH_LABELS[bestMonth.month] : 'n/a'}</dd>
                </div>
                <div>
                  <dt>10% → 90% in best month</dt>
                  <dd>{daysToRefillBestMonth != null ? `${daysToRefillBestMonth} d` : 'n/a'}</dd>
                </div>
                <div>
                  <dt>Worst month</dt>
                  <dd>{worstMonth ? MONTH_LABELS[worstMonth.month] : 'n/a'}</dd>
                </div>
                <div>
                  <dt>10% → 90% in worst month</dt>
                  <dd>{daysToRefillWorstMonth != null ? `${daysToRefillWorstMonth} d` : 'n/a'}</dd>
                </div>
              </dl>
            </>
          ) : null}
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
    data.project.preferences?.preferred_inverter_type_id ?? data.entities.inverter_types[0]?.inverter_id ?? '',
  );
  const [isSavingInverterDesign, setIsSavingInverterDesign] = useState(false);
  const [inverterDesignSaveMessage, setInverterDesignSaveMessage] = useState<string | null>(null);
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
  const projectInverter = data.entities.inverter_configurations[0] ?? null;
  const batteryToInverter = projectInverter
    ? data.relationships.battery_bank_to_inverter.find((item) => item.to_inverter_configuration_id === projectInverter.inverter_configuration_id) ?? null
    : null;

  async function handleSaveInverterDesign() {
    if (!selectedInverterTypeId) {
      setInverterDesignSaveError('Choose an inverter type before saving the inverter array.');
      setInverterDesignSaveMessage(null);
      return;
    }

    setIsSavingInverterDesign(true);
    setInverterDesignSaveError(null);
    setInverterDesignSaveMessage(null);

    try {
      const response = await fetch('/api/inverter-configuration', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selected_inverter_type_id: selectedInverterTypeId,
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

      setInverterDesignSaveMessage('Inverter configuration saved to the project database.');
      await refreshProjectData();
    } catch (error) {
      setInverterDesignSaveError(error instanceof Error ? error.message : 'Failed to save inverter configuration.');
      setInverterDesignSaveMessage(null);
    } finally {
      setIsSavingInverterDesign(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <h1 className="topbar-title">{data.project.name}</h1>
        <span className="topbar-meta">
          {data.project.location
            ? `${data.project.location.place_name}, ${data.project.location.country}`
            : 'Location not set'}
        </span>
      </div>

      <header className="hero panel">
        <div className="hero-strip">
          <SummaryCard label="Battery array" value={currentBatteryType ? `${currentBatteryType.model} array` : (batteryBank?.name ?? 'n/a')} />
          <SummaryCard
            label="Voltage"
            value={batteryArrayConfig != null ? formatVolts(batteryArrayConfig.stringVoltage) : (batteryBankState?.nominal_voltage_v != null ? formatVolts(batteryBankState.nominal_voltage_v) : 'n/a')}
          />
          <SummaryCard
            label="Capacity"
            value={batteryArrayConfig != null ? formatKwh(batteryArrayConfig.totalCapacityKwh) : (batteryBankState?.capacity_kwh != null ? formatKwh(batteryBankState.capacity_kwh) : 'n/a')}
          />
          <SummaryCard
            label="Battery max power"
            value={batteryArrayConfig?.maxDischargePowerW != null ? formatKw(batteryArrayConfig.maxDischargePowerW) : 'n/a'}
          />
          <SummaryCard
            label="MPPT charge"
            value={batteryBankState?.total_mppt_charge_current_a != null ? formatAmps(batteryBankState.total_mppt_charge_current_a) : 'n/a'}
          />
        </div>
      </header>

      <section className="overview-grid">
        <section className="panel">
          <div className="section-head">
            <h2>Inverter array</h2>
            <p>Battery-array summary and inverter fit for the current local battery configuration.</p>
          </div>
          <dl className="detail-stats panel-spec-grid">
            <div>
              <dt>Battery array</dt>
              <dd>{currentBatteryType ? `${currentBatteryType.model} array` : (batteryBank?.name ?? 'n/a')}</dd>
            </div>
            <div>
              <dt>Modules</dt>
              <dd>{batteryArrayConfig?.configuredBatteryCount ?? 0}</dd>
            </div>
            <div>
              <dt>Nominal voltage</dt>
              <dd>{batteryArrayConfig != null ? formatVolts(batteryArrayConfig.stringVoltage) : (batteryBankState?.nominal_voltage_v != null ? formatVolts(batteryBankState.nominal_voltage_v) : 'n/a')}</dd>
            </div>
            <div>
              <dt>Capacity</dt>
              <dd>{batteryArrayConfig != null ? formatKwh(batteryArrayConfig.totalCapacityKwh) : (batteryBankState?.capacity_kwh != null ? formatKwh(batteryBankState.capacity_kwh) : 'n/a')}</dd>
            </div>
            <div>
              <dt>Battery max power</dt>
              <dd>{batteryArrayConfig?.maxDischargePowerW != null ? formatKw(batteryArrayConfig.maxDischargePowerW) : 'n/a'}</dd>
            </div>
            <div>
              <dt>MPPT charge current</dt>
              <dd>{batteryBankState?.total_mppt_charge_current_a != null ? formatAmps(batteryBankState.total_mppt_charge_current_a) : 'n/a'}</dd>
            </div>
            <div>
              <dt>Inverter link</dt>
              <dd>{batteryToInverter ? 'Connected' : 'Pending'}</dd>
            </div>
          </dl>
          {batteryArrayConfig ? (
            <dl className="detail-stats compact-stats">
              <div>
                <dt>Battery max charge amps</dt>
                <dd>{batteryArrayConfig.maxChargeCurrentA != null ? formatAmps(batteryArrayConfig.maxChargeCurrentA) : 'n/a'}</dd>
              </div>
              <div>
                <dt>Battery max discharge amps</dt>
                <dd>{batteryArrayConfig.maxDischargeCurrentA != null ? formatAmps(batteryArrayConfig.maxDischargeCurrentA) : 'n/a'}</dd>
              </div>
              <div>
                <dt>Battery max discharge watts</dt>
                <dd>{batteryArrayConfig.maxDischargePowerW != null ? formatKw(batteryArrayConfig.maxDischargePowerW) : 'n/a'}</dd>
              </div>
            </dl>
          ) : null}
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>Configuration</h2>
          </div>
          <label className="config-field">
            <span>Configured inverter</span>
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
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={() => void handleSaveInverterDesign()}
              disabled={isSavingInverterDesign || data.entities.inverter_types.length === 0}
            >
              {isSavingInverterDesign ? 'Saving…' : 'Save inverter configuration'}
            </button>
            {inverterDesignSaveError ? <p className="save-error">{inverterDesignSaveError}</p> : null}
            {inverterDesignSaveMessage ? <p className="save-message">{inverterDesignSaveMessage}</p> : null}
          </div>
          {selectedInverterType ? (
            <dl className="detail-stats panel-spec-grid">
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
            <p className="fit-note">No inverter catalog entries are available yet, so the inverter configuration is waiting on seeded data.</p>
          ) : null}
          <div className="fit-head">
            <div>
            <strong>{selectedInverterType?.model ?? 'No inverter configured'}</strong>
              <p className="mppt-result-sub">{projectInverter?.name ?? 'Provisional'}</p>
            </div>
            <StatusBadge status={inverterCompatibility?.status ?? 'outside_limits'} fit={inverterCompatibility?.fit} />
          </div>
          {batteryArrayConfig && selectedInverterType ? (
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
          ) : null}
          <ul className="reason-list">
            {inverterCompatibility?.reasons.map((reason) => (
              <li key={reason}>{reason.replaceAll('_', ' ')}</li>
            )) ?? null}
          </ul>
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
  const localFaceSummaries = buildLocalFaceSummaries(data);
  const localTotalInstalledWp = localFaceSummaries.reduce((total, face) => total + face.installed_wp, 0);
  const arrayStateByRoofFace = new Map(data.derived.array_states.map((state) => [state.roof_face_id, state]));
  const mpptByArray = new Map(data.entities.mppt_configurations.map((item) => [item.array_id, item]));
  const relationByArray = new Map(data.relationships.array_to_mppt.map((item) => [item.from_array_id, item]));
  const mpptToBatteryBankByMpptId = new Map(
    data.relationships.mppt_to_battery_bank.map((item) => [item.from_mppt_configuration_id, item]),
  );
  const arrayById = new Map(data.entities.arrays.map((item) => [item.array_id, item]));
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
    localFaceSummaries,
    localTotalInstalledWp,
    arrayStateByRoofFace,
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

  if (route.kind === 'face') {
    return (
      <div className="layout">
        <Sidebar route={route} data={data} />
        <main className="app-shell">
          <RoofFaceDetail
            key={`face:${route.roofFaceId}`}
            data={data}
            roofFaceId={route.roofFaceId}
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
        {route.kind === 'location' ? (
          <LocationPage {...context} />
        ) : route.kind === 'faces' ? (
          <FacesPage {...context} />
        ) : route.kind === 'battery-array' ? (
          <BatteryArrayPage {...context} />
        ) : route.kind === 'inverter-array' ? (
          <InverterArrayPage {...context} />
        ) : (
          <OverviewPage {...context} />
        )}
      </main>
    </div>
  );
}
