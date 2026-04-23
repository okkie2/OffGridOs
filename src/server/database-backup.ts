import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../db/connection.js';

export type DatabaseBackup = {
  backupPath: string;
  cleanup: () => void;
};

export async function createDatabaseBackup(dbPath: string): Promise<DatabaseBackup> {
  const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'offgridos-backup-'));
  const backupPath = path.join(backupDir, 'project.db');
  const db = openDb(dbPath);
  try {
    await db.backup(backupPath);
  } finally {
    db.close();
  }

  return {
    backupPath,
    cleanup: () => {
      fs.rmSync(backupDir, { recursive: true, force: true });
    },
  };
}
