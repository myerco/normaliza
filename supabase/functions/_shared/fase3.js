export function createPhaseState(data) {
  return withScore(
    {
      phaseId: data.id,
      transitiveDependencyId: null,
      builtTables: [],
      tables: createEmptyTables(data),
      relationships: [],
      attempts: 0,
      failedValidations: 0,
      hintsUsed: 0,
      revealedHints: 0,
      completed: false,
      feedback: null
    },
    data
  );
}

export function selectTransitiveDependency(state, data, dependencyId) {
  if (!data.functionalDependencies.some((dependency) => dependency.id === dependencyId)) {
    return state;
  }

  return withScore({ ...state, transitiveDependencyId: dependencyId }, data);
}

export function buildTable(state, data, tableId) {
  if (!data.targetTables.some((table) => table.id === tableId) || state.builtTables.includes(tableId)) {
    return state;
  }

  return withScore({ ...state, builtTables: [...state.builtTables, tableId] }, data);
}

export function toggleMembership(state, data, tableId, attributeId) {
  if (!isBuilt(state, tableId) || !getAttribute(data, attributeId)) {
    return state;
  }

  const table = state.tables[tableId];
  const inTable = table.attributes.includes(attributeId);
  const attributes = inTable
    ? table.attributes.filter((id) => id !== attributeId)
    : sortAttributes(data, [...table.attributes, attributeId]);
  const primaryKey = inTable
    ? table.primaryKey.filter((id) => id !== attributeId)
    : table.primaryKey;
  const foreignKeys = inTable
    ? table.foreignKeys.filter((id) => id !== attributeId)
    : table.foreignKeys;
  const relationships = inTable
    ? state.relationships.filter(
        (relationship) =>
          !(
            (relationship.fromTable === tableId && relationship.fromAttribute === attributeId) ||
            (relationship.toTable === tableId && relationship.toAttribute === attributeId)
          )
      )
    : state.relationships;

  return withScore(
    {
      ...state,
      relationships,
      tables: {
        ...state.tables,
        [tableId]: { ...table, attributes, primaryKey, foreignKeys }
      }
    },
    data
  );
}

export function togglePrimaryKey(state, data, tableId, attributeId) {
  const table = state.tables[tableId];
  if (!isBuilt(state, tableId) || !table.attributes.includes(attributeId)) {
    return state;
  }

  const removing = table.primaryKey.includes(attributeId);
  const primaryKey = removing
    ? table.primaryKey.filter((id) => id !== attributeId)
    : sortAttributes(data, [...table.primaryKey, attributeId]);
  const relationships = removing
    ? state.relationships.filter(
        (relationship) =>
          !(relationship.toTable === tableId && relationship.toAttribute === attributeId)
      )
    : state.relationships;

  return withScore(
    {
      ...state,
      relationships,
      tables: {
        ...state.tables,
        [tableId]: { ...table, primaryKey }
      }
    },
    data
  );
}

export function toggleForeignKey(state, data, tableId, attributeId) {
  const table = state.tables[tableId];
  if (!isBuilt(state, tableId) || !table.attributes.includes(attributeId)) {
    return state;
  }

  const removing = table.foreignKeys.includes(attributeId);
  const foreignKeys = removing
    ? table.foreignKeys.filter((id) => id !== attributeId)
    : sortAttributes(data, [...table.foreignKeys, attributeId]);
  const relationships = removing
    ? state.relationships.filter(
        (relationship) =>
          !(relationship.fromTable === tableId && relationship.fromAttribute === attributeId)
      )
    : state.relationships;

  return withScore(
    {
      ...state,
      relationships,
      tables: {
        ...state.tables,
        [tableId]: { ...table, foreignKeys }
      }
    },
    data
  );
}

export function canAddRelationship(state, data, fromTable, fromAttribute, toTable, toAttribute) {
  const errors = [];

  if (!isBuilt(state, fromTable) || !isBuilt(state, toTable)) {
    errors.push('As duas tabelas precisam estar construídas.');
  }
  if (fromTable === toTable) {
    errors.push('O relacionamento deve ligar tabelas diferentes.');
  }

  const source = state.tables[fromTable];
  const target = state.tables[toTable];

  if (!source?.attributes.includes(fromAttribute)) {
    errors.push('O atributo de origem deve pertencer à tabela de origem.');
  }
  if (!source?.foreignKeys.includes(fromAttribute)) {
    errors.push('Marque o atributo de origem como chave estrangeira antes de criar o relacionamento.');
  }
  if (!target?.attributes.includes(toAttribute)) {
    errors.push('O atributo de destino deve pertencer à tabela de destino.');
  }
  if (!target?.primaryKey.includes(toAttribute)) {
    errors.push('O atributo de destino deve ser chave primária.');
  }

  const relationshipId = relationshipKey(fromTable, fromAttribute, toTable, toAttribute);
  if (state.relationships.some((relationship) => relationship.id === relationshipId)) {
    errors.push('Este relacionamento já existe.');
  }

  return { valid: errors.length === 0, errors };
}

export function addRelationship(state, data, fromTable, fromAttribute, toTable, toAttribute) {
  const validation = canAddRelationship(state, data, fromTable, fromAttribute, toTable, toAttribute);
  if (!validation.valid) {
    return state;
  }

  return withScore(
    {
      ...state,
      relationships: [
        ...state.relationships,
        {
          id: relationshipKey(fromTable, fromAttribute, toTable, toAttribute),
          fromTable,
          fromAttribute,
          toTable,
          toAttribute
        }
      ]
    },
    data
  );
}

export function removeRelationship(state, data, relationshipId) {
  const relationships = state.relationships.filter(
    (relationship) => relationship.id !== relationshipId
  );

  if (relationships.length === state.relationships.length) {
    return state;
  }

  return withScore({ ...state, relationships }, data);
}

export function validatePhase(state, data) {
  const errors = [];
  const transitive = state.transitiveDependencyId === data.transitiveDependencyId;

  if (!transitive) {
    const expected = data.functionalDependencies.find(
      (dependency) => dependency.id === data.transitiveDependencyId
    );
    errors.push({
      code: 'transitive',
      title: 'Dependência transitiva não identificada',
      message: `A dependência transitiva desta relação é ${expected?.label || 'a dependência entre Departamento e Localização'}.`
    });
  }

  const tableErrors = [];
  const pkErrors = [];
  const fkErrors = [];
  const missingTables = data.targetTables
    .filter((target) => !state.builtTables.includes(target.id))
    .map((target) => target.id);

  if (missingTables.length > 0) {
    tableErrors.push({
      code: 'tables-missing',
      title: 'Edifícios ainda não construídos',
      message: `Construa ${formatTableList(data, missingTables)} nos terrenos disponíveis.`
    });
  }

  for (const target of data.targetTables) {
    if (!state.builtTables.includes(target.id)) {
      continue;
    }

    const actual = state.tables[target.id]?.attributes ?? [];
    const missing = target.attributes.filter((attributeId) => !actual.includes(attributeId));
    const extra = actual.filter((attributeId) => !target.attributes.includes(attributeId));

    if (missing.length > 0) {
      tableErrors.push({
        code: 'table-missing',
        table: target.id,
        title: `${target.name} incompleta`,
        message: `${target.name} deve conter ${formatAttributeList(data, missing)}.`
      });
    }

    if (extra.length > 0) {
      tableErrors.push({
        code: 'table-extra',
        table: target.id,
        title: `${target.name} com atributos indevidos`,
        message: `${target.name} não deve conter ${formatAttributeList(data, extra)}.`
      });
    }

    const actualPk = state.tables[target.id]?.primaryKey ?? [];
    const missingPk = target.primaryKey.filter(
      (attributeId) => !actualPk.includes(attributeId) || !actual.includes(attributeId)
    );
    const extraPk = actualPk.filter(
      (attributeId) => !target.primaryKey.includes(attributeId) || !actual.includes(attributeId)
    );

    if (missingPk.length > 0) {
      pkErrors.push({
        code: 'pk-missing',
        table: target.id,
        title: `Chave primária de ${target.name}`,
        message: `Marque ${formatAttributeList(data, missingPk)} como chave primária de ${target.name}.`
      });
    }
    if (extraPk.length > 0) {
      pkErrors.push({
        code: 'pk-extra',
        table: target.id,
        title: `Chave primária de ${target.name}`,
        message: `${formatAttributeList(data, extraPk)} não deve(m) ser chave primária de ${target.name}.`
      });
    }

    const expectedFk = (target.foreignKeys || []).map((foreignKey) => foreignKey.attribute);
    const actualFk = state.tables[target.id]?.foreignKeys ?? [];
    const missingFk = expectedFk.filter(
      (attributeId) => !actualFk.includes(attributeId) || !actual.includes(attributeId)
    );
    const extraFk = actualFk.filter(
      (attributeId) => !expectedFk.includes(attributeId) || !actual.includes(attributeId)
    );

    if (missingFk.length > 0) {
      fkErrors.push({
        code: 'fk-missing',
        table: target.id,
        title: `Chave estrangeira de ${target.name}`,
        message: `Marque ${formatAttributeList(data, missingFk)} como chave estrangeira em ${target.name}.`
      });
    }
    if (extraFk.length > 0) {
      fkErrors.push({
        code: 'fk-extra',
        table: target.id,
        title: `Chave estrangeira de ${target.name}`,
        message: `${formatAttributeList(data, extraFk)} não deve(m) ser chave estrangeira em ${target.name}.`
      });
    }
  }

  errors.push(...tableErrors, ...pkErrors, ...fkErrors);

  const expectedRelationships = data.relationships || [];
  const relationshipErrors = [];

  for (const expected of expectedRelationships) {
    const exists = state.relationships.some((relationship) =>
      sameRelationship(relationship, expected)
    );

    if (!exists) {
      relationshipErrors.push({
        code: 'relationship-missing',
        title: 'Relacionamento ausente',
        message: `Crie a estrada entre ${formatRelationship(data, expected)}.`
      });
    }
  }

  for (const relationship of state.relationships) {
    const declared = expectedRelationships.some((expected) =>
      sameRelationship(relationship, expected)
    );

    if (!declared) {
      relationshipErrors.push({
        code: 'relationship-extra',
        title: 'Relacionamento não declarado',
        message: `O relacionamento ${formatRelationship(data, relationship)} não faz parte da decomposição esperada.`
      });
    }

    const source = state.tables[relationship.fromTable];
    const target = state.tables[relationship.toTable];

    if (!source?.foreignKeys.includes(relationship.fromAttribute)) {
      relationshipErrors.push({
        code: 'relationship-fk',
        title: 'Relacionamento sem FK',
        message: 'O lado de origem do relacionamento deve ser uma chave estrangeira.'
      });
    }
    if (!target?.primaryKey.includes(relationship.toAttribute)) {
      relationshipErrors.push({
        code: 'relationship-pk',
        title: 'Relacionamento sem PK',
        message: 'O lado de destino do relacionamento deve ser uma chave primária.'
      });
    }
  }

  errors.push(...relationshipErrors);

  const lossless = isLosslessJoin(state, data);
  if (!lossless) {
    errors.push({
      code: 'lossless',
      title: 'Decomposição com perda de junção',
      message:
        'A decomposição deve preservar a informação. O atributo comum Departamento precisa ser chave de DEPARTAMENTO.'
    });
  }

  const preserved = isDependencyPreserved(state, data);
  if (!preserved) {
    errors.push({
      code: 'preserved',
      title: 'Dependências não preservadas',
      message: 'As dependências declaradas devem continuar representadas nas novas tabelas.'
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    transitive,
    missingTables,
    tableErrors,
    pkErrors,
    fkErrors,
    relationshipErrors,
    lossless,
    preserved
  };
}

export function applyValidation(state, data, result) {
  const wasCompleted = state.completed;
  const next = {
    ...state,
    attempts: state.attempts + 1,
    failedValidations: state.failedValidations + (result.valid ? 0 : 1),
    completed: wasCompleted || result.valid,
    feedback: result.valid ? buildSuccessFeedback(data) : buildErrorFeedback(result)
  };

  return withScore(next, data);
}

export function useHint(state, data) {
  if (state.completed || state.revealedHints >= data.hints.length) {
    return state;
  }

  const index = state.revealedHints;

  return withScore(
    {
      ...state,
      revealedHints: index + 1,
      hintsUsed: state.hintsUsed + 1,
      feedback: {
        type: 'hint',
        title: `Dica ${index + 1}`,
        message: data.hints[index]
      }
    },
    data
  );
}

export function resetPhaseState(data) {
  return createPhaseState(data);
}

export function calculateScore(state, data) {
  const scoring = data.scoring;
  const transitivePoints =
    state.transitiveDependencyId === data.transitiveDependencyId
      ? scoring.pointsPerTransitive
      : 0;
  const tablePoints = state.builtTables.length * scoring.pointsPerTable;
  const membershipPoints = countCorrectMemberships(state, data) * scoring.pointsPerMembership;
  const primaryKeyPoints = countCorrectPrimaryKeys(state, data) * scoring.pointsPerPrimaryKey;
  const foreignKeyPoints = countCorrectForeignKeys(state, data) * scoring.pointsPerForeignKey;
  const relationshipPoints =
    countCorrectRelationships(state, data) * scoring.pointsPerRelationship;
  const completionBonus = state.completed ? scoring.completionBonus : 0;
  const penalties =
    state.failedValidations * scoring.wrongValidationPenalty +
    state.hintsUsed * scoring.hintPenalty;

  return Math.max(
    0,
    Math.min(
      scoring.max,
      transitivePoints +
        tablePoints +
        membershipPoints +
        primaryKeyPoints +
        foreignKeyPoints +
        relationshipPoints +
        completionBonus -
        penalties
    )
  );
}

export function countCorrectMemberships(state, data) {
  let count = 0;

  for (const target of data.targetTables) {
    const actual = state.tables[target.id]?.attributes ?? [];
    count += target.attributes.filter((attributeId) => actual.includes(attributeId)).length;
  }

  return count;
}

export function countCorrectPrimaryKeys(state, data) {
  let count = 0;

  for (const target of data.targetTables) {
    const table = state.tables[target.id];
    if (!table) {
      continue;
    }

    count += target.primaryKey.filter(
      (attributeId) =>
        table.attributes.includes(attributeId) && table.primaryKey.includes(attributeId)
    ).length;
  }

  return count;
}

export function countCorrectForeignKeys(state, data) {
  let count = 0;

  for (const target of data.targetTables) {
    const table = state.tables[target.id];
    if (!table) {
      continue;
    }

    const expected = (target.foreignKeys || []).map((foreignKey) => foreignKey.attribute);
    count += expected.filter(
      (attributeId) =>
        table.attributes.includes(attributeId) && table.foreignKeys.includes(attributeId)
    ).length;
  }

  return count;
}

export function countCorrectRelationships(state, data) {
  return (data.relationships || []).filter((expected) =>
    state.relationships.some((relationship) => sameRelationship(relationship, expected))
  ).length;
}

export function isLosslessJoin(state, data) {
  const first = state.tables.funcionario?.attributes ?? [];
  const second = state.tables.departamento?.attributes ?? [];

  if (first.length === 0 || second.length === 0) {
    return false;
  }

  const intersection = first.filter((attributeId) => second.includes(attributeId));
  if (intersection.length === 0) {
    return false;
  }

  const closure = attributeClosure(data, intersection);
  return (
    first.every((attributeId) => closure.has(attributeId)) ||
    second.every((attributeId) => closure.has(attributeId))
  );
}

export function isDependencyPreserved(state, data) {
  const tableAttributeSets = data.targetTables.map(
    (target) => new Set(state.tables[target.id]?.attributes ?? [])
  );

  return data.functionalDependencies.every((dependency) =>
    tableAttributeSets.some(
      (attributes) =>
        dependency.determinant.every((attributeId) => attributes.has(attributeId)) &&
        attributes.has(dependency.dependent)
    )
  );
}

export function toSnapshot(state) {
  return {
    phaseId: state.phaseId,
    transitiveDependencyId: state.transitiveDependencyId,
    builtTables: [...state.builtTables],
    tables: Object.fromEntries(
      Object.entries(state.tables).map(([tableId, table]) => [
        tableId,
        {
          attributes: [...table.attributes],
          primaryKey: [...table.primaryKey],
          foreignKeys: [...table.foreignKeys]
        }
      ])
    ),
    relationships: state.relationships.map((relationship) => ({
      id: relationship.id,
      fromTable: relationship.fromTable,
      fromAttribute: relationship.fromAttribute,
      toTable: relationship.toTable,
      toAttribute: relationship.toAttribute
    })),
    attempts: state.attempts,
    failedValidations: state.failedValidations,
    hintsUsed: state.hintsUsed,
    revealedHints: state.revealedHints,
    completed: state.completed,
    score: state.score
  };
}

export function hydratePhaseState(data, snapshot) {
  const base = createPhaseState(data);

  if (!snapshot || snapshot.phaseId !== data.id) {
    return base;
  }

  const transitiveDependencyId = data.functionalDependencies.some(
    (dependency) => dependency.id === snapshot.transitiveDependencyId
  )
    ? snapshot.transitiveDependencyId
    : null;
  const builtTables = Array.isArray(snapshot.builtTables)
    ? [...new Set(snapshot.builtTables)].filter((tableId) =>
        data.targetTables.some((table) => table.id === tableId)
      )
    : [];
  const tables = hydrateTables(data, snapshot.tables, builtTables);
  const relationships = hydrateRelationships(data, snapshot.relationships, tables, builtTables);
  const revealedHints = Math.min(
    toNonNegativeInteger(snapshot.revealedHints),
    data.hints.length
  );
  const hintsUsed = Math.max(toNonNegativeInteger(snapshot.hintsUsed), revealedHints);

  const candidate = withScore(
    {
      ...base,
      transitiveDependencyId,
      builtTables,
      tables,
      relationships,
      failedValidations: toNonNegativeInteger(snapshot.failedValidations),
      hintsUsed,
      revealedHints
    },
    data
  );

  const completed = snapshot.completed === true && validatePhase(candidate, data).valid;
  const hydrated = withScore(
    {
      ...candidate,
      completed,
      feedback: completed ? buildSuccessFeedback(data) : null
    },
    data
  );

  return hydrated;
}

function createEmptyTables(data) {
  return Object.fromEntries(
    data.targetTables.map((target) => [
      target.id,
      { attributes: [], primaryKey: [], foreignKeys: [] }
    ])
  );
}

function hydrateTables(data, tables, builtTables) {
  const hydrated = createEmptyTables(data);

  if (!tables || typeof tables !== 'object') {
    return hydrated;
  }

  for (const tableId of builtTables) {
    const source = tables[tableId];

    if (!source || typeof source !== 'object') {
      continue;
    }

    const attributes = Array.isArray(source.attributes)
      ? [...new Set(source.attributes)].filter((attributeId) => getAttribute(data, attributeId))
      : [];
    const primaryKey = Array.isArray(source.primaryKey)
      ? [...new Set(source.primaryKey)].filter((attributeId) => attributes.includes(attributeId))
      : [];
    const foreignKeys = Array.isArray(source.foreignKeys)
      ? [...new Set(source.foreignKeys)].filter((attributeId) => attributes.includes(attributeId))
      : [];

    hydrated[tableId] = {
      attributes: sortAttributes(data, attributes),
      primaryKey: sortAttributes(data, primaryKey),
      foreignKeys: sortAttributes(data, foreignKeys)
    };
  }

  return hydrated;
}

function hydrateRelationships(data, relationships, tables, builtTables) {
  if (!Array.isArray(relationships)) {
    return [];
  }

  const seen = new Set();
  const hydrated = [];

  for (const relationship of relationships) {
    if (!relationship || typeof relationship !== 'object') {
      continue;
    }

    const { fromTable, fromAttribute, toTable, toAttribute } = relationship;

    if (!builtTables.includes(fromTable) || !builtTables.includes(toTable)) {
      continue;
    }
    if (fromTable === toTable) {
      continue;
    }
    if (!tables[fromTable]?.attributes.includes(fromAttribute)) {
      continue;
    }
    if (!tables[toTable]?.attributes.includes(toAttribute)) {
      continue;
    }

    const id = relationshipKey(fromTable, fromAttribute, toTable, toAttribute);
    if (seen.has(id)) {
      continue;
    }

    seen.add(id);
    hydrated.push({ id, fromTable, fromAttribute, toTable, toAttribute });
  }

  return hydrated;
}

function buildSuccessFeedback(data) {
  return {
    type: 'success',
    title: 'Cidade organizada! 3FN alcançada.',
    message: 'A dependência transitiva foi eliminada e a decomposição preserva os dados.',
    concepts: [
      'CPF → Departamento e Departamento → Localização formam uma dependência transitiva.',
      'Localização depende de Departamento, não diretamente de CPF.',
      'A tabela DEPARTAMENTO concentra Departamento e Localização.',
      'FUNCIONÁRIO mantém CPF, Nome e a FK Departamento.',
      'A decomposição é sem perda de junção e preserva as dependências funcionais.'
    ]
  };
}

function buildErrorFeedback(result) {
  return {
    type: 'error',
    title: 'A cidade ainda não está organizada em 3FN',
    message: 'Revise a dependência transitiva, as tabelas, as chaves e os relacionamentos.',
    errors: result.errors,
    concept:
      'Em 3FN, para toda DF não trivial X → A, X deve ser superchave ou A deve ser atributo primo. Localização depende transitivamente de CPF via Departamento.'
  };
}

function withScore(state, data) {
  return { ...state, score: calculateScore(state, data) };
}

function isBuilt(state, tableId) {
  return state.builtTables.includes(tableId);
}

function getAttribute(data, attributeId) {
  return data.attributes.find((attribute) => attribute.id === attributeId) ?? null;
}

function getAttributeLabel(data, attributeId) {
  return getAttribute(data, attributeId)?.label ?? attributeId;
}

function getTableName(data, tableId) {
  return data.targetTables.find((table) => table.id === tableId)?.name ?? tableId;
}

function sortAttributes(data, attributes) {
  const order = new Map(data.attributes.map((attribute, index) => [attribute.id, index]));
  return [...attributes].sort(
    (first, second) =>
      (order.get(first) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(second) ?? Number.MAX_SAFE_INTEGER)
  );
}

function relationshipKey(fromTable, fromAttribute, toTable, toAttribute) {
  return `${fromTable}.${fromAttribute}->${toTable}.${toAttribute}`;
}

function sameRelationship(first, second) {
  return (
    first.fromTable === second.fromTable &&
    first.fromAttribute === second.fromAttribute &&
    first.toTable === second.toTable &&
    first.toAttribute === second.toAttribute
  );
}

function formatAttributeList(data, attributes) {
  return attributes.map((attributeId) => getAttributeLabel(data, attributeId)).join(', ');
}

function formatTableList(data, tables) {
  return tables.map((tableId) => getTableName(data, tableId)).join(' e ');
}

function formatRelationship(data, relationship) {
  return `${getTableName(data, relationship.fromTable)}.${getAttributeLabel(data, relationship.fromAttribute)} → ${getTableName(data, relationship.toTable)}.${getAttributeLabel(data, relationship.toAttribute)}`;
}

function attributeClosure(data, startAttributes) {
  const closure = new Set(startAttributes);
  let changed = true;

  while (changed) {
    changed = false;

    for (const dependency of data.functionalDependencies) {
      if (dependency.determinant.every((attributeId) => closure.has(attributeId))) {
        if (!closure.has(dependency.dependent)) {
          closure.add(dependency.dependent);
          changed = true;
        }
      }
    }
  }

  return closure;
}

function toNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}
