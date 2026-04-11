import type { ProjectInput, ValidationMessage } from '../domain/types.js';

const VALID_CHEMISTRIES = new Set(['LiFePO4', 'Li-ion', 'AGM', 'GEL', 'FLA']);

export function validate(input: Partial<ProjectInput>): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];

  const err = (message: string) => msgs.push({ level: 'error', message });
  const warn = (message: string) => msgs.push({ level: 'warning', message });
  const info = (message: string) => msgs.push({ level: 'info', message });

  // ── Location ────────────────────────────────────────────────────────────────

  if (!input.location) {
    err('Location is not set. Add a location before running calculations.');
  } else {
    const { latitude, longitude } = input.location;
    if (typeof latitude !== 'number' || isNaN(latitude) || latitude < -90 || latitude > 90) {
      err(`Location latitude ${latitude} is invalid. Must be between -90 and 90.`);
    } else if (Math.abs(latitude) > 66) {
      warn(`Latitude ${latitude}° is outside ±66°. Solar yield estimates may be unreliable near the poles.`);
    }
    if (typeof longitude !== 'number' || isNaN(longitude) || longitude < -180 || longitude > 180) {
      err(`Location longitude ${longitude} is invalid. Must be between -180 and 180.`);
    }
  }

  // ── Roof faces ──────────────────────────────────────────────────────────────

  const faces = input.roofFaces ?? [];
  if (faces.length === 0) {
    err('No faces defined. Add at least one roof face.');
  } else {
    for (const f of faces) {
      if (typeof f.orientation_deg !== 'number' || f.orientation_deg < 0 || f.orientation_deg > 360) {
        err(`Face "${f.roof_face_id}": orientation ${f.orientation_deg}° is invalid. Must be 0–360.`);
      }
      if (typeof f.tilt_deg !== 'number' || f.tilt_deg < 0 || f.tilt_deg > 90) {
        err(`Face "${f.roof_face_id}": tilt ${f.tilt_deg}° is invalid. Must be 0–90.`);
      } else if (f.tilt_deg > 75) {
        warn(`Face "${f.roof_face_id}": tilt ${f.tilt_deg}° is very steep. Yield estimates may be lower than expected.`);
      }
      if (f.usable_area_m2 !== undefined && f.usable_area_m2 !== null && f.usable_area_m2 <= 0) {
        err(`Face "${f.roof_face_id}": usable area must be > 0 if provided.`);
      }
    }
  }

  // ── Panel types ─────────────────────────────────────────────────────────────

  const panelTypes = input.panelTypes ?? [];
  const roofPanels = input.roofPanels ?? [];

  if (panelTypes.length === 0) {
    err('No panel types defined. Add at least one panel type.');
  } else {
    for (const p of panelTypes) {
      if (p.wp < 50) warn(`Panel type "${p.panel_type_id}": Wp ${p.wp} is suspiciously low (< 50 Wp).`);
      if (p.wp > 800) warn(`Panel type "${p.panel_type_id}": Wp ${p.wp} is suspiciously high (> 800 Wp).`);
      if (p.voc <= 0) err(`Panel type "${p.panel_type_id}": Voc must be > 0.`);
      if (p.vmp <= 0) err(`Panel type "${p.panel_type_id}": Vmp must be > 0.`);
      if (p.isc <= 0) err(`Panel type "${p.panel_type_id}": Isc must be > 0.`);
      if (p.imp <= 0) err(`Panel type "${p.panel_type_id}": Imp must be > 0.`);
      if (p.length_mm <= 0) err(`Panel type "${p.panel_type_id}": length must be > 0.`);
      if (p.width_mm <= 0) err(`Panel type "${p.panel_type_id}": width must be > 0.`);
    }
  }

  // ── Roof panel assignments (panel counts) ────────────────────────────────────

  if (roofPanels.length === 0) {
    err('No panel count assignments. Assign panels to at least one face.');
  } else {
    const faceIds = new Set(faces.map((f) => f.roof_face_id));
    const panelTypeIds = new Set(panelTypes.map((p) => p.panel_type_id));

    for (const rp of roofPanels) {
      if (!faceIds.has(rp.roof_face_id)) {
        err(`Panel count references unknown face "${rp.roof_face_id}".`);
      }
      if (!panelTypeIds.has(rp.panel_type_id)) {
        err(`Panel count references unknown panel type "${rp.panel_type_id}".`);
      }
      if (!Number.isInteger(rp.count) || rp.count <= 0) {
        err(`Panel count for face "${rp.roof_face_id}" / panel "${rp.panel_type_id}": count must be a positive integer.`);
      } else if (rp.count > 50) {
        warn(`Panel count for face "${rp.roof_face_id}": ${rp.count} panels is unusually high (> 50).`);
      }
    }
  }

  // ── MPPT types ──────────────────────────────────────────────────────────────

  const mpptTypes = input.mpptTypes ?? [];
  for (const m of mpptTypes) {
    if (m.max_voc <= 0) err(`MPPT "${m.mppt_type_id}": max Voc must be > 0.`);
    if (m.max_charge_current <= 0) err(`MPPT "${m.mppt_type_id}": max charge current must be > 0.`);
    if (m.nominal_battery_voltage <= 0) err(`MPPT "${m.mppt_type_id}": nominal battery voltage must be > 0.`);
  }

  // ── Battery types ───────────────────────────────────────────────────────────

  const batteryTypes = input.batteryTypes ?? [];
  for (const b of batteryTypes) {
    if (!VALID_CHEMISTRIES.has(b.chemistry)) {
      err(`Battery "${b.battery_type_id}": chemistry "${b.chemistry}" is invalid. Must be one of ${[...VALID_CHEMISTRIES].join(', ')}.`);
    }
    if (b.nominal_voltage <= 0) err(`Battery "${b.battery_type_id}": nominal voltage must be > 0.`);
    if (b.capacity_ah <= 0) err(`Battery "${b.battery_type_id}": capacity (Ah) must be > 0.`);
    if (b.capacity_kwh <= 0) err(`Battery "${b.battery_type_id}": capacity (kWh) must be > 0.`);
  }

  // ── Preferences ─────────────────────────────────────────────────────────────

  const prefs = input.preferences ?? {};

  if (!prefs.daily_consumption_kwh) {
    warn('Daily consumption (kWh) is not set. Battery sizing will be skipped.');
  }
  if (!prefs.target_battery_voltage) {
    warn('Target battery voltage is not set. Battery sizing will be skipped.');
  }
  if (!prefs.autonomy_days) {
    info('Autonomy days not set. Defaulting to 2 days.');
  }
  if (!prefs.max_cable_length_m) {
    warn('Max cable length not set. Cable sizing will be skipped.');
  }

  if (prefs.preferred_mppt_type_id) {
    const mpptIds = new Set(mpptTypes.map((m) => m.mppt_type_id));
    if (!mpptIds.has(prefs.preferred_mppt_type_id)) {
      err(`Preferences: preferred MPPT "${prefs.preferred_mppt_type_id}" does not exist.`);
    }
  }
  if (prefs.preferred_battery_type_id) {
    const batteryIds = new Set(batteryTypes.map((b) => b.battery_type_id));
    if (!batteryIds.has(prefs.preferred_battery_type_id)) {
      err(`Preferences: preferred battery "${prefs.preferred_battery_type_id}" does not exist.`);
    }
  }

  return msgs;
}

export function hasErrors(msgs: ValidationMessage[]): boolean {
  return msgs.some((m) => m.level === 'error');
}
