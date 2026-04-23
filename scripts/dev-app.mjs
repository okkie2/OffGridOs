import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';
import {
  LOCAL_API_PORT,
  LOCAL_API_TARGET,
  LOCAL_APP_HOST,
  LOCAL_APP_PORT,
  LOCAL_APP_URL,
  REPO_ROOT,
  assertDevPortsAvailable,
} from './local-runtime.mjs';

const tsxBin = resolve(REPO_ROOT, 'node_modules', '.bin', 'tsx');
const viteBin = resolve(REPO_ROOT, 'node_modules', '.bin', 'vite');

function terminate(child, signal = 'SIGTERM') {
  if (child && !child.killed) {
    child.kill(signal);
  }
}

async function main() {
  await assertDevPortsAvailable();

  console.log(`Starting OffGridOS local development app at ${LOCAL_APP_URL}`);
  console.log(`Frontend: ${LOCAL_APP_URL}`);
  console.log(`API proxy target: ${LOCAL_API_TARGET}`);

  const sharedEnv = {
    ...process.env,
    HOST: LOCAL_APP_HOST,
  };

  const serverProcess = spawn(tsxBin, ['src/server.ts'], {
    cwd: REPO_ROOT,
    env: {
      ...sharedEnv,
      PORT: String(LOCAL_API_PORT),
    },
    stdio: 'inherit',
  });

  const webProcess = spawn(viteBin, ['--host', LOCAL_APP_HOST, '--port', String(LOCAL_APP_PORT), '--strictPort'], {
    cwd: REPO_ROOT,
    env: {
      ...sharedEnv,
      OFFGRIDOS_API_TARGET: LOCAL_API_TARGET,
    },
    stdio: 'inherit',
  });

  let shuttingDown = false;

  function shutdown(signal = 'SIGTERM') {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    terminate(webProcess, signal);
    terminate(serverProcess, signal);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  serverProcess.on('exit', (code, signal) => {
    shutdown(signal ?? 'SIGTERM');
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });

  webProcess.on('exit', (code, signal) => {
    shutdown(signal ?? 'SIGTERM');
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
