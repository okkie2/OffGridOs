import { describe, it, expect } from 'vitest';
import {
  evaluateArrayToMpptFit,
  getMpptShortCircuitCurrentLimit,
  pickDerivedMpptType,
  type ArrayToMpptInput,
} from './arrayToMppt.js';
import type { MpptType, PanelType } from '../domain/types.js';

// Realistic 48V MPPT fixture (Victron SmartSolar 150/45 equivalent)
const baseMppt: MpptType = {
  id: 1,
  mppt_type_id: 'test-mppt-150-45',
  brand: 'Victron',
  model: 'SmartSolar 150/45',
  tracker_count: 1,
  max_voc: 150,
  max_pv_power: 2600,
  max_pv_input_current_a: null,
  max_pv_short_circuit_current_a: null,
  max_charge_current: 45,
  nominal_battery_voltage: 48,
  notes: undefined,
  price: null,
  price_source_url: null,
};

// Realistic 400W panel fixture
const basePanel: PanelType = {
  id: 1,
  panel_type_id: 'test-panel-400w',
  brand: 'TestBrand',
  model: 'TP-400W',
  wp: 400,
  voc: 37.5,
  vmp: 31.2,
  isc: 13.5,
  imp: 12.8,
  length_mm: 1722,
  width_mm: 1134,
  temp_coefficient_voc_pct_per_c: -0.30,
  notes: undefined,
  price: null,
  price_source_url: null,
};

// 4 panels in a single string: Voc = 4 × 37.5 = 150V, installedWp = 1600W
// powerRatio = 1600 / 2600 ≈ 0.615 → underutilized
const baseInput: ArrayToMpptInput = {
  panelType: basePanel,
  panelCount: 4,
  installedWp: 1600,
  mpptType: baseMppt,
  panelsPerString: 4,
  parallelStrings: 1,
};

// ---------------------------------------------------------------------------
// getMpptShortCircuitCurrentLimit
// ---------------------------------------------------------------------------

describe('getMpptShortCircuitCurrentLimit', () => {
  it('returns max_pv_short_circuit_current_a when set', () => {
    const mppt = { ...baseMppt, max_pv_short_circuit_current_a: 50 };
    expect(getMpptShortCircuitCurrentLimit(mppt)).toBe(50);
  });

  it('falls back to max_charge_current when max_pv_short_circuit_current_a is null', () => {
    const mppt = { ...baseMppt, max_pv_short_circuit_current_a: null };
    expect(getMpptShortCircuitCurrentLimit(mppt)).toBe(baseMppt.max_charge_current);
  });
});

// ---------------------------------------------------------------------------
// evaluateArrayToMpptFit — electrical_status
// ---------------------------------------------------------------------------

describe('evaluateArrayToMpptFit — electrical_status', () => {
  it('is within_limits when all values are exactly at their limits', () => {
    // Cold Voc = 4 × 37.5 × 1.105 = 165.8V; MPPT max_voc set above that
    const input: ArrayToMpptInput = {
      panelType: { ...basePanel, voc: 37.5, imp: 12.8, isc: 13.5 },
      panelCount: 4,
      installedWp: 1600,
      mpptType: { ...baseMppt, max_voc: 170 },
      panelsPerString: 4,
      parallelStrings: 1,
    };
    const result = evaluateArrayToMpptFit(input);
    expect(result.electrical_status).toBe('within_limits');
  });

  it('is outside_limits when Voc exceeds max_voc', () => {
    // 4 panels × 38V voc = 152V > 150V limit
    const input: ArrayToMpptInput = {
      ...baseInput,
      panelType: { ...basePanel, voc: 38 },
      panelsPerString: 4,
    };
    const result = evaluateArrayToMpptFit(input);
    expect(result.electrical_status).toBe('outside_limits');
    expect(result.reasons).toContain('voltage_too_high');
    expect(result.fit_status).toBeUndefined();
  });

  it('is outside_limits when installedWp exceeds max_pv_power', () => {
    const input: ArrayToMpptInput = {
      ...baseInput,
      installedWp: 2700,
      mpptType: { ...baseMppt, max_pv_power: 2600 },
    };
    const result = evaluateArrayToMpptFit(input);
    expect(result.electrical_status).toBe('outside_limits');
    expect(result.reasons).toContain('power_too_high');
  });

  it('is outside_limits when input current exceeds max_pv_input_current_a', () => {
    // imp × parallelStrings = 12.8 × 3 = 38.4A > 35A limit
    const input: ArrayToMpptInput = {
      ...baseInput,
      panelCount: 3,
      panelsPerString: 1,
      parallelStrings: 3,
      mpptType: { ...baseMppt, max_pv_input_current_a: 35 },
    };
    const result = evaluateArrayToMpptFit(input);
    expect(result.electrical_status).toBe('outside_limits');
    expect(result.reasons).toContain('input_current_too_high');
  });

  it('skips input_current check when max_pv_input_current_a is null', () => {
    const input: ArrayToMpptInput = {
      ...baseInput,
      panelCount: 3,
      panelsPerString: 1,
      parallelStrings: 3,
      installedWp: 1200,
      mpptType: { ...baseMppt, max_pv_input_current_a: null },
    };
    const result = evaluateArrayToMpptFit(input);
    expect(result.reasons).not.toContain('input_current_too_high');
  });

  it('is outside_limits when short-circuit current exceeds fallback limit', () => {
    // isc × parallelStrings = 13.5 × 4 = 54A > max_charge_current 45A fallback
    const input: ArrayToMpptInput = {
      ...baseInput,
      panelCount: 4,
      panelsPerString: 1,
      parallelStrings: 4,
      installedWp: 1600,
      mpptType: { ...baseMppt, max_pv_short_circuit_current_a: null, max_charge_current: 45 },
    };
    const result = evaluateArrayToMpptFit(input);
    expect(result.electrical_status).toBe('outside_limits');
    expect(result.reasons).toContain('short_circuit_current_too_high');
  });

  it('is outside_limits when charge current exceeds max_charge_current', () => {
    // installedWp / 48 = 2400 / 48 = 50A > 45A limit
    const input: ArrayToMpptInput = {
      ...baseInput,
      installedWp: 2400,
      mpptType: { ...baseMppt, max_charge_current: 45, max_pv_power: 3000 },
    };
    const result = evaluateArrayToMpptFit(input);
    expect(result.electrical_status).toBe('outside_limits');
    expect(result.reasons).toContain('charge_current_too_high');
  });

  it('can report multiple outside_limits reasons simultaneously', () => {
    const input: ArrayToMpptInput = {
      panelType: { ...basePanel, voc: 50, isc: 20 },
      panelCount: 4,
      installedWp: 3000,
      mpptType: { ...baseMppt, max_voc: 150, max_pv_power: 2600, max_charge_current: 45 },
      panelsPerString: 4,
      parallelStrings: 1,
    };
    const result = evaluateArrayToMpptFit(input);
    expect(result.electrical_status).toBe('outside_limits');
    expect(result.reasons).toContain('voltage_too_high');
    expect(result.reasons).toContain('power_too_high');
    expect(result.reasons).toContain('charge_current_too_high');
  });
});

// ---------------------------------------------------------------------------
// evaluateArrayToMpptFit — fit_status thresholds
// ---------------------------------------------------------------------------

describe('evaluateArrayToMpptFit — fit_status', () => {
  // Use a high-ceiling MPPT so voltage/current limits never interfere with power-ratio testing.
  // max_pv_power = 2000W; max_charge_current = 100A (never binding at these Wp levels);
  // thresholds: underutilized < 80% (< 1600W), optimal 80–95% (1600–1899W), fully_utilized >= 95% (>= 1900W)
  const thresholdMppt: MpptType = {
    ...baseMppt,
    max_voc: 250,
    max_pv_power: 2000,
    max_charge_current: 100,
  };

  it('is underutilized when powerRatio < 0.80', () => {
    // 1599 / 2000 = 0.7995 → just under 80%
    const input: ArrayToMpptInput = { ...baseInput, installedWp: 1599, mpptType: thresholdMppt };
    const result = evaluateArrayToMpptFit(input);
    expect(result.fit_status).toBe('underutilized');
    expect(result.reasons).toContain('low_utilization');
  });

  it('is optimal when powerRatio is exactly 0.80', () => {
    // 1600 / 2000 = 0.80
    const input: ArrayToMpptInput = { ...baseInput, installedWp: 1600, mpptType: thresholdMppt };
    const result = evaluateArrayToMpptFit(input);
    expect(result.fit_status).toBe('optimal');
    expect(result.reasons).toContain('well_matched');
  });

  it('is optimal when powerRatio is in the 80–95% range', () => {
    // 1800 / 2000 = 0.90
    const input: ArrayToMpptInput = { ...baseInput, installedWp: 1800, mpptType: thresholdMppt };
    const result = evaluateArrayToMpptFit(input);
    expect(result.fit_status).toBe('optimal');
  });

  it('is fully_utilized when powerRatio is exactly 0.95', () => {
    // 1900 / 2000 = 0.95
    const input: ArrayToMpptInput = { ...baseInput, installedWp: 1900, mpptType: thresholdMppt };
    const result = evaluateArrayToMpptFit(input);
    expect(result.fit_status).toBe('fully_utilized');
    expect(result.reasons).toContain('fully_utilized');
  });

  it('is fully_utilized when powerRatio is > 0.95 but still within power limit', () => {
    // 1980 / 2000 = 0.99
    const input: ArrayToMpptInput = { ...baseInput, installedWp: 1980, mpptType: thresholdMppt };
    const result = evaluateArrayToMpptFit(input);
    expect(result.fit_status).toBe('fully_utilized');
  });

  it('fit_status is undefined when outside_limits', () => {
    const input: ArrayToMpptInput = {
      ...baseInput,
      panelType: { ...basePanel, voc: 50 },
      panelsPerString: 4,
    };
    const result = evaluateArrayToMpptFit(input);
    expect(result.fit_status).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// evaluateArrayToMpptFit — derived electrical values
// ---------------------------------------------------------------------------

describe('evaluateArrayToMpptFit — derived values', () => {
  it('computes input_voc_v as cold-corrected Voc, and input_voc_stc_v as STC Voc', () => {
    // STC: 4 × 37.5 = 150.0V; cold (-10°C, β=-0.30): 150 × 1.105 = 165.8V
    const result = evaluateArrayToMpptFit(baseInput);
    expect(result.input_voc_stc_v).toBe(150.0);
    expect(result.input_voc_v).toBe(165.8);
  });

  it('computes input_vmp_v as panelsPerString × vmp', () => {
    // 4 × 31.2 = 124.8
    const result = evaluateArrayToMpptFit(baseInput);
    expect(result.input_vmp_v).toBe(124.8);
  });

  it('computes input_current_a as imp × parallelStrings', () => {
    // 12.8 × 1 = 12.80
    const result = evaluateArrayToMpptFit(baseInput);
    expect(result.input_current_a).toBe(12.8);
  });

  it('computes charge_current_a as installedWp / 48', () => {
    // 1600 / 48 ≈ 33.33
    const result = evaluateArrayToMpptFit(baseInput);
    expect(result.charge_current_a).toBeCloseTo(33.33, 2);
  });

  it('returns installedWp as input_power_w unchanged', () => {
    const result = evaluateArrayToMpptFit(baseInput);
    expect(result.input_power_w).toBe(1600);
  });
});

// ---------------------------------------------------------------------------
// evaluateArrayToMpptFit — string layout reason
// ---------------------------------------------------------------------------

describe('evaluateArrayToMpptFit — string layout reason', () => {
  it('reports single_string_assumption when panelsPerString equals panelCount and parallelStrings <= 1', () => {
    const result = evaluateArrayToMpptFit(baseInput); // 4 panels, 4 per string, 1 parallel
    expect(result.reasons).toContain('single_string_assumption');
  });

  it('reports configured_string_layout when panels are split across strings', () => {
    const input: ArrayToMpptInput = {
      ...baseInput,
      panelCount: 4,
      panelsPerString: 2,
      parallelStrings: 2,
    };
    const result = evaluateArrayToMpptFit(input);
    expect(result.reasons).toContain('configured_string_layout');
    expect(result.reasons).not.toContain('single_string_assumption');
  });

  it('defaults panelsPerString to panelCount when not provided', () => {
    const input: ArrayToMpptInput = {
      panelType: basePanel,
      panelCount: 4,
      installedWp: 1600,
      mpptType: baseMppt,
    };
    const result = evaluateArrayToMpptFit(input);
    // 4 panels, defaults to single string of 4; cold-corrected Voc = 165.8V
    expect(result.input_voc_v).toBe(165.8);
    expect(result.reasons).toContain('single_string_assumption');
  });
});

// ---------------------------------------------------------------------------
// pickDerivedMpptType
// ---------------------------------------------------------------------------

describe('pickDerivedMpptType', () => {
  const mppt150_45: MpptType = { ...baseMppt, mppt_type_id: '150-45', max_voc: 150, max_pv_power: 2600, max_charge_current: 45 };
  const mppt250_70: MpptType = { ...baseMppt, mppt_type_id: '250-70', max_voc: 250, max_pv_power: 5000, max_charge_current: 70 };
  const mpptLowPower: MpptType = { ...baseMppt, mppt_type_id: 'low-100-10', max_voc: 100, max_pv_power: 1000, max_charge_current: 10 };

  it('returns undefined when panelCount is 0', () => {
    const result = pickDerivedMpptType(basePanel, 0, 0, [mppt150_45]);
    expect(result).toBeUndefined();
  });

  it('returns undefined when no candidate fits the Voc', () => {
    // 4 panels × 37.5V = 150V; only mppt with max_voc 100 available
    const result = pickDerivedMpptType(basePanel, 4, 1600, [mpptLowPower]);
    expect(result).toBeUndefined();
  });

  it('returns undefined when no candidate fits the power', () => {
    // installedWp 1600W > mpptLowPower max_pv_power 1000W
    const result = pickDerivedMpptType(basePanel, 4, 1600, [mpptLowPower]);
    expect(result).toBeUndefined();
  });

  it('selects the tightest-fitting candidate when multiple qualify', () => {
    // Cold Voc = 165.8V > mppt150_45 max_voc 150 → mppt150_45 filtered out; mppt250_70 selected
    const result = pickDerivedMpptType(basePanel, 4, 1600, [mppt250_70, mppt150_45]);
    expect(result?.mppt_type_id).toBe('250-70');
  });

  it('filters by nominal_battery_voltage', () => {
    const mppt24V: MpptType = { ...baseMppt, mppt_type_id: '24v-mppt', nominal_battery_voltage: 24, max_voc: 250, max_pv_power: 2600, max_charge_current: 45 };
    const mppt48V: MpptType = { ...baseMppt, mppt_type_id: '48v-mppt', nominal_battery_voltage: 48, max_voc: 250, max_pv_power: 2600, max_charge_current: 45 };
    // Ask for 48V nominal; only the 48V mppt should qualify (24V filtered by voltage)
    const result = pickDerivedMpptType(basePanel, 4, 1600, [mppt24V, mppt48V], 48);
    expect(result?.mppt_type_id).toBe('48v-mppt');
  });

  it('filters by max_pv_input_current_a when set', () => {
    // 3 parallel strings: imp × 3 = 38.4A
    // mppt with max_pv_input_current_a: 35 should be excluded
    const tightCurrentMppt: MpptType = { ...mppt250_70, mppt_type_id: 'tight-current', max_pv_input_current_a: 35 };
    const looseMppt: MpptType = { ...mppt250_70, mppt_type_id: 'loose-current', max_pv_input_current_a: null };
    const result = pickDerivedMpptType(basePanel, 3, 1200, [tightCurrentMppt, looseMppt], 48, 1, 3);
    expect(result?.mppt_type_id).toBe('loose-current');
  });

  it('uses short_circuit_current fallback for charge current filter', () => {
    // installedWp/48 = 1600/48 ≈ 33.3A; max_charge_current must be >= 33.3
    // Use max_voc 250 so cold Voc (165.8V) is within limits
    const mpptHighVoc: MpptType = { ...mppt150_45, mppt_type_id: '250-45', max_voc: 250 };
    const result = pickDerivedMpptType(basePanel, 4, 1600, [mpptHighVoc]);
    expect(result?.mppt_type_id).toBe('250-45');
  });
});
