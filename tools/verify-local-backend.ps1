param(
  [int]$TimeoutSeconds = 60
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

$apiBase = 'http://localhost:8080/api'
$playerId = [guid]::NewGuid().ToString()
$characterId = [guid]::NewGuid().ToString()
$name = "BackendTest$((Get-Random -Minimum 1000 -Maximum 9999))"
$sessionOwner = $null
$otherOwner = $null
$failed = $false
$originalContent = $null
$headers = $null
$adminEmail = "admintest$((Get-Random -Minimum 1000 -Maximum 9999))@teste.local"
$adminToken = $null
$adminHeaders = $null
$authEmail = "authtest$((Get-Random -Minimum 1000 -Maximum 9999))@teste.local"
$otherAuthEmail = "authother$((Get-Random -Minimum 1000 -Maximum 9999))@teste.local"
$authPlayerId = [guid]::NewGuid().ToString()
$authToken = $null

function Write-Step([string]$message) {
  Write-Output $message
}

function Invoke-ApiStatus {
  param(
    [string]$Uri,
    [string]$Method = 'GET',
    [hashtable]$Headers = @{},
    [string]$Body = $null
  )

  try {
    $parameters = @{
      Uri = $Uri
      Method = $Method
      Headers = $Headers
      UseBasicParsing = $true
      TimeoutSec = 15
    }

    if ($Body) {
      $parameters.Body = [Text.Encoding]::UTF8.GetBytes($Body)
      $parameters.ContentType = 'application/json; charset=utf-8'
    }

    $response = Invoke-WebRequest @parameters
    return [int]$response.StatusCode
  } catch {
    if ($_.Exception.Response) {
      return [int]$_.Exception.Response.StatusCode
    }
    throw
  }
}

function Invoke-ApiJson {
  param(
    [string]$Uri,
    [string]$Method = 'GET',
    [hashtable]$Headers = @{},
    [string]$Body = $null
  )

  $parameters = @{
    Uri = $Uri
    Method = $Method
    Headers = $Headers
    TimeoutSec = 15
  }

  if ($Body) {
    $parameters.Body = [Text.Encoding]::UTF8.GetBytes($Body)
    $parameters.ContentType = 'application/json; charset=utf-8'
  }

  return Invoke-RestMethod @parameters
}

function Invoke-Db([string]$Sql) {
  return & docker compose exec -T db psql -U normaliza -d normaliza -t -A -c $Sql
}

try {
  Write-Step 'Garantindo o stack local...'
  & docker compose up -d db api web | Out-Null

  $ready = $false
  for ($attempt = 0; $attempt -lt 40; $attempt += 1) {
    try {
      $health = Invoke-ApiJson -Uri "$apiBase/health"
      if ($health.ok -eq $true) {
        $ready = $true
        break
      }
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }

  if (-not $ready) {
    throw 'A API local não respondeu em http://localhost:8080/api/health.'
  }

  $session = Invoke-ApiJson -Uri "$apiBase/session" -Method 'POST' -Body '{}'
  $sessionOwner = $session.ownerId
  $headers = @{
    Authorization = "Bearer $($session.token)"
  }

  $adminRegistration = Invoke-ApiJson -Uri "$apiBase/auth/register" -Method 'POST' -Body (@{
    email = $adminEmail
    password = 'senha12345'
  } | ConvertTo-Json)
  $adminToken = $adminRegistration.token
  $adminHeaders = @{ Authorization = "Bearer $adminToken" }
  Invoke-Db "insert into public.user_roles (user_id, role_id) values ('$($adminRegistration.user.id)', 'administrator') on conflict do nothing;" | Out-Null
  $adminAccess = Invoke-ApiJson -Uri "$apiBase/admin/me" -Headers $adminHeaders
  if (-not ($adminAccess.permissions -contains 'admin.dashboard')) {
    throw 'Permissões administrativas não foram atribuídas.'
  }
  $dashboard = Invoke-ApiJson -Uri "$apiBase/admin/dashboard" -Headers $adminHeaders
  if ($dashboard.counts.territories -ne 5 -or $dashboard.counts.tracks -ne 48) {
    throw 'Dashboard administrativo não retornou dados reais do catálogo.'
  }
  $adminUsers = Invoke-ApiJson -Uri "$apiBase/admin/users?search=$adminEmail" -Headers $adminHeaders
  if ($adminUsers.users.Count -lt 1) {
    throw 'Listagem administrativa de usuários não encontrou a conta de teste.'
  }
  $adminDetail = Invoke-ApiJson -Uri "$apiBase/admin/users/$($adminRegistration.user.id)" -Headers $adminHeaders
  if ($adminDetail.id -ne $adminRegistration.user.id) {
    throw 'Detalhe administrativo de usuário não retornou a conta solicitada.'
  }
  Write-Step 'RBAC administrativo e dashboard: permissões, usuários, detalhe e contagens OK'

  $content = Invoke-ApiJson -Uri "$apiBase/content"
  if (
    $content.world.territories.Count -ne 5 -or
    $content.world.tracks.Count -ne 48 -or
    $content.world.skills.Count -ne 44 -or
    $content.world.professions.Count -ne 12 -or
    $content.questCatalog.quests.Count -ne 4
  ) {
    throw 'Conteúdo inicial do PostgreSQL inesperado.'
  }

  $originalContent = $content | ConvertTo-Json -Depth 30
  $modifiedContent = $content | ConvertTo-Json -Depth 30 | ConvertFrom-Json
  $territory = $modifiedContent.world.territories | Where-Object { $_.id -eq 'dados' }
  $territory.name = 'Dados e Banco de Dados DB Test'
  Invoke-ApiJson -Uri "$apiBase/content" -Method 'PUT' -Headers $adminHeaders -Body ($modifiedContent | ConvertTo-Json -Depth 30) | Out-Null
  $persisted = Invoke-ApiJson -Uri "$apiBase/content"
  if (($persisted.world.territories | Where-Object { $_.id -eq 'dados' }).name -ne 'Dados e Banco de Dados DB Test') {
    throw 'Conteúdo alterado não foi persistido no PostgreSQL.'
  }
  Invoke-ApiJson -Uri "$apiBase/content" -Method 'PUT' -Headers $adminHeaders -Body $originalContent | Out-Null
  Write-Step 'Conteúdo do mapa no PostgreSQL: 5 territórios, 48 trilhas, 44 habilidades, 12 especializações OK'

  $noContentAuth = Invoke-ApiStatus -Uri "$apiBase/content" -Method 'PUT' -Body '{}'
  if ($noContentAuth -ne 401) {
    throw "Esperado 401 ao salvar conteúdo sem autenticação; recebido $noContentAuth."
  }

  $authRegistration = Invoke-ApiJson -Uri "$apiBase/auth/register" -Method 'POST' -Body (@{
    email = $authEmail
    password = 'senha12345'
  } | ConvertTo-Json)
  $authToken = $authRegistration.token
  $authHeaders = @{ Authorization = "Bearer $authToken" }

  $authMe = Invoke-ApiJson -Uri "$apiBase/auth/me" -Headers $authHeaders
  if ($authMe.user.email -ne $authEmail) {
    throw 'Usuário autenticado não corresponde ao cadastro.'
  }

  $authPlayer = Invoke-ApiJson -Uri "$apiBase/players/me" -Method 'POST' -Headers $authHeaders -Body (@{
    playerId = $authPlayerId
    name = "Auth Player $((Get-Random -Minimum 1000 -Maximum 9999))"
    bio = 'Jogador de teste autenticado.'
    avatarId = 'analista'
  } | ConvertTo-Json)
  $authPlayerAgain = Invoke-ApiJson -Uri "$apiBase/players/me" -Method 'POST' -Headers $authHeaders -Body (@{
    playerId = $authPlayerId
    name = 'Nome Que Não Deve Sobrescrever'
    avatarId = 'engenheiro'
  } | ConvertTo-Json)

  if ($authPlayer.player.id -ne $authPlayerId -or $authPlayerAgain.created -ne $false) {
    throw 'Criação idempotente do jogador falhou.'
  }

  $otherAuth = Invoke-ApiJson -Uri "$apiBase/auth/register" -Method 'POST' -Body (@{
    email = $otherAuthEmail
    password = 'senha12345'
  } | ConvertTo-Json)
  $otherAuthHeaders = @{ Authorization = "Bearer $($otherAuth.token)" }
  $crossPlayerStatus = Invoke-ApiStatus -Uri "$apiBase/players/me" -Method 'POST' -Headers $otherAuthHeaders -Body (@{
    playerId = $authPlayerId
    name = 'Tentativa Cruzada'
    avatarId = 'analista'
  } | ConvertTo-Json)
  if ($crossPlayerStatus -ne 403) {
    throw "Esperado 403 ao reutilizar jogador de outra conta; recebido $crossPlayerStatus."
  }

  $login = Invoke-ApiJson -Uri "$apiBase/auth/login" -Method 'POST' -Body (@{
    email = $authEmail
    password = 'senha12345'
  } | ConvertTo-Json)
  $authToken = $login.token
  $authHeaders = @{ Authorization = "Bearer $authToken" }
  Invoke-ApiJson -Uri "$apiBase/auth/logout" -Method 'POST' -Headers $authHeaders | Out-Null
  $afterLogout = Invoke-ApiStatus -Uri "$apiBase/auth/me" -Headers $authHeaders
  if ($afterLogout -ne 401) {
    throw "Esperado 401 após logout; recebido $afterLogout."
  }
  Write-Step 'User/Player e autenticação: registro, login, vínculo, 403 e logout OK'

  Invoke-ApiJson -Uri "$apiBase/profiles" -Method 'POST' -Headers $headers -Body (@{
    playerId = $playerId
    name = $name
    avatarId = 'analista'
  } | ConvertTo-Json) | Out-Null

  $incompleteStatus = Invoke-ApiStatus -Uri "$apiBase/quests/normaliza/complete" -Method 'POST' -Headers $headers -Body (@{
    playerId = $playerId
    characterId = $characterId
  } | ConvertTo-Json)

  if ($incompleteStatus -ne 409) {
    throw "Esperado 409 para quest incompleta; recebido $incompleteStatus."
  }
  Write-Step 'Quest incompleta: 409 OK'

  $phaseIds = @(
    'centro-de-distribuicao',
    'rede-de-dependencias',
    'cidade-organizada',
    'gestao-de-funcionarios-e-pedidos'
  )
  $values = ($phaseIds | ForEach-Object { "('$playerId','$_',100)" }) -join ','
  Invoke-Db "insert into public.phase_results (player_id, phase_id, best_score) values $values on conflict (player_id, phase_id) do update set best_score = excluded.best_score;" | Out-Null

  $body = @{
    playerId = $playerId
    characterId = $characterId
  } | ConvertTo-Json

  $first = Invoke-ApiJson -Uri "$apiBase/quests/normaliza/complete" -Method 'POST' -Headers $headers -Body $body
  $second = Invoke-ApiJson -Uri "$apiBase/quests/normaliza/complete" -Method 'POST' -Headers $headers -Body $body

  if ($first.xp -ne 188 -or $first.level -ne 2) {
    throw "Concessão inesperada: XP=$($first.xp), nível=$($first.level)."
  }

  if ($second.xp -ne $first.xp -or $second.level -ne $first.level) {
    throw 'A segunda concessão não foi idempotente.'
  }

  $resultCount = [int](Invoke-Db "select count(*) from public.platform_quest_results where player_id = '$playerId';")
  $xpCount = [int](Invoke-Db "select count(*) from public.platform_xp_history where player_id = '$playerId';")
  $storedXp = [int](Invoke-Db "select xp from public.platform_player_progress where player_id = '$playerId';")

  if ($resultCount -ne 1 -or $xpCount -ne 1 -or $storedXp -ne 188) {
    throw "Persistência inesperada: resultados=$resultCount, xp-history=$xpCount, xp=$storedXp."
  }
  Write-Step 'Quest concluída e idempotente: 188 XP, nível 2 OK'

  $noAuthStatus = Invoke-ApiStatus -Uri "$apiBase/quests/normaliza/complete" -Method 'POST' -Body $body
  if ($noAuthStatus -ne 401) {
    throw "Esperado 401 sem autenticação; recebido $noAuthStatus."
  }

  $other = Invoke-ApiJson -Uri "$apiBase/session" -Method 'POST' -Body '{}'
  $otherOwner = $other.ownerId
  $otherHeaders = @{
    Authorization = "Bearer $($other.token)"
  }
  $forbiddenStatus = Invoke-ApiStatus -Uri "$apiBase/quests/normaliza/complete" -Method 'POST' -Headers $otherHeaders -Body $body
  if ($forbiddenStatus -ne 404) {
    throw "Esperado 404 para jogador de outro dono; recebido $forbiddenStatus."
  }
  Write-Step 'Autorização por jogador: 401/404 OK'
} catch {
  $failed = $true
  Write-Output "FALHA: $($_.Exception.Message)"
} finally {
  if ($originalContent -and $headers) {
    try {
  Invoke-ApiJson -Uri "$apiBase/content" -Method 'PUT' -Headers $adminHeaders -Body $originalContent | Out-Null
    } catch {
      Write-Output 'Aviso: não foi possível restaurar o conteúdo original.'
    }
  }

  foreach ($cleanupEmail in @($adminEmail, $authEmail, $otherAuthEmail)) {
    if ($cleanupEmail) {
      $safeEmail = $cleanupEmail.Replace("'", "''")
      Invoke-Db "delete from public.players where user_id in (select id from public.users where email_normalized = lower('$safeEmail')); delete from public.local_sessions where user_id in (select id from public.users where email_normalized = lower('$safeEmail')); delete from public.users where email_normalized = lower('$safeEmail');" | Out-Null
    }
  }

  if ($playerId) {
    $safePlayer = $playerId.Replace("'", "''")
    Invoke-Db "delete from public.players where id = '$safePlayer';" | Out-Null
  }

  if ($sessionOwner) {
    $safeOwner = $sessionOwner.Replace("'", "''")
    Invoke-Db "delete from public.local_sessions where owner_id = '$safeOwner';" | Out-Null
  }

  if ($otherOwner) {
    $safeOwner = $otherOwner.Replace("'", "''")
    Invoke-Db "delete from public.local_sessions where owner_id = '$safeOwner';" | Out-Null
  }
}

if ($failed) {
  exit 1
}

Write-Output 'Backend local: PASS'

