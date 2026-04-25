import Database from 'better-sqlite3';
import { seedMpptTypes, seedBatteryTypes, seedInverterTypes, seedInverterConfigurations, seedLocation, seedPanelTypes, seedSurfaces, seedSurfacePanelAssignments } from './seeds.js';
import { syncPvTopology } from './queries.js';

function hasTable(db: Database.Database, tableName: string): boolean {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName) as { name?: string } | undefined;
  return Boolean(row);
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
      INSERT INTO locations (id, title, country, place_name, description, notes, latitude, longitude, northing, easting, site_photo_data_url)
      SELECT id, NULL, country, place_name, NULL, NULL, latitude, longitude, northing, easting, NULL
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
    !cols.has('title') ? 'ALTER TABLE battery_bank_configurations ADD COLUMN title TEXT;' : '',
    !cols.has('description') ? 'ALTER TABLE battery_bank_configurations ADD COLUMN description TEXT;' : '',
    !cols.has('image_data_url') ? 'ALTER TABLE battery_bank_configurations ADD COLUMN image_data_url TEXT;' : '',
    !cols.has('notes') ? 'ALTER TABLE battery_bank_configurations ADD COLUMN notes TEXT;' : '',
    !cols.has('selected_cabinet_type_id') ? 'ALTER TABLE battery_bank_configurations ADD COLUMN selected_cabinet_type_id TEXT REFERENCES cabinet_types(cabinet_type_id);' : '',
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
  ].filter(Boolean);

  if (additions.length > 0) {
    db.exec(additions.join('\n'));
  }
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

    CREATE TABLE IF NOT EXISTS battery_bank_configurations (
      id                       INTEGER PRIMARY KEY AUTOINCREMENT,
      battery_bank_id          TEXT UNIQUE NOT NULL,
      title                    TEXT,
      description              TEXT,
      image_data_url           TEXT,
      notes                    TEXT,
      selected_battery_type_id TEXT REFERENCES battery_types(battery_type_id),
      selected_cabinet_type_id  TEXT REFERENCES cabinet_types(cabinet_type_id),
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
      selected_cabinet_type_id   TEXT REFERENCES cabinet_types(cabinet_type_id)
    );

  `);

  ensureLocationColumns(db);
  dropLegacyLocationTable(db);
  ensureSurfaceColumns(db);
  ensureBatteryBankConfigurationColumns(db);
  ensureInverterConfigurationColumns(db);
  ensureCabinetTypesColumns(db);
  ensureBatteryTypesColumns(db);
  ensurePanelTypesColumns(db);
  ensureMpptTypesColumns(db);
  ensureInverterTypesColumns(db);
  seedLocation(db);
  seedSurfaces(db);
  seedPanelTypes(db);
  seedMpptTypes(db);
  seedBatteryTypes(db);
  seedSurfacePanelAssignments(db);
  seedInverterTypes(db);
  seedInverterConfigurations(db);
  // PV topology rows are derived data. Skip rebuilding them at startup so
  // legacy production data can still boot and be repaired in-app.
}
