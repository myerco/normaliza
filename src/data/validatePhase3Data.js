const HEX_COLOR = /^#[0-9a-f]{3,8}$/i;
const DEPENDENCY_TYPES = new Set(['direct', 'transitive']);
const ATTRIBUTE_ROLES = new Set(['key', 'dependent', 'determinant', 'transitive']);

export function validatePhase3Data(data, options = {}) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['O arquivo da fase deve ser um objeto.'] };
  }

  for (const field of ['id', 'title', 'normalForm', 'sourceTable', 'objective']) {
    if (typeof data[field] !== 'string' || data[field].trim() === '') {
      errors.push(`"${field}" deve ser um texto não vazio.`);
    }
  }

  validateStringList(data.rules, 'rules', errors);
  validateStringList(data.hints, 'hints', errors);

  if (!data.concepts || typeof data.concepts !== 'object') {
    errors.push('"concepts" deve conter as explicações da fase.');
  } else {
    for (const field of ['transitive', 'thirdNormalForm', 'decomposition']) {
      if (typeof data.concepts[field] !== 'string' || data.concepts[field].trim() === '') {
        errors.push(`"concepts.${field}" deve ser um texto não vazio.`);
      }
    }
  }

  const attributes = Array.isArray(data.attributes) ? data.attributes : [];
  const attributeIds = new Set();

  if (attributes.length === 0) {
    errors.push('"attributes" deve conter pelo menos um atributo.');
  }

  attributes.forEach((attribute, index) => {
    const path = `attributes[${index}]`;

    if (!attribute || typeof attribute !== 'object' || Array.isArray(attribute)) {
      errors.push(`${path} deve ser um objeto.`);
      return;
    }

    if (typeof attribute.id !== 'string' || attribute.id.trim() === '') {
      errors.push(`${path}.id deve ser um texto não vazio.`);
    } else if (attributeIds.has(attribute.id)) {
      errors.push(`${path}.id duplicado: "${attribute.id}".`);
    } else {
      attributeIds.add(attribute.id);
    }

    if (typeof attribute.label !== 'string' || attribute.label.trim() === '') {
      errors.push(`${path}.label deve ser um texto não vazio.`);
    }

    if (!ATTRIBUTE_ROLES.has(attribute.role)) {
      errors.push(`${path}.role deve ser key, dependent, determinant ou transitive.`);
    }
  });

  if (!Array.isArray(data.candidateKey) || data.candidateKey.length === 0) {
    errors.push('"candidateKey" deve conter pelo menos um atributo.');
  } else {
    data.candidateKey.forEach((attributeId, index) => {
      if (!attributeIds.has(attributeId)) {
        errors.push(`"candidateKey[${index}]" referencia um atributo inexistente.`);
      }
    });
  }

  const declaredDependencies = Array.isArray(data.functionalDependencies)
    ? data.functionalDependencies
    : [];
  const dependencyIds = new Set();
  const dependencyKeys = new Set();

  if (declaredDependencies.length === 0) {
    errors.push('"functionalDependencies" deve conter pelo menos uma dependência declarada.');
  }

  declaredDependencies.forEach((dependency, index) => {
    const path = `functionalDependencies[${index}]`;

    if (!dependency || typeof dependency !== 'object' || Array.isArray(dependency)) {
      errors.push(`${path} deve ser um objeto.`);
      return;
    }

    if (typeof dependency.id !== 'string' || dependency.id.trim() === '') {
      errors.push(`${path}.id deve ser um texto não vazio.`);
    } else if (dependencyIds.has(dependency.id)) {
      errors.push(`${path}.id duplicado: "${dependency.id}".`);
    } else {
      dependencyIds.add(dependency.id);
    }

    if (!Array.isArray(dependency.determinant) || dependency.determinant.length === 0) {
      errors.push(`${path}.determinant deve conter pelo menos um atributo.`);
    } else {
      dependency.determinant.forEach((attributeId, determinantIndex) => {
        if (!attributeIds.has(attributeId)) {
          errors.push(`${path}.determinant[${determinantIndex}] referencia um atributo inexistente.`);
        }
      });
    }

    if (!attributeIds.has(dependency.dependent)) {
      errors.push(`${path}.dependent referencia um atributo inexistente.`);
    }

    if (Array.isArray(dependency.determinant) && dependency.determinant.includes(dependency.dependent)) {
      errors.push(`${path} não pode ter o dependente dentro do determinante.`);
    }

    if (!DEPENDENCY_TYPES.has(dependency.type)) {
      errors.push(`${path}.type deve ser "direct" ou "transitive".`);
    }

    if (Array.isArray(dependency.determinant)) {
      const key = `${[...dependency.determinant].sort().join('+')}->${dependency.dependent}`;
      if (dependencyKeys.has(key)) {
        errors.push(`${path} duplica uma dependência já declarada.`);
      }
      dependencyKeys.add(key);
    }

    if (typeof dependency.label !== 'string' || dependency.label.trim() === '') {
      errors.push(`${path}.label deve ser um texto não vazio.`);
    }
  });

  const transitive = declaredDependencies.find(
    (dependency) => dependency.id === data.transitiveDependencyId
  );
  if (!transitive) {
    errors.push('"transitiveDependencyId" deve referenciar uma dependência declarada.');
  } else if (transitive.type !== 'transitive') {
    errors.push('"transitiveDependencyId" deve referenciar uma dependência do tipo transitive.');
  }

  if (!Array.isArray(data.rows) || data.rows.length === 0) {
    errors.push('"rows" deve conter pelo menos uma linha.');
  } else {
    data.rows.forEach((row, index) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        errors.push(`rows[${index}] deve ser um objeto.`);
        return;
      }

      for (const attributeId of attributeIds) {
        if (!(attributeId in row)) {
          errors.push(`rows[${index}] não contém o atributo "${attributeId}".`);
        }
      }
    });
  }

  const targetTables = Array.isArray(data.targetTables) ? data.targetTables : [];
  const tableIds = new Set();
  const membership = new Set();

  if (targetTables.length === 0) {
    errors.push('"targetTables" deve conter pelo menos uma tabela.');
  }

  targetTables.forEach((table, index) => {
    const path = `targetTables[${index}]`;

    if (!table || typeof table !== 'object' || Array.isArray(table)) {
      errors.push(`${path} deve ser um objeto.`);
      return;
    }

    if (typeof table.id !== 'string' || table.id.trim() === '') {
      errors.push(`${path}.id deve ser um texto não vazio.`);
    } else if (tableIds.has(table.id)) {
      errors.push(`${path}.id duplicado: "${table.id}".`);
    } else {
      tableIds.add(table.id);
    }

    if (typeof table.name !== 'string' || table.name.trim() === '') {
      errors.push(`${path}.name deve ser um texto não vazio.`);
    }

    if (!Array.isArray(table.attributes) || table.attributes.length === 0) {
      errors.push(`${path}.attributes deve conter pelo menos um atributo.`);
    } else {
      table.attributes.forEach((attributeId, attributeIndex) => {
        if (!attributeIds.has(attributeId)) {
          errors.push(`${path}.attributes[${attributeIndex}] referencia um atributo inexistente.`);
        } else {
          membership.add(attributeId);
        }
      });
    }

    if (!Array.isArray(table.primaryKey) || table.primaryKey.length === 0) {
      errors.push(`${path}.primaryKey deve conter pelo menos um atributo.`);
    } else {
      table.primaryKey.forEach((attributeId, keyIndex) => {
        if (!table.attributes?.includes(attributeId)) {
          errors.push(`${path}.primaryKey[${keyIndex}] deve pertencer aos atributos da tabela.`);
        }
      });
    }

    if (!Array.isArray(table.foreignKeys)) {
      errors.push(`${path}.foreignKeys deve ser uma lista.`);
    } else {
      table.foreignKeys.forEach((foreignKey, foreignKeyIndex) => {
        const fkPath = `${path}.foreignKeys[${foreignKeyIndex}]`;

        if (!foreignKey || typeof foreignKey !== 'object' || Array.isArray(foreignKey)) {
          errors.push(`${fkPath} deve ser um objeto.`);
          return;
        }

        if (!table.attributes?.includes(foreignKey.attribute)) {
          errors.push(`${fkPath}.attribute deve pertencer aos atributos da tabela.`);
        }

        if (
          !foreignKey.references ||
          typeof foreignKey.references.table !== 'string' ||
          typeof foreignKey.references.attribute !== 'string'
        ) {
          errors.push(`${fkPath}.references deve conter table e attribute.`);
        }
      });
    }
  });

  for (const attributeId of attributeIds) {
    if (!membership.has(attributeId)) {
      errors.push(`O atributo "${attributeId}" não aparece em nenhuma tabela de destino.`);
    }
  }

  for (const dependency of declaredDependencies) {
    const preserved = targetTables.some(
      (table) =>
        Array.isArray(table.attributes) &&
        dependency.determinant.every((attributeId) => table.attributes.includes(attributeId)) &&
        table.attributes.includes(dependency.dependent)
    );

    if (!preserved) {
      errors.push(
        `A dependência "${dependency.label}" não é preservada por nenhuma tabela de destino.`
      );
    }
  }

  const relationships = Array.isArray(data.relationships) ? data.relationships : [];
  const relationshipKeys = new Set();

  if (relationships.length === 0) {
    errors.push('"relationships" deve conter pelo menos um relacionamento.');
  }

  relationships.forEach((relationship, index) => {
    const path = `relationships[${index}]`;

    if (!relationship || typeof relationship !== 'object' || Array.isArray(relationship)) {
      errors.push(`${path} deve ser um objeto.`);
      return;
    }

    const sourceTable = targetTables.find((table) => table.id === relationship.fromTable);
    const targetTable = targetTables.find((table) => table.id === relationship.toTable);

    if (!sourceTable) {
      errors.push(`${path}.fromTable deve referenciar uma tabela de destino.`);
    }
    if (!targetTable) {
      errors.push(`${path}.toTable deve referenciar uma tabela de destino.`);
    }
    if (relationship.fromTable === relationship.toTable) {
      errors.push(`${path} deve ligar tabelas diferentes.`);
    }

    if (!sourceTable?.attributes?.includes(relationship.fromAttribute)) {
      errors.push(`${path}.fromAttribute deve pertencer à tabela de origem.`);
    }
    if (!sourceTable?.foreignKeys?.some((foreignKey) => foreignKey.attribute === relationship.fromAttribute)) {
      errors.push(`${path}.fromAttribute deve ser uma FK da tabela de origem.`);
    }
    if (!targetTable?.attributes?.includes(relationship.toAttribute)) {
      errors.push(`${path}.toAttribute deve pertencer à tabela de destino.`);
    }
    if (!targetTable?.primaryKey?.includes(relationship.toAttribute)) {
      errors.push(`${path}.toAttribute deve ser PK da tabela de destino.`);
    }

    const key = `${relationship.fromTable}.${relationship.fromAttribute}->${relationship.toTable}.${relationship.toAttribute}`;
    if (relationshipKeys.has(key)) {
      errors.push(`${path} duplica um relacionamento já declarado.`);
    }
    relationshipKeys.add(key);

    if (typeof relationship.label !== 'string' || relationship.label.trim() === '') {
      errors.push(`${path}.label deve ser um texto não vazio.`);
    }
  });

  validateScoring(data.scoring, errors);
  validateCityEvolution(data.cityEvolution, attributeIds, options, errors);

  return { valid: errors.length === 0, errors };
}

function validateStringList(value, path, errors) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`"${path}" deve conter pelo menos um item.`);
    return;
  }

  value.forEach((item, index) => {
    if (typeof item !== 'string' || item.trim() === '') {
      errors.push(`"${path}[${index}]" deve ser um texto não vazio.`);
    }
  });
}

function validateScoring(scoring, errors) {
  if (!scoring || typeof scoring !== 'object') {
    errors.push('"scoring" deve conter a configuração de pontuação.');
    return;
  }

  for (const key of [
    'pointsPerTransitive',
    'pointsPerTable',
    'pointsPerMembership',
    'pointsPerPrimaryKey',
    'pointsPerForeignKey',
    'pointsPerRelationship',
    'completionBonus',
    'wrongValidationPenalty',
    'hintPenalty',
    'max'
  ]) {
    if (typeof scoring[key] !== 'number' || !Number.isFinite(scoring[key]) || scoring[key] < 0) {
      errors.push(`"scoring.${key}" deve ser um número maior ou igual a zero.`);
    }
  }

  if (typeof scoring.max === 'number' && scoring.max <= 0) {
    errors.push('"scoring.max" deve ser maior que zero.');
  }
}

function validateCityEvolution(evolution, attributeIds, options, errors) {
  if (!evolution || typeof evolution !== 'object') {
    errors.push('"cityEvolution" deve descrever os novos edifícios e relacionamentos.');
    return;
  }

  const cityBuildingIds = options.cityBuildingIds
    ? new Set(options.cityBuildingIds)
    : new Set();
  const extensionIds = new Set();

  if (!Array.isArray(evolution.buildings)) {
    errors.push('"cityEvolution.buildings" deve ser uma lista.');
  } else {
    evolution.buildings.forEach((building, index) => {
      const path = `cityEvolution.buildings[${index}]`;

      if (!building || typeof building !== 'object' || Array.isArray(building)) {
        errors.push(`${path} deve ser um objeto.`);
        return;
      }

      for (const field of ['id', 'name', 'description']) {
        if (typeof building[field] !== 'string' || building[field].trim() === '') {
          errors.push(`${path}.${field} deve ser um texto não vazio.`);
        }
      }

      if (typeof building.id === 'string') {
        if (extensionIds.has(building.id)) {
          errors.push(`${path}.id duplicado: "${building.id}".`);
        }
        if (cityBuildingIds.has(building.id)) {
          errors.push(`${path}.id colide com um edifício existente da cidade.`);
        }
        extensionIds.add(building.id);
      }

      if (!Number.isInteger(building.recordCount) || building.recordCount < 0) {
        errors.push(`${path}.recordCount deve ser um inteiro maior ou igual a zero.`);
      }

      if (!Array.isArray(building.attributes) || building.attributes.length === 0) {
        errors.push(`${path}.attributes deve conter pelo menos um atributo.`);
      } else {
        building.attributes.forEach((attributeId, attributeIndex) => {
          if (!attributeIds.has(attributeId)) {
            errors.push(`${path}.attributes[${attributeIndex}] referencia um atributo inexistente.`);
          }
        });
      }

      if (!isFinitePoint(building.position)) {
        errors.push(`${path}.position deve conter coordenadas x e y finitas.`);
      }

      if (
        !building.size ||
        !isPositiveNumber(building.size.width) ||
        !isPositiveNumber(building.size.depth) ||
        !isPositiveNumber(building.size.height)
      ) {
        errors.push(`${path}.size deve conter width, depth e height positivos.`);
      }

      if (typeof building.color !== 'string' || !HEX_COLOR.test(building.color)) {
        errors.push(`${path}.color deve ser uma cor hexadecimal.`);
      }

      if (
        building.badgeLabel !== undefined &&
        (typeof building.badgeLabel !== 'string' || building.badgeLabel.trim() === '')
      ) {
        errors.push(`${path}.badgeLabel deve ser um texto não vazio quando presente.`);
      }
    });
  }

  const allBuildingIds = new Set([...cityBuildingIds, ...extensionIds]);

  if (!Array.isArray(evolution.links)) {
    errors.push('"cityEvolution.links" deve ser uma lista.');
  } else {
    evolution.links.forEach((link, index) => {
      const path = `cityEvolution.links[${index}]`;

      if (!link || typeof link !== 'object' || Array.isArray(link)) {
        errors.push(`${path} deve ser um objeto.`);
        return;
      }

      if (typeof link.from !== 'string' || !allBuildingIds.has(link.from)) {
        errors.push(`${path}.from deve referenciar um edifício conhecido.`);
      }
      if (typeof link.to !== 'string' || !allBuildingIds.has(link.to)) {
        errors.push(`${path}.to deve referenciar um edifício conhecido.`);
      }
      if (link.from === link.to) {
        errors.push(`${path} não pode ligar um edifício a ele mesmo.`);
      }
      if (typeof link.label !== 'string' || link.label.trim() === '') {
        errors.push(`${path}.label deve ser um texto não vazio.`);
      }
    });
  }

  if (!Array.isArray(evolution.normalizedBuildings)) {
    errors.push('"cityEvolution.normalizedBuildings" deve ser uma lista.');
  } else {
    evolution.normalizedBuildings.forEach((normalized, index) => {
      const path = `cityEvolution.normalizedBuildings[${index}]`;

      if (!normalized || typeof normalized !== 'object' || Array.isArray(normalized)) {
        errors.push(`${path} deve ser um objeto.`);
        return;
      }

      if (typeof normalized.id !== 'string' || !allBuildingIds.has(normalized.id)) {
        errors.push(`${path}.id deve referenciar um edifício conhecido.`);
      }

      if (typeof normalized.badgeLabel !== 'string' || normalized.badgeLabel.trim() === '') {
        errors.push(`${path}.badgeLabel deve ser um texto não vazio.`);
      }
    });
  }
}

function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isFinitePoint(point) {
  return (
    point &&
    typeof point === 'object' &&
    typeof point.x === 'number' &&
    Number.isFinite(point.x) &&
    typeof point.y === 'number' &&
    Number.isFinite(point.y)
  );
}
