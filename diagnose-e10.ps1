$f = "C:\dev\KABISIG-FINAL\frontend\src\components\BarangayAdminPages.tsx"
$lines = [System.IO.File]::ReadAllLines($f)
$hits = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "const\s+\[activeTab|activeTab\s*===|setActiveTab|TabNav|navItems|sidebarItems") {
        $hits += $i
    }
}
Write-Host "=== Tab/nav anchors in BarangayAdminPages.tsx ===" -ForegroundColor Cyan
if ($hits.Count -eq 0) {
    Write-Host "No tab anchors found. Search manually:" -ForegroundColor Red
    Write-Host '  Select-String -Path $f -Pattern "Tab|Nav|Sidebar"'
} else {
    for ($k = 0; $k -lt [Math]::Min(30, $hits.Count); $k++) {
        $i = $hits[$k]
        Write-Host ("{0,5}: {1}" -f ($i + 1), $lines[$i].Substring(0, [Math]::Min(120, $lines[$i].Length))) -ForegroundColor DarkGray
    }
}

Write-Host "`n=== First 40 lines of BarangayAdminPages.tsx (imports) ===" -ForegroundColor Cyan
for ($i = 0; $i -lt [Math]::Min(40, $lines.Count); $i++) {
    Write-Host ("{0,5}: {1}" -f ($i + 1), $lines[$i]) -ForegroundColor DarkGray
}

Write-Host "`n=== Inventory type reference in OfficialPages.tsx ===" -ForegroundColor Cyan
$off = "C:\dev\KABISIG-FINAL\frontend\src\components\OfficialPages.tsx"
$offLines = [System.IO.File]::ReadAllLines($off)
for ($i = 160; $i -lt [Math]::Min(230, $offLines.Count); $i++) {
    if ($offLines[$i] -match "inventory|Inventory|asset|Asset|photo_url") {
        Write-Host ("{0,5}: {1}" -f ($i + 1), $offLines[$i].Substring(0, [Math]::Min(130, $offLines[$i].Length))) -ForegroundColor Green
    }
}
