# Add Resolution Tracking card to Chairperson Reports section
# Uses existing `resolutions` prop — no new API calls needed
$ErrorActionPreference = "Stop"
$f = "C:\dev\KABISIG-FINAL\frontend\src\components\BarangayAdminPages.tsx"
Copy-Item $f "$f.$(Get-Date -Format 'yyyyMMdd_HHmmss').bak" -Force
$lines = [System.IO.File]::ReadAllLines($f)
$list = [System.Collections.Generic.List[string]]::new(); $list.AddRange($lines)

# Find the reports section render and insert a card at the top
$inserted = $false
for ($i = 0; $i -lt $list.Count; $i++) {
    if ($list[$i] -match "activeMenu === 'reports' && \(") {
        # Find the opening of the JSX right after, then insert before next sibling
        for ($j = $i + 1; $j -lt [Math]::Min($i + 20, $list.Count); $j++) {
            if ($list[$j] -match "Executive Reports & Decision Analytics Center") {
                # Insert ABOVE the h3 heading
                $indent = if ($list[$j] -match '^(\s+)') { $Matches[1] } else { '                ' }
                $block = @(
                    "${indent}{/* Resolution Tracking — manuscript §4.3.1 Module 4 */}",
                    "${indent}{resolutions.length > 0 && (",
                    "${indent}  <div className='rounded-xl bg-white p-5 shadow-xs border border-slate-100 mb-4'>",
                    "${indent}    <div className='flex items-center justify-between mb-3'>",
                    "${indent}      <div>",
                    "${indent}        <h3 className='text-sm font-extrabold text-[#091d64]'>Resolution Tracking & Community Votes</h3>",
                    "${indent}        <p className='text-[11px] text-slate-400 mt-0.5'>Live support/oppose tallies per §4.3.1 Module 4 (Resolution and Legislative Tracking).</p>",
                    "${indent}      </div>",
                    "${indent}      <span className='text-[10px] font-bold text-slate-500'>{resolutions.length} resolution{resolutions.length === 1 ? '' : 's'}</span>",
                    "${indent}    </div>",
                    "${indent}    <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>",
                    "${indent}      {resolutions.map((res: any) => (",
                    "${indent}        <div key={res.id} className='rounded-lg border border-slate-200 bg-slate-50/60 p-3'>",
                    "${indent}          <div className='flex items-start justify-between gap-2'>",
                    "${indent}            <div className='min-w-0 flex-1'>",
                    "${indent}              <p className='text-[10px] font-mono font-bold text-slate-500'>{res.resolutionNumber || 'POLL'}</p>",
                    "${indent}              <p className='text-xs font-bold text-slate-800 mt-0.5 leading-tight'>{res.title || 'Untitled Resolution'}</p>",
                    "${indent}            </div>",
                    "${indent}            <span className={\`px-2 py-0.5 rounded-full text-[9px] font-bold \${res.status === 'Voting Open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}\`}>",
                    "${indent}              {res.status || 'Unknown'}",
                    "${indent}            </span>",
                    "${indent}          </div>",
                    "${indent}          <div className='mt-2 flex items-center gap-3 text-[10px]'>",
                    "${indent}            <span className='font-bold text-emerald-700'>👍 {Number(res.votesSupport) || 0} Support</span>",
                    "${indent}            <span className='font-bold text-rose-600'>👎 {Number(res.votesOppose) || 0} Oppose</span>",
                    "${indent}          </div>",
                    "${indent}          {res.validityPeriod && <p className='text-[9px] text-slate-400 mt-1'>Valid: {res.validityPeriod}</p>}",
                    "${indent}        </div>",
                    "${indent}      ))}",
                    "${indent}    </div>",
                    "${indent}  </div>",
                    "${indent})}",
                    ""
                )
                $list.InsertRange($j, [string[]]$block)
                Write-Host "[1] Resolution Tracking card inserted at line $($j+1)" -ForegroundColor Green
                $inserted = $true
                break
            }
        }
        if ($inserted) { break }
    }
}

if (-not $inserted) {
    Write-Host "[ABORT] Reports section anchor not found. Manual review needed." -ForegroundColor Red
    Copy-Item "$f" "$f.failed" -Force
    exit 1
}

[System.IO.File]::WriteAllLines($f, $list)
Write-Host "[WRITE] $($list.Count) lines" -ForegroundColor Cyan

Push-Location "C:\dev\KABISIG-FINAL\frontend"
$null = & npx tsc --noEmit 2>&1
$exit = $LASTEXITCODE
Pop-Location

if ($exit -eq 0) {
    Write-Host "[SUCCESS] tsc passes — Resolution Tracking card live in Chairperson Reports" -ForegroundColor Green
} else {
    Write-Host "[FAIL] tsc errors — checking Report section structure" -ForegroundColor Red
    Write-Host "Paste error and rollback will be provided." -ForegroundColor Yellow
}
