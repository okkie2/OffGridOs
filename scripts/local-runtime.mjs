import { execSync } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const REPO_ROOT = resolve(__dirname, '..');
export const LOCAL_APP_HOST = '127.0.0.1';
export const LOCAL_APP_PORT = 3000;
export const LOCAL_API_PORT = 3001;
export const LOCAL_APP_URL = `http://${LOCAL_APP_HOST}:${LOCAL_APP_PORT}`;
export const LOCAL_API_TARGET = `http://${LOCAL_APP_HOST}:${LOCAL_API_PORT}`;
export const ALL_LOCAL_APP_PORTS = [LOCAL_APP_PORT, LOCAL_API_PORT];

function formatPortLabel(label, port) {
  return `${label} (${port})`;
}

function describeListener(port) {
  try {
    return execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function listListenerPids(port) {
  try {
    const output = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    if (!output) {
      return [];
    }

    return output
      .split('\n')
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter((value) => Number.isFinite(value));
  } catch {
    return [];
  }
}

function assertNoListenerOnPort(port, label) {
  const existingListener = describeListener(port);
  if (!existingListener) {
    return;
  }

  throw new Error(
    `OffGridOS refuses to start because ${formatPortLabel(label, port)} is still occupied.\n`
    + `Only one local OffGridOS app instance may run at a time, and the canonical app URL is ${LOCAL_APP_URL}.\n\n`
    + `Current listener:\n${existingListener}`,
  );
}

export async function assertPortAvailable(port, label) {
  assertNoListenerOnPort(port, label);

  await new Promise((resolvePromise, rejectPromise) => {
    const server = net.createServer();

    server.once('error', (error) => {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'EADDRINUSE') {
        const listenerDetails = describeListener(port);
        const details = listenerDetails ? `\n\nCurrent listener:\n${listenerDetails}` : '';
        rejectPromise(new Error(
          `OffGridOS refuses to start because ${formatPortLabel(label, port)} is already in use.\n`
          + `Only one local OffGridOS app instance may run at a time, and the canonical app URL is ${LOCAL_APP_URL}.${details}`,
        ));
        return;
      }

      rejectPromise(error);
    });

    server.listen(port, LOCAL_APP_HOST, () => {
      server.close((closeError) => {
        if (closeError) {
          rejectPromise(closeError);
          return;
        }

        resolvePromise();
      });
    });
  });
}

export async function assertCanonicalLocalPortsAvailable() {
  await assertPortAvailable(LOCAL_APP_PORT, 'the canonical local app port');
}

export async function assertDevPortsAvailable() {
  await assertPortAvailable(LOCAL_APP_PORT, 'the canonical local app port');
  await assertPortAvailable(LOCAL_API_PORT, 'the internal local API port');
}

export function findOccupiedLocalAppPorts() {
  return ALL_LOCAL_APP_PORTS.flatMap((port) => {
    const pids = listListenerPids(port);
    if (pids.length === 0) {
      return [];
    }

    return [{
      port,
      pids,
      details: describeListener(port),
    }];
  });
}
