import {
  addDependency,
  applyValidation,
  canAddDependency,
  hydratePhaseState,
  removeDependency,
  resetPhaseState,
  toSnapshot,
  toggleMembership,
  togglePrimaryKey,
  useHint,
  validatePhase
} from '../core/fase2.js';

const NODE_POSITIONS = {
  pedido: { x: 160, y: 90 },
  produto: { x: 160, y: 260 },
  quantidade: { x: 760, y: 60 },
  descricao: { x: 760, y: 180 },
  preco: { x: 760, y: 300 }
};

export function createPhase2({
  data,
  snapshot,
  onScoreChange,
  onStateChange,
  onComplete,
  onReset,
  onExit
}) {
  let state = hydratePhaseState(data, snapshot);
  let root = null;
  let justCompleted = false;
  let mode = 'determinant';
  let selectedDeterminant = [];
  let selectedDependent = null;
  let selectedType = null;
  let builderError = null;

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
    root.addEventListener('keydown', handleKeydown);
    render();
  }

  function focus() {
    const target =
      root?.querySelector('.phase-complete .btn--primary') ||
      root?.querySelector('[data-phase-title]');

    target?.focus({ preventScroll: true });
  }

  function reset() {
    state = resetPhaseState(data);
    justCompleted = false;
    mode = 'determinant';
    selectedDeterminant = [];
    selectedDependent = null;
    selectedType = null;
    builderError = null;
    onReset?.();
    onScoreChange?.(state.score);
    render();
    requestAnimationFrame(() => focus());
  }

  function render() {
    if (!root) {
      return;
    }

    const activeElement = root.ownerDocument.activeElement;
    const focusKey = root.contains(activeElement) ? activeElement.dataset.focusKey : null;
    const scrollTop = root.scrollTop;

    root.innerHTML = phaseHtml();
    root.scrollTop = scrollTop;

    if (justCompleted) {
      justCompleted = false;
      root.querySelector('.phase-complete .btn--primary')?.focus({ preventScroll: true });
      return;
    }

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

    root.querySelector('[data-action="validate"]')?.focus({ preventScroll: true });
  }

  function commit(nextState) {
    if (nextState === state) {
      render();
      return;
    }

    state = nextState;
    onStateChange?.(toSnapshot(state));
    onScoreChange?.(state.score);
    render();
  }

  function handleClick(event) {
    const actionElement = event.target.closest('[data-action]');

    if (actionElement && root.contains(actionElement)) {
      event.preventDefault();
      handleAction(actionElement);
      return;
    }

    const node = event.target.closest('.fd-node');

    if (node && root.contains(node)) {
      handleNodeSelection(node.dataset.attribute);
    }
  }

  function handleKeydown(event) {
    if (state.completed && event.key === 'Tab') {
      trapCompletionFocus(event);
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    const node = event.target.closest('.fd-node');

    if (node && root.contains(node)) {
      event.preventDefault();
      handleNodeSelection(node.dataset.attribute);
    }
  }

  function trapCompletionFocus(event) {
    const overlay = root.querySelector('.phase-complete');
    if (!overlay) {
      return;
    }

    const focusable = [
      ...overlay.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ].filter((node) => !node.disabled);

    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = root.ownerDocument.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    } else if (!overlay.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleNodeSelection(attributeId) {
    if (mode === 'determinant') {
      if (selectedDeterminant.includes(attributeId)) {
        selectedDeterminant = selectedDeterminant.filter((id) => id !== attributeId);
      } else {
        selectedDeterminant = [...selectedDeterminant, attributeId];
        if (selectedDependent === attributeId) {
          selectedDependent = null;
        }
      }
    } else if (selectedDependent === attributeId) {
      selectedDependent = null;
    } else {
      selectedDependent = attributeId;
      selectedDeterminant = selectedDeterminant.filter((id) => id !== attributeId);
    }

    builderError = null;
    render();
  }

  function handleAction(actionElement) {
    const action = actionElement.dataset.action;

    switch (action) {
      case 'exit':
        onExit?.();
        break;

      case 'reset':
        reset();
        break;

      case 'set-mode':
        mode = actionElement.dataset.mode === 'dependent' ? 'dependent' : 'determinant';
        builderError = null;
        render();
        break;

      case 'set-type':
        selectedType = actionElement.dataset.type === 'partial' ? 'partial' : 'total';
        builderError = null;
        render();
        break;

      case 'clear-selection':
        selectedDeterminant = [];
        selectedDependent = null;
        builderError = null;
        render();
        break;

      case 'add-dependency': {
        const validation = canAddDependency(
          state,
          data,
          selectedDeterminant,
          selectedDependent,
          selectedType
        );

        if (!validation.valid) {
          builderError = validation.errors[0];
          render();
          return;
        }

        const nextState = addDependency(
          state,
          data,
          selectedDeterminant,
          selectedDependent,
          selectedType
        );

        selectedDeterminant = [];
        selectedDependent = null;
        selectedType = null;
        builderError = null;
        commit(nextState);
        break;
      }

      case 'remove-dependency':
        commit(removeDependency(state, data, actionElement.dataset.dependencyId));
        break;

      case 'toggle-membership':
        commit(
          toggleMembership(
            state,
            data,
            actionElement.dataset.table,
            actionElement.dataset.attribute
          )
        );
        break;

      case 'toggle-primary-key':
        commit(
          togglePrimaryKey(
            state,
            data,
            actionElement.dataset.table,
            actionElement.dataset.attribute
          )
        );
        break;

      case 'validate': {
        const result = validatePhase(state, data);
        const wasCompleted = state.completed;
        const nextState = applyValidation(state, data, result);

        if (!wasCompleted && nextState.completed) {
          justCompleted = true;
          onComplete?.(nextState);
        }

        commit(nextState);
        break;
      }

      case 'hint':
        commit(useHint(state, data));
        break;

      case 'complete-exit':
        onExit?.();
        break;

      case 'complete-reset':
        reset();
        break;

      default:
        break;
    }
  }

  function phaseHtml() {
    const maxScore = getMaxScore();
    const hintsLeft = data.hints.length - state.revealedHints;
    const hasBuilderSelection =
      selectedDeterminant.length > 0 && Boolean(selectedDependent) && Boolean(selectedType);
    const selectedDetLabels = selectedDeterminant
      .map((attributeId) => getAttributeLabel(data, attributeId))
      .join(', ');
    const selectedDepLabel = selectedDependent
      ? getAttributeLabel(data, selectedDependent)
      : '';

    return `
      <div class="phase-shell phase2-shell" ${state.completed ? 'inert aria-hidden="true"' : ''}>
        <header class="phase-header">
          <button class="btn btn--ghost btn--small" type="button" data-action="exit" data-focus-key="action:exit">← Cidade</button>
          <div class="phase-heading">
            <p class="phase-eyebrow">Fase 2 · ${escapeHtml(data.normalForm)} · ${escapeHtml(data.sourceTable)}</p>
            <h1 class="phase-title" data-phase-title tabindex="-1">${escapeHtml(data.title)}</h1>
            <p class="phase-objective">${escapeHtml(data.objective)}</p>
          </div>
          <div class="phase-score" aria-live="polite">
            <span class="phase-score__label">Pontuação</span>
            <strong>${state.score}<span> / ${maxScore}</span></strong>
          </div>
          <button class="btn btn--ghost btn--small" type="button" data-action="reset" data-focus-key="action:reset">Reiniciar fase</button>
        </header>

        ${renderScoreRules(maxScore)}

        <div class="phase-concepts">
          <article class="concept-card">
            <span class="concept-card__tag">Conceito</span>
            <h3>Dependência total</h3>
            <p>${escapeHtml(data.concepts.total)}</p>
          </article>
          <article class="concept-card">
            <span class="concept-card__tag">Conceito</span>
            <h3>Dependência parcial</h3>
            <p>${escapeHtml(data.concepts.partial)}</p>
          </article>
          <article class="concept-card">
            <span class="concept-card__tag">Meta</span>
            <h3>Segunda Forma Normal</h3>
            <p>${escapeHtml(data.concepts.secondNormalForm)}</p>
          </article>
        </div>

        <details class="phase-rules">
          <summary>Dependências declaradas e regras</summary>
          <ul>${data.rules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join('')}</ul>
          <ul class="declared-fd-list">
            ${data.functionalDependencies
              .map(
                (dependency) => `
                  <li>
                    <code>${escapeHtml(dependency.label)}</code>
                    <span class="fd-type fd-type--${dependency.type}">${typeLabel(dependency.type)}</span>
                  </li>
                `
              )
              .join('')}
          </ul>
        </details>

        <section class="phase2-section">
          <div class="phase-section-head">
            <h2>Tabela de entrada</h2>
            <span class="phase-count">${escapeHtml(data.sourceTable)} · ${data.rows.length} registros</span>
          </div>
          <div class="table-scroll">
            ${renderInputTable()}
          </div>
          <p class="input-table-key">
            Chave primária composta: <strong>${escapeHtml(formatDeterminant(data, data.candidateKey))}</strong>
          </p>
        </section>

        <section class="phase2-section">
          <div class="phase-section-head">
            <h2>Rede de dependências</h2>
            <span class="phase-count">${state.dependencies.length} conexão(ões)</span>
          </div>
          <p class="phase-help">
            Selecione os determinantes e o dependente. Use as cores para diferenciar dependências totais e parciais.
          </p>
          <div class="fd-network-scroll">
            ${renderNetwork()}
          </div>
          ${renderBuilder(hasBuilderSelection, selectedDetLabels, selectedDepLabel)}
          ${renderConnections()}
        </section>

        <section class="phase2-section">
          <div class="phase-section-head">
            <h2>Decomposição</h2>
            <span class="phase-count">Distribua os atributos e marque as PKs</span>
          </div>
          <p class="phase-help">
            O mesmo atributo pode aparecer nas duas tabelas quando for chave compartilhada, como Produto.
          </p>
          <div class="decomposition-layout">
            <div class="membership-card">
              <h3>Atributos da relação original</h3>
              ${renderMembershipMatrix()}
            </div>
            <div class="decomposition-tables">
              ${data.targetTables.map(renderTargetTable).join('')}
            </div>
          </div>
        </section>

        <div class="phase-actions">
          <button class="btn btn--primary" type="button" data-action="validate" data-focus-key="action:validate">Validar decomposição</button>
          <button class="btn btn--ghost" type="button" data-action="hint" data-focus-key="action:hint" ${hintsLeft <= 0 ? 'disabled' : ''}>Dica${hintsLeft > 0 ? ` (${hintsLeft})` : ''}</button>
        </div>

        <div class="phase-feedback-slot" aria-live="polite">
          ${renderFeedback()}
        </div>
      </div>
      ${state.completed ? renderCompletion(maxScore) : ''}
    `;
  }

  function renderInputTable() {
    const headers = data.attributes
      .map((attribute) => {
        const isKey = data.candidateKey.includes(attribute.id);
        return `<th>${escapeHtml(attribute.label)}${isKey ? ' <span class="pk-tag">PK</span>' : ''}</th>`;
      })
      .join('');

    const rows = data.rows
      .map(
        (row) => `
          <tr>
            ${data.attributes.map((attribute) => `<td>${escapeHtml(row[attribute.id])}</td>`).join('')}
          </tr>
        `
      )
      .join('');

    return `
      <table class="data-table fd-input-table">
        <thead><tr>${headers}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function renderNetwork() {
    return `
      <svg class="fd-network-svg" viewBox="0 0 1000 380" role="group" aria-label="Rede de dependências entre os atributos">
        <defs>
          <marker id="fd-arrow-total" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#6dd8c8"></path>
          </marker>
          <marker id="fd-arrow-partial" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#ff9c85"></path>
          </marker>
        </defs>
        <g class="fd-links">${renderDependencyLines()}</g>
        <g class="fd-nodes">${data.attributes.map(renderNode).join('')}</g>
      </svg>
    `;
  }

  function renderNode(attribute) {
    const position = NODE_POSITIONS[attribute.id];
    if (!position) {
      return '';
    }

    const isKey = data.candidateKey.includes(attribute.id);
    const isSelectedDeterminant = selectedDeterminant.includes(attribute.id);
    const isSelectedDependent = selectedDependent === attribute.id;
    const classes = ['fd-node'];

    if (isKey) {
      classes.push('is-key');
    }
    if (attribute.role === 'dependent') {
      classes.push('is-dependent');
    }
    if (isSelectedDeterminant) {
      classes.push('is-selected-determinant');
    }
    if (isSelectedDependent) {
      classes.push('is-selected-dependent');
    }

    const stateLabel = isSelectedDeterminant
      ? 'selecionado como determinante'
      : isSelectedDependent
        ? 'selecionado como dependente'
        : 'não selecionado';

    return `
      <g
        class="${classes.join(' ')}"
        data-attribute="${escapeHtml(attribute.id)}"
        data-focus-key="node:${escapeHtml(attribute.id)}"
        tabindex="0"
        role="button"
        aria-pressed="${isSelectedDeterminant || isSelectedDependent}"
        aria-label="${escapeHtml(attribute.label)}, ${isKey ? 'chave primária' : 'atributo dependente'}, ${stateLabel}"
      >
        <rect class="fd-node__bg" x="${position.x - 95}" y="${position.y - 32}" width="190" height="64" rx="16"></rect>
        <text class="fd-node__label" x="${position.x}" y="${position.y - 4}" text-anchor="middle">${escapeHtml(attribute.label)}</text>
        <text class="fd-node__meta" x="${position.x}" y="${position.y + 18}" text-anchor="middle">${isKey ? 'PK' : 'dependente'}</text>
      </g>
    `;
  }

  function renderDependencyLines() {
    return state.dependencies
      .map((dependency) => {
        const determinantPositions = dependency.determinant
          .map((attributeId) => NODE_POSITIONS[attributeId])
          .filter(Boolean);
        const targetPosition = NODE_POSITIONS[dependency.dependent];

        if (!targetPosition || determinantPositions.length === 0) {
          return '';
        }

        const startX = average(determinantPositions.map((position) => position.x));
        const startY = average(determinantPositions.map((position) => position.y));
        const endX = targetPosition.x - 100;
        const endY = targetPosition.y;
        const midX = (startX + endX) / 2;
        const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
        const typeClass = dependency.type === 'total' ? 'fd-link--total' : 'fd-link--partial';

        return `
          <path class="fd-link ${typeClass}" d="${path}" marker-end="url(#fd-arrow-${dependency.type})"></path>
          <circle class="fd-link-dot fd-link-dot--${dependency.type}" cx="${startX}" cy="${startY}" r="6"></circle>
          <text class="fd-link-label fd-link-label--${dependency.type}" x="${midX}" y="${(startY + endY) / 2 - 8}" text-anchor="middle">${typeLabel(dependency.type)}</text>
        `;
      })
      .join('');
  }

  function renderBuilder(hasSelection, selectedDetLabels, selectedDepLabel) {
    return `
      <div class="fd-builder">
        <div class="fd-builder__column">
          <span class="fd-builder__label">1. Modo de seleção</span>
          <div class="segmented" role="group" aria-label="Modo de seleção">
            <button class="segmented__btn${mode === 'determinant' ? ' is-active' : ''}" type="button" data-action="set-mode" data-mode="determinant" data-focus-key="mode:determinant" aria-pressed="${mode === 'determinant'}">Determinante</button>
            <button class="segmented__btn${mode === 'dependent' ? ' is-active' : ''}" type="button" data-action="set-mode" data-mode="dependent" data-focus-key="mode:dependent" aria-pressed="${mode === 'dependent'}">Dependente</button>
          </div>
        </div>

        <div class="fd-builder__selection">
          <p><strong>Determinante:</strong> ${escapeHtml(selectedDetLabels || 'nenhum')}</p>
          <p><strong>Dependente:</strong> ${escapeHtml(selectedDepLabel || 'nenhum')}</p>
        </div>

        <div class="fd-builder__column">
          <span class="fd-builder__label">2. Tipo</span>
          <div class="segmented" role="group" aria-label="Tipo de dependência">
            <button class="segmented__btn segmented__btn--total${selectedType === 'total' ? ' is-active' : ''}" type="button" data-action="set-type" data-type="total" data-focus-key="type:total" aria-pressed="${selectedType === 'total'}">Total</button>
            <button class="segmented__btn segmented__btn--partial${selectedType === 'partial' ? ' is-active' : ''}" type="button" data-action="set-type" data-type="partial" data-focus-key="type:partial" aria-pressed="${selectedType === 'partial'}">Parcial</button>
          </div>
        </div>

        <div class="fd-builder__actions">
          <button class="btn btn--primary" type="button" data-action="add-dependency" data-focus-key="action:add-dependency" ${hasSelection ? '' : 'disabled'}>Criar conexão</button>
          <button class="btn btn--ghost btn--small" type="button" data-action="clear-selection" data-focus-key="action:clear-selection">Limpar seleção</button>
        </div>

        ${builderError ? `<p class="fd-builder__error" role="alert">${escapeHtml(builderError)}</p>` : ''}
      </div>
    `;
  }

  function renderConnections() {
    if (state.dependencies.length === 0) {
      return `
        <div class="fd-connections">
          <p class="fd-connections__empty">Nenhuma conexão criada ainda. Use a rede acima para criar as dependências.</p>
        </div>
      `;
    }

    return `
      <div class="fd-connections">
        ${state.dependencies
          .map(
            (dependency) => `
              <div class="fd-connection fd-connection--${dependency.type}">
                <div class="fd-connection__main">
                  <strong>${escapeHtml(formatDependency(data, dependency))}</strong>
                  <span class="fd-type fd-type--${dependency.type}">${typeLabel(dependency.type)}</span>
                </div>
                <button class="btn btn--small btn--ghost" type="button" data-action="remove-dependency" data-dependency-id="${escapeHtml(dependency.id)}" data-focus-key="dependency:${escapeHtml(dependency.id)}">Remover</button>
              </div>
            `
          )
          .join('')}
      </div>
    `;
  }

  function renderMembershipMatrix() {
    return `
      <div class="membership-table-wrap">
        <table class="membership-table">
          <thead>
            <tr>
              <th>Atributo</th>
              ${data.targetTables.map((target) => `<th>${escapeHtml(target.name)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.attributes
              .map((attribute) => {
                const isKey = data.candidateKey.includes(attribute.id);
                return `
                  <tr>
                    <th scope="row">
                      ${escapeHtml(attribute.label)}
                      ${isKey ? '<span class="pk-tag">PK</span>' : ''}
                    </th>
                    ${data.targetTables
                      .map((target) => {
                        const active = state.tables[target.id].attributes.includes(attribute.id);
                        return `
                          <td>
                            <button
                              class="membership-toggle${active ? ' is-active' : ''}"
                              type="button"
                              data-action="toggle-membership"
                              data-table="${escapeHtml(target.id)}"
                              data-attribute="${escapeHtml(attribute.id)}"
                              data-focus-key="member:${escapeHtml(target.id)}:${escapeHtml(attribute.id)}"
                              aria-pressed="${active}"
                              aria-label="${active ? 'Remover' : 'Incluir'} ${escapeHtml(attribute.label)} ${active ? 'de' : 'em'} ${escapeHtml(target.name)}"
                            >${active ? '✓' : '+'}</button>
                          </td>
                        `;
                      })
                      .join('')}
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderTargetTable(target) {
    const table = state.tables[target.id];
    const rows = table.attributes
      .map((attributeId) => {
        const attribute = getAttribute(data, attributeId);
        const isPk = table.primaryKey.includes(attributeId);

        return `
          <li class="decomposition-attr${isPk ? ' is-pk' : ''}">
            <span class="decomposition-attr__name">${escapeHtml(attribute?.label ?? attributeId)}</span>
            <button
              class="pk-toggle${isPk ? ' is-active' : ''}"
              type="button"
              data-action="toggle-primary-key"
              data-table="${escapeHtml(target.id)}"
              data-attribute="${escapeHtml(attributeId)}"
              data-focus-key="pk:${escapeHtml(target.id)}:${escapeHtml(attributeId)}"
              aria-pressed="${isPk}"
            >PK</button>
            <button
              class="icon-button icon-button--small"
              type="button"
              data-action="toggle-membership"
              data-table="${escapeHtml(target.id)}"
              data-attribute="${escapeHtml(attributeId)}"
              data-focus-key="unassign:${escapeHtml(target.id)}:${escapeHtml(attributeId)}"
              aria-label="Remover ${escapeHtml(attribute?.label ?? attributeId)} de ${escapeHtml(target.name)}"
            >×</button>
          </li>
        `;
      })
      .join('');

    return `
      <article class="decomposition-table decomposition-table--${escapeHtml(target.id)}">
        <header class="decomposition-table__head">
          <h3>${escapeHtml(target.name)}</h3>
          <span>${table.attributes.length} atributo(s)</span>
        </header>
        ${
          table.attributes.length > 0
            ? `<ul class="decomposition-table__attrs">${rows}</ul>`
            : '<p class="decomposition-table__empty">Nenhum atributo atribuído.</p>'
        }
      </article>
    `;
  }

  function renderScoreRules(maxScore) {
    const scoring = data.scoring;

    return `
      <details class="score-rules">
        <summary>Como a pontuação funciona</summary>
        <p>+${scoring.pointsPerDependency} por dependência correta · +${scoring.pointsPerMembership} por atributo na tabela correta · +${scoring.pointsPerPrimaryKey} por PK correta · +${scoring.completionBonus} ao concluir · −${scoring.wrongValidationPenalty} por validação incorreta · −${scoring.hintPenalty} por dica. Máximo: ${maxScore} pontos.</p>
      </details>
    `;
  }

  function renderFeedback() {
    const feedback = state.feedback;

    if (!feedback) {
      return `
        <div class="phase-feedback phase-feedback--neutral">
          <h3>Monte a rede e decomponha a tabela</h3>
          <p>Crie as dependências declaradas, distribua os atributos entre ITEM_PEDIDO e PRODUTO e marque as PKs.</p>
        </div>
      `;
    }

    if (feedback.type === 'hint') {
      return `
        <div class="phase-feedback phase-feedback--hint">
          <h3>${escapeHtml(feedback.title)}</h3>
          <p>${escapeHtml(feedback.message)}</p>
        </div>
      `;
    }

    if (feedback.type === 'success') {
      return `
        <div class="phase-feedback phase-feedback--success">
          <h3>${escapeHtml(feedback.title)}</h3>
          <p>${escapeHtml(feedback.message)}</p>
          <ul>${feedback.concepts.map((concept) => `<li>${escapeHtml(concept)}</li>`).join('')}</ul>
        </div>
      `;
    }

    return `
      <div class="phase-feedback phase-feedback--error">
        <h3>${escapeHtml(feedback.title)}</h3>
        <p>${escapeHtml(feedback.message)}</p>
        <ul>
          ${feedback.errors
            .map(
              (error) =>
                `<li><strong>${escapeHtml(error.title)}:</strong> ${escapeHtml(error.message)}</li>`
            )
            .join('')}
        </ul>
        <p class="feedback-concept">${escapeHtml(feedback.concept)}</p>
      </div>
    `;
  }

  function renderCompletion(maxScore) {
    return `
      <div class="phase-complete" role="dialog" aria-modal="true" aria-labelledby="phase-complete-title">
        <div class="phase-complete__card phase-complete__card--deps">
          <div class="phase-complete__content">
            <p class="phase-eyebrow">Fase concluída</p>
            <h2 id="phase-complete-title">Rede de dependências concluída!</h2>
            <p>A decomposição eliminou as dependências parciais e alcançou a 2FN.</p>

            <div class="phase-complete__tables">
              ${data.targetTables
                .map(
                  (target) => `
                    <article class="complete-table complete-table--${escapeHtml(target.id)}">
                      <h3>${escapeHtml(target.name)}</h3>
                      <ul>
                        ${target.attributes
                          .map((attributeId) => {
                            const isPk = target.primaryKey.includes(attributeId);
                            return `<li>${escapeHtml(getAttributeLabel(data, attributeId))}${isPk ? ' <span class="pk-tag">PK</span>' : ''}</li>`;
                          })
                          .join('')}
                      </ul>
                    </article>
                  `
                )
                .join('')}
            </div>

            <div class="deps-complete-explain">
              <h3>Por que Descrição e Preço saem de ITEM_PEDIDO?</h3>
              <p>
                Produto → Descrição e Produto → Preço são dependências parciais: o determinante
                <strong> Produto </strong> é apenas parte da chave composta (Pedido, Produto).
                Em 2FN, atributos não primos devem depender da chave inteira. Por isso, esses
                atributos ficam em PRODUTO, onde Produto é a chave.
              </p>
            </div>

            <div class="deps-complete-relationship">
              <strong>Novos relacionamentos na cidade</strong>
              <p>PEDIDO 1:N ITEM_PEDIDO N:1 PRODUTO. O edifício ITEM_PEDIDO foi adicionado à cidade.</p>
            </div>

            <div class="phase-complete__score">
              <span>Pontuação da fase</span>
              <strong>${state.score} / ${maxScore}</strong>
            </div>

            <div class="phase-complete__actions">
              <button class="btn btn--primary" type="button" data-action="complete-exit" data-focus-key="action:complete-exit">Ver cidade conectada</button>
              <button class="btn btn--ghost" type="button" data-action="complete-reset" data-focus-key="action:complete-reset">Jogar de novo</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function getMaxScore() {
    return Number.isFinite(data.scoring.max) ? data.scoring.max : 100;
  }
}

function getAttribute(data, attributeId) {
  return data.attributes.find((attribute) => attribute.id === attributeId) ?? null;
}

function getAttributeLabel(data, attributeId) {
  return getAttribute(data, attributeId)?.label ?? attributeId;
}

function formatDependency(data, dependency) {
  return `${formatDeterminant(data, dependency.determinant)} → ${getAttributeLabel(data, dependency.dependent)}`;
}

function formatDeterminant(data, determinant) {
  const labels = determinant.map((attributeId) => getAttributeLabel(data, attributeId));
  return labels.length > 1 ? `(${labels.join(', ')})` : labels[0] ?? '';
}

function typeLabel(type) {
  return type === 'total' ? 'total' : 'parcial';
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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
