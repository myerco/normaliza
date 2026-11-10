# NORMALIZA!

Jogo educativo de normalização de bancos de dados. A cidade isométrica é o mapa do jogo: cada edifício representa uma tabela, e as ruas representam relacionamentos. O jogador avança por três fases — 1FN, 2FN e 3FN — e por uma missão especial sobre anomalias de redundância.

## Descrição

O objetivo é ensinar, de forma prática, por que a normalização importa e como aplicá-la:

- **Centro de Distribuição (1FN):** separar grupos repetitivos em linhas atômicas, preservando a identificação do pedido.
- **Rede de Dependências (2FN):** identificar dependências funcionais totais e parciais e decompor `ITEM_PEDIDO`.
- **Cidade Organizada (3FN):** identificar dependência transitiva, criar `FUNCIONÁRIO` e `DEPARTAMENTO`, definir PK/FK e relacionamento.
- **Administração da Cidade (missão especial):** demonstrar anomalias de atualização, inserção e exclusão em modelos desnormalizados e normalizados.

Cada resposta incorreta apresenta explicação conceitual. O jogo oferece dicas contextuais, glossário, visualização das estruturas antes/depois, pontuação por qualidade da solução, medalhas e persistência do progresso das fases.

## Tecnologias

- HTML5 e CSS3.
- JavaScript ES6+ com ES Modules.
- SVG para a cidade e os edifícios.
- JSON para dados de fases, cidade, missão, glossário e dicas.
- `LocalStorage` para persistência do progresso.
- Sem backend, bundler, framework ou dependências externas.
- Sem etapa de build: os arquivos são servidos diretamente por um servidor estático.

## Arquitetura

A aplicação é uma SPA estática com rotas por hash. As responsabilidades são separadas para permitir testes isolados:

- **Dados:** `data/` contém a cidade, as fases, a missão, o glossário e as dicas. As fases e desafios são configurados por JSON, não hardcoded na UI.
- **Regras puras:** `src/core/` contém as regras de 1FN, 2FN, 3FN, anomalias da missão e cálculo de progresso. Não dependem do DOM.
- **Validação de dados:** `src/data/` valida a estrutura dos JSONs antes de iniciar o jogo.
- **Estado e rotas:** `src/state/` e `src/router/` controlam a tela atual, o edifício selecionado e as rotas.
- **Persistência:** `src/persistence/storage.js` usa a chave `normaliza:v1:progress`.
- **UI:** `src/ui/` renderiza cidade, HUD, painel, fases, missão, ajuda, confirmação e celebração. Os controllers de fase salvam snapshots automaticamente.
- **Testes:** `tests/` contém o harness no navegador e os testes de interação. `tools/verify.ps1` executa a verificação headless.

Fluxo principal: `index.html` → `src/main.js` carrega e valida os JSONs → monta cidade, fases e missão → resolve a rota por hash → renderiza a tela atual.

## Organização dos diretórios

```text
.
├── index.html
├── assets/
│   └── css/app.css
├── data/
│   ├── city.json
│   ├── glossary.json
│   ├── tips.json
│   ├── phases/
│   │   ├── fase-1.json
│   │   ├── fase-2.json
│   │   └── fase-3.json
│   └── missions/
│       └── administracao.json
├── src/
│   ├── main.js
│   ├── core/
│   │   ├── fase1.js
│   │   ├── fase2.js
│   │   ├── fase3.js
│   │   ├── administration.js
│   │   └── progress.js
│   ├── data/
│   ├── persistence/
│   ├── router/
│   ├── state/
│   └── ui/
├── tests/
├── tools/
│   ├── verify.ps1
│   └── mobile-preview.html
└── README.md
```

## Como executar localmente

Não há build. Como o app usa ES Modules e `fetch`, não abra `index.html` diretamente como arquivo; sirva por HTTP.

No Windows, com Python disponível:

```powershell
py -m http.server 8000 --directory .
```

Abra:

- Aplicação: `http://localhost:8000/`
- Testes unitários: `http://localhost:8000/tests/run-tests.html`
- Interações da Fase 1: `http://localhost:8000/tests/interactions.html`
- Interações da Fase 2: `http://localhost:8000/tests/interactions-phase2.html`
- Interações da Fase 3: `http://localhost:8000/tests/interactions-phase3.html`
- Missão especial: `http://localhost:8000/tests/interactions-mission.html`
- Regressão de progresso, medalhas e recuperação: `http://localhost:8000/tests/interactions-progress.html`

Também é possível usar qualquer servidor estático, como `python -m http.server` ou a extensão Live Server do VS Code.

### Verificação automatizada

Com Python e Chrome/Edge instalados:

```powershell
powershell -ExecutionPolicy Bypass -File tools/verify.ps1
```

O script inicia um servidor temporário, executa os testes unitários e as interações, e gera screenshots em `%TEMP%`. Use `-SkipScreenshots` para rodar apenas os testes.

## Como publicar no GitHub Pages

O app usa caminhos relativos para CSS, imports, `fetch` dos JSONs e assets. Por isso funciona tanto na raiz quanto em um subdiretório, desde que a pasta completa seja publicada junta.

### Opção recomendada — publicar em `CafeGeek/docs/normaliza/`

1. Copie apenas o runtime para o subdiretório do site:

```powershell
robocopy . ..\CafeGeek\docs\normaliza /E /XD .git tests tools /XF AGENTS.md README.md
```

2. Confirme que foram copiados `index.html`, `assets/`, `src/` e `data/`.
3. Não copie `tests/`, `tools/`, `AGENTS.md` nem este `README.md`; eles não fazem parte do runtime publicado.
4. Faça commit e push no repositório do CafeGeek. O GitHub Pages/Jekyll publica os arquivos estáticos no caminho correspondente, por exemplo `https://cafegeek.eti.br/normaliza/`.
5. Abra a URL publicada e valide a rota da cidade e uma fase direta, como `/normaliza/#/fase/cidade-organizada`.

Não é necessário alterar layouts, estilos ou configurações globais do CafeGeek. O app é independente e não interfere no tema do site.

### Opção alternativa — site próprio do NORMALIZA!

Publique `index.html`, `assets/`, `src/` e `data/` na raiz do repositório configurado como GitHub Pages. Nesse caso, o app fica disponível em `https://<usuario>.github.io/<repositorio>/`.

Pontos importantes para qualquer opção:

- Mantenha a estrutura relativa (`assets/`, `src/`, `data/`) intacta.
- Não mova o `index.html` para fora da pasta que contém `src/` e `data/`.
- Os arquivos são estáticos e não possuem front matter; o Jekyll os copia sem processar. Um `.nojekyll` na raiz publicada é opcional e não é necessário para o funcionamento.
- O progresso é salvo no `LocalStorage` da origem; caminhos diferentes no mesmo domínio compartilham a origem, mas outro domínio começa vazio.

## Como criar novas fases

O escopo atual vai até a 3FN. Não implemente BCNF, 4FN ou 5FN sem uma nova solicitação.

1. **Crie o JSON da fase** em `data/phases/`, por exemplo `fase-4.json`. Use como referência a estrutura de `fase-3.json`: `id`, `title`, `normalForm`, `sourceTable`, `attributes`, `candidateKey`, `functionalDependencies`, `rows`, `targetTables`, `relationships`, `concepts`, `rules`, `hints`, `scoring` e `cityEvolution`.
2. **Implemente as regras puras** em `src/core/` com funções de criação de estado, operações, validação, pontuação, dicas, snapshot e hidratação. Não acesse o DOM nesse módulo.
3. **Implemente a validação estrutural** do JSON em `src/data/` e chame-a no boot de `src/main.js`.
4. **Implemente o controller/UI** em `src/ui/`, seguindo `phase1.js`, `phase2.js` ou `phase3.js`, com alternativa a drag-and-drop e foco gerenciado.
5. **Adicione os hosts e o controller:**
   - crie o host da fase em `index.html`;
   - registre o controller e a definição da fase em `src/main.js`;
   - inclua a fase no cálculo de progresso e nas medalhas.
6. **Atualize a cidade:**
   - adicione ou reutilize um edifício em `data/city.json`;
   - configure a evolução em `cityEvolution`;
   - garanta que remover/reiniciar a fase também remova a evolução correspondente.
7. **Cubra com testes:**
   - regras puras no harness de `tests/`;
   - interação principal em `tests/`;
   - regressão de progresso e recuperação em `tests/interactions-progress.html`;
   - execute `tools/verify.ps1`.

Regras conceituais obrigatórias:

- 1FN: valores atômicos, sem grupos repetitivos, registros individualizados.
- 2FN: já em 1FN; eliminar dependências parciais de atributos não primos em relação às chaves candidatas.
- 3FN: já em 2FN; para toda DF não trivial `X → A`, `X` deve ser superchave ou `A` deve ser atributo primo.
- Decomposição: preservar informação, verificar junção sem perda, considerar preservação de DFs e identificar PKs/FKs corretamente.
- Nunca inferir DF apenas porque valores se repetem na amostra. Declare as regras do domínio no JSON.

## Como alterar os desafios

Os desafios são dados, não código. Altere preferencialmente os arquivos em `data/`.

- **Fases:** edite `data/phases/fase-1.json`, `fase-2.json` ou `fase-3.json`.
- **Missão especial:** edite `data/missions/administracao.json`.
- **Cidade:** edite `data/city.json`.
- **Glossário e dicas:** edite `data/glossary.json` e `data/tips.json`.

Ao mudar um exercício, mantenha a coerência entre:

- atributos de origem e linhas de exemplo;
- dependências funcionais declaradas;
- tabelas de destino, atributos e PKs;
- FKs e relacionamentos;
- conceitos, regras, dicas e explicações;
- evolução da cidade e rótulos/medalhas;
- pontuação (máximo de 100 por fase);
- testes unitários, interações e snapshots de progresso.

Depois de alterar:

1. Atualize os testes e, se necessário, o snapshot semeado em `tests/interactions-progress.html`.
2. Rode os testes no navegador.
3. Rode `tools/verify.ps1`.
4. Verifique o console do navegador e as rotas diretas das fases.

Não enfraqueça os validadores para fazer um teste passar. Se uma solução do jogador não preserva DFs, perde junção, usa PK/FK errada ou infere uma DF não declarada, ela deve continuar sendo rejeitada com explicação conceitual.

## Limitações conhecidas

- O estado da missão especial é mantido em memória; recarregar a página reinicia os cenários da missão. O progresso das três fases, pontuação, medalhas e evolução da cidade são persistidos.
- O progresso fica apenas no `LocalStorage`; limpar os dados do navegador apaga o progresso.
- Formas normais avançadas (BCNF, 4FN, 5FN) não fazem parte do escopo atual.
- A cidade e os exemplos de cada fase são amostras ilustrativas; o foco é a regra de normalização, não um único dataset corporativo unificado.
- Não há backend, autenticação nem sincronização entre dispositivos.
- Ruby/Jekyll não estão disponíveis no ambiente de desenvolvimento usado neste repositório; a publicação no GitHub Pages depende do build do site do CafeGeek. A compatibilidade com subdiretório foi validada com uma cópia estática servida em `/normaliza/`.
