import Database from 'better-sqlite3';
import { resolveDatabasePath } from '../config/runtime.js';

export function openDb(dbPath?: string): Database.Database {
  const resolved = resolveDatabasePath(dbPath);
  return new Database(resolved);
}
