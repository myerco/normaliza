# AGENTS.md — Projeto NORMALIZA!

## Estado atual do repositório

- Implementadas a estrutura visual, a Fase 1, a Fase 2, a Fase 3 e a missão especial Administração da Cidade: cidade isométrica, Centro de Distribuição, Rede de Dependências, Cidade Organizada, anomalias de redundância, validação de 1FN/2FN/3FN, feedback educativo, pontuação, persistência e evolução visual da cidade.
- Implementadas melhorias de experiência: salvamento automático, recuperação de fase após reload, pontuação acumulada, medalhas, indicador de evolução, glossário, painel de dicas, celebração de conclusão, reinício de fase e reinício total com confirmação.
- Formas normais avançadas (BCNF, 4FN, 5FN) não foram iniciadas. Não implemente além da 3FN sem uma nova solicitação.
- Stack: HTML5, CSS3, JavaScript ES6+ com ES Modules, SVG e JSON. Sem backend, bundler ou dependências externas.
- Node, Ruby e Jekyll não estão disponíveis no PATH deste ambiente; use Python para servir o app.

## Comandos

- Servir localmente: `py -m http.server 8000 --directory .`
- App: `http://localhost:8000/`
- Testes unitários: `http://localhost:8000/tests/run-tests.html`
- Testes de interação da Fase 1: `http://localhost:8000/tests/interactions.html`
- Testes de interação da Fase 2: `http://localhost:8000/tests/interactions-phase2.html`
- Testes de interação da Fase 3: `http://localhost:8000/tests/interactions-phase3.html`
- Testes da missão especial: `http://localhost:8000/tests/interactions-mission.html`
- Regressão de progresso/medalhas/recuperação: `http://localhost:8000/tests/interactions-progress.html`
- Verificação headless + screenshots: `powershell -ExecutionPolicy Bypass -File tools/verify.ps1`
- Sem build/lint. A fonte de verdade é este repositório; a publicação futura vai para `CafeGeek/docs/normaliza/`.

## Estrutura atual

- `index.html`, `assets/css/app.css`, `data/city.json`
- `data/phases/fase-1.json`: pedidos, regras, conceitos, dicas e pontuação da Fase 1.
- `data/phases/fase-2.json`: atributos, DFs declaradas, decomposição, pontuação e evolução da cidade.
- `data/phases/fase-3.json`: FUNCIONÁRIO, dependência transitiva, construção de tabelas, FK, relacionamento e evolução da cidade.
- `data/missions/administracao.json`: cenários de atualização, inserção e exclusão, dados de exemplo e explicações.
- `data/glossary.json`: conceitos do glossário.
- `data/tips.json`: dicas gerais, por fase e da missão.
- `src/core/fase1.js`: regras puras de seleção, movimentação, validação, pontuação e snapshot da 1FN.
- `src/core/fase2.js`: regras puras de DFs, dependências totais/parciais, decomposição, perda de junção e preservação.
- `src/core/fase3.js`: regras puras de dependência transitiva, construção de tabelas, PKs/FKs, relacionamentos, perda de junção e preservação.
- `src/core/administration.js`: transformações puras dos cenários de anomalia.
- `src/core/progress.js`: pontuação acumulada, medalhas e indicador de evolução.
- `src/state/`: estado puro; `src/router/`: rotas por hash; `src/data/`: validação de cidade, fases e missão.
- `src/persistence/storage.js`: LocalStorage namespaced em `normaliza:v1:progress`.
- `src/ui/`: DOM, cidade SVG, painel, HUD, instruções, ajuda/glossário, confirmação, celebração, `phase1.js`, `phase2.js`, `phase3.js` e `administration.js`.
- `tests/`: harness no navegador, sem dependências.
- `tools/verify.ps1`: inicia o servidor, roda Chrome/Edge headless e gera screenshots.

## Fase 1 — regras implementadas

- Entrada: `PEDIDO`: `001 João [Caneta, Lápis]`, `002 Maria [Borracha, Régua]`, `003 Pedro [Caneta]`.
- Saída esperada: `PEDIDO (id_pedido, cliente)` e `ITEM_PEDIDO (id_pedido, produto)` com 3 e 5 linhas.
- Validação: todos os produtos separados, sem duplicatas, com `id_pedido` correto e sem itens alheios à amostra.
- Pontuação: +10 por produto separado, +50 ao concluir, −10 por validação incorreta, −5 por dica, máximo 100.
- Persistência e reset usam a chave `normaliza:v1:progress`.
- Rota da fase: `#/fase/centro-de-distribuicao`.

## Fase 2 — regras implementadas

- Entrada: `ITEM_PEDIDO (Pedido, Produto, Quantidade, Descrição, Preço)` com chave composta `(Pedido, Produto)`.
- DFs declaradas: `(Pedido, Produto) → Quantidade` (total); `Produto → Descrição` e `Produto → Preço` (parciais).
- Saída esperada: `ITEM_PEDIDO (Pedido PK, Produto PK, Quantidade)` e `PRODUTO (Produto PK, Descrição, Preço)`.
- Validação: exatamente as DFs declaradas, tipos corretos, atributos nas tabelas corretas, PKs corretas, decomposição sem perda e DFs preservadas.
- Dependências não declaradas são rejeitadas; não inferir DFs pela amostra.
- Pontuação: +10 por dependência correta, +5 por atributo na tabela correta, +10 por PK correta, +10 ao concluir, −10 por validação incorreta, −5 por dica, máximo 100.
- Conclusão adiciona o edifício `ITEM_PEDIDO`, marca `PRODUTO` com `2FN` e cria as conexões na cidade.
- Rota da fase: `#/fase/rede-de-dependencias`.

## Fase 3 — regras implementadas

- Entrada: `FUNCIONÁRIO (CPF, Nome, Departamento, Localização)` com chave `CPF`.
- DFs declaradas: `CPF → Nome`, `CPF → Departamento` (diretas); `Departamento → Localização` (transitiva).
- Saída esperada: `FUNCIONÁRIO (CPF PK, Nome, Departamento FK)` e `DEPARTAMENTO (Departamento PK, Localização)`.
- O jogador identifica a transitiva, constrói as tabelas, distribui atributos, define PK/FK e cria o relacionamento `FUNCIONÁRIO.Departamento → DEPARTAMENTO.Departamento`.
- Validação: transitiva correta, atributos preservados, tabelas corretas, PKs/FKs corretas, relacionamento correto, decomposição sem perda e DFs preservadas.
- Pontuação: +20 pela transitiva, +10 por tabela, +5 por atributo, +5 por PK, +5 por FK, +10 por relacionamento, +10 ao concluir, −10 por validação incorreta, −5 por dica, máximo 100.
- Conclusão adiciona o edifício `DEPARTAMENTO`, marca `FUNCIONÁRIO` com `3FN` e cria a estrada N:1 na cidade.
- Rota da fase: `#/fase/cidade-organizada`.

## Missão especial — Administração da Cidade

- Acesso pelo painel lateral da cidade: **Abrir Administração da Cidade**.
- Rota: `#/missao/administracao`.
- Cenários interativos:
  - atualização de endereço em tabela desnormalizada versus normalizada;
  - cadastro de produto sem pedido no modelo desnormalizado versus PRODUTO independente;
  - exclusão de pedido com perda de produtos versus preservação em PRODUTO.
- O estado da missão é em memória; não altera a pontuação das fases nem a cidade persistida.
- A conclusão só aparece após executar os três cenários.

## Hospedagem e caminhos

- Publicação em subdiretório do Cafegeek: nunca hardcode caminhos a partir de `/`.
- Use um caminho-base configurável para assets, imports, `fetch` de JSON e persistência.
- Não altere layouts, configurações ou estilos globais do Cafegeek; a aplicação deve ser independente.

## Arquitetura obrigatória

- Separar: interface visual, mecânica do jogo, regras de normalização, validação de respostas, dados das fases, pontuação e persistência.
- Regras de normalização e validação devem ser puras e independentes do DOM/UI, permitindo teste isolado.
- Fases e desafios devem ser configurados por arquivos JSON, não hardcoded no código.

## Corretude conceitual (não simplificar)

- 1FN: valores atômicos, sem grupos repetitivos, registros individualizados.
- 2FN: já em 1FN; eliminar dependências parciais de atributos não primos em relação a chaves candidatas.
- 3FN: já em 2FN; para toda DF não trivial `X → A`, `X` deve ser superchave ou `A` deve ser atributo primo.
- Decomposição: preservar informação, verificar decomposição sem perda de junção, considerar preservação de DFs e identificar corretamente PKs/FKs.
- Nunca inferir DF apenas porque valores se repetem na amostra. As regras do domínio devem ser declaradas explicitamente em cada exercício.
- Não ensinar que qualquer divisão de tabela é uma normalização correta.

## Fases e mecânicas

- Fase 1 — Centro de Distribuição: implementada com atomicidade, grupos repetitivos, movimentação de produtos e evolução do PEDIDO.
- Fase 2 — Rede de Dependências: implementada com DFs totais e parciais, criação de conexões, decomposição, PKs e evolução da cidade.
- Fase 3 — Cidade Organizada: implementada com dependência transitiva, construção de tabelas, distribuição de atributos, PK/FK, relacionamentos e evolução da cidade.
- Missão especial — Administração da Cidade: implementada com demonstrações interativas de anomalias de atualização, inserção e exclusão.

## Experiência, progresso e regras educativas

- Estética low-poly isométrica de construção de cidade; a cidade é o elemento central. Deve parecer jogo, não sistema administrativo.
- Toda resposta incorreta deve trazer explicação conceitual, não apenas "errado".
- Ofereça dicas, glossário e visualização das estruturas antes/depois da normalização.
- Pontuação pela qualidade da solução, não apenas pela velocidade.
- Disponibilize alternativa ao drag-and-drop (essencial para mobile/acessibilidade).
- Persistência de progresso via LocalStorage na chave `normaliza:v1:progress`; cada fase salva automaticamente ao mover, validar ou usar dica.
- O hash route preserva a fase; ao recarregar, os controllers hidratam o snapshot e a cidade reaplica extensões e normalizações.
- O painel da cidade mostra pontuação acumulada, medalhas 1FN/2FN/3FN, barra de evolução e progresso salvo.
- Re iniciar uma fase usa o botão da própria fase. Reiniciar todo o jogo exige confirmação e limpa progresso, medalhas e evoluções.
- Ajuda e glossário ficam no painel da cidade; as fases mantêm dicas contextuais próprias.
- Conclusões usam overlay, medalha e camada de celebração com confete; respeite `prefers-reduced-motion`.

## Fluxo de trabalho

- Trabalhe incrementalmente: não inicie uma nova fase antes da anterior estar funcional e testada.
- Antes de implementar: analise a estrutura, apresente o plano e liste os arquivos a criar/modificar.
- Depois de implementar: execute testes, corrija erros, apresente resultados e atualize a documentação.
- Não substitua arquivos existentes sem necessidade e não implemente funcionalidades fictícias apenas para exibir interface.
- Não considere uma fase concluída sem testar suas interações principais.
