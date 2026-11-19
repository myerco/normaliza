import { avatarNode } from './avatar.js';
import { el } from './dom.js';
import { renderPage } from './page.js';

export function renderAchievementsPage(root, {
  player,
  achievements = [],
  summary,
  onBack
}) {
  const earned = achievements.filter((achievement) => achievement.earned).length;

  renderPage(root, {
    title: 'Conquistas',
    eyebrow: 'Medalhas da cidade',
    player,
    onBack,
    children: el('div', { class: 'achievements-page' }, [
      el('div', { class: 'achievements-summary' }, [
        avatarNode(player.avatarId, { size: 'lg' }),
        el('div', {}, [
          el('p', { class: 'panel__phase-label' }, player.name),
          el('h2', {}, `${earned} de ${achievements.length} conquistas`),
          el('p', { class: 'panel__note' }, `${summary.totalScore} pontos conquistados na cidade.`)
        ])
      ]),
      el(
        'div',
        { class: 'achievements-grid' },
        achievements.map((achievement) =>
          el(
            'article',
            { class: `achievement-card${achievement.earned ? ' is-earned' : ' is-locked'}` },
            [
              el('div', { class: 'achievement-card__medal' }, achievement.label),
              el('div', { class: 'achievement-card__body' }, [
                el('span', { class: 'panel__phase-label' }, achievement.earned ? 'Conquistada' : 'Bloqueada'),
                el('h2', {}, achievement.title),
                el('p', {}, achievement.description),
                achievement.maxScore > 0
                  ? el('p', { class: 'achievement-card__score' }, `${achievement.score} / ${achievement.maxScore} pontos`)
                  : null
              ])
            ]
          )
        )
      )
    ])
  });
}
