$ErrorActionPreference = "Stop"
$f = "C:\dev\KABISIG-FINAL\frontend\src\components\BarangayAdminPages.tsx"
Copy-Item $f "$f.$(Get-Date -Format 'yyyyMMdd_HHmmss').bak" -Force
$lines = [System.IO.File]::ReadAllLines($f)
$list = [System.Collections.Generic.List[string]]::new(); $list.AddRange($lines)

for ($i = 0; $i -lt $list.Count; $i++) {
    if ($list[$i] -match "activeMenu === 'reports' && \(") {
        for ($j = $i + 1; $j -lt [Math]::Min($i + 25, $list.Count); $j++) {
            if ($list[$j] -match "Executive Reports & Decision Analytics Center") {
                $ind = if ($list[$j] -match '^(\s+)') { $Matches[1] } else { '                ' }
                $block = @(
                    "${ind}{/* Resolution Tracking — per manuscript §4.3.1 Module 4 */}",
                    "${ind}{resolutions && resolutions.length > 0 && (",
                    "${ind}  <div className=""rounded-xl bg-white p-5 shadow-xs border border-slate-100 mb-4"">",
                    "${ind}    <div className=""flex items-center justify-between mb-3"">",
                    "${ind}      <div>",
                    "${ind}        <h3 className=""text-sm font-extrabold text-[#091d64]"">Resolution Tracking & Community Votes</h3>",
                    "${ind}        <p className=""text-[11px] text-slate-400 mt-0.5"">Live support/oppose tallies per §4.3.1 Module 4.</p>",
                    "${ind}      </div>",
                    "${ind}      <span className=""text-[10px] font-bold text-slate-500"">{resolutions.length} resolution{resolutions.length === 1 ? '' : 's'}</span>",
                    "${ind}    </div>",
                    "${ind}    <div className=""grid grid-cols-1 md:grid-cols-2 gap-3"">",
                    "${ind}      {resolutions.map((res: any) => (",
                    "${ind}        <div key={res.id} className=""rounded-lg border border-slate-200 bg-slate-50/60 p-3"">",
                    "${ind}          <div className=""flex items-start justify-between gap-2"">",
                    "${ind}            <div className=""min-w-0 flex-1"">",
                    "${ind}              <p className=""text-[10px] font-mono font-bold text-slate-500"">{res.resolutionNumber || 'POLL'}</p>",
                    "${ind}              <p className=""text-xs font-bold text-slate-800 mt-0.5 leading-tight"">{res.title || 'Untitled'}</p>",
                    "${ind}            </div>",
                    "${ind}            <span className={res.status === 'Voting Open' ? 'px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700' : 'px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-200 text-slate-600'}>",
                    "${ind}              {res.status || 'Unknown'}",
                    "${ind}            </span>",
                    "${ind}          </div>",
                    "${ind}          <div className=""mt-2 flex items-center gap-3 text-[10px]"">",
                    "${ind}            <span className=""font-bold text-emerald-700"">👍 {Number(res.votesSupport) || 0} Support</span>",
                    "${ind}            <span className=""font-bold text-rose-600"">👎 {Number(res.votesOppose) || 0} Oppose</span>",
                    "${ind}          </div>",
                    "${ind}          {res.validityPeriod && <p className=""text-[9px] text-slate-400 mt-1"">Valid: {res.validityPeriod}</p>}",
                    "${ind}        </div>",
                    "${ind}      ))}",
                    "${ind}    </div>",
                    "${ind}  </div>",
                    "${ind})}",
                    ""
                )
                $list.InsertRange($j, [string[]]$block)
                Write-Host "[1] Resolution Tracking card inserted" -ForegroundColor Green
                break
            }
        }
        break
    }
}
[System.IO.File]::WriteAllLines($f, $list)
Push-Location "C:\dev\KABISIG-FINAL\frontend"
$null = & npx tsc --noEmit 2>&1
$exit = $LASTEXITCODE
Pop-Location
if ($exit -eq 0) { Write-Host "[SUCCESS] tsc passes" -ForegroundColor Green }
else { Write-Host "[FAIL] Rollback and manual review." -ForegroundColor Red }
