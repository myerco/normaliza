export const ARCHETYPES = Object.freeze([
  {
    id: 'engenheiro',
    label: 'Engenheiro',
    description: 'Especialização em desenvolvimento, implementação e construção de soluções.',
    color: '#2a9d8f',
    mark: 'E'
  },
  {
    id: 'arquiteto',
    label: 'Arquiteto',
    description: 'Especialização em estruturação, modelagem e organização de soluções.',
    color: '#e76f51',
    mark: 'A'
  },
  {
    id: 'analista',
    label: 'Analista',
    description: 'Especialização em análise, investigação e compreensão de dados.',
    color: '#457b9d',
    mark: 'A'
  }
]);

const ARCHETYPES_BY_ID = new Map(ARCHETYPES.map((archetype) => [archetype.id, archetype]));

export function getArchetype(archetypeId) {
  return ARCHETYPES_BY_ID.get(archetypeId) ?? ARCHETYPES[0];
}

export function isValidArchetype(archetypeId) {
  return ARCHETYPES_BY_ID.has(archetypeId);
}

export function archetypeForAvatar(avatarId) {
  const mapped = {
    construtor: 'engenheiro',
    arquiteto: 'arquiteto',
    engenheiro: 'engenheiro',
    analista: 'analista',
    cientista: 'analista'
  };

  return mapped[avatarId] ?? 'engenheiro';
}
