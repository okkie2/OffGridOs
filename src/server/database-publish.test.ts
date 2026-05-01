import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { getLocation, upsertLocation } from '../db/queries.js';
import { ensureDatabaseReady, withDb } from './bootstrap.js';
import { DATABASE_PUBLISH_TOKEN_HEADER, hasValidDatabasePublishToken, publishDatabaseFile, resolveDatabasePublishToken } from './database-publish.js';
import { DEFAULT_PROJECT_ID } from '../config/project.js';

const createdDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'offgridos-database-publish-'));
  createdDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (createdDirs.length > 0) {
    rmSync(createdDirs.pop()!, { recursive: true, force: true });
  }
});

describe('resolveDatabasePublishToken', () => {
  it('returns null when the token is missing or blank', () => {
    expect(resolveDatabasePublishToken({} as NodeJS.ProcessEnv)).toBeNull();
    expect(resolveDatabasePublishToken({ DATABASE_PUBLISH_TOKEN: '   ' } as NodeJS.ProcessEnv)).toBeNull();
  });

  it('returns the trimmed token when configured', () => {
    expect(resolveDatabasePublishToken({ DATABASE_PUBLISH_TOKEN: '  topsecret  ' } as NodeJS.ProcessEnv)).toBe('topsecret');
  });
});

describe('hasValidDatabasePublishToken', () => {
  it('accepts the configured publish token header', () => {
    expect(hasValidDatabasePublishToken({ [DATABASE_PUBLISH_TOKEN_HEADER]: 'topsecret' }, 'topsecret')).toBe(true);
  });

  it('rejects missing or mismatched tokens', () => {
    expect(hasValidDatabasePublishToken({}, 'topsecret')).toBe(false);
    expect(hasValidDatabasePublishToken({ [DATABASE_PUBLISH_TOKEN_HEADER]: 'wrong' }, 'topsecret')).toBe(false);
  });
});

describe('publishDatabaseFile', () => {
  it('replaces the target database with a validated SQLite file', () => {
    const sourceDir = makeTempDir();
    const targetDir = makeTempDir();
    const sourcePath = join(sourceDir, 'project.db');
    const targetPath = join(targetDir, 'project.db');
    const projectId = DEFAULT_PROJECT_ID;

    ensureDatabaseReady(sourcePath);
    withDb(sourcePath, (db) => {
      upsertLocation(db, {
        title: '18Mad Boerderij',
        place_name: 'Warten',
        country: 'NL',
        description: 'Published from local source of truth',
        latitude: 53.126579,
        longitude: 5.899564,
        northing: 557800.12,
        easting: 181200.45,
        site_photo_data_url: 'data:image/png;base64,test-photo',
      }, projectId);
    });

    const payload = readFileSync(sourcePath);
    const result = publishDatabaseFile(targetPath, payload);

    expect(result.bytesWritten).toBe(payload.length);
    expect(existsSync(targetPath)).toBe(true);

    const location = withDb(targetPath, (db) => getLocation(db, projectId));
    expect(location?.title).toBe('18Mad Boerderij');
    expect(location?.description).toBe('Published from local source of truth');
    expect(location?.site_photo_data_url).toBe('data:image/png;base64,test-photo');
  });

  it('rejects invalid payloads without leaving a temp database behind', () => {
    const targetDir = makeTempDir();
    const targetPath = join(targetDir, 'project.db');

    expect(() => publishDatabaseFile(targetPath, Buffer.from('not-a-sqlite-file', 'utf-8'))).toThrow();
    expect(existsSync(targetPath)).toBe(false);
  });
});
