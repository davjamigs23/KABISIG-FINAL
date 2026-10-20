$f = "C:\dev\KABISIG-FINAL\frontend\src\components\BarangayAdminPages.tsx"
$lines = [System.IO.File]::ReadAllLines($f)
Write-Host "Total lines: $($lines.Count)" -ForegroundColor Cyan

Write-Host "`n=== Section-level anchors (JSX section headers) ===" -ForegroundColor Yellow
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^\s*(//\s*[=-]|/\*\s*[=-]|id\s*=\s*['""]|name\s*=\s*['""])" -or
        $lines[$i] -match "className=['""].*card.*['""].*>[A-Z]") {
        if ($lines[$i] -match "Budget|Document|Program|Youth|Profile|Audit|Feedback|Notification|Dashboard|Announcement|Restricted|Inventory") {
            Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i].Substring(0, [Math]::Min(140, $lines[$i].Length))) -ForegroundColor Green
        }
    }
}

Write-Host "`n=== Major JSX section headers (h2/h3) ===" -ForegroundColor Yellow
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "<h[23]") {
        Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i].Trim().Substring(0, [Math]::Min(140, $lines[$i].Trim().Length))) -ForegroundColor Cyan
    }
}

Write-Host "`n=== Budget section context (± 5 lines around first 'Budget' ref past 400) ===" -ForegroundColor Yellow
$found = 0
for ($i = 400; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "Budget" -and $lines[$i] -match "<(h[1-6]|div|section|header)" -and $found -lt 2) {
        for ($j = [Math]::Max(0, $i - 2); $j -lt [Math]::Min($lines.Count, $i + 8); $j++) {
            Write-Host ("{0,5}: {1}" -f ($j+1), $lines[$j].Substring(0, [Math]::Min(130, $lines[$j].Length))) -ForegroundColor DarkGray
        }
        Write-Host "---"
        $found++
    }
}
