$f = "C:\dev\KABISIG-FINAL\frontend\src\components\BarangayAdminPages.tsx"
$lines = [System.IO.File]::ReadAllLines($f)

Write-Host "=== All calls to generatePDFReport / openDynamicPrintPDF ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "generatePDFReport\(|openDynamicPrintPDF\(") {
        if ($lines[$i] -notmatch "const\s+(generatePDFReport|openDynamicPrintPDF)") {
            Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i].Substring(0, [Math]::Min(150, $lines[$i].Length))) -ForegroundColor Green
            # Show 3 lines context before (button opening)
            for ($j = [Math]::Max(0, $i-4); $j -lt $i; $j++) {
                Write-Host ("       {0}" -f $lines[$j].Substring(0, [Math]::Min(150, $lines[$j].Length))) -ForegroundColor DarkGray
            }
            Write-Host ""
        }
    }
}

Write-Host "=== Budget allocation state variable names ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "useState.*budgetAlloc|useState.*expenses|const.*expenses\s*=|const.*budgetAllocations\s*=") {
        Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i].Substring(0, [Math]::Min(140, $lines[$i].Length))) -ForegroundColor Yellow
    }
}
