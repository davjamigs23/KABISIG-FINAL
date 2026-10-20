$ErrorActionPreference = "Continue"
$fe = "C:\dev\KABISIG-FINAL\frontend"
$be = "C:\dev\KABISIG-FINAL\backend"

function S($t) { Write-Host ""; Write-Host "=== $t ===" -ForegroundColor Cyan }

# --- D2: QR scanning libraries ---
S "D2 — QR SCANNING (all QR-related code)"
Get-ChildItem $fe -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch 'node_modules|\.d\.ts$' } |
    Select-String -Pattern "getUserMedia|html5-qrcode|Html5Qrcode|zxing|jsqr|QRScanner|BarcodeDetector|camera" |
    Select-Object -First 20 |
    ForEach-Object { Write-Host ("{0}:{1}  {2}" -f $_.Filename, $_.LineNumber, $_.Line.Trim().Substring(0,[Math]::Min(110,$_.Line.Trim().Length))) -ForegroundColor DarkGray }

S "D2 — package.json QR dependencies"
Get-Content (Join-Path $fe "package.json") -ErrorAction SilentlyContinue |
    Select-String -Pattern "qrcode|jsqr|zxing|html5|barcode" |
    ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }

# --- E7: PDF libraries ---
S "E7 — PDF GENERATION (all PDF-related code)"
Get-ChildItem $fe,$be -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch 'node_modules|\.d\.ts$' } |
    Select-String -Pattern "jspdf|jsPDF|pdfmake|puppeteer|pdf-lib|@react-pdf|react-pdf|window\.print|\.print\(\)|generateReport" |
    Select-Object -First 20 |
    ForEach-Object { Write-Host ("{0}:{1}  {2}" -f $_.Filename, $_.LineNumber, $_.Line.Trim().Substring(0,[Math]::Min(110,$_.Line.Trim().Length))) -ForegroundColor DarkGray }

S "E7 — package.json PDF dependencies"
Get-Content (Join-Path $fe "package.json") -ErrorAction SilentlyContinue |
    Select-String -Pattern "pdf|jspdf|pdfmake|puppeteer" |
    ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }

# --- E10: Inventory across all role components ---
S "E10 — INVENTORY references per component"
foreach ($file in @('BarangayAdminPages.tsx','OfficialPages.tsx','SuperAdminPages.tsx','YouthPages.tsx','PublicPages.tsx')) {
    $path = Join-Path $fe "src\components\$file"
    if (Test-Path $path) {
        $content = Get-Content $path -Raw
        $invHits = @([regex]::Matches($content, "(?i)inventory")).Count
        $assetHits = @([regex]::Matches($content, "(?i)asset|property")).Count
        $color = if ($invHits -gt 0 -or $assetHits -gt 0) { 'Green' } else { 'Red' }
        Write-Host ("  {0,-28} inventory={1,3} asset/property={2,3}" -f $file, $invHits, $assetHits) -ForegroundColor $color
    }
}

S "E10 — All inventory.routes.ts callers (who fetches from /inventory)"
Get-ChildItem $fe -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch 'node_modules|\.d\.ts$' } |
    Select-String -Pattern "/inventory|api\.inventory|kabisigApi\.inventory|getInventory" |
    Select-Object -First 15 |
    ForEach-Object { Write-Host ("{0}:{1}  {2}" -f $_.Filename, $_.LineNumber, $_.Line.Trim().Substring(0,[Math]::Min(110,$_.Line.Trim().Length))) -ForegroundColor DarkGray }

# --- Bonus: register one more benefit program for duplicate flag test ---
S "NEXT STEP — Which youth needs one more benefit registration?"
Write-Host "  David James Ignacio: 2 benefits (needs 1 more)"
Write-Host "  James Jason Bondrameda: 2 benefits (needs 1 more)"
Write-Host "  Register either youth for 1 additional benefit program via the UI, then"
Write-Host "  the Chairperson's Duplicate Assistance Flag panel will show 1 For Review."
