Write-Host "=== Where is toResolutionRecord called? ===" -ForegroundColor Cyan
$fe = "C:\dev\KABISIG-FINAL\frontend"
Get-ChildItem $fe -Recurse -Include "*.tsx","*.ts" -EA SilentlyContinue | Where-Object { $_.FullName -notmatch "node_modules" } |
  Select-String -Pattern "toResolutionRecord|ResolutionRecord|votesSupport|votesOppose" |
  ForEach-Object { Write-Host ("{0}:{1}  {2}" -f $_.Filename, $_.LineNumber, $_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length))) -ForegroundColor DarkGray }

Write-Host "`n=== Does Chairperson page call getPolls or resolutions API? ===" -ForegroundColor Cyan
Select-String -Path "$fe\src\components\BarangayAdminPages.tsx" -Pattern "getPolls|getResolutions|resolutions|Resolutions" |
  ForEach-Object { Write-Host ("L{0}: {1}" -f $_.LineNumber, $_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length))) -ForegroundColor Yellow }

Write-Host "`n=== Does Chairperson page call any poll-related API? ===" -ForegroundColor Cyan
Select-String -Path "$fe\src\lib\api.ts" -Pattern "getPolls|getResolutions|poll" -Context 0,2 |
  Select-Object -First 5 |
  ForEach-Object { Write-Host ("L{0}: {1}" -f $_.LineNumber, $_.Line.Trim()) }
