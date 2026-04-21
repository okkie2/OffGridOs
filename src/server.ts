import fs from 'fs';
import path from 'path';
import http, { type IncomingMessage, type ServerResponse } from 'http';
import { createSurface, deleteSurface, deleteSurfacePanelAssignmentsForSurface, getBatteryBankConfiguration, getBatteryType, getInverterType, getMpptType, getPreferences, getPanelType, getSurface, getSurfaceConfiguration, insertBatteryType, insertInverterType, insertMpptType, insertPanelType, listArrayToMpptMappings, listBatteryBankConfigurations, listBatteryTypes, listInverterConfigurations, listInverterTypes, listMpptTypes, listPanelTypes, listPvArrays, listSurfaceConfigurations, listSurfacePanelAssignments, setPref, updateBatteryType, updateInverterType, updateMpptType, updatePanelType, updateSurface, upsertBatteryBankConfiguration, upsertInverterConfiguration, upsertLocation, upsertSurfaceConfiguration, upsertSurfacePanelAssignment, syncPvTopologyForSurface } from './db/queries.js';
import { buildDigitalTwinExport } from './output/exportDigitalTwin.js';
import { resolveDatabasePath, resolveServerHost, resolveServerPort, resolveWebDistPath } from './config/runtime.js';
import { ensureDatabaseReady, withDb } from './server/bootstrap.js';

const databasePath = resolveDatabasePath();
const webDistPath = resolveWebDistPath();
const serverHost = resolveServerHost();
const serverPort = resolveServerPort();

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(`${JSON.stringify(payload)}\n`);
}

function sendText(response: ServerResponse, statusCode: number, message: string): void {
  response.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(message);
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString('utf-8').trim();
  return (rawBody === '' ? {} : JSON.parse(rawBody)) as T;
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

  if (method === 'GET' && url.pathname === '/api/health') {
    sendJson(response, 200, { ok: true });
    return true;
  }

  if (method === 'GET' && url.pathname === '/api/digital-twin') {
    try {
      const payload = withDb(databasePath, (db) => buildDigitalTwinExport(db, databasePath));
      sendJson(response, 200, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown server error';
      sendJson(response, 500, { error: message });
    }
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
          source?: unknown;
          notes?: unknown;
        }>(request);

        const batteryTypeId = typeof payload.battery_type_id === 'string' ? payload.battery_type_id.trim() : '';
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
        const source = isValidNonEmptyText(payload.source) ? payload.source.trim() : null;
        const notes = isValidNonEmptyText(payload.notes) ? payload.notes.trim() : undefined;

        if (!batteryTypeId || !model || !chemistry || !Number.isFinite(nominalVoltage) || nominalVoltage <= 0 || !Number.isFinite(capacityAh) || capacityAh <= 0 || !Number.isFinite(capacityKwh) || capacityKwh <= 0) {
          sendJson(response, 400, {
            error: 'Invalid battery type payload. Provide a unique battery_type_id, model, chemistry, nominal_voltage, capacity_ah, and capacity_kwh.',
          });
          return;
        }

        if ((maxChargeRate != null && !Number.isFinite(maxChargeRate)) || (maxDischargeRate != null && !Number.isFinite(maxDischargeRate)) || (price != null && !Number.isFinite(price))) {
          sendJson(response, 400, { error: 'Invalid battery type payload. Optional numeric fields must be valid numbers when provided.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          if (getBatteryType(db, batteryTypeId)) {
            return { status: 409 as const, body: { error: `Battery type "${batteryTypeId}" already exists.` } };
          }

          insertBatteryType(db, {
            battery_type_id: batteryTypeId,
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
            source,
            url: source,
            notes,
          });

          return { status: 201 as const, body: buildDigitalTwinExport(db, databasePath) };
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
          source?: unknown;
          notes?: unknown;
        }>(request);

        const bodyBatteryTypeId = typeof payload.battery_type_id === 'string' ? payload.battery_type_id.trim() : batteryTypeId;
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
        const source = isValidNonEmptyText(payload.source) ? payload.source.trim() : null;
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
            source,
            url: source,
            notes,
          });

          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath) };
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

          const usedInConfiguration = getBatteryBankConfiguration(db, 'battery-bank-main')?.selected_battery_type_id === batteryTypeId;
          const preferredBatteryTypeId = getPreferences(db).preferred_battery_type_id;

          if (usedInConfiguration || preferredBatteryTypeId === batteryTypeId) {
            return { status: 400 as const, body: { error: `Battery type "${batteryTypeId}" is still referenced by the current project configuration.` } };
          }

          db.prepare('DELETE FROM battery_types WHERE battery_type_id = ?').run(batteryTypeId);

          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath) };
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
          model?: unknown;
          wp?: unknown;
          voc?: unknown;
          vmp?: unknown;
          isc?: unknown;
          imp?: unknown;
          length_mm?: unknown;
          width_mm?: unknown;
          notes?: unknown;
        }>(request);

        const panelTypeId = typeof payload.panel_type_id === 'string' ? payload.panel_type_id.trim() : '';
        const model = typeof payload.model === 'string' ? payload.model.trim() : '';
        const wp = typeof payload.wp === 'number' ? payload.wp : Number(payload.wp);
        const voc = typeof payload.voc === 'number' ? payload.voc : Number(payload.voc);
        const vmp = typeof payload.vmp === 'number' ? payload.vmp : Number(payload.vmp);
        const isc = typeof payload.isc === 'number' ? payload.isc : Number(payload.isc);
        const imp = typeof payload.imp === 'number' ? payload.imp : Number(payload.imp);
        const lengthMm = typeof payload.length_mm === 'number' ? payload.length_mm : Number(payload.length_mm);
        const widthMm = typeof payload.width_mm === 'number' ? payload.width_mm : Number(payload.width_mm);
        const notes = isValidNonEmptyText(payload.notes) ? payload.notes.trim() : undefined;

        if (!panelTypeId || !model || !Number.isFinite(wp) || wp <= 0 || !Number.isFinite(voc) || voc <= 0 || !Number.isFinite(vmp) || vmp <= 0 || !Number.isFinite(isc) || isc <= 0 || !Number.isFinite(imp) || imp <= 0 || !Number.isFinite(lengthMm) || lengthMm <= 0 || !Number.isFinite(widthMm) || widthMm <= 0) {
          sendJson(response, 400, {
            error: 'Invalid panel type payload. Provide a unique panel_type_id, model, wp, voc, vmp, isc, imp, length_mm, and width_mm.',
          });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          if (getPanelType(db, panelTypeId)) {
            return { status: 409 as const, body: { error: `Panel type "${panelTypeId}" already exists.` } };
          }

          insertPanelType(db, {
            panel_type_id: panelTypeId,
            model,
            wp,
            voc,
            vmp,
            isc,
            imp,
            length_mm: lengthMm,
            width_mm: widthMm,
            notes,
          });

          return { status: 201 as const, body: buildDigitalTwinExport(db, databasePath) };
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
          model?: unknown;
          wp?: unknown;
          voc?: unknown;
          vmp?: unknown;
          isc?: unknown;
          imp?: unknown;
          length_mm?: unknown;
          width_mm?: unknown;
          notes?: unknown;
        }>(request);

        const bodyPanelTypeId = typeof payload.panel_type_id === 'string' ? payload.panel_type_id.trim() : panelTypeId;
        const model = typeof payload.model === 'string' ? payload.model.trim() : '';
        const wp = typeof payload.wp === 'number' ? payload.wp : Number(payload.wp);
        const voc = typeof payload.voc === 'number' ? payload.voc : Number(payload.voc);
        const vmp = typeof payload.vmp === 'number' ? payload.vmp : Number(payload.vmp);
        const isc = typeof payload.isc === 'number' ? payload.isc : Number(payload.isc);
        const imp = typeof payload.imp === 'number' ? payload.imp : Number(payload.imp);
        const lengthMm = typeof payload.length_mm === 'number' ? payload.length_mm : Number(payload.length_mm);
        const widthMm = typeof payload.width_mm === 'number' ? payload.width_mm : Number(payload.width_mm);
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

        const updated = withDb(databasePath, (db) => {
          const existing = getPanelType(db, panelTypeId);
          if (!existing) {
            return { status: 404 as const, body: { error: `Panel type "${panelTypeId}" not found.` } };
          }

          updatePanelType(db, {
            panel_type_id: panelTypeId,
            model,
            wp,
            voc,
            vmp,
            isc,
            imp,
            length_mm: lengthMm,
            width_mm: widthMm,
            notes,
          });

          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath) };
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
          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath) };
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
          model?: unknown;
          tracker_count?: unknown;
          max_voc?: unknown;
          max_pv_power?: unknown;
          max_pv_input_current_a?: unknown;
          max_pv_short_circuit_current_a?: unknown;
          max_charge_current?: unknown;
          nominal_battery_voltage?: unknown;
          notes?: unknown;
        }>(request);

        const mpptTypeId = typeof payload.mppt_type_id === 'string' ? payload.mppt_type_id.trim() : '';
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
        const notes = isValidNonEmptyText(payload.notes) ? payload.notes.trim() : undefined;

        if (!mpptTypeId || !model || !Number.isInteger(trackerCount) || trackerCount < 1 || !Number.isFinite(maxVoc) || maxVoc <= 0 || !Number.isFinite(maxPvPower) || maxPvPower <= 0 || !Number.isFinite(maxChargeCurrent) || maxChargeCurrent <= 0 || !Number.isFinite(nominalBatteryVoltage) || nominalBatteryVoltage <= 0) {
          sendJson(response, 400, {
            error: 'Invalid MPPT type payload. Provide a unique mppt_type_id, model, tracker_count, max_voc, max_pv_power, max_charge_current, and nominal_battery_voltage.',
          });
          return;
        }

        if ((maxPvInputCurrentA != null && !Number.isFinite(maxPvInputCurrentA)) || (maxPvShortCircuitCurrentA != null && !Number.isFinite(maxPvShortCircuitCurrentA))) {
          sendJson(response, 400, { error: 'Invalid MPPT type payload. Optional PV current fields must be valid numbers when provided.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          if (getMpptType(db, mpptTypeId)) {
            return { status: 409 as const, body: { error: `MPPT type "${mpptTypeId}" already exists.` } };
          }

          insertMpptType(db, {
            mppt_type_id: mpptTypeId,
            model,
            tracker_count: trackerCount,
            max_voc: maxVoc,
            max_pv_power: maxPvPower,
            max_pv_input_current_a: maxPvInputCurrentA,
            max_pv_short_circuit_current_a: maxPvShortCircuitCurrentA,
            max_charge_current: maxChargeCurrent,
            nominal_battery_voltage: nominalBatteryVoltage,
            notes,
          });

          return { status: 201 as const, body: buildDigitalTwinExport(db, databasePath) };
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
          model?: unknown;
          tracker_count?: unknown;
          max_voc?: unknown;
          max_pv_power?: unknown;
          max_pv_input_current_a?: unknown;
          max_pv_short_circuit_current_a?: unknown;
          max_charge_current?: unknown;
          nominal_battery_voltage?: unknown;
          notes?: unknown;
        }>(request);

        const bodyMpptTypeId = typeof payload.mppt_type_id === 'string' ? payload.mppt_type_id.trim() : mpptTypeId;
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

        const updated = withDb(databasePath, (db) => {
          const existing = getMpptType(db, mpptTypeId);
          if (!existing) {
            return { status: 404 as const, body: { error: `MPPT type "${mpptTypeId}" not found.` } };
          }

          updateMpptType(db, {
            mppt_type_id: mpptTypeId,
            model,
            tracker_count: trackerCount,
            max_voc: maxVoc,
            max_pv_power: maxPvPower,
            max_pv_input_current_a: maxPvInputCurrentA,
            max_pv_short_circuit_current_a: maxPvShortCircuitCurrentA,
            max_charge_current: maxChargeCurrent,
            nominal_battery_voltage: nominalBatteryVoltage,
            notes,
          });

          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath) };
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

          const usedInFaceConfiguration = listSurfaceConfigurations(db).some((configuration) => configuration.selected_mppt_type_id === mpptTypeId);
          if (usedInFaceConfiguration) {
            return { status: 400 as const, body: { error: `MPPT type "${mpptTypeId}" is still referenced by surface configurations.` } };
          }

          db.prepare('DELETE FROM mppt_types WHERE mppt_type_id = ?').run(mpptTypeId);
          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath) };
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
          model?: unknown;
          input_voltage_v?: unknown;
          output_voltage_v?: unknown;
          continuous_power_w?: unknown;
          peak_power_va?: unknown;
          max_charge_current_a?: unknown;
          efficiency_pct?: unknown;
          price?: unknown;
          notes?: unknown;
        }>(request);

        const inverterId = typeof payload.inverter_id === 'string' ? payload.inverter_id.trim() : '';
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
        const notes = isValidNonEmptyText(payload.notes) ? payload.notes.trim() : undefined;

        if (!inverterId || !model || !Number.isFinite(inputVoltageV) || inputVoltageV <= 0 || !Number.isFinite(outputVoltageV) || outputVoltageV <= 0 || !Number.isFinite(continuousPowerW) || continuousPowerW <= 0 || !Number.isFinite(peakPowerVA) || peakPowerVA <= 0 || !Number.isFinite(maxChargeCurrentA) || maxChargeCurrentA <= 0) {
          sendJson(response, 400, {
            error: 'Invalid inverter type payload. Provide a unique inverter_id, model, input_voltage_v, output_voltage_v, continuous_power_w, peak_power_va, and max_charge_current_a.',
          });
          return;
        }

        if ((efficiencyPct != null && !Number.isFinite(efficiencyPct)) || (price != null && !Number.isFinite(price))) {
          sendJson(response, 400, { error: 'Invalid inverter type payload. Optional numeric fields must be valid numbers when provided.' });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          if (getInverterType(db, inverterId)) {
            return { status: 409 as const, body: { error: `Inverter type "${inverterId}" already exists.` } };
          }

          insertInverterType(db, {
            inverter_id: inverterId,
            model,
            input_voltage_v: inputVoltageV,
            output_voltage_v: outputVoltageV,
            continuous_power_w: continuousPowerW,
            peak_power_va: peakPowerVA,
            max_charge_current_a: maxChargeCurrentA,
            efficiency_pct: efficiencyPct,
            price,
            notes,
          });

          return { status: 201 as const, body: buildDigitalTwinExport(db, databasePath) };
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
          model?: unknown;
          input_voltage_v?: unknown;
          output_voltage_v?: unknown;
          continuous_power_w?: unknown;
          peak_power_va?: unknown;
          max_charge_current_a?: unknown;
          efficiency_pct?: unknown;
          price?: unknown;
          notes?: unknown;
        }>(request);

        const bodyInverterId = typeof payload.inverter_id === 'string' ? payload.inverter_id.trim() : inverterId;
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
            model,
            input_voltage_v: inputVoltageV,
            output_voltage_v: outputVoltageV,
            continuous_power_w: continuousPowerW,
            peak_power_va: peakPowerVA,
            max_charge_current_a: maxChargeCurrentA,
            efficiency_pct: efficiencyPct,
            price,
            notes,
          });

          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath) };
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

          const usedInConfiguration = listInverterConfigurations(db).some((configuration) => configuration.selected_inverter_type_id === inverterId);
          if (usedInConfiguration) {
            return { status: 400 as const, body: { error: `Inverter type "${inverterId}" is still referenced by the current project configuration.` } };
          }

          db.prepare('DELETE FROM inverter_types WHERE inverter_id = ?').run(inverterId);
          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath) };
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
          place_name?: unknown;
          country?: unknown;
          latitude?: unknown;
          longitude?: unknown;
          northing?: unknown;
          easting?: unknown;
        }>(request);

        const placeName = typeof payload.place_name === 'string' ? payload.place_name.trim() : '';
        const country = typeof payload.country === 'string' ? payload.country.trim() : '';
        const latitude = typeof payload.latitude === 'number' ? payload.latitude : Number(payload.latitude);
        const longitude = typeof payload.longitude === 'number' ? payload.longitude : Number(payload.longitude);
        const northing = payload.northing == null || payload.northing === ''
          ? null
          : (typeof payload.northing === 'number' ? payload.northing : Number(payload.northing));
        const easting = payload.easting == null || payload.easting === ''
          ? null
          : (typeof payload.easting === 'number' ? payload.easting : Number(payload.easting));

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
            place_name: placeName,
            country,
            latitude,
            longitude,
            northing,
            easting,
          });
        });

        const refreshedPayload = withDb(databasePath, (db) => buildDigitalTwinExport(db, databasePath));
        sendJson(response, 200, refreshedPayload);
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
        }>(request);

        const roofFaceId = typeof payload.surface_id === 'string' ? payload.surface_id.trim() : '';
        const name = typeof payload.name === 'string' && payload.name.trim() !== '' ? payload.name.trim() : 'New surface';
        const orientationDeg = payload.orientation_deg == null || payload.orientation_deg === ''
          ? 0
          : (typeof payload.orientation_deg === 'number' ? payload.orientation_deg : Number(payload.orientation_deg));
        const tiltDeg = payload.tilt_deg == null || payload.tilt_deg === ''
          ? 30
          : (typeof payload.tilt_deg === 'number' ? payload.tilt_deg : Number(payload.tilt_deg));

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
            notes: undefined,
          });
          return { status: 201 as const, body: buildDigitalTwinExport(db, databasePath) };
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
          orientation_deg?: unknown;
          tilt_deg?: unknown;
        }>(request);

        const name = typeof payload.name === 'string' ? payload.name.trim() : '';
        const orientationDeg = typeof payload.orientation_deg === 'number'
          ? payload.orientation_deg
          : Number(payload.orientation_deg);
        const tiltDeg = typeof payload.tilt_deg === 'number'
          ? payload.tilt_deg
          : Number(payload.tilt_deg);

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

          updateSurface(db, {
            surface_id: roofFaceId,
            name,
            orientation_deg: orientationDeg,
            tilt_deg: tiltDeg,
            usable_area_m2: existingFace.usable_area_m2 ?? undefined,
            notes: existingFace.notes ?? undefined,
          });
          syncPvTopologyForSurface(db, roofFaceId);

          return buildDigitalTwinExport(db, databasePath);
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
          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath) };
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

          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath) };
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

          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath) };
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
          selected_battery_type_id?: unknown;
          configured_battery_count?: unknown;
          batteries_per_string?: unknown;
          parallel_strings?: unknown;
        }>(request);

        const selectedBatteryTypeId = typeof payload.selected_battery_type_id === 'string' ? payload.selected_battery_type_id.trim() : '';
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
          if (selectedBatteryTypeId) {
            const batteryType = db.prepare('SELECT 1 FROM battery_types WHERE battery_type_id = ?').get(selectedBatteryTypeId);
            if (!batteryType) {
              return { status: 400 as const, body: { error: `Battery type "${selectedBatteryTypeId}" not found.` } };
            }
          }

          if (configuredBatteryCount !== batteriesPerString * parallelStrings) {
            return {
              status: 400 as const,
              body: { error: 'Battery count must equal batteries per string multiplied by parallel strings.' },
            };
          }

          upsertBatteryBankConfiguration(db, {
            battery_bank_id: 'battery-bank-main',
            selected_battery_type_id: selectedBatteryTypeId || null,
            configured_battery_count: configuredBatteryCount,
            batteries_per_string: batteriesPerString,
            parallel_strings: parallelStrings,
          });

          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath) };
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
        const payload = await readJsonBody<{ selected_inverter_type_id?: unknown }>(request);
        const selectedInverterTypeId = typeof payload.selected_inverter_type_id === 'string' ? payload.selected_inverter_type_id.trim() : '';

        const updated = withDb(databasePath, (db) => {
          if (selectedInverterTypeId) {
            const inverter = db.prepare('SELECT 1 FROM inverter_types WHERE inverter_id = ?').get(selectedInverterTypeId);
            if (!inverter) {
              return { status: 400 as const, body: { error: `Inverter type "${selectedInverterTypeId}" not found.` } };
            }
          } else {
            return { status: 400 as const, body: { error: 'Choose an inverter type before saving the inverter configuration.' } };
          }

          upsertInverterConfiguration(db, {
            inverter_configuration_id: 'inverter-configuration-main',
            selected_inverter_type_id: selectedInverterTypeId,
          });
          setPref(db, 'preferred_inverter_type_id', selectedInverterTypeId);

          return { status: 200 as const, body: buildDigitalTwinExport(db, databasePath) };
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
