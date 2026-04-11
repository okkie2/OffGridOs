import Database from 'better-sqlite3';
import path from 'path';

export function openDb(dbPath?: string): Database.Database {
  const resolved = dbPath ?? path.join(process.cwd(), 'project.db');
  return new Database(resolved);
}
