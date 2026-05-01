import React from 'react';
import { useEffect, useState, type ChangeEvent, type MouseEvent } from 'react';
import { LANGUAGE_OPTIONS, LanguageProvider, readLanguageFromPath, useTranslation, type LanguageCode, type TranslationKey } from './i18n';

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

type Status = 'within_limits' | 'outside_limits' | 'unknown';
type FitStatus = 'optimal' | 'fully_utilized' | 'clipping_expected' | 'underutilized';

type LightboxMedia =
  | { kind: 'image'; src: string; alt: string }
  | { kind: 'map'; src: string; alt: string };

interface ImageLightboxContextValue {
  openImagePreview: (image: LightboxMedia) => void;
}

const ImageLightboxContext = React.createContext<ImageLightboxContextValue | null>(null);

function useImageLightbox() {
  const context = React.useContext(ImageLightboxContext);
  if (!context) {
    throw new Error('ImageLightboxContext is missing.');
  }

  return context;
}

function getMpptShortCircuitCurrentLimit(mpptType: MpptType): number {
  return mpptType.max_pv_short_circuit_current_a ?? mpptType.max_charge_current;
}

function ExpandablePhoto({
  src,
  alt,
  onRemove,
  removeLabel,
}: {
  src: string;
  alt: string;
  onRemove: () => void;
  removeLabel: string;
}) {
  const { openImagePreview } = useImageLightbox();

  return (
    <div className="photo-frame">
      <button
        type="button"
        className="photo-expand-trigger"
        onClick={() => openImagePreview({ kind: 'image', src, alt })}
        aria-label={alt}
      >
        <img src={src} alt={alt} className="photo-image" />
      </button>
      <button
        type="button"
        className="button button-secondary button-sm photo-remove"
        onClick={onRemove}
      >
        {removeLabel}
      </button>
    </div>
  );
}

function ImageLightbox({
  media,
  onClose,
}: {
  media: LightboxMedia;
  onClose: () => void;
}) {
  return (
    <div
      className="image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={media.alt}
      onClick={onClose}
    >
      <div className="image-lightbox-backdrop" />
      <div className="image-lightbox-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="image-lightbox-toolbar">
          <button type="button" className="button button-secondary button-sm image-lightbox-close" onClick={onClose}>
            Close
          </button>
        </div>
        {media.kind === 'image' ? (
          <button type="button" className="image-lightbox-image-button" onClick={onClose} aria-label="Close image preview">
            <img src={media.src} alt={media.alt} className="image-lightbox-image" />
          </button>
        ) : (
          <iframe
            title={media.alt}
            src={media.src}
            className="image-lightbox-map"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        )}
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmTone = 'secondary',
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmTone?: 'secondary' | 'danger' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="confirm-dialog" role="dialog" aria-modal="true" aria-label={title} onClick={onCancel}>
      <div className="confirm-dialog-backdrop" />
      <div className="confirm-dialog-panel" onClick={(event) => event.stopPropagation()}>
        <div className="section-head">
          <h2>{title}</h2>
          <p>{message}</p>
        </div>
        <div className="button-row button-row-end confirm-dialog-actions">
          <button type="button" className="button button-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={
              confirmTone === 'danger'
                ? 'button button-danger'
                : confirmTone === 'success'
                  ? 'button button-success'
                  : 'button button-secondary'
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  brand: string;
  model: string;
  wp: number;
  voc: number;
  vmp: number;
  isc: number;
  imp: number;
  length_mm?: number | null;
  width_mm?: number | null;
  price?: number | null;
  price_source_url?: string | null;
  last_upsert_date?: string | null;
  notes?: string;
}

interface CabinetType {
  cabinet_type_id: string;
  title: string;
  description?: string | null;
  depth_mm: number;
  width_mm: number;
  height_mm: number;
  units: string;
  price?: number | null;
  price_source_url?: string | null;
  condensation_protection: boolean;
  insect_protection: boolean;
  dust_protection: boolean;
  outside_protection: boolean;
  frost_protection: boolean;
  fire_protection: boolean;
  ip_rating?: string | null;
  insurance_rating?: string | null;
}

interface SurfaceConfiguration {
  surface_id: string;
  panels_per_string: number | null;
  parallel_strings: number | null;
  selected_mppt_type_id?: string | null;
}

interface BatteryType {
  battery_type_id: string;
  brand: string;
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
  price_source_url?: string | null;
  source?: string | null;
  url?: string | null;
  notes?: string;
}

interface BatteryTypeDraft {
  battery_type_id: string;
  brand: string;
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
  price_source_url: string;
  notes: string;
}

interface PanelTypeDraft {
  panel_type_id: string;
  brand: string;
  model: string;
  wp: string;
  voc: string;
  vmp: string;
  isc: string;
  imp: string;
  length_mm: string;
  width_mm: string;
  price: string;
  price_source_url: string;
  notes: string;
}

interface CabinetTypeDraft {
  cabinet_type_id: string;
  title: string;
  description: string;
  depth_mm: string;
  width_mm: string;
  height_mm: string;
  units: string;
  price: string;
  price_source_url: string;
  condensation_protection: boolean;
  insect_protection: boolean;
  dust_protection: boolean;
  outside_protection: boolean;
  frost_protection: boolean;
  fire_protection: boolean;
  ip_rating: string;
  insurance_rating: string;
}

interface MpptTypeDraft {
  mppt_type_id: string;
  brand: string;
  model: string;
  tracker_count: string;
  max_voc: string;
  max_pv_power: string;
  max_pv_input_current_a: string;
  max_pv_short_circuit_current_a: string;
  max_charge_current: string;
  nominal_battery_voltage: string;
  price: string;
  price_source_url: string;
  notes: string;
}

interface InverterTypeDraft {
  inverter_id: string;
  brand: string;
  model: string;
  input_voltage_v: string;
  output_voltage_v: string;
  continuous_power_w: string;
  peak_power_va: string;
  max_charge_current_a: string;
  efficiency_pct: string;
  price: string;
  price_source_url: string;
  notes: string;
}

interface ConversionDeviceDraft {
  conversion_device_id: string;
  title: string;
  description: string;
  device_type: string;
  input_voltage_v: string;
  output_voltage_v: string;
  continuous_power_w: string;
  peak_power_va: string;
  max_charge_current_a: string;
  efficiency_pct: string;
  output_ac_voltage_v: string;
  frequency_hz: string;
  surge_power_w: string;
  output_dc_voltage_v: string;
  max_output_current_a: string;
  price: string;
  price_source_url: string;
  notes: string;
}

interface BatteryBankConfiguration {
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

interface MpptType {
  mppt_type_id: string;
  brand: string;
  model: string;
  tracker_count: number;
  max_voc: number;
  max_pv_power: number;
  max_pv_input_current_a?: number | null;
  max_pv_short_circuit_current_a?: number | null;
  max_charge_current: number;
  nominal_battery_voltage: number;
  price?: number | null;
  price_source_url?: string | null;
  notes?: string;
}

interface InverterType {
  inverter_id: string;
  brand: string;
  model: string;
  input_voltage_v: number;
  output_voltage_v: number;
  continuous_power_w: number;
  peak_power_va: number;
  max_charge_current_a: number;
  efficiency_pct?: number | null;
  price?: number | null;
  price_source_url?: string | null;
  notes?: string;
}

interface ConversionDevice {
  conversion_device_id: string;
  title: string;
  description?: string | null;
  device_type: string;
  input_voltage_v?: number | null;
  output_voltage_v?: number | null;
  continuous_power_w?: number | null;
  peak_power_va?: number | null;
  max_charge_current_a?: number | null;
  efficiency_pct?: number | null;
  output_ac_voltage_v?: number | null;
  frequency_hz?: number | null;
  surge_power_w?: number | null;
  output_dc_voltage_v?: number | null;
  max_output_current_a?: number | null;
  price?: number | null;
  price_source_url?: string | null;
  notes?: string | null;
}

interface LoadCircuit {
  load_circuit_id: string;
  conversion_device_id: string;
  title: string;
  description?: string | null;
}

interface Load {
  load_id: string;
  load_circuit_id: string;
  title: string;
  description?: string | null;
  usage_kw: number;
  spike_kw: number;
  expected_usage_hours_per_day: number;
  sleeping_kw: number;
}

interface LoadCircuitDraft {
  load_circuit_id: string;
  conversion_device_id: string;
  title: string;
  description: string;
}

interface LoadDraft {
  load_id: string;
  load_circuit_id: string;
  title: string;
  description: string;
  usage_kw: string;
  spike_kw: string;
  expected_usage_hours_per_day: string;
  sleeping_kw: string;
}

interface LoadPreset {
  load_preset_id: string;
  title: string;
  description: string;
  usage_kw: number;
  spike_kw: number;
  expected_usage_hours_per_day: number;
  sleeping_kw: number;
}

const LOAD_PRESETS: LoadPreset[] = [
  {
    load_preset_id: 'fridge',
    title: 'Fridge',
    description: 'Cold storage appliance',
    usage_kw: 0.12,
    spike_kw: 0.4,
    expected_usage_hours_per_day: 24,
    sleeping_kw: 0.03,
  },
  {
    load_preset_id: 'pump',
    title: 'Pump',
    description: 'Water or circulation pump',
    usage_kw: 0.25,
    spike_kw: 0.9,
    expected_usage_hours_per_day: 1.5,
    sleeping_kw: 0,
  },
  {
    load_preset_id: 'living-room-sockets',
    title: 'Living room sockets',
    description: 'Grouped socket demand',
    usage_kw: 0.35,
    spike_kw: 1.2,
    expected_usage_hours_per_day: 4,
    sleeping_kw: 0,
  },
  {
    load_preset_id: 'upstairs-lighting',
    title: 'Upstairs lighting',
    description: 'Lighting group',
    usage_kw: 0.08,
    spike_kw: 0.15,
    expected_usage_hours_per_day: 5,
    sleeping_kw: 0,
  },
  {
    load_preset_id: 'oven',
    title: 'Oven',
    description: 'High-power cooking appliance',
    usage_kw: 2.2,
    spike_kw: 3.2,
    expected_usage_hours_per_day: 0.8,
    sleeping_kw: 0,
  },
  {
    load_preset_id: 'washing-machine',
    title: 'Washing machine',
    description: 'Laundry appliance',
    usage_kw: 0.7,
    spike_kw: 2.0,
    expected_usage_hours_per_day: 1.2,
    sleeping_kw: 0,
  },
];

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
  selected_cabinet_type_id?: string | null;
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
  selected_cabinet_type_id?: string | null;
  name: string;
  provisional: boolean;
  title?: string | null;
  description?: string | null;
  image_data_url?: string | null;
  notes?: string | null;
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
    fit_status?: 'optimal' | 'fully_utilized' | 'clipping_expected' | 'underutilized';
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
  load_kwh: number | null;
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
    cabinet_types: CabinetType[];
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
    conversion_devices: ConversionDevice[];
    load_circuits: LoadCircuit[];
    loads: Load[];
    load_monthly_profiles: [];
  };
  relationships: {
    array_to_mppt: ArrayToMpptRelationship[];
    mppt_to_battery_bank: MpptToBatteryBankRelationship[];
    battery_bank_to_inverter: BatteryBankToInverterRelationship[];
    conversion_device_to_load_circuit: [];
    load_circuit_to_load: [];
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
  reasons: string[];
};

function getProjectStorageKey(data: DigitalTwinExport): string {
  return data.project.project_id ?? 'offgridos-project';
}

function getConsumptionSelectionStorageKey(data: DigitalTwinExport): string {
  return `${getProjectStorageKey(data)}:consumption:selected-converters`;
}

function getConversionDeviceCatalogSelectionStorageKey(data: DigitalTwinExport): string {
  return `${getProjectStorageKey(data)}:catalog:conversion-device`;
}

function getConversionDeviceTypeLabel(deviceType: string, t: (key: TranslationKey, variables?: Record<string, string | number>) => string): string {
  switch (deviceType) {
    case 'dc_dc_converter':
      return t('catalog.device_type.dc_dc_converter');
    case 'ac_dc_charger':
      return t('catalog.device_type.ac_dc_charger');
    default:
      return t('catalog.device_type.inverter');
  }
}

function getConversionDeviceDisplayName(data: DigitalTwinExport | null, converterId: string): string {
  return data?.entities.conversion_devices.find((device) => device.conversion_device_id === converterId)?.title ?? converterId;
}

function getLocationDisplayName(
  data: DigitalTwinExport,
  t?: (key: TranslationKey, variables?: Record<string, string | number>) => string,
): string {
  return data.project.location?.title?.trim()
    || data.project.location?.place_name
    || (t ? t('location.not_set') : 'Location not set');
}

function getSurfaceDisplayName(data: DigitalTwinExport, surfaceId: string): string {
  return data.entities.surfaces.find((surface) => surface.surface_id === surfaceId)?.name ?? surfaceId;
}

function slugifyPathSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'project';
}

function getLocationSlug(data: DigitalTwinExport): string {
  return slugifyPathSegment(getLocationDisplayName(data));
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
    const localSurfaceName = surface.name;

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
      reasons: mpptCompatibility?.reasons ?? [],
    };
  });
}

type Route =
  | { kind: 'location' }
  | { kind: 'production' }
  | { kind: 'about' }
  | { kind: 'catalogs' }
  | { kind: 'reports' }
  | { kind: 'catalog'; catalog: 'panel-types' | 'cabinet-types' | 'conversion-devices' | 'mppt-types' | 'battery-types' | 'inverter-types' }
  | { kind: 'verdict-summary' }
  | { kind: 'cost-summary' }
  | { kind: 'battery-array' }
  | { kind: 'inverter-array' }
  | { kind: 'converter'; converterId: string; loadCircuitId?: string }
  | { kind: 'load-circuits' }
  | { kind: 'loads' }
  | { kind: 'surface'; surfaceId: string };

type ParsedAppUrl = {
  language: LanguageCode | null;
  locationSlug: string | null;
  route: Route;
};

const CATALOG_ROUTES: Array<{
  catalog: 'panel-types' | 'cabinet-types' | 'conversion-devices' | 'mppt-types' | 'battery-types' | 'inverter-types';
  labelKey: TranslationKey;
}> = [
  { catalog: 'panel-types', labelKey: 'nav.catalog.panel_types' },
  { catalog: 'cabinet-types', labelKey: 'nav.catalog.cabinet_types' },
  { catalog: 'conversion-devices', labelKey: 'nav.catalog.conversion_devices' },
  { catalog: 'mppt-types', labelKey: 'nav.catalog.mppt_types' },
  { catalog: 'battery-types', labelKey: 'nav.catalog.battery_types' },
];

const REPORT_ROUTES: Array<{
  kind: 'verdict-summary' | 'cost-summary';
  labelKey: TranslationKey;
}> = [
  { kind: 'verdict-summary', labelKey: 'nav.report.verdict_summary' },
  { kind: 'cost-summary', labelKey: 'nav.report.cost_summary' },
];

const AC_ROUTES: Array<{
  kind: 'battery-array' | 'inverter-array' | 'load-circuits' | 'loads';
  labelKey: TranslationKey;
}> = [
  { kind: 'battery-array', labelKey: 'nav.battery_bank' },
  { kind: 'inverter-array', labelKey: 'nav.converters' },
  { kind: 'load-circuits', labelKey: 'nav.load_circuits' },
  { kind: 'loads', labelKey: 'nav.loads' },
];

const RESERVED_ROUTE_SEGMENTS = new Set([
  'about',
  'battery-array',
  'catalogs',
  'cabinet-types',
  'cost-summary',
  'conversion-devices',
  'converters',
  'inverter-array',
  'location',
  'load-circuits',
  'loads',
  'production',
  'reports',
  'surfaces',
  'verdict-summary',
]);

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

function getMonthLabel(month: string, t?: (key: TranslationKey, variables?: Record<string, string | number>) => string): string {
  if (!t) {
    return MONTH_LABELS[month] ?? month;
  }

  const key = `month.${month}` as TranslationKey;
  return t(key);
}

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

function formatCurrency(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'Unknown';
  }

  return `€${value.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

function formatPriceSourceName(sourceUrl?: string | null): string | null {
  if (!sourceUrl) {
    return null;
  }

  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, '');
  } catch {
    return sourceUrl;
  }
}

function renderPrice(value: number | null | undefined, sourceUrl?: string | null): React.ReactNode {
  const formatted = formatCurrency(value);
  const sourceName = formatPriceSourceName(sourceUrl);

  if (value == null || !sourceUrl) {
    return formatted;
  }

  const title = sourceName ? `Source: ${sourceName}` : 'Price source';

  return (
    <a
      href={sourceUrl}
      target="_blank"
      rel="noreferrer"
      title={title}
      aria-label={`${formatted} from ${sourceName ?? 'price source'}`}
      className="price-link"
    >
      {formatted}
    </a>
  );
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

function formatBrandModel(brand: string | null | undefined, model: string): string {
  const trimmedBrand = brand?.trim() ?? '';
  const trimmedModel = model.trim();

  if (!trimmedBrand) {
    return trimmedModel;
  }

  if (!trimmedModel) {
    return trimmedBrand;
  }

  return `${trimmedBrand} ${trimmedModel}`;
}

function emptyBatteryDraft(): BatteryTypeDraft {
  return {
    battery_type_id: '',
    brand: '',
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
    price_source_url: '',
    notes: '',
  };
}

function batteryDraftFromType(battery: BatteryType | null): BatteryTypeDraft {
  if (!battery) return emptyBatteryDraft();

  return {
    battery_type_id: battery.battery_type_id,
    brand: battery.brand,
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
    price_source_url: battery.price_source_url ?? battery.source ?? battery.url ?? '',
    notes: battery.notes ?? '',
  };
}

function emptyPanelDraft(): PanelTypeDraft {
  return {
    panel_type_id: '',
    brand: '',
    model: '',
    wp: '450',
    voc: '40',
    vmp: '34',
    isc: '14',
    imp: '13',
    length_mm: '',
    width_mm: '',
    price: '',
    price_source_url: '',
    notes: '',
  };
}

function panelDraftFromType(panel: PanelType | null): PanelTypeDraft {
  if (!panel) return emptyPanelDraft();

  return {
    panel_type_id: panel.panel_type_id,
    brand: panel.brand,
    model: panel.model,
    wp: String(panel.wp),
    voc: String(panel.voc),
    vmp: String(panel.vmp),
    isc: String(panel.isc),
    imp: String(panel.imp),
    length_mm: panel.length_mm != null ? String(panel.length_mm) : '',
    width_mm: panel.width_mm != null ? String(panel.width_mm) : '',
    price: panel.price != null ? String(panel.price) : '',
    price_source_url: panel.price_source_url ?? '',
    notes: panel.notes ?? '',
  };
}

function emptyCabinetDraft(): CabinetTypeDraft {
  return {
    cabinet_type_id: '',
    title: '',
    description: '',
    depth_mm: '600',
    width_mm: '600',
    height_mm: '1800',
    units: '',
    price: '',
    price_source_url: '',
    condensation_protection: false,
    insect_protection: false,
    dust_protection: false,
    outside_protection: false,
    frost_protection: false,
    fire_protection: false,
    ip_rating: '',
    insurance_rating: '',
  };
}

function cabinetDraftFromType(cabinet: CabinetType | null): CabinetTypeDraft {
  if (!cabinet) return emptyCabinetDraft();

  return {
    cabinet_type_id: cabinet.cabinet_type_id,
    title: cabinet.title,
    description: cabinet.description ?? '',
    depth_mm: String(cabinet.depth_mm),
    width_mm: String(cabinet.width_mm),
    height_mm: String(cabinet.height_mm),
    units: cabinet.units ?? '',
    price: cabinet.price != null ? String(cabinet.price) : '',
    price_source_url: cabinet.price_source_url ?? '',
    condensation_protection: cabinet.condensation_protection,
    insect_protection: cabinet.insect_protection,
    dust_protection: cabinet.dust_protection,
    outside_protection: cabinet.outside_protection,
    frost_protection: cabinet.frost_protection,
    fire_protection: cabinet.fire_protection,
    ip_rating: cabinet.ip_rating ?? '',
    insurance_rating: cabinet.insurance_rating ?? '',
  };
}

function emptyMpptDraft(): MpptTypeDraft {
  return {
    mppt_type_id: '',
    brand: '',
    model: '',
    tracker_count: '2',
    max_voc: '250',
    max_pv_power: '6000',
    max_pv_input_current_a: '',
    max_pv_short_circuit_current_a: '',
    max_charge_current: '120',
    nominal_battery_voltage: '48',
    price: '',
    price_source_url: '',
    notes: '',
  };
}

function mpptDraftFromType(mppt: MpptType | null): MpptTypeDraft {
  if (!mppt) return emptyMpptDraft();

  return {
    mppt_type_id: mppt.mppt_type_id,
    brand: mppt.brand,
    model: mppt.model,
    tracker_count: String(mppt.tracker_count),
    max_voc: String(mppt.max_voc),
    max_pv_power: String(mppt.max_pv_power),
    max_pv_input_current_a: mppt.max_pv_input_current_a != null ? String(mppt.max_pv_input_current_a) : '',
    max_pv_short_circuit_current_a: mppt.max_pv_short_circuit_current_a != null ? String(mppt.max_pv_short_circuit_current_a) : '',
    max_charge_current: String(mppt.max_charge_current),
    nominal_battery_voltage: String(mppt.nominal_battery_voltage),
    price: mppt.price != null ? String(mppt.price) : '',
    price_source_url: mppt.price_source_url ?? '',
    notes: mppt.notes ?? '',
  };
}

function emptyInverterDraft(): InverterTypeDraft {
  return {
    inverter_id: '',
    brand: '',
    model: '',
    input_voltage_v: '48',
    output_voltage_v: '230',
    continuous_power_w: '5000',
    peak_power_va: '8000',
    max_charge_current_a: '100',
    efficiency_pct: '',
    price: '',
    price_source_url: '',
    notes: '',
  };
}

function inverterDraftFromType(inverter: InverterType | null): InverterTypeDraft {
  if (!inverter) return emptyInverterDraft();

  return {
    inverter_id: inverter.inverter_id,
    brand: inverter.brand,
    model: inverter.model,
    input_voltage_v: String(inverter.input_voltage_v),
    output_voltage_v: String(inverter.output_voltage_v),
    continuous_power_w: String(inverter.continuous_power_w),
    peak_power_va: String(inverter.peak_power_va),
    max_charge_current_a: String(inverter.max_charge_current_a),
    efficiency_pct: inverter.efficiency_pct != null ? String(inverter.efficiency_pct) : '',
    price: inverter.price != null ? String(inverter.price) : '',
    price_source_url: inverter.price_source_url ?? '',
    notes: inverter.notes ?? '',
  };
}

function emptyConversionDeviceDraft(): ConversionDeviceDraft {
  return {
    conversion_device_id: '',
    title: '',
    description: '',
    device_type: 'inverter',
    input_voltage_v: '48',
    output_voltage_v: '230',
    continuous_power_w: '5000',
    peak_power_va: '8000',
    max_charge_current_a: '100',
    efficiency_pct: '',
    output_ac_voltage_v: '',
    frequency_hz: '',
    surge_power_w: '',
    output_dc_voltage_v: '',
    max_output_current_a: '',
    price: '',
    price_source_url: '',
    notes: '',
  };
}

function conversionDeviceDraftFromType(device: ConversionDevice | null): ConversionDeviceDraft {
  if (!device) return emptyConversionDeviceDraft();

  return {
    conversion_device_id: device.conversion_device_id,
    title: device.title,
    description: device.description ?? '',
    device_type: device.device_type,
    input_voltage_v: device.input_voltage_v != null ? String(device.input_voltage_v) : '',
    output_voltage_v: device.output_voltage_v != null ? String(device.output_voltage_v) : '',
    continuous_power_w: device.continuous_power_w != null ? String(device.continuous_power_w) : '',
    peak_power_va: device.peak_power_va != null ? String(device.peak_power_va) : '',
    max_charge_current_a: device.max_charge_current_a != null ? String(device.max_charge_current_a) : '',
    efficiency_pct: device.efficiency_pct != null ? String(device.efficiency_pct) : '',
    output_ac_voltage_v: device.output_ac_voltage_v != null ? String(device.output_ac_voltage_v) : '',
    frequency_hz: device.frequency_hz != null ? String(device.frequency_hz) : '',
    surge_power_w: device.surge_power_w != null ? String(device.surge_power_w) : '',
    output_dc_voltage_v: device.output_dc_voltage_v != null ? String(device.output_dc_voltage_v) : '',
    max_output_current_a: device.max_output_current_a != null ? String(device.max_output_current_a) : '',
    price: device.price != null ? String(device.price) : '',
    price_source_url: device.price_source_url ?? '',
    notes: device.notes ?? '',
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
  if (status === 'unknown') return 'danger';
  if (status === 'outside_limits') return 'danger';
  if (fit === 'clipping_expected') return 'warn';
  if (fit === 'fully_utilized') return 'warn';
  if (fit === 'underutilized') return 'cool';
  return 'good';
}

function StatusBadge({ status, fit }: { status: Status | null; fit?: FitStatus }) {
  const { t } = useTranslation();
  if (!status) {
    return <span className="status" aria-hidden="true" />;
  }

  const tone = statusTone(status, fit);
  const text = status === 'unknown'
    ? t('status.unknown')
    : status === 'outside_limits'
      ? t('status.outside_limits')
      : fit
        ? t(`fit.${fit}` as TranslationKey)
        : t('status.electrical_ok');
  return <span className={`status status-${tone}`}>{text}</span>;
}

function verdictLabel(status: Status | null, fit?: FitStatus): string {
  if (!status) {
    return 'Not evaluated';
  }

  if (status === 'unknown') {
    return 'Unknown';
  }

  if (status === 'outside_limits') {
    return 'Outside limits';
  }

  if (fit) {
    return fit.replaceAll('_', ' ');
  }

  return 'Within limits';
}

type RelationshipKind = 'array_to_mppt' | 'mppt_to_battery_bank' | 'battery_to_inverter';

function formatReasonFallback(reason: string): string {
  const sentence = reason.replaceAll('_', ' ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
}

function getRelationshipVerdictSummary(
  kind: RelationshipKind,
  status: Status | null,
  fit: FitStatus | undefined,
  t: (key: TranslationKey, variables?: Record<string, string | number>) => string,
  reasons?: string[],
): string | null {
  if (!status) return null;
  const prefix = `relationship.${kind}.summary`;
  if (status === 'outside_limits') {
    const reason = reasons?.[0];
    if (reason) {
      return t(`relationship.${kind}.reason.${reason}` as TranslationKey);
    }
    return t(`${prefix}.outside_limits` as TranslationKey);
  }
  if (fit === 'optimal') return t(`${prefix}.optimal` as TranslationKey);
  if (fit === 'fully_utilized') return t(`${prefix}.fully_utilized` as TranslationKey);
  if (fit === 'clipping_expected') return t(`${prefix}.clipping_expected` as TranslationKey);
  if (fit === 'underutilized') return t(`${prefix}.underutilized` as TranslationKey);
  return t(`${prefix}.within_limits` as TranslationKey);
}

function getRelationshipVerdictLabel(
  kind: RelationshipKind,
  status: Status | null,
  fit: FitStatus | undefined,
  t: (key: TranslationKey, variables?: Record<string, string | number>) => string,
): string {
  if (!status) return t('status.not_evaluated');
  const prefix = `relationship.${kind}.label`;
  if (status === 'outside_limits') return t(`${prefix}.outside_limits` as TranslationKey);
  if (fit === 'optimal') return t(`${prefix}.optimal` as TranslationKey);
  if (fit === 'fully_utilized') return t(`${prefix}.fully_utilized` as TranslationKey);
  if (fit === 'clipping_expected') return t(`${prefix}.clipping_expected` as TranslationKey);
  if (fit === 'underutilized') return t(`${prefix}.underutilized` as TranslationKey);
  return t(`${prefix}.within_limits` as TranslationKey);
}

function explainRelationshipReason(
  kind: RelationshipKind,
  reason: string,
  t: (key: TranslationKey, variables?: Record<string, string | number>) => string,
): string {
  const key = `relationship.${kind}.reason.${reason}` as TranslationKey;
  try {
    return t(key);
  } catch {
    return formatReasonFallback(reason);
  }
}

function buildRelationshipReasonList(
  kind: RelationshipKind,
  reasons: string[],
  t: (key: TranslationKey, variables?: Record<string, string | number>) => string,
): string[] {
  return [...new Set(reasons.map((reason) => explainRelationshipReason(kind, reason, t)))];
}

function isMatchingRsMppt(inverterType: InverterType | null, mpptType: MpptType | null): boolean {
  if (!inverterType || !mpptType) {
    return false;
  }

  return inverterType.model.trim() !== '' && inverterType.model === mpptType.model && inverterType.model.toLowerCase().includes('rs');
}

function SummaryCard({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone?: 'good' | 'ok' | 'warn' | 'cool' | 'danger' | 'muted' }) {
  return (
    <article className="summary-card">
      <div className="summary-label">{label}</div>
      <div className={`summary-value${tone ? ` summary-value-${tone}` : ''}`}>{value}</div>
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
  stringVocCold: number;
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
      stringVocCold: 0,
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
  const coeff = panelType.temp_coefficient_voc_pct_per_c ?? -0.30;
  const stringVocCold = Number((panelsPerString * panelType.voc * (1 + (coeff / 100) * (-10 - 25))).toFixed(1));
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
    stringVocCold,
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
    stringVocCold: number;
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
  const shortCircuitCurrentLimit = getMpptShortCircuitCurrentLimit(mpptType);
  const outsideLimits = arrayConfig.stringVocCold > mpptType.max_voc
    || (mpptType.max_pv_input_current_a != null && arrayConfig.arrayCurrent > mpptType.max_pv_input_current_a)
    || arrayConfig.arrayIsc > shortCircuitCurrentLimit
    || chargeCurrent > mpptType.max_charge_current
    || powerRatio > 1.1;

  const reasons: string[] = [];
  if (arrayConfig.stringVocCold > mpptType.max_voc) reasons.push('voltage_too_high');
  if (mpptType.max_pv_input_current_a != null && arrayConfig.arrayCurrent > mpptType.max_pv_input_current_a) {
    reasons.push('pv_input_current_too_high');
  }
  if (arrayConfig.arrayIsc > shortCircuitCurrentLimit) {
    reasons.push('pv_short_circuit_current_too_high');
  }
  if (chargeCurrent > mpptType.max_charge_current) reasons.push('charge_current_too_high');
  if (powerRatio > 1.1) reasons.push('power_too_high');

  let fit: FitStatus | undefined;
  if (!outsideLimits) {
    if (powerRatio > 1.0) {
      fit = 'clipping_expected';
      reasons.push('clipping_expected');
    } else if (powerRatio >= 0.95) {
      fit = 'fully_utilized';
      reasons.push('fully_utilized');
    } else if (powerRatio >= 0.8) {
      fit = 'optimal';
      reasons.push('well_matched');
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
    reasons.push('This points to a small battery array for the selected month.');
    return {
      headline: 'Battery array is small',
      tone: 'warn',
      estimatedChargeCurrentA,
      estimatedHoursToFull,
      reasons,
    };
  }

  if (estimatedDaysToFull != null && estimatedDaysToFull > 4) {
    reasons.push(`In ${estimatedDailyYieldKwh.toLocaleString('en-US', { maximumFractionDigits: 1 })} kWh/day conditions the bank would need about ${estimatedDaysToFull} days to fill.`);
    reasons.push('This points to a large battery array for the selected month.');
    return {
      headline: 'Battery array is large',
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
  reasons.push('The battery array fits the selected month and upstream MPPT charging power.');
  return {
    headline: 'Battery array in range',
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
    `20% to 80% refill needs ${requiredRefillKwh.toLocaleString('en-US', { maximumFractionDigits: 2 })} kWh.`,
    `Best-month daily estimate is ${input.sunniestMonthDailyYieldKwh.toLocaleString('en-US', { maximumFractionDigits: 2 })} kWh/day.`,
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
    reasons.push('The battery array is small compared with the best-month daily solar yield.');
    return {
      headline: 'Battery array is small',
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

function getBatteryEvaluationCopy(input: {
  chargeCurrentExceeded: boolean;
  estimatedChargeCurrentA: number | null;
  maxChargeCurrentA: number | null;
  refillEnergyKwh: number | null;
  bestMonthDailyYieldKwh: number;
  batteryRefillRule: ReturnType<typeof evaluateBatteryRefillRule> | null;
  t: (key: TranslationKey, variables?: Record<string, string | number>) => string;
}): {
  headline: string;
  tone: 'good' | 'ok' | 'warn' | 'danger' | 'cool';
  reasons: string[];
} | null {
  const {
    chargeCurrentExceeded,
    estimatedChargeCurrentA,
    maxChargeCurrentA,
    refillEnergyKwh,
    bestMonthDailyYieldKwh,
    batteryRefillRule,
    t,
  } = input;

  if (chargeCurrentExceeded) {
    return {
      headline: t('battery.evaluation.headline.charge_current_limit'),
      tone: 'danger',
      reasons: [
        t('battery.evaluation.reason.charge_current_exceeded', {
          estimated: formatAmps(estimatedChargeCurrentA ?? 0),
          limit: formatAmps(maxChargeCurrentA ?? 0),
        }),
        t('battery.evaluation.reason.reduce_input'),
      ],
    };
  }

  if (!batteryRefillRule) {
    return null;
  }

  if (batteryRefillRule.headline === 'Battery capacity unknown') {
    return {
      headline: t('battery.evaluation.headline.capacity_unknown'),
      tone: batteryRefillRule.tone,
      reasons: [t('battery.evaluation.reason.capacity_unknown')],
    };
  }

  if (batteryRefillRule.headline === 'No solar refill available') {
    return {
      headline: t('battery.evaluation.headline.no_solar_refill'),
      tone: batteryRefillRule.tone,
      reasons: [t('battery.evaluation.reason.no_solar_refill')],
    };
  }

  const reasons = [
    t('battery.evaluation.reason.refill_needed', {
      required: (refillEnergyKwh ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 }),
    }),
    t('battery.evaluation.reason.best_month_daily_solar', {
      yield: bestMonthDailyYieldKwh.toLocaleString('en-US', { maximumFractionDigits: 2 }),
    }),
  ];

  if (batteryRefillRule.headline === 'Battery array too large for one-day refill') {
    return {
      headline: t('battery.evaluation.headline.too_large_one_day_refill'),
      tone: batteryRefillRule.tone,
      reasons: [...reasons, t('battery.evaluation.reason.too_large')],
    };
  }

  if (batteryRefillRule.headline === 'Battery array is small') {
    return {
      headline: t('battery.evaluation.headline.small'),
      tone: batteryRefillRule.tone,
      reasons: [...reasons, t('battery.evaluation.reason.small')],
    };
  }

  return {
    headline: t('battery.evaluation.headline.fits_rule'),
    tone: batteryRefillRule.tone,
    reasons: [...reasons, t('battery.evaluation.reason.fits_rule')],
  };
}

function getInverterEvaluationCopy(input: {
  compatibility: ReturnType<typeof evaluateInverterCompatibility> | null;
  t: (key: TranslationKey, variables?: Record<string, string | number>) => string;
}): {
  summary: string | null;
  label: string;
  reasons: string[];
} | null {
  const { compatibility, t } = input;
  if (!compatibility) {
    return null;
  }

  const summary = compatibility.status === 'outside_limits'
    ? t('inverter.evaluation.summary.outside_limits')
    : t('inverter.evaluation.summary.optimal');

  const label = compatibility.status === 'outside_limits'
    ? t('inverter.evaluation.label.outside_limits')
    : t('inverter.evaluation.label.optimal');

  const reasons = [...new Set(compatibility.reasons.map((reason) => {
    const key = `inverter.evaluation.reason.${reason}` as TranslationKey;
    try {
      return t(key);
    } catch {
      return formatReasonFallback(reason);
    }
  }))];

  return { summary, label, reasons };
}

function evaluateConverterBankCompatibility(
  batteryArrayConfig: {
    stringVoltage: number;
    maxDischargeCurrentA: number | null;
    maxDischargePowerW: number | null;
  },
  conversionDevices: ConversionDevice[],
): {
  status: Status;
  reasons: string[];
  totalContinuousPowerW: number;
  totalPeakPowerVA: number;
  estimatedCurrentA: number | null;
} {
  const totalContinuousPowerW = conversionDevices.reduce((sum, device) => sum + (device.continuous_power_w ?? 0), 0);
  const totalPeakPowerVA = conversionDevices.reduce((sum, device) => sum + (device.peak_power_va ?? 0), 0);
  const estimatedCurrentA = batteryArrayConfig.stringVoltage > 0 ? totalContinuousPowerW / batteryArrayConfig.stringVoltage : null;

  const missingDischargeLimit = batteryArrayConfig.maxDischargeCurrentA == null || batteryArrayConfig.maxDischargePowerW == null;
  const outsideLimits = !missingDischargeLimit
    && ((batteryArrayConfig.maxDischargeCurrentA != null && estimatedCurrentA != null && estimatedCurrentA > batteryArrayConfig.maxDischargeCurrentA)
    || (batteryArrayConfig.maxDischargePowerW != null && totalContinuousPowerW > batteryArrayConfig.maxDischargePowerW));

  const reasons: string[] = [];
  if (batteryArrayConfig.maxDischargeCurrentA == null) {
    reasons.push('battery_discharge_current_unknown');
  }
  if (batteryArrayConfig.maxDischargePowerW == null) {
    reasons.push('battery_discharge_power_unknown');
  }
  if (batteryArrayConfig.maxDischargeCurrentA != null && estimatedCurrentA != null && estimatedCurrentA > batteryArrayConfig.maxDischargeCurrentA) {
    reasons.push('converter_current_too_high_for_battery');
  }
  if (batteryArrayConfig.maxDischargePowerW != null && totalContinuousPowerW > batteryArrayConfig.maxDischargePowerW) {
    reasons.push('converter_power_too_high_for_battery');
  }
  if (!outsideLimits && !missingDischargeLimit) {
    reasons.push('well_matched');
  }

  return {
    status: missingDischargeLimit ? 'unknown' : (outsideLimits ? 'outside_limits' : 'within_limits'),
    reasons,
    totalContinuousPowerW,
    totalPeakPowerVA,
    estimatedCurrentA,
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
    || (batteryArrayConfig.maxDischargeCurrentA != null && inverterType.max_charge_current_a > batteryArrayConfig.maxDischargeCurrentA)
    || (batteryArrayConfig.maxDischargePowerW != null && inverterType.continuous_power_w > batteryArrayConfig.maxDischargePowerW);

  const reasons: string[] = [];
  if (batteryArrayConfig.stringVoltage > inverterType.input_voltage_v * 1.1) reasons.push('voltage_too_high');
  if (batteryArrayConfig.stringVoltage < inverterType.input_voltage_v * 0.85) reasons.push('voltage_too_low');
  if (batteryArrayConfig.maxDischargeCurrentA != null && inverterType.max_charge_current_a > batteryArrayConfig.maxDischargeCurrentA) {
    reasons.push('inverter_current_too_high_for_battery');
  }
  if (batteryArrayConfig.maxDischargePowerW != null && inverterType.continuous_power_w > batteryArrayConfig.maxDischargePowerW) {
    reasons.push('inverter_power_too_high_for_battery');
  }

  const fit: FitStatus | undefined = outsideLimits ? undefined : 'optimal';
  if (!outsideLimits) {
    reasons.push('well_matched');
  }

  return {
    status: outsideLimits ? 'outside_limits' : 'within_limits',
    fit,
    reasons,
  };
}

function parseLegacyHashRoute(hash: string): Route {
  if (hash === '' || hash === '/' || hash === '/location' || hash === '/surfaces') {
    return { kind: 'location' };
  }
  if (hash === '/production') return { kind: 'production' };
  if (hash === '/about') return { kind: 'about' };
  if (hash === '/catalogs') return { kind: 'catalogs' };
  if (hash === '/reports') return { kind: 'reports' };
  if (hash === '/reports/verdict-summary' || hash === '/verdict-summary') return { kind: 'verdict-summary' };
  if (hash === '/reports/cost-summary' || hash === '/cost-summary') return { kind: 'cost-summary' };
  if (hash === '/panel-types') return { kind: 'catalog', catalog: 'panel-types' };
  if (hash === '/conversion-devices') return { kind: 'catalog', catalog: 'conversion-devices' };
  if (hash === '/mppt-types') return { kind: 'catalog', catalog: 'mppt-types' };
  if (hash === '/battery-types') return { kind: 'catalog', catalog: 'battery-types' };
  if (hash === '/inverter-types') return { kind: 'catalog', catalog: 'conversion-devices' };
  if (hash === '/battery-array') return { kind: 'battery-array' };
  if (hash === '/consumption') return { kind: 'inverter-array' };
  if (hash === '/inverter-array') return { kind: 'inverter-array' };
  if (hash === '/load-circuits') return { kind: 'load-circuits' };
  if (hash === '/loads') return { kind: 'loads' };
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

function parseAppUrl(pathname: string, hash: string): ParsedAppUrl {
  const language = readLanguageFromPath(pathname);
  const segments = pathname.split('/').filter(Boolean);

  if (!language) {
    return {
      language: null,
      locationSlug: null,
      route: parseLegacyHashRoute(hash.replace(/^#/, '')),
    };
  }

  const [, locationSlug, ...rest] = segments;
  if (!locationSlug) {
    return { language, locationSlug: null, route: { kind: 'location' } };
  }

  if (rest.length === 0 || rest[0] === 'location' || rest[0] === 'surfaces') {
    return { language, locationSlug, route: { kind: 'location' } };
  }

  if (rest[0] === 'production') return { language, locationSlug, route: { kind: 'production' } };
  if (rest[0] === 'about') return { language, locationSlug, route: { kind: 'about' } };
  if (rest[0] === 'catalogs') {
    const catalog = rest[1];
    if (catalog === 'panel-types' || catalog === 'cabinet-types' || catalog === 'conversion-devices' || catalog === 'mppt-types' || catalog === 'battery-types' || catalog === 'inverter-types') {
      const resolvedCatalog = catalog === 'inverter-types' ? 'conversion-devices' : catalog;
      return { language, locationSlug, route: { kind: 'catalog', catalog: resolvedCatalog } };
    }
    return { language, locationSlug, route: { kind: 'catalogs' } };
  }
  if (rest[0] === 'reports') {
    if (rest[1] === 'verdict-summary') return { language, locationSlug, route: { kind: 'verdict-summary' } };
    if (rest[1] === 'cost-summary') return { language, locationSlug, route: { kind: 'cost-summary' } };
    return { language, locationSlug, route: { kind: 'reports' } };
  }
  if (rest[0] === 'battery-array') return { language, locationSlug, route: { kind: 'battery-array' } };
  if (rest[0] === 'consumption' && rest[1] === 'converters') {
    const converterId = rest[2];
    if (converterId) {
      const loadCircuitId = rest[3] === 'load-circuits' ? rest[4] : undefined;
      return {
        language,
        locationSlug,
        route: {
          kind: 'converter',
          converterId: decodeURIComponent(converterId),
          loadCircuitId: loadCircuitId ? decodeURIComponent(loadCircuitId) : undefined,
        },
      };
    }
  }
  if (rest[0] === 'consumption') return { language, locationSlug, route: { kind: 'inverter-array' } };
  if (rest[0] === 'inverter-array') return { language, locationSlug, route: { kind: 'inverter-array' } };
  if (rest[0] === 'load-circuits') return { language, locationSlug, route: { kind: 'load-circuits' } };
  if (rest[0] === 'loads') return { language, locationSlug, route: { kind: 'loads' } };

  const [surfaceId] = rest;
  if (surfaceId && !RESERVED_ROUTE_SEGMENTS.has(surfaceId)) {
    return { language, locationSlug, route: { kind: 'surface', surfaceId: decodeURIComponent(surfaceId) } };
  }

  return { language, locationSlug, route: { kind: 'location' } };
}

function buildRoutePath(route: Route, language: LanguageCode, locationSlug: string): string {
  const base = `/${language}/${locationSlug}`;

  if (route.kind === 'location') return base;
  if (route.kind === 'production') return `${base}/production`;
  if (route.kind === 'about') return `${base}/about`;
  if (route.kind === 'catalogs') return `${base}/catalogs`;
  if (route.kind === 'reports') return `${base}/reports`;
  if (route.kind === 'catalog') return `${base}/catalogs/${route.catalog}`;
  if (route.kind === 'verdict-summary') return `${base}/reports/verdict-summary`;
  if (route.kind === 'cost-summary') return `${base}/reports/cost-summary`;
  if (route.kind === 'battery-array') return `${base}/battery-array`;
  if (route.kind === 'inverter-array') return `${base}/consumption`;
  if (route.kind === 'converter') {
    const converterPath = `${base}/consumption/converters/${encodeURIComponent(route.converterId)}`;
    return route.loadCircuitId
      ? `${converterPath}/load-circuits/${encodeURIComponent(route.loadCircuitId)}`
      : converterPath;
  }
  if (route.kind === 'load-circuits') return `${base}/load-circuits`;
  if (route.kind === 'loads') return `${base}/loads`;
  return `${base}/${encodeURIComponent(route.surfaceId)}`;
}

function getCurrentPathContext(): { language: LanguageCode; locationSlug: string } {
  const parsed = parseAppUrl(window.location.pathname, window.location.hash);
  return {
    language: parsed.language ?? 'en',
    locationSlug: parsed.locationSlug ?? 'project',
  };
}

function navigateTo(route: Route, options?: { language?: LanguageCode; locationSlug?: string; replace?: boolean }): void {
  const current = getCurrentPathContext();
  const nextLanguage = options?.language ?? current.language;
  const nextLocationSlug = options?.locationSlug ?? current.locationSlug;
  const nextPath = buildRoutePath(route, nextLanguage, nextLocationSlug);

  if (options?.replace) {
    window.history.replaceState(null, '', nextPath);
  } else {
    window.history.pushState(null, '', nextPath);
  }

  window.dispatchEvent(new PopStateEvent('popstate'));
}

function routeHref(route: Route, options?: { language?: LanguageCode; locationSlug?: string }): string {
  const current = getCurrentPathContext();
  return buildRoutePath(
    route,
    options?.language ?? current.language,
    options?.locationSlug ?? current.locationSlug,
  );
}

function sidebarIcon(kind: 'location' | 'surface' | 'production' | 'storage' | 'consumption' | 'battery-array' | 'inverter-array' | 'load-circuits' | 'loads' | 'catalogs' | 'catalog' | 'reports' | 'report-verdict' | 'report-cost' | 'about' | 'new-project'): React.ReactNode {
  const icon = (name: string) => (
    <img
      src={`/icons/fa-energy/${name}.svg`}
      alt=""
      aria-hidden="true"
      className="sidebar-nav-icon-image"
    />
  );

  switch (kind) {
    case 'location':
      return icon('house');
    case 'surface':
      return icon('solar-panel');
    case 'production':
      return icon('bolt-lightning');
    case 'storage':
      return icon('server');
    case 'consumption':
      return icon('plug');
    case 'battery-array':
      return icon('server');
    case 'inverter-array':
      return icon('wave-square');
    case 'load-circuits':
      return icon('sitemap');
    case 'loads':
      return icon('plug-circle-bolt');
    case 'catalogs':
      return icon('table-list');
    case 'catalog':
      return icon('table-list');
    case 'reports':
      return icon('book-open');
    case 'report-verdict':
      return icon('balance-scale');
    case 'report-cost':
      return icon('eur');
    case 'about':
      return icon('circle-info');
    case 'new-project':
      return icon('square-plus');
  }
}

function Sidebar({
  route,
  data,
  isMobileOpen,
  isCollapsed,
  onToggleCollapse,
  onNavigate,
}: {
  route: Route;
  data: DigitalTwinExport | null;
  isMobileOpen: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate: () => void;
}) {
  const { t } = useTranslation();
  const [openSections, setOpenSections] = useState<{ production: boolean; consumption: boolean; catalogs: boolean; reports: boolean }>({
    production: route.kind === 'production' || route.kind === 'surface',
    consumption: route.kind === 'inverter-array' || route.kind === 'converter' || route.kind === 'load-circuits' || route.kind === 'loads',
    catalogs: route.kind === 'catalogs' || route.kind === 'catalog',
    reports: route.kind === 'reports' || route.kind === 'verdict-summary' || route.kind === 'cost-summary',
  });

  const go = (next: Route) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    navigateTo(next);
    onNavigate();
  };
  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }));
  };
  const sectionClick = (section: keyof typeof openSections, next: Route) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    toggleSection(section);
    navigateTo(next);
    onNavigate();
  };
  const labelFor = (label: string) => (isCollapsed ? label : undefined);

  function NavLink({
    href,
    label,
    icon,
    active,
    onClick,
    hasChildren = false,
    childOpen = false,
    className = '',
  }: {
    href: string;
    label: string;
    icon: React.ReactNode;
    active: boolean;
    onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
    hasChildren?: boolean;
    childOpen?: boolean;
    className?: string;
  }) {
    return (
      <a
        href={href}
        onClick={onClick}
        className={`sidebar-nav-item ${active ? 'active' : ''} ${className}`.trim()}
        aria-label={label}
        title={labelFor(label)}
        aria-current={active ? 'page' : undefined}
      >
        <span className="sidebar-nav-icon" aria-hidden="true">{icon}</span>
        <span className="sidebar-nav-label">{label}</span>
        {hasChildren ? (
          <span className="sidebar-nav-chevron" aria-hidden="true">{childOpen ? '▾' : '▸'}</span>
        ) : null}
      </a>
    );
  }

  function DisabledItem({ label, icon }: { label: string; icon: React.ReactNode }) {
    return (
      <span
        className="sidebar-nav-item sidebar-nav-disabled"
        aria-label={label}
        title={labelFor(label)}
      >
        <span className="sidebar-nav-icon" aria-hidden="true">{icon}</span>
        <span className="sidebar-nav-label">{label}</span>
      </span>
    );
  }

  return (
    <aside className={`sidebar ${isMobileOpen ? 'sidebar-open' : ''} ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-logo">
        <div>
          <div className="sidebar-logo-text">OffGridOS</div>
          <div className="sidebar-logo-sub">Digital Twin</div>
        </div>
        <div className="sidebar-logo-actions">
          <button
            type="button"
            className="sidebar-collapse-button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? t('ui.expand_menu') : t('ui.collapse_menu')}
            title={isCollapsed ? t('ui.expand_menu') : t('ui.collapse_menu')}
          >
            <span aria-hidden="true">{isCollapsed ? '▸' : '◂'}</span>
          </button>
          <button
            type="button"
            className="sidebar-close-button"
            onClick={onNavigate}
            aria-label={t('ui.close_menu')}
          >
            ×
          </button>
        </div>
      </div>
      <nav className="sidebar-nav">
        <NavLink
          href={routeHref({ kind: 'location' })}
          onClick={go({ kind: 'location' })}
          label={t('nav.location')}
          icon={sidebarIcon('location')}
          active={route.kind === 'location'}
        />
        <NavLink
          href={routeHref({ kind: 'production' })}
          onClick={sectionClick('production', { kind: 'production' })}
          label={t('nav.production')}
          icon={sidebarIcon('production')}
          active={route.kind === 'production' || route.kind === 'surface'}
          hasChildren
          childOpen={openSections.production}
        />
        {data && openSections.production ? (
          <div className="sidebar-subnav">
            {data.entities.surfaces.map((surface) => (
              <a
                key={surface.surface_id}
                href={routeHref({ kind: 'surface', surfaceId: surface.surface_id })}
                onClick={go({ kind: 'surface', surfaceId: surface.surface_id })}
                className={`sidebar-subnav-item ${route.kind === 'surface' && route.surfaceId === surface.surface_id ? 'active' : ''}`}
                aria-label={readSurfaceLabel(surface)}
                title={labelFor(readSurfaceLabel(surface))}
                aria-current={route.kind === 'surface' && route.surfaceId === surface.surface_id ? 'page' : undefined}
              >
                <span className="sidebar-nav-icon" aria-hidden="true">{sidebarIcon('surface')}</span>
                <span className="sidebar-nav-label">{readSurfaceLabel(surface)}</span>
              </a>
            ))}
          </div>
        ) : null}
        <NavLink
          href={routeHref({ kind: 'battery-array' })}
          onClick={go({ kind: 'battery-array' })}
          label={t('nav.storage')}
          icon={sidebarIcon('storage')}
          active={route.kind === 'battery-array'}
        />
        <NavLink
          href={routeHref({ kind: 'inverter-array' })}
          onClick={sectionClick('consumption', { kind: 'inverter-array' })}
          label={t('nav.consumption')}
          icon={sidebarIcon('consumption')}
          active={route.kind === 'inverter-array' || route.kind === 'converter' || route.kind === 'load-circuits' || route.kind === 'loads'}
          hasChildren
          childOpen={openSections.consumption}
        />
        {data && openSections.consumption ? (
          <div className="sidebar-subnav">
            {AC_ROUTES.filter((r) => r.kind !== 'battery-array').map((acRoute) => (
              <a
                key={acRoute.kind}
                href={routeHref({ kind: acRoute.kind })}
                onClick={go({ kind: acRoute.kind })}
                className={`sidebar-subnav-item ${route.kind === acRoute.kind ? 'active' : ''}`}
                aria-label={t(acRoute.labelKey)}
                title={t(acRoute.labelKey)}
                aria-current={route.kind === acRoute.kind ? 'page' : undefined}
              >
                <span className="sidebar-nav-icon" aria-hidden="true">
                  {acRoute.kind === 'load-circuits'
                    ? sidebarIcon('load-circuits')
                    : acRoute.kind === 'loads'
                      ? sidebarIcon('loads')
                      : sidebarIcon('inverter-array')}
                </span>
                <span className="sidebar-nav-label">{t(acRoute.labelKey)}</span>
              </a>
            ))}
          </div>
        ) : null}
        <NavLink
          href={routeHref({ kind: 'reports' })}
          onClick={sectionClick('reports', { kind: 'reports' })}
          label={t('nav.reports')}
          icon={sidebarIcon('reports')}
          active={route.kind === 'reports' || route.kind === 'verdict-summary' || route.kind === 'cost-summary'}
          hasChildren
          childOpen={openSections.reports}
        />
        {data && openSections.reports ? (
          <div className="sidebar-subnav">
            {REPORT_ROUTES.map((report) => (
              <a
                key={report.kind}
                href={routeHref({ kind: report.kind })}
                onClick={go({ kind: report.kind })}
                className={`sidebar-subnav-item ${route.kind === report.kind ? 'active' : ''}`}
                aria-label={t(report.labelKey)}
                title={t(report.labelKey)}
                aria-current={route.kind === report.kind ? 'page' : undefined}
              >
                <span className="sidebar-nav-icon" aria-hidden="true">{report.kind === 'cost-summary' ? sidebarIcon('report-cost') : sidebarIcon('report-verdict')}</span>
                <span className="sidebar-nav-label">{t(report.labelKey)}</span>
              </a>
            ))}
          </div>
        ) : null}
        <NavLink
          href={routeHref({ kind: 'catalogs' })}
          onClick={sectionClick('catalogs', { kind: 'catalogs' })}
          label={t('nav.catalogs')}
          icon={sidebarIcon('catalogs')}
          active={route.kind === 'catalogs' || route.kind === 'catalog'}
          hasChildren
          childOpen={openSections.catalogs}
        />
        {data && openSections.catalogs ? (
          <div className="sidebar-subnav">
            {CATALOG_ROUTES.map((catalog) => (
              <a
                key={catalog.catalog}
                href={routeHref({ kind: 'catalog', catalog: catalog.catalog })}
                onClick={go({ kind: 'catalog', catalog: catalog.catalog })}
                className={`sidebar-subnav-item ${route.kind === 'catalog' && route.catalog === catalog.catalog ? 'active' : ''}`}
                aria-label={t(catalog.labelKey)}
                title={t(catalog.labelKey)}
                aria-current={route.kind === 'catalog' && route.catalog === catalog.catalog ? 'page' : undefined}
              >
                <span className="sidebar-nav-icon" aria-hidden="true">{sidebarIcon('catalogs')}</span>
                <span className="sidebar-nav-label">{t(catalog.labelKey)}</span>
              </a>
            ))}
          </div>
        ) : null}
      </nav>
      <div className="sidebar-footer">
        <DisabledItem label={t('nav.new_project')} icon={sidebarIcon('new-project')} />
        <NavLink
          href={routeHref({ kind: 'about' })}
          onClick={go({ kind: 'about' })}
          label={t('nav.about')}
          icon={sidebarIcon('about')}
          active={route.kind === 'about'}
        />
        <span className="sidebar-footer-stamp">{typeof __BUILD_INFO__ !== 'undefined' ? __BUILD_INFO__ : ''}</span>
      </div>
    </aside>
  );
}

function AppLanguageControl({ route, locationSlug }: { route: Route; locationSlug: string }) {
  const { language, setLanguage, t } = useTranslation();
  return (
    <div className="app-language" role="group" aria-label={t('ui.language')}>
      {LANGUAGE_OPTIONS.map((option) => {
        const isActive = option === language;
        return (
          <button
            key={option}
            type="button"
            className={`app-language-option${isActive ? ' app-language-option-active' : ''}`}
            aria-pressed={isActive}
            aria-label={t(`language.${option}` as TranslationKey)}
            onClick={() => {
              if (isActive) return;
              const nextLanguage = option as LanguageCode;
              setLanguage(nextLanguage);
              navigateTo(route, { language: nextLanguage, locationSlug, replace: true });
            }}
          >
            {option.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

function getRouteTitle(route: Route, data: DigitalTwinExport | null, t: (key: TranslationKey, variables?: Record<string, string | number>) => string): string {
  switch (route.kind) {
    case 'location':
      return t('page.location');
    case 'production':
      return t('page.production');
    case 'battery-array':
      return t('page.battery_array');
    case 'inverter-array':
      return t('page.consumption');
    case 'converter':
      return t('page.converters');
    case 'load-circuits':
      return t('page.load_circuits');
    case 'loads':
      return t('page.loads');
    case 'catalogs':
      return t('page.catalogs');
    case 'reports':
      return t('page.reports');
    case 'about':
      return t('page.about');
    case 'catalog': {
      const catalog = CATALOG_ROUTES.find((item) => item.catalog === route.catalog);
      return catalog ? t(catalog.labelKey) : t('page.catalogs');
    }
    case 'verdict-summary':
      return t('page.report.verdict_summary');
    case 'cost-summary':
      return t('page.report.cost_summary');
    case 'surface':
      return t('page.surface');
    default:
      return data ? t('page.location') : t('page.location');
  }
}

function getRouteContext(route: Route, data: DigitalTwinExport | null, t: (key: TranslationKey, variables?: Record<string, string | number>) => string): string {
  switch (route.kind) {
    case 'location':
      return t('page.location.context');
    case 'production':
      return t('page.production.context');
    case 'battery-array':
      return t('page.battery_array.context');
    case 'inverter-array':
      return t('page.consumption.context');
    case 'converter':
      return t('page.converters.context');
    case 'load-circuits':
      return t('page.load_circuits.context');
    case 'loads':
      return t('page.loads.context');
    case 'catalogs':
      return t('page.catalogs.context');
    case 'reports':
      return t('page.reports.context');
    case 'about':
      return t('page.about.context');
    case 'catalog': {
      if (route.catalog === 'conversion-devices') return '';
      return '';
    }
    case 'verdict-summary':
      return '';
    case 'cost-summary':
      return '';
    case 'surface':
      return t('page.surface.context');
    default:
      return data ? t('page.location.context') : t('page.location.context');
  }
}

function PageHeader({
  route,
  data,
  locationSlug,
  title,
  context,
}: {
  route: Route;
  data: DigitalTwinExport | null;
  locationSlug: string;
  title?: string;
  context?: string;
}) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? getRouteTitle(route, data, t);
  const resolvedContext = context ?? getRouteContext(route, data, t);

  return (
    <div className="page-header">
      <div className="page-header-main">
        <Breadcrumbs route={route} data={data} locationSlug={locationSlug} />
        <h2 className="topbar-title">{resolvedTitle}</h2>
        {resolvedContext ? <p className="page-header-context">{resolvedContext}</p> : null}
      </div>
      <AppLanguageControl route={route} locationSlug={locationSlug} />
    </div>
  );
}

function AppFrame({
  route,
  data,
  locationSlug,
  title,
  context,
  isMobileSidebarOpen,
  isSidebarCollapsed,
  openMobileSidebar,
  closeMobileSidebar,
  toggleSidebarCollapsed,
  children,
}: {
  route: Route;
  data: DigitalTwinExport | null;
  locationSlug: string;
  title?: string;
  context?: string;
  isMobileSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  toggleSidebarCollapsed: () => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="layout">
      {isMobileSidebarOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={closeMobileSidebar}
          aria-label={t('ui.close_menu')}
        />
      ) : null}
      <Sidebar
        route={route}
        data={data}
        isMobileOpen={isMobileSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
        onNavigate={closeMobileSidebar}
      />
      <main className="app-shell">
        <div className="app-shell-header">
          <button
            type="button"
            className="mobile-menu-button"
            onClick={openMobileSidebar}
            aria-label={t('ui.open_menu')}
            aria-expanded={isMobileSidebarOpen}
          >
            <span aria-hidden="true">☰</span>
          </button>
        </div>
        {route.kind !== 'surface' ? <PageHeader route={route} data={data} locationSlug={locationSlug} title={title} context={context} /> : null}
        {children}
      </main>
    </div>
  );
}

function Breadcrumbs({ route, data, locationSlug }: { route: Route; data: DigitalTwinExport | null; locationSlug: string }) {
  const { t } = useTranslation();
  const projectLabel = data ? getLocationDisplayName(data, t) : t('breadcrumbs.project');

  const crumbs: Array<{ label: string; route?: Route; current?: boolean }> = [
    {
      label: projectLabel,
      route: { kind: 'location' },
    },
  ];

  switch (route.kind) {
    case 'location':
      crumbs.push({ label: t('page.location'), current: true });
      break;
    case 'production':
      crumbs.push({ label: t('page.production'), current: true });
      break;
    case 'battery-array':
      crumbs.push({ label: t('page.storage'), route: { kind: 'battery-array' } });
      crumbs.push({ label: t('page.battery_array'), current: true });
      break;
    case 'inverter-array':
      crumbs.push({ label: t('page.consumption'), current: true });
      break;
    case 'converter': {
      crumbs.push({ label: t('page.consumption'), route: { kind: 'inverter-array' } });
      const converterLabel = data ? getConversionDeviceDisplayName(data, route.converterId) : route.converterId;
      if (route.loadCircuitId) {
        crumbs.push({ label: converterLabel, route: { kind: 'converter', converterId: route.converterId } });
        const loadCircuitLabel = data?.entities.load_circuits.find((item) => item.load_circuit_id === route.loadCircuitId)?.title ?? route.loadCircuitId;
        crumbs.push({ label: loadCircuitLabel, current: true });
      } else {
        crumbs.push({ label: converterLabel, current: true });
      }
      break;
    }
    case 'load-circuits':
      crumbs.push({ label: t('page.consumption'), route: { kind: 'inverter-array' } });
      crumbs.push({ label: t('page.load_circuits'), current: true });
      break;
    case 'loads':
      crumbs.push({ label: t('page.consumption'), route: { kind: 'inverter-array' } });
      crumbs.push({ label: t('page.loads'), current: true });
      break;
    case 'catalogs':
      crumbs.push({ label: t('page.catalogs'), current: true });
      break;
    case 'reports':
      crumbs.push({ label: t('page.reports'), current: true });
      break;
    case 'about':
      crumbs.push({ label: t('page.about'), current: true });
      break;
    case 'catalog': {
      const catalog = CATALOG_ROUTES.find((item) => item.catalog === route.catalog);
      crumbs.push({ label: t('page.catalogs'), route: { kind: 'catalogs' } });
      crumbs.push({ label: catalog ? t(catalog.labelKey) : t('page.catalogs'), current: true });
      break;
    }
    case 'verdict-summary':
      crumbs.push({ label: t('page.reports'), current: true });
      break;
    case 'cost-summary':
      crumbs.push({ label: t('page.reports'), route: { kind: 'reports' } });
      crumbs.push({ label: t('page.report.cost_summary'), current: true });
      break;
    case 'surface':
      crumbs.push({ label: t('page.production'), route: { kind: 'production' } });
      crumbs.push({ label: data ? getSurfaceDisplayName(data, route.surfaceId) : route.surfaceId, current: true });
      break;
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {crumbs.map((crumb, index) => (
        <React.Fragment key={`${crumb.label}-${index}`}>
          {index > 0 ? <span className="crumb-sep">/</span> : null}
          {crumb.current || !crumb.route ? (
            <span className="crumb crumb-current">{crumb.label}</span>
          ) : (
            <a
              className="crumb crumb-link"
              href={routeHref(crumb.route, { locationSlug })}
              onClick={(event) => {
                event.preventDefault();
                navigateTo(crumb.route!, { locationSlug });
              }}
            >
              {crumb.label}
            </a>
          )}
        </React.Fragment>
      ))}
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
  const { t } = useTranslation();
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
      <>
        <PageHeader
          route={{ kind: 'surface', surfaceId }}
          data={data}
          locationSlug={getLocationSlug(data)}
          title={t('surface.not_found.title')}
          context={t('surface.not_found.description', { surfaceId })}
        />
        <section className="panel error-panel">
          <p style={{ margin: 0 }}>{t('surface.not_found.description', { surfaceId })}</p>
        </section>
      </>
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
  const mpptVerdictSummary = getRelationshipVerdictSummary('array_to_mppt', mpptCompatibility?.status ?? null, mpptCompatibility?.fit, t, mpptCompatibility?.reasons);
  const mpptReasonLines = mpptCompatibility ? buildRelationshipReasonList('array_to_mppt', mpptCompatibility.reasons, t) : [];
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
  const estimatedBestMonth = estimatedYieldRows.length > 0
    ? estimatedYieldRows.reduce((best, row) => (row.monthlyKwh > best.monthlyKwh ? row : best), estimatedYieldRows[0])
    : null;
  const estimatedWorstMonth = estimatedYieldRows.length > 0
    ? estimatedYieldRows.reduce((worst, row) => (row.monthlyKwh < worst.monthlyKwh ? row : worst), estimatedYieldRows[0])
    : null;

  async function handleSaveSurfaceDetails(options?: { photoOverride?: string | null }) {
    const trimmedName = surfaceNameDraft.trim();
    const nameToPersist = trimmedName || surface.name;
    const descriptionToPersist = surfaceDescription.trim();
    const photoToPersist = options?.photoOverride === undefined ? photo : options.photoOverride;
    const areaHeightM = surfaceAreaHeightDraft.trim() === '' ? null : Number(surfaceAreaHeightDraft);
    const areaWidthM = surfaceAreaWidthDraft.trim() === '' ? null : Number(surfaceAreaWidthDraft);

    if (!nameToPersist) {
      setSurfaceSaveError(t('surface.save.error.required_name'));
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

      setSurfaceSaveMessage(t('surface.save.success'));
      await refreshProjectData();
    } catch (error) {
      setSurfaceSaveError(error instanceof Error ? error.message : t('surface.save.error.failed'));
      setSurfaceSaveMessage(null);
    } finally {
      setIsSavingSurface(false);
    }
  }

  async function handleDeleteSurface() {
    if (!window.confirm(t('location.surface.delete.confirm', { name: surface.name }))) return;

    setSurfaceSaveError(null);
    setSurfaceSaveMessage(null);

    try {
      const response = await fetch(`/api/surfaces/${encodeURIComponent(surfaceId)}`, { method: 'DELETE' });
      const payload = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? `Failed to delete surface (${response.status})`);
      }

      navigateTo({ kind: 'location' }, { locationSlug: getLocationSlug(data) });
      await refreshProjectData();
    } catch (error) {
      setSurfaceSaveError(error instanceof Error ? error.message : t('location.surface.delete.error'));
    }
  }

  async function handleSavePanelSetup() {
    if (configuredPanelCount > 0 && !selectedPanelTypeId) {
      setPanelSaveError(t('surface.panel.save.error.required'));
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
          ? t('surface.panel.save.success')
          : t('surface.panel.save.success.removed'),
      );
      await refreshProjectData();
    } catch (error) {
      setPanelSaveError(error instanceof Error ? error.message : t('surface.panel.save.error.failed'));
      setPanelSaveMessage(null);
    } finally {
      setIsSavingPanels(false);
    }
  }

  async function handleSaveSurfaceDesign() {
    if (configuredPanelCount === 0) {
      if (panelsPerString !== 0 || parallelStrings !== 0) {
        setSurfaceDesignSaveError(t('surface.panel_array.save.error.zero_layout'));
        setSurfaceDesignSaveMessage(null);
        return;
      }
    } else if (panelsPerString <= 0 || parallelStrings <= 0 || panelsPerString * parallelStrings !== configuredPanelCount) {
      setSurfaceDesignSaveError(t('surface.panel_array.save.error.mismatch'));
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

      setSurfaceDesignSaveMessage(t('surface.panel_array.save.success'));
      await refreshProjectData();
    } catch (error) {
      setSurfaceDesignSaveError(error instanceof Error ? error.message : t('surface.panel_array.save.error.failed'));
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
    <>
      <PageHeader
        route={{ kind: 'surface', surfaceId }}
        data={data}
        locationSlug={getLocationSlug(data)}
        title={surface.name}
        context={t('page.surface.context')}
      />
      <section className="detail-shell">
      <div className="detail-grid detail-intro-grid">
        <section className="panel panel-span-2 panel-with-actions">
          <div className="section-head">
            <h2>{t('surface.info.title')}</h2>
          </div>
          {surfaceSaveError ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--danger)' }}>{surfaceSaveError}</p> : null}
          {surfaceSaveMessage ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--accent-strong)' }}>{surfaceSaveMessage}</p> : null}
          <div className="roof-config-inline row-synced-wrap">
            <label className="config-field">
              <span>{t('surface.name')}</span>
              <input
                type="text"
                value={surfaceNameDraft}
                onChange={(event) => setSurfaceNameDraft(event.target.value)}
              />
            </label>
            <label className="config-field config-field-span-2">
              <span>{t('surface.description')}</span>
              <input
                type="text"
                value={surfaceDescription}
                onChange={(event) => setSurfaceDescription(event.target.value)}
              />
            </label>
            <label className="config-field">
              <span>{t('surface.height')}</span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={surfaceAreaHeightDraft}
                onChange={(event) => setSurfaceAreaHeightDraft(event.target.value)}
              />
            </label>
            <label className="config-field">
              <span>{t('surface.width')}</span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={surfaceAreaWidthDraft}
                onChange={(event) => setSurfaceAreaWidthDraft(event.target.value)}
              />
            </label>
            <label className="config-field">
              <span>{t('surface.azimuth')}</span>
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
              <span>{t('surface.tilt')}</span>
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
              {isSavingSurface ? t('common.saving') : t('common.save')}
            </button>
            <button type="button" className="button button-danger button-sm" onClick={() => void handleDeleteSurface()} disabled={isSavingSurface}>
              {t('common.delete')}
            </button>
          </div>
        </section>

        <section className="panel panel-with-actions">
          <div className="section-head">
            <h2>{t('surface.photo.title')}</h2>
          </div>
          {photo ? (
            <ExpandablePhoto
              src={photo}
              alt={`${surfaceNameDraft || surface.name} surface`}
              removeLabel={t('common.remove')}
              onRemove={() => {
                setPhoto(null);
                void handleSaveSurfaceDetails({ photoOverride: null });
              }}
            />
          ) : (
            <label className="upload-dropzone">
              <span>{t('surface.photo.upload')}</span>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
            </label>
          )}
          <div className="button-row button-row-end">
            <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveSurfaceDetails()} disabled={isSavingSurface}>
              {isSavingSurface ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </section>
      </div>

      <section className="detail-grid storage-detail-grid">
        <section className="panel panel-with-actions">
          <div className="section-head">
            <h2>{t('surface.panel.title')}</h2>
          </div>
          {panelSaveError ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--danger)' }}>{panelSaveError}</p> : null}
          {panelSaveMessage ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--accent-strong)' }}>{panelSaveMessage}</p> : null}
          <div className="fit-card">
            <div className="panel-config-grid config-control-row row-synced-wrap">
              <label className="config-field config-field-span-2">
                <span>{t('surface.panel.selected')}</span>
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
                <span>{t('surface.panel.count')}</span>
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
              <p className="fit-note">{t('surface.panel.empty')}</p>
            )}
          </div>
          <div className="button-row button-row-end">
            <button type="button" className="button button-secondary button-sm" onClick={() => void handleSavePanelSetup()} disabled={isSavingPanels}>
              {isSavingPanels ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </section>

        <section className="panel panel-with-actions">
          <div className="section-head">
            <h2>{t('surface.panel_array.title')}</h2>
          </div>
          {surfaceDesignSaveError ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--danger)' }}>{surfaceDesignSaveError}</p> : null}
          {surfaceDesignSaveMessage ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--accent-strong)' }}>{surfaceDesignSaveMessage}</p> : null}
          {arrayConfig?.configuredPanelCount ? (
            <>
              <div className="fit-card">
                <div className="config-grid config-control-row row-synced-wrap">
                  <label className="config-field">
                    <span>{t('surface.panel_array.panels_per_string')}</span>
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
                    <span>{t('surface.panel_array.parallel_strings')}</span>
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
                    <dt>{t('surface.panel_array.stat.voc')}</dt>
                    <dd>{formatVolts(arrayConfig.stringVoc)}</dd>
                  </div>
                  <div>
                    <dt>{t('surface.panel_array.stat.voc_cold')}</dt>
                    <dd>{formatVolts(arrayConfig.stringVocCold)}</dd>
                  </div>
                  <div>
                    <dt>{t('surface.panel_array.stat.voltage')}</dt>
                    <dd>{formatVolts(arrayConfig.stringVmp)}</dd>
                  </div>
                  <div>
                    <dt>{t('surface.panel_array.stat.isc')}</dt>
                    <dd>{formatAmps(arrayConfig.arrayIsc)}</dd>
                  </div>
                  <div>
                    <dt>{t('surface.panel_array.stat.power')}</dt>
                    <dd>{formatWp(arrayConfig.arrayPower)}</dd>
                  </div>
                </dl>
              </div>
              <div className="button-row button-row-end">
                <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveSurfaceDesign()} disabled={isSavingSurfaceDesign}>
                  {isSavingSurfaceDesign ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </>
          ) : (
            <p className="fit-note">{t('surface.panel_array.empty')}</p>
          )}
        </section>

        <section className="panel panel-with-actions">
          <div className="section-head">
            <h2>{t('surface.mppt.title')}</h2>
          </div>
          {arrayConfig?.configuredPanelCount ? (
            <>
              <div className="fit-card">
                <div className="config-grid config-control-row mppt-config-row row-synced-wrap">
                  <label className="config-field config-field-span-3">
                    <span>{t('surface.mppt.selected')}</span>
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
                      <dt>{t('surface.mppt.stat.max_voc')}</dt>
                      <dd>{formatVolts(selectedMpptType.max_voc)}</dd>
                    </div>
                    <div>
                      <dt>{t('surface.mppt.stat.trackers')}</dt>
                      <dd>{selectedMpptType.tracker_count}</dd>
                    </div>
                    <div>
                      <dt>{t('surface.mppt.stat.power_per_tracker')}</dt>
                      <dd>{formatWp(selectedMpptType.max_pv_power / Math.max(selectedMpptType.tracker_count, 1))}</dd>
                    </div>
                    <div>
                      <dt>{t('surface.mppt.stat.max_power')}</dt>
                      <dd>{formatWp(selectedMpptType.max_pv_power)}</dd>
                    </div>
                    <div>
                      <dt>{t('surface.mppt.stat.max_charge_current')}</dt>
                      <dd>{formatAmps(selectedMpptType.max_charge_current)}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="fit-note">{t('surface.mppt.attributes.empty')}</p>
                )}
              </div>
              <div className="button-row button-row-end">
                <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveSurfaceDesign()} disabled={isSavingSurfaceDesign}>
                  {isSavingSurfaceDesign ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </>
          ) : (
            <p className="fit-note">{t('surface.mppt.empty')}</p>
          )}
        </section>

        <section className="panel panel-span-2 balanced-row-panel summary-panel">
          {panelType ? (
            <div className="fit-card">
              {arrayConfig ? (
                <div className="evaluation-section">
                  <div className="outcome-panel">
                    <div className="outcome-summary">
                      <div className="outcome-status-line">
                        <p className="result-label">{t('surface.evaluation.label')}</p>
                        <StatusBadge status={mpptCompatibility?.status ?? 'outside_limits'} fit={mpptCompatibility?.fit} />
                      </div>
                      {mpptVerdictSummary ? <p className="fit-note">{mpptVerdictSummary}</p> : null}
                      <ul className="reason-list">
                        {mpptReasonLines.map((reason) => <li key={reason}>{reason}</li>)}
                      </ul>
                    </div>
                    {mpptCompatibility && selectedMpptType ? (
                      <dl className="detail-stats outcome-checks">
                        <div className={arrayConfig.stringVocCold > selectedMpptType.max_voc ? 'check-fail' : 'check-pass'}>
                          <dt>{t('surface.evaluation.check.voltage')}</dt>
                          <dd>{formatVolts(arrayConfig.stringVocCold)} / {formatVolts(selectedMpptType.max_voc)}</dd>
                        </div>
                        <div className={arrayConfig.arrayPower > selectedMpptType.max_pv_power / Math.max(selectedMpptType.tracker_count, 1) * 1.1 ? 'check-fail' : 'check-pass'}>
                          <dt>{t('surface.evaluation.check.power_per_tracker')}</dt>
                          <dd>{formatWp(arrayConfig.arrayPower)} / {formatWp(selectedMpptType.max_pv_power / Math.max(selectedMpptType.tracker_count, 1))}</dd>
                        </div>
                        <div className={selectedMpptType.max_pv_input_current_a != null && arrayConfig.arrayCurrent > selectedMpptType.max_pv_input_current_a ? 'check-fail' : 'check-pass'}>
                          <dt>{t('surface.evaluation.check.input_current')}</dt>
                          <dd>{formatAmps(arrayConfig.arrayCurrent)} / {selectedMpptType.max_pv_input_current_a != null ? formatAmps(selectedMpptType.max_pv_input_current_a) : 'n/a'}</dd>
                        </div>
                        <div className={arrayConfig.arrayIsc > getMpptShortCircuitCurrentLimit(selectedMpptType) ? 'check-fail' : 'check-pass'}>
                          <dt>{t('surface.evaluation.check.short_circuit_current')}</dt>
                          <dd>{formatAmps(arrayConfig.arrayIsc)} / {formatAmps(getMpptShortCircuitCurrentLimit(selectedMpptType))}</dd>
                        </div>
                        <div>
                          <dt>{t('surface.evaluation.check.battery_charge_current')}</dt>
                          <dd>{formatAmps(mpptCompatibility.chargeCurrent)}</dd>
                        </div>
                      </dl>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="fit-note">{t('surface.evaluation.empty')}</p>
          )}
        </section>
        <section className="panel balanced-row-panel notes-panel">
          <div className="section-head">
            <h2>{t('surface.notes.title')}</h2>
          </div>
          <label className="field">
            <span>{t('surface.notes.title')}</span>
            <textarea
              value={surfaceNotes}
              onChange={(event) => setSurfaceNotes(event.target.value)}
              rows={8}
              placeholder={t('surface.notes.placeholder')}
            />
          </label>
          <div className="button-row button-row-end">
            <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveSurfaceDetails()} disabled={isSavingSurface}>
              {isSavingSurface ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>{t('surface.yield.title')}</h2>
          <p>{t('surface.yield.description')}</p>
        </div>
        <div className="yield-table-wrap">
          <table className="yield-table">
            <thead>
              <tr>
                <th>{t('surface.yield.metric')}</th>
                {estimatedYieldRows.map((row) => (
                  <th
                    key={row.month}
                    className={row.month === estimatedBestMonth?.month ? 'col-best' : row.month === estimatedWorstMonth?.month ? 'col-worst' : undefined}
                  >{getMonthLabel(row.month, t)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>{t('surface.yield.kwh_day')}</th>
                {estimatedYieldRows.map((row) => (
                  <td
                    key={`day-${row.month}`}
                    className={row.month === estimatedBestMonth?.month ? 'col-best best' : row.month === estimatedWorstMonth?.month ? 'col-worst worst' : undefined}
                  >{formatDailyYield(row.averageDailyKwh)}</td>
                ))}
              </tr>
              <tr>
                <th>{t('surface.yield.kwh_month')}</th>
                {estimatedYieldRows.map((row) => (
                  <td
                    key={`month-${row.month}`}
                    className={row.month === estimatedBestMonth?.month ? 'col-best best' : row.month === estimatedWorstMonth?.month ? 'col-worst worst' : undefined}
                  >{row.monthlyKwh.toLocaleString('en-US', { maximumFractionDigits: 1 })}</td>
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

type PageContext = {
  data: DigitalTwinExport;
  route: Route;
  weakestMonth: MonthlyBalanceRow | null;
  localSurfaceSummaries: LocalSurfaceSummary[];
  localTotalInstalledWp: number;
  arrayBySurfaceId: Map<string, ArrayEntity>;
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
  openMediaPreview?: (media: LightboxMedia) => void;
};

function LocationPage({ data, localSurfaceSummaries, localTotalInstalledWp, refreshProjectData, openMediaPreview }: PageContext) {
  const { t } = useTranslation();
  const storagePrefix = `${data.project.project_id}:location`;
  const defaultLocationName = data.project.location?.title ?? '18Mad Boerderij';
  const defaultLatitude = data.project.location?.latitude ?? 53.126579;
  const defaultLongitude = data.project.location?.longitude ?? 5.899564;
  const [title, setTitle] = usePersistentState(
    `${storagePrefix}:title`,
    defaultLocationName,
  );
  const [description, setDescription] = usePersistentState(`${storagePrefix}:description`, data.project.location?.description ?? '');
  const [notes, setNotes] = usePersistentState(`${storagePrefix}:notes`, data.project.location?.notes ?? '');
  const [latitude, setLatitude] = usePersistentState(
    `${storagePrefix}:latitude`,
    String(defaultLatitude),
  );
  const [longitude, setLongitude] = usePersistentState(
    `${storagePrefix}:longitude`,
    String(defaultLongitude),
  );
  const [photo, setPhoto] = useState<string | null>(data.project.location?.site_photo_data_url ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const numericLatitude = Number(latitude);
  const numericLongitude = Number(longitude);
  const hasMapCoordinates = Number.isFinite(numericLatitude) && Number.isFinite(numericLongitude);
  const locationDisplayName = title.trim() || defaultLocationName;
  const coordinateDisplay = `${numericLatitude.toLocaleString('en-US', { maximumFractionDigits: 4 })}, ${numericLongitude.toLocaleString('en-US', { maximumFractionDigits: 4 })}`;
  const surfaceYieldRows = localSurfaceSummaries.map((surface) => {
    const yieldRows = estimateFaceYieldTable({
      installedWp: surface.installed_wp,
      azimuthDeg: surface.orientation_deg,
      tiltDeg: surface.tilt_deg,
      latitudeDeg: Number.isFinite(numericLatitude) && latitude.trim() !== ''
        ? numericLatitude
        : defaultLatitude,
    });
    const annualKwh = Number(yieldRows.reduce((sum, row) => sum + row.monthlyKwh, 0).toFixed(1));
    return { surface, yieldRows, annualKwh };
  });
  const monthlyTotals = MONTH_KEYS.map((month) => ({
    month,
    monthlyKwh: Number(surfaceYieldRows.reduce((sum, item) => {
      const match = item.yieldRows.find((row) => row.month === month);
      return sum + (match?.monthlyKwh ?? 0);
    }, 0).toFixed(1)),
  }));
  const totalAnnualKwh = Number(surfaceYieldRows.reduce((sum, item) => sum + item.annualKwh, 0).toFixed(1));
  const totalAverageDailyKwh = Number((totalAnnualKwh / 365).toFixed(2));
  const bestMonth = surfaceYieldRows.length > 0
    ? monthlyTotals.reduce((best, current) => (current.monthlyKwh > best.monthlyKwh ? current : best), monthlyTotals[0] ?? { month: 'january', monthlyKwh: 0 })
    : null;
  const worstMonth = surfaceYieldRows.length > 0
    ? monthlyTotals.reduce((worst, current) => (current.monthlyKwh < worst.monthlyKwh ? current : worst), monthlyTotals[0] ?? { month: 'january', monthlyKwh: 0 })
    : null;

  async function handleSaveLocation(photoOverride?: string | null) {
    const numericLatitude = Number(latitude);
    const numericLongitude = Number(longitude);
    const nextPhoto = photoOverride === undefined ? photo : photoOverride;

    if (!Number.isFinite(numericLatitude) || numericLatitude < -90 || numericLatitude > 90) {
      setSaveError(t('location.save.error.latitude_invalid'));
      setSaveMessage(null);
      return;
    }

    if (!Number.isFinite(numericLongitude) || numericLongitude < -180 || numericLongitude > 180) {
      setSaveError(t('location.save.error.longitude_invalid'));
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
          country: data.project.location?.country ?? null,
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

      setSaveMessage(t('location.save.success'));
      setSaveError(null);
      await refreshProjectData();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('location.save.error.failed'));
      setSaveMessage(null);
    } finally {
      setIsSaving(false);
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

    setTitle(defaultLocationName);
  }, [data.project.location?.title, defaultLocationName, setTitle]);

  useEffect(() => {
    setDescription(data.project.location?.description ?? '');
  }, [data.project.location?.description, setDescription]);

  useEffect(() => {
    setNotes(data.project.location?.notes ?? '');
  }, [data.project.location?.notes, setNotes]);

  useEffect(() => {
    if (latitude.trim() === '') {
      setLatitude(String(defaultLatitude));
    }
    if (longitude.trim() === '') {
      setLongitude(String(defaultLongitude));
    }
  }, [defaultLatitude, defaultLongitude, latitude, longitude, setLatitude, setLongitude]);

  return (
    <>
      <div className="detail-grid" style={{ marginBottom: 16 }}>
        <section className="panel" style={{ gridColumn: 'span 2' }}>
          <div className="section-head">
            <h2>{t('location.start_information.title')}</h2>
          </div>
          {saveError ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--danger)' }}>{saveError}</p> : null}
          {saveMessage ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--accent-strong)' }}>{saveMessage}</p> : null}
          <div className="roof-config-inline row-synced-wrap">
            <label className="config-field">
              <span>{t('location.name')}</span>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 18Mad Boerderij" />
            </label>
            <label className="config-field config-field-span-2">
              <span>{t('location.description')}</span>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short shared description of the location" />
            </label>
            <label className="config-field">
              <span>{t('location.latitude')}</span>
              <input
                type="number"
                step="0.0001"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g. 52.3702"
              />
            </label>
            <label className="config-field">
              <span>{t('location.longitude')}</span>
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
            <span>{t('location.notes')}</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              onInput={(event) => setNotes(event.currentTarget.value)}
              rows={8}
              placeholder={t('location.notes.placeholder')}
            />
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="button button-secondary" onClick={() => void handleSaveLocation()} disabled={isSaving}>
              {isSaving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>{t('location.photo.title')}</h2>
          </div>
          {photo ? (
            <ExpandablePhoto
              src={photo}
              alt="Location"
              removeLabel={t('common.remove')}
              onRemove={() => {
                setPhoto(null);
                void handleSaveLocation(null);
              }}
            />
          ) : (
            <label className="upload-dropzone">
              <span>{t('location.photo.upload')}</span>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
            </label>
          )}
          <div className="button-row button-row-end">
            <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveLocation()} disabled={isSaving}>
              {isSaving ? t('common.saving') : t('common.save')}
            </button>
          </div>
          <div className="section-head" style={{ marginTop: 20 }}>
            <h2>{t('location.map.title')}</h2>
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
              <button
                type="button"
                className="button button-secondary button-sm map-expand-trigger"
                onClick={() =>
                  openMediaPreview?.({
                    kind: 'map',
                    src: buildGoogleMapsIframeSrc(numericLatitude, numericLongitude),
                    alt: 'Location satellite map',
                  })
                }
              >
                Expand map
              </button>
            </div>
          ) : (
            <p style={{ margin: 0, color: 'var(--muted)' }}>{t('location.map.empty')}</p>
          )}
        </section>
      </div>

    </>
  );
}

function AboutPage() {
  const { t } = useTranslation();

  return (
    <>
      <section className="detail-shell">
        <div className="panel">
          <h2 style={{ fontSize: 'clamp(1.1rem, 2vw, 1.4rem)', fontWeight: 700, margin: '0 0 14px', lineHeight: 1.25, color: 'var(--text)' }}>
            Designed and built by Joost Okkinga
          </h2>
          <p style={{ color: 'var(--muted)', maxWidth: 680, lineHeight: 1.65, margin: 0 }}>
            OffGridOS is personal software — not a commercial product, not a SaaS, not a white-label tool.
            It has been built to plan and model a specific off-grid installation, with the intention
            to reuse and adapt it for future properties. If you're working on something similar,
            you're welcome to explore the source on Codeberg.
          </p>
        </div>

        <div className="detail-grid-2">
          <div className="panel">
            <div className="section-head" style={{ marginBottom: 14 }}>
              <h2>Stack</h2>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {['React', 'TypeScript', 'Node.js', 'SQLite', 'Vite'].map(tech => (
                <span key={tech} style={{
                  padding: '4px 10px',
                  background: 'var(--surface-low)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                }}>
                  {tech}
                </span>
              ))}
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.84rem', lineHeight: 1.6, margin: 0 }}>
              Local-first: the database lives on the machine, the server runs locally, and the UI is a React SPA.
              No cloud, no accounts, no runtime dependencies outside the LAN.
            </p>
          </div>

          <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="section-head" style={{ marginBottom: 14 }}>
              <h2>Source code</h2>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.84rem', lineHeight: 1.6, margin: '0 0 20px' }}>
              The full source is publicly available on Codeberg. You're welcome to browse it,
              learn from it, or adapt it for your own off-grid setup — though it's tailored
              to one specific site.
            </p>
            <div style={{ marginTop: 'auto' }}>
              <a
                className="button button-secondary"
                href="https://codeberg.org/okkingaj/OffGridOS"
                target="_blank"
                rel="noreferrer"
              >
                View on Codeberg →
              </a>
            </div>
          </div>
        </div>

        <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'monospace', letterSpacing: 0, opacity: 0.85 }}>
            {typeof __BUILD_INFO__ !== 'undefined' ? __BUILD_INFO__ : ''}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>offgridos.eu</span>
        </div>
      </section>
    </>
  );
}

function ProductionPage({
  data,
  localSurfaceSummaries,
  localTotalInstalledWp,
  refreshProjectData,
}: Pick<PageContext, 'data' | 'localSurfaceSummaries' | 'localTotalInstalledWp' | 'refreshProjectData'>) {
  const { t } = useTranslation();
  const [isCreatingSurface, setIsCreatingSurface] = useState(false);
  const [focusedSurfaceId, setFocusedSurfaceId] = useState<string | null>(null);
  const [surfaceMessage, setSurfaceMessage] = useState<string | null>(null);
  const [surfaceError, setSurfaceError] = useState<string | null>(null);

  useEffect(() => {
    if (!focusedSurfaceId) return;
    const element = document.getElementById(`surface-card-${focusedSurfaceId}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const clearTimer = window.setTimeout(() => setFocusedSurfaceId(null), 2200);
    return () => window.clearTimeout(clearTimer);
  }, [focusedSurfaceId, localSurfaceSummaries.length]);

  async function handleCreateSurface() {
    setIsCreatingSurface(true);
    setSurfaceError(null);
    setSurfaceMessage(null);
    const surfaceId = `surface-${Date.now()}`;
    try {
      const response = await fetch('/api/surfaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surface_id: surfaceId, name: 'Unnamed surface', orientation_deg: 0, tilt_deg: 30 }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? `Failed to create surface (${response.status})`);
      setSurfaceMessage(t('location.surface.create.success'));
      setSurfaceError(null);
      setFocusedSurfaceId(surfaceId);
      await refreshProjectData();
    } catch (error) {
      setSurfaceError(error instanceof Error ? error.message : t('location.surface.create.error'));
      setSurfaceMessage(null);
    } finally {
      setIsCreatingSurface(false);
    }
  }

  async function handleDeleteSurface(surfaceId: string, surfaceLabel: string) {
    if (!window.confirm(t('location.surface.delete.confirm', { name: surfaceLabel }))) return;
    setSurfaceError(null);
    setSurfaceMessage(null);
    try {
      const response = await fetch(`/api/surfaces/${encodeURIComponent(surfaceId)}`, { method: 'DELETE' });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? `Failed to delete surface (${response.status})`);
      setSurfaceMessage(t('location.surface.delete.success'));
      await refreshProjectData();
    } catch (error) {
      setSurfaceError(error instanceof Error ? error.message : t('location.surface.delete.error'));
    }
  }
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
    const bestMonthDailyKwh = yieldRows.reduce((max, row) => Math.max(max, row.averageDailyKwh), 0);

    return {
      surface,
      yieldRows,
      annualKwh,
      bestMonthDailyKwh,
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
  const totalMaxDailyYieldMonth = monthlyTotals.length > 0
    ? monthlyTotals.reduce((best, current) => (current.averageDailyKwh > best.averageDailyKwh ? current : best), monthlyTotals[0])
    : null;
  const totalMinDailyYieldMonth = monthlyTotals.length > 0
    ? monthlyTotals.reduce((worst, current) => (current.averageDailyKwh < worst.averageDailyKwh ? current : worst), monthlyTotals[0])
    : null;
  const totalPanelCount = localSurfaceSummaries.reduce((sum, surface) => sum + surface.panel_count, 0);

  return (
    <>
      <section className="detail-shell">
        <div className="detail-grid detail-intro-grid">
          <section className="panel panel-span-2">
            <div className="section-head">
              <h2>{t('production.start_information.title')}</h2>
            </div>
            <div className="hero-strip">
              <SummaryCard
                label={t('production.summary.total_max_avg_daily_yield')}
                value={totalMaxDailyYieldMonth ? formatDailyYield(totalMaxDailyYieldMonth.averageDailyKwh) : 'n/a'}
                detail={totalMaxDailyYieldMonth ? getMonthLabel(totalMaxDailyYieldMonth.month, t) : undefined}
              />
              <SummaryCard
                label={t('production.summary.total_min_avg_daily_yield')}
                value={totalMinDailyYieldMonth ? formatDailyYield(totalMinDailyYieldMonth.averageDailyKwh) : 'n/a'}
                detail={totalMinDailyYieldMonth ? getMonthLabel(totalMinDailyYieldMonth.month, t) : undefined}
              />
              <SummaryCard label={t('production.summary.installed_pv')} value={formatWp(localTotalInstalledWp)} />
              <SummaryCard label={t('production.summary.total_panels')} value={String(totalPanelCount)} />
            </div>
          </section>

          <section className="panel">
            <div className="section-head">
              <h2>{t('production.context.title')}</h2>
            </div>
            <dl className="detail-stats compact-stats production-context-stats">
              <div>
                <dt>{t('location.surfaces.title')}</dt>
                <dd>{localSurfaceSummaries.length}</dd>
              </div>
              <div>
                <dt>{t('production.summary.avg_daily_yield')}</dt>
                <dd>{formatKwh(totalAverageDailyKwh)}</dd>
              </div>
              <div>
                <dt>{t('production.summary.annual_yield')}</dt>
                <dd>{formatKwh(totalAnnualKwh)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <section className="panel" style={{ display: 'none' }}>
          <div className="section-head">
            <h2>{t('production.surfaces.title')}</h2>
            <p>{t('location.surfaces.count', { count: localSurfaceSummaries.length })}</p>
          </div>
          {surfaceError ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--danger)' }}>{surfaceError}</p> : null}
          {surfaceMessage ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--accent-strong)' }}>{surfaceMessage}</p> : null}
          <div className="surface-grid">
            {localSurfaceSummaries.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                <p style={{ marginTop: 0, marginBottom: 0 }}>{t('location.surfaces.empty')}</p>
              </div>
            ) : null}
            {surfaceYieldRows.map(({ surface, bestMonthDailyKwh }) => {
              const verdictSummary = getRelationshipVerdictSummary('array_to_mppt', surface.status, surface.fit ?? undefined, t, surface.reasons);
              const verdictText = getRelationshipVerdictLabel('array_to_mppt', surface.status, surface.fit ?? undefined, t);
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
                        <div style={{ marginTop: 4 }}>
                          <StatusBadge status={surface.status} fit={surface.fit} />
                          <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginTop: 3 }} title={verdictSummary ?? undefined}>{verdictText}</span>
                        </div>
                      </div>
                    </div>
                    <dl className="detail-stats compact-stats" style={{ marginTop: 8, marginBottom: 0 }}>
                      <div>
                        <dt>{t('production.card.size')}</dt>
                        <dd>{formatWp(surface.installed_wp)}</dd>
                      </div>
                      <div>
                        <dt>{t('production.card.max_avg_yield_day')}</dt>
                        <dd>{formatDailyYield(bestMonthDailyKwh)}</dd>
                      </div>
                    </dl>
                    <div className="button-row">
                      <button
                        type="button"
                        className="button button-secondary button-sm"
                        onClick={() => navigateTo({ kind: 'surface', surfaceId: surface.surface_id })}
                      >
                        {t('common.detail')}
                      </button>
                      <button
                        type="button"
                        className="button button-danger button-sm"
                        onClick={() => void handleDeleteSurface(surface.surface_id, surface.name)}
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="roof-config-inline row-synced-wrap" style={{ marginTop: 16 }}>
            <div className="config-field" style={{ alignSelf: 'end' }}>
              <span>&nbsp;</span>
              <button type="button" className="button button-secondary" onClick={() => void handleCreateSurface()} disabled={isCreatingSurface}>
                {isCreatingSurface ? t('common.creating') : t('production.add_surface')}
              </button>
            </div>
          </div>
        </section>

        <section className="panel" style={{ display: 'none' }}>
          <div className="section-head">
            <h2>{t('production.monthly.title')}</h2>
            <p>Read-only monthly summary.</p>
          </div>
          <div className="outcome-panel">
            <div className="outcome-summary">
              <div className="outcome-status-line">
                <p className="result-label">Monthly production</p>
                <span>{t('production.monthly.total_avg_kwh_day')}</span>
              </div>
              <p className="fit-note">This section is read-only and summarizes the derived production by month.</p>
            </div>
            <div className="yield-table-wrap">
              <table className="yield-table">
                <thead>
                  <tr>
                    <th></th>
                    {MONTH_KEYS.map((month) => (
                      <th
                        key={month}
                        className={month === totalMaxDailyYieldMonth?.month ? 'col-best' : month === totalMinDailyYieldMonth?.month ? 'col-worst' : undefined}
                      >{getMonthLabel(month, t)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {surfaceYieldRows.map(({ surface, yieldRows }) => (
                    <tr key={`monthly-${surface.surface_id}`}>
                      <th>{surface.name}</th>
                      {yieldRows.map((row) => (
                        <td
                          key={`${surface.surface_id}-${row.month}`}
                          className={row.month === totalMaxDailyYieldMonth?.month ? 'col-best best' : row.month === totalMinDailyYieldMonth?.month ? 'col-worst worst' : undefined}
                        >{formatDailyYield(row.averageDailyKwh)}</td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <th>{t('production.monthly.total_avg_kwh_day')}</th>
                    {monthlyTotals.map((row) => (
                      <td
                        key={`total-day-${row.month}`}
                        className={row.month === totalMaxDailyYieldMonth?.month ? 'col-best best' : row.month === totalMinDailyYieldMonth?.month ? 'col-worst worst' : undefined}
                      >{formatDailyYield(row.averageDailyKwh)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
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
  const { t } = useTranslation();
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
  const [selectedCabinetTypeId, setSelectedCabinetTypeId] = usePersistentState(
    `${storagePrefix}:cabinet-type`,
    persistedDesign?.selected_cabinet_type_id ?? '',
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
  const [selectedBatteryBrand, setSelectedBatteryBrand] = usePersistentState(
    `${storagePrefix}:battery-brand`,
    selectedBatteryType?.brand ?? data.entities.battery_types[0]?.brand ?? '',
  );

  const selectedCabinetType = selectedCabinetTypeId
    ? data.entities.cabinet_types.find((item) => item.cabinet_type_id === selectedCabinetTypeId) ?? null
    : null;
  const batteryBrandOptions = Array.from(new Set(data.entities.battery_types.map((item) => item.brand).filter((brand) => brand.trim() !== ''))).sort((left, right) => left.localeCompare(right));
  const batteryTypesForBrand = selectedBatteryBrand
    ? data.entities.battery_types.filter((item) => item.brand === selectedBatteryBrand)
    : data.entities.battery_types;
  const selectedBatteryBrandValid = batteryBrandOptions.includes(selectedBatteryBrand);
  const selectedBatteryTypeInBrand = selectedBatteryType && selectedBatteryType.brand === selectedBatteryBrand ? selectedBatteryType : null;

  useEffect(() => {
    if (selectedBatteryType && selectedBatteryType.brand !== selectedBatteryBrand) {
      setSelectedBatteryBrand(selectedBatteryType.brand);
    }
  }, [selectedBatteryBrand, selectedBatteryType, setSelectedBatteryBrand]);

  useEffect(() => {
    if (!selectedBatteryBrandValid && batteryBrandOptions.length > 0) {
      setSelectedBatteryBrand(batteryBrandOptions[0]!);
      return;
    }
    if (batteryTypesForBrand.length === 0) {
      return;
    }
    const currentTypeIsInBrand = selectedBatteryTypeId
      ? batteryTypesForBrand.some((item) => item.battery_type_id === selectedBatteryTypeId)
      : false;
    if (!currentTypeIsInBrand) {
      setSelectedBatteryTypeId(batteryTypesForBrand[0]!.battery_type_id);
    }
  }, [batteryBrandOptions, batteryTypesForBrand, selectedBatteryBrandValid, selectedBatteryTypeId, setSelectedBatteryBrand, setSelectedBatteryTypeId]);

  function handleBatteryBrandChange(nextBrand: string) {
    setSelectedBatteryBrand(nextBrand);
    const nextType = data.entities.battery_types.find((item) => item.brand === nextBrand) ?? null;
    if (nextType) {
      setSelectedBatteryTypeId(nextType.battery_type_id);
    }
  }

  function handleBatteryTypeChange(nextBatteryTypeId: string) {
    setSelectedBatteryTypeId(nextBatteryTypeId);
    const nextBatteryType = data.entities.battery_types.find((item) => item.battery_type_id === nextBatteryTypeId) ?? null;
    if (nextBatteryType) {
      setSelectedBatteryBrand(nextBatteryType.brand);
    }
  }

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
  const evaluationVerdict = getBatteryEvaluationCopy({
    chargeCurrentExceeded: Boolean(chargeCurrentExceeded),
    estimatedChargeCurrentA,
    maxChargeCurrentA: batteryArrayConfig?.maxChargeCurrentA ?? null,
    refillEnergyKwh,
    bestMonthDailyYieldKwh: bestMonth?.totalDailyKwh ?? 0,
    batteryRefillRule,
    t,
  });
  const monthlyCapacityRows = MONTH_KEYS.map((month) => {
    const monthYield = projectMonthlySolarByMonth.get(month)?.average_daily_kwh ?? 0;
    return {
      month,
      averageDailyYieldKwh: monthYield,
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
      setBatteryDesignSaveError(t('battery.save.error.choose_type'));
      setBatteryDesignSaveMessage(null);
      return;
    }

    if (configuredBatteryCount < 1 || batteriesPerString < 1 || parallelStrings < 1) {
      setBatteryDesignSaveError(t('battery.save.error.invalid_counts'));
      setBatteryDesignSaveMessage(null);
      return;
    }

    if (configuredBatteryCount !== batteriesPerString * parallelStrings) {
      setBatteryDesignSaveError(t('battery.save.error.mismatch'));
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
          selected_cabinet_type_id: selectedCabinetTypeId || null,
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
        window.localStorage.setItem(`${storagePrefix}:cabinet-type`, JSON.stringify(selectedCabinetTypeId));
        window.localStorage.setItem(`${storagePrefix}:battery-count`, JSON.stringify(configuredBatteryCount));
        window.localStorage.setItem(`${storagePrefix}:batteries-per-string`, JSON.stringify(batteriesPerString));
        window.localStorage.setItem(`${storagePrefix}:parallel-strings`, JSON.stringify(parallelStrings));
        window.dispatchEvent(new Event('offgridos-local-storage-change'));
      } catch {
        // Keep the save successful even if draft syncing fails.
      }

      setBatteryDesignSaveMessage(t('battery.save.success'));
      await refreshProjectData();
    } catch (error) {
      setBatteryDesignSaveError(error instanceof Error ? error.message : t('battery.save.error.failed'));
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
      <section className="detail-shell">
        <div className="detail-grid detail-intro-grid">
          <section className="panel panel-with-actions">
            <div className="section-head">
              <h2>{t('battery.about.title')}</h2>
            </div>
            {batteryDesignSaveError ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--danger)' }}>{batteryDesignSaveError}</p> : null}
            <label className="config-field" style={{ display: 'block', marginBottom: 8 }}>
              <span>{t('battery.about.field.title')}</span>
              <input type="text" value={batteryTitle} onChange={(event) => setBatteryTitle(event.target.value)} />
            </label>
            <label className="config-field" style={{ display: 'block' }}>
              <span>{t('battery.about.field.description')}</span>
              <input type="text" value={batteryDescription} onChange={(event) => setBatteryDescription(event.target.value)} />
            </label>
            <div className="button-row button-row-end">
              <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveBatteryDesign()} disabled={isSavingBatteryDesign}>
                {isSavingBatteryDesign ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </section>

          <section className="panel panel-with-actions">
            <div className="section-head">
              <h2>{t('battery.notes.title')}</h2>
            </div>
            <textarea
              className="field-textarea"
              value={batteryNotes}
              onChange={(event) => setBatteryNotes(event.target.value)}
              rows={5}
              placeholder={t('battery.notes.placeholder')}
            />
            <div className="button-row button-row-end">
              <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveBatteryDesign()} disabled={isSavingBatteryDesign}>
                {isSavingBatteryDesign ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </section>

          <section className="panel panel-with-actions">
          <div className="section-head">
            <h2>{t('battery.image.title')}</h2>
          </div>
            {batteryImage ? (
              <ExpandablePhoto
                src={batteryImage}
                alt={batteryTitle.trim() || t('battery.image.alt')}
                removeLabel={t('common.remove')}
                onRemove={() => {
                  setBatteryImage(null);
                  void handleSaveBatteryDesign({ imageOverride: null });
                }}
              />
            ) : (
              <label className="upload-dropzone">
                <span>{t('battery.image.upload')}</span>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBatteryImageChange} />
              </label>
            )}
            <div className="button-row button-row-end">
              <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveBatteryDesign()} disabled={isSavingBatteryDesign}>
                {isSavingBatteryDesign ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </section>
        </div>

        <section className="detail-grid">
          <section className="panel panel-with-actions">
            <div className="section-head">
              <h2>{t('battery.selection.title')}</h2>
            </div>
            <div className="config-grid config-control-row row-synced-wrap battery-selection-grid">
              <label className="config-field">
                <span>{t('catalog.field.brand')}</span>
                <select value={selectedBatteryBrand} onChange={(event) => handleBatteryBrandChange(event.target.value)}>
                  {batteryBrandOptions.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </label>
              <label className="config-field config-field-span-2">
                <span>{`${t('catalog.field.model')} (${batteryTypesForBrand.length})`}</span>
                <select value={selectedBatteryTypeInBrand?.battery_type_id ?? ''} onChange={(event) => handleBatteryTypeChange(event.target.value)}>
                  {batteryTypesForBrand.map((option) => (
                    <option key={option.battery_type_id} value={option.battery_type_id}>
                      {option.model}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="config-grid config-control-row row-synced-wrap">
              <label className="config-field">
                <span>{t('battery.selection.system_voltage')}</span>
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
              <label className="config-field">
                <span>{t('battery.selection.amount')}</span>
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
                  <dt>{t('battery.selection.stat.nominal_voltage')}</dt>
                  <dd>{formatVolts(selectedBatteryType.nominal_voltage)}</dd>
                </div>
                <div>
                  <dt>{t('battery.selection.stat.capacity')}</dt>
                  <dd>{formatKwh(selectedBatteryType.capacity_kwh)}</dd>
                </div>
                <div>
                  <dt>{t('battery.selection.stat.ah')}</dt>
                  <dd>{selectedBatteryType.capacity_ah} Ah</dd>
                </div>
                <div>
                  <dt>{t('battery.selection.stat.chemistry')}</dt>
                  <dd>{selectedBatteryType.chemistry}</dd>
                </div>
              </dl>
            ) : (
              <p className="fit-note">{t('battery.selection.empty')}</p>
            )}
            <div className="button-row button-row-end">
              <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveBatteryDesign()} disabled={isSavingBatteryDesign}>
                {isSavingBatteryDesign ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </section>

          <section className="panel panel-with-actions">
            <div className="section-head">
              <h2>{t('battery.array.title')}</h2>
            </div>
            {selectedBatteryType ? (
              <>
                <div className="fit-card">
                  <div className="config-grid config-control-row row-synced-wrap">
                    <label className="config-field">
                      <span>{t('battery.array.batteries_per_string')}</span>
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
                      <span>{t('battery.array.parallel_strings')}</span>
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
                          <dt>{t('battery.array.stat.string_voltage')}</dt>
                          <dd>{formatVolts(batteryArrayConfig.stringVoltage)}</dd>
                        </div>
                        <div>
                          <dt>{t('battery.array.stat.string_capacity')}</dt>
                          <dd>{formatKwh(batteryArrayConfig.stringCapacityKwh)}</dd>
                        </div>
                        <div>
                          <dt>{t('battery.array.stat.total_capacity')}</dt>
                          <dd>{formatKwh(batteryArrayConfig.totalCapacityKwh)}</dd>
                        </div>
                        {batteryArrayConfig.maxChargeCurrentA != null ? (
                          <div>
                            <dt>{t('battery.array.stat.max_charge_current')}</dt>
                            <dd>{formatAmps(batteryArrayConfig.maxChargeCurrentA)}</dd>
                          </div>
                        ) : null}
                        {batteryArrayConfig.maxDischargeCurrentA != null ? (
                          <div>
                            <dt>{t('battery.array.stat.max_discharge_current')}</dt>
                            <dd>{formatAmps(batteryArrayConfig.maxDischargeCurrentA)}</dd>
                          </div>
                        ) : null}
                        {batteryArrayConfig.maxDischargePowerW != null ? (
                          <div>
                            <dt>{t('battery.array.stat.max_discharge_power')}</dt>
                            <dd>{formatKw(batteryArrayConfig.maxDischargePowerW)}</dd>
                          </div>
                        ) : null}
                      </dl>
                      {!batteryArrayConfig.usesConfiguredBatteriesExactly ? (
                        <p className="fit-note">
                          {t('battery.array.mismatch', {
                            configured: batteryArrayConfig.configuredBatteryCount,
                            assigned: configuredBatteryCount,
                          })}
                        </p>
                      ) : null}
                    </>
                  ) : null}
                </div>
                <div className="button-row button-row-end">
                  <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveBatteryDesign()} disabled={isSavingBatteryDesign}>
                    {isSavingBatteryDesign ? t('common.saving') : t('common.save')}
                  </button>
                </div>
              </>
            ) : (
              <p className="fit-note">{t('battery.array.empty')}</p>
            )}
          </section>

          <section className="panel panel-with-actions">
            <div className="section-head">
              <h2>{t('battery.selection.cabinet_title')}</h2>
            </div>
            <div className="stack" style={{ gap: 16 }}>
              <label className="config-field">
                <span>{t('battery.selection.cabinet_type')}</span>
                <select value={selectedCabinetTypeId} onChange={(event) => setSelectedCabinetTypeId(event.target.value)}>
                  <option value="">{t('common.none')}</option>
                  {data.entities.cabinet_types.map((option) => (
                    <option key={option.cabinet_type_id} value={option.cabinet_type_id}>
                      {option.title}
                    </option>
                  ))}
                </select>
              </label>
              {selectedCabinetType ? (
                <dl className="detail-stats panel-spec-grid">
                  <div>
                    <dt>{t('catalog.stat.units')}</dt>
                    <dd>{selectedCabinetType.units ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>{t('catalog.stat.depth')}</dt>
                    <dd>{selectedCabinetType.depth_mm} mm</dd>
                  </div>
                  <div>
                    <dt>{t('catalog.stat.width')}</dt>
                    <dd>{selectedCabinetType.width_mm} mm</dd>
                  </div>
                  <div>
                    <dt>{t('catalog.stat.height')}</dt>
                    <dd>{selectedCabinetType.height_mm} mm</dd>
                  </div>
                  <div>
                    <dt>{t('catalog.stat.ip_rating')}</dt>
                    <dd>{selectedCabinetType.ip_rating ?? '—'}</dd>
                  </div>
                </dl>
              ) : (
                <p className="fit-note">{t('battery.selection.cabinet_empty')}</p>
              )}
              {selectedCabinetType ? <div className="fit-note">{selectedCabinetType.title}</div> : null}
            </div>
          </section>
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>{t('battery.evaluation.title')}</h2>
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
                  <dt>{t('battery.evaluation.stat.best_month')}</dt>
                  <dd>{bestMonth ? getMonthLabel(bestMonth.month, t) : 'n/a'}</dd>
                </div>
                <div>
                  <dt>{t('battery.evaluation.stat.worst_month')}</dt>
                  <dd>{worstMonth ? getMonthLabel(worstMonth.month, t) : 'n/a'}</dd>
                </div>
                <div>
                  <dt>{t('battery.evaluation.stat.required_recharge_energy')}</dt>
                  <dd>{refillEnergyKwh != null ? formatKwh(refillEnergyKwh) : 'n/a'}</dd>
                </div>
                <div className={chargeCurrentExceeded ? 'check-fail' : 'check-pass'}>
                  <dt>{t('battery.evaluation.stat.estimated_charge_current')}</dt>
                  <dd>{estimatedChargeCurrentA != null ? formatAmps(estimatedChargeCurrentA) : 'n/a'}</dd>
                </div>
                <div className={chargeCurrentExceeded ? 'check-fail' : 'check-pass'}>
                  <dt>{t('battery.evaluation.stat.battery_charge_limit')}</dt>
                  <dd>{batteryArrayConfig.maxChargeCurrentA != null ? formatAmps(batteryArrayConfig.maxChargeCurrentA) : 'n/a'}</dd>
                </div>
                <div>
                  <dt>{t('battery.evaluation.stat.refill_best_month')}</dt>
                  <dd>{daysToRefillBestMonth != null ? `${daysToRefillBestMonth} d` : 'n/a'}</dd>
                </div>
                <div>
                  <dt>{t('battery.evaluation.stat.refill_worst_month')}</dt>
                  <dd>{daysToRefillWorstMonth != null ? `${daysToRefillWorstMonth} d` : 'n/a'}</dd>
                </div>
                <div>
                  <dt>{t('battery.evaluation.stat.upstream_pv_input')}</dt>
                  <dd>{formatWp(totalUpstreamInputPowerW)}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="fit-note">{t('battery.evaluation.empty')}</p>
          )}
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>{t('battery.capacity.title')}</h2>
          </div>
          <dl className="detail-stats compact-stats" style={{ marginBottom: 16 }}>
            <div>
              <dt>{t('battery.capacity.stat.total_capacity')}</dt>
              <dd>{batteryArrayConfig ? formatKwh(batteryArrayConfig.totalCapacityKwh) : 'n/a'}</dd>
            </div>
            <div>
              <dt>{t('battery.capacity.stat.system_voltage')}</dt>
              <dd>{targetBatteryVoltage != null ? formatVolts(targetBatteryVoltage) : 'n/a'}</dd>
            </div>
            <div>
              <dt>{t('battery.capacity.stat.recharge_energy')}</dt>
              <dd>{refillEnergyKwh != null ? formatKwh(refillEnergyKwh) : 'n/a'}</dd>
            </div>
          </dl>
          <div className="yield-table-wrap">
            <table className="yield-table">
              <thead>
                <tr>
                  <th>{t('battery.capacity.table.title')}</th>
                  {MONTH_KEYS.map((month) => (
                    <th key={month}>{getMonthLabel(month, t)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>{t('battery.capacity.table.expected_yield_day')}</th>
                  {monthlyCapacityRows.map((row) => (
                    <td key={`capacity-yield-${row.month}`}>{formatDailyYield(row.averageDailyYieldKwh)}</td>
                  ))}
                </tr>
                <tr>
                  <th>{t('battery.capacity.table.avg_days_to_charge')}</th>
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
  const { t } = useTranslation();
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
  const [inverterDraft, setInverterDraft] = useState(() => ({
    title: persistedInverterConfig?.title ?? '',
    description: persistedInverterConfig?.description ?? '',
    image_data_url: persistedInverterConfig?.image_data_url ?? null,
    notes: persistedInverterConfig?.notes ?? '',
  }));
  const [isSavingInverterDesign, setIsSavingInverterDesign] = useState(false);
  const [inverterDesignSaveError, setInverterDesignSaveError] = useState<string | null>(null);

  useEffect(() => {
    setInverterDraft({
      title: persistedInverterConfig?.title ?? '',
      description: persistedInverterConfig?.description ?? '',
      image_data_url: persistedInverterConfig?.image_data_url ?? null,
      notes: persistedInverterConfig?.notes ?? '',
    });
  }, [
    persistedInverterConfig?.title,
    persistedInverterConfig?.description,
    persistedInverterConfig?.image_data_url,
    persistedInverterConfig?.notes,
  ]);

  const selectedInverterType = selectedInverterTypeId
    ? data.entities.inverter_types.find((item) => item.inverter_id === selectedInverterTypeId) ?? null
    : null;
  const [selectedCabinetTypeId, setSelectedCabinetTypeId] = usePersistentState(
    `${storagePrefix}:cabinet-type`,
    persistedInverterConfig?.selected_cabinet_type_id ?? '',
  );
  const selectedCabinetType = selectedCabinetTypeId
    ? data.entities.cabinet_types.find((item) => item.cabinet_type_id === selectedCabinetTypeId) ?? null
    : null;
  const batteryArrayConfig = currentBatteryType
    ? evaluateBatteryArrayConfiguration(
      currentBatteryType,
      Math.max(configuredBatteryCount, 1),
      Math.max(batteriesPerString, 1),
      Math.max(parallelStrings, 1),
    )
    : null;
  const converterBankCompatibility = batteryArrayConfig
    ? evaluateConverterBankCompatibility(batteryArrayConfig, data.entities.conversion_devices)
    : null;
  const inverterCompatibility = batteryArrayConfig
    ? evaluateInverterCompatibility(batteryArrayConfig, selectedInverterType)
    : null;
  const inverterEvaluationCopy = getInverterEvaluationCopy({
    compatibility: inverterCompatibility,
    t,
  });
  async function handleSaveInverterDesign(options?: { imageOverride?: string | null }) {
    if (!selectedInverterTypeId) {
      setInverterDesignSaveError(t('inverter.save.error.choose_type'));
      return;
    }

    const imageToPersist = options?.imageOverride === undefined ? inverterDraft.image_data_url : options.imageOverride;

    setIsSavingInverterDesign(true);
    setInverterDesignSaveError(null);

    try {
      const response = await fetch('/api/inverter-configuration', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_inverter_type_id: selectedInverterTypeId,
          selected_cabinet_type_id: selectedCabinetTypeId || null,
          title: inverterDraft.title.trim(),
          description: inverterDraft.description.trim(),
          image_data_url: imageToPersist,
          notes: inverterDraft.notes.trim(),
        }),
      });

      const payload = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? `Failed to save inverter configuration (${response.status})`);
      }

      try {
        window.localStorage.setItem(`${storagePrefix}:inverter-type`, JSON.stringify(selectedInverterTypeId));
        window.localStorage.setItem(`${storagePrefix}:cabinet-type`, JSON.stringify(selectedCabinetTypeId));
        window.dispatchEvent(new Event('offgridos-local-storage-change'));
      } catch {
        // Keep the save successful even if draft syncing fails.
      }

      await refreshProjectData();
    } catch (error) {
      setInverterDesignSaveError(error instanceof Error ? error.message : t('inverter.save.error.failed'));
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
      setInverterDraft((current) => ({ ...current, image_data_url: nextImage }));
      void handleSaveInverterDesign({ imageOverride: nextImage });
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      <ConversionDeviceCatalogPage data={data} refreshProjectData={refreshProjectData} />
      <section className="panel">
        <div className="section-head">
          <h2>Converter bank fit</h2>
          <p>Combined converter output compared with the battery bank.</p>
        </div>
        {converterBankCompatibility ? (
          <div className="fit-card">
            <div className="fit-head">
              <strong>Converter bank fit</strong>
              <StatusBadge status={converterBankCompatibility.status} />
            </div>
            <p className="fit-note">
              {converterBankCompatibility.status === 'outside_limits'
                ? 'The battery bank is too small for the combined converters.'
                : 'The battery bank can support the combined converters.'}
            </p>
            <dl className="detail-stats compact-stats">
              <div>
                <dt>Converters</dt>
                <dd>{data.entities.conversion_devices.length}</dd>
              </div>
              <div>
                <dt>Combined output</dt>
                <dd>{formatKw(converterBankCompatibility.totalContinuousPowerW)}</dd>
              </div>
              <div>
                <dt>Combined peak</dt>
                <dd>{`${converterBankCompatibility.totalPeakPowerVA.toLocaleString('en-US')} VA`}</dd>
              </div>
              <div>
                <dt>Battery discharge limit</dt>
                <dd>{batteryArrayConfig?.maxDischargePowerW != null ? formatKw(batteryArrayConfig.maxDischargePowerW) : 'n/a'}</dd>
              </div>
              <div>
                <dt>Estimated battery current</dt>
                <dd>{converterBankCompatibility.estimatedCurrentA != null ? formatAmps(converterBankCompatibility.estimatedCurrentA) : 'n/a'}</dd>
              </div>
            </dl>
            <ul className="reason-list">
              {converterBankCompatibility.reasons.map((reason) => (
                <li key={reason}>{formatReasonFallback(reason)}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="fit-note">Battery bank sizing is not available yet.</p>
        )}
      </section>
      <section className="detail-shell">
        <div className="detail-grid detail-intro-grid">
          <section className="panel panel-with-actions">
            <div className="section-head">
              <h2>{t('inverter.about.title')}</h2>
            </div>
            {inverterDesignSaveError ? <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--danger)' }}>{inverterDesignSaveError}</p> : null}
            <label className="config-field" style={{ display: 'block', marginBottom: 8 }}>
              <span>{t('inverter.about.field.title')}</span>
              <input type="text" value={inverterDraft.title} onChange={(event) => setInverterDraft((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="config-field" style={{ display: 'block' }}>
              <span>{t('inverter.about.field.description')}</span>
              <input type="text" value={inverterDraft.description} onChange={(event) => setInverterDraft((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <div className="button-row button-row-end">
              <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveInverterDesign()} disabled={isSavingInverterDesign}>
                {isSavingInverterDesign ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </section>

          <section className="panel panel-with-actions">
            <div className="section-head">
              <h2>{t('inverter.notes.title')}</h2>
            </div>
            <textarea
              className="field-textarea"
              value={inverterDraft.notes}
              onChange={(event) => setInverterDraft((current) => ({ ...current, notes: event.target.value }))}
              rows={5}
              placeholder={t('inverter.notes.placeholder')}
            />
            <div className="button-row button-row-end">
              <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveInverterDesign()} disabled={isSavingInverterDesign}>
                {isSavingInverterDesign ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </section>

          <section className="panel panel-with-actions">
          <div className="section-head">
            <h2>{t('inverter.image.title')}</h2>
          </div>
            {inverterDraft.image_data_url ? (
              <ExpandablePhoto
                src={inverterDraft.image_data_url}
                alt={inverterDraft.title.trim() || t('inverter.image.alt')}
                removeLabel={t('common.remove')}
                onRemove={() => {
                  setInverterDraft((current) => ({ ...current, image_data_url: null }));
                  void handleSaveInverterDesign({ imageOverride: null });
                }}
              />
            ) : (
              <label className="upload-dropzone">
                <span>{t('inverter.image.upload')}</span>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleInverterImageChange} />
              </label>
            )}
            <div className="button-row button-row-end">
              <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveInverterDesign()} disabled={isSavingInverterDesign}>
                {isSavingInverterDesign ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </section>
        </div>

        <div className="detail-grid">
          <section className="panel panel-with-actions">
            <div className="section-head">
              <h2>{t('inverter.selection.title')}</h2>
            </div>
            <div className="stack" style={{ gap: 16 }}>
              <label className="config-field">
                <span>{t('inverter.selection.selected')}</span>
                <select
                  value={selectedInverterTypeId}
                  onChange={(event) => setSelectedInverterTypeId(event.target.value)}
                  disabled={data.entities.inverter_types.length === 0}
                >
                  {data.entities.inverter_types.length === 0 ? <option value="">{t('inverter.selection.empty_catalog')}</option> : null}
                  {data.entities.inverter_types.map((option) => (
                    <option key={option.inverter_id} value={option.inverter_id}>
                      {option.model}
                    </option>
                  ))}
                </select>
              </label>
              {selectedInverterType ? (
                <dl className="detail-stats panel-spec-grid" style={{ marginTop: 0 }}>
                  <div>
                    <dt>{t('inverter.selection.stat.input_voltage')}</dt>
                    <dd>{formatVolts(selectedInverterType.input_voltage_v)}</dd>
                  </div>
                  <div>
                    <dt>{t('inverter.selection.stat.output_voltage')}</dt>
                    <dd>{formatVolts(selectedInverterType.output_voltage_v)}</dd>
                  </div>
                  <div>
                    <dt>{t('inverter.selection.stat.continuous_power')}</dt>
                    <dd>{formatKw(selectedInverterType.continuous_power_w)}</dd>
                  </div>
                  <div>
                    <dt>{t('inverter.selection.stat.peak_power')}</dt>
                    <dd>{selectedInverterType.peak_power_va.toLocaleString('en-US')} VA</dd>
                  </div>
                  <div>
                    <dt>{t('inverter.selection.stat.max_current')}</dt>
                    <dd>{formatAmps(selectedInverterType.max_charge_current_a)}</dd>
                  </div>
                </dl>
              ) : null}
              {data.entities.inverter_types.length === 0 ? (
                <p className="fit-note">{t('inverter.selection.empty')}</p>
              ) : null}
            </div>
            <div className="button-row button-row-end">
              <button type="button" className="button button-secondary button-sm" onClick={() => void handleSaveInverterDesign()} disabled={isSavingInverterDesign || data.entities.inverter_types.length === 0}>
                {isSavingInverterDesign ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </section>

          <section className="panel panel-with-actions">
            <div className="section-head">
              <h2>{t('inverter.selection.cabinet_title')}</h2>
            </div>
            <div className="stack" style={{ gap: 16 }}>
              <label className="config-field">
                <span>{t('inverter.selection.cabinet_type')}</span>
                <select
                  value={selectedCabinetTypeId}
                  onChange={(event) => setSelectedCabinetTypeId(event.target.value)}
                  disabled={data.entities.cabinet_types.length === 0}
                >
                  <option value="">{t('common.none')}</option>
                  {data.entities.cabinet_types.map((option) => (
                    <option key={option.cabinet_type_id} value={option.cabinet_type_id}>
                      {option.title}
                    </option>
                  ))}
                </select>
              </label>
              {selectedCabinetType ? (
                <dl className="detail-stats panel-spec-grid">
                  <div>
                    <dt>{t('catalog.stat.units')}</dt>
                    <dd>{selectedCabinetType.units ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>{t('catalog.stat.depth')}</dt>
                    <dd>{selectedCabinetType.depth_mm} mm</dd>
                  </div>
                  <div>
                    <dt>{t('catalog.stat.width')}</dt>
                    <dd>{selectedCabinetType.width_mm} mm</dd>
                  </div>
                  <div>
                    <dt>{t('catalog.stat.height')}</dt>
                    <dd>{selectedCabinetType.height_mm} mm</dd>
                  </div>
                  <div>
                    <dt>{t('catalog.stat.ip_rating')}</dt>
                    <dd>{selectedCabinetType.ip_rating ?? '—'}</dd>
                  </div>
                </dl>
              ) : (
                <p className="fit-note">{t('inverter.selection.cabinet_empty')}</p>
              )}
              {selectedCabinetType ? <div className="fit-note">{selectedCabinetType.title}</div> : null}
            </div>
          </section>

          <section className="panel panel-span-2">
            <div className="section-head">
              <h2>{t('inverter.evaluation.title')}</h2>
            </div>
            {batteryArrayConfig && selectedInverterType ? (
              <div className="fit-card">
                <div className="fit-head">
                  <strong>{selectedInverterType.model}</strong>
                  <span className={`status status-${statusTone(inverterCompatibility?.status ?? 'outside_limits', inverterCompatibility?.fit)}`}>
                    {inverterEvaluationCopy?.label ?? t('inverter.evaluation.label.outside_limits')}
                  </span>
                </div>
                {inverterEvaluationCopy?.summary ? <p className="fit-note">{inverterEvaluationCopy.summary}</p> : null}
                <ul className="reason-list">
                  {(inverterEvaluationCopy?.reasons ?? []).map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
                <dl className="detail-stats mppt-checks">
                  <div className={batteryArrayConfig.stringVoltage > selectedInverterType.input_voltage_v * 1.1 || batteryArrayConfig.stringVoltage < selectedInverterType.input_voltage_v * 0.85 ? 'check-fail' : 'check-pass'}>
                    <dt>{t('inverter.evaluation.check.voltage')}</dt>
                    <dd>{formatVolts(batteryArrayConfig.stringVoltage)} / {formatVolts(selectedInverterType.input_voltage_v)}</dd>
                  </div>
                  <div className={batteryArrayConfig.maxDischargeCurrentA != null && selectedInverterType.max_charge_current_a > batteryArrayConfig.maxDischargeCurrentA ? 'check-fail' : 'check-pass'}>
                    <dt>{t('inverter.evaluation.check.current')}</dt>
                    <dd>{batteryArrayConfig.maxDischargeCurrentA != null ? formatAmps(batteryArrayConfig.maxDischargeCurrentA) : 'n/a'} / {formatAmps(selectedInverterType.max_charge_current_a)}</dd>
                  </div>
                  <div className={batteryArrayConfig.maxDischargePowerW != null && selectedInverterType.continuous_power_w > batteryArrayConfig.maxDischargePowerW ? 'check-fail' : 'check-pass'}>
                    <dt>{t('inverter.evaluation.check.power')}</dt>
                    <dd>{batteryArrayConfig.maxDischargePowerW != null ? formatKw(batteryArrayConfig.maxDischargePowerW) : 'n/a'} / {formatKw(selectedInverterType.continuous_power_w)}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="fit-note">{t('inverter.evaluation.empty')}</p>
            )}
          </section>
        </div>
      </section>
    </>
  );
}

function ConsumptionPage({
  data,
  batteryBank,
  batteryBankState,
  refreshProjectData,
}: PageContext) {
  const { t } = useTranslation();
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
  const [parallelStrings] = usePersistentState(`${batteryStoragePrefix}:parallel-strings`, 1);

  const currentBatteryType = selectedBatteryTypeId
    ? data.entities.battery_types.find((item) => item.battery_type_id === selectedBatteryTypeId) ?? null
    : null;
  const batteryArrayConfig = currentBatteryType
    ? evaluateBatteryArrayConfiguration(
      currentBatteryType,
      Math.max(configuredBatteryCount, 1),
      Math.max(batteriesPerString, 1),
      Math.max(parallelStrings, 1),
    )
    : null;

  const consumptionSelectionStorageKey = getConsumptionSelectionStorageKey(data);
  const [selectedConversionDeviceIds, setSelectedConversionDeviceIds] = usePersistentState<string[]>(
    consumptionSelectionStorageKey,
    [],
  );

  useEffect(() => {
    const availableIds = new Set(data.entities.conversion_devices.map((device) => device.conversion_device_id));
    const nextSelection = selectedConversionDeviceIds.map((deviceId) => (deviceId && !availableIds.has(deviceId) ? '' : deviceId));
    if (nextSelection.some((deviceId, index) => deviceId !== selectedConversionDeviceIds[index])) {
      setSelectedConversionDeviceIds(nextSelection);
    }
  }, [data.entities.conversion_devices, selectedConversionDeviceIds, setSelectedConversionDeviceIds]);

  const selectedConverters = selectedConversionDeviceIds
    .map((conversionDeviceId) => (conversionDeviceId
      ? data.entities.conversion_devices.find((device) => device.conversion_device_id === conversionDeviceId)
      : null))
    .filter((device): device is ConversionDevice => Boolean(device));
  const converterBankCompatibility = selectedConverters.length > 0 && batteryArrayConfig
    ? evaluateConverterBankCompatibility(batteryArrayConfig, selectedConverters)
    : null;

  function addSelectedConverter() {
    setSelectedConversionDeviceIds((current) => [...current, '']);
  }

  function updateSelectedConverter(index: number, converterId: string) {
    setSelectedConversionDeviceIds((current) => current.map((item, itemIndex) => (itemIndex === index ? converterId : item)));
  }

  function removeSelectedConverter(index: number) {
    setSelectedConversionDeviceIds((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function openConverterDetails(converterId: string) {
    const existingCircuits = data.entities.load_circuits.filter((circuit) => circuit.conversion_device_id === converterId);
    if (existingCircuits[0]) {
      navigateTo({ kind: 'converter', converterId, loadCircuitId: existingCircuits[0].load_circuit_id });
      return;
    }

    const title = 'Unnamed circuit';
    const loadCircuitId = generateUniqueCatalogId(title, data.entities.load_circuits.map((circuit) => circuit.load_circuit_id));

    try {
      const response = await fetch('/api/load-circuits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          load_circuit_id: loadCircuitId,
          conversion_device_id: converterId,
          title,
          description: null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to create load circuit (${response.status})`);
      }

      await refreshProjectData();
      navigateTo({ kind: 'converter', converterId, loadCircuitId });
    } catch (error) {
      console.error(error);
      navigateTo({ kind: 'converter', converterId });
    }
  }

  return (
    <>
      <section className="detail-shell">
        <section className="panel">
          <div className="section-head">
            <h2>Selected converters</h2>
            <p>Add one or more converters to evaluate the battery bank.</p>
          </div>
          <div className="fit-card">
            <div className="button-row button-row-end">
              <button type="button" className="button button-secondary" onClick={addSelectedConverter}>
                Add converter
              </button>
            </div>

            {selectedConversionDeviceIds.length === 0 ? (
              <p className="fit-note">No converters selected yet.</p>
            ) : (
              <div className="consumption-converter-grid surface-grid">
                {selectedConversionDeviceIds.map((conversionDeviceId, index) => {
                  const device = conversionDeviceId
                    ? data.entities.conversion_devices.find((item) => item.conversion_device_id === conversionDeviceId) ?? null
                    : null;
                  const nextTitle = device ? device.title : 'Unnamed converter';
                  const nextSubtitle = device ? getConversionDeviceTypeLabel(device.device_type, t) : 'Not evaluated';
                  const nextSize = device?.continuous_power_w != null ? `${device.continuous_power_w} W` : '0 W';
                  const nextPeak = device?.peak_power_va != null ? `${device.peak_power_va} VA` : '0 VA';

                  return (
                    <div key={`converter-slot-${index}`} className="surface-card-stack">
                      <div className="surface-card consumption-selection-card">
                        <div className="surface-card-top">
                          <div>
                            <h3>{nextTitle}</h3>
                            <p>{nextSubtitle}</p>
                          </div>
                        </div>
                        <label className="config-field" style={{ marginTop: 8 }}>
                          <span>Converter</span>
                          <select value={conversionDeviceId} onChange={(event) => updateSelectedConverter(index, event.target.value)}>
                            <option value="">{data.entities.conversion_devices.length === 0 ? 'No converters available' : 'Choose converter'}</option>
                            {data.entities.conversion_devices.map((option) => (
                              <option key={option.conversion_device_id} value={option.conversion_device_id}>
                                {option.title}
                              </option>
                            ))}
                          </select>
                        </label>
                        <dl className="mini-stats">
                          <div>
                            <dt>{t('catalog.field.device_type')}</dt>
                            <dd>{device ? getConversionDeviceTypeLabel(device.device_type, t) : '—'}</dd>
                          </div>
                          <div>
                            <dt>{t('catalog.stat.input_voltage')}</dt>
                            <dd>{device?.input_voltage_v != null ? `${device.input_voltage_v} V` : '0 V'}</dd>
                          </div>
                          <div>
                            <dt>{t('catalog.stat.output_voltage')}</dt>
                            <dd>{device?.output_voltage_v != null ? `${device.output_voltage_v} V` : '0 V'}</dd>
                          </div>
                          <div>
                            <dt>{t('catalog.stat.continuous_power')}</dt>
                            <dd>{nextSize}</dd>
                          </div>
                          <div>
                            <dt>{t('catalog.stat.peak_power')}</dt>
                            <dd>{nextPeak}</dd>
                          </div>
                        </dl>
                        <div className="button-row">
                          <button type="button" className="button button-secondary button-sm" onClick={() => device ? void openConverterDetails(device.conversion_device_id) : undefined} disabled={!device}>
                            Detail
                          </button>
                          <button type="button" className="button button-danger button-sm" onClick={() => removeSelectedConverter(index)}>
                            {t('common.delete')}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>Converter bank fit</h2>
            <p>Combined converter output compared with the battery bank.</p>
          </div>
          {converterBankCompatibility ? (
            <div className="outcome-panel">
              <div className="outcome-summary">
                <div className="outcome-status-line">
                  <p className="result-label">Converter bank fit</p>
                  <StatusBadge status={converterBankCompatibility.status} />
                </div>
                <p className="fit-note">
                  {converterBankCompatibility.status === 'unknown'
                    ? 'The selected battery bank does not publish discharge limits, so this fit is unknown.'
                    : converterBankCompatibility.status === 'outside_limits'
                    ? (converterBankCompatibility.reasons.includes('battery_discharge_current_unknown') || converterBankCompatibility.reasons.includes('battery_discharge_power_unknown')
                      ? 'The selected battery bank does not expose discharge limits, so the selected converters cannot be confirmed.'
                      : 'The selected battery bank cannot support the combined converters.')
                    : 'The selected battery bank can support the combined converters.'}
                </p>
                <ul className="reason-list">
                  {converterBankCompatibility.reasons.map((reason) => (
                    <li key={reason}>{formatReasonFallback(reason)}</li>
                  ))}
                </ul>
              </div>
              <dl className="detail-stats outcome-checks">
                <div>
                  <dt>Selected converters</dt>
                  <dd>{selectedConverters.length}</dd>
                </div>
                <div>
                  <dt>Combined output</dt>
                  <dd>{formatKw(converterBankCompatibility.totalContinuousPowerW)}</dd>
                </div>
                <div>
                  <dt>Combined peak</dt>
                  <dd>{`${converterBankCompatibility.totalPeakPowerVA.toLocaleString('en-US')} VA`}</dd>
                </div>
                <div>
                  <dt>Battery discharge limit</dt>
                  <dd>{batteryArrayConfig?.maxDischargePowerW != null ? formatKw(batteryArrayConfig.maxDischargePowerW) : 'n/a'}</dd>
                </div>
                <div>
                  <dt>Estimated battery current</dt>
                  <dd>{converterBankCompatibility.estimatedCurrentA != null ? formatAmps(converterBankCompatibility.estimatedCurrentA) : 'n/a'}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="fit-note">
              {selectedConversionDeviceIds.length === 0
                ? 'No converters selected yet.'
                : selectedConverters.length === 0
                  ? 'Choose a converter inside the unnamed block to evaluate the battery bank.'
                  : 'Select a battery bank in Storage first.'}
            </p>
          )}
        </section>
      </section>
    </>
  );
}

function ConverterDetailPage({
  data,
  batteryBank,
  batteryBankState,
  route,
  refreshProjectData,
}: PageContext) {
  const { t } = useTranslation();

  if (route.kind !== 'converter') {
    return null;
  }

  const selectedConverter = data.entities.conversion_devices.find((device) => device.conversion_device_id === route.converterId) ?? null;
  const converterLoadCircuits = data.entities.load_circuits.filter((circuit) => circuit.conversion_device_id === route.converterId);
  const selectedLoadCircuit = route.loadCircuitId
    ? converterLoadCircuits.find((item) => item.load_circuit_id === route.loadCircuitId) ?? null
    : null;

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
  const [parallelStrings] = usePersistentState(`${batteryStoragePrefix}:parallel-strings`, 1);

  const currentBatteryType = selectedBatteryTypeId
    ? data.entities.battery_types.find((item) => item.battery_type_id === selectedBatteryTypeId) ?? null
    : null;
  const batteryArrayConfig = currentBatteryType
    ? evaluateBatteryArrayConfiguration(
      currentBatteryType,
      Math.max(configuredBatteryCount, 1),
      Math.max(batteriesPerString, 1),
      Math.max(parallelStrings, 1),
    )
    : null;
  const converterBankCompatibility = selectedConverter && batteryArrayConfig
    ? evaluateConverterBankCompatibility(batteryArrayConfig, [selectedConverter])
    : null;
  const selectedCircuitVoltageV = selectedConverter?.output_voltage_v ?? null;
  const selectedCircuitLoads = selectedLoadCircuit
    ? data.entities.loads.filter((load) => load.load_circuit_id === selectedLoadCircuit.load_circuit_id)
    : [];
  const converterLoadCircuitIdsKey = converterLoadCircuits.map((circuit) => circuit.load_circuit_id).join('|');
  const selectedCircuitLoadIdsKey = selectedCircuitLoads.map((load) => load.load_id).join('|');
  const selectedCircuitUsageKw = selectedCircuitLoads.reduce((sum, load) => sum + load.usage_kw, 0);
  const selectedCircuitSpikeKw = selectedCircuitLoads.reduce((sum, load) => sum + load.spike_kw, 0);

  const [isWorking, setIsWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedLoadPresetId, setSelectedLoadPresetId] = useState(LOAD_PRESETS[0]?.load_preset_id ?? '');
  const [loadCircuitDrafts, setLoadCircuitDrafts] = useState<Record<string, LoadCircuitDraft>>(() => (
    Object.fromEntries(
      converterLoadCircuits.map((circuit) => [
        circuit.load_circuit_id,
        loadCircuitDraftFromEntity(circuit, route.converterId),
      ]),
    )
  ));
  const [loadDrafts, setLoadDrafts] = useState<Record<string, LoadDraft>>(() => (
    Object.fromEntries(
      selectedCircuitLoads.map((load) => [
        load.load_id,
        loadDraftFromEntity(load),
      ]),
    )
  ));

  useEffect(() => {
    if (!route.loadCircuitId || selectedLoadCircuit) {
      return;
    }

    navigateTo({ kind: 'converter', converterId: route.converterId }, { replace: true });
  }, [route.converterId, route.loadCircuitId, selectedLoadCircuit]);

  function openCircuitDetails(loadCircuitId?: string) {
    navigateTo(
      loadCircuitId
        ? { kind: 'converter', converterId: route.converterId, loadCircuitId }
        : { kind: 'converter', converterId: route.converterId },
    );
  }

  useEffect(() => {
    setLoadCircuitDrafts((current) => {
      const next: Record<string, LoadCircuitDraft> = {};

      for (const circuit of converterLoadCircuits) {
        next[circuit.load_circuit_id] = current[circuit.load_circuit_id] ?? loadCircuitDraftFromEntity(circuit, route.converterId);
      }

      return next;
    });
  }, [converterLoadCircuitIdsKey, route.converterId]);

  useEffect(() => {
    setLoadDrafts((current) => {
      const next: Record<string, LoadDraft> = {};

      for (const load of selectedCircuitLoads) {
        next[load.load_id] = current[load.load_id] ?? loadDraftFromEntity(load);
      }

      return next;
    });
  }, [selectedCircuitLoadIdsKey]);

  async function handleCreateCircuit() {
    const title = 'Unnamed circuit';
    const loadCircuitId = generateUniqueCatalogId(title, data.entities.load_circuits.map((circuit) => circuit.load_circuit_id));

    try {
      setIsWorking(true);
      setActionError(null);

      const response = await fetch('/api/load-circuits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          load_circuit_id: loadCircuitId,
          conversion_device_id: route.converterId,
          title,
          description: null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to create load circuit (${response.status})`);
      }

      await refreshProjectData();
      navigateTo({ kind: 'converter', converterId: route.converterId, loadCircuitId });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to create load circuit.');
    } finally {
      setIsWorking(false);
    }
  }

  async function deleteLoadCircuit(loadCircuitId: string) {
    const loadCircuit = converterLoadCircuits.find((circuit) => circuit.load_circuit_id === loadCircuitId) ?? null;
    if (!loadCircuit) return;

    if (!window.confirm(`Delete load circuit "${loadCircuit.load_circuit_id}"?`)) return;

    try {
      setIsWorking(true);
      setActionError(null);

      const response = await fetch(`/api/load-circuits/${encodeURIComponent(loadCircuit.load_circuit_id)}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to delete load circuit (${response.status})`);
      }

      const remainingCircuits = converterLoadCircuits.filter((circuit) => circuit.load_circuit_id !== loadCircuit.load_circuit_id);
      await refreshProjectData();
      openCircuitDetails(remainingCircuits[0]?.load_circuit_id);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to delete load circuit.');
    } finally {
      setIsWorking(false);
    }
  }

  async function saveLoadCircuitDetails(loadCircuitId: string) {
    const circuit = converterLoadCircuits.find((item) => item.load_circuit_id === loadCircuitId) ?? null;
    if (!circuit) return;

    const draft = loadCircuitDrafts[loadCircuitId] ?? loadCircuitDraftFromEntity(circuit, route.converterId);
    const title = draft.title.trim();
    const description = draft.description.trim() === '' ? null : draft.description.trim();

    if (!title) {
      setActionError('Fill in the circuit title.');
      return;
    }

    try {
      setIsWorking(true);
      setActionError(null);

      const response = await fetch(`/api/load-circuits/${encodeURIComponent(loadCircuitId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          load_circuit_id: loadCircuitId,
          conversion_device_id: route.converterId,
          title,
          description,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to save load circuit (${response.status})`);
      }

      await refreshProjectData();
      setLoadCircuitDrafts((current) => ({
        ...current,
        [loadCircuitId]: {
          load_circuit_id: loadCircuitId,
          conversion_device_id: route.converterId,
          title,
          description: description ?? '',
        },
      }));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to save load circuit.');
    } finally {
      setIsWorking(false);
    }
  }

  async function saveLoadDetails(loadId: string) {
    const load = selectedCircuitLoads.find((item) => item.load_id === loadId) ?? null;
    if (!load) return;

    const draft = loadDrafts[loadId] ?? loadDraftFromEntity(load);
    const title = draft.title.trim();
    const description = draft.description.trim() === '' ? null : draft.description.trim();
    const usageKw = Number(draft.usage_kw);
    const spikeKw = Number(draft.spike_kw);
    const expectedUsageHoursPerDay = Number(draft.expected_usage_hours_per_day);
    const sleepingKw = Number(draft.sleeping_kw);

    if (!title || !Number.isFinite(usageKw) || usageKw < 0 || !Number.isFinite(spikeKw) || spikeKw < 0 || !Number.isFinite(expectedUsageHoursPerDay) || expectedUsageHoursPerDay < 0 || !Number.isFinite(sleepingKw) || sleepingKw < 0) {
      setActionError('Fill in the load title and numeric fields.');
      return;
    }

    try {
      setIsWorking(true);
      setActionError(null);

      const response = await fetch(`/api/loads/${encodeURIComponent(loadId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          load_id: loadId,
          load_circuit_id: selectedLoadCircuit?.load_circuit_id ?? load.load_circuit_id,
          title,
          description,
          usage_kw: usageKw,
          spike_kw: spikeKw,
          expected_usage_hours_per_day: expectedUsageHoursPerDay,
          sleeping_kw: sleepingKw,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to save load (${response.status})`);
      }

      await refreshProjectData();
      setLoadDrafts((current) => ({
        ...current,
        [loadId]: {
          load_id: loadId,
          load_circuit_id: selectedLoadCircuit?.load_circuit_id ?? load.load_circuit_id,
          title,
          description: description ?? '',
          usage_kw: String(usageKw),
          spike_kw: String(spikeKw),
          expected_usage_hours_per_day: String(expectedUsageHoursPerDay),
          sleeping_kw: String(sleepingKw),
        },
      }));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to save load.');
    } finally {
      setIsWorking(false);
    }
  }
  const selectedLoadPreset = LOAD_PRESETS.find((preset) => preset.load_preset_id === selectedLoadPresetId) ?? LOAD_PRESETS[0] ?? null;

  async function handleCreateLoad(preset: LoadPreset | null = null) {
    if (!selectedLoadCircuit) return;

    const title = preset?.title ?? 'Unnamed load';
    const loadId = generateUniqueCatalogId(title, data.entities.loads.map((load) => load.load_id));

    try {
      setIsWorking(true);
      setActionError(null);

      const response = await fetch('/api/loads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          load_id: loadId,
          load_circuit_id: selectedLoadCircuit.load_circuit_id,
          title,
          description: preset?.description ?? null,
          usage_kw: preset?.usage_kw ?? 0,
          spike_kw: preset?.spike_kw ?? 0,
          expected_usage_hours_per_day: preset?.expected_usage_hours_per_day ?? 0,
          sleeping_kw: preset?.sleeping_kw ?? 0,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to create load (${response.status})`);
      }

      await refreshProjectData();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to create load.');
    } finally {
      setIsWorking(false);
    }
  }

  async function deleteLoad(loadId: string) {
    const load = selectedCircuitLoads.find((item) => item.load_id === loadId) ?? null;
    if (!load) return;

    if (!window.confirm(`Delete load "${load.load_id}"?`)) return;

    try {
      setIsWorking(true);
      setActionError(null);

      const response = await fetch(`/api/loads/${encodeURIComponent(load.load_id)}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to delete load (${response.status})`);
      }

      await refreshProjectData();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to delete load.');
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <>
      <section className="detail-shell">
        <section className="panel panel-with-actions">
          <div className="section-head">
            <h2>{selectedLoadCircuit?.title ?? selectedConverter?.title ?? route.converterId}</h2>
            <p>
              {selectedLoadCircuit
                ? (selectedConverter ? selectedConverter.title : route.converterId)
                : (selectedConverter ? getConversionDeviceTypeLabel(selectedConverter.device_type, t) : t('status.not_evaluated'))}
            </p>
          </div>
          <div className="fit-card">
            {selectedLoadCircuit ? (
              <>
                <dl className="detail-stats panel-spec-grid">
                  <div>
                    <dt>{t('catalog.field.conversion_device_id')}</dt>
                    <dd>{selectedConverter?.title ?? route.converterId}</dd>
                  </div>
                  <div>
                    <dt>Loads</dt>
                    <dd>{selectedCircuitLoads.length}</dd>
                  </div>
                  <div>
                    <dt>Usage</dt>
                    <dd>{formatLoadKw(selectedCircuitUsageKw)}</dd>
                  </div>
                  <div>
                    <dt>Spike</dt>
                    <dd>{formatLoadKw(selectedCircuitSpikeKw)}</dd>
                  </div>
                  <div>
                    <dt>Inherited voltage</dt>
                    <dd>{formatVoltage(selectedCircuitVoltageV)}</dd>
                  </div>
                </dl>

                <div className="outcome-panel" style={{ marginTop: 16 }}>
                  <div className="outcome-summary">
                    <div className="outcome-status-line">
                      <p className="result-label">Load circuit</p>
                      <span>{selectedConverter ? getConversionDeviceTypeLabel(selectedConverter.device_type, t) : t('status.not_evaluated')}</span>
                    </div>
                    <p className="fit-note">Each load in this circuit is shown as a block below.</p>
                  </div>
                  <dl className="detail-stats outcome-checks">
                    <div>
                      <dt>Converter</dt>
                      <dd>{selectedConverter?.title ?? route.converterId}</dd>
                    </div>
                    <div>
                      <dt>Loads</dt>
                      <dd>{selectedCircuitLoads.length}</dd>
                    </div>
                    <div>
                      <dt>Usage</dt>
                      <dd>{formatLoadKw(selectedCircuitUsageKw)}</dd>
                    </div>
                    <div>
                      <dt>Spike</dt>
                      <dd>{formatLoadKw(selectedCircuitSpikeKw)}</dd>
                    </div>
                    <div>
                      <dt>Voltage</dt>
                      <dd>{formatVoltage(selectedCircuitVoltageV)}</dd>
                    </div>
                  </dl>
                </div>
              </>
            ) : (
              <>
                <dl className="detail-stats panel-spec-grid">
                  <div>
                    <dt>{t('catalog.stat.input_voltage')}</dt>
                    <dd>{selectedConverter?.input_voltage_v != null ? `${selectedConverter.input_voltage_v} V` : 'n/a'}</dd>
                  </div>
                  <div>
                    <dt>{t('catalog.stat.output_voltage')}</dt>
                    <dd>{selectedConverter?.output_voltage_v != null ? `${selectedConverter.output_voltage_v} V` : 'n/a'}</dd>
                  </div>
                  <div>
                    <dt>{t('catalog.stat.continuous_power')}</dt>
                    <dd>{selectedConverter?.continuous_power_w != null ? `${selectedConverter.continuous_power_w} W` : 'n/a'}</dd>
                  </div>
                  <div>
                    <dt>{t('catalog.stat.peak_power')}</dt>
                    <dd>{selectedConverter?.peak_power_va != null ? `${selectedConverter.peak_power_va} VA` : 'n/a'}</dd>
                  </div>
                </dl>

                <div className="outcome-panel" style={{ marginTop: 16 }}>
                  <div className="outcome-summary">
                    <div className="outcome-status-line">
                      <p className="result-label">Converter bank fit</p>
                      {converterBankCompatibility ? <StatusBadge status={converterBankCompatibility.status} /> : <span>{t('status.not_evaluated')}</span>}
                    </div>
                    <p className="fit-note">
                      {converterBankCompatibility
                        ? (converterBankCompatibility.status === 'outside_limits'
                          ? 'The selected battery bank cannot support this converter.'
                          : 'The selected battery bank can support this converter.')
                        : 'Select a battery bank to evaluate the fit.'}
                    </p>
                    {converterBankCompatibility ? (
                      <ul className="reason-list">
                        {converterBankCompatibility.reasons.map((reason) => (
                          <li key={reason}>{formatReasonFallback(reason)}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  {converterBankCompatibility ? (
                    <dl className="detail-stats outcome-checks">
                      <div>
                        <dt>Continuous output</dt>
                        <dd>{formatKw(converterBankCompatibility.totalContinuousPowerW)}</dd>
                      </div>
                      <div>
                        <dt>Peak output</dt>
                        <dd>{formatKw(converterBankCompatibility.totalPeakPowerVA)}</dd>
                      </div>
                      <div>
                        <dt>Battery discharge limit</dt>
                        <dd>{formatKw(converterBankCompatibility.batteryDischargeLimitW)}</dd>
                      </div>
                      <div>
                        <dt>Estimated battery current</dt>
                        <dd>{formatAmps(converterBankCompatibility.estimatedCurrentA)}</dd>
                      </div>
                    </dl>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="stack" style={{ gap: 12 }}>
            <div className="button-row button-row-between">
              <div className="stack" style={{ gap: 4, minWidth: 260 }}>
                <h2 style={{ margin: 0 }}>{selectedLoadCircuit ? 'Loads' : 'Load circuits'}</h2>
                <p>{selectedLoadCircuit ? 'Each load is shown as a block.' : 'Load circuits sit behind one converter.'}</p>
              </div>
              <div className="button-row">
                {selectedLoadCircuit ? (
                  <>
                    <button type="button" className="button button-secondary" onClick={() => void handleCreateLoad()} disabled={isWorking}>
                      {isWorking ? t('common.creating') : 'Add load'}
                    </button>
                    <select
                      value={selectedLoadPresetId}
                      onChange={(event) => setSelectedLoadPresetId(event.target.value)}
                      aria-label={t('catalog.ui.load_template')}
                    >
                      {LOAD_PRESETS.map((preset) => (
                        <option key={preset.load_preset_id} value={preset.load_preset_id}>
                          {preset.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => void handleCreateLoad(selectedLoadPreset)}
                      disabled={isWorking || !selectedLoadPreset}
                    >
                      {t('catalog.ui.add_from_catalog')}
                    </button>
                    <button
                      type="button"
                      className="button button-danger"
                      onClick={() => void deleteLoadCircuit(selectedLoadCircuit.load_circuit_id)}
                      disabled={isWorking}
                    >
                      {t('common.delete')}
                    </button>
                  </>
                ) : (
                  <button type="button" className="button button-secondary" onClick={() => void handleCreateCircuit()} disabled={isWorking}>
                    {isWorking ? t('common.creating') : 'Add circuit'}
                  </button>
                )}
              </div>
            </div>
            <div className="surface-grid">
              {selectedLoadCircuit ? (
                selectedCircuitLoads.length === 0 ? (
                  <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                    <p style={{ marginTop: 0, marginBottom: 0 }}>No loads in this circuit yet.</p>
                  </div>
                ) : (
                  selectedCircuitLoads.map((load) => {
                    const loadDraft = loadDrafts[load.load_id] ?? loadDraftFromEntity(load);
                    return (
                      <div key={load.load_id} className="surface-card-stack">
                        <div className="surface-card">
                          <div className="surface-card-top">
                            <div>
                              <h3>{loadDraft.title.trim() || load.title}</h3>
                              <p>{loadDraft.description.trim() || t('catalog.entry.load')}</p>
                            </div>
                          </div>
                          <label className="config-field" style={{ marginTop: 8 }}>
                            <span>{t('catalog.field.title')}</span>
                            <input
                              value={loadDraft.title}
                              onChange={(event) => setLoadDrafts((current) => ({
                                ...current,
                                [load.load_id]: {
                                  ...loadDraft,
                                  title: event.target.value,
                                },
                              }))}
                              placeholder="Fridge"
                            />
                          </label>
                          <label className="config-field">
                            <span>{t('catalog.field.description')}</span>
                            <textarea
                              value={loadDraft.description}
                              onChange={(event) => setLoadDrafts((current) => ({
                                ...current,
                                [load.load_id]: {
                                  ...loadDraft,
                                  description: event.target.value,
                                },
                              }))}
                              rows={2}
                              placeholder="Cold storage appliance"
                            />
                          </label>
                          <dl className="detail-stats compact-stats" style={{ marginTop: 8, marginBottom: 0 }}>
                            <div>
                              <dt>Usage</dt>
                              <dd>{formatLoadKw(load.usage_kw)}</dd>
                            </div>
                            <div>
                              <dt>Spike</dt>
                              <dd>{formatLoadKw(load.spike_kw)}</dd>
                            </div>
                            <div>
                              <dt>Hours</dt>
                              <dd>{load.expected_usage_hours_per_day.toLocaleString('en-US', { maximumFractionDigits: 1 })} h/day</dd>
                            </div>
                            <div>
                              <dt>Sleep</dt>
                              <dd>{formatLoadKw(load.sleeping_kw)}</dd>
                            </div>
                            <div>
                              <dt>{t('catalog.stat.voltage')}</dt>
                              <dd>{formatVoltage(selectedCircuitVoltageV)}</dd>
                            </div>
                          </dl>
                          <div className="button-row">
                            <button
                              type="button"
                              className="button button-secondary button-sm"
                              onClick={() => void saveLoadDetails(load.load_id)}
                              disabled={isWorking || !loadDraft.title.trim()}
                            >
                              {t('common.save')}
                            </button>
                            <button
                              type="button"
                              className="button button-danger button-sm"
                              onClick={() => void deleteLoad(load.load_id)}
                              disabled={isWorking}
                            >
                              {t('common.delete')}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                converterLoadCircuits.length === 0 ? (
                  <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                    <p style={{ marginTop: 0, marginBottom: 0 }}>No load circuits found.</p>
                  </div>
                ) : (
                  converterLoadCircuits.map((circuit) => {
                    const circuitLoads = data.entities.loads.filter((load) => load.load_circuit_id === circuit.load_circuit_id);
                    const circuitUsage = circuitLoads.reduce((sum, load) => sum + load.usage_kw, 0);
                    const circuitSpike = circuitLoads.reduce((sum, load) => sum + load.spike_kw, 0);
                    const isActive = selectedLoadCircuit?.load_circuit_id === circuit.load_circuit_id;
                    return (
                      <div
                        key={circuit.load_circuit_id}
                        id={`load-circuit-card-${circuit.load_circuit_id}`}
                        className={`surface-card-stack ${isActive ? 'surface-card-highlight' : ''}`}
                      >
                        <div className="surface-card">
                          <div className="surface-card-top">
                            <div>
                              <h3>{loadCircuitDrafts[circuit.load_circuit_id]?.title.trim() || circuit.title}</h3>
                              <p>{loadCircuitDrafts[circuit.load_circuit_id]?.description.trim() || `${circuitLoads.length} loads`}</p>
                            </div>
                          </div>
                          <label className="config-field" style={{ marginTop: 8 }}>
                            <span>{t('catalog.field.title')}</span>
                            <input
                              value={loadCircuitDrafts[circuit.load_circuit_id]?.title ?? circuit.title}
                              onChange={(event) => setLoadCircuitDrafts((current) => ({
                                ...current,
                                [circuit.load_circuit_id]: {
                                  ...(current[circuit.load_circuit_id] ?? loadCircuitDraftFromEntity(circuit, route.converterId)),
                                  title: event.target.value,
                                },
                              }))}
                              placeholder="Living room sockets"
                            />
                          </label>
                          <label className="config-field">
                            <span>{t('catalog.field.description')}</span>
                            <textarea
                              value={loadCircuitDrafts[circuit.load_circuit_id]?.description ?? circuit.description ?? ''}
                              onChange={(event) => setLoadCircuitDrafts((current) => ({
                                ...current,
                                [circuit.load_circuit_id]: {
                                  ...(current[circuit.load_circuit_id] ?? loadCircuitDraftFromEntity(circuit, route.converterId)),
                                  description: event.target.value,
                                },
                              }))}
                              rows={2}
                              placeholder="Grouped socket demand"
                            />
                          </label>
                          <dl className="detail-stats compact-stats" style={{ marginTop: 8, marginBottom: 0 }}>
                            <div>
                              <dt>Loads</dt>
                              <dd>{circuitLoads.length}</dd>
                            </div>
                            <div>
                              <dt>Usage</dt>
                              <dd>{formatLoadKw(circuitUsage)}</dd>
                            </div>
                            <div>
                              <dt>Spike</dt>
                              <dd>{formatLoadKw(circuitSpike)}</dd>
                            </div>
                          </dl>
                          <div className="button-row">
                            <button
                              type="button"
                              className="button button-secondary button-sm"
                              onClick={() => void saveLoadCircuitDetails(circuit.load_circuit_id)}
                              disabled={isWorking || !(loadCircuitDrafts[circuit.load_circuit_id]?.title.trim() ?? circuit.title.trim())}
                            >
                              {t('common.save')}
                            </button>
                            <button
                              type="button"
                              className="button button-secondary button-sm"
                              onClick={() => {
                                openCircuitDetails(circuit.load_circuit_id);
                                setActionError(null);
                              }}
                            >
                              {t('common.detail')}
                            </button>
                            <button
                              type="button"
                              className="button button-danger button-sm"
                              onClick={() => void deleteLoadCircuit(circuit.load_circuit_id)}
                            >
                              {t('common.delete')}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>

          {actionError ? <p className="save-error" style={{ marginTop: 16 }}>{actionError}</p> : null}
        </section>
      </section>
    </>
  );
}

function CabinetCatalogPage({
  data,
  refreshProjectData,
}: {
  data: DigitalTwinExport;
  refreshProjectData: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [selectedCabinetTypeId, setSelectedCabinetTypeId] = useState(() => data.entities.cabinet_types[0]?.cabinet_type_id ?? '');
  const [draft, setDraft] = useState<CabinetTypeDraft>(() => cabinetDraftFromType(data.entities.cabinet_types[0] ?? null));
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedCabinet = selectedCabinetTypeId
    ? data.entities.cabinet_types.find((item) => item.cabinet_type_id === selectedCabinetTypeId) ?? null
    : null;

  useEffect(() => {
    if (selectedCabinetTypeId) {
      const current = data.entities.cabinet_types.find((item) => item.cabinet_type_id === selectedCabinetTypeId) ?? null;
      setDraft(cabinetDraftFromType(current));
    } else {
      setDraft(emptyCabinetDraft());
    }
  }, [data, selectedCabinetTypeId]);

  function startAddNew() {
    setSelectedCabinetTypeId('');
    setSaveError(null);
    setSaveMessage(null);
    setDraft(emptyCabinetDraft());
  }

  async function handleSave() {
    const title = draft.title.trim();
    const cabinetTypeId = selectedCabinet ? selectedCabinetTypeId : generateUniqueCatalogId(title, data.entities.cabinet_types.map((cabinet) => cabinet.cabinet_type_id));
    const description = draft.description.trim() === '' ? null : draft.description.trim();
    const depthMm = Number(draft.depth_mm);
    const widthMm = Number(draft.width_mm);
    const heightMm = Number(draft.height_mm);
    const units = draft.units.trim();
    const price = draft.price.trim() === '' ? null : Number(draft.price);
    const priceSourceUrl = draft.price_source_url.trim() === '' ? null : draft.price_source_url.trim();
    const ipRating = draft.ip_rating.trim() === '' ? null : draft.ip_rating.trim();
    const insuranceRating = draft.insurance_rating.trim() === '' ? null : draft.insurance_rating.trim();

    if (!title || !units || !Number.isFinite(depthMm) || depthMm <= 0 || !Number.isFinite(widthMm) || widthMm <= 0 || !Number.isFinite(heightMm) || heightMm <= 0) {
      setSaveError(t('catalog.validation.cabinet_required'));
      return;
    }

    if (price != null && !Number.isFinite(price)) {
      setSaveError(t('catalog.validation.price_valid'));
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const isEdit = Boolean(selectedCabinet);
      const response = await fetch(isEdit ? `/api/cabinet-types/${encodeURIComponent(selectedCabinetTypeId)}` : '/api/cabinet-types', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabinet_type_id: cabinetTypeId,
          title,
          description,
          depth_mm: depthMm,
          width_mm: widthMm,
          height_mm: heightMm,
          units,
          price,
          price_source_url: priceSourceUrl,
          condensation_protection: draft.condensation_protection,
          insect_protection: draft.insect_protection,
          dust_protection: draft.dust_protection,
          outside_protection: draft.outside_protection,
          frost_protection: draft.frost_protection,
          fire_protection: draft.fire_protection,
          ip_rating: ipRating,
          insurance_rating: insuranceRating,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to save cabinet type (${response.status})`);
      }

      await refreshProjectData();
      setSelectedCabinetTypeId(cabinetTypeId);
      setDraft(cabinetDraftFromType({
        cabinet_type_id: cabinetTypeId,
        title,
        description,
        depth_mm: depthMm,
        width_mm: widthMm,
        height_mm: heightMm,
        units,
        price,
        price_source_url: priceSourceUrl,
        condensation_protection: draft.condensation_protection,
        insect_protection: draft.insect_protection,
        dust_protection: draft.dust_protection,
        outside_protection: draft.outside_protection,
        frost_protection: draft.frost_protection,
        fire_protection: draft.fire_protection,
        ip_rating: ipRating,
        insurance_rating: insuranceRating,
      } as CabinetType));
      setSaveMessage(t('catalog.message.saved', { item: t('catalog.entry.cabinet_type'), id: cabinetTypeId }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('catalog.validation.price_valid'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedCabinet) return;

    const confirmed = window.confirm(t('catalog.confirm.delete', { item: t('catalog.entry.cabinet_type'), id: selectedCabinet.cabinet_type_id }));
    if (!confirmed) return;

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const response = await fetch(`/api/cabinet-types/${encodeURIComponent(selectedCabinet.cabinet_type_id)}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to delete cabinet type (${response.status})`);
      }

      await refreshProjectData();
      const nextCabinet = data.entities.cabinet_types.find((item) => item.cabinet_type_id !== selectedCabinet.cabinet_type_id) ?? null;
      setSelectedCabinetTypeId(nextCabinet?.cabinet_type_id ?? '');
      setDraft(cabinetDraftFromType(nextCabinet));
      setSaveMessage(t('catalog.message.deleted', { item: t('catalog.entry.cabinet_type'), id: selectedCabinet.cabinet_type_id }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to delete cabinet type.');
    } finally {
      setIsSaving(false);
    }
  }

  const yesNo = (value: boolean) => (value ? t('common.yes') : t('common.no'));

  const cabinetEditor = (
    <>
      <div className="field">
        <span>{t('catalog.field.cabinet_type_id')}</span>
        <p className="muted">
          {selectedCabinet ? selectedCabinet.cabinet_type_id : (draft.title.trim() ? generateUniqueCatalogId(draft.title.trim(), data.entities.cabinet_types.map((cabinet) => cabinet.cabinet_type_id)) : t('catalog.ui.generated_after_save'))}
        </p>
      </div>
      <label className="field">
        <span>{t('catalog.field.title')}</span>
        <input
          value={draft.title}
          onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          placeholder="19 inch rack cabinet"
        />
      </label>
      <label className="field">
        <span>{t('catalog.field.description')}</span>
        <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} rows={3} />
      </label>
      <div className="detail-grid three-col">
        <label className="field"><span>{t('catalog.stat.depth')}</span><input type="number" value={draft.depth_mm} onChange={(event) => setDraft((current) => ({ ...current, depth_mm: event.target.value }))} /></label>
        <label className="field"><span>{t('catalog.stat.width')}</span><input type="number" value={draft.width_mm} onChange={(event) => setDraft((current) => ({ ...current, width_mm: event.target.value }))} /></label>
        <label className="field"><span>{t('catalog.stat.height')}</span><input type="number" value={draft.height_mm} onChange={(event) => setDraft((current) => ({ ...current, height_mm: event.target.value }))} /></label>
      </div>
      <label className="field">
        <span>{t('catalog.field.units')}</span>
        <input
          value={draft.units}
          onChange={(event) => setDraft((current) => ({ ...current, units: event.target.value }))}
          placeholder="42U"
        />
      </label>
      <div className="detail-grid two-col">
        <label className="field"><span>{t('catalog.stat.price')}</span><input type="number" value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} /></label>
        <label className="field"><span>{t('catalog.ui.source_url')}</span><input value={draft.price_source_url} onChange={(event) => setDraft((current) => ({ ...current, price_source_url: event.target.value }))} placeholder="https://..." /></label>
      </div>
      <div className="detail-grid two-col">
        <label className="field"><span>{t('catalog.field.ip_rating')}</span><input value={draft.ip_rating} onChange={(event) => setDraft((current) => ({ ...current, ip_rating: event.target.value }))} placeholder="IP55" /></label>
        <label className="field"><span>{t('catalog.field.insurance_rating')}</span><input value={draft.insurance_rating} onChange={(event) => setDraft((current) => ({ ...current, insurance_rating: event.target.value }))} placeholder="Class 60" /></label>
      </div>
      <div className="detail-grid two-col">
        <label className="field"><span>{t('catalog.field.condensation_protection')}</span><input type="checkbox" checked={draft.condensation_protection} onChange={(event) => setDraft((current) => ({ ...current, condensation_protection: event.target.checked }))} /></label>
        <label className="field"><span>{t('catalog.field.insect_protection')}</span><input type="checkbox" checked={draft.insect_protection} onChange={(event) => setDraft((current) => ({ ...current, insect_protection: event.target.checked }))} /></label>
      </div>
      <div className="detail-grid two-col">
        <label className="field"><span>{t('catalog.field.dust_protection')}</span><input type="checkbox" checked={draft.dust_protection} onChange={(event) => setDraft((current) => ({ ...current, dust_protection: event.target.checked }))} /></label>
        <label className="field"><span>{t('catalog.field.outside_protection')}</span><input type="checkbox" checked={draft.outside_protection} onChange={(event) => setDraft((current) => ({ ...current, outside_protection: event.target.checked }))} /></label>
      </div>
      <div className="detail-grid two-col">
        <label className="field"><span>{t('catalog.field.frost_protection')}</span><input type="checkbox" checked={draft.frost_protection} onChange={(event) => setDraft((current) => ({ ...current, frost_protection: event.target.checked }))} /></label>
        <label className="field"><span>{t('catalog.field.fire_protection')}</span><input type="checkbox" checked={draft.fire_protection} onChange={(event) => setDraft((current) => ({ ...current, fire_protection: event.target.checked }))} /></label>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <button type="button" className="button button-secondary" onClick={() => void handleSave()} disabled={isSaving || !draft.title.trim()}>
          {isSaving ? t('common.saving') : t('common.save')}
        </button>
        {selectedCabinet ? (
          <button type="button" className="button button-danger" onClick={() => void handleDelete()} disabled={isSaving}>
            {t('common.delete')}
          </button>
        ) : null}
        {saveError ? <p className="save-error">{saveError}</p> : null}
        {saveMessage ? <p className="save-message">{saveMessage}</p> : null}
      </div>
      {selectedCabinet ? (
        <dl className="detail-stats panel-spec-grid" style={{ marginTop: 16 }}>
          <div><dt>{t('catalog.field.title')}</dt><dd>{selectedCabinet.title}</dd></div>
          <div><dt>{t('catalog.stat.depth')}</dt><dd>{selectedCabinet.depth_mm} mm</dd></div>
          <div><dt>{t('catalog.stat.width')}</dt><dd>{selectedCabinet.width_mm} mm</dd></div>
          <div><dt>{t('catalog.stat.height')}</dt><dd>{selectedCabinet.height_mm} mm</dd></div>
          <div><dt>{t('catalog.stat.units')}</dt><dd>{selectedCabinet.units ?? '—'}</dd></div>
          <div><dt>{t('catalog.stat.price')}</dt><dd>{renderPrice(selectedCabinet.price, selectedCabinet.price_source_url)}</dd></div>
          <div><dt>{t('catalog.stat.ip_rating')}</dt><dd>{selectedCabinet.ip_rating ?? '—'}</dd></div>
          <div><dt>{t('catalog.stat.insurance_rating')}</dt><dd>{selectedCabinet.insurance_rating ?? '—'}</dd></div>
          <div><dt>{t('catalog.field.condensation_protection')}</dt><dd>{yesNo(selectedCabinet.condensation_protection)}</dd></div>
          <div><dt>{t('catalog.field.insect_protection')}</dt><dd>{yesNo(selectedCabinet.insect_protection)}</dd></div>
          <div><dt>{t('catalog.field.dust_protection')}</dt><dd>{yesNo(selectedCabinet.dust_protection)}</dd></div>
          <div><dt>{t('catalog.field.outside_protection')}</dt><dd>{yesNo(selectedCabinet.outside_protection)}</dd></div>
          <div><dt>{t('catalog.field.frost_protection')}</dt><dd>{yesNo(selectedCabinet.frost_protection)}</dd></div>
          <div><dt>{t('catalog.field.fire_protection')}</dt><dd>{yesNo(selectedCabinet.fire_protection)}</dd></div>
        </dl>
      ) : null}
    </>
  );

  return (
    <>
      <section className="detail-shell">
        <section className="panel">
          <div className="stack" style={{ gap: 12 }}>
            <div className="button-row button-row-between">
              <button type="button" className="button button-secondary" onClick={startAddNew}>
                {t('catalog.ui.add_item', { item: t('catalog.entry.cabinet_type') })}
              </button>
            </div>
            <div className="yield-table-wrap">
              <table className="yield-table catalog-table">
                <thead>
                  <tr>
                    <th>{t('catalog.field.title')}</th>
                    <th>{t('catalog.stat.depth')}</th>
                    <th>{t('catalog.stat.width')}</th>
                    <th>{t('catalog.stat.height')}</th>
                    <th>{t('catalog.stat.units')}</th>
                    <th>{t('catalog.stat.price')}</th>
                    <th>{t('catalog.ui.source')}</th>
                    <th>{t('catalog.stat.ip_rating')}</th>
                    <th>{t('catalog.stat.insurance_rating')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {!selectedCabinet ? (
                    <CatalogInlineEditorRow
                      colSpan={10}
                      title={t('catalog.ui.add_item', { item: t('catalog.entry.cabinet_type') })}
                      subtitle={t('catalog.ui.changes_saved')}
                    >
                      {cabinetEditor}
                    </CatalogInlineEditorRow>
                  ) : null}
                  {data.entities.cabinet_types.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="muted">{t('catalog.ui.no_entries')}</td>
                    </tr>
                  ) : data.entities.cabinet_types.map((cabinet) => (
                    <React.Fragment key={cabinet.cabinet_type_id}>
                      <tr
                        className={selectedCabinetTypeId === cabinet.cabinet_type_id ? 'selected' : ''}
                        onClick={() => {
                          setSelectedCabinetTypeId(cabinet.cabinet_type_id);
                          setSaveError(null);
                          setSaveMessage(null);
                        }}
                      >
                        <td className="catalog-table-model-col">{cabinet.title}</td>
                        <td>{cabinet.depth_mm} mm</td>
                        <td>{cabinet.width_mm} mm</td>
                        <td>{cabinet.height_mm} mm</td>
                        <td>{cabinet.units ?? '—'}</td>
                        <td>{renderPrice(cabinet.price, cabinet.price_source_url)}</td>
                        <td>{cabinet.price_source_url ? <a className="price-link" href={cabinet.price_source_url} target="_blank" rel="noreferrer">{formatPriceSourceName(cabinet.price_source_url) ?? t('common.open')}</a> : '—'}</td>
                        <td>{cabinet.ip_rating ?? '—'}</td>
                        <td>{cabinet.insurance_rating ?? '—'}</td>
                        <td>
                          <button
                            type="button"
                            className="button button-secondary button-sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedCabinetTypeId(cabinet.cabinet_type_id);
                              setSaveError(null);
                              setSaveMessage(null);
                            }}
                          >
                            {t('common.edit')}
                          </button>
                        </td>
                      </tr>
                      {selectedCabinetTypeId === cabinet.cabinet_type_id ? (
                        <CatalogInlineEditorRow
                          colSpan={10}
                          title={t('catalog.ui.edit_item', { item: t('catalog.entry.cabinet_type') })}
                          subtitle={t('catalog.ui.changes_saved')}
                        >
                          {cabinetEditor}
                        </CatalogInlineEditorRow>
                      ) : null}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
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
  const { t } = useTranslation();
  const [selectedBatteryTypeId, setSelectedBatteryTypeId] = useState(() => data.entities.battery_types[0]?.battery_type_id ?? '');
  const [draft, setDraft] = useState<BatteryTypeDraft>(() => batteryDraftFromType(data.entities.battery_types[0] ?? null));
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [addBatteryReturnId, setAddBatteryReturnId] = useState<string | null>(data.entities.battery_types[0]?.battery_type_id ?? null);
  const [openBatteryEditorId, setOpenBatteryEditorId] = useState<string | null>(data.entities.battery_types[0]?.battery_type_id ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [advancedOpenByBatteryTypeId, setAdvancedOpenByBatteryTypeId] = useState<Record<string, boolean>>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const selectedBattery = selectedBatteryTypeId
    ? data.entities.battery_types.find((item) => item.battery_type_id === selectedBatteryTypeId) ?? null
    : null;
  const batteryEditorStateKey = isAddingNew ? '__new__' : (selectedBatteryTypeId || '__new__');
  const isBatteryAdvancedOpen = advancedOpenByBatteryTypeId[batteryEditorStateKey] ?? false;
  const batteryEditorIdentifier = selectedBattery
    ? selectedBattery.battery_type_id
    : (draft.model.trim() ? generateUniqueCatalogId(draft.model.trim(), data.entities.battery_types.map((battery) => battery.battery_type_id)) : t('catalog.ui.generated_after_save'));
  const isBatteryDraftSaveReady = Boolean(
    draft.brand.trim()
    && draft.model.trim()
    && draft.chemistry.trim()
    && Number.isFinite(Number(draft.nominal_voltage))
    && Number(draft.nominal_voltage) > 0
    && Number.isFinite(Number(draft.capacity_ah))
    && Number(draft.capacity_ah) > 0
    && Number.isFinite(Number(draft.capacity_kwh))
    && Number(draft.capacity_kwh) > 0
  );

  useEffect(() => {
    if (selectedBatteryTypeId) {
      const current = data.entities.battery_types.find((item) => item.battery_type_id === selectedBatteryTypeId) ?? null;
      setDraft(batteryDraftFromType(current));
    } else {
      setDraft(emptyBatteryDraft());
    }
  }, [data, selectedBatteryTypeId]);

  function startAddNew() {
    setAddBatteryReturnId(selectedBatteryTypeId || null);
    setSelectedBatteryTypeId('');
    setIsAddingNew(true);
    setOpenBatteryEditorId(null);
    setSaveError(null);
    setSaveMessage(null);
    setDeleteConfirmOpen(false);
    setDraft(emptyBatteryDraft());
  }

  function openExistingBatteryEditor(batteryTypeId: string) {
    setSelectedBatteryTypeId(batteryTypeId);
    setOpenBatteryEditorId(batteryTypeId);
    setIsAddingNew(false);
    setSaveError(null);
    setSaveMessage(null);
    setDeleteConfirmOpen(false);
  }

  function selectBatteryType(batteryTypeId: string) {
    setSelectedBatteryTypeId(batteryTypeId);
    setIsAddingNew(false);
    setAddBatteryReturnId(null);
    setOpenBatteryEditorId(null);
    setSaveError(null);
    setSaveMessage(null);
    setDeleteConfirmOpen(false);
  }

  function closeBatteryEditor() {
    if (isAddingNew) {
      setSelectedBatteryTypeId(addBatteryReturnId ?? '');
    }
    setIsAddingNew(false);
    setAddBatteryReturnId(null);
    setOpenBatteryEditorId(null);
    setSaveError(null);
    setSaveMessage(null);
    setDeleteConfirmOpen(false);
  }

  async function handleSave(): Promise<boolean> {
    const brand = draft.brand.trim();
    const model = draft.model.trim();
    const isEdit = Boolean(selectedBattery) && !isAddingNew;
    const batteryTypeId = isEdit ? selectedBatteryTypeId : generateUniqueCatalogId(model, data.entities.battery_types.map((battery) => battery.battery_type_id));
    const chemistry = draft.chemistry.trim();
    const nominalVoltage = Number(draft.nominal_voltage);
    const capacityAh = Number(draft.capacity_ah);
    const capacityKwh = Number(draft.capacity_kwh);
    const maxChargeRate = draft.max_charge_rate.trim() === '' ? null : Number(draft.max_charge_rate);
    const maxDischargeRate = draft.max_discharge_rate.trim() === '' ? null : Number(draft.max_discharge_rate);
    const price = draft.price.trim() === '' ? null : Number(draft.price);
    const priceSourceUrl = draft.price_source_url.trim() === '' ? null : draft.price_source_url.trim();
    const notes = draft.notes.trim() === '' ? null : draft.notes.trim();

    if (!brand || !model || !chemistry || !Number.isFinite(nominalVoltage) || nominalVoltage <= 0 || !Number.isFinite(capacityAh) || capacityAh <= 0 || !Number.isFinite(capacityKwh) || capacityKwh <= 0) {
      setSaveError(t('catalog.validation.battery_required'));
      return false;
    }

    if ((maxChargeRate != null && !Number.isFinite(maxChargeRate)) || (maxDischargeRate != null && !Number.isFinite(maxDischargeRate)) || (price != null && !Number.isFinite(price))) {
      setSaveError(t('catalog.validation.optional_numeric_fields'));
      return false;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const response = await fetch(isEdit ? `/api/battery-types/${encodeURIComponent(selectedBatteryTypeId)}` : '/api/battery-types', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          battery_type_id: batteryTypeId,
          brand,
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
          price_source_url: priceSourceUrl,
          notes,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to save battery (${response.status})`);
      }

      await refreshProjectData();
      setSelectedBatteryTypeId(batteryTypeId);
      setIsAddingNew(false);
      setAddBatteryReturnId(null);
      setOpenBatteryEditorId(null);
      setDeleteConfirmOpen(false);
      setDraft(batteryDraftFromType({
        battery_type_id: batteryTypeId,
        brand,
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
        price_source_url: priceSourceUrl,
        source: priceSourceUrl,
        url: priceSourceUrl,
        notes,
      }));
      setSaveMessage(t('catalog.message.saved', { item: t('catalog.entry.battery'), id: batteryTypeId }));
      return true;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('catalog.validation.optional_numeric_fields'));
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(): Promise<boolean> {
    if (!selectedBattery || isAddingNew) return false;

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const response = await fetch(`/api/battery-types/${encodeURIComponent(selectedBattery.battery_type_id)}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to delete battery (${response.status})`);
      }

      await refreshProjectData();
      const nextBattery = data.entities.battery_types.find((item) => item.battery_type_id !== selectedBattery.battery_type_id) ?? null;
      setSelectedBatteryTypeId(nextBattery?.battery_type_id ?? '');
      setIsAddingNew(false);
      setAddBatteryReturnId(null);
      setOpenBatteryEditorId(null);
      setDeleteConfirmOpen(false);
      setDraft(batteryDraftFromType(nextBattery));
      setSaveMessage(t('catalog.message.deleted', { item: t('catalog.entry.battery'), id: selectedBattery.battery_type_id }));
      return true;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to delete battery.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  const updateBatteryDraftField = (field: keyof BatteryTypeDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const batteryEditor = (
    <div className="stack" style={{ gap: 16 }} data-battery-model={draft.model}>
      <div className="catalog-inline-grid catalog-inline-grid-6 catalog-inline-basic">
        <label className="field catalog-inline-span-1">
          <span>{t('catalog.field.brand')}</span>
          <input
            value={draft.brand}
            onChange={(event) => setDraft((current) => ({ ...current, brand: event.target.value }))}
            onInput={(event) => updateBatteryDraftField('brand', event.currentTarget.value)}
            placeholder="Pylontech"
          />
        </label>
        <label className="field catalog-inline-span-1">
          <span>{t('catalog.field.model')}</span>
          <input
            value={draft.model}
            onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))}
            onInput={(event) => updateBatteryDraftField('model', event.currentTarget.value)}
            placeholder="US5000-1C"
          />
        </label>
        <label className="field catalog-inline-span-1">
          <span>{t('catalog.field.capacity_kwh')}</span>
          <input
            type="number"
            value={draft.capacity_kwh}
            onChange={(event) => setDraft((current) => ({ ...current, capacity_kwh: event.target.value }))}
            onInput={(event) => updateBatteryDraftField('capacity_kwh', event.currentTarget.value)}
          />
        </label>
        <label className="field catalog-inline-span-1">
          <span>{t('catalog.field.nominal_voltage')}</span>
          <input
            type="number"
            value={draft.nominal_voltage}
            onChange={(event) => setDraft((current) => ({ ...current, nominal_voltage: event.target.value }))}
            onInput={(event) => updateBatteryDraftField('nominal_voltage', event.currentTarget.value)}
          />
        </label>
        <label className="field catalog-inline-span-1">
          <span>{t('catalog.stat.price')}</span>
          <input
            type="number"
            value={draft.price}
            onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))}
            onInput={(event) => updateBatteryDraftField('price', event.currentTarget.value)}
          />
        </label>
        <label className="field catalog-inline-span-1">
          <span>{t('catalog.ui.price_source_url')}</span>
          <input
            value={draft.price_source_url}
            onChange={(event) => setDraft((current) => ({ ...current, price_source_url: event.target.value }))}
            onInput={(event) => updateBatteryDraftField('price_source_url', event.currentTarget.value)}
            placeholder="https://..."
          />
        </label>
      </div>
      <details
        className="catalog-inline-advanced"
        open={isBatteryAdvancedOpen}
        onToggle={(event) => {
          const nextOpen = event.currentTarget.open;
          setAdvancedOpenByBatteryTypeId((current) => ({
            ...current,
            [batteryEditorStateKey]: nextOpen,
          }));
        }}
      >
        <summary>Non-table fields</summary>
        <div className="stack" style={{ gap: 12 }}>
          <div className="catalog-inline-grid catalog-inline-grid-6 catalog-inline-advanced-grid">
            <label className="field catalog-inline-span-1">
              <span>{t('catalog.field.capacity_ah')}</span>
              <input
                type="number"
                value={draft.capacity_ah}
                onChange={(event) => setDraft((current) => ({ ...current, capacity_ah: event.target.value }))}
                onInput={(event) => updateBatteryDraftField('capacity_ah', event.currentTarget.value)}
              />
            </label>
            <label className="field catalog-inline-span-1">
              <span>{t('catalog.field.chemistry')}</span>
              <input
                value={draft.chemistry}
                onChange={(event) => setDraft((current) => ({ ...current, chemistry: event.target.value }))}
                onInput={(event) => updateBatteryDraftField('chemistry', event.currentTarget.value)}
                placeholder="LiFePO4"
              />
            </label>
            <label className="field catalog-inline-span-1">
              <span>{t('catalog.field.cooling')}</span>
              <select
                value={draft.cooling}
                onChange={(event) => setDraft((current) => ({ ...current, cooling: event.target.value as 'active' | 'passive' }))}
              >
                <option value="passive">passive</option>
                <option value="active">active</option>
              </select>
            </label>
            <label className="field catalog-inline-span-1 catalog-inline-checkbox-field">
              <span>{t('catalog.field.victron_can')}</span>
              <input
                type="checkbox"
                checked={draft.victron_can}
                onChange={(event) => setDraft((current) => ({ ...current, victron_can: event.target.checked }))}
              />
            </label>
            <label className="field catalog-inline-span-1">
              <span>{t('catalog.field.max_charge_rate')}</span>
              <input
                type="number"
                value={draft.max_charge_rate}
                onChange={(event) => setDraft((current) => ({ ...current, max_charge_rate: event.target.value }))}
                onInput={(event) => updateBatteryDraftField('max_charge_rate', event.currentTarget.value)}
              />
            </label>
            <label className="field catalog-inline-span-1">
              <span>{t('catalog.field.max_discharge_rate')}</span>
              <input
                type="number"
                value={draft.max_discharge_rate}
                onChange={(event) => setDraft((current) => ({ ...current, max_discharge_rate: event.target.value }))}
                onInput={(event) => updateBatteryDraftField('max_discharge_rate', event.currentTarget.value)}
              />
            </label>
          </div>
          <label className="field catalog-inline-span-3">
            <span>{t('catalog.ui.notes')}</span>
            <textarea
              value={draft.notes}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              onInput={(event) => updateBatteryDraftField('notes', event.currentTarget.value)}
              rows={1}
            />
          </label>
        </div>
      </details>
      <div className="button-row">
        <button type="button" className="button button-secondary" onClickCapture={(event) => {
          event.preventDefault();
          event.stopPropagation();
          closeBatteryEditor();
        }} disabled={isSaving}>
          {t('common.cancel')}
        </button>
        <button type="button" className="button button-success" onClickCapture={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void (async () => {
            if (await handleSave()) {
              closeBatteryEditor();
            }
          })();
        }} disabled={isSaving || !isBatteryDraftSaveReady}>
          {isSaving ? t('common.saving') : t('common.save')}
        </button>
        {!isAddingNew && selectedBattery ? (
          <button type="button" className="button button-danger" onClickCapture={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDeleteConfirmOpen(true);
          }} disabled={isSaving}>
            {t('common.delete')}
          </button>
        ) : null}
        {saveError ? <p className="save-error">{saveError}</p> : null}
        {saveMessage ? <p className="save-message">{saveMessage}</p> : null}
      </div>
    </div>
  );

  return (
    <>
      <section className="detail-shell">
        <section className="panel">
          <div className="stack" style={{ gap: 12 }}>
            <div className="button-row button-row-between">
              <div className="button-row">
                <button type="button" className="button button-secondary button-sm" onClick={startAddNew}>
                  {t('catalog.ui.add_item', { item: t('catalog.entry.battery') })}
                </button>
                <button
                  type="button"
                  className="button button-secondary button-sm"
                  onClick={() => {
                    if (selectedBatteryTypeId) {
                      openExistingBatteryEditor(selectedBatteryTypeId);
                    }
                  }}
                  disabled={!selectedBattery}
                >
                  {t('common.edit')} {t('catalog.entry.battery')}
                </button>
              </div>
            </div>
            <div className="yield-table-wrap">
              <table className="yield-table catalog-table">
                <thead>
                  <tr>
                    <th className="catalog-table-brand-col">{t('catalog.field.brand')}</th>
                    <th className="catalog-table-model-col">{t('catalog.field.model')}</th>
                    <th>{t('catalog.stat.capacity')}</th>
                    <th>{t('catalog.stat.voltage')}</th>
                    <th>{t('catalog.stat.price')}</th>
                    <th>{t('catalog.stat.price_per_kwh')}</th>
                    <th className="catalog-table-battery-source-col">{t('catalog.ui.source')}</th>
                  </tr>
                </thead>
                <tbody>
                  {isAddingNew ? (
                    <CatalogInlineEditorRow
                      colSpan={7}
                      title={t('catalog.ui.add_item', { item: t('catalog.entry.battery') })}
                      subtitle={t('catalog.ui.changes_saved')}
                    >
                      {batteryEditor}
                    </CatalogInlineEditorRow>
                  ) : null}
                  {data.entities.battery_types.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="catalog-table-empty">
                        {t('catalog.ui.no_entries')}
                      </td>
                    </tr>
                  ) : [...data.entities.battery_types].sort((a, b) => {
                    const brandCmp = a.brand.localeCompare(b.brand);
                    return brandCmp !== 0 ? brandCmp : a.model.localeCompare(b.model);
                  }).map((battery) => (
                    <React.Fragment key={battery.battery_type_id}>
                      <tr
                        className={`catalog-table-row ${selectedBatteryTypeId === battery.battery_type_id ? 'catalog-table-row-active' : ''}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          selectBatteryType(battery.battery_type_id);
                        }}
                        onDoubleClick={() => {
                          openExistingBatteryEditor(battery.battery_type_id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            selectBatteryType(battery.battery_type_id);
                          }
                        }}
                      >
                        <td className="catalog-table-brand-col">{battery.brand}</td>
                        <td className="catalog-table-model-col">{battery.model}</td>
                        <td>{battery.capacity_kwh} kWh</td>
                        <td>{battery.nominal_voltage} V</td>
                        <td>{renderPrice(battery.price, battery.price_source_url)}</td>
                        <td>{renderPrice(battery.price_per_kwh, battery.price_source_url)}</td>
                        <td className="catalog-table-battery-source-col">{battery.price_source_url ? <a className="price-link" href={battery.price_source_url} target="_blank" rel="noreferrer">{formatPriceSourceName(battery.price_source_url) ?? t('common.open')}</a> : '—'}</td>
                      </tr>
                      {openBatteryEditorId === battery.battery_type_id ? (
                        <CatalogInlineEditorRow
                          colSpan={7}
                          title={t('catalog.ui.edit_item', { item: t('catalog.entry.battery') })}
                          subtitle={t('catalog.ui.changes_saved')}
                        >
                          {batteryEditor}
                        </CatalogInlineEditorRow>
                      ) : null}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </section>
      {deleteConfirmOpen && selectedBattery ? (
        <ConfirmDialog
          title={t('catalog.confirm.delete', { item: t('catalog.entry.battery'), id: batteryEditorIdentifier })}
          message={t('catalog.confirm.delete_body')}
          confirmLabel={t('catalog.confirm.delete_action')}
          cancelLabel={t('common.cancel')}
          confirmTone="danger"
          onCancel={() => setDeleteConfirmOpen(false)}
          onConfirm={() => {
            void (async () => {
              if (await handleDelete()) {
                closeBatteryEditor();
              }
            })();
          }}
        />
      ) : null}
    </>
  );
}

function CatalogsPage() {
  const { t } = useTranslation();
  return (
    <>
      <section className="hero">
        <div>
          <p className="hero-copy">
            {t('catalogs.hero')}
          </p>
        </div>
      </section>
      <section className="panel">
        <div className="section-head">
          <h2>{t('catalogs.list_title')}</h2>
        </div>
        <div className="menu-list">
          {CATALOG_ROUTES.map((catalog) => (
            <div key={catalog.catalog} className="menu-row">
              <div className="menu-row-title">{t(catalog.labelKey)}</div>
              <a
                href={routeHref({ kind: 'catalog', catalog: catalog.catalog })}
                onClick={(event) => {
                  event.preventDefault();
                  navigateTo({ kind: 'catalog', catalog: catalog.catalog });
                }}
                className="button button-secondary menu-row-action"
              >
                {t('common.open')} {t(catalog.labelKey)}
              </a>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function ReportsPage() {
  const { t } = useTranslation();
  return (
    <>
      <section className="hero">
        <div>
          <p className="hero-copy">
            {t('reports.hero')}
          </p>
        </div>
      </section>
      <section className="panel">
        <div className="section-head">
          <h2>{t('reports.list_title')}</h2>
        </div>
        <div className="menu-list">
          {REPORT_ROUTES.map((report) => (
            <div key={report.kind} className="menu-row">
              <div className="menu-row-title">{t(report.labelKey)}</div>
              <a
                href={routeHref({ kind: report.kind })}
                onClick={(event) => {
                  event.preventDefault();
                  navigateTo({ kind: report.kind });
                }}
                className="button button-secondary menu-row-action"
              >
                {t('common.open')} {t(report.labelKey)}
              </a>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function VerdictSummaryPage({
  data,
  arrayBySurfaceId,
  localSurfaceSummaries,
  localTotalInstalledWp,
  relationByArray,
  mpptByArray,
  batteryBank,
  projectInverter,
  batteryToInverter,
}: PageContext) {
  const { t } = useTranslation();

  const surfaceRows = localSurfaceSummaries.map((surface) => {
    const array = arrayBySurfaceId.get(surface.surface_id) ?? null;
    const relation = array ? relationByArray.get(array.array_id) ?? null : null;
    const panelType = array?.panel_type_id
      ? data.entities.panel_types.find((item) => item.panel_type_id === array.panel_type_id) ?? null
      : null;
    const mpptConfiguration = array ? mpptByArray.get(array.array_id) ?? null : null;
    const mpptType = mpptConfiguration?.mppt_type_id
      ? data.entities.mppt_types.find((item) => item.mppt_type_id === mpptConfiguration.mppt_type_id) ?? null
      : null;
    const verdictSummary = getRelationshipVerdictSummary('array_to_mppt', relation?.evaluation.electrical_status ?? null, relation?.evaluation.fit_status, t, relation?.evaluation.reasons);
    const verdictLabel = getRelationshipVerdictLabel('array_to_mppt', relation?.evaluation.electrical_status ?? null, relation?.evaluation.fit_status, t);

    return {
      surface,
      panelType,
      mpptType,
      status: relation?.evaluation.electrical_status ?? null,
      fit: relation?.evaluation.fit_status,
      verdictLabel,
      verdictSummary,
    };
  });

  const inverterVerdictSummary = batteryToInverter
    ? getRelationshipVerdictSummary('battery_to_inverter', batteryToInverter.evaluation.electrical_status, batteryToInverter.evaluation.fit_status, t)
    : null;
  const inverterVerdictLabel = batteryToInverter
    ? getRelationshipVerdictLabel('battery_to_inverter', batteryToInverter.evaluation.electrical_status, batteryToInverter.evaluation.fit_status, t)
    : t('status.not_evaluated');

  const batteryDesign = data.entities.battery_bank_configurations.find((item) => item.battery_bank_id === 'battery-bank-main') ?? null;
  const batterySelectedType = batteryBank?.battery_type_id
    ? data.entities.battery_types.find((item) => item.battery_type_id === batteryBank.battery_type_id) ?? null
    : batteryDesign?.selected_battery_type_id
      ? data.entities.battery_types.find((item) => item.battery_type_id === batteryDesign.selected_battery_type_id) ?? null
      : null;
  const batteryArrayConfig = batteryDesign && batterySelectedType
    ? evaluateBatteryArrayConfiguration(
      batterySelectedType,
      batteryDesign.configured_battery_count,
      Math.max(1, batteryDesign.batteries_per_string),
      Math.max(1, batteryDesign.parallel_strings),
    )
    : null;
  const activeUpstreamRelations = data.relationships.array_to_mppt.filter((relation) => {
    const array = data.entities.arrays.find((item) => item.array_id === relation.from_array_id);
    return (array?.panel_count ?? 0) > 0;
  });
  const totalUpstreamInputPowerW = activeUpstreamRelations.reduce((sum, relation) => sum + relation.input_power_w, 0);
  const surfaceVerdictSource = surfaceRows.length === 1
    ? surfaceRows[0]
    : surfaceRows.length > 1 && surfaceRows.every((row) => row.verdictLabel === surfaceRows[0].verdictLabel && row.verdictSummary === surfaceRows[0].verdictSummary)
      ? surfaceRows[0]
      : null;
  const surfaceVerdictLabel = surfaceVerdictSource?.verdictLabel ?? (surfaceRows.length > 0 ? t('report.verdict.mixed') : t('status.not_evaluated'));
  const surfaceVerdictSummary = surfaceVerdictSource?.verdictSummary ?? null;
  const surfaceVerdictStatus = surfaceVerdictSource?.status ?? null;
  const surfaceVerdictFit = surfaceVerdictSource?.fit;
  const bestMonth = data.derived.project_monthly_solar_output
    .map((row) => ({
      month: row.month,
      totalDailyKwh: row.average_daily_kwh,
    }))
    .sort((left, right) => right.totalDailyKwh - left.totalDailyKwh)[0] ?? null;
  const refillEnergyKwh = batteryArrayConfig
    ? Number((batteryArrayConfig.totalCapacityKwh * 0.6).toFixed(2))
    : null;
  const estimatedChargeCurrentA = batteryArrayConfig && batteryArrayConfig.stringVoltage > 0
    ? Number((totalUpstreamInputPowerW / batteryArrayConfig.stringVoltage).toFixed(2))
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
  const batteryEvaluationCopy = getBatteryEvaluationCopy({
    chargeCurrentExceeded,
    estimatedChargeCurrentA,
    maxChargeCurrentA: batteryArrayConfig?.maxChargeCurrentA ?? null,
    refillEnergyKwh,
    bestMonthDailyYieldKwh: bestMonth?.totalDailyKwh ?? 0,
    batteryRefillRule,
    t,
  });
  const batteryAggregate = batteryEvaluationCopy?.headline ?? t('status.not_evaluated');
  const batteryAggregateTone = batteryEvaluationCopy?.tone ?? 'muted';
  const batteryWhy = batteryEvaluationCopy?.reasons[0] ?? t('production.table.not_evaluated');
  const inverterAggregateTone = !batteryToInverter
    ? 'muted'
    : batteryToInverter.evaluation.electrical_status === 'outside_limits'
      ? 'danger'
      : 'good';

  return (
    <>
      <section className="panel" style={{ marginBottom: 20 }}>
        <dl className="detail-stats panel-spec-grid" style={{ marginTop: 0 }}>
          <div>
            <dt>{t('report.verdict.surface_verdicts')}</dt>
            <dd>
              <div className="stack" style={{ gap: 6 }}>
                {surfaceVerdictSource ? <StatusBadge status={surfaceVerdictStatus} fit={surfaceVerdictFit} /> : null}
                <span>{surfaceVerdictLabel} · {t('report.verdict.surfaces_count', { count: surfaceRows.length })}</span>
                {surfaceVerdictSummary ? <span className="fit-note">{surfaceVerdictSummary}</span> : null}
              </div>
            </dd>
          </div>
          <div>
            <dt>{t('report.verdict.battery_verdict')}</dt>
            <dd>
              <div className="stack" style={{ gap: 6 }}>
                <span className={`status status-${batteryAggregateTone}`}>{batteryAggregate}</span>
              </div>
            </dd>
          </div>
          <div>
            <dt>{t('report.verdict.inverter_verdict')}</dt>
            <dd>
              <div className="stack" style={{ gap: 6 }}>
                {batteryToInverter ? <StatusBadge status={batteryToInverter.evaluation.electrical_status} fit={batteryToInverter.evaluation.fit_status} /> : <span>{t('status.not_evaluated')}</span>}
                <span>{inverterVerdictLabel}</span>
              </div>
            </dd>
          </div>
        </dl>
      </section>

      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="section-head">
          <h2>{t('report.verdict.surface_verdicts')}</h2>
        </div>
        {surfaceRows.length > 0 ? (
          <div className="yield-table-wrap">
            <table className="yield-table">
              <thead>
                <tr>
                  <th>{t('report.table.surface')}</th>
                  <th>{t('report.table.selected_panel')}</th>
                  <th>{t('report.table.selected_mppt')}</th>
                  <th>{t('report.table.verdict')}</th>
                  <th>{t('report.table.why')}</th>
                </tr>
              </thead>
              <tbody>
                {surfaceRows.map(({ surface, panelType, mpptType, status, fit, verdictSummary }) => (
                  <tr key={surface.surface_id}>
                    <th>{surface.name}</th>
                    <td>{panelType?.model ? `${panelType.model} × ${surface.panel_count}` : 'n/a'}</td>
                    <td>{mpptType?.model ?? 'n/a'}</td>
                    <td><StatusBadge status={status} fit={fit} /></td>
                    <td>{verdictSummary ?? t('production.table.not_evaluated')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p style={{ margin: 0 }}>{t('report.empty.no_surfaces')}</p>
          </div>
        )}
      </section>

      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="section-head">
          <h2>{t('report.verdict.battery_verdict')}</h2>
        </div>
        <dl className="detail-stats panel-spec-grid" style={{ marginTop: 0, marginBottom: 16 }}>
          <div>
            <dt>{t('report.label.selected_battery_type')}</dt>
            <dd>{batteryBank?.battery_type_id ? data.entities.battery_types.find((item) => item.battery_type_id === batteryBank.battery_type_id)?.model ?? batteryBank.battery_type_id : 'n/a'}</dd>
          </div>
          <div>
            <dt>{t('report.label.configured_pv_total')}</dt>
            <dd>{formatWp(localTotalInstalledWp)}</dd>
          </div>
          <div>
            <dt>{t('report.table.verdict')}</dt>
            <dd>{batteryEvaluationCopy ? <span className={`status status-${batteryAggregateTone}`}>{batteryAggregate}</span> : t('status.not_evaluated')}</dd>
          </div>
          <div>
            <dt>{t('report.table.why')}</dt>
            <dd>{batteryWhy}</dd>
          </div>
        </dl>
        {!batteryEvaluationCopy ? (
          <div className="empty-state">
            <p style={{ margin: 0 }}>{t('report.empty.choose_battery')}</p>
          </div>
        ) : null}
        <p style={{ marginTop: 12, marginBottom: 0, color: 'var(--muted)', fontSize: '0.86rem' }}>
          {t('report.verdict.battery_project_note')}
        </p>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>{t('report.verdict.inverter_verdict')}</h2>
        </div>
        {projectInverter ? (
          <dl className="detail-stats panel-spec-grid" style={{ marginTop: 0 }}>
            <div>
              <dt>{t('report.label.selected_inverter')}</dt>
              <dd>{projectInverter.name}</dd>
            </div>
            <div>
              <dt>{t('report.table.verdict')}</dt>
              <dd>{batteryToInverter ? <StatusBadge status={batteryToInverter.evaluation.electrical_status} fit={batteryToInverter.evaluation.fit_status} /> : inverterVerdictLabel}</dd>
            </div>
            <div>
              <dt>{t('report.table.why')}</dt>
              <dd>{inverterVerdictSummary ?? t('production.table.not_evaluated')}</dd>
            </div>
          </dl>
        ) : (
          <div className="empty-state">
            <p style={{ margin: 0 }}>{t('report.empty.choose_inverter')}</p>
          </div>
        )}
      </section>
    </>
  );
}

function CostSummaryPage({
  data,
  arrayBySurfaceId,
  localSurfaceSummaries,
  mpptByArray,
  batteryBank,
  batteryBankState,
  projectInverter,
}: PageContext) {
  const { t } = useTranslation();
  const selectedBatteryType = batteryBank?.battery_type_id
    ? data.entities.battery_types.find((item) => item.battery_type_id === batteryBank.battery_type_id) ?? null
    : null;
  const selectedCabinetType = batteryBank?.selected_cabinet_type_id
    ? data.entities.cabinet_types.find((item) => item.cabinet_type_id === batteryBank.selected_cabinet_type_id) ?? null
    : null;
  const selectedInverterType = projectInverter?.inverter_id
    ? data.entities.inverter_types.find((item) => item.inverter_id === projectInverter.inverter_id) ?? null
    : null;
  let matchingAllowanceUsed = 0;
  const surfaceRows = localSurfaceSummaries.map((surface) => {
    const array = arrayBySurfaceId.get(surface.surface_id) ?? null;
    const panelType = array?.panel_type_id
      ? data.entities.panel_types.find((item) => item.panel_type_id === array.panel_type_id) ?? null
      : null;
    const mpptConfiguration = array ? mpptByArray.get(array.array_id) ?? null : null;
    const mpptType = mpptConfiguration?.mppt_type_id
      ? data.entities.mppt_types.find((item) => item.mppt_type_id === mpptConfiguration.mppt_type_id) ?? null
      : null;
    const includedWithInverter = isMatchingRsMppt(selectedInverterType, mpptType) && matchingAllowanceUsed < 2;
    if (includedWithInverter) {
      matchingAllowanceUsed += 1;
    }
    const panelCost = panelType?.price != null
      ? panelType.price * (array?.panel_count ?? surface.panel_count ?? 0)
      : null;
    const mpptCost = includedWithInverter
      ? 0
      : mpptType?.price ?? null;
    const surfaceTotal = panelCost != null && mpptCost != null
      ? panelCost + mpptCost
      : null;

    return {
      surface,
      panelType,
      mpptType,
      panelCount: array?.panel_count ?? surface.panel_count,
      panelCost,
      mpptCost,
      surfaceTotal,
    };
  });

  const batteryModuleCount = batteryBankState?.module_count ?? batteryBank?.module_count ?? 0;
  const panelSubtotal = surfaceRows.every((row) => row.panelCost != null)
    ? Number(surfaceRows.reduce((sum, row) => sum + (row.panelCost ?? 0), 0).toFixed(2))
    : null;
  const batteryModulesSubtotal = selectedBatteryType?.price != null
    ? selectedBatteryType.price * batteryModuleCount
    : null;
  const cabinetSubtotal = selectedCabinetType?.price ?? null;
  const batterySubtotal = batteryModulesSubtotal != null && cabinetSubtotal != null
    ? Number((batteryModulesSubtotal + cabinetSubtotal).toFixed(2))
    : null;
  const selectedInverterCabinetType = projectInverter?.selected_cabinet_type_id
    ? data.entities.cabinet_types.find((item) => item.cabinet_type_id === projectInverter.selected_cabinet_type_id) ?? null
    : null;
  const inverterCabinetSubtotal = selectedInverterCabinetType?.price ?? null;
  const inverterSubtotal = selectedInverterType?.price != null && inverterCabinetSubtotal != null
    ? Number((selectedInverterType.price + inverterCabinetSubtotal).toFixed(2))
    : selectedInverterType?.price ?? null;
  const materialsSubtotal = 0;
  const workSubtotal = 0;
  const surfaceGrandTotal = surfaceRows.every((row) => row.surfaceTotal != null)
    ? Number(surfaceRows.reduce((sum, row) => sum + (row.surfaceTotal ?? 0), 0).toFixed(2))
    : null;
  const projectTotal = surfaceGrandTotal != null && batterySubtotal != null && inverterSubtotal != null
    ? Number((surfaceGrandTotal + batterySubtotal + inverterSubtotal + materialsSubtotal + workSubtotal).toFixed(2))
    : null;

  return (
    <>
      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="section-head">
          <h2>{t('page.report.cost_summary')}</h2>
        </div>
        <div className="yield-table-wrap">
          <table className="yield-table">
            <thead>
              <tr>
                <th>{t('report.table.item')}</th>
                <th>{t('report.table.total')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>{t('report.cost.surface_costs')}</th>
                <td>{renderPrice(surfaceGrandTotal, null)}</td>
              </tr>
              <tr>
                <th>{t('report.cost.battery_bank_total')}</th>
                <td>{renderPrice(batterySubtotal, selectedBatteryType?.price_source_url ?? selectedCabinetType?.price_source_url)}</td>
              </tr>
              <tr>
                <th>{t('report.cost.inverter_total_summary')}</th>
                <td>{renderPrice(inverterSubtotal, selectedInverterType?.price_source_url ?? selectedInverterCabinetType?.price_source_url)}</td>
              </tr>
              <tr>
                <th>{t('report.cost.materials_total')}</th>
                <td>{formatCurrency(materialsSubtotal)}</td>
              </tr>
              <tr>
                <th>{t('report.cost.work_total')}</th>
                <td>{formatCurrency(workSubtotal)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th>{t('report.cost.project_total')}</th>
                <td>{formatCurrency(projectTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="section-head">
          <h2>{t('report.cost.surface_costs')}</h2>
        </div>
        {surfaceRows.length > 0 ? (
          <div className="yield-table-wrap">
            <table className="yield-table">
              <thead>
                <tr>
                  <th>{t('report.table.surface')}</th>
                  <th>{t('report.table.item')}</th>
                  <th>{t('report.cost.unit_price')}</th>
                  <th>{t('report.table.amount')}</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {surfaceRows.map(({ surface, panelType, mpptType, panelCount, panelCost, mpptCost }) => (
                  <React.Fragment key={surface.surface_id}>
                    <tr>
                      <th rowSpan={2}>{surface.name}</th>
                      <th>{panelType?.model ?? 'n/a'}</th>
                      <td>{renderPrice(panelType?.price ?? null, panelType?.price_source_url)}</td>
                      <td>{panelCount}</td>
                      <td>{formatCurrency(panelCost)}</td>
                    </tr>
                    <tr>
                      <th>{mpptType?.model ?? 'n/a'}</th>
                      <td>{renderPrice(mpptCost, mpptType?.price_source_url)}</td>
                      <td>1</td>
                      <td>
                        {formatCurrency(mpptCost)}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={4}>{t('report.cost.project_total')}</th>
                  <th>{formatCurrency(surfaceGrandTotal)}</th>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p style={{ margin: 0 }}>{t('report.empty.no_priced_surfaces')}</p>
          </div>
        )}
      </section>

      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="section-head">
          <h2>{t('report.cost.battery_bank_cost')}</h2>
        </div>
        {selectedBatteryType ? (
          <div className="yield-table-wrap">
            <table className="yield-table">
              <thead>
                <tr>
                  <th>{t('report.table.item')}</th>
                  <th>{t('report.cost.unit_price')}</th>
                  <th>{t('report.table.amount')}</th>
                  <th>{t('report.table.total')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>{selectedBatteryType.model}</th>
                  <td>{renderPrice(selectedBatteryType.price, selectedBatteryType.price_source_url)}</td>
                  <td>{batteryModuleCount}x</td>
                  <td>{formatCurrency(batteryModulesSubtotal)}</td>
                </tr>
                <tr>
                  <th>{selectedCabinetType?.title ?? t('common.none')}</th>
                  <td>{renderPrice(selectedCabinetType?.price ?? null, selectedCabinetType?.price_source_url)}</td>
                  <td>{selectedCabinetType ? '1x' : '0x'}</td>
                  <td>{formatCurrency(cabinetSubtotal)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th>{t('report.cost.project_total')}</th>
                  <td />
                  <td />
                  <td>{renderPrice(batterySubtotal, selectedBatteryType.price_source_url ?? selectedCabinetType?.price_source_url)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p style={{ margin: 0 }}>{t('report.empty.choose_battery_cost')}</p>
          </div>
        )}
      </section>

      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="section-head">
          <h2>{t('report.cost.inverter_cost')}</h2>
        </div>
        {selectedInverterType ? (
          <div className="yield-table-wrap">
            <table className="yield-table">
              <thead>
                <tr>
                  <th>{t('report.table.item')}</th>
                  <th>{t('report.cost.unit_price')}</th>
                  <th>{t('report.table.amount')}</th>
                  <th>{t('report.table.total')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>{selectedInverterType.model}</th>
                  <td>{renderPrice(selectedInverterType.price, selectedInverterType.price_source_url)}</td>
                  <td>1x</td>
                  <td>{renderPrice(selectedInverterType.price, selectedInverterType.price_source_url)}</td>
                </tr>
                {selectedInverterCabinetType ? (
                  <tr>
                    <th>{selectedInverterCabinetType.title}</th>
                    <td>{renderPrice(selectedInverterCabinetType.price, selectedInverterCabinetType.price_source_url)}</td>
                    <td>1x</td>
                    <td>{renderPrice(selectedInverterCabinetType.price, selectedInverterCabinetType.price_source_url)}</td>
                  </tr>
                ) : null}
              </tbody>
              <tfoot>
                <tr>
                  <th>{t('report.cost.project_total')}</th>
                  <td />
                  <td />
                  <td>{renderPrice(inverterSubtotal, selectedInverterType.price_source_url ?? selectedInverterCabinetType?.price_source_url)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p style={{ margin: 0 }}>{t('report.empty.choose_inverter_cost')}</p>
          </div>
        )}
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
  const { t } = useTranslation();
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
    const brand = draft.brand.trim();
    const model = draft.model.trim();
    const panelTypeId = selectedPanel ? selectedPanelTypeId : generateUniqueCatalogId(model, data.entities.panel_types.map((panel) => panel.panel_type_id));
    const wp = Number(draft.wp);
    const voc = Number(draft.voc);
    const vmp = Number(draft.vmp);
    const isc = Number(draft.isc);
    const imp = Number(draft.imp);
    const lengthMm = Number(draft.length_mm);
    const widthMm = Number(draft.width_mm);
    const price = draft.price.trim() === '' ? null : Number(draft.price);
    const priceSourceUrl = draft.price_source_url.trim() === '' ? null : draft.price_source_url.trim();
    const notes = draft.notes.trim() === '' ? null : draft.notes.trim();

    if (!brand || !model || !Number.isFinite(wp) || wp <= 0 || !Number.isFinite(voc) || voc <= 0 || !Number.isFinite(vmp) || vmp <= 0 || !Number.isFinite(isc) || isc <= 0 || !Number.isFinite(imp) || imp <= 0 || !Number.isFinite(lengthMm) || lengthMm <= 0 || !Number.isFinite(widthMm) || widthMm <= 0) {
      setSaveError(t('catalog.validation.panel_required'));
      return;
    }

    if ((price != null && !Number.isFinite(price)) || (priceSourceUrl != null && priceSourceUrl.length === 0)) {
      setSaveError(t('catalog.validation.optional_price_fields'));
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
          brand,
          model,
          wp,
          voc,
          vmp,
          isc,
          imp,
          length_mm: lengthMm,
          width_mm: widthMm,
          price,
          price_source_url: priceSourceUrl,
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
        brand,
        model,
        wp,
        voc,
        vmp,
        isc,
        imp,
        length_mm: lengthMm,
        width_mm: widthMm,
        price,
        price_source_url: priceSourceUrl,
        notes,
      } as PanelType));
      setSaveMessage(t('catalog.message.saved', { item: t('catalog.entry.panel_type'), id: panelTypeId }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('catalog.validation.optional_price_fields'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedPanel) return;

    const confirmed = window.confirm(t('catalog.confirm.delete', { item: t('catalog.entry.panel_type'), id: selectedPanel.panel_type_id }));
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
      setSaveMessage(t('catalog.message.deleted', { item: t('catalog.entry.panel_type'), id: selectedPanel.panel_type_id }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to delete panel type.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <section className="detail-shell">
        <section className="panel">
          <div className="stack" style={{ gap: 12 }}>
            <div className="button-row button-row-between">
              <button type="button" className="button button-secondary" onClick={startAddNew}>
                {t('catalog.ui.add_item', { item: t('catalog.entry.panel_type') })}
              </button>
            </div>
            <div className="yield-table-wrap">
              <table className="yield-table catalog-table">
                <thead>
                  <tr>
                    <th className="catalog-table-brand-col">{t('catalog.field.brand')}</th>
                    <th className="catalog-table-model-col">{t('catalog.field.model')}</th>
                    <th>{t('catalog.stat.power')}</th>
                    <th>{t('catalog.stat.price')}</th>
                    <th>{t('catalog.stat.price_per_wp')}</th>
                    <th>{t('catalog.ui.source')}</th>
                    <th>{t('catalog.stat.last_upsert_date')}</th>
                    <th>{t('common.edit')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entities.panel_types.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="catalog-table-empty">
                        {t('catalog.ui.no_entries')}
                      </td>
                    </tr>
                  ) : data.entities.panel_types.map((panel) => (
                    <tr
                      key={panel.panel_type_id}
                      className={`catalog-table-row ${selectedPanelTypeId === panel.panel_type_id ? 'catalog-table-row-active' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedPanelTypeId(panel.panel_type_id);
                        setSaveError(null);
                        setSaveMessage(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedPanelTypeId(panel.panel_type_id);
                          setSaveError(null);
                          setSaveMessage(null);
                        }
                      }}
                    >
                      <td className="catalog-table-brand-col">{panel.brand}</td>
                      <td className="catalog-table-model-col">{panel.model}</td>
                      <td>{panel.wp} Wp</td>
                      <td>{renderPrice(panel.price, panel.price_source_url)}</td>
                      <td>{panel.price != null ? renderPrice(panel.price / panel.wp, panel.price_source_url) : 'n/a'}</td>
                      <td>{panel.price_source_url ? <a className="price-link" href={panel.price_source_url} target="_blank" rel="noreferrer">{formatPriceSourceName(panel.price_source_url) ?? t('common.open')}</a> : '—'}</td>
                      <td>{panel.last_upsert_date ? panel.last_upsert_date.slice(0, 10) : '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="button button-secondary button-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedPanelTypeId(panel.panel_type_id);
                            setSaveError(null);
                            setSaveMessage(null);
                          }}
                        >
                          {t('common.edit')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>{selectedPanel ? t('catalog.ui.edit_item', { item: t('catalog.entry.panel_type') }) : t('catalog.ui.add_item', { item: t('catalog.entry.panel_type') })}</h2>
            <p>{t('catalog.ui.changes_saved')}</p>
          </div>
          <div className="stack" style={{ gap: 16 }}>
            <div className="field">
              <span>{t('catalog.field.panel_type_id')}</span>
              <p className="muted">
                {selectedPanel ? selectedPanel.panel_type_id : (draft.model.trim() ? generateUniqueCatalogId(draft.model.trim(), data.entities.panel_types.map((panel) => panel.panel_type_id)) : t('catalog.ui.generated_after_save'))}
              </p>
            </div>
            <label className="field">
              <span>{t('catalog.field.brand')}</span>
              <input
                value={draft.brand}
                onChange={(event) => setDraft((current) => ({ ...current, brand: event.target.value }))}
                placeholder="Aiko"
              />
            </label>
            <label className="field">
              <span>{t('catalog.field.model')}</span>
              <input
                value={draft.model}
                onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))}
                placeholder="AIKO 475 Wp All Black"
              />
            </label>
            <div className="detail-grid two-col">
              <label className="field"><span>{t('catalog.field.wp')}</span><input type="number" value={draft.wp} onChange={(event) => setDraft((current) => ({ ...current, wp: event.target.value }))} /></label>
              <label className="field"><span>{t('catalog.field.voc')}</span><input type="number" value={draft.voc} onChange={(event) => setDraft((current) => ({ ...current, voc: event.target.value }))} /></label>
            </div>
            <div className="detail-grid two-col">
              <label className="field"><span>{t('catalog.field.vmp')}</span><input type="number" value={draft.vmp} onChange={(event) => setDraft((current) => ({ ...current, vmp: event.target.value }))} /></label>
              <label className="field"><span>{t('catalog.field.isc')}</span><input type="number" value={draft.isc} onChange={(event) => setDraft((current) => ({ ...current, isc: event.target.value }))} /></label>
            </div>
            <div className="detail-grid two-col">
              <label className="field"><span>{t('catalog.field.imp')}</span><input type="number" value={draft.imp} onChange={(event) => setDraft((current) => ({ ...current, imp: event.target.value }))} /></label>
              <label className="field"><span>{t('catalog.field.length_mm')}</span><input type="number" value={draft.length_mm} onChange={(event) => setDraft((current) => ({ ...current, length_mm: event.target.value }))} /></label>
            </div>
            <div className="detail-grid two-col">
              <label className="field"><span>{t('catalog.field.width_mm')}</span><input type="number" value={draft.width_mm} onChange={(event) => setDraft((current) => ({ ...current, width_mm: event.target.value }))} /></label>
              <label className="field"><span>{t('catalog.ui.price_per_unit')}</span><input type="number" value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} /></label>
            </div>
            <label className="field">
              <span>{t('catalog.ui.price_source_url')}</span>
              <input
                value={draft.price_source_url}
                onChange={(event) => setDraft((current) => ({ ...current, price_source_url: event.target.value }))}
                placeholder="https://..."
              />
            </label>
            <label className="field">
              <span>{t('catalog.ui.notes')}</span>
              <textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} rows={4} />
            </label>
            <div className="stack" style={{ gap: 8 }}>
              <button type="button" className="button button-secondary" onClick={() => void handleSave()} disabled={isSaving || !draft.model.trim()}>
                {isSaving ? t('common.saving') : t('common.save')}
              </button>
              {selectedPanel ? (
                <button type="button" className="button button-danger" onClick={() => void handleDelete()} disabled={isSaving}>
                  {t('common.delete')}
                </button>
              ) : null}
              {saveError ? <p className="save-error">{saveError}</p> : null}
              {saveMessage ? <p className="save-message">{saveMessage}</p> : null}
            </div>
          </div>
          {selectedPanel ? (
            <div className="panel" style={{ marginTop: 16, padding: 16 }}>
              <div className="section-head">
                <h2>{t('catalog.ui.generated_after_save')}</h2>
                <p>{t('catalog.ui.changes_saved')}</p>
              </div>
              <dl className="detail-stats panel-spec-grid" style={{ marginTop: 0 }}>
                <div><dt>{t('catalog.field.brand')}</dt><dd>{selectedPanel.brand}</dd></div>
                <div><dt>{t('catalog.stat.power')}</dt><dd>{selectedPanel.wp} Wp</dd></div>
                <div><dt>{t('catalog.field.voc')}</dt><dd>{selectedPanel.voc} V</dd></div>
                <div><dt>{t('catalog.field.vmp')}</dt><dd>{selectedPanel.vmp} V</dd></div>
                <div><dt>{t('catalog.field.isc')}</dt><dd>{selectedPanel.isc} A</dd></div>
                <div><dt>{t('catalog.field.imp')}</dt><dd>{selectedPanel.imp} A</dd></div>
                <div><dt>{t('catalog.stat.price')}</dt><dd>{renderPrice(selectedPanel.price, selectedPanel.price_source_url)}</dd></div>
                <div><dt>{t('catalog.stat.price_per_wp')}</dt><dd>{selectedPanel.price != null ? renderPrice(selectedPanel.price / selectedPanel.wp, selectedPanel.price_source_url) : 'n/a'}</dd></div>
                <div><dt>{t('catalog.stat.last_upsert_date')}</dt><dd>{selectedPanel.last_upsert_date ? selectedPanel.last_upsert_date.slice(0, 10) : 'n/a'}</dd></div>
                <div><dt>{t('catalog.field.length_mm')}</dt><dd>{selectedPanel.length_mm != null ? `${selectedPanel.length_mm} mm` : 'n/a'}</dd></div>
                <div><dt>{t('catalog.field.width_mm')}</dt><dd>{selectedPanel.width_mm != null ? `${selectedPanel.width_mm} mm` : 'n/a'}</dd></div>
              </dl>
            </div>
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
  const { t } = useTranslation();
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
    const brand = draft.brand.trim();
    const model = draft.model.trim();
    const mpptTypeId = selectedMppt ? selectedMpptTypeId : generateUniqueCatalogId(model, data.entities.mppt_types.map((mppt) => mppt.mppt_type_id));
    const trackerCount = Number(draft.tracker_count);
    const maxVoc = Number(draft.max_voc);
    const maxPvPower = Number(draft.max_pv_power);
    const maxPvInputCurrentA = draft.max_pv_input_current_a.trim() === '' ? null : Number(draft.max_pv_input_current_a);
    const maxPvShortCircuitCurrentA = draft.max_pv_short_circuit_current_a.trim() === '' ? null : Number(draft.max_pv_short_circuit_current_a);
    const maxChargeCurrent = Number(draft.max_charge_current);
    const nominalBatteryVoltage = Number(draft.nominal_battery_voltage);
    const price = draft.price.trim() === '' ? null : Number(draft.price);
    const priceSourceUrl = draft.price_source_url.trim() === '' ? null : draft.price_source_url.trim();
    const notes = draft.notes.trim() === '' ? null : draft.notes.trim();

    if (!brand || !model || !Number.isInteger(trackerCount) || trackerCount < 1 || !Number.isFinite(maxVoc) || maxVoc <= 0 || !Number.isFinite(maxPvPower) || maxPvPower <= 0 || !Number.isFinite(maxChargeCurrent) || maxChargeCurrent <= 0 || !Number.isFinite(nominalBatteryVoltage) || nominalBatteryVoltage <= 0) {
      setSaveError(t('catalog.validation.mppt_required'));
      return;
    }

    if ((maxPvInputCurrentA != null && !Number.isFinite(maxPvInputCurrentA)) || (maxPvShortCircuitCurrentA != null && !Number.isFinite(maxPvShortCircuitCurrentA))) {
      setSaveError(t('catalog.validation.optional_pv_current_fields'));
      return;
    }

    if (price != null && !Number.isFinite(price)) {
      setSaveError(t('catalog.validation.price_valid'));
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
          brand,
          model,
          tracker_count: trackerCount,
          max_voc: maxVoc,
          max_pv_power: maxPvPower,
          max_pv_input_current_a: maxPvInputCurrentA,
          max_pv_short_circuit_current_a: maxPvShortCircuitCurrentA,
          max_charge_current: maxChargeCurrent,
          nominal_battery_voltage: nominalBatteryVoltage,
          price,
          price_source_url: priceSourceUrl,
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
        brand,
        model,
        tracker_count: trackerCount,
        max_voc: maxVoc,
        max_pv_power: maxPvPower,
        max_pv_input_current_a: maxPvInputCurrentA,
        max_pv_short_circuit_current_a: maxPvShortCircuitCurrentA,
        max_charge_current: maxChargeCurrent,
        nominal_battery_voltage: nominalBatteryVoltage,
        price,
        price_source_url: priceSourceUrl,
        notes,
      } as MpptType));
      setSaveMessage(t('catalog.message.saved', { item: t('catalog.entry.mppt_type'), id: mpptTypeId }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('catalog.validation.price_valid'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedMppt) return;

    const confirmed = window.confirm(t('catalog.confirm.delete', { item: t('catalog.entry.mppt_type'), id: selectedMppt.mppt_type_id }));
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
      setSaveMessage(t('catalog.message.deleted', { item: t('catalog.entry.mppt_type'), id: selectedMppt.mppt_type_id }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to delete MPPT type.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <section className="detail-shell">
        <section className="panel">
          <div className="stack" style={{ gap: 12 }}>
            <div className="button-row button-row-between">
              <button type="button" className="button button-secondary" onClick={startAddNew}>
                {t('catalog.ui.add_item', { item: t('catalog.entry.mppt_type') })}
              </button>
            </div>
            <div className="yield-table-wrap">
              <table className="yield-table catalog-table">
                <thead>
                  <tr>
                    <th className="catalog-table-brand-col">{t('catalog.field.brand')}</th>
                    <th className="catalog-table-model-col">{t('catalog.field.model')}</th>
                    <th>{t('catalog.stat.tracker_count')}</th>
                    <th>{t('catalog.stat.max_pv_power')}</th>
                    <th>{t('catalog.stat.price')}</th>
                    <th>{t('catalog.ui.source')}</th>
                    <th>{t('common.edit')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entities.mppt_types.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="catalog-table-empty">
                        {t('catalog.ui.no_entries')}
                      </td>
                    </tr>
                  ) : data.entities.mppt_types.map((mppt) => (
                    <tr
                      key={mppt.mppt_type_id}
                      className={`catalog-table-row ${selectedMpptTypeId === mppt.mppt_type_id ? 'catalog-table-row-active' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedMpptTypeId(mppt.mppt_type_id);
                        setSaveError(null);
                        setSaveMessage(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedMpptTypeId(mppt.mppt_type_id);
                          setSaveError(null);
                          setSaveMessage(null);
                        }
                      }}
                    >
                      <td className="catalog-table-brand-col">{mppt.brand}</td>
                      <td className="catalog-table-model-col">{mppt.model}</td>
                      <td>{mppt.tracker_count}</td>
                      <td>{mppt.max_pv_power} W</td>
                      <td>{renderPrice(mppt.price, mppt.price_source_url)}</td>
                      <td>{mppt.price_source_url ? <a className="price-link" href={mppt.price_source_url} target="_blank" rel="noreferrer">{formatPriceSourceName(mppt.price_source_url) ?? t('common.open')}</a> : '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="button button-secondary button-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedMpptTypeId(mppt.mppt_type_id);
                            setSaveError(null);
                            setSaveMessage(null);
                          }}
                        >
                          {t('common.edit')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>{selectedMppt ? t('catalog.ui.edit_item', { item: t('catalog.entry.mppt_type') }) : t('catalog.ui.add_item', { item: t('catalog.entry.mppt_type') })}</h2>
            <p>{t('catalog.ui.changes_saved')}</p>
          </div>
          <div className="stack" style={{ gap: 16 }}>
            <div className="field">
              <span>{t('catalog.field.mppt_type_id')}</span>
              <p className="muted">
                {selectedMppt ? selectedMppt.mppt_type_id : (draft.model.trim() ? generateUniqueCatalogId(draft.model.trim(), data.entities.mppt_types.map((mppt) => mppt.mppt_type_id)) : t('catalog.ui.generated_after_save'))}
              </p>
            </div>
            <label className="field">
              <span>{t('catalog.field.brand')}</span>
              <input
                value={draft.brand}
                onChange={(event) => setDraft((current) => ({ ...current, brand: event.target.value }))}
                placeholder="Victron"
              />
            </label>
            <label className="field">
              <span>{t('catalog.field.model')}</span>
              <input
                value={draft.model}
                onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))}
                placeholder="SmartSolar 250/100"
              />
            </label>
            <div className="detail-grid two-col">
              <label className="field"><span>{t('catalog.field.tracker_count')}</span><input type="number" value={draft.tracker_count} onChange={(event) => setDraft((current) => ({ ...current, tracker_count: event.target.value }))} /></label>
              <label className="field"><span>{t('catalog.field.max_voc')}</span><input type="number" value={draft.max_voc} onChange={(event) => setDraft((current) => ({ ...current, max_voc: event.target.value }))} /></label>
            </div>
            <div className="detail-grid two-col">
              <label className="field"><span>{t('catalog.field.max_pv_power')}</span><input type="number" value={draft.max_pv_power} onChange={(event) => setDraft((current) => ({ ...current, max_pv_power: event.target.value }))} /></label>
              <label className="field"><span>{t('catalog.field.max_charge_current')}</span><input type="number" value={draft.max_charge_current} onChange={(event) => setDraft((current) => ({ ...current, max_charge_current: event.target.value }))} /></label>
            </div>
            <div className="detail-grid two-col">
              <label className="field"><span>{t('catalog.field.max_pv_input_current')}</span><input type="number" value={draft.max_pv_input_current_a} onChange={(event) => setDraft((current) => ({ ...current, max_pv_input_current_a: event.target.value }))} /></label>
              <label className="field"><span>{t('catalog.field.max_pv_short_circuit_current')}</span><input type="number" value={draft.max_pv_short_circuit_current_a} onChange={(event) => setDraft((current) => ({ ...current, max_pv_short_circuit_current_a: event.target.value }))} /></label>
            </div>
            <div className="detail-grid two-col">
              <label className="field"><span>{t('catalog.field.nominal_battery_voltage')}</span><input type="number" value={draft.nominal_battery_voltage} onChange={(event) => setDraft((current) => ({ ...current, nominal_battery_voltage: event.target.value }))} /></label>
              <label className="field"><span>{t('catalog.ui.price_per_unit')}</span><input type="number" value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} /></label>
            </div>
            <label className="field">
              <span>{t('catalog.ui.price_source_url')}</span>
              <input
                value={draft.price_source_url}
                onChange={(event) => setDraft((current) => ({ ...current, price_source_url: event.target.value }))}
                placeholder="https://..."
              />
            </label>
            <label className="field">
              <span>{t('catalog.ui.notes')}</span>
              <textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} rows={4} />
            </label>
            <div className="stack" style={{ gap: 8 }}>
              <button type="button" className="button button-secondary" onClick={() => void handleSave()} disabled={isSaving || !draft.model.trim()}>
                {isSaving ? t('common.saving') : t('common.save')}
              </button>
              {selectedMppt ? (
                <button type="button" className="button button-danger" onClick={() => void handleDelete()} disabled={isSaving}>
                  {t('common.delete')}
                </button>
              ) : null}
              {saveError ? <p className="save-error">{saveError}</p> : null}
              {saveMessage ? <p className="save-message">{saveMessage}</p> : null}
            </div>
          </div>
          {selectedMppt ? (
            <dl className="detail-stats panel-spec-grid" style={{ marginTop: 16 }}>
              <div><dt>{t('catalog.field.brand')}</dt><dd>{selectedMppt.brand}</dd></div>
              <div><dt>{t('catalog.stat.tracker_count')}</dt><dd>{selectedMppt.tracker_count}</dd></div>
              <div><dt>{t('catalog.stat.max_voc')}</dt><dd>{selectedMppt.max_voc} V</dd></div>
              <div><dt>{t('catalog.stat.max_pv_power')}</dt><dd>{selectedMppt.max_pv_power} W</dd></div>
              <div><dt>{t('catalog.stat.max_charge_current')}</dt><dd>{selectedMppt.max_charge_current} A</dd></div>
              <div><dt>{t('catalog.stat.nominal_battery_voltage')}</dt><dd>{selectedMppt.nominal_battery_voltage} V</dd></div>
              <div><dt>{t('catalog.stat.price')}</dt><dd>{renderPrice(selectedMppt.price, selectedMppt.price_source_url)}</dd></div>
              <div><dt>{t('catalog.stat.pv_input_current')}</dt><dd>{selectedMppt.max_pv_input_current_a != null ? `${selectedMppt.max_pv_input_current_a} A` : 'n/a'}</dd></div>
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
  const { t } = useTranslation();
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
    const brand = draft.brand.trim();
    const model = draft.model.trim();
    const inverterId = selectedInverter ? selectedInverterTypeId : generateUniqueCatalogId(model, data.entities.inverter_types.map((inverter) => inverter.inverter_id));
    const inputVoltageV = Number(draft.input_voltage_v);
    const outputVoltageV = Number(draft.output_voltage_v);
    const continuousPowerW = Number(draft.continuous_power_w);
    const peakPowerVA = Number(draft.peak_power_va);
    const maxChargeCurrentA = Number(draft.max_charge_current_a);
    const efficiencyPct = draft.efficiency_pct.trim() === '' ? null : Number(draft.efficiency_pct);
    const price = draft.price.trim() === '' ? null : Number(draft.price);
    const priceSourceUrl = draft.price_source_url.trim() === '' ? null : draft.price_source_url.trim();
    const notes = draft.notes.trim() === '' ? null : draft.notes.trim();

    if (!brand || !model || !Number.isFinite(inputVoltageV) || inputVoltageV <= 0 || !Number.isFinite(outputVoltageV) || outputVoltageV <= 0 || !Number.isFinite(continuousPowerW) || continuousPowerW <= 0 || !Number.isFinite(peakPowerVA) || peakPowerVA <= 0 || !Number.isFinite(maxChargeCurrentA) || maxChargeCurrentA <= 0) {
      setSaveError(t('catalog.validation.inverter_required'));
      return;
    }

    if ((efficiencyPct != null && !Number.isFinite(efficiencyPct)) || (price != null && !Number.isFinite(price))) {
      setSaveError(t('catalog.validation.optional_numeric_fields'));
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
          brand,
          model,
          input_voltage_v: inputVoltageV,
          output_voltage_v: outputVoltageV,
          continuous_power_w: continuousPowerW,
          peak_power_va: peakPowerVA,
          max_charge_current_a: maxChargeCurrentA,
          efficiency_pct: efficiencyPct,
          price,
          price_source_url: priceSourceUrl,
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
        brand,
        model,
        input_voltage_v: inputVoltageV,
        output_voltage_v: outputVoltageV,
        continuous_power_w: continuousPowerW,
        peak_power_va: peakPowerVA,
        max_charge_current_a: maxChargeCurrentA,
        efficiency_pct: efficiencyPct,
        price,
        price_source_url: priceSourceUrl,
        notes,
      } as InverterType));
      setSaveMessage(t('catalog.message.saved', { item: t('catalog.entry.inverter_type'), id: inverterId }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('catalog.validation.optional_numeric_fields'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedInverter) return;

    const confirmed = window.confirm(t('catalog.confirm.delete', { item: t('catalog.entry.inverter_type'), id: selectedInverter.inverter_id }));
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
      setSaveMessage(t('catalog.message.deleted', { item: t('catalog.entry.inverter_type'), id: selectedInverter.inverter_id }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to delete inverter type.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <section className="detail-shell">
        <section className="panel">
          <div className="stack" style={{ gap: 12 }}>
            <div className="button-row button-row-between">
              <button type="button" className="button button-secondary" onClick={startAddNew}>
                {t('catalog.ui.add_item', { item: t('catalog.entry.inverter_type') })}
              </button>
            </div>
            <div className="yield-table-wrap">
              <table className="yield-table catalog-table">
                <thead>
                  <tr>
                    <th className="catalog-table-brand-col">{t('catalog.field.brand')}</th>
                    <th className="catalog-table-model-col">{t('catalog.field.model')}</th>
                    <th>{t('catalog.stat.input_voltage_short')}</th>
                    <th>{t('catalog.stat.continuous_power')}</th>
                    <th>{t('catalog.stat.price')}</th>
                    <th>{t('catalog.ui.source')}</th>
                    <th>{t('common.edit')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entities.inverter_types.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="catalog-table-empty">
                        {t('catalog.ui.no_entries')}
                      </td>
                    </tr>
                  ) : data.entities.inverter_types.map((inverter) => (
                    <tr
                      key={inverter.inverter_id}
                      className={`catalog-table-row ${selectedInverterTypeId === inverter.inverter_id ? 'catalog-table-row-active' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedInverterTypeId(inverter.inverter_id);
                        setSaveError(null);
                        setSaveMessage(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedInverterTypeId(inverter.inverter_id);
                          setSaveError(null);
                          setSaveMessage(null);
                        }
                      }}
                    >
                      <td className="catalog-table-brand-col">{inverter.brand}</td>
                      <td className="catalog-table-model-col">{inverter.model}</td>
                      <td>{inverter.input_voltage_v} V</td>
                      <td>{inverter.continuous_power_w} W</td>
                      <td>{renderPrice(inverter.price, inverter.price_source_url)}</td>
                      <td>{inverter.price_source_url ? <a className="price-link" href={inverter.price_source_url} target="_blank" rel="noreferrer">{formatPriceSourceName(inverter.price_source_url) ?? t('common.open')}</a> : '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="button button-secondary button-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedInverterTypeId(inverter.inverter_id);
                            setSaveError(null);
                            setSaveMessage(null);
                          }}
                        >
                          {t('common.edit')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>{selectedInverter ? t('catalog.ui.edit_item', { item: t('catalog.entry.inverter_type') }) : t('catalog.ui.add_item', { item: t('catalog.entry.inverter_type') })}</h2>
            <p>{t('catalog.ui.changes_saved')}</p>
          </div>
          <div className="stack" style={{ gap: 16 }}>
            <div className="field">
              <span>{t('catalog.field.inverter_id')}</span>
              <p className="muted">
                {selectedInverter ? selectedInverter.inverter_id : (draft.model.trim() ? generateUniqueCatalogId(draft.model.trim(), data.entities.inverter_types.map((inverter) => inverter.inverter_id)) : t('catalog.ui.generated_after_save'))}
              </p>
            </div>
            <label className="field">
              <span>{t('catalog.field.brand')}</span>
              <input
                value={draft.brand}
                onChange={(event) => setDraft((current) => ({ ...current, brand: event.target.value }))}
                placeholder="Victron"
              />
            </label>
            <label className="field">
              <span>{t('catalog.field.model')}</span>
              <input
                value={draft.model}
                onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))}
                placeholder="MultiPlus-II 48/10000/140-100"
              />
            </label>
            <div className="detail-grid two-col">
              <label className="field"><span>{t('catalog.field.input_voltage')}</span><input type="number" value={draft.input_voltage_v} onChange={(event) => setDraft((current) => ({ ...current, input_voltage_v: event.target.value }))} /></label>
              <label className="field"><span>{t('catalog.field.output_voltage')}</span><input type="number" value={draft.output_voltage_v} onChange={(event) => setDraft((current) => ({ ...current, output_voltage_v: event.target.value }))} /></label>
            </div>
            <div className="detail-grid two-col">
              <label className="field"><span>{t('catalog.field.continuous_power')}</span><input type="number" value={draft.continuous_power_w} onChange={(event) => setDraft((current) => ({ ...current, continuous_power_w: event.target.value }))} /></label>
              <label className="field"><span>{t('catalog.field.peak_power')}</span><input type="number" value={draft.peak_power_va} onChange={(event) => setDraft((current) => ({ ...current, peak_power_va: event.target.value }))} /></label>
            </div>
            <div className="detail-grid two-col">
              <label className="field"><span>{t('catalog.field.max_charge_current')}</span><input type="number" value={draft.max_charge_current_a} onChange={(event) => setDraft((current) => ({ ...current, max_charge_current_a: event.target.value }))} /></label>
              <label className="field"><span>{t('catalog.field.efficiency_pct')}</span><input type="number" value={draft.efficiency_pct} onChange={(event) => setDraft((current) => ({ ...current, efficiency_pct: event.target.value }))} /></label>
            </div>
            <div className="detail-grid two-col">
              <label className="field"><span>{t('catalog.ui.price_per_unit')}</span><input type="number" value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} /></label>
              <label className="field"><span>{t('catalog.ui.price_source_url')}</span><input value={draft.price_source_url} onChange={(event) => setDraft((current) => ({ ...current, price_source_url: event.target.value }))} placeholder="https://..." /></label>
            </div>
            <label className="field">
              <span>{t('catalog.ui.notes')}</span>
              <textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} rows={4} />
            </label>
            <div className="stack" style={{ gap: 8 }}>
              <button type="button" className="button button-secondary" onClick={() => void handleSave()} disabled={isSaving || !draft.model.trim()}>
                {isSaving ? t('common.saving') : t('common.save')}
              </button>
              {selectedInverter ? (
                <button type="button" className="button button-danger" onClick={() => void handleDelete()} disabled={isSaving}>
                  {t('common.delete')}
                </button>
              ) : null}
              {saveError ? <p className="save-error">{saveError}</p> : null}
              {saveMessage ? <p className="save-message">{saveMessage}</p> : null}
            </div>
          </div>
          {selectedInverter ? (
            <dl className="detail-stats panel-spec-grid" style={{ marginTop: 16 }}>
              <div><dt>{t('catalog.field.brand')}</dt><dd>{selectedInverter.brand}</dd></div>
              <div><dt>{t('catalog.stat.input_voltage')}</dt><dd>{selectedInverter.input_voltage_v} V</dd></div>
              <div><dt>{t('catalog.stat.output_voltage')}</dt><dd>{selectedInverter.output_voltage_v} V</dd></div>
              <div><dt>{t('catalog.stat.continuous_power')}</dt><dd>{selectedInverter.continuous_power_w} W</dd></div>
              <div><dt>{t('catalog.stat.peak_power')}</dt><dd>{selectedInverter.peak_power_va} VA</dd></div>
              <div><dt>{t('catalog.stat.max_current')}</dt><dd>{selectedInverter.max_charge_current_a} A</dd></div>
              <div><dt>{t('catalog.stat.efficiency')}</dt><dd>{selectedInverter.efficiency_pct != null ? `${selectedInverter.efficiency_pct}%` : 'n/a'}</dd></div>
            </dl>
          ) : null}
        </section>
      </section>
    </>
  );
}

function ConversionDeviceCatalogPage({
  data,
  refreshProjectData,
}: {
  data: DigitalTwinExport;
  refreshProjectData: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const catalogSelectionStorageKey = getConversionDeviceCatalogSelectionStorageKey(data);
  const [selectedConversionDeviceId, setSelectedConversionDeviceId] = usePersistentState(
    catalogSelectionStorageKey,
    data.entities.conversion_devices[0]?.conversion_device_id ?? '',
  );
  const [draft, setDraft] = useState<ConversionDeviceDraft>(() => conversionDeviceDraftFromType(data.entities.conversion_devices[0] ?? null));
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedConversionDevice = selectedConversionDeviceId
    ? data.entities.conversion_devices.find((item) => item.conversion_device_id === selectedConversionDeviceId) ?? null
    : null;

  useEffect(() => {
    const selectedExists = selectedConversionDeviceId
      ? data.entities.conversion_devices.some((item) => item.conversion_device_id === selectedConversionDeviceId)
      : false;
    if (selectedConversionDeviceId && !selectedExists && data.entities.conversion_devices.length > 0) {
      setSelectedConversionDeviceId(data.entities.conversion_devices[0]!.conversion_device_id);
    }
  }, [data.entities.conversion_devices, selectedConversionDeviceId, setSelectedConversionDeviceId]);

  useEffect(() => {
    if (selectedConversionDeviceId) {
      const current = data.entities.conversion_devices.find((item) => item.conversion_device_id === selectedConversionDeviceId) ?? null;
      setDraft(conversionDeviceDraftFromType(current));
    } else {
      setDraft(emptyConversionDeviceDraft());
    }
  }, [data, selectedConversionDeviceId]);

  function startAddNew() {
    setSelectedConversionDeviceId('');
    setSaveError(null);
    setSaveMessage(null);
    setDraft(emptyConversionDeviceDraft());
  }

  async function handleSave() {
    const title = draft.title.trim();
    const description = draft.description.trim() === '' ? null : draft.description.trim();
    const deviceType = draft.device_type.trim();
    const conversionDeviceId = selectedConversionDevice
      ? selectedConversionDeviceId
      : generateUniqueCatalogId(title, data.entities.conversion_devices.map((device) => device.conversion_device_id));
    const inputVoltageV = draft.input_voltage_v.trim() === '' ? null : Number(draft.input_voltage_v);
    const outputVoltageV = draft.output_voltage_v.trim() === '' ? null : Number(draft.output_voltage_v);
    const continuousPowerW = draft.continuous_power_w.trim() === '' ? null : Number(draft.continuous_power_w);
    const peakPowerVA = draft.peak_power_va.trim() === '' ? null : Number(draft.peak_power_va);
    const maxChargeCurrentA = draft.max_charge_current_a.trim() === '' ? null : Number(draft.max_charge_current_a);
    const efficiencyPct = draft.efficiency_pct.trim() === '' ? null : Number(draft.efficiency_pct);
    const outputAcVoltageV = draft.output_ac_voltage_v.trim() === '' ? null : Number(draft.output_ac_voltage_v);
    const frequencyHz = draft.frequency_hz.trim() === '' ? null : Number(draft.frequency_hz);
    const surgePowerW = draft.surge_power_w.trim() === '' ? null : Number(draft.surge_power_w);
    const outputDcVoltageV = draft.output_dc_voltage_v.trim() === '' ? null : Number(draft.output_dc_voltage_v);
    const maxOutputCurrentA = draft.max_output_current_a.trim() === '' ? null : Number(draft.max_output_current_a);
    const price = draft.price.trim() === '' ? null : Number(draft.price);
    const priceSourceUrl = draft.price_source_url.trim() === '' ? null : draft.price_source_url.trim();
    const notes = draft.notes.trim() === '' ? null : draft.notes.trim();

    if (!title || !deviceType || !Number.isFinite(inputVoltageV ?? NaN) || (inputVoltageV ?? 0) <= 0 || !Number.isFinite(outputVoltageV ?? NaN) || (outputVoltageV ?? 0) <= 0 || !Number.isFinite(continuousPowerW ?? NaN) || (continuousPowerW ?? 0) <= 0 || !Number.isFinite(peakPowerVA ?? NaN) || (peakPowerVA ?? 0) <= 0 || !Number.isFinite(maxChargeCurrentA ?? NaN) || (maxChargeCurrentA ?? 0) <= 0) {
      setSaveError(t('catalog.validation.conversion_device_required'));
      return;
    }

    if (
      (efficiencyPct != null && !Number.isFinite(efficiencyPct))
      || (outputAcVoltageV != null && !Number.isFinite(outputAcVoltageV))
      || (frequencyHz != null && !Number.isFinite(frequencyHz))
      || (surgePowerW != null && !Number.isFinite(surgePowerW))
      || (outputDcVoltageV != null && !Number.isFinite(outputDcVoltageV))
      || (maxOutputCurrentA != null && !Number.isFinite(maxOutputCurrentA))
      || (price != null && !Number.isFinite(price))
    ) {
      setSaveError(t('catalog.validation.optional_numeric_fields'));
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const isEdit = Boolean(selectedConversionDevice);
      const response = await fetch(isEdit ? `/api/conversion-devices/${encodeURIComponent(selectedConversionDeviceId)}` : '/api/conversion-devices', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversion_device_id: conversionDeviceId,
          title,
          description,
          device_type: deviceType,
          input_voltage_v: inputVoltageV,
          output_voltage_v: outputVoltageV,
          continuous_power_w: continuousPowerW,
          peak_power_va: peakPowerVA,
          max_charge_current_a: maxChargeCurrentA,
          efficiency_pct: efficiencyPct,
          output_ac_voltage_v: outputAcVoltageV,
          frequency_hz: frequencyHz,
          surge_power_w: surgePowerW,
          output_dc_voltage_v: outputDcVoltageV,
          max_output_current_a: maxOutputCurrentA,
          price,
          price_source_url: priceSourceUrl,
          notes,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to save conversion device (${response.status})`);
      }

      await refreshProjectData();
      setSelectedConversionDeviceId(conversionDeviceId);
      setDraft(conversionDeviceDraftFromType({
        conversion_device_id: conversionDeviceId,
        title,
        description,
        device_type: deviceType,
        input_voltage_v: inputVoltageV ?? null,
        output_voltage_v: outputVoltageV ?? null,
        continuous_power_w: continuousPowerW ?? null,
        peak_power_va: peakPowerVA ?? null,
        max_charge_current_a: maxChargeCurrentA ?? null,
        efficiency_pct: efficiencyPct,
        output_ac_voltage_v: outputAcVoltageV,
        frequency_hz: frequencyHz,
        surge_power_w: surgePowerW,
        output_dc_voltage_v: outputDcVoltageV,
        max_output_current_a: maxOutputCurrentA,
        price,
        price_source_url: priceSourceUrl,
        notes,
      }));
      setSaveMessage(t('catalog.message.saved', { item: t('catalog.entry.conversion_device'), id: conversionDeviceId }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('catalog.validation.optional_numeric_fields'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedConversionDevice) return;

    const confirmed = window.confirm(t('catalog.confirm.delete', { item: t('catalog.entry.conversion_device'), id: selectedConversionDevice.conversion_device_id }));
    if (!confirmed) return;

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const response = await fetch(`/api/conversion-devices/${encodeURIComponent(selectedConversionDevice.conversion_device_id)}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to delete conversion device (${response.status})`);
      }

      await refreshProjectData();
      const nextDevice = data.entities.conversion_devices.find((item) => item.conversion_device_id !== selectedConversionDevice.conversion_device_id) ?? null;
      setSelectedConversionDeviceId(nextDevice?.conversion_device_id ?? '');
      setDraft(conversionDeviceDraftFromType(nextDevice));
      setSaveMessage(t('catalog.message.deleted', { item: t('catalog.entry.conversion_device'), id: selectedConversionDevice.conversion_device_id }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to delete conversion device.');
    } finally {
      setIsSaving(false);
    }
  }

  const conversionDeviceTypeLabel = (deviceType: string): string => {
    switch (deviceType) {
      case 'dc_dc_converter':
        return t('catalog.device_type.dc_dc_converter');
      case 'ac_dc_charger':
        return t('catalog.device_type.ac_dc_charger');
      default:
        return t('catalog.device_type.inverter');
    }
  };

  return (
      <section className="detail-shell">
        <section className="panel">
          <div className="stack" style={{ gap: 12 }}>
          <div className="button-row button-row-between">
            <button type="button" className="button button-secondary" onClick={startAddNew}>
              {t('catalog.ui.add_item', { item: t('catalog.entry.conversion_device') })}
            </button>
          </div>
          <div className="yield-table-wrap">
            <table className="yield-table catalog-table">
              <thead>
                <tr>
                  <th className="catalog-table-model-col">{t('catalog.field.title')}</th>
                  <th>{t('catalog.field.device_type')}</th>
                  <th>{t('catalog.stat.input_voltage')}</th>
                  <th>{t('catalog.stat.output_voltage')}</th>
                  <th>{t('catalog.stat.continuous_power')}</th>
                  <th>{t('catalog.stat.peak_power')}</th>
                  <th>{t('catalog.stat.max_current')}</th>
                  <th>{t('catalog.stat.price')}</th>
                  <th>{t('common.edit')}</th>
                </tr>
              </thead>
              <tbody>
                {data.entities.conversion_devices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="catalog-table-empty">{t('catalog.ui.no_entries')}</td>
                  </tr>
                ) : data.entities.conversion_devices.map((device) => (
                  <tr
                    key={device.conversion_device_id}
                    className={`catalog-table-row ${selectedConversionDeviceId === device.conversion_device_id ? 'catalog-table-row-active' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedConversionDeviceId(device.conversion_device_id);
                      setSaveError(null);
                      setSaveMessage(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedConversionDeviceId(device.conversion_device_id);
                        setSaveError(null);
                        setSaveMessage(null);
                      }
                    }}
                  >
                    <td className="catalog-table-model-col">{device.title}</td>
                    <td>{conversionDeviceTypeLabel(device.device_type)}</td>
                    <td>{device.input_voltage_v != null ? `${device.input_voltage_v} V` : '—'}</td>
                    <td>{device.output_voltage_v != null ? `${device.output_voltage_v} V` : '—'}</td>
                    <td>{device.continuous_power_w != null ? `${device.continuous_power_w} W` : '—'}</td>
                    <td>{device.peak_power_va != null ? `${device.peak_power_va} VA` : '—'}</td>
                    <td>{device.max_charge_current_a != null ? `${device.max_charge_current_a} A` : '—'}</td>
                    <td>{renderPrice(device.price ?? null, device.price_source_url ?? undefined)}</td>
                    <td>
                      <button
                        type="button"
                        className="button button-secondary button-sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedConversionDeviceId(device.conversion_device_id);
                          setSaveError(null);
                          setSaveMessage(null);
                        }}
                      >
                        {t('common.edit')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>{selectedConversionDevice ? t('catalog.ui.edit_item', { item: t('catalog.entry.conversion_device') }) : t('catalog.ui.add_item', { item: t('catalog.entry.conversion_device') })}</h2>
          <p>{t('catalog.ui.changes_saved')}</p>
        </div>
        <div className="stack" style={{ gap: 16 }}>
          <div className="field">
            <span>{t('catalog.field.conversion_device_id')}</span>
            <p className="muted">
              {selectedConversionDevice ? selectedConversionDevice.conversion_device_id : (draft.title.trim() ? generateUniqueCatalogId(draft.title.trim(), data.entities.conversion_devices.map((device) => device.conversion_device_id)) : t('catalog.ui.generated_after_save'))}
            </p>
          </div>
          <label className="field">
            <span>{t('catalog.field.title')}</span>
            <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Multi RS Solar 48/6000/100-450/100" />
          </label>
          <label className="field">
            <span>{t('catalog.field.description')}</span>
            <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} rows={3} />
          </label>
          <label className="field">
            <span>{t('catalog.field.device_type')}</span>
            <select value={draft.device_type} onChange={(event) => setDraft((current) => ({ ...current, device_type: event.target.value }))}>
              <option value="inverter">{t('catalog.device_type.inverter')}</option>
              <option value="dc_dc_converter">{t('catalog.device_type.dc_dc_converter')}</option>
              <option value="ac_dc_charger">{t('catalog.device_type.ac_dc_charger')}</option>
            </select>
          </label>
          <div className="detail-grid two-col">
            <label className="field"><span>{t('catalog.field.input_voltage')}</span><input type="number" value={draft.input_voltage_v} onChange={(event) => setDraft((current) => ({ ...current, input_voltage_v: event.target.value }))} /></label>
            <label className="field"><span>{t('catalog.field.output_voltage')}</span><input type="number" value={draft.output_voltage_v} onChange={(event) => setDraft((current) => ({ ...current, output_voltage_v: event.target.value }))} /></label>
          </div>
          <div className="detail-grid two-col">
            <label className="field"><span>{t('catalog.field.continuous_power')}</span><input type="number" value={draft.continuous_power_w} onChange={(event) => setDraft((current) => ({ ...current, continuous_power_w: event.target.value }))} /></label>
            <label className="field"><span>{t('catalog.field.peak_power')}</span><input type="number" value={draft.peak_power_va} onChange={(event) => setDraft((current) => ({ ...current, peak_power_va: event.target.value }))} /></label>
          </div>
          <div className="detail-grid two-col">
            <label className="field"><span>{t('catalog.field.max_charge_current')}</span><input type="number" value={draft.max_charge_current_a} onChange={(event) => setDraft((current) => ({ ...current, max_charge_current_a: event.target.value }))} /></label>
            <label className="field"><span>{t('catalog.field.efficiency_pct')}</span><input type="number" value={draft.efficiency_pct} onChange={(event) => setDraft((current) => ({ ...current, efficiency_pct: event.target.value }))} /></label>
          </div>
          <div className="detail-grid two-col">
            <label className="field"><span>{t('catalog.stat.output_voltage')}</span><input type="number" value={draft.output_ac_voltage_v} onChange={(event) => setDraft((current) => ({ ...current, output_ac_voltage_v: event.target.value }))} placeholder="230" /></label>
            <label className="field"><span>{t('catalog.field.frequency')}</span><input type="number" value={draft.frequency_hz} onChange={(event) => setDraft((current) => ({ ...current, frequency_hz: event.target.value }))} placeholder="50" /></label>
          </div>
          <div className="detail-grid two-col">
            <label className="field"><span>{t('catalog.field.surge_power')}</span><input type="number" value={draft.surge_power_w} onChange={(event) => setDraft((current) => ({ ...current, surge_power_w: event.target.value }))} /></label>
            <label className="field"><span>{t('catalog.field.output_dc_voltage')}</span><input type="number" value={draft.output_dc_voltage_v} onChange={(event) => setDraft((current) => ({ ...current, output_dc_voltage_v: event.target.value }))} /></label>
          </div>
          <label className="field">
            <span>{t('catalog.field.max_output_current')}</span>
            <input type="number" value={draft.max_output_current_a} onChange={(event) => setDraft((current) => ({ ...current, max_output_current_a: event.target.value }))} />
          </label>
          <div className="detail-grid two-col">
            <label className="field"><span>{t('catalog.stat.price')}</span><input type="number" value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} /></label>
            <label className="field"><span>{t('catalog.ui.price_source_url')}</span><input type="text" value={draft.price_source_url} onChange={(event) => setDraft((current) => ({ ...current, price_source_url: event.target.value }))} /></label>
          </div>
          <label className="field">
            <span>{t('catalog.ui.notes')}</span>
            <textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} rows={3} />
          </label>
          <div className="stack" style={{ gap: 8 }}>
            <button type="button" className="button button-secondary" onClick={() => void handleSave()} disabled={isSaving || !draft.title.trim()}>
              {isSaving ? t('common.saving') : t('common.save')}
            </button>
            {selectedConversionDevice ? (
              <button type="button" className="button button-danger" onClick={() => void handleDelete()} disabled={isSaving}>
                {t('common.delete')}
              </button>
            ) : null}
            {saveError ? <p className="save-error">{saveError}</p> : null}
            {saveMessage ? <p className="save-message">{saveMessage}</p> : null}
          </div>
        </div>
        {selectedConversionDevice ? (
          <dl className="detail-stats panel-spec-grid" style={{ marginTop: 16 }}>
            <div><dt>{t('catalog.field.title')}</dt><dd>{selectedConversionDevice.title}</dd></div>
            <div><dt>{t('catalog.field.device_type')}</dt><dd>{conversionDeviceTypeLabel(selectedConversionDevice.device_type)}</dd></div>
            <div><dt>{t('catalog.stat.input_voltage')}</dt><dd>{selectedConversionDevice.input_voltage_v != null ? `${selectedConversionDevice.input_voltage_v} V` : 'n/a'}</dd></div>
            <div><dt>{t('catalog.stat.output_voltage')}</dt><dd>{selectedConversionDevice.output_voltage_v != null ? `${selectedConversionDevice.output_voltage_v} V` : 'n/a'}</dd></div>
            <div><dt>{t('catalog.stat.continuous_power')}</dt><dd>{selectedConversionDevice.continuous_power_w != null ? `${selectedConversionDevice.continuous_power_w} W` : 'n/a'}</dd></div>
            <div><dt>{t('catalog.stat.peak_power')}</dt><dd>{selectedConversionDevice.peak_power_va != null ? `${selectedConversionDevice.peak_power_va} VA` : 'n/a'}</dd></div>
            <div><dt>{t('catalog.stat.max_current')}</dt><dd>{selectedConversionDevice.max_charge_current_a != null ? `${selectedConversionDevice.max_charge_current_a} A` : 'n/a'}</dd></div>
            <div><dt>{t('catalog.field.efficiency_pct')}</dt><dd>{selectedConversionDevice.efficiency_pct != null ? `${selectedConversionDevice.efficiency_pct}%` : 'n/a'}</dd></div>
            <div><dt>{t('catalog.stat.price')}</dt><dd>{renderPrice(selectedConversionDevice.price ?? null, selectedConversionDevice.price_source_url ?? undefined)}</dd></div>
            <div><dt>{t('catalog.ui.notes')}</dt><dd>{selectedConversionDevice.notes ?? 'n/a'}</dd></div>
          </dl>
        ) : null}
      </section>
    </section>
  );
}

function emptyLoadCircuitDraft(conversionDeviceId: string = ''): LoadCircuitDraft {
  return {
    load_circuit_id: '',
    conversion_device_id: conversionDeviceId,
    title: '',
    description: '',
  };
}

function loadCircuitDraftFromEntity(loadCircuit: LoadCircuit | null, fallbackConversionDeviceId: string = ''): LoadCircuitDraft {
  return loadCircuit ? {
    load_circuit_id: loadCircuit.load_circuit_id,
    conversion_device_id: loadCircuit.conversion_device_id,
    title: loadCircuit.title,
    description: loadCircuit.description ?? '',
  } : emptyLoadCircuitDraft(fallbackConversionDeviceId);
}

function emptyLoadDraft(loadCircuitId: string = ''): LoadDraft {
  return {
    load_id: '',
    load_circuit_id: loadCircuitId,
    title: '',
    description: '',
    usage_kw: '',
    spike_kw: '',
    expected_usage_hours_per_day: '',
    sleeping_kw: '',
  };
}

function loadDraftFromEntity(load: Load | null): LoadDraft {
  return load ? {
    load_id: load.load_id,
    load_circuit_id: load.load_circuit_id,
    title: load.title,
    description: load.description ?? '',
    usage_kw: String(load.usage_kw),
    spike_kw: String(load.spike_kw),
    expected_usage_hours_per_day: String(load.expected_usage_hours_per_day),
    sleeping_kw: String(load.sleeping_kw),
  } : emptyLoadDraft();
}

function loadDraftFromPreset(preset: LoadPreset, loadCircuitId: string = ''): LoadDraft {
  return {
    load_id: '',
    load_circuit_id: loadCircuitId,
    title: preset.title,
    description: preset.description,
    usage_kw: String(preset.usage_kw),
    spike_kw: String(preset.spike_kw),
    expected_usage_hours_per_day: String(preset.expected_usage_hours_per_day),
    sleeping_kw: String(preset.sleeping_kw),
  };
}

function formatLoadKw(value: number): string {
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })} kW`;
}

function formatVoltage(value: number | null | undefined): string {
  return value != null ? `${value} V` : 'n/a';
}

function CatalogInlineEditorRow({
  colSpan,
  title,
  subtitle,
  children,
}: {
  colSpan: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <tr className="catalog-inline-editor-row">
      <td colSpan={colSpan}>
        <div className="catalog-inline-editor">
          <div className="section-head">
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className="stack" style={{ gap: 16 }}>
            {children}
          </div>
        </div>
      </td>
    </tr>
  );
}

function LoadCircuitsPage({
  data,
  refreshProjectData,
}: {
  data: DigitalTwinExport;
  refreshProjectData: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [filterConversionDeviceId, setFilterConversionDeviceId] = useState('');
  const filteredLoadCircuits = data.entities.load_circuits.filter((circuit) => (
    filterConversionDeviceId === '' || circuit.conversion_device_id === filterConversionDeviceId
  ));
  const [selectedLoadCircuitId, setSelectedLoadCircuitId] = useState(() => filteredLoadCircuits[0]?.load_circuit_id ?? data.entities.load_circuits[0]?.load_circuit_id ?? '');
  const selectedLoadCircuit = selectedLoadCircuitId
    ? data.entities.load_circuits.find((item) => item.load_circuit_id === selectedLoadCircuitId) ?? null
    : null;
  const [draft, setDraft] = useState<LoadCircuitDraft>(() => loadCircuitDraftFromEntity(selectedLoadCircuit, data.entities.conversion_devices[0]?.conversion_device_id ?? ''));
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedLoadCircuitId) {
      const current = data.entities.load_circuits.find((item) => item.load_circuit_id === selectedLoadCircuitId) ?? null;
      setDraft(loadCircuitDraftFromEntity(current, data.entities.conversion_devices[0]?.conversion_device_id ?? ''));
    } else {
      setDraft(emptyLoadCircuitDraft(data.entities.conversion_devices[0]?.conversion_device_id ?? ''));
    }
  }, [data, selectedLoadCircuitId]);

  useEffect(() => {
    if (selectedLoadCircuitId && filteredLoadCircuits.some((circuit) => circuit.load_circuit_id === selectedLoadCircuitId)) {
      return;
    }
    setSelectedLoadCircuitId(filteredLoadCircuits[0]?.load_circuit_id ?? data.entities.load_circuits[0]?.load_circuit_id ?? '');
  }, [data.entities.load_circuits, filteredLoadCircuits, selectedLoadCircuitId]);

  const selectedConversionDevice = draft.conversion_device_id
    ? data.entities.conversion_devices.find((item) => item.conversion_device_id === draft.conversion_device_id) ?? null
    : null;
  const selectedCircuitVoltageV = selectedConversionDevice?.output_voltage_v ?? null;
  const selectedCircuitLoads = selectedLoadCircuit
    ? data.entities.loads.filter((load) => load.load_circuit_id === selectedLoadCircuit.load_circuit_id)
    : [];
  const selectedCircuitLoadIdsKey = selectedCircuitLoads.map((load) => load.load_id).join('|');
  const totalUsageKw = selectedCircuitLoads.reduce((sum, load) => sum + load.usage_kw, 0);
  const totalSpikeKw = selectedCircuitLoads.reduce((sum, load) => sum + load.spike_kw, 0);
  const [loadDrafts, setLoadDrafts] = useState<Record<string, LoadDraft>>(() => (
    Object.fromEntries(
      selectedCircuitLoads.map((load) => [
        load.load_id,
        loadDraftFromEntity(load),
      ]),
    )
  ));

  useEffect(() => {
    setLoadDrafts((current) => {
      const next: Record<string, LoadDraft> = {};

      for (const load of selectedCircuitLoads) {
        next[load.load_id] = current[load.load_id] ?? loadDraftFromEntity(load);
      }

      return next;
    });
  }, [selectedCircuitLoadIdsKey]);

  function startAddNew() {
    setSelectedLoadCircuitId('');
    setSaveError(null);
    setSaveMessage(null);
    setDraft(emptyLoadCircuitDraft(data.entities.conversion_devices[0]?.conversion_device_id ?? ''));
  }

  async function handleSave() {
    const loadCircuitId = selectedLoadCircuit ? selectedLoadCircuitId : generateUniqueCatalogId(draft.title.trim(), data.entities.load_circuits.map((circuit) => circuit.load_circuit_id));
    const title = draft.title.trim();
    const description = draft.description.trim() === '' ? null : draft.description.trim();
    const conversionDeviceId = draft.conversion_device_id.trim();

    if (!title || !conversionDeviceId) {
      setSaveError('Choose a conversion device and fill in the title.');
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const isEdit = Boolean(selectedLoadCircuit);
      const response = await fetch(isEdit ? `/api/load-circuits/${encodeURIComponent(selectedLoadCircuitId)}` : '/api/load-circuits', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          load_circuit_id: loadCircuitId,
          conversion_device_id: conversionDeviceId,
          title,
          description,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to save load circuit (${response.status})`);
      }

      await refreshProjectData();
      setSelectedLoadCircuitId(loadCircuitId);
      setDraft({
        load_circuit_id: loadCircuitId,
        conversion_device_id: conversionDeviceId,
        title,
        description: description ?? '',
      });
      setSaveMessage(`Load circuit "${loadCircuitId}" saved.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save load circuit.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(loadCircuitId?: string) {
    const targetLoadCircuit = loadCircuitId
      ? data.entities.load_circuits.find((circuit) => circuit.load_circuit_id === loadCircuitId) ?? null
      : selectedLoadCircuit;
    if (!targetLoadCircuit) return;

    if (!window.confirm(`Delete load circuit "${targetLoadCircuit.load_circuit_id}"?`)) return;

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const response = await fetch(`/api/load-circuits/${encodeURIComponent(targetLoadCircuit.load_circuit_id)}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to delete load circuit (${response.status})`);
      }

      await refreshProjectData();
      const nextCircuit = data.entities.load_circuits.find((item) => item.load_circuit_id !== targetLoadCircuit.load_circuit_id) ?? null;
      setSelectedLoadCircuitId(nextCircuit?.load_circuit_id ?? '');
      setDraft(loadCircuitDraftFromEntity(nextCircuit, data.entities.conversion_devices[0]?.conversion_device_id ?? ''));
      setSaveMessage(`Load circuit "${targetLoadCircuit.load_circuit_id}" deleted.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to delete load circuit.');
    } finally {
      setIsSaving(false);
    }
  }

  async function saveLoadDetails(loadId: string) {
    const load = selectedCircuitLoads.find((item) => item.load_id === loadId) ?? null;
    if (!load) return;

    const draft = loadDrafts[loadId] ?? loadDraftFromEntity(load);
    const title = draft.title.trim();
    const description = draft.description.trim() === '' ? null : draft.description.trim();
    const usageKw = Number(draft.usage_kw);
    const spikeKw = Number(draft.spike_kw);
    const expectedUsageHoursPerDay = Number(draft.expected_usage_hours_per_day);
    const sleepingKw = Number(draft.sleeping_kw);

    if (!title || !Number.isFinite(usageKw) || usageKw < 0 || !Number.isFinite(spikeKw) || spikeKw < 0 || !Number.isFinite(expectedUsageHoursPerDay) || expectedUsageHoursPerDay < 0 || !Number.isFinite(sleepingKw) || sleepingKw < 0) {
      setSaveError('Fill in the load title and numeric fields.');
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const response = await fetch(`/api/loads/${encodeURIComponent(loadId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          load_id: loadId,
          load_circuit_id: selectedLoadCircuit?.load_circuit_id ?? load.load_circuit_id,
          title,
          description,
          usage_kw: usageKw,
          spike_kw: spikeKw,
          expected_usage_hours_per_day: expectedUsageHoursPerDay,
          sleeping_kw: sleepingKw,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to save load (${response.status})`);
      }

      await refreshProjectData();
      setLoadDrafts((current) => ({
        ...current,
        [loadId]: {
          load_id: loadId,
          load_circuit_id: selectedLoadCircuit?.load_circuit_id ?? load.load_circuit_id,
          title,
          description: description ?? '',
          usage_kw: String(usageKw),
          spike_kw: String(spikeKw),
          expected_usage_hours_per_day: String(expectedUsageHoursPerDay),
          sleeping_kw: String(sleepingKw),
        },
      }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save load.');
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteLoad(loadId: string) {
    const load = selectedCircuitLoads.find((item) => item.load_id === loadId) ?? null;
    if (!load) return;

    if (!window.confirm(`Delete load "${load.load_id}"?`)) return;

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const response = await fetch(`/api/loads/${encodeURIComponent(load.load_id)}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to delete load (${response.status})`);
      }

      await refreshProjectData();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to delete load.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <section className="detail-shell">
        <section className="panel">
          <div className="section-head">
            <h2>Load circuits</h2>
            <p>Pick a circuit to edit its loads below.</p>
          </div>
          <div className="stack" style={{ gap: 12 }}>
            <div className="button-row button-row-between">
              <label className="field" style={{ minWidth: 260 }}>
                <span>{t('catalog.field.conversion_device_id')}</span>
                <select value={filterConversionDeviceId} onChange={(event) => setFilterConversionDeviceId(event.target.value)}>
                  <option value="">All converters</option>
                  {data.entities.conversion_devices.map((device) => (
                    <option key={device.conversion_device_id} value={device.conversion_device_id}>
                      {device.title}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="button button-secondary" onClick={startAddNew}>
                Add load circuit
              </button>
            </div>
            <div className="surface-grid">
              {filteredLoadCircuits.length === 0 ? (
                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                  <p style={{ marginTop: 0, marginBottom: 0 }}>No load circuits found.</p>
                </div>
              ) : filteredLoadCircuits.map((circuit) => {
                const circuitLoads = data.entities.loads.filter((load) => load.load_circuit_id === circuit.load_circuit_id);
                const circuitUsage = circuitLoads.reduce((sum, load) => sum + load.usage_kw, 0);
                const circuitSpike = circuitLoads.reduce((sum, load) => sum + load.spike_kw, 0);
                const converter = data.entities.conversion_devices.find((item) => item.conversion_device_id === circuit.conversion_device_id);
                return (
                  <div
                    key={circuit.load_circuit_id}
                    className="surface-card-stack"
                  >
                    <div className="surface-card">
                      <div className="surface-card-top">
                        <div>
                          <h3>{circuit.title}</h3>
                          <p>{circuit.description?.trim() || converter?.title || circuit.conversion_device_id}</p>
                        </div>
                      </div>
                      <dl className="detail-stats compact-stats" style={{ marginTop: 8, marginBottom: 0 }}>
                        <div>
                          <dt>{t('catalog.field.conversion_device_id')}</dt>
                          <dd>{converter?.title ?? circuit.conversion_device_id}</dd>
                        </div>
                        <div>
                          <dt>Loads</dt>
                          <dd>{circuitLoads.length}</dd>
                        </div>
                        <div>
                          <dt>Usage</dt>
                          <dd>{formatLoadKw(circuitUsage)}</dd>
                        </div>
                        <div>
                          <dt>Spike</dt>
                          <dd>{formatLoadKw(circuitSpike)}</dd>
                        </div>
                      </dl>
                      <div className="button-row">
                        <button
                          type="button"
                          className="button button-secondary button-sm"
                          onClick={() => {
                            setSelectedLoadCircuitId(circuit.load_circuit_id);
                            setSaveError(null);
                            setSaveMessage(null);
                          }}
                        >
                          {t('common.detail')}
                        </button>
                        <button
                          type="button"
                          className="button button-danger button-sm"
                          onClick={() => void handleDelete(circuit.load_circuit_id)}
                          disabled={isSaving}
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>{selectedLoadCircuit ? 'Edit load circuit' : 'Add load circuit'}</h2>
            <p>Choose the converter that owns this circuit.</p>
          </div>
          <div className="stack" style={{ gap: 16 }}>
            <div className="field">
              <span>{t('catalog.field.load_circuit_id')}</span>
              <p className="muted">
                {selectedLoadCircuit ? selectedLoadCircuit.load_circuit_id : (draft.title.trim() ? generateUniqueCatalogId(draft.title.trim(), data.entities.load_circuits.map((circuit) => circuit.load_circuit_id)) : 'Generated after save')}
              </p>
            </div>
            <label className="field">
              <span>{t('catalog.field.title')}</span>
              <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Living room sockets" />
            </label>
            <label className="field">
              <span>{t('catalog.field.conversion_device_id')}</span>
              <select value={draft.conversion_device_id} onChange={(event) => setDraft((current) => ({ ...current, conversion_device_id: event.target.value }))}>
                <option value="">Choose converter</option>
                {data.entities.conversion_devices.map((device) => (
                  <option key={device.conversion_device_id} value={device.conversion_device_id}>
                    {device.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t('catalog.field.description')}</span>
              <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} rows={3} />
            </label>
            <div className="stack" style={{ gap: 8 }}>
              <button type="button" className="button button-secondary" onClick={() => void handleSave()} disabled={isSaving || !draft.title.trim() || !draft.conversion_device_id.trim()}>
                {isSaving ? t('common.saving') : t('common.save')}
              </button>
              {selectedLoadCircuit ? (
                <button type="button" className="button button-danger" onClick={() => void handleDelete()} disabled={isSaving}>
                  {t('common.delete')}
                </button>
              ) : null}
              {saveError ? <p className="save-error">{saveError}</p> : null}
              {saveMessage ? <p className="save-message">{saveMessage}</p> : null}
            </div>
          </div>
          {selectedLoadCircuit ? (
            <>
              <dl className="detail-stats panel-spec-grid" style={{ marginTop: 16 }}>
                <div><dt>{t('catalog.field.conversion_device_id')}</dt><dd>{selectedConversionDevice?.title ?? selectedLoadCircuit.conversion_device_id}</dd></div>
                <div><dt>Loads</dt><dd>{selectedCircuitLoads.length}</dd></div>
                <div><dt>Usage</dt><dd>{formatLoadKw(totalUsageKw)}</dd></div>
                <div><dt>Spike</dt><dd>{formatLoadKw(totalSpikeKw)}</dd></div>
              </dl>
            <div className="surface-grid" style={{ marginTop: 16 }}>
              {selectedCircuitLoads.length === 0 ? (
                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                  <p style={{ marginTop: 0, marginBottom: 0 }}>No loads in this circuit yet.</p>
                </div>
              ) : selectedCircuitLoads.map((load) => (
                <div key={load.load_id} className="surface-card-stack">
                  <div className="surface-card">
                    <div className="surface-card-top">
                      <div>
                        <h3>{load.title}</h3>
                        <p>{load.description?.trim() || t('catalog.entry.load')}</p>
                      </div>
                    </div>
                    <dl className="detail-stats compact-stats" style={{ marginTop: 8, marginBottom: 0 }}>
                      <div>
                        <dt>Usage</dt>
                        <dd>{formatLoadKw(load.usage_kw)}</dd>
                      </div>
                      <div>
                        <dt>Spike</dt>
                        <dd>{formatLoadKw(load.spike_kw)}</dd>
                      </div>
                      <div>
                        <dt>Hours</dt>
                        <dd>{load.expected_usage_hours_per_day.toLocaleString('en-US', { maximumFractionDigits: 1 })} h/day</dd>
                      </div>
                      <div>
                        <dt>{t('catalog.stat.voltage')}</dt>
                        <dd>{formatVoltage(selectedCircuitVoltageV)}</dd>
                      </div>
                    </dl>
                    <div className="button-row">
                      <button
                        type="button"
                        className="button button-secondary button-sm"
                        onClick={() => void saveLoadDetails(load.load_id)}
                        disabled={isSaving || !((loadDrafts[load.load_id]?.title ?? load.title).trim())}
                      >
                        {t('common.save')}
                      </button>
                      <button
                        type="button"
                        className="button button-danger button-sm"
                        onClick={() => void deleteLoad(load.load_id)}
                        disabled={isSaving}
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </>
          ) : null}
        </section>
      </section>
    </>
  );
}

function LoadsPage({
  data,
  refreshProjectData,
}: {
  data: DigitalTwinExport;
  refreshProjectData: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [filterLoadCircuitId, setFilterLoadCircuitId] = useState('');
  const filteredLoads = data.entities.loads.filter((load) => (
    filterLoadCircuitId === '' || load.load_circuit_id === filterLoadCircuitId
  ));
  const [selectedLoadId, setSelectedLoadId] = useState(() => filteredLoads[0]?.load_id ?? data.entities.loads[0]?.load_id ?? '');
  const selectedLoad = selectedLoadId ? data.entities.loads.find((item) => item.load_id === selectedLoadId) ?? null : null;
  const [draft, setDraft] = useState<LoadDraft>(() => loadDraftFromEntity(selectedLoad));
  const [loadEntryMode, setLoadEntryMode] = useState<'manual' | 'catalog'>('manual');
  const [selectedLoadPresetId, setSelectedLoadPresetId] = useState(LOAD_PRESETS[0]?.load_preset_id ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedLoadId) {
      const current = data.entities.loads.find((item) => item.load_id === selectedLoadId) ?? null;
      setDraft(loadDraftFromEntity(current));
      setLoadEntryMode('manual');
    } else {
      setDraft(emptyLoadDraft(data.entities.load_circuits[0]?.load_circuit_id ?? ''));
      setLoadEntryMode('manual');
    }
  }, [data, selectedLoadId]);

  useEffect(() => {
    if (selectedLoadId && filteredLoads.some((load) => load.load_id === selectedLoadId)) {
      return;
    }
    setSelectedLoadId(filteredLoads[0]?.load_id ?? data.entities.loads[0]?.load_id ?? '');
  }, [data.entities.loads, filteredLoads, selectedLoadId]);

  const selectedLoadCircuit = draft.load_circuit_id
    ? data.entities.load_circuits.find((item) => item.load_circuit_id === draft.load_circuit_id) ?? null
    : null;
  const selectedConverter = selectedLoadCircuit
    ? data.entities.conversion_devices.find((item) => item.conversion_device_id === selectedLoadCircuit.conversion_device_id) ?? null
    : null;
  const selectedLoadCircuitVoltageV = selectedConverter?.output_voltage_v ?? null;
  const selectedLoadPreset = LOAD_PRESETS.find((preset) => preset.load_preset_id === selectedLoadPresetId) ?? LOAD_PRESETS[0] ?? null;

  function startAddNew() {
    setSelectedLoadId('');
    setSaveError(null);
    setSaveMessage(null);
    setDraft(emptyLoadDraft(data.entities.load_circuits[0]?.load_circuit_id ?? ''));
    setLoadEntryMode('manual');
  }

  function applySelectedLoadPreset() {
    if (!selectedLoadPreset) return;
    const fallbackLoadCircuitId = draft.load_circuit_id || data.entities.load_circuits[0]?.load_circuit_id || '';
    setSelectedLoadId('');
    setSaveError(null);
    setSaveMessage(null);
    setLoadEntryMode('catalog');
    setDraft(loadDraftFromPreset(selectedLoadPreset, fallbackLoadCircuitId));
  }

  async function handleSave() {
    const loadId = selectedLoad ? selectedLoadId : generateUniqueCatalogId(draft.title.trim(), data.entities.loads.map((load) => load.load_id));
    const title = draft.title.trim();
    const description = draft.description.trim() === '' ? null : draft.description.trim();
    const loadCircuitId = draft.load_circuit_id.trim();
    const usageKw = Number(draft.usage_kw);
    const spikeKw = Number(draft.spike_kw);
    const expectedUsageHoursPerDay = Number(draft.expected_usage_hours_per_day);
    const sleepingKw = Number(draft.sleeping_kw);

    if (!title || !loadCircuitId || !Number.isFinite(usageKw) || usageKw < 0 || !Number.isFinite(spikeKw) || spikeKw < 0 || !Number.isFinite(expectedUsageHoursPerDay) || expectedUsageHoursPerDay < 0 || !Number.isFinite(sleepingKw) || sleepingKw < 0) {
      setSaveError('Fill in the title, load circuit, and numeric load fields.');
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const isEdit = Boolean(selectedLoad);
      const response = await fetch(isEdit ? `/api/loads/${encodeURIComponent(selectedLoadId)}` : '/api/loads', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          load_id: loadId,
          load_circuit_id: loadCircuitId,
          title,
          description,
          usage_kw: usageKw,
          spike_kw: spikeKw,
          expected_usage_hours_per_day: expectedUsageHoursPerDay,
          sleeping_kw: sleepingKw,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to save load (${response.status})`);
      }

      await refreshProjectData();
      setSelectedLoadId(loadId);
      setDraft({
        load_id: loadId,
        load_circuit_id: loadCircuitId,
        title,
        description: description ?? '',
        usage_kw: String(usageKw),
        spike_kw: String(spikeKw),
        expected_usage_hours_per_day: String(expectedUsageHoursPerDay),
        sleeping_kw: String(sleepingKw),
      });
      setSaveMessage(`Load "${loadId}" saved.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save load.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(loadId?: string) {
    const targetLoad = loadId
      ? data.entities.loads.find((item) => item.load_id === loadId) ?? null
      : selectedLoad;
    if (!targetLoad) return;

    if (!window.confirm(`Delete load "${targetLoad.load_id}"?`)) return;

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const response = await fetch(`/api/loads/${encodeURIComponent(targetLoad.load_id)}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to delete load (${response.status})`);
      }

      await refreshProjectData();
      const nextLoad = data.entities.loads.find((item) => item.load_id !== targetLoad.load_id) ?? null;
      setSelectedLoadId(nextLoad?.load_id ?? '');
      setDraft(loadDraftFromEntity(nextLoad));
      setSaveMessage(`Load "${targetLoad.load_id}" deleted.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to delete load.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
    <section className="detail-shell">
        <section className="panel">
          <div className="stack" style={{ gap: 12 }}>
            <div className="button-row button-row-between">
              <label className="field" style={{ minWidth: 260 }}>
                <span>Load circuit</span>
                <select value={filterLoadCircuitId} onChange={(event) => setFilterLoadCircuitId(event.target.value)}>
                  <option value="">All circuits</option>
                  {data.entities.load_circuits.map((circuit) => (
                    <option key={circuit.load_circuit_id} value={circuit.load_circuit_id}>
                      {circuit.title}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="button button-secondary" onClick={startAddNew}>
                Add load
              </button>
            </div>
            <div className="surface-grid">
              {filteredLoads.length === 0 ? (
                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                  <p style={{ marginTop: 0, marginBottom: 0 }}>No loads found.</p>
                </div>
              ) : filteredLoads.map((load) => {
                const circuit = data.entities.load_circuits.find((item) => item.load_circuit_id === load.load_circuit_id);
                const converter = circuit ? data.entities.conversion_devices.find((item) => item.conversion_device_id === circuit.conversion_device_id) : null;
                const isActive = selectedLoadId === load.load_id;
                return (
                  <div key={load.load_id} className="surface-card-stack">
                    <div className="surface-card">
                      <div className="surface-card-top">
                        <div>
                          <h3>{load.title}</h3>
                          <p>{load.description?.trim() || circuit?.title || t('catalog.entry.load')}</p>
                        </div>
                      </div>
                      <dl className="detail-stats compact-stats" style={{ marginTop: 8, marginBottom: 0 }}>
                        <div>
                          <dt>Load circuit</dt>
                          <dd>{circuit?.title ?? load.load_circuit_id}</dd>
                        </div>
                        <div>
                          <dt>Converter</dt>
                          <dd>{converter?.title ?? '—'}</dd>
                        </div>
                        <div>
                          <dt>{t('catalog.stat.voltage')}</dt>
                          <dd>{formatVoltage(converter?.output_voltage_v ?? null)}</dd>
                        </div>
                        <div>
                          <dt>Usage</dt>
                          <dd>{formatLoadKw(load.usage_kw)}</dd>
                        </div>
                        <div>
                          <dt>Spike</dt>
                          <dd>{formatLoadKw(load.spike_kw)}</dd>
                        </div>
                      </dl>
                      <div className="button-row">
                        <button
                          type="button"
                          className="button button-secondary button-sm"
                          onClick={() => {
                            setSelectedLoadId(load.load_id);
                            setSaveError(null);
                            setSaveMessage(null);
                          }}
                        >
                          {t('common.detail')}
                        </button>
                        <button
                          type="button"
                          className="button button-danger button-sm"
                          onClick={() => void handleDelete(load.load_id)}
                          disabled={isSaving}
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>{selectedLoad ? 'Edit load' : 'Add load'}</h2>
            <p>Use loads for appliances, endpoints, or grouped demand. Each load inherits voltage from its circuit and converter.</p>
          </div>
          <div className="stack" style={{ gap: 16 }}>
            {!selectedLoad ? (
              <div className="stack" style={{ gap: 12 }}>
                <label className="field">
                  <span>{t('catalog.ui.load_source')}</span>
                  <select value={loadEntryMode} onChange={(event) => setLoadEntryMode(event.target.value as 'manual' | 'catalog')}>
                    <option value="manual">{t('catalog.ui.manual_entry')}</option>
                    <option value="catalog">{t('catalog.ui.from_catalog')}</option>
                  </select>
                </label>
                {loadEntryMode === 'catalog' ? (
                  <div className="button-row button-row-between row-synced-wrap">
                    <label className="field" style={{ minWidth: 260 }}>
                      <span>{t('catalog.ui.load_template')}</span>
                      <select value={selectedLoadPresetId} onChange={(event) => setSelectedLoadPresetId(event.target.value)}>
                        {LOAD_PRESETS.map((preset) => (
                          <option key={preset.load_preset_id} value={preset.load_preset_id}>
                            {preset.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="button" className="button button-secondary" onClick={applySelectedLoadPreset} disabled={!selectedLoadPreset}>
                      {t('catalog.ui.add_from_catalog')}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="field">
              <span>Load ID</span>
              <p className="muted">
                {selectedLoad ? selectedLoad.load_id : (draft.title.trim() ? generateUniqueCatalogId(draft.title.trim(), data.entities.loads.map((load) => load.load_id)) : 'Generated after save')}
              </p>
            </div>
            <label className="field">
              <span>{t('catalog.field.title')}</span>
              <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Fridge" />
            </label>
            <label className="field">
              <span>Load circuit</span>
              <select value={draft.load_circuit_id} onChange={(event) => setDraft((current) => ({ ...current, load_circuit_id: event.target.value }))}>
                <option value="">Choose load circuit</option>
                {data.entities.load_circuits.map((circuit) => (
                  <option key={circuit.load_circuit_id} value={circuit.load_circuit_id}>
                    {circuit.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t('catalog.field.description')}</span>
              <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} rows={3} />
            </label>
            <div className="detail-grid two-col">
              <label className="field"><span>Usage (kW)</span><input type="number" step="0.01" value={draft.usage_kw} onChange={(event) => setDraft((current) => ({ ...current, usage_kw: event.target.value }))} /></label>
              <label className="field"><span>Spike (kW)</span><input type="number" step="0.01" value={draft.spike_kw} onChange={(event) => setDraft((current) => ({ ...current, spike_kw: event.target.value }))} /></label>
            </div>
            <div className="detail-grid two-col">
              <label className="field"><span>Hours per day</span><input type="number" step="0.1" value={draft.expected_usage_hours_per_day} onChange={(event) => setDraft((current) => ({ ...current, expected_usage_hours_per_day: event.target.value }))} /></label>
              <label className="field"><span>Sleeping (kW)</span><input type="number" step="0.01" value={draft.sleeping_kw} onChange={(event) => setDraft((current) => ({ ...current, sleeping_kw: event.target.value }))} /></label>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              <button type="button" className="button button-secondary" onClick={() => void handleSave()} disabled={isSaving || !draft.title.trim() || !draft.load_circuit_id.trim()}>
                {isSaving ? t('common.saving') : t('common.save')}
              </button>
              {selectedLoad ? (
                <button type="button" className="button button-danger" onClick={() => void handleDelete()} disabled={isSaving}>
                  {t('common.delete')}
                </button>
              ) : null}
              {saveError ? <p className="save-error">{saveError}</p> : null}
              {saveMessage ? <p className="save-message">{saveMessage}</p> : null}
            </div>
          </div>
          {selectedLoad ? (
            <>
              <dl className="detail-stats panel-spec-grid" style={{ marginTop: 16 }}>
                <div><dt>Load circuit</dt><dd>{selectedLoadCircuit?.title ?? selectedLoad.load_circuit_id}</dd></div>
                <div><dt>Converter</dt><dd>{selectedConverter?.title ?? '—'}</dd></div>
                <div><dt>{t('catalog.stat.inherited_voltage')}</dt><dd>{formatVoltage(selectedLoadCircuitVoltageV)}</dd></div>
                <div><dt>Usage</dt><dd>{formatLoadKw(selectedLoad.usage_kw)}</dd></div>
                <div><dt>Spike</dt><dd>{formatLoadKw(selectedLoad.spike_kw)}</dd></div>
              </dl>
            </>
          ) : null}
        </section>
      </section>
    </>
  );
}

function AppContent() {
  const [data, setData] = useState<DigitalTwinExport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>(() => parseAppUrl(window.location.pathname, window.location.hash).route);
  const { language, setLanguage, t } = useTranslation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = usePersistentState('offgridos:sidebar-collapsed', false);
  const [lightboxMedia, setLightboxMedia] = useState<LightboxMedia | null>(null);
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
    const onPopState = () => {
      const parsed = parseAppUrl(window.location.pathname, window.location.hash);
      setRoute(parsed.route);
      setIsMobileSidebarOpen(false);
      if (parsed.language && parsed.language !== language) {
        setLanguage(parsed.language);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [language, setLanguage]);

  const locationSlug = data ? getLocationSlug(data) : 'project';

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed((current) => !current);
  };

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [route]);

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    if (!lightboxMedia) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLightboxImage(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [lightboxMedia]);

  useEffect(() => {
    if (!data) {
      return;
    }

    const parsed = parseAppUrl(window.location.pathname, window.location.hash);
    const nextLanguage = parsed.language ?? language;

    if (parsed.language && parsed.language !== language) {
      setLanguage(parsed.language);
      return;
    }

    const canonicalPath = buildRoutePath(route, nextLanguage, locationSlug);
    if (window.location.pathname !== canonicalPath) {
      navigateTo(route, {
        language: nextLanguage,
        locationSlug,
        replace: true,
      });
    }
  }, [data, language, locationSlug, route, setLanguage]);

  if (error) {
    return (
      <AppFrame
        route={route}
        data={data}
        locationSlug="project"
        isMobileSidebarOpen={isMobileSidebarOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        openMobileSidebar={() => setIsMobileSidebarOpen(true)}
        closeMobileSidebar={() => setIsMobileSidebarOpen(false)}
        toggleSidebarCollapsed={toggleSidebarCollapsed}
      >
          <section className="panel error-panel">
            <p>{error}</p>
            <p>{t('app.server_reload')}</p>
          </section>
      </AppFrame>
    );
  }

  if (!data) {
    return (
      <AppFrame
        route={route}
        data={data}
        locationSlug="project"
        isMobileSidebarOpen={isMobileSidebarOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        openMobileSidebar={() => setIsMobileSidebarOpen(true)}
        closeMobileSidebar={() => setIsMobileSidebarOpen(false)}
        toggleSidebarCollapsed={toggleSidebarCollapsed}
      >
          <section className="panel error-panel">
            <p>{t('app.loading')}</p>
          </section>
      </AppFrame>
    );
  }

  const weakestMonth = findWeakestMonth(data.derived.monthly_balance);
  const localSurfaceSummaries = buildLocalSurfaceSummaries(data);
  const localTotalInstalledWp = localSurfaceSummaries.reduce((total, surface) => total + surface.installed_wp, 0);
  const arrayStateBySurface = new Map(data.derived.array_states.map((state) => [state.surface_id, state]));
  const arrayBySurfaceId = new Map((data.entities.pv_arrays ?? data.entities.arrays).map((item) => [item.surface_id, item]));
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
  const activeConverter = route.kind === 'converter'
    ? data.entities.conversion_devices.find((device) => device.conversion_device_id === route.converterId) ?? null
    : null;
  const activeLoadCircuit = route.kind === 'converter' && route.loadCircuitId && data
    ? data.entities.load_circuits.find((circuit) => circuit.load_circuit_id === route.loadCircuitId) ?? null
    : null;

  const context: PageContext = {
    data,
    route,
    weakestMonth,
    localSurfaceSummaries,
    localTotalInstalledWp,
    arrayBySurfaceId,
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
    openMediaPreview: (media) => setLightboxMedia(media),
  };

  const lightbox = lightboxMedia ? (
    <ImageLightbox media={lightboxMedia} onClose={() => setLightboxMedia(null)} />
  ) : null;

  const imageLightboxContextValue: ImageLightboxContextValue = {
    openImagePreview: (media) => setLightboxMedia(media),
  };

  if (route.kind === 'surface') {
    return (
      <ImageLightboxContext.Provider value={imageLightboxContextValue}>
        <AppFrame
          route={route}
          data={data}
          locationSlug={locationSlug}
          isMobileSidebarOpen={isMobileSidebarOpen}
          isSidebarCollapsed={isSidebarCollapsed}
          openMobileSidebar={() => setIsMobileSidebarOpen(true)}
          closeMobileSidebar={() => setIsMobileSidebarOpen(false)}
          toggleSidebarCollapsed={toggleSidebarCollapsed}
        >
            <SurfaceDetail
              key={`surface:${route.surfaceId}`}
              data={data}
              surfaceId={route.surfaceId}
              refreshProjectData={refreshProjectData}
            />
        </AppFrame>
        {lightbox}
      </ImageLightboxContext.Provider>
    );
  }

  return (
    <ImageLightboxContext.Provider value={imageLightboxContextValue}>
      <AppFrame
        route={route}
        data={data}
        locationSlug={locationSlug}
        title={route.kind === 'converter'
          ? (activeLoadCircuit?.title ?? activeConverter?.title ?? route.converterId)
          : undefined}
        context={route.kind === 'converter'
          ? (activeLoadCircuit ? t('page.load_circuit.context') : t('page.converters.context'))
          : undefined}
        isMobileSidebarOpen={isMobileSidebarOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        openMobileSidebar={() => setIsMobileSidebarOpen(true)}
        closeMobileSidebar={() => setIsMobileSidebarOpen(false)}
        toggleSidebarCollapsed={toggleSidebarCollapsed}
      >
          {route.kind === 'location' ? (
            <LocationPage {...context} />
          ) : route.kind === 'about' ? (
            <AboutPage />
          ) : route.kind === 'production' ? (
            <ProductionPage {...context} />
          ) : route.kind === 'catalogs' ? (
            <CatalogsPage />
          ) : route.kind === 'reports' ? (
            <ReportsPage />
          ) : route.kind === 'verdict-summary' ? (
            <VerdictSummaryPage {...context} />
          ) : route.kind === 'cost-summary' ? (
            <CostSummaryPage {...context} />
          ) : route.kind === 'catalog' && route.catalog === 'panel-types' ? (
            <PanelCatalogPage data={data} refreshProjectData={refreshProjectData} />
          ) : route.kind === 'catalog' && route.catalog === 'cabinet-types' ? (
            <CabinetCatalogPage data={data} refreshProjectData={refreshProjectData} />
          ) : route.kind === 'catalog' && route.catalog === 'conversion-devices' ? (
            <ConversionDeviceCatalogPage data={data} refreshProjectData={refreshProjectData} />
          ) : route.kind === 'catalog' && route.catalog === 'mppt-types' ? (
            <MpptCatalogPage data={data} refreshProjectData={refreshProjectData} />
          ) : route.kind === 'catalog' && route.catalog === 'battery-types' ? (
            <BatteryCatalogPage data={data} refreshProjectData={refreshProjectData} />
          ) : route.kind === 'catalog' && route.catalog === 'inverter-types' ? (
            <ConversionDeviceCatalogPage data={data} refreshProjectData={refreshProjectData} />
          ) : route.kind === 'battery-array' ? (
            <BatteryArrayPage {...context} />
          ) : route.kind === 'inverter-array' ? (
            <ConsumptionPage {...context} />
          ) : route.kind === 'converter' ? (
            <ConverterDetailPage {...context} />
          ) : route.kind === 'load-circuits' ? (
            <LoadCircuitsPage data={data} refreshProjectData={refreshProjectData} />
          ) : route.kind === 'loads' ? (
            <LoadsPage data={data} refreshProjectData={refreshProjectData} />
          ) : (
            <LocationPage {...context} />
          )}
      </AppFrame>
      {lightbox}
    </ImageLightboxContext.Provider>
  );
}

export function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
