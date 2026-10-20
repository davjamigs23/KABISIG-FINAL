$p = 0; $f = 0; $fails = @()
function T($id,$desc,$cond) {
  if ($cond) { $script:p++; Write-Host "  [PASS] $id  $desc" -ForegroundColor Green }
  else { $script:f++; $script:fails += "$id $desc"; Write-Host "  [FAIL] $id  $desc" -ForegroundColor Red }
}
$fe = "C:\dev\KABISIG-FINAL\frontend"
$be = "C:\dev\KABISIG-FINAL\backend"
$youth = Get-Content (Join-Path $fe "src\components\YouthPages.tsx") -Raw
$app   = Get-Content (Join-Path $fe "src\App.tsx") -Raw
$chair = Get-Content (Join-Path $fe "src\components\BarangayAdminPages.tsx") -Raw
$fb    = Get-Content (Join-Path $be "routes\feedback.routes.ts") -Raw
Write-Host ""
Write-Host "=== AVATAR UPLOAD ===" -ForegroundColor Cyan
T "AV1" "uploadAvatar called in YouthPages" ($youth -match "kabisigApi\.uploadAvatar\(b64")
T "AV2" "App.tsx maps avatar_url on load" ($app -match "avatar_url \|\| meta\.profilePic")
T "AV3" "App.tsx line 333 patched" ($app -match "user as any.*avatar_url \|\| meta\.profilePic,")
T "AV4" "App.tsx line 618 patched" ($app -match "matchedProfile as any.*avatar_url \|\| meta")
Write-Host ""
Write-Host "=== SENTIMENT PROGRAM REQUESTS ===" -ForegroundColor Cyan
T "SE1" "PROGRAM_REQUEST_KEYWORDS defined" ($fb -match "PROGRAM_REQUEST_KEYWORDS")
T "SE2" "programRequests in return type" ($fb -match "programRequests: string")
T "SE3" "program_requests persisted to DB" ($fb -match "program_requests:")
foreach ($c in @("Scholarship","Sports","Employment","Livelihood","Mental Health")) {
  T "SE-$c" "Category: $c" ($fb -match [regex]::Escape($c))
}
Write-Host ""
Write-Host "=== INVENTORY UNDER BUDGET (CHAIRPERSON) ===" -ForegroundColor Cyan
T "IN1" "Inventory under budget menu" (($chair -match "activeMenu === .budget.") -and ($chair -match "Council Property"))
T "IN2" "Inventory menu buttons removed" (-not ($chair -match "setActiveMenu\(.inventory.\)"))
T "IN3" "Inventory state hook present" ($chair -match "setInventory|const .*inventory.*useState")
Write-Host ""
Write-Host "=== JSPDF REAL PDF ===" -ForegroundColor Cyan
$pdf = "C:\dev\KABISIG-FINAL\frontend\src\lib\pdfReports.ts"
T "PD1" "pdfReports.ts exists" (Test-Path $pdf)
if (Test-Path $pdf) {
  $pdfc = Get-Content $pdf -Raw
  T "PD2" "generateBudgetUtilizationReport exported" ($pdfc -match "export function generateBudgetUtilizationReport")
  T "PD3" "jspdf import present" ($pdfc -match "from .jspdf.")
}
T "PD4" "Chairperson uses jsPDF function" ($chair -match "generateBudgetUtilizationReport")
T "PD5" "No duplicate green PDF button" (-not ($chair -match "bg-emerald-700.*generateBudgetUtilizationReport"))
Write-Host ""
Write-Host "=== ANONYMOUS FEEDBACK IN OWN HISTORY ===" -ForegroundColor Cyan
T "AN1" "Backend always stores user_id" ($fb -match "user_id: user\.id")
T "AN2" "No conditional null user_id" (-not ($fb -match "is_anonymous \? null"))
T "AN3" "Frontend filter matches own submissions" ($youth -match "f\.userId === youth\.userId")
Write-Host ""
Write-Host "=== POLL VOTES / TRANSFER / NOTIFS (cross-session verify) ===" -ForegroundColor Cyan
$admin = Get-Content (Join-Path $be "routes\admin.routes.ts") -Raw
$auth = Get-Content (Join-Path $be "routes\auth.routes.ts") -Raw
$notif = Get-Content (Join-Path $be "routes\notifications.routes.ts") -Raw
T "X1" "Transfer chairmanship route" ($admin -match "transfer-chairmanship")
T "X2" "Transfer demotes to role_id 4 + pending" ($admin -match "role_id: 4, status")
T "X3" "BARANGAY_NO_CHAIRPERSON guard" ($auth -match "BARANGAY_NO_CHAIRPERSON")
T "X4" "C1 cross-tenant guard" ((Get-Content (Join-Path $be "routes\user.routes.ts") -Raw) -match "C1: Cross-tenant guard")
T "X5" "Notifications scoped by user_id" ($notif -match "user_id")
Write-Host ""
Write-Host "=== BUILD HEALTH ===" -ForegroundColor Cyan
Push-Location $be; $null = & npm run build 2>&1; $bex = $LASTEXITCODE; Pop-Location
T "A1" "Backend npm run build" ($bex -eq 0)
Push-Location $fe; $null = & npx tsc --noEmit 2>&1; $fex = $LASTEXITCODE; Pop-Location
T "A2" "Frontend npx tsc --noEmit" ($fex -eq 0)
Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
$t = $script:p + $script:f
Write-Host ("TOTAL: {0}  PASS: {1}  FAIL: {2}" -f $t, $script:p, $script:f) -ForegroundColor $(if($script:f -eq 0){"Green"}else{"Yellow"})
if ($script:f -gt 0) { Write-Host ""; foreach ($x in $script:fails) { Write-Host "  - $x" -ForegroundColor Red } }
