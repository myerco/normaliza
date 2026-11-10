const HEX_COLOR = /^#[0-9a-f]{3,8}$/i;
const DEPENDENCY_TYPES = new Set(['total', 'partial']);

export function validatePhase2Data(data, options = {}) {
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
    for (const field of ['total', 'partial', 'secondNormalForm']) {
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

    if (attribute.role !== 'key' && attribute.role !== 'dependent') {
      errors.push(`${path}.role deve ser "key" ou "dependent".`);
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
      errors.push(`${path}.type deve ser "total" ou "partial".`);
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
    'pointsPerDependency',
    'pointsPerMembership',
    'pointsPerPrimaryKey',
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
