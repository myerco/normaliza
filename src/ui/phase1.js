import {
  applyValidation,
  getExpectedCounts,
  getItemRows,
  getOrderProgress,
  getPedidoRows,
  hydratePhaseState,
  isProductMoved,
  moveProduct,
  moveSelectedProducts,
  productKey,
  resetPhaseState,
  selectAllPending,
  toSnapshot,
  toggleProductSelection,
  useHint,
  validatePhase
} from '../core/fase1.js';

export function createPhase1({
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
    root.addEventListener('dragstart', handleDragStart);
    root.addEventListener('dragover', handleDragOver);
    root.addEventListener('dragleave', handleDragLeave);
    root.addEventListener('drop', handleDrop);
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
      handleAction(actionElement.dataset.action);
      return;
    }

    const chip = event.target.closest('.product-chip');

    if (chip && root.contains(chip) && !chip.disabled) {
      state = toggleProductSelection(state, data, chip.dataset.orderId, chip.dataset.product);
      render();
    }
  }

  function handleAction(action) {
    switch (action) {
      case 'exit':
        onExit?.();
        break;

      case 'reset':
        reset();
        break;

      case 'move':
        commit(moveSelectedProducts(state, data));
        break;

      case 'select-all':
        state = selectAllPending(state, data);
        render();
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

  function handleDragStart(event) {
    const chip = event.target.closest('.product-chip');

    if (!chip || chip.disabled) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.setData(
      'text/plain',
      JSON.stringify({
        orderId: chip.dataset.orderId,
        product: chip.dataset.product
      })
    );
    event.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(event) {
    const zone = event.target.closest('[data-dropzone]');

    if (!zone) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    zone.classList.add('is-dragover');
  }

  function handleDragLeave(event) {
    const zone = event.target.closest('[data-dropzone]');
    zone?.classList.remove('is-dragover');
  }

  function handleDrop(event) {
    const zone = event.target.closest('[data-dropzone]');

    if (!zone) {
      return;
    }

    event.preventDefault();
    zone.classList.remove('is-dragover');

    let payload;

    try {
      payload = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch {
      return;
    }

    if (
      !payload ||
      typeof payload.orderId !== 'string' ||
      typeof payload.product !== 'string'
    ) {
      return;
    }

    const nextState = moveProduct(state, data, payload.orderId, payload.product);

    if (nextState !== state) {
      commit(nextState);
    }
  }

  function phaseHtml() {
    const counts = getExpectedCounts(data);
    const maxScore = getMaxScore();
    const pendingCount = counts.items - state.items.length;
    const hintsLeft = data.hints.length - state.revealedHints;

    return `
      <div class="phase-shell" ${state.completed ? 'inert aria-hidden="true"' : ''}>
        <header class="phase-header">
          <button class="btn btn--ghost btn--small" type="button" data-action="exit" data-focus-key="action:exit">← Cidade</button>
          <div class="phase-heading">
            <p class="phase-eyebrow">Fase 1 · ${escapeHtml(data.normalForm)} · ${escapeHtml(data.sourceTable)}</p>
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
            <h3>Grupos repetitivos</h3>
            <p>${escapeHtml(data.concepts.repeatingGroups)}</p>
          </article>
          <article class="concept-card">
            <span class="concept-card__tag">Conceito</span>
            <h3>Atomicidade</h3>
            <p>${escapeHtml(data.concepts.atomicity)}</p>
          </article>
          <article class="concept-card">
            <span class="concept-card__tag">Missão</span>
            <h3>Centro de distribuição</h3>
            <p>Separe os ${counts.items} produtos das ${counts.orders} caixas em ${escapeHtml(data.targetTable)}, mantendo o id_pedido em cada linha.</p>
          </article>
        </div>

        <details class="phase-rules">
          <summary>Regras desta fase</summary>
          <ul>${data.rules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join('')}</ul>
        </details>

        <div class="phase-workspace">
          <section class="phase-incoming" aria-labelledby="phase-incoming-title">
            <div class="phase-section-head">
              <h2 id="phase-incoming-title">Caixas recebidas</h2>
              <span class="phase-count">PEDIDO · ${counts.orders} pedidos · ${counts.items} produtos</span>
            </div>
            <p class="phase-help">Os registros chegaram agrupados. Selecione os produtos e envie cada um para ${escapeHtml(data.targetTable)}.</p>
            <div class="order-grid">
              ${data.orders.map(renderOrderBox).join('')}
            </div>
          </section>

          <section class="phase-output" aria-label="Mesas de saída">
            ${renderPedidoTable()}
            ${renderItemTable()}
            ${renderActions(pendingCount, hintsLeft)}
            <div class="phase-feedback-slot" aria-live="polite">
              ${renderFeedback()}
            </div>
          </section>
        </div>
      </div>
      ${state.completed ? renderCompletion(maxScore) : ''}
    `;
  }

  function renderOrderBox(order) {
    const progress = getOrderProgress(state, data, order.id);
    const percent = progress.total > 0 ? Math.round((progress.moved / progress.total) * 100) : 0;

    const chips = order.products
      .map((product) => {
        const moved = isProductMoved(state, order.id, product);
        const selected = state.selected.includes(productKey(order.id, product));
        const classes = ['product-chip'];

        if (moved) {
          classes.push('is-moved');
        }
        if (selected) {
          classes.push('is-selected');
        }

        const status = moved ? 'separado' : selected ? 'selecionado' : 'agrupado';
        const ariaLabel = moved
          ? `${product} já separado do pedido ${order.id}`
          : `Selecionar ${product} do pedido ${order.id}`;

        return `
          <button
            class="${classes.join(' ')}"
            type="button"
            data-order-id="${escapeHtml(order.id)}"
            data-product="${escapeHtml(product)}"
            data-focus-key="chip:${escapeHtml(order.id)}:${escapeHtml(product)}"
            aria-pressed="${selected}"
            aria-label="${escapeHtml(ariaLabel)}"
            ${moved ? 'disabled' : 'draggable="true"'}
          >
            <span class="product-chip__name">${escapeHtml(product)}</span>
            <span class="product-chip__state">${status}</span>
          </button>
        `;
      })
      .join('');

    return `
      <article class="order-box${progress.complete ? ' is-complete' : ''}" data-order-id="${escapeHtml(order.id)}">
        <header class="order-box__header">
          <span class="order-id">${escapeHtml(order.id)}</span>
          <strong class="order-customer">${escapeHtml(order.customer)}</strong>
          <span class="order-progress">${progress.moved}/${progress.total} separados</span>
        </header>
        <p class="order-box__original">
          <span>Registro recebido</span>
          <code>${escapeHtml(order.id)} | ${escapeHtml(order.customer)} | ${escapeHtml(order.products.join(', '))}</code>
        </p>
        <div class="product-chips" role="group" aria-label="Produtos do pedido ${escapeHtml(order.id)}">
          ${chips}
        </div>
        <div class="order-progress-bar" aria-hidden="true">
          <span class="order-progress-bar__fill" style="width: ${percent}%"></span>
        </div>
        <footer class="order-box__footer">
          <span>${progress.complete ? 'Pedido pronto para PEDIDO' : 'Produtos agrupados'}</span>
          <span>${progress.complete ? '✓ separado' : `${progress.pending} pendente(s)`}</span>
        </footer>
      </article>
    `;
  }

  function renderPedidoTable() {
    const rows = getPedidoRows(state, data);
    const body = rows.length
      ? rows
          .map(
            (row) => `
              <tr>
                <td>${escapeHtml(row.id_pedido)}</td>
                <td>${escapeHtml(row.cliente)}</td>
              </tr>
            `
          )
          .join('')
      : `<tr class="empty-row"><td colspan="2">Ainda não há pedidos totalmente separados.</td></tr>`;

    return `
      <article class="data-table-card">
        <header class="data-table-card__head">
          <h3>${escapeHtml(data.sourceTable)}</h3>
          <span class="table-badge">sem listas</span>
        </header>
        <table class="data-table">
          <thead>
            <tr><th>id_pedido</th><th>cliente</th></tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </article>
    `;
  }

  function renderItemTable() {
    const rows = getItemRows(state, data);
    const body = rows.length
      ? rows
          .map(
            (row) => `
              <tr>
                <td>${escapeHtml(row.id_pedido)}</td>
                <td>${escapeHtml(row.produto)}</td>
              </tr>
            `
          )
          .join('')
      : `<tr class="empty-row"><td colspan="2">Nenhum item separado ainda.</td></tr>`;

    return `
      <article class="data-table-card data-table-card--drop" data-dropzone="item-pedido">
        <header class="data-table-card__head">
          <h3>${escapeHtml(data.targetTable)}</h3>
          <span class="table-badge table-badge--new">nova tabela</span>
        </header>
        <table class="data-table">
          <thead>
            <tr><th>id_pedido</th><th>produto</th></tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
        <p class="drop-hint">Arraste um produto para esta tabela ou use “Mover selecionados”.</p>
      </article>
    `;
  }

  function renderActions(pendingCount, hintsLeft) {
    const selectedCount = state.selected.length;

    return `
      <div class="phase-actions">
        <button class="btn btn--primary" type="button" data-action="move" data-focus-key="action:move" ${selectedCount === 0 ? 'disabled' : ''}>
          Mover selecionados${selectedCount > 0 ? ` (${selectedCount})` : ''}
        </button>
        <button class="btn btn--ghost" type="button" data-action="validate" data-focus-key="action:validate">Validar separação</button>
        <button class="btn btn--ghost" type="button" data-action="select-all" data-focus-key="action:select-all" ${pendingCount === 0 ? 'disabled' : ''}>Selecionar pendentes</button>
        <button class="btn btn--ghost" type="button" data-action="hint" data-focus-key="action:hint" ${hintsLeft <= 0 ? 'disabled' : ''}>Dica${hintsLeft > 0 ? ` (${hintsLeft})` : ''}</button>
      </div>
    `;
  }

  function renderFeedback() {
    const feedback = state.feedback;

    if (!feedback) {
      return `
        <div class="phase-feedback phase-feedback--neutral">
          <h3>Pronto para começar?</h3>
          <p>Selecione os produtos agrupados, mova cada um para ${escapeHtml(data.targetTable)} e valide a separação.</p>
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

    const errors = feedback.errors
      .map(
        (error) =>
          `<li><strong>${escapeHtml(error.title)}:</strong> ${escapeHtml(error.message)}</li>`
      )
      .join('');

    const pending = feedback.pending.length
      ? `
        <div class="feedback-block">
          <p class="feedback-block__title">Produtos esquecidos</p>
          <ul class="feedback-pending">
            ${feedback.pending
              .map(
                (item) =>
                  `<li><strong>${escapeHtml(item.orderId)}</strong> ${escapeHtml(item.product)}</li>`
              )
              .join('')}
          </ul>
        </div>
      `
      : '';

    return `
      <div class="phase-feedback phase-feedback--error">
        <h3>${escapeHtml(feedback.title)}</h3>
        <p>${escapeHtml(feedback.message)}</p>
        <ul>${errors}</ul>
        ${pending}
        <p class="feedback-concept">${escapeHtml(feedback.concept)}</p>
      </div>
    `;
  }

  function renderScoreRules(maxScore) {
    const scoring = data.scoring;

    return `
      <details class="score-rules">
        <summary>Como a pontuação funciona</summary>
        <p>+${scoring.pointsPerItem} por produto separado · +${scoring.completionBonus} ao concluir · −${scoring.wrongValidationPenalty} por validação incorreta · −${scoring.hintPenalty} por dica. Máximo: ${maxScore} pontos.</p>
      </details>
    `;
  }

  function renderCompletion(maxScore) {
    const example = data.orders[0];
    const exampleBefore = `${example.id} | ${example.customer} | ${example.products.join(', ')}`;
    const exampleAfter = [
      `PEDIDO: ${example.id} | ${example.customer}`,
      ...example.products.map((product) => `ITEM_PEDIDO: ${example.id} | ${product}`)
    ];

    return `
      <div class="phase-complete" role="dialog" aria-modal="true" aria-labelledby="phase-complete-title">
        <div class="phase-complete__card">
          <div class="phase-complete__scene">
            ${evolutionBuildingSvg()}
            <p class="phase-complete__building-label">PEDIDO · 1FN</p>
          </div>
          <div class="phase-complete__content">
            <p class="phase-eyebrow">Fase concluída</p>
            <h2 id="phase-complete-title">Centro de distribuição organizado!</h2>
            <p>Os produtos foram separados em registros individuais e cada linha de ITEM_PEDIDO manteve o id_pedido.</p>

            <div class="phase-complete__concepts">
              <article>
                <h3>Atomicidade</h3>
                <p>${escapeHtml(data.concepts.atomicity)}</p>
              </article>
              <article>
                <h3>Grupos repetitivos</h3>
                <p>${escapeHtml(data.concepts.repeatingGroups)}</p>
              </article>
            </div>

            <div class="phase-complete__diagram">
              <div class="evolution-diagram__before">
                <span>Antes</span>
                <code>${escapeHtml(exampleBefore)}</code>
              </div>
              <span class="evolution-diagram__arrow" aria-hidden="true">→</span>
              <div class="evolution-diagram__after">
                <span>Depois</span>
                ${exampleAfter.map((line) => `<code>${escapeHtml(line)}</code>`).join('')}
              </div>
            </div>

            <div class="phase-complete__score">
              <span>Pontuação da fase</span>
              <strong>${state.score} / ${maxScore}</strong>
            </div>

            <div class="phase-complete__actions">
              <button class="btn btn--primary" type="button" data-action="complete-exit" data-focus-key="action:complete-exit">Ver cidade evoluída</button>
              <button class="btn btn--ghost" type="button" data-action="complete-reset" data-focus-key="action:complete-reset">Jogar de novo</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function evolutionBuildingSvg() {
    return `
      <svg class="evolution-building" viewBox="0 0 260 230" role="img" aria-label="Edifício PEDIDO evoluído com um selo 1FN">
        <ellipse class="evolution-building__shadow" cx="130" cy="208" rx="88" ry="18"></ellipse>
        <polygon class="evolution-building__top" points="130,62 208,100 130,138 52,100"></polygon>
        <polygon class="evolution-building__left" points="52,100 130,138 130,202 52,164"></polygon>
        <polygon class="evolution-building__right" points="208,100 130,138 130,202 208,164"></polygon>
        <polygon class="evolution-building__roof" points="130,76 184,102 130,128 76,102"></polygon>
        <polygon class="evolution-building__roof-inner" points="130,90 164,106 130,122 96,106"></polygon>
        <line class="evolution-building__pole" x1="130" y1="90" x2="130" y2="34"></line>
        <polygon class="evolution-building__flag" points="130,34 174,46 130,58"></polygon>
        <polygon class="evolution-building__window" points="192.4,131.6 184.6,135.4 184.6,123.4 192.4,119.6"></polygon>
        <polygon class="evolution-building__window" points="169,143 161.2,146.8 161.2,134.8 169,131"></polygon>
        <polygon class="evolution-building__door" points="180.7,177.3 169,183 169,165 180.7,159.3"></polygon>
        <g class="evolution-building__badge">
          <rect x="172" y="142" width="64" height="28" rx="9"></rect>
          <text x="204" y="157" text-anchor="middle">1FN</text>
        </g>
      </svg>
    `;
  }

  function getMaxScore() {
    const counts = getExpectedCounts(data);
    return Number.isFinite(data.scoring.max)
      ? data.scoring.max
      : counts.items * data.scoring.pointsPerItem + data.scoring.completionBonus;
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
