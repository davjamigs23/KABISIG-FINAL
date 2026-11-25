$ErrorActionPreference = 'Stop'
$path = 'C:\dev\KABISIG-FINAL\frontend\src\components\OfficialPages.tsx'
$raw = [IO.File]::ReadAllText($path)
$sep = if ($raw.Contains("`r`n")) { "`r`n" } else { "`n" }
$lines = $raw -split [regex]::Escape($sep)

$backup = "C:\dev\KABISIG-FINAL\backups\" + (Get-Date -Format 'yyyyMMdd-HHmmss') + "-hardblock"
New-Item -ItemType Directory -Path $backup -Force | Out-Null
Copy-Item $path (Join-Path $backup 'OfficialPages.tsx') -Force
Write-Host "Backup: $backup" -ForegroundColor Cyan

# Find the "const _proceed = window.confirm(" line
$proceedIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "const _proceed = window\.confirm\(") {
        $proceedIdx = $i
        break
    }
}
if ($proceedIdx -eq -1) {
    Write-Host "Could not find _proceed line - maybe already fixed." -ForegroundColor Yellow
    return
}

# Find where "if (!_proceed) return;" is
$ifProceedIdx = -1
for ($i = $proceedIdx; $i -lt [Math]::Min($lines.Count, $proceedIdx + 10); $i++) {
    if ($lines[$i] -match "if \(!_proceed\) return;") {
        $ifProceedIdx = $i
        break
    }
}
if ($ifProceedIdx -eq -1) {
    Write-Host "Could not find 'if (!_proceed) return;' - aborting." -ForegroundColor Red
    return
}

Write-Host "Replacing lines $($proceedIdx + 1) through $($ifProceedIdx + 1)" -ForegroundColor Cyan
for ($i = $proceedIdx; $i -le $ifProceedIdx; $i++) {
    Write-Host ("  L{0}: {1}" -f ($i + 1), $lines[$i]) -ForegroundColor DarkGray
}

# Detect indentation from the line
$indent = ''
if ($lines[$proceedIdx] -match '^(\s*)') { $indent = $matches[1] }

# Hard-block replacement
$replacement = @(
    ($indent + "alert('Scheduling conflicts detected:\n\n' +"),
    ($indent + "  _conflicts.join('\n\n') +"),
    ($indent + "  '\n\nPlease edit or delete the conflicting program(s) before proceeding.');"),
    ($indent + 'return;')
)

$newLines = New-Object System.Collections.ArrayList
for ($i = 0; $i -lt $proceedIdx; $i++) { [void]$newLines.Add($lines[$i]) }
foreach ($nl in $replacement) { [void]$newLines.Add($nl) }
for ($i = $ifProceedIdx + 1; $i -lt $lines.Count; $i++) { [void]$newLines.Add($lines[$i]) }

[IO.File]::WriteAllText($path, ($newLines -join $sep), (New-Object Text.UTF8Encoding($false)))
Write-Host "Wrote OfficialPages.tsx" -ForegroundColor Green

Push-Location 'C:\dev\KABISIG-FINAL\frontend'
try {
    npx --no-install tsc --noEmit
    if ($LASTEXITCODE -ne 0) {
        Write-Host "tsc failed - rolling back" -ForegroundColor Red
        Copy-Item (Join-Path $backup 'OfficialPages.tsx') $path -Force
    } else {
        Write-Host "tsc OK" -ForegroundColor Green
    }
} finally { Pop-Location }