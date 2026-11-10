const DEPENDENCY_ARROW = '->';

export function createPhaseState(data) {
  return withScore(
    {
      phaseId: data.id,
      dependencies: [],
      tables: createEmptyTables(data),
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

export function canAddDependency(state, data, determinant, dependent, type) {
  const errors = [];
  const determinantIds = Array.isArray(determinant) ? [...new Set(determinant)] : [];

  if (determinantIds.length === 0) {
    errors.push('Selecione pelo menos um atributo determinante.');
  }

  if (determinantIds.some((attributeId) => !getAttribute(data, attributeId))) {
    errors.push('Há um atributo determinante inválido.');
  }

  const dependentAttribute = getAttribute(data, dependent);
  if (!dependentAttribute) {
    errors.push('Selecione um atributo dependente válido.');
  }

  if (dependentAttribute && determinantIds.includes(dependent)) {
    errors.push('O atributo dependente não pode fazer parte do determinante.');
  }

  if (type !== 'total' && type !== 'partial') {
    errors.push('Escolha se a dependência é total ou parcial.');
  }

  if (
    determinantIds.length > 0 &&
    dependentAttribute &&
    !determinantIds.includes(dependent) &&
    state.dependencies.some((dependency) =>
      sameDependency(dependency, { determinant: determinantIds, dependent })
    )
  ) {
    errors.push('Esta conexão já existe. Remova-a antes de criar outra.');
  }

  return { valid: errors.length === 0, errors };
}

export function addDependency(state, data, determinant, dependent, type) {
  const validation = canAddDependency(state, data, determinant, dependent, type);
  if (!validation.valid) {
    return state;
  }

  const normalizedDeterminant = normalizeDeterminant(data, determinant);
  const dependency = {
    id: dependencyKey(normalizedDeterminant, dependent),
    determinant: normalizedDeterminant,
    dependent,
    type
  };

  return withScore(
    {
      ...state,
      dependencies: [...state.dependencies, dependency]
    },
    data
  );
}

export function removeDependency(state, data, dependencyId) {
  const dependencies = state.dependencies.filter((dependency) => dependency.id !== dependencyId);

  if (dependencies.length === state.dependencies.length) {
    return state;
  }

  return withScore({ ...state, dependencies }, data);
}

export function toggleMembership(state, data, tableId, attributeId) {
  if (!getAttribute(data, attributeId) || !state.tables[tableId]) {
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

  return withScore(
    {
      ...state,
      tables: {
        ...state.tables,
        [tableId]: { attributes, primaryKey }
      }
    },
    data
  );
}

export function togglePrimaryKey(state, data, tableId, attributeId) {
  const table = state.tables[tableId];
  if (!table || !table.attributes.includes(attributeId)) {
    return state;
  }

  const primaryKey = table.primaryKey.includes(attributeId)
    ? table.primaryKey.filter((id) => id !== attributeId)
    : sortAttributes(data, [...table.primaryKey, attributeId]);

  return withScore(
    {
      ...state,
      tables: {
        ...state.tables,
        [tableId]: { ...table, primaryKey }
      }
    },
    data
  );
}

export function validatePhase(state, data) {
  const errors = [];
  const missingDependencies = [];
  const extraDependencies = [];
  const wrongTypeDependencies = [];

  for (const declared of data.functionalDependencies) {
    const matching = state.dependencies.filter((dependency) => sameDependency(dependency, declared));

    if (matching.length === 0) {
      missingDependencies.push(declared);
      errors.push({
        code: 'missing-dependency',
        title: 'Dependência não criada',
        message: `${declared.label} não foi criada na rede.`
      });
      continue;
    }

    if (!matching.some((dependency) => dependency.type === declared.type)) {
      const actual = matching[0];
      wrongTypeDependencies.push({ declared, actual });
      errors.push({
        code: 'wrong-type',
        title: 'Classificação incorreta',
        message: `${formatDependency(data, actual)} foi classificada como ${typeLabel(actual.type)}, mas é ${typeLabel(declared.type)}.`
      });
    }
  }

  for (const dependency of state.dependencies) {
    const declared = data.functionalDependencies.find((candidate) =>
      sameDependency(candidate, dependency)
    );

    if (!declared) {
      extraDependencies.push(dependency);
      errors.push({
        code: 'extra-dependency',
        title: 'Dependência não declarada',
        message: `${formatDependency(data, dependency)} não foi declarada no domínio. Não infira dependências apenas pela amostra.`
      });
    }
  }

  const tableErrors = [];
  const pkErrors = [];

  for (const target of data.targetTables) {
    const actual = state.tables[target.id]?.attributes ?? [];
    const expected = target.attributes;
    const missing = expected.filter((attributeId) => !actual.includes(attributeId));
    const extra = actual.filter((attributeId) => !expected.includes(attributeId));

    if (missing.length > 0) {
      tableErrors.push({
        code: 'table-missing',
        table: target.id,
        title: `${target.name} incompleta`,
        message: `${target.name} deve conter ${formatAttributeList(data, missing)}.`
      });
    }

    if (extra.length > 0) {
      const partialExtras =
        target.id === 'item_pedido'
          ? extra.filter((attributeId) => attributeId === 'descricao' || attributeId === 'preco')
          : [];
      const otherExtras = extra.filter((attributeId) => !partialExtras.includes(attributeId));

      if (partialExtras.length > 0) {
        tableErrors.push({
          code: 'partial-in-item',
          table: target.id,
          title: 'Descrição e Preço não pertencem a ITEM_PEDIDO',
          message:
            'Descrição e Preço dependem apenas de Produto, que é parte da chave composta (Pedido, Produto). Em 2FN, eles devem ficar em PRODUTO.'
        });
      }

      if (otherExtras.length > 0) {
        tableErrors.push({
          code: 'table-extra',
          table: target.id,
          title: `${target.name} com atributos indevidos`,
          message: `${target.name} não deve conter ${formatAttributeList(data, otherExtras)}.`
        });
      }
    }

    const actualPk = state.tables[target.id]?.primaryKey ?? [];
    const expectedPk = target.primaryKey;
    const missingPk = expectedPk.filter(
      (attributeId) => !actualPk.includes(attributeId) || !actual.includes(attributeId)
    );
    const extraPk = actualPk.filter(
      (attributeId) => !expectedPk.includes(attributeId) || !actual.includes(attributeId)
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
  }

  errors.push(...tableErrors, ...pkErrors);

  const lossless = isLosslessJoin(state, data);
  if (!lossless) {
    errors.push({
      code: 'lossless',
      title: 'Decomposição com perda de junção',
      message:
        'A decomposição deve preservar a informação. O atributo comum Produto precisa ser chave de PRODUTO para que a junção não perca registros.'
    });
  }

  const preserved = isDependencyPreserved(state, data);
  if (!preserved) {
    errors.push({
      code: 'preserved',
      title: 'Dependências não preservadas',
      message:
        'As dependências declaradas devem continuar representadas nas novas tabelas.'
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    missingDependencies,
    extraDependencies,
    wrongTypeDependencies,
    tableErrors,
    pkErrors,
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
  const dependencyPoints = countCorrectDependencies(state, data) * scoring.pointsPerDependency;
  const membershipPoints = countCorrectMemberships(state, data) * scoring.pointsPerMembership;
  const primaryKeyPoints = countCorrectPrimaryKeys(state, data) * scoring.pointsPerPrimaryKey;
  const completionBonus = state.completed ? scoring.completionBonus : 0;
  const penalties =
    state.failedValidations * scoring.wrongValidationPenalty +
    state.hintsUsed * scoring.hintPenalty;
  const max = Number.isFinite(scoring.max)
    ? scoring.max
    : dependencyPoints + membershipPoints + primaryKeyPoints + completionBonus;

  return Math.max(
    0,
    Math.min(max, dependencyPoints + membershipPoints + primaryKeyPoints + completionBonus - penalties)
  );
}

export function countCorrectDependencies(state, data) {
  return state.dependencies.filter((dependency) =>
    data.functionalDependencies.some(
      (declared) => sameDependency(dependency, declared) && dependency.type === declared.type
    )
  ).length;
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

export function isLosslessJoin(state, data) {
  const first = state.tables.item_pedido?.attributes ?? [];
  const second = state.tables.produto?.attributes ?? [];

  if (first.length === 0 || second.length === 0) {
    return false;
  }

  const intersection = first.filter((attributeId) => second.includes(attributeId));
  if (intersection.length === 0) {
    return false;
  }

  const closure = attributeClosure(data, intersection);
  return first.every((attributeId) => closure.has(attributeId)) ||
    second.every((attributeId) => closure.has(attributeId));
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
    dependencies: state.dependencies.map((dependency) => ({
      id: dependency.id,
      determinant: [...dependency.determinant],
      dependent: dependency.dependent,
      type: dependency.type
    })),
    tables: Object.fromEntries(
      Object.entries(state.tables).map(([tableId, table]) => [
        tableId,
        {
          attributes: [...table.attributes],
          primaryKey: [...table.primaryKey]
        }
      ])
    ),
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

  const dependencies = hydrateDependencies(data, snapshot.dependencies);
  const tables = hydrateTables(data, snapshot.tables);
  const revealedHints = Math.min(
    toNonNegativeInteger(snapshot.revealedHints),
    data.hints.length
  );
  const hintsUsed = Math.max(toNonNegativeInteger(snapshot.hintsUsed), revealedHints);

  const candidate = withScore(
    {
      ...base,
      dependencies,
      tables,
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
      { attributes: [], primaryKey: [] }
    ])
  );
}

function hydrateDependencies(data, dependencies) {
  if (!Array.isArray(dependencies)) {
    return [];
  }

  const seen = new Set();
  const hydrated = [];

  for (const dependency of dependencies) {
    if (!dependency || typeof dependency.dependent !== 'string') {
      continue;
    }

    const determinant = Array.isArray(dependency.determinant)
      ? [...new Set(dependency.determinant)]
      : [];

    if (determinant.length === 0 || determinant.some((attributeId) => !getAttribute(data, attributeId))) {
      continue;
    }

    if (!getAttribute(data, dependency.dependent) || determinant.includes(dependency.dependent)) {
      continue;
    }

    if (dependency.type !== 'total' && dependency.type !== 'partial') {
      continue;
    }

    const key = dependencyKey(determinant, dependency.dependent);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    hydrated.push({
      id: key,
      determinant: normalizeDeterminant(data, determinant),
      dependent: dependency.dependent,
      type: dependency.type
    });
  }

  return hydrated;
}

function hydrateTables(data, tables) {
  const hydrated = createEmptyTables(data);

  if (!tables || typeof tables !== 'object') {
    return hydrated;
  }

  for (const target of data.targetTables) {
    const source = tables[target.id];

    if (!source || typeof source !== 'object') {
      continue;
    }

    const attributes = Array.isArray(source.attributes)
      ? [...new Set(source.attributes)].filter((attributeId) => getAttribute(data, attributeId))
      : [];
    const primaryKey = Array.isArray(source.primaryKey)
      ? [...new Set(source.primaryKey)].filter(
          (attributeId) => attributes.includes(attributeId)
        )
      : [];

    hydrated[target.id] = {
      attributes: sortAttributes(data, attributes),
      primaryKey: sortAttributes(data, primaryKey)
    };
  }

  return hydrated;
}

function buildSuccessFeedback(data) {
  return {
    type: 'success',
    title: 'Rede de dependências concluída!',
    message: 'A decomposição eliminou as dependências parciais e alcançou a 2FN.',
    concepts: [
      'Dependência total: (Pedido, Produto) → Quantidade usa a chave inteira.',
      'Dependência parcial: Produto → Descrição e Produto → Preço usam apenas parte da chave.',
      'Descrição e Preço não devem permanecer em ITEM_PEDIDO: eles dependem apenas de Produto.',
      'A decomposição é sem perda de junção porque Produto é chave de PRODUTO.',
      'As dependências declaradas foram preservadas nas novas tabelas.'
    ]
  };
}

function buildErrorFeedback(result) {
  return {
    type: 'error',
    title: 'A rede ainda não está em 2FN',
    message: 'Revise as dependências criadas e a distribuição dos atributos.',
    errors: result.errors,
    concept:
      'Em 2FN, todo atributo não primo deve depender da chave inteira, não de parte dela. Atributos que dependem apenas de Produto devem sair de ITEM_PEDIDO.'
  };
}

function withScore(state, data) {
  return { ...state, score: calculateScore(state, data) };
}

function getAttribute(data, attributeId) {
  return data.attributes.find((attribute) => attribute.id === attributeId) ?? null;
}

function getAttributeLabel(data, attributeId) {
  return getAttribute(data, attributeId)?.label ?? attributeId;
}

function normalizeDeterminant(data, determinant) {
  return sortAttributes(data, [...new Set(determinant)]);
}

function sortAttributes(data, attributes) {
  const order = new Map(data.attributes.map((attribute, index) => [attribute.id, index]));
  return [...attributes].sort(
    (first, second) => (order.get(first) ?? Number.MAX_SAFE_INTEGER) - (order.get(second) ?? Number.MAX_SAFE_INTEGER)
  );
}

function sameDependency(first, second) {
  const firstDeterminant = [...first.determinant].sort().join('+');
  const secondDeterminant = [...second.determinant].sort().join('+');
  return firstDeterminant === secondDeterminant && first.dependent === second.dependent;
}

function dependencyKey(determinant, dependent) {
  return `${[...determinant].sort().join('+')}${DEPENDENCY_ARROW}${dependent}`;
}

function formatDependency(data, dependency) {
  return `${formatDeterminant(data, dependency.determinant)} → ${getAttributeLabel(data, dependency.dependent)}`;
}

function formatDeterminant(data, determinant) {
  const labels = determinant.map((attributeId) => getAttributeLabel(data, attributeId));
  return labels.length > 1 ? `(${labels.join(', ')})` : labels[0] ?? '';
}

function formatAttributeList(data, attributes) {
  return attributes.map((attributeId) => getAttributeLabel(data, attributeId)).join(', ');
}

function typeLabel(type) {
  return type === 'total' ? 'total' : 'parcial';
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
