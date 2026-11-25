$ErrorActionPreference = 'Continue'
$backend  = 'C:\dev\KABISIG-FINAL\backend'
$report   = [System.Collections.ArrayList]::new()
function Add-Line { param($s, $c='Gray') Write-Host $s -ForegroundColor $c; [void]$report.Add($s) }

Add-Line "KABISIG diagnostic — $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" Cyan
Add-Line ''

Add-Line '[1] PORTS' Cyan
foreach ($port in 3000, 5000) {
    $ls = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if (-not $ls) { Add-Line ("  Port {0}: NOT LISTENING" -f $port) Red; continue }
    foreach ($l in $ls) {
        $p = Get-CimInstance Win32_Process -Filter "ProcessId=$($l.OwningProcess)" -ErrorAction SilentlyContinue
        $proc = Get-Process -Id $l.OwningProcess -ErrorAction SilentlyContinue
        $cmd = if ($p.CommandLine) { $p.CommandLine -replace '\s+',' ' } else { '(no cmdline)' }
        $short = if ($cmd.Length -gt 100) { $cmd.Substring(0,97) + '...' } else { $cmd }
        $tag = if ($cmd -match 'OneDrive') { 'ONE DRIVE — KILL' } elseif ($cmd -match 'tsx watch|nodemon') { 'WATCHER' } else { 'ok' }
        $color = if ($tag -eq 'ok') { 'Green' } else { 'Red' }
        Add-Line ("  Port {0}: PID {1,-6} started {2:HH:mm:ss} [{3}] {4}" -f $port, $l.OwningProcess, $proc.StartTime, $tag, $short) $color
    }
}

$strays = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -match 'OneDrive\\Documents\\GitHub\\KABISIG-FINAL' }
if ($strays) {
    Add-Line "`n  WARNING: OneDrive node processes running:" Red
    $strays | ForEach-Object { Add-Line ("    PID {0}: {1}" -f $_.ProcessId, $_.CommandLine) Red }
} else {
    Add-Line "  No OneDrive node processes — good." Green
}

Add-Line "`n[2] DIST FRESHNESS" Cyan
$f = "$backend\dist\routes\user.routes.js"
if (Test-Path $f) {
    $distTime = (Get-Item $f).LastWriteTime
    $hasRoute = (Get-Content $f -Raw) -match 'upload-avatar'
    Add-Line ("  dist\routes\user.routes.js mtime: {0:yyyy-MM-dd HH:mm:ss}" -f $distTime)
    Add-Line ("  contains upload-avatar: {0}" -f $hasRoute) (if ($hasRoute) {'Green'} else {'Red'})
    $l5 = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($l5) {
        $proc5 = Get-Process -Id $l5.OwningProcess -ErrorAction SilentlyContinue
        $stale = $proc5.StartTime -lt $distTime
        Add-Line ("  backend started: {0:yyyy-MM-dd HH:mm:ss}  ->  {1}" -f $proc5.StartTime, (if ($stale) {'STALE'} else {'FRESH'})) (if ($stale) {'Red'} else {'Green'})
    }
}

Add-Line "`n[3] ROUTE REGISTRATION (401 = registered & auth-gated, 404 = missing)" Cyan
$routes = @(
    @{m='GET';  p='/api/users/profile'},
    @{m='PUT';  p='/api/users/profile'},
    @{m='PUT';  p='/api/users/complete-profile'},
    @{m='POST'; p='/api/users/upload-avatar'},
    @{m='GET';  p='/api/users/youth-profiles'},
    @{m='GET';  p='/api/users/verification/status'},
    @{m='POST'; p='/api/users/verification/upload'},
    @{m='GET';  p='/api/users/role-capacity/test'}
)
foreach ($r in $routes) {
    $code = 0
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:5000$($r.p)" -Method $r.m -UseBasicParsing -ErrorAction Stop -TimeoutSec 4
        $code = [int]$resp.StatusCode
    } catch {
        $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    }
    $verdict = if ($code -eq 401) { 'OK' } elseif ($code -eq 404) { 'MISSING' } elseif ($code -eq 0) { 'UNREACHABLE' } else { "unexpected $code" }
    $color = if ($code -eq 401) { 'Green' } elseif ($code -eq 0 -or $code -eq 404) { 'Red' } else { 'Yellow' }
    Add-Line ("  {0,-4} {1,-40} => {2,3}  [{3}]" -f $r.m, $r.p, $code, $verdict) $color
}

Add-Line "`n[4] RULE IMPLEMENTATION GREP (backend .ts, no node_modules)" Cyan
$rules = @(
    @{n='Separated name fields';         p='last_name|first_name|middle_name'},
    @{n='Honorable prefix';              p='Honorable|Hon\.'},
    @{n='Leadership transfer';           p='transfer.?leadership|transferLeadership|transfer_leadership'},
    @{n='SA-only SK official creation';  p='SUPER_ADMIN.*SK_OFFICIAL|SK_OFFICIAL.*SUPER_ADMIN'},
    @{n='Youth-only self-registration';  p='youthRegister|youth_register|selfRegister|self_register'},
    @{n='ID verification';               p='verification/upload|verification_status|id_card|valid_id'},
    @{n='Ban / spam prevention';         p='is_banned|ban_user|banUser|suspend|spam_detect'},
    @{n='Youth directory';               p='youth-profiles|youthProfiles|youth_directory'},
    @{n='Transparent event budgets';     p='public.?budget|publicBudget|budget_detail|eventBudget'}
)
foreach ($r in $rules) {
    $hits = @(Get-ChildItem $backend -Recurse -Include *.ts -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch 'node_modules|\\dist\\' } |
        Select-String -Pattern $r.p -ErrorAction SilentlyContinue)
    $color = if ($hits.Count -gt 0) { 'Green' } else { 'Red' }
    $status = if ($hits.Count -gt 0) { 'FOUND' } else { 'NOT FOUND' }
    Add-Line ("  [{0,-9}] {1,-32} ({2} hits)" -f $status, $r.n, $hits.Count) $color
}

Add-Line "`n[5] SUMMARY" Cyan
$bad = @($report | Where-Object { $_ -match 'NOT LISTENING|STALE|ONE DRIVE|MISSING|UNREACHABLE|NOT FOUND|WARNING' })
if ($bad.Count -gt 0) {
    Add-Line "  Issues:" Yellow
    $bad | ForEach-Object { Add-Line "    - $_" Yellow }
} else {
    Add-Line '  Infrastructure + route registration all green. (Does NOT prove feature-level behaviour.)' Green
}

$report | Out-File -FilePath 'C:\dev\KABISIG-FINAL\diagnostic-report.txt' -Encoding UTF8
Write-Host "`nSaved to C:\dev\KABISIG-FINAL\diagnostic-report.txt" -ForegroundColor Cyan