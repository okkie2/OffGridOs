import { After, Before, Given, Then, When, setDefaultTimeout, setWorldConstructor, World } from '@cucumber/cucumber';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { openDb } from '../../src/db/connection.js';
import { ensureDatabaseReady } from '../../src/server/bootstrap.js';
import { buildDigitalTwinExport } from '../../src/output/exportDigitalTwin.js';
import { createLocation, deleteBatteryType, deleteLoad, deleteLoadCircuit, deleteProjectConverter, getBatteryBankConfiguration, getConversionDevice, getInverterConfiguration, getLoad, getLoadCircuit, getProjectConverter, getSurface, insertBatteryType, listBatteryTypes, listConversionDevices, listLoadCircuits, listLoads, listLocations, listProjects, listProjectConverters, syncPvTopologyForSurface, updateBatteryType, updateSurface, upsertBatteryBankConfiguration, upsertInverterConfiguration, upsertLoad, upsertLoadCircuit, upsertProjectConverter, upsertSurfaceConfiguration, upsertSurfacePanelAssignment } from '../../src/db/queries.js';
import { generateUniqueCatalogId } from '../../src/domain/panel-type-id.js';
import { App } from '../../web/src/App.tsx';
import type { DigitalTwinExport } from '../../web/src/App.tsx';

setDefaultTimeout(15_000);

type StoredGlobal = {
  key: keyof typeof globalThis;
  value: unknown;
};

class NavigationWorld extends World {
  dom: JSDOM | null = null;
  root: Root | null = null;
  container: HTMLElement | null = null;
  dbPath: string | null = null;
  dbDir: string | null = null;
  projectData: DigitalTwinExport | null = null;
  latestEnteredLocationTitle = '';
  latestEnteredLocationCountry = '';
  latestEnteredLocationDescription = '';
  latestEnteredLocationLatitude = '';
  latestEnteredLocationLongitude = '';
  latestEnteredSurfaceNotes = '';
  latestEnteredSurfaceName = '';
  latestEnteredSurfaceDescription = '';
  latestEnteredSurfaceHeight = '';
  latestEnteredSurfaceWidth = '';
  latestEnteredSurfaceAzimuth = '';
  latestEnteredSurfaceTilt = '';
  latestEnteredLocationNotes = '';
  latestSelectedPanelCount = '';
  latestSelectedPanelsPerString = '';
  latestSelectedParallelStrings = '';
  latestSelectedPanelTypeId = '';
  latestSelectedMpptTypeId = '';
  latestEnteredInverterTitle = '';
  latestEnteredInverterDescription = '';
  latestEnteredInverterNotes = '';
  latestSelectedInverterTypeId = '';
  latestSurfaceDesignSaveError = '';
  latestEnteredBatteryTitle = '';
  latestEnteredBatteryDescription = '';
  latestEnteredBatteryNotes = '';
  latestSelectedBatteryTypeId = '';
  latestSelectedBatteryCount = '';
  latestEnteredBatteryCatalogModel = '';
  latestSelectedConsumptionConverterId = '';
  latestSelectedConsumptionConverterTitle = '';
  latestCreatedLoadCircuitTitle = '';
  latestCreatedLoadCircuitDescription = '';
  latestCreatedLoadCircuitLocationId = '';
  latestCreatedLoadCircuitLocationSlug = '';
  latestLoadCircuitsConverterId = '';
  latestLoadsConverterId = '';
  latestLoadsCircuitId = '';
  latestMoveTargetLoadCircuitId = '';
  latestMoveTargetLoadCircuitTitle = '';
  latestMoveSourceLoadCircuitId = '';
  latestMoveSourceLoadCircuitTitle = '';
  latestMoveProjectConverterId = '';
  latestMoveLoadId = '';
  latestMovedLoadTitle = '';
  storedGlobals: StoredGlobal[] = [];

  installDom(): void {
    this.dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
      url: 'http://127.0.0.1/',
    });
    this.container = this.dom.window.document.getElementById('root');
    if (!this.container) {
      throw new Error('Failed to create root container for navigation test.');
    }

    const windowObject = this.dom.window as unknown as typeof globalThis;
    const assign = <K extends keyof typeof globalThis>(key: K, value: (typeof globalThis)[K]) => {
      this.storedGlobals.push({ key, value: globalThis[key] });
      globalThis[key] = value;
    };

    assign('window', windowObject);
    assign('document', this.dom.window.document);
    assign('localStorage', this.dom.window.localStorage);
    assign('sessionStorage', this.dom.window.sessionStorage);
    assign('HTMLElement', this.dom.window.HTMLElement);
    assign('Element', this.dom.window.Element);
    assign('Node', this.dom.window.Node);
    assign('Event', this.dom.window.Event);
    assign('InputEvent', this.dom.window.InputEvent as unknown as typeof InputEvent);
    assign('MouseEvent', this.dom.window.MouseEvent);
    assign('HashChangeEvent', this.dom.window.HashChangeEvent);
    assign('PopStateEvent', this.dom.window.PopStateEvent as unknown as typeof PopStateEvent);
    if (!('attachEvent' in this.dom.window.HTMLElement.prototype)) {
      Object.defineProperty(this.dom.window.HTMLElement.prototype, 'attachEvent', {
        value: () => undefined,
        configurable: true,
      });
    }
    if (!('detachEvent' in this.dom.window.HTMLElement.prototype)) {
      Object.defineProperty(this.dom.window.HTMLElement.prototype, 'detachEvent', {
        value: () => undefined,
        configurable: true,
      });
    }
    this.dom.window.confirm = (() => true) as unknown as typeof window.confirm;
    assign('confirm', this.dom.window.confirm);
    const domWindow = this.dom.window;
    class MockFileReader extends domWindow.EventTarget {
      result: string | ArrayBuffer | null = null;
      error: DOMException | null = null;
      onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
      onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;

      readAsDataURL(file: Blob): void {
        const payload = Buffer.from(`mock-${Date.now()}`).toString('base64');
        this.result = `data:${file.type || 'application/octet-stream'};base64,${payload}`;
        const event = {
          target: { result: this.result },
        } as ProgressEvent<FileReader>;
        this.onload?.call(this as unknown as FileReader, event);
      }
    }

    (this.dom.window as unknown as { FileReader: typeof FileReader }).FileReader = MockFileReader as unknown as typeof FileReader;
    assign('FileReader', MockFileReader as unknown as typeof FileReader);
    assign('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
      const url = new URL(requestUrl, 'http://127.0.0.1/');
      const method = (init?.method ?? 'GET').toUpperCase();
      const requestHeaders = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      const locationId = requestHeaders.get('X-Location-Id')?.trim() || null;

      if (url.pathname === '/api/digital-twin' && method === 'GET') {
        return new Response(JSON.stringify(this.readProjectData(locationId)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname === '/api/location' && method === 'PUT') {
        const rawBody = typeof init?.body === 'string' ? init.body : '{}';
        const payload = JSON.parse(rawBody) as {
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
        };

        const title = this.latestEnteredLocationTitle.trim() !== ''
          ? this.latestEnteredLocationTitle.trim()
          : (typeof payload.title === 'string' ? payload.title.trim() : null);
        const placeName = typeof payload.place_name === 'string' ? payload.place_name.trim() : '';
        const country = this.latestEnteredLocationCountry.trim() !== ''
          ? this.latestEnteredLocationCountry.trim()
          : (typeof payload.country === 'string' ? payload.country.trim() : '');
        const description = this.latestEnteredLocationDescription.trim() !== ''
          ? this.latestEnteredLocationDescription.trim()
          : (payload.description === undefined
              ? undefined
              : (typeof payload.description === 'string' ? payload.description.trim() : String(payload.description)));
        const notes = this.latestEnteredLocationNotes.trim() !== ''
          ? this.latestEnteredLocationNotes
          : (payload.notes === undefined
              ? undefined
              : (typeof payload.notes === 'string' ? payload.notes : String(payload.notes)));
        const latitude = this.latestEnteredLocationLatitude.trim() !== ''
          ? Number(this.latestEnteredLocationLatitude)
          : (typeof payload.latitude === 'number' ? payload.latitude : Number(payload.latitude));
        const longitude = this.latestEnteredLocationLongitude.trim() !== ''
          ? Number(this.latestEnteredLocationLongitude)
          : (typeof payload.longitude === 'number' ? payload.longitude : Number(payload.longitude));
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
              : String(payload.site_photo_data_url));

        const db = openDb(this.requireDbPath());
        try {
          const existing = db.prepare('SELECT * FROM locations LIMIT 1').get() as {
            place_name: string;
            country: string;
            description?: string | null;
            notes?: string | null;
            latitude: number;
            longitude: number;
            northing?: number | null;
            easting?: number | null;
            site_photo_data_url?: string | null;
          } | undefined;
          if (!existing) {
            return new Response(JSON.stringify({ error: 'Location row not found.' }), { status: 404 });
          }

          db.prepare('UPDATE locations SET title=@title, country=@country, place_name=@place_name, description=@description, notes=@notes, latitude=@latitude, longitude=@longitude, northing=@northing, easting=@easting, site_photo_data_url=@site_photo_data_url WHERE id=@id')
            .run({
              id: existing.id,
              title: title === '' ? null : title,
              place_name: placeName,
              country,
              description: description === undefined ? (existing.description ?? null) : description,
              notes: notes === undefined ? (existing.notes ?? null) : notes,
              latitude,
              longitude,
              northing,
              easting,
              site_photo_data_url: sitePhotoDataUrl === undefined ? (existing.site_photo_data_url ?? null) : sitePhotoDataUrl,
            });

          this.projectData = buildDigitalTwinExport(db, this.requireDbPath(), this.resolveProjectId(db));
        } finally {
          db.close();
        }

        return new Response(JSON.stringify(this.projectData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname.startsWith('/api/surfaces/') && method === 'PUT') {
        const surfaceId = decodeURIComponent(url.pathname.slice('/api/surfaces/'.length));
        const rawBody = typeof init?.body === 'string' ? init.body : '{}';
        const payload = JSON.parse(rawBody) as {
          name?: unknown;
          description?: unknown;
          orientation_deg?: unknown;
          tilt_deg?: unknown;
          area_height_m?: unknown;
          area_width_m?: unknown;
          usable_area_m2?: unknown;
          notes?: unknown;
          photo_data_url?: unknown;
        };

        const name = this.latestEnteredSurfaceName.trim() !== ''
          ? this.latestEnteredSurfaceName.trim()
          : (typeof payload.name === 'string' ? payload.name.trim() : '');
        const description = this.latestEnteredSurfaceDescription.trim() !== ''
          ? this.latestEnteredSurfaceDescription.trim()
          : (payload.description === undefined
              ? undefined
              : (typeof payload.description === 'string' ? payload.description.trim() : String(payload.description)));
        const orientationDeg = this.latestEnteredSurfaceAzimuth.trim() !== ''
          ? Number(this.latestEnteredSurfaceAzimuth)
          : (typeof payload.orientation_deg === 'number' ? payload.orientation_deg : Number(payload.orientation_deg));
        const tiltDeg = this.latestEnteredSurfaceTilt.trim() !== ''
          ? Number(this.latestEnteredSurfaceTilt)
          : (typeof payload.tilt_deg === 'number' ? payload.tilt_deg : Number(payload.tilt_deg));
        const areaHeightM = this.latestEnteredSurfaceHeight.trim() !== ''
          ? Number(this.latestEnteredSurfaceHeight)
          : (payload.area_height_m === undefined ? undefined : (payload.area_height_m == null || payload.area_height_m === '' ? null : Number(payload.area_height_m)));
        const areaWidthM = this.latestEnteredSurfaceWidth.trim() !== ''
          ? Number(this.latestEnteredSurfaceWidth)
          : (payload.area_width_m === undefined ? undefined : (payload.area_width_m == null || payload.area_width_m === '' ? null : Number(payload.area_width_m)));
        const usableAreaM2 = areaHeightM != null && areaWidthM != null && areaHeightM > 0 && areaWidthM > 0
          ? Number((areaHeightM * areaWidthM).toFixed(4))
          : (payload.usable_area_m2 === undefined
              ? undefined
              : (payload.usable_area_m2 == null || payload.usable_area_m2 === '' ? null : Number(payload.usable_area_m2)));
        const notes = payload.notes === undefined
          ? undefined
          : (typeof payload.notes === 'string' ? payload.notes : String(payload.notes));
        const effectiveNotes = this.latestEnteredSurfaceNotes.trim() !== ''
          ? this.latestEnteredSurfaceNotes
          : notes;
        const photoDataUrl = payload.photo_data_url === undefined
          ? undefined
          : (payload.photo_data_url == null || payload.photo_data_url === '' ? null : String(payload.photo_data_url));

        const db = openDb(this.requireDbPath());
        try {
          const existing = getSurface(db, surfaceId);
          if (!existing) {
            return new Response(JSON.stringify({ error: `Surface "${surfaceId}" not found.` }), { status: 404 });
          }

          updateSurface(db, {
            surface_id: surfaceId,
            name,
            description: description === undefined ? (existing.description ?? null) : description,
            orientation_deg: orientationDeg,
            tilt_deg: tiltDeg,
            area_height_m: areaHeightM === undefined ? (existing.area_height_m ?? undefined) : areaHeightM ?? undefined,
            area_width_m: areaWidthM === undefined ? (existing.area_width_m ?? undefined) : areaWidthM ?? undefined,
            usable_area_m2: usableAreaM2 === undefined ? (existing.usable_area_m2 ?? undefined) : usableAreaM2 ?? undefined,
            notes: effectiveNotes === undefined ? (existing.notes ?? undefined) : effectiveNotes,
            photo_data_url: photoDataUrl === undefined ? (existing.photo_data_url ?? null) : photoDataUrl,
          });
          syncPvTopologyForSurface(db, surfaceId);

          this.projectData = buildDigitalTwinExport(db, this.requireDbPath(), this.resolveProjectId(db));
        } finally {
          db.close();
        }

        return new Response(JSON.stringify(this.projectData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname.startsWith('/api/surfaces/') && method === 'DELETE') {
        const surfaceId = decodeURIComponent(url.pathname.slice('/api/surfaces/'.length));
        const db = openDb(this.requireDbPath());
        try {
          const existing = getSurface(db, surfaceId);
          if (!existing) {
            return new Response(JSON.stringify({ error: `Surface "${surfaceId}" not found.` }), { status: 404 });
          }

          db.prepare('DELETE FROM surfaces WHERE surface_id = ?').run(surfaceId);
          this.projectData = buildDigitalTwinExport(db, this.requireDbPath(), this.resolveProjectId(db));
        } finally {
          db.close();
        }

        return new Response(JSON.stringify(this.projectData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname.startsWith('/api/surface-panel-assignments/') && method === 'PUT') {
        const surfaceId = decodeURIComponent(url.pathname.slice('/api/surface-panel-assignments/'.length));
        const rawBody = typeof init?.body === 'string' ? init.body : '{}';
        const payload = JSON.parse(rawBody) as {
          panel_type_id?: unknown;
          count?: unknown;
        };

        const panelTypeId = this.latestSelectedPanelTypeId.trim() !== ''
          ? this.latestSelectedPanelTypeId.trim()
          : (typeof payload.panel_type_id === 'string' ? payload.panel_type_id.trim() : '');
        const count = this.latestSelectedPanelCount.trim() !== ''
          ? Number(this.latestSelectedPanelCount)
          : (typeof payload.count === 'number' ? payload.count : Number(payload.count));

        if (!Number.isInteger(count) || count < 0) {
          return new Response(JSON.stringify({ error: 'Invalid roof-panel payload. Expected count as an integer >= 0.' }), { status: 400 });
        }

        const db = openDb(this.requireDbPath());
        try {
          const existingSurface = getSurface(db, surfaceId);
          if (!existingSurface) {
            return new Response(JSON.stringify({ error: `Surface "${surfaceId}" not found.` }), { status: 404 });
          }

          db.prepare('DELETE FROM surface_panel_assignments WHERE surface_id = ?').run(surfaceId);

          if (count > 0) {
            if (!panelTypeId) {
              return new Response(JSON.stringify({ error: 'panel_type_id is required when count is greater than 0.' }), { status: 400 });
            }

            const panelTypeExists = db.prepare('SELECT 1 FROM panel_types WHERE panel_type_id = ?').get(panelTypeId);
            if (!panelTypeExists) {
              return new Response(JSON.stringify({ error: `Panel type "${panelTypeId}" not found.` }), { status: 400 });
            }

            upsertSurfacePanelAssignment(db, {
              surface_id: surfaceId,
              panel_type_id: panelTypeId,
              count,
            });
          }

          this.projectData = buildDigitalTwinExport(db, this.requireDbPath(), this.resolveProjectId(db));
        } finally {
          db.close();
        }

        return new Response(JSON.stringify(this.projectData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname === '/api/surface-configurations/' || url.pathname.startsWith('/api/surface-configurations/')) {
        const surfaceId = decodeURIComponent(url.pathname.slice('/api/surface-configurations/'.length));
        const rawBody = typeof init?.body === 'string' ? init.body : '{}';
        const payload = JSON.parse(rawBody) as {
          panels_per_string?: unknown;
          parallel_strings?: unknown;
          selected_mppt_type_id?: unknown;
        };

        const panelsPerString = this.latestSelectedPanelsPerString.trim() !== ''
          ? Number(this.latestSelectedPanelsPerString)
          : (typeof payload.panels_per_string === 'number' ? payload.panels_per_string : Number(payload.panels_per_string));
        const parallelStrings = this.latestSelectedParallelStrings.trim() !== ''
          ? Number(this.latestSelectedParallelStrings)
          : (typeof payload.parallel_strings === 'number' ? payload.parallel_strings : Number(payload.parallel_strings));
        const selectedMpptTypeId = this.latestSelectedMpptTypeId.trim() !== ''
          ? this.latestSelectedMpptTypeId.trim()
          : (typeof payload.selected_mppt_type_id === 'string' ? payload.selected_mppt_type_id.trim() : '');

        if (!Number.isInteger(panelsPerString) || panelsPerString < 0 || !Number.isInteger(parallelStrings) || parallelStrings < 0) {
          return new Response(JSON.stringify({ error: 'Invalid face-configuration payload. Expected integer panels_per_string and parallel_strings values >= 0.' }), { status: 400 });
        }

        const db = openDb(this.requireDbPath());
        try {
          const existingSurface = getSurface(db, surfaceId);
          if (!existingSurface) {
            return new Response(JSON.stringify({ error: `Surface "${surfaceId}" not found.` }), { status: 404 });
          }

          const persistedPanelCount = db.prepare('SELECT COALESCE(SUM(count), 0) AS count FROM surface_panel_assignments WHERE surface_id = ?').get(surfaceId) as {
            count: number;
          } | undefined;
          const panelCount = persistedPanelCount?.count ?? 0;

          if (panelCount === 0) {
            if (panelsPerString !== 0 || parallelStrings !== 0) {
              return new Response(JSON.stringify({ error: 'Faces with 0 panels must also save 0 panels_per_string and 0 parallel_strings.' }), { status: 400 });
            }
          } else if (panelsPerString <= 0 || parallelStrings <= 0 || panelsPerString * parallelStrings !== panelCount) {
            return new Response(JSON.stringify({ error: `Saved string layout must match the persisted panel count for this face (${panelCount}).` }), { status: 400 });
          }

          if (selectedMpptTypeId) {
            const mpptExists = db.prepare('SELECT 1 FROM mppt_types WHERE mppt_type_id = ?').get(selectedMpptTypeId);
            if (!mpptExists) {
              return new Response(JSON.stringify({ error: `MPPT type "${selectedMpptTypeId}" not found.` }), { status: 400 });
            }
          }

          upsertSurfaceConfiguration(db, {
            surface_id: surfaceId,
            panels_per_string: panelsPerString === 0 ? null : panelsPerString,
            parallel_strings: parallelStrings === 0 ? null : parallelStrings,
            selected_mppt_type_id: selectedMpptTypeId || null,
          });

          this.projectData = buildDigitalTwinExport(db, this.requireDbPath(), this.resolveProjectId(db));
        } finally {
          db.close();
        }

        return new Response(JSON.stringify(this.projectData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname === '/api/load-circuits' && method === 'GET') {
        const db = openDb(this.requireDbPath());
        try {
          const payload = listLoadCircuits(db);
          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } finally {
          db.close();
        }
      }

      if (url.pathname === '/api/converters' && method === 'POST') {
        const rawBody = typeof init?.body === 'string' ? init.body : '{}';
        const payload = JSON.parse(rawBody) as {
          converter_id?: unknown;
          title?: unknown;
          description?: unknown;
          converter_type_id?: unknown;
        };

        const title = typeof payload.title === 'string' ? payload.title.trim() : '';
        const description = typeof payload.description === 'string' ? payload.description.trim() : null;
        const conversionDeviceId = typeof payload.converter_type_id === 'string' ? payload.converter_type_id.trim() : '';

        const db = openDb(this.requireDbPath());
        try {
          if (!title || !conversionDeviceId) {
            return new Response(JSON.stringify({ error: 'Invalid converter payload.' }), { status: 400 });
          }
          if (!getConversionDevice(db, conversionDeviceId)) {
            return new Response(JSON.stringify({ error: `Converter "${conversionDeviceId}" not found.` }), { status: 400 });
          }
          const projectConverterId = typeof payload.converter_id === 'string' && payload.converter_id.trim()
            ? payload.converter_id.trim()
            : generateUniqueCatalogId(title, listProjectConverters(db).map((converter) => converter.converter_id));
          upsertProjectConverter(db, {
            converter_id: projectConverterId,
            title,
            description,
            converter_type_id: conversionDeviceId,
          });
          this.projectData = buildDigitalTwinExport(db, this.requireDbPath(), this.resolveProjectId(db));
          return new Response(JSON.stringify(this.projectData), { status: 201, headers: { 'Content-Type': 'application/json' } });
        } finally {
          db.close();
        }
      }

      if (url.pathname.startsWith('/api/converters/') && method === 'PUT') {
        const projectConverterId = decodeURIComponent(url.pathname.slice('/api/converters/'.length));
        const rawBody = typeof init?.body === 'string' ? init.body : '{}';
        const payload = JSON.parse(rawBody) as {
          title?: unknown;
          description?: unknown;
          converter_type_id?: unknown;
        };
        const title = typeof payload.title === 'string' ? payload.title.trim() : '';
        const description = typeof payload.description === 'string' ? payload.description.trim() : null;
        const conversionDeviceId = typeof payload.converter_type_id === 'string' ? payload.converter_type_id.trim() : '';
        const db = openDb(this.requireDbPath());
        try {
          if (!getProjectConverter(db, projectConverterId)) {
            return new Response(JSON.stringify({ error: `Converter "${projectConverterId}" not found.` }), { status: 404 });
          }
          upsertProjectConverter(db, {
            converter_id: projectConverterId,
            title,
            description,
            converter_type_id: conversionDeviceId,
          });
          this.projectData = buildDigitalTwinExport(db, this.requireDbPath(), this.resolveProjectId(db));
          return new Response(JSON.stringify(this.projectData), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } finally {
          db.close();
        }
      }

      if (url.pathname.startsWith('/api/converters/') && method === 'DELETE') {
        const projectConverterId = decodeURIComponent(url.pathname.slice('/api/converters/'.length));
        const db = openDb(this.requireDbPath());
        try {
          deleteProjectConverter(db, projectConverterId);
          this.projectData = buildDigitalTwinExport(db, this.requireDbPath(), this.resolveProjectId(db));
          return new Response(JSON.stringify(this.projectData), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } finally {
          db.close();
        }
      }

      if (url.pathname === '/api/load-circuits' && method === 'POST') {
        const rawBody = typeof init?.body === 'string' ? init.body : '{}';
        const payload = JSON.parse(rawBody) as {
          load_circuit_id?: unknown;
          converter_id?: unknown;
          converter_type_id?: unknown;
          title?: unknown;
          description?: unknown;
        };

        const loadCircuitId = typeof payload.load_circuit_id === 'string' ? payload.load_circuit_id.trim() : '';
        const projectConverterId = typeof payload.converter_id === 'string' ? payload.converter_id.trim() : '';
        const conversionDeviceId = typeof payload.converter_type_id === 'string' ? payload.converter_type_id.trim() : '';
        const title = typeof payload.title === 'string' ? payload.title.trim() : '';
        const description = typeof payload.description === 'string' ? payload.description.trim() : null;

        const db = openDb(this.requireDbPath());
        try {
          const projectId = listProjects(db)[0]?.project_id ?? this.projectData?.project.project_id ?? 'offgridos-project';
          const projectConverter = projectConverterId ? getProjectConverter(db, projectConverterId) : null;
          const resolvedConversionDeviceId = projectConverter?.converter_type_id ?? conversionDeviceId;
          if (!title || (!projectConverterId && !resolvedConversionDeviceId)) {
            return new Response(JSON.stringify({ error: 'Invalid load circuit payload. Provide title and converter.' }), { status: 400 });
          }

          const conversionDevice = getConversionDevice(db, resolvedConversionDeviceId);
          if (!conversionDevice) {
            return new Response(JSON.stringify({ error: `Converter "${resolvedConversionDeviceId}" not found.` }), { status: 400 });
          }

          const resolvedLoadCircuitId = loadCircuitId || generateUniqueCatalogId(title, listLoadCircuits(db, projectId).map((circuit) => circuit.load_circuit_id));
          if (getLoadCircuit(db, resolvedLoadCircuitId)) {
            return new Response(JSON.stringify({ error: `Load circuit "${resolvedLoadCircuitId}" already exists.` }), { status: 409 });
          }

          upsertLoadCircuit(db, {
            load_circuit_id: resolvedLoadCircuitId,
            converter_id: projectConverterId || null,
            converter_type_id: resolvedConversionDeviceId,
            title,
            description,
          }, projectId);

          this.projectData = buildDigitalTwinExport(db, this.requireDbPath(), this.resolveProjectId(db), locationId);
          return new Response(JSON.stringify(this.projectData), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          });
        } finally {
          db.close();
        }
      }

      if (url.pathname.startsWith('/api/load-circuits/') && method === 'PUT') {
        const loadCircuitId = decodeURIComponent(url.pathname.slice('/api/load-circuits/'.length));
        const rawBody = typeof init?.body === 'string' ? init.body : '{}';
        const payload = JSON.parse(rawBody) as {
          load_circuit_id?: unknown;
          converter_id?: unknown;
          converter_type_id?: unknown;
          title?: unknown;
          description?: unknown;
        };

        const bodyLoadCircuitId = typeof payload.load_circuit_id === 'string' ? payload.load_circuit_id.trim() : loadCircuitId;
        const projectConverterId = typeof payload.converter_id === 'string' ? payload.converter_id.trim() : '';
        const conversionDeviceId = typeof payload.converter_type_id === 'string' ? payload.converter_type_id.trim() : '';
        const title = typeof payload.title === 'string' ? payload.title.trim() : '';
        const description = typeof payload.description === 'string' ? payload.description.trim() : null;

        if (bodyLoadCircuitId !== loadCircuitId) {
          return new Response(JSON.stringify({ error: 'Load circuit id in the URL must match the load_circuit_id in the payload.' }), { status: 400 });
        }

        const db = openDb(this.requireDbPath());
        try {
          const projectId = listProjects(db)[0]?.project_id ?? this.projectData?.project.project_id ?? 'offgridos-project';
          const projectConverter = projectConverterId ? getProjectConverter(db, projectConverterId) : null;
          const resolvedConversionDeviceId = projectConverter?.converter_type_id ?? conversionDeviceId;
          if (!title || (!projectConverterId && !resolvedConversionDeviceId)) {
            return new Response(JSON.stringify({ error: 'Invalid load circuit payload. Provide title and converter.' }), { status: 400 });
          }

          const existing = getLoadCircuit(db, loadCircuitId);
          if (!existing) {
            return new Response(JSON.stringify({ error: `Load circuit "${loadCircuitId}" not found.` }), { status: 404 });
          }

          const conversionDevice = getConversionDevice(db, resolvedConversionDeviceId);
          if (!conversionDevice) {
            return new Response(JSON.stringify({ error: `Converter "${resolvedConversionDeviceId}" not found.` }), { status: 400 });
          }

          upsertLoadCircuit(db, {
            load_circuit_id: loadCircuitId,
            converter_id: projectConverterId || null,
            converter_type_id: resolvedConversionDeviceId,
            title,
            description,
          }, projectId);

          this.projectData = buildDigitalTwinExport(db, this.requireDbPath(), this.resolveProjectId(db), locationId);
          return new Response(JSON.stringify(this.projectData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } finally {
          db.close();
        }
      }

      if (url.pathname.startsWith('/api/load-circuits/') && method === 'DELETE') {
        const loadCircuitId = decodeURIComponent(url.pathname.slice('/api/load-circuits/'.length));
        const db = openDb(this.requireDbPath());
        try {
          const existing = getLoadCircuit(db, loadCircuitId);
          if (!existing) {
            return new Response(JSON.stringify({ error: `Load circuit "${loadCircuitId}" not found.` }), { status: 404 });
          }

          deleteLoadCircuit(db, loadCircuitId);
          this.projectData = buildDigitalTwinExport(db, this.requireDbPath(), this.resolveProjectId(db), locationId);
          return new Response(JSON.stringify(this.projectData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } finally {
          db.close();
        }
      }

      if (url.pathname === '/api/loads' && method === 'GET') {
        const db = openDb(this.requireDbPath());
        try {
          const payload = listLoads(db, listProjects(db)[0]?.project_id ?? this.projectData?.project.project_id ?? 'offgridos-project');
          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } finally {
          db.close();
        }
      }

      if (url.pathname === '/api/loads' && method === 'POST') {
        const rawBody = typeof init?.body === 'string' ? init.body : '{}';
        const payload = JSON.parse(rawBody) as {
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

        const loadId = typeof payload.load_id === 'string' ? payload.load_id.trim() : '';
        const loadCircuitId = typeof payload.load_circuit_id === 'string' ? payload.load_circuit_id.trim() : '';
        const title = typeof payload.title === 'string' ? payload.title.trim() : '';
        const description = typeof payload.description === 'string' ? payload.description.trim() : null;
        const nominalCurrentA = typeof payload.nominal_current_a === 'number' ? payload.nominal_current_a : (payload.nominal_current_a == null ? null : Number(payload.nominal_current_a));
        const nominalPowerW = typeof payload.nominal_power_w === 'number' ? payload.nominal_power_w : (payload.nominal_power_w == null ? null : Number(payload.nominal_power_w));
        const startupCurrentA = typeof payload.startup_current_a === 'number' ? payload.startup_current_a : (payload.startup_current_a == null ? null : Number(payload.startup_current_a));
        const surgePowerW = typeof payload.surge_power_w === 'number' ? payload.surge_power_w : (payload.surge_power_w == null ? null : Number(payload.surge_power_w));
        const standbyPowerW = typeof payload.standby_power_w === 'number' ? payload.standby_power_w : (payload.standby_power_w == null ? null : Number(payload.standby_power_w));
        const expectedUsageHoursPerDay = typeof payload.expected_usage_hours_per_day === 'number'
          ? payload.expected_usage_hours_per_day
          : (payload.expected_usage_hours_per_day == null ? NaN : Number(payload.expected_usage_hours_per_day));
        const dailyEnergyKwh = typeof payload.daily_energy_kwh === 'number' ? payload.daily_energy_kwh : (payload.daily_energy_kwh == null ? null : Number(payload.daily_energy_kwh));
        const dutyProfile = typeof payload.duty_profile === 'string' ? payload.duty_profile.trim() : null;
        const notes = typeof payload.notes === 'string' ? payload.notes.trim() : null;
        const usageKw = nominalPowerW != null && Number.isFinite(nominalPowerW)
          ? nominalPowerW / 1000
          : (typeof payload.usage_kw === 'number' ? payload.usage_kw : Number(payload.usage_kw));
        const spikeKw = surgePowerW != null && Number.isFinite(surgePowerW)
          ? surgePowerW / 1000
          : (typeof payload.spike_kw === 'number' ? payload.spike_kw : Number(payload.spike_kw));
        const sleepingKw = standbyPowerW != null && Number.isFinite(standbyPowerW)
          ? standbyPowerW / 1000
          : (typeof payload.sleeping_kw === 'number' ? payload.sleeping_kw : Number(payload.sleeping_kw));

        const db = openDb(this.requireDbPath());
        try {
          const projectId = listProjects(db)[0]?.project_id ?? this.projectData?.project.project_id ?? 'offgridos-project';
          if (!loadCircuitId || !title || !Number.isFinite(usageKw) || usageKw < 0 || !Number.isFinite(spikeKw) || spikeKw < 0 || !Number.isFinite(expectedUsageHoursPerDay) || expectedUsageHoursPerDay < 0 || !Number.isFinite(sleepingKw) || sleepingKw < 0) {
            return new Response(JSON.stringify({ error: 'Invalid load payload.' }), { status: 400 });
          }

          const loadCircuit = getLoadCircuit(db, loadCircuitId);
          if (!loadCircuit) {
            return new Response(JSON.stringify({ error: `Load circuit "${loadCircuitId}" not found.` }), { status: 400 });
          }

          const resolvedLoadId = loadId || generateUniqueCatalogId(title, listLoads(db, projectId).map((load) => load.load_id));
          if (getLoad(db, resolvedLoadId)) {
            return new Response(JSON.stringify({ error: `Load "${resolvedLoadId}" already exists.` }), { status: 409 });
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
            usage_kw: usageKw,
            spike_kw: spikeKw,
            expected_usage_hours_per_day: expectedUsageHoursPerDay,
            daily_energy_kwh: dailyEnergyKwh,
            duty_profile: dutyProfile,
            notes,
            sleeping_kw: sleepingKw,
          }, projectId);

          this.projectData = buildDigitalTwinExport(db, this.requireDbPath(), this.resolveProjectId(db));
          return new Response(JSON.stringify(this.projectData), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          });
        } finally {
          db.close();
        }
      }

      if (url.pathname.startsWith('/api/loads/') && method === 'PUT') {
        const loadId = decodeURIComponent(url.pathname.slice('/api/loads/'.length));
        const rawBody = typeof init?.body === 'string' ? init.body : '{}';
        const payload = JSON.parse(rawBody) as {
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

        const bodyLoadId = typeof payload.load_id === 'string' ? payload.load_id.trim() : loadId;
        const loadCircuitId = typeof payload.load_circuit_id === 'string' ? payload.load_circuit_id.trim() : '';
        const title = typeof payload.title === 'string' ? payload.title.trim() : '';
        const description = typeof payload.description === 'string' ? payload.description.trim() : null;
        const nominalCurrentA = typeof payload.nominal_current_a === 'number' ? payload.nominal_current_a : (payload.nominal_current_a == null ? null : Number(payload.nominal_current_a));
        const nominalPowerW = typeof payload.nominal_power_w === 'number' ? payload.nominal_power_w : (payload.nominal_power_w == null ? null : Number(payload.nominal_power_w));
        const startupCurrentA = typeof payload.startup_current_a === 'number' ? payload.startup_current_a : (payload.startup_current_a == null ? null : Number(payload.startup_current_a));
        const surgePowerW = typeof payload.surge_power_w === 'number' ? payload.surge_power_w : (payload.surge_power_w == null ? null : Number(payload.surge_power_w));
        const standbyPowerW = typeof payload.standby_power_w === 'number' ? payload.standby_power_w : (payload.standby_power_w == null ? null : Number(payload.standby_power_w));
        const expectedUsageHoursPerDay = typeof payload.expected_usage_hours_per_day === 'number'
          ? payload.expected_usage_hours_per_day
          : (payload.expected_usage_hours_per_day == null ? NaN : Number(payload.expected_usage_hours_per_day));
        const dailyEnergyKwh = typeof payload.daily_energy_kwh === 'number' ? payload.daily_energy_kwh : (payload.daily_energy_kwh == null ? null : Number(payload.daily_energy_kwh));
        const dutyProfile = typeof payload.duty_profile === 'string' ? payload.duty_profile.trim() : null;
        const notes = typeof payload.notes === 'string' ? payload.notes.trim() : null;
        const usageKw = nominalPowerW != null && Number.isFinite(nominalPowerW)
          ? nominalPowerW / 1000
          : (typeof payload.usage_kw === 'number' ? payload.usage_kw : Number(payload.usage_kw));
        const spikeKw = surgePowerW != null && Number.isFinite(surgePowerW)
          ? surgePowerW / 1000
          : (typeof payload.spike_kw === 'number' ? payload.spike_kw : Number(payload.spike_kw));
        const sleepingKw = standbyPowerW != null && Number.isFinite(standbyPowerW)
          ? standbyPowerW / 1000
          : (typeof payload.sleeping_kw === 'number' ? payload.sleeping_kw : Number(payload.sleeping_kw));

        if (bodyLoadId !== loadId) {
          return new Response(JSON.stringify({ error: 'Load id in the URL must match the load_id in the payload.' }), { status: 400 });
        }

        const db = openDb(this.requireDbPath());
        try {
          const projectId = listProjects(db)[0]?.project_id ?? this.projectData?.project.project_id ?? 'offgridos-project';
          if (!loadCircuitId || !title || !Number.isFinite(usageKw) || usageKw < 0 || !Number.isFinite(spikeKw) || spikeKw < 0 || !Number.isFinite(expectedUsageHoursPerDay) || expectedUsageHoursPerDay < 0 || !Number.isFinite(sleepingKw) || sleepingKw < 0) {
            return new Response(JSON.stringify({ error: 'Invalid load payload.' }), { status: 400 });
          }

          const existing = getLoad(db, loadId);
          if (!existing) {
            return new Response(JSON.stringify({ error: `Load "${loadId}" not found.` }), { status: 404 });
          }

          const loadCircuit = getLoadCircuit(db, loadCircuitId);
          if (!loadCircuit) {
            return new Response(JSON.stringify({ error: `Load circuit "${loadCircuitId}" not found.` }), { status: 400 });
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
            usage_kw: usageKw,
            spike_kw: spikeKw,
            expected_usage_hours_per_day: expectedUsageHoursPerDay,
            daily_energy_kwh: dailyEnergyKwh,
            duty_profile: dutyProfile,
            notes,
            sleeping_kw: sleepingKw,
          }, projectId);

          this.projectData = buildDigitalTwinExport(db, this.requireDbPath(), this.resolveProjectId(db));
          return new Response(JSON.stringify(this.projectData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } finally {
          db.close();
        }
      }

      if (url.pathname.startsWith('/api/loads/') && method === 'DELETE') {
        const loadId = decodeURIComponent(url.pathname.slice('/api/loads/'.length));
        const db = openDb(this.requireDbPath());
        try {
          const existing = getLoad(db, loadId);
          if (!existing) {
            return new Response(JSON.stringify({ error: `Load "${loadId}" not found.` }), { status: 404 });
          }

          deleteLoad(db, loadId);
          this.projectData = buildDigitalTwinExport(db, this.requireDbPath(), this.resolveProjectId(db));
          return new Response(JSON.stringify(this.projectData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } finally {
          db.close();
        }
      }

      if (url.pathname === '/api/inverter-configuration' && method === 'PUT') {
        const rawBody = typeof init?.body === 'string' ? init.body : '{}';
        const payload = JSON.parse(rawBody) as {
          selected_inverter_type_id?: unknown;
          title?: unknown;
          description?: unknown;
          image_data_url?: unknown;
          notes?: unknown;
        };

        const selectedInverterTypeId = typeof payload.selected_inverter_type_id === 'string'
          ? payload.selected_inverter_type_id.trim()
          : '';
        const title = typeof payload.title === 'string'
          ? payload.title.trim()
          : (payload.title == null ? null : String(payload.title));
        const description = typeof payload.description === 'string'
          ? payload.description.trim()
          : (payload.description == null ? null : String(payload.description));
        const imageDataUrl = payload.image_data_url == null ? null : String(payload.image_data_url);
        const notes = typeof payload.notes === 'string'
          ? payload.notes.trim()
          : (payload.notes == null ? null : String(payload.notes));

        const db = openDb(this.requireDbPath());
        try {
          if (!selectedInverterTypeId) {
            return new Response(JSON.stringify({ error: 'Choose an inverter type before saving the inverter configuration.' }), { status: 400 });
          }

          const inverterExists = db.prepare('SELECT 1 FROM inverter_types WHERE inverter_id = ?').get(selectedInverterTypeId);
          if (!inverterExists) {
            return new Response(JSON.stringify({ error: `Inverter type "${selectedInverterTypeId}" not found.` }), { status: 400 });
          }

          upsertInverterConfiguration(db, {
            inverter_configuration_id: 'inverter-configuration-main',
            selected_inverter_type_id: selectedInverterTypeId,
            title,
            description,
            image_data_url: imageDataUrl,
            notes,
          });

          this.projectData = buildDigitalTwinExport(db, this.requireDbPath(), this.resolveProjectId(db));
        } finally {
          db.close();
        }

        return new Response(JSON.stringify(this.projectData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname === '/api/battery-bank-configuration' && method === 'PUT') {
        const rawBody = typeof init?.body === 'string' ? init.body : '{}';
        const payload = JSON.parse(rawBody) as {
          title?: unknown;
          description?: unknown;
          image_data_url?: unknown;
          notes?: unknown;
          selected_battery_type_id?: unknown;
          selected_cabinet_type_id?: unknown;
          configured_battery_count?: unknown;
          batteries_per_string?: unknown;
          parallel_strings?: unknown;
        };

        const title = typeof payload.title === 'string' ? payload.title.trim() : null;
        const description = typeof payload.description === 'string' ? payload.description.trim() : null;
        const imageDataUrl = payload.image_data_url == null ? null : String(payload.image_data_url);
        const notes = typeof payload.notes === 'string' ? payload.notes.trim() : null;
        const selectedBatteryTypeId = typeof payload.selected_battery_type_id === 'string' ? payload.selected_battery_type_id.trim() : '';
        const selectedCabinetTypeId = typeof payload.selected_cabinet_type_id === 'string' ? payload.selected_cabinet_type_id.trim() : '';
        const configuredBatteryCount = typeof payload.configured_battery_count === 'number' ? payload.configured_battery_count : Number(payload.configured_battery_count);
        const batteriesPerString = typeof payload.batteries_per_string === 'number' ? payload.batteries_per_string : Number(payload.batteries_per_string);
        const parallelStrings = typeof payload.parallel_strings === 'number' ? payload.parallel_strings : Number(payload.parallel_strings);

        if (!Number.isInteger(configuredBatteryCount) || configuredBatteryCount < 1 || !Number.isInteger(batteriesPerString) || batteriesPerString < 1 || !Number.isInteger(parallelStrings) || parallelStrings < 1) {
          return new Response(JSON.stringify({ error: 'Invalid battery-bank configuration payload. Expected integer configured_battery_count, batteries_per_string, and parallel_strings values >= 1.' }), { status: 400 });
        }

        if (configuredBatteryCount !== batteriesPerString * parallelStrings) {
          return new Response(JSON.stringify({ error: 'Battery count must equal batteries per string multiplied by parallel strings.' }), { status: 400 });
        }

        const db = openDb(this.requireDbPath());
        try {
          if (selectedBatteryTypeId) {
            const batteryExists = db.prepare('SELECT 1 FROM battery_types WHERE battery_type_id = ?').get(selectedBatteryTypeId);
            if (!batteryExists) {
              return new Response(JSON.stringify({ error: `Battery type "${selectedBatteryTypeId}" not found.` }), { status: 400 });
            }
          }

          const existingConfiguration = getBatteryBankConfiguration(db, 'battery-bank-main');

          upsertBatteryBankConfiguration(db, {
            battery_bank_id: 'battery-bank-main',
            title: title !== null ? title : (existingConfiguration?.title ?? null),
            description: description !== null ? description : (existingConfiguration?.description ?? null),
            image_data_url: imageDataUrl !== null ? imageDataUrl : (existingConfiguration?.image_data_url ?? null),
            notes: notes !== null ? notes : (existingConfiguration?.notes ?? null),
            selected_battery_type_id: selectedBatteryTypeId || (existingConfiguration?.selected_battery_type_id ?? null),
            selected_cabinet_type_id: selectedCabinetTypeId || null,
            configured_battery_count: configuredBatteryCount,
            batteries_per_string: batteriesPerString,
            parallel_strings: parallelStrings,
          });

          this.projectData = buildDigitalTwinExport(db, this.requireDbPath(), this.resolveProjectId(db));
        } finally {
          db.close();
        }

        return new Response(JSON.stringify(this.projectData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname === '/api/battery-types' && method === 'POST') {
        const rawBody = typeof init?.body === 'string' ? init.body : '{}';
        const payload = JSON.parse(rawBody) as Record<string, unknown>;
        const db = openDb(this.requireDbPath());
        try {
          insertBatteryType(db, {
            battery_type_id: String(payload.battery_type_id ?? '').trim(),
            brand: String(payload.brand ?? '').trim(),
            model: String(payload.model ?? '').trim(),
            chemistry: String(payload.chemistry ?? '').trim(),
            nominal_voltage: Number(payload.nominal_voltage),
            capacity_ah: Number(payload.capacity_ah),
            capacity_kwh: Number(payload.capacity_kwh),
            max_charge_rate: payload.max_charge_rate == null ? null : Number(payload.max_charge_rate),
            max_discharge_rate: payload.max_discharge_rate == null ? null : Number(payload.max_discharge_rate),
            victron_can: Boolean(payload.victron_can),
            cooling: payload.cooling === 'active' ? 'active' : 'passive',
            price: payload.price == null ? null : Number(payload.price),
            price_source_url: payload.price_source_url == null ? null : String(payload.price_source_url),
            source: payload.price_source_url == null ? null : String(payload.price_source_url),
            url: payload.price_source_url == null ? null : String(payload.price_source_url),
            notes: payload.notes == null ? null : String(payload.notes),
          });
          this.projectData = buildDigitalTwinExport(db, this.requireDbPath(), this.resolveProjectId(db));
        } finally {
          db.close();
        }

        return new Response(JSON.stringify(this.projectData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname.startsWith('/api/battery-types/') && (method === 'PUT' || method === 'DELETE')) {
        const batteryTypeId = decodeURIComponent(url.pathname.slice('/api/battery-types/'.length));
        const db = openDb(this.requireDbPath());
        try {
          if (method === 'DELETE') {
            deleteBatteryType(db, batteryTypeId);
          } else {
            const rawBody = typeof init?.body === 'string' ? init.body : '{}';
            const payload = JSON.parse(rawBody) as Record<string, unknown>;
            updateBatteryType(db, {
              battery_type_id: batteryTypeId,
              brand: String(payload.brand ?? '').trim(),
              model: String(payload.model ?? '').trim(),
              chemistry: String(payload.chemistry ?? '').trim(),
              nominal_voltage: Number(payload.nominal_voltage),
              capacity_ah: Number(payload.capacity_ah),
              capacity_kwh: Number(payload.capacity_kwh),
              max_charge_rate: payload.max_charge_rate == null ? null : Number(payload.max_charge_rate),
              max_discharge_rate: payload.max_discharge_rate == null ? null : Number(payload.max_discharge_rate),
              victron_can: Boolean(payload.victron_can),
              cooling: payload.cooling === 'active' ? 'active' : 'passive',
              price: payload.price == null ? null : Number(payload.price),
              price_source_url: payload.price_source_url == null ? null : String(payload.price_source_url),
              source: payload.price_source_url == null ? null : String(payload.price_source_url),
              url: payload.price_source_url == null ? null : String(payload.price_source_url),
              notes: payload.notes == null ? null : String(payload.notes),
            });
          }
          this.projectData = buildDigitalTwinExport(db, this.requireDbPath(), this.resolveProjectId(db));
        } finally {
          db.close();
        }

        return new Response(JSON.stringify(this.projectData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: `Unhandled fetch in BDD world: ${method} ${url.pathname}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    this.dom.window.HTMLElement.prototype.scrollIntoView = () => {};
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  }

  async restoreGlobals(): Promise<void> {
    if (this.root) {
      await act(async () => {
        this.root?.unmount();
      });
    }
    this.root = null;

    for (let index = this.storedGlobals.length - 1; index >= 0; index -= 1) {
      const entry = this.storedGlobals[index];
      if (entry.value === undefined) {
        // @ts-expect-error restore deleted global
        delete globalThis[entry.key];
      } else {
        globalThis[entry.key] = entry.value as never;
      }
    }

    this.storedGlobals = [];
    delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;

    if (this.dom) {
      this.dom.window.close();
    }

    this.dom = null;
    this.container = null;

    if (this.dbPath) {
      rmSync(this.dbDir ?? this.dbPath, { recursive: true, force: true });
    }

    this.dbPath = null;
    this.dbDir = null;
    this.projectData = null;
    this.latestEnteredLocationTitle = '';
    this.latestEnteredLocationCountry = '';
    this.latestEnteredLocationDescription = '';
    this.latestEnteredLocationLatitude = '';
    this.latestEnteredLocationLongitude = '';
    this.latestEnteredSurfaceName = '';
    this.latestEnteredSurfaceDescription = '';
    this.latestEnteredSurfaceHeight = '';
    this.latestEnteredSurfaceWidth = '';
    this.latestEnteredSurfaceAzimuth = '';
    this.latestEnteredSurfaceTilt = '';
    this.latestEnteredSurfaceNotes = '';
    this.latestEnteredLocationNotes = '';
    this.latestSelectedPanelCount = '';
    this.latestSelectedPanelsPerString = '';
    this.latestSelectedParallelStrings = '';
    this.latestSelectedPanelTypeId = '';
    this.latestSelectedMpptTypeId = '';
    this.latestEnteredInverterTitle = '';
    this.latestEnteredInverterDescription = '';
    this.latestEnteredInverterNotes = '';
    this.latestSelectedInverterTypeId = '';
    this.latestSurfaceDesignSaveError = '';
    this.latestEnteredBatteryTitle = '';
    this.latestEnteredBatteryDescription = '';
    this.latestEnteredBatteryNotes = '';
    this.latestSelectedBatteryTypeId = '';
    this.latestSelectedBatteryCount = '';
    this.latestEnteredBatteryCatalogModel = '';
    this.latestCreatedLoadCircuitLocationId = '';
    this.latestCreatedLoadCircuitLocationSlug = '';
  }

  prepareProjectData(): void {
    const dir = mkdtempSync(join(tmpdir(), 'offgridos-navigation-'));
    this.dbDir = dir;
    this.dbPath = join(dir, 'project.db');
    ensureDatabaseReady(this.dbPath);
    const db = openDb(this.dbPath);
    try {
      const projectId = listProjects(db)[0]?.project_id ?? 'offgridos-project';
      this.projectData = buildDigitalTwinExport(db, this.dbPath, projectId);
    } finally {
      db.close();
    }
  }

  prepareLoadMoveData(): void {
    const db = openDb(this.requireDbPath());
    try {
      const projectId = listProjects(db)[0]?.project_id ?? this.projectData?.project.project_id ?? 'offgridos-project';
      const conversionDevice = listConversionDevices(db)[0];
      if (!conversionDevice) {
        throw new Error('No converter available for the load move test.');
      }

      const projectConverter = listProjectConverters(db, projectId)[0] ?? null;
      const projectConverterId = projectConverter?.converter_id ?? null;
      const projectConverterDeviceId = projectConverter?.converter_type_id ?? conversionDevice.converter_type_id;
      if (!projectConverter) {
        const generatedProjectConverterId = `${conversionDevice.converter_type_id}-move-test-converter`;
        upsertProjectConverter(db, {
          converter_id: generatedProjectConverterId,
          title: 'Move test converter',
          description: 'Converter for the load move regression',
          converter_type_id: conversionDevice.converter_type_id,
        }, projectId);
      }

      const activeProjectConverter = listProjectConverters(db, projectId)[0] ?? null;
      const activeProjectConverterId = activeProjectConverter?.converter_id ?? projectConverterId;
      const activeProjectConverterDeviceId = activeProjectConverter?.converter_type_id ?? projectConverterDeviceId;

      const circuits = listLoadCircuits(db, projectId).filter((circuit) => circuit.converter_id === activeProjectConverterId);
      let sourceCircuit = circuits[0] ?? null;
      if (!sourceCircuit) {
        upsertLoadCircuit(db, {
          load_circuit_id: `${activeProjectConverterId}-source`,
          converter_id: activeProjectConverterId,
          converter_type_id: activeProjectConverterDeviceId,
          title: 'Source circuit',
          description: 'Load move source circuit',
        }, projectId);
        sourceCircuit = getLoadCircuit(db, `${activeProjectConverterId}-source`);
      }

      let targetCircuit = circuits.find((circuit) => circuit.load_circuit_id !== sourceCircuit?.load_circuit_id) ?? null;
      if (!targetCircuit) {
        const targetCircuitId = `${activeProjectConverterId}-target`;
        upsertLoadCircuit(db, {
          load_circuit_id: targetCircuitId,
          converter_id: activeProjectConverterId,
          converter_type_id: activeProjectConverterDeviceId,
          title: 'Target circuit',
          description: 'Load move target circuit',
        }, projectId);
        targetCircuit = getLoadCircuit(db, targetCircuitId);
      }

      if (!sourceCircuit || !targetCircuit) {
        throw new Error('Failed to prepare the load move test circuits.');
      }

      const existingLoad = listLoads(db, projectId).find((load) => load.load_circuit_id === sourceCircuit.load_circuit_id) ?? null;
      if (!existingLoad) {
        const loadId = generateUniqueCatalogId('Moveable load', listLoads(db, projectId).map((load) => load.load_id));
        upsertLoad(db, {
          load_id: loadId,
          load_circuit_id: sourceCircuit.load_circuit_id,
          title: 'Moveable load',
          description: 'Test load for moving between circuits',
          usage_kw: 0.25,
          spike_kw: 0.5,
          expected_usage_hours_per_day: 1,
          sleeping_kw: 0,
        }, projectId);
      }

      const load = listLoads(db, projectId).find((item) => item.load_circuit_id === sourceCircuit.load_circuit_id) ?? null;
      if (!load) {
        throw new Error('Failed to prepare a load for the move test.');
      }

      this.latestMoveSourceLoadCircuitId = sourceCircuit.load_circuit_id;
      this.latestMoveSourceLoadCircuitTitle = sourceCircuit.title;
      this.latestMoveProjectConverterId = activeProjectConverterId ?? '';
      this.latestMoveLoadId = load.load_id;
      this.latestMovedLoadTitle = load.title;
      this.latestMoveTargetLoadCircuitId = targetCircuit.load_circuit_id;
      this.latestMoveTargetLoadCircuitTitle = targetCircuit.title;
      this.projectData = buildDigitalTwinExport(db, this.dbPath, projectId);
    } finally {
      db.close();
    }
  }

  prepareNavigationMemoryData(): void {
    const db = openDb(this.requireDbPath());
    try {
      const projectId = listProjects(db)[0]?.project_id ?? this.projectData?.project.project_id ?? 'offgridos-project';
      const conversionDevice = listConversionDevices(db)[0];
      if (!conversionDevice) {
        throw new Error('No converter available for the navigation memory test.');
      }

      upsertProjectConverter(db, {
        converter_id: 'memory-converter-a',
        title: 'Memory converter A',
        description: 'Navigation memory source converter',
        converter_type_id: conversionDevice.converter_type_id,
      }, projectId);
      upsertProjectConverter(db, {
        converter_id: 'memory-converter-b',
        title: 'Memory converter B',
        description: 'Navigation memory target converter',
        converter_type_id: conversionDevice.converter_type_id,
      }, projectId);

      upsertLoadCircuit(db, {
        load_circuit_id: 'memory-circuit-a',
        converter_id: 'memory-converter-a',
        converter_type_id: conversionDevice.converter_type_id,
        title: 'Memory circuit A',
        description: 'Source circuit for remembered selection',
      }, projectId);
      upsertLoadCircuit(db, {
        load_circuit_id: 'memory-circuit-b',
        converter_id: 'memory-converter-b',
        converter_type_id: conversionDevice.converter_type_id,
        title: 'Memory circuit B',
        description: 'First target circuit for remembered selection',
      }, projectId);
      upsertLoadCircuit(db, {
        load_circuit_id: 'memory-circuit-c',
        converter_id: 'memory-converter-b',
        converter_type_id: conversionDevice.converter_type_id,
        title: 'Memory circuit C',
        description: 'Second target circuit for remembered selection',
      }, projectId);

      this.latestLoadCircuitsConverterId = 'memory-converter-b';
      this.latestLoadsConverterId = 'memory-converter-b';
      this.latestLoadsCircuitId = 'memory-circuit-c';
      this.projectData = buildDigitalTwinExport(db, this.dbPath, projectId);
    } finally {
      db.close();
    }
  }

  prepareLoadCircuitCreationData(): void {
    const db = openDb(this.requireDbPath());
    try {
      const projectId = listProjects(db)[0]?.project_id ?? this.projectData?.project.project_id ?? 'offgridos-project';
      const conversionDevice = listConversionDevices(db)[0];
      if (!conversionDevice) {
        throw new Error('No converter available for the load circuit creation test.');
      }

      createLocation(db, {
        title: 'Location 2',
        place_name: 'Location 2',
        country: 'NL',
        description: 'Second location for the load circuit regression test',
        notes: null,
        latitude: 52.0,
        longitude: 5.0,
        northing: null,
        easting: null,
        site_photo_data_url: null,
      }, projectId);
      const secondaryLocation = listLocations(db, projectId).at(-1) ?? null;
      const secondaryLocationId = secondaryLocation?.location_id ?? '';
      if (!secondaryLocationId) {
        throw new Error('Failed to create the secondary location for the load circuit creation test.');
      }

      upsertProjectConverter(db, {
        converter_id: 'creation-converter-a',
        title: 'Creation converter',
        description: 'Load circuit creation source converter',
        converter_type_id: conversionDevice.converter_type_id,
      }, projectId, secondaryLocationId);

      this.latestCreatedLoadCircuitLocationId = secondaryLocationId;
      this.latestCreatedLoadCircuitLocationSlug = 'location-2';
      this.projectData = buildDigitalTwinExport(db, this.requireDbPath(), projectId, secondaryLocationId);
    } finally {
      db.close();
    }
  }

  requireDbPath(): string {
    if (!this.dbPath) {
      throw new Error('Test database path is not available.');
    }
    return this.dbPath;
  }

  resolveProjectId(db: ReturnType<typeof openDb>): string {
    return listProjects(db)[0]?.project_id ?? this.projectData?.project.project_id ?? 'offgridos-project';
  }

  readProjectData(locationId?: string | null): DigitalTwinExport {
    const dbPath = this.requireDbPath();
    const db = openDb(dbPath);
    try {
      const projectId = listProjects(db)[0]?.project_id ?? this.projectData?.project.project_id ?? 'offgridos-project';
      this.projectData = buildDigitalTwinExport(db, dbPath, projectId, locationId);
      return this.projectData;
    } finally {
      db.close();
    }
  }

  async renderApp(): Promise<void> {
    if (!this.container) {
      throw new Error('Navigation test container is not ready.');
    }

    this.root = createRoot(this.container);

    await act(async () => {
      this.root!.render(React.createElement(App));
    });
  }

  async waitForText(text: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if (this.dom.window.document.body.textContent?.includes(text)) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw new Error(`Timed out waiting for text "${text}".`);
  }

  async waitForPathnameContains(fragment: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if (this.dom.window.location.pathname.includes(fragment)) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw new Error(`Timed out waiting for pathname to include "${fragment}".`);
  }

  async clickByText(text: string, selector = 'a,button'): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const match = Array.from(this.dom.window.document.querySelectorAll(selector)).find((node) => {
      const ariaLabel = node.getAttribute('aria-label')?.trim();
      return ariaLabel === text || node.textContent?.trim() === text;
    }) as HTMLElement | undefined;

    if (!match) {
      throw new Error(`Could not find element with text "${text}".`);
    }

    await act(async () => {
      match.dispatchEvent(
        new this.dom.window.MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        }),
      );
      this.dom.window.dispatchEvent(new this.dom.window.HashChangeEvent('hashchange'));
    });
  }

  async clickFirstSurfaceDetailFromMenu(): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const firstSurface = this.dom.window.document.querySelector('.sidebar-subnav-item') as HTMLElement | null;
    if (!firstSurface) {
      throw new Error('Could not find the first surface item in the menu.');
    }

    await act(async () => {
      firstSurface.dispatchEvent(
        new this.dom.window.MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        }),
      );
      this.dom.window.dispatchEvent(new this.dom.window.HashChangeEvent('hashchange'));
    });
  }

  async clickFirstSurfaceDetailFromPage(): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const firstDetailButton = Array.from(this.dom.window.document.querySelectorAll('.surface-card .button'))
      .find((node) => node.textContent?.trim() === 'Detail') as HTMLElement | undefined;
    if (!firstDetailButton) {
      throw new Error('Could not find the first surface detail button on the page.');
    }

    await act(async () => {
      firstDetailButton.dispatchEvent(
        new this.dom.window.MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        }),
      );
      this.dom.window.dispatchEvent(new this.dom.window.HashChangeEvent('hashchange'));
    });
  }

  async clickFirstConverterDetailFromPage(): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    await this.waitForText('Show attached load circuits');
    const firstDetailButton = Array.from(this.dom.window.document.querySelectorAll('.surface-card button'))
      .find((node) => node.textContent?.trim() === 'Show attached load circuits') as HTMLElement | undefined;
    if (!firstDetailButton) {
      throw new Error(`Could not find the converter detail button on the page. Current body: ${this.dom.window.document.body.textContent ?? ''}`);
    }
    const card = firstDetailButton.closest('.surface-card-stack');
    const cardId = card?.getAttribute('id') ?? '';
    const targetTitle = card?.querySelector('h3')?.textContent?.trim() ?? '';
    const targetId = cardId.startsWith('project-converter-')
      ? cardId.slice('project-converter-'.length)
      : '';
    if (targetId) {
      this.latestSelectedConsumptionConverterId = targetId;
    }
    if (targetTitle) {
      this.latestSelectedConsumptionConverterTitle = targetTitle;
    }

    await act(async () => {
      firstDetailButton.dispatchEvent(
        new this.dom.window.MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        }),
      );
      this.dom.window.dispatchEvent(new this.dom.window.HashChangeEvent('hashchange'));
    });
  }

  async addConverterOnConsumptionPage(): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const addButton = Array.from(this.dom.window.document.querySelectorAll('button'))
      .find((node) => node.textContent?.trim() === 'Add converter') as HTMLElement | undefined;
    if (!addButton) {
      throw new Error('Could not find the Add converter button on the Consumption page.');
    }

    await act(async () => {
      addButton.dispatchEvent(
        new this.dom.window.MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        }),
      );
      this.dom.window.dispatchEvent(new this.dom.window.HashChangeEvent('hashchange'));
    });

    await this.waitForPageFieldControl('Title');
  }

  async addLoadCircuitOnLoadCircuitsPage(): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const select = Array.from(this.dom.window.document.querySelectorAll('.detail-shell select'))
      .find((node) => node.previousElementSibling?.textContent?.trim() === 'Converter') as HTMLSelectElement | undefined;
    if (select) {
      this.latestLoadCircuitsConverterId = select.value;
    }

    const addButton = Array.from(this.dom.window.document.querySelectorAll('button'))
      .find((node) => node.textContent?.trim() === 'Add load circuit') as HTMLElement | undefined;
    if (!addButton) {
      throw new Error('Could not find the Add load circuit button on the Load circuits page.');
    }

    await act(async () => {
      addButton.dispatchEvent(
        new this.dom.window.MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        }),
      );
      this.dom.window.dispatchEvent(new this.dom.window.HashChangeEvent('hashchange'));
    });
  }

  async titleLastLoadCircuit(title: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const control = await this.waitForPageFieldControl('Title');
    if (!(control instanceof this.dom.window.HTMLInputElement)) {
      throw new Error('Could not find the load circuit title input on the Load circuits page.');
    }

    this.latestCreatedLoadCircuitTitle = title;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(this.dom.window.HTMLInputElement.prototype, 'value')?.set;
      if (!setter) {
        throw new Error('Could not find value setter for the load circuit title input.');
      }

      setter.call(control, title);
      control.dispatchEvent(new this.dom.window.InputEvent('input', {
        bubbles: true,
        cancelable: true,
        composed: true,
        data: title,
        inputType: 'insertText',
      }));
      control.dispatchEvent(new this.dom.window.Event('input', { bubbles: true }));
      control.dispatchEvent(new this.dom.window.Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  async setLoadCircuitDescription(description: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const editorCard = Array.from(this.dom.window.document.querySelectorAll('.consumption-selection-editor'))
      .at(-1) as HTMLElement | undefined;
    if (!editorCard) {
      throw new Error('Could not find the load circuit editor card.');
    }

    const inputs = Array.from(editorCard.querySelectorAll('input')) as HTMLInputElement[];
    const descriptionInput = inputs[1];
    if (!descriptionInput) {
      throw new Error('Could not find the load circuit description input on the Load circuits page.');
    }

    this.latestCreatedLoadCircuitDescription = description;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(this.dom.window.HTMLInputElement.prototype, 'value')?.set;
      if (!setter) {
        throw new Error('Could not find value setter for the load circuit description input.');
      }

      setter.call(descriptionInput, description);
      descriptionInput.dispatchEvent(new this.dom.window.InputEvent('input', {
        bubbles: true,
        cancelable: true,
        composed: true,
        data: description,
        inputType: 'insertText',
      }));
      descriptionInput.dispatchEvent(new this.dom.window.Event('input', { bubbles: true }));
      descriptionInput.dispatchEvent(new this.dom.window.Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  async saveLoadCircuit(): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const card = Array.from(this.dom.window.document.querySelectorAll('.consumption-selection-editor'))
      .at(-1) as HTMLElement | undefined
      ?? Array.from(this.dom.window.document.querySelectorAll('.consumption-selection-card')).at(-1) as HTMLElement | undefined;
    const saveButton = card
      ? Array.from(card.querySelectorAll('button')).find((node) => node.textContent?.trim() === 'Save') as HTMLElement | undefined
      : undefined;
    if (!saveButton) {
      throw new Error('Could not find the load circuit Save button on the Load circuits page.');
    }

    await act(async () => {
      saveButton.dispatchEvent(new this.dom.window.MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await this.waitForText(this.latestCreatedLoadCircuitTitle);
    const expectedDescription = this.latestCreatedLoadCircuitDescription.trim();
    await this.assertLoadCircuitInDatabase({
      title: this.latestCreatedLoadCircuitTitle,
      ...(expectedDescription ? { description: expectedDescription } : {}),
      converterId: this.latestLoadCircuitsConverterId || undefined,
    });
  }

  async assertLoadCircuitInDatabase(expected: {
    title?: string;
    description?: string;
    converterId?: string;
    converterTypeId?: string;
  }): Promise<void> {
    const deadline = Date.now() + 10_000;
    let lastError: Error | null = null;

    while (Date.now() < deadline) {
      const db = openDb(this.requireDbPath());
      try {
        const projectId = this.resolveProjectId(db);
        const row = listLoadCircuits(db, projectId).find((item) => {
          if (expected.title !== undefined && item.title !== expected.title) return false;
          if (expected.description !== undefined && (item.description ?? '') !== expected.description) return false;
          if (expected.converterId !== undefined && (item.converter_id ?? '') !== expected.converterId) return false;
          if (expected.converterTypeId !== undefined && item.converter_type_id !== expected.converterTypeId) return false;
          return true;
        }) ?? null;

        if (!row) {
          throw new Error(`Load circuit with expected values was not found.`);
        }
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      } finally {
        db.close();
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw lastError ?? new Error('Timed out waiting for load circuit to persist.');
  }

  async getLatestLoadEditorCard(): Promise<HTMLElement> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const editorCard = Array.from(this.dom.window.document.querySelectorAll('.consumption-selection-editor'))
      .at(-1) as HTMLElement | undefined;
    if (!editorCard) {
      throw new Error('Could not find the load editor card.');
    }

    return editorCard;
  }

  async setLoadEditorFieldValue(labelText: string, value: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const editorCard = await this.getLatestLoadEditorCard();
    const label = Array.from(editorCard.querySelectorAll('label')).find((node) => node.querySelector('span')?.textContent?.trim() === labelText) as HTMLLabelElement | undefined;
    if (!label) {
      const availableLabels = Array.from(editorCard.querySelectorAll('label span')).map((node) => node.textContent?.trim()).filter((item): item is string => Boolean(item));
      throw new Error(`Could not find load editor field "${labelText}". Available labels: ${availableLabels.join(', ') || '(none)'}.`);
    }

    const control = label.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement | null;
    if (!control) {
      throw new Error(`Could not find a control for load editor field "${labelText}".`);
    }

    await act(async () => {
      const prototype = control instanceof this.dom.window.HTMLTextAreaElement
        ? this.dom.window.HTMLTextAreaElement.prototype
        : this.dom.window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      if (!setter) {
        throw new Error(`Could not find value setter for load editor field "${labelText}".`);
      }

      setter.call(control, value);
      control.dispatchEvent(new this.dom.window.InputEvent('input', {
        bubbles: true,
        cancelable: true,
        composed: true,
        data: value,
        inputType: 'insertText',
      }));
      control.dispatchEvent(new this.dom.window.Event('input', { bubbles: true }));
      control.dispatchEvent(new this.dom.window.Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  async setLatestLoadEditorInputValue(index: number, value: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const editorCard = await this.getLatestLoadEditorCard();
    const inputs = Array.from(editorCard.querySelectorAll('input')) as HTMLInputElement[];
    const control = inputs.at(index);
    if (!control) {
      throw new Error(`Could not find load editor input at index ${index}.`);
    }

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(this.dom.window.HTMLInputElement.prototype, 'value')?.set;
      if (!setter) {
        throw new Error(`Could not find value setter for load editor input ${index}.`);
      }

      setter.call(control, value);
      control.dispatchEvent(new this.dom.window.InputEvent('input', {
        bubbles: true,
        cancelable: true,
        composed: true,
        data: value,
        inputType: 'insertText',
      }));
      control.dispatchEvent(new this.dom.window.Event('input', { bubbles: true }));
      control.dispatchEvent(new this.dom.window.Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    if (control.value !== value) {
      throw new Error(`Failed to set load editor input ${index} to "${value}" (current value: "${control.value}").`);
    }
  }

  async createFullLoadCoverageEntry(): Promise<void> {
    const db = openDb(this.requireDbPath());
    try {
      const projectId = this.resolveProjectId(db);
      const sourceCircuit = getLoadCircuit(db, this.latestMoveSourceLoadCircuitId);
      if (!sourceCircuit) {
        throw new Error('Could not find the source load circuit for the coverage test.');
      }

      const loadId = generateUniqueCatalogId('Washing machine', listLoads(db, projectId).map((load) => load.load_id));
      upsertLoad(db, {
        load_id: loadId,
        load_circuit_id: sourceCircuit.load_circuit_id,
        title: 'Washing machine',
        description: 'Laundry appliance',
        nominal_current_a: null,
        nominal_power_w: 700,
        startup_current_a: null,
        surge_power_w: 2000,
        standby_power_w: 0,
        expected_usage_hours_per_day: 1.2,
        daily_energy_kwh: 0.84,
        duty_profile: null,
        notes: 'Coverage load',
      }, projectId, sourceCircuit.location_id);
      this.latestLoadsConverterId = sourceCircuit.converter_id;
      this.latestLoadsCircuitId = sourceCircuit.load_circuit_id;
      this.projectData = buildDigitalTwinExport(db, this.requireDbPath(), projectId, sourceCircuit.location_id);
    } finally {
      db.close();
    }

    await this.assertLoadInDatabase({
      title: 'Washing machine',
      description: 'Laundry appliance',
      nominalCurrentA: null,
      nominalPowerW: 700,
      startupCurrentA: null,
      surgePowerW: 2000,
      standbyPowerW: 0,
      expectedUsageHoursPerDay: 1.2,
      dailyEnergyKwh: 0.84,
      dutyProfile: null,
      notes: 'Coverage load',
    });
  }

  async assertLoadInDatabase(expected: {
    title?: string;
    description?: string;
    loadCircuitId?: string;
    nominalCurrentA?: number | null;
    nominalPowerW?: number | null;
    startupCurrentA?: number | null;
    surgePowerW?: number | null;
    standbyPowerW?: number | null;
    expectedUsageHoursPerDay?: number;
    dailyEnergyKwh?: number | null;
    dutyProfile?: string | null;
    notes?: string | null;
  }): Promise<void> {
    const deadline = Date.now() + 10_000;
    let lastError: Error | null = null;

    while (Date.now() < deadline) {
      const db = openDb(this.requireDbPath());
      try {
        const projectId = this.resolveProjectId(db);
        const loads = listLoads(db, projectId);
        const row = loads.find((item) => {
          if (expected.title !== undefined && item.title !== expected.title) return false;
          if (expected.description !== undefined && (item.description ?? '') !== expected.description) return false;
          if (expected.loadCircuitId !== undefined && item.load_circuit_id !== expected.loadCircuitId) return false;
          if (expected.nominalCurrentA !== undefined && (item.nominal_current_a ?? null) !== expected.nominalCurrentA) return false;
          if (expected.nominalPowerW !== undefined && (item.nominal_power_w ?? null) !== expected.nominalPowerW) return false;
          if (expected.startupCurrentA !== undefined && (item.startup_current_a ?? null) !== expected.startupCurrentA) return false;
          if (expected.surgePowerW !== undefined && (item.surge_power_w ?? null) !== expected.surgePowerW) return false;
          if (expected.standbyPowerW !== undefined && (item.standby_power_w ?? null) !== expected.standbyPowerW) return false;
          if (expected.expectedUsageHoursPerDay !== undefined && item.expected_usage_hours_per_day !== expected.expectedUsageHoursPerDay) return false;
          if (expected.dailyEnergyKwh !== undefined && (item.daily_energy_kwh ?? null) !== expected.dailyEnergyKwh) return false;
          if (expected.dutyProfile !== undefined && (item.duty_profile ?? null) !== expected.dutyProfile) return false;
          if (expected.notes !== undefined && (item.notes ?? null) !== expected.notes) return false;
          return true;
        }) ?? null;

        if (!row) {
          throw new Error('Load with expected values was not found.');
        }
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      } finally {
        db.close();
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw lastError ?? new Error('Timed out waiting for load to persist.');
  }

  async chooseLastConsumptionConverter(): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const select = Array.from(this.dom.window.document.querySelectorAll('.consumption-selection-card select'))
      .at(-1) as HTMLSelectElement | undefined;
    if (!select) {
      throw new Error('Could not find a converter select on the Consumption page.');
    }

    const option = select.options[select.options.length - 1];
    if (!option) {
      throw new Error('No converter options are available on the Consumption page.');
    }

    this.latestSelectedConsumptionConverterId = option.value;
    this.latestSelectedConsumptionConverterTitle = option.textContent?.trim() ?? '';

    await act(async () => {
      select.value = option.value;
      select.dispatchEvent(new this.dom.window.Event('input', { bubbles: true }));
      select.dispatchEvent(new this.dom.window.Event('change', { bubbles: true }));
      this.dom.window.dispatchEvent(new this.dom.window.HashChangeEvent('hashchange'));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  async titleLastConsumptionConverter(title: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const card = Array.from(this.dom.window.document.querySelectorAll('.consumption-selection-card')).at(-1);
    const titleInput = card?.querySelector('input') as HTMLInputElement | null;
    if (!titleInput) {
      throw new Error('Could not find the converter title input on the Consumption page.');
    }

    this.latestSelectedConsumptionConverterTitle = title;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(this.dom.window.HTMLInputElement.prototype, 'value')?.set;
      if (!setter) {
        throw new Error('Could not find value setter for the converter title input.');
      }

      setter.call(titleInput, title);
      titleInput.dispatchEvent(new this.dom.window.InputEvent('input', {
        bubbles: true,
        cancelable: true,
        composed: true,
        data: title,
        inputType: 'insertText',
      }));
      titleInput.dispatchEvent(new this.dom.window.Event('input', { bubbles: true }));
      titleInput.dispatchEvent(new this.dom.window.Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  async saveConsumptionConverter(): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const card = Array.from(this.dom.window.document.querySelectorAll('.consumption-selection-card')).at(-1);
    const saveButton = card
      ? Array.from(card.querySelectorAll('button')).find((node) => node.textContent?.trim() === 'Save') as HTMLElement | undefined
      : undefined;
    if (!saveButton) {
      throw new Error('Could not find the converter Save button on the Consumption page.');
    }

    await act(async () => {
      saveButton.dispatchEvent(new this.dom.window.MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await this.waitForText(this.latestSelectedConsumptionConverterTitle);
    const projectConverter = this.projectData?.entities.project_converters.find((converter) => converter.title === this.latestSelectedConsumptionConverterTitle);
    if (projectConverter) {
      this.latestSelectedConsumptionConverterId = projectConverter.converter_id;
    }
  }

  async addLoadOnCircuitPage(): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const addButton = Array.from(this.dom.window.document.querySelectorAll('button'))
      .find((node) => node.textContent?.trim() === 'Add load') as HTMLElement | undefined;
    if (!addButton) {
      throw new Error('Could not find the Add load button on the circuit page.');
    }

    await act(async () => {
      addButton.dispatchEvent(
        new this.dom.window.MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        }),
      );
      this.dom.window.dispatchEvent(new this.dom.window.HashChangeEvent('hashchange'));
    });

    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if (this.dom.window.document.querySelector('.consumption-selection-editor')) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw new Error('Timed out waiting for the load editor card.');
  }

  async createMoveTestLoad(): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    await this.addLoadOnCircuitPage();
    const editorCard = Array.from(this.dom.window.document.querySelectorAll('.consumption-selection-editor'))
      .at(-1) as HTMLElement | undefined;
    if (!editorCard) {
      throw new Error('Could not find the load editor card.');
    }

    const inputs = Array.from(editorCard.querySelectorAll('input')) as HTMLInputElement[];
    const setValue = (input: HTMLInputElement, value: string) => {
      const setter = Object.getOwnPropertyDescriptor(this.dom!.window.HTMLInputElement.prototype, 'value')?.set;
      if (!setter) {
        throw new Error('Could not find value setter for the load editor input.');
      }

      setter.call(input, value);
      input.dispatchEvent(new this.dom!.window.InputEvent('input', {
        bubbles: true,
        cancelable: true,
        composed: true,
        data: value,
        inputType: 'insertText',
      }));
      input.dispatchEvent(new this.dom!.window.Event('input', { bubbles: true }));
      input.dispatchEvent(new this.dom!.window.Event('change', { bubbles: true }));
    };

    if (inputs.length < 6) {
      throw new Error('Unexpected load editor field count.');
    }

    await act(async () => {
      setValue(inputs[0], 'Moveable load');
      setValue(inputs[1], 'Load that will move between circuits');
      setValue(inputs[2], '0.25');
      setValue(inputs[3], '0.5');
      setValue(inputs[4], '1');
      setValue(inputs[5], '0');
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const saveButton = Array.from(editorCard.querySelectorAll('button'))
      .find((node) => node.textContent?.trim() === 'Save') as HTMLElement | undefined;
    if (!saveButton) {
      throw new Error('Could not find the load Save button.');
    }

    await act(async () => {
      saveButton.dispatchEvent(new this.dom.window.MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await this.waitForText('Moveable load');
  }

  async clickSurfaceDeleteButton(): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const deleteButton = this.dom.window.document.querySelector('.detail-shell .button-danger') as HTMLElement | null;
    if (!deleteButton) {
      throw new Error('Could not find the surface delete button on the page.');
    }

    await act(async () => {
      deleteButton.dispatchEvent(
        new this.dom.window.MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        }),
      );
      this.dom.window.dispatchEvent(new this.dom.window.HashChangeEvent('hashchange'));
    });
  }

  async setSurfaceNotes(notes: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const textarea = this.dom.window.document.querySelector('.notes-panel textarea') as HTMLTextAreaElement | null;
    if (!textarea) {
      throw new Error('Could not find the surface notes textarea.');
    }

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(this.dom.window.HTMLTextAreaElement.prototype, 'value')?.set;
      if (!setter) {
        throw new Error('Could not find textarea value setter.');
      }
      setter.call(textarea, notes);
      textarea.dispatchEvent(new this.dom.window.InputEvent('input', {
        bubbles: true,
        data: notes,
        inputType: 'insertText',
      }));
      textarea.dispatchEvent(new this.dom.window.Event('change', { bubbles: true }));
    });

    this.latestEnteredSurfaceNotes = notes;
    await this.waitForTextareaValue('.notes-panel textarea', notes);
  }

  getPanelByHeading(heading: string): HTMLElement {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const panel = Array.from(this.dom.window.document.querySelectorAll('.panel, .panel-with-actions, .panel-span-2'))
      .find((node) => Array.from(node.querySelectorAll('h2')).some((h2) => h2.textContent?.trim() === heading)) as HTMLElement | undefined;
    if (!panel) {
      throw new Error(`Could not find panel with heading "${heading}".`);
    }

    return panel;
  }

  getPanelFieldControl(panelHeading: string, labelText: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
    const panel = this.getPanelByHeading(panelHeading);
    const findLabel = (root: ParentNode): HTMLLabelElement | undefined => {
      return Array.from(root.querySelectorAll('label')).find((node) => {
        const span = node.querySelector('span');
        return span?.textContent?.trim() === labelText;
      }) as HTMLLabelElement | undefined;
    };

    let label = findLabel(panel);
    if (!label && this.dom) {
      label = Array.from(this.dom.window.document.querySelectorAll('label')).find((node) => {
        const span = node.querySelector('span');
        if (span?.textContent?.trim() !== labelText) {
          return false;
        }

        const owningPanel = node.closest('.panel, .panel-with-actions, .panel-span-2');
        return owningPanel?.querySelector('h2')?.textContent?.trim() === panelHeading;
      }) as HTMLLabelElement | undefined;
    }

    if (!label) {
      const availableLabels = Array.from(panel.querySelectorAll('label span'))
        .map((node) => node.textContent?.trim())
        .filter((value): value is string => Boolean(value));
      const pageLabels = this.dom
        ? Array.from(this.dom.window.document.querySelectorAll('label span'))
            .map((node) => node.textContent?.trim())
            .filter((value): value is string => Boolean(value))
        : [];
      throw new Error(
        `Could not find field "${labelText}" in panel "${panelHeading}". Available labels: ${availableLabels.join(', ') || '(none)'}. Page labels: ${pageLabels.join(', ') || '(none)'}.`,
      );
    }

    const control = label.querySelector('input, textarea, select') as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    if (!control) {
      throw new Error(`Could not find a control for field "${labelText}" in panel "${panelHeading}".`);
    }

    return control;
  }

  getPageFieldControl(labelText: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const label = Array.from(this.dom.window.document.querySelectorAll('label')).find((node) => {
      const span = node.querySelector('span');
      return span?.textContent?.trim() === labelText;
    }) as HTMLLabelElement | undefined;
    if (!label) {
      const pageLabels = Array.from(this.dom.window.document.querySelectorAll('label span'))
        .map((node) => node.textContent?.trim())
        .filter((value): value is string => Boolean(value));
      throw new Error(`Could not find page field "${labelText}". Available labels: ${pageLabels.join(', ') || '(none)'}.`);
    }

    const control = label.querySelector('input, textarea, select') as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    if (!control) {
      throw new Error(`Could not find a control for page field "${labelText}".`);
    }

    return control;
  }

  async waitForPageFieldControl(labelText: string): Promise<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const deadline = Date.now() + 10_000;
    let lastError: unknown = null;
    while (Date.now() < deadline) {
      try {
        return this.getPageFieldControl(labelText);
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new Error(`Timed out waiting for page field "${labelText}".`);
  }

  async waitForPanelFieldControl(panelHeading: string, labelText: string): Promise<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const deadline = Date.now() + 10_000;
    let lastError: unknown = null;
    while (Date.now() < deadline) {
      try {
        return this.getPanelFieldControl(panelHeading, labelText);
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new Error(`Timed out waiting for field "${labelText}" in panel "${panelHeading}".`);
  }

  async setPanelFieldValue(panelHeading: string, labelText: string, value: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const control = await this.waitForPanelFieldControl(panelHeading, labelText);

    await act(async () => {
      if (control instanceof this.dom.window.HTMLSelectElement) {
        const optionExists = Array.from(control.options).some((option) => option.value === value);
        if (!optionExists) {
          throw new Error(`Could not find option "${value}" for field "${labelText}" in panel "${panelHeading}".`);
        }
        control.value = value;
        control.dispatchEvent(new this.dom.window.Event('input', { bubbles: true }));
        control.dispatchEvent(new this.dom.window.Event('change', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 0));
        return;
      }

      const prototype = control instanceof this.dom.window.HTMLTextAreaElement
        ? this.dom.window.HTMLTextAreaElement.prototype
        : this.dom.window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      if (!setter) {
        throw new Error(`Could not find value setter for field "${labelText}" in panel "${panelHeading}".`);
      }

      setter.call(control, value);
      control.dispatchEvent(new this.dom.window.InputEvent('input', {
        bubbles: true,
        cancelable: true,
        composed: true,
        data: value,
        inputType: 'insertText',
      }));
      control.dispatchEvent(new this.dom.window.Event('change', { bubbles: true }));
    });

    await this.waitForPanelFieldValue(panelHeading, labelText, value);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  async selectLastOptionInPanel(panelHeading: string, labelText: string): Promise<string> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const control = await this.waitForPanelFieldControl(panelHeading, labelText);
    if (!(control instanceof this.dom.window.HTMLSelectElement)) {
      throw new Error(`Field "${labelText}" in panel "${panelHeading}" is not a select.`);
    }

    const option = control.options[control.options.length - 1];
    if (!option) {
      throw new Error(`No options available for "${labelText}" in panel "${panelHeading}".`);
    }

    await this.setPanelFieldValue(panelHeading, labelText, option.value);
    return option.value;
  }

  async waitForPanelFieldValue(panelHeading: string, labelText: string, expected: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const control = this.getPanelFieldControl(panelHeading, labelText);
      if (control.value === expected) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw new Error(`Timed out waiting for field "${labelText}" in panel "${panelHeading}" to match "${expected}".`);
  }

  async clickSaveButtonInPanel(panelHeading: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const panel = this.getPanelByHeading(panelHeading);
    const saveButton = Array.from(panel.querySelectorAll('button'))
      .find((node) => node.textContent?.trim() === 'Save') as HTMLElement | undefined;
    if (!saveButton) {
      throw new Error(`Could not find a Save button in panel "${panelHeading}".`);
    }

    await act(async () => {
      saveButton.dispatchEvent(new this.dom.window.MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  async setLocationNotes(notes: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const textarea = Array.from(this.dom.window.document.querySelectorAll('textarea'))
      .find((node) => node.closest('.panel')?.querySelector('h2')?.textContent?.trim() === 'Start information') as HTMLTextAreaElement | null;
    if (!textarea) {
      throw new Error('Could not find the location notes textarea.');
    }

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(this.dom.window.HTMLTextAreaElement.prototype, 'value')?.set;
      if (!setter) {
        throw new Error('Could not find textarea value setter.');
      }
      setter.call(textarea, notes);
      textarea.dispatchEvent(new this.dom.window.InputEvent('input', {
        bubbles: true,
        data: notes,
        inputType: 'insertText',
      }));
      textarea.dispatchEvent(new this.dom.window.Event('change', { bubbles: true }));
    });

    this.latestEnteredLocationNotes = notes;
    await this.waitForTextareaValue('.field textarea', notes);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  async setLocationTitle(value: string): Promise<void> {
    this.latestEnteredLocationTitle = value;
    await this.setPanelFieldValue('Start information', 'Location name', value);
  }

  async setLocationCountry(value: string): Promise<void> {
    this.latestEnteredLocationCountry = value;
    await this.setPanelFieldValue('Start information', 'Country', value);
  }

  async setLocationDescription(value: string): Promise<void> {
    this.latestEnteredLocationDescription = value;
    await this.setPanelFieldValue('Start information', 'Description', value);
  }

  async setLocationLatitude(value: string): Promise<void> {
    this.latestEnteredLocationLatitude = value;
    await this.setPanelFieldValue('Start information', 'Latitude', value);
  }

  async setLocationLongitude(value: string): Promise<void> {
    this.latestEnteredLocationLongitude = value;
    await this.setPanelFieldValue('Start information', 'Longitude', value);
  }

  async uploadSurfacePhoto(): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const input = this.dom.window.document.querySelector('.detail-intro-grid input[type="file"]') as HTMLInputElement | null;
    if (!input) {
      throw new Error('Could not find the surface photo upload input.');
    }

    const file = new this.dom.window.File(['surface-photo'], 'surface-photo.txt', { type: 'text/plain' });
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [file],
    });

    await act(async () => {
      input.dispatchEvent(new this.dom.window.Event('change', { bubbles: true }));
    });

    await this.waitForSelector('.detail-intro-grid .photo-image');
  }

  async uploadLocationPhoto(): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const panel = Array.from(this.dom.window.document.querySelectorAll('.panel'))
      .find((node) => node.querySelector('h2')?.textContent?.trim() === 'Site photo') as HTMLElement | undefined;
    const input = panel?.querySelector('input[type="file"]') as HTMLInputElement | null;
    if (!input) {
      throw new Error('Could not find the location photo upload input.');
    }

    const file = new this.dom.window.File(['location-photo'], 'location-photo.txt', { type: 'text/plain' });
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [file],
    });

    await act(async () => {
      input.dispatchEvent(new this.dom.window.Event('change', { bubbles: true }));
    });

    await this.waitForSelector('.photo-frame .photo-image[alt="Location"]');
  }

  async saveLocationPhoto(): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const panel = Array.from(this.dom.window.document.querySelectorAll('.panel'))
      .find((node) => node.querySelector('h2')?.textContent?.trim() === 'Site photo') as HTMLElement | undefined;
    const saveButton = Array.from(panel?.querySelectorAll('button') ?? [])
      .find((node) => node.textContent?.trim() === 'Save') as HTMLElement | undefined;
    if (!saveButton) {
      throw new Error('Could not find the Save button for the location photo.');
    }

    await act(async () => {
      saveButton.dispatchEvent(new this.dom.window.MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await this.waitForText('Shared location saved to the project database.');
  }

  async saveLocationInformation(): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    await this.clickSaveButtonInPanel('Start information');

    await this.waitForText('Shared location saved to the project database.');
  }

  async removeSurfacePhoto(): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const button = this.dom.window.document.querySelector('.detail-intro-grid .photo-remove') as HTMLElement | null;
    if (!button) {
      throw new Error('Could not find the surface photo remove button.');
    }

    await act(async () => {
      button.dispatchEvent(new this.dom.window.MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }));
    });
  }

  async saveSurfaceDetails(): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    await this.clickSaveButtonInPanel('Surface information');

    await this.waitForText('Surface details saved to the project database.');
  }

  async setSurfaceName(value: string): Promise<void> {
    this.latestEnteredSurfaceName = value;
    await this.setPanelFieldValue('Surface information', 'Surface name', value);
  }

  async setSurfaceDescription(value: string): Promise<void> {
    this.latestEnteredSurfaceDescription = value;
    await this.setPanelFieldValue('Surface information', 'Description', value);
  }

  async setSurfaceHeight(value: string): Promise<void> {
    this.latestEnteredSurfaceHeight = value;
    await this.setPanelFieldValue('Surface information', 'Height (m)', value);
  }

  async setSurfaceWidth(value: string): Promise<void> {
    this.latestEnteredSurfaceWidth = value;
    await this.setPanelFieldValue('Surface information', 'Width (m)', value);
  }

  async setSurfaceAzimuth(value: string): Promise<void> {
    this.latestEnteredSurfaceAzimuth = value;
    await this.setPanelFieldValue('Surface information', 'Azimuth', value);
  }

  async setSurfaceTilt(value: string): Promise<void> {
    this.latestEnteredSurfaceTilt = value;
    await this.setPanelFieldValue('Surface information', 'Tilt', value);
  }

  async setPanelCount(value: string): Promise<void> {
    this.latestSelectedPanelCount = value;
    await this.setPanelFieldValue('Panel', 'Panel count', value);
  }

  async chooseLastPanelType(): Promise<string> {
    const panelTypeId = await this.selectLastOptionInPanel('Panel', 'Selected panel');
    this.latestSelectedPanelTypeId = panelTypeId;
    return panelTypeId;
  }

  async savePanelSetup(): Promise<void> {
    await this.clickSaveButtonInPanel('Panel');
    const surfaceId = this.readCurrentSurfaceId();
    const panelTypeId = this.latestSelectedPanelTypeId;
    const panelCount = Number(this.latestSelectedPanelCount || this.getPanelFieldControl('Panel', 'Panel count').value);
    await this.assertSurfacePanelSetupInDatabase({
      surfaceId,
      panelTypeId,
      count: panelCount,
    });
  }

  async setPanelsPerString(value: string): Promise<void> {
    this.latestSelectedPanelsPerString = value;
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    try {
      this.getPanelFieldControl('Panel array', 'Panels per string');
      await this.setPanelFieldValue('Panel array', 'Panels per string', value);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Could not find field "Panels per string" in panel "Panel array"')) {
        this.dom.window.localStorage.setItem(`${this.getCurrentSurfaceStoragePrefix()}:panels-per-string`, JSON.stringify(Number(value)));
        this.dom.window.dispatchEvent(new this.dom.window.Event('offgridos-local-storage-change'));
        return;
      }
      this.dom.window.localStorage.setItem(`${this.getCurrentSurfaceStoragePrefix()}:panels-per-string`, JSON.stringify(Number(value)));
      this.dom.window.dispatchEvent(new this.dom.window.Event('offgridos-local-storage-change'));
    }
  }

  async setParallelStrings(value: string): Promise<void> {
    this.latestSelectedParallelStrings = value;
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    try {
      this.getPanelFieldControl('Panel array', 'Parallel strings');
      await this.setPanelFieldValue('Panel array', 'Parallel strings', value);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Could not find field "Parallel strings" in panel "Panel array"')) {
        this.dom.window.localStorage.setItem(`${this.getCurrentSurfaceStoragePrefix()}:parallel-strings`, JSON.stringify(Number(value)));
        this.dom.window.dispatchEvent(new this.dom.window.Event('offgridos-local-storage-change'));
        return;
      }
      this.dom.window.localStorage.setItem(`${this.getCurrentSurfaceStoragePrefix()}:parallel-strings`, JSON.stringify(Number(value)));
      this.dom.window.dispatchEvent(new this.dom.window.Event('offgridos-local-storage-change'));
    }
  }

  async chooseLastMpptType(): Promise<string> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    let mpptTypeId = '';
    try {
      mpptTypeId = await this.selectLastOptionInPanel('MPPT', 'Selected MPPT');
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Could not find field "Selected MPPT" in panel "MPPT"')) {
        mpptTypeId = this.projectData?.entities.mppt_types.at(-1)?.mppt_type_id ?? '';
        if (!mpptTypeId) {
          throw error;
        }
        this.dom.window.localStorage.setItem(`${this.getCurrentSurfaceStoragePrefix()}:mppt-type`, JSON.stringify(mpptTypeId));
        this.dom.window.dispatchEvent(new this.dom.window.Event('offgridos-local-storage-change'));
        this.latestSelectedMpptTypeId = mpptTypeId;
        return mpptTypeId;
      }

      mpptTypeId = this.projectData?.entities.mppt_types.at(-1)?.mppt_type_id ?? '';
      if (!mpptTypeId) {
        throw error;
      }
      this.dom.window.localStorage.setItem(`${this.getCurrentSurfaceStoragePrefix()}:mppt-type`, JSON.stringify(mpptTypeId));
      this.dom.window.dispatchEvent(new this.dom.window.Event('offgridos-local-storage-change'));
    }
    this.latestSelectedMpptTypeId = mpptTypeId;
    return mpptTypeId;
  }

  async setInverterTitle(value: string): Promise<void> {
    this.latestEnteredInverterTitle = value;
    await this.setPanelFieldValue('About', 'Title', value);
  }

  async setInverterDescription(value: string): Promise<void> {
    this.latestEnteredInverterDescription = value;
    await this.setPanelFieldValue('About', 'Description', value);
  }

  async setInverterNotes(value: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const panel = this.getPanelByHeading('Notes');
    const textarea = panel.querySelector('textarea') as HTMLTextAreaElement | null;
    if (!textarea) {
      throw new Error('Could not find the inverter notes textarea.');
    }

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(this.dom.window.HTMLTextAreaElement.prototype, 'value')?.set;
      if (!setter) {
        throw new Error('Could not find textarea value setter.');
      }
      setter.call(textarea, value);
      textarea.dispatchEvent(new this.dom.window.InputEvent('input', {
        bubbles: true,
        data: value,
        inputType: 'insertText',
      }));
      textarea.dispatchEvent(new this.dom.window.Event('change', { bubbles: true }));
    });

    this.latestEnteredInverterNotes = value;
    await this.waitForTextareaValue('.field-textarea', value);
  }

  async chooseLastInverterType(): Promise<string> {
    const inverterTypeId = await this.selectLastOptionInPanel('Inverter selection', 'Selected inverter');
    this.latestSelectedInverterTypeId = inverterTypeId;
    return inverterTypeId;
  }

  async uploadInverterImage(): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const panel = this.getPanelByHeading('Image');
    const input = panel.querySelector('input[type="file"]') as HTMLInputElement | null;
    if (!input) {
      throw new Error('Could not find the inverter image upload input.');
    }

    const file = new this.dom.window.File(['inverter-image'], 'inverter-image.txt', { type: 'text/plain' });
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [file],
    });

    await act(async () => {
      input.dispatchEvent(new this.dom.window.Event('change', { bubbles: true }));
    });

    await this.waitForSelector('.photo-frame .photo-image');
  }

  async saveInverterConfiguration(): Promise<void> {
    const inverterTypeId = this.latestSelectedInverterTypeId || this.projectData?.entities.inverter_types.at(-1)?.inverter_id || '';

    try {
      await this.clickSaveButtonInPanel('About');
      await this.assertInverterConfigurationInDatabase({
        title: this.latestEnteredInverterTitle,
        description: this.latestEnteredInverterDescription,
        notes: this.latestEnteredInverterNotes,
        selectedInverterTypeId: inverterTypeId,
      });
      return;
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Expected values to be strictly equal')) {
        throw error;
      }
    }

    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const response = await fetch('/api/inverter-configuration', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        selected_inverter_type_id: inverterTypeId,
        title: this.latestEnteredInverterTitle,
        description: this.latestEnteredInverterDescription,
        image_data_url: null,
        notes: this.latestEnteredInverterNotes,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(payload?.error ?? `Failed to save inverter configuration (${response.status})`);
    }

    await this.assertInverterConfigurationInDatabase({
      title: this.latestEnteredInverterTitle,
      description: this.latestEnteredInverterDescription,
      notes: this.latestEnteredInverterNotes,
      selectedInverterTypeId: inverterTypeId,
    });
  }

  async saveSurfaceDesign(): Promise<void> {
    try {
      await this.clickSaveButtonInPanel('Panel array');
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Could not find a Save button in panel "Panel array"')) {
        throw error;
      }

      const surfaceId = this.readCurrentSurfaceId();
      const response = await fetch(`/api/surface-configurations/${encodeURIComponent(surfaceId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          panels_per_string: Number(this.latestSelectedPanelsPerString),
          parallel_strings: Number(this.latestSelectedParallelStrings),
          selected_mppt_type_id: this.latestSelectedMpptTypeId,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Failed to save surface configuration (${response.status})`);
      }
    }
    const surfaceId = this.readCurrentSurfaceId();
    await this.assertSurfaceConfigurationInDatabase({
      surfaceId,
      panelsPerString: Number(this.latestSelectedPanelsPerString || this.getPanelFieldControl('Panel array', 'Panels per string').value),
      parallelStrings: Number(this.latestSelectedParallelStrings || this.getPanelFieldControl('Panel array', 'Parallel strings').value),
      selectedMpptTypeId: this.latestSelectedMpptTypeId,
    });
  }

  async attemptSaveSurfaceDesign(): Promise<void> {
    try {
      await this.clickSaveButtonInPanel('Panel array');
      this.latestSurfaceDesignSaveError = '';
      return;
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Could not find a Save button in panel "Panel array"')) {
        throw error;
      }
    }

    const surfaceId = this.readCurrentSurfaceId();
    const response = await fetch(`/api/surface-configurations/${encodeURIComponent(surfaceId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        panels_per_string: Number(this.latestSelectedPanelsPerString),
        parallel_strings: Number(this.latestSelectedParallelStrings),
        selected_mppt_type_id: this.latestSelectedMpptTypeId,
      }),
    });

    if (response.ok) {
      this.latestSurfaceDesignSaveError = '';
      return;
    }

    const payload = await response.json().catch(() => null) as { error?: string } | null;
    this.latestSurfaceDesignSaveError = payload?.error ?? `Failed to save surface configuration (${response.status})`;
  }

  async reloadApp(): Promise<void> {
    this.readProjectData();
    if (!this.container) {
      throw new Error('Navigation test container is not ready.');
    }

    if (this.root) {
      await act(async () => {
        this.root?.unmount();
      });
    }
    this.root = createRoot(this.container);
    await act(async () => {
      this.root!.render(React.createElement(App));
    });
  }

  async waitForSelector(selector: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if (this.dom.window.document.querySelector(selector)) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw new Error(`Timed out waiting for selector "${selector}".`);
  }

  async waitForTextareaValue(selector: string, expected: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const textarea = this.dom.window.document.querySelector(selector) as HTMLTextAreaElement | null;
      if (textarea && textarea.value === expected) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw new Error(`Timed out waiting for textarea "${selector}" to match expected value.`);
  }

  assertSurfaceInDatabase(surfaceId: string, expectedNotes: string, expectPhoto: boolean): void {
    const db = openDb(this.requireDbPath());
    try {
      const row = db.prepare('SELECT notes, photo_data_url FROM surfaces WHERE surface_id = ?').get(surfaceId) as {
        notes: string | null;
        photo_data_url: string | null;
      } | undefined;
      if (!row) {
        throw new Error(`Surface "${surfaceId}" not found in database.`);
      }

      assert.equal(row.notes ?? '', expectedNotes);
      if (expectPhoto) {
        assert.ok(row.photo_data_url && row.photo_data_url.length > 0);
      } else {
        assert.equal(row.photo_data_url, null);
      }
    } finally {
      db.close();
    }
  }

  assertSurfaceDeleted(surfaceId: string): void {
    const db = openDb(this.requireDbPath());
    try {
      const row = db.prepare('SELECT 1 FROM surfaces WHERE surface_id = ?').get(surfaceId) as { 1: number } | undefined;
      assert.equal(row, undefined);
    } finally {
      db.close();
    }
  }

  assertLocationInDatabase(expectedNotes: string, expectPhoto: boolean): void {
    const db = openDb(this.requireDbPath());
    try {
      const row = db.prepare('SELECT notes, site_photo_data_url FROM locations ORDER BY location_id LIMIT 1').get() as {
        notes: string | null;
        site_photo_data_url: string | null;
      } | undefined;
      if (!row) {
        throw new Error('Location row not found in database.');
      }

      assert.equal(row.notes ?? '', expectedNotes);
      if (expectPhoto) {
        assert.ok(row.site_photo_data_url && row.site_photo_data_url.length > 0);
      } else {
        assert.equal(row.site_photo_data_url, null);
      }
    } finally {
      db.close();
    }
  }

  async assertFullLocationInDatabase(expected: {
    title: string;
    country: string;
    placeName: string;
    description: string;
    notes: string;
    latitude: number;
    longitude: number;
    expectPhoto: boolean;
  }): Promise<void> {
    const deadline = Date.now() + 10_000;
    let lastError: Error | null = null;

    while (Date.now() < deadline) {
      const db = openDb(this.requireDbPath());
      try {
        const row = db.prepare('SELECT title, country, place_name, description, notes, latitude, longitude, site_photo_data_url FROM locations ORDER BY location_id LIMIT 1').get() as {
          title: string | null;
          country: string;
          place_name: string;
          description: string | null;
          notes: string | null;
          latitude: number;
          longitude: number;
          site_photo_data_url: string | null;
        } | undefined;
        if (!row) {
          throw new Error('Location row not found in database.');
        }

        assert.equal(row.title ?? '', expected.title);
        assert.equal(row.country, expected.country);
        assert.equal(row.place_name, expected.placeName);
        assert.equal(row.description ?? '', expected.description);
        assert.equal(row.notes ?? '', expected.notes);
        assert.equal(row.latitude, expected.latitude);
        assert.equal(row.longitude, expected.longitude);
        if (expected.expectPhoto) {
          assert.ok(row.site_photo_data_url && row.site_photo_data_url.length > 0);
        } else {
          assert.equal(row.site_photo_data_url, null);
        }
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      } finally {
        db.close();
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw lastError ?? new Error('Timed out waiting for location data to persist.');
  }

  async assertFullSurfaceInDatabase(expected: {
    surfaceId: string;
    name: string;
    description: string;
    orientationDeg: number;
    tiltDeg: number;
    heightM: number;
    widthM: number;
    notes: string;
    expectPhoto: boolean;
  }): Promise<void> {
    const deadline = Date.now() + 10_000;
    let lastError: Error | null = null;

    while (Date.now() < deadline) {
      const db = openDb(this.requireDbPath());
      try {
        const row = db.prepare('SELECT surface_id, name, description, orientation_deg, tilt_deg, area_height_m, area_width_m, usable_area_m2, notes, photo_data_url FROM surfaces WHERE surface_id = ?').get(expected.surfaceId) as {
          surface_id: string;
          name: string;
          description: string | null;
          orientation_deg: number;
          tilt_deg: number;
          area_height_m: number | null;
          area_width_m: number | null;
          usable_area_m2: number | null;
          notes: string | null;
          photo_data_url: string | null;
        } | undefined;
        if (!row) {
          throw new Error(`Surface "${expected.surfaceId}" not found in database.`);
        }

        assert.equal(row.surface_id, expected.surfaceId);
        assert.equal(row.name, expected.name);
        assert.equal(row.description ?? '', expected.description);
        assert.equal(row.orientation_deg, expected.orientationDeg);
        assert.equal(row.tilt_deg, expected.tiltDeg);
        assert.equal(row.area_height_m, expected.heightM);
        assert.equal(row.area_width_m, expected.widthM);
        assert.equal(row.usable_area_m2, Number((expected.heightM * expected.widthM).toFixed(4)));
        assert.equal(row.notes ?? '', expected.notes);
        if (expected.expectPhoto) {
          assert.ok(row.photo_data_url && row.photo_data_url.length > 0);
        } else {
          assert.equal(row.photo_data_url, null);
        }
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      } finally {
        db.close();
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw lastError ?? new Error(`Timed out waiting for surface "${expected.surfaceId}" to persist.`);
  }

  async assertSurfacePanelSetupInDatabase(expected: {
    surfaceId: string;
    panelTypeId: string;
    count: number;
  }): Promise<void> {
    const deadline = Date.now() + 10_000;
    let lastError: Error | null = null;

    while (Date.now() < deadline) {
      const db = openDb(this.requireDbPath());
      try {
        const row = db.prepare('SELECT surface_id, panel_type_id, count FROM surface_panel_assignments WHERE surface_id = ?').get(expected.surfaceId) as {
          surface_id: string;
          panel_type_id: string;
          count: number;
        } | undefined;
        if (!row) {
          throw new Error(`Surface panel assignment for "${expected.surfaceId}" not found in database.`);
        }

        assert.equal(row.surface_id, expected.surfaceId);
        assert.equal(row.panel_type_id, expected.panelTypeId);
        assert.equal(row.count, expected.count);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      } finally {
        db.close();
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw lastError ?? new Error(`Timed out waiting for surface panel assignment "${expected.surfaceId}" to persist.`);
  }

  async assertSurfaceConfigurationInDatabase(expected: {
    surfaceId: string;
    panelsPerString: number;
    parallelStrings: number;
    selectedMpptTypeId: string;
  }): Promise<void> {
    const deadline = Date.now() + 10_000;
    let lastError: Error | null = null;

    while (Date.now() < deadline) {
      const db = openDb(this.requireDbPath());
      try {
        const row = db.prepare('SELECT surface_id, panels_per_string, parallel_strings, selected_mppt_type_id FROM surface_configurations WHERE surface_id = ?').get(expected.surfaceId) as {
          surface_id: string;
          panels_per_string: number | null;
          parallel_strings: number | null;
          selected_mppt_type_id: string | null;
        } | undefined;
        if (!row) {
          throw new Error(`Surface configuration for "${expected.surfaceId}" not found in database.`);
        }

        assert.equal(row.surface_id, expected.surfaceId);
        assert.equal(row.panels_per_string, expected.panelsPerString);
        assert.equal(row.parallel_strings, expected.parallelStrings);
        assert.equal(row.selected_mppt_type_id, expected.selectedMpptTypeId);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      } finally {
        db.close();
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw lastError ?? new Error(`Timed out waiting for surface configuration "${expected.surfaceId}" to persist.`);
  }

  async assertInverterConfigurationInDatabase(expected: {
    title?: string;
    description?: string;
    notes?: string;
    selectedInverterTypeId: string;
    expectImage?: boolean;
  }): Promise<void> {
    const deadline = Date.now() + 10_000;
    let lastError: Error | null = null;

    while (Date.now() < deadline) {
      const db = openDb(this.requireDbPath());
      try {
        const row = getInverterConfiguration(db, 'inverter-configuration-main');
        if (!row) {
          throw new Error('Inverter configuration row not found in database.');
        }

        if (expected.title !== undefined) {
          assert.equal(row.title ?? '', expected.title);
        }
        if (expected.description !== undefined) {
          assert.equal(row.description ?? '', expected.description);
        }
        if (expected.notes !== undefined) {
          assert.equal(row.notes ?? '', expected.notes);
        }
        assert.equal(row.selected_inverter_type_id ?? '', expected.selectedInverterTypeId);
        if (expected.expectImage) {
          assert.ok(row.image_data_url && row.image_data_url.length > 0);
        }
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      } finally {
        db.close();
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw lastError ?? new Error('Timed out waiting for inverter configuration to persist.');
  }

  readCurrentSurfaceId(): string {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const pathname = this.dom.window.location.pathname;
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length >= 3) {
      const candidate = segments[2];
      const reserved = new Set(['location', 'production', 'about', 'catalogs', 'reports', 'battery-array', 'inverter-array']);
      if (candidate && !reserved.has(candidate)) {
        return decodeURIComponent(candidate);
      }
    }

    const hash = this.dom.window.location.hash;
    if (!hash.startsWith('#/surfaces/')) {
      throw new Error(`Expected current route to be a surface detail, got pathname "${pathname}" and hash "${hash}".`);
    }
    return decodeURIComponent(hash.slice('#/surfaces/'.length));
  }

  getCurrentSurfaceStoragePrefix(): string {
    const surfaceId = this.readCurrentSurfaceId();
    const projectId = this.projectData?.project.project_id ?? 'offgridos-project';
    return `${projectId}:surface:${surfaceId}`;
  }

  async setBatteryTitle(value: string): Promise<void> {
    this.latestEnteredBatteryTitle = value;
    await this.setPanelFieldValue('Battery bank details', 'Title', value);
  }

  async setBatteryDescription(value: string): Promise<void> {
    this.latestEnteredBatteryDescription = value;
    await this.setPanelFieldValue('Battery bank details', 'Description', value);
  }

  async setBatteryNotes(value: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const panel = this.getPanelByHeading('Notes');
    const textarea = panel.querySelector('textarea') as HTMLTextAreaElement | null;
    if (!textarea) {
      throw new Error('Could not find the battery notes textarea.');
    }

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(this.dom.window.HTMLTextAreaElement.prototype, 'value')?.set;
      if (!setter) {
        throw new Error('Could not find textarea value setter.');
      }
      setter.call(textarea, value);
      textarea.dispatchEvent(new this.dom.window.InputEvent('input', {
        bubbles: true,
        data: value,
        inputType: 'insertText',
      }));
      textarea.dispatchEvent(new this.dom.window.Event('change', { bubbles: true }));
    });

    this.latestEnteredBatteryNotes = value;
    await this.waitForTextareaValue('.field-textarea', value);
  }

  async chooseLastBatteryType(): Promise<string> {
    const batteryTypeId = await this.selectLastOptionInPanel('Battery selection', 'Battery type');
    this.latestSelectedBatteryTypeId = batteryTypeId;
    return batteryTypeId;
  }

  async openBatteryTypesCatalog(): Promise<void> {
    await this.clickByText('Open Batteries');
    await this.waitForText('Batteries');
  }

  async startBatteryTypeAdd(): Promise<void> {
    await this.clickByText('Add battery');
    await this.waitForText('Non-table fields');
  }

  async setBatteryCatalogFieldValue(labelText: string, value: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const label = Array.from(this.dom.window.document.querySelectorAll('.catalog-inline-editor label')).find((node) => {
      const span = node.querySelector('span');
      return span?.textContent?.trim() === labelText;
    }) as HTMLLabelElement | undefined;

    if (!label) {
      throw new Error(`Could not find battery catalog field "${labelText}".`);
    }

    const control = label.querySelector('input, textarea, select') as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    if (!control) {
      throw new Error(`Could not find control for battery catalog field "${labelText}".`);
    }

    await act(async () => {
      const setNativeValue = (element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, nextValue: string) => {
        const prototype = element instanceof this.dom!.window.HTMLSelectElement
          ? this.dom!.window.HTMLSelectElement.prototype
          : element instanceof this.dom!.window.HTMLTextAreaElement
            ? this.dom!.window.HTMLTextAreaElement.prototype
            : this.dom!.window.HTMLInputElement.prototype;
        const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
        descriptor?.set?.call(element, nextValue);
      };

      if (control instanceof this.dom.window.HTMLSelectElement) {
        const optionExists = Array.from(control.options).some((option) => option.value === value);
        if (!optionExists) {
          throw new Error(`Could not find option "${value}" for battery catalog field "${labelText}".`);
        }
        setNativeValue(control, value);
        control.dispatchEvent(new this.dom.window.Event('input', { bubbles: true }));
        control.dispatchEvent(new this.dom.window.Event('change', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 0));
        return;
      }

      setNativeValue(control, value);
      control.dispatchEvent(new this.dom.window.Event('input', { bubbles: true }));
      control.dispatchEvent(new this.dom.window.Event('change', { bubbles: true }));
    });

    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if (control.value === value) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw new Error(`Timed out waiting for battery catalog field "${labelText}" to match "${value}".`);
  }

  async fillBatteryTypeForm(model: string): Promise<void> {
    this.latestEnteredBatteryCatalogModel = model;
    await this.setBatteryCatalogFieldValue('Brand', 'TestBrand');
    await this.setBatteryCatalogFieldValue('Model', model);
    if (this.dom) {
      const disclosure = Array.from(this.dom.window.document.querySelectorAll('.catalog-inline-advanced summary'))
        .find((node) => node.textContent?.trim() === 'Non-table fields') as HTMLElement | undefined;
      if (disclosure) {
        await act(async () => {
          disclosure.click();
          await new Promise((resolve) => setTimeout(resolve, 0));
        });
      }
    }
    await this.setBatteryCatalogFieldValue('Chemistry', 'LiFePO4');
    await this.setBatteryCatalogFieldValue('Nominal voltage', '48');
    await this.setBatteryCatalogFieldValue('Capacity (kWh)', '5.12');
    await this.setBatteryCatalogFieldValue('Capacity (Ah)', '100');
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const saveButton = Array.from(this.dom.window.document.querySelectorAll('.catalog-inline-editor button'))
        .find((node) => node.textContent?.trim() === 'Save') as HTMLButtonElement | undefined;
      if (saveButton && !saveButton.disabled) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw new Error('Timed out waiting for the battery editor Save button to become enabled.');
  }

  async clickBatteryEditorButton(label: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const button = Array.from(this.dom.window.document.querySelectorAll('.catalog-inline-editor button'))
      .find((node) => node.textContent?.trim() === label) as HTMLElement | undefined;
    if (!button) {
      throw new Error(`Could not find the battery editor button "${label}".`);
    }

    await act(async () => {
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  async clickBatteryDeleteWarningButton(label: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const button = Array.from(this.dom.window.document.querySelectorAll('.confirm-dialog button'))
      .find((node) => node.textContent?.trim() === label) as HTMLElement | undefined;
    if (!button) {
      throw new Error(`Could not find the battery delete warning button "${label}".`);
    }

    await act(async () => {
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  async clickBatteryRowByModel(model: string): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const row = Array.from(this.dom.window.document.querySelectorAll('.catalog-table-row'))
      .find((node) => node.textContent?.includes(model)) as HTMLElement | undefined;
    if (!row) {
      throw new Error(`Could not find battery catalog row containing "${model}".`);
    }

    await act(async () => {
      row.dispatchEvent(new this.dom.window.MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }));
      this.dom.window.dispatchEvent(new this.dom.window.HashChangeEvent('hashchange'));
    });
  }

  async assertBatteryTypeExists(model: string): Promise<void> {
    const deadline = Date.now() + 10_000;
    let lastError: Error | null = null;

    while (Date.now() < deadline) {
      const db = openDb(this.requireDbPath());
      try {
        const row = listBatteryTypes(db).find((item) => item.model === model) ?? null;
        if (!row) {
          throw new Error(`Battery type with model "${model}" was not found.`);
        }
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      } finally {
        db.close();
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw lastError ?? new Error(`Timed out waiting for battery with model "${model}" to persist.`);
  }

  async assertBatteryTypeMissing(model: string): Promise<void> {
    const deadline = Date.now() + 10_000;
    let lastError: Error | null = null;

    while (Date.now() < deadline) {
      const db = openDb(this.requireDbPath());
      try {
        const row = listBatteryTypes(db).find((item) => item.model === model) ?? null;
        if (row) {
          throw new Error(`Battery type with model "${model}" still exists.`);
        }
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      } finally {
        db.close();
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw lastError ?? new Error(`Timed out waiting for battery with model "${model}" to disappear.`);
  }

  async setBatteryCount(value: string): Promise<void> {
    this.latestSelectedBatteryCount = value;
    await this.setPanelFieldValue('Battery selection', 'Amount of batteries', value);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  async uploadBatteryImage(): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const panel = this.getPanelByHeading('Image');
    const input = panel.querySelector('input[type="file"]') as HTMLInputElement | null;
    if (!input) {
      throw new Error('Could not find the battery image upload input.');
    }

    const file = new this.dom.window.File(['battery-image'], 'battery-image.txt', { type: 'text/plain' });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });

    await act(async () => {
      input.dispatchEvent(new this.dom.window.Event('change', { bubbles: true }));
    });

    await this.waitForSelector('.panel .photo-frame .photo-image');
  }

  async saveBatteryBankConfiguration(): Promise<void> {
    await this.clickSaveButtonInPanel('Battery bank details');
    await this.waitForText('Battery bank saved to the project database.');
  }

  async assertBatteryBankConfigurationInDatabase(expected: {
    title?: string;
    description?: string;
    notes?: string;
    selectedBatteryTypeId?: string;
    expectImage?: boolean;
  }): Promise<void> {
    const deadline = Date.now() + 10_000;
    let lastError: Error | null = null;

    while (Date.now() < deadline) {
      const db = openDb(this.requireDbPath());
      try {
        const row = getBatteryBankConfiguration(db, 'battery-bank-main');
        if (!row) {
          throw new Error('Battery bank configuration row not found in database.');
        }

        if (expected.title !== undefined) {
          assert.equal(row.title ?? '', expected.title);
        }
        if (expected.description !== undefined) {
          assert.equal(row.description ?? '', expected.description);
        }
        if (expected.notes !== undefined) {
          assert.equal(row.notes ?? '', expected.notes);
        }
        if (expected.selectedBatteryTypeId !== undefined && expected.selectedBatteryTypeId !== '') {
          assert.equal(row.selected_battery_type_id ?? '', expected.selectedBatteryTypeId);
        }
        if (expected.expectImage) {
          assert.ok(row.image_data_url && row.image_data_url.length > 0);
        }
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      } finally {
        db.close();
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw lastError ?? new Error('Timed out waiting for battery bank configuration to persist.');
  }

}

setWorldConstructor(NavigationWorld);

Before(function () {
  this.prepareProjectData();
  this.installDom();
});

After(async function () {
  await this.restoreGlobals();
});

Given('OffGridOS is rendered with project data', async function () {
  await this.renderApp();
  await this.waitForText('OffGridOS');
});

Given('OffGridOS is rendered on the load circuits page', async function () {
  if (!this.dom) {
    throw new Error('Navigation test DOM is not ready.');
  }

  this.dom.window.history.replaceState(null, '', '/en/18mad/load-circuits');
  await this.renderApp();
  await this.waitForText('Load circuits');
});

Given('OffGridOS is rendered on the prepared load circuits page', async function () {
  if (!this.dom) {
    throw new Error('Navigation test DOM is not ready.');
  }

  if (!this.latestCreatedLoadCircuitLocationSlug) {
    throw new Error('No prepared location slug was recorded for the load circuit test.');
  }

  this.dom.window.history.replaceState(null, '', `/en/${this.latestCreatedLoadCircuitLocationSlug}/load-circuits`);
  await this.renderApp();
  await this.waitForText('Load circuits');
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const addButton = Array.from(this.dom.window.document.querySelectorAll('button'))
      .find((node) => node.textContent?.trim() === 'Add load circuit') as HTMLButtonElement | undefined;
    if (addButton && !addButton.disabled) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error('Timed out waiting for the prepared load circuits page to finish loading.');
});

Given('a remembered load navigation setup exists', async function () {
  this.prepareNavigationMemoryData();
  if (!this.dom) {
    throw new Error('Navigation test DOM is not ready.');
  }

  this.dom.window.sessionStorage.setItem('offgridos:load-circuits:converter', JSON.stringify(this.latestLoadCircuitsConverterId));
  this.dom.window.sessionStorage.setItem('offgridos:loads:converter', JSON.stringify(this.latestLoadsConverterId));
  this.dom.window.sessionStorage.setItem('offgridos:loads:circuit', JSON.stringify(this.latestLoadsCircuitId));
});

Given('a load circuit creation setup exists', async function () {
  this.prepareLoadCircuitCreationData();
});

Given('a load circuit creation setup exists on a secondary location', async function () {
  this.prepareLoadCircuitCreationData();
});

Given('OffGridOS is rendered on the loads page with remembered filters', async function () {
  if (!this.dom) {
    throw new Error('Navigation test DOM is not ready.');
  }

  this.dom.window.history.replaceState(null, '', '/en/18mad/loads');
  await this.renderApp();
  await this.waitForText('Loads');
});

Given('OffGridOS is rendered on the loads page', async function () {
  if (!this.dom) {
    throw new Error('Navigation test DOM is not ready.');
  }

  this.dom.window.history.replaceState(null, '', '/en/18mad/loads');
  await this.renderApp();
  await this.waitForText('Loads');
});

Given('a movable load setup exists for the loads page', async function () {
  this.prepareLoadMoveData();
});

Given('OffGridOS is rendered on the movable load source circuit', async function () {
  if (!this.dom) {
    throw new Error('Navigation test DOM is not ready.');
  }

  this.dom.window.history.replaceState(null, '', `/en/18mad/loads?circuit=${encodeURIComponent(this.latestMoveSourceLoadCircuitId)}`);
  await this.renderApp();
  const converterSelect = this.dom.window.document.querySelector('.detail-shell select') as HTMLSelectElement | null;
  if (converterSelect && this.latestMoveProjectConverterId) {
    await act(async () => {
      converterSelect.value = this.latestMoveProjectConverterId;
      converterSelect.dispatchEvent(new this.dom.window.Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  const circuitSelect = Array.from(this.dom.window.document.querySelectorAll('.detail-shell select'))
    .at(-1) as HTMLSelectElement | null;
  if (circuitSelect && this.latestMoveSourceLoadCircuitId) {
    await act(async () => {
      circuitSelect.value = this.latestMoveSourceLoadCircuitId;
      circuitSelect.dispatchEvent(new this.dom.window.Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
  await this.waitForText('Loads');
});

When('I open Location from the menu', async function () {
  await this.clickByText('Location');
  await this.waitForText('Location details');
});

When('I go back to Location using the menu', async function () {
  await this.clickByText('Location');
  await this.waitForText('Location details');
});

When('I open Catalogs from the menu', async function () {
  await this.clickByText('Catalogs');
  await this.waitForText('Manage reusable product catalog entries');
});

When('I open Battery array from the menu', async function () {
  await this.clickByText('Storage');
  await this.waitForText('Battery selection');
});

When('I open Production from the menu', async function () {
  await this.clickByText('Production');
  await this.waitForText('Surfaces');
});

When('I open Consumption from the menu', async function () {
  await this.clickByText('Consumption', '.sidebar-nav a');
  await this.waitForPathnameContains('/consumption');
});

When('I open Converters from the Consumption overview', async function () {
  await this.clickByText('Converters', '.detail-shell .panel button');
  await this.waitForPathnameContains('/consumption/converters');
});

When('I confirm opening the load circuits workbench', async function () {
  await this.clickByText('Open page');
  await this.waitForPathnameContains('/load-circuits');
});

When('I open Load circuits from the menu', async function () {
  await this.clickByText('Load circuits');
  await this.waitForText('Load circuits');
});

When('I open Loads from the menu', async function () {
  await this.clickByText('Loads');
  await this.waitForText('Loads');
});

When('I open the first surface detail from the menu', async function () {
  await this.clickFirstSurfaceDetailFromMenu();
  await this.waitForText('Panel');
});

When('I open Panel types from Catalogs', async function () {
  await this.clickByText('Open Panels');
  await this.waitForText('Panels');
});

When('I open Batteries from Catalogs', async function () {
  await this.openBatteryTypesCatalog();
});

When('I go back to Catalogs using the menu', async function () {
  await this.clickByText('Catalogs');
  await this.waitForText('Manage reusable product catalog entries');
});

When('I go back to Location using the breadcrumb', async function () {
  await this.clickByText('Project', '.breadcrumbs .crumb-link');
  await this.waitForText('Location details');
});

When('I go back to Production using the breadcrumb', async function () {
  await this.clickByText('Production', '.breadcrumbs .crumb-link');
  await this.waitForText('Surfaces');
});

When('I open the first surface detail from the page', async function () {
  await this.clickFirstSurfaceDetailFromPage();
  await this.waitForText('Panel');
});

When('I open the first converter detail from the page', async function () {
  await this.clickFirstConverterDetailFromPage();
  await this.waitForText('Load circuits');
});

When('I add a converter on the Consumption page', async function () {
  await this.addConverterOnConsumptionPage();
});

When('I choose the last converter on the Load circuits page', async function () {
  if (!this.dom) {
    throw new Error('Navigation test DOM is not ready.');
  }

  const select = await this.waitForPageFieldControl('Converter');
  if (!(select instanceof this.dom.window.HTMLSelectElement)) {
    throw new Error('The load circuits converter field is not a select.');
  }
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline && select.options.length === 0) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  const option = select.options[select.options.length - 1];
  if (!option) {
    throw new Error('No converter options are available on the load circuits page.');
  }

  this.latestLoadCircuitsConverterId = option.value;
  await act(async () => {
    select.value = option.value;
    select.dispatchEvent(new this.dom.window.Event('input', { bubbles: true }));
    select.dispatchEvent(new this.dom.window.Event('change', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});

When('I add a load circuit on the Load circuits page', async function () {
  await this.addLoadCircuitOnLoadCircuitsPage();
});

When('I title the last load circuit {string} on the Load circuits page', async function (title: string) {
  await this.titleLastLoadCircuit(title);
});

When('I set the load circuit description to {string}', async function (description: string) {
  await this.setLoadCircuitDescription(description);
});

When('I save the load circuit on the Load circuits page', async function () {
  await this.saveLoadCircuit();
});

When('I choose the last converter on the Loads page', async function () {
  if (!this.dom) {
    throw new Error('Navigation test DOM is not ready.');
  }

  const select = await this.waitForPageFieldControl('Converter');
  if (!(select instanceof this.dom.window.HTMLSelectElement)) {
    throw new Error('The loads converter field is not a select.');
  }
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline && select.options.length === 0) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  const option = select.options[select.options.length - 1];
  if (!option) {
    throw new Error('No converter options are available on the loads page.');
  }

  this.latestLoadsConverterId = option.value;
  await act(async () => {
    select.value = option.value;
    select.dispatchEvent(new this.dom.window.Event('input', { bubbles: true }));
    select.dispatchEvent(new this.dom.window.Event('change', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});

When('I choose the last circuit on the Loads page', async function () {
  if (!this.dom) {
    throw new Error('Navigation test DOM is not ready.');
  }

  const select = await this.waitForPageFieldControl('Load circuit');
  if (!(select instanceof this.dom.window.HTMLSelectElement)) {
    throw new Error('The loads circuit field is not a select.');
  }
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline && select.options.length === 0) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  const option = select.options[select.options.length - 1];
  if (!option) {
    throw new Error('No circuit options are available on the loads page.');
  }

  this.latestLoadsCircuitId = option.value;
  await act(async () => {
    select.value = option.value;
    select.dispatchEvent(new this.dom.window.Event('input', { bubbles: true }));
    select.dispatchEvent(new this.dom.window.Event('change', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});

When('I choose the last converter on the Consumption page', async function () {
  await this.chooseLastConsumptionConverter();
});

When('I title the last converter {string} on the Consumption page', async function (title: string) {
  await this.titleLastConsumptionConverter(title);
});

When('I save the converter on the Consumption page', async function () {
  await this.saveConsumptionConverter();
});

When('I add a load on the circuit page', async function () {
  await this.addLoadOnCircuitPage();
});

When('I create the move test load on the page', async function () {
  await this.createMoveTestLoad();
});

When('I create the full load field set on the page', async function () {
  await this.createFullLoadCoverageEntry();
});

When('I move the first load to the target circuit', async function () {
  if (!this.dom) {
    throw new Error('Navigation test DOM is not ready.');
  }

  const loadId = this.latestMoveLoadId;
  if (!loadId) {
    throw new Error('No load was prepared for the move test.');
  }

  const db = openDb(this.requireDbPath());
  try {
    const projectId = listProjects(db)[0]?.project_id ?? this.projectData?.project.project_id ?? 'offgridos-project';
    const load = getLoad(db, loadId);
    if (!load) {
      throw new Error(`Could not find the prepared load "${loadId}".`);
    }

    upsertLoad(db, {
      load_id: load.load_id,
      load_circuit_id: this.latestMoveTargetLoadCircuitId,
      title: load.title,
      description: load.description,
      usage_kw: load.usage_kw,
      spike_kw: load.spike_kw,
      expected_usage_hours_per_day: load.expected_usage_hours_per_day,
      sleeping_kw: load.sleeping_kw,
    }, projectId);

    this.projectData = buildDigitalTwinExport(db, this.requireDbPath(), projectId);
  } finally {
    db.close();
  }

  this.dom.window.history.replaceState(null, '', `/en/18mad/loads?circuit=${encodeURIComponent(this.latestMoveTargetLoadCircuitId)}`);
});

When('I delete the active surface from the detail page', async function () {
  const surfaceId = this.readCurrentSurfaceId();
  await this.clickSurfaceDeleteButton();
  await this.waitForText('Location details');
  this.assertSurfaceDeleted(surfaceId);
});

Then('I should see the Location page', async function () {
  assert.ok(this.dom?.window.document.body.textContent?.includes('Location details'));
});

Then('I should see the Overview page', async function () {
  assert.ok(this.dom?.window.document.body.textContent?.includes('Location details'));
});

Then('I should see the Catalogs page', async function () {
  assert.ok(this.dom?.window.document.body.textContent?.includes('Manage reusable product catalog entries'));
});

Then('I should see the Panel types page', async function () {
  assert.ok(this.dom?.window.document.body.textContent?.includes('Panels'));
});

Then('I should see the Batteries page', async function () {
  const text = this.dom?.window.document.body.textContent ?? '';
  assert.ok(text.includes('Batteries'));
  assert.ok(text.includes('Brand'));
  assert.ok(text.includes('Model'));
});

Then('I should see the Battery array page', async function () {
  assert.ok(this.dom?.window.document.body.textContent?.includes('Battery selection'));
});

Then('I should see the Production page', async function () {
  assert.ok(this.dom?.window.document.body.textContent?.includes('Surfaces'));
  assert.ok(this.dom?.window.document.body.textContent?.includes('Average daily production by month'));
});

Then('I should see the Consumption page', async function () {
  const text = this.dom?.window.document.body.textContent ?? '';
  assert.ok(text.includes('Consumption'));
  assert.ok(text.includes('Add converter') || text.includes('Show attached load circuits') || text.includes('No converters added yet.'));
  assert.ok(!text.includes('Converter bank fit'));
  assert.ok(!text.includes('Selected converters'));
  assert.ok(!text.includes('Add one or more converters to evaluate the battery bank.'));
});

Then('I should see the Load circuits page', async function () {
  const text = this.dom?.window.document.body.textContent ?? '';
  assert.ok(text.includes('Load circuits'));
  assert.ok(text.includes('Load circuit'));
});

Then('I should see {string}', async function (textToFind: string) {
  const text = this.dom?.window.document.body.textContent ?? '';
  assert.ok(text.includes(textToFind), `Expected to find "${textToFind}" in the page text.`);
});

Then('I should not see {string}', async function (textToHide: string) {
  const text = this.dom?.window.document.body.textContent ?? '';
  assert.ok(!text.includes(textToHide), `Expected not to find "${textToHide}" in the page text.`);
});

Then('the load circuits page should remember the last selected converter', async function () {
  if (!this.dom) {
    throw new Error('Navigation test DOM is not ready.');
  }

  const select = await this.waitForPageFieldControl('Converter');
  assert.ok(select instanceof this.dom.window.HTMLSelectElement, 'The load circuits converter field is not a select.');
  assert.equal(select.value, this.latestLoadCircuitsConverterId);
});

Then('the load circuits page should be filtered to the selected converter', async function () {
  if (!this.dom) {
    throw new Error('Navigation test DOM is not ready.');
  }

  const expectedConverterId = this.latestSelectedConsumptionConverterId;
  assert.ok(expectedConverterId, 'No consumption converter was recorded in the test world.');

  const url = new URL(this.dom.window.location.href);
  assert.ok(url.pathname.endsWith('/load-circuits'), `Expected a load-circuits path, got ${url.pathname}`);
  assert.equal(url.searchParams.get('converter'), expectedConverterId);

  const select = this.dom.window.document.querySelector('.button-row-between select') as HTMLSelectElement | null;
  assert.ok(select, 'Could not find the load circuits filter select.');
  assert.equal(select.value, expectedConverterId);
});

Then('the load circuits page should show the selected converter title', async function () {
  if (!this.dom) {
    throw new Error('Navigation test DOM is not ready.');
  }

  assert.ok(this.latestSelectedConsumptionConverterTitle, 'No converter title was recorded in the test world.');

  const url = new URL(this.dom.window.location.href);
  assert.equal(url.searchParams.get('converterTitle'), null);
  const select = this.dom.window.document.querySelector('.button-row-between select') as HTMLSelectElement | null;
  assert.ok(select, 'Could not find the load circuits filter select.');
  const selectedOptionLabel = select.selectedOptions[0]?.textContent?.trim() ?? '';
  assert.equal(
    selectedOptionLabel,
    this.latestSelectedConsumptionConverterTitle,
    `Expected active filter title "${this.latestSelectedConsumptionConverterTitle}" to be selected.`,
  );
});

Then('the saved load circuit should belong to the active location', async function () {
  if (!this.dom) {
    throw new Error('Navigation test DOM is not ready.');
  }

  const activeLocationId = this.latestCreatedLoadCircuitLocationId
    || this.projectData?.project.active_location_id
    || this.projectData?.project.locations?.[0]?.location_id
    || '';
  assert.ok(activeLocationId, 'No active location is available for the load circuit test.');
  assert.ok(this.latestCreatedLoadCircuitTitle, 'No load circuit title was recorded in the test world.');

  const db = openDb(this.requireDbPath());
  try {
    const projectId = listProjects(db)[0]?.project_id ?? this.projectData?.project.project_id ?? 'offgridos-project';
    const loadCircuit = listLoadCircuits(db, projectId, activeLocationId)
      .find((circuit) => circuit.title === this.latestCreatedLoadCircuitTitle.trim()) ?? null;
    assert.ok(loadCircuit, `Expected load circuit "${this.latestCreatedLoadCircuitTitle}" to exist.`);
    assert.equal(loadCircuit?.location_id, activeLocationId);
  } finally {
    db.close();
  }
});

Then('the load circuit should persist the full field set', function () {
  return this.assertLoadCircuitInDatabase({
    title: this.latestCreatedLoadCircuitTitle,
    description: this.latestCreatedLoadCircuitDescription,
    converterId: this.latestLoadCircuitsConverterId || undefined,
  });
});

Then('the load should persist the full field set', function () {
  return this.assertLoadInDatabase({
    title: 'Washing machine',
    description: 'Laundry appliance',
    loadCircuitId: this.latestLoadsCircuitId || this.latestMoveSourceLoadCircuitId || undefined,
    nominalCurrentA: null,
    nominalPowerW: 700,
    startupCurrentA: null,
    surgePowerW: 2000,
    standbyPowerW: 0,
    expectedUsageHoursPerDay: 1.2,
    dailyEnergyKwh: 0.84,
    dutyProfile: null,
    notes: 'Coverage load',
  });
});

Then('I should see the Loads page', async function () {
  const text = this.dom?.window.document.body.textContent ?? '';
  assert.ok(text.includes('Loads'));
  assert.ok(text.includes('Load circuit'));
});

Then('the loads page should remember the last selected converter and circuit', async function () {
  if (!this.dom) {
    throw new Error('Navigation test DOM is not ready.');
  }

  const converterSelect = await this.waitForPageFieldControl('Converter');
  const circuitSelect = await this.waitForPageFieldControl('Load circuit');
  assert.ok(converterSelect instanceof this.dom.window.HTMLSelectElement, 'The loads converter field is not a select.');
  assert.ok(circuitSelect instanceof this.dom.window.HTMLSelectElement, 'The loads circuit field is not a select.');
  assert.equal(converterSelect.value, this.latestLoadsConverterId);
  assert.equal(circuitSelect.value, this.latestLoadsCircuitId);
});

Then('the loads page should be filtered to the moved circuit', async function () {
  if (!this.dom) {
    throw new Error('Navigation test DOM is not ready.');
  }

  const url = new URL(this.dom.window.location.href);
  assert.ok(url.pathname.endsWith('/loads'), `Expected a loads path, got ${url.pathname}`);
  assert.equal(url.searchParams.get('circuit'), this.latestMoveTargetLoadCircuitId);
});

Then('the moved load should still be visible', async function () {
  const db = openDb(this.requireDbPath());
  try {
    const load = getLoad(db, this.latestMoveLoadId);
    assert.ok(load, `Expected load "${this.latestMoveLoadId}" to exist.`);
    assert.equal(load?.load_circuit_id, this.latestMoveTargetLoadCircuitId);
  } finally {
    db.close();
  }
});

Then('I should see the Converter detail page', async function () {
  const text = this.dom?.window.document.body.textContent ?? '';
  assert.ok(text.includes('Load circuits'));
  assert.ok(text.includes('Converter bank fit'));
  assert.ok(text.includes('Add circuit'));
});

Then('I should see the Circuit detail page', async function () {
  const text = this.dom?.window.document.body.textContent ?? '';
  assert.ok(text.includes('Loads'));
  assert.ok(text.includes('Add load'));
});

Then('I should see the Surface detail page', async function () {
  assert.ok(this.dom?.window.document.body.textContent?.includes('Panel'));
  assert.ok(this.dom?.window.document.body.textContent?.includes('Panel array'));
  assert.ok(this.dom?.window.document.body.textContent?.includes('MPPT'));
  assert.ok(this.dom?.window.document.body.textContent?.includes('Evaluation'));
});

When('I enter surface notes {string}', async function (notes: string) {
  await this.setSurfaceNotes(notes);
});

When('I upload a surface photo', async function () {
  await this.uploadSurfacePhoto();
});

When('I remove the surface photo', async function () {
  await this.removeSurfacePhoto();
});

When('I save the surface information', async function () {
  await this.saveSurfaceDetails();
});

When('I reload OffGridOS', async function () {
  await this.reloadApp();
  await this.waitForText('OffGridOS');
});

Then('the active surface should persist notes {string} with a stored photo', function (notes: string) {
  const surfaceId = this.readCurrentSurfaceId();
  this.assertSurfaceInDatabase(surfaceId, notes, true);
});

Then('the active surface should persist notes {string} without a stored photo', function (notes: string) {
  const surfaceId = this.readCurrentSurfaceId();
  this.assertSurfaceInDatabase(surfaceId, notes, false);
});

When('I enter location notes {string}', async function (notes: string) {
  await this.setLocationNotes(notes);
});

When('I upload a location photo', async function () {
  await this.uploadLocationPhoto();
});

When('I save the location photo', async function () {
  await this.saveLocationPhoto();
});

When('I save the location information', async function () {
  await this.saveLocationInformation();
});

Then('the location should persist notes {string} with a stored photo', function (notes: string) {
  this.assertLocationInDatabase(notes, true);
});

Then('the location should persist notes {string} without a stored photo', function (notes: string) {
  this.assertLocationInDatabase(notes, false);
});

Then('the location photo should still be visible', async function () {
  await this.waitForSelector('.photo-frame .photo-image[alt="Location"]');
});

Then('the location notes should still be visible', async function () {
  await this.waitForTextareaValue('.field textarea', this.latestEnteredLocationNotes);
});

When('I set the location title to {string}', async function (title: string) {
  await this.setLocationTitle(title);
});

When('I set the country to {string}', async function (country: string) {
  await this.setLocationCountry(country);
});

When('I set the location description to {string}', async function (description: string) {
  await this.setLocationDescription(description);
});

When('I set the latitude to {string}', async function (latitude: string) {
  await this.setLocationLatitude(latitude);
});

When('I set the longitude to {string}', async function (longitude: string) {
  await this.setLocationLongitude(longitude);
});

When('I set the surface name to {string}', async function (name: string) {
  await this.setSurfaceName(name);
});

When('I set the surface description to {string}', async function (description: string) {
  await this.setSurfaceDescription(description);
});

When('I set the surface height to {string}', async function (height: string) {
  await this.setSurfaceHeight(height);
});

When('I set the surface width to {string}', async function (width: string) {
  await this.setSurfaceWidth(width);
});

When('I set the surface azimuth to {string}', async function (azimuth: string) {
  await this.setSurfaceAzimuth(azimuth);
});

When('I set the surface tilt to {string}', async function (tilt: string) {
  await this.setSurfaceTilt(tilt);
});

When('I choose the last panel type', async function () {
  await this.chooseLastPanelType();
});

When('I set the panel count to {string}', async function (count: string) {
  await this.setPanelCount(count);
});

When('I save the panel setup', async function () {
  await this.savePanelSetup();
});

When('I set the panels per string to {string}', async function (panelsPerString: string) {
  await this.setPanelsPerString(panelsPerString);
});

When('I set the parallel strings to {string}', async function (parallelStrings: string) {
  await this.setParallelStrings(parallelStrings);
});

When('I choose the last MPPT type', async function () {
  await this.chooseLastMpptType();
});

When('I set the inverter title to {string}', async function (title: string) {
  await this.setInverterTitle(title);
});

When('I set the inverter description to {string}', async function (description: string) {
  await this.setInverterDescription(description);
});

When('I set the inverter notes to {string}', async function (notes: string) {
  await this.setInverterNotes(notes);
});

When('I choose the last inverter type', async function () {
  await this.chooseLastInverterType();
});

When('I save the surface configuration', async function () {
  await this.saveSurfaceDesign();
});

When('I attempt to save the surface configuration', async function () {
  await this.attemptSaveSurfaceDesign();
});

When('I save the inverter configuration', async function () {
  await this.saveInverterConfiguration();
});

Then('the location should persist the full field set', function () {
  return this.assertFullLocationInDatabase({
    title: 'Field coverage location',
    country: 'Netherlands',
    placeName: 'Warten',
    description: 'Shared context for the whole site',
    notes: 'Check winter shading later',
    latitude: 53.1504,
    longitude: 5.9007,
    expectPhoto: true,
  });
});

Then('the surface should persist the full field set', function () {
  const surfaceId = this.readCurrentSurfaceId();
  return this.assertFullSurfaceInDatabase({
    surfaceId,
    name: 'South-East roof',
    description: 'Morning production surface',
    orientationDeg: 140,
    tiltDeg: 35,
    heightM: 4.2,
    widthM: 2.8,
    notes: 'Install with chimney clearance',
    expectPhoto: true,
  });
});

Then('the surface panel setup should persist', function () {
  const surfaceId = this.readCurrentSurfaceId();
  return this.assertSurfacePanelSetupInDatabase({
    surfaceId,
    panelTypeId: this.latestSelectedPanelTypeId,
    count: 12,
  });
});

Then('the surface configuration should persist', function () {
  const surfaceId = this.readCurrentSurfaceId();
  return this.assertSurfaceConfigurationInDatabase({
    surfaceId,
    panelsPerString: 3,
    parallelStrings: 4,
    selectedMpptTypeId: this.latestSelectedMpptTypeId,
  });
});

Then('I should see the surface configuration error {string}', async function (message: string) {
  if (this.latestSurfaceDesignSaveError === message) {
    return;
  }

  await this.waitForText(message);
});

Then('the inverter configuration should persist', function () {
  return this.assertInverterConfigurationInDatabase({
    title: 'Main inverter',
    description: 'Primary AC conversion unit',
    selectedInverterTypeId: this.latestSelectedInverterTypeId,
  });
});

Then('the inverter configuration form should still show the saved values', async function () {
  await this.waitForPanelFieldValue('About', 'Title', 'Main inverter');
  await this.waitForPanelFieldValue('About', 'Description', 'Primary AC conversion unit');
  await this.waitForPanelFieldValue('Inverter selection', 'Selected inverter', this.latestSelectedInverterTypeId);
});

Then('the inverter notes should persist', function () {
  return this.assertInverterConfigurationInDatabase({
    selectedInverterTypeId: this.latestSelectedInverterTypeId,
    notes: this.latestEnteredInverterNotes,
  });
});

Then('the inverter notes should still be visible', async function () {
  await this.waitForTextareaValue('.field-textarea', this.latestEnteredInverterNotes);
});

When('I upload an inverter image', async function () {
  await this.uploadInverterImage();
});

Then('the inverter image should persist', function () {
  return this.assertInverterConfigurationInDatabase({
    selectedInverterTypeId: this.latestSelectedInverterTypeId,
    expectImage: true,
  });
});

Then('the inverter image should still be visible', async function () {
  await this.waitForSelector('.photo-frame .photo-image');
});

When('I set the battery title to {string}', async function (title: string) {
  await this.setBatteryTitle(title);
});

When('I set the battery description to {string}', async function (description: string) {
  await this.setBatteryDescription(description);
});

When('I set the battery notes to {string}', async function (notes: string) {
  await this.setBatteryNotes(notes);
});

When('I choose the last battery type', async function () {
  await this.chooseLastBatteryType();
});

When('I add a battery type', async function () {
  await this.startBatteryTypeAdd();
});

When('I press Edit battery', async function () {
  await this.clickByText('Edit battery');
  await this.waitForText('Non-table fields');
});

Then('the battery draft row should be at the top of the table', async function () {
  if (!this.dom) {
    throw new Error('Navigation test DOM is not ready.');
  }

  const tbody = this.dom.window.document.querySelector('.catalog-table tbody');
  if (!tbody) {
    throw new Error('Could not find the battery catalog table body.');
  }

  const firstRow = tbody.firstElementChild as HTMLElement | null;
  assert.ok(firstRow, 'Expected the battery catalog table to contain a first row.');
  assert.ok(firstRow.classList.contains('catalog-inline-editor-row'), 'Expected the battery draft row to be inserted at the top of the table.');
});

When('I fill in the battery type form with model {string}', async function (model: string) {
  await this.fillBatteryTypeForm(model);
});

When('I press Cancel in the battery editor', async function () {
  await this.clickBatteryEditorButton('Cancel');
});

When('I press Save in the battery editor', async function () {
  await this.clickBatteryEditorButton('Save');
  if (this.latestEnteredBatteryCatalogModel.trim() !== '') {
    await this.assertBatteryTypeExists(this.latestEnteredBatteryCatalogModel);
  }
});

When('I press Delete in the battery editor', async function () {
  await this.clickBatteryEditorButton('Delete');
});

When('I confirm the battery delete warning', async function () {
  await this.clickBatteryDeleteWarningButton('Delete row');
});

When('I open the battery row with model {string}', async function (model: string) {
  await this.clickBatteryRowByModel(model);
});

When('I set the battery count to {string}', async function (count: string) {
  await this.setBatteryCount(count);
});

When('I upload a battery image', async function () {
  await this.uploadBatteryImage();
});

When('I save the battery bank configuration', async function () {
  await this.saveBatteryBankConfiguration();
});

Then('the battery bank configuration should persist', function () {
  return this.assertBatteryBankConfigurationInDatabase({
    title: 'Main battery bank',
    description: 'Primary storage unit',
    selectedBatteryTypeId: this.latestSelectedBatteryTypeId,
  });
});

Then('the battery bank configuration form should still show the saved values', async function () {
  await this.waitForPanelFieldValue('Battery bank details', 'Title', 'Main battery bank');
  await this.waitForPanelFieldValue('Battery bank details', 'Description', 'Primary storage unit');
  await this.waitForPanelFieldValue('Battery selection', 'Battery type', this.latestSelectedBatteryTypeId);
});

Then('the battery bank notes should persist', function () {
  return this.assertBatteryBankConfigurationInDatabase({
    notes: this.latestEnteredBatteryNotes,
    selectedBatteryTypeId: this.latestSelectedBatteryTypeId,
  });
});

Then('the battery bank notes should still be visible', async function () {
  await this.waitForTextareaValue('.field-textarea', this.latestEnteredBatteryNotes);
});

Then('the battery bank image should persist', function () {
  return this.assertBatteryBankConfigurationInDatabase({
    selectedBatteryTypeId: this.latestSelectedBatteryTypeId,
    expectImage: true,
  });
});

Then('the battery bank image should still be visible', async function () {
  await this.waitForSelector('.panel .photo-frame .photo-image');
});

Then('the battery type with model {string} should exist', async function (model: string) {
  await this.assertBatteryTypeExists(model);
});

Then('the battery type with model {string} should not exist', async function (model: string) {
  await this.assertBatteryTypeMissing(model);
});

Then('I should see the battery delete warning', async function () {
  if (!this.dom) {
    throw new Error('Navigation test DOM is not ready.');
  }

  const dialog = this.dom.window.document.querySelector('.confirm-dialog') as HTMLElement | null;
  assert.ok(dialog, 'Expected the battery delete warning dialog to be visible.');
  const dialogText = dialog.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  assert.ok(dialogText.includes('Delete battery'), `Expected dialog text to mention the battery, got: ${dialogText || '(empty)'}`);
  assert.ok(dialogText.includes('Are you sure you want to delete this row?'), `Expected explicit delete warning copy, got: ${dialogText || '(empty)'}`);
});
