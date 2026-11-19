import { avatarNode } from './avatar.js';
import { el } from './dom.js';
import { renderPage } from './page.js';

export function renderLeaderboardPage(root, {
  player,
  board,
  loading = false,
  offline = false,
  updatedAt = null,
  onBack,
  onRefresh
}) {
  const current = board?.current ?? null;
  const next = board?.next ?? null;
  const rows = board?.rows ?? [];

  renderPage(root, {
    title: 'Ranking Global',
    eyebrow: 'Classificação da cidade',
    player,
    onBack,
    actions: [
      el(
        'button',
        { class: 'btn btn--ghost', type: 'button', onclick: onRefresh, disabled: loading },
        loading ? 'Consultando...' : 'Atualizar ranking'
      )
    ],
    children: el('div', { class: 'leaderboard-layout' }, [
      offline
        ? el(
            'div',
            { class: 'ranking-offline', role: 'status' },
            [
              el('strong', {}, 'Ranking temporariamente indisponível.'),
              el(
                'p',
                {},
                'O jogo continua funcionando e os resultados pendentes serão sincronizados quando o serviço voltar.'
              ),
              updatedAt
                ? el('p', { class: 'panel__note' }, `Última atualização local: ${formatDate(updatedAt)}`)
                : null
            ]
          )
        : null,
      current
        ? el('section', { class: 'ranking-current' }, [
            el('div', { class: 'ranking-current__position' }, [
              el('span', {}, 'Sua posição'),
              el('strong', {}, `#${current.rank}`)
            ]),
            el('div', { class: 'ranking-current__main' }, [
              avatarNode(current.avatarId, { size: 'md' }),
              el('div', {}, [
                el('strong', {}, current.name),
                el('span', {}, `${current.totalScore} pts · ${current.completedPhases} fases concluídas`)
              ])
            ]),
            el(
              'div',
              { class: 'ranking-current__next' },
              next
                ? [
                    el('span', {}, 'Para o próximo'),
                    el('strong', {}, `${next.difference} pts`)
                  ]
                : [el('span', {}, 'Você está no topo'), el('strong', {}, 'Continue assim')]
            )
          ])
        : el(
            'p',
            { class: 'ranking-empty panel__note' },
            'Seu perfil ainda não aparece no ranking confirmado. Conclua uma fase e sincronize.'
          ),
      board?.topThree?.length
        ? el(
            'section',
            { class: 'ranking-podium', 'aria-label': 'Três primeiros colocados' },
            board.topThree.map((row) =>
              el(
                'article',
                { class: `ranking-podium__card ranking-podium__card--${row.rank}${row.id === player?.id ? ' is-current' : ''}` },
                [
                  el('span', { class: 'ranking-podium__rank' }, `#${row.rank}`),
                  avatarNode(row.avatarId, { size: 'lg' }),
                  el('strong', {}, row.name),
                  el('span', {}, `${row.totalScore} pts`),
                  el('span', { class: 'panel__note' }, `${row.completedPhases} fases`)
                ]
              )
            )
          )
        : null,
      el('section', { class: 'ranking-table-card' }, [
        el('div', { class: 'ranking-table-card__head' }, [
          el('h2', {}, 'Classificação'),
          el('span', { class: 'panel__note' }, 'Pontos · fases concluídas · desempates')
        ]),
        rows.length > 0
          ? el('div', { class: 'table-scroll' }, [
              el('table', { class: 'data-table ranking-table' }, [
                el('thead', {}, [
                  el('tr', {}, [
                    el('th', {}, 'Posição'),
                    el('th', {}, 'Jogador'),
                    el('th', {}, 'Pontos'),
                    el('th', {}, 'Fases concluídas')
                  ])
                ]),
                el(
                  'tbody',
                  {},
                  rows.map((row) =>
                    el(
                      'tr',
                      { class: `${row.rank <= 3 ? 'is-top' : ''}${row.id === player?.id ? ' is-current' : ''}` },
                      [
                        el('td', {}, `#${row.rank}`),
                        el('td', {}, [
                          el('span', { class: 'ranking-player' }, [
                            avatarNode(row.avatarId, { size: 'xs' }),
                            el('span', {}, row.name),
                            row.id === player?.id ? el('span', { class: 'ranking-you' }, 'você') : null
                          ])
                        ]),
                        el('td', {}, `${row.totalScore} pts`),
                        el('td', {}, `${row.completedPhases}`)
                      ]
                    )
                  )
                )
              ])
            ])
          : el('p', { class: 'panel__note' }, 'Nenhum jogador confirmado no ranking ainda.')
      ])
    ])
  });
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}
