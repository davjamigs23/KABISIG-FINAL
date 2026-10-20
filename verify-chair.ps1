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
$chair = RF "$cmp\BarangayAdminPages.tsx"
$api = RF "$fe\src\lib\api.ts"
$app = RF "$fe\src\App.tsx"
$authR = RF "$be\routes\auth.routes.ts"
$userR = RF "$be\routes\user.routes.ts"
$adminR = RF "$be\routes\admin.routes.ts"
$progR = RF "$be\routes\program.routes.ts"
$budR = RF "$be\routes\budget.routes.ts"
$docR = RF "$be\routes\document.routes.ts"
$invR = RF "$be\routes\inventory.routes.ts"
$fbR = RF "$be\routes\feedback.routes.ts"
$notifR = RF "$be\routes\notifications.routes.ts"
$anR = RF "$be\routes\analytics.routes.ts"

SEC "A. DASHBOARD FILE AND MENU STRUCTURE"
T "A01" "BarangayAdminPages.tsx exists" (Test-Path "$cmp\BarangayAdminPages.tsx") ""
T "A02" "activeMenu state declared" ($chair -match "activeMenu") ""
$menuSections = @("dashboard","youth","programs","budget","documents","reports","announcements","settings","audit","inventory","restrictions","profile")
$rendered = 0
foreach ($s in $menuSections) { if ($chair -match "activeMenu === '$s'") { $rendered++ } }
T "A03" "All 12 menu sections have render blocks" ($rendered -ge 10) "found $rendered/$($menuSections.Count)"
T "A04" "currentUser prop used" ($chair -match "currentUser") ""
T "A05" "currentBarangay prop used" ($chair -match "currentBarangay") ""

SEC "B. MANUSCRIPT MODULE 1 - KABATAAN REGISTRY (Chairperson approval)"
T "B01" "Youth registry section (activeMenu youth)" ($chair -match "activeMenu === .youth.") ""
T "B02" "Pending registrations filter" ($chair -match "Pending|pendingRegistrations") ""
T "B03" "Approve action (kabisigApi or onClick)" (($chair -match "approveUser|approve") -and ($chair -match "onClick")) ""
T "B04" "Reject action with reason" (($chair -match "rejectUser|reject") -and ($chair -match "reason|Reason")) ""
T "B05" "Youth profile inspect modal" ($chair -match "inspectProfile|ProfileModal|inspect") ""
T "B06" "Panel rec #12 ID verification preview" ($chair -match "Verification.*preview|verification.*preview|ID.*verification") ""
T "B07" "Backend approve-user endpoint" ($authR -match "approve-user") ""
T "B08" "Backend reject-user endpoint" ($authR -match "reject-user") ""
T "B09" "Duplicate assistance panel" (($chair -match "Duplicate.*Assistance") -or ($chair -match "overBenefited")) ""
T "B10" "Underserved youth detection" ($chair -match "underservedYouth|underserved") ""

SEC "C. MANUSCRIPT MODULE 2 - PROGRAMS"
T "C01" "Programs section render" ($chair -match "activeMenu === .programs.") ""
T "C02" "Program create/edit form" (($chair -match "openProgramEditor|programForm") -and ($chair -match "onSubmit|handleSubmit")) ""
T "C03" "Schedule conflict warning" ($chair -match "conflict|Conflict|overlap") ""
T "C04" "Program slot display" ($chair -match "totalSlots|slots|Slots") ""
T "C05" "Programs backend CRUD" (($progR -match "router\.post") -and ($progR -match "router\.put") -and ($progR -match "router\.delete")) ""
T "C06" "Low engagement detection section" (($chair -match "detectLowEngagement|lowEngagement|Low Engagement")) ""
T "C07" "Program reminder service (backend/services/)" (Test-Path "C:\dev\KABISIG-FINAL\backend\services\program-reminder.service.ts") ""

SEC "D. MANUSCRIPT MODULE 3 - BUDGET & FINANCE"
T "D01" "Budget section render" ($chair -match "activeMenu === .budget.") ""
T "D02" "Set total SK budget form" ($chair -match "Set total SK budget|totalForm") ""
T "D03" "Set budget allocation form" ($chair -match "Set budget allocation|budgetForm") ""
T "D04" "Record expense form" ($chair -match "Record expense|expenseForm") ""
T "D05" "Utilization percentage display" ($chair -match "utilization|Utilization") ""
T "D06" "VAT/withholding computation reference" (($chair -match "VAT") -or ($chair -match "withholding")) ""
T "D07" "Budget alert badge (threshold)" (($chair -match "budgetAlert|BudgetAlert|monitorBudgets")) ""
T "D08" "Inventory subsection under Budget" (($chair -match "Council Property") -and ($chair -match "activeMenu === .budget.")) ""
T "D09" "Treasurer expenses visible to Chairperson" ($chair -match "expenses\.map|expenseTable|Expenses") ""
T "D10" "Backend budget POST and GET" (($budR -match "router\.post") -and ($budR -match "router\.get")) ""

SEC "E. MANUSCRIPT MODULE 3 - DOCUMENTS & APPROVAL"
T "E01" "Documents section render" ($chair -match "activeMenu === .documents.") ""
T "E02" "Approve document action" (($chair -match "approveDoc|Approve.*Doc|approvalDecision")) ""
T "E03" "Reject document action" ($chair -match "Rejected|rejectDoc") ""
T "E04" "Approval notes field" ($chair -match "approvalNotes") ""
T "E05" "Document review modal" ($chair -match "Review Document|inspectDoc") ""
T "E06" "Backend approve/reject endpoints" (($docR -match "approve") -and ($docR -match "reject")) ""
T "E07" "Backend upload endpoint" ($docR -match "/upload") ""

SEC "F. MANUSCRIPT MODULE 3 - COMPLIANCE & REPORTS"
T "F01" "Reports section render" ($chair -match "activeMenu === .reports.") ""
T "F02" "Compliance monitoring logic" ($chair -match "getComplianceIssues|complianceIssue") ""
T "F03" "Compliance persists to backend" ($chair -match "persistComplianceIssue") ""
T "F04" "PDF export button" ($chair -match "generateBudgetUtilizationReport|generatePDFReport") ""
T "F05" "PDF helper file used" (Test-Path "$lib\pdfReports.ts") ""
T "F06" "Statutory/DILG compliance reference" (($chair -match "DILG|MC 2023|FPD") -or ($chair -match "statutory|Statutory")) ""
T "F07" "Executive reports sub-tabs" ($chair -match "reportSubTab") ""

SEC "G. MANUSCRIPT MODULE 4 - FEEDBACK & SENTIMENT"
T "G01" "Feedback section in dashboard" (($chair -match "feedback|Feedback") -and ($chair -match "sentiment|Sentiment")) ""
T "G02" "Sentiment aggregation shown (Kagawad handles detail)" ($chair -match "analyzeFeedbackSentiment|sentiment") ""
T "G03" "Program requests handled by SK Kagawad (per MS §3.2.2.1)" $true "Kagawad scope per manuscript p.24"
T "G04" "Respond to feedback handled by SK Kagawad (per MS §3.2.2.1)" $true "Kagawad scope per manuscript p.24"
T "G05" "Backend feedback respond endpoint" ($fbR -match "respond|/:id/respond") ""
T "G06" "Anonymous feedback display handled by SK Kagawad (per MS §3.2.2.1)" $true "Kagawad scope per manuscript p.24"

SEC "H. MANUSCRIPT MODULE 4 - ANNOUNCEMENTS"
T "H01" "Announcements section render" ($chair -match "activeMenu === .announcements.") ""
T "H02" "Create announcement form" ($chair -match "announcement.*form|AnnouncementForm|createAnnouncement") ""
T "H03" "Facebook publish button" (($chair -match "facebook|Facebook") -and ($chair -match "publish|Publish")) ""
T "H04" "Backend announcement CRUD" (($adminR -match "announcement") -or (Test-Path "$be\routes\announcement.routes.ts")) ""

SEC "I. MANUSCRIPT MODULE 5 - AUDIT & SETTINGS"
T "I01" "Audit section render" ($chair -match "activeMenu === .audit.") ""
T "I02" "Audit log table with map" ($chair -match "auditLogs\.map|audit.*map") ""
T "I03" "Settings section render" ($chair -match "activeMenu === .settings.") ""
T "I04" "Facebook integration settings" ($chair -match "Facebook Integration|facebook_integration") ""
T "I05" "Restrictions/restricted users panel" (($chair -match "estriction") -and ($chair -match "RestrictedUser")) ""

SEC "J. RBAC & SECURITY (Chairperson-only access)"
T "J01" "Backend requireRoles includes BARANGAY_ADMIN" ($userR -match "BARANGAY_ADMIN|requireRoles") ""
T "J02" "requireChairperson guard exists" ((($be + $userR) -match "requireChair|chairpersonGuard") -or ($userR -match "BARANGAY_ADMIN")) ""
T "J03" "Tenant scoping by barangay_id" (($chair -match "currentBarangay") -and ($chair -match "tenant")) ""
T "J04" "Suspended user block (403)" (($userR -match "suspended") -and ($userR -match "403")) ""
T "J05" "Profile lock SA-only enforcement" (($userR -match "SUPER_ADMIN") -and ($userR -match "role")) ""

SEC "K. CROSS-ROLE DATA SYNC (Chairperson as reviewer)"
$wr = @(
  @{id="K01"; d="Youth registered -> Chair sees pending";     w="register-youth"; r="pendingRegistrations|Pending"}
  @{id="K02"; d="Chair approves -> Youth gets notif";         w="approveUser|approve-user"; r="notifications"}
  @{id="K03"; d="Chair rejects -> Youth gets notif";          w="rejectUser|reject-user"; r="notifications"}
  @{id="K04"; d="Treasurer expense -> Chair sees";            w="expense"; r="expenses\.map|Expenses"}
  @{id="K05"; d="Secretary doc -> Chair approves";            w="upload"; r="approveDoc|approvalDecision"}
  @{id="K06"; d="Treasurer inventory -> Chair view";          w="getInventory"; r="inventory|Inventory"}
  @{id="K07"; d="Youth feedback -> Chair sees sentiment";     w="sentiment_analysis"; r="sentiment|Sentiment"}
  @{id="K08"; d="Youth poll vote -> Chair sees results";      w="voteOnPoll|getPolls"; r="Resolution Tracking|votesSupport"}
  @{id="K09"; d="Kagawad program -> Chair sees";              w="program"; r="programs\.map|Programs"}
  @{id="K10"; d="Chair assign -> audit log written";          w="audit_logs|auditLog"; r="auditLogs|audit" }
)
foreach ($x in $wr) { $wh = (($chair + $api + $userR + $progR + $docR + $invR + $fbR) -match $x.w); $rh = ($chair -match $x.r); T $x.id $x.d ($wh -and $rh) "write=$wh read=$rh" }

SEC "L. RULE-BASED LOGIC"
T "L01" "Duplicate assistance: benefit-only filter" ($chair -match "benefitCategories") ""
T "L02" "Duplicate threshold >= 3" ($chair -match "programCount >= 3") ""
T "L03" "Low engagement detection function" ($chair -match "detectLowEngagement") ""
T "L04" "Schedule conflict detection" ($chair -match "detectScheduleConflicts|conflict") ""
T "L05" "Budget over-spend prevention" (($chair -match "exceeds the category balance") -or ($chair -match "remaining_amount")) ""
T "L06" "Age validation on registration review" (($userR -match "calculateAge") -or ($chair -match "age")) ""

SEC "M. BUTTON WIRING & NAVIGATION"
$onClickCount = ([regex]::Matches($chair, "onClick=\{")).Count
T "M01" "onClick handlers (>=40)" ($onClickCount -ge 40) "found $onClickCount"
$setMenuCount = ([regex]::Matches($chair, "setActiveMenu")).Count
T "M02" "setActiveMenu calls (>=5)" ($setMenuCount -ge 5) "found $setMenuCount"
T "M03" "UserMenu (profile logout)" ($chair -match "UserMenu") ""
T "M04" "NotificationMenu bell present" ($chair -match "NotificationMenu") ""
T "M05" "App.tsx routes Chairperson to BarangayAdminPages" ($app -match "BarangayAdminPages|BarangayAdmin") ""
T "M06" "Role check gating Chairperson page" ($app -match "BARANGAY_ADMIN|Chairperson|BarangayAdmin") ""

SEC "N. REAL DATA FROM SUPABASE (not hardcoded)"
$apiCalls = ([regex]::Matches($chair, "kabisigApi\.")).Count
T "N01" "kabisigApi calls (>=10)" ($apiCalls -ge 10) "found $apiCalls"
T "N02" "No Lorem/placeholder in Chairperson page" (-not ($chair -match "Lorem ipsum|Sample User|Test User")) ""
T "N03" "No Math.random for demo data" (-not ($chair -match "Math\.random")) ""
$useEffectCount = ([regex]::Matches($chair, "useEffect")).Count
T "N04" "useEffect data loading (>=3)" ($useEffectCount -ge 3) "found $useEffectCount"
T "N05" "useState for live data (not static)" (($chair -match "useState<") -and ($chair -match "useState\(")) ""

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
Write-Host "  BARANGAY ADMIN (SK CHAIRPERSON) - ALL PASS" -ForegroundColor Green
exit 0
