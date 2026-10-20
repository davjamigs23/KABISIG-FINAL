import React, { useState, useEffect } from 'react';
import { User, MapPin, Mail, X, Loader2, Camera, Save, Edit2 } from 'lucide-react';
import { kabisigApi } from '../lib/api';

export default function ProfileSettings() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [form, setForm] = useState({ first_name: '', middle_name: '', last_name: '', suffix: '', email: '' });

  useEffect(() => {
    let cancelled = false;
    kabisigApi.getCurrentUser().then(u => {
      if (!cancelled) {
        setUser(u);
        setForm({
          first_name: u?.first_name || '',
          middle_name: u?.middle_name || '',
          last_name: u?.last_name || '',
          suffix: u?.suffix || '',
          email: u?.email || ''
        });
        setLoading(false);
      }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const getName = () => {
    const base = user.first_name
      ? [user.first_name, user.middle_name, user.last_name, user.suffix].filter(Boolean).join(' ')
      : (user.full_name || '');
    if (user.full_name && user.full_name.startsWith('Hon.') && !base.startsWith('Hon.')) {
      return 'Hon. ' + base;
    }
    return base;
  };

  const getRole = () => {
    const meta = user?.user_metadata || {};
    const s = String(meta.official_role || user?.official_position || meta.role || user?.role || '');
    if (s.includes('Secretary')) return 'SK Secretary';
    if (s.includes('Treasurer')) return 'SK Treasurer';
    if (s.includes('Kagawad')) return 'SK Kagawad';
    if (Number(user?.role_id) === 1) return 'Super Admin';
    if (Number(user?.role_id) === 2) return 'Barangay Admin';
    return s || 'User';
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setNotice({ type: 'error', text: 'Choose a JPEG, PNG, or WebP image.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice({ type: 'error', text: 'The image must be smaller than 5 MB.' });
      return;
    }

    setIsUploadingPhoto(true);
    setNotice(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string'
          ? resolve(reader.result)
          : reject(new Error('The selected image could not be read.'));
        reader.onerror = () => reject(new Error('The selected image could not be read.'));
        reader.readAsDataURL(file);
      });
      const res = await kabisigApi.uploadAvatar(base64, file.type);
      if (!res.success || !res.data?.avatar_url) {
        throw new Error(res.message || 'Failed to upload photo.');
      }
      const avatarUrl = res.data.avatar_url;
      setUser((previous: any) => previous ? { ...previous, avatar_url: avatarUrl } : previous);
      window.dispatchEvent(new CustomEvent('kabisig:avatar-updated', { detail: { avatar_url: avatarUrl } }));
      setNotice({ type: 'success', text: 'Profile photo updated and saved successfully.' });
    } catch (err: unknown) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Network error uploading photo.' });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    setSaving(true); setNotice(null);
    try {
      const res = await kabisigApi.updateProfile(form, user.id);
      if (res.success) {
        setUser({ ...user, ...form });
        setNotice({ type: 'success', text: 'Profile updated successfully. SK Fed President has been notified.' });
        setIsEditing(false);
      } else {
        setNotice({ type: 'error', text: res.message || 'Update failed.' });
      }
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Network error.' });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in duration-200 text-left">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-6">
        
        {notice && (
          <div className={'p-3 rounded-xl text-xs font-semibold ' + (notice.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
            {notice.text}
          </div>
        )}

        <div className="flex items-center justify-between border-b border-slate-100 pb-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-[#091d64] text-white flex items-center justify-center text-4xl font-black shadow-md overflow-hidden border-4 border-white">
                {user?.avatar_url ? <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : getName().charAt(0)}
              </div>
              <label className={`absolute bottom-0 right-0 p-2 bg-amber-400 rounded-full shadow-sm border-2 border-white ${isUploadingPhoto ? 'cursor-wait opacity-60' : 'cursor-pointer hover:bg-amber-300'}`}>
                {isUploadingPhoto ? <Loader2 className="w-4 h-4 text-amber-950 animate-spin" /> : <Camera className="w-4 h-4 text-amber-950" />}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} disabled={isUploadingPhoto} />
              </label>
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">{getName()}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-[#091d64] border border-blue-200">{getRole()}</span>
              </div>
            </div>
          </div>
          {user?.role_id === 1 ? (
            !isEditing ? (
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors">
                <Edit2 className="w-4 h-4" /> Edit Profile
              </button>
            ) : (
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
              </button>
            )
          ) : (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              Read-Only (SA Only)
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {['first_name', 'middle_name', 'last_name', 'suffix'].map((field) => (
            <div key={field}>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {field.replace('_', ' ')}</label>
              {isEditing && Number(user?.role_id) === 1 ? <input value={(form as any)[field]} onChange={e => setForm({...form, [field]: e.target.value})} className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:ring-1 focus:ring-[#091d64] outline-none" /> : <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800">{(user as any)?.[field] || '—'}</div>}
            </div>
          ))}
          
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email Address {Number(user?.role_id) === 1 && <span className="text-rose-500">(Locked)</span>}</label>
            {isEditing && Number(user?.role_id) === 1 ? <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:ring-1 focus:ring-[#091d64] outline-none" /> : <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800">{user?.email || '—'}</div>}
          </div>
          
          {Number(user?.role_id) !== 1 && (
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Assigned Barangay</label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800">{user?.barangay?.name ? 'Barangay ' + user.barangay.name : 'Unassigned'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
