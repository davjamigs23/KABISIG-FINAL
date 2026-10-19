import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import kabisigApi from '../lib/api';

export default function RestrictedUsersPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // @ts-ignore
      const list = await kabisigApi.getSuspendedUsers();
      setUsers(list || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleReactivate = async (userId: string) => {
    if (!confirm('Reactivate this account?')) return;
    setReactivatingId(userId);
    try {
      // @ts-ignore
      await kabisigApi.updateUserStatus(userId, 'active');
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (e) {
      console.error(e);
    } finally {
      setReactivatingId(null);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" /> Restricted Users
          </h2>
          <p className="text-sm text-slate-500">Manage suspended youth accounts. They are blocked from logging in until reactivated.</p>
        </div>
        <button 
          onClick={fetchUsers} 
          disabled={loading}
          className="px-3 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-200 flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b">
            <tr>
              <th className="px-4 py-3">Youth Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u: any) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-bold text-slate-800">{u.full_name || 'Unknown'}</td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3 text-rose-600 font-semibold">{u.suspension_reason || 'Violation of Guidelines'}</td>
                <td className="px-4 py-3 text-right">
                  <button 
                    onClick={() => handleReactivate(u.id)}
                    disabled={reactivatingId === u.id}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 disabled:opacity-50"
                  >
                    {reactivatingId === u.id ? 'Reactivating...' : 'Reactivate Account'}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-slate-400 font-medium">
                  No restricted users found.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-slate-400 font-medium">
                  Loading...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}