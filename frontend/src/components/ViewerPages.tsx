import { useEffect, useState } from 'react';
import { 
  Building2, 
  Search, 
  FileText, 
  TrendingUp, 
  Download, 
  Users, 
  ChevronRight, 
  X, 
  BookOpen, 
  ShieldCheck, 
  Bell, 
  MapPin, 
  DollarSign, 
  LogOut,
  Menu,
  UserPlus,
  Home,
  CheckCircle2,
  PieChart as PieChartIcon,
  Award,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { 
  BarangayTenant, 
  Program, 
  ResolutionRecord, 
  ExpenseRecord, 
  AnnouncementRecord,
  DocumentRecord,
  YouthProfile
} from '../types';
import { KabisigLogo } from './PublicPages';
import { kabisigApi } from '../lib/api';

interface ViewerPagesProps {
  tenants: BarangayTenant[];
  programs: Program[];
  youthProfiles?: YouthProfile[];
  documents?: DocumentRecord[];
  resolutions: ResolutionRecord[];
  expenses: ExpenseRecord[];
  announcements: AnnouncementRecord[];
  onLogout: () => void;
  onNavigateSignUp?: () => void;
}

export default function ViewerPages({
  tenants,
  programs,
  youthProfiles = [],
  documents = [],
  resolutions,
  expenses,
  announcements,
  onLogout,
  onNavigateSignUp
}: ViewerPagesProps) {
  // Navigation: 'home' | 'transparency' | 'announcements'
  const [activeMenu, setActiveMenu] = useState<'home' | 'transparency' | 'announcements'>('home');

  // Sub-tab inside Transparency: 'financial' | 'demographics' | 'fpd' | 'auditing'
  const [transparencySubTab, setTransparencySubTab] = useState<'financial' | 'demographics' | 'fpd' | 'auditing'>('financial');

  // --- Public demographics (anonymized aggregate) ---
  const [publicDemographics, setPublicDemographics] = useState<any>(null);
  const [publicDemographicsLoading, setPublicDemographicsLoading] = useState(false);

  useEffect(() => {
    if (activeMenu !== 'transparency' || transparencySubTab !== 'demographics') return;
    let isMounted = true;
    setPublicDemographicsLoading(true);
    kabisigApi.getPublicDemographics()
      .then((d) => { if (isMounted) setPublicDemographics(d); })
      .catch(() => {})
      .finally(() => { if (isMounted) setPublicDemographicsLoading(false); });
    return () => { isMounted = false; };
  }, [activeMenu, transparencySubTab]);

  // Search & Filter state
  const [selectedBarangayId, setSelectedBarangayId] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [announcementSearch, setAnnouncementSearch] = useState('');

  const downloadPublicCOAPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for this website to export the PDF report.');
      return;
    }
    const targetBgy = selectedBarangayId === 'All' ? 'City-Wide Naga Federation' : tenants.find(t => t.id === selectedBarangayId)?.name || 'Barangay';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Public COA Ledger Audit Report - ${targetBgy}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
          body { font-family: 'Poppins', ui-sans-serif, system-ui, sans-serif; color: #1e293b; margin: 0; padding: 40px; background: #ffffff; }
          .header { text-align: center; border-bottom: 3px solid #091d64; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { font-size: 13px; font-weight: 700; color: #64748b; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
          .header h2 { font-size: 20px; font-weight: 800; color: #091d64; margin: 5px 0; }
          .header p { font-size: 12px; color: #64748b; margin: 0; }
          .section-title { font-size: 13px; font-weight: 800; color: #091d64; background: #eff6ff; padding: 8px 12px; border-left: 4px solid #091d64; margin: 25px 0 15px 0; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
          th { background: #091d64; color: #ffffff; font-weight: 700; text-align: left; padding: 10px; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .badge { display: inline-block; padding: 3px 8px; font-size: 10px; font-weight: 700; border-radius: 4px; background: #ecfdf5; color: #065f46; }
          .footer { margin-top: 50px; text-align: right; font-size: 12px; color: #475569; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Republic of the Philippines &bull; City of Naga</h1>
          <h2>Sangguniang Kabataan Federation Public Disclosure</h2>
          <p>Official Public COA Financial & Expenditure Audit Report &bull; ${targetBgy} &bull; Date: ${new Date().toLocaleDateString()}</p>
        </div>

        <div class="section-title">I. Audited Disbursement Vouchers & Statutory Tax Ledger</div>
        <table>
          <thead>
            <tr>
              <th>Voucher #</th>
              <th>Barangay</th>
              <th>Payee / Purpose</th>
              <th>AIP Reference</th>
              <th class="text-right">Gross Amount</th>
              <th class="text-right">5% VAT / 1% EWT</th>
              <th class="text-center">COA Audit Status</th>
            </tr>
          </thead>
          <tbody>
            ${expenses.slice(0, 10).map(e => `
              <tr>
                <td><strong>${e.voucherNumber || 'DV-2026-001'}</strong></td>
                <td>Barangay ${tenants.find(t=>t.id===e.barangayId)?.name || 'Barangay'}</td>
                <td>${e.payee || e.title}</td>
                <td>${e.aipCode || 'AIP-2026-SPT-01'}</td>
                <td class="text-right">₱${e.amount.toLocaleString()}</td>
                <td class="text-right">₱${e.isVat ? Math.round(e.amount * 0.05).toLocaleString() : '0'}</td>
                <td class="text-center"><span class="badge">COA Audited</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Published for Public Transparency per RA 10742 (SK Reform Act of 2015):</p>
          <p style="font-weight: bold; color: #091d64;">NAGA CITY SANGGUNIANG KABATAAN FEDERATION</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Selected announcement for "Read More" Modal
  const [readAnnounce, setReadAnnounce] = useState<AnnouncementRecord | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Derived arrays
  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(announcementSearch.toLowerCase()) || 
                          a.content.toLowerCase().includes(announcementSearch.toLowerCase());
    const matchesBarangay = selectedBarangayId === 'All' ? true : a.barangay === selectedBarangayId;
    return matchesSearch && matchesBarangay;
  });

  const filteredExpenses = expenses.filter(e => {
    const matchesBarangay = selectedBarangayId === 'All' ? true : e.programTitle.includes(selectedBarangayId);
    const matchesCategory = selectedCategory === 'All' ? true : e.category === selectedCategory;
    return matchesBarangay && matchesCategory;
  });

  // Calculate city wide transparency aggregate statistics
  const totalCityBudget = tenants.reduce((acc, curr) => acc + curr.totalBudget, 0);
  const totalCitySpent = tenants.reduce((acc, curr) => acc + curr.spentBudget, 0);
  const totalCityYouth = tenants.reduce((acc, curr) => acc + curr.youthPopulation, 0);

  // Demographics aggregation
  const maleCount = youthProfiles.filter(p => p.sex === 'Male').length;
  const femaleCount = youthProfiles.filter(p => p.sex === 'Female').length;
  const scholarCount = youthProfiles.filter(p => p.scholarStatus === 'Scholar').length;

  const genderDemographicData = publicDemographics ? Object.entries(publicDemographics.sex_distribution || {}).map(([k, v]: any) => ({ name: k, value: v, color: k === 'Male' ? '#091d64' : k === 'Female' ? '#d32f2f' : '#94a3b8' })) : [];

  const highSchoolCount = youthProfiles.filter(p => p.educationalLevel === 'High School' || p.educationalLevel === 'Junior High' || p.educationalLevel === 'Senior High').length;
  const collegeCount = youthProfiles.filter(p => p.educationalLevel === 'College' || p.educationalLevel === 'Vocational').length;
  const outOfSchoolCount = youthProfiles.filter(p => p.educationalLevel === 'Out of School Youth' || p.employmentStatus === 'Unemployed').length;

  const educationDemographicData = publicDemographics ? Object.entries(publicDemographics.education_distribution || {}).map(([k, v]: any) => ({ name: k, value: v })) : [];

  // Consistently sort barangays alphabetically
  const sortedTenants = [...tenants].sort((a, b) => a.name.localeCompare(b.name));

  // Recharts Chart F1: City-Wide budget comparison
  const cityWideBarData = sortedTenants.slice(0, 7).map(t => ({
    name: t.name,
    budget: t.totalBudget,
    spent: t.spentBudget
  }));

  // Recharts Pie Chart F2: Category expense allocations
  const suppliesSpent = expenses.filter(e => e.category === 'Supplies').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const honorariumSpent = expenses.filter(e => e.category === 'Honorarium').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const foodSpent = expenses.filter(e => e.category === 'Food & Catering').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const transportSpent = expenses.filter(e => e.category === 'Travel & Transport').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const expenseCategoriesData = [
    { name: 'Supplies', value: suppliesSpent, color: '#1a237e' },
    { name: 'Honorarium', value: honorariumSpent, color: '#d32f2f' },
    { name: 'Food/Catering', value: foodSpent, color: '#fdd835' },
    { name: 'Travel/Transport', value: transportSpent, color: '#78909c' }
  ];

  // FPD Compliance Documents list from live documents
  const fpdDocuments = documents.length > 0 ? documents.map(d => ({
    title: d.title,
    category: d.category || 'Compliance',
    barangay: tenants.find(t => t.id === d.barangayId)?.name || 'Naga City',
    date: d.uploadedDate || d.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    status: d.status || 'Compliant'
  })) : [];

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#f8fafc] overflow-hidden font-sans">
      
      {/* MOBILE TOP HEADER BAR */}
      <div className="lg:hidden bg-[#091d64] text-white px-4 py-3 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2">
          <KabisigLogo className="scale-75" />
          <span className="text-[10px] font-bold bg-[#1e3a8a] px-2 py-0.5 rounded text-amber-300">Public Portal</span>
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
                Naga City SK Public Portal
              </div>
              <button
                onClick={() => { setActiveMenu('home'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 ${activeMenu === 'home' ? 'bg-[#091d64] text-white shadow-md' : 'text-slate-200 hover:bg-white/10'}`}
              >
                <Home className="w-4.5 h-4.5 text-amber-400" />
                Home
              </button>
              <button
                onClick={() => { setActiveMenu('transparency'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 ${activeMenu === 'transparency' ? 'bg-[#091d64] text-white shadow-md' : 'text-slate-200 hover:bg-white/10'}`}
              >
                <TrendingUp className="w-4.5 h-4.5 text-amber-400" />
                Transparency Desk
              </button>
              <button
                onClick={() => { setActiveMenu('announcements'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 ${activeMenu === 'announcements' ? 'bg-[#091d64] text-white shadow-md' : 'text-slate-200 hover:bg-white/10'}`}
              >
                <Bell className="w-4.5 h-4.5 text-amber-400" />
                Public Feeds & Bulletins
              </button>
              {onNavigateSignUp && (
                <button
                  onClick={() => { onNavigateSignUp(); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 bg-amber-500 text-slate-900 shadow-md font-sans`}
                >
                  <UserPlus className="w-4.5 h-4.5 text-slate-900" />
                  Register Youth Account
                </button>
              )}
            </nav>
          </div>

          <div className="pt-4 border-t border-white/10">
            <button
              onClick={onLogout}
              className="w-full py-3 bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Exit Public Mode
            </button>
          </div>
        </div>
      )}

      {/* LEFT SIDEBAR - DESKTOP ONLY */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-100 flex-col justify-between h-full flex-shrink-0 z-40">
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Logo Brand Header */}
          <div className="p-6 pb-4 border-b border-slate-50 flex flex-col items-center">
            <KabisigLogo className="scale-90" />
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1 flex-1">
            <button
              onClick={() => setActiveMenu('home')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 ${
                activeMenu === 'home' 
                  ? 'bg-[#eff6ff] text-[#091d64] shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#091d64]'
              }`}
            >
              <Home className={`w-4 h-4 ${activeMenu === 'home' ? 'text-[#091d64]' : 'text-slate-400'}`} />
              Home
            </button>

            <button
              onClick={() => setActiveMenu('transparency')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 ${
                activeMenu === 'transparency' 
                  ? 'bg-[#eff6ff] text-[#091d64] shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#091d64]'
              }`}
            >
              <TrendingUp className={`w-4 h-4 ${activeMenu === 'transparency' ? 'text-[#091d64]' : 'text-slate-400'}`} />
              Transparency
            </button>
            
            <button
              onClick={() => setActiveMenu('announcements')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 ${
                activeMenu === 'announcements' 
                  ? 'bg-[#eff6ff] text-[#091d64] shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#091d64]'
              }`}
            >
              <Bell className={`w-4 h-4 ${activeMenu === 'announcements' ? 'text-[#091d64]' : 'text-slate-400'}`} />
              Announcements
            </button>

            <div className="pt-4 pb-2">
              <span className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest block">System</span>
            </div>

            <button
              onClick={onLogout}
              className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              Exit Public Mode
            </button>
          </nav>
        </div>
      </aside>

      {/* RIGHT WORKSPACE CONTAINER */}
      <div className="flex-grow flex flex-col h-full overflow-hidden">
        
        {/* DESKTOP HEADER */}
        <header className="hidden lg:flex bg-white border-b border-slate-100 h-20 items-center justify-between px-8 flex-shrink-0 z-30">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="font-sans font-bold text-[#091d64] text-2xl tracking-tight leading-none">
                {activeMenu === 'home' && 'Sangguniang Kabataan Public Portal'}
                {activeMenu === 'transparency' && 'SK Transparency & Auditing Portal'}
                {activeMenu === 'announcements' && 'Public Announcements & Feeds'}
              </h1>
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded bg-[#091d64] text-white">
                Public Viewer Mode
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-sans tracking-wide font-semibold mt-1">
              Kabataang Bagong Sistema para sa Inklusibong Gobyerno — Naga City
            </span>
          </div>

          <div className="flex items-center gap-4">
            {onNavigateSignUp && (
              <button
                onClick={onNavigateSignUp}
                className="px-4 py-2 bg-[#091d64] hover:bg-[#122878] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-amber-400" />
                New Youth Registration
              </button>
            )}
            <div className="text-xs font-bold text-slate-600">
              <span className="px-3 py-1.5 bg-[#eff6ff] text-[#091d64] rounded-lg flex items-center gap-1.5 border border-blue-50">
                <Building2 className="w-3.5 h-3.5 text-[#091d64]" />
                Naga City Federation
              </span>
            </div>
          </div>
        </header>

        {/* WORKSPACE AREA */}
        <div className="flex-grow p-3.5 sm:p-6 lg:p-8 pb-24 sm:pb-8 overflow-y-auto">

          {/* ==================== 1. HOME TAB ==================== */}
          {activeMenu === 'home' && (
            <div className="space-y-6">
              
              {/* HERO BANNER & GENERAL SK INFORMATION */}
              <div className="bg-gradient-to-r from-[#091d64] via-[#122878] to-[#1e3a8a] text-white rounded-2xl p-8 shadow-md relative overflow-hidden">
                <div className="max-w-2xl space-y-4 relative z-10">
                  <span className="bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Sangguniang Kabataan Naga City
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                    Empowering Naga's Youth Through Transparent Civic Leadership
                  </h2>
                  <p className="text-xs sm:text-sm text-blue-100 font-medium leading-relaxed">
                    KABISIG (Kabataang Bagong Sistema para sa Inklusibong Gobyerno) provides direct public access to financial audits, youth demographics, active civic programs, and official legislative resolutions across all 27 barangays of Naga City.
                  </p>

                  <div className="pt-2 flex flex-wrap gap-3">
                    <button
                      onClick={() => setActiveMenu('transparency')}
                      className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Explore Public Audits
                    </button>
                    <button
                      onClick={() => setActiveMenu('announcements')}
                      className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Bell className="w-4 h-4 text-amber-400" />
                      View Announcements
                    </button>
                  </div>
                </div>

                <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden lg:block opacity-25 pointer-events-none">
                  <KabisigLogo className="scale-125" />
                </div>
              </div>

              {/* REGISTRATION GATEWAY CARD (MULTI-STEP ONBOARDING ENTRY) */}
              <div 
                onClick={onNavigateSignUp}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center justify-between gap-6 hover:border-[#091d64]/40 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 border border-amber-100 group-hover:scale-105 transition-transform">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-800 group-hover:text-[#091d64] transition-colors">Katipunan ng Kabataan Youth Onboarding</h3>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        Multi-Step Flow
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Are you a Naga City resident aged 15-30? Click here or use the top "New Youth Registration" button to register once through the official multi-step profiling gateway to receive your digital KK ID and access youth scholarships.
                    </p>
                  </div>
                </div>
              </div>

              {/* STATS OVERVIEW */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Barangay Councils</span>
                    <h4 className="text-2xl font-black text-slate-800 mt-1">{tenants.length} Barangays</h4>
                    <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">100% Active Federation</span>
                  </div>
                  <div className="p-3 bg-blue-50 text-[#091d64] rounded-xl">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">City Youth Census</span>
                    <h4 className="text-2xl font-black text-slate-800 mt-1">{totalCityYouth.toLocaleString()}</h4>
                    <span className="text-[10px] text-blue-600 font-bold block mt-0.5">Registered Constituents</span>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Federation Budget</span>
                    <h4 className="text-2xl font-black text-slate-800 mt-1">₱{totalCityBudget.toLocaleString()}</h4>
                    <span className="text-[10px] text-amber-600 font-bold block mt-0.5">Allocated Annual Fund</span>
                  </div>
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Active Initiatives</span>
                    <h4 className="text-2xl font-black text-slate-800 mt-1">{programs.length} Programs</h4>
                    <span className="text-[10px] text-indigo-600 font-bold block mt-0.5">AIP Approved Projects</span>
                  </div>
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* LATEST ANNOUNCEMENTS & FEATURED INITIATIVES */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* LATEST ANNOUNCEMENTS HIGHLIGHT */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-500" /> Latest Public Advisories
                    </h3>
                    <button
                      onClick={() => setActiveMenu('announcements')}
                      className="text-xs font-bold text-[#091d64] hover:underline flex items-center gap-1"
                    >
                      View All <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {announcements.slice(0, 3).map(ann => (
                      <div key={ann.id} className="p-3.5 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-100 transition-colors">
                        <div className="flex justify-between items-center text-[10px] mb-1">
                          <span className="font-extrabold uppercase bg-blue-100 text-[#091d64] px-2 py-0.5 rounded">
                            {ann.category}
                          </span>
                          <span className="text-slate-400 font-mono">{ann.datePosted}</span>
                        </div>
                        <h4 className="font-bold text-xs text-slate-800">{ann.title}</h4>
                        {ann.imageUrl && <img src={ann.imageUrl} alt={`Pubmat for ${ann.title}`} className="mt-2 max-h-32 w-full rounded-md bg-white object-contain" />}
                        {(ann.what || ann.where || ann.when) && (
                          <div className="mt-1 space-y-0.5 text-[10px] text-slate-600">
                            {ann.what && <p><strong>What:</strong> {ann.what}</p>}
                            {ann.where && <p><strong>Where:</strong> {ann.where}</p>}
                            {ann.when && <p><strong>When:</strong> {ann.when}</p>}
                          </div>
                        )}
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{ann.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                              </div>

            </div>
          )}

          {/* ==================== 2. TRANSPARENCY TAB ==================== */}
          {activeMenu === 'transparency' && (
            <div className="space-y-6">
              
              {/* SUB-MODULE SELECTOR HEADERS */}
              <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
                <button
                  onClick={() => setTransparencySubTab('financial')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    transparencySubTab === 'financial'
                      ? 'bg-[#091d64] text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <DollarSign className="w-4 h-4" /> Public Financial Dashboard
                </button>

                <button
                  onClick={() => setTransparencySubTab('demographics')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    transparencySubTab === 'demographics'
                      ? 'bg-[#091d64] text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Users className="w-4 h-4" /> Youth Demographics & Accomplishments
                </button>

                <button
                  onClick={() => setTransparencySubTab('fpd')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    transparencySubTab === 'fpd'
                      ? 'bg-[#091d64] text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <FileText className="w-4 h-4" /> SK Full Public Disclosure (FPD) Board
                </button>

                <button
                  onClick={() => setTransparencySubTab('auditing')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    transparencySubTab === 'auditing'
                      ? 'bg-[#091d64] text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" /> Municipal Public Auditing Desk
                </button>
              </div>

              {/* SUB-TAB 1: PUBLIC FINANCIAL DASHBOARD */}
              {transparencySubTab === 'financial' && (
                <div className="space-y-6">
                  {/* FEDERATION METRIC CARDS */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="bg-white rounded-xl shadow-xs border-l-4 border-[#091d64] p-5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">City Youth Demographics</span>
                        <h3 className="text-2xl font-black text-slate-800 mt-1">{totalCityYouth.toLocaleString()}</h3>
                        <span className="text-[10px] text-slate-500 font-medium block mt-1">Total profiling census</span>
                      </div>
                      <div className="p-3 bg-blue-50 text-[#091d64] rounded-lg">
                        <Users className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-xs border-l-4 border-amber-500 p-5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Total Federation Budget</span>
                        <h3 className="text-2xl font-black text-slate-800 mt-1">₱{totalCityBudget.toLocaleString()}</h3>
                        <span className="text-[10px] text-emerald-600 font-bold block mt-1">Shared municipal funding</span>
                      </div>
                      <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                        <DollarSign className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-xs border-l-4 border-rose-500 p-5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Total Disbursed Funds</span>
                        <h3 className="text-2xl font-black text-slate-800 mt-1">₱{totalCitySpent.toLocaleString()}</h3>
                        <span className="text-[10px] text-rose-600 font-bold block mt-1">Utilization: {((totalCitySpent/totalCityBudget)*100).toFixed(1)}%</span>
                      </div>
                      <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  {/* CHARTS */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs min-w-0">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-[#091d64]" />
                        Barangay Budget Utilization (Top 7 Tenants)
                      </h4>
                      <div className="h-56 w-full min-w-0 overflow-hidden">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                          <BarChart data={cityWideBarData}>
                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                            <Tooltip />
                            <Bar dataKey="budget" name="Annual Budget Allocation" fill="#091d64" radius={[2, 2, 0, 0]} />
                            <Bar dataKey="spent" name="Actual Expenditures Logged" fill="#e11d48" radius={[2, 2, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs min-w-0">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <PieChartIcon className="w-4 h-4 text-rose-600" />
                        Federation Expense Categories Distribution
                      </h4>
                      <div className="h-56 w-full min-w-0 flex justify-center overflow-hidden">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                          <PieChart>
                            <Pie
                              data={expenseCategoriesData}
                              innerRadius={0}
                              outerRadius={70}
                              dataKey="value"
                            >
                              {expenseCategoriesData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: ANONYMIZED YOUTH DEMOGRAPHICS & ACCOMPLISHMENTS */}
              {transparencySubTab === 'demographics' && (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">Anonymized Youth Demographics & Program Accomplishments</h3>
                      <p className="text-xs text-slate-500 mt-1">Aggregated, privacy-compliant census stats of registered Katipunan ng Kabataan constituents</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Gender split */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 min-w-0">
                        <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4 text-[#091d64]" /> Gender Census Split
                        </h4>
                        <div className="h-48 w-full min-w-0 overflow-hidden">
                          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                            <PieChart>
                              <Pie data={genderDemographicData} outerRadius={60} dataKey="value">
                                {genderDemographicData.map((entry, i) => (
                                  <Cell key={i} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend wrapperStyle={{ fontSize: 11 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Educational Attainment */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 min-w-0">
                        <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-emerald-600" /> Educational Level Breakdown
                        </h4>
                        <div className="h-48 w-full min-w-0 overflow-hidden">
                          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                            <BarChart data={educationDemographicData}>
                              <XAxis dataKey="name" fontSize={10} />
                              <YAxis fontSize={10} />
                              <Tooltip />
                              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Accomplishment highlights */}
                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">City-Wide Program Accomplishments Summary</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 text-center">
                          <span className="text-2xl font-black text-emerald-800 block">{(programs.reduce((s, p) => s + (Number(p.registeredCount) || 0), 0)).toLocaleString()}</span>
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mt-1">Youth Event Attendees</span>
                        </div>
                        <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-center">
                          <span className="text-2xl font-black text-[#091d64] block">{publicDemographics?.scholar_count ?? 0} Active</span>
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mt-1">LGU Educational Scholars</span>
                        </div>
                        <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100 text-center">
                          <span className="text-2xl font-black text-amber-800 block">{(resolutions.filter(r => r.status === 'Closed' || r.status === 'Archived' || r.status === 'Approved').length).toLocaleString()} Passed</span>
                          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mt-1">Youth Development Resolutions</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* SUB-TAB 3: SK FULL PUBLIC DISCLOSURE (FPD) BOARD */}
              {transparencySubTab === 'fpd' && (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                          <FileText className="w-5 h-5 text-[#091d64]" /> SK Full Public Disclosure (FPD) Compliance Board
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">Pursuant to DILG Joint Memorandum Circular & Republic Act 10742 (SK Reform Act)</p>
                      </div>
                      <button
                        onClick={() => alert('Downloading complete SK Full Public Disclosure ZIP archive...')}
                        className="px-4 py-2 bg-[#091d64] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs hover:bg-[#122878] transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-400" /> Download All FPD Files
                      </button>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 text-[10px] text-slate-500 font-bold uppercase border-b border-slate-200">
                          <tr>
                            <th className="px-5 py-3">Document Title & Type</th>
                            <th className="px-5 py-3">Barangay / Council</th>
                            <th className="px-5 py-3">Date Published</th>
                            <th className="px-5 py-3 text-center">DILG Status</th>
                            <th className="px-5 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {fpdDocuments.map((doc, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-5 py-3.5">
                                <span className="font-bold text-slate-800 block">{doc.title}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{doc.category}</span>
                              </td>
                              <td className="px-5 py-3.5 font-semibold text-slate-700">{doc.barangay}</td>
                              <td className="px-5 py-3.5 font-mono text-slate-500">{doc.date}</td>
                              <td className="px-5 py-3.5 text-center">
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {doc.status}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <button
                                  onClick={() => alert(`Downloading official compliant record: ${doc.title}`)}
                                  className="text-[#091d64] hover:text-[#122878] font-bold flex items-center gap-1 ml-auto cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5 text-amber-500" /> Download
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 4: MUNICIPAL PUBLIC AUDITING DESK */}
              {transparencySubTab === 'auditing' && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">Municipal Public Auditing Desk</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Track actual Sangguniang Kabataan transactions, supplier payees, and tax withholding values.</p>
                    </div>

                    <button 
                      onClick={downloadPublicCOAPDF}
                      className="px-4 py-2 bg-[#091d64] hover:bg-[#122878] text-white font-bold rounded-xl shadow-xs text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      Download COA Audit Report
                    </button>
                  </div>

                  {/* Search / Filter Row */}
                  <div className="grid sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Barangay</label>
                      <select
                        value={selectedBarangayId}
                        onChange={(e) => setSelectedBarangayId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#091d64]"
                      >
                        <option value="All">All Barangays</option>
                        {sortedTenants.map(t => (
                          <option key={t.id} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Expense category group</label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#091d64]"
                      >
                        <option value="All">All Categories</option>
                        <option value="Supplies">Supplies</option>
                        <option value="Honorarium">Honorarium</option>
                        <option value="Food & Catering">Food & Catering</option>
                        <option value="Travel & Transport">Travel & Transport</option>
                      </select>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-[10px] text-slate-500 font-bold uppercase border-b border-slate-200">
                        <tr>
                          <th className="px-5 py-3">Initiative Description</th>
                          <th className="px-5 py-3 text-right">Gross Amount</th>
                          <th className="px-5 py-3">Supplier / Payee</th>
                          <th className="px-5 py-3 text-center">Tax Class</th>
                          <th className="px-5 py-3 text-right">Tax Withheld</th>
                          <th className="px-5 py-3 text-right">Net Disbursement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredExpenses.map(exp => (
                          <tr key={exp.id} className="hover:bg-slate-50">
                            <td className="px-5 py-3.5">
                              <span className="font-bold text-slate-800 block">{exp.programTitle}</span>
                              <span className="text-[10px] text-slate-400 font-mono block">ID: {exp.id}</span>
                            </td>
                            <td className="px-5 py-3.5 text-right font-mono text-slate-800">₱{exp.amount.toLocaleString()}</td>
                            <td className="px-5 py-3.5 text-slate-600">{exp.supplier}</td>
                            <td className="px-5 py-3.5 text-center">
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                {exp.taxType}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right font-mono text-slate-500">₱{(Number(exp.withholdingTax) || 0).toLocaleString()}</td>
                            <td className="px-5 py-3.5 text-right font-mono text-[#091d64] font-bold">₱{(Number(exp.netAmount ?? exp.amount) || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ==================== 3. ANNOUNCEMENTS TAB ==================== */}
          {activeMenu === 'announcements' && (
            <div className="space-y-6">

              
              {/* ANNOUNCEMENTS & PUBLIC FEED CONTAINER */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">SK Federation Announcements & Public Feed</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Explore published advisories, completed programs, and youth legislative resolutions</p>
                  </div>

                  <div className="relative max-w-xs w-full">
                    <input 
                      type="text" 
                      placeholder="Search announcements..."
                      value={announcementSearch}
                      onChange={(e) => setAnnouncementSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#091d64]"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                {/* Barangay selector filter */}
                <div className="flex gap-2 border-b border-slate-100 pb-3 overflow-x-auto">
                  <button
                    onClick={() => setSelectedBarangayId('All')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      selectedBarangayId === 'All' ? 'bg-[#091d64] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Barangays
                  </button>
                  {sortedTenants.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedBarangayId(t.name)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        selectedBarangayId === t.name ? 'bg-[#091d64] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>


{/* FEATURED ACTIVE YOUTH PROGRAMS */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Award className="w-4 h-4 text-emerald-500" /> Featured Active Programs
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">Community Impact Projects</span>
                  </div>

                  <div className="space-y-3">
                    {programs.filter((prog: any) => selectedBarangayId === 'All' || sortedTenants.find((t: any) => t.id === prog.barangayId)?.name === selectedBarangayId).slice(0, 6).map((prog: any) => (
                      <div key={prog.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800">{prog.title}</span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded">
                            {prog.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold">Brgy. {sortedTenants.find((t: any) => t.id === prog.barangayId)?.name || "Naga City"}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-2">{prog.description}</p>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-100">
                          <span>{prog.location}</span>
                          <span className="font-mono font-bold text-[#091d64]">₱{prog.budgetAllocation.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Announcement Cards Feed */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredAnnouncements.map(ann => (
                    <div key={ann.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between hover:shadow-md transition-all">
                      <div className="p-5 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                            ann.category === 'Opportunity' ? 'bg-blue-100 text-[#091d64]' :
                            ann.category === 'Emergency' ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {ann.category}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{ann.datePosted}</span>
                        </div>

                        <h4 className="text-sm font-black text-slate-900 leading-snug">{ann.title}</h4>
                        {ann.imageUrl && <img src={ann.imageUrl} alt={`Pubmat for ${ann.title}`} className="max-h-56 w-full rounded-lg bg-slate-50 object-contain" />}
                        <div className="space-y-1 text-xs text-slate-600">
                          {ann.what && <p><strong>What:</strong> {ann.what}</p>}
                          {ann.where && <p><strong>Where:</strong> {ann.where}</p>}
                          {ann.when && <p><strong>When:</strong> {ann.when}</p>}
                          <p className="line-clamp-3 leading-relaxed font-medium">{ann.content}</p>
                          {ann.hashtags && <p className="font-semibold text-blue-700">{ann.hashtags}</p>}
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs font-semibold">
                        <span className="text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          Barangay {ann.barangay}
                        </span>

                        <button
                          onClick={() => setReadAnnounce(ann)}
                          className="text-[#091d64] hover:text-[#122878] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          Read More <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* PUBLIC FEED OF PASSED RESOLUTIONS & IMPACT METRICS */}
                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#091d64]" /> Public Feed of Passed SK Resolutions
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {resolutions.slice(0, 4).map(res => (
                      <div key={res.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-[#091d64] font-mono">{res.title}</span>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            {res.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-semibold">{res.content}</p>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 pt-2 border-t border-slate-200/60">
                          <span className="text-emerald-700">👍 Support: {res.votesSupport}</span>
                          <span className="text-rose-600">👎 Oppose: {res.votesOppose}</span>
                          <span className="text-slate-400">⚪ Abstain: {res.votesAbstain}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>

      {/* READ MORE ANNOUNCEMENT DETAIL MODAL */}
      {readAnnounce && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#091d64] text-white p-5 border-b-4 border-amber-400 flex items-center justify-between">
              <div>
                <span className="text-[10px] bg-white/20 text-white font-mono font-bold px-2.5 py-0.5 rounded-full uppercase">
                  {readAnnounce.category} Notice
                </span>
                <h3 className="font-bold text-base mt-1">{readAnnounce.title}</h3>
              </div>
              <button 
                onClick={() => setReadAnnounce(null)}
                className="p-1 text-slate-200 hover:text-white cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-semibold">
              <div className="flex justify-between text-slate-400 text-[10px] border-b border-slate-100 pb-2">
                <span>POSTED BY: Hon. {readAnnounce.author}</span>
                <span>BARANGAY: {readAnnounce.barangay}</span>
                <span>DATE: {readAnnounce.datePosted}</span>
              </div>

              {readAnnounce.imageUrl && <img src={readAnnounce.imageUrl} alt={`Pubmat for ${readAnnounce.title}`} className="max-h-96 w-full rounded-lg border border-slate-200 object-contain" />}
              <div className="space-y-1.5 text-slate-600">
                {readAnnounce.what && <p><strong>What:</strong> {readAnnounce.what}</p>}
                {readAnnounce.where && <p><strong>Where:</strong> {readAnnounce.where}</p>}
                {readAnnounce.when && <p><strong>When:</strong> {readAnnounce.when}</p>}
              </div>
              <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Body Content</h4>
              <p className="text-slate-600 leading-relaxed text-sm font-medium whitespace-pre-wrap">
                {readAnnounce.content}
              </p>
              {readAnnounce.hashtags && <p className="border-t border-slate-100 pt-3 font-semibold text-blue-700">{readAnnounce.hashtags}</p>}

              {readAnnounce.attachments && readAnnounce.attachments.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Downloadable Notice Attachments</span>
                  {readAnnounce.attachments.map((attach, i) => (
                    <button
                      key={i}
                      onClick={() => alert(`Initiating public download of ${attach}...`)}
                      className="w-full text-left p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between transition-colors text-xs font-bold cursor-pointer"
                    >
                      <span className="text-slate-700 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#091d64]" />
                        {attach}
                      </span>
                      <Download className="w-4 h-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 flex justify-around items-center z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <button
          onClick={() => setActiveMenu('home')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeMenu === 'home' ? 'text-[#091d64] font-extrabold bg-blue-50/80' : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
        >
          <Home className={`w-5 h-5 ${activeMenu === 'home' ? 'text-[#091d64] scale-110' : 'text-slate-400'} transition-transform`} />
          <span className="text-[10px] mt-0.5 tracking-tight font-sans">Home</span>
        </button>

        <button
          onClick={() => setActiveMenu('transparency')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeMenu === 'transparency' ? 'text-[#091d64] font-extrabold bg-blue-50/80' : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
        >
          <TrendingUp className={`w-5 h-5 ${activeMenu === 'transparency' ? 'text-[#091d64] scale-110' : 'text-slate-400'} transition-transform`} />
          <span className="text-[10px] mt-0.5 tracking-tight font-sans">Transparency</span>
        </button>

        <button
          onClick={() => setActiveMenu('announcements')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeMenu === 'announcements' ? 'text-[#091d64] font-extrabold bg-blue-50/80' : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
        >
          <Bell className={`w-5 h-5 ${activeMenu === 'announcements' ? 'text-[#091d64] scale-110' : 'text-slate-400'} transition-transform`} />
          <span className="text-[10px] mt-0.5 tracking-tight font-sans">Bulletins</span>
        </button>

        {onNavigateSignUp && (
          <button
            onClick={onNavigateSignUp}
            className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-amber-600 font-bold hover:text-amber-700 cursor-pointer"
          >
            <UserPlus className="w-5 h-5 text-amber-500" />
            <span className="text-[10px] mt-0.5 tracking-tight font-sans">Register</span>
          </button>
        )}
      </div>

    </div>
  );
}