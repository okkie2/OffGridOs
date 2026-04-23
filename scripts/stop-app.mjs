import process from 'node:process';
import { ALL_LOCAL_APP_PORTS, findOccupiedLocalAppPorts, LOCAL_APP_URL } from './local-runtime.mjs';

function terminatePid(pid) {
  try {
    process.kill(pid, 'SIGTERM');
    return true;
  } catch {
    return false;
  }
}

function main() {
  const occupiedPorts = findOccupiedLocalAppPorts();

  if (occupiedPorts.length === 0) {
    console.log(`No OffGridOS local listeners found on ports ${ALL_LOCAL_APP_PORTS.join(', ')}.`);
    return;
  }

  const uniquePids = [...new Set(occupiedPorts.flatMap(({ pids }) => pids))];
  const stoppedPids = uniquePids.filter((pid) => terminatePid(pid));

  if (stoppedPids.length === 0) {
    console.log(`Found local listeners blocking ${LOCAL_APP_URL}, but none could be stopped automatically.`);
  } else {
    console.log(`Stopped OffGridOS local listeners on ports ${occupiedPorts.map(({ port }) => port).join(', ')}.`);
    console.log(`Stopped PIDs: ${stoppedPids.join(', ')}`);
  }

  for (const occupied of occupiedPorts) {
    if (occupied.details) {
      console.log(`\nPort ${occupied.port} previously had:\n${occupied.details}`);
    }
  }
}

main();
