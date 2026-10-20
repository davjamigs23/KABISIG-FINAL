function SEC($t) { Write-Host ""; Write-Host ("=" * 72) -ForegroundColor Cyan; Write-Host " $t" -ForegroundColor Cyan; Write-Host ("=" * 72) -ForegroundColor Cyan }
$fe  = "C:\dev\KABISIG-FINAL\frontend"
$be  = "C:\dev\KABISIG-FINAL\backend"
$saP = Get-Content "$fe\src\components\SuperAdminPages.tsx" -Raw
$api = Get-Content "$fe\src\lib\api.ts" -Raw
$adm = Get-Content "$be\routes\admin.routes.ts" -Raw
$usr = Get-Content "$be\routes\user.routes.ts" -Raw

SEC "G01/G02 - User list: what does SA actually render?"
$hits = Select-String -Path "$fe\src\components\SuperAdminPages.tsx" -Pattern "user|User" | Where-Object { $_.Line -match "list|List|map|table|Table|management|Management" } | Select-Object -First 10
if ($hits.Count -eq 0) { Write-Host "  [REAL GAP] No user list/table/map in SA page" -ForegroundColor Red }
else { $hits | ForEach-Object { Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0,[Math]::Min(100,$_.Line.Trim().Length)))" -ForegroundColor Green } }
Write-Host ""
Write-Host "  API methods with users:" -ForegroundColor Yellow
Select-String -Path "$fe\src\lib\api.ts" -Pattern "getUsers|getAllUsers|/users|youth-profiles|admin/users" | ForEach-Object { Write-Host "    L$($_.LineNumber): $($_.Line.Trim())" }

SEC "H01/H02 - Profile lock / Email lock"
Write-Host "  Backend (user.routes.ts):" -ForegroundColor Yellow
Select-String -Path "$be\routes\user.routes.ts" -Pattern "profile_lock|profileLock|locked|email_lock|emailLock|lock_email" | ForEach-Object { Write-Host "    L$($_.LineNumber): $($_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length)))" -ForegroundColor Green }
Write-Host "  Backend (admin.routes.ts):" -ForegroundColor Yellow
Select-String -Path "$be\routes\admin.routes.ts" -Pattern "profile_lock|profileLock|locked|email_lock|emailLock|lock_email|locked" | ForEach-Object { Write-Host "    L$($_.LineNumber): $($_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length)))" -ForegroundColor Green }

SEC "I01 - Menu buttons: what pattern does SA actually use?"
$navMatches = Select-String -Path "$fe\src\components\SuperAdminPages.tsx" -Pattern "setActiveMenu" | Select-Object -First 15
$navMatches | ForEach-Object { Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0,[Math]::Min(100,$_.Line.Trim().Length)))" }
Write-Host ""
Write-Host "  activeMenu state values:" -ForegroundColor Yellow
Select-String -Path "$fe\src\components\SuperAdminPages.tsx" -Pattern "activeMenu.*useState|useState.*activeMenu" | ForEach-Object { Write-Host "    L$($_.LineNumber): $($_.Line.Trim())" }

SEC "I04 - NotificationMenu: does SA page use it?"
Select-String -Path "$fe\src\components\SuperAdminPages.tsx" -Pattern "NotificationMenu|NotificationBell|Notification" | Select-Object -First 5 | ForEach-Object { Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0,[Math]::Min(100,$_.Line.Trim().Length)))" -ForegroundColor Green }
Write-Host ""
Write-Host "  Compare: BarangayAdminPages uses:" -ForegroundColor Yellow
Select-String -Path "$fe\src\components\BarangayAdminPages.tsx" -Pattern "NotificationMenu" | Select-Object -First 3 | ForEach-Object { Write-Host "    L$($_.LineNumber): $($_.Line.Trim().Substring(0,[Math]::Min(100,$_.Line.Trim().Length)))" }

SEC "K02/K07 - Notification dispatch to SA user_id"
Write-Host "  Does admin.routes.ts send notifications to role_id=1?" -ForegroundColor Yellow
Select-String -Path "$be\routes\admin.routes.ts" -Pattern "role_id.*1|SUPER_ADMIN.*notif|notif.*SUPER_ADMIN|sa_user_id|super_admin" | ForEach-Object { Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length)))" -ForegroundColor Green }
Write-Host ""
Write-Host "  Any notifications query filtering role_id=1:" -ForegroundColor Yellow
Select-String -Path "$be\routes\admin.routes.ts" -Pattern "from\(.notifications.\)" | ForEach-Object { Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length)))" }

SEC "L03 - Transfer: incoming tenant check"
Write-Host "  Transfer chairmanship tenant validation:" -ForegroundColor Yellow
$lines = [System.IO.File]::ReadAllLines("$be\routes\admin.routes.ts")
$inTransfer = $false
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match "transfer-chairmanship") { $inTransfer = $true }
  if ($inTransfer -and $i -lt 1200 -and $lines[$i] -match "tenant_id|barangay_id") {
    Write-Host "  L$($i+1): $($lines[$i].Trim().Substring(0,[Math]::Min(120,$lines[$i].Trim().Length)))" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "Done. Paste all output above." -ForegroundColor Cyan
