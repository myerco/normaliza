# Configuração do Supabase

O NORMALIZA! usa Supabase para identidade anônima, perfis, ranking, tentativas e validação oficial de resultados. O frontend no GitHub Pages usa somente a URL do projeto e a publishable key pública.

## 1. Configuração pública

Preencha `config/supabase.js` com:

- `url`: URL do projeto, por exemplo `https://SEU_PROJETO.supabase.co`.
- `publishableKey`: chave publishable/anon pública.
- `functionsUrl`: `https://SEU_PROJETO.supabase.co/functions/v1`.

Enquanto as funções não estiverem publicadas, o app continua funcionando localmente. O ranking fica indisponível e os resultados permanecem pendentes.

Nunca coloque no frontend:

- `SUPABASE_SERVICE_ROLE_KEY`;
- senha do Postgres;
- secret key;
- qualquer credencial administrativa.

## 2. Auth anônimo

No Dashboard:

1. Abra **Authentication → Providers**.
2. Ative **Anonymous sign-ins**.
3. Confirme que o projeto correto está selecionado.
4. Verifique em `/auth/v1/settings` que `external.anonymous_users` está `true`.

O jogador não informa e-mail, CPF ou telefone. O perfil é vinculado ao navegador.

Recomenda-se configurar CAPTCHA invisível/Turnstile ou rate limit adequado para reduzir abuso do endpoint anônimo.

## 3. Aplicar o schema pelo SQL Editor

1. Abra o **SQL Editor** do projeto.
2. Cole o conteúdo de `supabase/migrations/001_schema.sql` e execute.
3. Cole o conteúdo de `supabase/migrations/002_platform.sql` e execute.
4. Confirme que existem:
   - `public.players`
   - `public.phase_attempts`
   - `public.matches`
   - `public.phase_results`
   - `public.leaderboard`
   - `public.record_phase_result(...)`
   - `public.platform_player_progress`
   - `public.platform_quest_results`
   - `public.platform_xp_history`
   - `public.record_quest_completion(...)`

O SQL Editor é suficiente; não é necessário conectar diretamente ao Postgres.

### Verificação rápida

No SQL Editor:

```sql
select table_name from information_schema.tables
where table_schema = 'public'
order by table_name;

select * from public.leaderboard limit 10;
```

A view de leaderboard é pública para leitura e expõe apenas nome, avatar, pontos, fases, momento da pontuação e posição.

## 4. Publicar as Edge Functions

As funções estão em:

```text
supabase/functions/
  create-profile/
  update-profile/
  start-attempt/
  record-hint/
  record-validation/
  submit-solution/
  complete-quest/
  _shared/
```

Com Supabase CLI:

```powershell
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase functions deploy create-profile
supabase functions deploy update-profile
supabase functions deploy start-attempt
supabase functions deploy record-hint
supabase functions deploy record-validation
supabase functions deploy submit-solution
supabase functions deploy complete-quest
```

Também é possível criar cada função pelo Dashboard. A pasta `_shared/` contém as regras canônicas e não pode ser omitida.

### Secrets

As funções precisam de:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

O runtime do Supabase normalmente fornece as variáveis padrão. Se necessário, configure-as em **Project Settings → Edge Functions → Secrets**. A service role nunca vai para o navegador.

## 5. Sincronização das regras

`supabase/functions/_shared/phase-data.js` e as cópias `fase1.js`–`fase4.js` devem permanecer sincronizadas com:

- `data/phases/fase-1.json` até `fase-4.json`;
- `src/core/fase1.js` até `fase4.js`.

Ao alterar uma fase, copie a versão canônica para `_shared/` e rode os testes. O servidor é a autoridade da pontuação oficial.

## 6. Testes de segurança

Com a publishable key no frontend, tente diretamente pela API:

- inserir uma partida em `matches`;
- alterar `phase_results`;
- inserir um jogador em `players`;
- consultar os dados privados de outro jogador.

Essas operações devem ser bloqueadas pela RLS. As operações permitidas passam pelas Edge Functions, que verificam o JWT anônimo e o `owner_id`.

Teste também:

1. criar dois perfis no mesmo navegador;
2. concluir uma fase com cada perfil;
3. confirmar que os progressos são independentes;
4. abrir o ranking e conferir pontos, fases e desempates;
5. reenviar o mesmo `client_match_id` e confirmar que não soma pontos;
6. enviar um snapshot adulterado e confirmar rejeição;
7. simular offline, concluir uma fase, voltar online e sincronizar;
8. confirmar que o resultado só aparece como sincronizado após a resposta do servidor.

## 7. CORS e GitHub Pages

O frontend é estático e pode ser servido em subdiretório. As chamadas ao Supabase usam a URL pública; não há proxy.

- Mantenha a publishable key no `config/supabase.js` publicado.
- Não publique `supabase/`, `tests/` ou `tools/`.
- O Auth e as Edge Functions devem aceitar a origem do GitHub Pages. O preflight REST já foi validado com `Access-Control-Allow-Origin: *`.
- A Configuração de Auth anônimo e o login precisam da chave publishable e de CORS.

## 8. Limitações atuais

- O schema e as funções ainda não estão aplicados no projeto validado.
- Tentativas e dicas online são registradas no servidor; offline não são verificáveis.
- A pontuação offline é conservadora.
- O perfil não é transferível para outro navegador nesta versão.
- O ranking local/cache nunca substitui a view compartilhada.
