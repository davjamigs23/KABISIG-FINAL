$f = "C:\dev\KABISIG-FINAL\frontend\src\components\BarangayAdminPages.tsx"
$lines = [System.IO.File]::ReadAllLines($f)

Write-Host "=== activeMenu useState type (lines 165-180) ===" -ForegroundColor Cyan
for ($i = 164; $i -lt 180; $i++) {
    Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i]) -ForegroundColor Yellow
}

Write-Host "`n=== ALL setActiveMenu calls ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "setActiveMenu\('") {
        Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i].Trim().Substring(0, [Math]::Min(140, $lines[$i].Trim().Length))) -ForegroundColor Green
    }
}

Write-Host "`n=== ALL activeMenu === checks (conditional renders) ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "activeMenu\s*===\s*'") {
        Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i].Trim().Substring(0, [Math]::Min(140, $lines[$i].Trim().Length))) -ForegroundColor Yellow
    }
}

Write-Host "`n=== Menu button block (1660-1730) ===" -ForegroundColor Cyan
for ($i = 1655; $i -lt 1735; $i++) {
    Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i]) -ForegroundColor DarkGray
}
