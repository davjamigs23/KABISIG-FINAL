function SEC($t) { Write-Host ""; Write-Host ("=" * 70) -ForegroundColor Cyan; Write-Host " $t" -ForegroundColor Cyan; Write-Host ("=" * 70) -ForegroundColor Cyan }
$nf = "C:\dev\KABISIG-FINAL\frontend\src\components\NotificationMenu.tsx"

if (-not (Test-Path $nf)) { Write-Host "[MISSING] NotificationMenu.tsx not found at expected path" -ForegroundColor Red; exit }

SEC "Full NotificationMenu.tsx (first 100 lines)"
$lines = [System.IO.File]::ReadAllLines($nf)
for ($i = 0; $i -lt [Math]::Min(100, $lines.Count); $i++) {
    Write-Host ("{0,4}: {1}" -f ($i+1), $lines[$i])
}

SEC "Auto-remove logic — does it filter is_read?"
Select-String -Path $nf -Pattern "is_read|filter.*read|unread|markAsRead" | ForEach-Object { Write-Host ("  L{0}: {1}" -f $_.LineNumber, $_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length))) -ForegroundColor Yellow }

SEC "Date display — is created_at rendered?"
Select-String -Path $nf -Pattern "created_at|createdAt|date|Date|ago|time" | ForEach-Object { Write-Host ("  L{0}: {1}" -f $_.LineNumber, $_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length))) -ForegroundColor Yellow }

SEC "Role filtering — userRole prop used?"
Select-String -Path $nf -Pattern "userRole|role|filter|role_id" | ForEach-Object { Write-Host ("  L{0}: {1}" -f $_.LineNumber, $_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length))) -ForegroundColor Yellow }

SEC "How is it used in Chairperson vs Official pages?"
Write-Host "Chairperson:" -ForegroundColor Green
Select-String -Path "C:\dev\KABISIG-FINAL\frontend\src\components\BarangayAdminPages.tsx" -Pattern "NotificationMenu" -Context 0,6 | ForEach-Object {
    Write-Host "  L$($_.LineNumber): $($_.Line.Trim())" -ForegroundColor DarkGray
    $_.Context.PostContext | ForEach-Object { Write-Host "    $($_.Trim())" -ForegroundColor DarkGray }
}
Write-Host ""
Write-Host "Official (Secretary/Kagawad/Treasurer):" -ForegroundColor Green
Select-String -Path "C:\dev\KABISIG-FINAL\frontend\src\components\OfficialPages.tsx" -Pattern "NotificationMenu" -Context 0,6 | ForEach-Object {
    Write-Host "  L$($_.LineNumber): $($_.Line.Trim())" -ForegroundColor DarkGray
    $_.PostContext | ForEach-Object { Write-Host "    $($_.Trim())" -ForegroundColor DarkGray }
}
