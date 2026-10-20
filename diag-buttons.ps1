$utf8 = New-Object System.Text.UTF8Encoding $false, $true
$f = "C:\dev\KABISIG-FINAL\frontend\src\components\BarangayAdminPages.tsx"
$lines = [System.IO.File]::ReadAllLines($f, $utf8)

Write-Host "=== ALL 'Record expense' and 'Set total' button locations ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "Record expense|Set total|Set Total|showSetTotal|showRecordExpense") {
        $ctx = if ($lines[$i].Length -gt 120) { $lines[$i].Substring(0,120) } else { $lines[$i] }
        Write-Host ("  L{0}: {1}" -f ($i+1), $ctx)
    }
}

Write-Host ""
Write-Host "=== Full block around Record Expense button (L2300-2330) ===" -ForegroundColor Cyan
for ($i = 2299; $i -lt [Math]::Min(2335, $lines.Count); $i++) {
    Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i])
}

Write-Host ""
Write-Host "=== Full block around Set Total Budget button (search) ===" -ForegroundColor Cyan
$setTotalIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "setShowSetTotal\(true\)") { $setTotalIdx = $i; break }
}
if ($setTotalIdx -gt 0) {
    for ($i = [Math]::Max(0, $setTotalIdx - 15); $i -lt [Math]::Min($setTotalIdx + 5, $lines.Count); $i++) {
        Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i])
    }
} else {
    Write-Host "  Set Total Budget button not found in expected form" -ForegroundColor Yellow
}
