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
    $response = Invoke-WebRequest -Uri $Uri -Method $Method -Headers $Headers -Body $Body -UseBasicParsing -TimeoutSec 15
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
    $parameters.Body = $Body
    $parameters.ContentType = 'application/json'
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

