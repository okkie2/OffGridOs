import Database from 'better-sqlite3';
import type {
  Location,
  RoofFace,
  RoofFaceConfiguration,
  PanelType,
  RoofPanelAssignment,
  MpptType,
  BatteryType,
  BatteryBankConfiguration,
  Inverter,
  Preferences,
} from '../domain/types.js';

// ── Location ─────────────────────────────────────────────────────────────────

export function getLocation(db: Database.Database): Location | null {
  return (db.prepare('SELECT * FROM location LIMIT 1').get() as Location) ?? null;
}

export function upsertLocation(db: Database.Database, data: Omit<Location, 'id'>): void {
  const existing = getLocation(db);
  if (existing) {
    db.prepare('UPDATE location SET country=@country, place_name=@place_name, latitude=@latitude, longitude=@longitude, northing=@northing, easting=@easting WHERE id=@id')
      .run({ ...data, id: existing.id });
  } else {
    db.prepare('INSERT INTO location (country, place_name, latitude, longitude, northing, easting) VALUES (@country, @place_name, @latitude, @longitude, @northing, @easting)')
      .run(data);
  }
}

// ── Roof faces ────────────────────────────────────────────────────────────────

export function listRoofFaces(db: Database.Database): RoofFace[] {
  return db.prepare('SELECT * FROM roof_faces ORDER BY roof_face_id').all() as RoofFace[];
}

export function getRoofFace(db: Database.Database, roof_face_id: string): RoofFace | null {
  return (db.prepare('SELECT * FROM roof_faces WHERE roof_face_id = ?').get(roof_face_id) as RoofFace) ?? null;
}

export function insertRoofFace(db: Database.Database, data: Omit<RoofFace, 'id'>): void {
  db.prepare(`
    INSERT INTO roof_faces (roof_face_id, name, orientation_deg, tilt_deg, usable_area_m2, notes)
    VALUES (@roof_face_id, @name, @orientation_deg, @tilt_deg, @usable_area_m2, @notes)
  `).run(data);
}

export function updateRoofFace(db: Database.Database, data: Omit<RoofFace, 'id'>): void {
  db.prepare(`
    UPDATE roof_faces
    SET name=@name, orientation_deg=@orientation_deg, tilt_deg=@tilt_deg,
        usable_area_m2=@usable_area_m2, notes=@notes
    WHERE roof_face_id=@roof_face_id
  `).run(data);
}

export function deleteRoofFace(db: Database.Database, roof_face_id: string): void {
  db.prepare('DELETE FROM roof_panels WHERE roof_face_id = ?').run(roof_face_id);
  db.prepare('DELETE FROM roof_faces WHERE roof_face_id = ?').run(roof_face_id);
}

// ── Panel types ───────────────────────────────────────────────────────────────

export function listPanelTypes(db: Database.Database): PanelType[] {
  return db.prepare('SELECT * FROM panel_types ORDER BY panel_type_id').all() as PanelType[];
}

export function getPanelType(db: Database.Database, panel_type_id: string): PanelType | null {
  return (db.prepare('SELECT * FROM panel_types WHERE panel_type_id = ?').get(panel_type_id) as PanelType) ?? null;
}

export function insertPanelType(db: Database.Database, data: Omit<PanelType, 'id'>): void {
  db.prepare(`
    INSERT INTO panel_types (panel_type_id, model, wp, voc, vmp, isc, imp, length_mm, width_mm, notes)
    VALUES (@panel_type_id, @model, @wp, @voc, @vmp, @isc, @imp, @length_mm, @width_mm, @notes)
  `).run(data);
}

export function updatePanelType(db: Database.Database, data: Omit<PanelType, 'id'>): void {
  db.prepare(`
    UPDATE panel_types
    SET model=@model, wp=@wp, voc=@voc, vmp=@vmp, isc=@isc, imp=@imp,
        length_mm=@length_mm, width_mm=@width_mm, notes=@notes
    WHERE panel_type_id=@panel_type_id
  `).run(data);
}

export function deletePanelType(db: Database.Database, panel_type_id: string): void {
  db.prepare('DELETE FROM roof_panels WHERE panel_type_id = ?').run(panel_type_id);
  db.prepare('DELETE FROM panel_types WHERE panel_type_id = ?').run(panel_type_id);
}

// ── Roof panels (panel count assignments) ─────────────────────────────────────

export function listRoofPanels(db: Database.Database): RoofPanelAssignment[] {
  return db.prepare('SELECT * FROM roof_panels ORDER BY roof_face_id, panel_type_id').all() as RoofPanelAssignment[];
}

export function getRoofPanel(db: Database.Database, roof_face_id: string, panel_type_id: string): RoofPanelAssignment | null {
  return (db.prepare('SELECT * FROM roof_panels WHERE roof_face_id=? AND panel_type_id=?').get(roof_face_id, panel_type_id) as RoofPanelAssignment) ?? null;
}

export function upsertRoofPanel(db: Database.Database, data: Omit<RoofPanelAssignment, 'id'>): void {
  const existing = getRoofPanel(db, data.roof_face_id, data.panel_type_id);
  if (existing) {
    db.prepare('UPDATE roof_panels SET count=? WHERE roof_face_id=? AND panel_type_id=?')
      .run(data.count, data.roof_face_id, data.panel_type_id);
  } else {
    db.prepare('INSERT INTO roof_panels (roof_face_id, panel_type_id, count) VALUES (?,?,?)')
      .run(data.roof_face_id, data.panel_type_id, data.count);
  }
}

export function deleteRoofPanel(db: Database.Database, id: number): void {
  db.prepare('DELETE FROM roof_panels WHERE id = ?').run(id);
}

export function deleteRoofPanelsForFace(db: Database.Database, roof_face_id: string): void {
  db.prepare('DELETE FROM roof_panels WHERE roof_face_id = ?').run(roof_face_id);
}

// ── Roof-face configuration state ────────────────────────────────────────────

export function listRoofFaceConfigurations(db: Database.Database): RoofFaceConfiguration[] {
  return db.prepare('SELECT * FROM roof_face_configurations ORDER BY roof_face_id').all() as RoofFaceConfiguration[];
}

export function getRoofFaceConfiguration(db: Database.Database, roof_face_id: string): RoofFaceConfiguration | null {
  return (db.prepare('SELECT * FROM roof_face_configurations WHERE roof_face_id = ?').get(roof_face_id) as RoofFaceConfiguration) ?? null;
}

export function upsertRoofFaceConfiguration(db: Database.Database, data: Omit<RoofFaceConfiguration, 'id'>): void {
  db.prepare(`
    INSERT INTO roof_face_configurations (roof_face_id, panels_per_string, parallel_strings, selected_mppt_type_id)
    VALUES (@roof_face_id, @panels_per_string, @parallel_strings, @selected_mppt_type_id)
    ON CONFLICT(roof_face_id) DO UPDATE SET
      panels_per_string = excluded.panels_per_string,
      parallel_strings = excluded.parallel_strings,
      selected_mppt_type_id = excluded.selected_mppt_type_id
  `).run(data);
}

// ── Battery-bank configuration state ─────────────────────────────────────────

export function listBatteryBankConfigurations(db: Database.Database): BatteryBankConfiguration[] {
  return db.prepare('SELECT * FROM battery_bank_configurations ORDER BY battery_bank_id').all() as BatteryBankConfiguration[];
}

export function getBatteryBankConfiguration(db: Database.Database, battery_bank_id: string): BatteryBankConfiguration | null {
  return (db.prepare('SELECT * FROM battery_bank_configurations WHERE battery_bank_id = ?').get(battery_bank_id) as BatteryBankConfiguration) ?? null;
}

export function upsertBatteryBankConfiguration(db: Database.Database, data: Omit<BatteryBankConfiguration, 'id'>): void {
  db.prepare(`
    INSERT INTO battery_bank_configurations (
      battery_bank_id,
      selected_battery_type_id,
      configured_battery_count,
      batteries_per_string,
      parallel_strings
    )
    VALUES (
      @battery_bank_id,
      @selected_battery_type_id,
      @configured_battery_count,
      @batteries_per_string,
      @parallel_strings
    )
    ON CONFLICT(battery_bank_id) DO UPDATE SET
      selected_battery_type_id = excluded.selected_battery_type_id,
      configured_battery_count = excluded.configured_battery_count,
      batteries_per_string = excluded.batteries_per_string,
      parallel_strings = excluded.parallel_strings
  `).run(data);
}

// ── MPPT types ────────────────────────────────────────────────────────────────

export function listMpptTypes(db: Database.Database): MpptType[] {
  return db.prepare('SELECT * FROM mppt_types ORDER BY max_voc, max_charge_current').all() as MpptType[];
}

export function getMpptType(db: Database.Database, mppt_type_id: string): MpptType | null {
  return (db.prepare('SELECT * FROM mppt_types WHERE mppt_type_id = ?').get(mppt_type_id) as MpptType) ?? null;
}

export function insertMpptType(db: Database.Database, data: Omit<MpptType, 'id'>): void {
  db.prepare(`
    INSERT INTO mppt_types (
      mppt_type_id,
      model,
      tracker_count,
      max_voc,
      max_pv_power,
      max_pv_input_current_a,
      max_pv_short_circuit_current_a,
      max_charge_current,
      nominal_battery_voltage,
      notes
    )
    VALUES (
      @mppt_type_id,
      @model,
      @tracker_count,
      @max_voc,
      @max_pv_power,
      @max_pv_input_current_a,
      @max_pv_short_circuit_current_a,
      @max_charge_current,
      @nominal_battery_voltage,
      @notes
    )
  `).run(data);
}

export function updateMpptType(db: Database.Database, data: Omit<MpptType, 'id'>): void {
  db.prepare(`
    UPDATE mppt_types
    SET model=@model,
        tracker_count=@tracker_count,
        max_voc=@max_voc,
        max_pv_power=@max_pv_power,
        max_pv_input_current_a=@max_pv_input_current_a,
        max_pv_short_circuit_current_a=@max_pv_short_circuit_current_a,
        max_charge_current=@max_charge_current,
        nominal_battery_voltage=@nominal_battery_voltage,
        notes=@notes
    WHERE mppt_type_id=@mppt_type_id
  `).run(data);
}

export function deleteMpptType(db: Database.Database, mppt_type_id: string): void {
  db.prepare('DELETE FROM mppt_types WHERE mppt_type_id = ?').run(mppt_type_id);
}

// ── Battery types ─────────────────────────────────────────────────────────────

export function listBatteryTypes(db: Database.Database): BatteryType[] {
  return db.prepare('SELECT * FROM battery_types ORDER BY battery_type_id').all() as BatteryType[];
}

export function getBatteryType(db: Database.Database, battery_type_id: string): BatteryType | null {
  return (db.prepare('SELECT * FROM battery_types WHERE battery_type_id = ?').get(battery_type_id) as BatteryType) ?? null;
}

export function insertBatteryType(db: Database.Database, data: Omit<BatteryType, 'id'>): void {
  const pricePerKwh = data.price != null && data.capacity_kwh > 0
    ? Math.round((data.price / data.capacity_kwh) * 100) / 100
    : null;
  db.prepare(`
    INSERT INTO battery_types
      (battery_type_id, model, chemistry, nominal_voltage, capacity_ah, capacity_kwh,
       max_charge_rate, max_discharge_rate, victron_can, cooling, price, price_per_kwh, source, url, notes)
    VALUES
      (@battery_type_id, @model, @chemistry, @nominal_voltage, @capacity_ah, @capacity_kwh,
       @max_charge_rate, @max_discharge_rate, @victron_can, @cooling, @price, @price_per_kwh, @source, @url, @notes)
  `).run({
    ...data,
    price_per_kwh: pricePerKwh,
    cooling: data.cooling ?? 'passive',
    source: data.source ?? data.url ?? null,
    url: data.url ?? data.source ?? null,
  });
}

export function updateBatteryType(db: Database.Database, data: Omit<BatteryType, 'id'>): void {
  const pricePerKwh = data.price != null && data.capacity_kwh > 0
    ? Math.round((data.price / data.capacity_kwh) * 100) / 100
    : null;
  db.prepare(`
    UPDATE battery_types
    SET model=@model, chemistry=@chemistry, nominal_voltage=@nominal_voltage,
        capacity_ah=@capacity_ah, capacity_kwh=@capacity_kwh,
        max_charge_rate=@max_charge_rate, max_discharge_rate=@max_discharge_rate,
        victron_can=@victron_can, cooling=@cooling, price=@price, price_per_kwh=@price_per_kwh, source=@source, url=@url, notes=@notes
    WHERE battery_type_id=@battery_type_id
  `).run({
    ...data,
    price_per_kwh: pricePerKwh,
    cooling: data.cooling ?? 'passive',
    source: data.source ?? data.url ?? null,
    url: data.url ?? data.source ?? null,
  });
}

export function deleteBatteryType(db: Database.Database, battery_type_id: string): void {
  db.prepare('DELETE FROM battery_types WHERE battery_type_id = ?').run(battery_type_id);
}

// ── Inverters ────────────────────────────────────────────────────────────────

export function listInverters(db: Database.Database): Inverter[] {
  return db.prepare('SELECT * FROM inverters ORDER BY continuous_power_w, peak_power_va').all() as Inverter[];
}

export function getInverter(db: Database.Database, inverter_id: string): Inverter | null {
  return (db.prepare('SELECT * FROM inverters WHERE inverter_id = ?').get(inverter_id) as Inverter) ?? null;
}

// ── Preferences ───────────────────────────────────────────────────────────────

export function getPreferences(db: Database.Database): Preferences {
  const rows = db.prepare('SELECT key, value FROM preferences').all() as { key: string; value: string }[];
  const prefs: Preferences = {};
  for (const { key, value } of rows) {
    switch (key) {
      case 'target_battery_voltage':
        prefs.target_battery_voltage = Number(value); break;
      case 'autonomy_days':
        prefs.autonomy_days = Number(value); break;
      case 'daily_consumption_kwh':
        prefs.daily_consumption_kwh = Number(value); break;
      case 'max_cable_length_m':
        prefs.max_cable_length_m = Number(value); break;
      case 'preferred_mppt_type_id':
        prefs.preferred_mppt_type_id = value; break;
      case 'preferred_battery_type_id':
        prefs.preferred_battery_type_id = value; break;
      case 'preferred_inverter_type_id':
        prefs.preferred_inverter_type_id = value; break;
    }
  }
  return prefs;
}

export function setPref(db: Database.Database, key: string, value: string): void {
  db.prepare('INSERT INTO preferences (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(key, value);
}
