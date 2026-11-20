# Modo local com Docker Compose

O modo local sobe o NORMALIZA! completo sem depender do Supabase cloud:

```text
web (nginx)  →  api (Node 22)  →  db (PostgreSQL 16)
```

O Supabase cloud continua disponível como backend de produção. O modo local é um backend independente; os rankings não são mesclados.

## Requisitos

- Docker Desktop no Windows 11 com WSL 2, ou Docker Engine + Compose no Linux.
- Docker Compose v2.
- Porta `8080` livre.
- Nenhuma porta do PostgreSQL ou da API é publicada no host.

## Primeiro start

```powershell
Copy-Item .env.example .env
```

Edite `.env` e troque `POSTGRES_PASSWORD`. O `.env` não deve ser commitado.

```powershell
docker compose up -d --build
docker compose ps
```

Abra `http://localhost:8080/`.

Verificações:

```powershell
Invoke-WebRequest http://localhost:8080/api/health
Invoke-WebRequest http://localhost:8080/config/runtime.js
```

O runtime deve indicar:

```js
window.__NORMALIZA_RUNTIME__ = {"backend":"local","local":{"apiBaseUrl":"/api"}};
```

O ranking local começa vazio. O catálogo do mapa é semeado no PostgreSQL a partir de `data/content.seed.json` e servido pela API; perfis locais e progresso individual do navegador continuam no `LocalStorage`.

## Serviços

### db

- Imagem `postgres:16-alpine`.
- Variáveis `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`.
- Volume `normaliza-pgdata`.
- Porta interna, não publicada.
- Healthcheck com `pg_isready`.

### api

- Imagem Node 22 Alpine.
- Dependência externa: apenas `pg`.
- Executa as migrations de `db/migrations/` no start.
- Endpoints em `/api`:
  - `POST /api/session`
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
  - `GET /api/players/me`
  - `POST /api/players/me`
  - `PATCH /api/players/me`
  - `GET /api/leaderboard`
  - `POST /api/profiles`
  - `PATCH /api/profiles/:id`
  - `POST /api/attempts`
  - `POST /api/attempts/:id/hints`
  - `POST /api/attempts/:id/validations`
  - `POST /api/results`
  - `GET /api/content`
  - `PUT /api/content` (autenticado)
  - `POST /api/quests/normaliza/complete`
  - `GET /api/health`
- A sessão local é um token opaco por navegador, armazenado no frontend.
- Ownership é validado em perfis, tentativas e resultados.
- A pontuação é recalculada no servidor com as mesmas regras de `_shared`.
- `client_match_id` impede duplicação.
- O servidor mantém o melhor resultado por fase.

### web

- nginx Alpine.
- Serve `index.html`, `assets/`, `src/`, `data/` e `config/`.
- Proxy `/api` para `api:3000`.
- Gera `config/runtime.js` com o modo local.
- Expõe apenas a porta `8080` por padrão.

## Variáveis

`.env.example`:

```dotenv
APP_BACKEND=local
LOCAL_API_URL=/api
APP_ORIGIN=http://localhost:8080
WEB_PORT=8080
POSTGRES_DB=normaliza
POSTGRES_USER=normaliza
POSTGRES_PASSWORD=troque_esta_senha
```

O container `web` só recebe configuração pública. A senha do Postgres é usada apenas por `db` e `api`.

## Migrations

- `db/migrations/001_core.sql`: tabelas, view de leaderboard e `record_phase_result`.
- `db/migrations/002_local.sql`: sessões locais.
- `db/migrations/003_platform.sql`: progresso de quests, XP e concessão idempotente da Quest 01.
- `db/migrations/004_world.sql`: territórios, trilhas, habilidades, especializações, personagens e views.
- `db/migrations/005_content_order.sql`: ordem e recompensas adicionais do catálogo de quests.
- `db/migrations/006_auth.sql`: usuários locais, vínculo `players.user_id`, bio e sessões autenticadas.
- O núcleo é portátil e não referencia `auth.users`.
- A migration do Supabase cloud permanece separada em `supabase/migrations/`.

Ao alterar migrations durante o desenvolvimento:

```powershell
docker compose down -v
docker compose up -d --build
```

`down -v` apaga o banco local. Em produção local, preserve o volume e faça backup.

## Backup e restauração

Backup lógico:

```powershell
docker compose exec -T db pg_dump -U normaliza normaliza > backup.sql
```

Restauração:

```powershell
Get-Content backup.sql | docker compose exec -T db psql -U normaliza -d normaliza
```

O catálogo do mapa, os usuários locais e os perfis de jogador estão no banco. A progressão detalhada dos navegadores ainda permanece no `LocalStorage`. A recuperação de senha local está indisponível sem serviço de e-mail; o Supabase Auth oferece esse fluxo no cloud.

## Dados e troca de backend

- O modo local não importa automaticamente o ranking do Supabase cloud.
- Perfis e progresso locais do navegador não são apagados ao trocar o backend.
- Ao jogar no modo local, o perfil é criado na API local usando o mesmo `playerId` UUID local.
- Resultados pendentes usam `client_match_id`; reenvios não duplicam.
- Progresso já concluído no navegador é reconciliado automaticamente com o ranking local.
- O ranking local é separado do ranking Supabase.

## Verificação automatizada do backend

```powershell
powershell -ExecutionPolicy Bypass -File tools/verify-local-backend.ps1
```

O script sobe o Compose, cria sessão e perfil, verifica a rejeição de quest incompleta, insere as quatro fases em `phase_results`, confirma a concessão de `188 XP`/nível `2`, repete a chamada para validar idempotência e testa autenticação e isolamento entre jogadores. Os dados de teste são removidos ao final.

## Teste manual recomendado

1. `docker compose up -d --build`.
2. Abrir `http://localhost:8080/`.
3. Criar dois perfis distintos.
4. Concluir uma fase com cada perfil.
5. Conferir ranking, pontos e fases concluídas.
6. Repetir a submissão do mesmo `client_match_id` e confirmar que não soma.
7. Enviar uma solução inválida e confirmar rejeição.
8. Parar com `docker compose down` e reiniciar com `docker compose up -d`; confirmar persistência.
9. Confirmar que `docker compose port db 5432` não expõe o banco no host.

## Supabase local

Se o objetivo for usar o stack Supabase local em vez do backend independente:

```powershell
supabase start
```

O provider Supabase usa a URL e a publishable key configuradas. O Compose local e o Supabase local são ambientes separados.

## Troubleshooting

- **`POSTGRES_PASSWORD` ausente:** crie `.env` a partir de `.env.example`.
- **Porta 8080 ocupada:** altere `WEB_PORT` no `.env`.
- **API não saudável:** `docker compose logs -f api`.
- **Banco não inicia:** `docker compose logs -f db`.
- **Runtime ainda Supabase:** verifique `docker compose logs web` e o conteúdo de `/config/runtime.js`.
- **Docker Desktop parado:** inicie o Docker Desktop e aguarde o engine.
- **Mudou migration mas o schema não:** o banco atualiza no start da API; se necessário, recrie o volume com aviso de perda.
