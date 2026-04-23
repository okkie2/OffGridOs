export function generateCatalogId(model: string): string {
  return model.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'catalog-item';
}

export function generateUniqueCatalogId(model: string, existingIds: Iterable<string> = []): string {
  const baseId = generateCatalogId(model);
  const usedIds = new Set(existingIds);
  let candidate = baseId;
  let suffix = 2;

  while (usedIds.has(candidate)) {
    candidate = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export function generatePanelTypeId(model: string): string {
  return generateCatalogId(model);
}
