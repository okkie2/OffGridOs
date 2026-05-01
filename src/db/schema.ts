import Database from 'better-sqlite3';
import { seedMpptTypes, seedBatteryTypes, seedInverterTypes, seedConversionDevices, seedInverterConfigurations, seedLocation, seedPanelTypes, seedSurfaces, seedSurfacePanelAssignments } from './seeds.js';
import { syncPvTopology } from './queries.js';
import { DEFAULT_PROJECT_ID } from '../config/project.js';
import { generateUniqueLocationId } from '../domain/location-id.js';

function hasTable(db: Database.Database, tableName: string): boolean {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName) as { name?: string } | undefined;
  return Boolean(row);
}

function ensureProjectsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      project_id  TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.prepare(`
    INSERT OR IGNORE INTO projects (project_id, title, created_at)
    VALUES (@project_id, '18Mad Boerderij', datetime('now'))
  `).run({ project_id: DEFAULT_PROJECT_ID });
}

function migrateLegacyDefaultProjectId(db: Database.Database): void {
  const legacyProject = db.prepare('SELECT * FROM projects WHERE project_id = ?').get('default-project') as { project_id: string; title: string; created_at: string } | undefined;
  if (!legacyProject) {
    return;
  }

  db.prepare(`
    INSERT INTO projects (project_id, title, created_at)
    VALUES (?, ?, ?)
    ON CONFLICT(project_id) DO UPDATE SET
      title = excluded.title,
      created_at = COALESCE(projects.created_at, excluded.created_at)
  `).run(DEFAULT_PROJECT_ID, legacyProject.title, legacyProject.created_at);

  const scopedTables = [
    'locations',
    'surfaces',
    'surface_panel_assignments',
    'pv_arrays',
    'pv_strings',
    'array_to_mppt_mappings',
    'surface_configurations',
    'battery_bank_configurations',
    'inverter_configurations',
    'project_converters',
    'load_circuits',
    'loads',
    'project_preferences',
  ];

  for (const tableName of scopedTables) {
    const cols = new Set((db.prepare(`PRAGMA table_info('${tableName}')`).all() as { name: string }[]).map((row) => row.name));
    if (!cols.has('project_id')) {
      continue;
    }

    db.prepare(`UPDATE ${tableName} SET project_id = ? WHERE project_id = ?`).run(DEFAULT_PROJECT_ID, 'default-project');
  }

  db.prepare('DELETE FROM projects WHERE project_id = ?').run('default-project');
}

function ensureProjectId(db: Database.Database, tableName: string): void {
  const cols = new Set(
    (db.prepare(`PRAGMA table_info('${tableName}')`).all() as { name: string }[]).map((r) => r.name),
  );
  if (cols.has('project_id')) {
    db.prepare(`UPDATE ${tableName} SET project_id = ? WHERE project_id IS NULL`).run(DEFAULT_PROJECT_ID);
    return;
  }
  // SQLite does not allow a non-NULL default on a REFERENCES column, so we add
  // the column as nullable, backfill, then rely on application-layer enforcement.
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN project_id TEXT REFERENCES projects(project_id);`);
  db.prepare(`UPDATE ${tableName} SET project_id = ? WHERE project_id IS NULL`).run(DEFAULT_PROJECT_ID);
}

function ensureProjectPreferencesMigration(db: Database.Database): void {
  const tableInfo = db.prepare("PRAGMA table_info('project_preferences')").all() as Array<{ name: string; pk: number }>;
  const pkCols = tableInfo.filter((c) => c.pk > 0).map((c) => c.name);
  if (pkCols.length === 2 && pkCols.includes('project_id') && pkCols.includes('key')) return;
  const hasProjectId = tableInfo.some((c) => c.name === 'project_id');
  if (!hasProjectId) {
    db.exec(`ALTER TABLE project_preferences ADD COLUMN project_id TEXT NOT NULL DEFAULT '${DEFAULT_PROJECT_ID}';`);
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_preferences_new (
      project_id  TEXT NOT NULL DEFAULT '${DEFAULT_PROJECT_ID}' REFERENCES projects(project_id),
      key         TEXT NOT NULL,
      value       TEXT NOT NULL,
      PRIMARY KEY (project_id, key)
    );
    INSERT OR IGNORE INTO project_preferences_new (project_id, key, value)
      SELECT COALESCE(project_id, '${DEFAULT_PROJECT_ID}'), key, value FROM project_preferences;
    DROP TABLE project_preferences;
    ALTER TABLE project_preferences_new RENAME TO project_preferences;
  `);
}

function ensureLocationIdentity(db: Database.Database): void {
  const cols = new Set(
    (db.prepare("PRAGMA table_info('locations')").all() as { name: string }[]).map((r) => r.name),
  );
  if (!cols.has('location_id')) {
    db.exec('ALTER TABLE locations ADD COLUMN location_id TEXT;');
  }

  const rows = db.prepare('SELECT id, location_id, title, place_name FROM locations ORDER BY id').all() as Array<{
    id: number;
    location_id: string | null;
    title: string | null;
    place_name: string;
  }>;
  const usedIds = new Set(rows.map((row) => row.location_id).filter((value): value is string => Boolean(value)));
  const updateLocation = db.prepare('UPDATE locations SET location_id = ? WHERE id = ?');

  for (const row of rows) {
    if (row.location_id) {
      continue;
    }

    const label = row.title?.trim() || row.place_name?.trim() || 'location';
    const locationId = generateUniqueLocationId(label, usedIds);
    updateLocation.run(locationId, row.id);
    usedIds.add(locationId);
  }

  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS locations_location_id_idx ON locations(location_id);');
}

function ensureSurfaceLocationId(db: Database.Database): void {
  const cols = new Set(
    (db.prepare("PRAGMA table_info('surfaces')").all() as { name: string }[]).map((r) => r.name),
  );
  if (!cols.has('location_id')) {
    db.exec('ALTER TABLE surfaces ADD COLUMN location_id TEXT;');
  }

  const rows = db.prepare(`
    SELECT s.id, s.location_id, s.surface_id, s.project_id, l.location_id AS inherited_location_id
    FROM surfaces s
    LEFT JOIN locations l ON l.project_id = s.project_id
    ORDER BY s.id
  `).all() as Array<{
    id: number;
    location_id: string | null;
    surface_id: string;
    project_id: string | null;
    inherited_location_id: string | null;
  }>;

  const updateSurface = db.prepare('UPDATE surfaces SET location_id = ? WHERE id = ?');
  for (const row of rows) {
    if (row.location_id) {
      continue;
    }
    const fallbackLocationId = row.inherited_location_id || 'location-main';
    updateSurface.run(fallbackLocationId, row.id);
  }

  db.exec('CREATE INDEX IF NOT EXISTS surfaces_location_id_idx ON surfaces(location_id);');
}

function ensureLoadCircuitsProjectConverterId(db: Database.Database): void {
  const cols = new Set(
    (db.prepare("PRAGMA table_info('load_circuits')").all() as { name: string }[]).map((r) => r.name),
  );
  if (!cols.has('project_converter_id')) {
    db.exec('ALTER TABLE load_circuits ADD COLUMN project_converter_id TEXT REFERENCES project_converters(project_converter_id);');
  }

  db.exec(`
    INSERT OR IGNORE INTO project_converters (
      project_converter_id,
      title,
      description,
      conversion_device_id
    )
    SELECT
      lc.conversion_device_id,
      cd.title,
      cd.description,
      lc.conversion_device_id
    FROM load_circuits lc
    JOIN conversion_devices cd ON cd.conversion_device_id = lc.conversion_device_id
    WHERE lc.project_converter_id IS NULL
    GROUP BY lc.conversion_device_id;
  `);
  db.exec(`
    UPDATE load_circuits
    SET project_converter_id = conversion_device_id
    WHERE project_converter_id IS NULL
      AND conversion_device_id IN (
        SELECT project_converter_id FROM project_converters
      );
  `);
}

function ensureLoadCircuitLocationId(db: Database.Database): void {
  const cols = new Set(
    (db.prepare("PRAGMA table_info('load_circuits')").all() as { name: string }[]).map((r) => r.name),
  );
  if (!cols.has('location_id')) {
    db.exec('ALTER TABLE load_circuits ADD COLUMN location_id TEXT;');
  }

  db.exec(`
    UPDATE load_circuits
    SET location_id = COALESCE(
      location_id,
      (
        SELECT location_id
        FROM locations
        WHERE locations.project_id = load_circuits.project_id
        ORDER BY id
        LIMIT 1
      )
    )
    WHERE location_id IS NULL;
  `);
}

function ensureLoadLocationId(db: Database.Database): void {
  const cols = new Set(
    (db.prepare("PRAGMA table_info('loads')").all() as { name: string }[]).map((r) => r.name),
  );
  if (!cols.has('location_id')) {
    db.exec('ALTER TABLE loads ADD COLUMN location_id TEXT;');
  }

  db.exec(`
    UPDATE loads
    SET location_id = COALESCE(
      location_id,
      (
        SELECT lc.location_id
        FROM load_circuits lc
        WHERE lc.load_circuit_id = loads.load_circuit_id
      )
    )
    WHERE location_id IS NULL;
  `);
}

function ensureLoadColumns(db: Database.Database): void {
  const cols = new Set(
    (db.prepare("PRAGMA table_info('loads')").all() as { name: string }[]).map((r) => r.name),
  );

  const additions = [
    !cols.has('nominal_current_a') ? 'ALTER TABLE loads ADD COLUMN nominal_current_a REAL;' : '',
    !cols.has('nominal_power_w') ? 'ALTER TABLE loads ADD COLUMN nominal_power_w REAL;' : '',
    !cols.has('startup_current_a') ? 'ALTER TABLE loads ADD COLUMN startup_current_a REAL;' : '',
    !cols.has('surge_power_w') ? 'ALTER TABLE loads ADD COLUMN surge_power_w REAL;' : '',
    !cols.has('standby_power_w') ? 'ALTER TABLE loads ADD COLUMN standby_power_w REAL;' : '',
    !cols.has('daily_energy_kwh') ? 'ALTER TABLE loads ADD COLUMN daily_energy_kwh REAL;' : '',
    !cols.has('duty_profile') ? 'ALTER TABLE loads ADD COLUMN duty_profile TEXT;' : '',
    !cols.has('notes') ? 'ALTER TABLE loads ADD COLUMN notes TEXT;' : '',
  ].filter(Boolean);

  if (additions.length > 0) {
    db.exec(additions.join('\n'));
  }

  db.exec(`
    UPDATE loads
    SET nominal_power_w = COALESCE(nominal_power_w, usage_kw * 1000.0),
        surge_power_w = COALESCE(surge_power_w, spike_kw * 1000.0),
        standby_power_w = COALESCE(standby_power_w, sleeping_kw * 1000.0),
        daily_energy_kwh = COALESCE(daily_energy_kwh, (usage_kw * expected_usage_hours_per_day))
    WHERE nominal_power_w IS NULL
      OR surge_power_w IS NULL
      OR standby_power_w IS NULL
      OR daily_energy_kwh IS NULL;
  `);
}

function ensureBatteryTypesColumns(db: Database.Database): void {
  const cols = new Set((db.prepare("PRAGMA table_info('battery_types')").all() as { name: string }[]).map((row) => row.name));
  const additions = [
    !cols.has('brand') ? "ALTER TABLE battery_types ADD COLUMN brand TEXT NOT NULL DEFAULT '';" : '',
    !cols.has('victron_can') ? "ALTER TABLE battery_types ADD COLUMN victron_can INTEGER NOT NULL DEFAULT 0;" : '',
    !cols.has('cooling') ? "ALTER TABLE battery_types ADD COLUMN cooling TEXT NOT NULL DEFAULT 'passive';" : '',
    !cols.has('price') ? 'ALTER TABLE battery_types ADD COLUMN price REAL;' : '',
    !cols.has('price_per_kwh') ? 'ALTER TABLE battery_types ADD COLUMN price_per_kwh REAL;' : '',
    !cols.has('price_source_url') ? 'ALTER TABLE battery_types ADD COLUMN price_source_url TEXT;' : '',
    !cols.has('source') ? 'ALTER TABLE battery_types ADD COLUMN source TEXT;' : '',
    !cols.has('url') ? 'ALTER TABLE battery_types ADD COLUMN url TEXT;' : '',
  ].filter(Boolean);

  if (additions.length > 0) {
    db.exec(additions.join('\n'));
    db.prepare("UPDATE battery_types SET cooling = COALESCE(cooling, 'passive')").run();
    db.prepare("UPDATE battery_types SET brand = COALESCE(brand, '')").run();
  }

  db.prepare(`
    UPDATE battery_types
    SET price_source_url = COALESCE(price_source_url, source, url)
    WHERE price_source_url IS NULL AND (source IS NOT NULL OR url IS NOT NULL)
  `).run();
  db.prepare(`
    UPDATE battery_types
    SET brand = CASE battery_type_id
      WHEN 'pylontech-us5000-1c' THEN 'Pylontech'
      WHEN 'byd-bbox-lv' THEN 'BYD'
      WHEN 'dyness-b4850' THEN 'Dyness'
      WHEN 'pylontech-pelio-l' THEN 'Pylontech'
      WHEN 'mg-lfp-25-6v-230ah-5800wh' THEN 'MG'
      WHEN 'pytes-ebox-48100r' THEN 'Pytes'
      WHEN 'bslbatt-b-lfp48-100e' THEN 'BSLBATT'
      WHEN 'zyc-simpo-5000' THEN 'ZYC'
      WHEN 'rs-series-rs230' THEN 'RS'
      ELSE brand
    END
    WHERE COALESCE(brand, '') = ''
  `).run();
  db.prepare(`
    UPDATE battery_types
    SET model = CASE battery_type_id
      WHEN 'pylontech-us5000-1c' THEN 'US5000-1C'
      WHEN 'byd-bbox-lv' THEN 'B-Box LV (per module)'
      WHEN 'dyness-b4850' THEN 'B4850 (per module)'
      WHEN 'pylontech-pelio-l' THEN 'Pelio-L (per module)'
      WHEN 'mg-lfp-25-6v-230ah-5800wh' THEN 'LFP Battery 25.6V/230Ah/5800Wh'
      WHEN 'pytes-ebox-48100r' THEN 'E-BOX-48100R (per module)'
      WHEN 'bslbatt-b-lfp48-100e' THEN 'B-LFP48-100E'
      WHEN 'zyc-simpo-5000' THEN 'SIMPO 5000 LiFePO4 51.2V/100Ah 5.12kWh'
      WHEN 'rs-series-rs230' THEN 'RS230'
      ELSE model
    END
    WHERE battery_type_id IN (
      'pylontech-us5000-1c',
      'byd-bbox-lv',
      'dyness-b4850',
      'pylontech-pelio-l',
      'mg-lfp-25-6v-230ah-5800wh',
      'pytes-ebox-48100r',
      'bslbatt-b-lfp48-100e',
      'zyc-simpo-5000',
      'rs-series-rs230'
    )
  `).run();
  db.prepare(`
    UPDATE battery_types
    SET notes = CASE battery_type_id
      WHEN 'zyc-simpo-5000' THEN 'ZYC Energy SIMPO 5000 brochure: LiFePO4 module, 51.2 V, 100 Ah, 5.12 kWh usable, 100 A maximum continuous current, CAN/RS485 or self-managed communication, charging to -10 C, discharging to -20 C, hot-swappable, auto-setup, up to 80 units in parallel, and pre-wired cabinets for 6 or 10 batteries.'
      ELSE notes
    END
    WHERE battery_type_id = 'zyc-simpo-5000'
  `).run();
}

function ensureConversionDeviceColumns(db: Database.Database): void {
  const cols = new Set((db.prepare("PRAGMA table_info('conversion_devices')").all() as { name: string }[]).map((row) => row.name));
  const additions = [
    !cols.has('price') ? 'ALTER TABLE conversion_devices ADD COLUMN price REAL;' : '',
    !cols.has('price_source_url') ? 'ALTER TABLE conversion_devices ADD COLUMN price_source_url TEXT;' : '',
    !cols.has('notes') ? 'ALTER TABLE conversion_devices ADD COLUMN notes TEXT;' : '',
  ].filter(Boolean);

  if (additions.length > 0) {
    db.exec(additions.join('\n'));
  }
}

function ensureLocationColumns(db: Database.Database): void {
  const cols = new Set((db.prepare("PRAGMA table_info('locations')").all() as { name: string }[]).map((row) => row.name));
  const additions = [
    !cols.has('title') ? 'ALTER TABLE locations ADD COLUMN title TEXT;' : '',
    !cols.has('description') ? 'ALTER TABLE locations ADD COLUMN description TEXT;' : '',
    !cols.has('notes') ? 'ALTER TABLE locations ADD COLUMN notes TEXT;' : '',
    !cols.has('northing') ? 'ALTER TABLE locations ADD COLUMN northing REAL;' : '',
    !cols.has('easting') ? 'ALTER TABLE locations ADD COLUMN easting REAL;' : '',
    !cols.has('site_photo_data_url') ? 'ALTER TABLE locations ADD COLUMN site_photo_data_url TEXT;' : '',
  ].filter(Boolean);

  if (additions.length > 0) {
    db.exec(additions.join('\n'));
  }
}

function dropLegacyLocationTable(db: Database.Database): void {
  if (!hasTable(db, 'location')) {
    return;
  }

  const legacyCount = (db.prepare("SELECT COUNT(*) AS count FROM location").get() as { count: number } | undefined)?.count ?? 0;
  const currentCount = (db.prepare("SELECT COUNT(*) AS count FROM locations").get() as { count: number } | undefined)?.count ?? 0;

  if (legacyCount > 0 && currentCount === 0) {
    db.exec(`
      INSERT INTO locations (id, location_id, title, country, place_name, description, notes, latitude, longitude, northing, easting, site_photo_data_url)
      SELECT id, printf('legacy-location-%d', id), NULL, country, place_name, NULL, NULL, latitude, longitude, northing, easting, NULL
      FROM location
      ORDER BY id
    `);
  }

  db.exec('DROP TABLE IF EXISTS location;');
}

function ensureSurfaceColumns(db: Database.Database): void {
  const cols = new Set((db.prepare("PRAGMA table_info('surfaces')").all() as { name: string }[]).map((row) => row.name));
  const additions = [
    !cols.has('description') ? 'ALTER TABLE surfaces ADD COLUMN description TEXT;' : '',
    !cols.has('sort_order') ? 'ALTER TABLE surfaces ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;' : '',
    !cols.has('photo_data_url') ? 'ALTER TABLE surfaces ADD COLUMN photo_data_url TEXT;' : '',
    !cols.has('area_height_m') ? 'ALTER TABLE surfaces ADD COLUMN area_height_m REAL;' : '',
    !cols.has('area_width_m') ? 'ALTER TABLE surfaces ADD COLUMN area_width_m REAL;' : '',
  ].filter(Boolean);

  if (additions.length > 0) {
    db.exec(additions.join('\n'));
  }

  db.exec(`
    WITH ordered AS (
      SELECT
        id,
        surface_id,
        CASE surface_id
          WHEN 'dakkapellen' THEN 1
          WHEN 'flat-ne' THEN 2
          WHEN 'ne' THEN 3
          WHEN 'nw' THEN 4
          WHEN 'se' THEN 5
          WHEN 'sw' THEN 6
          ELSE NULL
        END AS base_order
      FROM surfaces
    ),
    unknowns AS (
      SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY id) AS unknown_order
      FROM ordered
      WHERE base_order IS NULL
    ),
    final_order AS (
      SELECT
        ordered.id,
        COALESCE(ordered.base_order, 6 + unknowns.unknown_order) AS sort_order
      FROM ordered
      LEFT JOIN unknowns ON unknowns.id = ordered.id
    )
    UPDATE surfaces
    SET sort_order = (
      SELECT sort_order FROM final_order WHERE final_order.id = surfaces.id
    );
  `);
}

function ensureInverterConfigurationColumns(db: Database.Database): void {
  const cols = new Set((db.prepare("PRAGMA table_info('inverter_configurations')").all() as { name: string }[]).map((row) => row.name));
  const additions = [
    !cols.has('title') ? 'ALTER TABLE inverter_configurations ADD COLUMN title TEXT;' : '',
    !cols.has('description') ? 'ALTER TABLE inverter_configurations ADD COLUMN description TEXT;' : '',
    !cols.has('image_data_url') ? 'ALTER TABLE inverter_configurations ADD COLUMN image_data_url TEXT;' : '',
    !cols.has('notes') ? 'ALTER TABLE inverter_configurations ADD COLUMN notes TEXT;' : '',
    !cols.has('selected_cabinet_type_id') ? 'ALTER TABLE inverter_configurations ADD COLUMN selected_cabinet_type_id TEXT REFERENCES cabinet_types(cabinet_type_id);' : '',
    !cols.has('selected_dc_busbar_id') ? 'ALTER TABLE inverter_configurations ADD COLUMN selected_dc_busbar_id TEXT REFERENCES dc_busbars(dc_busbar_id) ON DELETE SET NULL;' : '',
  ].filter(Boolean);

  if (additions.length > 0) {
    db.exec(additions.join('\n'));
  }
}

function ensureInverterTypesColumns(db: Database.Database): void {
  const cols = new Set((db.prepare("PRAGMA table_info('inverter_types')").all() as { name: string }[]).map((row) => row.name));
  const additions = [
    !cols.has('brand') ? "ALTER TABLE inverter_types ADD COLUMN brand TEXT NOT NULL DEFAULT '';" : '',
    !cols.has('price_source_url') ? 'ALTER TABLE inverter_types ADD COLUMN price_source_url TEXT;' : '',
  ].filter(Boolean);

  if (additions.length > 0) {
    db.exec(additions.join('\n'));
  }
  db.prepare("UPDATE inverter_types SET brand = 'Victron' WHERE COALESCE(brand, '') = ''").run();
}

function ensureBatteryBankConfigurationColumns(db: Database.Database): void {
  const cols = new Set((db.prepare("PRAGMA table_info('battery_bank_configurations')").all() as { name: string }[]).map((row) => row.name));
  const additions = [
    !cols.has('location_id') ? 'ALTER TABLE battery_bank_configurations ADD COLUMN location_id TEXT;' : '',
    !cols.has('title') ? 'ALTER TABLE battery_bank_configurations ADD COLUMN title TEXT;' : '',
    !cols.has('description') ? 'ALTER TABLE battery_bank_configurations ADD COLUMN description TEXT;' : '',
    !cols.has('image_data_url') ? 'ALTER TABLE battery_bank_configurations ADD COLUMN image_data_url TEXT;' : '',
    !cols.has('notes') ? 'ALTER TABLE battery_bank_configurations ADD COLUMN notes TEXT;' : '',
    !cols.has('selected_cabinet_type_id') ? 'ALTER TABLE battery_bank_configurations ADD COLUMN selected_cabinet_type_id TEXT REFERENCES cabinet_types(cabinet_type_id);' : '',
    !cols.has('selected_dc_busbar_id') ? 'ALTER TABLE battery_bank_configurations ADD COLUMN selected_dc_busbar_id TEXT REFERENCES dc_busbars(dc_busbar_id) ON DELETE SET NULL;' : '',
  ].filter(Boolean);

  if (additions.length > 0) {
    db.exec(additions.join('\n'));
  }

  db.exec(`
    UPDATE battery_bank_configurations
    SET location_id = COALESCE(
      location_id,
      (
        SELECT location_id
        FROM locations
        WHERE locations.project_id = battery_bank_configurations.project_id
        ORDER BY id
        LIMIT 1
      )
    )
    WHERE location_id IS NULL;
  `);
}

function ensureDcBusbarColumns(db: Database.Database): void {
  const cols = new Set((db.prepare("PRAGMA table_info('dc_busbars')").all() as { name: string }[]).map((row) => row.name));
  const additions = [
    !cols.has('title') ? "ALTER TABLE dc_busbars ADD COLUMN title TEXT NOT NULL DEFAULT '';" : '',
    !cols.has('description') ? 'ALTER TABLE dc_busbars ADD COLUMN description TEXT;' : '',
  ].filter(Boolean);

  if (additions.length > 0) {
    db.exec(additions.join('\n'));
  }
}

function ensureMpptTypesColumns(db: Database.Database): void {
  const cols = new Set((db.prepare("PRAGMA table_info('mppt_types')").all() as { name: string }[]).map((row) => row.name));
  const additions = [
    !cols.has('brand') ? "ALTER TABLE mppt_types ADD COLUMN brand TEXT NOT NULL DEFAULT '';" : '',
    !cols.has('tracker_count') ? 'ALTER TABLE mppt_types ADD COLUMN tracker_count INTEGER NOT NULL DEFAULT 1;' : '',
    !cols.has('max_pv_input_current_a') ? 'ALTER TABLE mppt_types ADD COLUMN max_pv_input_current_a REAL;' : '',
    !cols.has('max_pv_short_circuit_current_a') ? 'ALTER TABLE mppt_types ADD COLUMN max_pv_short_circuit_current_a REAL;' : '',
    !cols.has('price') ? 'ALTER TABLE mppt_types ADD COLUMN price REAL;' : '',
    !cols.has('price_source_url') ? 'ALTER TABLE mppt_types ADD COLUMN price_source_url TEXT;' : '',
  ].filter(Boolean);

  if (additions.length > 0) {
    db.exec(additions.join('\n'));
    db.prepare("UPDATE mppt_types SET tracker_count = COALESCE(tracker_count, 1)").run();
    db.prepare("UPDATE mppt_types SET brand = COALESCE(brand, '')").run();
  }
  db.prepare("UPDATE mppt_types SET brand = 'Victron' WHERE COALESCE(brand, '') = ''").run();
}

function ensurePanelTypesColumns(db: Database.Database): void {
  const cols = new Set((db.prepare("PRAGMA table_info('panel_types')").all() as { name: string }[]).map((row) => row.name));
  const additions = [
    !cols.has('brand') ? "ALTER TABLE panel_types ADD COLUMN brand TEXT NOT NULL DEFAULT '';" : '',
    !cols.has('price') ? 'ALTER TABLE panel_types ADD COLUMN price REAL;' : '',
    !cols.has('price_source_url') ? 'ALTER TABLE panel_types ADD COLUMN price_source_url TEXT;' : '',
    !cols.has('last_upsert_date') ? 'ALTER TABLE panel_types ADD COLUMN last_upsert_date TEXT;' : '',
    !cols.has('temp_coefficient_voc_pct_per_c') ? 'ALTER TABLE panel_types ADD COLUMN temp_coefficient_voc_pct_per_c REAL;' : '',
  ].filter(Boolean);

  if (additions.length > 0) {
    db.exec(additions.join('\n'));
  }
  db.prepare(`
    UPDATE panel_types
    SET last_upsert_date = COALESCE(last_upsert_date, @now)
  `).run({ now: new Date().toISOString() });
  db.prepare(`
    UPDATE panel_types
    SET brand = CASE panel_type_id
      WHEN 'aiko-475-all-black' THEN 'Aiko'
      WHEN 'BISOL-rood' THEN 'BISOL'
      WHEN 'canadian-bihiku6-rood' THEN 'Canadian Solar'
      WHEN 'canadian-hiku6' THEN 'Canadian Solar'
      WHEN 'eurener-280' THEN 'Eurener'
      WHEN 'ja-deepblue-3-rood' THEN 'JA Solar'
      WHEN 'ja-deepblue-4' THEN 'JA Solar'
      WHEN 'jinko-tiger-neo' THEN 'Jinko'
      WHEN 'longi-hi-mo-6' THEN 'LONGi'
      WHEN 'longi-lr7-54hvb-475wp' THEN 'LONGi'
      WHEN 'qcells-qpeak-duo-g10' THEN 'Qcells'
      WHEN 'rec-alpha-pure-r' THEN 'REC'
      WHEN 'sunpower-maxeon6' THEN 'SunPower'
      WHEN 'trina-vertex-s-plus' THEN 'Trina Solar'
      WHEN 'trina-vertex-s-plus-rood' THEN 'Trina Solar'
      ELSE brand
    END
    WHERE COALESCE(brand, '') = ''
  `).run();
}

function ensureCabinetTypesColumns(db: Database.Database): void {
  const cols = new Set((db.prepare("PRAGMA table_info('cabinet_types')").all() as { name: string }[]).map((row) => row.name));
  const additions = [
    !cols.has('description') ? 'ALTER TABLE cabinet_types ADD COLUMN description TEXT;' : '',
    !cols.has('price') ? 'ALTER TABLE cabinet_types ADD COLUMN price REAL;' : '',
    !cols.has('price_source_url') ? 'ALTER TABLE cabinet_types ADD COLUMN price_source_url TEXT;' : '',
    !cols.has('units') ? 'ALTER TABLE cabinet_types ADD COLUMN units TEXT;' : '',
    !cols.has('condensation_protection') ? 'ALTER TABLE cabinet_types ADD COLUMN condensation_protection INTEGER NOT NULL DEFAULT 0;' : '',
    !cols.has('insect_protection') ? 'ALTER TABLE cabinet_types ADD COLUMN insect_protection INTEGER NOT NULL DEFAULT 0;' : '',
    !cols.has('dust_protection') ? 'ALTER TABLE cabinet_types ADD COLUMN dust_protection INTEGER NOT NULL DEFAULT 0;' : '',
    !cols.has('outside_protection') ? 'ALTER TABLE cabinet_types ADD COLUMN outside_protection INTEGER NOT NULL DEFAULT 0;' : '',
    !cols.has('frost_protection') ? 'ALTER TABLE cabinet_types ADD COLUMN frost_protection INTEGER NOT NULL DEFAULT 0;' : '',
    !cols.has('fire_protection') ? 'ALTER TABLE cabinet_types ADD COLUMN fire_protection INTEGER NOT NULL DEFAULT 0;' : '',
    !cols.has('ip_rating') ? 'ALTER TABLE cabinet_types ADD COLUMN ip_rating TEXT;' : '',
    !cols.has('insurance_rating') ? 'ALTER TABLE cabinet_types ADD COLUMN insurance_rating TEXT;' : '',
  ].filter(Boolean);

  if (additions.length > 0) {
    db.exec(additions.join('\n'));
  }
}

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id TEXT UNIQUE NOT NULL,
      title     TEXT,
      country   TEXT NOT NULL,
      place_name TEXT NOT NULL,
      description TEXT,
      notes     TEXT,
      latitude  REAL NOT NULL,
      longitude REAL NOT NULL,
      northing  REAL,
      easting   REAL,
      site_photo_data_url TEXT
    );

    CREATE TABLE IF NOT EXISTS surfaces (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id     TEXT REFERENCES projects(project_id),
      location_id    TEXT,
      surface_id     TEXT UNIQUE NOT NULL,
      name           TEXT NOT NULL,
      description    TEXT,
      sort_order     INTEGER NOT NULL DEFAULT 0,
      orientation_deg REAL NOT NULL,
      tilt_deg       REAL NOT NULL,
      usable_area_m2 REAL,
      notes          TEXT,
      photo_data_url TEXT
    );

    CREATE TABLE IF NOT EXISTS panel_types (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      panel_type_id TEXT UNIQUE NOT NULL,
      brand         TEXT NOT NULL DEFAULT '',
      model         TEXT NOT NULL,
      wp            REAL NOT NULL,
      voc           REAL NOT NULL,
      vmp           REAL NOT NULL,
      isc           REAL NOT NULL,
      imp           REAL NOT NULL,
      length_mm     REAL NOT NULL,
      width_mm      REAL NOT NULL,
      notes         TEXT,
      price         REAL,
      price_source_url TEXT,
      last_upsert_date TEXT,
      wp_per_m2     REAL GENERATED ALWAYS AS (ROUND(wp / (length_mm * width_mm / 1000000.0), 1)) VIRTUAL,
      price_per_wp  REAL GENERATED ALWAYS AS (CASE WHEN price IS NOT NULL THEN ROUND(price / wp, 2) ELSE NULL END) VIRTUAL
    );

    CREATE TABLE IF NOT EXISTS cabinet_types (
      id                     INTEGER PRIMARY KEY AUTOINCREMENT,
      cabinet_type_id        TEXT UNIQUE NOT NULL,
      title                  TEXT NOT NULL,
      description            TEXT,
      depth_mm               REAL NOT NULL,
      width_mm               REAL NOT NULL,
      height_mm              REAL NOT NULL,
      units                  TEXT,
      price                  REAL,
      price_source_url       TEXT,
      condensation_protection INTEGER NOT NULL DEFAULT 0,
      insect_protection      INTEGER NOT NULL DEFAULT 0,
      dust_protection        INTEGER NOT NULL DEFAULT 0,
      outside_protection     INTEGER NOT NULL DEFAULT 0,
      frost_protection       INTEGER NOT NULL DEFAULT 0,
      fire_protection        INTEGER NOT NULL DEFAULT 0,
      ip_rating              TEXT,
      insurance_rating       TEXT
    );

    CREATE TABLE IF NOT EXISTS surface_panel_assignments (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      surface_id    TEXT NOT NULL REFERENCES surfaces(surface_id),
      panel_type_id TEXT NOT NULL REFERENCES panel_types(panel_type_id),
      count         INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pv_arrays (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      array_id         TEXT UNIQUE NOT NULL,
      surface_id       TEXT UNIQUE NOT NULL REFERENCES surfaces(surface_id),
      name             TEXT NOT NULL,
      panel_type_id    TEXT REFERENCES panel_types(panel_type_id),
      panel_count      INTEGER NOT NULL DEFAULT 0,
      panels_per_string INTEGER,
      parallel_strings INTEGER,
      installed_wp     REAL NOT NULL DEFAULT 0,
      notes            TEXT
    );

    CREATE TABLE IF NOT EXISTS pv_strings (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      string_id      TEXT UNIQUE NOT NULL,
      array_id       TEXT NOT NULL REFERENCES pv_arrays(array_id),
      surface_id     TEXT NOT NULL REFERENCES surfaces(surface_id),
      string_index   INTEGER NOT NULL,
      panel_type_id  TEXT REFERENCES panel_types(panel_type_id),
      panel_count    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS array_to_mppt_mappings (
      id                        INTEGER PRIMARY KEY AUTOINCREMENT,
      mapping_id                TEXT UNIQUE NOT NULL,
      array_id                  TEXT UNIQUE NOT NULL REFERENCES pv_arrays(array_id),
      selected_mppt_type_id     TEXT REFERENCES mppt_types(mppt_type_id)
    );

    CREATE TABLE IF NOT EXISTS surface_configurations (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      surface_id            TEXT UNIQUE NOT NULL REFERENCES surfaces(surface_id),
      panels_per_string     INTEGER,
      parallel_strings      INTEGER,
      selected_mppt_type_id TEXT REFERENCES mppt_types(mppt_type_id)
    );

    CREATE TABLE IF NOT EXISTS dc_busbars (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      dc_busbar_id    TEXT UNIQUE NOT NULL,
      title           TEXT NOT NULL,
      description     TEXT
    );

    CREATE TABLE IF NOT EXISTS battery_bank_configurations (
      id                       INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id               TEXT REFERENCES projects(project_id),
      location_id              TEXT NOT NULL REFERENCES locations(location_id),
      battery_bank_id          TEXT UNIQUE NOT NULL,
      title                    TEXT,
      description              TEXT,
      image_data_url           TEXT,
      notes                    TEXT,
      selected_battery_type_id TEXT REFERENCES battery_types(battery_type_id),
      selected_cabinet_type_id  TEXT REFERENCES cabinet_types(cabinet_type_id),
      selected_dc_busbar_id    TEXT REFERENCES dc_busbars(dc_busbar_id) ON DELETE SET NULL,
      configured_battery_count  INTEGER NOT NULL DEFAULT 1,
      batteries_per_string      INTEGER NOT NULL DEFAULT 1,
      parallel_strings          INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS mppt_types (
      id                     INTEGER PRIMARY KEY AUTOINCREMENT,
      mppt_type_id           TEXT UNIQUE NOT NULL,
      brand                  TEXT NOT NULL DEFAULT '',
      model                  TEXT NOT NULL,
      tracker_count          INTEGER NOT NULL DEFAULT 1,
      max_voc                REAL NOT NULL,
      max_pv_power           REAL NOT NULL,
      max_pv_input_current_a REAL,
      max_pv_short_circuit_current_a REAL,
      max_charge_current     REAL NOT NULL,
      nominal_battery_voltage REAL NOT NULL,
      price                  REAL,
      price_source_url       TEXT,
      notes                  TEXT
    );

    CREATE TABLE IF NOT EXISTS battery_types (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      battery_type_id     TEXT UNIQUE NOT NULL,
      brand               TEXT NOT NULL DEFAULT '',
      model               TEXT NOT NULL,
      chemistry           TEXT NOT NULL,
      nominal_voltage     REAL NOT NULL,
      capacity_ah         REAL NOT NULL,
      capacity_kwh        REAL NOT NULL,
      max_charge_rate     REAL,
      max_discharge_rate  REAL,
      victron_can         INTEGER NOT NULL DEFAULT 0,
      cooling             TEXT NOT NULL DEFAULT 'passive',
      price               REAL,
      price_per_kwh       REAL,
      price_source_url    TEXT,
      source              TEXT,
      url                 TEXT,
      notes               TEXT
    );

    CREATE TABLE IF NOT EXISTS project_preferences (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inverter_types (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      inverter_id          TEXT UNIQUE NOT NULL,
      brand                TEXT NOT NULL DEFAULT '',
      model                TEXT NOT NULL,
      input_voltage_v      REAL NOT NULL,
      output_voltage_v     REAL NOT NULL,
      continuous_power_w   REAL NOT NULL,
      peak_power_va        REAL NOT NULL,
      max_charge_current_a REAL NOT NULL,
      efficiency_pct       REAL,
      price                REAL,
      price_source_url     TEXT,
      notes                TEXT
    );

    CREATE TABLE IF NOT EXISTS inverter_configurations (
      id                        INTEGER PRIMARY KEY AUTOINCREMENT,
      inverter_configuration_id TEXT UNIQUE NOT NULL,
      selected_inverter_type_id  TEXT REFERENCES inverter_types(inverter_id),
      selected_cabinet_type_id   TEXT REFERENCES cabinet_types(cabinet_type_id),
      selected_dc_busbar_id      TEXT REFERENCES dc_busbars(dc_busbar_id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS conversion_devices (
      id                     INTEGER PRIMARY KEY AUTOINCREMENT,
      conversion_device_id   TEXT UNIQUE NOT NULL,
      title                  TEXT NOT NULL,
      description            TEXT,
      device_type            TEXT NOT NULL,
      input_voltage_v        REAL,
      output_voltage_v       REAL,
      continuous_power_w     REAL,
      peak_power_va          REAL,
      max_charge_current_a   REAL,
      efficiency_pct         REAL,
      output_ac_voltage_v    REAL,
      frequency_hz           REAL,
      surge_power_w          REAL,
      output_dc_voltage_v    REAL,
      max_output_current_a   REAL
    );

    CREATE TABLE IF NOT EXISTS project_converters (
      id                     INTEGER PRIMARY KEY AUTOINCREMENT,
      project_converter_id   TEXT UNIQUE NOT NULL,
      title                  TEXT NOT NULL,
      description            TEXT,
      conversion_device_id   TEXT NOT NULL REFERENCES conversion_devices(conversion_device_id)
    );

    CREATE TABLE IF NOT EXISTS load_circuits (
      id                     INTEGER PRIMARY KEY AUTOINCREMENT,
      load_circuit_id        TEXT UNIQUE NOT NULL,
      location_id            TEXT NOT NULL REFERENCES locations(location_id),
      project_converter_id   TEXT REFERENCES project_converters(project_converter_id),
      conversion_device_id   TEXT NOT NULL REFERENCES conversion_devices(conversion_device_id),
      title                  TEXT NOT NULL,
      description            TEXT
    );

    CREATE TABLE IF NOT EXISTS loads (
      id                     INTEGER PRIMARY KEY AUTOINCREMENT,
      load_id                TEXT UNIQUE NOT NULL,
      location_id            TEXT NOT NULL REFERENCES locations(location_id),
      load_circuit_id        TEXT NOT NULL REFERENCES load_circuits(load_circuit_id),
      title                  TEXT NOT NULL,
      description            TEXT,
      nominal_current_a      REAL,
      nominal_power_w        REAL,
      startup_current_a      REAL,
      surge_power_w          REAL,
      standby_power_w        REAL,
      expected_usage_hours_per_day REAL NOT NULL,
      daily_energy_kwh       REAL,
      duty_profile           TEXT,
      notes                  TEXT,
      usage_kw               REAL NOT NULL,
      spike_kw               REAL NOT NULL,
      sleeping_kw            REAL NOT NULL
    );

  `);

  ensureLocationColumns(db);
  ensureLocationIdentity(db);
  dropLegacyLocationTable(db);
  ensureSurfaceColumns(db);
  ensureDcBusbarColumns(db);
  ensureConversionDeviceColumns(db);
  ensureInverterConfigurationColumns(db);
  ensureCabinetTypesColumns(db);
  ensureBatteryTypesColumns(db);
  ensurePanelTypesColumns(db);
  ensureMpptTypesColumns(db);
  ensureInverterTypesColumns(db);

  // Phase 1 multi-project: add projects table and project_id to all project-scoped
  // tables. Catalog tables (panel_types, mppt_types, battery_types, inverter_types,
  // cabinet_types, conversion_devices, dc_busbars) stay global and are not scoped.
  ensureProjectsTable(db);
  migrateLegacyDefaultProjectId(db);
  ensureProjectId(db, 'locations');
  ensureBatteryBankConfigurationColumns(db);
  ensureProjectId(db, 'surfaces');
  ensureSurfaceLocationId(db);
  ensureProjectId(db, 'surface_panel_assignments');
  ensureProjectId(db, 'pv_arrays');
  ensureProjectId(db, 'pv_strings');
  ensureProjectId(db, 'array_to_mppt_mappings');
  ensureProjectId(db, 'surface_configurations');
  ensureProjectId(db, 'inverter_configurations');
  ensureProjectId(db, 'project_converters');
  ensureProjectId(db, 'load_circuits');
  ensureProjectId(db, 'loads');
  ensureProjectPreferencesMigration(db);
  seedLocation(db);
  ensureLoadCircuitsProjectConverterId(db);
  ensureLoadCircuitLocationId(db);
  ensureLoadColumns(db);
  ensureLoadLocationId(db);
  seedSurfaces(db);
  seedPanelTypes(db);
  seedMpptTypes(db);
  seedBatteryTypes(db);
  seedConversionDevices(db);
  seedSurfacePanelAssignments(db);
  seedInverterTypes(db);
  seedInverterConfigurations(db);
  // PV topology rows are derived data. Skip rebuilding them at startup so
  // legacy production data can still boot and be repaired in-app.
}
