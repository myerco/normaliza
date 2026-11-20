import { levelProgress } from '../core/progression.js';
import { avatarNode } from './avatar.js';
import { el } from './dom.js';

const LOGO = './assets/images/branding/cafegeek-logo.webp';

export const PLAYER_NAV_ITEMS = Object.freeze([
  { id: 'characters', label: 'Personagens', href: '#/jogador' },
  { id: 'world', label: 'Mapa do Mundo', href: '#/mapa' },
  { id: 'challenges', label: 'Desafios', href: '#/desafios' },
  { id: 'missions', label: 'Missões', href: '#/missoes' },
  { id: 'talents', label: 'Talentos', href: '#/habilidades' },
  { id: 'settings', label: 'Configurações', href: '#/perfil' }
]);

const PRIVATE_FRAME_SCREENS = new Set([
  'character',
  'profile',
  'worldMap',
  'territory',
  'track',
  'questDetail',
  'skills',
  'specializations',
  'challenges',
  'achievements',
  'ranking'
]);

export function renderPlayerNavigation({
  active = 'characters',
  player,
  character = null,
  onLogout
}) {
  const level = levelProgress(character?.xp ?? player?.level ?? 0);
  const imageId = character?.imageId ?? player?.avatarId;
  const name = character?.name ?? player?.name ?? 'Jogador';

  return el('header', { class: 'rpg-topbar' }, [
    el('a', { class: 'rpg-brand', href: '#/jogador', 'aria-label': 'Cafegeek, início da jornada' }, [
      el('img', { class: 'rpg-brand__logo', src: LOGO, alt: '' }),
      el('span', { class: 'rpg-brand__copy' }, [
        el('strong', {}, 'Cafegeek'),
        el('small', {}, 'Jornada do Conhecimento')
      ])
    ]),
    el('nav', { class: 'rpg-nav', 'aria-label': 'Navegação do jogador' },
      PLAYER_NAV_ITEMS.map((item) =>
        el('a', {
          class: `rpg-nav__item${active === item.id ? ' is-active' : ''}`,
          href: item.href,
          'aria-current': active === item.id ? 'page' : null
        }, item.label)
      )
    ),
    el('div', { class: 'rpg-account' }, [
      el('div', { class: 'rpg-account__level', 'aria-label': `Nível ${level.level}, ${level.title}` }, [
        el('span', {}, 'Nível'),
        el('strong', {}, String(level.level))
      ]),
      el('div', { class: 'rpg-account__identity' }, [
        avatarNode(imageId, { size: 'sm' }),
        el('span', {}, [
          el('strong', {}, name),
          el('small', {}, level.title)
        ])
      ]),
      el('button', {
        class: 'rpg-account__logout',
        type: 'button',
        onclick: onLogout
      }, 'Sair')
    ])
  ]);
}

export function mountPlayerPageFrame(root, {
  active = 'characters',
  player,
  character = null,
  onLogout
}) {
  const content = el('div', { class: 'rpg-page-content' });

  root.classList.add('page-shell--player');
  root.replaceChildren(
    el('div', { class: 'rpg-page' }, [
      renderPlayerNavigation({ active, player, character, onLogout }),
      content
    ])
  );

  return content;
}

export function resetPlayerPageFrame(root) {
  root.classList.remove('page-shell--player');
}

export function isPrivatePlayerScreen(screen) {
  return PRIVATE_FRAME_SCREENS.has(screen);
}

export function playerSectionFor(screen, hash = '') {
  if (screen === 'journey' || screen === 'character') {
    return 'characters';
  }

  if (['worldMap', 'territory', 'track', 'questDetail'].includes(screen)) {
    return 'world';
  }

  if (screen === 'challenges') {
    return hash === '#/missoes' ? 'missions' : 'challenges';
  }

  if (['skills', 'specializations'].includes(screen)) {
    return 'talents';
  }

  if (screen === 'profile') {
    return 'settings';
  }

  return '';
}
