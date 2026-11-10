import {
  addRelationship,
  applyValidation,
  buildTable,
  canAddRelationship,
  hydratePhaseState,
  removeRelationship,
  resetPhaseState,
  selectTransitiveDependency,
  toSnapshot,
  toggleForeignKey,
  toggleMembership,
  togglePrimaryKey,
  useHint,
  validatePhase
} from '../core/fase3.js';

export function createPhase3({
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
  let sourceTable = '';
  let sourceAttribute = '';
  let targetTable = '';
  let targetAttribute = '';
  let relationshipError = null;

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
    root.addEventListener('change', handleChange);
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
    sourceTable = '';
    sourceAttribute = '';
    targetTable = '';
    targetAttribute = '';
    relationshipError = null;
    onReset?.();
    onScoreChange?.(state.score);
    render();
    requestAnimationFrame(() => focus());
  }

  function render() {
    if (!root) {
      return;
    }

    sanitizeBuilderState();
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
    }
  }

  function handleChange(event) {
    const select = event.target.closest('[data-builder]');

    if (!select) {
      return;
    }

    switch (select.dataset.builder) {
      case 'source-table':
        sourceTable = select.value;
        sourceAttribute = '';
        if (targetTable === sourceTable) {
          targetTable = '';
          targetAttribute = '';
        }
        break;
      case 'source-attribute':
        sourceAttribute = select.value;
        break;
      case 'target-table':
        targetTable = select.value;
        targetAttribute = '';
        break;
      case 'target-attribute':
        targetAttribute = select.value;
        break;
      default:
        break;
    }

    relationshipError = null;
    render();
  }

  function handleKeydown(event) {
    if (!state.completed || event.key !== 'Tab') {
      return;
    }

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

  function handleAction(actionElement) {
    const action = actionElement.dataset.action;

    switch (action) {
      case 'exit':
        onExit?.();
        break;

      case 'reset':
        reset();
        break;

      case 'select-transitive':
        commit(selectTransitiveDependency(state, data, actionElement.dataset.dependencyId));
        break;

      case 'build-table':
        commit(buildTable(state, data, actionElement.dataset.table));
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

      case 'toggle-foreign-key':
        commit(
          toggleForeignKey(
            state,
            data,
            actionElement.dataset.table,
            actionElement.dataset.attribute
          )
        );
        break;

      case 'add-relationship': {
        const validation = canAddRelationship(
          state,
          data,
          sourceTable,
          sourceAttribute,
          targetTable,
          targetAttribute
        );

        if (!validation.valid) {
          relationshipError = validation.errors[0];
          render();
          return;
        }

        const nextState = addRelationship(
          state,
          data,
          sourceTable,
          sourceAttribute,
          targetTable,
          targetAttribute
        );

        sourceTable = '';
        sourceAttribute = '';
        targetTable = '';
        targetAttribute = '';
        relationshipError = null;
        commit(nextState);
        break;
      }

      case 'remove-relationship':
        commit(removeRelationship(state, data, actionElement.dataset.relationshipId));
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

  function sanitizeBuilderState() {
    const built = new Set(state.builtTables);

    if (!built.has(sourceTable)) {
      sourceTable = '';
      sourceAttribute = '';
    }

    if (sourceTable && !state.tables[sourceTable]?.attributes.includes(sourceAttribute)) {
      sourceAttribute = '';
    }

    if (!built.has(targetTable) || targetTable === sourceTable) {
      targetTable = '';
      targetAttribute = '';
    }

    if (targetTable && !state.tables[targetTable]?.attributes.includes(targetAttribute)) {
      targetAttribute = '';
    }
  }

  function phaseHtml() {
    const maxScore = getMaxScore();
    const hintsLeft = data.hints.length - state.revealedHints;
    const builtTargets = data.targetTables.filter((target) =>
      state.builtTables.includes(target.id)
    );
    const allBuilt = state.builtTables.length === data.targetTables.length;

    return `
      <div class="phase-shell phase3-shell" ${state.completed ? 'inert aria-hidden="true"' : ''}>
        <header class="phase-header">
          <button class="btn btn--ghost btn--small" type="button" data-action="exit" data-focus-key="action:exit">← Cidade</button>
          <div class="phase-heading">
            <p class="phase-eyebrow">Fase 3 · ${escapeHtml(data.normalForm)} · ${escapeHtml(data.sourceTable)}</p>
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
            <h3>Dependência transitiva</h3>
            <p>${escapeHtml(data.concepts.transitive)}</p>
          </article>
          <article class="concept-card">
            <span class="concept-card__tag">Meta</span>
            <h3>Terceira Forma Normal</h3>
            <p>${escapeHtml(data.concepts.thirdNormalForm)}</p>
          </article>
          <article class="concept-card">
            <span class="concept-card__tag">Missão</span>
            <h3>Cidade organizada</h3>
            <p>${escapeHtml(data.concepts.decomposition)}</p>
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
            Chave primária: <strong>${escapeHtml(formatDeterminant(data, data.candidateKey))}</strong>
          </p>
        </section>

        <section class="phase2-section">
          <div class="phase-section-head">
            <h2>1. Identifique a dependência transitiva</h2>
            <span class="phase-count">${state.transitiveDependencyId ? '1 selecionada' : 'nenhuma selecionada'}</span>
          </div>
          <p class="phase-help">
            Escolha a dependência que faz Localização depender de CPF por transitividade.
          </p>
          <div class="p3-fd-choices" role="radiogroup" aria-label="Dependência transitiva">
            ${data.functionalDependencies
              .map((dependency) => {
                const selected = state.transitiveDependencyId === dependency.id;
                return `
                  <button
                    class="p3-fd-choice${selected ? ' is-selected' : ''}"
                    type="button"
                    role="radio"
                    aria-checked="${selected}"
                    data-action="select-transitive"
                    data-dependency-id="${escapeHtml(dependency.id)}"
                    data-focus-key="fd:${escapeHtml(dependency.id)}"
                  >
                    <code>${escapeHtml(dependency.label)}</code>
                    <span>${selected ? 'Selecionada' : 'Marcar como transitiva'}</span>
                  </button>
                `;
              })
              .join('')}
          </div>
        </section>

        <section class="phase2-section">
          <div class="phase-section-head">
            <h2>2. Construa os edifícios</h2>
            <span class="phase-count">${state.builtTables.length} de ${data.targetTables.length} construídos</span>
          </div>
          <p class="phase-help">
            Construa as novas tabelas nos terrenos disponíveis. Depois distribua os atributos e defina as chaves.
          </p>
          <div class="p3-build-lots">
            ${data.targetTables.map(renderBuildLot).join('')}
          </div>
        </section>

        <section class="phase2-section">
          <div class="phase-section-head">
            <h2>3. Distribua os atributos</h2>
            <span class="phase-count">${allBuilt ? 'terrenos prontos' : 'construa os dois edifícios primeiro'}</span>
          </div>
          <p class="phase-help">
            O mesmo atributo pode aparecer nas duas tabelas quando for chave compartilhada, como Departamento.
          </p>
          ${builtTargets.length > 0
            ? renderMembershipMatrix(builtTargets)
            : '<p class="p3-empty">Construa os edifícios para liberar a distribuição de atributos.</p>'}
        </section>

        <section class="phase2-section">
          <div class="phase-section-head">
            <h2>4. Chaves e relacionamentos</h2>
            <span class="phase-count">${state.relationships.length} relacionamento(s)</span>
          </div>
          <p class="phase-help">
            Marque as PKs e a FK nas tabelas. Depois crie a estrada que representa o relacionamento.
          </p>
          ${builtTargets.length > 0
            ? renderTableCards(builtTargets)
            : '<p class="p3-empty">Construa os edifícios para definir chaves e relacionamentos.</p>'}
          ${renderRelationshipBuilder(builtTargets)}
          ${renderRelationships()}
        </section>

        <div class="phase-actions">
          <button class="btn btn--primary" type="button" data-action="validate" data-focus-key="action:validate">Validar cidade</button>
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

  function renderBuildLot(target) {
    const built = state.builtTables.includes(target.id);
    const table = state.tables[target.id];

    return `
      <article class="p3-lot${built ? ' is-built' : ''}">
        <div class="p3-lot__scene" aria-hidden="true">
          <span class="p3-lot__ground"></span>
          <span class="p3-lot__block"></span>
          <span class="p3-lot__roof"></span>
        </div>
        <div class="p3-lot__body">
          <h3>${built ? escapeHtml(target.name) : 'Terreno disponível'}</h3>
          ${
            built
              ? `<p class="p3-lot__meta">${table.attributes.length} atributo(s)</p>`
              : `<p class="p3-lot__hint">Construa o edifício para criar a tabela.</p>
                 <button class="btn btn--primary btn--small" type="button" data-action="build-table" data-table="${escapeHtml(target.id)}" data-focus-key="build:${escapeHtml(target.id)}">Construir ${escapeHtml(target.name)}</button>`
          }
        </div>
      </article>
    `;
  }

  function renderMembershipMatrix(builtTargets) {
    return `
      <div class="membership-table-wrap">
        <table class="membership-table p3-membership">
          <thead>
            <tr>
              <th>Atributo</th>
              ${builtTargets.map((target) => `<th>${escapeHtml(target.name)}</th>`).join('')}
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
                    ${builtTargets
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

  function renderTableCards(builtTargets) {
    return `
      <div class="p3-tables">
        ${builtTargets.map((target) => renderTableCard(target)).join('')}
      </div>
    `;
  }

  function renderTableCard(target) {
    const table = state.tables[target.id];
    const rows = table.attributes
      .map((attributeId) => {
        const attribute = getAttribute(data, attributeId);
        const isPk = table.primaryKey.includes(attributeId);
        const isFk = table.foreignKeys.includes(attributeId);

        return `
          <li class="p3-attr${isPk ? ' is-pk' : ''}${isFk ? ' is-fk' : ''}">
            <span class="p3-attr__name">${escapeHtml(attribute?.label ?? attributeId)}</span>
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
              class="fk-toggle${isFk ? ' is-active' : ''}"
              type="button"
              data-action="toggle-foreign-key"
              data-table="${escapeHtml(target.id)}"
              data-attribute="${escapeHtml(attributeId)}"
              data-focus-key="fk:${escapeHtml(target.id)}:${escapeHtml(attributeId)}"
              aria-pressed="${isFk}"
            >FK</button>
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
      <article class="p3-table p3-table--${escapeHtml(target.id)}">
        <header>
          <h3>${escapeHtml(target.name)}</h3>
          <span>${table.attributes.length} atributo(s)</span>
        </header>
        ${
          table.attributes.length > 0
            ? `<ul class="p3-table__attrs">${rows}</ul>`
            : '<p class="p3-table__empty">Nenhum atributo atribuído.</p>'
        }
      </article>
    `;
  }

  function renderRelationshipBuilder(builtTargets) {
    const tables = builtTargets;
    const canBuild = tables.length >= 2;
    const sourceAttributes = sourceTable ? state.tables[sourceTable]?.attributes ?? [] : [];
    const targetTables = tables.filter((table) => table.id !== sourceTable);
    const targetAttributes = targetTable ? state.tables[targetTable]?.attributes ?? [] : [];
    const canCreate =
      Boolean(sourceTable) && Boolean(sourceAttribute) && Boolean(targetTable) && Boolean(targetAttribute);

    return `
      <div class="p3-relationship-builder">
        <div class="p3-builder-field">
          <label for="p3-source-table">Tabela de origem</label>
          <select id="p3-source-table" data-builder="source-table" data-focus-key="builder:source-table" ${canBuild ? '' : 'disabled'}>
            <option value="">Selecione</option>
            ${tables.map((table) => `<option value="${escapeHtml(table.id)}" ${sourceTable === table.id ? 'selected' : ''}>${escapeHtml(table.name)}</option>`).join('')}
          </select>
        </div>
        <div class="p3-builder-field">
          <label for="p3-source-attribute">Atributo FK</label>
          <select id="p3-source-attribute" data-builder="source-attribute" data-focus-key="builder:source-attribute" ${sourceTable ? '' : 'disabled'}>
            <option value="">Selecione</option>
            ${sourceAttributes.map((attributeId) => `<option value="${escapeHtml(attributeId)}" ${sourceAttribute === attributeId ? 'selected' : ''}>${escapeHtml(getAttributeLabel(data, attributeId))}</option>`).join('')}
          </select>
        </div>
        <span class="p3-builder-arrow" aria-hidden="true">→</span>
        <div class="p3-builder-field">
          <label for="p3-target-table">Tabela de destino</label>
          <select id="p3-target-table" data-builder="target-table" data-focus-key="builder:target-table" ${sourceTable ? '' : 'disabled'}>
            <option value="">Selecione</option>
            ${targetTables.map((table) => `<option value="${escapeHtml(table.id)}" ${targetTable === table.id ? 'selected' : ''}>${escapeHtml(table.name)}</option>`).join('')}
          </select>
        </div>
        <div class="p3-builder-field">
          <label for="p3-target-attribute">Atributo PK</label>
          <select id="p3-target-attribute" data-builder="target-attribute" data-focus-key="builder:target-attribute" ${targetTable ? '' : 'disabled'}>
            <option value="">Selecione</option>
            ${targetAttributes.map((attributeId) => `<option value="${escapeHtml(attributeId)}" ${targetAttribute === attributeId ? 'selected' : ''}>${escapeHtml(getAttributeLabel(data, attributeId))}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn--primary btn--small" type="button" data-action="add-relationship" data-focus-key="action:add-relationship" ${canCreate ? '' : 'disabled'}>Criar estrada</button>
        ${relationshipError ? `<p class="p3-builder-error" role="alert">${escapeHtml(relationshipError)}</p>` : ''}
      </div>
    `;
  }

  function renderRelationships() {
    if (state.relationships.length === 0) {
      return '<p class="p3-empty">Nenhuma estrada criada ainda.</p>';
    }

    return `
      <div class="p3-relationships">
        ${state.relationships
          .map(
            (relationship) => `
              <div class="p3-relationship">
                <span class="p3-road" aria-hidden="true"></span>
                <div class="p3-relationship__main">
                  <strong>${escapeHtml(formatRelationship(data, relationship))}</strong>
                  <span class="p3-relationship__label">N:1</span>
                </div>
                <button class="btn btn--small btn--ghost" type="button" data-action="remove-relationship" data-relationship-id="${escapeHtml(relationship.id)}" data-focus-key="relationship:${escapeHtml(relationship.id)}">Remover</button>
              </div>
            `
          )
          .join('')}
      </div>
    `;
  }

  function renderScoreRules(maxScore) {
    const scoring = data.scoring;

    return `
      <details class="score-rules">
        <summary>Como a pontuação funciona</summary>
        <p>+${scoring.pointsPerTransitive} por identificar a transitiva · +${scoring.pointsPerTable} por edifício construído · +${scoring.pointsPerMembership} por atributo na tabela correta · +${scoring.pointsPerPrimaryKey} por PK · +${scoring.pointsPerForeignKey} por FK · +${scoring.pointsPerRelationship} por relacionamento · +${scoring.completionBonus} ao concluir · −${scoring.wrongValidationPenalty} por validação incorreta · −${scoring.hintPenalty} por dica. Máximo: ${maxScore} pontos.</p>
      </details>
    `;
  }

  function renderFeedback() {
    const feedback = state.feedback;

    if (!feedback) {
      return `
        <div class="phase-feedback phase-feedback--neutral">
          <h3>Organize a cidade</h3>
          <p>Identifique a dependência transitiva, construa as tabelas, distribua os atributos e crie a estrada do relacionamento.</p>
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
    const transitive = data.functionalDependencies.find(
      (dependency) => dependency.id === data.transitiveDependencyId
    );
    const path = transitive
      ? `${getAttributeLabel(data, transitive.determinant[0])} → ${getAttributeLabel(data, transitive.dependent)}`
      : 'Departamento → Localização';

    return `
      <div class="phase-complete" role="dialog" aria-modal="true" aria-labelledby="phase-complete-title">
        <div class="phase-complete__card phase-complete__card--deps">
          <div class="phase-complete__content">
            <p class="phase-eyebrow">Fase concluída</p>
            <h2 id="phase-complete-title">Cidade organizada! 3FN alcançada.</h2>
            <p>A dependência transitiva foi eliminada e a decomposição preserva os dados.</p>

            <div class="p3-comparison">
              <article class="p3-comparison__side">
                <h3>Cidade original</h3>
                <div class="p3-mini-city p3-mini-city--original" aria-hidden="true">
                  <span class="p3-mini-building">FUNCIONÁRIO</span>
                </div>
                <ul class="p3-comparison__attrs">
                  <li>CPF <span class="pk-tag">PK</span></li>
                  <li>Nome</li>
                  <li>Departamento</li>
                  <li>Localização</li>
                </ul>
                <p class="p3-transitive-note">CPF → Departamento → Localização</p>
              </article>
              <span class="p3-comparison__arrow" aria-hidden="true">→</span>
              <article class="p3-comparison__side">
                <h3>Cidade normalizada</h3>
                <div class="p3-mini-city p3-mini-city--normalized" aria-hidden="true">
                  <span class="p3-mini-building">FUNCIONÁRIO</span>
                  <span class="p3-mini-road">N:1</span>
                  <span class="p3-mini-building">DEPARTAMENTO</span>
                </div>
                <div class="p3-comparison__tables">
                  <ul class="p3-comparison__attrs">
                    <li><strong>FUNCIONÁRIO</strong></li>
                    <li>CPF <span class="pk-tag">PK</span></li>
                    <li>Nome</li>
                    <li>Departamento <span class="fk-tag">FK</span></li>
                  </ul>
                  <ul class="p3-comparison__attrs">
                    <li><strong>DEPARTAMENTO</strong></li>
                    <li>Departamento <span class="pk-tag">PK</span></li>
                    <li>Localização</li>
                  </ul>
                </div>
              </article>
            </div>

            <div class="deps-complete-explain">
              <h3>Por que a dependência é transitiva?</h3>
              <p>
                CPF determina Departamento e Departamento determina Localização. Logo,
                Localização depende de CPF apenas por transitividade. Como Departamento
                não é superchave, a dependência <strong>${escapeHtml(path)}</strong> deve sair de
                FUNCIONÁRIO. Em 3FN, todo atributo não primo deve depender diretamente da chave.
              </p>
            </div>

            <div class="deps-complete-relationship">
              <strong>Cidade normalizada</strong>
              <p>FUNCIONÁRIO e DEPARTAMENTO agora estão conectados pela estrada N:1, com a FK Departamento.</p>
            </div>

            <div class="phase-complete__score">
              <span>Pontuação da fase</span>
              <strong>${state.score} / ${maxScore}</strong>
            </div>

            <div class="phase-complete__actions">
              <button class="btn btn--primary" type="button" data-action="complete-exit" data-focus-key="action:complete-exit">Ver cidade organizada</button>
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

function getTableName(data, tableId) {
  return data.targetTables.find((table) => table.id === tableId)?.name ?? tableId;
}

function formatDeterminant(data, determinant) {
  const labels = determinant.map((attributeId) => getAttributeLabel(data, attributeId));
  return labels.length > 1 ? `(${labels.join(', ')})` : labels[0] ?? '';
}

function formatRelationship(data, relationship) {
  return `${getTableName(data, relationship.fromTable)}.${getAttributeLabel(data, relationship.fromAttribute)} → ${getTableName(data, relationship.toTable)}.${getAttributeLabel(data, relationship.toAttribute)}`;
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
