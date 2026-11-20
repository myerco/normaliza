# AGENTS.md — Projeto NORMALIZA!

## Conceito e escopo

NORMALIZA! é um jogo educativo de normalização de bancos de dados. A cidade isométrica é o mapa: edifícios representam tabelas e ruas representam relacionamentos. O jogador constrói a cidade à medida que normaliza dados.

O escopo atual inclui:

- Fase 1 — Centro de Distribuição (1FN).
- Fase 2 — Rede de Dependências (2FN).
- Fase 3 — Cidade Organizada (3FN).
- Fase 4 — Gestão de Funcionários e Pedidos (3FN complementar, com três tabelas e duas FKs).
- Missão especial — Administração da Cidade (anomalias).
- Contas locais, perfis de jogador, ranking assíncrono, conquistas, offline e sincronização.

Formas normais avançadas (BCNF, 4FN, 5FN) não fazem parte do escopo. Não implemente além da 3FN sem uma nova solicitação.

## Estado atual

- Fases 1–4, missão, cidade, progresso, medalhas, dicas, glossário, celebração e resets implementados.
- Cidade visual detalhada em SVG, com `cityArt.js` separado de `cityScene.js`: ilha, parque, ruas, calçadas, cenário, edifícios detalhados, vegetação e props urbanos.
- **Etapa 3 da Cafegeek implementada:** tela inicial com logo original em `assets/images/branding/cafegeek-logo.webp`, navegação de plataforma, apresentação da Quest 01 — NORMALIZA! e página de desafios com campanhas futuras bloqueadas.
- **Etapa 4 da Cafegeek implementada localmente:** personagem principal por jogador, criação e edição de nome, retrato e arquétipo, página `#/personagem`, bio do jogador e migração automática de perfis antigos para um personagem padrão.
- **Etapa 5 da Cafegeek implementada localmente:** catálogo administrável de arquétipos e atributos, matriz de valores iniciais 1–10, ativação/inativação, retratos e ícones, com persistência em `LocalStorage`.
- **Painel administrativo implementado localmente:** `#/admin` exige RBAC no backend, com dashboard, usuários, jogadores, catálogos, mapas, configurações e auditoria; o primeiro administrador é criado por `ADMIN_EMAIL`/`ADMIN_PASSWORD` no `.env` local.
- **Etapa 6 da Cafegeek implementada localmente:** campanha Jornada do Conhecimento, catálogo de quatro quests, dependências, pré-requisitos, estados individuais por personagem e página de jornada dinâmica. A Quest 01 — NORMALIZA! é a primeira quest.
- **Etapa 7 da Cafegeek implementada localmente:** XP, níveis configuráveis, progresso para o próximo nível, atributos individuais com histórico, evolução por recompensa de quest e conquistas de personagem.
- **Etapa 8 da Cafegeek implementada localmente:** endpoint `POST /api/quests/normaliza/complete` confirma a Quest 01 somente após as quatro fases existirem em `phase_results`, calcula XP/nível no servidor e registra a concessão com idempotência em `platform_quest_results`.
- O frontend local aciona a confirmação após sincronizar os resultados; a Edge Function `complete-quest` e a migration `002_platform.sql` preparam o mesmo fluxo no Supabase.
- **Etapa 9 implementada:** consolidação de testes de cadastro, edição, progressão, desbloqueio, conclusão, autorização por jogador, idempotência e regressão; `tools/verify-local-backend.ps1` cobre o fluxo real do endpoint local.
- **Etapa 10 implementada:** `README.md` consolidado com relatório final, modelo MER atual implementado em Mermaid e modelo alvo planejado; `AGENTS.md` atualizado com o estado e as limitações.
- **Árvore de conhecimento legada:** a visualização anterior de áreas Dados, Programação e Unreal Engine foi substituída pelo mapa-múndi; os módulos antigos permanecem apenas como compatibilidade técnica e seus testes.
- **Administração de perfis e imagens:** a área local agora atualiza perfis de jogador, atributos e o catálogo de imagens de personagem; a imagem pode ser usada no avatar e aceitar URL.
- O mapa de conhecimento é separado do personagem e das quests: territórios, trilhas, habilidades e especializações vivem em catálogo próprio e referenciam quests por vínculos explícitos.
- Administração de quests/recompensas e persistência server-side dos personagens/atributos continuam pendentes; o RBAC e a proteção administrativa local já estão implementados.
- Contas locais, perfis de jogador, tela de identificação, edição de perfil, ranking, conquistas e páginas Sobre.
- Progresso persistido por jogador em `LocalStorage`; o progresso antigo em `normaliza:v1:progress` é migrado para o primeiro perfil.
- Fila local de resultados pendentes e sincronização com Supabase; ranking exibe estado offline quando indisponível.
- Progresso já concluído no `LocalStorage` é reconciliado automaticamente com o ranking usando `client_match_id` idempotente.
- Backend preparado em `supabase/`: schema, RLS, view de ranking e Edge Functions.
- **O schema e as Edge Functions ainda não foram aplicados/deployados no projeto Supabase.** O projeto foi validado para URL, publishable key, Anonymous Auth e CORS, mas as migrations pendentes devem ser aplicadas pelo SQL Editor.
- **Modo local Docker Compose implementado:** PostgreSQL 16, API Node 22 e web nginx, com ranking local iniciado vazio. O app completo roda em `http://localhost:8080`; o banco é interno e não publica porta no host.
- O frontend tem provedor Supabase e provedor local; o modo é definido em runtime pelo container web ou pelo `config/runtime.js`.
- Testes atuais: `191` unitários e suítes de interação das fases, jogadores/ranking, administração, missão, progresso, mapa, habilidades e especializações.
- `Node`, `Ruby`, `Jekyll` e `Deno` não estão disponíveis no PATH deste ambiente. O Supabase CLI `3.1.0` está instalado em `C:\Users\myerc\AppData\Local\Programs\supabase` e foi adicionado ao PATH do usuário. O Docker Desktop `4.99.0` está instalado, o engine `29.9.3` está em execução e o Docker está no PATH do sistema. Abra um novo terminal para carregar ambos os PATHs. Use Python para servir o app.

- **Mapa-múndi implementado localmente:** a home agora apresenta cinco territórios, mapa interativo, detalhe de território, progresso e acesso a trilhas; `#/mapa` é a rota principal e `#/arvore` permanece como alias. Rotas `#/territorio/:id`, `#/trilha/:id` e `#/quest/:id` foram adicionadas.
- **Catálogo do mundo:** o PostgreSQL é a fonte online via `GET/PUT /api/content`; `src/persistence/worldStorage.js` mantém cache/fallback em `normaliza:v4:world`. `src/core/world.js` calcula progresso de trilhas/territórios e afinidade de especializações.
- **NORMALIZA integrado ao mapa:** a Quest 01 aparece na trilha `modelagem-normalizacao`, no território Dados e Banco de Dados, e continua abrindo o módulo `#/cidade` existente.
- **Schema do mundo criado no banco local:** `db/migrations/004_world.sql` adicionou territórios, trilhas, habilidades, especializações, personagens, progresso de habilidades, quests e views de progresso/afinidade; `005_content_order.sql` completou os campos de quest. A versão Supabase está em `supabase/migrations/003_world.sql`, ainda pendente de aplicação no cloud.
- **Área pública implementada:** `#/` apresenta o Cafegeek, cinco territórios, como funciona, NORMALIZA e CTAs; `#/login`, `#/registro` e `#/recuperar-senha` são públicas.
- **Autenticação e User/Player:** o modo local usa `users`, `players.user_id` e sessões vinculadas; o Supabase usa `auth.users`. Rotas privadas exigem sessão e `#/jogador` é a área Minha Jornada.
- **Conteúdo do mapa no PostgreSQL:** data/content.seed.json popula as tabelas na primeira inicialização da API; GET /api/content fornece o catálogo ao frontend e PUT /api/content persiste alterações autenticadas do admin local. O PostgreSQL é a fonte online; LocalStorage permanece como cache/fallback offline.
- **Habilidades e especializações implementadas localmente:** `#/habilidades` mostra níveis e histórico; `#/especializacoes` e o perfil calculam afinidade por habilidades, sem classes restritivas.
- **Administração do mapa implementada:** #/admin/mapas (`#/admin/mundo` como alias) edita territórios, trilhas, habilidades, especializações, quests e relações; no modo Docker, as alterações são salvas no PostgreSQL via API.
- **RBAC administrativo implementado localmente:** roles `administrator`, `content_manager` e `support`, permissões por área, auditoria e configurações persistidas; o acesso sem permissão retorna `403` e o painel redireciona contas sem Player para o onboarding quando não são administrativas.
- **Reformulação RPG implementada na primeira etapa:** `#/jogador` apresenta uma tela de personagem em tela cheia, com menu superior fixo na ordem Personagens, Mapa do Mundo, Desafios, Missões, Talentos e Configurações; o personagem ativo ocupa o centro e os painéis laterais usam dados reais de nível, XP, talentos, conquistas, territórios, missão, progresso e recompensas.
- **Navegação RPG nas demais seções:** no modo real, telas privadas existentes são embrulhadas pelo shell do jogador com o menu superior; as páginas internas ainda mantêm o layout legado até a próxima etapa. `#/missoes` é um alias atual para a página de quests.
- **Compatibilidade de testes:** o novo shell é usado apenas fora do modo `?test=1`; os testes de interação continuam exercitando a home legada, e novos testes validam a ordem do menu e o mapeamento das seções.
- **Pendências de autenticação:** recuperação de senha local sem e-mail, migração de contas anônimas Supabase e sincronização de progresso/habilidades no servidor.
- **Pendências da nova plataforma:** persistir personagens/habilidades no servidor, sincronizar recompensas de habilidades, aplicar RLS/funções administrativas no Supabase e implementar validação genérica de quests.

## Stack

- HTML5, CSS3, JavaScript ES6+ com ES Modules.
- SVG para cidade/edifícios e JSON para conteúdo.
- Supabase Postgres, Auth por e-mail/senha, RLS, view de leaderboard e Edge Functions.
- PostgreSQL 16, Node 22 e nginx no modo Docker Compose local.
- `LocalStorage` para token de sessão, cache de progresso/ranking e fila de sincronização.
- Sem bundler, framework de frontend ou etapa de build.
- Configuração pública em `config/supabase.js` e seleção de backend em `config/runtime.js`; nenhuma credencial administrativa no navegador.

## Comandos

- Servir localmente: `py -m http.server 8000 --directory .`
- App: `http://localhost:8000/`
- Testes unitários: `http://localhost:8000/tests/run-tests.html`
- Interações da Fase 1: `http://localhost:8000/tests/interactions.html`
- Interações da Fase 2: `http://localhost:8000/tests/interactions-phase2.html`
- Interações da Fase 3: `http://localhost:8000/tests/interactions-phase3.html`
- Interações da Fase 4: `http://localhost:8000/tests/interactions-phase4.html`
- Jogadores, perfil e ranking: `http://localhost:8000/tests/interactions-players.html`
- Administração de arquétipos/atributos: `http://localhost:8000/tests/interactions-admin.html`
- Missão especial: `http://localhost:8000/tests/interactions-mission.html`
- Progresso, medalhas, recuperação e reset: `http://localhost:8000/tests/interactions-progress.html`
- Verificação headless + screenshots: `powershell -ExecutionPolicy Bypass -File tools/verify.ps1`
- Verificação sem screenshots: `powershell -ExecutionPolicy Bypass -File tools/verify.ps1 -SkipScreenshots`
- Verificação do backend local: `powershell -ExecutionPolicy Bypass -File tools/verify-local-backend.ps1`
- Stack local completa: `docker compose up -d --build`
- App local: `http://localhost:8080/`
- API local via proxy: `http://localhost:8080/api/health`
- Parar preservando dados: `docker compose down`
- Apagar banco local: `docker compose down -v` (destrutivo)
- Logs: `docker compose logs -f api`

## Arquitetura

- **`src/core/`**: regras puras e independentes do DOM — fases 1–4, anomalias, jogadores, personagens, arquétipos, atributos, quests, árvore de conhecimento, XP, níveis, conquistas, perfil, ranking e progresso.
- **`src/data/`**: validação estrutural dos JSONs de cidade, fases e missão.
- **`src/services/`**: fachada de backend, provedores Supabase/local, conteúdo PostgreSQL, submissão de resultados, progressão de quests, leaderboard e sincronização. Não contém UI.
- **`src/persistence/`**: progresso e personagens namespaced por jogador, catálogo local de arquétipos/atributos, imagens, quests, árvore de conhecimento, progressão de personagem, fila pendente, cache de ranking e migração do legado.
- **`src/core/world.js`**: progresso de territórios/trilhas, vínculos quest-habilidade e cálculo de afinidade de especializações.
- **`src/persistence/worldStorage.js`**: catálogo local versionado do mapa-múndi, usado como cache/fallback.
- **`src/services/content-service.js`**: leitura e gravação do catálogo via `/api/content`.
- **`src/services/auth-service.js`**: autenticação, sessão e vínculo User/Player.
- **`src/services/admin-service.js`**: cliente dos endpoints `/api/admin` para acesso, dashboard, usuários, auditoria e configurações.
- **`src/ui/publicHome.js`** e **`src/ui/auth.js`**: página pública, login, cadastro e onboarding.
- **`src/ui/playerLayout.js`**: shell de tela cheia, menu RPG e moldura das páginas privadas.
- **`src/ui/playerHome.js`**: tela de personagem com retrato central, status, talentos, conquistas, territórios e missão.
- **`assets/css/player-ui.css`**: identidade visual RPG, composição em três colunas e responsividade.
- **`src/ui/adminPanel.js`**: shell e telas do painel administrativo autenticado.
- **`docker/api/src/admin.js`**: RBAC, bootstrap do primeiro administrador, usuários, auditoria e settings.
- **`docker/api/src/content.js`**: seed e persistência do catálogo no PostgreSQL.
- **`src/ui/worldMap.js`**: mapa interativo, territórios, trilhas e detalhe de quest.
- **`src/ui/skills.js`** e **`src/ui/specializations.js`**: habilidades e afinidade profissional.
- **`src/ui/worldAdmin.js`**: administração de territórios, trilhas, habilidades, especializações e quests, com persistência no PostgreSQL e cache local.
- **`src/state/` e `src/router/`**: tela, jogador, edifício, fase, mapa, território, trilha e rotas por hash.
- **`src/ui/`**: início Cafegeek, jornada de quests, árvore de conhecimento, personagem, administração, cidade e arte isométrica (`cityArt.js`), HUD, painel, fases, missão, identidade, perfil, ranking, conquistas, Sobre, ajuda e confirmação.
- **`data/`**: configuração de fases, cidade, missão, glossário e dicas.
- **`supabase/`**: migrations SQL, Edge Functions e módulos canônicos compartilhados para validação server-side.
- **`docker/` e `db/`**: imagens, nginx e migrations do modo local.
- **`config/`**: URL/publishable key públicas e runtime do provedor.
- **`tests/`**: harness no navegador e testes de interação; `tools/verify.ps1` executa headless.

A validação de normalização deve continuar pura. A mesma especificação canônica deve ser usada no cliente e no servidor; o servidor é a autoridade da pontuação oficial.

## Estrutura de diretórios

```text
.
├── index.html
├── compose.yaml
├── .env.example
├── assets/
│   ├── css/app.css
│   ├── css/platform.css
│   └── images/branding/cafegeek-logo.webp
├── config/
│   ├── supabase.js
│   ├── supabase.example.js
│   └── runtime.js
├── db/migrations/
├── docker/api/
├── docker/web/
├── data/
│   ├── city.json
│   ├── glossary.json
│   ├── tips.json
│   ├── phases/fase-1.json ... fase-4.json
│   └── missions/administracao.json
├── src/
│   ├── main.js
│   ├── core/
│   ├── data/
│   ├── persistence/
│   ├── router/
│   ├── services/
│   ├── state/
│   └── ui/
├── supabase/
│   ├── migrations/001_schema.sql, 002_platform.sql
│   └── functions/{_shared,create-profile,update-profile,start-attempt,record-hint,record-validation,submit-solution,complete-quest}
├── tests/
├── tools/
├── docs/
├── README.md
└── AGENTS.md
```

## Identidade, perfis e multiplayer

- O multiplayer é assíncrono: cada jogador tem seu progresso; o ranking é compartilhado.
- Identidade: **Supabase Auth por e-mail/senha**; o modo local usa `users` + `players.user_id`. Um User possui um Player no escopo inicial.
- Não solicitar nome completo, CPF, e-mail ou telefone.
- A sessão é persistida; o token local fica no navegador, mas usuários e sessões são validados no PostgreSQL. O Supabase permite autenticação em outros dispositivos.
- Nome: 3–20 caracteres; letras Unicode, números, espaço, hífen e sublinhado; único globalmente e case-insensitive.
- Avatar: IDs em allowlist (`construtor`, `arquiteto`, `engenheiro`, `analista`, `cientista`).
- O jogador pode criar, selecionar, editar nome/avatar e trocar de perfil local.
- A troca de perfil recarrega a sessão para recriar controllers/cidade e não vazar estado.

## Ranking e pontuação

- Ranking global all-time; quatro fases; máximo total de `400` pontos.
- Pontuação oficial: soma do melhor resultado confirmado por fase.
- Ordenação: pontos decrescentes; fases concluídas decrescentes; momento em que a pontuação foi alcançada (mais antigo primeiro); nome.
- O ranking mostra top 3, posição do jogador, pontos e diferença para o próximo.
- O navegador envia a solução, nunca um total confiável.
- A Edge Function valida a solução com as regras canônicas e calcula o score no servidor.
- `client_match_id` único impede duplicação; repetições não somam pontos.
- Tentativas e dicas online são registradas pelas Edge Functions. Resultado offline é aceito com política conservadora e marcado como pendente até confirmação.
- O ranking nunca deve apresentar pontuação local como sincronizada.
- Cache local do ranking é apenas cache; não é fonte de ranking compartilhado.

## Segurança

- O frontend usa apenas URL e publishable key.
- `SUPABASE_SERVICE_ROLE_KEY` deve existir somente nos secrets das Edge Functions.
- RLS impede escrita direta em jogadores, tentativas, partidas e resultados.
- O painel administrativo exige sessão e permissão verificadas no backend; o frontend nunca decide autorização sozinho.
- O primeiro administrador local é criado por `ADMIN_EMAIL`/`ADMIN_PASSWORD`; senhas administrativas e do Postgres não vão para o navegador.
- Edge Function verifica JWT, `owner_id`, perfil, fase e tentativa.
- Nunca confiar no score, tentativas ou dicas enviados pelo navegador.
- Não armazenar PII desnecessária. O ranking público expõe somente nome, avatar, pontos, fases e posição.
- Não colocar senha do Postgres, service role ou secret key no repositório, no app ou no GitHub Pages.

## Offline e sincronização

- O jogo continua funcionando sem ranking: perfis e progresso local permanecem.
- Resultados concluídos vão para uma fila local por jogador.
- Ao voltar online, a fila é sincronizada; `client_match_id` garante idempotência.
- Resultados concluídos antes da sincronização são enfileirados novamente com um `client_match_id` estável por jogador/fase.
- A página de ranking recarrega automaticamente quando uma sincronização termina.
- Falhas mantêm o resultado pendente; a UI informa o estado.
- A pontuação oficial só é exibida como confirmada após resposta do servidor.
- O cache de ranking é exibido como desatualizado quando o serviço está indisponível.

## Fase 4 — Gestão de Funcionários e Pedidos

- Rota: `#/fase/gestao-de-funcionarios-e-pedidos`.
- Forma normal: `3FN` complementar; não é uma nova forma normal.
- Entrada: `PEDIDO (Pedido, Cliente, Funcionário, Nome Funcionário, Departamento, Localização)`.
- DFs declaradas:
  - `Pedido → Cliente`
  - `Pedido → Funcionário`
  - `Funcionário → Nome Funcionário`
  - `Funcionário → Departamento`
  - `Departamento → Localização`
- Saída:
  - `PEDIDO (Pedido PK, Cliente, Funcionário FK)`
  - `FUNCIONÁRIO (Funcionário PK, Nome Funcionário, Departamento FK)`
  - `DEPARTAMENTO (Departamento PK, Localização)`
- Relacionamentos:
  - `PEDIDO.Funcionário → FUNCIONÁRIO.Funcionário`
  - `FUNCIONÁRIO.Departamento → DEPARTAMENTO.Departamento`
- A validação verifica DFs, atributos, PKs/FKs, relacionamentos, preservação de DFs e perda de junção em três tabelas usando chase.
- A fase é independente; a conclusão mostra a explicação pedagógica e anomalias de atualização, inserção e exclusão.
- A cidade reutiliza PEDIDO/FUNCIONÁRIO/DEPARTAMENTO e deduplica edifícios e links entre Fases 3 e 4.

## Fases 1–3 e missão

- Fase 1: separar produtos agrupados em ITEM_PEDIDO, preservando `id_pedido`.
- Fase 2: DFs totais/parciais, decomposição em ITEM_PEDIDO e PRODUTO, PKs e preservação.
- Fase 3: dependência transitiva FUNCIONÁRIO → DEPARTAMENTO, PK/FK, relacionamento e decomposição sem perda.
- Missão: cenários de atualização, inserção e exclusão; estado em memória; fora do ranking.

## Progresso e persistência

- Chaves atuais: `normaliza:v2:players`, `normaliza:v2:player:<id>:progress`, `:pending`, `:ranking`.
- Migração: o primeiro perfil criado copia `normaliza:v1:progress` para o namespace do jogador; a chave antiga é mantida como backup.
- Scores/medalhas antigos não são considerados ranking oficial; o snapshot pode ser validado pelo servidor.
- Reset de fase limpa snapshot, tentativa pendente e evolução correspondente.
- “Reiniciar meu progresso” limpa o progresso local do jogador ativo, não os outros perfis.
- A missão permanece em memória.

## Corretude conceitual

- 1FN: valores atômicos, sem grupos repetitivos, registros individualizados.
- 2FN: já em 1FN; eliminar dependências parciais de atributos não primos em relação a chaves candidatas.
- 3FN: já em 2FN; para toda DF não trivial `X → A`, `X` deve ser superchave ou `A` deve ser atributo primo.
- Decomposição: preservar informação, verificar junção sem perda, considerar preservação de DFs e identificar PKs/FKs corretamente.
- Nunca inferir DF apenas porque valores se repetem na amostra. As regras do domínio devem ser declaradas.
- Não ensinar que qualquer divisão de tabela é normalização correta.
- Em 3FN com três tabelas, use chase/lossless join; uma separação visual não é suficiente.

## Backends: Supabase e local

### Supabase cloud/local

- Configuração pública: `config/supabase.js`.
- Migrações: `supabase/migrations/001_schema.sql`, `002_platform.sql`, `003_world.sql`, `004_auth.sql` e `005_admin.sql`, aplicadas pelo SQL Editor; o modo local usa `db/migrations/004_world.sql`, `005_content_order.sql`, `006_auth.sql`, `007_admin.sql` e `008_settings.sql`.
- Edge Functions: `create-profile`, `update-profile`, `start-attempt`, `record-hint`, `record-validation`, `submit-solution`, `complete-quest`.
- `_shared/phase-data.js` e `_shared/fase*.js` são cópias canônicas usadas pelo servidor; devem permanecer sincronizadas com `data/phases/` e `src/core/`.
- Deploy das funções pelo Dashboard ou Supabase CLI.
- O schema e as funções precisam ser aplicados antes de testar ranking compartilhado real.
- Consulte `docs/supabase-setup.md`.
- Para Supabase local, `supabase start` sobe o stack Docker; o provider Supabase usa a URL/key configurada.

### Modo local Docker Compose

- `docker compose up -d --build` sobe `db` (PostgreSQL 16), `api` (Node 22) e `web` (nginx).
- O app é servido em `http://localhost:8080`; o nginx faz proxy de `/api` para o serviço `api`.
- O PostgreSQL não publica porta no host; a API é a única camada de acesso.
- O ranking local começa vazio; não importa automaticamente o ranking do Supabase cloud.
- A API local usa as mesmas migrations núcleo e a mesma validação compartilhada de fases/pontuação.
- A API local expõe `GET /api/content` para o catálogo e `PUT /api/content` para a administração autenticada; o seed inicial usa `data/content.seed.json`.
- A API local expõe `/api/admin/*` para acesso, dashboard, usuários, papéis, bloqueio, auditoria e configurações; as rotas exigem permissão RBAC.
- A API local expõe `POST /api/quests/normaliza/complete`; a confirmação exige as quatro fases em `phase_results` e grava XP/nível em tabelas `platform_*` com idempotência.
- A sessão local usa token opaco vinculado a `users`; o jogador é criado com `user_id` e o mesmo `playerId` UUID do frontend.
- O `web` gera `config/runtime.js` no start do container a partir de `APP_BACKEND`/`LOCAL_API_URL`.
- `config/runtime.js` e `config/supabase.js` são públicos; a senha do Postgres fica apenas no `.env` local/Compose e nos containers.
- Consulte `docs/local-development.md`.

## Testes e publicação

- Antes de concluir: rodar `tools/verify.ps1` (unitários, interações, progresso, jogadores/ranking, fase 4 e screenshots).
- No modo local: `docker compose up -d --build`, validar `/api/health`, criar dois perfis, concluir a Fase 1, conferir ranking, reenviar o mesmo `client_match_id` e testar snapshot adulterado.
- Testar sem backend (modo offline) e, após deploy, testar RLS, dois perfis, ranking, duplicidade e adulteração.
- Publicação em `CafeGeek/docs/normaliza/`: copiar `index.html`, `assets/`, `src/`, `data/`, `config/`; não copiar `tests/`, `tools/`, `supabase/`, `docs/`, `AGENTS.md` ou `README.md`.
- A aplicação deve funcionar em subdiretório sem caminhos absolutos.
- Não alterar layouts/configurações globais do CafeGeek.
- Não publicar service role, senha do Postgres ou segredos. A publishable key é pública por design.

## Limitações conhecidas

- Schema/Edge Functions ainda não aplicados/deployados no Supabase cloud.
- O Compose local é um backend alternativo independente do Supabase; rankings cloud e local não são mesclados.
- No modo local, o token de sessão fica no navegador, mas usuários/sessões são validados no PostgreSQL; progresso detalhado ainda é local.
- Resultados offline têm política conservadora; tentativas/dicas offline não são verificáveis.
- Missão especial em memória.
- Sem BCNF/4FN/5FN.
- Cache/ranking local não substitui o backend.
- O banco local só persiste enquanto o volume `normaliza-pgdata` existir; `docker compose down -v` apaga os dados.
