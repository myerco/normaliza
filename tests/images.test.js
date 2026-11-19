import {
  getActiveImageAssets,
  getImageAsset,
  loadImageAssets,
  updateImageAsset
} from '../src/persistence/imageStorage.js';
import { assert, assertEqual, test } from './helpers.js';

test('biblioteca inicial de imagens de personagem está disponível', () => {
  localStorage.removeItem('normaliza:v3:images');
  const images = loadImageAssets();
  assertEqual(images.length, 5);
  assertEqual(getActiveImageAssets().length, 5);
  assertEqual(getImageAsset('engenheiro').name, 'Engenheiro');
});

test('imagem de personagem pode ser atualizada e desativada', () => {
  const updated = updateImageAsset('engenheiro', {
    name: 'Engenheiro de Dados',
    imageUrl: 'https://example.com/engenheiro.png',
    active: false
  });

  assertEqual(updated.name, 'Engenheiro de Dados');
  assertEqual(updated.active, false);
  assertEqual(getActiveImageAssets().some((image) => image.id === 'engenheiro'), false);
  assertEqual(getImageAsset('engenheiro').imageUrl, 'https://example.com/engenheiro.png');
  localStorage.removeItem('normaliza:v3:images');
});
