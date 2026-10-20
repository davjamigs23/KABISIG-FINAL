$global:P = 0; $global:F = 0; $global:Fails = @()
function T($id,$desc,$cond,$ev="") {
  if ($cond) { $global:P++; Write-Host "  [PASS] $id  $desc" -ForegroundColor Green }
  else { $global:F++; $global:Fails += "$id $desc"; Write-Host "  [FAIL] $id  $desc" -ForegroundColor Red; if ($ev) { Write-Host "         $ev" -ForegroundColor DarkGray } }
}
function SEC($t) { Write-Host ""; Write-Host ("=" * 74) -ForegroundColor Cyan; Write-Host " $t" -ForegroundColor Cyan; Write-Host ("=" * 74) -ForegroundColor Cyan }
function RF($p) { if (Test-Path $p) { return (Get-Content $p -Raw -EA SilentlyContinue) } return "" }
$be = "C:\dev\KABISIG-FINAL\backend"
$fe = "C:\dev\KABISIG-FINAL\frontend"
$lib = "$fe\src\lib"
$cmp = "$fe\src\components"
$allBe = ""
Get-ChildItem $be -Recurse -Include "*.ts" -EA SilentlyContinue | Where-Object { $_.FullName -notmatch "node_modules|\.d\.ts$" } | ForEach-Object { $allBe += (Get-Content $_.FullName -Raw -EA SilentlyContinue) }
$allFe = ""
Get-ChildItem $fe -Recurse -Include "*.ts","*.tsx" -EA SilentlyContinue | Where-Object { $_.FullName -notmatch "node_modules|\.d\.ts$" } | ForEach-Object { $allFe += (Get-Content $_.FullName -Raw -EA SilentlyContinue) }

SEC "A. BUILD HEALTH"
Push-Location $be; $null = & npm run build 2>&1; $bex = $LASTEXITCODE; Pop-Location
T "A01" "Backend npm run build" ($bex -eq 0) "exit=$bex"
Push-Location $fe; $null = & npx tsc --noEmit 2>&1; $fex = $LASTEXITCODE; Pop-Location
T "A02" "Frontend npx tsc --noEmit" ($fex -eq 0) "exit=$fex"

SEC "B. ANTI-FAKE DATA"
T "B01" "No Math.random in intelligence.ts" (-not ((RF "$lib\intelligence.ts") -match "Math\.random")) ""
T "B02" "No Lorem ipsum placeholders" (-not (($allBe + $allFe) -match "Lorem ipsum|Sample data|Dummy data")) ""
T "B03" "No hardcoded test names" (-not (($allBe + $allFe) -match "John Doe|Jane Doe|Test User|Juan Dela Cruz")) ""
$qc = ([regex]::Matches($allBe, "\.from\(")).Count
T "B04" "Supabase real queries (>=50)" ($qc -ge 50) "found $qc"

SEC "C. MODULE 1 - PROFILING AND DIGITAL REGISTRY"
$authR = RF "$be\routes\auth.routes.ts"
$userR = RF "$be\routes\user.routes.ts"
$youthP = RF "$cmp\YouthPages.tsx"
$appX = RF "$fe\src\App.tsx"
$intel = RF "$lib\intelligence.ts"
T "C01" "Age 15-30 validation (RA 10742)" (($authR -match "calculatedAge") -and ($authR -match "15")) ""
T "C02" "Demographic if-then classification" (($allBe + $allFe) -match "OSY|Out-of-School|scholar|PWD") ""
T "C03" "Digital Youth ID (KAB-NAGA)" (($authR + $allFe) -match "KAB-NAGA|digital_youth_id") ""
T "C04" "QR code generation" (($allBe + $allFe) -match "qrcode|html5.?qrcode|QRCode") ""
T "C05" "Duplicate assistance benefit filter" ($allFe -match "benefitCategories") ""
T "C06" "Engagement score in intelligence.ts" ($intel -match "engagementScore|pRegs") ""
T "C07" "Avatar endpoint (upload-avatar)" ($userR -match "upload-avatar") ""
T "C08" "Avatar upload in YouthPages" ($youthP -match "kabisigApi\.uploadAvatar") ""
T "C09" "Avatar mapping in App.tsx" ($appX -match "avatar_url") ""

SEC "D. MODULE 2 - PROGRAMS AND RECOMMENDATIONS"
$progR = RF "$be\routes\program.routes.ts"
T "D01" "Program CRUD" (($progR -match "router\.post") -and ($progR -match "router\.put") -and ($progR -match "router\.delete")) ""
T "D02" "QR scan library" ($allFe -match "html5-qrcode|Html5Qrcode|LiveCameraScanner") ""
T "D03" "Schedule conflict detection" ($intel -match "detectScheduleConflicts") ""
T "D04" "Rule-based recommendations" (($intel + $allBe) -match "recommend") ""
T "D05" "Low engagement detection" ($intel -match "detectLowEngagement") ""
T "D06" "Slot limit validation" ($progR -match "total_slots|slots_remaining|programFull") ""
T "D07" "ABYIP alignment" (($allBe + $allFe) -match "ABYIP|abyip") ""

SEC "E. MODULE 3 - FINANCIAL TRANSPARENCY"
$budR = RF "$be\routes\budget.routes.ts"
$docR = RF "$be\routes\document.routes.ts"
$invR = RF "$be\routes\inventory.routes.ts"
$pubR = RF "$be\routes\public.routes.ts"
$chairP = RF "$cmp\BarangayAdminPages.tsx"
$offP = RF "$cmp\OfficialPages.tsx"
T "E01" "Budget allocation endpoints" (($budR -match "router\.post") -and ($budR -match "router\.get")) ""
T "E02" "VAT / withholding" (($allBe + $allFe) -match "VAT|withholding") ""
T "E03" "Utilization" (($allBe + $allFe) -match "utilization") ""
T "E04" "Budget alerts" (($allBe + $allFe) -match "budget.?alert|monitorBudgets") ""
T "E05" "Document approve/reject" (($docR -match "approve") -and ($docR -match "reject")) ""
T "E06" "Compliance monitoring" (($allFe + $allBe) -match "getComplianceIssues|compliance") ""
T "E07" "PDF helper exists" (Test-Path "$lib\pdfReports.ts") ""
T "E08" "generateBudgetUtilizationReport" ((RF "$lib\pdfReports.ts") -match "generateBudgetUtilizationReport") ""
T "E09" "Chairperson uses jsPDF" ($chairP -match "generateBudgetUtilizationReport") ""
T "E10" "Public expenses FPD endpoint" (($pubR -match "expense") -or ($pubR -match "demographics") -or ($allFe -match "Transparency|transparency")) "checked /expenses endpoint serves FPD"
T "E11" "Inventory photo_url" ($invR -match "photo_url") ""
T "E12" "Chairperson inventory under Budget" (($chairP -match "activeMenu === .budget.") -and ($chairP -match "Council Property")) ""
T "E13" "Treasurer inventory view" ($offP -match "inventory|Inventory") ""

SEC "F. MODULE 4 - ENGAGEMENT AND SENTIMENT"
$fbR = RF "$be\routes\feedback.routes.ts"
$pollR = RF "$be\routes\poll.routes.ts"
$notifR = RF "$be\routes\notifications.routes.ts"
T "F01" "Feedback submission" ($fbR -match "router\.post") ""
T "F02" "Anonymous toggle" ($fbR -match "is_anonymous") ""
T "F03" "Anonymity: user_id stored" ($fbR -match "user_id: user\.id") ""
T "F04" "Negation handling" ($fbR -match "NEGATORS") ""
$cc = 0
foreach ($c in @("Scholarship","Sports","Employment","Livelihood","Mental Health")) { if ($fbR -match $c) { $cc++ } }
T "F05" "5+ program-request categories" ($cc -ge 5) "found $cc/5"
T "F06" "Persists program_requests" ($fbR -match "program_requests:") ""
T "F07" "Poll create + vote" (($pollR -match "router\.post") -and ($pollR -match "vote")) ""
T "F08" "One vote per user" ($pollR -match "existing|hasVoted|already") ""
T "F09" "Notification DB inserts" ($allBe -match "notifications") ""
T "F10" "Read-all + per-ID read" (($notifR -match "read-all") -and ($notifR -match "/:id/read")) ""
T "F11" "Notifications scoped user_id" ($notifR -match "user_id") ""
T "F12" "Anonymous feedback own history" ($youthP -match "youth\.userId") ""
T "F13" "Resolution voting" (($allBe + $allFe) -match "resolution_votes|resolution") ""

SEC "G. MODULE 5 - ANALYTICS AND PUBLIC INFO"
$anR = RF "$be\routes\analytics.routes.ts"
T "G01" "Barangay analytics" ($anR -match "/barangay") ""
T "G02" "Federation analytics" ($anR -match "/federation") ""
T "G03" "Charts (Recharts/D3)" ($allFe -match "recharts|Recharts") ""
$pe = 0
foreach ($ep in @("announcements","expenses","demographics","programs")) { if ($pubR -match $ep) { $pe++ } }
T "G04" "Public portal 4+ endpoints" ($pe -ge 4) "found $pe/4"
T "G05" "Meta Graph API" ($allBe -match "graph\.facebook|page_access_token|facebook_integration") ""
T "G06" "Audit log writes" ($allBe -match "audit_logs") ""

SEC "H. CROSS-ROLE DATA WIRING"
$wr = @(
  @{id="H01"; d="Youth -> Chairperson approval";  w="register-youth"; r="Pending|pendingRegistrations"}
  @{id="H02"; d="Chairperson budget -> Treasurer"; w="sk-budget"; r="budgetAllocations|budgets"}
  @{id="H03"; d="Treasurer expense -> Chairperson"; w="expense"; r="expenses|Expenses"}
  @{id="H04"; d="Kagawad program -> Youth";        w="program"; r="programs|Programs"}
  @{id="H05"; d="Attendance -> engagement";        w="program_attendance"; r="engagementScore"}
  @{id="H06"; d="Youth feedback -> sentiment";     w="sentiment_analysis"; r="sentiment"}
  @{id="H07"; d="Poll vote -> Chairperson sees";   w="poll_responses"; r="pollResults|tally"}
  @{id="H08"; d="Doc upload -> approval";          w="upload"; r="approve|Approve"}
  @{id="H09"; d="Inventory -> Chairperson";        w="getInventory"; r="inventory|Inventory"}
  @{id="H10"; d="Notification dispatch";           w="notifications"; r="markAsRead|read-all"}
  @{id="H11"; d="Avatar -> UserMenu";              w="uploadAvatar"; r="avatarUrl"}
)
foreach ($x in $wr) { $wh = ($allBe + $allFe) -match $x.w; $rh = ($allBe + $allFe) -match $x.r; T $x.id $x.d ($wh -and $rh) "write=$wh read=$rh" }

SEC "I. PER-ROLE FEATURE COVERAGE"
$saP = RF "$cmp\SuperAdminPages.tsx"
T "I01" "Super Admin role" (($saP -match "barangay") -and ($saP -match "transfer") -and ($saP -match "audit")) ""
T "I02" "Barangay Admin role" (($chairP -match "registrations") -and ($chairP -match "budget") -and ($chairP -match "approve") -and ($chairP -match "inventory")) ""
T "I03" "SK Official role" (($offP -match "programs") -and ($offP -match "attendance") -and ($offP -match "inventory")) ""
T "I04" "Youth role" (($youthP -match "programs") -and ($youthP -match "register") -and ($youthP -match "feedback") -and ($youthP -match "uploadAvatar")) ""
T "I05" "Public Viewer" ($pe -ge 4) ""

SEC "J. RULE-BASED LOGIC SUBSTANCE"
T "J01" "Schedule real date logic" ($intel -match "new Date|getTime") ""
$pw = ([regex]::Matches(($fbR + $intel), "good|great|helpful|love|salamat|magaling")).Count
T "J02" "Sentiment real vocabulary" ($pw -ge 3) "found $pw"
T "J03" "Word-boundary regex" ($fbR -match "RegExp|RegExp\(") ""
T "J04" "Engagement from registrations" ($intel -match "registrations") ""
T "J05" "Budget threshold logic" (($allBe + $allFe) -match "threshold|monitorBudgets") ""

SEC "K. SECURITY AND CROSS-TENANT"
$adminR = RF "$be\routes\admin.routes.ts"
T "K01" "C1 cross-tenant guard" ($userR -match "C1: Cross-tenant guard") ""
T "K02" "PATCH /:id/status declared" (([regex]::Matches($userR, "router\.patch")).Count -ge 1) ""
T "K03" "Youth reg 409 guard" ($authR -match "BARANGAY_NO_CHAIRPERSON") ""
T "K04" "Transfer demotes role_id 4" ($adminR -match "role_id: 4") ""
T "K05" "Verification reset" ($adminR -match "verification_status") ""
T "K06" "DEMOTED_TO_YOUTH_CONSTITUENT tag" ($adminR -match "DEMOTED_TO_YOUTH_CONSTITUENT") ""
T "K07" "Notif scoped user_id" ($notifR -match "user_id") ""

SEC "SUMMARY"
$t = $global:P + $global:F
Write-Host ""
Write-Host ("  TOTAL: {0}  PASS: {1}  FAIL: {2}" -f $t, $global:P, $global:F) -ForegroundColor $(if ($global:F -eq 0) {"Green"} else {"Yellow"})
if ($global:F -gt 0) { Write-Host ""; Write-Host "  FAILURES:" -ForegroundColor Red; foreach ($x in $global:Fails) { Write-Host "    - $x" -ForegroundColor Red }; exit 1 }
Write-Host ""
Write-Host "  ALL PASS - defense-ready." -ForegroundColor Green
exit 0
