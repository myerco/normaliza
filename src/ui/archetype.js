import { ARCHETYPES } from '../core/archetypes.js';
import { el } from './dom.js';

export function createArchetypePicker({
  archetypes = ARCHETYPES,
  selectedId = archetypes[0]?.id ?? ARCHETYPES[0].id,
  onSelect
} = {}) {
  let selected = selectedId;

  const buttonFor = (archetype) => {
    const button = el(
      'button',
      {
        class: `archetype-option${selected === archetype.id ? ' is-selected' : ''}`,
        type: 'button',
        role: 'radio',
        'aria-checked': String(selected === archetype.id),
        'data-archetype-id': archetype.id
      },
      [
        el(
          'span',
          {
            class: 'archetype-option__mark',
            style: `--archetype-color: ${archetype.color}`
          },
          archetype.mark ?? archetype.name?.slice(0, 1).toUpperCase() ?? '?'
        ),
        el('span', { class: 'archetype-option__label' }, archetype.name ?? archetype.label),
        el('span', { class: 'archetype-option__description' }, archetype.description)
      ]
    );

    button.addEventListener('click', () => {
      selected = archetype.id;
      for (const option of group.querySelectorAll('[data-archetype-id]')) {
        const active = option.dataset.archetypeId === selected;
        option.classList.toggle('is-selected', active);
        option.setAttribute('aria-checked', String(active));
      }
      onSelect?.(selected);
    });

    return button;
  };

  const group = el(
    'div',
    { class: 'archetype-gallery', role: 'radiogroup', 'aria-label': 'Escolha seu arquétipo' },
    archetypes.map(buttonFor)
  );

  return {
    element: group,
    getSelected: () => selected
  };
}
