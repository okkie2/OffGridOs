import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { resolveDatabasePath } from '../config/runtime.js';
import { DATABASE_PUBLISH_TOKEN_HEADER, resolveDatabasePublishToken, validateSQLiteDatabaseFile } from '../server/database-publish.js';

export const DEFAULT_PUBLISH_ENDPOINT = 'https://offgridos.eu/api/admin/publish-database';
export const DEFAULT_RAILWAY_SERVICE = 'OffGridOs';
export const DEFAULT_RAILWAY_ENVIRONMENT = 'production';

export interface PublishDatabaseOptions {
  dbPath?: string;
  endpoint?: string;
  token?: string | null;
  railwayService?: string;
  railwayEnvironment?: string;
  useRailwayCli?: boolean;
}

export interface PublishDatabaseResult {
  endpoint: string;
  bytesWritten: number;
  summary: Record<string, unknown> | null;
}

type RailwayVariableReader = (service: string, environment: string) => string;

function readRailwayVariables(service: string, environment: string): string {
  return execFileSync('railway', ['variable', 'list', '-s', service, '-e', environment, '--json'], { encoding: 'utf8' });
}

export function readRailwayPublishToken(
  service: string,
  environment: string,
  reader: RailwayVariableReader = readRailwayVariables,
): string {
  let rawOutput: string;

  try {
    rawOutput = reader(service, environment);
  } catch (error) {
    throw new Error(
      `Unable to read Railway variables for ${service} / ${environment}. Make sure the Railway CLI is installed and authenticated, or pass DATABASE_PUBLISH_TOKEN directly.`,
      { cause: error as Error },
    );
  }

  let variables: Record<string, unknown>;
  try {
    variables = JSON.parse(rawOutput) as Record<string, unknown>;
  } catch (error) {
    throw new Error(`Railway returned invalid JSON while reading variables for ${service} / ${environment}.`, { cause: error as Error });
  }

  const token = variables.DATABASE_PUBLISH_TOKEN;
  if (typeof token !== 'string' || token.trim() === '') {
    throw new Error(`Railway variables for ${service} / ${environment} do not include DATABASE_PUBLISH_TOKEN.`);
  }

  return token.trim();
}

function resolvePublishToken(options: PublishDatabaseOptions): string {
  const token = options.token?.trim() || resolveDatabasePublishToken();
  if (token) {
    return token;
  }

  if (options.useRailwayCli === false) {
    throw new Error('DATABASE_PUBLISH_TOKEN is missing. Pass --token or set DATABASE_PUBLISH_TOKEN in your shell.');
  }

  const service = options.railwayService?.trim() || DEFAULT_RAILWAY_SERVICE;
  const environment = options.railwayEnvironment?.trim() || DEFAULT_RAILWAY_ENVIRONMENT;
  return readRailwayPublishToken(service, environment);
}

function parsePublishResponse(rawBody: string, endpoint: string): PublishDatabaseResult {
  const parsed = JSON.parse(rawBody) as {
    bytesWritten?: number;
    summary?: Record<string, unknown> | null;
  };

  if (typeof parsed.bytesWritten !== 'number') {
    throw new Error('Publish response did not include bytesWritten.');
  }

  return {
    endpoint,
    bytesWritten: parsed.bytesWritten,
    summary: parsed.summary ?? null,
  };
}

export async function publishLocalDatabase(options: PublishDatabaseOptions = {}): Promise<PublishDatabaseResult> {
  const dbPath = resolveDatabasePath(options.dbPath);
  if (!fs.existsSync(dbPath)) {
    throw new Error(`No database found at ${dbPath}. Run \`ogos init\` first.`);
  }

  validateSQLiteDatabaseFile(dbPath);

  const token = resolvePublishToken(options);
  const endpoint = options.endpoint?.trim() || process.env.DATABASE_PUBLISH_ENDPOINT?.trim() || DEFAULT_PUBLISH_ENDPOINT;
  const payload = fs.readFileSync(dbPath);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      [DATABASE_PUBLISH_TOKEN_HEADER]: token,
      'Content-Type': 'application/octet-stream',
    },
    body: payload,
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Publish request failed with HTTP ${response.status}: ${responseText}`);
  }

  const result = parsePublishResponse(responseText, endpoint);
  return {
    endpoint,
    bytesWritten: result.bytesWritten,
    summary: result.summary,
  };
}

export function formatPublishSummary(result: PublishDatabaseResult): string {
  const summaryText = result.summary ? `, summary: ${JSON.stringify(result.summary)}` : '';
  return `Published ${result.bytesWritten.toLocaleString()} bytes to ${result.endpoint}${summaryText}`;
}
