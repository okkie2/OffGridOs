import fs from 'fs';
import path from 'path';
import http, { type IncomingMessage, type ServerResponse } from 'http';
import { deleteRoofPanelsForFace, getBatteryBankConfiguration, getRoofFace, getPanelType, listRoofPanels, setPref, upsertBatteryBankConfiguration, upsertInverterConfiguration, upsertRoofFaceConfiguration, updateRoofFace, upsertLocation, upsertRoofPanel } from './db/queries.js';
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

  if (method === 'PUT' && url.pathname.startsWith('/api/roof-faces/')) {
    void (async () => {
      try {
        const roofFaceId = decodeURIComponent(url.pathname.slice('/api/roof-faces/'.length));
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
            error: 'Invalid roof-face payload. Expected non-empty name, orientation_deg in 0..360, and tilt_deg in 0..90.',
          });
          return;
        }

        const updated = withDb(databasePath, (db) => {
          const existingFace = getRoofFace(db, roofFaceId);
          if (!existingFace) {
            return null;
          }

          updateRoofFace(db, {
            roof_face_id: roofFaceId,
            name,
            orientation_deg: orientationDeg,
            tilt_deg: tiltDeg,
            usable_area_m2: existingFace.usable_area_m2 ?? undefined,
            notes: existingFace.notes ?? undefined,
          });

          return buildDigitalTwinExport(db, databasePath);
        });

        if (!updated) {
          sendJson(response, 404, { error: `Roof face "${roofFaceId}" not found.` });
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

  if (method === 'PUT' && url.pathname.startsWith('/api/roof-panels/')) {
    void (async () => {
      try {
        const roofFaceId = decodeURIComponent(url.pathname.slice('/api/roof-panels/'.length));
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
          const existingFace = getRoofFace(db, roofFaceId);
          if (!existingFace) {
            return { status: 404 as const, body: { error: `Roof face "${roofFaceId}" not found.` } };
          }

          deleteRoofPanelsForFace(db, roofFaceId);

          if (count > 0) {
            if (!panelTypeId) {
              return { status: 400 as const, body: { error: 'panel_type_id is required when count is greater than 0.' } };
            }

            const panelType = getPanelType(db, panelTypeId);
            if (!panelType) {
              return { status: 400 as const, body: { error: `Panel type "${panelTypeId}" not found.` } };
            }

            upsertRoofPanel(db, {
              roof_face_id: roofFaceId,
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

  if (method === 'PUT' && url.pathname.startsWith('/api/roof-face-configurations/')) {
    void (async () => {
      try {
        const roofFaceId = decodeURIComponent(url.pathname.slice('/api/roof-face-configurations/'.length));
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
          const existingFace = getRoofFace(db, roofFaceId);
          if (!existingFace) {
            return { status: 404 as const, body: { error: `Roof face "${roofFaceId}" not found.` } };
          }

          const persistedPanelCount = listRoofPanels(db)
            .filter((assignment) => assignment.roof_face_id === roofFaceId)
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

          upsertRoofFaceConfiguration(db, {
            roof_face_id: roofFaceId,
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
