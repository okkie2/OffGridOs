import path from 'path';

export const DEFAULT_DATABASE_PATH = './project.db';
export const DEFAULT_PRODUCTION_DATABASE_PATH = '/data/project.db';
const DEFAULT_SERVER_PORT = 3000;
const DEFAULT_SERVER_HOST = '0.0.0.0';

export function assertProductionDatabasePath(databasePath: string): string {
  if (process.env.NODE_ENV === 'production' && databasePath !== path.resolve(DEFAULT_PRODUCTION_DATABASE_PATH)) {
    throw new Error(`Production DATABASE_PATH must resolve to ${DEFAULT_PRODUCTION_DATABASE_PATH} to keep data on persistent Railway storage.`);
  }

  return databasePath;
}

export function resolveDatabasePath(explicitPath?: string): string {
  const databasePath = explicitPath
    ?? process.env.DATABASE_PATH
    ?? (process.env.NODE_ENV === 'production' ? DEFAULT_PRODUCTION_DATABASE_PATH : DEFAULT_DATABASE_PATH);

  return assertProductionDatabasePath(path.resolve(databasePath));
}

export function resolveServerPort(): number {
  const rawPort = process.env.PORT;
  const parsedPort = rawPort ? Number.parseInt(rawPort, 10) : Number.NaN;
  return Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : DEFAULT_SERVER_PORT;
}

export function resolveServerHost(): string {
  return process.env.HOST?.trim() || DEFAULT_SERVER_HOST;
}

export function resolveWebDistPath(): string {
  return path.resolve(process.cwd(), 'dist', 'web');
}
