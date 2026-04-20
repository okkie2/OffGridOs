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
    assign('MouseEvent', this.dom.window.MouseEvent);
    assign('HashChangeEvent', this.dom.window.HashChangeEvent);
    assign('fetch', async () => {
      if (!this.projectData) {
        throw new Error('Project data was not prepared before rendering the app.');
      }

      return new Response(JSON.stringify(this.projectData), {
        status: 200,
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

Then('I should see the Inverter array page', async function () {
  assert.ok(this.dom?.window.document.body.textContent?.includes('Inverter array'));
});

Then('I should see the Surface detail page', async function () {
  assert.ok(this.dom?.window.document.body.textContent?.includes('Panel'));
  assert.ok(this.dom?.window.document.body.textContent?.includes('String'));
  assert.ok(this.dom?.window.document.body.textContent?.includes('MPPT'));
  assert.ok(this.dom?.window.document.body.textContent?.includes('Summary and evaluation'));
});
