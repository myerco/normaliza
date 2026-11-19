import { ARCHETYPES } from '../core/archetypes.js';
import {
  ATTRIBUTE_CATEGORIES,
  ATTRIBUTE_VALUE_MAX,
  ATTRIBUTE_VALUE_MIN,
  DEFAULT_ARCHETYPE_VALUES,
  DEFAULT_ATTRIBUTES,
  normalizeAttributeSlug,
  validateCatalogValue
} from '../core/attributes.js';
import { createPlayerId } from '../core/players.js';

export const CATALOG_KEY = 'normaliza:v3:catalog';
const CATALOG_VERSION = 1;

export function loadCatalog() {
  const stored = readJson(CATALOG_KEY, null);

  if (!stored || !Array.isArray(stored.archetypes) || !Array.isArray(stored.attributes)) {
    return seedCatalog();
  }

  const archetypes = stored.archetypes.filter(isArchetype);
  const attributes = stored.attributes.filter(isAttribute);

  if (archetypes.length === 0 || attributes.length === 0) {
    return seedCatalog();
  }

  const values = normalizeValues(stored.values, archetypes, attributes);

  return {
    version: CATALOG_VERSION,
    categories: ATTRIBUTE_CATEGORIES,
    archetypes,
    attributes,
    values
  };
}

export function saveCatalog(catalog) {
  const normalized = {
    version: CATALOG_VERSION,
    archetypes: Array.isArray(catalog?.archetypes) ? catalog.archetypes : [],
    attributes: Array.isArray(catalog?.attributes) ? catalog.attributes : [],
    values: catalog?.values ?? {}
  };

  writeJson(CATALOG_KEY, normalized);
  return normalized;
}

export function resetCatalog() {
  return seedCatalog();
}

export function getActiveArchetypes(catalog = loadCatalog()) {
  return catalog.archetypes.filter((archetype) => archetype.active);
}

export function getActiveAttributes(catalog = loadCatalog()) {
  return catalog.attributes.filter((attribute) => attribute.active);
}

export function getArchetypeValues(archetypeId, catalog = loadCatalog()) {
  const values = catalog.values?.[archetypeId] ?? {};
  const result = {};

  for (const attribute of catalog.attributes) {
    result[attribute.id] = validateCatalogValue(values[attribute.id])
      ? values[attribute.id]
      : ATTRIBUTE_VALUE_MIN;
  }

  return result;
}

export function updateArchetype(archetypeId, patch) {
  const catalog = loadCatalog();
  const index = catalog.archetypes.findIndex((archetype) => archetype.id === archetypeId);

  if (index === -1) {
    return null;
  }

  const current = catalog.archetypes[index];
  const name = normalizeText(patch.name, current.name);
  const slug = uniqueSlug(
    catalog.archetypes,
    patch.slug,
    name,
    current.id
  );
  catalog.archetypes[index] = {
    ...current,
    name,
    slug,
    description: normalizeText(patch.description, current.description),
    imageId: normalizeImage(patch.imageId, current.imageId),
    active: patch.active === undefined ? current.active : Boolean(patch.active),
    updatedAt: new Date().toISOString()
  };

  return saveCatalog(catalog).archetypes[index];
}

export function createArchetype({ name, description = '', imageId = 'engenheiro', active = true }) {
  const catalog = loadCatalog();
  const normalizedName = normalizeText(name, 'Novo arquétipo');
  const slug = uniqueSlug(catalog.archetypes, null, normalizedName);
  const archetype = {
    id: createPlayerId(),
    slug,
    name: normalizedName,
    description: String(description ?? '').trim(),
    imageId: normalizeImage(imageId, 'engenheiro'),
    color: '#2a9d8f',
    mark: normalizedName.slice(0, 1).toUpperCase(),
    active: Boolean(active),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  catalog.archetypes.push(archetype);
  catalog.values[archetype.id] = Object.fromEntries(
    catalog.attributes.map((attribute) => [attribute.id, ATTRIBUTE_VALUE_MIN])
  );
  saveCatalog(catalog);
  return archetype;
}

export function updateAttribute(attributeId, patch) {
  const catalog = loadCatalog();
  const index = catalog.attributes.findIndex((attribute) => attribute.id === attributeId);

  if (index === -1) {
    return null;
  }

  const current = catalog.attributes[index];
  const name = normalizeText(patch.name, current.name);
  const slug = uniqueSlug(catalog.attributes, patch.slug, name, current.id);
  const categoryId = ATTRIBUTE_CATEGORIES.some((category) => category.id === patch.categoryId)
    ? patch.categoryId
    : current.categoryId;

  catalog.attributes[index] = {
    ...current,
    name,
    slug,
    description: normalizeText(patch.description, current.description),
    categoryId,
    icon: normalizeIcon(patch.icon, current.icon),
    active: patch.active === undefined ? current.active : Boolean(patch.active),
    updatedAt: new Date().toISOString()
  };

  return saveCatalog(catalog).attributes[index];
}

export function createAttribute({
  name,
  description = '',
  categoryId = ATTRIBUTE_CATEGORIES[0].id,
  icon = '',
  active = true
}) {
  const catalog = loadCatalog();
  const normalizedName = normalizeText(name, 'Novo atributo');
  const slug = uniqueSlug(catalog.attributes, null, normalizedName);
  const attribute = {
    id: createPlayerId(),
    slug,
    name: normalizedName,
    description: String(description ?? '').trim(),
    categoryId: ATTRIBUTE_CATEGORIES.some((category) => category.id === categoryId)
      ? categoryId
      : ATTRIBUTE_CATEGORIES[0].id,
    icon: normalizeIcon(icon, normalizedName.slice(0, 4).toUpperCase()),
    color: '#2a9d8f',
    active: Boolean(active),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  catalog.attributes.push(attribute);

  for (const archetype of catalog.archetypes) {
    catalog.values[archetype.id] = {
      ...(catalog.values[archetype.id] ?? {}),
      [attribute.id]: ATTRIBUTE_VALUE_MIN
    };
  }

  saveCatalog(catalog);
  return attribute;
}

export function setArchetypeValue(archetypeId, attributeId, value) {
  if (!validateCatalogValue(value)) {
    return null;
  }

  const catalog = loadCatalog();
  const archetype = catalog.archetypes.find((item) => item.id === archetypeId);
  const attribute = catalog.attributes.find((item) => item.id === attributeId);

  if (!archetype || !attribute) {
    return null;
  }

  catalog.values[archetypeId] = {
    ...(catalog.values[archetypeId] ?? {}),
    [attributeId]: value
  };
  saveCatalog(catalog);
  return value;
}

export function setArchetypeValues(archetypeId, values) {
  const catalog = loadCatalog();
  const archetype = catalog.archetypes.find((item) => item.id === archetypeId);

  if (!archetype || !values || typeof values !== 'object') {
    return null;
  }

  const normalized = {};

  for (const attribute of catalog.attributes) {
    const value = values[attribute.id];
    if (!validateCatalogValue(value)) {
      return null;
    }
    normalized[attribute.id] = value;
  }

  catalog.values[archetypeId] = normalized;
  saveCatalog(catalog);
  return normalized;
}

export function catalogArchetype(catalog, archetypeId) {
  return (
    catalog?.archetypes?.find((archetype) => archetype.id === archetypeId) ?? null
  );
}

export function catalogAttribute(catalog, attributeId) {
  return (
    catalog?.attributes?.find((attribute) => attribute.id === attributeId) ?? null
  );
}

function seedCatalog() {
  const archetypes = ARCHETYPES.map((archetype) => ({
    ...archetype,
    name: archetype.name ?? archetype.label,
    slug: archetype.id,
    imageId: archetype.id,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
  const attributes = DEFAULT_ATTRIBUTES.map((attribute) => ({
    ...attribute,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
  const catalog = {
    version: CATALOG_VERSION,
    archetypes,
    attributes,
    values: Object.fromEntries(
      archetypes.map((archetype) => [
        archetype.id,
        Object.fromEntries(
          attributes.map((attribute) => [
            attribute.id,
            DEFAULT_ARCHETYPE_VALUES[archetype.id]?.[attribute.id] ?? ATTRIBUTE_VALUE_MIN
          ])
        )
      ])
    )
  };

  saveCatalog(catalog);
  return {
    ...catalog,
    categories: ATTRIBUTE_CATEGORIES
  };
}

function normalizeValues(values, archetypes, attributes) {
  const result = {};

  for (const archetype of archetypes) {
    const existing = values?.[archetype.id] ?? {};
    result[archetype.id] = {};

    for (const attribute of attributes) {
      const value = existing[attribute.id];
      result[archetype.id][attribute.id] = validateCatalogValue(value)
        ? value
        : ATTRIBUTE_VALUE_MIN;
    }
  }

  return result;
}

function isArchetype(archetype) {
  return Boolean(
    archetype &&
      typeof archetype.id === 'string' &&
      typeof archetype.name === 'string' &&
      typeof archetype.slug === 'string'
  );
}

function isAttribute(attribute) {
  return Boolean(
    attribute &&
      typeof attribute.id === 'string' &&
      typeof attribute.name === 'string' &&
      typeof attribute.slug === 'string'
  );
}

function normalizeText(value, fallback) {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeIcon(value, fallback) {
  const text = String(value ?? '').trim().slice(0, 4);
  return text || fallback;
}

function normalizeImage(value, fallback) {
  const allowed = new Set(['construtor', 'arquiteto', 'engenheiro', 'analista', 'cientista']);
  return allowed.has(value) ? value : fallback;
}

function uniqueSlug(items, requested, fallbackName, currentId = null) {
  const base = normalizeAttributeSlug(requested || fallbackName) || 'item';
  let slug = base;
  let counter = 2;

  while (
    items.some((item) => item.id !== currentId && item.slug === slug)
  ) {
    slug = `${base}-${counter}`;
    counter += 1;
  }

  return slug;
}

function readJson(key, fallback) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
