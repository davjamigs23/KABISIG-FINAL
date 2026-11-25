$ErrorActionPreference = 'Stop'
$path = 'C:\dev\KABISIG-FINAL\backend\routes\auth.routes.ts'
$sep = [Environment]::NewLine
$lines = [IO.File]::ReadAllText($path) -split [regex]::Escape($sep)
if ($lines.Count -le 1) { $lines = [IO.File]::ReadAllText($path) -split "`n"; $sep = "`n" }

$backup = "C:\dev\KABISIG-FINAL\backups\" + (Get-Date -Format 'yyyyMMdd-HHmmss') + "-chairfix"
New-Item -ItemType Directory -Path $backup -Force | Out-Null
Copy-Item $path (Join-Path $backup 'auth.routes.ts') -Force
Write-Host "Backup: $backup" -ForegroundColor Cyan

# Find the Chairperson setup's cleanFullName line, but ONLY within setup-chairperson-password
# Distinctive marker: fallback text 'Hon. SK Chairperson' (the official path uses 'SK Official')
$targetIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^\s*const cleanFullName = resolvedName\.full_name \|\| 'Hon\. SK Chairperson';\s*$") {
        $targetIdx = $i
        break
    }
}

if ($targetIdx -eq -1) {
    Write-Error "Could not find Chairperson cleanFullName line. It may already be fixed, or the line has changed."
    return
}

Write-Host "Target at line $($targetIdx + 1):"
Write-Host "  $($lines[$targetIdx])" -ForegroundColor DarkGray

# Safe replacement
$replacement = @(
    '  // Rule #1 (Hon. scope): Chairpersons always carry the Honorific.'
    "  const _baseChairName = resolvedName.full_name || 'SK Chairperson';"
    "  const cleanFullName = _baseChairName.startsWith('Hon.') ? _baseChairName : 'Hon. ' + _baseChairName;"
)

$newLines = New-Object System.Collections.ArrayList
for ($i = 0; $i -lt $targetIdx; $i++) { [void]$newLines.Add($lines[$i]) }
foreach ($nl in $replacement) { [void]$newLines.Add($nl) }
for ($i = $targetIdx + 1; $i -lt $lines.Count; $i++) { [void]$newLines.Add($lines[$i]) }

[IO.File]::WriteAllText($path, ($newLines -join $sep), (New-Object Text.UTF8Encoding($false)))
Write-Host "Wrote auth.routes.ts" -ForegroundColor Green

# Build
Push-Location 'C:\dev\KABISIG-FINAL\backend'
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "build failed" }
    Write-Host "Build OK" -ForegroundColor Green
} finally { Pop-Location }

# Restart
$listeners = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
foreach ($l in $listeners) { Stop-Process -Id $l.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2
Start-Process -FilePath 'node' -ArgumentList 'dist/server.js' -WorkingDirectory 'C:\dev\KABISIG-FINAL\backend' -WindowStyle Hidden
Start-Sleep -Seconds 3

curl.exe -s -o NUL -w "profile: %{http_code}`n" http://localhost:5000/api/users/profile