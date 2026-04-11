import Database from 'better-sqlite3';
import { seedMpptTypes, seedBatteryTypes } from './seeds.js';

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS location (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      country   TEXT NOT NULL,
      place_name TEXT NOT NULL,
      latitude  REAL NOT NULL,
      longitude REAL NOT NULL
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

    CREATE TABLE IF NOT EXISTS mppt_types (
      id                     INTEGER PRIMARY KEY AUTOINCREMENT,
      mppt_type_id           TEXT UNIQUE NOT NULL,
      model                  TEXT NOT NULL,
      max_voc                REAL NOT NULL,
      max_pv_power           REAL NOT NULL,
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

    CREATE TABLE IF NOT EXISTS inverters (
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
  `);

  seedMpptTypes(db);
  seedBatteryTypes(db);
}
