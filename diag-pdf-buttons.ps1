$f = "C:\dev\KABISIG-FINAL\frontend\src\components\BarangayAdminPages.tsx"
$lines = [System.IO.File]::ReadAllLines($f)

Write-Host "=== Report 1 button (before line 265) ===" -ForegroundColor Cyan
for ($i = 230; $i -lt 245; $i++) {
    Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i]) -ForegroundColor DarkGray
}

Write-Host "`n=== Report 2 button (before line 398) ===" -ForegroundColor Cyan
for ($i = 355; $i -lt 375; $i++) {
    Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i]) -ForegroundColor DarkGray
}

Write-Host "`n=== Function names containing print/export ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "const\s+\w*(print|Print|export|Export|Report|report)\w*\s*=\s*\(|function\s+\w*(print|Print|export|Export)\w*\(") {
        Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i].Substring(0, [Math]::Min(140, $lines[$i].Length))) -ForegroundColor Green
    }
}
