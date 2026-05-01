import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SERVER_BIN = 'node';
const SERVER_ENTRY = resolve('dist/server.js');
const TEST_HOST = '127.0.0.1';
const TEST_PORT = 38901;
const BASE_URL = `http://${TEST_HOST}:${TEST_PORT}`;

let serverProcess: ChildProcess | null = null;
let dbDir: string | null = null;

async function pollHealth(timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise<void>((r) => setTimeout(r, 100));
  }
  throw new Error('Server did not become healthy within timeout');
}

beforeEach(async () => {
  dbDir = mkdtempSync(join(tmpdir(), 'offgridos-http-'));
  const dbPath = join(dbDir, 'project.db');

  serverProcess = spawn(SERVER_BIN, [SERVER_ENTRY], {
    env: {
      ...process.env,
      DATABASE_PATH: dbPath,
      HOST: TEST_HOST,
      PORT: String(TEST_PORT),
      NODE_ENV: 'test',
    },
    stdio: 'ignore',
  });

  await pollHealth();
}, 30_000);

afterEach(() => {
  serverProcess?.kill('SIGTERM');
  serverProcess = null;
  if (dbDir) {
    rmSync(dbDir, { recursive: true, force: true });
    dbDir = null;
  }
});

async function getDigitalTwin() {
  const res = await fetch(`${BASE_URL}/api/digital-twin`);
  expect(res.status).toBe(200);
  return res.json() as Promise<{
    entities: {
      surfaces: Array<{ surface_id: string }>;
      battery_types: Array<{ battery_type_id: string }>;
      mppt_types: Array<{ mppt_type_id: string }>;
      panel_types: Array<{ panel_type_id: string }>;
      conversion_devices: Array<{
        conversion_device_id: string;
        output_voltage_v?: number | null;
        output_ac_voltage_v?: number | null;
        output_dc_voltage_v?: number | null;
      }>;
    };
  }>;
}

describe('GET /api/health', () => {
  it('returns 200 with ok flag', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});

describe('PUT /api/battery-bank-configuration', () => {
  it('accepts a valid single-battery configuration', async () => {
    const twin = await getDigitalTwin();
    const batteryTypeId = twin.entities.battery_types[0]?.battery_type_id;
    expect(batteryTypeId).toBeTruthy();

    const res = await fetch(`${BASE_URL}/api/battery-bank-configuration`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selected_battery_type_id: batteryTypeId,
        configured_battery_count: 1,
        batteries_per_string: 1,
        parallel_strings: 1,
        title: 'Test bank',
        notes: 'http-routes integration test',
      }),
    });
    expect(res.status).toBe(200);
  });

  it('rejects a count that does not equal batteries_per_string × parallel_strings', async () => {
    const twin = await getDigitalTwin();
    const batteryTypeId = twin.entities.battery_types[0]?.battery_type_id;

    const res = await fetch(`${BASE_URL}/api/battery-bank-configuration`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selected_battery_type_id: batteryTypeId,
        configured_battery_count: 4,
        batteries_per_string: 2,
        parallel_strings: 3,
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/batteries per string multiplied by parallel strings/i);
  });

  it('rejects count values below 1', async () => {
    const res = await fetch(`${BASE_URL}/api/battery-bank-configuration`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        configured_battery_count: 0,
        batteries_per_string: 0,
        parallel_strings: 0,
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/integer/i);
  });

  it('rejects an unknown battery type id', async () => {
    const res = await fetch(`${BASE_URL}/api/battery-bank-configuration`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selected_battery_type_id: 'nonexistent-battery-xxxx',
        configured_battery_count: 1,
        batteries_per_string: 1,
        parallel_strings: 1,
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain('not found');
  });
});

describe('PUT /api/surface-configurations/:surfaceId', () => {
  it('rejects non-zero panels_per_string when the surface has no panels', async () => {
    const twin = await getDigitalTwin();
    const surfaceId = twin.entities.surfaces[0]?.surface_id;
    expect(surfaceId).toBeTruthy();

    const res = await fetch(`${BASE_URL}/api/surface-configurations/${encodeURIComponent(surfaceId!)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        panels_per_string: 5,
        parallel_strings: 2,
        selected_mppt_type_id: '',
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/0 panels/i);
  });

  it('accepts a valid zero-layout for a surface with no panels', async () => {
    const twin = await getDigitalTwin();
    const surfaceId = twin.entities.surfaces[0]?.surface_id;
    expect(surfaceId).toBeTruthy();

    const res = await fetch(`${BASE_URL}/api/surface-configurations/${encodeURIComponent(surfaceId!)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        panels_per_string: 0,
        parallel_strings: 0,
        selected_mppt_type_id: '',
      }),
    });
    expect(res.status).toBe(200);
  });
});

describe('Load circuit and load routes', () => {
  it('supports creating a load circuit and a load', async () => {
    const twin = await getDigitalTwin();
    const conversionDeviceId = twin.entities.conversion_devices[0]?.conversion_device_id;
    expect(conversionDeviceId).toBeTruthy();

    const circuitRes = await fetch(`${BASE_URL}/api/load-circuits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversion_device_id: conversionDeviceId,
        title: 'Living room group',
      }),
    });
    expect(circuitRes.status).toBe(201);

    const circuitTwin = await circuitRes.json() as {
      entities: {
        load_circuits: Array<{ load_circuit_id: string }>;
      };
    };
    const loadCircuitId = circuitTwin.entities.load_circuits[0]?.load_circuit_id;
    expect(loadCircuitId).toBeTruthy();

    const loadRes = await fetch(`${BASE_URL}/api/loads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        load_circuit_id: loadCircuitId,
        title: 'Fridge',
        nominal_power_w: 120,
        surge_power_w: 450,
        standby_power_w: 30,
        expected_usage_hours_per_day: 8,
        daily_energy_kwh: 0.96,
      }),
    });
    expect(loadRes.status).toBe(201);
  });

  it('derives load power from the circuit voltage when only current is provided', async () => {
    const twin = await getDigitalTwin();
    const conversionDevice = twin.entities.conversion_devices.find((device) => (
      device.output_voltage_v != null || device.output_ac_voltage_v != null || device.output_dc_voltage_v != null
    ));
    expect(conversionDevice?.conversion_device_id).toBeTruthy();

    const circuitRes = await fetch(`${BASE_URL}/api/load-circuits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversion_device_id: conversionDevice!.conversion_device_id,
        title: 'Inherited voltage circuit',
      }),
    });
    expect(circuitRes.status).toBe(201);

    const circuitTwin = await circuitRes.json() as {
      entities: {
        load_circuits: Array<{ load_circuit_id: string }>;
      };
    };
    const loadCircuitId = circuitTwin.entities.load_circuits[0]?.load_circuit_id;
    expect(loadCircuitId).toBeTruthy();

    const currentA = 2;
    const circuitVoltageV = conversionDevice!.output_voltage_v ?? conversionDevice!.output_ac_voltage_v ?? conversionDevice!.output_dc_voltage_v ?? 0;
    const expectedPowerW = currentA * circuitVoltageV;

    const loadRes = await fetch(`${BASE_URL}/api/loads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        load_circuit_id: loadCircuitId,
        title: 'Current-only load',
        nominal_current_a: currentA,
        expected_usage_hours_per_day: 1,
      }),
    });
    expect(loadRes.status).toBe(201);

    const loadTwin = await loadRes.json() as {
      entities: {
        loads: Array<{ nominal_current_a?: number | null; nominal_power_w?: number | null }>;
      };
    };
    const load = loadTwin.entities.loads[0];
    expect(load.nominal_current_a).toBe(currentA);
    expect(load.nominal_power_w).toBeCloseTo(expectedPowerW, 5);
  });
});
