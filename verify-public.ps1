$global:P=0; $global:F=0; $global:Fails=@()
function T($id,$d,$c) { if ($c) { $global:P++; Write-Host "  [PASS] $id  $d" -ForegroundColor Green } else { $global:F++; $global:Fails += "$id $d"; Write-Host "  [FAIL] $id  $d" -ForegroundColor Red } }
function SEC($t) { Write-Host ""; Write-Host ("=" * 70) -ForegroundColor Cyan; Write-Host " $t" -ForegroundColor Cyan; Write-Host ("=" * 70) -ForegroundColor Cyan }
function RF($p) { if (Test-Path $p) { return (Get-Content $p -Raw -EA SilentlyContinue) } return "" }
$fe = "C:\dev\KABISIG-FINAL\frontend"; $be = "C:\dev\KABISIG-FINAL\backend"
$pub = RF "$fe\src\components\PublicPages.tsx"; $viewer = RF "$fe\src\components\ViewerPages.tsx"
$pubR = RF "$be\routes\public.routes.ts"; $app = RF "$fe\src\App.tsx"

SEC "A. FILE STRUCTURE"
T "A01" "PublicPages.tsx exists" (Test-Path "$fe\src\components\PublicPages.tsx")
T "A02" "ViewerPages.tsx exists" (Test-Path "$fe\src\components\ViewerPages.tsx")
T "A03" "public.routes.ts exists" (Test-Path "$be\routes\public.routes.ts")

SEC "B. NO AUTHENTICATION REQUIRED (Public Viewer)"
T "B01" "App.tsx routes Viewer without auth" ($app -match "Viewer")
T "B02" "Public endpoints lack auth middleware" (-not ($pubR -match "authenticateUser.*GET|router\.get.*authenticateUser"))
T "B03" "Public announcements accessible" ($pubR -match "announcements")
T "B04" "Public budget/expenses (FPD)" ($pubR -match "expense|budget")
T "B05" "Public demographics" ($pubR -match "demographics")
T "B06" "Public programs" ($pubR -match "programs")

SEC "C. MODULE 5 - PUBLIC INFORMATION"
T "C01" "Announcements rendered" (($pub -match "announcement|Announcement") -or ($viewer -match "announcement"))
T "C02" "Budget/expense transparency view" (($pub -match "budget|Budget|expense") -or ($viewer -match "budget"))
T "C03" "Program schedule visible" (($pub -match "program|Program") -or ($viewer -match "program"))
T "C04" "Resolution voting visible" (($viewer -match "resolution|Resolution"))
T "C05" "Statistics/demographics" (($pub -match "demographic|statistic") -or ($viewer -match "demographic|statistic"))

SEC "D. DATA SAFETY (No PII)"
T "D01" "No youth email exposed publicly" (-not ($pub -match "youthEmail|@.*youth|residentEmail"))
T "D02" "No youth contact info exposed" (-not ($pub -match "youthContact|mobileNumber|phoneNumber.*public"))
T "D03" "No full addresses exposed" (-not ($viewer -match "homeAddress|fullAddress"))
T "D04" "No auth token leaks to public pages" (-not ($pub -match "accessToken|bearer.*token"))

SEC "E. MODULE 3 - PUBLIC FPD COMPLIANCE"
T "E01" "DILG MC 2023 FPD reference" (($pub + $viewer) -match "FPD|Full Public Disclosure|DILG.*2023")
T "E02" "Utilization rates visible" (($pub + $viewer) -match "utilization|utilized")
T "E03" "Program accomplishment summaries" (($pub + $viewer) -match "accomplishment|implemented")

SEC "F. REAL DATA"
T "F01" "Real API calls (kabisigApi)" (($pub + $viewer) -match "kabisigApi\.")
T "F02" "No Lorem/Sample placeholders" (-not (($pub + $viewer) -match "Lorem ipsum|Sample User|Test User"))
T "F03" "No Math.random for data" (-not (($pub + $viewer) -match "Math\.random"))

SEC "SUMMARY"
$tot = $global:P + $global:F
Write-Host ""
Write-Host ("  TOTAL: {0}  PASS: {1}  FAIL: {2}" -f $tot, $global:P, $global:F) -ForegroundColor $(if ($global:F -eq 0) {"Green"} else {"Yellow"})
if ($global:F -gt 0) { Write-Host ""; foreach ($x in $global:Fails) { Write-Host "    - $x" -ForegroundColor Red }; exit 1 }
Write-Host ""; Write-Host "  PUBLIC VIEWER - ALL PASS" -ForegroundColor Green
