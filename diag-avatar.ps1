$fe = "C:\dev\KABISIG-FINAL\frontend"
$be = "C:\dev\KABISIG-FINAL\backend"

Write-Host "=== 1. Backend avatar write (user.routes.ts around line 1025) ===" -ForegroundColor Cyan
$userR = "C:\dev\KABISIG-FINAL\backend\routes\user.routes.ts"
$lines = [System.IO.File]::ReadAllLines($userR)
for ($i = 1000; $i -lt [Math]::Min(1050, $lines.Count); $i++) {
    $color = 'DarkGray'
    if ($lines[$i] -match "avatar|storage|upload") { $color = 'Yellow' }
    Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i]) -ForegroundColor $color
}

Write-Host "`n=== 2. Frontend reads of avatar_url ===" -ForegroundColor Cyan
Get-ChildItem $fe -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch 'node_modules|\.d\.ts$' } |
    Select-String -Pattern "avatar_url|avatarUrl" |
    Select-Object -First 25 |
    ForEach-Object { Write-Host ("{0}:{1}  {2}" -f $_.Filename, $_.LineNumber, $_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length))) -ForegroundColor Green }

Write-Host "`n=== 3. Header / UserIcon component (where avatar renders) ===" -ForegroundColor Cyan
Get-ChildItem $fe -Recurse -Include "*.tsx" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch 'node_modules' } |
    Select-String -Pattern "UserIcon|UserCircle|<img.*avatar|profile_pic|profilePic" |
    Select-Object -First 20 |
    ForEach-Object { Write-Host ("{0}:{1}  {2}" -f $_.Filename, $_.LineNumber, $_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length))) -ForegroundColor Yellow }

Write-Host "`n=== 4. How auth context stores the user ===" -ForegroundColor Cyan
Get-ChildItem $fe -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch 'node_modules' } |
    Select-String -Pattern "getMe|getProfile|setUser|currentUser" |
    Select-Object -First 20 |
    ForEach-Object { Write-Host ("{0}:{1}  {2}" -f $_.Filename, $_.LineNumber, $_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length))) -ForegroundColor DarkCyan }
