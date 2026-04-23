import { spawn } from 'node:child_process';
import { assertCanonicalLocalPortsAvailable, LOCAL_APP_URL, REPO_ROOT } from './local-runtime.mjs';

async function main() {
  await assertCanonicalLocalPortsAvailable();

  console.log(`Starting OffGridOS production-style app at ${LOCAL_APP_URL}`);

  const child = spawn(process.execPath, ['dist/server.js'], {
    cwd: REPO_ROOT,
    env: process.env,
    stdio: 'inherit',
  });

  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));

  child.on('exit', (code, signal) => {
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
