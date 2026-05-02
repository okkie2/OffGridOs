import fs from 'fs';
import path from 'path';
import http, { type IncomingMessage, type ServerResponse } from 'http';
import { createLocation, createProject, createSurface, deleteProject, deleteCabinetType, deleteConversionDevice, deleteLoad, deleteLoadCircuit, deleteProjectConverter, deleteSurface, deleteSurfacePanelAssignmentsForSurface, getBatteryBankConfiguration, getBatteryType, getCabinetType, getConversionDevice, getInverterType, getLoad, getLoadCircuit, getMpptType, getProject, getPreferences, getPanelType, getProjectConverter, getSurface, getSurfaceConfiguration, insertBatteryType, insertCabinetType, insertInverterType, insertMpptType, insertPanelType, listArrayToMpptMappings, listBatteryBankConfigurations, listBatteryTypes, listCabinetTypes, listConversionDevices, listInverterConfigurations, listInverterTypes, listLoadCircuits, listLoads, listLocations, listMpptTypes, listPanelTypes, listProjectConverters, listProjects, listPvArrays, listSurfaceConfigurations, listSurfacePanelAssignments, setPref, updateBatteryType, updateCabinetType, updateInverterType, updateMpptType, updatePanelType, updateProject, updateSurface, upsertBatteryBankConfiguration, upsertConversionDevice, upsertInverterConfiguration, upsertLoad, upsertLoadCircuit, upsertLocation, upsertProjectConverter, upsertSurfaceConfiguration, upsertSurfacePanelAssignment, syncPvTopologyForSurface } from './db/queries.js';
import { buildDigitalTwinExport } from './output/exportDigitalTwin.js';
import { importDigitalTwinExport } from './output/importDigitalTwin.js';
import { generateUniqueCatalogId } from './domain/panel-type-id.js';
import { resolveDatabasePath, resolveServerHost, resolveServerPort, resolveWebDistPath } from './config/runtime.js';
import { DEFAULT_PROJECT_ID } from './config/project.js';
import { ensureDatabaseReady, withDb } from './server/bootstrap.js';
import { DATABASE_PUBLISH_TOKEN_HEADER, hasValidDatabasePublishToken, publishDatabaseFile, resolveDatabasePublishToken } from './server/database-publish.js';

const databasePath = resolveDatabasePath();
const webDistPath = resolveWebDistPath();
const serverHost = resolveServerHost();
const serverPort = resolveServerPort();

const databasePublishToken = resolveDatabasePublishToken();

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(`${JSON.stringify(payload)}\n`);
}

function sendText(response: ServerResponse, statusCode: number, message: string): void {
  response.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(message);
}

async function readRequestBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const rawBody = (await readRequestBody(request)).toString('utf-8').trim();
  return (rawBody === '' ? {} : JSON.parse(rawBody)) as T;
}

type LoadPayload = {
  load_id?: unknown;
  load_circuit_id?: unknown;
  title?: unknown;
  description?: unknown;
  nominal_current_a?: unknown;
  nominal_power_w?: unknown;
  startup_current_a?: unknown;
  surge_power_w?: unknown;
  standby_power_w?: unknown;
  expected_usage_hours_per_day?: unknown;
  daily_energy_kwh?: unknown;
  duty_profile?: unknown;
  notes?: unknown;
  usage_kw?: unknown;
  spike_kw?: unknown;
  sleeping_kw?: unknown;
};

function readOptionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function readOptionalNumber(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }

  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function resolveLoadPowerW(payload: LoadPayload, circuitVoltageV: number | null): number | null {
  const nominalPowerW = readOptionalNumber(payload.nominal_power_w);
  if (nominalPowerW != null) {
    return nominalPowerW;
  }

  const nominalCurrentA = readOptionalNumber(payload.nominal_current_a);
  if (nominalCurrentA != null && circuitVoltageV != null) {
    return nominalCurrentA * circuitVoltageV;
  }

  const legacyUsageKw = readOptionalNumber(payload.usage_kw);
  if (legacyUsageKw != null) {
    return legacyUsageKw * 1000;
  }

  return null;
}

function resolveLoadSurgePowerW(payload: LoadPayload, circuitVoltageV: number | null): number | null {
  const surgePowerW = readOptionalNumber(payload.surge_power_w);
  if (surgePowerW != null) {
    return surgePowerW;
  }

  const startupCurrentA = readOptionalNumber(payload.startup_current_a);
  if (startupCurrentA != null && circuitVoltageV != null) {
    return startupCurrentA * circuitVoltageV;
  }

  const legacySpikeKw = readOptionalNumber(payload.spike_kw);
  if (legacySpikeKw != null) {
    return legacySpikeKw * 1000;
  }

  return null;
}

function resolveLoadStandbyPowerW(payload: LoadPayload): number | null {
  const standbyPowerW = readOptionalNumber(payload.standby_power_w);
  if (standbyPowerW != null) {
    return standbyPowerW;
  }

  const legacySleepingKw = readOptionalNumber(payload.sleeping_kw);
  if (legacySleepingKw != null) {
    return legacySleepingKw * 1000;
  }

  return null;
}

function resolveLoadDailyEnergyKwh(payload: LoadPayload, nominalPowerW: number | null): number | null {
  const dailyEnergyKwh = readOptionalNumber(payload.daily_energy_kwh);
  if (dailyEnergyKwh != null) {
    return dailyEnergyKwh;
  }

  const expectedUsageHoursPerDay = readOptionalNumber(payload.expected_usage_hours_per_day);
  if (expectedUsageHoursPerDay != null && nominalPowerW != null) {
    return (nominalPowerW / 1000) * expectedUsageHoursPerDay;
  }

  return null;
}

function isNonNegativeFinite(value: number | null): boolean {
  return value != null && Number.isFinite(value) && value >= 0;
}

function isNonNegativeFiniteOrNull(value: number | null): boolean {
  return value == null || isNonNegativeFinite(value);
}

function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function isValidNonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getContentType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.ico':
      return 'image/x-icon';
    default:
      return 'application/octet-stream';
  }
}

function serveFile(response: ServerResponse, filePath: string): void {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    sendText(response, 404, 'Not found');
    return;
  }

  response.writeHead(200, { 'Content-Type': getContentType(filePath) });
  fs.createReadStream(filePath).pipe(response);
}

function resolveStaticPath(urlPath: string): string | null {
  const normalizedPath = urlPath === '/' ? '/index.html' : urlPath;
  const decodedPath = decodeURIComponent(normalizedPath);
  const candidatePath = path.resolve(webDistPath, `.${decodedPath}`);

  if (!candidatePath.startsWith(webDistPath)) {
    return null;
  }

  return candidatePath;
}

function handleApiRequest(request: IncomingMessage, response: ServerResponse): boolean {
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? '/', 'http://localhost');

  if (!url.pathname.startsWith('/api/')) {
    return false;
  }

  const projectId = (request.headers['x-project-id'] as string | undefined)?.trim() || DEFAULT_PROJECT_ID;
  const locationId = (request.headers['x-location-id'] as string | undefined)?.trim() || null;

  if (method === 'GET' && url.pathname === '/api/health') {
    sendJson(response, 200, { ok: true });
    return true;
  }

  // ── Projects ──────────────────────────────────────────────────────────────

  if (method === 'GET' && url.pathname === '/api/projects') {
    try {
      const payload = withDb(databasePath, (db) => listProjects(db));
      sendJson(response, 200, payload);
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : 'Unknown server error' });
    }
    return true;
  }

  if (method === 'POST' && url.pathname === '/api/projects') {
    void (async () => {
      try {
        const body = await readJsonBody<{ title?: unknown }>(request);
        const title = isValidNonEmptyText(body.title) ? body.title.trim() : '';
        if (!title) {
          sendJson(response, 400, { error: 'title is required.' });
          return;
        }
        const newProjectId = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const project = withDb(databasePath, (db) => createProject(db, newProjectId, title));
        sendJson(response, 201, project);
      } catch (error) {
        sendJson(response, 500, { error: error instanceof Error ? error.message : 'Unknown server error' });
      }
    })();
    return true;
  }

  if (method === 'PUT' && url.pathname.startsWith('/api/projects/')) {
    const targetProjectId = decodeURIComponent(url.pathname.slice('/api/projects/'.length));
    void (async () => {
      try {
        const body = await readJsonBody<{ title?: unknown }>(request);
        const title = isValidNonEmptyText(body.title) ? body.title.trim() : '';
        if (!title) {
          sendJson(response, 400, { error: 'title is required.' });
          return;
        }
        const exists = withDb(databasePath, (db) => getProject(db, targetProjectId));
        if (!exists) {
          sendJson(response, 404, { error: `Project "${targetProjectId}" not found.` });
          return;
        }
        withDb(databasePath, (db) => updateProject(db, targetProjectId, title));
        sendJson(response, 200, { project_id: targetProjectId, title });
      } catch (error) {
        sendJson(response, 500, { error: error instanceof Error ? error.message : 'Unknown server error' });
      }
    })();
    return true;
  }

  if (method === 'DELETE' && url.pathname.startsWith('/api/projects/')) {
    const targetProjectId = decodeURIComponent(url.pathname.slice('/api/projects/'.length));
    if (targetProjectId === DEFAULT_PROJECT_ID) {
      sendJson(response, 400, { error: 'Cannot delete the default project.' });
      return true;
    }
    try {
      withDb(databasePath, (db) => deleteProject(db, targetProjectId));
      sendJson(response, 200, { ok: true });
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : 'Unknown server error' });
    }
    return true;
  }

  if (method === 'POST' && url.pathname === '/api/admin/publish-database') {
    void (async () => {
      if (!databasePublishToken) {
        sendJson(response, 503, { error: 'Database publish endpoint is disabled.' });
        return;
      }

      if (!hasValidDatabasePublishToken(request.headers, databasePublishToken)) {
        sendJson(response, 401, { error: `Missing or invalid ${DATABASE_PUBLISH_TOKEN_HEADER} header.` });
        return;
      }

      try {
        const payload = await readRequestBody(request);
        const result = publishDatabaseFile(databasePath, payload);
        const summary = withDb(databasePath, (db) => {
          const locations = (db.prepare('SELECT COUNT(*) AS count FROM locations').get() as { count: number } | undefined)?.count ?? 0;
          const surfaces = (db.prepare('SELECT COUNT(*) AS count FROM surfaces').get() as { count: number } | undefined)?.count ?? 0;
          const panels = (db.prepare('SELECT COUNT(*) AS count FROM panel_types').get() as { count: number } | undefined)?.count ?? 0;
          return { locations, surfaces, panel_types: panels };
        });

        console.log('[db] published database file', {
          databasePath,
          bytesWritten: result.bytesWritten,
          summary,
        });
        sendJson(response, 200, {
          ok: true,
          bytesWritten: result.bytesWritten,
          summary,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        console.error('[db] publish database failed', {
          databasePath,
          error: error instanceof Error ? { name: error.name, message: error.message } : error,
        });
        sendJson(response, 400, { error: message });
      }
    })();
    return true;
  }

  if (method === 'GET' && url.pathname === '/api/digital-twin') {
    try {
      const payload = withDb(databasePath, (db) => buildDigitalTwinExport(db, databasePath, projectId, locationId));
      sendJson(response, 200, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown server error';
      sendJson(response, 500, { error: message });
    }
    return true;
  }

  if (method === 'POST' && url.pathname === '/api/digital-twin/import') {
    void (async () => {
      try {
        const payload = await readJsonBody<unknown>(request);
        const imported = withDb(databasePath, (db) => importDigitalTwinExport(db, databasePath, payload));
        sendJson(response, 200, imported);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 400, { error: message });
      }
    })();
    return true;
  }

  if (method === 'GET' && url.pathname === '/api/battery-types') {
    try {
      const payload = withDb(databasePath, (db) => listBatteryTypes(db));
      sendJson(response, 200, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown server error';
      sendJson(response, 500, { error: message });
    }
    return true;
  }

  if (method === 'POST' && url.pathname === '/api/battery-types') {
    void (async () => {
      try {
        const payload = await readJsonBody<{
          battery_type_id?: unknown;
          brand?: unknown;
          model?: unknown;
          chemistry?: unknown;
          nominal_voltage?: unknown;
          capacity_ah?: unknown;
          capacity_kwh?: unknown;
          max_charge_rate?: unknown;
          max_discharge_rate?: unknown;
          victron_can?: unknown;
          cooling?: unknown;
          price?: unknown;
          price_source_url?: unknown;
          notes?: unknown;
        }>(request);

        const batteryTypeId = typeof payload.battery_type_id === 'string' ? payload.battery_type_id.trim() : '';
        const brand = typeof payload.brand === 'string' ? payload.brand.trim() : '';
        const model = typeof payload.model === 'string' ? payload.model.trim() : '';
        const chemistry = typeof payload.chemistry === 'string' ? payload.chemistry.trim() : '';
        const nominalVoltage = typeof payload.nominal_voltage === 'number' ? payload.nominal_voltage : Number(payload.nominal_voltage);
        const capacityAh = typeof payload.capacity_ah === 'number' ? payload.capacity_ah : Number(payload.capacity_ah);
        const capacityKwh = typeof payload.capacity_kwh === 'number' ? payload.capacity_kwh : Number(payload.capacity_kwh);
        const maxChargeRate = payload.max_charge_rate == null || payload.max_charge_rate === ''
          ? null
          : (typeof payload.max_charge_rate === 'number' ? payload.max_charge_rate : Number(payload.max_charge_rate));
        const maxDischargeRate = payload.max_discharge_rate == null || payload.max_discharge_rate === ''
          ? null
          : (typeof payload.max_discharge_rate === 'number' ? payload.max_discharge_rate : Number(payload.max_discharge_rate));
        const victronCan = payload.victron_can === true || payload.victron_can === 'true' || payload.victron_can === 1 || payload.victron_can === '1';
        const cooling = payload.cooling === 'active' ? 'active' : 'passive';
        const price = payload.price == null || payload.price === ''
          ? null
          : (typeof payload.price === 'number' ? payload.price : Number(payload.price));
        const priceSourceUrl = isValidNonEmptyText(payload.price_source_url) ? payload.price_source_url.trim() : null;
        const notes = isValidNonEmptyText(payload.notes) ? payload.notes.trim() : undefined;

        if (!model || !chemistry || !Number.isFinite(nominalVoltage) || nominalVoltage <= 0 || !Number.isFinite(capacityAh) || capacityAh <= 0 || !Number.isFinite(capacityKwh) || capacityKwh <= 0) {
          sendJson(response, 400, {
            error: 'Invalid battery type payload. Provide model, chemistry, nominal_voltage, capacity_ah, and capacity_kwh.',
          });
          return;
        }

        if ((maxChargeRate != null && !Number.isFinite(maxChargeRate)) || (maxDischargeRate != null && !Number.isFinite(maxDischargeRate)) || (price != null && !Number.isFinite(price))) {
          sendJson(response, 400, { error: 'Invalid battery type payload. Optional numeric fields must be valid numbers when provided.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const resolvedBatteryTypeId = batteryTypeId || generateUniqueCatalogId(model, listBatteryTypes(db).map((battery) => battery.battery_type_id));
          if (getBatteryType(db, resolvedBatteryTypeId)) {
            return { status: 409 as const, body: { error: `Battery type "${resolvedBatteryTypeId}" already exists.` } };
          }

          insertBatteryType(db, {
            battery_type_id: resolvedBatteryTypeId,
            brand,
            model,
            chemistry,
            nominal_voltage: nominalVoltage,
            capacity_ah: capacityAh,
            capacity_kwh: capacityKwh,
            max_charge_rate: maxChargeRate,
            max_discharge_rate: maxDischargeRate,
            victron_can: victronCan,
            cooling,
            price,
            price_source_url: priceSourceUrl,
            source: priceSourceUrl,
            url: priceSourceUrl,
            notes,
          });

          return { status: 201 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'PUT' && url.pathname.startsWith('/api/battery-types/')) {
    void (async () => {
      try {
        const batteryTypeId = decodeURIComponent(url.pathname.slice('/api/battery-types/'.length));
        if (!batteryTypeId) {
          sendJson(response, 400, { error: 'Battery type id is required.' });
          return;
        }

        const payload = await readJsonBody<{
          battery_type_id?: unknown;
          brand?: unknown;
          model?: unknown;
          chemistry?: unknown;
          nominal_voltage?: unknown;
          capacity_ah?: unknown;
          capacity_kwh?: unknown;
          max_charge_rate?: unknown;
          max_discharge_rate?: unknown;
          victron_can?: unknown;
          cooling?: unknown;
          price?: unknown;
          price_source_url?: unknown;
          notes?: unknown;
        }>(request);

        const bodyBatteryTypeId = typeof payload.battery_type_id === 'string' ? payload.battery_type_id.trim() : batteryTypeId;
        const brand = typeof payload.brand === 'string' ? payload.brand.trim() : '';
        const model = typeof payload.model === 'string' ? payload.model.trim() : '';
        const chemistry = typeof payload.chemistry === 'string' ? payload.chemistry.trim() : '';
        const nominalVoltage = typeof payload.nominal_voltage === 'number' ? payload.nominal_voltage : Number(payload.nominal_voltage);
        const capacityAh = typeof payload.capacity_ah === 'number' ? payload.capacity_ah : Number(payload.capacity_ah);
        const capacityKwh = typeof payload.capacity_kwh === 'number' ? payload.capacity_kwh : Number(payload.capacity_kwh);
        const maxChargeRate = payload.max_charge_rate == null || payload.max_charge_rate === ''
          ? null
          : (typeof payload.max_charge_rate === 'number' ? payload.max_charge_rate : Number(payload.max_charge_rate));
        const maxDischargeRate = payload.max_discharge_rate == null || payload.max_discharge_rate === ''
          ? null
          : (typeof payload.max_discharge_rate === 'number' ? payload.max_discharge_rate : Number(payload.max_discharge_rate));
        const victronCan = payload.victron_can === true || payload.victron_can === 'true' || payload.victron_can === 1 || payload.victron_can === '1';
        const cooling = payload.cooling === 'active' ? 'active' : 'passive';
        const price = payload.price == null || payload.price === ''
          ? null
          : (typeof payload.price === 'number' ? payload.price : Number(payload.price));
        const priceSourceUrl = isValidNonEmptyText(payload.price_source_url) ? payload.price_source_url.trim() : null;
        const notes = isValidNonEmptyText(payload.notes) ? payload.notes.trim() : undefined;

        if (bodyBatteryTypeId !== batteryTypeId) {
          sendJson(response, 400, { error: 'Battery type id in the URL must match the battery_type_id in the payload.' });
          return;
        }

        if (!model || !chemistry || !Number.isFinite(nominalVoltage) || nominalVoltage <= 0 || !Number.isFinite(capacityAh) || capacityAh <= 0 || !Number.isFinite(capacityKwh) || capacityKwh <= 0) {
          sendJson(response, 400, {
            error: 'Invalid battery type payload. Provide model, chemistry, nominal_voltage, capacity_ah, and capacity_kwh.',
          });
          return;
        }

        if ((maxChargeRate != null && !Number.isFinite(maxChargeRate)) || (maxDischargeRate != null && !Number.isFinite(maxDischargeRate)) || (price != null && !Number.isFinite(price))) {
          sendJson(response, 400, { error: 'Invalid battery type payload. Optional numeric fields must be valid numbers when provided.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const existing = getBatteryType(db, batteryTypeId);
          if (!existing) {
            return { status: 404 as const, body: { error: `Battery type "${batteryTypeId}" not found.` } };
          }

          updateBatteryType(db, {
            battery_type_id: batteryTypeId,
            brand,
            model,
            chemistry,
            nominal_voltage: nominalVoltage,
            capacity_ah: capacityAh,
            capacity_kwh: capacityKwh,
            max_charge_rate: maxChargeRate,
            max_discharge_rate: maxDischargeRate,
            victron_can: victronCan,
            cooling,
            price,
            price_source_url: priceSourceUrl,
            source: priceSourceUrl,
            url: priceSourceUrl,
            notes,
          });

          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'DELETE' && url.pathname.startsWith('/api/battery-types/')) {
    void (async () => {
      try {
        const batteryTypeId = decodeURIComponent(url.pathname.slice('/api/battery-types/'.length));
        if (!batteryTypeId) {
          sendJson(response, 400, { error: 'Battery type id is required.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const existing = getBatteryType(db, batteryTypeId);
          if (!existing) {
            return { status: 404 as const, body: { error: `Battery type "${batteryTypeId}" not found.` } };
          }

          const usedInConfiguration = listBatteryBankConfigurations(db, projectId).some((configuration) => configuration.selected_battery_type_id === batteryTypeId);
          const preferredBatteryTypeId = getPreferences(db, projectId).preferred_battery_type_id;

          if (usedInConfiguration || preferredBatteryTypeId === batteryTypeId) {
            return { status: 400 as const, body: { error: `Battery type "${batteryTypeId}" is still referenced by the current project configuration.` } };
          }

          db.prepare('DELETE FROM battery_types WHERE battery_type_id = ?').run(batteryTypeId);

          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'GET' && url.pathname === '/api/panel-types') {
    try {
      const payload = withDb(databasePath, (db) => listPanelTypes(db));
      sendJson(response, 200, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown server error';
      sendJson(response, 500, { error: message });
    }
    return true;
  }

  if (method === 'POST' && url.pathname === '/api/panel-types') {
    void (async () => {
      try {
        const payload = await readJsonBody<{
          panel_type_id?: unknown;
          brand?: unknown;
          model?: unknown;
          wp?: unknown;
          voc?: unknown;
          vmp?: unknown;
          isc?: unknown;
          imp?: unknown;
          length_mm?: unknown;
          width_mm?: unknown;
          temp_coefficient_voc_pct_per_c?: unknown;
          price?: unknown;
          price_source_url?: unknown;
          notes?: unknown;
        }>(request);

        const brand = typeof payload.brand === 'string' ? payload.brand.trim() : '';
        const model = typeof payload.model === 'string' ? payload.model.trim() : '';
        const panelTypeId = typeof payload.panel_type_id === 'string' ? payload.panel_type_id.trim() : '';
        const wp = typeof payload.wp === 'number' ? payload.wp : Number(payload.wp);
        const voc = typeof payload.voc === 'number' ? payload.voc : Number(payload.voc);
        const vmp = typeof payload.vmp === 'number' ? payload.vmp : Number(payload.vmp);
        const isc = typeof payload.isc === 'number' ? payload.isc : Number(payload.isc);
        const imp = typeof payload.imp === 'number' ? payload.imp : Number(payload.imp);
        const lengthMm = typeof payload.length_mm === 'number' ? payload.length_mm : Number(payload.length_mm);
        const widthMm = typeof payload.width_mm === 'number' ? payload.width_mm : Number(payload.width_mm);
        const tempCoeffVoc = payload.temp_coefficient_voc_pct_per_c == null || payload.temp_coefficient_voc_pct_per_c === ''
          ? null
          : (typeof payload.temp_coefficient_voc_pct_per_c === 'number' ? payload.temp_coefficient_voc_pct_per_c : Number(payload.temp_coefficient_voc_pct_per_c));
        const price = payload.price == null || payload.price === ''
          ? null
          : (typeof payload.price === 'number' ? payload.price : Number(payload.price));
        const priceSourceUrl = isValidNonEmptyText(payload.price_source_url) ? payload.price_source_url.trim() : null;
        const notes = isValidNonEmptyText(payload.notes) ? payload.notes.trim() : undefined;

        if (!model || !Number.isFinite(wp) || wp <= 0 || !Number.isFinite(voc) || voc <= 0 || !Number.isFinite(vmp) || vmp <= 0 || !Number.isFinite(isc) || isc <= 0 || !Number.isFinite(imp) || imp <= 0 || !Number.isFinite(lengthMm) || lengthMm <= 0 || !Number.isFinite(widthMm) || widthMm <= 0) {
          sendJson(response, 400, {
            error: 'Invalid panel type payload. Provide model, wp, voc, vmp, isc, imp, length_mm, and width_mm.',
          });
          return;
        }

        if (price != null && !Number.isFinite(price)) {
          sendJson(response, 400, { error: 'Invalid panel type payload. Price must be a valid number when provided.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const resolvedPanelTypeId = panelTypeId || generateUniqueCatalogId(model, listPanelTypes(db).map((panel) => panel.panel_type_id));
          if (getPanelType(db, resolvedPanelTypeId)) {
            return { status: 409 as const, body: { error: `Panel type "${resolvedPanelTypeId}" already exists.` } };
          }

          insertPanelType(db, {
            panel_type_id: resolvedPanelTypeId,
            brand,
            model,
            wp,
            voc,
            vmp,
            isc,
            imp,
            length_mm: lengthMm,
            width_mm: widthMm,
            temp_coefficient_voc_pct_per_c: tempCoeffVoc,
            price,
            price_source_url: priceSourceUrl,
            notes,
          });

          return { status: 201 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'PUT' && url.pathname.startsWith('/api/panel-types/')) {
    void (async () => {
      try {
        const panelTypeId = decodeURIComponent(url.pathname.slice('/api/panel-types/'.length));
        if (!panelTypeId) {
          sendJson(response, 400, { error: 'Panel type id is required.' });
          return;
        }

        const payload = await readJsonBody<{
          panel_type_id?: unknown;
          brand?: unknown;
          model?: unknown;
          wp?: unknown;
          voc?: unknown;
          vmp?: unknown;
          isc?: unknown;
          imp?: unknown;
          length_mm?: unknown;
          width_mm?: unknown;
          temp_coefficient_voc_pct_per_c?: unknown;
          price?: unknown;
          price_source_url?: unknown;
          notes?: unknown;
        }>(request);

        const bodyPanelTypeId = typeof payload.panel_type_id === 'string' ? payload.panel_type_id.trim() : panelTypeId;
        const brand = typeof payload.brand === 'string' ? payload.brand.trim() : '';
        const model = typeof payload.model === 'string' ? payload.model.trim() : '';
        const wp = typeof payload.wp === 'number' ? payload.wp : Number(payload.wp);
        const voc = typeof payload.voc === 'number' ? payload.voc : Number(payload.voc);
        const vmp = typeof payload.vmp === 'number' ? payload.vmp : Number(payload.vmp);
        const isc = typeof payload.isc === 'number' ? payload.isc : Number(payload.isc);
        const imp = typeof payload.imp === 'number' ? payload.imp : Number(payload.imp);
        const lengthMm = typeof payload.length_mm === 'number' ? payload.length_mm : Number(payload.length_mm);
        const widthMm = typeof payload.width_mm === 'number' ? payload.width_mm : Number(payload.width_mm);
        const tempCoeffVoc = payload.temp_coefficient_voc_pct_per_c == null || payload.temp_coefficient_voc_pct_per_c === ''
          ? null
          : (typeof payload.temp_coefficient_voc_pct_per_c === 'number' ? payload.temp_coefficient_voc_pct_per_c : Number(payload.temp_coefficient_voc_pct_per_c));
        const price = payload.price == null || payload.price === ''
          ? null
          : (typeof payload.price === 'number' ? payload.price : Number(payload.price));
        const priceSourceUrl = isValidNonEmptyText(payload.price_source_url) ? payload.price_source_url.trim() : null;
        const notes = isValidNonEmptyText(payload.notes) ? payload.notes.trim() : undefined;

        if (bodyPanelTypeId !== panelTypeId) {
          sendJson(response, 400, { error: 'Panel type id in the URL must match the panel_type_id in the payload.' });
          return;
        }

        if (!model || !Number.isFinite(wp) || wp <= 0 || !Number.isFinite(voc) || voc <= 0 || !Number.isFinite(vmp) || vmp <= 0 || !Number.isFinite(isc) || isc <= 0 || !Number.isFinite(imp) || imp <= 0 || !Number.isFinite(lengthMm) || lengthMm <= 0 || !Number.isFinite(widthMm) || widthMm <= 0) {
          sendJson(response, 400, {
            error: 'Invalid panel type payload. Provide model, wp, voc, vmp, isc, imp, length_mm, and width_mm.',
          });
          return;
        }

        if (price != null && !Number.isFinite(price)) {
          sendJson(response, 400, { error: 'Invalid panel type payload. Price must be a valid number when provided.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const existing = getPanelType(db, panelTypeId);
          if (!existing) {
            return { status: 404 as const, body: { error: `Panel type "${panelTypeId}" not found.` } };
          }

          updatePanelType(db, {
            panel_type_id: panelTypeId,
            brand,
            model,
            wp,
            voc,
            vmp,
            isc,
            imp,
            length_mm: lengthMm,
            width_mm: widthMm,
            temp_coefficient_voc_pct_per_c: tempCoeffVoc,
            price,
            price_source_url: priceSourceUrl,
            notes,
          });

          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'DELETE' && url.pathname.startsWith('/api/panel-types/')) {
    void (async () => {
      try {
        const panelTypeId = decodeURIComponent(url.pathname.slice('/api/panel-types/'.length));
        if (!panelTypeId) {
          sendJson(response, 400, { error: 'Panel type id is required.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const existing = getPanelType(db, panelTypeId);
          if (!existing) {
            return { status: 404 as const, body: { error: `Panel type "${panelTypeId}" not found.` } };
          }

          const usedInRoofPanel = listSurfacePanelAssignments(db).some((assignment) => assignment.panel_type_id === panelTypeId);
          if (usedInRoofPanel) {
            return { status: 400 as const, body: { error: `Panel type "${panelTypeId}" is still referenced by roof panel assignments.` } };
          }

          db.prepare('DELETE FROM panel_types WHERE panel_type_id = ?').run(panelTypeId);
          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'GET' && url.pathname === '/api/cabinet-types') {
    try {
      const payload = withDb(databasePath, (db) => listCabinetTypes(db));
      sendJson(response, 200, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown server error';
      sendJson(response, 500, { error: message });
    }
    return true;
  }

  if (method === 'POST' && url.pathname === '/api/cabinet-types') {
    void (async () => {
      try {
        const payload = await readJsonBody<{
          cabinet_type_id?: unknown;
          title?: unknown;
          description?: unknown;
          depth_mm?: unknown;
          width_mm?: unknown;
          height_mm?: unknown;
          units?: unknown;
          price?: unknown;
          price_source_url?: unknown;
          condensation_protection?: unknown;
          insect_protection?: unknown;
          dust_protection?: unknown;
          outside_protection?: unknown;
          frost_protection?: unknown;
          fire_protection?: unknown;
          ip_rating?: unknown;
          insurance_rating?: unknown;
        }>(request);

        const cabinetTypeId = typeof payload.cabinet_type_id === 'string' ? payload.cabinet_type_id.trim() : '';
        const title = typeof payload.title === 'string' ? payload.title.trim() : '';
        const description = isValidNonEmptyText(payload.description) ? payload.description.trim() : null;
        const depthMm = typeof payload.depth_mm === 'number' ? payload.depth_mm : Number(payload.depth_mm);
        const widthMm = typeof payload.width_mm === 'number' ? payload.width_mm : Number(payload.width_mm);
        const heightMm = typeof payload.height_mm === 'number' ? payload.height_mm : Number(payload.height_mm);
        const units = isValidNonEmptyText(payload.units) ? payload.units.trim() : '';
        const price = payload.price == null || payload.price === ''
          ? null
          : (typeof payload.price === 'number' ? payload.price : Number(payload.price));
        const priceSourceUrl = isValidNonEmptyText(payload.price_source_url) ? payload.price_source_url.trim() : null;
        const condensationProtection = payload.condensation_protection === true || payload.condensation_protection === 1 || payload.condensation_protection === '1' || payload.condensation_protection === 'true';
        const insectProtection = payload.insect_protection === true || payload.insect_protection === 1 || payload.insect_protection === '1' || payload.insect_protection === 'true';
        const dustProtection = payload.dust_protection === true || payload.dust_protection === 1 || payload.dust_protection === '1' || payload.dust_protection === 'true';
        const outsideProtection = payload.outside_protection === true || payload.outside_protection === 1 || payload.outside_protection === '1' || payload.outside_protection === 'true';
        const frostProtection = payload.frost_protection === true || payload.frost_protection === 1 || payload.frost_protection === '1' || payload.frost_protection === 'true';
        const fireProtection = payload.fire_protection === true || payload.fire_protection === 1 || payload.fire_protection === '1' || payload.fire_protection === 'true';
        const ipRating = isValidNonEmptyText(payload.ip_rating) ? payload.ip_rating.trim() : null;
        const insuranceRating = isValidNonEmptyText(payload.insurance_rating) ? payload.insurance_rating.trim() : null;

        if (!title || !units || !Number.isFinite(depthMm) || depthMm <= 0 || !Number.isFinite(widthMm) || widthMm <= 0 || !Number.isFinite(heightMm) || heightMm <= 0) {
          sendJson(response, 400, {
            error: 'Invalid cabinet type payload. Provide title, units, depth_mm, width_mm, and height_mm.',
          });
          return;
        }

        if (price != null && !Number.isFinite(price)) {
          sendJson(response, 400, { error: 'Invalid cabinet type payload. Price must be a valid number when provided.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const resolvedCabinetTypeId = cabinetTypeId || generateUniqueCatalogId(title, listCabinetTypes(db).map((cabinet) => cabinet.cabinet_type_id));
          if (getCabinetType(db, resolvedCabinetTypeId)) {
            return { status: 409 as const, body: { error: `Cabinet type "${resolvedCabinetTypeId}" already exists.` } };
          }

          insertCabinetType(db, {
            cabinet_type_id: resolvedCabinetTypeId,
            title,
            description,
            depth_mm: depthMm,
            width_mm: widthMm,
            height_mm: heightMm,
            units,
            price,
            price_source_url: priceSourceUrl,
            condensation_protection: condensationProtection,
            insect_protection: insectProtection,
            dust_protection: dustProtection,
            outside_protection: outsideProtection,
            frost_protection: frostProtection,
            fire_protection: fireProtection,
            ip_rating: ipRating,
            insurance_rating: insuranceRating,
          });

          return { status: 201 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'PUT' && url.pathname.startsWith('/api/cabinet-types/')) {
    void (async () => {
      try {
        const cabinetTypeId = decodeURIComponent(url.pathname.slice('/api/cabinet-types/'.length));
        if (!cabinetTypeId) {
          sendJson(response, 400, { error: 'Cabinet type id is required.' });
          return;
        }

        const payload = await readJsonBody<{
          cabinet_type_id?: unknown;
          title?: unknown;
          description?: unknown;
          depth_mm?: unknown;
          width_mm?: unknown;
          height_mm?: unknown;
          units?: unknown;
          price?: unknown;
          price_source_url?: unknown;
          condensation_protection?: unknown;
          insect_protection?: unknown;
          dust_protection?: unknown;
          outside_protection?: unknown;
          frost_protection?: unknown;
          fire_protection?: unknown;
          ip_rating?: unknown;
          insurance_rating?: unknown;
        }>(request);

        const bodyCabinetTypeId = typeof payload.cabinet_type_id === 'string' ? payload.cabinet_type_id.trim() : cabinetTypeId;
        const title = typeof payload.title === 'string' ? payload.title.trim() : '';
        const description = isValidNonEmptyText(payload.description) ? payload.description.trim() : null;
        const depthMm = typeof payload.depth_mm === 'number' ? payload.depth_mm : Number(payload.depth_mm);
        const widthMm = typeof payload.width_mm === 'number' ? payload.width_mm : Number(payload.width_mm);
        const heightMm = typeof payload.height_mm === 'number' ? payload.height_mm : Number(payload.height_mm);
        const units = isValidNonEmptyText(payload.units) ? payload.units.trim() : '';
        const price = payload.price == null || payload.price === ''
          ? null
          : (typeof payload.price === 'number' ? payload.price : Number(payload.price));
        const priceSourceUrl = isValidNonEmptyText(payload.price_source_url) ? payload.price_source_url.trim() : null;
        const condensationProtection = payload.condensation_protection === true || payload.condensation_protection === 1 || payload.condensation_protection === '1' || payload.condensation_protection === 'true';
        const insectProtection = payload.insect_protection === true || payload.insect_protection === 1 || payload.insect_protection === '1' || payload.insect_protection === 'true';
        const dustProtection = payload.dust_protection === true || payload.dust_protection === 1 || payload.dust_protection === '1' || payload.dust_protection === 'true';
        const outsideProtection = payload.outside_protection === true || payload.outside_protection === 1 || payload.outside_protection === '1' || payload.outside_protection === 'true';
        const frostProtection = payload.frost_protection === true || payload.frost_protection === 1 || payload.frost_protection === '1' || payload.frost_protection === 'true';
        const fireProtection = payload.fire_protection === true || payload.fire_protection === 1 || payload.fire_protection === '1' || payload.fire_protection === 'true';
        const ipRating = isValidNonEmptyText(payload.ip_rating) ? payload.ip_rating.trim() : null;
        const insuranceRating = isValidNonEmptyText(payload.insurance_rating) ? payload.insurance_rating.trim() : null;

        if (bodyCabinetTypeId !== cabinetTypeId) {
          sendJson(response, 400, { error: 'Cabinet type id in the URL must match the cabinet_type_id in the payload.' });
          return;
        }

        if (!title || !units || !Number.isFinite(depthMm) || depthMm <= 0 || !Number.isFinite(widthMm) || widthMm <= 0 || !Number.isFinite(heightMm) || heightMm <= 0) {
          sendJson(response, 400, {
            error: 'Invalid cabinet type payload. Provide title, units, depth_mm, width_mm, and height_mm.',
          });
          return;
        }

        if (price != null && !Number.isFinite(price)) {
          sendJson(response, 400, { error: 'Invalid cabinet type payload. Price must be a valid number when provided.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const existing = getCabinetType(db, cabinetTypeId);
          if (!existing) {
            return { status: 404 as const, body: { error: `Cabinet type "${cabinetTypeId}" not found.` } };
          }

          updateCabinetType(db, {
            cabinet_type_id: cabinetTypeId,
            title,
            description,
            depth_mm: depthMm,
            width_mm: widthMm,
            height_mm: heightMm,
            units,
            price,
            price_source_url: priceSourceUrl,
            condensation_protection: condensationProtection,
            insect_protection: insectProtection,
            dust_protection: dustProtection,
            outside_protection: outsideProtection,
            frost_protection: frostProtection,
            fire_protection: fireProtection,
            ip_rating: ipRating,
            insurance_rating: insuranceRating,
          });

          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'DELETE' && url.pathname.startsWith('/api/cabinet-types/')) {
    void (async () => {
      try {
        const cabinetTypeId = decodeURIComponent(url.pathname.slice('/api/cabinet-types/'.length));
        if (!cabinetTypeId) {
          sendJson(response, 400, { error: 'Cabinet type id is required.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const existing = getCabinetType(db, cabinetTypeId);
          if (!existing) {
            return { status: 404 as const, body: { error: `Cabinet type "${cabinetTypeId}" not found.` } };
          }

          deleteCabinetType(db, cabinetTypeId);
          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'GET' && url.pathname === '/api/mppt-types') {
    try {
      const payload = withDb(databasePath, (db) => listMpptTypes(db));
      sendJson(response, 200, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown server error';
      sendJson(response, 500, { error: message });
    }
    return true;
  }

  if (method === 'POST' && url.pathname === '/api/mppt-types') {
    void (async () => {
      try {
        const payload = await readJsonBody<{
          mppt_type_id?: unknown;
          brand?: unknown;
          model?: unknown;
          tracker_count?: unknown;
          max_voc?: unknown;
          max_pv_power?: unknown;
          max_pv_input_current_a?: unknown;
          max_pv_short_circuit_current_a?: unknown;
          max_charge_current?: unknown;
          nominal_battery_voltage?: unknown;
          price?: unknown;
          price_source_url?: unknown;
          notes?: unknown;
        }>(request);

        const brand = typeof payload.brand === 'string' ? payload.brand.trim() : '';
        const model = typeof payload.model === 'string' ? payload.model.trim() : '';
        const mpptTypeId = typeof payload.mppt_type_id === 'string' ? payload.mppt_type_id.trim() : '';
        const trackerCount = typeof payload.tracker_count === 'number' ? payload.tracker_count : Number(payload.tracker_count);
        const maxVoc = typeof payload.max_voc === 'number' ? payload.max_voc : Number(payload.max_voc);
        const maxPvPower = typeof payload.max_pv_power === 'number' ? payload.max_pv_power : Number(payload.max_pv_power);
        const maxPvInputCurrentA = payload.max_pv_input_current_a == null || payload.max_pv_input_current_a === ''
          ? null
          : (typeof payload.max_pv_input_current_a === 'number' ? payload.max_pv_input_current_a : Number(payload.max_pv_input_current_a));
        const maxPvShortCircuitCurrentA = payload.max_pv_short_circuit_current_a == null || payload.max_pv_short_circuit_current_a === ''
          ? null
          : (typeof payload.max_pv_short_circuit_current_a === 'number' ? payload.max_pv_short_circuit_current_a : Number(payload.max_pv_short_circuit_current_a));
        const maxChargeCurrent = typeof payload.max_charge_current === 'number' ? payload.max_charge_current : Number(payload.max_charge_current);
        const nominalBatteryVoltage = typeof payload.nominal_battery_voltage === 'number' ? payload.nominal_battery_voltage : Number(payload.nominal_battery_voltage);
        const price = payload.price == null || payload.price === ''
          ? null
          : (typeof payload.price === 'number' ? payload.price : Number(payload.price));
        const priceSourceUrl = isValidNonEmptyText(payload.price_source_url) ? payload.price_source_url.trim() : null;
        const notes = isValidNonEmptyText(payload.notes) ? payload.notes.trim() : undefined;

        if (!model || !Number.isInteger(trackerCount) || trackerCount < 1 || !Number.isFinite(maxVoc) || maxVoc <= 0 || !Number.isFinite(maxPvPower) || maxPvPower <= 0 || !Number.isFinite(maxChargeCurrent) || maxChargeCurrent <= 0 || !Number.isFinite(nominalBatteryVoltage) || nominalBatteryVoltage <= 0) {
          sendJson(response, 400, {
            error: 'Invalid MPPT type payload. Provide model, tracker_count, max_voc, max_pv_power, max_charge_current, and nominal_battery_voltage.',
          });
          return;
        }

        if ((maxPvInputCurrentA != null && !Number.isFinite(maxPvInputCurrentA)) || (maxPvShortCircuitCurrentA != null && !Number.isFinite(maxPvShortCircuitCurrentA))) {
          sendJson(response, 400, { error: 'Invalid MPPT type payload. Optional PV current fields must be valid numbers when provided.' });
          return;
        }

        if (price != null && !Number.isFinite(price)) {
          sendJson(response, 400, { error: 'Invalid MPPT type payload. Price must be a valid number when provided.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const resolvedMpptTypeId = mpptTypeId || generateUniqueCatalogId(model, listMpptTypes(db).map((mppt) => mppt.mppt_type_id));
          if (getMpptType(db, resolvedMpptTypeId)) {
            return { status: 409 as const, body: { error: `MPPT type "${resolvedMpptTypeId}" already exists.` } };
          }

          insertMpptType(db, {
            mppt_type_id: resolvedMpptTypeId,
            brand,
            model,
            tracker_count: trackerCount,
            max_voc: maxVoc,
            max_pv_power: maxPvPower,
            max_pv_input_current_a: maxPvInputCurrentA,
            max_pv_short_circuit_current_a: maxPvShortCircuitCurrentA,
            max_charge_current: maxChargeCurrent,
            nominal_battery_voltage: nominalBatteryVoltage,
            price,
            price_source_url: priceSourceUrl,
            notes,
          });

          return { status: 201 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'PUT' && url.pathname.startsWith('/api/mppt-types/')) {
    void (async () => {
      try {
        const mpptTypeId = decodeURIComponent(url.pathname.slice('/api/mppt-types/'.length));
        if (!mpptTypeId) {
          sendJson(response, 400, { error: 'MPPT type id is required.' });
          return;
        }

        const payload = await readJsonBody<{
          mppt_type_id?: unknown;
          brand?: unknown;
          model?: unknown;
          tracker_count?: unknown;
          max_voc?: unknown;
          max_pv_power?: unknown;
          max_pv_input_current_a?: unknown;
          max_pv_short_circuit_current_a?: unknown;
          max_charge_current?: unknown;
          nominal_battery_voltage?: unknown;
          price?: unknown;
          price_source_url?: unknown;
          notes?: unknown;
        }>(request);

        const bodyMpptTypeId = typeof payload.mppt_type_id === 'string' ? payload.mppt_type_id.trim() : mpptTypeId;
        const brand = typeof payload.brand === 'string' ? payload.brand.trim() : '';
        const model = typeof payload.model === 'string' ? payload.model.trim() : '';
        const trackerCount = typeof payload.tracker_count === 'number' ? payload.tracker_count : Number(payload.tracker_count);
        const maxVoc = typeof payload.max_voc === 'number' ? payload.max_voc : Number(payload.max_voc);
        const maxPvPower = typeof payload.max_pv_power === 'number' ? payload.max_pv_power : Number(payload.max_pv_power);
        const maxPvInputCurrentA = payload.max_pv_input_current_a == null || payload.max_pv_input_current_a === ''
          ? null
          : (typeof payload.max_pv_input_current_a === 'number' ? payload.max_pv_input_current_a : Number(payload.max_pv_input_current_a));
        const maxPvShortCircuitCurrentA = payload.max_pv_short_circuit_current_a == null || payload.max_pv_short_circuit_current_a === ''
          ? null
          : (typeof payload.max_pv_short_circuit_current_a === 'number' ? payload.max_pv_short_circuit_current_a : Number(payload.max_pv_short_circuit_current_a));
        const maxChargeCurrent = typeof payload.max_charge_current === 'number' ? payload.max_charge_current : Number(payload.max_charge_current);
        const nominalBatteryVoltage = typeof payload.nominal_battery_voltage === 'number' ? payload.nominal_battery_voltage : Number(payload.nominal_battery_voltage);
        const price = payload.price == null || payload.price === ''
          ? null
          : (typeof payload.price === 'number' ? payload.price : Number(payload.price));
        const priceSourceUrl = isValidNonEmptyText(payload.price_source_url) ? payload.price_source_url.trim() : null;
        const notes = isValidNonEmptyText(payload.notes) ? payload.notes.trim() : undefined;

        if (bodyMpptTypeId !== mpptTypeId) {
          sendJson(response, 400, { error: 'MPPT type id in the URL must match the mppt_type_id in the payload.' });
          return;
        }

        if (!model || !Number.isInteger(trackerCount) || trackerCount < 1 || !Number.isFinite(maxVoc) || maxVoc <= 0 || !Number.isFinite(maxPvPower) || maxPvPower <= 0 || !Number.isFinite(maxChargeCurrent) || maxChargeCurrent <= 0 || !Number.isFinite(nominalBatteryVoltage) || nominalBatteryVoltage <= 0) {
          sendJson(response, 400, {
            error: 'Invalid MPPT type payload. Provide model, tracker_count, max_voc, max_pv_power, max_charge_current, and nominal_battery_voltage.',
          });
          return;
        }

        if ((maxPvInputCurrentA != null && !Number.isFinite(maxPvInputCurrentA)) || (maxPvShortCircuitCurrentA != null && !Number.isFinite(maxPvShortCircuitCurrentA))) {
          sendJson(response, 400, { error: 'Invalid MPPT type payload. Optional PV current fields must be valid numbers when provided.' });
          return;
        }

        if (price != null && !Number.isFinite(price)) {
          sendJson(response, 400, { error: 'Invalid MPPT type payload. Price must be a valid number when provided.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const existing = getMpptType(db, mpptTypeId);
          if (!existing) {
            return { status: 404 as const, body: { error: `MPPT type "${mpptTypeId}" not found.` } };
          }

          updateMpptType(db, {
            mppt_type_id: mpptTypeId,
            brand,
            model,
            tracker_count: trackerCount,
            max_voc: maxVoc,
            max_pv_power: maxPvPower,
            max_pv_input_current_a: maxPvInputCurrentA,
            max_pv_short_circuit_current_a: maxPvShortCircuitCurrentA,
            max_charge_current: maxChargeCurrent,
            nominal_battery_voltage: nominalBatteryVoltage,
            price,
            price_source_url: priceSourceUrl,
            notes,
          });

          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'DELETE' && url.pathname.startsWith('/api/mppt-types/')) {
    void (async () => {
      try {
        const mpptTypeId = decodeURIComponent(url.pathname.slice('/api/mppt-types/'.length));
        if (!mpptTypeId) {
          sendJson(response, 400, { error: 'MPPT type id is required.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const existing = getMpptType(db, mpptTypeId);
          if (!existing) {
            return { status: 404 as const, body: { error: `MPPT type "${mpptTypeId}" not found.` } };
          }

          const usedInFaceConfiguration = listSurfaceConfigurations(db, projectId).some((configuration) => configuration.selected_mppt_type_id === mpptTypeId);
          if (usedInFaceConfiguration) {
            return { status: 400 as const, body: { error: `MPPT type "${mpptTypeId}" is still referenced by surface configurations.` } };
          }

          db.prepare('DELETE FROM mppt_types WHERE mppt_type_id = ?').run(mpptTypeId);
          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'GET' && url.pathname === '/api/inverter-types') {
    try {
      const payload = withDb(databasePath, (db) => listInverterTypes(db));
      sendJson(response, 200, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown server error';
      sendJson(response, 500, { error: message });
    }
    return true;
  }

  if (method === 'POST' && url.pathname === '/api/inverter-types') {
    void (async () => {
      try {
        const payload = await readJsonBody<{
          inverter_id?: unknown;
          brand?: unknown;
          model?: unknown;
          input_voltage_v?: unknown;
          output_voltage_v?: unknown;
          continuous_power_w?: unknown;
          peak_power_va?: unknown;
          max_charge_current_a?: unknown;
          efficiency_pct?: unknown;
          price?: unknown;
          price_source_url?: unknown;
          notes?: unknown;
        }>(request);

        const brand = typeof payload.brand === 'string' ? payload.brand.trim() : '';
        const model = typeof payload.model === 'string' ? payload.model.trim() : '';
        const inverterId = typeof payload.inverter_id === 'string' ? payload.inverter_id.trim() : '';
        const inputVoltageV = typeof payload.input_voltage_v === 'number' ? payload.input_voltage_v : Number(payload.input_voltage_v);
        const outputVoltageV = typeof payload.output_voltage_v === 'number' ? payload.output_voltage_v : Number(payload.output_voltage_v);
        const continuousPowerW = typeof payload.continuous_power_w === 'number' ? payload.continuous_power_w : Number(payload.continuous_power_w);
        const peakPowerVA = typeof payload.peak_power_va === 'number' ? payload.peak_power_va : Number(payload.peak_power_va);
        const maxChargeCurrentA = typeof payload.max_charge_current_a === 'number' ? payload.max_charge_current_a : Number(payload.max_charge_current_a);
        const efficiencyPct = payload.efficiency_pct == null || payload.efficiency_pct === ''
          ? null
          : (typeof payload.efficiency_pct === 'number' ? payload.efficiency_pct : Number(payload.efficiency_pct));
        const price = payload.price == null || payload.price === ''
          ? null
          : (typeof payload.price === 'number' ? payload.price : Number(payload.price));
        const priceSourceUrl = isValidNonEmptyText(payload.price_source_url) ? payload.price_source_url.trim() : null;
        const notes = isValidNonEmptyText(payload.notes) ? payload.notes.trim() : undefined;

        if (!model || !Number.isFinite(inputVoltageV) || inputVoltageV <= 0 || !Number.isFinite(outputVoltageV) || outputVoltageV <= 0 || !Number.isFinite(continuousPowerW) || continuousPowerW <= 0 || !Number.isFinite(peakPowerVA) || peakPowerVA <= 0 || !Number.isFinite(maxChargeCurrentA) || maxChargeCurrentA <= 0) {
          sendJson(response, 400, {
            error: 'Invalid inverter type payload. Provide model, input_voltage_v, output_voltage_v, continuous_power_w, peak_power_va, and max_charge_current_a.',
          });
          return;
        }

        if ((efficiencyPct != null && !Number.isFinite(efficiencyPct)) || (price != null && !Number.isFinite(price))) {
          sendJson(response, 400, { error: 'Invalid inverter type payload. Optional numeric fields must be valid numbers when provided.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const resolvedInverterId = inverterId || generateUniqueCatalogId(model, listInverterTypes(db).map((inverter) => inverter.inverter_id));
          if (getInverterType(db, resolvedInverterId)) {
            return { status: 409 as const, body: { error: `Inverter type "${resolvedInverterId}" already exists.` } };
          }

          insertInverterType(db, {
            inverter_id: resolvedInverterId,
            brand,
            model,
            input_voltage_v: inputVoltageV,
            output_voltage_v: outputVoltageV,
            continuous_power_w: continuousPowerW,
            peak_power_va: peakPowerVA,
            max_charge_current_a: maxChargeCurrentA,
            efficiency_pct: efficiencyPct,
          price,
            price_source_url: priceSourceUrl,
            notes,
        });

          upsertConversionDevice(db, {
            converter_type_id: resolvedInverterId,
            title: model,
            description: notes ?? null,
            device_type: 'inverter',
            input_voltage_v: inputVoltageV,
            output_voltage_v: outputVoltageV,
            continuous_power_w: continuousPowerW,
            peak_power_va: peakPowerVA,
            max_charge_current_a: maxChargeCurrentA,
            efficiency_pct: efficiencyPct,
            output_ac_voltage_v: outputVoltageV,
            frequency_hz: null,
            surge_power_w: null,
            output_dc_voltage_v: null,
            max_output_current_a: null,
            price,
            price_source_url: priceSourceUrl,
            notes,
          });

          return { status: 201 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'PUT' && url.pathname.startsWith('/api/inverter-types/')) {
    void (async () => {
      try {
        const inverterId = decodeURIComponent(url.pathname.slice('/api/inverter-types/'.length));
        if (!inverterId) {
          sendJson(response, 400, { error: 'Inverter type id is required.' });
          return;
        }

        const payload = await readJsonBody<{
          inverter_id?: unknown;
          brand?: unknown;
          model?: unknown;
          input_voltage_v?: unknown;
          output_voltage_v?: unknown;
          continuous_power_w?: unknown;
          peak_power_va?: unknown;
          max_charge_current_a?: unknown;
          efficiency_pct?: unknown;
          price?: unknown;
          price_source_url?: unknown;
          notes?: unknown;
        }>(request);

        const bodyInverterId = typeof payload.inverter_id === 'string' ? payload.inverter_id.trim() : inverterId;
        const brand = typeof payload.brand === 'string' ? payload.brand.trim() : '';
        const model = typeof payload.model === 'string' ? payload.model.trim() : '';
        const inputVoltageV = typeof payload.input_voltage_v === 'number' ? payload.input_voltage_v : Number(payload.input_voltage_v);
        const outputVoltageV = typeof payload.output_voltage_v === 'number' ? payload.output_voltage_v : Number(payload.output_voltage_v);
        const continuousPowerW = typeof payload.continuous_power_w === 'number' ? payload.continuous_power_w : Number(payload.continuous_power_w);
        const peakPowerVA = typeof payload.peak_power_va === 'number' ? payload.peak_power_va : Number(payload.peak_power_va);
        const maxChargeCurrentA = typeof payload.max_charge_current_a === 'number' ? payload.max_charge_current_a : Number(payload.max_charge_current_a);
        const efficiencyPct = payload.efficiency_pct == null || payload.efficiency_pct === ''
          ? null
          : (typeof payload.efficiency_pct === 'number' ? payload.efficiency_pct : Number(payload.efficiency_pct));
        const price = payload.price == null || payload.price === ''
          ? null
          : (typeof payload.price === 'number' ? payload.price : Number(payload.price));
        const priceSourceUrl = isValidNonEmptyText(payload.price_source_url) ? payload.price_source_url.trim() : null;
        const notes = isValidNonEmptyText(payload.notes) ? payload.notes.trim() : undefined;

        if (bodyInverterId !== inverterId) {
          sendJson(response, 400, { error: 'Inverter type id in the URL must match the inverter_id in the payload.' });
          return;
        }

        if (!model || !Number.isFinite(inputVoltageV) || inputVoltageV <= 0 || !Number.isFinite(outputVoltageV) || outputVoltageV <= 0 || !Number.isFinite(continuousPowerW) || continuousPowerW <= 0 || !Number.isFinite(peakPowerVA) || peakPowerVA <= 0 || !Number.isFinite(maxChargeCurrentA) || maxChargeCurrentA <= 0) {
          sendJson(response, 400, {
            error: 'Invalid inverter type payload. Provide model, input_voltage_v, output_voltage_v, continuous_power_w, peak_power_va, and max_charge_current_a.',
          });
          return;
        }

        if ((efficiencyPct != null && !Number.isFinite(efficiencyPct)) || (price != null && !Number.isFinite(price))) {
          sendJson(response, 400, { error: 'Invalid inverter type payload. Optional numeric fields must be valid numbers when provided.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const existing = getInverterType(db, inverterId);
          if (!existing) {
            return { status: 404 as const, body: { error: `Inverter type "${inverterId}" not found.` } };
          }

          updateInverterType(db, {
            inverter_id: inverterId,
            brand,
            model,
            input_voltage_v: inputVoltageV,
            output_voltage_v: outputVoltageV,
            continuous_power_w: continuousPowerW,
            peak_power_va: peakPowerVA,
            max_charge_current_a: maxChargeCurrentA,
            efficiency_pct: efficiencyPct,
          price,
            price_source_url: priceSourceUrl,
            notes,
        });

          upsertConversionDevice(db, {
            converter_type_id: inverterId,
            title: model,
            description: notes ?? null,
            device_type: 'inverter',
            input_voltage_v: inputVoltageV,
            output_voltage_v: outputVoltageV,
            continuous_power_w: continuousPowerW,
            peak_power_va: peakPowerVA,
            max_charge_current_a: maxChargeCurrentA,
            efficiency_pct: efficiencyPct,
            output_ac_voltage_v: outputVoltageV,
            frequency_hz: null,
            surge_power_w: null,
            output_dc_voltage_v: null,
            max_output_current_a: null,
            price,
            price_source_url: priceSourceUrl,
            notes,
          });

          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'DELETE' && url.pathname.startsWith('/api/inverter-types/')) {
    void (async () => {
      try {
        const inverterId = decodeURIComponent(url.pathname.slice('/api/inverter-types/'.length));
        if (!inverterId) {
          sendJson(response, 400, { error: 'Inverter type id is required.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const existing = getInverterType(db, inverterId);
          if (!existing) {
            return { status: 404 as const, body: { error: `Inverter type "${inverterId}" not found.` } };
          }

          const usedInConfiguration = listInverterConfigurations(db, projectId).some((configuration) => configuration.selected_inverter_type_id === inverterId);
          if (usedInConfiguration) {
            return { status: 400 as const, body: { error: `Inverter type "${inverterId}" is still referenced by the current project configuration.` } };
          }

          db.prepare('DELETE FROM inverter_types WHERE inverter_id = ?').run(inverterId);
          deleteConversionDevice(db, inverterId);
          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'GET' && url.pathname === '/api/conversion-devices') {
    try {
      const payload = withDb(databasePath, (db) => listConversionDevices(db));
      sendJson(response, 200, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown server error';
      sendJson(response, 500, { error: message });
    }
    return true;
  }

  if (method === 'POST' && url.pathname === '/api/conversion-devices') {
    void (async () => {
      try {
        const payload = await readJsonBody<{
          converter_type_id?: unknown;
          title?: unknown;
          description?: unknown;
          device_type?: unknown;
          input_voltage_v?: unknown;
          output_voltage_v?: unknown;
          continuous_power_w?: unknown;
          peak_power_va?: unknown;
          max_charge_current_a?: unknown;
          efficiency_pct?: unknown;
          output_ac_voltage_v?: unknown;
          frequency_hz?: unknown;
          surge_power_w?: unknown;
          output_dc_voltage_v?: unknown;
          max_output_current_a?: unknown;
          price?: unknown;
          price_source_url?: unknown;
          notes?: unknown;
        }>(request);

        const conversionDeviceId = typeof payload.converter_type_id === 'string' ? payload.converter_type_id.trim() : '';
        const title = typeof payload.title === 'string' ? payload.title.trim() : '';
        const description = isValidNonEmptyText(payload.description) ? payload.description.trim() : null;
        const deviceType = typeof payload.device_type === 'string' ? payload.device_type.trim() : '';
        const inputVoltageV = typeof payload.input_voltage_v === 'number' ? payload.input_voltage_v : Number(payload.input_voltage_v);
        const outputVoltageV = typeof payload.output_voltage_v === 'number' ? payload.output_voltage_v : Number(payload.output_voltage_v);
        const continuousPowerW = typeof payload.continuous_power_w === 'number' ? payload.continuous_power_w : Number(payload.continuous_power_w);
        const peakPowerVA = typeof payload.peak_power_va === 'number' ? payload.peak_power_va : Number(payload.peak_power_va);
        const maxChargeCurrentA = typeof payload.max_charge_current_a === 'number' ? payload.max_charge_current_a : Number(payload.max_charge_current_a);
        const efficiencyPct = payload.efficiency_pct == null || payload.efficiency_pct === ''
          ? null
          : (typeof payload.efficiency_pct === 'number' ? payload.efficiency_pct : Number(payload.efficiency_pct));
        const outputAcVoltageV = payload.output_ac_voltage_v == null || payload.output_ac_voltage_v === ''
          ? null
          : (typeof payload.output_ac_voltage_v === 'number' ? payload.output_ac_voltage_v : Number(payload.output_ac_voltage_v));
        const frequencyHz = payload.frequency_hz == null || payload.frequency_hz === ''
          ? null
          : (typeof payload.frequency_hz === 'number' ? payload.frequency_hz : Number(payload.frequency_hz));
        const surgePowerW = payload.surge_power_w == null || payload.surge_power_w === ''
          ? null
          : (typeof payload.surge_power_w === 'number' ? payload.surge_power_w : Number(payload.surge_power_w));
        const outputDcVoltageV = payload.output_dc_voltage_v == null || payload.output_dc_voltage_v === ''
          ? null
          : (typeof payload.output_dc_voltage_v === 'number' ? payload.output_dc_voltage_v : Number(payload.output_dc_voltage_v));
        const maxOutputCurrentA = payload.max_output_current_a == null || payload.max_output_current_a === ''
          ? null
          : (typeof payload.max_output_current_a === 'number' ? payload.max_output_current_a : Number(payload.max_output_current_a));
        const price = payload.price == null || payload.price === ''
          ? null
          : (typeof payload.price === 'number' ? payload.price : Number(payload.price));
        const priceSourceUrl = isValidNonEmptyText(payload.price_source_url) ? payload.price_source_url.trim() : null;
        const notes = isValidNonEmptyText(payload.notes) ? payload.notes.trim() : null;

        if (!title || !deviceType || !Number.isFinite(inputVoltageV) || inputVoltageV <= 0 || !Number.isFinite(outputVoltageV) || outputVoltageV <= 0 || !Number.isFinite(continuousPowerW) || continuousPowerW <= 0 || !Number.isFinite(peakPowerVA) || peakPowerVA <= 0 || !Number.isFinite(maxChargeCurrentA) || maxChargeCurrentA <= 0) {
          sendJson(response, 400, {
            error: 'Invalid converter payload. Provide title, device_type, input_voltage_v, output_voltage_v, continuous_power_w, peak_power_va, and max_charge_current_a.',
          });
          return;
        }

        if (
          (efficiencyPct != null && !Number.isFinite(efficiencyPct))
          || (outputAcVoltageV != null && !Number.isFinite(outputAcVoltageV))
          || (frequencyHz != null && !Number.isFinite(frequencyHz))
          || (surgePowerW != null && !Number.isFinite(surgePowerW))
          || (outputDcVoltageV != null && !Number.isFinite(outputDcVoltageV))
          || (maxOutputCurrentA != null && !Number.isFinite(maxOutputCurrentA))
          || (price != null && !Number.isFinite(price))
        ) {
          sendJson(response, 400, { error: 'Invalid converter payload. Optional numeric fields must be valid numbers when provided.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const resolvedConversionDeviceId = conversionDeviceId || generateUniqueCatalogId(title, listConversionDevices(db).map((device) => device.converter_type_id));
          if (getConversionDevice(db, resolvedConversionDeviceId)) {
            return { status: 409 as const, body: { error: `Converter "${resolvedConversionDeviceId}" already exists.` } };
          }

          upsertConversionDevice(db, {
            converter_type_id: resolvedConversionDeviceId,
            title,
            description,
            device_type: deviceType,
            input_voltage_v: inputVoltageV,
            output_voltage_v: outputVoltageV,
            continuous_power_w: continuousPowerW,
            peak_power_va: peakPowerVA,
            max_charge_current_a: maxChargeCurrentA,
            efficiency_pct: efficiencyPct,
            output_ac_voltage_v: outputAcVoltageV,
            frequency_hz: frequencyHz,
            surge_power_w: surgePowerW,
            output_dc_voltage_v: outputDcVoltageV,
            max_output_current_a: maxOutputCurrentA,
            price,
            price_source_url: priceSourceUrl,
            notes,
          });

          return { status: 201 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'PUT' && url.pathname.startsWith('/api/conversion-devices/')) {
    void (async () => {
      try {
        const conversionDeviceId = decodeURIComponent(url.pathname.slice('/api/conversion-devices/'.length));
        if (!conversionDeviceId) {
          sendJson(response, 400, { error: 'Converter id is required.' });
          return;
        }

        const payload = await readJsonBody<{
          converter_type_id?: unknown;
          title?: unknown;
          description?: unknown;
          device_type?: unknown;
          input_voltage_v?: unknown;
          output_voltage_v?: unknown;
          continuous_power_w?: unknown;
          peak_power_va?: unknown;
          max_charge_current_a?: unknown;
          efficiency_pct?: unknown;
          output_ac_voltage_v?: unknown;
          frequency_hz?: unknown;
          surge_power_w?: unknown;
          output_dc_voltage_v?: unknown;
          max_output_current_a?: unknown;
          price?: unknown;
          price_source_url?: unknown;
          notes?: unknown;
        }>(request);

        const bodyConversionDeviceId = typeof payload.converter_type_id === 'string' ? payload.converter_type_id.trim() : conversionDeviceId;
        const title = typeof payload.title === 'string' ? payload.title.trim() : '';
        const description = isValidNonEmptyText(payload.description) ? payload.description.trim() : null;
        const deviceType = typeof payload.device_type === 'string' ? payload.device_type.trim() : '';
        const inputVoltageV = typeof payload.input_voltage_v === 'number' ? payload.input_voltage_v : Number(payload.input_voltage_v);
        const outputVoltageV = typeof payload.output_voltage_v === 'number' ? payload.output_voltage_v : Number(payload.output_voltage_v);
        const continuousPowerW = typeof payload.continuous_power_w === 'number' ? payload.continuous_power_w : Number(payload.continuous_power_w);
        const peakPowerVA = typeof payload.peak_power_va === 'number' ? payload.peak_power_va : Number(payload.peak_power_va);
        const maxChargeCurrentA = typeof payload.max_charge_current_a === 'number' ? payload.max_charge_current_a : Number(payload.max_charge_current_a);
        const efficiencyPct = payload.efficiency_pct == null || payload.efficiency_pct === ''
          ? null
          : (typeof payload.efficiency_pct === 'number' ? payload.efficiency_pct : Number(payload.efficiency_pct));
        const outputAcVoltageV = payload.output_ac_voltage_v == null || payload.output_ac_voltage_v === ''
          ? null
          : (typeof payload.output_ac_voltage_v === 'number' ? payload.output_ac_voltage_v : Number(payload.output_ac_voltage_v));
        const frequencyHz = payload.frequency_hz == null || payload.frequency_hz === ''
          ? null
          : (typeof payload.frequency_hz === 'number' ? payload.frequency_hz : Number(payload.frequency_hz));
        const surgePowerW = payload.surge_power_w == null || payload.surge_power_w === ''
          ? null
          : (typeof payload.surge_power_w === 'number' ? payload.surge_power_w : Number(payload.surge_power_w));
        const outputDcVoltageV = payload.output_dc_voltage_v == null || payload.output_dc_voltage_v === ''
          ? null
          : (typeof payload.output_dc_voltage_v === 'number' ? payload.output_dc_voltage_v : Number(payload.output_dc_voltage_v));
        const maxOutputCurrentA = payload.max_output_current_a == null || payload.max_output_current_a === ''
          ? null
          : (typeof payload.max_output_current_a === 'number' ? payload.max_output_current_a : Number(payload.max_output_current_a));
        const price = payload.price == null || payload.price === ''
          ? null
          : (typeof payload.price === 'number' ? payload.price : Number(payload.price));
        const priceSourceUrl = isValidNonEmptyText(payload.price_source_url) ? payload.price_source_url.trim() : null;
        const notes = isValidNonEmptyText(payload.notes) ? payload.notes.trim() : null;

        if (bodyConversionDeviceId !== conversionDeviceId) {
          sendJson(response, 400, { error: 'Converter id in the URL must match the converter_type_id in the payload.' });
          return;
        }

        if (!title || !deviceType || !Number.isFinite(inputVoltageV) || inputVoltageV <= 0 || !Number.isFinite(outputVoltageV) || outputVoltageV <= 0 || !Number.isFinite(continuousPowerW) || continuousPowerW <= 0 || !Number.isFinite(peakPowerVA) || peakPowerVA <= 0 || !Number.isFinite(maxChargeCurrentA) || maxChargeCurrentA <= 0) {
          sendJson(response, 400, {
            error: 'Invalid converter payload. Provide title, device_type, input_voltage_v, output_voltage_v, continuous_power_w, peak_power_va, and max_charge_current_a.',
          });
          return;
        }

        if (
          (efficiencyPct != null && !Number.isFinite(efficiencyPct))
          || (outputAcVoltageV != null && !Number.isFinite(outputAcVoltageV))
          || (frequencyHz != null && !Number.isFinite(frequencyHz))
          || (surgePowerW != null && !Number.isFinite(surgePowerW))
          || (outputDcVoltageV != null && !Number.isFinite(outputDcVoltageV))
          || (maxOutputCurrentA != null && !Number.isFinite(maxOutputCurrentA))
          || (price != null && !Number.isFinite(price))
        ) {
          sendJson(response, 400, { error: 'Invalid converter payload. Optional numeric fields must be valid numbers when provided.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const existing = getConversionDevice(db, conversionDeviceId);
          if (!existing) {
            return { status: 404 as const, body: { error: `Converter "${conversionDeviceId}" not found.` } };
          }

          upsertConversionDevice(db, {
            converter_type_id: conversionDeviceId,
            title,
            description,
            device_type: deviceType,
            input_voltage_v: inputVoltageV,
            output_voltage_v: outputVoltageV,
            continuous_power_w: continuousPowerW,
            peak_power_va: peakPowerVA,
            max_charge_current_a: maxChargeCurrentA,
            efficiency_pct: efficiencyPct,
            output_ac_voltage_v: outputAcVoltageV,
            frequency_hz: frequencyHz,
            surge_power_w: surgePowerW,
            output_dc_voltage_v: outputDcVoltageV,
            max_output_current_a: maxOutputCurrentA,
            price,
            price_source_url: priceSourceUrl,
            notes,
          });

          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'DELETE' && url.pathname.startsWith('/api/conversion-devices/')) {
    void (async () => {
      try {
        const conversionDeviceId = decodeURIComponent(url.pathname.slice('/api/conversion-devices/'.length));
        if (!conversionDeviceId) {
          sendJson(response, 400, { error: 'Converter id is required.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const existing = getConversionDevice(db, conversionDeviceId);
          if (!existing) {
            return { status: 404 as const, body: { error: `Converter "${conversionDeviceId}" not found.` } };
          }

          deleteConversionDevice(db, conversionDeviceId);
          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'GET' && (url.pathname === '/api/converters' || url.pathname === '/api/project-converters')) {
    try {
      const payload = withDb(databasePath, (db) => listProjectConverters(db, projectId, locationId));
      sendJson(response, 200, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown server error';
      sendJson(response, 500, { error: message });
    }
    return true;
  }

  if (method === 'POST' && (url.pathname === '/api/converters' || url.pathname === '/api/project-converters')) {
    void (async () => {
      try {
        const payload = await readJsonBody<{
          converter_id?: unknown;
          title?: unknown;
          description?: unknown;
          converter_type_id?: unknown;
        }>(request);

        const requestedId = typeof payload.converter_id === 'string' ? payload.converter_id.trim() : '';
        const title = typeof payload.title === 'string' ? payload.title.trim() : '';
        const description = isValidNonEmptyText(payload.description) ? payload.description.trim() : null;
        const conversionDeviceId = typeof payload.converter_type_id === 'string' ? payload.converter_type_id.trim() : '';

        if (!title || !conversionDeviceId) {
          sendJson(response, 400, { error: 'Invalid converter payload. Provide title and converter_type_id.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const conversionDevice = getConversionDevice(db, conversionDeviceId);
          if (!conversionDevice) {
            return { status: 400 as const, body: { error: `Converter "${conversionDeviceId}" not found.` } };
          }

          const projectConverterId = requestedId || generateUniqueCatalogId(title, listProjectConverters(db, projectId).map((converter) => converter.converter_id));
          if (getProjectConverter(db, projectConverterId)) {
            return { status: 409 as const, body: { error: `Converter "${projectConverterId}" already exists.` } };
          }

          upsertProjectConverter(db, {
            converter_id: projectConverterId,
            title,
            description,
            converter_type_id: conversionDeviceId,
          }, projectId, locationId);

          return { status: 201 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'PUT' && (url.pathname.startsWith('/api/converters/') || url.pathname.startsWith('/api/project-converters/'))) {
    void (async () => {
      try {
        const converterPrefix = url.pathname.startsWith('/api/converters/') ? '/api/converters/' : '/api/project-converters/';
        const projectConverterId = decodeURIComponent(url.pathname.slice(converterPrefix.length));
        if (!projectConverterId) {
          sendJson(response, 400, { error: 'Converter id is required.' });
          return;
        }

        const payload = await readJsonBody<{
          converter_id?: unknown;
          title?: unknown;
          description?: unknown;
          converter_type_id?: unknown;
        }>(request);

        const bodyProjectConverterId = typeof payload.converter_id === 'string' ? payload.converter_id.trim() : projectConverterId;
        const title = typeof payload.title === 'string' ? payload.title.trim() : '';
        const description = isValidNonEmptyText(payload.description) ? payload.description.trim() : null;
        const conversionDeviceId = typeof payload.converter_type_id === 'string' ? payload.converter_type_id.trim() : '';

        if (bodyProjectConverterId !== projectConverterId) {
          sendJson(response, 400, { error: 'Converter id in the URL must match the converter_id in the payload.' });
          return;
        }

        if (!title || !conversionDeviceId) {
          sendJson(response, 400, { error: 'Invalid converter payload. Provide title and converter_type_id.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const existing = listProjectConverters(db, projectId, locationId).find((converter) => converter.converter_id === projectConverterId) ?? null;
          if (!existing) {
            return { status: 404 as const, body: { error: `Converter "${projectConverterId}" not found.` } };
          }

          const conversionDevice = getConversionDevice(db, conversionDeviceId);
          if (!conversionDevice) {
            return { status: 400 as const, body: { error: `Converter "${conversionDeviceId}" not found.` } };
          }

          upsertProjectConverter(db, {
            converter_id: projectConverterId,
            title,
            description,
            converter_type_id: conversionDeviceId,
          }, projectId, locationId);

          db.prepare('UPDATE load_circuits SET converter_type_id = ? WHERE converter_id = ? AND location_id = ?').run(conversionDeviceId, projectConverterId, existing.location_id);
          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'DELETE' && (url.pathname.startsWith('/api/converters/') || url.pathname.startsWith('/api/project-converters/'))) {
    void (async () => {
      try {
        const converterPrefix = url.pathname.startsWith('/api/converters/') ? '/api/converters/' : '/api/project-converters/';
        const projectConverterId = decodeURIComponent(url.pathname.slice(converterPrefix.length));
        if (!projectConverterId) {
          sendJson(response, 400, { error: 'Converter id is required.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const existing = listProjectConverters(db, projectId, locationId).find((converter) => converter.converter_id === projectConverterId) ?? null;
          if (!existing) {
            return { status: 404 as const, body: { error: `Converter "${projectConverterId}" not found.` } };
          }

          deleteProjectConverter(db, projectConverterId);
          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'GET' && url.pathname === '/api/load-circuits') {
    try {
      const payload = withDb(databasePath, (db) => listLoadCircuits(db, projectId, locationId));
      sendJson(response, 200, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown server error';
      sendJson(response, 500, { error: message });
    }
    return true;
  }

  if (method === 'POST' && url.pathname === '/api/load-circuits') {
    void (async () => {
      try {
        const payload = await readJsonBody<{
          load_circuit_id?: unknown;
          converter_id?: unknown;
          converter_type_id?: unknown;
          title?: unknown;
          description?: unknown;
        }>(request);

        const loadCircuitId = typeof payload.load_circuit_id === 'string' ? payload.load_circuit_id.trim() : '';
        const projectConverterId = typeof payload.converter_id === 'string' ? payload.converter_id.trim() : '';
        const conversionDeviceId = typeof payload.converter_type_id === 'string' ? payload.converter_type_id.trim() : '';
        const title = typeof payload.title === 'string' ? payload.title.trim() : '';
        const description = typeof payload.description === 'string' ? payload.description.trim() : null;

        if (!title || (!projectConverterId && !conversionDeviceId)) {
          sendJson(response, 400, { error: 'Invalid load circuit payload. Provide title and converter_id or converter_type_id.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const resolvedLoadCircuitId = loadCircuitId || generateUniqueCatalogId(title, listLoadCircuits(db, projectId).map((circuit) => circuit.load_circuit_id));
          if (getLoadCircuit(db, resolvedLoadCircuitId)) {
            return { status: 409 as const, body: { error: `Load circuit "${resolvedLoadCircuitId}" already exists.` } };
          }

          const projectConverter = projectConverterId
            ? getProjectConverter(db, projectConverterId) ?? null
            : null;
          if (projectConverterId && !projectConverter) {
            return { status: 400 as const, body: { error: `Converter "${projectConverterId}" not found.` } };
          }

          const resolvedConversionDeviceId = projectConverter?.converter_type_id ?? conversionDeviceId;
          const resolvedLocationId = projectConverter?.location_id ?? locationId;
          const conversionDevice = getConversionDevice(db, resolvedConversionDeviceId);
          if (!conversionDevice) {
            return { status: 400 as const, body: { error: `Converter "${resolvedConversionDeviceId}" not found.` } };
          }

          upsertLoadCircuit(db, {
            load_circuit_id: resolvedLoadCircuitId,
            converter_id: projectConverterId || null,
            converter_type_id: resolvedConversionDeviceId,
            title,
            description,
          }, projectId, resolvedLocationId);

          return { status: 201 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'PUT' && url.pathname.startsWith('/api/load-circuits/')) {
    void (async () => {
      try {
        const loadCircuitId = decodeURIComponent(url.pathname.slice('/api/load-circuits/'.length));
        if (!loadCircuitId) {
          sendJson(response, 400, { error: 'Load circuit id is required.' });
          return;
        }

        const payload = await readJsonBody<{
          load_circuit_id?: unknown;
          converter_id?: unknown;
          converter_type_id?: unknown;
          title?: unknown;
          description?: unknown;
        }>(request);

        const bodyLoadCircuitId = typeof payload.load_circuit_id === 'string' ? payload.load_circuit_id.trim() : loadCircuitId;
        const projectConverterId = typeof payload.converter_id === 'string' ? payload.converter_id.trim() : '';
        const conversionDeviceId = typeof payload.converter_type_id === 'string' ? payload.converter_type_id.trim() : '';
        const title = typeof payload.title === 'string' ? payload.title.trim() : '';
        const description = typeof payload.description === 'string' ? payload.description.trim() : null;

        if (bodyLoadCircuitId !== loadCircuitId) {
          sendJson(response, 400, { error: 'Load circuit id in the URL must match the load_circuit_id in the payload.' });
          return;
        }

        if (!title || (!projectConverterId && !conversionDeviceId)) {
          sendJson(response, 400, { error: 'Invalid load circuit payload. Provide title and converter_id or converter_type_id.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const existing = getLoadCircuit(db, loadCircuitId);
          if (!existing) {
            return { status: 404 as const, body: { error: `Load circuit "${loadCircuitId}" not found.` } };
          }

          const projectConverter = projectConverterId ? getProjectConverter(db, projectConverterId) : null;
          if (projectConverterId && !projectConverter) {
            return { status: 400 as const, body: { error: `Converter "${projectConverterId}" not found.` } };
          }

          const resolvedConversionDeviceId = projectConverter?.converter_type_id ?? conversionDeviceId;
          const resolvedLocationId = projectConverter?.location_id ?? locationId;
          const conversionDevice = getConversionDevice(db, resolvedConversionDeviceId);
          if (!conversionDevice) {
            return { status: 400 as const, body: { error: `Converter "${resolvedConversionDeviceId}" not found.` } };
          }

          upsertLoadCircuit(db, {
            load_circuit_id: loadCircuitId,
            converter_id: projectConverterId || null,
            converter_type_id: resolvedConversionDeviceId,
            title,
            description,
          }, projectId, resolvedLocationId);

          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'DELETE' && url.pathname.startsWith('/api/load-circuits/')) {
    void (async () => {
      try {
        const loadCircuitId = decodeURIComponent(url.pathname.slice('/api/load-circuits/'.length));
        if (!loadCircuitId) {
          sendJson(response, 400, { error: 'Load circuit id is required.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const existing = getLoadCircuit(db, loadCircuitId);
          if (!existing) {
            return { status: 404 as const, body: { error: `Load circuit "${loadCircuitId}" not found.` } };
          }

          deleteLoadCircuit(db, loadCircuitId);
          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'GET' && url.pathname === '/api/loads') {
    try {
      const payload = withDb(databasePath, (db) => listLoads(db, projectId, locationId));
      sendJson(response, 200, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown server error';
      sendJson(response, 500, { error: message });
    }
    return true;
  }

  if (method === 'POST' && url.pathname === '/api/loads') {
    void (async () => {
      try {
        const payload = await readJsonBody<LoadPayload>(request);

        const loadId = typeof payload.load_id === 'string' ? payload.load_id.trim() : '';
        const loadCircuitId = typeof payload.load_circuit_id === 'string' ? payload.load_circuit_id.trim() : '';
        const title = typeof payload.title === 'string' ? payload.title.trim() : '';
        const description = readOptionalText(payload.description);
        const nominalCurrentA = readOptionalNumber(payload.nominal_current_a);
        const startupCurrentA = readOptionalNumber(payload.startup_current_a);
        const expectedUsageHoursPerDay = readOptionalNumber(payload.expected_usage_hours_per_day) ?? 0;
        const dutyProfile = readOptionalText(payload.duty_profile);
        const notes = readOptionalText(payload.notes);

        const updated = withDb(databasePath, (db) => {
          if (!title || !loadCircuitId) {
            return { status: 400 as const, body: { error: 'Invalid load payload. Provide a title and load_circuit_id.' } };
          }

          const resolvedLoadId = loadId || generateUniqueCatalogId(title, listLoads(db, projectId).map((load) => load.load_id));
          if (getLoad(db, resolvedLoadId)) {
            return { status: 409 as const, body: { error: `Load "${resolvedLoadId}" already exists.` } };
          }

          const loadCircuit = getLoadCircuit(db, loadCircuitId);
          if (!loadCircuit) {
            return { status: 400 as const, body: { error: `Load circuit "${loadCircuitId}" not found.` } };
          }

          const loadCircuitDevice = getConversionDevice(db, loadCircuit.converter_type_id);
          const circuitVoltageV = loadCircuitDevice?.output_voltage_v ?? loadCircuitDevice?.output_dc_voltage_v ?? loadCircuitDevice?.output_ac_voltage_v ?? null;
          const nominalPowerW = resolveLoadPowerW(payload, circuitVoltageV);
          const surgePowerW = resolveLoadSurgePowerW(payload, circuitVoltageV);
          const standbyPowerW = resolveLoadStandbyPowerW(payload);
          const dailyEnergyKwh = resolveLoadDailyEnergyKwh(payload, nominalPowerW);

          if (!isNonNegativeFinite(nominalPowerW) || !isNonNegativeFiniteOrNull(surgePowerW) || !isNonNegativeFiniteOrNull(standbyPowerW) || expectedUsageHoursPerDay < 0 || (dailyEnergyKwh != null && dailyEnergyKwh < 0)) {
            return { status: 400 as const, body: { error: 'Invalid load payload. Provide a title, load_circuit_id, and non-negative load values.' } };
          }

          upsertLoad(db, {
            load_id: resolvedLoadId,
            load_circuit_id: loadCircuitId,
            title,
            description,
            nominal_current_a: nominalCurrentA,
            nominal_power_w: nominalPowerW,
            startup_current_a: startupCurrentA,
            surge_power_w: surgePowerW,
            standby_power_w: standbyPowerW,
            expected_usage_hours_per_day: expectedUsageHoursPerDay,
            daily_energy_kwh: dailyEnergyKwh,
            duty_profile: dutyProfile,
            notes,
          }, projectId, locationId);

          return { status: 201 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'PUT' && url.pathname.startsWith('/api/loads/')) {
    void (async () => {
      try {
        const loadId = decodeURIComponent(url.pathname.slice('/api/loads/'.length));
        if (!loadId) {
          sendJson(response, 400, { error: 'Load id is required.' });
          return;
        }

        const payload = await readJsonBody<LoadPayload>(request);

        const bodyLoadId = typeof payload.load_id === 'string' ? payload.load_id.trim() : loadId;
        const loadCircuitId = typeof payload.load_circuit_id === 'string' ? payload.load_circuit_id.trim() : '';
        const title = typeof payload.title === 'string' ? payload.title.trim() : '';
        const description = readOptionalText(payload.description);
        const nominalCurrentA = readOptionalNumber(payload.nominal_current_a);
        const startupCurrentA = readOptionalNumber(payload.startup_current_a);
        const expectedUsageHoursPerDay = readOptionalNumber(payload.expected_usage_hours_per_day) ?? 0;
        const dutyProfile = readOptionalText(payload.duty_profile);
        const notes = readOptionalText(payload.notes);

        if (bodyLoadId !== loadId) {
          sendJson(response, 400, { error: 'Load id in the URL must match the load_id in the payload.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          if (!title || !loadCircuitId) {
            return { status: 400 as const, body: { error: 'Invalid load payload. Provide a title and load_circuit_id.' } };
          }

          const existing = getLoad(db, loadId);
          if (!existing) {
            return { status: 404 as const, body: { error: `Load "${loadId}" not found.` } };
          }

          const loadCircuit = getLoadCircuit(db, loadCircuitId);
          if (!loadCircuit) {
            return { status: 400 as const, body: { error: `Load circuit "${loadCircuitId}" not found.` } };
          }

          const loadCircuitDevice = getConversionDevice(db, loadCircuit.converter_type_id);
          const circuitVoltageV = loadCircuitDevice?.output_voltage_v ?? loadCircuitDevice?.output_dc_voltage_v ?? loadCircuitDevice?.output_ac_voltage_v ?? null;
          const nominalPowerW = resolveLoadPowerW(payload, circuitVoltageV);
          const surgePowerW = resolveLoadSurgePowerW(payload, circuitVoltageV);
          const standbyPowerW = resolveLoadStandbyPowerW(payload);
          const dailyEnergyKwh = resolveLoadDailyEnergyKwh(payload, nominalPowerW);

          if (!isNonNegativeFinite(nominalPowerW) || !isNonNegativeFiniteOrNull(surgePowerW) || !isNonNegativeFiniteOrNull(standbyPowerW) || expectedUsageHoursPerDay < 0 || (dailyEnergyKwh != null && dailyEnergyKwh < 0)) {
            return { status: 400 as const, body: { error: 'Invalid load payload. Provide a title, load_circuit_id, and non-negative load values.' } };
          }

          upsertLoad(db, {
            load_id: loadId,
            load_circuit_id: loadCircuitId,
            title,
            description,
            nominal_current_a: nominalCurrentA,
            nominal_power_w: nominalPowerW,
            startup_current_a: startupCurrentA,
            surge_power_w: surgePowerW,
            standby_power_w: standbyPowerW,
            expected_usage_hours_per_day: expectedUsageHoursPerDay,
            daily_energy_kwh: dailyEnergyKwh,
            duty_profile: dutyProfile,
            notes,
          }, projectId, locationId);

          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'DELETE' && url.pathname.startsWith('/api/loads/')) {
    void (async () => {
      try {
        const loadId = decodeURIComponent(url.pathname.slice('/api/loads/'.length));
        if (!loadId) {
          sendJson(response, 400, { error: 'Load id is required.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const existing = getLoad(db, loadId);
          if (!existing) {
            return { status: 404 as const, body: { error: `Load "${loadId}" not found.` } };
          }

          deleteLoad(db, loadId);
          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'PUT' && url.pathname === '/api/location') {
    void (async () => {
      try {
        const payload = await readJsonBody<{
          title?: unknown;
          place_name?: unknown;
          country?: unknown;
          description?: unknown;
          notes?: unknown;
          latitude?: unknown;
          longitude?: unknown;
          northing?: unknown;
          easting?: unknown;
          site_photo_data_url?: unknown;
        }>(request);

        const title = payload.title == null
          ? null
          : (isValidNonEmptyText(payload.title) ? payload.title.trim() : '');
        const placeName = typeof payload.place_name === 'string' ? payload.place_name.trim() : '';
        const country = typeof payload.country === 'string' ? payload.country.trim() : '';
        const description = isValidNonEmptyText(payload.description) ? payload.description.trim() : null;
        const notes = isValidNonEmptyText(payload.notes) ? payload.notes.trim() : null;
        const latitude = typeof payload.latitude === 'number' ? payload.latitude : Number(payload.latitude);
        const longitude = typeof payload.longitude === 'number' ? payload.longitude : Number(payload.longitude);
        const northing = payload.northing == null || payload.northing === ''
          ? null
          : (typeof payload.northing === 'number' ? payload.northing : Number(payload.northing));
        const easting = payload.easting == null || payload.easting === ''
          ? null
          : (typeof payload.easting === 'number' ? payload.easting : Number(payload.easting));
        const sitePhotoDataUrl = payload.site_photo_data_url === undefined
          ? undefined
          : (payload.site_photo_data_url == null || payload.site_photo_data_url === ''
              ? null
              : (typeof payload.site_photo_data_url === 'string' ? payload.site_photo_data_url : String(payload.site_photo_data_url)));

        if (!placeName || !country || !isValidLatitude(latitude) || !isValidLongitude(longitude)) {
          sendJson(response, 400, {
            error: 'Invalid location payload. Expected non-empty place_name and country plus valid latitude/longitude values.',
          });
          return;
        }

        if ((northing != null && !Number.isFinite(northing)) || (easting != null && !Number.isFinite(easting))) {
          sendJson(response, 400, {
            error: 'Invalid location payload. Northing and easting must be valid numbers when provided.',
          });
          return;
        }

        withDb(databasePath, (db) => {
          upsertLocation(db, {
            title: title === '' ? null : title,
            place_name: placeName,
            country,
            description,
            notes,
            latitude,
            longitude,
            northing,
            easting,
            site_photo_data_url: sitePhotoDataUrl,
          }, projectId, locationId);
        });

        const refreshedPayload = withDb(databasePath, (db) => buildDigitalTwinExport(db, databasePath, projectId, locationId));
        sendJson(response, 200, refreshedPayload);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'GET' && url.pathname === '/api/locations') {
    try {
      const payload = withDb(databasePath, (db) => listLocations(db, projectId));
      sendJson(response, 200, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown server error';
      sendJson(response, 500, { error: message });
    }
    return true;
  }

  if (method === 'POST' && url.pathname === '/api/locations') {
    void (async () => {
      try {
        const payload = await readJsonBody<{
          title?: unknown;
          place_name?: unknown;
          country?: unknown;
          description?: unknown;
          notes?: unknown;
          latitude?: unknown;
          longitude?: unknown;
          northing?: unknown;
          easting?: unknown;
          site_photo_data_url?: unknown;
        }>(request);

        const title = payload.title == null
          ? null
          : (isValidNonEmptyText(payload.title) ? payload.title.trim() : '');
        const placeName = typeof payload.place_name === 'string' ? payload.place_name.trim() : 'New location';
        const country = typeof payload.country === 'string' ? payload.country.trim() : 'NL';
        const description = isValidNonEmptyText(payload.description) ? payload.description.trim() : null;
        const notes = isValidNonEmptyText(payload.notes) ? payload.notes.trim() : null;
        const latitude = typeof payload.latitude === 'number' ? payload.latitude : Number(payload.latitude);
        const longitude = typeof payload.longitude === 'number' ? payload.longitude : Number(payload.longitude);
        const northing = payload.northing == null || payload.northing === ''
          ? null
          : (typeof payload.northing === 'number' ? payload.northing : Number(payload.northing));
        const easting = payload.easting == null || payload.easting === ''
          ? null
          : (typeof payload.easting === 'number' ? payload.easting : Number(payload.easting));
        const sitePhotoDataUrl = payload.site_photo_data_url === undefined
          ? undefined
          : (payload.site_photo_data_url == null || payload.site_photo_data_url === ''
              ? null
              : (typeof payload.site_photo_data_url === 'string' ? payload.site_photo_data_url : String(payload.site_photo_data_url)));

        if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
          sendJson(response, 400, {
            error: 'Invalid location payload. Expected valid latitude/longitude values.',
          });
          return;
        }

        if ((northing != null && !Number.isFinite(northing)) || (easting != null && !Number.isFinite(easting))) {
          sendJson(response, 400, {
            error: 'Invalid location payload. Northing and easting must be valid numbers when provided.',
          });
          return;
        }

        const createdLocation = withDb(databasePath, (db) => {
          createLocation(db, {
            title: title === '' ? null : title,
            place_name: placeName,
            country,
            description,
            notes,
            latitude,
            longitude,
            northing,
            easting,
            site_photo_data_url: sitePhotoDataUrl,
          }, projectId);
          return listLocations(db, projectId).at(-1) ?? null;
        });

        const refreshedPayload = withDb(databasePath, (db) => buildDigitalTwinExport(db, databasePath, projectId, createdLocation?.location_id ?? null));
        sendJson(response, 201, refreshedPayload);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'POST' && url.pathname === '/api/surfaces') {
    void (async () => {
      try {
        const payload = await readJsonBody<{
          surface_id?: unknown;
          name?: unknown;
          orientation_deg?: unknown;
          tilt_deg?: unknown;
          notes?: unknown;
          photo_data_url?: unknown;
        }>(request);

        const roofFaceId = typeof payload.surface_id === 'string' ? payload.surface_id.trim() : '';
        const name = typeof payload.name === 'string' && payload.name.trim() !== '' ? payload.name.trim() : 'New surface';
        const orientationDeg = payload.orientation_deg == null || payload.orientation_deg === ''
          ? 0
          : (typeof payload.orientation_deg === 'number' ? payload.orientation_deg : Number(payload.orientation_deg));
        const tiltDeg = payload.tilt_deg == null || payload.tilt_deg === ''
          ? 30
          : (typeof payload.tilt_deg === 'number' ? payload.tilt_deg : Number(payload.tilt_deg));
        const notes = isValidNonEmptyText(payload.notes) ? payload.notes.trim() : undefined;
        const photoDataUrl = payload.photo_data_url == null || payload.photo_data_url === ''
          ? null
          : (typeof payload.photo_data_url === 'string' ? payload.photo_data_url : String(payload.photo_data_url));

        if (!roofFaceId || !Number.isFinite(orientationDeg) || orientationDeg < 0 || orientationDeg > 360 || !Number.isFinite(tiltDeg) || tiltDeg < 0 || tiltDeg > 90) {
          sendJson(response, 400, {
            error: 'Invalid surface payload. Expected surface_id, optional name, optional orientation_deg in 0..360, and optional tilt_deg in 0..90.',
          });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const existingFace = getSurface(db, roofFaceId);
          if (existingFace) {
            return { status: 409 as const, body: { error: `Surface "${roofFaceId}" already exists.` } };
          }

          createSurface(db, {
            surface_id: roofFaceId,
            name,
            orientation_deg: orientationDeg,
            tilt_deg: tiltDeg,
            usable_area_m2: undefined,
            notes,
            photo_data_url: photoDataUrl,
          }, projectId, locationId);
          return { status: 201 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'PUT' && url.pathname.startsWith('/api/surfaces/')) {
    void (async () => {
      try {
        const roofFaceId = decodeURIComponent(url.pathname.slice('/api/surfaces/'.length));
        if (!roofFaceId) {
          sendJson(response, 400, { error: 'Roof face id is required.' });
          return;
        }

        const payload = await readJsonBody<{
          name?: unknown;
          description?: unknown;
          orientation_deg?: unknown;
          tilt_deg?: unknown;
          area_height_m?: unknown;
          area_width_m?: unknown;
          notes?: unknown;
          photo_data_url?: unknown;
        }>(request);

        const name = typeof payload.name === 'string' ? payload.name.trim() : '';
        const description = payload.description === undefined
          ? undefined
          : (isValidNonEmptyText(payload.description) ? payload.description.trim() : '');
        const orientationDeg = typeof payload.orientation_deg === 'number'
          ? payload.orientation_deg
          : Number(payload.orientation_deg);
        const tiltDeg = typeof payload.tilt_deg === 'number'
          ? payload.tilt_deg
          : Number(payload.tilt_deg);
        const parseOptionalPositive = (v: unknown) =>
          v === undefined ? undefined : (v === null || v === '' ? null : (typeof v === 'number' ? v : Number(v)));
        const areaHeightM = parseOptionalPositive(payload.area_height_m);
        const areaWidthM = parseOptionalPositive(payload.area_width_m);
        const notes = payload.notes === undefined
          ? undefined
          : (isValidNonEmptyText(payload.notes) ? payload.notes.trim() : '');
        const photoDataUrl = payload.photo_data_url === undefined
          ? undefined
          : (payload.photo_data_url == null || payload.photo_data_url === ''
              ? null
              : (typeof payload.photo_data_url === 'string' ? payload.photo_data_url : String(payload.photo_data_url)));

        if (!name || !Number.isFinite(orientationDeg) || orientationDeg < 0 || orientationDeg > 360 || !Number.isFinite(tiltDeg) || tiltDeg < 0 || tiltDeg > 90) {
          sendJson(response, 400, {
            error: 'Invalid surface payload. Expected non-empty name, orientation_deg in 0..360, and tilt_deg in 0..90.',
          });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const existingFace = getSurface(db, roofFaceId);
          if (!existingFace) {
            return null;
          }

          const resolvedHeight = areaHeightM !== undefined ? areaHeightM : (existingFace.area_height_m ?? null);
          const resolvedWidth = areaWidthM !== undefined ? areaWidthM : (existingFace.area_width_m ?? null);
          const derivedArea = resolvedHeight != null && resolvedWidth != null && resolvedHeight > 0 && resolvedWidth > 0
            ? Number((resolvedHeight * resolvedWidth).toFixed(4))
            : null;

          updateSurface(db, {
            surface_id: roofFaceId,
            name,
            description: description === undefined ? (existingFace.description ?? null) : description,
            orientation_deg: orientationDeg,
            tilt_deg: tiltDeg,
            area_height_m: resolvedHeight ?? undefined,
            area_width_m: resolvedWidth ?? undefined,
            usable_area_m2: derivedArea ?? existingFace.usable_area_m2 ?? undefined,
            notes: notes === undefined ? (existingFace.notes ?? undefined) : notes,
            photo_data_url: photoDataUrl === undefined ? (existingFace.photo_data_url ?? null) : photoDataUrl,
          });
          syncPvTopologyForSurface(db, roofFaceId);

          return buildDigitalTwinExport(db, databasePath, projectId, locationId);
        });

        if (!updated) {
          sendJson(response, 404, { error: `Surface "${roofFaceId}" not found.` });
          return;
        }

        sendJson(response, 200, updated);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'DELETE' && url.pathname.startsWith('/api/surfaces/')) {
    void (async () => {
      try {
        const roofFaceId = decodeURIComponent(url.pathname.slice('/api/surfaces/'.length));
        if (!roofFaceId) {
          sendJson(response, 400, { error: 'Roof face id is required.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const existingFace = getSurface(db, roofFaceId);
          if (!existingFace) {
            return { status: 404 as const, body: { error: `Surface "${roofFaceId}" not found.` } };
          }

          deleteSurface(db, roofFaceId);
          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'PUT' && url.pathname.startsWith('/api/surface-panel-assignments/')) {
    void (async () => {
      try {
        const roofFaceId = decodeURIComponent(url.pathname.slice('/api/surface-panel-assignments/'.length));
        if (!roofFaceId) {
          sendJson(response, 400, { error: 'Roof face id is required.' });
          return;
        }

        const payload = await readJsonBody<{
          panel_type_id?: unknown;
          count?: unknown;
        }>(request);

        const panelTypeId = typeof payload.panel_type_id === 'string' ? payload.panel_type_id.trim() : '';
        const count = typeof payload.count === 'number' ? payload.count : Number(payload.count);

        if (!Number.isInteger(count) || count < 0) {
          sendJson(response, 400, { error: 'Invalid roof-panel payload. Expected count as an integer >= 0.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const existingFace = getSurface(db, roofFaceId);
          if (!existingFace) {
            return { status: 404 as const, body: { error: `Surface "${roofFaceId}" not found.` } };
          }

          deleteSurfacePanelAssignmentsForSurface(db, roofFaceId);

          if (count > 0) {
            if (!panelTypeId) {
              return { status: 400 as const, body: { error: 'panel_type_id is required when count is greater than 0.' } };
            }

            const panelType = getPanelType(db, panelTypeId);
            if (!panelType) {
              return { status: 400 as const, body: { error: `Panel type "${panelTypeId}" not found.` } };
            }

            upsertSurfacePanelAssignment(db, {
              surface_id: roofFaceId,
              panel_type_id: panelTypeId,
              count,
            });
          }

          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'PUT' && url.pathname.startsWith('/api/surface-configurations/')) {
    void (async () => {
      try {
        const roofFaceId = decodeURIComponent(url.pathname.slice('/api/surface-configurations/'.length));
        if (!roofFaceId) {
          sendJson(response, 400, { error: 'Roof face id is required.' });
          return;
        }

        const payload = await readJsonBody<{
          panels_per_string?: unknown;
          parallel_strings?: unknown;
          selected_mppt_type_id?: unknown;
        }>(request);

        const panelsPerString = typeof payload.panels_per_string === 'number'
          ? payload.panels_per_string
          : Number(payload.panels_per_string);
        const parallelStrings = typeof payload.parallel_strings === 'number'
          ? payload.parallel_strings
          : Number(payload.parallel_strings);
        const selectedMpptTypeId = typeof payload.selected_mppt_type_id === 'string'
          ? payload.selected_mppt_type_id.trim()
          : '';

        if (!Number.isInteger(panelsPerString) || panelsPerString < 0 || !Number.isInteger(parallelStrings) || parallelStrings < 0) {
          sendJson(response, 400, {
            error: 'Invalid face-configuration payload. Expected integer panels_per_string and parallel_strings values >= 0.',
          });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const existingFace = getSurface(db, roofFaceId);
          if (!existingFace) {
            return { status: 404 as const, body: { error: `Surface "${roofFaceId}" not found.` } };
          }

          const persistedPanelCount = listSurfacePanelAssignments(db)
            .filter((assignment) => assignment.surface_id === roofFaceId)
            .reduce((sum, assignment) => sum + assignment.count, 0);

          if (persistedPanelCount === 0) {
            if (panelsPerString !== 0 || parallelStrings !== 0) {
              return { status: 400 as const, body: { error: 'Faces with 0 panels must also save 0 panels_per_string and 0 parallel_strings.' } };
            }
          } else if (panelsPerString <= 0 || parallelStrings <= 0 || panelsPerString * parallelStrings !== persistedPanelCount) {
            return {
              status: 400 as const,
              body: { error: `Saved string layout must match the persisted panel count for this face (${persistedPanelCount}).` },
            };
          }

          if (selectedMpptTypeId) {
            const panelType = selectedMpptTypeId ? db.prepare('SELECT 1 FROM mppt_types WHERE mppt_type_id = ?').get(selectedMpptTypeId) : null;
            if (!panelType) {
              return { status: 400 as const, body: { error: `MPPT type "${selectedMpptTypeId}" not found.` } };
            }
          }

          upsertSurfaceConfiguration(db, {
            surface_id: roofFaceId,
            panels_per_string: panelsPerString === 0 ? null : panelsPerString,
            parallel_strings: parallelStrings === 0 ? null : parallelStrings,
            selected_mppt_type_id: selectedMpptTypeId || null,
          });

          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'PUT' && url.pathname === '/api/battery-bank-configuration') {
    void (async () => {
      try {
        const payload = await readJsonBody<{
          title?: unknown;
          description?: unknown;
          image_data_url?: unknown;
          notes?: unknown;
          selected_battery_type_id?: unknown;
          selected_cabinet_type_id?: unknown;
          configured_battery_count?: unknown;
          batteries_per_string?: unknown;
          parallel_strings?: unknown;
        }>(request);

        const title = payload.title === undefined
          ? undefined
          : (isValidNonEmptyText(payload.title) ? payload.title.trim() : '');
        const description = payload.description === undefined
          ? undefined
          : (isValidNonEmptyText(payload.description) ? payload.description.trim() : '');
        const imageDataUrl = payload.image_data_url === undefined
          ? undefined
          : (payload.image_data_url == null || payload.image_data_url === ''
              ? null
              : (typeof payload.image_data_url === 'string' ? payload.image_data_url : String(payload.image_data_url)));
        const notes = payload.notes === undefined
          ? undefined
          : (isValidNonEmptyText(payload.notes) ? payload.notes.trim() : '');
        const selectedBatteryTypeId = typeof payload.selected_battery_type_id === 'string' ? payload.selected_battery_type_id.trim() : '';
        const selectedCabinetTypeId = typeof payload.selected_cabinet_type_id === 'string' ? payload.selected_cabinet_type_id.trim() : '';
        const configuredBatteryCount = typeof payload.configured_battery_count === 'number'
          ? payload.configured_battery_count
          : Number(payload.configured_battery_count);
        const batteriesPerString = typeof payload.batteries_per_string === 'number'
          ? payload.batteries_per_string
          : Number(payload.batteries_per_string);
        const parallelStrings = typeof payload.parallel_strings === 'number'
          ? payload.parallel_strings
          : Number(payload.parallel_strings);

        if (!Number.isInteger(configuredBatteryCount) || configuredBatteryCount < 1 || !Number.isInteger(batteriesPerString) || batteriesPerString < 1 || !Number.isInteger(parallelStrings) || parallelStrings < 1) {
          sendJson(response, 400, {
            error: 'Invalid battery-bank configuration payload. Expected integer configured_battery_count, batteries_per_string, and parallel_strings values >= 1.',
          });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const existingConfiguration = listBatteryBankConfigurations(db, projectId, locationId)[0] ?? null;
          const batteryBankId = existingConfiguration?.battery_bank_id ?? `battery-bank-${locationId ?? 'main'}`;

          if (selectedBatteryTypeId) {
            const batteryType = db.prepare('SELECT 1 FROM battery_types WHERE battery_type_id = ?').get(selectedBatteryTypeId);
            if (!batteryType) {
              return { status: 400 as const, body: { error: `Battery type "${selectedBatteryTypeId}" not found.` } };
            }
          }

          if (selectedCabinetTypeId) {
            const cabinetType = getCabinetType(db, selectedCabinetTypeId);
            if (!cabinetType) {
              return { status: 400 as const, body: { error: `Cabinet type "${selectedCabinetTypeId}" not found.` } };
            }
          }

          if (configuredBatteryCount !== batteriesPerString * parallelStrings) {
            return {
              status: 400 as const,
              body: { error: 'Battery count must equal batteries per string multiplied by parallel strings.' },
            };
          }

          upsertBatteryBankConfiguration(db, {
            battery_bank_id: batteryBankId,
            title: title === undefined ? (existingConfiguration?.title ?? null) : title,
            description: description === undefined ? (existingConfiguration?.description ?? null) : description,
            image_data_url: imageDataUrl === undefined ? (existingConfiguration?.image_data_url ?? null) : imageDataUrl,
            notes: notes === undefined ? (existingConfiguration?.notes ?? null) : notes,
            selected_battery_type_id: selectedBatteryTypeId || null,
            selected_cabinet_type_id: selectedCabinetTypeId || null,
            configured_battery_count: configuredBatteryCount,
            batteries_per_string: batteriesPerString,
            parallel_strings: parallelStrings,
          }, projectId, locationId);

          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  if (method === 'PUT' && url.pathname === '/api/inverter-configuration') {
    void (async () => {
      try {
        const payload = await readJsonBody<{
          selected_inverter_type_id?: unknown;
          selected_cabinet_type_id?: unknown;
          title?: unknown;
          description?: unknown;
          image_data_url?: unknown;
          notes?: unknown;
        }>(request);
        const selectedInverterTypeId = typeof payload.selected_inverter_type_id === 'string' ? payload.selected_inverter_type_id.trim() : '';
        const selectedCabinetTypeId = typeof payload.selected_cabinet_type_id === 'string' ? payload.selected_cabinet_type_id.trim() : '';
        const title = typeof payload.title === 'string' ? payload.title : null;
        const description = typeof payload.description === 'string' ? payload.description : null;
        const imageDataUrl = typeof payload.image_data_url === 'string' ? payload.image_data_url : (payload.image_data_url === null ? null : undefined);
        const notes = typeof payload.notes === 'string' ? payload.notes : null;

        const updated = withDb(databasePath, (db) => {
          if (selectedInverterTypeId) {
            const inverter = db.prepare('SELECT 1 FROM inverter_types WHERE inverter_id = ?').get(selectedInverterTypeId);
            if (!inverter) {
              return { status: 400 as const, body: { error: `Inverter type "${selectedInverterTypeId}" not found.` } };
            }
          } else {
            return { status: 400 as const, body: { error: 'Choose an inverter type before saving the inverter configuration.' } };
          }

          if (selectedCabinetTypeId) {
            const cabinet = getCabinetType(db, selectedCabinetTypeId);
            if (!cabinet) {
              return { status: 400 as const, body: { error: `Cabinet type "${selectedCabinetTypeId}" not found.` } };
            }
          }

          const inverterConfigId = locationId ? `inverter-configuration-${locationId}` : 'inverter-configuration-main';
          const existing = db.prepare('SELECT * FROM inverter_configurations WHERE inverter_configuration_id = ?').get(inverterConfigId) as { title?: string; description?: string; image_data_url?: string; notes?: string } | undefined;

          upsertInverterConfiguration(db, {
            inverter_configuration_id: inverterConfigId,
            selected_inverter_type_id: selectedInverterTypeId,
            selected_cabinet_type_id: selectedCabinetTypeId || null,
            title: title ?? existing?.title ?? null,
            description: description ?? existing?.description ?? null,
            image_data_url: imageDataUrl !== undefined ? imageDataUrl : (existing?.image_data_url ?? null),
            notes: notes ?? existing?.notes ?? null,
          }, projectId, locationId);
          setPref(db, projectId, 'preferred_inverter_type_id', selectedInverterTypeId);

          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath, projectId, locationId) };
        });

        sendJson(response, updated.status, updated.body);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        sendJson(response, 500, { error: message });
      }
    })();
    return true;
  }

  sendJson(response, 404, { error: 'API route not found' });
  return true;
}

function handleStaticRequest(request: IncomingMessage, response: ServerResponse): void {
  if (!fs.existsSync(webDistPath)) {
    sendText(response, 503, 'Frontend build not found. Run `npm run build` before starting the server.');
    return;
  }

  const url = new URL(request.url ?? '/', 'http://localhost');
  const candidatePath = resolveStaticPath(url.pathname);

  if (!candidatePath) {
    sendText(response, 400, 'Invalid path');
    return;
  }

  if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
    serveFile(response, candidatePath);
    return;
  }

  serveFile(response, path.join(webDistPath, 'index.html'));
}

ensureDatabaseReady(databasePath);

const server = http.createServer((request, response) => {
  if (handleApiRequest(request, response)) {
    return;
  }

  handleStaticRequest(request, response);
});

server.listen(serverPort, serverHost, () => {
  console.log(`OffGridOS server listening on http://${serverHost}:${serverPort}`);
  console.log(`Using database: ${databasePath}`);
});
