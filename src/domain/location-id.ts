export function generateLocationId(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'location';
}

export function generateUniqueLocationId(label: string, existingIds: Iterable<string> = []): string {
  const baseId = generateLocationId(label);
  const usedIds = new Set(existingIds);
  let candidate = baseId;
  let suffix = 2;

  while (usedIds.has(candidate)) {
    candidate = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}
