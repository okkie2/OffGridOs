import path from 'path';

export const DEFAULT_DATABASE_PATH = './project.db';
const DEFAULT_SERVER_PORT = 3000;
const DEFAULT_SERVER_HOST = '0.0.0.0';

export function resolveDatabasePath(explicitPath?: string): string {
  return path.resolve(explicitPath ?? process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH);
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
