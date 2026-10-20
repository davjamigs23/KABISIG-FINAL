$f = "C:\dev\KABISIG-FINAL\frontend\src\components\BarangayAdminPages.tsx"
$lines = [System.IO.File]::ReadAllLines($f)
Write-Host "=== window.print() context (line 265 ± 15) ===" -ForegroundColor Cyan
for ($i = 250; $i -lt [Math]::Min(290, $lines.Count); $i++) {
    $color = 'DarkGray'
    if ($lines[$i] -match "print|export|Export|Download|button") { $color = 'Yellow' }
    Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i].Substring(0, [Math]::Min(130, $lines[$i].Length))) -ForegroundColor $color
}
Write-Host "`n=== line 398 context (± 15) ===" -ForegroundColor Cyan
for ($i = 383; $i -lt [Math]::Min(420, $lines.Count); $i++) {
    $color = 'DarkGray'
    if ($lines[$i] -match "print|export|Export|Download|button") { $color = 'Yellow' }
    Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i].Substring(0, [Math]::Min(130, $lines[$i].Length))) -ForegroundColor $color
}
