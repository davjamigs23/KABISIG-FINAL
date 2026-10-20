$utf8 = New-Object System.Text.UTF8Encoding $false, $true
$nf = "C:\dev\KABISIG-FINAL\frontend\src\components\NotificationMenu.tsx"

Write-Host "=== 1. Rendering block (lines 120-150) — where date SHOULD render ===" -ForegroundColor Cyan
$lines = [System.IO.File]::ReadAllLines($nf, $utf8)
for ($i = 119; $i -lt [Math]::Min(150, $lines.Count); $i++) {
    Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i])
}

Write-Host ""
Write-Host "=== 2. Supplemental item structure in Chairperson page ===" -ForegroundColor Cyan
$bp = "C:\dev\KABISIG-FINAL\frontend\src\components\BarangayAdminPages.tsx"
$bLines = [System.IO.File]::ReadAllLines($bp, $utf8)
for ($i = 1560; $i -lt [Math]::Min(1610, $bLines.Count); $i++) {
    Write-Host ("{0,5}: {1}" -f ($i+1), $bLines[$i])
}
