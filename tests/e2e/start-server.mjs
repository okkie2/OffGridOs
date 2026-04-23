import { spawn } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(process.cwd());
const tempDir = resolve(root, '.tmp', 'playwright');
const sourceDb = resolve(root, 'project.db');
const tempDb = resolve(tempDir, 'project.db');

rmSync(tempDir, { recursive: true, force: true });
mkdirSync(dirname(tempDb), { recursive: true });
cpSync(sourceDb, tempDb);

const child = spawn('node', ['dist/server.js'], {
  cwd: root,
  env: {
    ...process.env,
    DATABASE_PATH: tempDb,
    HOST: '127.0.0.1',
    PORT: '3100',
  },
  stdio: 'inherit',
});

const forwardSignal = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
