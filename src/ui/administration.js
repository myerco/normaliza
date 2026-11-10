import {
  addNormalizedProduct,
  attemptDenormalizedInsert,
  createMissionState,
  deleteDenormalizedOrder,
  deleteNormalizedOrder,
  getNormalizedEmployees,
  getProgress,
  resetScenario,
  selectTab,
  updateDenormalizedLocation,
  updateNormalizedLocation
} from '../core/administration.js';

const TABS = [
  { id: 'update', label: 'Atualização', number: 1 },
  { id: 'insert', label: 'Inserção', number: 2 },
  { id: 'delete', label: 'Exclusão', number: 3 }
];

export function createAdministration({ data, onComplete, onExit }) {
  let state = createMissionState(data);
  let root = null;

  return {
    mount,
    refresh: render,
    focus,
    getState: () => state,
    reset
  };

  function mount(container) {
    root = container;
    root.addEventListener('click', handleClick);
    render();
  }

  function focus() {
    root?.querySelector('[data-mission-title]')?.focus({ preventScroll: true });
  }

  function reset() {
    state = createMissionState(data);
    render();
  }

  function commitMission(nextState) {
    const wasCompleted = state.completed;
    state = nextState;

    if (!wasCompleted && state.completed) {
      onComplete?.();
    }

    render();
  }

  function render() {
    if (!root) {
      return;
    }

    const activeElement = root.ownerDocument.activeElement;
    const focusKey = root.contains(activeElement) ? activeElement.dataset.focusKey : null;
    const scrollTop = root.scrollTop;

    root.innerHTML = missionHtml();
    root.scrollTop = scrollTop;

    if (!focusKey) {
      return;
    }

    const target = [...root.querySelectorAll('[data-focus-key]')].find(
      (element) => element.dataset.focusKey === focusKey
    );

    if (target && !target.disabled) {
      target.focus({ preventScroll: true });
      return;
    }

    root.querySelector(`[data-tab="${state.activeTab}"]`)?.focus({ preventScroll: true });
  }

  function handleClick(event) {
    const actionElement = event.target.closest('[data-action]');

    if (!actionElement || !root.contains(actionElement)) {
      return;
    }

    event.preventDefault();
    const action = actionElement.dataset.action;

    switch (action) {
      case 'exit':
      case 'complete-exit':
        onExit?.();
        break;

      case 'select-tab':
        state = selectTab(state, actionElement.dataset.tab);
        render();
        break;

      case 'update-one':
        commitMission(
          updateDenormalizedLocation(state, data, data.update.employees[0]?.cpf)
        );
        break;

      case 'update-all':
        commitMission(updateDenormalizedLocation(state, data, null));
        break;

      case 'update-normalized':
        commitMission(updateNormalizedLocation(state, data));
        break;

      case 'insert-denormalized':
        commitMission(attemptDenormalizedInsert(state, data));
        break;

      case 'insert-normalized':
        commitMission(addNormalizedProduct(state, data));
        break;

      case 'delete-denormalized':
        commitMission(deleteDenormalizedOrder(state, data));
        break;

      case 'delete-normalized':
        commitMission(deleteNormalizedOrder(state, data));
        break;

      case 'reset-scenario':
        commitMission(resetScenario(state, data, actionElement.dataset.scenario));
        break;

      default:
        break;
    }
  }

  function missionHtml() {
    const progress = getProgress(state);
    const activeTab = TABS.find((tab) => tab.id === state.activeTab) || TABS[0];

    return `
      <div class="phase-shell mission-shell">
        <header class="phase-header">
          <button class="btn btn--ghost btn--small" type="button" data-action="exit" data-focus-key="action:exit">← Cidade</button>
          <div class="phase-heading">
            <p class="phase-eyebrow">Missão especial · Integridade dos dados</p>
            <h1 class="phase-title" data-mission-title tabindex="-1">${escapeHtml(data.title)}</h1>
            <p class="phase-objective">${escapeHtml(data.intro)}</p>
          </div>
          <div class="phase-score mission-progress" aria-live="polite">
            <span class="phase-score__label">Anomalias</span>
            <strong>${progress.completed}<span> / ${progress.total}</span></strong>
          </div>
        </header>

        <div class="mission-tabs" role="tablist" aria-label="Anomalias da cidade">
          ${TABS.map((tab) => {
            const active = state.activeTab === tab.id;
            const completed = state.scenarios[tab.id].completed;
            return `
              <button
                class="mission-tab${active ? ' is-active' : ''}${completed ? ' is-complete' : ''}"
                type="button"
                role="tab"
                aria-selected="${active}"
                data-action="select-tab"
                data-tab="${tab.id}"
                data-focus-key="tab:${tab.id}"
              >
                <span class="mission-tab__index">${tab.number}</span>
                <span class="mission-tab__label">${tab.label}</span>
                ${completed ? '<span class="mission-tab__check" aria-label="concluída">✓</span>' : ''}
              </button>
            `;
          }).join('')}
        </div>

        ${state.completed ? renderCompletion() : ''}

        <section class="mission-scenario" aria-label="Anomalia ${activeTab.label}">
          ${renderScenario(activeTab)}
        </section>
      </div>
    `;
  }

  function renderScenario(tab) {
    if (tab.id === 'update') {
      return renderUpdateScenario();
    }
    if (tab.id === 'insert') {
      return renderInsertScenario();
    }
    return renderDeleteScenario();
  }

  function renderUpdateScenario() {
    const scenario = state.scenarios.update;
    const tiRows = scenario.rows.filter((row) => row.departamento === data.update.department);
    const tiLocations = [...new Set(tiRows.map((row) => row.localizacao))];
    const conflict = tiLocations.length > 1;
    const normalizedEmployees = getNormalizedEmployees(state);
    const department = scenario.departments.find(
      (item) => item.departamento === data.update.department
    );

    return `
      <div class="mission-scenario__head">
        <div>
          <p class="phase-eyebrow">Anomalia 1</p>
          <h2>Atualização de endereço</h2>
          <p>A localização do departamento <strong>${escapeHtml(data.update.department)}</strong> mudou de <strong>${escapeHtml(data.update.oldLocation)}</strong> para <strong>${escapeHtml(data.update.newLocation)}</strong>.</p>
        </div>
        ${renderResetButton('update')}
      </div>

      <div class="mission-models">
        <article class="mission-model mission-model--denormalized${scenario.inconsistent ? ' has-error' : scenario.consistent ? ' has-warning' : ''}">
          <header class="mission-model__head">
            <h3>Modelo desnormalizado</h3>
            <span class="table-badge">1 tabela</span>
          </header>
          ${renderUpdateDenormalizedCity(scenario, tiLocations, conflict)}
          <table class="data-table mission-table">
            <thead><tr><th>CPF</th><th>Nome</th><th>Departamento</th><th>Localização</th></tr></thead>
            <tbody>
              ${scenario.rows
                .map((row) => {
                  const isTi = row.departamento === data.update.department;
                  const isNew = isTi && row.localizacao === data.update.newLocation;
                  const isOld = isTi && row.localizacao !== data.update.newLocation;
                  const rowClass = scenario.inconsistent
                    ? isOld
                      ? ' class="is-inconsistent"'
                      : isNew
                        ? ' class="is-updated"'
                        : ''
                    : scenario.consistent && isTi
                      ? ' class="is-updated"'
                      : '';
                  return `
                    <tr${rowClass}>
                      <td>${escapeHtml(row.cpf)}</td>
                      <td>${escapeHtml(row.nome)}</td>
                      <td>${escapeHtml(row.departamento)}</td>
                      <td>${escapeHtml(row.localizacao)}</td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
          <div class="mission-actions">
            <button class="btn btn--ghost btn--small" type="button" data-action="update-one" data-focus-key="action:update-one" ${scenario.denormalizedAttempt ? 'disabled' : ''}>Atualizar só o CPF ${escapeHtml(data.update.employees[0]?.cpf || '')}</button>
            <button class="btn btn--ghost btn--small" type="button" data-action="update-all" data-focus-key="action:update-all" ${scenario.denormalizedAttempt === 'all' ? 'disabled' : ''}>Atualizar todas as linhas de TI</button>
          </div>
        </article>

        <article class="mission-model mission-model--normalized${scenario.normalizedUpdated ? ' has-success' : ''}">
          <header class="mission-model__head">
            <h3>Modelo normalizado</h3>
            <span class="table-badge">2 tabelas</span>
          </header>
          ${renderUpdateNormalizedCity(scenario, department)}
          <div class="mission-table-stack">
            <table class="data-table mission-table">
              <thead><tr><th>Departamento</th><th>Localização</th></tr></thead>
              <tbody>
                ${scenario.departments
                  .map(
                    (item) => `
                      <tr${scenario.normalizedUpdated && item.departamento === data.update.department ? ' class="is-updated"' : ''}>
                        <td>${escapeHtml(item.departamento)}</td>
                        <td>${escapeHtml(item.localizacao)}</td>
                      </tr>
                    `
                  )
                  .join('')}
              </tbody>
            </table>
            <table class="data-table mission-table">
              <thead><tr><th>CPF</th><th>Nome</th><th>Departamento</th><th>Localização</th></tr></thead>
              <tbody>
                ${normalizedEmployees
                  .map(
                    (employee, index) => `
                      <tr${scenario.normalizedUpdated && employee.departamento === data.update.department ? ` class="is-propagated" style="--row-index: ${index}"` : ''}>
                        <td>${escapeHtml(employee.cpf)}</td>
                        <td>${escapeHtml(employee.nome)}</td>
                        <td>${escapeHtml(employee.departamento)}</td>
                        <td>${escapeHtml(employee.localizacao)}</td>
                      </tr>
                    `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
          <div class="mission-actions">
            <button class="btn btn--primary btn--small" type="button" data-action="update-normalized" data-focus-key="action:update-normalized" ${scenario.normalizedUpdated ? 'disabled' : ''}>Atualizar DEPARTAMENTO</button>
          </div>
        </article>
      </div>

      ${renderFeedback(scenario.feedback)}
    `;
  }

  function renderInsertScenario() {
    const scenario = state.scenarios.insert;
    const newProduct = data.insert.newProduct;
    const newProductAdded = scenario.products.some(
      (product) => product.produto === newProduct.produto
    );

    return `
      <div class="mission-scenario__head">
        <div>
          <p class="phase-eyebrow">Anomalia 2</p>
          <h2>Cadastro de produto sem pedido</h2>
          <p>Cadastre o produto <strong>${escapeHtml(newProduct.descricao)}</strong> (${escapeHtml(newProduct.produto)}) que ainda não possui pedidos.</p>
        </div>
        ${renderResetButton('insert')}
      </div>

      <div class="mission-new-product">
        <span class="concept-card__tag">Novo produto</span>
        <strong>${escapeHtml(newProduct.descricao)}</strong>
        <span>${escapeHtml(newProduct.categoria)} · R$ ${escapeHtml(newProduct.preco)}</span>
      </div>

      <div class="mission-models">
        <article class="mission-model mission-model--denormalized${scenario.denormalizedAttempt ? ' has-error' : ''}">
          <header class="mission-model__head">
            <h3>Modelo desnormalizado</h3>
            <span class="table-badge">1 tabela</span>
          </header>
          ${renderInsertDenormalizedCity(scenario, newProduct)}
          <table class="data-table mission-table">
            <thead><tr><th>Pedido</th><th>Produto</th><th>Quantidade</th><th>Descrição</th><th>Preço</th></tr></thead>
            <tbody>
              ${scenario.orders
                .map(
                  (order) => `
                    <tr>
                      <td>${escapeHtml(order.pedido)}</td>
                      <td>${escapeHtml(order.produto)}</td>
                      <td>${escapeHtml(order.quantidade)}</td>
                      <td>${escapeHtml(order.descricao)}</td>
                      <td>${escapeHtml(order.preco)}</td>
                    </tr>
                  `
                )
                .join('')}
            </tbody>
          </table>
          <p class="mission-form-note">Para cadastrar o produto, seria necessário informar Pedido e Quantidade. A chave <code>(Pedido, Produto)</code> não aceita Pedido nulo.</p>
          <div class="mission-actions">
            <button class="btn btn--ghost btn--small" type="button" data-action="insert-denormalized" data-focus-key="action:insert-denormalized" ${scenario.denormalizedAttempt ? 'disabled' : ''}>Cadastrar no modelo desnormalizado</button>
          </div>
          ${scenario.denormalizedAttempt ? '<p class="mission-blocked">Inserção bloqueada: o produto dependeria de um pedido inexistente.</p>' : ''}
        </article>

        <article class="mission-model mission-model--normalized${scenario.normalizedAdded ? ' has-success' : ''}">
          <header class="mission-model__head">
            <h3>Modelo normalizado</h3>
            <span class="table-badge">PRODUTO independente</span>
          </header>
          ${renderInsertNormalizedCity(scenario, newProduct)}
          <table class="data-table mission-table">
            <thead><tr><th>Produto</th><th>Descrição</th><th>Categoria</th><th>Preço</th></tr></thead>
            <tbody>
              ${scenario.products
                .map(
                  (product) => `
                    <tr${product.produto === newProduct.produto && scenario.normalizedAdded ? ' class="is-created"' : ''}>
                      <td>${escapeHtml(product.produto)}</td>
                      <td>${escapeHtml(product.descricao)}</td>
                      <td>${escapeHtml(product.categoria)}</td>
                      <td>${escapeHtml(product.preco)}</td>
                    </tr>
                  `
                )
                .join('')}
            </tbody>
          </table>
          <div class="mission-actions">
            <button class="btn btn--primary btn--small" type="button" data-action="insert-normalized" data-focus-key="action:insert-normalized" ${scenario.normalizedAdded ? 'disabled' : ''}>Cadastrar PRODUTO</button>
          </div>
          ${newProductAdded && scenario.normalizedAdded ? `<p class="mission-success-note">${escapeHtml(newProduct.descricao)} foi cadastrado sem depender de pedido.</p>` : ''}
        </article>
      </div>

      ${renderFeedback(scenario.feedback)}
    `;
  }

  function renderDeleteScenario() {
    const scenario = state.scenarios.delete;
    const lostIds = new Set(scenario.lostProducts.map((product) => product.produto));

    return `
      <div class="mission-scenario__head">
        <div>
          <p class="phase-eyebrow">Anomalia 3</p>
          <h2>Exclusão de pedido</h2>
          <p>Exclua o pedido <strong>${escapeHtml(scenario.selectedOrder)}</strong> e observe o que acontece com os produtos Borracha e Régua.</p>
        </div>
        ${renderResetButton('delete')}
      </div>

      <div class="mission-models">
        <article class="mission-model mission-model--denormalized${scenario.denormalizedDeleted ? ' has-error' : ''}">
          <header class="mission-model__head">
            <h3>Modelo desnormalizado</h3>
            <span class="table-badge">1 tabela</span>
          </header>
          ${renderDeleteDenormalizedCity(scenario, lostIds)}
          <table class="data-table mission-table">
            <thead><tr><th>Pedido</th><th>Produto</th><th>Quantidade</th><th>Descrição</th><th>Preço</th></tr></thead>
            <tbody>
              ${scenario.denormalizedOrders
                .map(
                  (order) => `
                    <tr>
                      <td>${escapeHtml(order.pedido)}</td>
                      <td>${escapeHtml(order.produto)}</td>
                      <td>${escapeHtml(order.quantidade)}</td>
                      <td>${escapeHtml(order.descricao)}</td>
                      <td>${escapeHtml(order.preco)}</td>
                    </tr>
                  `
                )
                .join('')}
            </tbody>
          </table>
          ${scenario.lostProducts.length > 0
            ? `<div class="mission-lost-list"><strong>Produtos perdidos</strong><ul>${scenario.lostProducts.map((product) => `<li>${escapeHtml(product.descricao)} (${escapeHtml(product.produto)})</li>`).join('')}</ul></div>`
            : ''}
          <div class="mission-actions">
            <button class="btn btn--ghost btn--small" type="button" data-action="delete-denormalized" data-focus-key="action:delete-denormalized" ${scenario.denormalizedDeleted ? 'disabled' : ''}>Excluir pedido ${escapeHtml(scenario.selectedOrder)} no modelo desnormalizado</button>
          </div>
        </article>

        <article class="mission-model mission-model--normalized${scenario.normalizedDeleted ? ' has-success' : ''}">
          <header class="mission-model__head">
            <h3>Modelo normalizado</h3>
            <span class="table-badge">ITEM_PEDIDO + PRODUTO</span>
          </header>
          ${renderDeleteNormalizedCity(scenario)}
          <div class="mission-table-stack">
            <table class="data-table mission-table">
              <thead><tr><th>Pedido</th><th>Produto</th><th>Quantidade</th></tr></thead>
              <tbody>
                ${scenario.normalizedOrders
                  .map(
                    (order) => `
                      <tr>
                        <td>${escapeHtml(order.pedido)}</td>
                        <td>${escapeHtml(order.produto)}</td>
                        <td>${escapeHtml(order.quantidade)}</td>
                      </tr>
                    `
                  )
                  .join('')}
              </tbody>
            </table>
            <table class="data-table mission-table">
              <thead><tr><th>Produto</th><th>Descrição</th><th>Preço</th></tr></thead>
              <tbody>
                ${scenario.products
                  .map(
                    (product) => `
                      <tr${scenario.normalizedDeleted ? ' class="is-preserved"' : ''}>
                        <td>${escapeHtml(product.produto)}</td>
                        <td>${escapeHtml(product.descricao)}</td>
                        <td>${escapeHtml(product.preco)}</td>
                      </tr>
                    `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
          <div class="mission-actions">
            <button class="btn btn--primary btn--small" type="button" data-action="delete-normalized" data-focus-key="action:delete-normalized" ${scenario.normalizedDeleted ? 'disabled' : ''}>Excluir pedido ${escapeHtml(scenario.selectedOrder)} no modelo normalizado</button>
          </div>
        </article>
      </div>

      ${renderFeedback(scenario.feedback)}
    `;
  }

  function renderUpdateDenormalizedCity(scenario, locations, conflict) {
    const sign = locations.length > 0 ? locations.join(' / ') : data.update.oldLocation;
    const stateClass = scenario.inconsistent
      ? ' is-inconsistent'
      : scenario.consistent
        ? ' is-updated'
        : '';

    return `
      <div class="mission-city mission-city--single${stateClass}" aria-hidden="true">
        <div class="mission-building mission-building--employee${stateClass}">
          <span class="mission-building__label">FUNCIONÁRIO</span>
          <span class="mission-building__sign">TI · ${escapeHtml(sign)}</span>
        </div>
        ${conflict ? '<span class="mission-city__alert">Mesmo departamento, localizações diferentes</span>' : ''}
      </div>
    `;
  }

  function renderUpdateNormalizedCity(scenario, department) {
    const employeeCount = scenario.employees.filter(
      (employee) => employee.departamento === data.update.department
    ).length;

    return `
      <div class="mission-city mission-city--pair" aria-hidden="true">
        <div class="mission-building mission-building--department${scenario.normalizedUpdated ? ' is-updated' : ''}">
          <span class="mission-building__label">DEPARTAMENTO</span>
          <span class="mission-building__sign">TI · ${escapeHtml(department?.localizacao || data.update.oldLocation)}</span>
        </div>
        <span class="mission-road${scenario.normalizedUpdated ? ' is-propagating' : ''}">N:1</span>
        <div class="mission-building mission-building--employee${scenario.normalizedUpdated ? ' is-propagated' : ''}">
          <span class="mission-building__label">FUNCIONÁRIO</span>
          <span class="mission-building__sign">${employeeCount} registros</span>
        </div>
      </div>
    `;
  }

  function renderInsertDenormalizedCity(scenario, newProduct) {
    return `
      <div class="mission-city mission-city--single${scenario.denormalizedAttempt ? ' is-inconsistent' : ''}" aria-hidden="true">
        <div class="mission-building mission-building--order${scenario.denormalizedAttempt ? ' is-inconsistent' : ''}">
          <span class="mission-building__label">ITEM_PEDIDO</span>
          <span class="mission-building__sign">${scenario.denormalizedAttempt ? 'sem pedido para' : 'produto depende do pedido:'} ${escapeHtml(newProduct.descricao)}</span>
        </div>
      </div>
    `;
  }

  function renderInsertNormalizedCity(scenario, newProduct) {
    return `
      <div class="mission-city mission-city--products" aria-hidden="true">
        <div class="mission-building mission-building--product">PRODUTO</div>
        ${scenario.normalizedAdded ? `<div class="mission-building mission-building--product is-created">${escapeHtml(newProduct.descricao)}</div>` : ''}
      </div>
    `;
  }

  function renderDeleteDenormalizedCity(scenario, lostIds) {
    return `
      <div class="mission-city mission-city--products${scenario.denormalizedDeleted ? ' has-loss' : ''}" aria-hidden="true">
        ${data.delete.products
          .map(
            (product) => `
              <div class="mission-building mission-building--product${lostIds.has(product.produto) ? ' is-lost' : ''}">
                ${escapeHtml(product.descricao)}
              </div>
            `
          )
          .join('')}
      </div>
    `;
  }

  function renderDeleteNormalizedCity(scenario) {
    return `
      <div class="mission-city mission-city--products" aria-hidden="true">
        <div class="mission-building mission-building--order${scenario.normalizedDeleted ? ' is-updated' : ''}">
          <span class="mission-building__label">ITEM_PEDIDO</span>
          <span class="mission-building__sign">${scenario.normalizedDeleted ? 'pedido 002 removido' : 'pedido 002 ativo'}</span>
        </div>
        <div class="mission-building mission-building--product${scenario.normalizedDeleted ? ' is-preserved' : ''}">PRODUTO</div>
      </div>
    `;
  }

  function renderResetButton(scenarioId) {
    return `<button class="btn btn--ghost btn--small" type="button" data-action="reset-scenario" data-scenario="${scenarioId}" data-focus-key="reset:${scenarioId}">Reiniciar cenário</button>`;
  }

  function renderFeedback(feedback) {
    if (!feedback) {
      return '';
    }

    return `
      <div class="phase-feedback phase-feedback--${feedback.type}">
        <h3>${escapeHtml(feedback.title)}</h3>
        <p>${escapeHtml(feedback.message)}</p>
      </div>
    `;
  }

  function renderCompletion() {
    return `
      <section class="mission-complete" aria-labelledby="mission-complete-title">
        <div>
          <p class="phase-eyebrow">Missão concluída</p>
          <h2 id="mission-complete-title">${escapeHtml(data.completion.title)}</h2>
          <p>${escapeHtml(data.completion.message)}</p>
          <ul>${data.completion.summary.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </div>
        <div class="mission-complete__city" aria-hidden="true">
          <span class="mission-building mission-building--employee">FUNCIONÁRIO</span>
          <span class="mission-road">N:1</span>
          <span class="mission-building mission-building--department">DEPARTAMENTO</span>
          <span class="mission-building mission-building--product">PRODUTO</span>
        </div>
        <button class="btn btn--primary btn--small" type="button" data-action="complete-exit" data-focus-key="action:complete-exit">Voltar para a cidade</button>
      </section>
    `;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return character;
    }
  });
}
