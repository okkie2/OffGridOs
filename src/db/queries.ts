import Database from 'better-sqlite3';
import { generateUniqueLocationId } from '../domain/location-id.js';
import type {
  Location,
  Project,
  Surface,
  SurfaceConfiguration,
  PanelType,
  SurfacePanelAssignment,
  PvArray,
  PvString,
  ArrayToMpptMapping,
  MpptType,
  CabinetType,
  BatteryType,
  BatteryBankConfiguration,
  DcBusbar,
  ConversionDevice,
  ProjectConverter,
  InverterType,
  InverterConfiguration,
  Load,
  LoadCircuit,
  ProjectPreferences,
} from '../domain/types.js';

// ── Projects ──────────────────────────────────────────────────────────────────

export function listProjects(db: Database.Database): Project[] {
  return db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as Project[];
}

export function getProject(db: Database.Database, project_id: string): Project | null {
  return (db.prepare('SELECT * FROM projects WHERE project_id = ?').get(project_id) as Project) ?? null;
}

export function createProject(db: Database.Database, project_id: string, title: string): Project {
  db.prepare('INSERT INTO projects (project_id, title, created_at) VALUES (?, ?, datetime(\'now\'))').run(project_id, title);
  return getProject(db, project_id)!;
}

export function updateProject(db: Database.Database, project_id: string, title: string): void {
  db.prepare('UPDATE projects SET title = ? WHERE project_id = ?').run(title, project_id);
}

export function deleteProject(db: Database.Database, project_id: string): void {
  db.prepare('DELETE FROM loads WHERE project_id = ?').run(project_id);
  db.prepare('DELETE FROM load_circuits WHERE project_id = ?').run(project_id);
  db.prepare('DELETE FROM converters WHERE project_id = ?').run(project_id);
  db.prepare('DELETE FROM inverter_configurations WHERE project_id = ?').run(project_id);
  db.prepare('DELETE FROM battery_bank_configurations WHERE project_id = ?').run(project_id);
  db.prepare('DELETE FROM surface_configurations WHERE project_id = ?').run(project_id);
  db.prepare('DELETE FROM array_to_mppt_mappings WHERE project_id = ?').run(project_id);
  db.prepare('DELETE FROM pv_strings WHERE project_id = ?').run(project_id);
  db.prepare('DELETE FROM pv_arrays WHERE project_id = ?').run(project_id);
  db.prepare('DELETE FROM surface_panel_assignments WHERE project_id = ?').run(project_id);
  db.prepare('DELETE FROM surfaces WHERE project_id = ?').run(project_id);
  db.prepare('DELETE FROM locations WHERE project_id = ?').run(project_id);
  db.prepare('DELETE FROM project_preferences WHERE project_id = ?').run(project_id);
  db.prepare('DELETE FROM projects WHERE project_id = ?').run(project_id);
}

// ── Location ─────────────────────────────────────────────────────────────────

export function listLocations(db: Database.Database, projectId: string): Location[] {
  return db.prepare('SELECT * FROM locations WHERE project_id = ? ORDER BY location_id').all(projectId) as Location[];
}

export function getLocation(db: Database.Database, projectId: string, locationId?: string | null): Location | null {
  if (locationId) {
    return (db.prepare('SELECT * FROM locations WHERE project_id = ? AND location_id = ? LIMIT 1').get(projectId, locationId) as Location) ?? null;
  }

  return (db.prepare('SELECT * FROM locations WHERE project_id = ? ORDER BY location_id LIMIT 1').get(projectId) as Location) ?? null;
}

export function upsertLocation(db: Database.Database, data: Omit<Location, 'project_id' | 'location_id'>, projectId: string, locationId?: string | null): void {
  const existing = getLocation(db, projectId, locationId);
  if (existing) {
    const title = data.title === undefined ? (existing.title ?? null) : data.title;
    const sitePhotoDataUrl = data.site_photo_data_url === undefined
      ? (existing.site_photo_data_url ?? null)
      : data.site_photo_data_url;
    db.prepare('UPDATE locations SET title=@title, country=@country, place_name=@place_name, description=@description, notes=@notes, latitude=@latitude, longitude=@longitude, northing=@northing, easting=@easting, site_photo_data_url=@site_photo_data_url WHERE location_id=@location_id')
      .run({
        ...data,
        title,
        description: data.description ?? null,
        notes: data.notes ?? null,
        site_photo_data_url: sitePhotoDataUrl,
        location_id: existing.location_id,
      });
  } else {
    const existingLocationIds = (db.prepare('SELECT location_id FROM locations').all() as Array<{ location_id: string }>).map((row) => row.location_id);
    const locationId = generateUniqueLocationId(data.place_name || data.title || projectId, existingLocationIds);

    db.prepare('INSERT INTO locations (project_id, location_id, title, country, place_name, description, notes, latitude, longitude, northing, easting, site_photo_data_url) VALUES (@project_id, @location_id, @title, @country, @place_name, @description, @notes, @latitude, @longitude, @northing, @easting, @site_photo_data_url)')
      .run({
        ...data,
        project_id: projectId,
        location_id: locationId,
        title: data.title ?? null,
        description: data.description ?? null,
        notes: data.notes ?? null,
        site_photo_data_url: data.site_photo_data_url ?? null,
      });
  }
}

export function createLocation(db: Database.Database, data: Omit<Location, 'project_id' | 'location_id'>, projectId: string): void {
  const existingLocationIds = (db.prepare('SELECT location_id FROM locations').all() as Array<{ location_id: string }>).map((row) => row.location_id);
  const locationId = generateUniqueLocationId(data.place_name || data.title || projectId, existingLocationIds);

  db.prepare('INSERT INTO locations (project_id, location_id, title, country, place_name, description, notes, latitude, longitude, northing, easting, site_photo_data_url) VALUES (@project_id, @location_id, @title, @country, @place_name, @description, @notes, @latitude, @longitude, @northing, @easting, @site_photo_data_url)')
    .run({
      ...data,
      project_id: projectId,
      location_id: locationId,
      title: data.title ?? null,
      description: data.description ?? null,
      notes: data.notes ?? null,
      site_photo_data_url: data.site_photo_data_url ?? null,
    });
}

// ── Surfaces ──────────────────────────────────────────────────────────────────

export function listSurfaces(db: Database.Database, projectId: string, locationId?: string | null): Surface[] {
  if (!locationId) {
  return db.prepare('SELECT * FROM surfaces WHERE project_id = ? ORDER BY sort_order, id').all(projectId) as Surface[];
  }
  const location = getLocation(db, projectId, locationId);
  if (!location) {
    return [];
  }
  return db.prepare('SELECT * FROM surfaces WHERE project_id = ? AND location_id = ? ORDER BY sort_order, id').all(projectId, location.location_id) as Surface[];
}

export function getSurface(db: Database.Database, surface_id: string): Surface | null {
  return (db.prepare('SELECT * FROM surfaces WHERE surface_id = ?').get(surface_id) as Surface) ?? null;
}

function getSurfaceLocationId(db: Database.Database, surface_id: string): string | null {
  const row = db.prepare('SELECT location_id FROM surfaces WHERE surface_id = ?').get(surface_id) as { location_id?: string | null } | undefined;
  return row?.location_id ?? null;
}

function getSurfaceProjectId(db: Database.Database, surface_id: string): string | null {
  const row = db.prepare('SELECT project_id FROM surfaces WHERE surface_id = ?').get(surface_id) as { project_id?: string | null } | undefined;
  return row?.project_id ?? null;
}

function getArrayLocationId(db: Database.Database, array_id: string): string | null {
  const row = db.prepare(`
    SELECT s.location_id
    FROM pv_arrays pa
    JOIN surfaces s ON s.surface_id = pa.surface_id
    WHERE pa.array_id = ?
  `).get(array_id) as { location_id?: string | null } | undefined;
  return row?.location_id ?? null;
}

function getArrayProjectId(db: Database.Database, array_id: string): string | null {
  const row = db.prepare(`
    SELECT s.project_id
    FROM pv_arrays pa
    JOIN surfaces s ON s.surface_id = pa.surface_id
    WHERE pa.array_id = ?
  `).get(array_id) as { project_id?: string | null } | undefined;
  return row?.project_id ?? null;
}

export function insertSurface(db: Database.Database, data: Omit<Surface, 'id' | 'project_id' | 'location_id'>, projectId: string, locationId?: string | null): void {
  const location = getLocation(db, projectId, locationId);
  if (!location) {
    throw new Error(`No location found for project "${projectId}".`);
  }

  db.prepare(`
    INSERT INTO surfaces (project_id, location_id, surface_id, name, description, sort_order, orientation_deg, tilt_deg, usable_area_m2, area_height_m, area_width_m, notes, photo_data_url)
    VALUES (@project_id, @location_id, @surface_id, @name, @description, @sort_order, @orientation_deg, @tilt_deg, @usable_area_m2, @area_height_m, @area_width_m, @notes, @photo_data_url)
  `).run({
    ...data,
    project_id: projectId,
    location_id: location.location_id,
    description: data.description ?? null,
    area_height_m: data.area_height_m ?? null,
    area_width_m: data.area_width_m ?? null,
    photo_data_url: data.photo_data_url ?? null,
  });
}

export function createSurface(db: Database.Database, data: Omit<Surface, 'id' | 'project_id' | 'location_id'>, projectId: string, locationId?: string | null): void {
  const nextSortOrderRow = db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort_order FROM surfaces WHERE project_id = ?').get(projectId) as { next_sort_order: number } | undefined;
  insertSurface(db, {
    ...data,
    sort_order: data.sort_order ?? (nextSortOrderRow?.next_sort_order ?? 1),
  }, projectId, locationId);
  syncPvTopologyForSurface(db, data.surface_id);
}

export function updateSurface(db: Database.Database, data: Omit<Surface, 'id' | 'project_id' | 'location_id'>): void {
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
    INSERT INTO panel_types (panel_type_id, brand, model, wp, voc, vmp, isc, imp, length_mm, width_mm, temp_coefficient_voc_pct_per_c, price, price_source_url, last_upsert_date, notes)
    VALUES (@panel_type_id, @brand, @model, @wp, @voc, @vmp, @isc, @imp, @length_mm, @width_mm, @temp_coefficient_voc_pct_per_c, @price, @price_source_url, @last_upsert_date, @notes)
  `).run({
    ...data,
    last_upsert_date: new Date().toISOString(),
  });
}

export function updatePanelType(db: Database.Database, data: Omit<PanelType, 'id'>): void {
  db.prepare(`
    UPDATE panel_types
    SET brand=@brand, model=@model, wp=@wp, voc=@voc, vmp=@vmp, isc=@isc, imp=@imp,
        length_mm=@length_mm, width_mm=@width_mm, temp_coefficient_voc_pct_per_c=@temp_coefficient_voc_pct_per_c,
        price=@price, price_source_url=@price_source_url, last_upsert_date=@last_upsert_date, notes=@notes
    WHERE panel_type_id=@panel_type_id
  `).run({
    ...data,
    last_upsert_date: new Date().toISOString(),
  });
}

export function deletePanelType(db: Database.Database, panel_type_id: string): void {
  db.prepare('DELETE FROM surface_panel_assignments WHERE panel_type_id = ?').run(panel_type_id);
  db.prepare('DELETE FROM panel_types WHERE panel_type_id = ?').run(panel_type_id);
}

// ── Cabinet types ────────────────────────────────────────────────────────────

export function listCabinetTypes(db: Database.Database): CabinetType[] {
  return db.prepare('SELECT * FROM cabinet_types ORDER BY title').all() as CabinetType[];
}

export function getCabinetType(db: Database.Database, cabinet_type_id: string): CabinetType | null {
  return (db.prepare('SELECT * FROM cabinet_types WHERE cabinet_type_id = ?').get(cabinet_type_id) as CabinetType) ?? null;
}

export function insertCabinetType(db: Database.Database, data: Omit<CabinetType, 'id'>): void {
  db.prepare(`
    INSERT INTO cabinet_types (
      cabinet_type_id,
      title,
      description,
      depth_mm,
      width_mm,
      height_mm,
      units,
      price,
      price_source_url,
      condensation_protection,
      insect_protection,
      dust_protection,
      outside_protection,
      frost_protection,
      fire_protection,
      ip_rating,
      insurance_rating
    )
    VALUES (
      @cabinet_type_id,
      @title,
      @description,
      @depth_mm,
      @width_mm,
      @height_mm,
      @units,
      @price,
      @price_source_url,
      @condensation_protection,
      @insect_protection,
      @dust_protection,
      @outside_protection,
      @frost_protection,
      @fire_protection,
      @ip_rating,
      @insurance_rating
    )
  `).run({
    ...data,
    description: data.description ?? null,
    price: data.price ?? null,
    price_source_url: data.price_source_url ?? null,
    condensation_protection: data.condensation_protection ? 1 : 0,
    insect_protection: data.insect_protection ? 1 : 0,
    dust_protection: data.dust_protection ? 1 : 0,
    outside_protection: data.outside_protection ? 1 : 0,
    frost_protection: data.frost_protection ? 1 : 0,
    fire_protection: data.fire_protection ? 1 : 0,
    ip_rating: data.ip_rating ?? null,
    insurance_rating: data.insurance_rating ?? null,
    units: data.units ?? null,
  });
}

export function updateCabinetType(db: Database.Database, data: Omit<CabinetType, 'id'>): void {
  db.prepare(`
    UPDATE cabinet_types
    SET title=@title,
        description=@description,
        depth_mm=@depth_mm,
        width_mm=@width_mm,
        height_mm=@height_mm,
        units=@units,
        price=@price,
        price_source_url=@price_source_url,
        condensation_protection=@condensation_protection,
        insect_protection=@insect_protection,
        dust_protection=@dust_protection,
        outside_protection=@outside_protection,
        frost_protection=@frost_protection,
        fire_protection=@fire_protection,
        ip_rating=@ip_rating,
        insurance_rating=@insurance_rating
    WHERE cabinet_type_id=@cabinet_type_id
  `).run({
    ...data,
    description: data.description ?? null,
    price: data.price ?? null,
    price_source_url: data.price_source_url ?? null,
    condensation_protection: data.condensation_protection ? 1 : 0,
    insect_protection: data.insect_protection ? 1 : 0,
    dust_protection: data.dust_protection ? 1 : 0,
    outside_protection: data.outside_protection ? 1 : 0,
    frost_protection: data.frost_protection ? 1 : 0,
    fire_protection: data.fire_protection ? 1 : 0,
    ip_rating: data.ip_rating ?? null,
    insurance_rating: data.insurance_rating ?? null,
    units: data.units ?? null,
  });
}

export function deleteCabinetType(db: Database.Database, cabinet_type_id: string): void {
  db.prepare('DELETE FROM cabinet_types WHERE cabinet_type_id = ?').run(cabinet_type_id);
}

// ── Surface panel assignments ─────────────────────────────────────────────────

export function listSurfacePanelAssignments(db: Database.Database): SurfacePanelAssignment[] {
  return db.prepare('SELECT * FROM surface_panel_assignments ORDER BY location_id, surface_id, panel_type_id').all() as SurfacePanelAssignment[];
}

export function getSurfacePanelAssignment(db: Database.Database, surface_id: string, panel_type_id: string): SurfacePanelAssignment | null {
  return (db.prepare('SELECT * FROM surface_panel_assignments WHERE surface_id=? AND panel_type_id=?').get(surface_id, panel_type_id) as SurfacePanelAssignment) ?? null;
}

export function upsertSurfacePanelAssignment(
  db: Database.Database,
  data: Omit<SurfacePanelAssignment, 'id' | 'project_id' | 'location_id'> & { project_id?: string | null; location_id?: string | null },
): void {
  const projectId = data.project_id ?? getSurfaceProjectId(db, data.surface_id);
  const locationId = data.location_id ?? getSurfaceLocationId(db, data.surface_id);
  const existing = getSurfacePanelAssignment(db, data.surface_id, data.panel_type_id);
  if (existing) {
    db.prepare('UPDATE surface_panel_assignments SET count=?, project_id=?, location_id=? WHERE surface_id=? AND panel_type_id=?')
      .run(data.count, projectId, locationId, data.surface_id, data.panel_type_id);
  } else {
    db.prepare('INSERT INTO surface_panel_assignments (project_id, location_id, surface_id, panel_type_id, count) VALUES (?,?,?,?,?)')
      .run(projectId, locationId, data.surface_id, data.panel_type_id, data.count);
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

export function listPvArrays(db: Database.Database, projectId: string, locationId?: string | null): PvArray[] {
  if (!locationId) {
    return db.prepare(`
      SELECT pa.* FROM pv_arrays pa
      WHERE pa.project_id = ?
      ORDER BY pa.location_id, pa.surface_id
    `).all(projectId) as PvArray[];
  }
  return db.prepare(`
    SELECT pa.* FROM pv_arrays pa
    WHERE pa.project_id = ? AND pa.location_id = ?
    ORDER BY pa.surface_id
  `).all(projectId, locationId) as PvArray[];
}

export function getPvArrayBySurface(db: Database.Database, surface_id: string): PvArray | null {
  return (db.prepare('SELECT * FROM pv_arrays WHERE surface_id = ?').get(surface_id) as PvArray) ?? null;
}

export function upsertPvArray(
  db: Database.Database,
  data: Omit<PvArray, 'id' | 'project_id' | 'location_id'> & { project_id?: string | null; location_id?: string | null },
): void {
  const projectId = data.project_id ?? getSurfaceProjectId(db, data.surface_id);
  const locationId = data.location_id ?? getSurfaceLocationId(db, data.surface_id);
  db.prepare(`
    INSERT INTO pv_arrays (
      project_id,
      array_id,
      surface_id,
      location_id,
      name,
      panel_type_id,
      panel_count,
      panels_per_string,
      parallel_strings,
      installed_wp,
      notes
    )
    VALUES (
      @project_id,
      @array_id,
      @surface_id,
      @location_id,
      @name,
      @panel_type_id,
      @panel_count,
      @panels_per_string,
      @parallel_strings,
      @installed_wp,
      @notes
    )
    ON CONFLICT(surface_id) DO UPDATE SET
      project_id = excluded.project_id,
      location_id = excluded.location_id,
      name = excluded.name,
      panel_type_id = excluded.panel_type_id,
      panel_count = excluded.panel_count,
      panels_per_string = excluded.panels_per_string,
      parallel_strings = excluded.parallel_strings,
      installed_wp = excluded.installed_wp,
      notes = excluded.notes
  `).run({
    ...data,
    project_id: projectId,
    location_id: locationId,
  });
}

export function deletePvArrayForSurface(db: Database.Database, surface_id: string): void {
  const array = getPvArrayBySurface(db, surface_id);
  if (!array) return;
  db.prepare('DELETE FROM pv_strings WHERE array_id = ?').run(array.array_id);
  db.prepare('DELETE FROM array_to_mppt_mappings WHERE array_id = ?').run(array.array_id);
  db.prepare('DELETE FROM pv_arrays WHERE surface_id = ?').run(surface_id);
}

export function listPvStrings(db: Database.Database, projectId: string, locationId?: string | null): PvString[] {
  if (!locationId) {
    return db.prepare(`
      SELECT ps.* FROM pv_strings ps
      WHERE ps.project_id = ?
      ORDER BY ps.location_id, ps.surface_id, ps.string_index
    `).all(projectId) as PvString[];
  }
  return db.prepare(`
    SELECT ps.* FROM pv_strings ps
    WHERE ps.project_id = ? AND ps.location_id = ?
    ORDER BY ps.surface_id, ps.string_index
  `).all(projectId, locationId) as PvString[];
}

export function deletePvStringsForArray(db: Database.Database, array_id: string): void {
  db.prepare('DELETE FROM pv_strings WHERE array_id = ?').run(array_id);
}

export function upsertPvString(
  db: Database.Database,
  data: Omit<PvString, 'id' | 'project_id' | 'location_id'> & { project_id?: string | null; location_id?: string | null },
): void {
  const projectId = data.project_id ?? getSurfaceProjectId(db, data.surface_id);
  const locationId = data.location_id ?? getSurfaceLocationId(db, data.surface_id);
  db.prepare(`
    INSERT INTO pv_strings (
      project_id,
      string_id,
      array_id,
      surface_id,
      location_id,
      string_index,
      panel_type_id,
      panel_count
    )
    VALUES (
      @project_id,
      @string_id,
      @array_id,
      @surface_id,
      @location_id,
      @string_index,
      @panel_type_id,
      @panel_count
    )
    ON CONFLICT(string_id) DO UPDATE SET
      project_id = excluded.project_id,
      array_id = excluded.array_id,
      surface_id = excluded.surface_id,
      location_id = excluded.location_id,
      string_index = excluded.string_index,
      panel_type_id = excluded.panel_type_id,
      panel_count = excluded.panel_count
  `).run({
    ...data,
    project_id: projectId,
    location_id: locationId,
  });
}

export function listArrayToMpptMappings(db: Database.Database, projectId: string, locationId?: string | null): ArrayToMpptMapping[] {
  if (!locationId) {
    return db.prepare(`
      SELECT m.* FROM array_to_mppt_mappings m
      WHERE m.project_id = ?
      ORDER BY m.location_id, m.array_id
    `).all(projectId) as ArrayToMpptMapping[];
  }
  return db.prepare(`
      SELECT m.* FROM array_to_mppt_mappings m
      WHERE m.project_id = ? AND m.location_id = ?
      ORDER BY m.array_id
  `).all(projectId, locationId) as ArrayToMpptMapping[];
}

export function getArrayToMpptMapping(db: Database.Database, array_id: string): ArrayToMpptMapping | null {
  return (db.prepare('SELECT * FROM array_to_mppt_mappings WHERE array_id = ?').get(array_id) as ArrayToMpptMapping) ?? null;
}

export function deleteArrayToMpptMappingsForSurface(db: Database.Database, surface_id: string): void {
  db.prepare('DELETE FROM array_to_mppt_mappings WHERE mapping_id = ? OR array_id = ?').run(`array-mppt-${surface_id}`, `array-${surface_id}`);
}

export function upsertArrayToMpptMapping(
  db: Database.Database,
  data: Omit<ArrayToMpptMapping, 'id' | 'project_id' | 'location_id'> & { project_id?: string | null; location_id?: string | null },
): void {
  try {
    const projectId = data.project_id ?? getArrayProjectId(db, data.array_id);
    const locationId = data.location_id ?? getArrayLocationId(db, data.array_id);
    db.prepare(`
      INSERT INTO array_to_mppt_mappings (project_id, mapping_id, array_id, location_id, selected_mppt_type_id)
      VALUES (@project_id, @mapping_id, @array_id, @location_id, @selected_mppt_type_id)
      ON CONFLICT(array_id) DO UPDATE SET
        project_id = excluded.project_id,
        location_id = excluded.location_id,
        selected_mppt_type_id = excluded.selected_mppt_type_id
    `).run({
      ...data,
      project_id: projectId,
      location_id: locationId,
    });
  } catch (error) {
    const arrayExists = db.prepare('SELECT array_id, surface_id FROM pv_arrays WHERE array_id = ?').get(data.array_id) as
      | { array_id: string; surface_id: string }
      | undefined;
    const mpptExists = data.selected_mppt_type_id == null
      ? null
      : (db.prepare('SELECT mppt_type_id FROM mppt_types WHERE mppt_type_id = ?').get(data.selected_mppt_type_id) as { mppt_type_id: string } | undefined);
    const existingMapping = db.prepare('SELECT mapping_id, array_id, selected_mppt_type_id FROM array_to_mppt_mappings WHERE mapping_id = ?')
      .get(data.mapping_id) as { mapping_id: string; array_id: string; selected_mppt_type_id?: string | null } | undefined;
    const foreignKeyViolations = db.prepare('PRAGMA foreign_key_check').all() as Array<{
      table: string;
      rowid: number;
      parent: string;
      fkid: number;
    }>;

    console.error('[db] upsertArrayToMpptMapping failed', {
      data,
      arrayExists: arrayExists ?? null,
      mpptExists: mpptExists ?? null,
      existingMapping: existingMapping ?? null,
      foreignKeyViolations: foreignKeyViolations.slice(0, 20),
      error: error instanceof Error ? { name: error.name, message: error.message } : error,
    });
    throw error;
  }
}

function resolveValidSelectedMpptTypeId(db: Database.Database, selectedMpptTypeId?: string | null): string | null {
  if (!selectedMpptTypeId) {
    return null;
  }

  return getMpptType(db, selectedMpptTypeId)?.mppt_type_id ?? null;
}

export function syncPvTopologyForSurface(db: Database.Database, surface_id: string): void {
  const surface = getSurface(db, surface_id);
  if (!surface) return;

  const assignments = db.prepare('SELECT * FROM surface_panel_assignments WHERE surface_id = ? ORDER BY id').all(surface_id) as SurfacePanelAssignment[];
  const configuration = getSurfaceConfiguration(db, surface_id);
  const selectedMpptTypeId = resolveValidSelectedMpptTypeId(db, configuration?.selected_mppt_type_id ?? null);
  if (configuration && configuration.selected_mppt_type_id !== selectedMpptTypeId) {
    db.prepare('UPDATE surface_configurations SET selected_mppt_type_id = ? WHERE surface_id = ?').run(selectedMpptTypeId, surface_id);
  }
  const primaryAssignment = assignments[0] ?? null;
  const panelCount = assignments.reduce((sum, assignment) => sum + assignment.count, 0);
  const primaryPanelType = primaryAssignment ? getPanelType(db, primaryAssignment.panel_type_id) : null;
  const arrayId = `array-${surface_id}`;
  const existingArray = getPvArrayBySurface(db, surface_id);
  if (existingArray && existingArray.array_id !== arrayId) {
    db.prepare('DELETE FROM pv_strings WHERE array_id = ?').run(existingArray.array_id);
    db.prepare('DELETE FROM array_to_mppt_mappings WHERE array_id = ?').run(existingArray.array_id);
    db.prepare('UPDATE pv_arrays SET array_id = ? WHERE surface_id = ?').run(arrayId, surface_id);
  }
  const panelsPerString = configuration?.panels_per_string ?? (panelCount > 0 ? panelCount : null);
  const parallelStrings = configuration?.parallel_strings ?? (panelCount > 0 ? 1 : null);
  const installedWp = assignments.reduce((sum, assignment) => {
    const panelType = getPanelType(db, assignment.panel_type_id);
    return sum + (panelType ? panelType.wp * assignment.count : 0);
  }, 0);

  upsertPvArray(db, {
    array_id: arrayId,
    surface_id,
    location_id: surface.location_id,
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
        location_id: surface.location_id,
        string_index: index,
        panel_type_id: primaryPanelType?.panel_type_id ?? primaryAssignment?.panel_type_id ?? null,
        panel_count: panelsPerStringValue,
      });
    }
  }

  deleteArrayToMpptMappingsForSurface(db, surface_id);
  upsertArrayToMpptMapping(db, {
    mapping_id: `array-mppt-${surface_id}`,
    array_id: arrayId,
    location_id: surface.location_id,
    selected_mppt_type_id: selectedMpptTypeId,
  });
}

export function syncPvTopology(db: Database.Database): void {
  const surfaces = db.prepare('SELECT surface_id FROM surfaces ORDER BY surface_id').all() as { surface_id: string }[];

  // These tables are derived from surfaces, panel assignments, and surface configurations.
  // Rebuilding them from scratch makes startup resilient to legacy or partially-corrupted rows.
  db.prepare('DELETE FROM array_to_mppt_mappings').run();
  db.prepare('DELETE FROM pv_strings').run();
  db.prepare('DELETE FROM pv_arrays').run();

  for (const { surface_id } of surfaces) {
    syncPvTopologyForSurface(db, surface_id);
  }
}

// ── Surface configuration state ──────────────────────────────────────────────

export function listSurfaceConfigurations(db: Database.Database, projectId: string, locationId?: string | null): SurfaceConfiguration[] {
  if (!locationId) {
    return db.prepare(`
      SELECT sc.* FROM surface_configurations sc
      WHERE sc.project_id = ?
      ORDER BY sc.location_id, sc.surface_id
    `).all(projectId) as SurfaceConfiguration[];
  }
  return db.prepare(`
    SELECT sc.* FROM surface_configurations sc
    WHERE sc.project_id = ? AND sc.location_id = ?
    ORDER BY sc.surface_id
  `).all(projectId, locationId) as SurfaceConfiguration[];
}

export function getSurfaceConfiguration(db: Database.Database, surface_id: string): SurfaceConfiguration | null {
  return (db.prepare('SELECT * FROM surface_configurations WHERE surface_id = ?').get(surface_id) as SurfaceConfiguration) ?? null;
}

export function upsertSurfaceConfiguration(
  db: Database.Database,
  data: Omit<SurfaceConfiguration, 'id' | 'project_id' | 'location_id'> & { project_id?: string | null; location_id?: string | null },
): void {
  const projectId = data.project_id ?? getSurfaceProjectId(db, data.surface_id);
  const locationId = data.location_id ?? getSurfaceLocationId(db, data.surface_id);
  db.prepare(`
    INSERT INTO surface_configurations (project_id, surface_id, location_id, panels_per_string, parallel_strings, selected_mppt_type_id)
    VALUES (@project_id, @surface_id, @location_id, @panels_per_string, @parallel_strings, @selected_mppt_type_id)
    ON CONFLICT(surface_id) DO UPDATE SET
      project_id = excluded.project_id,
      location_id = excluded.location_id,
      panels_per_string = excluded.panels_per_string,
      parallel_strings = excluded.parallel_strings,
      selected_mppt_type_id = excluded.selected_mppt_type_id
  `).run({
    ...data,
    project_id: projectId,
    location_id: locationId,
  });
  syncPvTopologyForSurface(db, data.surface_id);
}

// ── Battery-bank configuration state ─────────────────────────────────────────

export function listBatteryBankConfigurations(db: Database.Database, projectId: string, locationId?: string | null): BatteryBankConfiguration[] {
  if (!locationId) {
    return db.prepare('SELECT * FROM battery_bank_configurations WHERE project_id = ? ORDER BY battery_bank_id').all(projectId) as BatteryBankConfiguration[];
  }
  const location = getLocation(db, projectId, locationId);
  if (!location) return [];
  return db.prepare('SELECT * FROM battery_bank_configurations WHERE project_id = ? AND location_id = ? ORDER BY battery_bank_id').all(projectId, location.location_id) as BatteryBankConfiguration[];
}

export function getBatteryBankConfiguration(db: Database.Database, battery_bank_id: string): BatteryBankConfiguration | null {
  return (db.prepare('SELECT * FROM battery_bank_configurations WHERE battery_bank_id = ?').get(battery_bank_id) as BatteryBankConfiguration) ?? null;
}

export function upsertBatteryBankConfiguration(db: Database.Database, data: Omit<BatteryBankConfiguration, 'id' | 'project_id' | 'location_id'>, projectId: string, locationId?: string | null): void {
  const location = getLocation(db, projectId, locationId);
  if (!location) {
    throw new Error(`No location found for project "${projectId}".`);
  }
  const batteryBankId = data.battery_bank_id || `battery-bank-${location.location_id}`;
  const existing = db.prepare('SELECT * FROM battery_bank_configurations WHERE project_id = ? AND location_id = ? LIMIT 1').get(projectId, location.location_id) as BatteryBankConfiguration | undefined;
  db.prepare(`
    INSERT INTO battery_bank_configurations (
      project_id,
      location_id,
      battery_bank_id,
      title,
      description,
      image_data_url,
      notes,
      selected_battery_type_id,
      selected_cabinet_type_id,
      selected_dc_busbar_id,
      configured_battery_count,
      batteries_per_string,
      parallel_strings
    )
    VALUES (
      @project_id,
      @location_id,
      @battery_bank_id,
      @title,
      @description,
      @image_data_url,
      @notes,
      @selected_battery_type_id,
      @selected_cabinet_type_id,
      @selected_dc_busbar_id,
      @configured_battery_count,
      @batteries_per_string,
      @parallel_strings
    )
    ON CONFLICT(battery_bank_id) DO UPDATE SET
      location_id = excluded.location_id,
      title = excluded.title,
      description = excluded.description,
      image_data_url = excluded.image_data_url,
      notes = excluded.notes,
      selected_battery_type_id = excluded.selected_battery_type_id,
      selected_cabinet_type_id = excluded.selected_cabinet_type_id,
      selected_dc_busbar_id = excluded.selected_dc_busbar_id,
      configured_battery_count = excluded.configured_battery_count,
      batteries_per_string = excluded.batteries_per_string,
      parallel_strings = excluded.parallel_strings
  `).run({
    ...data,
    project_id: projectId,
    location_id: location.location_id,
    battery_bank_id: existing?.battery_bank_id ?? batteryBankId,
    title: data.title ?? null,
    description: data.description ?? null,
    image_data_url: data.image_data_url ?? null,
    notes: data.notes ?? null,
    selected_cabinet_type_id: data.selected_cabinet_type_id ?? null,
    selected_dc_busbar_id: data.selected_dc_busbar_id ?? null,
  });
}

// ── DC busbars ──────────────────────────────────────────────────────────────

export function listDcBusbars(db: Database.Database): DcBusbar[] {
  return db.prepare('SELECT * FROM dc_busbars ORDER BY title, dc_busbar_id').all() as DcBusbar[];
}

export function getDcBusbar(db: Database.Database, dc_busbar_id: string): DcBusbar | null {
  return (db.prepare('SELECT * FROM dc_busbars WHERE dc_busbar_id = ?').get(dc_busbar_id) as DcBusbar) ?? null;
}

export function upsertDcBusbar(db: Database.Database, data: Omit<DcBusbar, 'id'>): void {
  db.prepare(`
    INSERT INTO dc_busbars (
      dc_busbar_id,
      title,
      description
    )
    VALUES (
      @dc_busbar_id,
      @title,
      @description
    )
    ON CONFLICT(dc_busbar_id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description
  `).run({
    ...data,
    description: data.description ?? null,
  });
}

export function deleteDcBusbar(db: Database.Database, dc_busbar_id: string): void {
  db.prepare('DELETE FROM dc_busbars WHERE dc_busbar_id = ?').run(dc_busbar_id);
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
      brand,
      model,
      tracker_count,
      max_voc,
      max_pv_power,
      max_pv_input_current_a,
      max_pv_short_circuit_current_a,
      max_charge_current,
      nominal_battery_voltage,
      price,
      price_source_url,
      notes
    )
    VALUES (
      @mppt_type_id,
      @brand,
      @model,
      @tracker_count,
      @max_voc,
      @max_pv_power,
      @max_pv_input_current_a,
      @max_pv_short_circuit_current_a,
      @max_charge_current,
      @nominal_battery_voltage,
      @price,
      @price_source_url,
      @notes
    )
  `).run(data);
}

export function updateMpptType(db: Database.Database, data: Omit<MpptType, 'id'>): void {
  db.prepare(`
    UPDATE mppt_types
    SET brand=@brand, model=@model,
        tracker_count=@tracker_count,
        max_voc=@max_voc,
        max_pv_power=@max_pv_power,
        max_pv_input_current_a=@max_pv_input_current_a,
        max_pv_short_circuit_current_a=@max_pv_short_circuit_current_a,
        max_charge_current=@max_charge_current,
        nominal_battery_voltage=@nominal_battery_voltage,
        price=@price,
        price_source_url=@price_source_url,
        notes=@notes
    WHERE mppt_type_id=@mppt_type_id
  `).run(data);
}

export function deleteMpptType(db: Database.Database, mppt_type_id: string): void {
  db.prepare('DELETE FROM mppt_types WHERE mppt_type_id = ?').run(mppt_type_id);
}

// ── Battery types ─────────────────────────────────────────────────────────────

export function listBatteryTypes(db: Database.Database): BatteryType[] {
  return db.prepare(`
    SELECT
      *,
      COALESCE(price_source_url, source, url) AS price_source_url
    FROM battery_types
    ORDER BY battery_type_id
  `).all() as BatteryType[];
}

export function getBatteryType(db: Database.Database, battery_type_id: string): BatteryType | null {
  return (db.prepare(`
    SELECT
      *,
      COALESCE(price_source_url, source, url) AS price_source_url
    FROM battery_types
    WHERE battery_type_id = ?
  `).get(battery_type_id) as BatteryType) ?? null;
}

export function insertBatteryType(db: Database.Database, data: Omit<BatteryType, 'id'>): void {
  const pricePerKwh = data.price != null && data.capacity_kwh > 0
    ? Math.round((data.price / data.capacity_kwh) * 100) / 100
    : null;
  db.prepare(`
    INSERT INTO battery_types
      (battery_type_id, brand, model, chemistry, nominal_voltage, capacity_ah, capacity_kwh,
       max_charge_rate, max_discharge_rate, victron_can, cooling, price, price_per_kwh, price_source_url, source, url, notes)
    VALUES
      (@battery_type_id, @brand, @model, @chemistry, @nominal_voltage, @capacity_ah, @capacity_kwh,
       @max_charge_rate, @max_discharge_rate, @victron_can, @cooling, @price, @price_per_kwh, @price_source_url, @source, @url, @notes)
  `).run({
    ...data,
    price_per_kwh: pricePerKwh,
    cooling: data.cooling ?? 'passive',
    victron_can: data.victron_can ? 1 : 0,
    price_source_url: data.price_source_url ?? data.source ?? data.url ?? null,
    source: data.source ?? data.price_source_url ?? data.url ?? null,
    url: data.url ?? data.price_source_url ?? data.source ?? null,
    notes: data.notes ?? null,
  });
}

export function updateBatteryType(db: Database.Database, data: Omit<BatteryType, 'id'>): void {
  const pricePerKwh = data.price != null && data.capacity_kwh > 0
    ? Math.round((data.price / data.capacity_kwh) * 100) / 100
    : null;
  db.prepare(`
    UPDATE battery_types
    SET brand=@brand, model=@model, chemistry=@chemistry, nominal_voltage=@nominal_voltage,
        capacity_ah=@capacity_ah, capacity_kwh=@capacity_kwh,
        max_charge_rate=@max_charge_rate, max_discharge_rate=@max_discharge_rate,
        victron_can=@victron_can, cooling=@cooling, price=@price, price_per_kwh=@price_per_kwh, price_source_url=@price_source_url, source=@source, url=@url, notes=@notes
    WHERE battery_type_id=@battery_type_id
  `).run({
    ...data,
    price_per_kwh: pricePerKwh,
    cooling: data.cooling ?? 'passive',
    victron_can: data.victron_can ? 1 : 0,
    price_source_url: data.price_source_url ?? data.source ?? data.url ?? null,
    source: data.source ?? data.price_source_url ?? data.url ?? null,
    url: data.url ?? data.price_source_url ?? data.source ?? null,
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
      brand,
      model,
      input_voltage_v,
      output_voltage_v,
      continuous_power_w,
      peak_power_va,
      max_charge_current_a,
      efficiency_pct,
      price,
      price_source_url,
      notes
    )
    VALUES (
      @inverter_id,
      @brand,
      @model,
      @input_voltage_v,
      @output_voltage_v,
      @continuous_power_w,
      @peak_power_va,
      @max_charge_current_a,
      @efficiency_pct,
      @price,
      @price_source_url,
      @notes
    )
  `).run({
    ...data,
    efficiency_pct: data.efficiency_pct ?? null,
    price: data.price ?? null,
    price_source_url: data.price_source_url ?? null,
    notes: data.notes ?? null,
  });
}

export function updateInverterType(db: Database.Database, data: Omit<InverterType, 'id'>): void {
  db.prepare(`
    UPDATE inverter_types
    SET brand=@brand, model=@model,
        input_voltage_v=@input_voltage_v,
        output_voltage_v=@output_voltage_v,
        continuous_power_w=@continuous_power_w,
        peak_power_va=@peak_power_va,
        max_charge_current_a=@max_charge_current_a,
        efficiency_pct=@efficiency_pct,
        price=@price,
        price_source_url=@price_source_url,
        notes=@notes
    WHERE inverter_id=@inverter_id
  `).run({
    ...data,
    efficiency_pct: data.efficiency_pct ?? null,
    price: data.price ?? null,
    price_source_url: data.price_source_url ?? null,
    notes: data.notes ?? null,
  });
}

export function deleteInverterType(db: Database.Database, inverter_id: string): void {
  db.prepare('DELETE FROM inverter_types WHERE inverter_id = ?').run(inverter_id);
}

// ── Inverter configuration state ────────────────────────────────────────────

export function listInverterConfigurations(db: Database.Database, projectId: string, locationId?: string | null): InverterConfiguration[] {
  if (!locationId) {
    return db.prepare('SELECT * FROM inverter_configurations WHERE project_id = ? ORDER BY inverter_configuration_id').all(projectId) as InverterConfiguration[];
  }
  const location = getLocation(db, projectId, locationId);
  if (!location) {
    return [];
  }
  return db.prepare('SELECT * FROM inverter_configurations WHERE project_id = ? AND location_id = ? ORDER BY inverter_configuration_id').all(projectId, location.location_id) as InverterConfiguration[];
}

export function getInverterConfiguration(db: Database.Database, inverter_configuration_id: string): InverterConfiguration | null {
  return (db.prepare('SELECT * FROM inverter_configurations WHERE inverter_configuration_id = ?').get(inverter_configuration_id) as InverterConfiguration) ?? null;
}

export function upsertInverterConfiguration(db: Database.Database, data: Omit<InverterConfiguration, 'id' | 'project_id' | 'location_id'> & { project_id?: string | null; location_id?: string | null }, projectId: string, locationId?: string | null): void {
  const location = getLocation(db, projectId, locationId);
  if (!location) {
    throw new Error('Location not found.');
  }
  db.prepare(`
    INSERT INTO inverter_configurations (
      project_id,
      location_id,
      inverter_configuration_id,
      selected_inverter_type_id,
      selected_cabinet_type_id,
      selected_dc_busbar_id,
      title,
      description,
      image_data_url,
      notes
    )
    VALUES (
      @project_id,
      @location_id,
      @inverter_configuration_id,
      @selected_inverter_type_id,
      @selected_cabinet_type_id,
      @selected_dc_busbar_id,
      @title,
      @description,
      @image_data_url,
      @notes
    )
    ON CONFLICT(inverter_configuration_id) DO UPDATE SET
      location_id = excluded.location_id,
      selected_inverter_type_id = excluded.selected_inverter_type_id,
      selected_cabinet_type_id = excluded.selected_cabinet_type_id,
      selected_dc_busbar_id = excluded.selected_dc_busbar_id,
      title = excluded.title,
      description = excluded.description,
      image_data_url = excluded.image_data_url,
      notes = excluded.notes
  `).run({
    ...data,
    project_id: projectId,
    location_id: location.location_id,
    selected_cabinet_type_id: data.selected_cabinet_type_id ?? null,
    selected_dc_busbar_id: data.selected_dc_busbar_id ?? null,
    title: data.title ?? null,
    description: data.description ?? null,
    image_data_url: data.image_data_url ?? null,
    notes: data.notes ?? null,
  });
}

// ── Converter types ──────────────────────────────────────────────────────────

export function listConversionDevices(db: Database.Database): ConversionDevice[] {
  return db.prepare('SELECT * FROM converter_types ORDER BY title, converter_type_id').all() as ConversionDevice[];
}

export function getConversionDevice(db: Database.Database, converter_type_id: string): ConversionDevice | null {
  return (db.prepare('SELECT * FROM converter_types WHERE converter_type_id = ?').get(converter_type_id) as ConversionDevice) ?? null;
}

export function upsertConversionDevice(db: Database.Database, data: Omit<ConversionDevice, 'id'>): void {
  db.prepare(`
    INSERT INTO converter_types (
      converter_type_id,
      title,
      description,
      device_type,
      input_voltage_v,
      output_voltage_v,
      continuous_power_w,
      peak_power_va,
      max_charge_current_a,
      efficiency_pct,
      output_ac_voltage_v,
      frequency_hz,
      surge_power_w,
      output_dc_voltage_v,
      max_output_current_a,
      price,
      price_source_url,
      notes
    )
    VALUES (
      @converter_type_id,
      @title,
      @description,
      @device_type,
      @input_voltage_v,
      @output_voltage_v,
      @continuous_power_w,
      @peak_power_va,
      @max_charge_current_a,
      @efficiency_pct,
      @output_ac_voltage_v,
      @frequency_hz,
      @surge_power_w,
      @output_dc_voltage_v,
      @max_output_current_a,
      @price,
      @price_source_url,
      @notes
    )
    ON CONFLICT(converter_type_id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      device_type = excluded.device_type,
      input_voltage_v = excluded.input_voltage_v,
      output_voltage_v = excluded.output_voltage_v,
      continuous_power_w = excluded.continuous_power_w,
      peak_power_va = excluded.peak_power_va,
      max_charge_current_a = excluded.max_charge_current_a,
      efficiency_pct = excluded.efficiency_pct,
      output_ac_voltage_v = excluded.output_ac_voltage_v,
      frequency_hz = excluded.frequency_hz,
      surge_power_w = excluded.surge_power_w,
      output_dc_voltage_v = excluded.output_dc_voltage_v,
      max_output_current_a = excluded.max_output_current_a,
      price = excluded.price,
      price_source_url = excluded.price_source_url,
      notes = excluded.notes
  `).run({
    ...data,
    description: data.description ?? null,
    input_voltage_v: data.input_voltage_v ?? null,
    output_voltage_v: data.output_voltage_v ?? null,
    continuous_power_w: data.continuous_power_w ?? null,
    peak_power_va: data.peak_power_va ?? null,
    max_charge_current_a: data.max_charge_current_a ?? null,
    efficiency_pct: data.efficiency_pct ?? null,
    output_ac_voltage_v: data.output_ac_voltage_v ?? null,
    frequency_hz: data.frequency_hz ?? null,
    surge_power_w: data.surge_power_w ?? null,
    output_dc_voltage_v: data.output_dc_voltage_v ?? null,
    max_output_current_a: data.max_output_current_a ?? null,
    price: data.price ?? null,
    price_source_url: data.price_source_url ?? null,
    notes: data.notes ?? null,
  });
}

export function deleteConversionDevice(db: Database.Database, converter_type_id: string): void {
  const circuits = db.prepare('SELECT load_circuit_id FROM load_circuits WHERE converter_type_id = ?').all(converter_type_id) as Array<{ load_circuit_id: string }>;
  for (const circuit of circuits) {
    deleteLoadCircuit(db, circuit.load_circuit_id);
  }
  db.prepare('DELETE FROM converters WHERE converter_type_id = ?').run(converter_type_id);
  db.prepare('DELETE FROM converter_types WHERE converter_type_id = ?').run(converter_type_id);
}

// ── Converters ──────────────────────────────────────────────────────────────

export function listProjectConverters(db: Database.Database, projectId: string, locationId?: string | null): ProjectConverter[] {
  if (!locationId) {
    return db.prepare('SELECT * FROM converters WHERE project_id = ? ORDER BY title, converter_id').all(projectId) as ProjectConverter[];
  }
  const location = getLocation(db, projectId, locationId);
  if (!location) return [];
  return db.prepare('SELECT * FROM converters WHERE project_id = ? AND location_id = ? ORDER BY title, converter_id').all(projectId, location.location_id) as ProjectConverter[];
}

export function getProjectConverter(db: Database.Database, converter_id: string): ProjectConverter | null {
  return (db.prepare('SELECT * FROM converters WHERE converter_id = ?').get(converter_id) as ProjectConverter) ?? null;
}

export function upsertProjectConverter(db: Database.Database, data: Omit<ProjectConverter, 'id' | 'project_id' | 'location_id'>, projectId: string, locationId?: string | null): void {
  const location = getLocation(db, projectId, locationId);
  if (!location) {
    throw new Error(`No location found for project "${projectId}".`);
  }
  db.prepare(`
    INSERT INTO converters (
      project_id,
      location_id,
      converter_id,
      title,
      description,
      converter_type_id
    )
    VALUES (
      @project_id,
      @location_id,
      @converter_id,
      @title,
      @description,
      @converter_type_id
    )
    ON CONFLICT(converter_id) DO UPDATE SET
      location_id = excluded.location_id,
      title = excluded.title,
      description = excluded.description,
      converter_type_id = excluded.converter_type_id
  `).run({
    ...data,
    project_id: projectId,
    location_id: location.location_id,
    description: data.description ?? null,
  });
}

export function deleteProjectConverter(db: Database.Database, converter_id: string): void {
  const circuits = db.prepare('SELECT load_circuit_id FROM load_circuits WHERE converter_id = ?').all(converter_id) as Array<{ load_circuit_id: string }>;
  for (const circuit of circuits) {
    deleteLoadCircuit(db, circuit.load_circuit_id);
  }
  db.prepare('DELETE FROM converters WHERE converter_id = ?').run(converter_id);
}

// ── Load circuits ────────────────────────────────────────────────────────────

export function listLoadCircuits(db: Database.Database, projectId: string, locationId?: string | null): LoadCircuit[] {
  if (!locationId) {
    return db.prepare('SELECT * FROM load_circuits WHERE project_id = ? ORDER BY title, load_circuit_id').all(projectId) as LoadCircuit[];
  }
  const location = getLocation(db, projectId, locationId);
  if (!location) return [];
  return db.prepare('SELECT * FROM load_circuits WHERE project_id = ? AND location_id = ? ORDER BY title, load_circuit_id').all(projectId, location.location_id) as LoadCircuit[];
}

export function getLoadCircuit(db: Database.Database, load_circuit_id: string): LoadCircuit | null {
  return (db.prepare('SELECT * FROM load_circuits WHERE load_circuit_id = ?').get(load_circuit_id) as LoadCircuit) ?? null;
}

export function upsertLoadCircuit(db: Database.Database, data: Omit<LoadCircuit, 'id' | 'project_id' | 'location_id'>, projectId: string, locationId?: string | null): void {
  const location = getLocation(db, projectId, locationId);
  const fallbackLocationId = location?.location_id ?? 'location-main';
  let resolvedLocationId = fallbackLocationId;
  if (data.converter_id) {
    const projectConverter = db.prepare('SELECT * FROM converters WHERE converter_id = ? AND project_id = ?')
      .get(data.converter_id, projectId) as ProjectConverter | undefined;
    if (!projectConverter) {
      throw new Error(`Converter "${data.converter_id}" not found.`);
    }
    resolvedLocationId = projectConverter.location_id ?? fallbackLocationId;
  }
  db.prepare(`
    INSERT INTO load_circuits (
      project_id,
      location_id,
      load_circuit_id,
      converter_id,
      converter_type_id,
      title,
      description
    )
    VALUES (
      @project_id,
      @location_id,
      @load_circuit_id,
      @converter_id,
      @converter_type_id,
      @title,
      @description
    )
    ON CONFLICT(load_circuit_id) DO UPDATE SET
      location_id = excluded.location_id,
      converter_id = excluded.converter_id,
      converter_type_id = excluded.converter_type_id,
      title = excluded.title,
      description = excluded.description
  `).run({
    ...data,
    project_id: projectId,
    location_id: resolvedLocationId,
    converter_id: data.converter_id ?? null,
    description: data.description ?? null,
  });
}

export function deleteLoadCircuit(db: Database.Database, load_circuit_id: string): void {
  db.prepare('DELETE FROM loads WHERE load_circuit_id = ?').run(load_circuit_id);
  db.prepare('DELETE FROM load_circuits WHERE load_circuit_id = ?').run(load_circuit_id);
}

// ── Loads ────────────────────────────────────────────────────────────────────

export function listLoads(db: Database.Database, projectId: string, locationId?: string | null): Load[] {
  if (!locationId) {
    return db.prepare('SELECT * FROM loads WHERE project_id = ? ORDER BY load_circuit_id, title, load_id').all(projectId) as Load[];
  }
  const location = getLocation(db, projectId, locationId);
  if (!location) return [];
  return db.prepare('SELECT * FROM loads WHERE project_id = ? AND location_id = ? ORDER BY load_circuit_id, title, load_id').all(projectId, location.location_id) as Load[];
}

export function getLoad(db: Database.Database, load_id: string): Load | null {
  return (db.prepare('SELECT * FROM loads WHERE load_id = ?').get(load_id) as Load) ?? null;
}

export function upsertLoad(db: Database.Database, data: Omit<Load, 'id' | 'project_id' | 'location_id'>, projectId: string, locationId?: string | null): void {
  const nominalPowerW = data.nominal_power_w
    ?? ((data.usage_kw ?? 0) * 1000);
  const surgePowerW = data.surge_power_w
    ?? ((data.spike_kw ?? 0) * 1000);
  const standbyPowerW = data.standby_power_w ?? ((data.sleeping_kw ?? 0) * 1000);
  const dailyEnergyKwh = data.daily_energy_kwh ?? (
    data.expected_usage_hours_per_day != null && nominalPowerW != null
      ? (nominalPowerW / 1000) * data.expected_usage_hours_per_day
      : null
  );
  const loadCircuit = getLoadCircuit(db, data.load_circuit_id);
  const resolvedLocationId = loadCircuit?.location_id ?? getLocation(db, projectId, locationId)?.location_id ?? 'location-main';

  db.prepare(`
    INSERT INTO loads (
      project_id,
      location_id,
      load_id,
      load_circuit_id,
      title,
      description,
      nominal_current_a,
      nominal_power_w,
      startup_current_a,
      surge_power_w,
      standby_power_w,
      expected_usage_hours_per_day,
      daily_energy_kwh,
      duty_profile,
      notes,
      usage_kw,
      spike_kw,
      sleeping_kw
    )
    VALUES (
      @project_id,
      @location_id,
      @load_id,
      @load_circuit_id,
      @title,
      @description,
      @nominal_current_a,
      @nominal_power_w,
      @startup_current_a,
      @surge_power_w,
      @standby_power_w,
      @expected_usage_hours_per_day,
      @daily_energy_kwh,
      @duty_profile,
      @notes,
      @usage_kw,
      @spike_kw,
      @sleeping_kw
    )
    ON CONFLICT(load_id) DO UPDATE SET
      location_id = excluded.location_id,
      load_circuit_id = excluded.load_circuit_id,
      title = excluded.title,
      description = excluded.description,
      nominal_current_a = excluded.nominal_current_a,
      nominal_power_w = excluded.nominal_power_w,
      startup_current_a = excluded.startup_current_a,
      surge_power_w = excluded.surge_power_w,
      standby_power_w = excluded.standby_power_w,
      expected_usage_hours_per_day = excluded.expected_usage_hours_per_day,
      daily_energy_kwh = excluded.daily_energy_kwh,
      duty_profile = excluded.duty_profile,
      notes = excluded.notes,
      usage_kw = excluded.usage_kw,
      spike_kw = excluded.spike_kw,
      sleeping_kw = excluded.sleeping_kw
  `).run({
    ...data,
    project_id: projectId,
    location_id: resolvedLocationId,
    description: data.description ?? null,
    nominal_current_a: data.nominal_current_a ?? null,
    nominal_power_w: nominalPowerW,
    startup_current_a: data.startup_current_a ?? null,
    surge_power_w: surgePowerW,
    standby_power_w: standbyPowerW,
    daily_energy_kwh: dailyEnergyKwh,
    duty_profile: data.duty_profile ?? null,
    notes: data.notes ?? null,
    usage_kw: nominalPowerW / 1000,
    spike_kw: surgePowerW / 1000,
    sleeping_kw: standbyPowerW / 1000,
  });
}

export function deleteLoad(db: Database.Database, load_id: string): void {
  db.prepare('DELETE FROM loads WHERE load_id = ?').run(load_id);
}

// ── Project preferences ───────────────────────────────────────────────────────

export function getProjectPreferences(db: Database.Database, projectId: string): ProjectPreferences {
  const rows = db.prepare('SELECT key, value FROM project_preferences WHERE project_id = ?').all(projectId) as { key: string; value: string }[];
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

export function setProjectPreference(db: Database.Database, projectId: string, key: string, value: string): void {
  db.prepare('INSERT INTO project_preferences (project_id, key, value) VALUES (?,?,?) ON CONFLICT(project_id, key) DO UPDATE SET value=excluded.value')
    .run(projectId, key, value);
}
export const getPreferences = getProjectPreferences;
export const setPref = setProjectPreference;
