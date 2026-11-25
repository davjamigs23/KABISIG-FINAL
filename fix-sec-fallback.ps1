$ErrorActionPreference = 'Stop'
$path = 'C:\dev\KABISIG-FINAL\backend\routes\auth.routes.ts'
$raw = [IO.File]::ReadAllText($path)
$sep = if ($raw.Contains("`r`n")) { "`r`n" } else { "`n" }
$lines = $raw -split [regex]::Escape($sep)

$backup = "C:\dev\KABISIG-FINAL\backups\" + (Get-Date -Format 'yyyyMMdd-HHmmss') + "-secauth"
New-Item -ItemType Directory -Path $backup -Force | Out-Null
Copy-Item $path (Join-Path $backup 'auth.routes.ts') -Force
Write-Host "Backup: $backup" -ForegroundColor Cyan

# Locate the fallback block
$anchorIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "default to Barangay Abella") {
        $anchorIdx = $i
        break
    }
}
if ($anchorIdx -eq -1) {
    Write-Host "Fallback comment not found - may already be patched." -ForegroundColor Yellow
    return
}

Write-Host "Found fallback at line $($anchorIdx + 1):" -ForegroundColor Cyan
for ($i = $anchorIdx; $i -le [Math]::Min($lines.Count - 1, $anchorIdx + 5); $i++) {
    Write-Host "  L$($i + 1): $($lines[$i])" -ForegroundColor DarkGray
}

# Match the if(!tenantId) block that follows
$ifIdx = -1
for ($i = $anchorIdx; $i -lt [Math]::Min($lines.Count, $anchorIdx + 6); $i++) {
    if ($lines[$i] -match "if\s*\(\s*!tenantId\s*\)") {
        $ifIdx = $i
        break
    }
}
if ($ifIdx -eq -1) {
    Write-Host "if(!tenantId) block not found after anchor." -ForegroundColor Red
    return
}

# Find the closing brace of the if block
$braceDepth = 0
$startBrace = -1
$endBrace = -1
for ($i = $ifIdx; $i -lt $lines.Count; $i++) {
    foreach ($ch in $lines[$i].ToCharArray()) {
        if ($ch -eq '{') { $braceDepth++; if ($startBrace -eq -1) { $startBrace = $i } }
        elseif ($ch -eq '}') { $braceDepth--; if ($braceDepth -eq 0 -and $startBrace -ne -1) { $endBrace = $i; break } }
    }
    if ($endBrace -ne -1) { break }
}
if ($endBrace -eq -1) {
    Write-Host "Could not find closing brace." -ForegroundColor Red
    return
}

Write-Host "Replacing lines $($anchorIdx + 1) through $($endBrace + 1)" -ForegroundColor Cyan

# Replacement: refuse if no invite
$replacement = @(
    '  // SECURITY (per manuscript 3.3.2 RBAC + rules file SA-only official creation):',
    '  // Previously defaulted to Barangay Abella when no invite existed, allowing anyone',
    '  // with a valid email to self-create as Chairperson. Now reject without a valid invite.',
    '  if (!tenantId) {',
    "    sendError(res, 'No Chairperson invitation found for this email. Contact the SK Federation President.', 403);",
    '    return;',
    '  }'
)

$newLines = New-Object System.Collections.ArrayList
for ($i = 0; $i -lt $anchorIdx; $i++) { [void]$newLines.Add($lines[$i]) }
foreach ($nl in $replacement) { [void]$newLines.Add($nl) }
for ($i = $endBrace + 1; $i -lt $lines.Count; $i++) { [void]$newLines.Add($lines[$i]) }

[IO.File]::WriteAllText($path, ($newLines -join $sep), (New-Object Text.UTF8Encoding($false)))
Write-Host "Wrote auth.routes.ts" -ForegroundColor Green

# Build
Push-Location 'C:\dev\KABISIG-FINAL\backend'
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Build failed - restore from $backup" }
    Write-Host "Build OK" -ForegroundColor Green
} finally { Pop-Location }

# Restart on 5000
$listeners = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
foreach ($l in $listeners) {
    Write-Host "Stopping PID $($l.OwningProcess)" -ForegroundColor Yellow
    Stop-Process -Id $l.OwningProcess -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2
Start-Process -FilePath 'node' -ArgumentList 'dist/server.js' -WorkingDirectory 'C:\dev\KABISIG-FINAL\backend' -WindowStyle Hidden
Start-Sleep -Seconds 3

curl.exe -s -o NUL -w "profile: %{http_code}`n" http://localhost:5000/api/users/profile