import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { kabisigApi } from '../lib/api';

export default function RestrictedUsers() {
  const [restrictions, setRestrictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [clearingId, setClearingId] = useState<string | null>(null);

  const loadRestrictions = async () => {
    setLoading(true);
    try {
      const data = await kabisigApi.getRestrictions();
      setRestrictions(data || []);
    } catch (e: any) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadRestrictions(); }, []);

  const handleClear = async (r: any) => {
    if (!confirm('Clear restriction for ' + (r.users?.full_name || 'this user') + '?')) return;
    setClearingId(r.id);
    try {
      const res = await kabisigApi.clearRestriction(r.id);
      if (res.success) loadRestrictions();
      else alert(res.message);
    } catch (e: any) { alert(e.message); }
    finally { setClearingId(null); }
  };

  return (
    <div className="p-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 font-black text-[10px] rounded uppercase tracking-wider">SPAM PREVENTION</span>
            <h4 className="font-sans font-bold text-slate-800 text-sm mt-1">Restricted Users</h4>
          </div>
          <button onClick={loadRestrictions} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase border-b border-slate-100">
              <tr><th className="p-3">User</th><th className="p-3">Type</th><th className="p-3">Reason</th><th className="p-3 text-right">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {loading && <tr><td colSpan={4} className="p-6 text-center text-slate-400"><Loader2 className="w-4 h-4 animate-spin inline" /> Loading...</td></tr>}
              {!loading && restrictions.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-400 font-bold">No restrictions found in your barangay.</td></tr>}
              {!loading && restrictions.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="p-3">
                    <span className="font-bold text-slate-800 block">{r.users?.full_name || 'Unknown'}</span>
                    <span className="text-[10px] text-slate-400">{r.users?.email}</span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${r.restriction_type === 'permanent_ban' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                      {r.restriction_type}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 text-[11px] max-w-xs">{r.reason}</td>
                  <td className="p-3 text-right">
                    {r.is_active ? (
                      <button onClick={() => handleClear(r)} disabled={clearingId === r.id} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg disabled:opacity-50">
                        {clearingId === r.id ? 'Clearing...' : 'Clear Restriction'}
                      </button>
                    ) : <span className="text-[10px] text-slate-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}