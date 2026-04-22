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
import { getSurface, syncPvTopologyForSurface, updateSurface } from '../../src/db/queries.js';
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
  latestEnteredSurfaceNotes = '';
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

      if (url.pathname === '/api/digital-twin' && method === 'GET') {
        return new Response(JSON.stringify(this.readProjectData()), {
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
          usable_area_m2?: unknown;
          notes?: unknown;
          photo_data_url?: unknown;
        };

        const name = typeof payload.name === 'string' ? payload.name.trim() : '';
        const description = payload.description === undefined
          ? undefined
          : (typeof payload.description === 'string' ? payload.description.trim() : String(payload.description));
        const orientationDeg = typeof payload.orientation_deg === 'number' ? payload.orientation_deg : Number(payload.orientation_deg);
        const tiltDeg = typeof payload.tilt_deg === 'number' ? payload.tilt_deg : Number(payload.tilt_deg);
        const usableAreaM2 = payload.usable_area_m2 === undefined
          ? undefined
          : (payload.usable_area_m2 == null || payload.usable_area_m2 === '' ? null : Number(payload.usable_area_m2));
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
            usable_area_m2: usableAreaM2 === undefined ? (existing.usable_area_m2 ?? undefined) : usableAreaM2 ?? undefined,
            notes: effectiveNotes === undefined ? (existing.notes ?? undefined) : effectiveNotes,
            photo_data_url: photoDataUrl === undefined ? (existing.photo_data_url ?? null) : photoDataUrl,
          });
          syncPvTopologyForSurface(db, surfaceId);

          this.projectData = buildDigitalTwinExport(db, this.requireDbPath());
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
    this.latestEnteredSurfaceNotes = '';
  }

  prepareProjectData(): void {
    const dir = mkdtempSync(join(tmpdir(), 'offgridos-navigation-'));
    this.dbDir = dir;
    this.dbPath = join(dir, 'project.db');
    ensureDatabaseReady(this.dbPath);
    const db = openDb(this.dbPath);
    try {
      this.projectData = buildDigitalTwinExport(db, this.dbPath);
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

  readProjectData(): DigitalTwinExport {
    const dbPath = this.requireDbPath();
    const db = openDb(dbPath);
    try {
      this.projectData = buildDigitalTwinExport(db, dbPath);
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

  async clickByText(text: string, selector = 'a,button'): Promise<void> {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const match = Array.from(this.dom.window.document.querySelectorAll(selector)).find((node) => {
      return node.textContent?.trim() === text;
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

    const section = Array.from(this.dom.window.document.querySelectorAll('.panel-with-actions'))
      .find((panel) => panel.querySelector('h2')?.textContent?.trim() === 'Surface information') as HTMLElement | undefined;
    const saveButton = Array.from(section?.querySelectorAll('button') ?? [])
      .find((node) => node.textContent?.trim() === 'Save') as HTMLElement | undefined;
    if (!saveButton) {
      throw new Error('Could not find the Save button for surface information.');
    }

    await act(async () => {
      saveButton.dispatchEvent(new this.dom.window.MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await this.waitForText('Surface details saved to the project database.');
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

  readCurrentSurfaceId(): string {
    if (!this.dom) {
      throw new Error('Navigation test DOM is not ready.');
    }

    const hash = this.dom.window.location.hash;
    if (!hash.startsWith('#/surfaces/')) {
      throw new Error(`Expected current route to be a surface detail, got "${hash}".`);
    }
    return decodeURIComponent(hash.slice('#/surfaces/'.length));
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
  await this.waitForText('System chain');
});

When('I open Location from the menu', async function () {
  await this.clickByText('Location');
  await this.waitForText('Start information');
});

When('I go back to Dashboard using the menu', async function () {
  await this.clickByText('Dashboard');
  await this.waitForText('System chain');
});

When('I open Catalogs from the menu', async function () {
  await this.clickByText('Catalogs');
  await this.waitForText('Manage the reusable product catalogs');
});

When('I open Battery array from the menu', async function () {
  await this.clickByText('Battery array');
  await this.waitForText('Battery array configuration');
});

When('I open Solar yield from the menu', async function () {
  await this.clickByText('Solar yield');
  await this.waitForText('Surface summary');
});

When('I open Inverter array from the menu', async function () {
  await this.clickByText('Inverter array');
  await this.waitForText('Inverter array');
});

When('I open the first surface detail from the menu', async function () {
  await this.clickFirstSurfaceDetailFromMenu();
  await this.waitForText('Panel');
});

When('I open Panel types from Catalogs', async function () {
  await this.clickByText('Open Panel types');
  await this.waitForText('Panel types');
});

When('I go back to Catalogs using the menu', async function () {
  await this.clickByText('Catalogs');
  await this.waitForText('Manage the reusable product catalogs');
});

When('I go back to Dashboard using the breadcrumb', async function () {
  await this.clickByText('Overview', '.breadcrumbs .crumb-link');
  await this.waitForText('System chain');
});

When('I go back to Location using the breadcrumb', async function () {
  await this.clickByText('Location', '.breadcrumbs .crumb-link');
  await this.waitForText('Start information');
});

When('I open the first surface detail from the page', async function () {
  await this.clickFirstSurfaceDetailFromPage();
  await this.waitForText('Panel');
});

Then('I should see the Location page', async function () {
  assert.ok(this.dom?.window.document.body.textContent?.includes('Start information'));
});

Then('I should see the Dashboard page', async function () {
  assert.ok(this.dom?.window.document.body.textContent?.includes('System chain'));
});

Then('I should see the Catalogs page', async function () {
  assert.ok(this.dom?.window.document.body.textContent?.includes('Manage the reusable product catalogs'));
});

Then('I should see the Panel types page', async function () {
  assert.ok(this.dom?.window.document.body.textContent?.includes('Panel types'));
});

Then('I should see the Battery array page', async function () {
  assert.ok(this.dom?.window.document.body.textContent?.includes('Battery array configuration'));
});

Then('I should see the Solar yield page', async function () {
  assert.ok(this.dom?.window.document.body.textContent?.includes('Surface summary'));
  assert.ok(this.dom?.window.document.body.textContent?.includes('Monthly expected yield'));
});

Then('I should see the Inverter array page', async function () {
  assert.ok(this.dom?.window.document.body.textContent?.includes('Inverter array'));
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
  await this.waitForText('Dashboard');
});

Then('the active surface should persist notes {string} with a stored photo', function (notes: string) {
  const surfaceId = this.readCurrentSurfaceId();
  this.assertSurfaceInDatabase(surfaceId, notes, true);
});

Then('the active surface should persist notes {string} without a stored photo', function (notes: string) {
  const surfaceId = this.readCurrentSurfaceId();
  this.assertSurfaceInDatabase(surfaceId, notes, false);
});
