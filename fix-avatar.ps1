# =====================================================================
#  Fix avatar upload signature mismatch (all call sites)
#  Also remove the @ts-ignore hiding it.
# =====================================================================
$ErrorActionPreference = "Stop"
$file = "C:\dev\KABISIG-FINAL\frontend\src\components\YouthPages.tsx"
$backup = "C:\dev\KABISIG-FINAL\backups\YouthPages.tsx.$(Get-Date -Format 'yyyyMMdd_HHmmss').bak"
Copy-Item $file $backup
Write-Host "[BACKUP] $backup" -ForegroundColor Cyan

$lines = [System.IO.File]::ReadAllLines($file)
$list = [System.Collections.Generic.List[string]]::new(); $list.AddRange($lines)

$fixed = 0
for ($i = 0; $i -lt $list.Count; $i++) {
    # Match: uploadAvatar({ base64, mime_type: X })
    # Replace: uploadAvatar(base64, X)
    if ($list[$i] -match 'kabisigApi\.uploadAvatar\(\s*\{\s*base64\s*,\s*mime_type\s*:\s*([^}]+?)\s*\}\s*\)') {
        $mime = $Matches[1].Trim()
        $indent = if ($list[$i] -match '^(\s*)') { $Matches[1] } else { '' }
        $list[$i] = "${indent}const res = await kabisigApi.uploadAvatar(base64, ${mime});"
        Write-Host "[FIX] line $($i+1): $($list[$i].Trim())" -ForegroundColor Green
        $fixed++
        # Remove @ts-ignore on the line above if present
        if ($i -gt 0 -and $list[$i-1].Trim() -eq '// @ts-ignore') {
            $list.RemoveAt($i-1)
            $i--
            Write-Host "  [CLEANUP] Removed @ts-ignore" -ForegroundColor Yellow
        }
    }
}

if ($fixed -eq 0) {
    Write-Host "[WARN] No uploadAvatar call sites fixed. Manual review." -ForegroundColor Yellow
} else {
    [System.IO.File]::WriteAllLines($file, $list)
    Write-Host "[WRITE] Fixed $fixed call site(s)." -ForegroundColor Green
}

# Build check
Push-Location "C:\dev\KABISIG-FINAL\frontend"
$null = & npx tsc --noEmit 2>&1
$exit = $LASTEXITCODE
Pop-Location
if ($exit -ne 0) {
    Write-Host "[BUILD FAILED] Rolling back." -ForegroundColor Red
    Copy-Item $backup $file -Force
    exit 1
}
Write-Host "[SUCCESS] Frontend tsc passes." -ForegroundColor Green
