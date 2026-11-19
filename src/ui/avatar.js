import { AVATARS, getAvatar } from '../core/players.js';
import { getActiveImageAssets, getImageAsset } from '../persistence/imageStorage.js';
import { el } from './dom.js';

export function avatarNode(avatarOrId, { size = 'md', className = '' } = {}) {
  const avatar = resolveAvatar(avatarOrId);

  return el(
    'span',
    {
      class: `avatar avatar--${size}${className ? ` ${className}` : ''}`,
      style: `--avatar-color: ${avatar.color}`,
      'aria-hidden': 'true'
    },
    [
      el('span', { class: 'avatar__ring' }),
      avatar.imageUrl
        ? el('img', {
            class: 'avatar__image',
            src: avatar.imageUrl,
            alt: ''
          })
        : el('span', { class: 'avatar__mark' }, avatar.label.slice(0, 1).toLocaleUpperCase('pt-BR'))
    ]
  );
}

export function avatarLabel(avatarOrId) {
  return resolveAvatar(avatarOrId).label;
}

export function createAvatarPicker({ selectedId = AVATARS[0].id, onSelect } = {}) {
  let selected = selectedId;
  const images = getActiveImageAssets();
  const options = (images.length > 0 ? images : AVATARS).map(resolveAvatar);

  const buttonFor = (avatar) => {
    const button = el(
      'button',
      {
        class: `avatar-option${selected === avatar.id ? ' is-selected' : ''}`,
        type: 'button',
        role: 'radio',
        'aria-checked': String(selected === avatar.id),
        'data-avatar-id': avatar.id,
        title: `${avatar.label}: ${avatar.description}`
      },
      [
        avatarNode(avatar, { size: 'md' }),
        el('span', { class: 'avatar-option__label' }, avatar.label),
        el('span', { class: 'avatar-option__description' }, avatar.description)
      ]
    );

    button.addEventListener('click', () => {
      selected = avatar.id;
      for (const option of group.querySelectorAll('[data-avatar-id]')) {
        const active = option.dataset.avatarId === selected;
        option.classList.toggle('is-selected', active);
        option.setAttribute('aria-checked', String(active));
      }
      onSelect?.(selected);
    });

    return button;
  };

  const group = el(
    'div',
    { class: 'avatar-gallery', role: 'radiogroup', 'aria-label': 'Escolha seu avatar' },
    options.map((avatar) => buttonFor(resolveAvatar(avatar)))
  );

  return {
    element: group,
    getSelected: () => selected
  };
}

function resolveAvatar(avatarOrId) {
  if (avatarOrId && typeof avatarOrId === 'object') {
    return {
      id: avatarOrId.id,
      label: avatarOrId.label ?? avatarOrId.name ?? avatarOrId.id,
      description: avatarOrId.description ?? '',
      color: avatarOrId.color ?? '#2a9d8f',
      imageUrl: avatarOrId.imageUrl ?? ''
    };
  }

  const id = String(avatarOrId ?? '');
  const asset = getImageAsset(id);

  if (asset) {
    return {
      id: asset.id,
      label: asset.name,
      description: asset.description,
      color: asset.color,
      imageUrl: asset.imageUrl
    };
  }

  return getAvatar(id);
}
