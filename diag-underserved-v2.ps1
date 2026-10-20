$utf8 = New-Object System.Text.UTF8Encoding $false, $true
$f = "C:\dev\KABISIG-FINAL\frontend\src\components\BarangayAdminPages.tsx"

Write-Host "=== 1. Current underserved filter code (lines 598-615) ===" -ForegroundColor Cyan
$lines = [System.IO.File]::ReadAllLines($f, $utf8)
for ($i = 597; $i -lt [Math]::Min(616, $lines.Count); $i++) {
    Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i])
}

Write-Host ""
Write-Host "=== 2. Where is `registrations` defined and populated? ===" -ForegroundColor Cyan
Select-String -Path $f -Pattern "registrations\s*[=,]|setRegistrations|const.*registrations|registrations.*useState|registrations\?:|registrations:" | Select-Object -First 10 | ForEach-Object { Write-Host ("  L{0}: {1}" -f $_.LineNumber, $_.Line.Trim().Substring(0,[Math]::Min(140,$_.Line.Trim().Length))) }

Write-Host ""
Write-Host "=== 3. How is youthProfiles populated (id vs userId)? ===" -ForegroundColor Cyan
Select-String -Path $f -Pattern "youthProfiles|setYouthProfiles" | Select-Object -First 6 | ForEach-Object { Write-Host ("  L{0}: {1}" -f $_.LineNumber, $_.Line.Trim().Substring(0,[Math]::Min(140,$_.Line.Trim().Length))) }

Write-Host ""
Write-Host "=== 4. Where is underservedYouth rendered? ===" -ForegroundColor Cyan
Select-String -Path $f -Pattern "underservedYouth" | ForEach-Object { Write-Host ("  L{0}: {1}" -f $_.LineNumber, $_.Line.Trim().Substring(0,[Math]::Min(140,$_.Line.Trim().Length))) }
