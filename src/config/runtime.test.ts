import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_DATABASE_PATH, DEFAULT_PRODUCTION_DATABASE_PATH, resolveDatabasePath } from './runtime.js';

const originalEnv = {
  DATABASE_PATH: process.env.DATABASE_PATH,
  NODE_ENV: process.env.NODE_ENV,
};

afterEach(() => {
  process.env.DATABASE_PATH = originalEnv.DATABASE_PATH;
  process.env.NODE_ENV = originalEnv.NODE_ENV;
});

describe('resolveDatabasePath', () => {
  it('uses the local project database by default', () => {
    delete process.env.DATABASE_PATH;
    process.env.NODE_ENV = 'development';

    expect(resolveDatabasePath()).toBe(path.resolve(DEFAULT_DATABASE_PATH));
  });

  it('uses the mounted production database when running in production without an explicit path', () => {
    delete process.env.DATABASE_PATH;
    process.env.NODE_ENV = 'production';

    expect(resolveDatabasePath()).toBe(path.resolve(DEFAULT_PRODUCTION_DATABASE_PATH));
  });

  it('still honors an explicit DATABASE_PATH override in production', () => {
    process.env.DATABASE_PATH = '/custom/project.db';
    process.env.NODE_ENV = 'production';

    expect(resolveDatabasePath()).toBe('/custom/project.db');
  });
});
