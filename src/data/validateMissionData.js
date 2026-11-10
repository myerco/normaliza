export function validateMissionData(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['O arquivo da missão deve ser um objeto.'] };
  }

  for (const field of ['id', 'title', 'subtitle', 'intro']) {
    if (typeof data[field] !== 'string' || data[field].trim() === '') {
      errors.push(`"${field}" deve ser um texto não vazio.`);
    }
  }

  validateUpdate(data.update, errors);
  validateInsert(data.insert, errors);
  validateDelete(data.delete, errors);

  if (!data.completion || typeof data.completion !== 'object') {
    errors.push('"completion" deve conter o resumo da missão.');
  } else {
    if (typeof data.completion.title !== 'string' || data.completion.title.trim() === '') {
      errors.push('"completion.title" deve ser um texto não vazio.');
    }
    if (typeof data.completion.message !== 'string' || data.completion.message.trim() === '') {
      errors.push('"completion.message" deve ser um texto não vazio.');
    }
    if (!Array.isArray(data.completion.summary) || data.completion.summary.length === 0) {
      errors.push('"completion.summary" deve conter pelo menos um item.');
    } else {
      data.completion.summary.forEach((item, index) => {
        if (typeof item !== 'string' || item.trim() === '') {
          errors.push(`"completion.summary[${index}]" deve ser um texto não vazio.`);
        }
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateUpdate(update, errors) {
  if (!update || typeof update !== 'object') {
    errors.push('"update" deve descrever a anomalia de atualização.');
    return;
  }

  for (const field of ['department', 'oldLocation', 'newLocation']) {
    if (typeof update[field] !== 'string' || update[field].trim() === '') {
      errors.push(`"update.${field}" deve ser um texto não vazio.`);
    }
  }

  if (!Array.isArray(update.employees) || update.employees.length === 0) {
    errors.push('"update.employees" deve conter pelo menos um funcionário.');
  } else {
    update.employees.forEach((employee, index) => {
      for (const field of ['cpf', 'nome', 'departamento', 'localizacao']) {
        if (typeof employee?.[field] !== 'string' || employee[field].trim() === '') {
          errors.push(`"update.employees[${index}].${field}" deve ser um texto não vazio.`);
        }
      }
    });
  }

  validateExplanations(update.explanations, ['oneRow', 'allRows', 'normalized'], 'update', errors);
}

function validateInsert(insert, errors) {
  if (!insert || typeof insert !== 'object') {
    errors.push('"insert" deve descrever a anomalia de inserção.');
    return;
  }

  if (!insert.newProduct || typeof insert.newProduct !== 'object') {
    errors.push('"insert.newProduct" deve conter o novo produto.');
  } else {
    for (const field of ['produto', 'descricao', 'categoria', 'preco']) {
      if (
        typeof insert.newProduct[field] !== 'string' ||
        insert.newProduct[field].trim() === ''
      ) {
        errors.push(`"insert.newProduct.${field}" deve ser um texto não vazio.`);
      }
    }
  }

  validateOrders(insert.orders, 'insert.orders', errors);
  validateProducts(insert.products, 'insert.products', errors);
  validateExplanations(insert.explanations, ['blocked', 'normalized'], 'insert', errors);
}

function validateDelete(deletion, errors) {
  if (!deletion || typeof deletion !== 'object') {
    errors.push('"delete" deve descrever a anomalia de exclusão.');
    return;
  }

  if (typeof deletion.orderId !== 'string' || deletion.orderId.trim() === '') {
    errors.push('"delete.orderId" deve ser um texto não vazio.');
  }

  validateOrders(deletion.orders, 'delete.orders', errors);
  validateProducts(deletion.products, 'delete.products', errors);
  validateExplanations(
    deletion.explanations,
    ['denormalized', 'normalized'],
    'delete',
    errors
  );

  if (
    typeof deletion.orderId === 'string' &&
    Array.isArray(deletion.orders) &&
    !deletion.orders.some((order) => order?.pedido === deletion.orderId)
  ) {
    errors.push('"delete.orderId" deve existir em "delete.orders".');
  }
}

function validateOrders(orders, path, errors) {
  if (!Array.isArray(orders) || orders.length === 0) {
    errors.push(`"${path}" deve conter pelo menos uma linha.`);
    return;
  }

  orders.forEach((order, index) => {
    if (!order || typeof order !== 'object' || Array.isArray(order)) {
      errors.push(`"${path}[${index}]" deve ser um objeto.`);
      return;
    }

    if (typeof order.pedido !== 'string' || order.pedido.trim() === '') {
      errors.push(`"${path}[${index}].pedido" deve ser um texto não vazio.`);
    }
    if (typeof order.produto !== 'string' || order.produto.trim() === '') {
      errors.push(`"${path}[${index}].produto" deve ser um texto não vazio.`);
    }
    if (!Number.isInteger(order.quantidade) || order.quantidade <= 0) {
      errors.push(`"${path}[${index}].quantidade" deve ser um inteiro positivo.`);
    }
    if (typeof order.descricao !== 'string' || order.descricao.trim() === '') {
      errors.push(`"${path}[${index}].descricao" deve ser um texto não vazio.`);
    }
    if (typeof order.preco !== 'string' || order.preco.trim() === '') {
      errors.push(`"${path}[${index}].preco" deve ser um texto não vazio.`);
    }
  });
}

function validateProducts(products, path, errors) {
  if (!Array.isArray(products) || products.length === 0) {
    errors.push(`"${path}" deve conter pelo menos um produto.`);
    return;
  }

  products.forEach((product, index) => {
    if (!product || typeof product !== 'object' || Array.isArray(product)) {
      errors.push(`"${path}[${index}]" deve ser um objeto.`);
      return;
    }

    for (const field of ['produto', 'descricao', 'categoria', 'preco']) {
      if (typeof product[field] !== 'string' || product[field].trim() === '') {
        errors.push(`"${path}[${index}].${field}" deve ser um texto não vazio.`);
      }
    }
  });
}

function validateExplanations(explanations, fields, path, errors) {
  if (!explanations || typeof explanations !== 'object') {
    errors.push(`"${path}.explanations" deve conter as explicações.`);
    return;
  }

  for (const field of fields) {
    if (
      typeof explanations[field] !== 'string' ||
      explanations[field].trim() === ''
    ) {
      errors.push(`"${path}.explanations.${field}" deve ser um texto não vazio.`);
    }
  }
}
