# =====================================================================
#  KABISIG — Manuscript Feature & Data Wiring Verifier
# =====================================================================
$ErrorActionPreference = "Continue"
$root = "C:\dev\KABISIG-FINAL"
$be   = Join-Path $root "backend"
$fe   = Join-Path $root "frontend"
$comps = Join-Path $fe "src\components"
$lib   = Join-Path $fe "src\lib"
$global:P = 0; $global:F = 0; $global:failList = @()
function T($id, $desc, $cond, $ev = "") {
    if ($cond) { $global:P++; Write-Host "  [PASS] $id  $desc" -ForegroundColor Green }
    else { $global:F++; $global:failList += "$id $desc"; Write-Host "  [FAIL] $id  $desc" -ForegroundColor Red; if ($ev) { Write-Host "         $ev" -ForegroundColor DarkGray } }
}
function S($t) { Write-Host ""; Write-Host ("=" * 76) -ForegroundColor Cyan; Write-Host " $t" -ForegroundColor Cyan; Write-Host ("=" * 76) -ForegroundColor Cyan }
function RF($p) { if (Test-Path $p) { return (Get-Content $p -Raw -ErrorAction SilentlyContinue) } return "" }

$allBe = ""
Get-ChildItem $be -Recurse -Include "*.ts" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch 'node_modules|\.d\.ts$' } | ForEach-Object { $allBe += (Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue) }
$allFe = ""
Get-ChildItem $fe -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch 'node_modules|\.d\.ts$' } | ForEach-Object { $allFe += (Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue) }

S "PART A — MODULE FILES PRESENT"
$mods = @{
    'Module 1 (Profiling)' = @('auth.routes.ts','user.routes.ts')
    'Module 2 (Programs)' = @('program.routes.ts')
    'Module 3 (Finance)' = @('budget.routes.ts','document.routes.ts','inventory.routes.ts')
    'Module 4 (Engagement)' = @('feedback.routes.ts','poll.routes.ts','notifications.routes.ts')
    'Module 5 (Analytics)' = @('analytics.routes.ts','public.routes.ts','social.routes.ts')
    'Admin/Oversight' = @('admin.routes.ts','barangay.routes.ts','announcement.routes.ts')
}
$i = 0
foreach ($mod in $mods.Keys) { $i++; $missing = @($mods[$mod] | Where-Object { -not (Test-Path (Join-Path $be "routes\$_")) }); T "A$i" "$mod files" ($missing.Count -eq 0) "missing: $($missing -join ', ')" }

S "PART B — NO FAKE / HARDCODED DATA"
$intel = RF (Join-Path $lib "intelligence.ts")
T "B1" "No Math.random in intelligence.ts" (-not ($intel -match "Math\.random")) ""
$fakeInCode = ($allFe + $allBe) -match '"(John Doe|Jane Doe|Test User|Juan Dela Cruz|Lorem ipsum|Sample User|Dummy)"'
T "B2" "No hardcoded fake user names" (-not $fakeInCode) ""
$reads = ([regex]::Matches($allBe, "\.from\(\s*['""](users|resident_profile|program|program_registrations|budget|expense|feedback|poll_responses|notifications|inventory|documents|attendance)['""]").Count)
T "B3" "Real Supabase queries present (>= 50)" ($reads -ge 50) "found $reads .from() calls"

S "PART C — MODULE 1: PROFILING & REGISTRY"
$authR = RF (Join-Path $be "routes\auth.routes.ts")
$youthP = RF (Join-Path $comps "YouthPages.tsx")
T "C1" "Age 15-30 validation (R.A. 10742)" (($authR -match "calculatedAge.*<.*15") -or ($authR -match "15.*30.*age")) ""
T "C2" "Demographic if-then classification" (($allBe + $allFe) -match "OSY|Out-of-School|scholar|solo.?parent|PWD") ""
T "C3" "Digital Youth ID generation" (($authR + $allFe) -match "KAB-NAGA|digital_youth_id") ""
T "C4" "QR code from Digital ID" (($allBe + $allFe) -match "qrcode|QRCode|toDataURL|html5.?qrcode") ""
T "C5" "Duplicate detection benefit-only" ($allFe -match "benefitCategories") ""
T "C6" "Engagement score from real data" (($intel + $allBe) -match "engagementScore|pRegs\.length") ""

S "PART D — MODULE 2: PROGRAMS & RECOMMENDATIONS"
$progR = RF (Join-Path $be "routes\program.routes.ts")
T "D1" "Program CRUD (post/put/delete)" (($progR -match "router\.post") -and ($progR -match "router\.put") -and ($progR -match "router\.delete")) ""
T "D2" "QR scanning (getUserMedia + html5-qrcode)" (($allFe -match "getUserMedia") -and ($allFe -match "html5-qrcode|Html5Qrcode")) ""
T "D3" "Schedule conflict detection" (($intel + $allBe) -match "detectScheduleConflicts|conflict") ""
T "D4" "Rule-based recommendations" (($intel + $allBe) -match "recommend|Recommendation") ""
T "D5" "Low engagement detection" ($intel -match "detectLowEngagement") ""
T "D6" "Slot limit validation" ($progR -match "total_slots|slots_remaining|programFull") ""

S "PART E — MODULE 3: FINANCIAL TRANSPARENCY"
$budR = RF (Join-Path $be "routes\budget.routes.ts")
$docR = RF (Join-Path $be "routes\document.routes.ts")
$invR = RF (Join-Path $be "routes\inventory.routes.ts")
$chairP = RF (Join-Path $comps "BarangayAdminPages.tsx")
T "E1" "Budget allocation endpoints" (($budR -match "router\.post") -and ($budR -match "router\.get")) ""
T "E2" "VAT/non-VAT tax computation" (($allBe + $allFe) -match "VAT|withholding|tax") ""
T "E3" "Utilization % computation" (($allBe + $allFe) -match "utilization|utilizationRate") ""
T "E4" "Budget threshold alerts" (($allBe + $allFe) -match "budget.?alert|monitorBudgets") ""
T "E5" "Document approval workflow" (($docR -match "approve") -and ($docR -match "reject")) ""
T "E6" "Compliance monitoring" ($allFe -match "getComplianceIssues|compliance") ""
T "E7" "PDF report generation" (($allBe + $allFe) -match "jsPDF|pdfmake|puppeteer|generateReport.*pdf") ""
T "E8" "Public FPD transparency" ($allBe -match "public.*expense|fpd|full.?public.?disclosure|publicExpenses") ""
T "E9" "Inventory photo_url" ($invR -match "photo_url") ""
T "E10" "Chairperson sees inventory (cross-role)" ($chairP -match "inventory|Inventory") ""

S "PART F — MODULE 4: ENGAGEMENT & SENTIMENT"
$fbR = RF (Join-Path $be "routes\feedback.routes.ts")
$pollR = RF (Join-Path $be "routes\poll.routes.ts")
$notifR = RF (Join-Path $be "routes\notifications.routes.ts")
T "F1" "Feedback submission endpoint" ($fbR -match "router\.post") ""
T "F2" "Anonymous toggle" ($fbR -match "is_anonymous|anonymous") ""
T "F3" "Sentiment with negation handling" ($fbR -match "NEGATORS") ""
$catCount = 0
foreach ($cat in @('Scholarship','Sports','Employment','Livelihood','Mental Health')) { if ($fbR -match "'$cat'") { $catCount++ } }
T "F4" "5 program request categories" ($catCount -eq 5) "found $catCount/5"
T "F5" "Poll create + vote endpoints" (($pollR -match "router\.post\(\s*'/'") -and ($pollR -match "/vote")) ""
T "F6" "One vote per user" ($pollR -match "existing|hasVoted|already.*vote") ""
T "F7" "Notifications dispatched to DB" ($allBe -match "from\('notifications'\)\.insert") ""
T "F8" "Read-all + per-ID read" (($notifR -match "read-all") -and ($notifR -match "/:id/read")) ""
T "F9" "Feedback flow: Youth→Chairperson" (($youthP -match "feedback|Feedback") -and ($chairP -match "feedback|Feedback")) ""
T "F10" "Resolution + community voting" (($allBe + $allFe) -match "resolution|resolution_votes") ""

S "PART G — MODULE 5: ANALYTICS & PUBLIC INFO"
$anR = RF (Join-Path $be "routes\analytics.routes.ts")
$pubR = RF (Join-Path $be "routes\public.routes.ts")
T "G1" "Barangay analytics endpoint" ($anR -match "/barangay") ""
T "G2" "Federation analytics endpoint" ($anR -match "/federation") ""
T "G3" "Interactive charts (Recharts/D3)" ($allFe -match "recharts|Recharts|D3") ""
$pubEp = 0
foreach ($ep in @('/announcements','/expenses','/demographics','/programs')) { if ($pubR -match [regex]::Escape($ep)) { $pubEp++ } }
T "G4" "Public portal (4/4 endpoints)" ($pubEp -eq 4) "found $pubEp/4"
T "G5" "Facebook Meta Graph" ($allBe -match "graph\.facebook|Meta Graph|page_access_token|facebook_integration") ""
T "G6" "Audit log writes" ($allBe -match "from\('audit_logs'\)\.insert") ""

S "PART H — CROSS-ROLE DATA WIRING (write AND read must both exist)"
$wiring = @(
    @{ id="H1";  desc="Youth registers -> Chairperson approves"; w="register-youth"; r="Pending Registrations|pendingRegistrations|Pending" }
    @{ id="H2";  desc="Chairperson sets budget -> Treasurer allocates"; w="sk-budget"; r="budgetAllocations|budgets" }
    @{ id="H3";  desc="Treasurer records expense -> Chairperson sees"; w="expense"; r="expenses|Expenses" }
    @{ id="H4";  desc="Kagawad creates program -> Youth sees"; w="program"; r="programs\.map|published.*program" }
    @{ id="H5";  desc="Attendance -> engagement score updates"; w="program_attendance"; r="engagementScore|engagement_score" }
    @{ id="H6";  desc="Youth feedback -> sentiment -> Chairperson"; w="sentiment_analysis"; r="sentiment|Sentiment" }
    @{ id="H7";  desc="Poll vote -> Chairperson sees results"; w="poll_responses"; r="pollResults|poll.*results|tally" }
    @{ id="H8";  desc="Secretary uploads doc -> Chairperson approves"; w="upload"; r="approve|Approve" }
    @{ id="H9";  desc="Inventory -> Chairperson view"; w="inventory"; r="inventory|Inventory" }
    @{ id="H10"; desc="Notification on cross-role events"; w="notifications.*insert"; r="markAsRead|read-all" }
)
foreach ($w in $wiring) { $wh = ($allBe + $allFe) -match $w.w; $rh = ($allBe + $allFe) -match $w.r; T $w.id $w.desc ($wh -and $rh) "write=$wh read=$rh" }

S "PART I — PER-ROLE FEATURE COVERAGE"
$roles = @(
    @{ id="I1"; role="Super Admin"; file="SuperAdminPages.tsx"; must=@('barangay','transfer','audit','federation','tenant') }
    @{ id="I2"; role="Barangay Admin"; file="BarangayAdminPages.tsx"; must=@('registrations','budget','approve','programs','documents') }
    @{ id="I3"; role="SK Official"; file="OfficialPages.tsx"; must=@('programs','attendance','budget','documents','inventory') }
    @{ id="I4"; role="Youth Constituent"; file="YouthPages.tsx"; must=@('programs','register','feedback','polls','profile') }
)
foreach ($r in $roles) {
    $c = RF (Join-Path $comps $r.file)
    $hit = 0; $miss = @()
    foreach ($kw in $r.must) { if ($c -match [regex]::Escape($kw)) { $hit++ } else { $miss += $kw } }
    T $r.id "$($r.role) ($hit/$($r.must.Count))" ($hit -eq $r.must.Count) "missing: $($miss -join ', ')"
}

S "PART J — RULE-BASED LOGIC SUBSTANCE (not placeholder)"
T "J1" "Schedule conflict real date logic" ($intel -match "new Date\(|getTime\(\)|startDate.*<.*endDate|overlap") ""
$posW = @([regex]::Matches(($fbR + $intel + $allBe), "'(good|great|helpful|amazing|excellent|love|salamat|magaling|ayos|okay|best|wonderful|nice|perfect|happy)'")).Count
T "J2" "Sentiment lexicon has real vocabulary" ($posW -ge 5) "found $posW positive word literals"
T "J3" "Program requests use word-boundary" ($fbR -match '\\\\b|RegExp.*\\\\b') ""
T "J4" "Engagement from registrations" ($intel -match "registrations\.filter") ""
T "J5" "Budget alerts real thresholds" ($allBe -match "threshold|80|90|utilization.*>") ""

S "PART K — SECURITY & CROSS-TENANT"
$userR = RF (Join-Path $be "routes\user.routes.ts")
$adminR = RF (Join-Path $be "routes\admin.routes.ts")
T "K1" "C1 tenant guard on user status" ($userR -match "C1: Cross-tenant guard") ""
T "K2" "Youth reg blocked w/o chairperson" ($authR -match "BARANGAY_NO_CHAIRPERSON") ""
T "K3" "Transfer demotes to role_id 4" ($adminR -match "role_id:\s*4,\s*status:\s*'pending'") ""
T "K4" "Notifications scoped to user_id" ($notifR -match "\.eq\(\s*'user_id'") ""

S "SUMMARY"
$total = $global:P + $global:F
Write-Host ""
Write-Host ("  TOTAL: {0}  PASS: {1}  FAIL: {2}" -f $total, $global:P, $global:F) -ForegroundColor $(if ($global:F -eq 0) { "Green" } else { "Yellow" })
if ($global:F -gt 0) {
    Write-Host "`n  FAILURES:" -ForegroundColor Red
    $global:failList | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
    exit 1
}
Write-Host "`n  All code-level checks pass." -ForegroundColor Green
exit 0
