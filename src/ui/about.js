import { el } from './dom.js';
import { renderPage } from './page.js';

export function renderAboutPage(root, { player, onBack, onHowToPlay }) {
  renderPage(root, {
    title: 'Sobre o jogo',
    eyebrow: 'NORMALIZA!',
    player,
    onBack,
    children: el('div', { class: 'about-layout' }, [
      el('section', { class: 'about-hero' }, [
        el('p', { class: 'splash__eyebrow' }, 'Cidade dos dados'),
        el('h2', {}, 'Normalizar é construir uma cidade que continua funcionando.'),
        el(
          'p',
          {},
          'O NORMALIZA! transforma tabelas, dependências e chaves em uma cidade isométrica. Cada edifício representa uma entidade; cada rua representa um relacionamento. Ao organizar os dados, a cidade cresce sem redundâncias desnecessárias.'
        ),
        el('button', { class: 'btn btn--primary', type: 'button', onclick: onHowToPlay }, 'Como jogar')
      ]),
      el('div', { class: 'about-grid' }, [
        article('Fases', [
          '1FN — Centro de Distribuição: valores atômicos e grupos repetitivos.',
          '2FN — Rede de Dependências: dependências totais e parciais.',
          '3FN — Cidade Organizada: dependências transitivas.',
          'Fase complementar — Gestão de Funcionários e Pedidos: três entidades e duas FKs.'
        ]),
        article('Aprendizado', [
          'Toda validação incorreta explica o conceito.',
          'Dicas e glossário estão disponíveis no painel da cidade.',
          'A pontuação valoriza solução correta, preservação e eficiência.',
          'A cidade guarda o histórico visual da sua evolução.'
        ]),
        article('Ranking', [
          'Perfis são identificados por nome e avatar, sem email.',
          'O ranking é assíncrono e global.',
          'Resultados offline ficam pendentes até a confirmação do servidor.',
          'A pontuação oficial é validada no backend.'
        ]),
        article('Tecnologia', [
          'HTML, CSS, JavaScript ES Modules e SVG.',
          'Dados das fases em JSON.',
          'Supabase para perfis e ranking.',
          'Compatível com GitHub Pages e subdiretórios.'
        ])
      ])
    ])
  });
}

function article(title, items) {
  return el('article', { class: 'about-card' }, [
    el('h3', {}, title),
    el('ul', {}, items.map((item) => el('li', {}, item)))
  ]);
}
