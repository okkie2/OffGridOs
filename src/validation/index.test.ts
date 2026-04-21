import { describe, it, expect } from 'vitest';
import { validate, hasErrors } from './index.js';
import type { ProjectInput } from '../domain/types.js';

const baseInput: ProjectInput = {
  location: { id: 1, country: 'NL', place_name: 'Amsterdam', latitude: 52.4, longitude: 4.9 },
  surfaces: [
    { id: 1, surface_id: 'south', name: 'South', orientation_deg: 180, tilt_deg: 35, usable_area_m2: 20 },
  ],
  panelTypes: [
    { id: 1, panel_type_id: 'p1', model: 'TestPanel 400', wp: 400, voc: 37.5, vmp: 31.2, isc: 13.5, imp: 12.8, length_mm: 1722, width_mm: 1134 },
  ],
  surfacePanelAssignments: [
    { id: 1, surface_id: 'south', panel_type_id: 'p1', count: 10 },
  ],
  mpptTypes: [
    {
      id: 1,
      mppt_type_id: 'mppt1',
      model: 'SmartSolar 150/35',
      tracker_count: 1,
      max_voc: 150,
      max_pv_power: 2000,
      max_pv_input_current_a: null,
      max_pv_short_circuit_current_a: null,
      max_charge_current: 35,
      nominal_battery_voltage: 48,
    },
  ],
  batteryTypes: [
    { id: 1, battery_type_id: 'b1', model: 'Pylontech US5000-1C', chemistry: 'LiFePO4', nominal_voltage: 48, capacity_ah: 100, capacity_kwh: 4.8, victron_can: true, cooling: 'passive' },
  ],
  projectPreferences: {
    target_battery_voltage: 48,
    autonomy_days: 2,
    daily_consumption_kwh: 5,
    max_cable_length_m: 10,
  },
};

describe('validate', () => {
  it('passes on valid input', () => {
    const msgs = validate(baseInput);
    expect(hasErrors(msgs)).toBe(false);
  });

  it('errors when location is missing', () => {
    const msgs = validate({ ...baseInput, location: null as any });
    expect(msgs.some((m) => m.level === 'error' && m.message.includes('Location'))).toBe(true);
  });

  it('errors when latitude is out of range', () => {
    const msgs = validate({ ...baseInput, location: { ...baseInput.location, latitude: 95 } });
    expect(hasErrors(msgs)).toBe(true);
  });

  it('warns when latitude is beyond ±66°', () => {
    const msgs = validate({ ...baseInput, location: { ...baseInput.location, latitude: 70 } });
    expect(msgs.some((m) => m.level === 'warning' && m.message.includes('66°'))).toBe(true);
  });

  it('errors when no surfaces', () => {
    const msgs = validate({ ...baseInput, surfaces: [] });
    expect(hasErrors(msgs)).toBe(true);
  });

  it('errors on invalid orientation', () => {
    const surface = { ...baseInput.surfaces[0], orientation_deg: 400 };
    const msgs = validate({ ...baseInput, surfaces: [surface] });
    expect(hasErrors(msgs)).toBe(true);
  });

  it('warns when tilt > 75°', () => {
    const surface = { ...baseInput.surfaces[0], tilt_deg: 80 };
    const msgs = validate({ ...baseInput, surfaces: [surface] });
    expect(msgs.some((m) => m.level === 'warning' && m.message.includes('steep'))).toBe(true);
  });

  it('errors when no panel types', () => {
    const msgs = validate({ ...baseInput, panelTypes: [] });
    expect(hasErrors(msgs)).toBe(true);
  });

  it('warns on suspiciously low Wp', () => {
    const panel = { ...baseInput.panelTypes[0], wp: 30 };
    const msgs = validate({ ...baseInput, panelTypes: [panel] });
    expect(msgs.some((m) => m.level === 'warning' && m.message.includes('low'))).toBe(true);
  });

  it('warns on suspiciously high Wp', () => {
    const panel = { ...baseInput.panelTypes[0], wp: 900 };
    const msgs = validate({ ...baseInput, panelTypes: [panel] });
    expect(msgs.some((m) => m.level === 'warning' && m.message.includes('high'))).toBe(true);
  });

  it('errors when no panel count assignments', () => {
    const msgs = validate({ ...baseInput, surfacePanelAssignments: [] });
    expect(hasErrors(msgs)).toBe(true);
  });

  it('errors on unknown surface_id in panel count', () => {
    const assignment = { ...baseInput.surfacePanelAssignments[0], surface_id: 'nonexistent' };
    const msgs = validate({ ...baseInput, surfacePanelAssignments: [assignment] });
    expect(hasErrors(msgs)).toBe(true);
  });

  it('warns when panel count > 50', () => {
    const assignment = { ...baseInput.surfacePanelAssignments[0], count: 51 };
    const msgs = validate({ ...baseInput, surfacePanelAssignments: [assignment] });
    expect(msgs.some((m) => m.level === 'warning' && m.message.includes('51'))).toBe(true);
  });

  it('errors on invalid battery chemistry', () => {
    const b = { ...baseInput.batteryTypes[0], chemistry: 'NiMH' };
    const msgs = validate({ ...baseInput, batteryTypes: [b] });
    expect(hasErrors(msgs)).toBe(true);
  });

  it('warns when daily consumption not set', () => {
    const msgs = validate({ ...baseInput, projectPreferences: { ...baseInput.projectPreferences, daily_consumption_kwh: undefined } });
    expect(msgs.some((m) => m.level === 'warning' && m.message.includes('Daily consumption'))).toBe(true);
  });

  it('errors when preferred MPPT does not exist', () => {
    const msgs = validate({ ...baseInput, projectPreferences: { ...baseInput.projectPreferences, preferred_mppt_type_id: 'ghost' } });
    expect(hasErrors(msgs)).toBe(true);
  });
});
