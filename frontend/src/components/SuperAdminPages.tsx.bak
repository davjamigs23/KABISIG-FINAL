import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Building2, BarChart3, History, 
  Plus, Edit2, Search, Filter, Download, FileSpreadsheet,
  CheckCircle2, AlertTriangle, Users, Wallet, Calendar,
  ArrowUpRight, Lock, Eye, ShieldCheck, FileText, Check,
  X, ChevronDown, RefreshCw, Layers, Award, TrendingUp, LogOut, Menu,
  Upload, Image as ImageIcon, Trash2, Mail, Loader2, Settings, AlertCircle,
  Copy, ExternalLink
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { BarangayTenant, Program, SystemAuditLog } from '../types';
import { DEFAULT_BARANGAY_LOGOS, BARANGAY_SK_DISTRICTS } from '../data';
import { KabisigLogo } from './PublicPages';
import { UserMenu } from './UserMenu';
import ProgramTrendD3 from './charts/ProgramTrendD3';
import { kabisigApi } from '../lib/api';

interface SuperAdminPagesProps {
  barangays: BarangayTenant[];
  programs: Program[];
  auditLogs: SystemAuditLog[];
  onSyncBarangay: (id: string, updates: Partial<BarangayTenant>) => void;
  onUpdateBarangay: (id: string, updated: Partial<BarangayTenant>) => Promise<void> | void;
  onRefreshAuditLogs: () => Promise<void>;
  onLogout: () => void;
  userEmail: string;
}

export default function SuperAdminPages({
  barangays,
  programs,
  auditLogs,
  onSyncBarangay,
  onUpdateBarangay,
  onRefreshAuditLogs,
  onLogout,
  userEmail
}: SuperAdminPagesProps) {
  const toNumber = (value: number | string | null | undefined) => {
    const parsed = typeof value === 'number' ? value : Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'barangays' | 'analytics' | 'audit'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [auditSearchTerm, setAuditSearchTerm] = useState('');

  // LYDP Report Modal
  const [showLydpModal, setShowLydpModal] = useState(false);

  // Dedicated Assign SK Chairperson Modal State (Email-only)
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningBarangay, setAssigningBarangay] = useState<BarangayTenant | null>(null);
  const [assignEmail, setAssignEmail] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignNotice, setAssignNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [chairpersonSetupLink, setChairpersonSetupLink] = useState('');
  const [districtFilter, setDistrictFilter] = useState<'All' | 'North' | 'South' | 'West' | 'East'>('All');
  const [chairpersonFilter, setChairpersonFilter] = useState<'All' | 'Assigned' | 'Unassigned'>('All');
  const [federationAnalytics, setFederationAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');

  // Tenant Provisioning Modals
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingBarangay, setEditingBarangay] = useState<BarangayTenant | null>(null);
  const [modalNotice, setModalNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modalForm, setModalForm] = useState({
    name: '',
    totalBudget: null as number | null,
    logo: ''
  });

  useEffect(() => {
    let isMounted = true;
    kabisigApi.getFederationAnalytics().then((analytics) => {
      if (!isMounted) return;
      if (analytics) {
        setFederationAnalytics(analytics);
        setAnalyticsError('');
      } else {
        setAnalyticsError('Live federation analytics are unavailable. Showing the loaded barangay data where possible.');
      }
    }).catch(() => {
      if (isMounted) setAnalyticsError('Live federation analytics are unavailable. Showing the loaded barangay data where possible.');
    }).finally(() => {
      if (isMounted) setAnalyticsLoading(false);
    });

    return () => { isMounted = false; };
  }, []);

  // Calculate Aggregated Metrics
  const citywideTotals = federationAnalytics?.citywide_totals;
  const totalYouthPop = toNumber(citywideTotals?.total_registered_youth ?? barangays.reduce((sum, b) => sum + toNumber(b.youthPopulation), 0));
  const totalCityBudget = toNumber(citywideTotals?.total_budget_allocated ?? barangays.reduce((sum, b) => sum + toNumber(b.totalBudget), 0));
  const totalCitySpent = toNumber(citywideTotals?.total_budget_spent ?? barangays.reduce((sum, b) => sum + toNumber(b.spentBudget), 0));
  const totalActivePrograms = toNumber(citywideTotals?.total_active_programs ?? programs.filter(p => p.status === 'Upcoming' || p.status === 'Ongoing').length);
  const avgBudgetUtilization = totalCityBudget > 0 ? Math.round((totalCitySpent / totalCityBudget) * 100) : 0;

  // Consistently sort barangays in alphabetical order
  const sortedBarangays = [...barangays].sort((a, b) => a.name.localeCompare(b.name));

  // Data for Charts
  const federationRows = federationAnalytics?.barangay_rankings || [];
  const chartBarangayData = sortedBarangays.map(b => {
    const liveRow = federationRows.find((row: any) => row.id === b.id);
    const registeredYouth = toNumber(liveRow?.registered_youth ?? b.youthPopulation);
    const totalBudget = toNumber(liveRow?.budget_allocated ?? b.totalBudget);
    const spentBudget = toNumber(liveRow?.budget_spent ?? b.spentBudget);

    return {
      id: b.id,
      name: b.name.length > 10 ? b.name.slice(0, 10) + '...' : b.name,
      fullName: b.name,
      registeredYouth,
      activePrograms: toNumber(liveRow?.active_programs ?? b.activePrograms),
      budget: Math.round(totalBudget / 1000), // in thousands
      spent: Math.round(spentBudget / 1000),
      utilization: totalBudget > 0 ? Math.round((spentBudget / totalBudget) * 100) : 0
    };
  });

  const programTrendData = chartBarangayData.map((item) => {
    const brgyPrograms = programs.filter(p => (p as any).tenant_id === item.id || (p as any).barangayId === item.id);
    return {
      label: item.name,
      programs: federationRows.find((row: any) => row.id === item.id)?.active_programs ?? (brgyPrograms.length || item.activePrograms),
      participants: item.registeredYouth,
    };
  });

  const budgetColors = ['#091d64', '#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777'];
  const pieBudgetData = (federationAnalytics?.budget_by_category || []).map((item: any, index: number) => ({
    name: item.category,
    value: toNumber(item.allocated),
    color: budgetColors[index % budgetColors.length],
  }));

  // Filtered Barangays list
  const filteredBarangays = sortedBarangays.filter(b => {
    const bgyDistrict = b.skDistrict || BARANGAY_SK_DISTRICTS[b.name];
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.chairperson.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (b.chairpersonEmail && b.chairpersonEmail.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDistrict = districtFilter === 'All' || bgyDistrict === districtFilter;
    const isAssigned = Boolean(b.chairperson?.trim() && b.chairperson.toLowerCase() !== 'unassigned');
    const matchesChairperson = chairpersonFilter === 'All'
      || (chairpersonFilter === 'Assigned' ? isAssigned : !isAssigned);
    return matchesSearch && matchesDistrict && matchesChairperson;
  });

  // Filtered version of chartBarangayData for Analytics tab (respects search + district filter)
  const analyticsChartData = filteredBarangays.length === sortedBarangays.length
    ? chartBarangayData
    : chartBarangayData.filter((item: any) => filteredBarangays.some(b => b.id === item.id));

  const handleOpenAssignModal = (b?: BarangayTenant) => {
    const target = b || sortedBarangays[0];
    setAssigningBarangay(target || null);
    setAssignEmail(target?.chairpersonEmail && target.chairpersonEmail !== '' ? target.chairpersonEmail : '');
    setAssignError(null);
    setAssignNotice(null);
    setChairpersonSetupLink('');
    setCopiedLink(false);
    setShowAssignModal(true);
  };

  const handleAssignChairpersonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningBarangay) return;

    const email = assignEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAssignError('Please enter a valid official email address.');
      setAssignNotice(null);
      return;
    }

    setIsAssigning(true);
    setAssignError(null);
    setAssignNotice(null);

    try {
      const res = await kabisigApi.assignChairpersonByEmail(assigningBarangay.id, email);
      if (!res.success) {
        setAssignError(res.message || 'Failed to dispatch Chairperson assignment.');
        setAssignNotice({ type: 'error', text: res.message || 'Failed to dispatch Chairperson assignment.' });
        setIsAssigning(false);
        return;
      }

      onSyncBarangay(assigningBarangay.id, {
        chairperson: res.data?.full_name || (assigningBarangay.chairperson && assigningBarangay.chairperson !== 'Unassigned' ? assigningBarangay.chairperson : 'Pending Invitation'),
        chairpersonEmail: email,
      });
      await onRefreshAuditLogs();
      setChairpersonSetupLink(res.data?.action_link || res.data?.setup_url || '');
      setAssignNotice({ type: 'success', text: res.message || `Chairperson assignment created for ${email}.` });
    } catch (err: any) {
      setAssignError(err.message || 'Network connection failed.');
      setAssignNotice({ type: 'error', text: err.message || 'Network connection failed.' });
    } finally {
      setIsAssigning(false);
    }
  };

  // Filtered audit logs
  const filteredAuditLogs = auditLogs.filter(log => {
    if (!auditSearchTerm.trim()) return true;

    const searchValue = auditSearchTerm.trim().toLowerCase();
    const searchableText = [log.user, log.role, log.action, log.details].join(' ').toLowerCase();
    return searchableText.includes(searchValue);
  });

  const handleEditClick = (b: BarangayTenant) => {
    setEditingBarangay(b);
    setModalNotice(null);
    const defaultLogo = DEFAULT_BARANGAY_LOGOS[b.name] || '';
    setModalForm({
      name: b.name,
      totalBudget: b.totalBudget > 0 ? b.totalBudget : null,
      logo: b.logo || defaultLogo
    });
    setShowModal(true);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setModalNotice({ type: 'error', text: 'File size exceeds 2MB. Please choose a smaller image.' });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setModalForm(prev => ({ ...prev, logo: event.target?.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBarangay = async () => {
    if (!editingBarangay) {
      setModalNotice({ type: 'error', text: 'Choose an existing barangay before saving settings.' });
      return;
    }

    const currentName = editingBarangay.name;
    const defaultLogo = DEFAULT_BARANGAY_LOGOS[currentName] || '';

    const payload: Partial<BarangayTenant> = {
      logo: modalForm.logo
    };

    // Empty is an explicit clear operation; never use Number('') (which is 0)
    // as a way to distinguish an untouched field from a deleted allocation.
    const totalBudget = modalForm.totalBudget === null ? 0 : Number(modalForm.totalBudget);
    if (Number.isFinite(totalBudget) && totalBudget >= 0) {
      payload.totalBudget = totalBudget;
      payload.allocatedBudget = totalBudget;
    }

    setIsSaving(true);
    try {
      if (editingBarangay) {
        await onUpdateBarangay(editingBarangay.id, payload);
      }
      setModalNotice({
        type: 'success',
        text: `Supported settings for Barangay ${currentName} were saved. Chairperson assignment is a separate action.`
      });
      setTimeout(() => {
        setShowModal(false);
      }, 1200);
    } catch (err: any) {
      setModalNotice({
        type: 'error',
        text: `Failed to save to database: ${err.message || 'Make sure you are logged in as Super Admin and the backend server is operational.'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadLydpReport = () => {
    const reportWindow = window.open('', '_blank', 'width=1000,height=760');
    if (!reportWindow) {
      window.alert('Allow pop-ups to print or save the LYDP report as a PDF.');
      return;
    }

    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character] || character));
    const rows = sortedBarangays.map(barangay => {
      const liveRow = federationRows.find((row: any) => row.id === barangay.id);
      return `<tr><td>${escapeHtml(barangay.name)}</td><td>${toNumber(liveRow?.registered_youth ?? barangay.youthPopulation)}</td><td>₱${toNumber(liveRow?.budget_allocated ?? barangay.totalBudget).toLocaleString()}</td><td>₱${toNumber(liveRow?.budget_spent ?? barangay.spentBudget).toLocaleString()}</td><td>${toNumber(liveRow?.active_programs ?? barangay.activePrograms)}</td></tr>`;
    }).join('');

    reportWindow.document.write(`<!doctype html><html><head><title>Naga City LYDP ${new Date().getFullYear()}</title><style>
      body{font:12px Arial,sans-serif;color:#172033;margin:36px}h1{font-size:22px;margin:0 0 6px;color:#091d64}h2{font-size:15px;margin:24px 0 8px;color:#091d64}p{line-height:1.5}.meta{color:#586174}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:7px;text-align:left}th{background:#f1f5f9} .summary{display:flex;gap:20px;margin:20px 0}.summary div{border:1px solid #cbd5e1;padding:12px;flex:1}.summary b{display:block;font-size:16px;margin-top:4px}@media print{body{margin:15mm}}
      </style></head><body><h1>Naga City SK Federation</h1><p class="meta">Local Youth Development Plan Report • Generated ${new Date().toLocaleDateString()}</p><h2>Citywide Summary</h2><p>This report summarizes current registry, budget, and active program figures available to KABISIG. It does not create or modify database records.</p><div class="summary"><div>Barangays<b>${barangays.length}</b></div><div>Registered youth<b>${totalYouthPop.toLocaleString()}</b></div><div>Allocated budget<b>₱${totalCityBudget.toLocaleString()}</b></div><div>Active programs<b>${totalActivePrograms}</b></div></div><h2>Barangay Indicators</h2><table><thead><tr><th>Barangay</th><th>Registered youth</th><th>Allocated budget</th><th>Spent</th><th>Active programs</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  const displayBarangayName = (name: string) => name === 'Igualdad Interior' ? 'Igualdad' : name;

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#f8fafc] overflow-hidden font-sans text-slate-800">
      
      {/* MOBILE TOP HEADER BAR */}
      <div className="lg:hidden bg-[#091d64] text-white px-4 py-3 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2">
          <KabisigLogo className="scale-75" />
          <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded text-amber-300">Super Admin</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* MOBILE DRAWER OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 lg:hidden flex flex-col justify-between p-6 animate-in fade-in duration-200">
          <div className="space-y-6 overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <KabisigLogo className="scale-90" />
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="space-y-2">
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-wider mb-2">
                Municipal System Administration
              </div>
              <button
                onClick={() => { setActiveMenu('dashboard'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 ${activeMenu === 'dashboard' ? 'bg-[#091d64] text-white shadow-md' : 'text-slate-200 hover:bg-white/10'}`}
              >
                <LayoutDashboard className="w-4.5 h-4.5 text-amber-400" />
                Dashboard
              </button>
              <button
                onClick={() => { setActiveMenu('barangays'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 ${activeMenu === 'barangays' ? 'bg-[#091d64] text-white shadow-md' : 'text-slate-200 hover:bg-white/10'}`}
              >
                <Building2 className="w-4.5 h-4.5 text-amber-400" />
                Barangay Management
              </button>
              <button
                onClick={() => { setActiveMenu('analytics'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 ${activeMenu === 'analytics' ? 'bg-[#091d64] text-white shadow-md' : 'text-slate-200 hover:bg-white/10'}`}
              >
                <BarChart3 className="w-4.5 h-4.5 text-amber-400" />
                Analytics & LYDP Reports
              </button>
              <button
                onClick={() => { setActiveMenu('audit'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 ${activeMenu === 'audit' ? 'bg-[#091d64] text-white shadow-md' : 'text-slate-200 hover:bg-white/10'}`}
              >
                <History className="w-4.5 h-4.5 text-amber-400" />
                Audit Logs
              </button>
            </nav>
          </div>

          <div className="pt-4 border-t border-white/10">
            <button
              onClick={onLogout}
              className="w-full py-3 bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>
        </div>
      )}

      {/* LEFT SIDEBAR - DESKTOP ONLY */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-100 flex-col justify-between h-full flex-shrink-0 z-40 shadow-xs">
        <div className="flex flex-col h-full overflow-y-auto">
          <div className="p-6 pb-4 border-b border-slate-50 flex flex-col items-center">
            <KabisigLogo className="scale-90" />
          </div>

          <nav className="p-4 space-y-1">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 px-2 mt-2">
              Municipal System Administration
            </div>
            
            <button
              onClick={() => setActiveMenu('dashboard')}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer ${
                activeMenu === 'dashboard' 
                  ? 'bg-[#091d64] text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#091d64]'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 ${activeMenu === 'dashboard' ? 'text-white' : 'text-slate-400'}`} />
              Dashboard
            </button>

            <button
              onClick={() => setActiveMenu('barangays')}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer ${
                activeMenu === 'barangays' 
                  ? 'bg-[#091d64] text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#091d64]'
              }`}
            >
              <Building2 className={`w-4 h-4 ${activeMenu === 'barangays' ? 'text-white' : 'text-slate-400'}`} />
              Barangay Management
            </button>

            <button
              onClick={() => setActiveMenu('analytics')}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer ${
                activeMenu === 'analytics' 
                  ? 'bg-[#091d64] text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#091d64]'
              }`}
            >
              <BarChart3 className={`w-4 h-4 ${activeMenu === 'analytics' ? 'text-white' : 'text-slate-400'}`} />
              Analytics
            </button>

            <button
              onClick={() => setActiveMenu('audit')}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer ${
                activeMenu === 'audit' 
                  ? 'bg-[#091d64] text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#091d64]'
              }`}
            >
              <History className={`w-4 h-4 ${activeMenu === 'audit' ? 'text-white' : 'text-slate-400'}`} />
              Audit Logs
            </button>

            <div className="pt-4 mt-2 border-t border-slate-100">
              <button
                onClick={onLogout}
                className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                Log Out
              </button>
            </div>
          </nav>
        </div>
      </aside>

      {/* RIGHT CONTAINER */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* DESKTOP TOP HEADER */}
        <header className="hidden lg:flex bg-white border-b border-slate-100 h-20 items-center justify-between px-8 flex-shrink-0 z-30">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="font-sans font-bold text-[#091d64] text-2xl tracking-tight leading-none">
                {activeMenu === 'dashboard' && 'City-Wide Federation Oversight'}
                {activeMenu === 'barangays' && 'Barangay Tenant Management'}
                {activeMenu === 'analytics' && 'Municipal Youth Analytics & LYDP Reports'}
                {activeMenu === 'audit' && 'System Audit Trails & Compliance Logs'}
              </h1>
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#091d64] text-white">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Naga City SK Federation Central Management Hub</p>
          </div>

          <div className="flex items-center gap-5">
            <UserMenu 
              userName="Federation President"
              role="SK Federation President"
              onLogout={onLogout}
            />
          </div>
        </header>

        {/* MAIN WORKSPACE CONTENT */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8 pb-24 sm:pb-8 bg-[#f8fafc]">
          
          {/* ==================== 1. DASHBOARD TAB ==================== */}
          {activeMenu === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-200 text-left">
              
              {/* TOP METRIC CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Barangays</span>
                    <div className="p-2 rounded-xl bg-blue-50 text-[#091d64]">
                      <Building2 className="w-5 h-5" />
                    </div>
                  </div>
                  <span className="text-3xl font-black text-[#091d64] block">{barangays.length}</span>
                  <p className="text-[11px] text-slate-400 font-medium">Component Barangays Connected</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <span className="text-3xl font-black text-[#091d64] block">{totalYouthPop.toLocaleString()}</span>
                  <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                    {totalYouthPop > 0 ? (
                      <>
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-bold">{totalYouthPop} Registered KK Members</span>
                      </>
                    ) : (
                      '0 Registered KK Members'
                    )}
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total City AIP Budget</span>
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                      <Wallet className="w-5 h-5" />
                    </div>
                  </div>
                  <span className="text-3xl font-black text-emerald-600 block">
                    {totalCityBudget > 0 ? `₱${(totalCityBudget / 1000000).toFixed(1)}M` : '₱0'}
                  </span>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {totalCitySpent > 0 ? `₱${(totalCitySpent / 1000000).toFixed(1)}M Spent (${avgBudgetUtilization}%)` : '₱0 Spent (0%)'}
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Youth Programs</span>
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                      <Calendar className="w-5 h-5" />
                    </div>
                  </div>
                  <span className="text-3xl font-black text-amber-600 block">{totalActivePrograms}</span>
                  <p className="text-[11px] text-slate-400 font-medium">Across all 27 Barangays</p>
                </div>
              </div>

              {/* CITY-WIDE QUICK ACTIONS BAR */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl text-slate-800 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Super Admin Tools</span>
                  <h3 className="font-sans font-black text-lg text-slate-900">Super Admin Quick Actions</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={() => setActiveMenu('barangays')}
                    className="px-4 py-2.5 bg-white text-[#091d64] hover:bg-blue-50 font-bold rounded-xl text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-xs border border-slate-200"
                  >
                    <Building2 className="w-4 h-4" /> Manage Barangays
                  </button>
                  <button
                    onClick={() => handleOpenAssignModal()}
                    className="px-4 py-2.5 bg-[#091d64] text-white hover:bg-[#102a83] font-bold rounded-xl text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <ShieldCheck className="w-4 h-4" /> Assign Chairperson
                  </button>
                  <button 
                    onClick={() => setShowLydpModal(true)}
                    className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-extrabold rounded-xl text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <FileText className="w-4 h-4" /> Generate LYDP Report
                  </button>
                </div>
              </div>

              {/* OVERVIEW CHARTS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* BAR CHART: YOUTH POPULATION PER BARANGAY */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs lg:col-span-2 space-y-4 min-w-0">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="font-sans font-bold text-slate-800 text-sm">Registered KK Members by Barangay</h4>
                      <p className="text-xs text-slate-400">Active youth constituent accounts in the current federation registry</p>
                    </div>
                  </div>
                  <div className="h-64 w-full min-w-0 overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                      <BarChart data={analyticsChartData}>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                        <YAxis stroke="#94a3b8" fontSize={10} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="registeredYouth" fill="#2563eb" name="Registered KK Members" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* PIE CHART: BUDGET ALLOCATION BREAKDOWN */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4 min-w-0">
                  <div className="border-b border-slate-100 pb-3">
                    <h4 className="font-sans font-bold text-slate-800 text-sm">Municipal Budget Allocation</h4>
                    <p className="text-xs text-slate-400">Current-year allocations grouped by database category</p>
                  </div>
                  {pieBudgetData.length === 0 ? (
                    <div className="h-52 w-full flex flex-col items-center justify-center text-center p-4">
                      <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-2 font-bold text-lg">
                        ₱0
                      </div>
                      <p className="text-xs font-bold text-slate-700">No Budget Categories Found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">No current-year budget records were returned by the API</p>
                    </div>
                  ) : (
                    <div className="h-52 w-full min-w-0 overflow-hidden">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                        <PieChart>
                          <Pie data={pieBudgetData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35} paddingAngle={3}>
                            {pieBudgetData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => `₱${(value / 1000000).toFixed(2)}M`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    {pieBudgetData.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px] font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-600 truncate max-w-[140px]">{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-900">
                          {item.value > 0 ? `₱${(item.value / 1000000).toFixed(1)}M` : '₱0'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* TOP PERFORMING BARANGAYS QUICK TABLE */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-sans font-bold text-slate-800 text-sm">Component Barangay Performance Overview</h4>
                    <p className="text-xs text-slate-400">Budget utilization rate & ABYIP compliance status</p>
                  </div>
                  <button 
                    onClick={() => setActiveMenu('barangays')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    View All {barangays.length} Barangays →
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="p-3">Barangay</th>
                        <th className="p-3">SK Chairperson</th>
                        <th className="p-3">Registered Youth</th>
                        <th className="p-3">Total AIP Budget</th>
                        <th className="p-3">Budget Spent</th>
                        <th className="p-3">Utilization Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium">
                      {sortedBarangays.slice(0, 5).map(b => {
                        const liveRow = federationRows.find((row: any) => row.id === b.id);
                        const registeredYouth = toNumber(liveRow?.registered_youth ?? b.youthPopulation);
                        const totalBudget = toNumber(liveRow?.budget_allocated ?? b.totalBudget);
                        const spent = toNumber(liveRow?.budget_spent ?? b.spentBudget);
                        const rate = totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0;
                        return (
                          <tr key={b.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-[#091d64]">
                              <div className="flex items-center gap-2">
                                {b.logo ? (
                                  <img src={b.logo} alt="" className="w-6 h-6 rounded-lg object-contain border border-slate-200 bg-white p-0.5 flex-shrink-0" />
                                ) : (
                                  <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#091d64] font-bold text-[10px] flex items-center justify-center border border-indigo-100 flex-shrink-0">
                                    {b.name.charAt(0)}
                                  </div>
                                )}
                                <span>Brgy. {displayBarangayName(b.name)}</span>
                              </div>
                            </td>
                            <td className="p-3 font-semibold">
                              {b.chairperson && b.chairperson !== 'Unassigned' ? (
                                <div className="flex items-center gap-1.5">
                                  <span>{b.chairperson}</span>
                                  <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Assigned
                                  </span>
                                </div>
                              ) : (
                                <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-amber-50 text-amber-700 border border-amber-200">
                                  Unassigned
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-mono">{registeredYouth.toLocaleString()}</td>
                            <td className="p-3 font-mono font-bold text-slate-800">₱{totalBudget.toLocaleString()}</td>
                            <td className="p-3 font-mono text-emerald-700">₱{spent.toLocaleString()}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-300 ${rate > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} 
                                    style={{ width: `${rate}%` }} 
                                  />
                                </div>
                                <span className={`text-[11px] font-bold ${rate > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>{rate}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ==================== 2. BARANGAYS TAB ==================== */}
          {activeMenu === 'barangays' && (
            <div className="space-y-6 animate-in fade-in duration-200 text-left">
              
              {/* CONTROL & FILTER BAR */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input 
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search barangay name, chairperson, or email..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#091d64]"
                    />
                  </div>

                  {/* District Filter */}
                  <select 
                    value={districtFilter}
                    onChange={(e) => setDistrictFilter(e.target.value as any)}
                    className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#091d64] cursor-pointer"
                  >
                    <option value="All">All SK Districts</option>
                    <option value="North">North (8 Barangays)</option>
                    <option value="South">South (6 Barangays)</option>
                    <option value="West">West (7 Barangays)</option>
                    <option value="East">East (6 Barangays)</option>
                  </select>
                  <select
                    value={chairpersonFilter}
                    onChange={(e) => setChairpersonFilter(e.target.value as typeof chairpersonFilter)}
                    aria-label="Filter barangays by SK Chairperson assignment"
                    className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#091d64] cursor-pointer"
                  >
                    <option value="All">All Chairperson statuses</option>
                    <option value="Assigned">Chairperson assigned</option>
                    <option value="Unassigned">No Chairperson assigned</option>
                  </select>

                </div>

                <div className="text-xs text-slate-500 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{filteredBarangays.length} of 27 Naga Barangays</span>
                </div>
              </div>

              {/* DATA TABLE: BARANGAY NAME | SK DISTRICT | ASSIGNED CHAIRPERSON | STATUS | ACTION */}
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                      <tr>
                        <th className="py-3.5 px-4 font-bold">Barangay Name</th>
                        <th className="py-3.5 px-4 font-bold">SK District</th>
                        <th className="py-3.5 px-4 font-bold">Assigned Chairperson</th>
                        <th className="py-3.5 px-4 font-bold">Status</th>
                        <th className="py-3.5 px-4 text-right font-bold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredBarangays.map(b => {
                        const bDistrict = b.skDistrict || BARANGAY_SK_DISTRICTS[b.name] || 'Unassigned';
                        const isAssigned = b.chairperson && b.chairperson.trim() !== '' && b.chairperson.toLowerCase() !== 'unassigned';

                        return (
                          <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Barangay Name */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                {b.logo ? (
                                  <img 
                                    src={b.logo} 
                                    alt={b.name} 
                                    className="w-9 h-9 rounded-xl object-contain bg-white border border-slate-200 p-0.5 shadow-2xs shrink-0" 
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#091d64] font-bold text-xs flex items-center justify-center border border-blue-100 shrink-0">
                                    {b.name.charAt(0)}
                                  </div>
                                )}
                                <div>
                                  <span className="font-bold text-slate-900 block text-xs">Brgy. {displayBarangayName(b.name)}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">ID: {b.id.slice(0, 8)}...</span>
                                </div>
                              </div>
                            </td>

                            {/* District */}
                            <td className="py-3.5 px-4">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                bDistrict === 'North'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200/80'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
                              }`}>
                                {bDistrict}
                              </span>
                            </td>

                            {/* Assigned Chairperson (Name & Email) */}
                            <td className="py-3.5 px-4">
                              {isAssigned ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 text-xs">
                                      {b.chairperson === 'Pending Invitation' ? 'Pending Invitation' : b.chairperson}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Assigned
                                    </span>
                                  </div>
                                  {b.chairpersonEmail ? (
                                    <span className="text-[11px] text-slate-500 font-mono block">
                                      {b.chairpersonEmail}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic block">No email recorded</span>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                      Unassigned
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-400 italic block">
                                    No chairperson assigned yet
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                b.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                {b.status}
                              </span>
                            </td>

                            {/* Action */}
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => handleEditClick(b)}
                                className="p-1.5 text-slate-500 hover:text-[#091d64] hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 cursor-pointer"
                                title="Configure AIP Budget & Settings"
                              >
                                <Settings className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ==================== 3. ANALYTICS TAB ==================== */}
          {activeMenu === 'analytics' && (
            <div className="space-y-6 animate-in fade-in duration-200 text-left">
              
              {/* ANALYTICS FILTER BAR */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search barangay name, chairperson, or email..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#091d64]"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(['All', 'North', 'South', 'West', 'East'] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => setDistrictFilter(d)}
                      className={`px-3 py-2 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                        districtFilter === d
                          ? 'bg-[#091d64] text-white shadow-xs'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {d === 'All' ? 'All Districts' : `${d} District`}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                  {filteredBarangays.length} of {sortedBarangays.length} barangays
                </div>
              </div>
              
              {/* LYDP REPORT GENERATOR BANNER */}
              <div className="bg-gradient-to-r from-[#091d64] via-[#102a83] to-[#1e3a8a] p-6 rounded-2xl text-white shadow-md flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-400 text-amber-950">
                      RA 10742 Compliance
                    </span>
                    <span className="text-xs text-blue-200 font-medium">Local Youth Development Plan (LYDP 2026-2029)</span>
                  </div>
                  <h3 className="font-sans font-black text-xl">Municipal Youth Development Master Plan Analytics</h3>
                  <p className="text-xs text-blue-100 max-w-2xl">
                    Aggregated comparative indicators for the 3-Year LYDP strategic priority pillars across all 27 component barangays.
                  </p>
                </div>
                <button 
                  onClick={() => setShowLydpModal(true)}
                  className="px-4 py-2.5 bg-[#091d64] hover:bg-[#122878] text-white font-bold rounded-xl text-xs flex items-center gap-2 shrink-0"
                >
                  <FileText className="w-4 h-4" /> Generate Official LYDP Report
                </button>
              </div>

              {/* COMPARISON CHARTS GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* CHART 1: YOUTH REGISTRATION COMPARISON */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4 min-w-0">
                  <div className="border-b border-slate-100 pb-3">
                    <h4 className="font-sans font-bold text-slate-800 text-sm">Registered Youth by Barangay</h4>
                    <p className="text-xs text-slate-400">Active youth constituent accounts in the current federation registry</p>
                  </div>
                  <div className="h-64 w-full min-w-0 overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                      <BarChart data={analyticsChartData}>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                        <YAxis stroke="#94a3b8" fontSize={10} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="registeredYouth" fill="#3b82f6" name="KK Registered" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* CHART 2: BUDGET VS SPENT COMPARISON */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4 min-w-0">
                  <div className="border-b border-slate-100 pb-3">
                    <h4 className="font-sans font-bold text-slate-800 text-sm">AIP Budget Allocation vs. Actual Expenditure (in ₱1k)</h4>
                    <p className="text-xs text-slate-400">Financial execution tracking across component barangays</p>
                  </div>
                  <div className="h-64 w-full min-w-0 overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                      <BarChart data={analyticsChartData}>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                        <YAxis stroke="#94a3b8" fontSize={10} />
                        <Tooltip formatter={(val: number) => `₱${val}k`} />
                        <Legend />
                        <Bar dataKey="budget" fill="#059669" name="Total AIP Budget" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="spent" fill="#10b981" name="Actual Spent" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              <ProgramTrendD3 data={programTrendData} />

              {/* DETAILED BARANGAYS COMPARISON TABLE */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-sans font-bold text-slate-800 text-sm">Barangay Performance & Metrics Matrix</h4>
                    <p className="text-xs text-slate-400">Comprehensive municipal statistics table</p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="p-3">Barangay Name</th>
                        <th className="p-3">SK Chairperson</th>
                        <th className="p-3">Registered Youth</th>
                        <th className="p-3">AIP Budget</th>
                        <th className="p-3">Budget Spent</th>
                        <th className="p-3">Utilization Rate</th>
                        <th className="p-3">Active Programs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium">
                      {sortedBarangays.map(b => {
                        const liveRow = federationRows.find((row: any) => row.id === b.id);
                        const registeredYouth = toNumber(liveRow?.registered_youth ?? b.youthPopulation);
                        const totalBudget = toNumber(liveRow?.budget_allocated ?? b.totalBudget);
                        const spentBudget = toNumber(liveRow?.budget_spent ?? b.spentBudget);
                        const activePrograms = toNumber(liveRow?.active_programs ?? b.activePrograms);
                        const rate = totalBudget > 0 ? Math.round((spentBudget / totalBudget) * 100) : 0;
                        return (
                          <tr key={b.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-[#091d64]">Brgy. {displayBarangayName(b.name)}</td>
                            <td className="p-3 font-semibold">{b.chairperson}</td>
                            <td className="p-3 font-mono">{registeredYouth.toLocaleString()}</td>
                            <td className="p-3 font-mono font-bold text-slate-800">₱{totalBudget.toLocaleString()}</td>
                            <td className="p-3 font-mono text-emerald-700">₱{spentBudget.toLocaleString()}</td>
                            <td className="p-3 font-bold text-emerald-800">{rate}%</td>
                            <td className="p-3 font-mono">{activePrograms} Programs</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ==================== 4. AUDIT LOGS TAB ==================== */}
          {activeMenu === 'audit' && (
            <div className="space-y-6 animate-in fade-in duration-200 text-left">
              
              {/* COMPLIANCE TRACKING DASHBOARD PANEL */}

              {/* AUDIT LOGS TABLE */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-blue-50 text-[#091d64] font-black text-[10px] rounded uppercase tracking-wider">
                        FEDERATION SYSTEM AUDIT TRAIL
                      </span>
                    </div>
                    <h4 className="font-sans font-bold text-slate-800 text-sm mt-1">System Audit Log</h4>
                    <p className="text-xs text-slate-400">Database audit events across barangays and system roles</p>
                  </div>

                  <div className="relative min-w-[220px] w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={auditSearchTerm}
                      onChange={(e) => setAuditSearchTerm(e.target.value)}
                      placeholder="Search audit logs..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#091d64]"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">SK Chairperson & Barangay</th>
                        <th className="p-3">Action Code</th>
                        <th className="p-3">Activity & Executive Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium">
                      {filteredAuditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="p-3 font-bold text-slate-800">
                            <span className="text-[#091d64]">{log.user}</span>
                            <span className="block text-[10px] text-slate-400 font-semibold">{log.role === 'Barangay Admin' ? 'SK Chairperson' : log.role}</span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-mono font-bold text-[11px]">
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">{log.details}</td>
                        </tr>
                      ))}
                      {filteredAuditLogs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-slate-400 font-bold">
                            No audit records found matching the search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* LYDP REPORT GENERATOR PREVIEW MODAL */}
      {showLydpModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#091d64] p-6 text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">LYDP REPORT PREVIEW</span>
                <h3 className="font-sans font-black text-lg">Local Youth Development Plan (LYDP FY 2026-2029)</h3>
              </div>
              <button onClick={() => setShowLydpModal(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700 text-left max-h-[70vh] overflow-y-auto">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <h4 className="font-extrabold text-slate-900 text-sm">Naga City SK Federation - 3-Year LYDP Summary</h4>
                <p className="text-slate-600">
                  Current KABISIG snapshot: {barangays.length} barangays, {totalYouthPop.toLocaleString()} registered youth, and {totalActivePrograms} active programs. Figures reflect loaded records, not a certified population estimate.
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">Strategic Priority Pillars:</h5>
                
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                  <span className="font-bold text-[#091d64] block">1. Governance & Active Citizenship</span>
                  <p className="text-slate-600 text-[11px] mt-0.5">Planning theme for assemblies, civic participation, and transparent financial disclosures.</p>
                </div>

                <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                  <span className="font-bold text-emerald-800 block">2. Education, Livelihood & Skills Empowerment</span>
                  <p className="text-slate-600 text-[11px] mt-0.5">Planning theme for education assistance, livelihood access, and digital skills workshops.</p>
                </div>

                <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
                  <span className="font-bold text-amber-900 block">3. Health, Sports & Anti-Drug Risk Prevention</span>
                  <p className="text-slate-600 text-[11px] mt-0.5">Planning theme for sports participation, health promotion, and peer support.</p>
                </div>

                <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-lg">
                  <span className="font-bold text-purple-900 block">4. Climate Action & Environmental Protection</span>
                  <p className="text-slate-600 text-[11px] mt-0.5">Planning theme for local climate action and environmental protection.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setShowLydpModal(false)} className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100">
                Close
              </button>
              <button 
                onClick={handleDownloadLydpReport}
                className="px-5 py-2 bg-[#091d64] text-white text-xs font-bold rounded-xl hover:bg-opacity-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED ASSIGN SK CHAIRPERSON MODAL (ONLY CHAIRPERSON EMAIL) */}
      {showAssignModal && assigningBarangay && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#091d64] p-5 text-white flex justify-between items-center text-left">
              <div>
                <h3 className="font-sans font-black text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-300" />
                  Assign SK Chairperson
                </h3>
                <p className="text-xs text-blue-100">Barangay {assigningBarangay.name} • Naga City Multi-Tenant Registry</p>
              </div>
              <button 
                onClick={() => { setShowAssignModal(false); setAssigningBarangay(null); }} 
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

              <form onSubmit={handleAssignChairpersonSubmit} className="p-6 space-y-4 text-left text-xs">

                {/* Selected Barangay Card */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {assigningBarangay.logo ? (
                      <img 
                        src={assigningBarangay.logo} 
                        alt="" 
                        className="w-10 h-10 rounded-xl object-contain bg-white border border-slate-200 p-0.5 shrink-0" 
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#091d64] font-bold text-xs flex items-center justify-center border border-blue-100 shrink-0">
                        {assigningBarangay.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 font-semibold block">Target Jurisdiction</span>
                      <h4 className="font-extrabold text-[#091d64] text-xs">Barangay {assigningBarangay.name}</h4>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {assigningBarangay.skDistrict || BARANGAY_SK_DISTRICTS[assigningBarangay.name] || 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* Target Barangay Selector */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Change Target Barangay (27 Naga Barangays)
                  </label>
                  <select
                    value={assigningBarangay.id}
                    onChange={(e) => {
                      const selected = barangays.find(b => b.id === e.target.value);
                      if (selected) {
                        setAssigningBarangay(selected);
                        setAssignEmail(selected.chairpersonEmail || '');
                        setAssignError(null);
                      }
                    }}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-[#091d64] focus:outline-none cursor-pointer"
                  >
                    {sortedBarangays.map(b => (
                      <option key={b.id} value={b.id}>
                        Barangay {b.name} ({b.chairperson && b.chairperson !== 'Unassigned' ? `Assigned: ${b.chairperson}` : 'Unassigned'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chairperson Official Email Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Chairperson Official Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input 
                      type="email"
                      value={assignEmail}
                      onChange={(e) => setAssignEmail(e.target.value)}
                      placeholder="chairperson.example@naga.gov.ph"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#091d64] focus:border-[#091d64] font-mono"
                      required
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Enter ONLY the Chairperson's email. An invitation link will be triggered.
                  </p>
                </div>

                {/* Onboarding Notice */}
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    The backend sets the user's role to <strong>BARANGAY_ADMIN</strong> bound to <strong>Barangay {assigningBarangay.name}</strong>. The Chairperson will be prompted to create their password and confirm it upon sign in.
                  </p>
                </div>

                {assignNotice?.type === 'success' && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-emerald-800">
                    <p className="text-xs font-bold">{assignNotice.text}</p>
                    {chairpersonSetupLink && (
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={chairpersonSetupLink}
                          aria-label="Chairperson setup link"
                          className="min-w-0 flex-1 px-2 py-1.5 border border-emerald-200 rounded-lg bg-white text-[10px] font-mono"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(chairpersonSetupLink);
                              setCopiedLink(true);
                            } catch {
                              setCopiedLink(false);
                            }
                          }}
                          className="px-2.5 py-1.5 bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> {copiedLink ? 'Copied' : 'Copy Link'}
                        </button>
                      </div>
                    )}
                    {!chairpersonSetupLink && <p className="text-[10px]">No setup link was returned. The invitation status is shown above.</p>}
                  </div>
                )}

                {assignError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{assignError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button 
                    type="button"
                    disabled={isAssigning}
                    onClick={() => { setShowAssignModal(false); setAssigningBarangay(null); }}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isAssigning}
                    className="px-5 py-2 bg-[#091d64] hover:bg-[#112d75] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
                  >
                    {isAssigning ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        <span>Dispatching Invitation...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                        <span>Send Invitation & Assign</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
          </div>
        </div>
      )}

      {/* TENANT CONFIGURATION & SK CHAIRPERSON ASSIGNMENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#091d64] p-5 text-white flex justify-between items-center text-left">
              <div>
                <h3 className="font-sans font-black text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-300" />
                  Configure Barangay {editingBarangay?.name || ''}
                </h3>
                <p className="text-xs text-blue-100">Citywide Cross-Tenant Administration • Official Naga City 27-Barangay Registry</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-left text-xs font-semibold">
              {modalNotice && (
                <div className={`p-3 rounded-xl border flex items-start gap-2 ${modalNotice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                  {modalNotice.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{modalNotice.text}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Barangay Name
                  </label>
                  <input
                    type="text"
                    value={modalForm.name}
                    readOnly
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-100 text-slate-700 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Barangay ID
                  </label>
                  <input
                    type="text"
                    value={editingBarangay?.id || ''}
                    readOnly
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-100 text-slate-700 font-mono"
                  />
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Logo
                      </label>
                      <p className="text-[10px] text-slate-500">This can be changed anytime.</p>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xs">
                      {modalForm.logo ? (
                        <img
                          src={modalForm.logo}
                          alt="Barangay Logo Preview"
                          className="w-full h-full object-contain rounded-xl"
                        />
                      ) : (
                        <div className="text-center text-slate-400">
                          <ImageIcon className="w-6 h-6 mx-auto mb-0.5 text-slate-300" />
                          <span className="text-[8px] font-bold block uppercase">No Seal</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <label className="px-3 py-1.5 bg-[#091d64] hover:bg-[#122e7d] text-white text-[11px] font-bold rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    {modalForm.logo && (
                      <button
                        type="button"
                        onClick={() => setModalForm(prev => ({ ...prev, logo: '' }))}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">SK Chairperson</span>
                    <span className="block mt-1 text-xs font-bold text-slate-800">{editingBarangay?.chairperson || 'Unassigned'}</span>
                    <span className="block text-[10px] text-slate-500">{editingBarangay?.chairpersonEmail || 'No email recorded'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const barangay = editingBarangay;
                      setShowModal(false);
                      if (barangay) handleOpenAssignModal(barangay);
                    }}
                    className="px-3 py-2 bg-[#091d64] text-white rounded-lg text-[10px] font-bold whitespace-nowrap"
                  >
                    Assign / Reassign
                  </button>
                </div>

              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button 
                  disabled={isSaving}
                  onClick={() => setShowModal(false)} 
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  disabled={isSaving}
                  onClick={handleSaveBarangay} 
                  className="px-5 py-2 bg-[#091d64] text-white text-xs font-bold rounded-xl hover:bg-opacity-95 cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <span>Save Barangay Settings</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 flex justify-around items-center z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <button
          onClick={() => setActiveMenu('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeMenu === 'dashboard' ? 'text-[#091d64] font-extrabold bg-blue-50/80' : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 ${activeMenu === 'dashboard' ? 'text-[#091d64] scale-110' : 'text-slate-400'} transition-transform`} />
          <span className="text-[10px] mt-0.5 tracking-tight font-sans">Dashboard</span>
        </button>

        <button
          onClick={() => setActiveMenu('barangays')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeMenu === 'barangays' ? 'text-[#091d64] font-extrabold bg-blue-50/80' : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
        >
          <Building2 className={`w-5 h-5 ${activeMenu === 'barangays' ? 'text-[#091d64] scale-110' : 'text-slate-400'} transition-transform`} />
          <span className="text-[10px] mt-0.5 tracking-tight font-sans">Barangays</span>
        </button>

        <button
          onClick={() => setActiveMenu('analytics')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeMenu === 'analytics' ? 'text-[#091d64] font-extrabold bg-blue-50/80' : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
        >
          <BarChart3 className={`w-5 h-5 ${activeMenu === 'analytics' ? 'text-[#091d64] scale-110' : 'text-slate-400'} transition-transform`} />
          <span className="text-[10px] mt-0.5 tracking-tight font-sans">Analytics</span>
        </button>

        <button
          onClick={() => setActiveMenu('audit')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeMenu === 'audit' ? 'text-[#091d64] font-extrabold bg-blue-50/80' : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
        >
          <History className={`w-5 h-5 ${activeMenu === 'audit' ? 'text-[#091d64] scale-110' : 'text-slate-400'} transition-transform`} />
          <span className="text-[10px] mt-0.5 tracking-tight font-sans">Audit</span>
        </button>
      </div>

    </div>
  );
}
