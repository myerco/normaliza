import { levelProgress } from '../core/progression.js';
import {
  professionAffinities,
  skillLevelsFromProgression
} from '../core/world.js';
import { el } from './dom.js';
import { renderPage } from './page.js';

export function renderSpecializationsPage(root, {
  player,
  character,
  world,
  progression = null,
  onBack,
  onOpenSkills
}) {
  const affinities = professionAffinities(world, progression);
  const levels = skillLevelsFromProgression(progression);
  const level = levelProgress(progression?.xp ?? 0);
  const suggested = affinities.filter((item) => item.suggested);
  const featured = (suggested.length > 0 ? suggested : affinities).slice(0, 3);

  renderPage(root, {
    title: 'Minha Especialização',
    eyebrow: 'Cafegeek — Trajetória profissional',
    player,
    onBack,
    children: el('div', { class: 'specializations-page' }, [
      el('section', { class: 'specializations-intro' }, [
        el('div', {}, [
          el('p', { class: 'panel__phase-label' }, character?.name ?? player.name),
          el('h2', {}, suggested.length > 0 ? 'Sua trajetória está tomando forma' : 'Construa sua trajetória'),
          el('p', { class: 'panel__note' }, `Nível ${level.level} · ${level.xp} XP. Especializações são sugestões calculadas pelas habilidades, nunca classes que restringem conteúdo.`)
        ]),
        onOpenSkills
          ? el('button', { class: 'btn btn--ghost', type: 'button', onclick: onOpenSkills }, 'Ver habilidades')
          : null
      ]),
      suggested.length > 0
        ? el('section', { class: 'specialization-suggested' }, [
            el('p', { class: 'panel__phase-label' }, 'Sugestões'),
            el('div', { class: 'specialization-grid' }, featured.map((item) =>
              specializationCard(item, true, levels)
            ))
          ])
        : null,
      el('section', { class: 'specializations-list' }, [
        el('div', { class: 'platform-section-head' }, [
          el('div', {}, [
            el('p', { class: 'panel__phase-label' }, 'Todas as possibilidades'),
            el('h2', {}, 'Especializações profissionais')
          ]),
          el('span', { class: 'panel__note' }, `${affinities.length} trajetórias calculadas`)
        ]),
        el('div', { class: 'specialization-grid' }, affinities.map((item) =>
          specializationCard(item, item.suggested, levels)
        ))
      ])
    ])
  });
}

function specializationCard(item, isSuggested, levels) {
  return el('article', { class: `specialization-card${isSuggested ? ' is-suggested' : ''}`, 'data-profession-id': item.professionId }, [
    el('div', { class: 'specialization-card__head' }, [
      el('div', {}, [
        el('span', { class: 'panel__phase-label' }, isSuggested ? 'Afinidade sugerida' : 'Em evolução'),
        el('h3', {}, item.name),
        el('p', {}, item.description)
      ]),
      el('strong', { class: 'specialization-affinity__value' }, `${item.score}%`)
    ]),
    affinityBar(item.score, isSuggested),
    el('div', { class: 'specialization-skills' }, item.skills.map((skill) =>
      el('div', { class: 'specialization-skill' }, [
        el('span', {}, skill.name),
        el('span', {}, `${skill.level} / ${skill.targetLevel}`)
      ])
    )),
    el('small', {}, `${item.activeSkills} habilidades com progresso · limiar de sugestão ${item.threshold}%`)
  ]);
}

function affinityBar(score, suggested) {
  return el('span', { class: 'specialization-affinity', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(score) }, [
    el('span', {
      class: 'specialization-affinity__fill',
      style: `width:${Math.min(100, score)}%${suggested ? ';background:#9acb45' : ''}`
    })
  ]);
}
