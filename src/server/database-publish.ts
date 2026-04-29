import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export const DATABASE_PUBLISH_TOKEN_HEADER = 'x-database-publish-token';

export function resolveDatabasePublishToken(env: NodeJS.ProcessEnv = process.env): string | null {
  const token = env.DATABASE_PUBLISH_TOKEN?.trim();
  return token ? token : null;
}

export function hasValidDatabasePublishToken(headers: NodeJS.Dict<string | string[]>, expectedToken: string | null): boolean {
  if (!expectedToken) {
    return false;
  }

  const rawHeader = headers[DATABASE_PUBLISH_TOKEN_HEADER] ?? headers[DATABASE_PUBLISH_TOKEN_HEADER.toUpperCase()];
  const providedToken = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  return typeof providedToken === 'string' && providedToken.trim() === expectedToken;
}

export function validateSQLiteDatabaseFile(filePath: string): void {
  const db = new Database(filePath, { readonly: true });

  try {
    const sqliteMasterCount = (db.prepare('SELECT COUNT(*) AS count FROM sqlite_master').get() as { count: number } | undefined)?.count ?? 0;
    const quickCheck = db.pragma('quick_check', { simple: true });

    if (typeof quickCheck !== 'string' || quickCheck.toLowerCase() !== 'ok') {
      throw new Error(`Uploaded SQLite quick_check failed: ${String(quickCheck)}`);
    }

    if (sqliteMasterCount === 0) {
      throw new Error('Uploaded database did not contain any SQLite schema objects.');
    }
  } finally {
    db.close();
  }
}

export function publishDatabaseFile(databasePath: string, payload: Buffer): { bytesWritten: number } {
  if (payload.length === 0) {
    throw new Error('Uploaded database payload was empty.');
  }

  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const tempPath = `${databasePath}.upload-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tempPath, payload);

  try {
    validateSQLiteDatabaseFile(tempPath);
    fs.renameSync(tempPath, databasePath);
    return { bytesWritten: payload.length };
  } catch (error) {
    fs.rmSync(tempPath, { force: true });
    throw error;
  }
}
