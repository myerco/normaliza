import { levelProgress } from '../core/progression.js';
import { skillLevelsFromProgression } from '../core/world.js';
import { el } from './dom.js';
import { renderPage } from './page.js';

const CATEGORY_LABELS = {
  dados: 'Dados e Banco de Dados',
  computacao: 'Computação',
  jogos: 'Jogos Digitais',
  infraestrutura: 'Sistemas e Infraestrutura',
  soberania: 'Soberania Digital'
};

export function renderSkillsPage(root, {
  player,
  character,
  world,
  progression = null,
  questCatalog = null,
  onBack,
  onOpenSpecializations
}) {
  const levels = skillLevelsFromProgression(progression);
  const skills = (world?.skills ?? [])
    .filter((skill) => skill.status === 'published')
    .sort((first, second) => {
      const levelDiff = (levels[second.id] ?? 0) - (levels[first.id] ?? 0);
      return levelDiff || (first.order ?? 0) - (second.order ?? 0);
    });
  const history = progression?.skillHistory ?? [];
  const topSkills = skills.slice(0, 4);
  const level = levelProgress(progression?.xp ?? 0);

  renderPage(root, {
    title: 'Habilidades',
    eyebrow: 'Cafegeek — Minha trajetória',
    player,
    onBack,
    children: el('div', { class: 'skills-page' }, [
      el('section', { class: 'skills-summary' }, [
        el('div', {}, [
          el('p', { class: 'panel__phase-label' }, 'Personagem'),
          el('h2', {}, character?.name ?? player.name),
          el('p', { class: 'panel__note' }, `Nível ${level.level} · ${level.xp} XP · ${skills.filter((skill) => (levels[skill.id] ?? 0) > 0).length} habilidades desenvolvidas`)
        ]),
        onOpenSpecializations
          ? el('button', {
              class: 'btn btn--ghost',
              type: 'button',
              onclick: onOpenSpecializations
            }, 'Minha especialização')
          : null
      ]),
      topSkills.length > 0
        ? el('section', { class: 'skills-top' }, topSkills.map((skill) =>
            el('article', { class: 'skill-card is-featured' }, [
              el('div', { class: 'skill-card__head' }, [
                el('span', { class: 'skill-card__icon' }, skill.icon),
                el('div', {}, [
                  el('strong', {}, skill.name),
                  el('span', {}, categoryLabel(world, skill.categoryId))
                ])
              ]),
              levelBar(levels[skill.id] ?? 0, skill.maxLevel ?? 10),
              el('small', {}, `${levels[skill.id] ?? 0} / ${skill.maxLevel ?? 10}`)
            ])
          ))
        : null,
      el('section', { class: 'skills-list' }, [
        el('div', { class: 'platform-section-head' }, [
          el('div', {}, [
            el('p', { class: 'panel__phase-label' }, 'Competências'),
            el('h2', {}, 'Habilidades da jornada')
          ]),
          el('span', { class: 'panel__note' }, 'Evolução por quests e atividades')
        ]),
        el('div', { class: 'skills-grid' }, skills.map((skill) =>
          skillCard(skill, levels[skill.id] ?? 0, history, questCatalog)
        ))
      ])
    ])
  });
}

function skillCard(skill, level, history, questCatalog) {
  const entries = history
    .filter((entry) => entry.skillId === skill.id)
    .slice(-3)
    .reverse();

  return el('article', { class: 'skill-card', 'data-skill-id': skill.id }, [
    el('div', { class: 'skill-card__head' }, [
      el('span', { class: 'skill-card__icon' }, skill.icon),
      el('div', {}, [
        el('strong', {}, skill.name),
        el('span', {}, skill.description)
      ]),
      el('em', {}, `${level}/${skill.maxLevel ?? 10}`)
    ]),
    levelBar(level, skill.maxLevel ?? 10),
    entries.length > 0
      ? el('div', { class: 'skill-history' }, entries.map((entry) =>
          el('div', { class: 'skill-history__item' }, [
            el('span', {}, entry.sourceId
              ? (questCatalog?.quests ?? []).find((quest) => quest.id === entry.sourceId)?.name ?? entry.sourceId
              : entry.source ?? 'Atividade'),
            el('strong', {}, `+${entry.current - entry.previous}`)
          ])
        ))
      : el('p', { class: 'skill-history__empty' }, 'Ainda sem atividades registradas.')
  ]);
}

function levelBar(level, maxLevel) {
  const safeMax = Math.max(1, Number(maxLevel) || 10);
  const percent = Math.round((Math.max(0, Number(level) || 0) / safeMax) * 100);

  return el('span', { class: 'skill-level', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(safeMax), 'aria-valuenow': String(level) }, [
    el('span', { class: 'skill-level__fill', style: `width:${Math.min(100, percent)}%` })
  ]);
}

function categoryLabel(world, categoryId) {
  return world?.skillCategories?.find((category) => category.id === categoryId)?.name ??
    CATEGORY_LABELS[categoryId] ??
    categoryId ??
    'Geral';
}
