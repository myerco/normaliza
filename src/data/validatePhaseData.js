export function validatePhaseData(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['O arquivo da fase deve ser um objeto.'] };
  }

  requireText(data, 'id', 'id', errors);
  requireText(data, 'title', 'title', errors);
  requireText(data, 'normalForm', 'normalForm', errors);
  requireText(data, 'sourceTable', 'sourceTable', errors);
  requireText(data, 'targetTable', 'targetTable', errors);
  requireText(data, 'objective', 'objective', errors);

  if (!Array.isArray(data.rules) || data.rules.length === 0) {
    errors.push('"rules" deve conter pelo menos uma regra.');
  } else {
    data.rules.forEach((rule, index) => {
      if (typeof rule !== 'string' || rule.trim() === '') {
        errors.push(`"rules[${index}]" deve ser um texto não vazio.`);
      }
    });
  }

  if (!data.concepts || typeof data.concepts !== 'object') {
    errors.push('"concepts" deve conter as explicações da fase.');
  } else {
    requireText(data.concepts, 'repeatingGroups', 'concepts.repeatingGroups', errors);
    requireText(data.concepts, 'atomicity', 'concepts.atomicity', errors);
  }

  if (!Array.isArray(data.orders) || data.orders.length === 0) {
    errors.push('"orders" deve conter pelo menos um pedido.');
  } else {
    const orderIds = new Set();

    data.orders.forEach((order, index) => {
      const path = `orders[${index}]`;

      if (!order || typeof order !== 'object' || Array.isArray(order)) {
        errors.push(`${path} deve ser um objeto.`);
        return;
      }

      if (typeof order.id !== 'string' || order.id.trim() === '') {
        errors.push(`${path}.id deve ser um texto não vazio.`);
      } else if (orderIds.has(order.id)) {
        errors.push(`${path}.id duplicado: "${order.id}".`);
      } else {
        orderIds.add(order.id);
      }

      if (typeof order.customer !== 'string' || order.customer.trim() === '') {
        errors.push(`${path}.customer deve ser um texto não vazio.`);
      }

      if (!Array.isArray(order.products) || order.products.length === 0) {
        errors.push(`${path}.products deve conter pelo menos um produto.`);
      } else {
        const products = new Set();

        order.products.forEach((product, productIndex) => {
          if (typeof product !== 'string' || product.trim() === '') {
            errors.push(`${path}.products[${productIndex}] deve ser um texto não vazio.`);
          } else if (products.has(product)) {
            errors.push(`${path}.products contém o produto duplicado "${product}".`);
          } else {
            products.add(product);
          }
        });
      }
    });
  }

  if (!Array.isArray(data.hints) || data.hints.length === 0) {
    errors.push('"hints" deve conter pelo menos uma dica.');
  } else {
    data.hints.forEach((hint, index) => {
      if (typeof hint !== 'string' || hint.trim() === '') {
        errors.push(`"hints[${index}]" deve ser um texto não vazio.`);
      }
    });
  }

  const scoring = data.scoring;
  if (!scoring || typeof scoring !== 'object') {
    errors.push('"scoring" deve conter a configuração de pontuação.');
  } else {
    for (const key of [
      'pointsPerItem',
      'completionBonus',
      'wrongValidationPenalty',
      'hintPenalty',
      'max'
    ]) {
      if (typeof scoring[key] !== 'number' || !Number.isFinite(scoring[key]) || scoring[key] < 0) {
        errors.push(`"scoring.${key}" deve ser um número maior ou igual a zero.`);
      }
    }

    if (
      typeof scoring.max === 'number' &&
      Number.isFinite(scoring.max) &&
      scoring.max <= 0
    ) {
      errors.push('"scoring.max" deve ser maior que zero.');
    }
  }

  return { valid: errors.length === 0, errors };
}

function requireText(object, key, path, errors) {
  if (typeof object[key] !== 'string' || object[key].trim() === '') {
    errors.push(`"${path}" deve ser um texto não vazio.`);
  }
}
