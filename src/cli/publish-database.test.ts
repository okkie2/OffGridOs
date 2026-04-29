import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { upsertLocation } from '../db/queries.js';
import { ensureDatabaseReady, withDb } from '../server/bootstrap.js';
import { publishLocalDatabase, readRailwayPublishToken } from './publish-database.js';

const createdDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'offgridos-publish-db-'));
  createdDirs.push(dir);
  return dir;
}

afterEach(() => {
  vi.unstubAllGlobals();
  while (createdDirs.length > 0) {
    rmSync(createdDirs.pop()!, { recursive: true, force: true });
  }
});

describe('readRailwayPublishToken', () => {
  it('reads the publish token from Railway variables JSON', () => {
    const token = readRailwayPublishToken('OffGridOs', 'production', () =>
      JSON.stringify({ DATABASE_PUBLISH_TOKEN: '  topsecret  ' }),
    );

    expect(token).toBe('topsecret');
  });
});

describe('publishLocalDatabase', () => {
  it('uploads the local database payload to the publish endpoint', async () => {
    const sourceDir = makeTempDir();
    const sourcePath = join(sourceDir, 'project.db');

    ensureDatabaseReady(sourcePath);
    withDb(sourcePath, (db) => {
      upsertLocation(db, {
        title: 'Publish Test Farm',
        place_name: 'Warten',
        country: 'NL',
        description: 'Local database publication test',
        latitude: 53.126579,
        longitude: 5.899564,
        northing: 557800.12,
        easting: 181200.45,
        site_photo_data_url: null,
      });
    });

    const expectedPayload = readFileSync(sourcePath);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ bytesWritten: expectedPayload.length, summary: { locations: 1 } }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await publishLocalDatabase({
      dbPath: sourcePath,
      endpoint: 'https://example.test/api/admin/publish-database',
      token: 'topsecret',
      useRailwayCli: false,
    });

    expect(result.endpoint).toBe('https://example.test/api/admin/publish-database');
    expect(result.bytesWritten).toBe(expectedPayload.length);
    expect(result.summary).toEqual({ locations: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [endpoint, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(endpoint).toBe('https://example.test/api/admin/publish-database');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      'x-database-publish-token': 'topsecret',
      'Content-Type': 'application/octet-stream',
    });
    expect(Buffer.isBuffer(init.body)).toBe(true);
    expect((init.body as Buffer).equals(expectedPayload)).toBe(true);
  });
});
