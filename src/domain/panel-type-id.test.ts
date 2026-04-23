import { describe, expect, it } from 'vitest';
import { generateCatalogId, generatePanelTypeId, generateUniqueCatalogId } from './panel-type-id.js';

describe('generateCatalogId', () => {
  it('creates a stable slug from the model name', () => {
    expect(generateCatalogId('Aiko 475Wp All Black Glas-Glas')).toBe('aiko-475wp-all-black-glas-glas');
  });

  it('falls back to a generic id when the model is empty', () => {
    expect(generateCatalogId('   ')).toBe('catalog-item');
  });
});

describe('generatePanelTypeId', () => {
  it('reuses the catalog slug', () => {
    expect(generatePanelTypeId('Aiko 475Wp All Black Glas-Glas')).toBe('aiko-475wp-all-black-glas-glas');
  });
});

describe('generateUniqueCatalogId', () => {
  it('appends a suffix when the base id already exists', () => {
    expect(generateUniqueCatalogId('Aiko 475Wp All Black Glas-Glas', ['aiko-475wp-all-black-glas-glas'])).toBe('aiko-475wp-all-black-glas-glas-2');
  });
});
