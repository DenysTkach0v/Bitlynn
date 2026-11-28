# Bitlynn — запуск мобільного демо на ПК.
# 1) збирає застосунок, якщо код змінився (з повтором, бо збірка тягне шрифти з інтернету);
# 2) якщо збірка не вдалась — запускає режим розробки (працює і з поганим інтернетом);
# 3) відкриває окреме вікно розміром із телефон; коли його закрити — сервер зупиняється.
# Журнал: %LOCALAPPDATA%\Bitlynn\launcher.log

$ErrorActionPreference = "Stop"
$Port = 3123
$Url = "http://localhost:$Port"
Set-Location -LiteralPath $PSScriptRoot
$Host.UI.RawUI.WindowTitle = "Bitlynn"

$dataDir = Join-Path $env:LOCALAPPDATA "Bitlynn"
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
$log = Join-Path $dataDir "launcher.log"
"=== $(Get-Date -Format s) · $PSScriptRoot" | Out-File -FilePath $log -Encoding utf8

function Say($text) {
    Write-Host $text
    $text | Out-File -FilePath $log -Append -Encoding utf8
}

function Fail($text) {
    Say "ПОМИЛКА: $text"
    Say "Подробиці в журналі: $log"
    Read-Host "Натисни Enter, щоб закрити"
    exit 1
}

function Test-Server {
    try { (Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 } catch { $false }
}

function Wait-Server($seconds) {
    for ($i = 0; $i -lt $seconds * 2; $i++) {
        Start-Sleep -Milliseconds 500
        if (Test-Server) { return $true }
        if ($server -and $server.HasExited) { return $false }
    }
    return $false
}

$server = $null
if (Test-Server) {
    Say "Bitlynn уже працює на $Url — відкриваю вікно."
} else {
    # something else holds the port but does not answer like Bitlynn
    $busy = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($busy) { Fail "порт $Port зайнятий іншою програмою (PID $($busy[0].OwningProcess)). Закрий її або перезавантаж ПК." }

    Say "Перевіряю залежності..."
    node -e "require.resolve('next/package.json')" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Say "Встановлюю залежності (лише перший раз, кілька хвилин)..."
        npm install --no-audit --no-fund *>> $log
        if ($LASTEXITCODE -ne 0) { Fail "не вдалося встановити залежності (потрібен інтернет)." }
    }

    $buildId = Join-Path $PSScriptRoot ".next\BUILD_ID"
    $needBuild = -not (Test-Path $buildId)
    if (-not $needBuild) {
        $built = (Get-Item $buildId).LastWriteTime
        $newer = Get-ChildItem -Path (Join-Path $PSScriptRoot "src") -Recurse -File | Where-Object { $_.LastWriteTime -gt $built } | Select-Object -First 1
        $needBuild = $null -ne $newer
    }

    $mode = "start"
    if ($needBuild) {
        $ok = $false
        foreach ($try in 1..2) {
            Say "Збираю Bitlynn (спроба $try, 1–2 хвилини)..."
            npx next build *>> $log
            if ($LASTEXITCODE -eq 0) { $ok = $true; break }
        }
        if (-not $ok) {
            Say "Збірка не вдалась (часто — через інтернет для шрифтів). Запускаю режим розробки."
            $mode = "dev"
        }
    }

    Say "Запускаю сервер ($mode)..."
    $server = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npx next $mode -p $Port >> `"$log`" 2>&1" -WindowStyle Hidden -PassThru
    # dev mode compiles on the first request, give it longer
    $limit = if ($mode -eq "dev") { 180 } else { 90 }
    if (-not (Wait-Server $limit)) { Fail "сервер не відповів за $limit с." }
}

# phone-sized app window (separate profile so the size sticks)
$profileDir = Join-Path $dataDir "browser"
New-Item -ItemType Directory -Force -Path $profileDir | Out-Null
$edge = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($edge) {
    Say "Відкриваю вікно Bitlynn."
    $win = Start-Process -FilePath $edge -ArgumentList "--app=$Url", "--window-size=430,932", "--user-data-dir=`"$profileDir`"", "--no-first-run", "--no-default-browser-check" -PassThru
    $win.WaitForExit()
    # the browser may hand off to a child process; wait until our profile has no windows left
    while (Get-CimInstance Win32_Process -Filter "Name='msedge.exe' OR Name='chrome.exe'" | Where-Object { $_.CommandLine -like "*$profileDir*" }) {
        Start-Sleep -Seconds 1
    }
} else {
    Start-Process $Url
    Read-Host "Bitlynn відкрито в браузері. Натисни Enter, щоб зупинити сервер"
}

if ($server) {
    Say "Зупиняю сервер."
    taskkill /PID $server.Id /T /F | Out-Null
}
