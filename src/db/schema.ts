import Database from 'better-sqlite3';
import { seedMpptTypes, seedBatteryTypes, seedInverterTypes, seedInverterConfigurations, seedLocation, seedPanelTypes, seedRoofFaces, seedRoofPanels } from './seeds.js';
import { syncPvTopology } from './queries.js';

function hasTable(db: Database.Database, tableName: string): boolean {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName) as { name?: string } | undefined;
  return Boolean(row);
}

function migrateLegacyTableRows(
  db: Database.Database,
  oldTable: string,
  newTable: string,
  columns: string[],
  uniqueKey: string,
): void {
  if (!hasTable(db, oldTable)) {
    return;
  }

  if (!hasTable(db, newTable)) {
    db.exec(`ALTER TABLE ${oldTable} RENAME TO ${newTable};`);
    return;
  }

  const insertSql = `INSERT INTO ${newTable} (${columns.join(', ')}) VALUES (${columns.map((column) => `@${column}`).join(', ')})`;
  const updateSql = `UPDATE ${newTable} SET ${columns.filter((column) => column !== uniqueKey).map((column) => `${column}=@${column}`).join(', ')} WHERE ${uniqueKey}=@${uniqueKey}`;
  const insert = db.prepare(insertSql);
  const update = db.prepare(updateSql);
  const rows = db.prepare(`SELECT ${columns.join(', ')} FROM ${oldTable}`).all() as Record<string, unknown>[];

  const transaction = db.transaction(() => {
    for (const row of rows) {
      const existing = db.prepare(`SELECT 1 FROM ${newTable} WHERE ${uniqueKey} = ?`).get(row[uniqueKey]);
      if (existing) {
        update.run(row);
      } else {
        insert.run(row);
      }
    }
    db.exec(`DROP TABLE ${oldTable};`);
  });

  transaction();
}

function ensureBatteryTypesColumns(db: Database.Database): void {
  const cols = new Set((db.prepare("PRAGMA table_info('battery_types')").all() as { name: string }[]).map((row) => row.name));
  const additions = [
    !cols.has('victron_can') ? "ALTER TABLE battery_types ADD COLUMN victron_can INTEGER NOT NULL DEFAULT 0;" : '',
    !cols.has('cooling') ? "ALTER TABLE battery_types ADD COLUMN cooling TEXT NOT NULL DEFAULT 'passive';" : '',
    !cols.has('price') ? 'ALTER TABLE battery_types ADD COLUMN price REAL;' : '',
    !cols.has('price_per_kwh') ? 'ALTER TABLE battery_types ADD COLUMN price_per_kwh REAL;' : '',
    !cols.has('source') ? 'ALTER TABLE battery_types ADD COLUMN source TEXT;' : '',
    !cols.has('url') ? 'ALTER TABLE battery_types ADD COLUMN url TEXT;' : '',
  ].filter(Boolean);

  if (additions.length > 0) {
    db.exec(additions.join('\n'));
    db.prepare("UPDATE battery_types SET cooling = COALESCE(cooling, 'passive')").run();
  }
}

function ensureLocationColumns(db: Database.Database): void {
  const cols = new Set((db.prepare("PRAGMA table_info('location')").all() as { name: string }[]).map((row) => row.name));
  const additions = [
    !cols.has('northing') ? 'ALTER TABLE location ADD COLUMN northing REAL;' : '',
    !cols.has('easting') ? 'ALTER TABLE location ADD COLUMN easting REAL;' : '',
  ].filter(Boolean);

  if (additions.length > 0) {
    db.exec(additions.join('\n'));
  }
}

function ensureMpptTypesColumns(db: Database.Database): void {
  const cols = new Set((db.prepare("PRAGMA table_info('mppt_types')").all() as { name: string }[]).map((row) => row.name));
  const additions = [
    !cols.has('tracker_count') ? 'ALTER TABLE mppt_types ADD COLUMN tracker_count INTEGER NOT NULL DEFAULT 1;' : '',
    !cols.has('max_pv_input_current_a') ? 'ALTER TABLE mppt_types ADD COLUMN max_pv_input_current_a REAL;' : '',
    !cols.has('max_pv_short_circuit_current_a') ? 'ALTER TABLE mppt_types ADD COLUMN max_pv_short_circuit_current_a REAL;' : '',
  ].filter(Boolean);

  if (additions.length > 0) {
    db.exec(additions.join('\n'));
    db.prepare("UPDATE mppt_types SET tracker_count = COALESCE(tracker_count, 1)").run();
  }
}

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS location (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      country   TEXT NOT NULL,
      place_name TEXT NOT NULL,
      latitude  REAL NOT NULL,
      longitude REAL NOT NULL,
      northing  REAL,
      easting   REAL
    );

    CREATE TABLE IF NOT EXISTS roof_faces (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      roof_face_id   TEXT UNIQUE NOT NULL,
      name           TEXT NOT NULL,
      orientation_deg REAL NOT NULL,
      tilt_deg       REAL NOT NULL,
      usable_area_m2 REAL,
      notes          TEXT
    );

    CREATE TABLE IF NOT EXISTS panel_types (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      panel_type_id TEXT UNIQUE NOT NULL,
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
      wp_per_m2     REAL GENERATED ALWAYS AS (ROUND(wp / (length_mm * width_mm / 1000000.0), 1)) VIRTUAL,
      price_per_wp  REAL GENERATED ALWAYS AS (CASE WHEN price IS NOT NULL THEN ROUND(price / wp, 2) ELSE NULL END) VIRTUAL
    );

    CREATE TABLE IF NOT EXISTS roof_panels (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      roof_face_id  TEXT NOT NULL REFERENCES roof_faces(roof_face_id),
      panel_type_id TEXT NOT NULL REFERENCES panel_types(panel_type_id),
      count         INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS arrays (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      array_id         TEXT UNIQUE NOT NULL,
      roof_face_id     TEXT UNIQUE NOT NULL REFERENCES roof_faces(roof_face_id),
      name             TEXT NOT NULL,
      panel_type_id    TEXT REFERENCES panel_types(panel_type_id),
      panel_count      INTEGER NOT NULL DEFAULT 0,
      panels_per_string INTEGER,
      parallel_strings INTEGER,
      installed_wp     REAL NOT NULL DEFAULT 0,
      notes            TEXT
    );

    CREATE TABLE IF NOT EXISTS strings (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      string_id      TEXT UNIQUE NOT NULL,
      array_id       TEXT NOT NULL REFERENCES arrays(array_id),
      roof_face_id   TEXT NOT NULL REFERENCES roof_faces(roof_face_id),
      string_index   INTEGER NOT NULL,
      panel_type_id  TEXT REFERENCES panel_types(panel_type_id),
      panel_count    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS array_to_mppt_mappings (
      id                        INTEGER PRIMARY KEY AUTOINCREMENT,
      mapping_id                TEXT UNIQUE NOT NULL,
      array_id                  TEXT UNIQUE NOT NULL REFERENCES arrays(array_id),
      selected_mppt_type_id     TEXT REFERENCES mppt_types(mppt_type_id)
    );

    CREATE TABLE IF NOT EXISTS roof_face_configurations (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      roof_face_id          TEXT UNIQUE NOT NULL REFERENCES roof_faces(roof_face_id),
      panels_per_string     INTEGER,
      parallel_strings      INTEGER,
      selected_mppt_type_id TEXT REFERENCES mppt_types(mppt_type_id)
    );

    CREATE TABLE IF NOT EXISTS battery_bank_configurations (
      id                       INTEGER PRIMARY KEY AUTOINCREMENT,
      battery_bank_id          TEXT UNIQUE NOT NULL,
      selected_battery_type_id TEXT REFERENCES battery_types(battery_type_id),
      configured_battery_count  INTEGER NOT NULL DEFAULT 1,
      batteries_per_string      INTEGER NOT NULL DEFAULT 1,
      parallel_strings          INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS mppt_types (
      id                     INTEGER PRIMARY KEY AUTOINCREMENT,
      mppt_type_id           TEXT UNIQUE NOT NULL,
      model                  TEXT NOT NULL,
      tracker_count          INTEGER NOT NULL DEFAULT 1,
      max_voc                REAL NOT NULL,
      max_pv_power           REAL NOT NULL,
      max_pv_input_current_a REAL,
      max_pv_short_circuit_current_a REAL,
      max_charge_current     REAL NOT NULL,
      nominal_battery_voltage REAL NOT NULL,
      notes                  TEXT
    );

    CREATE TABLE IF NOT EXISTS battery_types (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      battery_type_id     TEXT UNIQUE NOT NULL,
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
      source              TEXT,
      url                 TEXT,
      notes               TEXT
    );

    CREATE TABLE IF NOT EXISTS preferences (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inverter_types (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      inverter_id          TEXT UNIQUE NOT NULL,
      model                TEXT NOT NULL,
      input_voltage_v      REAL NOT NULL,
      output_voltage_v     REAL NOT NULL,
      continuous_power_w   REAL NOT NULL,
      peak_power_va        REAL NOT NULL,
      max_charge_current_a REAL NOT NULL,
      efficiency_pct       REAL,
      price                REAL,
      notes                TEXT
    );

    CREATE TABLE IF NOT EXISTS inverter_configurations (
      id                        INTEGER PRIMARY KEY AUTOINCREMENT,
      inverter_configuration_id TEXT UNIQUE NOT NULL,
      selected_inverter_type_id  TEXT REFERENCES inverter_types(inverter_id)
    );

  `);

  ensureLocationColumns(db);
  ensureBatteryTypesColumns(db);
  ensureMpptTypesColumns(db);
  seedLocation(db);
  seedRoofFaces(db);
  seedPanelTypes(db);
  seedMpptTypes(db);
  seedBatteryTypes(db);
  migrateLegacyTableRows(
    db,
    'roof_face_designs',
    'roof_face_configurations',
    ['roof_face_id', 'panels_per_string', 'parallel_strings', 'selected_mppt_type_id'],
    'roof_face_id',
  );
  migrateLegacyTableRows(
    db,
    'battery_bank_designs',
    'battery_bank_configurations',
    ['battery_bank_id', 'selected_battery_type_id', 'configured_battery_count', 'batteries_per_string', 'parallel_strings'],
    'battery_bank_id',
  );
  migrateLegacyTableRows(
    db,
    'inverters',
    'inverter_types',
    ['inverter_id', 'model', 'input_voltage_v', 'output_voltage_v', 'continuous_power_w', 'peak_power_va', 'max_charge_current_a', 'efficiency_pct', 'price', 'notes'],
    'inverter_id',
  );
  seedRoofPanels(db);
  seedInverterTypes(db);
  seedInverterConfigurations(db);
  syncPvTopology(db);
}
