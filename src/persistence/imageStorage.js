import { AVATARS } from '../core/players.js';

const IMAGE_KEY = 'normaliza:v3:images';
const VERSION = 1;

export function loadImageAssets() {
  const stored = readJson(IMAGE_KEY, null);
  if (!stored || !Array.isArray(stored.images) || stored.images.length === 0) {
    return seedImages();
  }

  const images = stored.images.map(normalizeImage);
  let changed = false;

  for (const avatar of AVATARS) {
    if (!images.some((image) => image.id === avatar.id)) {
      images.push(defaultImage(avatar));
      changed = true;
    }
  }

  if (changed) {
    saveImageAssets(images);
  }

  return images;
}

export function saveImageAssets(images) {
  const normalized = Array.isArray(images) ? images.map(normalizeImage) : [];
  writeJson(IMAGE_KEY, { version: VERSION, images: normalized });
  return normalized;
}

export function updateImageAsset(imageId, patch) {
  const images = loadImageAssets();
  const index = images.findIndex((image) => image.id === imageId);
  if (index === -1) {
    return null;
  }

  images[index] = normalizeImage({
    ...images[index],
    ...patch,
    id: imageId,
    updatedAt: new Date().toISOString()
  });
  saveImageAssets(images);
  return images[index];
}

export function getActiveImageAssets() {
  return loadImageAssets().filter((image) => image.active);
}

export function getImageAsset(imageId) {
  return loadImageAssets().find((image) => image.id === imageId) ?? null;
}

function seedImages() {
  const images = AVATARS.map(defaultImage);
  saveImageAssets(images);
  return images;
}

function defaultImage(avatar) {
  return {
    id: avatar.id,
    name: avatar.label,
    description: avatar.description,
    color: avatar.color,
    imageUrl: '',
    category: 'personagem',
    author: 'Cafegeek',
    license: 'Original do projeto',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function normalizeImage(image) {
  return {
    id: String(image.id),
    name: String(image.name ?? image.label ?? image.id),
    description: String(image.description ?? ''),
    color: /^#[0-9a-f]{6}$/i.test(String(image.color ?? '')) ? image.color : '#2a9d8f',
    imageUrl: String(image.imageUrl ?? ''),
    category: String(image.category ?? 'personagem'),
    author: String(image.author ?? ''),
    license: String(image.license ?? ''),
    active: image.active !== false,
    createdAt: image.createdAt ?? new Date().toISOString(),
    updatedAt: image.updatedAt ?? new Date().toISOString()
  };
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
