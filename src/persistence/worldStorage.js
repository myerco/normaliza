export const WORLD_CATALOG_KEY = 'normaliza:v4:world';
const WORLD_VERSION = 1;

export function loadWorldCatalog() {
  const stored = readJson(WORLD_CATALOG_KEY, null);

  if (!isWorldCatalog(stored)) {
    return seedWorldCatalog();
  }

  return normalizeWorldCatalog(stored);
}

export function saveWorldCatalog(catalog) {
  const normalized = normalizeWorldCatalog(catalog);
  writeJson(WORLD_CATALOG_KEY, normalized);
  return normalized;
}

export function resetWorldCatalog() {
  return seedWorldCatalog();
}

export function normalizeWorldCatalog(catalog) {
  return {
    version: WORLD_VERSION,
    territories: array(catalog?.territories),
    tracks: array(catalog?.tracks),
    skills: array(catalog?.skills),
    professions: array(catalog?.professions),
    trackTerritories: array(catalog?.trackTerritories),
    trackQuests: array(catalog?.trackQuests),
    trackSkills: array(catalog?.trackSkills),
    questSkills: array(catalog?.questSkills),
    professionSkills: array(catalog?.professionSkills),
    trackPrerequisites: array(catalog?.trackPrerequisites)
  };
}

function isWorldCatalog(catalog) {
  return Boolean(
    catalog &&
      catalog.version === WORLD_VERSION &&
      Array.isArray(catalog.territories) &&
      catalog.territories.length > 0 &&
      Array.isArray(catalog.tracks) &&
      catalog.tracks.length > 0 &&
      Array.isArray(catalog.skills) &&
      catalog.skills.length > 0
  );
}

function seedWorldCatalog() {
  const territories = [
    territory('jogos', 'Desenvolvimento de Jogos', 'JOGOS', 'Criação de jogos digitais, narrativa, arte e programação de gameplay.', '#4d9b9f', 'JG', 17, 26, 1, {
      description: 'Um território de oficinas, estúdios e mundos interativos.'
    }),
    territory('computacao', 'Computação e Engenharia de Software', 'COMPUTAÇÃO', 'Fundamentos da computação, algoritmos, programação e arquitetura de sistemas.', '#4a84b0', 'CP', 45, 15, 2, {
      description: 'Laboratórios de lógica, software e sistemas que sustentam a jornada.'
    }),
    territory('dados', 'Dados e Banco de Dados', 'DADOS', 'Modelagem, SQL, administração, engenharia e ciência de dados.', '#c4664f', 'DB', 34, 57, 3, {
      description: 'Bibliotecas de dados, arquivos e cidades organizadas por relações.'
    }),
    territory('soberania', 'Soberania Digital', 'SOBERANIA', 'Autonomia tecnológica, software livre, governança e infraestrutura pública.', '#c9a227', 'SD', 70, 63, 4, {
      description: 'Uma região de conselhos, tecnologias públicas e autonomia digital.'
    }),
    territory('infraestrutura', 'Sistemas e Infraestrutura Digital', 'INFRA', 'Sistemas operacionais, redes, containers, nuvem, DevOps e segurança.', '#7a6fb0', 'SI', 79, 29, 5, {
      description: 'Uma fronteira em expansão de servidores, redes e plataformas.',
      frontier: true
    })
  ];

  const skills = [
    skill('sql-basico', 'SQL Básico', 'dados', 'SQL', 1),
    skill('sql-avancado', 'SQL Avançado', 'dados', 'SQL+', 2),
    skill('postgresql-admin', 'Administração PostgreSQL', 'dados', 'PG', 3),
    skill('desenvolvedor', 'Desenvolvimento de Software', 'computacao', 'DEV', 4),
    skill('modelagem-dados', 'Modelagem de Dados', 'dados', 'MD', 5),
    skill('normalizacao', 'Normalização de Banco de Dados', 'dados', 'NF', 6),
    skill('administracao-banco', 'Administração de Banco de Dados', 'dados', 'DBA', 7),
    skill('oracle', 'Oracle', 'dados', 'ORA', 8),
    skill('engenharia-dados', 'Engenharia de Dados', 'dados', 'ED', 9),
    skill('ciencia-dados', 'Ciência de Dados', 'dados', 'CD', 10),
    skill('analise-dados', 'Análise de Dados', 'dados', 'AD', 11),
    skill('data-warehouse', 'Data Warehouse e BI', 'dados', 'DW', 12),
    skill('logica-programacao', 'Lógica de Programação', 'computacao', 'LG', 13),
    skill('programacao', 'Programação', 'computacao', 'PRG', 14),
    skill('poo', 'Programação Orientada a Objetos', 'computacao', 'POO', 15),
    skill('engenharia-software', 'Engenharia de Software', 'computacao', 'ES', 16),
    skill('arquitetura-sistemas', 'Arquitetura de Sistemas', 'computacao', 'ARQ', 17),
    skill('versionamento', 'Versionamento', 'computacao', 'GIT', 18),
    skill('apis', 'APIs e Integrações', 'computacao', 'API', 19),
    skill('computacao-grafica', 'Computação Gráfica', 'computacao', 'CG', 20),
    skill('fundamentos-jogos', 'Fundamentos de Jogos', 'jogos', 'FJ', 21),
    skill('game-design', 'Game Design', 'jogos', 'GD', 22),
    skill('roteirizacao', 'Roteirização de Jogos', 'jogos', 'RT', 23),
    skill('narrativa', 'Narrativa e Construção de Mundos', 'jogos', 'NW', 24),
    skill('unreal-engine', 'Unreal Engine', 'jogos', 'UE', 25),
    skill('blueprints', 'Blueprints', 'jogos', 'BP', 26),
    skill('cpp', 'Programação C++', 'jogos', 'C++', 27),
    skill('level-design', 'Level Design', 'jogos', 'LD', 28),
    skill('otimizacao', 'Otimização', 'jogos', 'OPT', 29),
    skill('soberania-digital', 'Soberania Digital', 'soberania', 'SD', 30),
    skill('software-livre', 'Software Livre e Código Aberto', 'soberania', 'OSS', 31),
    skill('governanca-digital', 'Governança Digital', 'soberania', 'GOV', 32),
    skill('infraestrutura-digital', 'Infraestrutura Digital', 'soberania', 'ID', 33),
    skill('tecnologias-publicas', 'Tecnologias Públicas', 'soberania', 'TP', 34),
    skill('sistemas-operacionais', 'Sistemas Operacionais', 'infraestrutura', 'SO', 35),
    skill('linux', 'Linux', 'infraestrutura', 'LX', 36),
    skill('redes', 'Redes de Computadores', 'infraestrutura', 'NET', 37),
    skill('virtualizacao', 'Virtualização', 'infraestrutura', 'VM', 38),
    skill('docker', 'Docker', 'infraestrutura', 'DKR', 39),
    skill('kubernetes', 'Kubernetes', 'infraestrutura', 'K8S', 40),
    skill('devops', 'DevOps', 'infraestrutura', 'OPS', 41),
    skill('cloud', 'Computação em Nuvem', 'infraestrutura', 'CLD', 42),
    skill('seguranca', 'Segurança da Informação', 'infraestrutura', 'SEC', 43),
    skill('fundamentos-computacao', 'Fundamentos da Computação', 'computacao', 'FC', 44)
  ];

  const trackDefinitions = [
    trackSeed('fundamentos-jogos', 'Fundamentos de Jogos Digitais', 'jogos', ['fundamentos-jogos', 'game-design']),
    trackSeed('game-design', 'Game Design', 'jogos', ['game-design', 'roteirizacao', 'narrativa']),
    trackSeed('roteirizacao-jogos', 'Roteirização de Jogos', 'jogos', ['roteirizacao', 'narrativa']),
    trackSeed('narrativa-mundos', 'Narrativa e Construção de Mundos', 'jogos', ['narrativa', 'roteirizacao']),
    trackSeed('unreal-engine', 'Unreal Engine', 'jogos', ['unreal-engine', 'blueprints', 'cpp']),
    trackSeed('programacao-jogos', 'Programação de Jogos', 'jogos', ['programacao', 'logica-programacao', 'cpp'], {
      questIds: ['desenvolvimento']
    }),
    trackSeed('cpp-jogos', 'Programação C++', 'jogos', ['cpp', 'programacao']),
    trackSeed('blueprints', 'Blueprints', 'jogos', ['blueprints', 'unreal-engine']),
    trackSeed('modelagem-animacao', 'Modelagem e Animação', 'jogos', ['computacao-grafica', 'level-design']),
    trackSeed('computacao-grafica-jogos', 'Computação Gráfica aplicada a Jogos', 'jogos', ['computacao-grafica']),

    trackSeed('fundamentos-computacao', 'Fundamentos da Computação', 'computacao', ['fundamentos-computacao', 'logica-programacao']),
    trackSeed('logica-programacao', 'Lógica de Programação', 'computacao', ['logica-programacao', 'programacao']),
    trackSeed('algoritmos-estruturas', 'Algoritmos e Estruturas de Dados', 'computacao', ['logica-programacao', 'programacao']),
    trackSeed('programacao', 'Programação', 'computacao', ['programacao', 'poo', 'versionamento']),
    trackSeed('poo', 'Programação Orientada a Objetos', 'computacao', ['poo', 'programacao', 'engenharia-software']),
    trackSeed('engenharia-software', 'Engenharia de Software', 'computacao', ['engenharia-software', 'arquitetura-sistemas', 'versionamento', 'apis'], {
      questIds: ['desenvolvimento']
    }),
    trackSeed('arquitetura-sistemas', 'Arquitetura de Sistemas', 'computacao', ['arquitetura-sistemas', 'engenharia-software']),
    trackSeed('computacao-grafica', 'Computação Gráfica', 'computacao', ['computacao-grafica'], {
      territoryIds: ['computacao', 'jogos']
    }),

    trackSeed('fundamentos-banco', 'Fundamentos de Banco de Dados', 'dados', ['modelagem-dados', 'sql-basico']),
    trackSeed('modelagem-dados', 'Modelagem de Dados', 'dados', ['modelagem-dados', 'normalizacao'], {
      questIds: ['normaliza']
    }),
    trackSeed('modelagem-normalizacao', 'Modelagem e Normalização de Banco de Dados', 'dados', ['modelagem-dados', 'normalizacao'], {
      questIds: ['normaliza'],
      description: 'Trilha principal da Quest 01, dedicada à modelagem relacional e às formas normais.'
    }),
    trackSeed('sql', 'SQL', 'dados', ['sql-basico', 'sql-avancado'], {
      questIds: ['sql'],
      prerequisites: ['modelagem-normalizacao']
    }),
    trackSeed('desenvolvimento-banco', 'Desenvolvimento com Banco de Dados', 'dados', ['sql-avancado', 'apis', 'desenvolvedor']),
    trackSeed('administracao-banco', 'Administração de Banco de Dados', 'dados', ['administracao-banco', 'postgresql-admin'], {
      questIds: ['postgresql-admin'],
      prerequisites: ['sql']
    }),
    trackSeed('postgresql', 'PostgreSQL', 'dados', ['postgresql-admin', 'administracao-banco'], {
      prerequisites: ['administracao-banco']
    }),
    trackSeed('oracle', 'Oracle', 'dados', ['oracle', 'administracao-banco']),
    trackSeed('engenharia-dados', 'Engenharia de Dados', 'dados', ['engenharia-dados', 'modelagem-dados', 'sql-avancado']),
    trackSeed('ciencia-dados', 'Ciência de Dados', 'dados', ['ciencia-dados', 'analise-dados', 'sql-avancado']),
    trackSeed('analise-dados', 'Análise de Dados', 'dados', ['analise-dados', 'sql-avancado']),
    trackSeed('data-warehouse-bi', 'Data Warehouse e Business Intelligence', 'dados', ['data-warehouse', 'analise-dados', 'modelagem-dados']),

    trackSeed('fundamentos-soberania', 'Fundamentos da Soberania Digital', 'soberania', ['soberania-digital', 'infraestrutura-digital']),
    trackSeed('software-livre', 'Software Livre e Código Aberto', 'soberania', ['software-livre', 'tecnologias-publicas']),
    trackSeed('infraestrutura-digital', 'Infraestrutura Digital', 'soberania', ['infraestrutura-digital', 'redes']),
    trackSeed('soberania-dados', 'Soberania dos Dados', 'soberania', ['soberania-digital', 'governanca-digital']),
    trackSeed('dependencia-tecnologica', 'Dependência Tecnológica', 'soberania', ['soberania-digital', 'software-livre']),
    trackSeed('governanca-digital', 'Governança Digital', 'soberania', ['governanca-digital', 'tecnologias-publicas']),
    trackSeed('seguranca-autonomia', 'Segurança e Autonomia Tecnológica', 'soberania', ['seguranca', 'infraestrutura-digital']),
    trackSeed('tecnologias-publicas', 'Tecnologias Públicas', 'soberania', ['tecnologias-publicas', 'software-livre']),

    trackSeed('sistemas-operacionais', 'Sistemas Operacionais', 'infraestrutura', ['sistemas-operacionais', 'linux']),
    trackSeed('linux', 'Linux', 'infraestrutura', ['linux', 'sistemas-operacionais']),
    trackSeed('redes', 'Redes de Computadores', 'infraestrutura', ['redes', 'seguranca']),
    trackSeed('administracao-sistemas', 'Administração de Sistemas', 'infraestrutura', ['sistemas-operacionais', 'linux', 'redes']),
    trackSeed('virtualizacao', 'Virtualização', 'infraestrutura', ['virtualizacao', 'sistemas-operacionais']),
    trackSeed('docker', 'Docker', 'infraestrutura', ['docker', 'linux']),
    trackSeed('kubernetes', 'Kubernetes', 'infraestrutura', ['kubernetes', 'docker']),
    trackSeed('devops', 'DevOps', 'infraestrutura', ['devops', 'docker', 'kubernetes', 'cloud']),
    trackSeed('cloud', 'Computação em Nuvem', 'infraestrutura', ['cloud', 'kubernetes', 'redes']),
    trackSeed('seguranca-informacao', 'Segurança da Informação', 'infraestrutura', ['seguranca', 'redes', 'linux'])
  ];

  const professions = [
    profession('desenvolvedor-jogos', 'Desenvolvedor de Jogos', 'Combina programação, engine, arte técnica e design para criar jogos.', {
      'unreal-engine': [2, 5],
      cpp: [2, 5],
      'computacao-grafica': [1, 4],
      'game-design': [1, 4],
      roteirizacao: [1, 3]
    }),
    profession('game-designer', 'Game Designer', 'Projeta sistemas, narrativas e experiências de jogo.', {
      'game-design': [2, 5],
      roteirizacao: [1, 4],
      narrativa: [1, 4],
      'fundamentos-jogos': [1, 3],
      'computacao-grafica': [0.5, 3]
    }),
    profession('programador-unreal', 'Programador Unreal Engine', 'Implementa gameplay, sistemas e ferramentas na Unreal Engine.', {
      'unreal-engine': [2, 5],
      cpp: [2, 5],
      blueprints: [1, 4],
      'computacao-grafica': [1, 3]
    }),
    profession('desenvolvedor-software', 'Desenvolvedor de Software', 'Constrói aplicações, serviços e soluções de software.', {
      'logica-programacao': [1, 4],
      programacao: [2, 5],
      poo: [1, 4],
      'engenharia-software': [1, 4],
      'arquitetura-sistemas': [1, 3],
      versionamento: [0.5, 3]
    }),
    profession('engenheiro-dados', 'Engenheiro de Dados', 'Projeta pipelines, modelos e plataformas de dados.', {
      'modelagem-dados': [2, 5],
      'sql-avancado': [2, 5],
      'engenharia-dados': [2, 4],
      'ciencia-dados': [1, 3],
      'analise-dados': [1, 3]
    }),
    profession('dba', 'Administrador de Banco de Dados', 'Administra, otimiza e protege bancos de dados relacionais.', {
      'modelagem-dados': [1, 4],
      'sql-avancado': [2, 5],
      'administracao-banco': [2, 5],
      'postgresql-admin': [2, 5],
      oracle: [1, 3]
    }),
    profession('cientista-dados', 'Cientista de Dados', 'Investiga dados, constrói modelos e gera conhecimento.', {
      'ciencia-dados': [2, 5],
      'analise-dados': [2, 4],
      'sql-avancado': [1, 4],
      'modelagem-dados': [1, 4],
      'engenharia-dados': [1, 3]
    }),
    profession('arquiteto-dados', 'Arquiteto de Dados', 'Define a estrutura e a governança dos dados na organização.', {
      'modelagem-dados': [2, 5],
      'engenharia-dados': [2, 4],
      'data-warehouse': [2, 4],
      'sql-avancado': [1, 4],
      'arquitetura-sistemas': [1, 3]
    }),
    profession('devops', 'Engenheiro DevOps', 'Automatiza entrega, operação e infraestrutura como código.', {
      linux: [2, 5],
      docker: [2, 5],
      kubernetes: [2, 4],
      cloud: [1, 4],
      devops: [2, 5],
      seguranca: [1, 3]
    }),
    profession('cloud', 'Especialista em Cloud', 'Projeta e opera plataformas em nuvem.', {
      cloud: [2, 5],
      kubernetes: [2, 4],
      docker: [1, 4],
      redes: [1, 4],
      seguranca: [1, 3]
    }),
    profession('soberania-digital', 'Especialista em Soberania Digital', 'Promove autonomia tecnológica, software livre e governança digital.', {
      'soberania-digital': [2, 5],
      'software-livre': [2, 4],
      'governanca-digital': [2, 4],
      'infraestrutura-digital': [1, 4],
      'tecnologias-publicas': [1, 3]
    }),
    profession('seguranca', 'Analista de Segurança da Informação', 'Protege sistemas, redes e dados contra ameaças.', {
      seguranca: [2, 5],
      redes: [2, 4],
      linux: [1, 4],
      cloud: [1, 3],
      docker: [1, 3]
    })
  ];

  const trackTerritories = [];
  const trackQuests = [];
  const trackSkills = [];
  const trackPrerequisites = [];

  for (const definition of trackDefinitions) {
    for (const [index, territoryId] of definition.territoryIds.entries()) {
      trackTerritories.push({
        territoryId,
        trackId: definition.id,
        order: nextTerritoryOrder(trackTerritories, territoryId),
        mapX: 50 + index * 8,
        mapY: 50
      });
    }

    for (const [index, questId] of (definition.questIds ?? []).entries()) {
      trackQuests.push({
        trackId: definition.id,
        questId,
        order: index + 1,
        required: true
      });
    }

    for (const skillId of definition.skillIds ?? []) {
      trackSkills.push({
        trackId: definition.id,
        skillId,
        targetLevel: 4,
        weight: 1
      });
    }

    for (const prerequisiteTrackId of definition.prerequisites ?? []) {
      trackPrerequisites.push({
        trackId: definition.id,
        prerequisiteTrackId
      });
    }
  }

  const questSkills = [
    { questId: 'normaliza', skillId: 'modelagem-dados', levelDelta: 1 },
    { questId: 'normaliza', skillId: 'normalizacao', levelDelta: 1 },
    { questId: 'normaliza', skillId: 'sql-basico', levelDelta: 1 },
    { questId: 'sql', skillId: 'sql-basico', levelDelta: 1 },
    { questId: 'sql', skillId: 'sql-avancado', levelDelta: 1 },
    { questId: 'postgresql-admin', skillId: 'postgresql-admin', levelDelta: 1 },
    { questId: 'postgresql-admin', skillId: 'administracao-banco', levelDelta: 1 },
    { questId: 'desenvolvimento', skillId: 'programacao', levelDelta: 1 },
    { questId: 'desenvolvimento', skillId: 'apis', levelDelta: 1 },
    { questId: 'desenvolvimento', skillId: 'desenvolvedor', levelDelta: 1 }
  ];

  return saveWorldCatalog({
    version: WORLD_VERSION,
    territories,
    tracks: trackDefinitions.map(({ territoryIds, questIds, skillIds, prerequisites, ...track }) => track),
    skills,
    professions: professions.map(({ skillWeights, ...professionRecord }) => professionRecord),
    trackTerritories,
    trackQuests,
    trackSkills,
    questSkills,
    professionSkills: professions.flatMap((item) =>
      Object.entries(item.skillWeights ?? {}).map(([skillId, [weight, targetLevel]]) => ({
        professionId: item.id,
        skillId,
        weight,
        targetLevel
      }))
    ),
    trackPrerequisites
  });
}

function territory(id, name, shortName, description, color, icon, mapX, mapY, order, options = {}) {
  return {
    id,
    slug: id,
    name,
    shortName,
    description,
    color,
    icon,
    mapX,
    mapY,
    order,
    status: 'published',
    publishedAt: null,
    frontier: Boolean(options.frontier)
  };
}

function trackSeed(id, name, territoryId, skillIds, options = {}) {
  return {
    id,
    slug: id,
    name,
    description: options.description ?? `Trilha de ${name}.`,
    objective: options.objective ?? `Desenvolver competências em ${name}.`,
    order: options.order ?? 1,
    status: 'published',
    territoryIds: options.territoryIds ?? [territoryId],
    skillIds,
    questIds: options.questIds ?? [],
    prerequisites: options.prerequisites ?? []
  };
}

function skill(id, name, categoryId, icon, order) {
  return {
    id,
    slug: id,
    name,
    description: `${name}: competência prática da jornada.`,
    categoryId,
    icon,
    maxLevel: 10,
    order,
    status: 'published'
  };
}

function profession(id, name, description, skillWeights) {
  return {
    id,
    slug: id,
    name,
    description,
    skillWeights,
    suggestionThreshold: 60,
    minimumSkills: 2,
    status: 'published'
  };
}

function nextTerritoryOrder(links, territoryId) {
  return links.filter((link) => link.territoryId === territoryId).length + 1;
}

function array(value) {
  return Array.isArray(value) ? value : [];
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
