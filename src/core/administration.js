const SCENARIOS = ['update', 'insert', 'delete'];

export function createMissionState(data) {
  return {
    missionId: data.id,
    activeTab: 'update',
    scenarios: {
      update: createUpdateScenario(data.update),
      insert: createInsertScenario(data.insert),
      delete: createDeleteScenario(data.delete)
    },
    completed: false
  };
}

export function selectTab(state, tab) {
  if (!SCENARIOS.includes(tab)) {
    return state;
  }

  return { ...state, activeTab: tab };
}

export function updateDenormalizedLocation(state, data, targetCpf = null) {
  const scenario = state.scenarios.update;
  const newLocation = data.update.newLocation;
  const rows = scenario.rows.map((row) => {
    const matchesDepartment = row.departamento === data.update.department;
    const matchesTarget = targetCpf === null || row.cpf === targetCpf;

    if (matchesDepartment && matchesTarget) {
      return { ...row, localizacao: newLocation };
    }

    return { ...row };
  });
  const inconsistent = rows.some(
    (row) => row.departamento === data.update.department && row.localizacao !== newLocation
  );
  const consistent = !inconsistent;
  const feedback = {
    type: consistent ? 'warning' : 'error',
    title: consistent ? 'Atualização consistente, mas múltipla' : 'Inconsistência de atualização',
    message: consistent
      ? data.update.explanations.allRows
      : data.update.explanations.oneRow
  };
  const nextUpdate = {
    ...scenario,
    rows,
    denormalizedAttempt: targetCpf === null ? 'all' : 'one',
    inconsistent,
    consistent,
    feedback,
    completed: scenario.normalizedUpdated && (inconsistent || consistent)
  };

  return refreshCompletion({
    ...state,
    scenarios: { ...state.scenarios, update: nextUpdate }
  });
}

export function updateNormalizedLocation(state, data) {
  const scenario = state.scenarios.update;
  const departments = scenario.departments.map((department) =>
    department.departamento === data.update.department
      ? { ...department, localizacao: data.update.newLocation }
      : { ...department }
  );
  const nextUpdate = {
    ...scenario,
    departments,
    normalizedUpdated: true,
    feedback: {
      type: 'success',
      title: 'Atualização normalizada',
      message: data.update.explanations.normalized
    },
    completed: scenario.inconsistent || scenario.consistent
  };

  return refreshCompletion({
    ...state,
    scenarios: { ...state.scenarios, update: nextUpdate }
  });
}

export function getNormalizedEmployees(state) {
  const scenario = state.scenarios.update;
  const locations = new Map(
    scenario.departments.map((department) => [department.departamento, department.localizacao])
  );

  return scenario.employees.map((employee) => ({
    ...employee,
    localizacao: locations.get(employee.departamento) ?? ''
  }));
}

export function attemptDenormalizedInsert(state, data) {
  const scenario = state.scenarios.insert;
  const nextInsert = {
    ...scenario,
    denormalizedAttempt: true,
    feedback: {
      type: 'error',
      title: 'Inserção bloqueada pela chave',
      message: data.insert.explanations.blocked
    },
    completed: scenario.normalizedAdded
  };

  return refreshCompletion({
    ...state,
    scenarios: { ...state.scenarios, insert: nextInsert }
  });
}

export function addNormalizedProduct(state, data) {
  const scenario = state.scenarios.insert;
  const exists = scenario.products.some(
    (product) => product.produto === data.insert.newProduct.produto
  );
  const products = exists
    ? scenario.products.map((product) => ({ ...product }))
    : [...scenario.products.map((product) => ({ ...product })), { ...data.insert.newProduct }];
  const nextInsert = {
    ...scenario,
    products,
    normalizedAdded: true,
    feedback: {
      type: 'success',
      title: 'Produto cadastrado',
      message: data.insert.explanations.normalized
    },
    completed: scenario.denormalizedAttempt
  };

  return refreshCompletion({
    ...state,
    scenarios: { ...state.scenarios, insert: nextInsert }
  });
}

export function deleteDenormalizedOrder(state, data) {
  const scenario = state.scenarios.delete;
  const selectedOrder = scenario.selectedOrder;
  const deletedRows = scenario.denormalizedOrders.filter((row) => row.pedido === selectedOrder);
  const denormalizedOrders = scenario.denormalizedOrders.filter(
    (row) => row.pedido !== selectedOrder
  );
  const remainingProductIds = new Set(denormalizedOrders.map((row) => row.produto));
  const lostProducts = [];
  const seen = new Set();

  for (const row of deletedRows) {
    if (remainingProductIds.has(row.produto) || seen.has(row.produto)) {
      continue;
    }

    seen.add(row.produto);
    lostProducts.push({
      produto: row.produto,
      descricao: row.descricao,
      preco: row.preco
    });
  }

  const nextDelete = {
    ...scenario,
    denormalizedOrders,
    denormalizedDeleted: true,
    lostProducts,
    feedback: {
      type: 'error',
      title: 'Perda de informações de produtos',
      message:
        lostProducts.length > 0
          ? `${data.delete.explanations.denormalized} Produtos perdidos: ${lostProducts
              .map((product) => product.descricao)
              .join(', ')}.`
          : data.delete.explanations.denormalized
    },
    completed: scenario.normalizedDeleted
  };

  return refreshCompletion({
    ...state,
    scenarios: { ...state.scenarios, delete: nextDelete }
  });
}

export function deleteNormalizedOrder(state, data) {
  const scenario = state.scenarios.delete;
  const normalizedOrders = scenario.normalizedOrders.filter(
    (row) => row.pedido !== scenario.selectedOrder
  );
  const nextDelete = {
    ...scenario,
    normalizedOrders,
    normalizedDeleted: true,
    feedback: {
      type: 'success',
      title: 'Produtos preservados',
      message: data.delete.explanations.normalized
    },
    completed: scenario.denormalizedDeleted
  };

  return refreshCompletion({
    ...state,
    scenarios: { ...state.scenarios, delete: nextDelete }
  });
}

export function resetScenario(state, data, scenarioId) {
  if (!SCENARIOS.includes(scenarioId)) {
    return state;
  }

  const scenarios = {
    ...state.scenarios,
    [scenarioId]:
      scenarioId === 'update'
        ? createUpdateScenario(data.update)
        : scenarioId === 'insert'
          ? createInsertScenario(data.insert)
          : createDeleteScenario(data.delete)
  };

  return refreshCompletion({ ...state, scenarios });
}

export function getProgress(state) {
  const completed = SCENARIOS.filter((scenarioId) => state.scenarios[scenarioId].completed).length;
  return { completed, total: SCENARIOS.length };
}

function createUpdateScenario(update) {
  const employees = update.employees.map((employee) => ({ ...employee }));
  const departmentMap = new Map();

  for (const employee of employees) {
    if (!departmentMap.has(employee.departamento)) {
      departmentMap.set(employee.departamento, {
        departamento: employee.departamento,
        localizacao: employee.localizacao
      });
    }
  }

  return {
    rows: employees,
    employees: employees.map(({ cpf, nome, departamento }) => ({ cpf, nome, departamento })),
    departments: [...departmentMap.values()],
    denormalizedAttempt: null,
    inconsistent: false,
    consistent: false,
    normalizedUpdated: false,
    feedback: null,
    completed: false
  };
}

function createInsertScenario(insert) {
  return {
    orders: insert.orders.map((row) => ({ ...row })),
    products: insert.products.map((product) => ({ ...product })),
    newProduct: { ...insert.newProduct },
    denormalizedAttempt: false,
    normalizedAdded: false,
    feedback: null,
    completed: false
  };
}

function createDeleteScenario(deletion) {
  return {
    denormalizedOrders: deletion.orders.map((row) => ({ ...row })),
    normalizedOrders: deletion.orders.map(({ pedido, produto, quantidade }) => ({
      pedido,
      produto,
      quantidade
    })),
    products: deletion.products.map((product) => ({ ...product })),
    selectedOrder: deletion.orderId,
    denormalizedDeleted: false,
    normalizedDeleted: false,
    lostProducts: [],
    feedback: null,
    completed: false
  };
}

function refreshCompletion(state) {
  return {
    ...state,
    completed: SCENARIOS.every((scenarioId) => state.scenarios[scenarioId].completed)
  };
}
