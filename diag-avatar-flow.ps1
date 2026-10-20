$fe = "C:\dev\KABISIG-FINAL\frontend\src\components\YouthPages.tsx"
$lines = [System.IO.File]::ReadAllLines($fe)

Write-Host "=== Save handler around line 260-310 ===" -ForegroundColor Cyan
for ($i = 255; $i -lt [Math]::Min(320, $lines.Count); $i++) {
    $c = 'DarkGray'
    if ($lines[$i] -match "upload|avatar|profilePic|kabisigApi\.") { $c = 'Yellow' }
    Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i]) -ForegroundColor $c
}

Write-Host "`n=== profilePic initialization (search) ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "profilePic\s*:\s*.*avatar_url|avatar_url.*profilePic|setCurrentYouth|setYouth.*profile") {
        Write-Host ("{0,5}: {1}" -f ($i+1), $lines[$i].Substring(0, [Math]::Min(130, $lines[$i].Length))) -ForegroundColor Green
    }
}

Write-Host "`n=== uploadAvatar API method ===" -ForegroundColor Cyan
$api = "C:\dev\KABISIG-FINAL\frontend\src\lib\api.ts"
$apiLines = [System.IO.File]::ReadAllLines($api)
for ($i = 0; $i -lt $apiLines.Count; $i++) {
    if ($apiLines[$i] -match "upload-avatar|uploadAvatar") {
        for ($j = [Math]::Max(0, $i-2); $j -lt [Math]::Min($apiLines.Count, $i+15); $j++) {
            Write-Host ("{0,5}: {1}" -f ($j+1), $apiLines[$j]) -ForegroundColor DarkCyan
        }
        Write-Host "---"
    }
}
