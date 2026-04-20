export interface Location {
  id: number;
  country: string;
  place_name: string;
  latitude: number;
  longitude: number;
  northing?: number | null;
  easting?: number | null;
}

export interface RoofFace {
  id: number;
  roof_face_id: string;
  name: string;
  sort_order?: number | null;
  /** Azimuth in degrees: 0 = North, 90 = East, 180 = South, 270 = West */
  orientation_deg: number;
  tilt_deg: number;
  usable_area_m2?: number;
  notes?: string;
}

export interface PanelType {
  id: number;
  panel_type_id: string;
  model: string;
  wp: number;
  voc: number;
  vmp: number;
  isc: number;
  imp: number;
  length_mm: number;
  width_mm: number;
  notes?: string;
}

export interface RoofPanelAssignment {
  id: number;
  roof_face_id: string;
  panel_type_id: string;
  count: number;
}

export interface PvArray {
  id: number;
  array_id: string;
  roof_face_id: string;
  name: string;
  panel_type_id?: string | null;
  panel_count: number;
  panels_per_string?: number | null;
  parallel_strings?: number | null;
  installed_wp: number;
  notes?: string | null;
}

export interface PvString {
  id: number;
  string_id: string;
  array_id: string;
  roof_face_id: string;
  string_index: number;
  panel_type_id?: string | null;
  panel_count: number;
}

export interface ArrayToMpptMapping {
  id: number;
  mapping_id: string;
  array_id: string;
  selected_mppt_type_id?: string | null;
}

export interface RoofFaceConfiguration {
  id: number;
  roof_face_id: string;
  panels_per_string?: number | null;
  parallel_strings?: number | null;
  selected_mppt_type_id?: string | null;
}

export interface BatteryBankConfiguration {
  id: number;
  battery_bank_id: string;
  selected_battery_type_id?: string | null;
  configured_battery_count: number;
  batteries_per_string: number;
  parallel_strings: number;
}

export interface MpptType {
  id: number;
  mppt_type_id: string;
  model: string;
  tracker_count: number;
  max_voc: number;
  max_pv_power: number;
  max_pv_input_current_a?: number | null;
  max_pv_short_circuit_current_a?: number | null;
  max_charge_current: number;
  nominal_battery_voltage: number;
  notes?: string;
}

export interface BatteryType {
  id: number;
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

export interface InverterType {
  id: number;
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

export interface InverterConfiguration {
  id: number;
  inverter_configuration_id: string;
  selected_inverter_type_id?: string | null;
}

export interface Preferences {
  target_battery_voltage?: number;
  autonomy_days?: number;
  daily_consumption_kwh?: number;
  max_cable_length_m?: number;
  preferred_mppt_type_id?: string;
  preferred_battery_type_id?: string;
  preferred_inverter_type_id?: string;
}

export interface ProjectInput {
  location: Location;
  roofFaces: RoofFace[];
  panelTypes: PanelType[];
  roofPanels: RoofPanelAssignment[];
  mpptTypes: MpptType[];
  batteryTypes: BatteryType[];
  preferences: Preferences;
}

export interface YieldEstimate {
  roof_face_id: string;
  name: string;
  installed_wp: number;
  monthly_kwh: number[];
  yearly_kwh: number;
}

export interface StringSuggestion {
  roof_face_id: string;
  panel_type_id: string;
  count: number;
  max_series: number;
  max_parallel: number;
  exceeds_mppt: boolean;
  warnings: string[];
}

export interface MpptSuggestion {
  roof_face_id: string;
  mppt_type_id: string;
  model: string;
  count: number;
  warnings: string[];
}

export interface BatteryRecommendation {
  battery_type_id?: string;
  model?: string;
  min_capacity_kwh: number;
  max_capacity_kwh: number;
  unit_count_min: number;
  series_count: number;
  parallel_count: number;
  warnings: string[];
}

export interface CableSuggestion {
  roof_face_id: string;
  max_current_a: number;
  cable_length_m: number;
  min_cross_section_mm2: number;
}

export interface ValidationMessage {
  level: 'error' | 'warning' | 'info';
  message: string;
}

export interface ProjectResult {
  input: ProjectInput;
  validation: ValidationMessage[];
  yieldEstimates: YieldEstimate[];
  totalMonthlyKwh: number[];
  totalYearlyKwh: number;
  stringSuggestions: StringSuggestion[];
  mpptSuggestions: MpptSuggestion[];
  batteryRecommendation: BatteryRecommendation | null;
  cableSuggestions: CableSuggestion[];
}
