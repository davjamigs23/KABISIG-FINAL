$ErrorActionPreference = 'Stop'
$path = 'C:\dev\KABISIG-FINAL\frontend\src\components\OfficialPages.tsx'
$raw = [IO.File]::ReadAllText($path)
$sep = if ($raw.Contains("`r`n")) { "`r`n" } else { "`n" }
$lines = $raw -split [regex]::Escape($sep)

$backup = "C:\dev\KABISIG-FINAL\backups\" + (Get-Date -Format 'yyyyMMdd-HHmmss') + "-schedconf"
New-Item -ItemType Directory -Path $backup -Force | Out-Null
Copy-Item $path (Join-Path $backup 'OfficialPages.tsx') -Force
Write-Host "Backup: $backup" -ForegroundColor Cyan

# Print the actual signature for the log
Write-Host "`n--- detectScheduleConflicts signature ---" -ForegroundColor Cyan
$intelPath = 'C:\dev\KABISIG-FINAL\frontend\src\lib\intelligence.ts'
$intelLines = [IO.File]::ReadAllText($intelPath) -split [regex]::Escape($sep)
for ($i = 240; $i -lt [Math]::Min($intelLines.Count, 265); $i++) {
    Write-Host ("  L{0}: {1}" -f ($i + 1), $intelLines[$i]) -ForegroundColor DarkGray
}

# Find the exact insertion point: after "try {" immediately preceding "const created = await onAddProgram(newP);"
$anchorIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "const created = await onAddProgram\(newP\);") {
        $anchorIdx = $i
        break
    }
}
if ($anchorIdx -eq -1) {
    Write-Host "Anchor 'const created = await onAddProgram(newP);' not found." -ForegroundColor Red
    Write-Host "Restoring from backup and exiting." -ForegroundColor Red
    return
}

Write-Host "`nAnchor at line $($anchorIdx + 1):" -ForegroundColor Cyan
for ($i = [Math]::Max(0, $anchorIdx - 3); $i -le $anchorIdx; $i++) {
    Write-Host ("  L{0}: {1}" -f ($i + 1), $lines[$i]) -ForegroundColor DarkGray
}

# Determine indentation by reading the anchor line
$indent = ''
if ($lines[$anchorIdx] -match '^(\s*)') { $indent = $matches[1] }

# Build the insertion block
$insert = @(
    ($indent + '// Schedule conflict advisory (manuscript 3.2.1 item 5: Rule-Based Schedule Conflict Detection)'),
    ($indent + 'const _conflicts = detectScheduleConflicts(newP, (programs || []).filter(p => p.id !== newP.id));'),
    ($indent + 'if (_conflicts.length > 0) {'),
    ($indent + '  const _proceed = window.confirm('),
    ($indent + "    'Scheduling conflicts detected:\n\n' +"),
    ($indent + "    _conflicts.join('\n\n') +"),
    ($indent + "    '\n\nProceed anyway? (Advisory only - backend does not block.)'"),
    ($indent + '  );'),
    ($indent + '  if (!_proceed) return;'),
    ($indent + '}'),
    ''
)

$newLines = New-Object System.Collections.ArrayList
for ($i = 0; $i -lt $anchorIdx; $i++) { [void]$newLines.Add($lines[$i]) }
foreach ($nl in $insert) { [void]$newLines.Add($nl) }
for ($i = $anchorIdx; $i -lt $lines.Count; $i++) { [void]$newLines.Add($lines[$i]) }

[IO.File]::WriteAllText($path, ($newLines -join $sep), (New-Object Text.UTF8Encoding($false)))
Write-Host "Wrote OfficialPages.tsx (+$($insert.Count) lines)" -ForegroundColor Green

# Type-check
Push-Location 'C:\dev\KABISIG-FINAL\frontend'
try {
    $tcOut = npx --no-install tsc --noEmit 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`ntsc reported issues:" -ForegroundColor Red
        $tcOut | Write-Host
        Write-Host "`nRolling back OfficialPages.tsx..." -ForegroundColor Yellow
        Copy-Item (Join-Path $backup 'OfficialPages.tsx') $path -Force
        Write-Host "Restored from $backup" -ForegroundColor Yellow
    } else {
        Write-Host "`nFrontend tsc OK - fix D applied cleanly" -ForegroundColor Green
    }
} finally { Pop-Location }