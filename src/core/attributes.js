export const ATTRIBUTE_VALUE_MIN = 1;
export const ATTRIBUTE_VALUE_MAX = 10;

export const ATTRIBUTE_CATEGORIES = Object.freeze([
  { id: 'sql', label: 'Linguagem SQL' },
  { id: 'banco', label: 'Administração de banco' },
  { id: 'desenvolvimento', label: 'Desenvolvimento' }
]);

export const DEFAULT_ATTRIBUTES = Object.freeze([
  {
    id: 'sql-basico',
    slug: 'sql-basico',
    name: 'SQL Básico',
    description: 'Consultas simples, filtros e ordenação.',
    categoryId: 'sql',
    icon: 'SQL',
    color: '#2a9d8f',
    active: true
  },
  {
    id: 'sql-avancado',
    slug: 'sql-avancado',
    name: 'SQL Avançado',
    description: 'Joins, subconsultas e agregações.',
    categoryId: 'sql',
    icon: 'SQL+',
    color: '#457b9d',
    active: true
  },
  {
    id: 'postgresql-admin',
    slug: 'postgresql-admin',
    name: 'PostgreSQL Admin',
    description: 'Administração, desempenho e segurança.',
    categoryId: 'banco',
    icon: 'PG',
    color: '#9b5de5',
    active: true
  },
  {
    id: 'desenvolvedor',
    slug: 'desenvolvedor',
    name: 'Desenvolvedor',
    description: 'Construção de aplicações e integrações.',
    categoryId: 'desenvolvimento',
    icon: 'DEV',
    color: '#e9c46a',
    active: true
  }
]);

export const DEFAULT_ARCHETYPE_VALUES = Object.freeze({
  engenheiro: {
    'sql-basico': 5,
    'sql-avancado': 6,
    'postgresql-admin': 4,
    desenvolvedor: 8
  },
  arquiteto: {
    'sql-basico': 6,
    'sql-avancado': 7,
    'postgresql-admin': 6,
    desenvolvedor: 5
  },
  analista: {
    'sql-basico': 5,
    'sql-avancado': 8,
    'postgresql-admin': 10,
    desenvolvedor: 2
  }
});

export function getAttributeCategory(categoryId) {
  return (
    ATTRIBUTE_CATEGORIES.find((category) => category.id === categoryId) ??
    ATTRIBUTE_CATEGORIES[0]
  );
}

export function validateAttributeValue(value, fallback = ATTRIBUTE_VALUE_MIN) {
  const numeric = Number(value);

  if (!Number.isInteger(numeric) || numeric < ATTRIBUTE_VALUE_MIN || numeric > ATTRIBUTE_VALUE_MAX) {
    return fallback;
  }

  return numeric;
}

export function validateCatalogValue(value) {
  return Number.isInteger(value) && value >= ATTRIBUTE_VALUE_MIN && value <= ATTRIBUTE_VALUE_MAX;
}

export function normalizeAttributeSlug(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
