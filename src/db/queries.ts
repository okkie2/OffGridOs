import Database from 'better-sqlite3';
import type {
  Location,
  Surface,
  SurfaceConfiguration,
  PanelType,
  SurfacePanelAssignment,
  PvArray,
  PvString,
  ArrayToMpptMapping,
  MpptType,
  BatteryType,
  BatteryBankConfiguration,
  InverterType,
  InverterConfiguration,
  ProjectPreferences,
} from '../domain/types.js';

// ── Location ─────────────────────────────────────────────────────────────────

export function getLocation(db: Database.Database): Location | null {
  return (db.prepare('SELECT * FROM locations LIMIT 1').get() as Location) ?? null;
}

export function upsertLocation(db: Database.Database, data: Omit<Location, 'id'>): void {
  const existing = getLocation(db);
  if (existing) {
    const title = data.title === undefined ? (existing.title ?? null) : data.title;
    const sitePhotoDataUrl = data.site_photo_data_url === undefined
      ? (existing.site_photo_data_url ?? null)
      : data.site_photo_data_url;
    db.prepare('UPDATE locations SET title=@title, country=@country, place_name=@place_name, description=@description, notes=@notes, latitude=@latitude, longitude=@longitude, northing=@northing, easting=@easting, site_photo_data_url=@site_photo_data_url WHERE id=@id')
      .run({
        ...data,
        title,
        description: data.description ?? null,
        notes: data.notes ?? null,
        site_photo_data_url: sitePhotoDataUrl,
        id: existing.id,
      });
  } else {
    db.prepare('INSERT INTO locations (title, country, place_name, description, notes, latitude, longitude, northing, easting, site_photo_data_url) VALUES (@title, @country, @place_name, @description, @notes, @latitude, @longitude, @northing, @easting, @site_photo_data_url)')
      .run({
        ...data,
        title: data.title ?? null,
        description: data.description ?? null,
        notes: data.notes ?? null,
        site_photo_data_url: data.site_photo_data_url ?? null,
      });
  }
}

// ── Surfaces ──────────────────────────────────────────────────────────────────

export function listSurfaces(db: Database.Database): Surface[] {
  return db.prepare('SELECT * FROM surfaces ORDER BY sort_order, id').all() as Surface[];
}

export function getSurface(db: Database.Database, surface_id: string): Surface | null {
  return (db.prepare('SELECT * FROM surfaces WHERE surface_id = ?').get(surface_id) as Surface) ?? null;
}

export function insertSurface(db: Database.Database, data: Omit<Surface, 'id'>): void {
  db.prepare(`
    INSERT INTO surfaces (surface_id, name, description, sort_order, orientation_deg, tilt_deg, usable_area_m2, area_height_m, area_width_m, notes, photo_data_url)
    VALUES (@surface_id, @name, @description, @sort_order, @orientation_deg, @tilt_deg, @usable_area_m2, @area_height_m, @area_width_m, @notes, @photo_data_url)
  `).run({
    ...data,
    description: data.description ?? null,
    area_height_m: data.area_height_m ?? null,
    area_width_m: data.area_width_m ?? null,
    photo_data_url: data.photo_data_url ?? null,
  });
}

export function createSurface(db: Database.Database, data: Omit<Surface, 'id'>): void {
  const nextSortOrderRow = db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort_order FROM surfaces').get() as { next_sort_order: number } | undefined;
  insertSurface(db, {
    ...data,
    sort_order: data.sort_order ?? (nextSortOrderRow?.next_sort_order ?? 1),
  });
  syncPvTopologyForSurface(db, data.surface_id);
}

export function updateSurface(db: Database.Database, data: Omit<Surface, 'id'>): void {
  db.prepare(`
    UPDATE surfaces
    SET name=@name, description=@description, orientation_deg=@orientation_deg, tilt_deg=@tilt_deg,
        usable_area_m2=@usable_area_m2, area_height_m=@area_height_m, area_width_m=@area_width_m,
        notes=@notes, photo_data_url=@photo_data_url
    WHERE surface_id=@surface_id
  `).run({
    ...data,
    description: data.description ?? null,
    area_height_m: data.area_height_m ?? null,
    area_width_m: data.area_width_m ?? null,
    photo_data_url: data.photo_data_url ?? null,
  });
}

export function deleteSurface(db: Database.Database, surface_id: string): void {
  db.prepare('DELETE FROM surface_panel_assignments WHERE surface_id = ?').run(surface_id);
  deletePvArrayForSurface(db, surface_id);
  db.prepare('DELETE FROM surface_configurations WHERE surface_id = ?').run(surface_id);
  db.prepare('DELETE FROM surfaces WHERE surface_id = ?').run(surface_id);
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
  db.prepare('DELETE FROM surface_panel_assignments WHERE panel_type_id = ?').run(panel_type_id);
  db.prepare('DELETE FROM panel_types WHERE panel_type_id = ?').run(panel_type_id);
}

// ── Surface panel assignments ─────────────────────────────────────────────────

export function listSurfacePanelAssignments(db: Database.Database): SurfacePanelAssignment[] {
  return db.prepare('SELECT * FROM surface_panel_assignments ORDER BY surface_id, panel_type_id').all() as SurfacePanelAssignment[];
}

export function getSurfacePanelAssignment(db: Database.Database, surface_id: string, panel_type_id: string): SurfacePanelAssignment | null {
  return (db.prepare('SELECT * FROM surface_panel_assignments WHERE surface_id=? AND panel_type_id=?').get(surface_id, panel_type_id) as SurfacePanelAssignment) ?? null;
}

export function upsertSurfacePanelAssignment(db: Database.Database, data: Omit<SurfacePanelAssignment, 'id'>): void {
  const existing = getSurfacePanelAssignment(db, data.surface_id, data.panel_type_id);
  if (existing) {
    db.prepare('UPDATE surface_panel_assignments SET count=? WHERE surface_id=? AND panel_type_id=?')
      .run(data.count, data.surface_id, data.panel_type_id);
  } else {
    db.prepare('INSERT INTO surface_panel_assignments (surface_id, panel_type_id, count) VALUES (?,?,?)')
      .run(data.surface_id, data.panel_type_id, data.count);
  }
  syncPvTopologyForSurface(db, data.surface_id);
}

export function deleteSurfacePanelAssignment(db: Database.Database, id: number): void {
  const row = db.prepare('SELECT surface_id FROM surface_panel_assignments WHERE id = ?').get(id) as { surface_id?: string } | undefined;
  db.prepare('DELETE FROM surface_panel_assignments WHERE id = ?').run(id);
  if (row?.surface_id) {
    syncPvTopologyForSurface(db, row.surface_id);
  }
}

export function deleteSurfacePanelAssignmentsForSurface(db: Database.Database, surface_id: string): void {
  db.prepare('DELETE FROM surface_panel_assignments WHERE surface_id = ?').run(surface_id);
  syncPvTopologyForSurface(db, surface_id);
}

// ── PV topology persistence ─────────────────────────────────────────────────

export function listPvArrays(db: Database.Database): PvArray[] {
  return db.prepare('SELECT * FROM pv_arrays ORDER BY surface_id').all() as PvArray[];
}

export function getPvArrayBySurface(db: Database.Database, surface_id: string): PvArray | null {
  return (db.prepare('SELECT * FROM pv_arrays WHERE surface_id = ?').get(surface_id) as PvArray) ?? null;
}

export function upsertPvArray(db: Database.Database, data: Omit<PvArray, 'id'>): void {
  db.prepare(`
    INSERT INTO pv_arrays (
      array_id,
      surface_id,
      name,
      panel_type_id,
      panel_count,
      panels_per_string,
      parallel_strings,
      installed_wp,
      notes
    )
    VALUES (
      @array_id,
      @surface_id,
      @name,
      @panel_type_id,
      @panel_count,
      @panels_per_string,
      @parallel_strings,
      @installed_wp,
      @notes
    )
    ON CONFLICT(surface_id) DO UPDATE SET
      name = excluded.name,
      panel_type_id = excluded.panel_type_id,
      panel_count = excluded.panel_count,
      panels_per_string = excluded.panels_per_string,
      parallel_strings = excluded.parallel_strings,
      installed_wp = excluded.installed_wp,
      notes = excluded.notes
  `).run(data);
}

export function deletePvArrayForSurface(db: Database.Database, surface_id: string): void {
  const array = getPvArrayBySurface(db, surface_id);
  if (!array) return;
  db.prepare('DELETE FROM pv_strings WHERE array_id = ?').run(array.array_id);
  db.prepare('DELETE FROM array_to_mppt_mappings WHERE array_id = ?').run(array.array_id);
  db.prepare('DELETE FROM pv_arrays WHERE surface_id = ?').run(surface_id);
}

export function listPvStrings(db: Database.Database): PvString[] {
  return db.prepare('SELECT * FROM pv_strings ORDER BY surface_id, string_index').all() as PvString[];
}

export function deletePvStringsForArray(db: Database.Database, array_id: string): void {
  db.prepare('DELETE FROM pv_strings WHERE array_id = ?').run(array_id);
}

export function upsertPvString(db: Database.Database, data: Omit<PvString, 'id'>): void {
  db.prepare(`
    INSERT INTO pv_strings (
      string_id,
      array_id,
      surface_id,
      string_index,
      panel_type_id,
      panel_count
    )
    VALUES (
      @string_id,
      @array_id,
      @surface_id,
      @string_index,
      @panel_type_id,
      @panel_count
    )
    ON CONFLICT(string_id) DO UPDATE SET
      array_id = excluded.array_id,
      surface_id = excluded.surface_id,
      string_index = excluded.string_index,
      panel_type_id = excluded.panel_type_id,
      panel_count = excluded.panel_count
  `).run(data);
}

export function listArrayToMpptMappings(db: Database.Database): ArrayToMpptMapping[] {
  return db.prepare('SELECT * FROM array_to_mppt_mappings ORDER BY array_id').all() as ArrayToMpptMapping[];
}

export function getArrayToMpptMapping(db: Database.Database, array_id: string): ArrayToMpptMapping | null {
  return (db.prepare('SELECT * FROM array_to_mppt_mappings WHERE array_id = ?').get(array_id) as ArrayToMpptMapping) ?? null;
}

export function upsertArrayToMpptMapping(db: Database.Database, data: Omit<ArrayToMpptMapping, 'id'>): void {
  db.prepare(`
    INSERT INTO array_to_mppt_mappings (mapping_id, array_id, selected_mppt_type_id)
    VALUES (@mapping_id, @array_id, @selected_mppt_type_id)
    ON CONFLICT(array_id) DO UPDATE SET
      selected_mppt_type_id = excluded.selected_mppt_type_id
  `).run(data);
}

export function syncPvTopologyForSurface(db: Database.Database, surface_id: string): void {
  const surface = getSurface(db, surface_id);
  if (!surface) return;

  const assignments = db.prepare('SELECT * FROM surface_panel_assignments WHERE surface_id = ? ORDER BY id').all(surface_id) as SurfacePanelAssignment[];
  const configuration = getSurfaceConfiguration(db, surface_id);
  const primaryAssignment = assignments[0] ?? null;
  const panelCount = assignments.reduce((sum, assignment) => sum + assignment.count, 0);
  const primaryPanelType = primaryAssignment ? getPanelType(db, primaryAssignment.panel_type_id) : null;
  const arrayId = `array-${surface_id}`;
  const panelsPerString = configuration?.panels_per_string ?? (panelCount > 0 ? panelCount : null);
  const parallelStrings = configuration?.parallel_strings ?? (panelCount > 0 ? 1 : null);
  const installedWp = assignments.reduce((sum, assignment) => {
    const panelType = getPanelType(db, assignment.panel_type_id);
    return sum + (panelType ? panelType.wp * assignment.count : 0);
  }, 0);

  upsertPvArray(db, {
    array_id: arrayId,
    surface_id,
    name: surface.name,
    panel_type_id: primaryAssignment?.panel_type_id ?? null,
    panel_count: panelCount,
    panels_per_string: panelsPerString,
    parallel_strings: parallelStrings,
    installed_wp: installedWp,
    notes: panelCount === 0
      ? 'No panel assignment currently present for this surface.'
      : 'Persisted PV array for the current surface panel assignment.',
  });

  deletePvStringsForArray(db, arrayId);
  if (panelCount > 0) {
    const stringCount = Math.max(1, parallelStrings ?? 1);
    const panelsPerStringValue = Math.max(1, panelsPerString ?? panelCount);
    for (let index = 1; index <= stringCount; index += 1) {
      upsertPvString(db, {
        string_id: `string-${surface_id}-${index}`,
        array_id: arrayId,
        surface_id,
        string_index: index,
        panel_type_id: primaryPanelType?.panel_type_id ?? primaryAssignment?.panel_type_id ?? null,
        panel_count: panelsPerStringValue,
      });
    }
  }

  upsertArrayToMpptMapping(db, {
    mapping_id: `array-mppt-${surface_id}`,
    array_id: arrayId,
    selected_mppt_type_id: configuration?.selected_mppt_type_id ?? null,
  });
}

export function syncPvTopology(db: Database.Database): void {
  const surfaces = db.prepare('SELECT surface_id FROM surfaces ORDER BY surface_id').all() as { surface_id: string }[];
  const activeSurfaceIds = new Set(surfaces.map((surface) => surface.surface_id));

  for (const { surface_id } of surfaces) {
    syncPvTopologyForSurface(db, surface_id);
  }

  for (const array of listPvArrays(db)) {
    if (!activeSurfaceIds.has(array.surface_id)) {
      deletePvArrayForSurface(db, array.surface_id);
    }
  }
}

// ── Surface configuration state ──────────────────────────────────────────────

export function listSurfaceConfigurations(db: Database.Database): SurfaceConfiguration[] {
  return db.prepare('SELECT * FROM surface_configurations ORDER BY surface_id').all() as SurfaceConfiguration[];
}

export function getSurfaceConfiguration(db: Database.Database, surface_id: string): SurfaceConfiguration | null {
  return (db.prepare('SELECT * FROM surface_configurations WHERE surface_id = ?').get(surface_id) as SurfaceConfiguration) ?? null;
}

export function upsertSurfaceConfiguration(db: Database.Database, data: Omit<SurfaceConfiguration, 'id'>): void {
  db.prepare(`
    INSERT INTO surface_configurations (surface_id, panels_per_string, parallel_strings, selected_mppt_type_id)
    VALUES (@surface_id, @panels_per_string, @parallel_strings, @selected_mppt_type_id)
    ON CONFLICT(surface_id) DO UPDATE SET
      panels_per_string = excluded.panels_per_string,
      parallel_strings = excluded.parallel_strings,
      selected_mppt_type_id = excluded.selected_mppt_type_id
  `).run(data);
  syncPvTopologyForSurface(db, data.surface_id);
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
      title,
      description,
      image_data_url,
      notes,
      selected_battery_type_id,
      configured_battery_count,
      batteries_per_string,
      parallel_strings
    )
    VALUES (
      @battery_bank_id,
      @title,
      @description,
      @image_data_url,
      @notes,
      @selected_battery_type_id,
      @configured_battery_count,
      @batteries_per_string,
      @parallel_strings
    )
    ON CONFLICT(battery_bank_id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      image_data_url = excluded.image_data_url,
      notes = excluded.notes,
      selected_battery_type_id = excluded.selected_battery_type_id,
      configured_battery_count = excluded.configured_battery_count,
      batteries_per_string = excluded.batteries_per_string,
      parallel_strings = excluded.parallel_strings
  `).run({
    ...data,
    title: data.title ?? null,
    description: data.description ?? null,
    image_data_url: data.image_data_url ?? null,
    notes: data.notes ?? null,
  });
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
    victron_can: data.victron_can ? 1 : 0,
    source: data.source ?? data.url ?? null,
    url: data.url ?? data.source ?? null,
    notes: data.notes ?? null,
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
    victron_can: data.victron_can ? 1 : 0,
    source: data.source ?? data.url ?? null,
    url: data.url ?? data.source ?? null,
    notes: data.notes ?? null,
  });
}

export function deleteBatteryType(db: Database.Database, battery_type_id: string): void {
  db.prepare('DELETE FROM battery_types WHERE battery_type_id = ?').run(battery_type_id);
}

// ── Inverter types ───────────────────────────────────────────────────────────

export function listInverterTypes(db: Database.Database): InverterType[] {
  return db.prepare('SELECT * FROM inverter_types ORDER BY continuous_power_w, peak_power_va').all() as InverterType[];
}

export function getInverterType(db: Database.Database, inverter_id: string): InverterType | null {
  return (db.prepare('SELECT * FROM inverter_types WHERE inverter_id = ?').get(inverter_id) as InverterType) ?? null;
}

export function insertInverterType(db: Database.Database, data: Omit<InverterType, 'id'>): void {
  db.prepare(`
    INSERT INTO inverter_types (
      inverter_id,
      model,
      input_voltage_v,
      output_voltage_v,
      continuous_power_w,
      peak_power_va,
      max_charge_current_a,
      efficiency_pct,
      price,
      notes
    )
    VALUES (
      @inverter_id,
      @model,
      @input_voltage_v,
      @output_voltage_v,
      @continuous_power_w,
      @peak_power_va,
      @max_charge_current_a,
      @efficiency_pct,
      @price,
      @notes
    )
  `).run({
    ...data,
    efficiency_pct: data.efficiency_pct ?? null,
    price: data.price ?? null,
    notes: data.notes ?? null,
  });
}

export function updateInverterType(db: Database.Database, data: Omit<InverterType, 'id'>): void {
  db.prepare(`
    UPDATE inverter_types
    SET model=@model,
        input_voltage_v=@input_voltage_v,
        output_voltage_v=@output_voltage_v,
        continuous_power_w=@continuous_power_w,
        peak_power_va=@peak_power_va,
        max_charge_current_a=@max_charge_current_a,
        efficiency_pct=@efficiency_pct,
        price=@price,
        notes=@notes
    WHERE inverter_id=@inverter_id
  `).run({
    ...data,
    efficiency_pct: data.efficiency_pct ?? null,
    price: data.price ?? null,
    notes: data.notes ?? null,
  });
}

export function deleteInverterType(db: Database.Database, inverter_id: string): void {
  db.prepare('DELETE FROM inverter_types WHERE inverter_id = ?').run(inverter_id);
}

// ── Inverter configuration state ────────────────────────────────────────────

export function listInverterConfigurations(db: Database.Database): InverterConfiguration[] {
  return db.prepare('SELECT * FROM inverter_configurations ORDER BY inverter_configuration_id').all() as InverterConfiguration[];
}

export function getInverterConfiguration(db: Database.Database, inverter_configuration_id: string): InverterConfiguration | null {
  return (db.prepare('SELECT * FROM inverter_configurations WHERE inverter_configuration_id = ?').get(inverter_configuration_id) as InverterConfiguration) ?? null;
}

export function upsertInverterConfiguration(db: Database.Database, data: Omit<InverterConfiguration, 'id'>): void {
  db.prepare(`
    INSERT INTO inverter_configurations (
      inverter_configuration_id,
      selected_inverter_type_id,
      title,
      description,
      image_data_url,
      notes
    )
    VALUES (
      @inverter_configuration_id,
      @selected_inverter_type_id,
      @title,
      @description,
      @image_data_url,
      @notes
    )
    ON CONFLICT(inverter_configuration_id) DO UPDATE SET
      selected_inverter_type_id = excluded.selected_inverter_type_id,
      title = excluded.title,
      description = excluded.description,
      image_data_url = excluded.image_data_url,
      notes = excluded.notes
  `).run({
    ...data,
    title: data.title ?? null,
    description: data.description ?? null,
    image_data_url: data.image_data_url ?? null,
    notes: data.notes ?? null,
  });
}

// ── Project preferences ───────────────────────────────────────────────────────

export function getProjectPreferences(db: Database.Database): ProjectPreferences {
  const rows = db.prepare('SELECT key, value FROM project_preferences').all() as { key: string; value: string }[];
  const preferences: ProjectPreferences = {};
  for (const { key, value } of rows) {
    switch (key) {
      case 'target_battery_voltage':
        preferences.target_battery_voltage = Number(value); break;
      case 'autonomy_days':
        preferences.autonomy_days = Number(value); break;
      case 'daily_consumption_kwh':
        preferences.daily_consumption_kwh = Number(value); break;
      case 'max_cable_length_m':
        preferences.max_cable_length_m = Number(value); break;
      case 'preferred_mppt_type_id':
        preferences.preferred_mppt_type_id = value; break;
      case 'preferred_battery_type_id':
        preferences.preferred_battery_type_id = value; break;
      case 'preferred_inverter_type_id':
        preferences.preferred_inverter_type_id = value; break;
    }
  }
  return preferences;
}

export function setProjectPreference(db: Database.Database, key: string, value: string): void {
  db.prepare('INSERT INTO project_preferences (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(key, value);
}
export const getPreferences = getProjectPreferences;
export const setPref = setProjectPreference;
