import { el } from './dom.js';

export function openInstructions() {
  const root = document.getElementById('instructions-root');
  if (!root || root.childElementCount > 0) {
    return;
  }

  const previousFocus = document.activeElement;

  const dialog = el(
    'div',
    {
      class: 'modal__dialog',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'instructions-title',
      tabindex: '-1'
    },
    [
      el('header', { class: 'panel__header' }, [
        el('div', {}, [
          el('p', { class: 'panel__eyebrow' }, 'Manual rápido'),
          el('h2', { class: 'modal__title', id: 'instructions-title' }, 'Como jogar')
        ]),
        el(
          'button',
          {
            class: 'icon-button',
            type: 'button',
            'aria-label': 'Fechar instruções',
            onclick: close
          },
          '×'
        )
      ]),
      el(
        'p',
        { class: 'modal__text' },
        'NORMALIZA! transforma a normalização de dados em uma cidade. Cada edifício representa uma tabela; as ruas mostram como as tabelas se relacionam.'
      ),
      el('h3', { class: 'modal__subtitle' }, 'Controles'),
      el('ul', { class: 'modal__list' }, [
        el('li', {}, [
          el('strong', {}, 'Mouse ou toque: '),
          'selecione um edifício para abrir o painel de informações.'
        ]),
        el('li', {}, [
          el('strong', {}, 'Teclado: '),
          'use Tab para percorrer a cidade, Enter ou Espaço para selecionar e Escape para fechar o painel.'
        ]),
        el('li', {}, [
          el('strong', {}, 'Atalhos: '),
          'os botões PEDIDO, PRODUTO e CLIENTE no painel também abrem cada edifício.'
        ])
      ]),
      el('h3', { class: 'modal__subtitle' }, 'Fase 1 — Centro de Distribuição'),
      el(
        'p',
        { class: 'modal__text' },
        'Selecione o edifício PEDIDO e entre no Centro de Distribuição. Lá, separe cada produto agrupado em uma linha de ITEM_PEDIDO, mantendo o id_pedido.'
      ),
      el('ul', { class: 'modal__list' }, [
        el('li', {}, [
          el('strong', {}, 'Objetivo: '),
          'eliminar grupos repetitivos e garantir que cada célula tenha um valor atômico.'
        ]),
        el('li', {}, [
          el('strong', {}, 'Validação: '),
          'confira se todos os produtos foram separados e se cada linha preserva o pedido.'
        ]),
        el('li', {}, [
          el('strong', {}, 'Fase 2: '),
          'selecione o edifício PRODUTO e entre na Rede de Dependências para identificar dependências totais e parciais e decompor ITEM_PEDIDO.'
        ]),
        el('li', {}, [
          el('strong', {}, 'Fase 3: '),
          'selecione o edifício FUNCIONÁRIO e entre em Cidade Organizada para identificar a dependência transitiva, construir FUNCIONÁRIO e DEPARTAMENTO e criar a FK e o relacionamento.'
        ]),
        el('li', {}, [
          el('strong', {}, 'Missão especial: '),
          'no painel da cidade, abra Administração da Cidade para demonstrar anomalias de atualização, inserção e exclusão.'
        ]),
        el('li', {}, [
          el('strong', {}, 'Próximas fases: '),
          'formas normais avançadas.'
        ])
      ]),
      el('div', { class: 'modal__actions' }, [
        el('button', { class: 'btn btn--primary', type: 'button', onclick: close }, 'Entendi')
      ])
    ]
  );

  const overlay = el('div', { class: 'modal', role: 'presentation' }, [dialog]);
  root.replaceChildren(overlay);
  document.addEventListener('keydown', onKeydown, true);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      close();
    }
  });

  requestAnimationFrame(() => dialog.focus());

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
      event.stopPropagation();
      close();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusable = [
      ...dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
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
