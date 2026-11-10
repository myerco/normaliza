import { el } from './dom.js';

export function updateHudScore(root, score) {
  const value = root.querySelector('.hud__score-value');

  if (value) {
    value.textContent = `${score} pts`;
  }
}

export function updateHudPhase(root, { eyebrow, label }) {
  const phase = root.querySelector('.hud__phase');

  if (!phase) {
    return;
  }

  const eyebrowElement = phase.querySelector('.hud__label');
  const labelElement = phase.querySelector('.hud__phase-name');

  if (eyebrowElement && eyebrow) {
    eyebrowElement.textContent = eyebrow;
  }

  if (labelElement && label) {
    labelElement.textContent = label;
  }
}

export function renderHud(root, hud, { onMenu } = {}) {
  root.replaceChildren(
    el('div', { class: 'hud__brand' }, [
      el('span', { class: 'hud__logo' }, 'NORMALIZA!'),
      el('span', { class: 'hud__tagline' }, 'Cidade dos dados')
    ]),
    el('div', { class: 'hud__phase' }, [
      el('span', { class: 'hud__label' }, 'Fase'),
      el('strong', { class: 'hud__phase-name' }, hud.phaseLabel)
    ]),
    el('div', { class: 'hud__score', 'aria-live': 'polite' }, [
      el('span', { class: 'hud__label' }, 'Pontuação'),
      el('strong', { class: 'hud__score-value' }, `${hud.score} pts`)
    ]),
    el(
      'button',
      {
        id: 'btn-menu',
        class: 'btn btn--small btn--ghost hud__menu',
        type: 'button',
        onclick: onMenu
      },
      'Menu'
    )
  );
}
