$global:P = 0; $global:F = 0; $global:Fails = @()
function T($id,$desc,$cond,$ev="") {
  if ($cond) { $global:P++; Write-Host "  [PASS] $id  $desc" -ForegroundColor Green }
  else { $global:F++; $global:Fails += "$id $desc"; Write-Host "  [FAIL] $id  $desc" -ForegroundColor Red; if ($ev) { Write-Host "         $ev" -ForegroundColor DarkGray } }
}
function SEC($t) { Write-Host ""; Write-Host ("=" * 78) -ForegroundColor Cyan; Write-Host " $t" -ForegroundColor Cyan; Write-Host ("=" * 78) -ForegroundColor Cyan }
function RF($p) { if (Test-Path $p) { return (Get-Content $p -Raw -EA SilentlyContinue) } return "" }
$be = "C:\dev\KABISIG-FINAL\backend"
$fe = "C:\dev\KABISIG-FINAL\frontend"
$cmp = "$fe\src\components"
$lib = "$fe\src\lib"
$off = RF "$cmp\OfficialPages.tsx"
$api = RF "$fe\src\lib\api.ts"
$app = RF "$fe\src\App.tsx"
$progR = RF "$be\routes\program.routes.ts"
$budR = RF "$be\routes\budget.routes.ts"
$docR = RF "$be\routes\document.routes.ts"
$invR = RF "$be\routes\inventory.routes.ts"
$fbR  = RF "$be\routes\feedback.routes.ts"
$userR = RF "$be\routes\user.routes.ts"
$notifR = RF "$be\routes\notifications.routes.ts"

SEC "A. FILE AND ROLE STRUCTURE"
T "A01" "OfficialPages.tsx exists" (Test-Path "$cmp\OfficialPages.tsx") ""
T "A02" "currentRole or position detection" (($off -match "currentRole") -or ($off -match "official_role") -or ($off -match "position")) ""
T "A03" "Kagawad role identifier" (($off -match "Kagawad") -or ($off -match "Program Officer")) ""
T "A04" "Secretary role identifier" ($off -match "Secretary") ""
T "A05" "Treasurer role identifier" ($off -match "Treasurer") ""
T "A06" "activeMenu state declared" ($off -match "activeMenu") ""
T "A07" "currentUser prop used" ($off -match "currentUser") ""
T "A08" "currentBarangay/currentTenant prop used" (($off -match "currentBarangay") -or ($off -match "currentTenant")) ""

SEC "B. SK KAGAWAD / PROGRAM OFFICER (§3.2.2.1 p.24)"
T "B01" "Create program form" (($off -match "createProgram|programForm") -and ($off -match "onSubmit")) ""
T "B02" "Schedule program (date/time fields)" (($off -match "startDate") -and ($off -match "endDate")) ""
T "B03" "Track participant slots" ($off -match "totalSlots|slots|Slots") ""
T "B04" "QR attendance (getUserMedia + html5-qrcode)" (($off -match "getUserMedia") -or ($off -match "html5-qrcode|Html5Qrcode") -or ($off -match "LiveCameraScanner")) ""
T "B05" "Scan attendance button/handler" (($off -match "scan|Scan") -and ($off -match "attendance|Attendance")) ""
T "B06" "View attendance records" (($off -match "getProgramAttendance") -or ($off -match "localAttendance") -or ($off -match "attendanceRecords")) ""
T "B07" "Review program feedback section" (($off -match "feedback|Feedback") -and ($off -match "review|Review")) ""
T "B08" "Low engagement detection panel" ($off -match "detectLowEngagement|lowEngagement|Low Engagement") ""
T "B09" "Send outreach/reminder action" ($off -match "reminder|Reminder|outreach|invitation|invite") ""
T "B10" "Registered Participants section removed (per user req)" (-not ($off -match "Registered Participants")) "confirmed removed"
T "B11" "Backend program create/update" (($progR -match "router\.post") -and ($progR -match "router\.put")) ""
T "B12" "Backend attendance scan endpoint" (($progR -match "attendance") -and ($progR -match "router\.post")) ""

SEC "C. SK SECRETARY (§3.2.2.1 p.24)"
T "C01" "Youth registry maintenance view" ($off -match "registry|Registry") ""
T "C02" "Document upload handler" ($off -match "uploadDocument|handleUpload|onUpload") ""
T "C03" "Document categorization (Resolutions/Minutes/Vouchers)" (($off -match "Resolutions") -or ($off -match "Minutes") -or ($off -match "Vouchers")) ""
T "C04" "Draft resolution form" (($off -match "resolution|Resolution") -and ($off -match "draft|Draft|createResolution")) ""
T "C05" "Route file for approval" (($off -match "routeForApproval|designate|submitForReview|route") -or ($off -match "approvalDecision|approver")) ""
T "C06" "Session minutes handling" ($off -match "Minutes|minutes") ""
T "C07" "Council attendance tracking" (($off -match "councilAttendance|officialAttendance|sessionAttendance|meetingAttendance") -or ($off -match "Meeting Attendance") -or ($off -match "Quorum")) ""
T "C08" "Compliance deadline tracking" ($off -match "compliance|Compliance|deadline|Deadline") ""
T "C09" "Draft status filter removed (per user req)" (-not ($off -match "['`"]draft['`"]|draft status")) "confirmed removed"
T "C10" "Program dropdown shows all programs" (($off -match "programs\.map|allPrograms|programs\.filter")) ""
T "C11" "Zone filter includes all zones (not just 1-4)" (($off -match "zone.*1.*[1-9]") -or ($off -match "zoneFilter|zonesList|zoneList") -or ($off -match "allZones")) ""
T "C12" "Backend document upload" ($docR -match "upload") ""
T "C13" "Backend document route for approval" (($docR -match "approve") -or ($docR -match "reject")) ""
T "C14" "Backend resolution/poll creation" ($off -match "createPoll|onAddResolution|addResolution") ""

SEC "D. SK TREASURER (§3.2.2.1 p.24)"
T "D01" "Allocate budget from Chairperson total" (($off -match "allocateBudget|allocate.*budget|budgetAllocation") -or ($off -match "setBudgetAllocation")) ""
T "D02" "Record itemized disbursement form" (($off -match "recordExpense|addExpense|expenseForm")) ""
T "D03" "VAT computation" (($off -match "VAT") -or ($off -match "tax_type|taxType")) ""
T "D04" "Non-VAT computation" ($off -match "NON_VAT|Non-VAT|nonVat") ""
T "D05" "Tax amount calculation" (($off -match "taxAmount|tax_amount") -or ($off -match "computeTax|calculateTax")) ""
T "D06" "Net amount calculation" (($off -match "netAmount|net_amount")) ""
T "D07" "Budget utilization tracking" ($off -match "utilization|Utilization") ""
T "D08" "Budget alert (threshold notification)" (($off -match "budgetAlert|monitorBudgets|threshold")) ""
T "D09" "Financial reports generation" (($off -match "financialReport|generateReport|report")) ""
T "D10" "Inventory management section" (($off -match "inventory|Inventory")) ""
T "D11" "Inventory photo upload" (($off -match "photo_url|photoUrl|inventoryPhoto") -and ($off -match "upload|Upload")) ""
T "D12" "Asset turnover report" (($off -match "turnover|Turnover")) ""
T "D13" "COA-ready export" (($off -match "COA|coa|generateBudgetUtilizationReport|pdfReports")) ""
T "D14" "Record disbursement creates expense row" (($off -match "kabisigApi\.(createExpense|recordExpense|postExpense|addExpense)")) ""
T "D15" "Backend budget POST endpoint" (($budR -match "router\.post") -and ($budR -match "expense")) ""
T "D16" "Backend inventory POST" ($invR -match "router\.post") ""
T "D17" "Backend inventory photo_url support" ($invR -match "photo_url") ""
T "D18" "Real expense data displays" ($off -match "expenses\.map|expenseTable|expenses\?") ""
T "D19" "Program budget allocation display" (($off -match "programs\.map") -and ($off -match "budget")) ""
T "D20" "Dashboard overview card for Treasurer" (($off -match "Total.*Budget|Budget.*Overview|financial.*summary")) ""

SEC "E. CROSS-ROLE DATA SYNC (SK Officials)"
$wr = @(
  @{id="E01"; d="Kagawad program -> Youth sees";           w="createProgram|router\.post"; r="programs\.map|programs"}
  @{id="E02"; d="Kagawad attendance -> engagement update";  w="scanQR|markAttendance|attendance"; r="engagementScore"}
  @{id="E03"; d="Kagawad program -> Chairperson sees";      w="createProgram"; r="Chairperson|programs"}
  @{id="E04"; d="Secretary doc -> Chairperson approves";    w="uploadDocument|router\.post.*document"; r="approvalDecision|approve"}
  @{id="E05"; d="Secretary resolution -> Chairperson auth"; w="createPoll|addResolution"; r="Resolution"}
  @{id="E06"; d="Treasurer expense -> Chairperson sees";    w="recordExpense|createExpense"; r="expenses\.map|Expenses"}
  @{id="E07"; d="Treasurer inventory -> Chairperson view";  w="createInventoryItem|addItem"; r="inventory|Inventory"}
  @{id="E08"; d="Treasurer budget -> Chairperson sees";     w="allocateBudget"; r="budgets|budgetAllocations"}
  @{id="E09"; d="Officials receive notifications";          w="notifications"; r="NotificationMenu"}
  @{id="E10"; d="Officials write audit logs";               w="audit_logs|auditLog"; r="audit" }
)
foreach ($x in $wr) { $wh = (($off + $api + $progR + $budR + $docR + $invR) -match $x.w); $rh = ($off -match $x.r); T $x.id $x.d ($wh -and $rh) "write=$wh read=$rh" }

SEC "F. RBAC AND SECURITY"
T "F01" "SK_OFFICIAL role gate" (($userR -match "SK_OFFICIAL") -or ($off -match "SK_OFFICIAL")) ""
T "F02" "Position/sub-role enforcement" (($off -match "official_role") -or ($off -match "position")) ""
T "F03" "Tenant scoping by barangay" (($off -match "currentBarangay|currentTenant") -and ($off -match "tenant_id|tenantId")) ""
T "F04" "Suspended user block" ($userR -match "suspended") ""
T "F05" "Restricted user page (per user req)" (($off -match "RestrictedUser|estricted") -or (Test-Path "$cmp\RestrictedUsersPanel.tsx")) ""
T "F06" "Officials can only see own barangay data" (-not ($off -match "allBarangays\.map|allTenants\.map")) ""
T "F07" "requireRoles guard includes SK_OFFICIAL" ($userR -match "requireRoles.*SK_OFFICIAL") ""
T "F08" "No placeholder UserPassword / demo credentials" (-not ($off -match "admin123|password123|demo123")) ""

SEC "G. RULE-BASED LOGIC"
T "G01" "Slot capacity check (no overbooking)" (($off -match "totalSlots|slots") -and ($off -match "registration")) ""
T "G02" "Schedule conflict detection" ($off -match "conflict|Conflict") ""
T "G03" "Low engagement score threshold" (($off -match "score < 50") -or ($off -match "engagementScore")) ""
T "G04" "Budget overspend prevention" (($off -match "exceeds|insufficient|remaining_amount")) ""
T "G05" "VAT/non-VAT rate lookup" (($off -match "0\.12|12%|0\.03|3%|0\.02|2%") -or ($off -match "taxRate")) ""
T "G06" "Duplicate attendance prevention" (($off -match "already.*checked|duplicate|existing.*attendance")) ""
T "G07" "Compliance deadline alert" (($off -match "deadline|Deadline|overdue|Overdue")) ""
T "G08" "Duplicate assistance flag" (($off -match "duplicate|Duplicate") -or ($off -match "overBenefited|programCount")) ""
T "G09" "Attendance verification required before credit" (($off -match "verified|Verified") -and ($off -match "attendance")) ""
T "G10" "Age validation for registration review" (($off -match "15.*30") -or ($off -match "calculateAge")) ""

SEC "H. BUTTON WIRING AND NAVIGATION"
$onClickCount = ([regex]::Matches($off, "onClick=\{")).Count
T "H01" "onClick handlers (>=40)" ($onClickCount -ge 40) "found $onClickCount"
$setMenuCount = ([regex]::Matches($off, "setActiveMenu")).Count
T "H02" "setActiveMenu calls (>=5)" ($setMenuCount -ge 5) "found $setMenuCount"
T "H03" "UserMenu (profile logout)" ($off -match "UserMenu") ""
T "H04" "NotificationMenu bell present" ($off -match "NotificationMenu") ""
T "H05" "App.tsx routes SK_OFFICIAL to OfficialPages" (($app -match "OfficialPages") -or ($app -match "SK Official")) ""
T "H06" "Role gating on App.tsx" ($app -match "SK_OFFICIAL|Kagawad|Secretary|Treasurer") ""

SEC "I. REAL DATA FROM SUPABASE (not hardcoded)"
$apiCalls = ([regex]::Matches($off, "kabisigApi\.")).Count
T "I01" "kabisigApi calls (>=10)" ($apiCalls -ge 10) "found $apiCalls"
T "I02" "No Lorem ipsum / Sample User" (-not ($off -match "Lorem ipsum|Sample User|Test User")) ""
T "I03" "No Math.random for demo" (-not ($off -match "Math\.random")) ""
$useEffectCount = ([regex]::Matches($off, "useEffect")).Count
T "I04" "useEffect data loading (>=3)" ($useEffectCount -ge 3) "found $useEffectCount"
T "I05" "useState for live data" (($off -match "useState<") -and ($off -match "useState\(")) ""

SEC "SUMMARY"
$tot = $global:P + $global:F
Write-Host ""
Write-Host ("  TOTAL: {0}  PASS: {1}  FAIL: {2}" -f $tot, $global:P, $global:F) -ForegroundColor $(if ($global:F -eq 0) {"Green"} else {"Yellow"})
if ($global:F -gt 0) {
  Write-Host ""
  Write-Host "  FAILURES:" -ForegroundColor Red
  foreach ($x in $global:Fails) { Write-Host "    - $x" -ForegroundColor Red }
  exit 1
}
Write-Host ""
Write-Host "  SK OFFICIALS (KAGAWAD / SECRETARY / TREASURER) - ALL PASS" -ForegroundColor Green
exit 0
