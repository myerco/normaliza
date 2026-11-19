const KEY_SEPARATOR = '::';

export function productKey(orderId, product) {
  return `${orderId}${KEY_SEPARATOR}${product}`;
}

export function createPhaseState(data) {
  return withScore(
    {
      phaseId: data.id,
      items: [],
      selected: [],
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

export function hydratePhaseState(data, snapshot) {
  const base = createPhaseState(data);

  if (!snapshot || snapshot.phaseId !== data.id || !Array.isArray(snapshot.items)) {
    return base;
  }

  const expectedKeys = new Set(getAllProducts(data).map((product) => product.key));
  const seen = new Set();
  const items = [];

  for (const item of snapshot.items) {
    if (!item || typeof item.orderId !== 'string' || typeof item.product !== 'string') {
      continue;
    }

    const key = productKey(item.orderId, item.product);
    if (!expectedKeys.has(key) || seen.has(key)) {
      continue;
    }

    seen.add(key);
    items.push({ orderId: item.orderId, product: item.product });
  }

  const allItemsPresent = expectedKeys.size > 0 && [...expectedKeys].every((key) => seen.has(key));
  const completed = snapshot.completed === true && allItemsPresent;
  const revealedHints = Math.min(
    toNonNegativeInteger(snapshot.revealedHints),
    data.hints.length
  );
  const hintsUsed = Math.max(toNonNegativeInteger(snapshot.hintsUsed), revealedHints);

  return withScore(
    {
      ...base,
      items,
      failedValidations: toNonNegativeInteger(snapshot.failedValidations),
      hintsUsed,
      revealedHints,
      completed,
      feedback: completed ? buildSuccessFeedback(data) : null
    },
    data
  );
}

export function toSnapshot(state) {
  return {
    phaseId: state.phaseId,
    items: state.items.map((item) => ({
      orderId: item.orderId,
      product: item.product
    })),
    failedValidations: state.failedValidations,
    hintsUsed: state.hintsUsed,
    revealedHints: state.revealedHints,
    completed: state.completed,
    score: state.score
  };
}

export function getAllProducts(data) {
  const products = [];

  data.orders.forEach((order, orderIndex) => {
    order.products.forEach((product, productIndex) => {
      products.push({
        orderId: order.id,
        orderIndex,
        product,
        productIndex,
        key: productKey(order.id, product)
      });
    });
  });

  return products;
}

export function getExpectedCounts(data) {
  return {
    orders: data.orders.length,
    items: getAllProducts(data).length
  };
}

export function getPendingProducts(state, data) {
  const moved = new Set(state.items.map((item) => productKey(item.orderId, item.product)));
  return getAllProducts(data).filter((product) => !moved.has(product.key));
}

export function isProductMoved(state, orderId, product) {
  const key = productKey(orderId, product);
  return state.items.some((item) => productKey(item.orderId, item.product) === key);
}

export function isExpectedProduct(data, orderId, product) {
  const order = data.orders.find((candidate) => candidate.id === orderId);
  return Boolean(order && order.products.includes(product));
}

export function getOrderProgress(state, data, orderId) {
  const order = data.orders.find((candidate) => candidate.id === orderId);

  if (!order) {
    return { total: 0, moved: 0, pending: 0, complete: false };
  }

  const moved = order.products.filter((product) => isProductMoved(state, order.id, product)).length;

  return {
    total: order.products.length,
    moved,
    pending: order.products.length - moved,
    complete: moved === order.products.length
  };
}

export function getPedidoRows(state, data) {
  return data.orders
    .filter((order) => getOrderProgress(state, data, order.id).complete)
    .map((order) => ({
      id_pedido: order.id,
      cliente: order.customer
    }));
}

export function getItemRows(state, data) {
  const positions = new Map();

  data.orders.forEach((order, orderIndex) => {
    order.products.forEach((product, productIndex) => {
      positions.set(productKey(order.id, product), orderIndex * 1000 + productIndex);
    });
  });

  return [...state.items]
    .sort((first, second) => {
      const firstPosition = positions.get(productKey(first.orderId, first.product));
      const secondPosition = positions.get(productKey(second.orderId, second.product));
      return (firstPosition ?? Number.MAX_SAFE_INTEGER) - (secondPosition ?? Number.MAX_SAFE_INTEGER);
    })
    .map((item) => ({
      id_pedido: item.orderId,
      produto: item.product
    }));
}

export function toggleProductSelection(state, data, orderId, product) {
  if (state.completed || isProductMoved(state, orderId, product) || !isExpectedProduct(data, orderId, product)) {
    return state;
  }

  const key = productKey(orderId, product);
  const selected = state.selected.includes(key)
    ? state.selected.filter((selectedKey) => selectedKey !== key)
    : [...state.selected, key];

  return { ...state, selected };
}

export function selectAllPending(state, data) {
  if (state.completed) {
    return state;
  }

  return {
    ...state,
    selected: getPendingProducts(state, data).map((product) => product.key)
  };
}

export function moveSelectedProducts(state, data) {
  const newItems = [];
  const movedKeys = new Set();

  for (const key of state.selected) {
    const parsed = parseKey(key);

    if (!parsed || !isExpectedProduct(data, parsed.orderId, parsed.product)) {
      continue;
    }

    if (isProductMoved(state, parsed.orderId, parsed.product)) {
      continue;
    }

    newItems.push(parsed);
    movedKeys.add(key);
  }

  if (newItems.length === 0) {
    return state;
  }

  const items = [...state.items, ...newItems];
  const selected = state.selected.filter((key) => {
    if (movedKeys.has(key)) {
      return false;
    }

    const parsed = parseKey(key);
    return parsed && !isProductMoved({ ...state, items }, parsed.orderId, parsed.product);
  });

  return withScore({ ...state, items, selected }, data);
}

export function moveProduct(state, data, orderId, product) {
  if (!isExpectedProduct(data, orderId, product) || isProductMoved(state, orderId, product)) {
    return state;
  }

  const key = productKey(orderId, product);
  const items = [...state.items, { orderId, product }];
  const selected = state.selected.filter((selectedKey) => selectedKey !== key);

  return withScore({ ...state, items, selected }, data);
}

export function validatePhase(state, data) {
  const expected = getAllProducts(data);
  const countByKey = new Map();

  for (const item of state.items) {
    const key = productKey(item.orderId, item.product);
    countByKey.set(key, (countByKey.get(key) || 0) + 1);
  }

  const pending = expected.filter((product) => !countByKey.has(product.key));
  const duplicateKeys = [...countByKey.entries()]
    .filter(([, count]) => count > 1)
    .map(([key]) => key);
  const unexpectedItems = state.items.filter(
    (item) => !isExpectedProduct(data, item.orderId, item.product)
  );
  const incompleteOrders = data.orders
    .map((order) => ({
      id: order.id,
      customer: order.customer,
      pending: order.products.filter(
        (product) => !countByKey.has(productKey(order.id, product))
      )
    }))
    .filter((order) => order.pending.length > 0);

  const errors = [];

  if (pending.length > 0) {
    errors.push({
      code: 'pending',
      title: 'Ainda há produtos agrupados',
      message: `${pending.length} produto(s) continuam dentro das caixas e precisam de uma linha própria em ITEM_PEDIDO.`
    });
  }

  if (incompleteOrders.length > 0) {
    errors.push({
      code: 'incomplete-orders',
      title: 'Pedidos incompletos',
      message: `Os pedidos ${incompleteOrders.map((order) => order.id).join(', ')} ainda não foram totalmente separados.`
    });
  }

  if (duplicateKeys.length > 0) {
    errors.push({
      code: 'duplicate',
      title: 'Itens repetidos',
      message: 'Existe mais de uma linha para o mesmo produto no mesmo pedido. Cada item deve aparecer uma única vez.'
    });
  }

  if (unexpectedItems.length > 0) {
    errors.push({
      code: 'association',
      title: 'Associação com o pedido precisa ser preservada',
      message: 'Há itens que não pertencem ao pedido informado. Cada linha de ITEM_PEDIDO deve manter o id_pedido correto.'
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    pending,
    duplicateKeys,
    unexpectedItems,
    incompleteOrders,
    pedidoRows: getPedidoRows(state, data),
    itemRows: getItemRows(state, data)
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
  const totalItems = getAllProducts(data).length;
  const max = Number.isFinite(scoring.max)
    ? scoring.max
    : totalItems * scoring.pointsPerItem + scoring.completionBonus;
  const itemPoints = state.items.length * scoring.pointsPerItem;
  const completionBonus = state.completed ? scoring.completionBonus : 0;
  const penalties =
    state.failedValidations * scoring.wrongValidationPenalty +
    state.hintsUsed * scoring.hintPenalty;

  return Math.max(0, Math.min(max, itemPoints + completionBonus - penalties));
}

function withScore(state, data) {
  return { ...state, score: calculateScore(state, data) };
}

function parseKey(key) {
  const separatorIndex = key.indexOf(KEY_SEPARATOR);

  if (separatorIndex === -1) {
    return null;
  }

  return {
    orderId: key.slice(0, separatorIndex),
    product: key.slice(separatorIndex + KEY_SEPARATOR.length)
  };
}

function buildSuccessFeedback(data) {
  return {
    type: 'success',
    title: 'Separação concluída!',
    message: 'Todos os produtos agora ocupam registros individuais em ITEM_PEDIDO.',
    concepts: [
      'Atomicidade: cada célula tem um único valor.',
      `Grupos repetitivos: listas como “${data.orders[0].products.join(', ')}” deixaram de existir em uma única célula.`,
      'A associação com o pedido foi preservada porque cada linha mantém o id_pedido.'
    ]
  };
}

function buildErrorFeedback(result) {
  return {
    type: 'error',
    title: 'Ainda não está em 1FN',
    message: 'Existem produtos agrupados ou associações incompletas. Veja os detalhes e tente novamente.',
    errors: result.errors,
    pending: result.pending,
    incompleteOrders: result.incompleteOrders,
    concept: 'Em 1FN, cada célula deve conter um único valor atômico. Listas como “Caneta, Lápis” são grupos repetitivos.'
  };
}

function toNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}
