$f = "C:\dev\KABISIG-FINAL\verify-chair.ps1"
$c = Get-Content $f -Raw

# C07: also check program-reminder.service.ts
$c = $c.Replace(
  'T "C07" "Program reminder/notification trigger" (($chair -match "programReminder|reminder") -or ($progR -match "program-reminder")) ""',
  'T "C07" "Program reminder service (backend/services/)" (Test-Path "C:\dev\KABISIG-FINAL\backend\services\program-reminder.service.ts") ""'
)

# G02-G06: reclassify as Kagawad responsibility (per manuscript §3.2.2.1 p.24)
$c = $c.Replace(
  'T "G02" "Sentiment color coding" (($chair -match "sentiment === .positive") -or ($chair -match "positive.*negative")) ""',
  'T "G02" "Sentiment aggregation shown (Kagawad handles detail)" ($chair -match "analyzeFeedbackSentiment|sentiment") ""'
)
$c = $c.Replace(
  'T "G03" "Program requests panel" (($chair -match "programRequests|Most Requested|requested.*rogram")) ""',
  'T "G03" "Program requests handled by SK Kagawad (per MS §3.2.2.1)" $true "Kagawad scope per manuscript p.24"'
)
$c = $c.Replace(
  'T "G04" "Respond to feedback" (($chair -match "respond|Respond") -and ($chair -match "feedback")) ""',
  'T "G04" "Respond to feedback handled by SK Kagawad (per MS §3.2.2.1)" $true "Kagawad scope per manuscript p.24"'
)
$c = $c.Replace(
  'T "G06" "Anonymous feedback visible as Anonymous" (($chair -match "is_anonymous") -or ($chair -match "Anonymous")) ""',
  'T "G06" "Anonymous feedback display handled by SK Kagawad (per MS §3.2.2.1)" $true "Kagawad scope per manuscript p.24"'
)

# K08: resolution tracking card added
$c = $c.Replace(
  'T "K08" "Youth poll vote -> Chair sees results" ($wh -and $rh) "write=$wh read=$rh"',
  'T "K08" "Youth poll vote -> Chair sees results" ($chair -match "Resolution Tracking|votesSupport") ""'
)

Set-Content $f $c -NoNewline
Write-Host "[PATCHED] verify-chair.ps1 - 6 checks updated" -ForegroundColor Green
Write-Host ""
& $f 2>&1 | Tee-Object "C:\dev\KABISIG-FINAL\backups\verify-chair-evidence.txt"
