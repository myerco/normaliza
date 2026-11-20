import { territoryTracks } from '../core/world.js';
import { el } from './dom.js';

const LOGO = './assets/images/branding/cafegeek-logo.webp';

export function renderPublicHome(root, {
  world,
  onLogin,
  onRegister,
  onAbout
}) {
  const territories = (world?.territories ?? []).filter(
    (territory) => (territory.status ?? 'published') === 'published'
  );

  root.replaceChildren(
    el('div', { class: 'public-shell' }, [
      el('header', { class: 'public-header' }, [
        el('a', { class: 'public-brand', href: '#/' }, [
          el('img', { src: LOGO, alt: '' }),
          el('span', {}, [
            el('strong', {}, 'Cafegeek'),
            el('small', {}, 'Jornada do Conhecimento')
          ])
        ]),
        el('nav', { class: 'public-nav', 'aria-label': 'Navegação pública' }, [
          el('a', { href: '#/' }, 'Início'),
          el('a', { href: '#areas' }, 'Áreas de conhecimento'),
          el('a', { href: '#como-funciona' }, 'Como funciona'),
          onAbout ? el('button', { type: 'button', onclick: onAbout }, 'Sobre') : null
        ]),
        el('div', { class: 'public-header__actions' }, [
          el('button', { class: 'btn btn--ghost btn--small', type: 'button', onclick: onLogin }, 'Entrar'),
          el('button', { class: 'btn btn--cafe btn--small', type: 'button', onclick: onRegister }, 'Começar minha jornada')
        ])
      ]),
      el('main', { class: 'public-main' }, [
        el('section', { class: 'public-hero', 'aria-labelledby': 'public-title' }, [
          el('div', { class: 'public-hero__copy' }, [
            el('p', { class: 'platform-kicker' }, 'Aprender é explorar'),
            el('h1', { id: 'public-title' }, [
              'Explore conhecimentos. ',
              el('span', {}, 'Desenvolva habilidades. '),
              'Construa sua jornada.'
            ]),
            el('p', { class: 'public-lead' }, 'O Cafegeek transforma o conhecimento em uma experiência de exploração. Descubra áreas, percorra trilhas, enfrente desafios e desenvolva competências para construir sua própria trajetória profissional.'),
            el('div', { class: 'public-actions' }, [
              el('button', { class: 'btn btn--cafe', type: 'button', onclick: onRegister }, 'Começar minha jornada'),
              el('button', { class: 'btn btn--ghost', type: 'button', onclick: onLogin }, 'Já tenho uma conta')
            ])
          ]),
          el('div', { class: 'public-hero__map', 'aria-hidden': 'true' }, territories.map((territory, index) =>
            el('div', {
              class: 'public-island',
              style: `--territory-color:${territory.color}; --island-index:${index}`
            }, [
              el('span', { class: 'public-island__icon' }, territory.icon),
              el('strong', {}, territory.shortName),
              el('small', {}, `${territoryTracks(territory.id, world).length} trilhas`)
            ])
          ))
        ]),
        el('section', { class: 'public-section', id: 'areas' }, [
          el('div', { class: 'public-section__head' }, [
            el('p', { class: 'panel__phase-label' }, 'Áreas de conhecimento'),
            el('h2', {}, 'Cinco territórios para explorar'),
            el('p', { class: 'public-section__lead' }, 'Cada território reúne trilhas, habilidades e quests. Você escolhe por onde começar e pode explorar quantas áreas quiser.')
          ]),
          el('div', { class: 'public-territory-grid' }, territories.map((territory) =>
            publicTerritory(territory, world)
          ))
        ]),
        el('section', { class: 'public-section public-section--steps', id: 'como-funciona' }, [
          el('div', { class: 'public-section__head' }, [
            el('p', { class: 'panel__phase-label' }, 'Como funciona'),
            el('h2', {}, 'Sua jornada, construída por você'),
            el('p', { class: 'public-section__lead' }, 'Não existe uma profissão fixa para escolher no início. Sua trajetória nasce das habilidades que você desenvolve.')
          ]),
          el('div', { class: 'public-steps' }, [
            step('01', 'Explore os territórios', 'Conheça as grandes áreas do conhecimento.'),
            step('02', 'Escolha trilhas', 'Percorra caminhos com objetivos de aprendizagem.'),
            step('03', 'Complete quests', 'Resolva desafios práticos e ganhe experiência.'),
            step('04', 'Desenvolva habilidades', 'Cada atividade fortalece competências diferentes.'),
            step('05', 'Construa especializações', 'Combine habilidades de várias áreas e revele sua trajetória.')
          ])
        ]),
        el('section', { class: 'public-normaliza' }, [
          el('div', { class: 'public-normaliza__seal' }, 'N'),
          el('div', { class: 'public-normaliza__copy' }, [
            el('p', { class: 'panel__phase-label' }, 'Quest 01'),
            el('h2', {}, 'NORMALIZA!'),
            el('p', {}, 'Um desafio educativo que ensina 1FN, 2FN e 3FN por meio da organização de uma cidade de dados.'),
            el('p', { class: 'public-breadcrumb' }, 'Dados e Banco de Dados → Modelagem de Dados → Normalização → NORMALIZA!')
          ]),
          el('button', { class: 'btn btn--ghost', type: 'button', onclick: onRegister }, 'Explorar a quest')
        ]),
        el('section', { class: 'public-final', 'aria-labelledby': 'public-final-title' }, [
          el('p', { class: 'panel__phase-label' }, 'Comece agora'),
          el('h2', { id: 'public-final-title' }, 'Seu conhecimento é uma jornada em construção.'),
          el('p', {}, 'Explore, desenvolva suas habilidades e construa sua própria trajetória.'),
          el('button', { class: 'btn btn--cafe', type: 'button', onclick: onRegister }, 'Criar minha conta')
        ]),
        el('footer', { class: 'public-footer' }, [
          el('div', { class: 'public-brand' }, [
            el('img', { src: LOGO, alt: '' }),
            el('span', {}, [el('strong', {}, 'Cafegeek'), el('small', {}, 'Jornada do Conhecimento')])
          ]),
          el('p', {}, 'Aprendizagem gamificada para quem quer construir o próprio caminho.'),
          el('nav', { 'aria-label': 'Territórios' }, territories.map((territory) =>
            el('button', { type: 'button', onclick: () => scrollToSection('areas') }, territory.name)
          )),
          el('small', {}, `© ${new Date().getFullYear()} Cafegeek. Todos os direitos reservados.`)
        ])
      ])
    ])
  );
}

function publicTerritory(territory, world) {
  const tracks = territoryTracks(territory.id, world).slice(0, 6);

  return el('article', { class: 'public-territory', style: `--territory-color:${territory.color}` }, [
    el('span', { class: 'public-territory__icon' }, territory.icon),
    el('h3', {}, territory.name),
    el('p', {}, territory.description),
    el('ul', {}, tracks.map((track) => el('li', {}, track.name))),
    tracks.length > 6 ? el('small', {}, `+ ${territoryTracks(territory.id, world).length - 6} trilhas`) : null
  ]);
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function step(number, title, description) {
  return el('article', { class: 'public-step' }, [
    el('span', {}, number),
    el('h3', {}, title),
    el('p', {}, description)
  ]);
}
