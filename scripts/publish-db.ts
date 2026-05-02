#!/usr/bin/env tsx
/**
 * publish-db — CLI script to publish the local project.db to Railway.
 *
 * Usage:
 *   npm run publish:db
 *
 * What it does:
 *   1. Validates that project.db is a real SQLite file.
 *   2. Resolves the publish token from DATABASE_PUBLISH_TOKEN in your shell,
 *      or falls back to reading it from Railway CLI variables
 *      (service: OffGridOs, environment: production).
 *   3. POSTs the binary file to the /api/admin/publish-database endpoint.
 *
 * This is the only supported way to update the live database on Railway.
 * Do not rely on git push to move SQLite data — GitHub deploys code, not the database.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { resolveDatabasePath } from '../src/config/runtime.js';
import { DATABASE_PUBLISH_TOKEN_HEADER, resolveDatabasePublishToken, validateSQLiteDatabaseFile } from '../src/server/database-publish.js';

const DEFAULT_PUBLISH_ENDPOINT = 'https://offgridos.eu/api/admin/publish-database';
const DEFAULT_RAILWAY_SERVICE = 'OffGridOs';
const DEFAULT_RAILWAY_ENVIRONMENT = 'production';

function readRailwayPublishToken(service: string, environment: string): string {
  let rawOutput: string;
  try {
    rawOutput = execFileSync('railway', ['variable', 'list', '-s', service, '-e', environment, '--json'], { encoding: 'utf8' });
  } catch (error) {
    throw new Error(
      `Unable to read Railway variables for ${service} / ${environment}. Make sure the Railway CLI is installed and authenticated, or set DATABASE_PUBLISH_TOKEN in your shell.`,
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

async function main(): Promise<void> {
  const dbPath = resolveDatabasePath();
  if (!fs.existsSync(dbPath)) {
    throw new Error(`No database found at ${dbPath}.`);
  }

  validateSQLiteDatabaseFile(dbPath);

  const token =
    resolveDatabasePublishToken() ||
    readRailwayPublishToken(DEFAULT_RAILWAY_SERVICE, DEFAULT_RAILWAY_ENVIRONMENT);

  const endpoint = process.env.DATABASE_PUBLISH_ENDPOINT?.trim() || DEFAULT_PUBLISH_ENDPOINT;
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
    throw new Error(`Publish failed with HTTP ${response.status}: ${responseText}`);
  }

  const parsed = JSON.parse(responseText) as { bytesWritten?: number; summary?: unknown };
  const summaryText = parsed.summary ? `, summary: ${JSON.stringify(parsed.summary)}` : '';
  console.log(`Published ${(parsed.bytesWritten ?? 0).toLocaleString()} bytes to ${endpoint}${summaryText}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
