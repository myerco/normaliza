const HEX_COLOR = /^#[0-9a-f]{3,8}$/i;

export function validateCityData(data) {
  const errors = [];
  const city = data && data.city;

  if (!city || typeof city !== 'object' || Array.isArray(city)) {
    return { valid: false, errors: ['A propriedade "city" é obrigatória.'] };
  }

  if (typeof city.name !== 'string' || city.name.trim() === '') {
    errors.push('"city.name" deve ser um texto não vazio.');
  }

  const viewport = city.viewport;
  if (!viewport || !isPositiveNumber(viewport.width) || !isPositiveNumber(viewport.height)) {
    errors.push('"city.viewport" deve conter width e height positivos.');
  }

  const buildings = city.buildings;
  if (!Array.isArray(buildings) || buildings.length < 3) {
    errors.push('"city.buildings" deve conter pelo menos três edifícios.');
  }

  const buildingIds = new Set();
  if (Array.isArray(buildings)) {
    buildings.forEach((building, index) => {
      const path = `city.buildings[${index}]`;
      if (!building || typeof building !== 'object' || Array.isArray(building)) {
        errors.push(`${path} deve ser um objeto.`);
        return;
      }

      if (typeof building.id !== 'string' || building.id.trim() === '') {
        errors.push(`${path}.id deve ser um texto não vazio.`);
      } else if (buildingIds.has(building.id)) {
        errors.push(`${path}.id duplicado: "${building.id}".`);
      } else {
        buildingIds.add(building.id);
      }

      if (typeof building.name !== 'string' || building.name.trim() === '') {
        errors.push(`${path}.name deve ser um texto não vazio.`);
      }

      if (typeof building.description !== 'string' || building.description.trim() === '') {
        errors.push(`${path}.description deve ser um texto não vazio.`);
      }

      if (!Number.isInteger(building.recordCount) || building.recordCount < 0) {
        errors.push(`${path}.recordCount deve ser um inteiro maior ou igual a zero.`);
      }

      if (!Array.isArray(building.attributes) || building.attributes.length === 0) {
        errors.push(`${path}.attributes deve conter pelo menos um atributo.`);
      } else {
        const attributeNames = new Set();
        building.attributes.forEach((attribute, attributeIndex) => {
          if (typeof attribute !== 'string' || attribute.trim() === '') {
            errors.push(`${path}.attributes[${attributeIndex}] deve ser um texto não vazio.`);
          } else if (attributeNames.has(attribute)) {
            errors.push(`${path}.attributes contém o atributo duplicado "${attribute}".`);
          } else {
            attributeNames.add(attribute);
          }
        });
      }

      if (!isFinitePoint(building.position)) {
        errors.push(`${path}.position deve conter coordenadas x e y finitas.`);
      } else if (
        viewport &&
        isPositiveNumber(viewport.width) &&
        isPositiveNumber(viewport.height) &&
        (building.position.x < 0 ||
          building.position.x > viewport.width ||
          building.position.y < 0 ||
          building.position.y > viewport.height)
      ) {
        errors.push(`${path}.position deve estar dentro do viewport da cidade.`);
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
    });
  }

  const roads = city.roads;
  if (!Array.isArray(roads)) {
    errors.push('"city.roads" deve ser uma lista.');
  } else {
    const roadPairs = new Set();
    roads.forEach((road, index) => {
      const path = `city.roads[${index}]`;
      if (!road || typeof road !== 'object' || Array.isArray(road)) {
        errors.push(`${path} deve ser um objeto.`);
        return;
      }

      if (typeof road.from !== 'string' || !buildingIds.has(road.from)) {
        errors.push(`${path}.from deve referenciar um edifício existente.`);
      }
      if (typeof road.to !== 'string' || !buildingIds.has(road.to)) {
        errors.push(`${path}.to deve referenciar um edifício existente.`);
      }
      if (road.from === road.to) {
        errors.push(`${path} não pode ligar um edifício a ele mesmo.`);
      }

      if (typeof road.from === 'string' && typeof road.to === 'string') {
        const pair = [road.from, road.to].sort().join('::');
        if (roadPairs.has(pair)) {
          errors.push(`${path} duplica uma rua já declarada.`);
        }
        roadPairs.add(pair);
      }
    });
  }

  return { valid: errors.length === 0, errors };
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
