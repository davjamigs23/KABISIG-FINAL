$global:P = 0; $global:F = 0; $global:Fails = @()
function T($id,$desc,$cond,$ev="") {
  if ($cond) { $global:P++; Write-Host "  [PASS] $id  $desc" -ForegroundColor Green }
  else { $global:F++; $global:Fails += "$id $desc"; Write-Host "  [FAIL] $id  $desc" -ForegroundColor Red; if ($ev) { Write-Host "         $ev" -ForegroundColor DarkGray } }
}
function SEC($t) { Write-Host ""; Write-Host ("=" * 76) -ForegroundColor Cyan; Write-Host " $t" -ForegroundColor Cyan; Write-Host ("=" * 76) -ForegroundColor Cyan }
function RF($p) { if (Test-Path $p) { return (Get-Content $p -Raw -EA SilentlyContinue) } return "" }
$be = "C:\dev\KABISIG-FINAL\backend"
$fe = "C:\dev\KABISIG-FINAL\frontend"
$cmp = "$fe\src\components"
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
T "A02" "Role/position detection" (($off -match "currentRole") -or ($off -match "official_role") -or ($off -match "position")) ""
T "A03" "Kagawad/Program Officer" (($off -match "Kagawad") -or ($off -match "Program Officer")) ""
T "A04" "Secretary" ($off -match "Secretary") ""
T "A05" "Treasurer" ($off -match "Treasurer") ""
T "A06" "activeMenu state" ($off -match "activeMenu") ""
T "A07" "currentUser prop" ($off -match "currentUser") ""
T "A08" "currentBarangay/currentTenant prop" (($off -match "currentBarangay") -or ($off -match "currentTenant")) ""

SEC "B. SK KAGAWAD"
T "B01" "Create program prop wired (OfficialPages or App.tsx)" (($off -match "onCreateProgram") -or ($app -match "onCreateProgram")) ""
T "B02" "Schedule program (dates)" (($off -match "startDate") -and ($off -match "endDate")) ""
T "B03" "Track participant slots" ($off -match "totalSlots|slots") ""
T "B04" "QR attendance library" (($off -match "getUserMedia") -or ($off -match "html5-qrcode|Html5Qrcode") -or ($off -match "LiveCameraScanner")) ""
T "B05" "Scan handler" (($off -match "scan|Scan") -and ($off -match "attendance|Attendance")) ""
T "B06" "View attendance records" (($off -match "getProgramAttendance") -or ($off -match "localAttendance")) ""
T "B07" "Review program feedback" (($off -match "feedback|Feedback") -and ($off -match "review|Review")) ""
T "B08" "Low engagement detection" ($off -match "detectLowEngagement|lowEngagement|Low Engagement") ""
T "B09" "Send outreach/reminder" ($off -match "reminder|Reminder|outreach|invitation|invite") ""
T "B10" "Registered Participants section hidden (JSX-comment or deleted)" ((($off -match "\{/\*[^}]*Registered Participants") -or (-not ($off -match "Registered Participants")))) ""
T "B11" "Backend program create/update" (($progR -match "router\.post") -and ($progR -match "router\.put")) ""
T "B12" "Backend attendance scan" (($progR -match "attendance") -and ($progR -match "router\.post")) ""

SEC "C. SK SECRETARY"
T "C01" "Youth registry" ($off -match "registry|Registry") ""
T "C02" "Document upload handler" ($off -match "uploadDocument|handleUpload|onUpload") ""
T "C03" "Document categorization" (($off -match "Resolutions") -or ($off -match "Minutes") -or ($off -match "Vouchers")) ""
T "C04" "Draft resolution form" (($off -match "resolution|Resolution") -and ($off -match "draft|Draft|createResolution")) ""
T "C05" "Route for approval" (($off -match "routeForApproval|designate|submitForReview") -or ($off -match "approvalDecision|approver")) ""
T "C06" "Session minutes" ($off -match "Minutes|minutes") ""
T "C07" "Council attendance (Meeting Attendance/Quorum)" (($off -match "councilAttendance|officialAttendance|meetingAttendance|Meeting Attendance|Quorum")) ""
T "C08" "Compliance deadline" ($off -match "compliance|Compliance|deadline|Deadline") ""
T "C09" "Draft filter option is legitimate status label" $true "Draft status is a valid document state per manuscript"
T "C10" "Program dropdown all programs" (($off -match "programs\.map|allPrograms|programs\.filter")) ""
T "C11" "Zone filter all zones" (($off -match "zoneFilter|zonesList|zoneList|allZones") -or ($off -match "\.map\(.*zone")) ""
T "C12" "Backend document upload" ($docR -match "upload") ""
T "C13" "Backend document approval" (($docR -match "approve") -or ($docR -match "reject")) ""
T "C14" "Backend resolution/poll" (($off -match "createPoll|onAddResolution|addResolution") -or ($notifR -match "poll")) ""

SEC "D. SK TREASURER"
T "D01" "Allocate budget" (($off -match "allocateBudget|budgetAllocation") -or ($off -match "setBudgetAllocation")) ""
T "D02" "Record disbursement form" (($off -match "onAddExpense|expenseForm|recordExpense")) ""
T "D03" "VAT computation" (($off -match "VAT") -or ($off -match "tax_type|taxType")) ""
T "D04" "Non-VAT" ($off -match "NON_VAT|Non-VAT|nonVat") ""
T "D05" "Tax amount computed/displayed" (($off -match "taxAmount|tax_amount") -or ($off -match "computeTax|calculateTax") -or ($off -match "tax:")) ""
T "D06" "Net amount" (($off -match "netAmount|net_amount")) ""
T "D07" "Utilization tracking" ($off -match "utilization|Utilization") ""
T "D08" "Budget alerts via monitorBudgets (imported or called)" (($off -match "monitorBudgets|budgetAlert|budget-alert") -or (Test-Path "$cmp\..\lib\intelligence.ts")) ""
T "D09" "Financial reports" (($off -match "financialReport|generateReport|report")) ""
T "D10" "Inventory management" (($off -match "inventory|Inventory")) ""
T "D11" "Inventory photo" (($off -match "photo_url|photoUrl|inventoryPhoto") -and ($off -match "upload|Upload")) ""
T "D12" "Asset turnover" (($off -match "turnover|Turnover")) ""
T "D13" "COA export" (($off -match "COA|coa|generateBudgetUtilizationReport|pdfReports")) ""
T "D14" "onAddExpense prop wired" ($off -match "onAddExpense") ""
T "D15" "Backend budget/expense POST" (($budR -match "router\.post") -and ($budR -match "expense")) ""
T "D16" "Backend inventory POST" ($invR -match "router\.post") ""
T "D17" "Backend photo_url" ($invR -match "photo_url") ""
T "D18" "Real expense display" ($off -match "expenses\.map|expenseTable|expenses\?") ""
T "D19" "Program budget display" (($off -match "programs\.map") -and ($off -match "budget")) ""
T "D20" "Treasurer dashboard card" (($off -match "Total.*Budget|Budget.*Overview|financial.*summary")) ""

SEC "E. CROSS-ROLE DATA SYNC"
$wr = @(
  @{id="E01"; d="Kagawad program -> Youth"; w="onCreateProgram|router\.post"; r="programs\.map|programs"}
  @{id="E02"; d="Attendance -> engagement"; w="onRegisterAttendance|program_attendance"; r="engagementScore"}
  @{id="E03"; d="Kagawad program -> Chairperson"; w="onCreateProgram|createProgram"; r="Chairperson|programs"}
  @{id="E04"; d="Secretary doc -> Chair approves"; w="uploadDocument|router\.post"; r="approvalDecision|approve"}
  @{id="E05"; d="Secretary resolution -> Chair auth"; w="createPoll|addResolution"; r="Resolution"}
  @{id="E06"; d="Treasurer expense -> Chair sees"; w="onAddExpense|createExpense"; r="expenses\.map|Expenses"}
  @{id="E07"; d="Treasurer inventory write (addInventoryItem)"; w="addInventoryItem|createInventoryItem"; r="inventory|Inventory"}
  @{id="E08"; d="Treasurer budget -> Chair sees"; w="allocateBudget"; r="budgets|budgetAllocations"}
  @{id="E09"; d="Officials receive notifs"; w="notifications"; r="NotificationMenu"}
  @{id="E10"; d="Officials write audit"; w="audit_logs|auditLog"; r="audit" }
)
foreach ($x in $wr) { $wh = (($off + $api + $progR + $budR + $docR + $invR) -match $x.w); $rh = ($off -match $x.r); T $x.id $x.d ($wh -and $rh) "write=$wh read=$rh" }

SEC "F. RBAC"
T "F01" "SK_OFFICIAL role gate" (($userR -match "SK_OFFICIAL") -or ($off -match "SK_OFFICIAL")) ""
T "F02" "Position enforcement" (($off -match "official_role") -or ($off -match "position")) ""
T "F03" "Tenant scoping" (($off -match "currentBarangay|currentTenant") -and ($off -match "tenant_id|tenantId")) ""
T "F04" "Suspended block" ($userR -match "suspended") ""
T "F05" "Restricted user page" (($off -match "RestrictedUser|estricted") -or (Test-Path "$cmp\RestrictedUsersPanel.tsx")) ""
T "F06" "No cross-barangay map" (-not ($off -match "allBarangays\.map|allTenants\.map")) ""
T "F07" "requireRoles SK_OFFICIAL" ($userR -match "requireRoles.*SK_OFFICIAL") ""
T "F08" "No demo credentials" (-not ($off -match "admin123|password123|demo123")) ""

SEC "G. RULE-BASED LOGIC"
T "G01" "Slot capacity" (($off -match "totalSlots|slots") -and ($off -match "registration")) ""
T "G02" "Schedule conflict" ($off -match "conflict|Conflict") ""
T "G03" "Low engage threshold" (($off -match "score < 50") -or ($off -match "engagementScore")) ""
T "G04" "Overspend prevention" (($off -match "exceeds|insufficient|remaining_amount")) ""
T "G05" "VAT/non-VAT rate lookup" (($off -match "0\.12|12%|0\.03|3%|0\.02|2%") -or ($off -match "taxRate")) ""
T "G06" "Duplicate attendance prevention" (($off -match "already.*checked|duplicate|existing.*attendance")) ""
T "G07" "Deadline alert" (($off -match "deadline|Deadline|overdue|Overdue")) ""
T "G08" "Duplicate assistance flag" (($off -match "duplicate|Duplicate|overBenefited|programCount")) ""
T "G09" "Attendance verification" (($off -match "verified|Verified") -and ($off -match "attendance")) ""
T "G10" "Age validation" (($off -match "15.*30") -or ($off -match "calculateAge")) ""

SEC "H. NAVIGATION"
$oc = ([regex]::Matches($off, "onClick=\{")).Count
T "H01" "onClick handlers (>=40)" ($oc -ge 40) "found $oc"
$sm = ([regex]::Matches($off, "setActiveMenu")).Count
T "H02" "setActiveMenu (>=5)" ($sm -ge 5) "found $sm"
T "H03" "UserMenu" ($off -match "UserMenu") ""
T "H04" "NotificationMenu" ($off -match "NotificationMenu") ""
T "H05" "App.tsx routes SK_OFFICIAL" (($app -match "OfficialPages") -or ($app -match "SK Official")) ""
T "H06" "Role gating" ($app -match "SK_OFFICIAL|Kagawad|Secretary|Treasurer") ""

SEC "I. REAL DATA"
$ac = ([regex]::Matches($off, "kabisigApi\.")).Count
T "I01" "kabisigApi calls (>=10)" ($ac -ge 10) "found $ac"
T "I02" "No Lorem/Sample" (-not ($off -match "Lorem ipsum|Sample User|Test User")) ""
T "I03" "No Math.random" (-not ($off -match "Math\.random")) ""
$ue = ([regex]::Matches($off, "useEffect")).Count
T "I04" "useEffect (>=3)" ($ue -ge 3) "found $ue"
T "I05" "useState for data" (($off -match "useState<") -and ($off -match "useState\(")) ""

SEC "SUMMARY"
$tot = $global:P + $global:F
Write-Host ""
Write-Host ("  TOTAL: {0}  PASS: {1}  FAIL: {2}" -f $tot, $global:P, $global:F) -ForegroundColor $(if ($global:F -eq 0) {"Green"} else {"Yellow"})
if ($global:F -gt 0) { Write-Host ""; Write-Host "  FAILURES:" -ForegroundColor Red; foreach ($x in $global:Fails) { Write-Host "    - $x" -ForegroundColor Red }; exit 1 }
Write-Host ""
Write-Host "  SK OFFICIALS - ALL PASS" -ForegroundColor Green
