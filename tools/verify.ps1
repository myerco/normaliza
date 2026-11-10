param(
  [int]$Port = 0,
  [switch]$SkipScreenshots
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$browserCandidates = @(
  'C:\Program Files\Google\Chrome\Application\chrome.exe',
  'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
  'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
  'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
)

$browser = $browserCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $browser) {
  throw 'Chrome ou Edge não encontrado. Instale um navegador Chromium para rodar a verificação headless.'
}

$python = Get-Command py -ErrorAction SilentlyContinue
if (-not $python) {
  $python = Get-Command python -ErrorAction SilentlyContinue
}
if (-not $python) {
  throw 'Python não encontrado. O servidor local usa "py -m http.server".'
}

if ($Port -eq 0) {
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
  $listener.Start()
  $Port = $listener.LocalEndpoint.Port
  $listener.Stop()
}

$baseUrl = "http://127.0.0.1:$Port"
$server = $null
$failed = $false

function Invoke-HeadlessBrowser {
  param(
    [string[]]$Arguments,
    [string]$OutputPath
  )

  $profile = Join-Path $env:TEMP ('normaliza-headless-' + [guid]::NewGuid().ToString('N'))
  $errorLog = Join-Path $env:TEMP ('normaliza-headless-error-' + [guid]::NewGuid().ToString('N') + '.log')
  $allArguments = @(
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    "--user-data-dir=$profile"
  ) + $Arguments

  try {
    Start-Process -FilePath $browser `
      -ArgumentList $allArguments `
      -Wait `
      -NoNewWindow `
      -RedirectStandardOutput $OutputPath `
      -RedirectStandardError $errorLog | Out-Null
  } finally {
    Remove-Item -LiteralPath $profile -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $errorLog -Force -ErrorAction SilentlyContinue
  }
}

try {
  $server = Start-Process -FilePath $python.Source `
    -ArgumentList @('-m', 'http.server', "$Port", '--directory', $root) `
    -PassThru `
    -WindowStyle Hidden

  $ready = $false
  for ($attempt = 0; $attempt -lt 40; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri "$baseUrl/" -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -eq 200) {
        $ready = $true
        break
      }
    } catch {
      Start-Sleep -Milliseconds 250
    }
  }

  if (-not $ready) {
    throw "O servidor local não respondeu em $baseUrl."
  }

  $testsDomPath = Join-Path $env:TEMP 'normaliza-tests-dom.html'
  Invoke-HeadlessBrowser `
    -Arguments @('--virtual-time-budget=12000', '--dump-dom', "$baseUrl/tests/run-tests.html") `
    -OutputPath $testsDomPath

  $dom = Get-Content -LiteralPath $testsDomPath -Raw
  $summaryMatch = [regex]::Match($dom, '([0-9]+) passaram, ([0-9]+) falharam')

  if ($summaryMatch.Success) {
    Write-Output ("Testes: {0} passaram, {1} falharam." -f $summaryMatch.Groups[1].Value, $summaryMatch.Groups[2].Value)
  } else {
    Write-Output 'Testes: não foi possível ler o resumo da página de testes.'
  }

  if ($dom -notmatch 'data-test-status="pass"') {
    $failed = $true
    Write-Output "DOM dos testes salvo em: $testsDomPath"
  }

  $interactionsDomPath = Join-Path $env:TEMP 'normaliza-interactions-dom.html'
  Invoke-HeadlessBrowser `
    -Arguments @(
      '--window-size=1440,980',
      '--virtual-time-budget=40000',
      '--dump-dom',
      "$baseUrl/tests/interactions.html"
    ) `
    -OutputPath $interactionsDomPath

  $interactionsDom = Get-Content -LiteralPath $interactionsDomPath -Raw

  if ($interactionsDom -match '<body[^>]*data-interaction-status="pass"') {
    Write-Output 'Interacoes Fase 1: PASS'
  } else {
    $failed = $true
    Write-Output 'Interacoes Fase 1: FAIL'
    Write-Output "DOM das interacoes da Fase 1 salvo em: $interactionsDomPath"
  }

  $interactionsPhase2DomPath = Join-Path $env:TEMP 'normaliza-interactions-phase2-dom.html'
  Invoke-HeadlessBrowser `
    -Arguments @(
      '--window-size=1440,980',
      '--virtual-time-budget=60000',
      '--dump-dom',
      "$baseUrl/tests/interactions-phase2.html"
    ) `
    -OutputPath $interactionsPhase2DomPath

  $interactionsPhase2Dom = Get-Content -LiteralPath $interactionsPhase2DomPath -Raw

  if ($interactionsPhase2Dom -match '<body[^>]*data-interaction-status="pass"') {
    Write-Output 'Interacoes Fase 2: PASS'
  } else {
    $failed = $true
    Write-Output 'Interacoes Fase 2: FAIL'
    Write-Output "DOM das interacoes da Fase 2 salvo em: $interactionsPhase2DomPath"
  }

  $interactionsPhase3DomPath = Join-Path $env:TEMP 'normaliza-interactions-phase3-dom.html'
  Invoke-HeadlessBrowser `
    -Arguments @(
      '--window-size=1440,980',
      '--virtual-time-budget=60000',
      '--dump-dom',
      "$baseUrl/tests/interactions-phase3.html"
    ) `
    -OutputPath $interactionsPhase3DomPath

  $interactionsPhase3Dom = Get-Content -LiteralPath $interactionsPhase3DomPath -Raw

  if ($interactionsPhase3Dom -match '<body[^>]*data-interaction-status="pass"') {
    Write-Output 'Interacoes Fase 3: PASS'
  } else {
    $failed = $true
    Write-Output 'Interacoes Fase 3: FAIL'
    Write-Output "DOM das interacoes da Fase 3 salvo em: $interactionsPhase3DomPath"
  }

  $missionInteractionsDomPath = Join-Path $env:TEMP 'normaliza-mission-dom.html'
  Invoke-HeadlessBrowser `
    -Arguments @(
      '--window-size=1440,980',
      '--virtual-time-budget=60000',
      '--dump-dom',
      "$baseUrl/tests/interactions-mission.html"
    ) `
    -OutputPath $missionInteractionsDomPath

  $missionInteractionsDom = Get-Content -LiteralPath $missionInteractionsDomPath -Raw

  if ($missionInteractionsDom -match '<body[^>]*data-interaction-status="pass"') {
    Write-Output 'Interacoes Missao: PASS'
  } else {
    $failed = $true
    Write-Output 'Interacoes Missao: FAIL'
    Write-Output "DOM das interacoes da missao salvo em: $missionInteractionsDomPath"
  }

  $progressDomPath = Join-Path $env:TEMP 'normaliza-progress-dom.html'
  Invoke-HeadlessBrowser `
    -Arguments @(
      '--window-size=1440,980',
      '--virtual-time-budget=60000',
      '--dump-dom',
      "$baseUrl/tests/interactions-progress.html"
    ) `
    -OutputPath $progressDomPath

  $progressDom = Get-Content -LiteralPath $progressDomPath -Raw

  if ($progressDom -match '<body[^>]*data-interaction-status="pass"') {
    Write-Output 'Regressao Progresso: PASS'
  } else {
    $failed = $true
    Write-Output 'Regressao Progresso: FAIL'
    Write-Output "DOM da regressao de progresso salvo em: $progressDomPath"
  }

  if (-not $SkipScreenshots) {
    $shots = @(
      @{ Name = 'normaliza-inicio.png'; Url = "$baseUrl/"; Size = '1440,900' },
      @{ Name = 'normaliza-cidade.png'; Url = "$baseUrl/#/cidade"; Size = '1440,900' },
      @{ Name = 'normaliza-pedido.png'; Url = "$baseUrl/#/cidade/pedido"; Size = '1440,900' },
      @{ Name = 'normaliza-fase1.png'; Url = "$baseUrl/#/fase/centro-de-distribuicao"; Size = '1440,1100' },
      @{ Name = 'normaliza-fase2.png'; Url = "$baseUrl/#/fase/rede-de-dependencias"; Size = '1440,1200' },
      @{ Name = 'normaliza-fase3.png'; Url = "$baseUrl/#/fase/cidade-organizada"; Size = '1440,1200' },
      @{ Name = 'normaliza-missao.png'; Url = "$baseUrl/#/missao/administracao"; Size = '1440,1200' },
      @{ Name = 'normaliza-mobile.png'; Url = "$baseUrl/tools/mobile-preview.html"; Size = '500,960' },
      @{ Name = 'normaliza-fase1-mobile.png'; Url = "$baseUrl/tools/mobile-preview.html?rota=fase"; Size = '500,960' },
      @{ Name = 'normaliza-fase2-mobile.png'; Url = "$baseUrl/tools/mobile-preview.html?rota=fase2"; Size = '500,960' },
      @{ Name = 'normaliza-fase3-mobile.png'; Url = "$baseUrl/tools/mobile-preview.html?rota=fase3"; Size = '500,960' },
      @{ Name = 'normaliza-missao-mobile.png'; Url = "$baseUrl/tools/mobile-preview.html?rota=missao"; Size = '500,960' }
    )

    foreach ($shot in $shots) {
      $shotPath = Join-Path $env:TEMP $shot.Name
      $shotLog = Join-Path $env:TEMP ('normaliza-shot-' + [guid]::NewGuid().ToString('N') + '.log')

      Invoke-HeadlessBrowser `
        -Arguments @(
          '--hide-scrollbars',
          "--window-size=$($shot.Size)",
          '--virtual-time-budget=5000',
          "--screenshot=$shotPath",
          $shot.Url
        ) `
        -OutputPath $shotLog

      if (Test-Path -LiteralPath $shotPath) {
        Write-Output "Screenshot: $shotPath"
      } else {
        Write-Output "Screenshot não gerado: $($shot.Name)"
      }
    }
  }
} finally {
  if ($server -and -not $server.HasExited) {
    & taskkill /PID $server.Id /T /F 2>$null | Out-Null
  }
}

if ($failed) {
  exit 1
}
