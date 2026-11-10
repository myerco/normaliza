import { el } from './dom.js';

const CONTEXT_LABELS = {
  general: 'Geral',
  phase1: 'Fase 1 — Centro de Distribuição',
  phase2: 'Fase 2 — Rede de Dependências',
  phase3: 'Fase 3 — Cidade Organizada',
  mission: 'Missão especial — Administração da Cidade'
};

export function openHelp({ glossary, tips, context = 'general' }) {
  const root = document.getElementById('help-root');
  if (!root || root.childElementCount > 0) {
    return;
  }

  const previousFocus = document.activeElement;
  let activeTab = 'tips';
  let dialog = null;
  let content = null;

  dialog = el(
    'div',
    {
      class: 'modal__dialog help-dialog',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'help-title',
      tabindex: '-1'
    },
    [
      el('header', { class: 'panel__header' }, [
        el('div', {}, [
          el('p', { class: 'panel__eyebrow' }, 'Consulta rápida'),
          el('h2', { class: 'modal__title', id: 'help-title' }, 'Ajuda, dicas e glossário')
        ]),
        el(
          'button',
          {
            class: 'icon-button',
            type: 'button',
            'aria-label': 'Fechar ajuda',
            onclick: close
          },
          '×'
        )
      ]),
      el('div', { class: 'help-tabs', role: 'tablist', 'aria-label': 'Conteúdo da ajuda' }, [
        tabButton('tips', 'Dicas'),
        tabButton('glossary', 'Glossário')
      ]),
      el('div', { class: 'help-content' })
    ]
  );

  content = dialog.querySelector('.help-content');
  const overlay = el('div', { class: 'modal', role: 'presentation' }, [dialog]);
  root.replaceChildren(overlay);
  document.addEventListener('keydown', onKeydown, true);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      close();
    }
  });

  renderContent();
  requestAnimationFrame(() => dialog.focus());

  function tabButton(tab, label) {
    const button = el(
      'button',
      {
        class: `help-tab${activeTab === tab ? ' is-active' : ''}`,
        type: 'button',
        role: 'tab',
        'aria-selected': String(activeTab === tab),
        'data-help-tab': tab
      },
      label
    );
    button.addEventListener('click', () => {
      activeTab = tab;
      for (const tabElement of dialog.querySelectorAll('[data-help-tab]')) {
        const active = tabElement.dataset.helpTab === activeTab;
        tabElement.classList.toggle('is-active', active);
        tabElement.setAttribute('aria-selected', String(active));
      }
      renderContent();
    });
    return button;
  }

  function renderContent() {
    content.replaceChildren(activeTab === 'tips' ? renderTips() : renderGlossary());
  }

  function renderTips() {
    const entries = Object.entries(tips || {});
    entries.sort(([first], [second]) => {
      if (first === context) return -1;
      if (second === context) return 1;
      return 0;
    });

    return el(
      'div',
      { class: 'help-tips' },
      entries.map(([key, items]) =>
        el(
          'details',
          { class: `help-tip-group${key === context ? ' is-current' : ''}`, open: key === context },
          [
            el('summary', {}, [
              el('span', {}, CONTEXT_LABELS[key] || key),
              key === context ? el('span', { class: 'help-current-tag' }, 'contexto atual') : null
            ]),
            el(
              'ul',
              { class: 'help-tip-list' },
              (items || []).map((item) => el('li', {}, item))
            )
          ]
        )
      )
    );
  }

  function renderGlossary() {
    const concepts = Array.isArray(glossary?.concepts) ? glossary.concepts : [];

    return el(
      'div',
      { class: 'help-glossary' },
      concepts.map((concept) =>
        el('article', { class: 'glossary-card' }, [
          el('div', { class: 'glossary-card__head' }, [
            el('h3', {}, concept.title),
            el('span', { class: 'glossary-card__tag' }, concept.category)
          ]),
          el('p', { class: 'glossary-card__definition' }, concept.definition),
          el('p', { class: 'glossary-card__example' }, concept.example)
        ])
      )
    );
  }

  function close() {
    document.removeEventListener('keydown', onKeydown, true);
    root.replaceChildren();
    if (previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus();
    }
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusable = [
      ...dialog.querySelectorAll(
        'button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'
      )
    ].filter((node) => !node.disabled);

    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
