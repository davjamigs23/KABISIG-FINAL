function SEC($t) { Write-Host ""; Write-Host ("=" * 72) -ForegroundColor Cyan; Write-Host " $t" -ForegroundColor Cyan; Write-Host ("=" * 72) -ForegroundColor Cyan }
$f = "C:\dev\KABISIG-FINAL\frontend\src\components\OfficialPages.tsx"

SEC "B01 - Program create handlers"
Select-String -Path $f -Pattern "handleCreateProgram|handleSaveProgram|handleAddProgram|onSubmit.*[Pp]rogram|newProgramForm|programForm" | Select-Object -First 10 | ForEach-Object { Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length)))" -ForegroundColor Yellow }

SEC "D05 - Tax amount variable"
Select-String -Path $f -Pattern "taxAmount|tax_amount|taxRate|tax_rate|computeTax|calculateTax" | Select-Object -First 12 | ForEach-Object { Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length)))" -ForegroundColor Yellow }

SEC "D08 - Budget alert / threshold"
Select-String -Path $f -Pattern "budgetAlert|BudgetAlert|monitorBudget|threshold|exceeds|insufficient|utilization.*>|alert" | Select-Object -First 12 | ForEach-Object { Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length)))" -ForegroundColor Yellow }

SEC "D14 - Expense API / createExpense"
Select-String -Path $f -Pattern "createExpense|recordExpense|postExpense|addExpense|/budget/expense|expense.*create|saveExpense" | Select-Object -First 12 | ForEach-Object { Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length)))" -ForegroundColor Yellow }

SEC "E07 - Inventory write API"
Select-String -Path $f -Pattern "createInventory|addInventory|postInventory|saveInventory|inventory.*post|onSaveInventory|handleInventory" | Select-Object -First 12 | ForEach-Object { Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length)))" -ForegroundColor Yellow }

SEC "Full inventory reference list"
Select-String -Path $f -Pattern "inventory" -CaseSensitive:$false | Select-Object -First 15 | ForEach-Object { Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length)))" -ForegroundColor DarkGray }

SEC "Full expense reference list"
Select-String -Path $f -Pattern "expense" -CaseSensitive:$false | Select-Object -First 15 | ForEach-Object { Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length)))" -ForegroundColor DarkGray }
