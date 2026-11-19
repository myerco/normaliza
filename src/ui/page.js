import { avatarNode } from './avatar.js';
import { el } from './dom.js';

export function renderPage(root, { title, eyebrow = 'Cafegeek — Jornada do Conhecimento', player = null, onBack, children, actions = [] }) {
  root.replaceChildren(
    el('div', { class: 'page-card' }, [
      el('header', { class: 'page-header' }, [
        el('button', { class: 'btn btn--ghost btn--small', type: 'button', onclick: onBack }, '← Início'),
        el('div', { class: 'page-header__title' }, [
          el('p', { class: 'panel__phase-label' }, eyebrow),
          el('h1', {}, title)
        ]),
        player
          ? el('div', { class: 'page-header__player' }, [
              avatarNode(player.avatarId, { size: 'sm' }),
              el('span', {}, player.name)
            ])
          : null
      ]),
      children,
      actions.length > 0 ? el('div', { class: 'page-actions' }, actions) : null
    ])
  );
}
