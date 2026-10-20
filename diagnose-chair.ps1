function SEC($t) { Write-Host ""; Write-Host ("=" * 72) -ForegroundColor Cyan; Write-Host " $t" -ForegroundColor Cyan; Write-Host ("=" * 72) -ForegroundColor Cyan }
$fe = "C:\dev\KABISIG-FINAL\frontend"
$be = "C:\dev\KABISIG-FINAL\backend"
$chair = Get-Content "$fe\src\components\BarangayAdminPages.tsx" -Raw

SEC "C07 - Program reminder / notification trigger"
$svc = Get-ChildItem "$be" -Recurse -Include "*reminder*","*program*" -EA SilentlyContinue | Where-Object { $_.Name -match "reminder" }
if ($svc.Count -gt 0) { $svc | ForEach-Object { Write-Host "  FOUND: $($_.Name)" -ForegroundColor Green } } else { Write-Host "  No reminder service file" -ForegroundColor Red }
Write-Host "`n  Reminder refs in BarangayAdminPages.tsx:" -ForegroundColor Yellow
Select-String -Path "$fe\src\components\BarangayAdminPages.tsx" -Pattern "reminder|Reminder|sendReminder" | Select-Object -First 10 | ForEach-Object { Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0,[Math]::Min(110,$_.Line.Trim().Length)))" }
Write-Host "`n  Reminder files in backend:" -ForegroundColor Yellow
Get-ChildItem "$be\services" -Recurse -Include "*.ts" -EA SilentlyContinue | Where-Object { $_.Name -match "reminder" } | ForEach-Object { Write-Host "  $($_.FullName)" }

SEC "G02 - Sentiment color coding: what pattern?"
Write-Host "  ALL sentiment references in BarangayAdminPages.tsx:" -ForegroundColor Yellow
Select-String -Path "$fe\src\components\BarangayAdminPages.tsx" -Pattern "sentiment" | Select-Object -First 15 | ForEach-Object { Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length)))" -ForegroundColor DarkGray }

SEC "G03 - Program requests panel"
Write-Host "  program_requests / Most Requested refs:" -ForegroundColor Yellow
Select-String -Path "$fe\src\components\BarangayAdminPages.tsx" -Pattern "program_requests|programRequests|Most Requested|requested|request.*rogram|aggregate.*request" | Select-Object -First 15 | ForEach-Object { Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length)))" }

SEC "G04 - Respond to feedback UI"
Write-Host "  respond / response form refs:" -ForegroundColor Yellow
Select-String -Path "$fe\src\components\BarangayAdminPages.tsx" -Pattern "respond|Respond|response|Response|reply|Reply" | Select-Object -First 15 | ForEach-Object { Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length)))" }

SEC "G06 - Anonymous feedback display"
Write-Host "  anonymous / Anonymous refs:" -ForegroundColor Yellow
Select-String -Path "$fe\src\components\BarangayAdminPages.tsx" -Pattern "anonymous|Anonymous|is_anonymous|submittedBy" | Select-Object -First 15 | ForEach-Object { Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length)))" }

SEC "K08 - Poll votes visible to Chairperson"
Write-Host "  poll refs in BarangayAdminPages.tsx:" -ForegroundColor Yellow
Select-String -Path "$fe\src\components\BarangayAdminPages.tsx" -Pattern "poll|Poll|vote|Vote|survey|Survey" | Select-Object -First 20 | ForEach-Object { Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length)))" }
Write-Host "`n  Poll routes in backend:" -ForegroundColor Yellow
Select-String -Path "$be\routes\poll.routes.ts" -Pattern "router\.(get|post|patch|delete)" | ForEach-Object { Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0,[Math]::Min(100,$_.Line.Trim().Length)))" }
Write-Host "`n  Poll API methods:" -ForegroundColor Yellow
Select-String -Path "$fe\src\lib\api.ts" -Pattern "poll|Poll|vote|Vote" | Select-Object -First 10 | ForEach-Object { Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length)))" }

Write-Host ""
Write-Host "Done. Paste the output above." -ForegroundColor Cyan
