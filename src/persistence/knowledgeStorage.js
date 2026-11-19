const KNOWLEDGE_KEY = 'normaliza:v3:knowledge';
const VERSION = 5;

export function loadKnowledgeCatalog() {
  const stored = readJson(KNOWLEDGE_KEY, null);

  if (
    !stored ||
    !Array.isArray(stored.areas) ||
    !Array.isArray(stored.nodes) ||
    stored.nodes.length === 0 ||
    stored.version !== VERSION
  ) {
    return seedKnowledge();
  }

  return {
    version: VERSION,
    areas: stored.areas,
    nodes: stored.nodes
  };
}

export function saveKnowledgeCatalog(catalog) {
  const payload = {
    version: VERSION,
    areas: Array.isArray(catalog?.areas) ? catalog.areas : [],
    nodes: Array.isArray(catalog?.nodes) ? catalog.nodes : []
  };
  writeJson(KNOWLEDGE_KEY, payload);
  return payload;
}

export function resetKnowledgeCatalog() {
  return seedKnowledge();
}

function seedKnowledge() {
  const areas = [
    {
      id: 'dados',
      name: 'Dados & Bancos',
      shortName: 'DADOS',
      description: 'Modelagem, SQL e administração de dados.',
      color: '#c4664f',
      order: 1,
      active: true
    },
    {
      id: 'programacao',
      name: 'Programação',
      shortName: 'PROGRAMAÇÃO',
      description: 'Lógica, aplicações e integração de sistemas.',
      color: '#4a84b0',
      order: 2,
      active: true
    },
    {
      id: 'unreal',
      name: 'Unreal Engine',
      shortName: 'UNREAL',
      description: 'Criação de jogos, sistemas e experiências interativas.',
      color: '#4d9b9f',
      order: 3,
      active: true
    }
  ];

  const nodes = [
    node('normaliza', null, 'NORMALIZA!', 'Quest de normalização de dados e construção da cidade.', 'N', 500, 560, {
      type: 'quest',
      questId: 'normaliza',
      parents: []
    }),
    node('sql-basico', 'dados', 'SQL Básico', 'Consultas simples, filtros e ordenação.', 'SQL', 260, 560, {
      type: 'attribute',
      attributeId: 'sql-basico',
      parents: ['normaliza']
    }),
    node('sql-avancado', 'dados', 'SQL Avançado', 'Joins, subconsultas e agregações.', 'SQL+', 180, 455, {
      type: 'attribute',
      attributeId: 'sql-avancado',
      parents: ['sql-basico']
    }),
    node('postgresql-admin', 'dados', 'PostgreSQL Admin', 'Administração, desempenho e segurança.', 'PG', 300, 355, {
      type: 'attribute',
      attributeId: 'postgresql-admin',
      parents: ['sql-avancado']
    }),
    node('modelagem', 'dados', 'Modelagem de Dados', 'Modelagem conceitual, lógica e relacional.', 'MD', 170, 255, {
      type: 'skill',
      parents: ['sql-avancado']
    }),
    node('logica', 'programacao', 'Lógica de Programação', 'Algoritmos, fluxo e resolução de problemas.', 'LG', 420, 500, {
      type: 'skill',
      parents: ['normaliza']
    }),
    node('desenvolvedor', 'programacao', 'Desenvolvedor', 'Construção de aplicações e integrações.', 'DEV', 560, 460, {
      type: 'attribute',
      attributeId: 'desenvolvedor',
      parents: ['logica']
    }),
    node('versionamento', 'programacao', 'Versionamento', 'Git, branches e colaboração.', 'GIT', 455, 360, {
      type: 'skill',
      parents: ['desenvolvedor']
    }),
    node('aplicacoes', 'programacao', 'Aplicações', 'Aplicações conectadas a dados reais.', 'APP', 650, 405, {
      type: 'quest',
      questId: 'desenvolvimento',
      parents: ['desenvolvedor']
    }),
    node('apis', 'programacao', 'APIs', 'Integrações, contratos e serviços.', 'API', 700, 300, {
      type: 'skill',
      parents: ['aplicacoes']
    }),
    node('blueprints', 'unreal', 'Blueprints', 'Lógica visual e prototipagem no Unreal.', 'BP', 780, 560, {
      type: 'skill',
      parents: ['normaliza']
    }),
    node('cpp', 'unreal', 'C++', 'Programação de sistemas e gameplay.', 'C++', 880, 465, {
      type: 'skill',
      parents: ['blueprints']
    }),
    node('level-design', 'unreal', 'Level Design', 'Espaços, fluxo e experiência do jogador.', 'LD', 790, 365, {
      type: 'skill',
      parents: ['cpp']
    }),
    node('otimizacao', 'unreal', 'Otimização', 'Desempenho, memória e qualidade.', 'OPT', 950, 320, {
      type: 'skill',
      parents: ['cpp']
    }),
    node('unreal', 'unreal', 'Experiências Interativas', 'Projetos completos e direção técnica.', 'UE', 850, 225, {
      type: 'skill',
      parents: ['level-design']
    })
  ];

  const catalog = { version: VERSION, areas, nodes };
  saveKnowledgeCatalog(catalog);
  return catalog;
}

function node(id, areaId, name, description, icon, x, y, options = {}) {
  return {
    id,
    areaId,
    name,
    description,
    icon,
    x,
    y,
    type: options.type ?? 'skill',
    attributeId: options.attributeId ?? null,
    questId: options.questId ?? null,
    parents: options.parents ?? [],
    active: true
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
