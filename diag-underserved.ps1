function SEC($t) { Write-Host ""; Write-Host ("=" * 70) -ForegroundColor Cyan; Write-Host " $t" -ForegroundColor Cyan; Write-Host ("=" * 70) -ForegroundColor Cyan }
$f = "C:\dev\KABISIG-FINAL\frontend\src\components\BarangayAdminPages.tsx"
$lines = [System.IO.File]::ReadAllLines($f)

SEC "Underserved calculation block (lines 590-620)"
for ($i = 590; $i -lt [Math]::Min(620, $lines.Count); $i++) {
    $color = if ($lines[$i] -match "participantId|underserved|programCount") { "Yellow" } else { "DarkGray" }
    Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i]) -ForegroundColor $color
}

SEC "How is registrations[].participantId populated?"
Select-String -Path $f -Pattern "participantId" | Select-Object -First 10 | ForEach-Object { Write-Host ("  L{0}: {1}" -f $_.LineNumber, $_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length))) }

SEC "How is youthProfiles[].id and .userId populated?"
Select-String -Path $f -Pattern "youthProfiles\s*=|setYouthProfiles|userId:|id:\s*profile|id:\s*youth" | Select-Object -First 10 | ForEach-Object { Write-Host ("  L{0}: {1}" -f $_.LineNumber, $_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length))) }
