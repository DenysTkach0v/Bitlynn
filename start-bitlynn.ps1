# Bitlynn — запуск мобільного демо на ПК.
# Збирає застосунок (якщо код змінився), запускає локальний сервер і відкриває
# окреме вікно розміром із телефон. Коли вікно закрити — сервер зупиняється.

$ErrorActionPreference = "Stop"
$Port = 3123
$Url = "http://localhost:$Port"
Set-Location -LiteralPath $PSScriptRoot
$Host.UI.RawUI.WindowTitle = "Bitlynn"

function Test-Server {
    try { (Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 } catch { $false }
}

$server = $null
if (-not (Test-Server)) {
    # dependencies
    node -e "require.resolve('next/package.json')" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Встановлюю залежності (лише перший раз)..."
        npm install --no-audit --no-fund
    }

    # build when there is no build yet or the source is newer than it
    $buildId = Join-Path $PSScriptRoot ".next\BUILD_ID"
    $needBuild = -not (Test-Path $buildId)
    if (-not $needBuild) {
        $built = (Get-Item $buildId).LastWriteTime
        $newer = Get-ChildItem -Path (Join-Path $PSScriptRoot "src") -Recurse -File | Where-Object { $_.LastWriteTime -gt $built } | Select-Object -First 1
        $needBuild = $null -ne $newer
    }
    if ($needBuild) {
        Write-Host "Збираю Bitlynn (1–2 хвилини)..."
        npx next build
        if ($LASTEXITCODE -ne 0) { Read-Host "Збірка не вдалась. Натисни Enter"; exit 1 }
    }

    Write-Host "Запускаю сервер..."
    $server = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npx next start -p $Port" -WindowStyle Hidden -PassThru
    $ok = $false
    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Milliseconds 500
        if (Test-Server) { $ok = $true; break }
    }
    if (-not $ok) { Read-Host "Сервер не запустився. Натисни Enter"; exit 1 }
}

# phone-sized app window (separate profile so the size sticks)
$profileDir = Join-Path $env:LOCALAPPDATA "Bitlynn\browser"
New-Item -ItemType Directory -Force -Path $profileDir | Out-Null
$edge = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($edge) {
    $win = Start-Process -FilePath $edge -ArgumentList "--app=$Url", "--window-size=430,932", "--user-data-dir=`"$profileDir`"", "--no-first-run" -PassThru
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
    taskkill /PID $server.Id /T /F | Out-Null
}
