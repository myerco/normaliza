import {
  ATTRIBUTE_VALUE_MAX,
  ATTRIBUTE_VALUE_MIN,
  DEFAULT_ATTRIBUTES
} from '../src/core/attributes.js';
import {
  CATALOG_KEY,
  createArchetype,
  createAttribute,
  getArchetypeValues,
  loadCatalog,
  resetCatalog,
  setArchetypeValues,
  setArchetypeValue,
  updateArchetype,
  updateAttribute
} from '../src/persistence/catalogStorage.js';
import { assert, assertEqual, test } from './helpers.js';

test('catálogo inicial contém arquétipos, atributos e valores 1–10', () => {
  clearCatalogTestStorage();
  const catalog = loadCatalog();

  assertEqual(catalog.archetypes.length, 3);
  assertEqual(catalog.attributes.length, DEFAULT_ATTRIBUTES.length);
  assertEqual(catalog.values.analista['sql-avancado'], 8);
  assertEqual(catalog.values.analista['postgresql-admin'], 10);

  for (const archetype of catalog.archetypes) {
    const values = getArchetypeValues(archetype.id, catalog);
    for (const value of Object.values(values)) {
      assert(value >= ATTRIBUTE_VALUE_MIN && value <= ATTRIBUTE_VALUE_MAX);
    }
  }

  resetCatalog();
  clearCatalogTestStorage();
});

test('arquétipo pode ser criado e editado no catálogo', () => {
  clearCatalogTestStorage();
  const created = createArchetype({
    name: 'Cientista',
    description: 'Investiga e experimenta.',
    imageId: 'cientista'
  });
  const catalogAfterCreate = loadCatalog();
  const values = getArchetypeValues(created.id, catalogAfterCreate);

  assertEqual(catalogAfterCreate.archetypes.length, 4);
  assert(Object.values(values).every((value) => value === 1));

  const updated = updateArchetype(created.id, {
    name: 'Cientista de Dados',
    description: 'Analisa grandes volumes.',
    active: false
  });

  assertEqual(updated.name, 'Cientista de Dados');
  assertEqual(updated.active, false);
  assertEqual(loadCatalog().archetypes.length, 4);
  clearCatalogTestStorage();
});

test('atributo novo entra na matriz com valor inicial e pode ser editado', () => {
  clearCatalogTestStorage();
  const attribute = createAttribute({
    name: 'Modelagem de Dados',
    description: 'Modelagem conceitual e lógica.',
    categoryId: 'banco',
    icon: 'MD'
  });
  const catalogAfterCreate = loadCatalog();
  const values = catalogAfterCreate.values.engenheiro;

  assertEqual(catalogAfterCreate.attributes.length, DEFAULT_ATTRIBUTES.length + 1);
  assertEqual(values[attribute.id], 1);

  const updated = updateAttribute(attribute.id, {
    name: 'Modelagem Relacional',
    description: 'Modelagem relacional.',
    active: false
  });

  assertEqual(updated.name, 'Modelagem Relacional');
  assertEqual(updated.active, false);
  clearCatalogTestStorage();
});

test('valores do arquétipo respeitam o limite de 1 a 10', () => {
  clearCatalogTestStorage();
  const catalog = loadCatalog();
  const archetype = catalog.archetypes[0];
  const attribute = catalog.attributes[0];

  assertEqual(setArchetypeValue(archetype.id, attribute.id, 9), 9);
  assertEqual(loadCatalog().values[archetype.id][attribute.id], 9);
  assertEqual(setArchetypeValue(archetype.id, attribute.id, 0), null);
  assertEqual(setArchetypeValue(archetype.id, attribute.id, 11), null);

  const fullValues = Object.fromEntries(
    catalog.attributes.map((item) => [item.id, item.id === attribute.id ? 7 : 4])
  );
  assert(setArchetypeValues(archetype.id, fullValues));
  assertEqual(loadCatalog().values[archetype.id][attribute.id], 7);

  fullValues[attribute.id] = 11;
  assertEqual(setArchetypeValues(archetype.id, fullValues), null);
  assertEqual(loadCatalog().values[archetype.id][attribute.id], 7);
  clearCatalogTestStorage();
});

function clearCatalogTestStorage() {
  localStorage.removeItem(CATALOG_KEY);
  assertEqual(loadCatalog().archetypes.length, 3);
}

