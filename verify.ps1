$ErrorActionPreference = "Continue"
$root = "C:\dev\KABISIG-FINAL"
$be = Join-Path $root "backend"
$fe = Join-Path $root "frontend"
$global:P = 0
$global:F = 0
$global:failList = @()

function T($id, $desc, $cond) {
    if ($cond) { $global:P++; Write-Host "  [PASS] $id  $desc" -ForegroundColor Green }
    else { $global:F++; $global:failList += "$id $desc"; Write-Host "  [FAIL] $id  $desc" -ForegroundColor Red }
}

Write-Host "`n=== BUILD ===" -ForegroundColor Cyan
Push-Location $be
$null = & npm run build 2>&1
T "A1" "Backend build" ($LASTEXITCODE -eq 0)
Pop-Location
Push-Location $fe
$null = & npx tsc --noEmit 2>&1
T "A2" "Frontend tsc" ($LASTEXITCODE -eq 0)
Pop-Location

Write-Host "`n=== TRANSFER CHAIRMANSHIP ===" -ForegroundColor Cyan
$admin = Get-Content (Join-Path $be "routes\admin.routes.ts") -Raw
T "B1" "Route exists" ($admin -match "transfer-chairmanship")
T "B2" "Outgoing to role 4 + pending" ($admin -match "role_id:\s*4,\s*status:\s*'pending'")
T "B3" "Verification reset" ($admin -match "verification_status:\s*'pending'")
T "B4" "Audit tag" ($admin -match "DEMOTED_TO_YOUTH_CONSTITUENT")

Write-Host "`n=== YOUTH REG GUARD ===" -ForegroundColor Cyan
$auth = Get-Content (Join-Path $be "routes\auth.routes.ts") -Raw
T "C1" "BARANGAY_NO_CHAIRPERSON" ($auth -match "BARANGAY_NO_CHAIRPERSON")
T "C2" "Guard queries role+tenant+active" (($auth -match "role_id',\s*2") -and ($auth -match "tenant_id',\s*barangay\.id") -and ($auth -match "status',\s*'active'"))

Write-Host "`n=== C1 CROSS-TENANT ===" -ForegroundColor Cyan
$user = Get-Content (Join-Path $be "routes\user.routes.ts") -Raw
$c1 = @([regex]::Matches($user, "C1: Cross-tenant guard")).Count
T "D1" "C1 guard present" ($c1 -ge 1)
$pc = 0
foreach ($ln in ($user -split "`r?`n")) { if ($ln -match "router\.patch\(\s*'/:id/status'") { $pc++ } }
T "D2" "PATCH /:id/status single declaration" ($pc -eq 1)

Write-Host "`n=== SENTIMENT + PROGRAM REQUESTS ===" -ForegroundColor Cyan
$fb = Get-Content (Join-Path $be "routes\feedback.routes.ts") -Raw
T "E1" "PROGRAM_REQUEST_KEYWORDS" ($fb -match "PROGRAM_REQUEST_KEYWORDS")
T "E2" "returns programRequests" ($fb -match "programRequests:\s*string\[\]")
T "E3" "Scholarship category" ($fb -match "'Scholarship'\s*:")
T "E4" "Sports category" ($fb -match "'Sports'\s*:")
T "E5" "Employment category" ($fb -match "'Employment'\s*:")
T "E6" "Livelihood category" ($fb -match "'Livelihood'\s*:")
T "E7" "Mental Health category" ($fb -match "'Mental Health'\s*:")
T "E8" "Persists to DB" (@([regex]::Matches($fb, "program_requests:\s*sentimentResult\.programRequests")).Count -ge 2)

Write-Host "`n=== DUPLICATE ASSISTANCE ===" -ForegroundColor Cyan
$bap = Get-Content (Join-Path $fe "src\components\BarangayAdminPages.tsx") -Raw
T "F1" "benefitCategories defined" ($bap -match "benefitCategories")
T "F2" "Uses benefit filter" ($bap -match "benefitCategories\.some")
T "F3" "Threshold >= 3" ($bap -match "programCount\s*>=\s*3")

Write-Host "`n=== LOW ENGAGEMENT ===" -ForegroundColor Cyan
$intel = Get-Content (Join-Path $fe "src\lib\intelligence.ts") -Raw -ErrorAction SilentlyContinue
T "G1" "Real registrations" ($intel -match "registrations\.filter")
T "G2" "No Math.random" (-not ($intel -match "Math\.random\(\)"))

Write-Host "`n=== SPAM / SUSPENSION ===" -ForegroundColor Cyan
T "H1" "detectSpam called" ($fb -match "detectSpam\(")
T "H2" "temp_suspend handled" ($fb -match "temp_suspend")
T "H3" "permanent_ban handled" ($fb -match "permanent_ban")
T "H4" "Reactivation clears reason" ($user -match "suspension_reason = null")
T "H5" "Reactivation lifts ban" ($user -match "ban_duration:\s*'none'")

Write-Host "`n=== POLL UNIQUENESS ===" -ForegroundColor Cyan
$poll = Get-Content (Join-Path $be "routes\poll.routes.ts") -Raw
T "I1" "Vote check present" ($poll -match "existing|hasVoted|already.*vote")

Write-Host "`n=== NOTIFICATIONS ===" -ForegroundColor Cyan
$notif = Get-Content (Join-Path $be "routes\notifications.routes.ts") -Raw
T "J1" "GET scoped by user_id or tenant_id" ($notif -match "\.eq\(\s*'user_id'|\.eq\(\s*'tenant_id'")
T "J2" "PATCH /:id/read has user_id filter" ($notif -match "\.eq\(\s*'user_id'")
T "J3" "Read-all endpoint exists" ($notif -match "router\.patch\(\s*'/read-all'")

Write-Host "`n=== INVENTORY PHOTO ===" -ForegroundColor Cyan
$inv = Get-Content (Join-Path $be "routes\inventory.routes.ts") -Raw
T "K1" "Backend photo_url" ($inv -match "photo_url")
$off = Get-Content (Join-Path $fe "src\components\OfficialPages.tsx") -Raw -ErrorAction SilentlyContinue
T "K2" "Frontend references photo" ($off -match "photo_url|inventoryPhoto")

Write-Host "`n=== SUMMARY ===" -ForegroundColor Cyan
$total = $global:P + $global:F
Write-Host ("  TOTAL: {0}  PASS: {1}  FAIL: {2}" -f $total, $global:P, $global:F) -ForegroundColor $(if($global:F -eq 0){"Green"}else{"Yellow"})
if ($global:F -gt 0) {
    Write-Host "`n  FAILURES:" -ForegroundColor Red
    $global:failList | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
    exit 1
}
Write-Host "`n  ALL PASS - project is defense-ready." -ForegroundColor Green
exit 0
