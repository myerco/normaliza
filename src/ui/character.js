import { formatPlayerName } from '../core/players.js';
import { getArchetype } from '../core/archetypes.js';
import {
  PROGRESSION_ACHIEVEMENTS,
  levelProgress
} from '../core/progression.js';
import { validateCharacterName } from '../core/characters.js';
import { createArchetypePicker } from './archetype.js';
import { avatarNode, createAvatarPicker } from './avatar.js';
import { el } from './dom.js';
import { renderPage } from './page.js';

export function renderCharacterPage(root, {
  player,
  character,
  catalog = null,
  progression = null,
  notice = '',
  error = '',
  onBack,
  onSave
}) {
  const isNew = !character;
  const allArchetypes = catalog?.archetypes ?? [];
  const activeArchetypes = allArchetypes.filter((item) => item.active);
  const archetypes = activeArchetypes.length > 0 ? activeArchetypes : allArchetypes;
  const currentArchetype = allArchetypes.find((item) => item.id === character?.archetypeId);
  const pickerArchetypes =
    currentArchetype && !archetypes.some((item) => item.id === currentArchetype.id)
      ? [...archetypes, currentArchetype]
      : archetypes;
  const archetype =
    currentArchetype ?? getArchetype(character?.archetypeId ?? pickerArchetypes[0]?.id);
  const attributes = (catalog?.attributes ?? []).filter((attribute) => attribute.active);
  const fallbackValues = catalog?.values?.[character?.archetypeId] ?? {};
  const level = levelProgress(progression?.xp ?? character?.xp ?? 0);
  const earnedAchievements = new Set(progression?.achievements ?? []);
  const historyEntries = [
    ...(progression?.xpHistory ?? []).slice(-5).reverse().map((entry) => ({
      title: `+${entry.amount} XP`,
      detail: entry.reason || 'Experiência recebida'
    })),
    ...(progression?.attributeHistory ?? []).slice(-5).reverse().map((entry) => ({
      title: `+${entry.current - entry.previous}`,
      detail: `${entry.attributeId}: ${entry.previous} → ${entry.current}`
    }))
  ];
  let formError = error;

  const nameInput = el('input', {
    class: 'text-input',
    type: 'text',
    value: character?.name ?? player.name,
    maxlength: '20',
    minlength: '3',
    required: true,
    autocomplete: 'nickname',
    'aria-label': 'Nome do personagem'
  });
  const errorNode = el('p', { class: 'form-error', role: 'alert' }, formError);
  const imagePicker = createAvatarPicker({
    selectedId: character?.imageId ?? player.avatarId,
    onSelect: () => {}
  });
  const archetypePicker = createArchetypePicker({
    archetypes: pickerArchetypes,
    selectedId: character?.archetypeId ?? pickerArchetypes[0]?.id ?? 'engenheiro',
    onSelect: () => {}
  });

  const form = el('form', { class: 'character-edit' }, [
    el('div', { class: 'identity-form__heading' }, [
      el('p', { class: 'panel__phase-label' }, isNew ? 'Novo personagem' : 'Editar personagem'),
      el('h2', {}, isNew ? 'Dê vida ao seu personagem' : 'Ajuste sua ficha'),
      el(
        'p',
        { class: 'panel__note' },
        'Escolha o nome, o retrato e a especialização inicial. Você poderá evoluir outras habilidades depois.'
      )
    ]),
    el('label', { class: 'field-label' }, 'Nome do personagem'),
    nameInput,
    el(
      'p',
      { class: 'field-help' },
      'Entre 3 e 20 caracteres. O nome do personagem pode ser diferente do seu apelido de jogador.'
    ),
    errorNode,
    el('p', { class: 'field-label' }, 'Arquétipo inicial'),
    archetypePicker.element,
    el('p', { class: 'field-label' }, 'Imagem do personagem'),
    imagePicker.element,
    el('p', { class: 'field-help' }, 'A biblioteca completa de imagens será integrada na etapa de acervo visual.'),
    el(
      'button',
      { class: 'btn btn--cafe btn--block', type: 'submit' },
      isNew ? 'Criar personagem' : 'Salvar personagem'
    )
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const validation = validateCharacterName(nameInput.value, {
      existingNames: [],
      currentName: character?.name ?? null
    });

    if (!validation.valid) {
      formError = validation.errors[0];
      errorNode.textContent = formError;
      nameInput.setAttribute('aria-invalid', 'true');
      nameInput.focus();
      return;
    }

    errorNode.textContent = '';
    nameInput.removeAttribute('aria-invalid');
    onSave?.({
      name: validation.name,
      imageId: imagePicker.getSelected(),
      archetypeId: archetypePicker.getSelected()
    });
  });

  renderPage(root, {
    title: isNew ? 'Criar personagem' : 'Meu personagem',
    eyebrow: 'Cafegeek — Jornada do Conhecimento',
    player,
    onBack,
    children: el('div', { class: `character-page${isNew ? ' is-create' : ''}` }, [
      character
        ? el('section', { class: 'character-card' }, [
            el('div', { class: 'character-card__head' }, [
              avatarNode(character.imageId, { size: 'xl' }),
              el('div', { class: 'character-card__identity' }, [
                el('p', { class: 'panel__phase-label' }, 'Personagem'),
                el('h2', {}, character.name),
                el(
                  'p',
                  { class: 'character-card__meta' },
                  `${archetype.name ?? archetype.label} · Nível ${level.level} · ${level.title}`
                )
              ]),
              el(
                'button',
                { class: 'btn btn--ghost btn--small', type: 'button', onclick: onBack },
                'Voltar à jornada'
              )
            ]),
            el('div', { class: 'character-card__stats' }, [
              characterStat('Jogador', formatPlayerName(player.name)),
              characterStat('Arquétipo', archetype.name ?? archetype.label),
              characterStat('XP', `${level.xp} XP`),
              characterStat('Nível', `${level.level}`)
            ]),
            el('div', { class: 'character-level' }, [
              el('div', { class: 'character-level__head' }, [
                el('span', {}, `Nível ${level.level} · ${level.title}`),
                el(
                  'strong',
                  {},
                  level.nextLevel
                    ? `${level.totalToNext} XP para o nível ${level.nextLevel}`
                    : 'Nível máximo'
                )
              ]),
              el('span', { class: 'platform-level__track' }, [
                el('span', {
                  class: 'platform-level__fill',
                  style: `width: ${level.percent}%`
                })
              ])
            ]),
            el('p', { class: 'character-card__description' }, archetype.description),
            el('div', { class: 'character-attributes' }, [
              el('p', { class: 'panel__phase-label' }, 'Atributos atuais'),
              el(
                'div',
                { class: 'character-attribute-grid' },
                attributes.length > 0
                  ? attributes.map((attribute) => {
                      const entry = progression?.attributes?.[attribute.id];
                      const value = entry?.current ?? fallbackValues[attribute.id] ?? 1;
                      const initial = entry?.initial ?? value;
                      return el('div', {
                        class: 'character-attribute',
                        title: `Inicial: ${initial}`
                      }, [
                        el(
                          'span',
                          {
                            class: 'character-attribute__icon',
                            style: `--attribute-color: ${attribute.color ?? '#2a9d8f'}`
                          },
                          attribute.icon ?? attribute.name.slice(0, 2).toUpperCase()
                        ),
                        el('div', { class: 'character-attribute__copy' }, [
                          el('strong', {}, attribute.name),
                          el('span', {}, `${value} / 10`)
                        ]),
                        el('span', {
                          class: 'character-attribute__bar',
                          style: `--attribute-value: ${value * 10}%`
                        })
                      ]);
                    })
                  : [el('p', { class: 'panel__note' }, 'Nenhum atributo ativo cadastrado.')]
              )
            ]),
            el('div', { class: 'character-achievements' }, [
              el('p', { class: 'panel__phase-label' }, 'Conquistas do personagem'),
              el(
                'div',
                { class: 'character-achievement-grid' },
                PROGRESSION_ACHIEVEMENTS.map((achievement) => {
                  const earned = earnedAchievements.has(achievement.id);
                  return el(
                    'div',
                    {
                      class: `character-achievement${earned ? ' is-earned' : ' is-locked'}`
                    },
                    [
                      el('strong', {}, achievement.title),
                      el('span', {}, earned ? 'Conquistada' : 'Bloqueada'),
                      el('p', {}, achievement.description)
                    ]
                  );
                })
              )
            ]),
            el('div', { class: 'character-history' }, [
              el('p', { class: 'panel__phase-label' }, 'Histórico recente'),
              el(
                'ul',
                { class: 'character-history__list' },
                historyEntries.length > 0
                  ? historyEntries.map((entry) =>
                      el('li', {}, [
                        el('strong', {}, entry.title),
                        el('span', {}, entry.detail)
                      ])
                    )
                  : [el('li', {}, 'Nenhuma evolução registrada ainda.')]
              )
            ])
          ])
        : null,
      notice ? el('p', { class: 'form-success', role: 'status' }, notice) : null,
      form
    ])
  });
}

function characterStat(label, value) {
  return el('div', { class: 'character-stat' }, [
    el('span', {}, label),
    el('strong', {}, value)
  ]);
}
