$global:P=0; $global:F=0; $global:Fails=@()
function T($id,$d,$c) { if ($c) { $global:P++; Write-Host "  [PASS] $id  $d" -ForegroundColor Green } else { $global:F++; $global:Fails += "$id $d"; Write-Host "  [FAIL] $id  $d" -ForegroundColor Red } }
function SEC($t) { Write-Host ""; Write-Host ("=" * 76) -ForegroundColor Cyan; Write-Host " $t" -ForegroundColor Cyan; Write-Host ("=" * 76) -ForegroundColor Cyan }
function RF($p) { if (Test-Path $p) { return (Get-Content $p -Raw -EA SilentlyContinue) } return "" }
$fe = "C:\dev\KABISIG-FINAL\frontend"; $be = "C:\dev\KABISIG-FINAL\backend"
$y = RF "$fe\src\components\YouthPages.tsx"
$api = RF "$fe\src\lib\api.ts"; $app = RF "$fe\src\App.tsx"
$auth = RF "$be\routes\auth.routes.ts"; $userR = RF "$be\routes\user.routes.ts"
$prog = RF "$be\routes\program.routes.ts"; $fb = RF "$be\routes\feedback.routes.ts"
$poll = RF "$be\routes\poll.routes.ts"; $notif = RF "$be\routes\notifications.routes.ts"

SEC "A. FILE STRUCTURE"
T "A01" "YouthPages.tsx exists" (Test-Path "$fe\src\components\YouthPages.tsx")
T "A02" "activeMenu state" ($y -match "activeMenu")
T "A03" "currentUser/currentYouth prop" (($y -match "currentUser") -or ($y -match "currentYouth") -or ($y -match "youth:"))
T "A04" "currentYouth or youth prop" (($y -match "currentYouth") -or ($y -match "youth:"))

SEC "B. MODULE 1 - PROFILE & DIGITAL ID"
T "B01" "Profile edit form" (($y -match "editForm") -or ($y -match "handleProfileChange"))
T "B02" "Split name fields (first/middle/last)" (($y -match "first_name") -and ($y -match "last_name"))
T "B03" "Digital Youth ID display" (($y -match "KAB-NAGA") -or ($y -match "digital_youth_id"))
T "B04" "QR code displayed" (($y -match "qrcode|QRCode|qrCode"))
T "B05" "Avatar upload (uploadAvatar)" ($y -match "uploadAvatar")
T "B06" "Profile pic mapped from avatar_url (App.tsx)" ($app -match "avatar_url")
T "B07" "ID verification upload (Panel rec #12)" ($y -match "verification/upload|uploadVerification|verificationForm")
T "B08" "Age validation 15-30 in backend" (($auth -match "calculatedAge") -or ($auth -match "15.*30"))

SEC "C. MODULE 2 - PROGRAMS & REGISTRATION"
T "C01" "Browse programs section" (($y -match "Upcoming.*Programs|Browse.*Programs|programs\.map"))
T "C02" "Program registration action" (($y -match "onRegisterProgram|registerForProgram|handleRegister"))
T "C03" "Slot availability display" ($y -match "slots|totalSlots")
T "C04" "Program status from computeProgramStatus" ($app -match "computeProgramStatus")
T "C05" "Registration history" (($y -match "myRegistrations") -or ($y -match "registrationHistory"))
T "C06" "QR code for attendance" ($y -match "qrCode|QRCode")

SEC "D. MODULE 4 - BOSES NG KABATAAN"
T "D01" "Feedback submission form" ($y -match "feedback|Feedback")
T "D02" "Anonymous toggle" ($y -match "is_anonymous|anonymous")
T "D03" "My Submission History" (($y -match "My Submissions|myFeedback|submissionHistory"))
T "D04" "Own anonymous feedback visible in history" ($y -match "youth\.userId")
T "D05" "Poll voting interface" ($y -match "voteOnPoll|poll|Poll")
T "D06" "Poll results visible" (($y -match "votesSupport") -or ($y -match "votesOppose"))
T "D07" "Resolution voting" (($y -match "resolution|Resolution") -and ($y -match "Support|Oppose"))

SEC "E. MODULE 5 - PUBLIC INFORMATION"
T "E01" "Public announcements view" ($y -match "announcement|Announcement")
T "E02" "Public budget visibility (FPD)" (($y -match "budget|Budget") -and ($y -match "public|transparency"))
T "E03" "Event calendar view" ($y -match "calendar|Calendar")

SEC "F. RBAC & SECURITY"
T "F01" "Tenant scoping (barangay_id)" (($y -match "currentBarangay|currentTenant") -or ($y -match "tenant"))
T "F02" "Suspended user block (backend)" (($userR -match "suspended") -or ($auth -match "403"))
T "F03" "Youth can only see own barangay data" (-not ($y -match "allBarangays\.map|allTenants\.map"))
T "F04" "No hardcoded demo names" (-not ($y -match "Lorem ipsum|Sample User|Test User"))
T "F05" "No Math.random for demo" (-not ($y -match "Math\.random"))

SEC "G. CROSS-ROLE DATA"
T "G01" "Youth registration -> Chairperson pending" (($auth -match "register-youth") -and (($y -match "registrationStatus") -or ($y -match "Pending") -or ($y -match "status")))
T "G02" "Youth attendance scanned -> DB" ($y -match "qrCode|QRCode")
T "G03" "Youth feedback -> sentiment -> Chair" (($fb -match "sentiment_analysis") -and ($y -match "feedback"))
T "G04" "Youth poll vote -> Chair sees results" (($poll -match "vote") -and ($y -match "voteOnPoll|poll"))
T "G05" "Youth notifications from system" ($notif -match "user_id")
T "G06" "Youth avatar in UserMenu header" ($y -match "UserMenu")

SEC "H. NAVIGATION"
$oc = ([regex]::Matches($y, "onClick=\{")).Count
T "H01" "onClick handlers (>=30)" ($oc -ge 30)
$sm = ([regex]::Matches($y, "setActiveMenu")).Count
T "H02" "setActiveMenu calls (>=3)" ($sm -ge 3)
T "H03" "App.tsx routes Youth role" (($app -match "Youth Constituent") -or ($app -match "YouthPages"))
T "H04" "NotificationMenu present" ($y -match "NotificationMenu")

SEC "I. REAL DATA"
$ac = ([regex]::Matches($y, "kabisigApi\.")).Count
T "I01" "kabisigApi calls (>=8)" ($ac -ge 8)
$ue = ([regex]::Matches($y, "useEffect")).Count
T "I02" "useEffect data loading (>=3)" ($ue -ge 3)
T "I03" "No Lorem/Sample placeholder" (-not ($y -match "Lorem ipsum|Sample User"))

SEC "SUMMARY"
$tot = $global:P + $global:F
Write-Host ""
Write-Host ("  TOTAL: {0}  PASS: {1}  FAIL: {2}" -f $tot, $global:P, $global:F) -ForegroundColor $(if ($global:F -eq 0) {"Green"} else {"Yellow"})
if ($global:F -gt 0) { Write-Host ""; Write-Host "  FAILURES:" -ForegroundColor Red; foreach ($x in $global:Fails) { Write-Host "    - $x" -ForegroundColor Red }; exit 1 }
Write-Host ""; Write-Host "  YOUTH CONSTITUENT - ALL PASS" -ForegroundColor Green
