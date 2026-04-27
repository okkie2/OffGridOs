import type { MpptType, PanelType } from '../domain/types.js';

export type ElectricalStatus = 'within_limits' | 'outside_limits';
export type FitStatus = 'optimal' | 'fully_utilized' | 'clipping_expected' | 'underutilized';

export const DESIGN_TEMP_C = -10;

function coldVoc(panelType: PanelType, panelsPerString: number): number {
  const coeff = panelType.temp_coefficient_voc_pct_per_c ?? -0.30;
  return panelsPerString * panelType.voc * (1 + (coeff / 100) * (DESIGN_TEMP_C - 25));
}

export interface ArrayToMpptInput {
  panelType: PanelType;
  panelCount: number;
  installedWp: number;
  mpptType: MpptType;
  panelsPerString?: number;
  parallelStrings?: number;
}

export interface ArrayToMpptFit {
  input_voc_stc_v: number;
  input_voc_v: number;
  input_vmp_v: number;
  input_current_a: number;
  input_power_w: number;
  charge_current_a: number;
  electrical_status: ElectricalStatus;
  fit_status?: FitStatus;
  reasons: string[];
  notes: string;
}

export function getMpptShortCircuitCurrentLimit(mpptType: MpptType): number {
  return mpptType.max_pv_short_circuit_current_a ?? mpptType.max_charge_current;
}

export function pickDerivedMpptType(
  panelType: PanelType,
  panelCount: number,
  installedWp: number,
  mpptTypes: MpptType[],
  nominalBatteryVoltage = 48,
  panelsPerString = panelCount,
  parallelStrings = panelCount > 0 ? 1 : 0,
): MpptType | undefined {
  if (panelCount <= 0) return undefined;

  const assumedVoc = coldVoc(panelType, panelsPerString);
  const assumedInputCurrent = panelType.imp * Math.max(parallelStrings, 1);
  const assumedShortCircuitCurrent = panelType.isc * Math.max(parallelStrings, 1);
  const assumedChargeCurrent = installedWp / nominalBatteryVoltage;
  const candidates = mpptTypes.filter((mpptType) =>
    mpptType.max_voc >= assumedVoc
    && mpptType.max_pv_power >= installedWp
    && (mpptType.max_pv_input_current_a == null || mpptType.max_pv_input_current_a >= assumedInputCurrent)
    && getMpptShortCircuitCurrentLimit(mpptType) >= assumedShortCircuitCurrent
    && mpptType.max_charge_current >= assumedChargeCurrent
    && mpptType.nominal_battery_voltage === nominalBatteryVoltage,
  );

  return candidates.sort((left, right) => {
    if (left.max_voc !== right.max_voc) return left.max_voc - right.max_voc;
    if (left.max_pv_power !== right.max_pv_power) return left.max_pv_power - right.max_pv_power;
    return left.max_charge_current - right.max_charge_current;
  })[0];
}

export function evaluateArrayToMpptFit(input: ArrayToMpptInput): ArrayToMpptFit {
  const panelsPerString = input.panelsPerString ?? input.panelCount;
  const parallelStrings = input.parallelStrings ?? (input.panelCount > 0 ? 1 : 0);
  const inputVocStc = panelsPerString * input.panelType.voc;
  const inputVoc = coldVoc(input.panelType, panelsPerString);
  const inputVmp = panelsPerString * input.panelType.vmp;
  const inputCurrent = input.panelType.imp * Math.max(parallelStrings, 1);
  const inputShortCircuitCurrent = input.panelType.isc * Math.max(parallelStrings, 1);
  const chargeCurrent = input.installedWp / 48;
  const shortCircuitCurrentLimit = getMpptShortCircuitCurrentLimit(input.mpptType);
  const outsideLimits = inputVoc > input.mpptType.max_voc
    || input.installedWp > input.mpptType.max_pv_power
    || (input.mpptType.max_pv_input_current_a != null && inputCurrent > input.mpptType.max_pv_input_current_a)
    || inputShortCircuitCurrent > shortCircuitCurrentLimit
    || chargeCurrent > input.mpptType.max_charge_current;

  let fitStatus: FitStatus | undefined;
  const reasons = [
    panelsPerString === input.panelCount && parallelStrings <= 1
      ? 'single_string_assumption'
      : 'configured_string_layout',
  ];

  if (outsideLimits) {
    if (inputVoc > input.mpptType.max_voc) reasons.push('voltage_too_high');
    if (input.installedWp > input.mpptType.max_pv_power) reasons.push('power_too_high');
    if (input.mpptType.max_pv_input_current_a != null && inputCurrent > input.mpptType.max_pv_input_current_a) reasons.push('input_current_too_high');
    if (inputShortCircuitCurrent > shortCircuitCurrentLimit) reasons.push('short_circuit_current_too_high');
    if (chargeCurrent > input.mpptType.max_charge_current) reasons.push('charge_current_too_high');
  } else {
    const powerRatio = input.installedWp / input.mpptType.max_pv_power;
    if (powerRatio >= 0.95) {
      fitStatus = 'fully_utilized';
      reasons.push('fully_utilized');
    } else if (powerRatio >= 0.8) {
      fitStatus = 'optimal';
      reasons.push('well_matched');
    } else {
      fitStatus = 'underutilized';
      reasons.push('low_utilization');
    }
  }

  return {
    input_voc_stc_v: Number(inputVocStc.toFixed(1)),
    input_voc_v: Number(inputVoc.toFixed(1)),
    input_vmp_v: Number(inputVmp.toFixed(1)),
    input_current_a: Number(inputCurrent.toFixed(2)),
    input_power_w: input.installedWp,
    charge_current_a: Number(chargeCurrent.toFixed(2)),
    electrical_status: outsideLimits ? 'outside_limits' : 'within_limits',
    fit_status: outsideLimits ? undefined : fitStatus,
    reasons,
    notes: outsideLimits
      ? 'First-fit calculation indicates this current face layout exceeds one or more MPPT limits.'
      : 'First-fit calculation uses the current saved or derived face layout to estimate MPPT suitability.',
  };
}
