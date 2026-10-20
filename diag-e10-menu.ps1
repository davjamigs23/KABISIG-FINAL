$f = "C:\dev\KABISIG-FINAL\frontend\src\components\BarangayAdminPages.tsx"
$lines = [System.IO.File]::ReadAllLines($f)

Write-Host "=== activeMenu state definition ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "useState.*activeMenu|setActiveMenu.*useState|activeMenu.*useState") {
        Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i]) -ForegroundColor Yellow
    }
}

Write-Host "`n=== Menu array / navItems definition ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "setActiveMenu\(['""]([a-z_]+)['""]" -or $lines[$i] -match "id:\s*['""]([a-z_]+)['""]") {
        if ($matches[1] -and $lines[$i] -match "label|icon") {
            Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i].Substring(0, [Math]::Min(140, $lines[$i].Length))) -ForegroundColor Green
        }
    }
}

Write-Host "`n=== Where menu items are rendered (nav buttons) ===" -ForegroundColor Cyan
for ($i = 1650; $i -lt 1720; $i++) {
    if ($lines[$i] -match "setActiveMenu|label|activeMenu") {
        Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i].Substring(0, [Math]::Min(140, $lines[$i].Length))) -ForegroundColor Yellow
    }
}

Write-Host "`n=== BUDGET section conditional render (line 2270-2300) ===" -ForegroundColor Cyan
for ($i = 2270; $i -lt 2300; $i++) {
    Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i]) -ForegroundColor DarkGray
}
