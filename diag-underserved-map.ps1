$utf8 = New-Object System.Text.UTF8Encoding $false, $true
$fe = "C:\dev\KABISIG-FINAL\frontend"
$app = Join-Path $fe "src\App.tsx"
$chair = Join-Path $fe "src\components\BarangayAdminPages.tsx"
$api = Join-Path $fe "src\lib\api.ts"

Write-Host "=== 1. Where is youthProfiles state populated in App.tsx? ===" -ForegroundColor Cyan
$aLines = [System.IO.File]::ReadAllLines($app, $utf8)
for ($i = 0; $i -lt $aLines.Count; $i++) {
    if ($aLines[$i] -match "setYouthProfiles|youthProfiles\s*:\s*|getYouthProfiles|youthProfiles=") {
        Write-Host ("  L{0}: {1}" -f ($i+1), $aLines[$i].Trim().Substring(0,[Math]::Min(140,$aLines[$i].Trim().Length)))
    }
}

Write-Host ""
Write-Host "=== 2. Where is registrations state built in App.tsx? ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $aLines.Count; $i++) {
    if ($aLines[$i] -match "setRegistrations|registrations\s*:\s*|participantId|getProgramRegistrations|getRegistrations") {
        Write-Host ("  L{0}: {1}" -f ($i+1), $aLines[$i].Trim().Substring(0,[Math]::Min(140,$aLines[$i].Trim().Length)))
    }
}

Write-Host ""
Write-Host "=== 3. YouthProfile interface definition ===" -ForegroundColor Cyan
$typesFile = Join-Path $fe "src\types.ts"
if (Test-Path $typesFile) {
    $tLines = [System.IO.File]::ReadAllLines($typesFile, $utf8)
    $inBlock = $false
    for ($i = 0; $i -lt $tLines.Count; $i++) {
        if ($tLines[$i] -match "interface\s+YouthProfile") { $inBlock = $true }
        if ($inBlock) {
            Write-Host ("  L{0}: {1}" -f ($i+1), $tLines[$i])
            if ($tLines[$i].Trim() -eq "}") { break }
        }
    }
}

Write-Host ""
Write-Host "=== 4. getYouthProfiles return mapping (api.ts) ===" -ForegroundColor Cyan
$apiLines = [System.IO.File]::ReadAllLines($api, $utf8)
$inFn = $false
for ($i = 0; $i -lt $apiLines.Count; $i++) {
    if ($apiLines[$i] -match "getYouthProfiles|youth-profiles") { $inFn = $true }
    if ($inFn) {
        Write-Host ("  L{0}: {1}" -f ($i+1), $apiLines[$i].Trim())
        if ($apiLines[$i].Trim() -match "^\};?$" -or $apiLines[$i].Trim() -match "^\}$") { $inFn = $false; if ($i -gt 0 -and ($i - 1) % 10 -eq 0) { Write-Host "" } }
        if ($i -gt 0 -and $i % 50 -eq 0) { $inFn = $false }
    }
}

Write-Host ""
Write-Host "=== 5. How is participantId populated? (search api.ts + App.tsx) ===" -ForegroundColor Cyan
$allText = [System.IO.File]::ReadAllText($api, $utf8) + [System.IO.File]::ReadAllText($app, $utf8)
$matches = [regex]::Matches($allText, "participantId\s*:\s*[^\r\n,}]+")
foreach ($m in $matches) {
    Write-Host ("  → " + $m.Value) -ForegroundColor Yellow
}
