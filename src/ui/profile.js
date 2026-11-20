import {
  AVATARS,
  formatPlayerName,
  validatePlayerName
} from '../core/players.js';
import { getArchetype } from '../core/archetypes.js';
import { formatLastActivity } from '../core/profile.js';
import { professionAffinities } from '../core/world.js';
import { avatarNode, createAvatarPicker } from './avatar.js';
import { el } from './dom.js';
import { renderPage } from './page.js';

export function renderProfilePage(root, {
  player,
  character = null,
  catalog = null,
  world = null,
  progression = null,
  summary,
  achievements = [],
  history = [],
  profiles = [],
  notice = '',
  onBack,
  onSave,
  onOpenCharacter,
  onOpenAdmin,
  onOpenSkills,
  onOpenSpecializations,
  onSwitch,
  onOpenRanking
}) {
  let error = '';
  const nameInput = el('input', {
    class: 'text-input',
    type: 'text',
    value: player.name,
    maxlength: '20',
    minlength: '3',
    required: true,
    autocomplete: 'nickname',
    'aria-label': 'Nome ou apelido'
  });
  const errorNode = el('p', { class: 'form-error', role: 'alert' });
  const bioInput = el('textarea', {
    class: 'text-area',
    rows: '3',
    maxlength: '280',
    'aria-label': 'Biografia'
  });
  bioInput.value = player.bio ?? '';
  const picker = createAvatarPicker({
    selectedId: player.avatarId,
    onSelect: () => {}
  });
  const form = el('form', { class: 'profile-edit' }, [
    el('h2', {}, 'Editar perfil'),
    el('label', { class: 'field-label' }, 'Nome ou apelido'),
    nameInput,
    el('p', { class: 'field-help' }, 'Entre 3 e 20 caracteres; nome único neste navegador.'),
    errorNode,
    el('label', { class: 'field-label' }, 'Biografia'),
    bioInput,
    el('p', { class: 'field-label' }, 'Imagem do jogador'),
    picker.element,
    el('button', { class: 'btn btn--primary', type: 'submit' }, 'Salvar perfil')
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const validation = validatePlayerName(nameInput.value, {
      existingNames: profiles.filter((candidate) => candidate.id !== player.id).map((candidate) => candidate.name),
      currentName: player.name
    });

    if (!validation.valid) {
      error = validation.errors[0];
      errorNode.textContent = error;
      nameInput.setAttribute('aria-invalid', 'true');
      nameInput.focus();
      return;
    }

    errorNode.textContent = '';
    nameInput.removeAttribute('aria-invalid');
    onSave?.({
      name: validation.name,
      bio: bioInput.value,
      avatarId: picker.getSelected()
    });
  });

  const earned = achievements.filter((achievement) => achievement.earned);
  const archetype = character
    ? catalog?.archetypes?.find((item) => item.id === character.archetypeId) ??
      getArchetype(character.archetypeId)
    : null;
  const affinities = world ? professionAffinities(world, progression).slice(0, 3) : [];

  renderPage(root, {
    title: 'Meu Perfil',
    eyebrow: 'Jogador',
    player,
    onBack,
    children: el('div', { class: 'profile-layout' }, [
      el('section', { class: 'profile-card' }, [
        el('div', { class: 'profile-card__head' }, [
          avatarNode(player.avatarId, { size: 'xl' }),
          el('div', {}, [
            el('p', { class: 'panel__phase-label' }, 'Construtor da cidade'),
            el('h2', {}, formatPlayerName(player.name)),
            character
              ? el(
                  'p',
                  { class: 'profile-character' },
                  `Personagem: ${character.name} · ${archetype.name ?? archetype.label}`
                )
              : el('p', { class: 'profile-character' }, 'Personagem ainda não criado.'),
            player.bio
              ? el('p', { class: 'profile-bio' }, player.bio)
              : null,
            el('p', { class: 'panel__note' }, `Última atividade: ${formatLastActivity(player.lastActivityAt)}`)
          ])
        ]),
        el('div', { class: 'profile-stats' }, [
          stat('Pontuação total', `${summary.totalScore} pts`),
          stat('Fases concluídas', `${summary.completedPhases} / ${summary.totalPhases}`),
          stat('Posição', summary.rank ? `#${summary.rank}` : 'Não ranqueado'),
          stat('Conquistas', `${earned.length}`)
        ]),
        el('div', { class: 'profile-medals' }, [
          el('p', { class: 'panel__phase-label' }, 'Medalhas'),
          summary.medals.length > 0
            ? el(
                'div',
                { class: 'home-medals' },
                summary.medals.map((medal) =>
                  el('div', { class: 'home-medal is-earned', title: medal.title }, [
                    el('span', { class: 'medal__icon' }, medal.label),
                    el('span', {}, medal.title)
                  ])
                )
              )
            : el('p', { class: 'panel__note' }, 'Ainda não há medalhas. Sua primeira fase está esperando.')
        ]),
        el('div', { class: 'profile-actions' }, [
          el('button', { class: 'btn btn--ghost', type: 'button', onclick: onOpenRanking }, 'Ver ranking'),
          el('button', { class: 'btn btn--ghost', type: 'button', onclick: onSwitch }, 'Trocar jogador'),
          el(
            'button',
            { class: 'btn btn--cafe', type: 'button', onclick: onOpenCharacter },
            character ? 'Abrir ficha do personagem' : 'Criar personagem'
          ),
          el(
            'button',
            { class: 'btn btn--ghost', type: 'button', onclick: onOpenSkills },
            'Ver habilidades'
          ),
          el(
            'button',
            { class: 'btn btn--ghost', type: 'button', onclick: onOpenSpecializations },
            'Minha especialização'
          ),
          el(
            'button',
            { class: 'btn btn--ghost btn--small', type: 'button', onclick: onOpenAdmin },
            'Administração local'
          )
        ])
      ]),
      el('div', {}, [
        notice ? el('p', { class: 'form-success', role: 'status' }, notice) : null,
        form,
        el('section', { class: 'profile-learning' }, [
          el('div', { class: 'platform-section-head' }, [
            el('div', {}, [
              el('p', { class: 'panel__phase-label' }, 'Trajetória'),
              el('h2', {}, 'Minha Especialização')
            ]),
            onOpenSpecializations
              ? el('button', {
                  class: 'btn btn--ghost btn--small',
                  type: 'button',
                  onclick: onOpenSpecializations
                }, 'Ver todas')
              : null
          ]),
          affinities.length > 0
            ? el('div', { class: 'profile-affinity-list' }, affinities.map((item) =>
                el('div', { class: `profile-affinity${item.suggested ? ' is-suggested' : ''}` }, [
                  el('div', { class: 'profile-affinity__head' }, [
                    el('strong', {}, item.name),
                    el('span', {}, `${item.score}%`)
                  ]),
                  el('span', { class: 'specialization-affinity' }, [
                    el('span', {
                      class: 'specialization-affinity__fill',
                      style: `width:${Math.min(100, item.score)}%`
                    })
                  ]),
                  el('small', {}, item.skills.slice(0, 3).map((skill) => skill.name).join(' · '))
                ])
              ))
            : el('p', { class: 'panel__note' }, 'Conclua quests para desenvolver habilidades e revelar afinidades.')
        ]),
        el('section', { class: 'profile-achievements' }, [
          el('h2', {}, 'Conquistas'),
          el(
            'div',
            { class: 'achievement-mini-grid' },
            achievements.map((achievement) =>
              el(
                'div',
                { class: `achievement-mini${achievement.earned ? ' is-earned' : ''}` },
                [
                  el('span', { class: 'medal__icon' }, achievement.label),
                  el('strong', {}, achievement.title),
                  el('span', {}, achievement.earned ? 'Conquistada' : 'Bloqueada')
                ]
              )
            )
          )
        ]),
        el('section', { class: 'profile-history' }, [
          el('h2', {}, 'Histórico de fases'),
          el(
            'ul',
            { class: 'profile-history__list' },
            history.map((phase) =>
              el(
                'li',
                { class: `profile-history__item${phase.completed ? ' is-complete' : ''}` },
                [
                  el('span', { class: 'medal__icon' }, phase.medalLabel),
                  el('span', { class: 'profile-history__main' }, [
                    el('strong', {}, phase.title),
                    el('span', {}, phase.completed ? `Concluída · ${phase.score} / ${phase.maxScore} pts` : 'Ainda não concluída')
                  ])
                ]
              )
            )
          )
        ])
      ])
    ])
  });
}

function stat(label, value) {
  return el('div', { class: 'profile-stat' }, [
    el('span', {}, label),
    el('strong', {}, value)
  ]);
}
