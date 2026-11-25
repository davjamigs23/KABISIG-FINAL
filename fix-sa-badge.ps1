$ErrorActionPreference = 'Stop'
$path = 'C:\dev\KABISIG-FINAL\frontend\src\components\SuperAdminPages.tsx'
$raw = [IO.File]::ReadAllText($path)
$sep = if ($raw.Contains("`r`n")) { "`r`n" } else { "`n" }
$lines = $raw -split [regex]::Escape($sep)

$backup = "C:\dev\KABISIG-FINAL\backups\" + (Get-Date -Format 'yyyyMMdd-HHmmss') + "-sabadge"
New-Item -ItemType Directory -Path $backup -Force | Out-Null
Copy-Item $path (Join-Path $backup 'SuperAdminPages.tsx') -Force
Write-Host "Backup: $backup" -ForegroundColor Cyan

# B.1 - add isAuthoritative after totalActivePrograms
$flagIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "const totalActivePrograms = toNumber\(citywideTotals\?\.total_active_programs") {
        $flagIdx = $i
        break
    }
}
if ($flagIdx -eq -1) {
    Write-Host "Anchor line not found - B.1 skipped." -ForegroundColor Yellow
} else {
    $insert = @(
        '',
        '  // Audit honesty flag: true only when server aggregate loaded.',
        "  const isAuthoritative = Boolean(citywideTotals && typeof citywideTotals === 'object');"
    )
    $newLines = New-Object System.Collections.ArrayList
    for ($i = 0; $i -le $flagIdx; $i++) { [void]$newLines.Add($lines[$i]) }
    foreach ($nl in $insert) { [void]$newLines.Add($nl) }
    for ($i = $flagIdx + 1; $i -lt $lines.Count; $i++) { [void]$newLines.Add($lines[$i]) }
    $lines = @($newLines)
    Write-Host "Added isAuthoritative after line $($flagIdx + 1)" -ForegroundColor Green
}

[IO.File]::WriteAllText($path, ($lines -join $sep), (New-Object Text.UTF8Encoding($false)))
Write-Host "Wrote SuperAdminPages.tsx" -ForegroundColor Green

Push-Location 'C:\dev\KABISIG-FINAL\frontend'
try {
    npx --no-install tsc --noEmit
    if ($LASTEXITCODE -ne 0) {
        Write-Host "tsc reported issues - review. Backup: $backup" -ForegroundColor Yellow
    } else {
        Write-Host "Frontend tsc OK" -ForegroundColor Green
    }
} finally { Pop-Location }