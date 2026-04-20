import fs from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { openDb } from '../db/connection.js';
import { initSchema } from '../db/schema.js';

export function ensureDatabaseReady(dbPath: string): void {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = openDb(dbPath);
  try {
    initSchema(db);
  } finally {
    db.close();
  }
}

export function withDb<T>(dbPath: string, fn: (db: Database.Database) => T): T {
  const db = openDb(dbPath);
  try {
    return fn(db);
  } finally {
    db.close();
  }
}
