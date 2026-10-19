import { formatCurrencyInput } from '../lib/utils';
import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Building2, 
  Users, 
  Calendar, 
  DollarSign, 
  Check, 
  X, 
  Search, 
  Filter, 
  Eye, 
  Plus, 
  FileText, 
  Award, 
  TrendingUp, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  BookOpen, 
  ShieldAlert,
  Shield,
  Download,
  CalendarCheck,
  TrendingDown,
  LayoutDashboard,
  LogOut,
  Menu,
  ChevronDown,
  ClipboardList,
  Coins,
  Folder,
  BarChart3,
  Megaphone,
  Settings as SettingsIcon,
  MoreVertical,
  Clock,
  Briefcase,
  AlertTriangle,
  History,
  CheckCircle2,
  Lock,
  Upload,
  Upload as UploadIcon,
  FileCheck,
  XCircle,
  Facebook,
  Pencil,
  Printer,
  FileSpreadsheet,
  Sparkles,
  Layers,
  HelpCircle,
  TrendingUpIcon,
  Trash2
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
import { AnnouncementRecord, BarangayTenant, Program, YouthProfile, DocumentRecord, ExpenseRecord, SystemAuditLog } from '../types';
import ProfileAvatar from './ProfileAvatar';
import { 
  classifyDemographics, 
  calculateEngagementScore, 
  recommendPrograms, 
  detectLowEngagement, 
  detectScheduleConflicts, 
  getBudgetAnalytics, 
  monitorBudgets, 
  getComplianceIssues, 
  analyzeFeedbackSentiment 
} from '../lib/intelligence';
import { KabisigLogo } from './PublicPages';
import { UserMenu } from './UserMenu';
import NotificationMenu, { NotificationMenuItem } from './NotificationMenu';
import { DEFAULT_BARANGAY_LOGOS } from '../data';
import kabisigApi from '../lib/api';

function createAnnouncementStorageClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Announcement image upload requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to be configured.');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export interface BarangayAdminPagesProps {
  currentBarangay: BarangayTenant;
  currentUser?: any;
  programs: Program[];
  youthProfiles: YouthProfile[];
  youthProfilesLoading: boolean;
  youthProfilesError: string | null;
  onRetryYouthProfiles: () => void;
  documents: DocumentRecord[];
  auditLogs?: SystemAuditLog[];
  registrations?: any[];
  feedback?: any[];
  expenses?: any[];
  resolutions?: any[];
  onApproveYouth: (id: string) => void;
  onRejectYouth: (id: string, reason: string) => void;
  onApproveDocument: (id: string, notes: string) => Promise<DocumentRecord>;
  onRejectDocument: (id: string, notes: string) => Promise<DocumentRecord>;
  onAddExpense: (expense: ExpenseRecord) => Promise<void>;
  onAddDocument: (document: DocumentRecord) => void;
  onCreateProgram: (newProg: Program) => Promise<boolean>;
  onUpdateProgram: (program: Program) => Promise<boolean>;
  onDeleteProgram: (programId: string) => Promise<boolean>;
  onAnnouncementsChanged?: (announcements: AnnouncementRecord[]) => void;
  onLogout: () => void;
}

export default function BarangayAdminPages({
  currentBarangay,
  currentUser,
  programs = [],
  youthProfiles = [],
  youthProfilesLoading = false,
  youthProfilesError = null,
  onRetryYouthProfiles,
  documents = [],
  auditLogs = [],
  registrations = [],
  feedback = [],
  expenses = [],
  resolutions = [],
  onApproveYouth,
  onRejectYouth,
  onApproveDocument,
  onRejectDocument,
  onAddExpense,
  onAddDocument,
  onCreateProgram,
  onUpdateProgram,
  onDeleteProgram,
  onAnnouncementsChanged,
  onLogout
}: BarangayAdminPagesProps) {
  const [activeMenu, setActiveMenu] = useState<
    'dashboard' | 'youth' | 'programs' | 'budget' | 'documents' | 'reports' | 'announcements' | 'audit' | 'calendar' | 'facebook_sync' | 'settings' | 'profile'
  >('dashboard');

  const [searchTerm, setSearchTerm] = useState('');
  const [reportSubTab, setReportSubTab] = useState<'executive'|'attendance'|'accomplishments'|'beneficiaries'|'demographics'|'financial'>('attendance');
  const barangayLogo = currentBarangay?.logo || DEFAULT_BARANGAY_LOGOS[currentBarangay?.name || ''] || '';

  const generatePDFReport = (reportTitle: string = 'COA Annual Audit & AIP Financial Performance Report') => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for this website to export the PDF report.');
      return;
    }
    const reportProgramRows = programs.length > 0
      ? programs.map(program => {
          const allocated = Number(program.budgetAllocation) || 0;
          const spent = expenses.filter(expense => expense.programId === program.id)
            .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0) || Number(program.spentBudget) || 0;
          const rate = allocated > 0 ? ((spent / allocated) * 100).toFixed(1) : '0.0';
          return `<tr><td><strong>${program.title}</strong><br><span style="color:#64748b">${program.category}</span></td><td>${program.aipReference || 'Not provided'}</td><td class="text-right">₱${allocated.toLocaleString()}</td><td class="text-right">₱${spent.toLocaleString()}</td><td class="text-right">${rate}%</td><td class="text-center"><span class="badge">${program.status}</span></td></tr>`;
        }).join('')
      : '<tr><td colspan="6" class="text-center">No program records available.</td></tr>';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitle} - Barangay ${currentBarangay?.name || 'Barangay'}</title>
        <style>
          body { font-family: 'Poppins', ui-sans-serif, system-ui, sans-serif; color: #1e293b; margin: 0; padding: 40px; background: #ffffff; }
          .header { text-align: center; border-bottom: 3px solid #091d64; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { font-size: 13px; font-weight: 700; color: #64748b; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
          .header h2 { font-size: 20px; font-weight: 800; color: #091d64; margin: 5px 0; }
          .header p { font-size: 12px; color: #64748b; margin: 0; }
          .section-title { font-size: 13px; font-weight: 800; color: #091d64; background: #eff6ff; padding: 8px 12px; border-left: 4px solid #091d64; margin: 25px 0 15px 0; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
          th { background: #f8fafc; color: #475569; font-weight: 700; text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .badge { display: inline-block; padding: 3px 8px; font-size: 10px; font-weight: 700; border-radius: 4px; background: #ecfdf5; color: #065f46; }
          .footer { margin-top: 50px; text-align: right; font-size: 12px; color: #475569; }
          .footer .sign { margin-top: 40px; font-weight: 700; color: #091d64; }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Republic of the Philippines &bull; Province of Camarines Sur &bull; City of Naga</h1>
          <h2>Barangay ${currentBarangay?.name || 'Barangay'} &bull; Sangguniang Kabataan Council</h2>
          <p>Official Statutory ${reportTitle} &bull; Date Generated: ${new Date().toLocaleDateString()}</p>
        </div>

        <div class="section-title">I. Annual Investment Plan (AIP) Financial Summary</div>
        <table>
          <thead>
            <tr>
              <th>Program / Project Category</th>
              <th>AIP Reference Code</th>
              <th class="text-right">Budget Allocated</th>
              <th class="text-right">Disbursed Expenditure</th>
              <th class="text-right">Utilization Rate</th>
              <th class="text-center">Audit Status</th>
            </tr>
          </thead>
          <tbody>
            ${reportProgramRows}
          </tbody>
        </table>

        <div class="section-title">II. DILG MC 2023 Compliance & Statutory Transmittals</div>
        <table>
          <thead>
            <tr>
              <th>Statutory Requirement</th>
              <th>Filing Quarter</th>
              <th>Date Submitted</th>
              <th class="text-center">DILG Verification</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              ${documents.filter(d => d.category === 'Reports' || d.category === 'Compliance' || (d.title || '').toLowerCase().includes('compliance')).map(d => `<tr><td>${d.title}</td><td>Current</td><td>${d.uploadedDate || '-'}</td><td class="text-center">${d.status === 'Approved' ? 'Verified' : 'Pending'}</td></tr>`).join('') || '<td colspan="4" class="text-center">No compliance transmittal records available.</td>'}
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>Certified Correct & Attested:</p>
          <div class="sign">
            HON. ${(currentBarangay?.chairperson || 'SK CHAIRPERSON').toUpperCase()} &bull; SK EXECUTIVE BOARD<br>
            <span style="font-weight: normal; color: #64748b;">Barangay ${currentBarangay?.name || 'Barangay'}, City of Naga</span>
          </div>
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

  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Document repository & digital approval states
  const [docSearchTerm, setDocSearchTerm] = useState('');
  const [docCategoryFilter, setDocCategoryFilter] = useState('All');
  const [docStatusFilter, setDocStatusFilter] = useState('All');
  const [inspectDoc, setInspectDoc] = useState<DocumentRecord | null>(null);
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [documentUploadError, setDocumentUploadError] = useState('');
  const [showApproveDocModal, setShowApproveDocModal] = useState(false);
  const [selectedDocForApprove, setSelectedDocForApprove] = useState<DocumentRecord | null>(null);
  const [approvalDecision, setApprovalDecision] = useState<'Approved' | 'Rejected'>('Approved');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isReviewingDocument, setIsReviewingDocument] = useState(false);
  const [documentReviewError, setDocumentReviewError] = useState('');
  const [newDocForm, setNewDocForm] = useState<{
    title: string;
    category: DocumentRecord['category'];
    resolutionNumber: string;
    description: string;
    fileSize: string;
    designatedApprover: string;
  }>({
    title: '',
    category: 'Resolutions',
    resolutionNumber: '',
    description: '',
    fileSize: '1.4 MB',
    designatedApprover: 'Hon. SK Chairperson'
  });

  const [auditLogRoleFilter, setAuditLogRoleFilter] = useState<'All' | 'Treasurer' | 'Secretary'>('All');

  // Reports states
  const [reportCategoryFilter, setReportCategoryFilter] = useState<'All' | 'Demographic' | 'Accomplishment' | 'Attendance' | 'Beneficiary' | 'Financial' | 'Feedback'>('All');
  const [reportSearchQuery, setReportSearchQuery] = useState('');


  const openDynamicPrintPDF = (title: string, subtitle: string, refCode: string, headers: string[], rowsHTML: string, summaryStatsHTML: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for this website to export the PDF report.');
      return;
    }
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} - Barangay ${currentBarangay?.name || 'Barangay'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
          body { font-family: 'Poppins', ui-sans-serif, system-ui, sans-serif; color: #0f172a; margin: 0; padding: 40px; background: #ffffff; }
          .header { text-align: center; border-bottom: 3px solid #091d64; padding-bottom: 20px; margin-bottom: 25px; }
          .header .republic { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin: 0; }
          .header .city { font-size: 13px; font-weight: 700; color: #1e293b; margin: 2px 0; }
          .header h2 { font-size: 22px; font-weight: 800; color: #091d64; margin: 6px 0 4px 0; letter-spacing: -0.5px; }
          .header .meta { font-size: 11px; color: #475569; font-weight: 600; margin: 0; }
          .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 25px; }
          .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; }
          .stat-label { font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; }
          .stat-value { font-size: 18px; font-weight: 800; color: #091d64; margin-top: 2px; }
          .section-title { font-size: 12px; font-weight: 800; color: #091d64; background: #eff6ff; padding: 8px 12px; border-left: 4px solid #091d64; margin: 20px 0 12px 0; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 11px; }
          th { background: #091d64; color: #ffffff; font-weight: 700; text-align: left; padding: 9px 10px; border: 1px solid #091d64; text-transform: uppercase; font-size: 10px; }
          td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; color: #334155; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .badge { display: inline-block; padding: 2px 7px; font-size: 9px; font-weight: 800; border-radius: 4px; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; text-transform: uppercase; }
          .badge-blue { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
          .badge-amber { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
          .footer { margin-top: 45px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #475569; page-break-inside: avoid; }
          .sign-box { text-align: center; width: 220px; }
          .sign-line { border-bottom: 1.5px solid #091d64; margin-bottom: 6px; padding-top: 35px; }
          .sign-title { font-weight: 800; color: #091d64; font-size: 11px; }
          .sign-role { font-size: 10px; color: #64748b; font-weight: 600; }
          @media print { body { padding: 15px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <p class="republic">Republic of the Philippines &bull; Province of Camarines Sur &bull; City of Naga</p>
          <p class="city">SANGGUNIANG KABATAAN EXECUTIVE COUNCIL &bull; BARANGAY ${currentBarangay?.name?.toUpperCase() || 'BARANGAY'}</p>
          <h2>${title}</h2>
          <p class="meta">Statutory Document Ref: <strong>${refCode}</strong> &bull; Generated: ${new Date().toLocaleDateString()} &bull; DILG RA 10742 Compliant System Record</p>
        </div>

        ${summaryStatsHTML}

        <div class="section-title">Official Registry Ledger & Audit Schedule</div>
        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>

        <div class="footer">
          <div class="sign-box">
            <div class="sign-line"><strong>SK SECRETARY</strong></div>
            <div class="sign-title">Document Custodian</div>
            <div class="sign-role">Sangguniang Kabataan Council</div>
          </div>
          <div class="sign-box">
            <div class="sign-line"><strong>SK TREASURER</strong></div>
            <div class="sign-title">Financial Custodian</div>
            <div class="sign-role">Sangguniang Kabataan Council</div>
          </div>
          <div class="sign-box">
            <div class="sign-line"><strong>HON. SK CHAIRPERSON</strong></div>
            <div class="sign-title">Barangay Administrator</div>
            <div class="sign-role">Head of Executive Council</div>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const [inspectProfile, setInspectProfile] = useState<YouthProfile | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectField, setShowRejectField] = useState(false);

  const [showCreateProgDrawer, setShowCreateProgDrawer] = useState(false);
  const [progListFilter, setProgListFilter] = useState<'List' | 'Calendar'>('List');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [viewingProgram, setViewingProgram] = useState<Program | null>(null);
  const [newProgForm, setNewProgForm] = useState({
    title: '',
    description: '',
    category: 'Sports Development' as Program['category'],
    startDate: '',
    endDate: '',
    location: '',
    maxParticipants: 0,
    budgetAllocation: null as number | null,
    aipReference: '',
    status: 'Upcoming' as 'Draft' | 'Published' | 'Upcoming' | 'Ongoing' | 'Completed'
  });

  const [budgetYear, setBudgetYear] = useState('2026');
  const [budgetProgramFilter, setBudgetProgramFilter] = useState('All Programs');
  const [budgetAllocations, setBudgetAllocations] = useState<any[]>([]);
  const [showRecordExpense, setShowRecordExpense] = useState(false);
  const [showSetTotal, setShowSetTotal] = useState(false);
  const [totalForm, setTotalForm] = useState({ amount: '', fiscalYear: String(new Date().getFullYear()) });
  const [totalFormError, setTotalFormError] = useState('');
  const [isSavingTotal, setIsSavingTotal] = useState(false);
  const [savedTotalBudget, setSavedTotalBudget] = useState<number | null>(null);
  const [totalBudgetNotice, setTotalBudgetNotice] = useState('');
  const [showSetBudget, setShowSetBudget] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ category: '', allocatedAmount: '', description: '', fiscalYear: String(new Date().getFullYear()) });
  const [budgetFormError, setBudgetFormError] = useState('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [budgetNotice, setBudgetNotice] = useState('');
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    budgetId: '',
    programId: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    taxType: 'Exempt' as 'VAT' | 'Non-VAT' | 'Exempt',
  });
  const [expenseFormError, setExpenseFormError] = useState('');
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  const [localDocs, setLocalDocs] = useState<DocumentRecord[]>(documents);

  // Keep localDocs in sync with the parent `documents` prop when it changes
  // (initial mount happens before App.tsx finishes loading /api/documents).
  useEffect(() => {
    setLocalDocs(documents);
  }, [documents]);
  useEffect(() => {
    let isMounted = true;
    setBudgetAllocations([]);
    void kabisigApi.getBudgets(currentBarangay?.id, Number(budgetYear)).then(allocations => {
      if (!isMounted) return;
      setBudgetAllocations(allocations);
      setExpenseForm(previous => ({
        ...previous,
        budgetId: allocations.some(allocation => allocation.id === previous.budgetId)
          ? previous.budgetId
          : allocations[0]?.id || '',
      }));
    });
    return () => {
      isMounted = false;
    };
  }, [currentBarangay?.id, budgetYear]);

  const handleRecordExpense = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setExpenseFormError('');
    const amount = Number(expenseForm.amount);
    const budget = budgetAllocations.find(allocation => allocation.id === expenseForm.budgetId);
    if (!expenseForm.title.trim() || !budget || !Number.isFinite(amount) || amount <= 0) {
      setExpenseFormError('Enter an expense title, amount, and budget category.');
      return;
    }
    if (amount > Number(budget.remaining_amount || 0)) {
      setExpenseFormError(`This amount exceeds the category balance of ₱${Number(budget.remaining_amount || 0).toLocaleString()}.`);
      return;
    }

    const selectedProgram = programs.find(program => program.id === expenseForm.programId);
    setIsSavingExpense(true);
    try {
      await onAddExpense({
        id: `expense-${Date.now()}`,
        programId: expenseForm.programId,
        budgetId: expenseForm.budgetId,
        programTitle: selectedProgram?.title || expenseForm.title.trim(),
        amount,
        supplier: expenseForm.title.trim(),
        category: 'Others',
        taxType: expenseForm.taxType,
        status: 'Approved',
        date: expenseForm.expenseDate,
        dateLogged: expenseForm.expenseDate,
        barangayId: currentBarangay.id,
      });
      const refreshedBudgets = await kabisigApi.getBudgets(currentBarangay.id, Number(budgetYear));
      setBudgetAllocations(refreshedBudgets);
      setExpenseForm(previous => ({ ...previous, title: '', amount: '', programId: '' }));
      setShowRecordExpense(false);
    } catch (error: any) {
      setExpenseFormError(error.message || 'The expense could not be recorded.');
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleReviewDocument = async () => {
    if (!selectedDocForApprove) return;
    if (approvalDecision === 'Rejected' && approvalNotes.trim().length < 5) {
      setDocumentReviewError('Enter at least five characters explaining the rejection.');
      return;
    }

    setIsReviewingDocument(true);
    setDocumentReviewError('');
    try {
      const reviewed = approvalDecision === 'Approved'
        ? await onApproveDocument(selectedDocForApprove.id, approvalNotes.trim())
        : await onRejectDocument(selectedDocForApprove.id, approvalNotes.trim());
      setLocalDocs(previous => previous.map(doc => doc.id === reviewed.id ? reviewed : doc));
      setShowApproveDocModal(false);
      setSelectedDocForApprove(null);
      setApprovalNotes('');
    } catch (error: any) {
      setDocumentReviewError(error.message || 'Document review could not be saved.');
    } finally {
      setIsReviewingDocument(false);
    }
  };

  const fallbackBarangay: BarangayTenant = {
    id: '',
    name: '',
    chairperson: '',
    youthPopulation: 0,
    activePrograms: 0,
    totalBudget: 0,
    allocatedBudget: 0,
    spentBudget: 0,
    contact: '',
    status: 'Active',
    district: '',
  };

  // Backend already scopes by tenant_id; frontend only needs to confirm the profile belongs here.
  const isMatchBarangay = (profile: YouthProfile) =>
    !currentBarangay?.id || profile.barangayId === currentBarangay.id;

  const pendingRegistrations = youthProfiles.filter(profile => profile.status === 'Pending' && isMatchBarangay(profile));
  const filteredProfiles = youthProfiles.filter(profile => {
    const matchesBarangay = isMatchBarangay(profile);
    const matchesSearch = profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.zone.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' ? true : profile.status === filterStatus;
    return matchesBarangay && matchesSearch && matchesStatus;
  });

  // Beneficiary Distribution Audit — computes participation counts to prevent duplicate assistance
  const youthProgramCounts = youthProfiles.map(y => {
    const count = registrations.filter((r: any) => r.participantId === y.id && r.status !== "Rejected").length;
    return { ...y, programCount: count };
  });
  const underservedYouth = youthProgramCounts.filter(y => y.programCount === 0 && y.status === "Approved");
  const overBenefitedYouth = youthProgramCounts
    .filter(y => y.programCount >= 3)
    .sort((a, b) => b.programCount - a.programCount);

  const localProfiles = youthProfiles.filter(p => isMatchBarangay(p));
  const programAllocatedBudget = programs.reduce((sum, program) => sum + (Number(program.budgetAllocation) || 0), 0);
  const budgetAnalytics = getBudgetAnalytics(programAllocatedBudget, programs, expenses);
  const budgetAlerts = monitorBudgets(currentBarangay || fallbackBarangay, programs, expenses);
  const budgetAlertSignature = budgetAlerts
    .map(alert => `${alert.code}:${alert.level}:${alert.message}`)
    .join('|');
  const complianceIssues = getComplianceIssues(localProfiles, programs, documents, expenses);
  const lowEngagementItems = detectLowEngagement(localProfiles, registrations);
  const complianceIssueSignature = complianceIssues
    .map(issue => `${issue.code}:${issue.level}:${issue.message}`)
    .join('|');

  useEffect(() => {
    if (!currentBarangay?.id || !currentUser?.id || !kabisigApi.getToken() || complianceIssues.length === 0) return;

    const persistIssues = async () => {
      const results = await Promise.all(
        complianceIssues.map(issue => kabisigApi.persistComplianceIssue({
          report_type: issue.code,
          fiscal_year: new Date().getFullYear(),
          status: 'pending',
          notes: `${issue.message} Recommended action: ${issue.action}`,
        }))
      );

      const failed = results.find(result => !result.success);
      if (failed) {
        const message = failed.message || 'Failed to persist one or more compliance issues.';
        if (message.includes("Could not find the table 'public.compliance_monitoring'")) {
          console.warn('Compliance persistence is unavailable until migration 002 is applied in Supabase.');
        } else {
          console.error(message);
        }
      }
    };

    void persistIssues();
  }, [complianceIssueSignature, currentBarangay?.id, currentUser?.id]);

  useEffect(() => {
    if (!currentBarangay?.id || !currentUser?.id || !kabisigApi.getToken() || budgetAlerts.length === 0) return;

    const persistAlerts = async () => {
      const results = await Promise.all(
        budgetAlerts.map(alert => kabisigApi.persistBudgetAlert({
          alert_code: alert.code,
          level: alert.level,
          message: alert.message,
          link: `/budget?alert=${encodeURIComponent(alert.code)}`,
        }))
      );

      const failed = results.find(result => !result.success);
      if (failed) {
        const message = failed.message || 'Failed to persist one or more budget alerts.';
        if (message.includes("Could not find the table 'public.notifications'")) {
          console.warn('Budget-alert persistence is unavailable until migration 002 is applied in Supabase.');
        } else {
          console.error(message);
        }
      }
    };

    void persistAlerts();
  }, [budgetAlertSignature, currentBarangay?.id, currentUser?.id]);

  const [announcementsList, setAnnouncementsList] = useState<any[]>([]);
  const [announcementError, setAnnouncementError] = useState('');
  const [programNotice, setProgramNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false);

  const [annTitle, setAnnTitle] = useState('');
  const [annWhat, setAnnWhat] = useState('');
  const [annWhere, setAnnWhere] = useState('');
  const [annWhen, setAnnWhen] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annHashtags, setAnnHashtags] = useState('');
  const [annImageFile, setAnnImageFile] = useState<File | null>(null);
  const [annImagePreview, setAnnImagePreview] = useState('');
  const [annImagePath, setAnnImagePath] = useState<string | null>(null);
  const [annImageUploading, setAnnImageUploading] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [mutatingAnnouncementId, setMutatingAnnouncementId] = useState<string | null>(null);
  const [annPostToFb, setAnnPostToFb] = useState(false);
  const [announcementSuccess, setAnnouncementSuccess] = useState('');
  const [isSubmittingAnnouncement, setIsSubmittingAnnouncement] = useState(false);
  const [facebookPosts, setFacebookPosts] = useState<Record<string, { post_id: string; post_url: string; posted_at: string }>>({});
  const [facebookIntegration, setFacebookIntegration] = useState<{
    id: string;
    page_id: string;
    page_name: string;
    is_active: boolean;
    last_verified_at: string | null;
  } | null>(null);
  const [facebookPageId, setFacebookPageId] = useState('');
  const [facebookPageToken, setFacebookPageToken] = useState('');
  const [facebookIntegrationLoading, setFacebookIntegrationLoading] = useState(false);
  const [facebookIntegrationSaving, setFacebookIntegrationSaving] = useState(false);
  const [facebookIntegrationTesting, setFacebookIntegrationTesting] = useState(false);
  const [facebookIntegrationError, setFacebookIntegrationError] = useState('');
  const [facebookIntegrationNotice, setFacebookIntegrationNotice] = useState('');
  const [facebookTestPageName, setFacebookTestPageName] = useState('');

  const refreshFacebookIntegration = async () => {
    if (!currentBarangay?.id || !kabisigApi.getToken()) return;
    setFacebookIntegrationLoading(true);
    setFacebookIntegrationError('');
    try {
      const result = await kabisigApi.getFacebookIntegration();
      if (!result.success) throw new Error(result.message || 'Facebook integration could not be loaded.');
      const connection = result.data?.is_active ? result.data : null;
      setFacebookIntegration(connection);
      setFacebookPageId(connection?.page_id || '');
    } catch (error) {
      setFacebookIntegrationError(error instanceof Error ? error.message : 'Facebook integration could not be loaded.');
    } finally {
      setFacebookIntegrationLoading(false);
    }
  };

  useEffect(() => {
    void refreshFacebookIntegration();
  }, [currentBarangay?.id, currentUser?.id]);

  const handleTestFacebookIntegration = async () => {
    setFacebookIntegrationError('');
    setFacebookIntegrationNotice('');
    setFacebookTestPageName('');
    if (!facebookPageId.trim() || !facebookPageToken.trim()) {
      setFacebookIntegrationError('Enter both the Page ID and Page Access Token to test the connection.');
      return;
    }
    setFacebookIntegrationTesting(true);
    try {
      const result = await kabisigApi.testFacebookIntegration(facebookPageId.trim(), facebookPageToken.trim());
      if (!result.success || !result.data) throw new Error(result.message || 'Facebook Page verification failed.');
      setFacebookTestPageName(result.data.page_name);
      setFacebookIntegrationNotice(`Connection verified for "${result.data.page_name}".`);
    } catch (error) {
      setFacebookIntegrationError(error instanceof Error ? error.message : 'Facebook Page verification failed.');
    } finally {
      setFacebookIntegrationTesting(false);
    }
  };

  const handleConnectFacebookIntegration = async () => {
    setFacebookIntegrationError('');
    setFacebookIntegrationNotice('');
    if (!facebookPageId.trim() || !facebookPageToken.trim()) {
      setFacebookIntegrationError('Enter both the Page ID and Page Access Token to connect.');
      return;
    }
    setFacebookIntegrationSaving(true);
    try {
      const result = await kabisigApi.connectFacebookIntegration(facebookPageId.trim(), facebookPageToken.trim());
      if (!result.success || !result.data) throw new Error(result.message || 'Facebook Page could not be connected.');
      setFacebookIntegration(result.data);
      setFacebookPageId(result.data.page_id);
      setFacebookPageToken('');
      setFacebookIntegrationNotice(result.message || `Connected to "${result.data.page_name}".`);
    } catch (error) {
      setFacebookIntegrationError(error instanceof Error ? error.message : 'Facebook Page could not be connected.');
    } finally {
      setFacebookIntegrationSaving(false);
    }
  };

  const handleDisconnectFacebookIntegration = async () => {
    setFacebookIntegrationError('');
    setFacebookIntegrationNotice('');
    setFacebookIntegrationSaving(true);
    try {
      const result = await kabisigApi.disconnectFacebookIntegration();
      if (!result.success) throw new Error(result.message || 'Facebook Page could not be disconnected.');
      setFacebookIntegration(null);
      setFacebookPageId('');
      setFacebookPageToken('');
      setFacebookIntegrationNotice(result.message || 'Facebook Page disconnected.');
    } catch (error) {
      setFacebookIntegrationError(error instanceof Error ? error.message : 'Facebook Page could not be disconnected.');
    } finally {
      setFacebookIntegrationSaving(false);
    }
  };

  const mapAnnouncement = (announcement: any): AnnouncementRecord => ({
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    what: announcement.what || '',
    where: announcement.where_text || '',
    when: announcement.event_when || '',
    hashtags: announcement.hashtags || '',
    imageUrl: announcement.image_url || '',
    imagePath: announcement.image_path || '',
    author: announcement.author?.full_name || currentUser?.full_name || 'SK Official',
    barangay: currentBarangay?.name || 'Barangay',
    datePosted: (announcement.published_at || announcement.created_at || new Date().toISOString()).split('T')[0],
    category: announcement.category === 'Advisory' ? 'Notice' : announcement.category,
    status: announcement.status,
    attachments: [],
    facebookPostUrl: facebookPosts[announcement.id]?.post_url,
    facebookPostId: facebookPosts[announcement.id]?.post_id,
    facebookPostedAt: facebookPosts[announcement.id]?.posted_at,
  });

  const refreshAnnouncements = async () => {
    if (!currentBarangay?.id || !kabisigApi.getToken()) return;
    setIsLoadingAnnouncements(true);
    setAnnouncementError('');
    try {
      const rows = await kabisigApi.getAnnouncements(currentBarangay.id);
      const mapped = rows.map(mapAnnouncement);
      setAnnouncementsList(mapped);
      onAnnouncementsChanged?.(mapped);
    } catch (error: any) {
      const message = error?.message || 'Announcements could not be loaded.';
      setAnnouncementError(message);
    } finally {
      setIsLoadingAnnouncements(false);
    }
  };

  useEffect(() => {
    void refreshAnnouncements();
  }, [currentBarangay?.id]);

  const handleAnnouncementImageSelected = async (file: File | null) => {
    if (!file) return;
    const validMime = file.type === 'image/jpeg' || file.type === 'image/png';
    const validExtension = /\.(jpe?g|png)$/i.test(file.name);
    if (!validMime || !validExtension || file.size > 10 * 1024 * 1024) {
      setAnnouncementError('Select a JPG or PNG image no larger than 10 MB.');
      return;
    }
    const accessToken = kabisigApi.getToken();
    if (!currentBarangay?.id || !accessToken) {
      setAnnouncementError('Sign in again before uploading an announcement image.');
      return;
    }

    setAnnouncementError('');
    setAnnouncementSuccess('');
    setAnnImageFile(file);
    setAnnImagePath(null);
    setAnnImagePreview('');
    setAnnImageUploading(true);
    try {
      const safeFileName = file.name.split(/[\\/]/).pop()?.replace(/[^A-Za-z0-9._-]/g, '_') || 'announcement-pubmat';
      const path = `${currentBarangay.id}/${crypto.randomUUID()}/${safeFileName}`;
      const storage = createAnnouncementStorageClient(accessToken).storage.from('announcement-pubmats');
      const { data: upload, error: uploadError } = await storage.upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) throw new Error(`Announcement image upload failed: ${uploadError.message}`);

      setAnnImagePath(upload.path);
      const { data: signedUrl, error: signedUrlError } = await storage.createSignedUrl(upload.path, 60 * 60);
      if (signedUrlError || !signedUrl?.signedUrl) {
        throw new Error(`Image uploaded, but its signed preview URL could not be created: ${signedUrlError?.message || 'No URL was returned.'}`);
      }
      setAnnImagePreview(signedUrl.signedUrl);
    } catch (error) {
      setAnnouncementError(error instanceof Error ? error.message : 'Announcement image upload failed.');
    } finally {
      setAnnImageUploading(false);
    }
  };

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annWhat.trim() || !annWhere.trim() || !annWhen.trim()
      || !annContent.trim() || !annHashtags.trim() || isSubmittingAnnouncement) return;
    if (annImageFile && !annImagePath) {
      setAnnouncementError('Wait for the announcement image upload to finish successfully before publishing.');
      return;
    }
    setIsSubmittingAnnouncement(true);
    setAnnouncementError('');
    setAnnouncementSuccess('');
    try {
      const payload = {
        title: annTitle.trim(),
        content: annContent.trim(),
        what: annWhat.trim(),
        where: annWhere.trim(),
        when: annWhen.trim(),
        hashtags: annHashtags.trim(),
        category: 'Notice' as const,
        status: editingAnnouncementId
          ? announcementsList.find(item => item.id === editingAnnouncementId)?.status === 'draft' ? 'draft' as const : 'published' as const
          : 'published' as const,
        image_path: annImagePath,
      };
      const result = editingAnnouncementId
        ? await kabisigApi.updateAnnouncement(editingAnnouncementId, payload)
        : await kabisigApi.createAnnouncement(payload);
      if (!result.success || !result.data) {
        const message = result.message || 'Announcement could not be saved.';
        setAnnouncementError(message);
        return;
      }
      const wasEditing = Boolean(editingAnnouncementId);
      setAnnTitle('');
      setAnnWhat('');
      setAnnWhere('');
      setAnnWhen('');
      setAnnContent('');
      setAnnHashtags('');
      setAnnImageFile(null);
      setAnnImagePreview('');
      setAnnImagePath(null);
      setEditingAnnouncementId(null);
      if (!wasEditing && annPostToFb) {
        const facebookResult = await kabisigApi.publishAnnouncementToFacebook(result.data.id);
        if (!facebookResult.success || !facebookResult.data) {
          const graphError = facebookResult.details?.graph;
          const reason = graphError
            ? `Facebook Graph error (code: ${graphError.code ?? 'unknown'}, type: ${graphError.type || 'unknown'}, message: ${graphError.message || facebookResult.message || 'Unknown Facebook error.'})`
            : facebookResult.message || 'Unknown Facebook error.';
          setAnnouncementError(`Announcement saved to portal, but Facebook publishing failed: ${reason}`);
        } else {
          setFacebookPosts(previous => ({ ...previous, [result.data.id]: facebookResult.data! }));
          setAnnouncementSuccess('Announcement published to portal and Facebook.');
        }
      } else {
        setAnnouncementSuccess(wasEditing ? 'Announcement updated.' : 'Announcement published to the portal.');
      }
      setAnnPostToFb(false);
      await refreshAnnouncements();
    } catch (error: any) {
      setAnnouncementError(error?.message || 'Announcement could not be saved.');
    } finally {
      setIsSubmittingAnnouncement(false);
    }
  };

  const handleEditAnnouncement = (announcement: AnnouncementRecord) => {
    setEditingAnnouncementId(announcement.id);
    setAnnTitle(announcement.title);
    setAnnWhat(announcement.what || '');
    setAnnWhere(announcement.where || '');
    setAnnWhen(announcement.when || '');
    setAnnContent(announcement.content);
    setAnnHashtags(announcement.hashtags || '');
    setAnnImageFile(null);
    setAnnImagePreview(announcement.imageUrl || '');
    setAnnImagePath(announcement.imagePath || null);
    setAnnouncementError('');
    setAnnouncementSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelAnnouncementEdit = () => {
    setEditingAnnouncementId(null);
    setAnnTitle('');
    setAnnWhat('');
    setAnnWhere('');
    setAnnWhen('');
    setAnnContent('');
    setAnnHashtags('');
    setAnnImageFile(null);
    setAnnImagePreview('');
    setAnnImagePath(null);
    setAnnouncementError('');
  };

  const handleDeleteAnnouncement = async (announcement: AnnouncementRecord) => {
    if (!window.confirm(`Delete "${announcement.title}"? This cannot be undone.`)) return;
    setMutatingAnnouncementId(announcement.id);
    setAnnouncementError('');
    setAnnouncementSuccess('');
    try {
      const result = await kabisigApi.deleteAnnouncement(announcement.id);
      if (!result.success) {
        setAnnouncementError(result.message || 'Announcement could not be deleted.');
        return;
      }
      if (editingAnnouncementId === announcement.id) handleCancelAnnouncementEdit();
      setAnnouncementSuccess(result.message || 'Announcement deleted.');
      await refreshAnnouncements();
    } catch (error: any) {
      setAnnouncementError(error?.message || 'Announcement could not be deleted.');
    } finally {
      setMutatingAnnouncementId(null);
    }
  };

  const maleCount = localProfiles.filter(p => p.sex === 'Male').length;
  const femaleCount = localProfiles.filter(p => p.sex === 'Female').length;
  const otherCount = localProfiles.filter(p => p.sex !== 'Male' && p.sex !== 'Female').length;
  const demographicsDonutData = [
    { name: 'Male', value: maleCount, color: '#1e3a8a' },
    { name: 'Female', value: femaleCount, color: '#dc2626' },
    { name: 'Other', value: otherCount, color: '#f59e0b' }
  ];

  const programParticipationData = programs.length > 0 ? programs.map(p => ({
    name: p.title.length > 22 ? p.title.slice(0, 20) + '...' : p.title,
    count: p.registeredCount || registrations.filter(r => r.programId === p.id).length || 0
  })) : [
    { name: 'No Active Programs', count: 0 }
  ];

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const budgetPrograms = programs.filter(program => budgetProgramFilter === 'All Programs' || program.id === budgetProgramFilter);
  const selectedProgramsBudget = budgetPrograms.reduce((sum, program) => sum + (Number(program.budgetAllocation) || 0), 0);
  const barangayAllocatedBudget = Math.max(Number(currentBarangay?.allocatedBudget) || 0, Number(currentBarangay?.totalBudget) || 0);
  const budgetScopeAllocated = budgetProgramFilter === 'All Programs'
    ? Math.max(selectedProgramsBudget, Number(budgetYear) === new Date().getFullYear() ? barangayAllocatedBudget : 0)
    : selectedProgramsBudget;
  const unallocatedBudget = Math.max(0, budgetScopeAllocated - selectedProgramsBudget);
  const budgetVsActualMonthlyData = months.map((month, idx) => {
    const monthExpenses = expenses.filter(e => {
      const d = e.date || e.created_at || e.expense_date ? new Date(e.date || e.created_at || e.expense_date) : null;
      return d && d.getFullYear() === Number(budgetYear) && d.getMonth() === idx
        && (budgetProgramFilter === 'All Programs' || e.programId === budgetProgramFilter);
    }).reduce((sum, e) => sum + (Number(e.amount) || Number(e.gross_amount) || 0), 0);
    return {
      month,
      budget: budgetPrograms.reduce((sum, program) => {
        const start = new Date(program.startDate);
        const end = new Date(program.endDate || program.startDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start.getFullYear() !== Number(budgetYear)) return sum;
        const monthCount = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1);
        return idx >= start.getMonth() && idx <= end.getMonth()
          ? sum + (Number(program.budgetAllocation) || 0) / monthCount
          : sum;
      }, 0) + unallocatedBudget / 12,
      spent: monthExpenses
    };
  });

  const progColors = ['#091d64', '#2563eb', '#60a5fa', '#93c5fd', '#94a3b8', '#cbd5e1'];
  const totalAllocBudget = budgetScopeAllocated;
  const programAllocationData = budgetPrograms.map((p, idx) => {
    const alloc = p.budgetAllocation || 0;
    const pct = totalAllocBudget > 0 ? ((alloc / totalAllocBudget) * 100).toFixed(1) : '0';
    return {
      name: p.title,
      value: alloc,
      color: progColors[idx % progColors.length],
      percentage: `${pct}%`
    };
  });
  const budgetAllocationByProgramData = [
    ...programAllocationData,
    ...(unallocatedBudget > 0 ? [{
      name: 'Unallocated reserve',
      value: unallocatedBudget,
      color: '#cbd5e1',
      percentage: `${((unallocatedBudget / totalAllocBudget) * 100).toFixed(1)}%`,
    }] : []),
  ];

  const budgetUtilizationTable = [
    ...budgetPrograms.map(p => {
      const spent = expenses.filter(e => e.programId === p.id).reduce((sum, e) => sum + (Number(e.amount) || Number(e.gross_amount) || 0), 0) || p.spentBudget || 0;
      const remaining = Math.max(0, (p.budgetAllocation || 0) - spent);
      const rate = p.budgetAllocation > 0 ? Number(((spent / p.budgetAllocation) * 100).toFixed(1)) : 0;
      return {
        program: p.title,
        allocated: p.budgetAllocation || 0,
        spent,
        remaining,
        rate
      };
    }),
    ...(budgetProgramFilter === 'All Programs' && expenses.some(expense => !expense.programId) ? [{
      program: 'Unassigned expenses',
      allocated: 0,
      spent: expenses.filter(expense => !expense.programId).reduce((sum, expense) => sum + (Number(expense.amount) || Number(expense.gross_amount) || 0), 0),
      remaining: 0,
      rate: 0,
    }] : []),
    ...(unallocatedBudget > 0 ? [{
      program: 'Unallocated reserve',
      allocated: unallocatedBudget,
      spent: 0,
      remaining: unallocatedBudget,
      rate: 0,
    }] : []),
  ];
  const overspentBudgetPrograms = budgetUtilizationTable.filter(row => row.spent > row.allocated && row.allocated > 0);

  const handleCreateProgramSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProgForm.title) {
      alert('Please enter a Program Title.');
      return;
    }

    const createdProg: Program = {
      id: editingProgram?.id || `prog-${Date.now().toString().slice(-3)}`,
      title: newProgForm.title,
      description: newProgForm.description,
      startDate: newProgForm.startDate,
      endDate: newProgForm.endDate,
      location: newProgForm.location,
      maxParticipants: newProgForm.maxParticipants,
      budgetAllocation: newProgForm.budgetAllocation ?? 0,
      spentBudget: 0,
      aipReference: newProgForm.aipReference.trim(),
      category: newProgForm.category,
      status: newProgForm.status,
      registeredCount: 0
    };

    if (editingProgram) {
      void onUpdateProgram(createdProg).then(success => {
        if (success) {
          setProgramNotice({ type: 'success', text: `"${createdProg.title}" updated successfully.` });
          setEditingProgram(null);
          setShowCreateProgDrawer(false);
          setTimeout(() => setProgramNotice(null), 5000);
        } else {
          setProgramNotice({ type: 'error', text: 'Failed to update program. Please check the details and try again.' });
        }
      });
    } else {
      void onCreateProgram(createdProg).then(success => {
        if (success) {
          setProgramNotice({ type: 'success', text: `"${createdProg.title}" created successfully.` });
          setShowCreateProgDrawer(false);
          setTimeout(() => setProgramNotice(null), 5000);
        } else {
          setProgramNotice({ type: 'error', text: 'Failed to create program. Please check the details and try again.' });
        }
      });
    }
    
    setNewProgForm({
      title: '',
      description: '',
      category: 'Sports Development',
      startDate: '',
      endDate: '',
      location: '',
      maxParticipants: 0,
      budgetAllocation: null,
      aipReference: '',
      status: 'Upcoming'
    });
  };

  const calendarStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const calendarDays = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const calendarOffset = calendarStart.getDay();
  const calendarCells = Array.from({ length: Math.ceil((calendarOffset + calendarDays) / 7) * 7 }, (_, index) => {
    const day = index - calendarOffset + 1;
    return day > 0 && day <= calendarDays ? new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day) : null;
  });
  const programsForDay = (day: Date) => programs.filter(program => {
    const start = new Date(program.startDate);
    const end = new Date(program.endDate || program.startDate);
    const current = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    return current >= new Date(start.getFullYear(), start.getMonth(), start.getDate())
      && current <= new Date(end.getFullYear(), end.getMonth(), end.getDate());
  });
  const openProgramEditor = (program?: Program, mode: 'edit' | 'view' = 'edit') => {
    if (mode === 'view' && program) { setViewingProgram(program); return; }
    if (!program) {
      setEditingProgram(null);
      setNewProgForm(previous => ({ ...previous, title: '', description: '', startDate: '', endDate: '', location: '', maxParticipants: 0, budgetAllocation: null }));
    } else {
      setEditingProgram(program);
      setNewProgForm({
        title: program.title,
        description: program.description,
        category: program.category,
        startDate: program.startDate,
        endDate: program.endDate,
        location: program.location,
        maxParticipants: program.maxParticipants,
        budgetAllocation: Number(program.budgetAllocation) || 0,
        aipReference: program.aipReference || '',
        status: program.status,
      });
    }
    setShowCreateProgDrawer(true);
  };
return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#f8fafc] overflow-hidden font-sans text-slate-800">
      {programNotice && (
        <div className={"fixed top-6 right-6 z-[100] px-4 py-3 rounded-xl shadow-lg border text-xs font-bold max-w-sm " + (programNotice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800')}>
          {programNotice.text}
        </div>
      )}

      {viewingProgram && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setViewingProgram(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-100" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#091d64] text-white p-6 flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300 mb-1">Program Details</p>
                <h3 className="text-lg font-black leading-tight">{viewingProgram.title}</h3>
                <p className="text-xs text-blue-100 mt-1">{viewingProgram.category}</p>
              </div>
              <button onClick={() => setViewingProgram(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/80">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Start Date</span>
                  <span className="font-bold text-slate-800">{viewingProgram.startDate || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">End Date</span>
                  <span className="font-bold text-slate-800">{viewingProgram.endDate || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Venue / Location</span>
                  <span className="font-bold text-slate-800">{viewingProgram.location || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Status</span>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-black rounded uppercase">{viewingProgram.status}</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase block">Budget Allocation</span>
                  <span className="font-bold text-emerald-800 font-mono">₱{(Number(viewingProgram.budgetAllocation) || 0).toLocaleString()}</span>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <span className="text-[10px] font-bold text-blue-600 uppercase block">Max Slots</span>
                  <span className="font-bold text-blue-800 font-mono">{viewingProgram.maxParticipants || 0}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Registered</span>
                  <span className="font-bold text-slate-800 font-mono">{viewingProgram.registeredCount || 0}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">AIP Reference</span>
                  <span className="font-bold text-slate-800 font-mono">{viewingProgram.aipReference || '—'}</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Description</span>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">{viewingProgram.description || 'No description provided.'}</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setViewingProgram(null)} className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Close</button>
              <button onClick={() => { const p = viewingProgram; setViewingProgram(null); if (p) openProgramEditor(p); }} className="px-4 py-2 text-xs font-bold bg-[#091d64] hover:bg-[#061344] text-white rounded-lg">Edit Program</button>
            </div>
          </div>
        </div>
      )}
      
      {/* MOBILE HEADER */}
      <div className="lg:hidden bg-[#091d64] text-white px-4 py-3 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2.5">
          <KabisigLogo className="scale-75" />
          <span className="text-[10px] font-bold bg-[#1e3a8a] px-2 py-0.5 rounded text-sky-200">Brgy. {currentBarangay?.name}</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* MOBILE DRAWER */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 lg:hidden flex flex-col justify-between p-6 animate-in fade-in duration-200">
          <div className="space-y-6 overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <KabisigLogo className="scale-90" />
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="space-y-2">
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-wider mb-2">
                Executive SK Console — Brgy. {currentBarangay?.name}
              </div>
              <button
                onClick={() => { setActiveMenu('dashboard'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 ${activeMenu === 'dashboard' ? 'bg-[#091d64] text-white shadow-md' : 'text-slate-200 hover:bg-white/10'}`}
              >
                <LayoutDashboard className="w-4.5 h-4.5 text-amber-400" />
                Dashboard
              </button>
              <button
                onClick={() => { setActiveMenu('youth'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between ${activeMenu === 'youth' ? 'bg-[#091d64] text-white shadow-md' : 'text-slate-200 hover:bg-white/10'}`}
              >
                <span className="flex items-center gap-3">
                  <Users className="w-4.5 h-4.5 text-amber-400" />
                  Youth Management
                </span>
                {pendingRegistrations.length > 0 && (
                  <span className="bg-rose-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                    {pendingRegistrations.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setActiveMenu('programs'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 ${activeMenu === 'programs' ? 'bg-[#091d64] text-white shadow-md' : 'text-slate-200 hover:bg-white/10'}`}
              >
                <ClipboardList className="w-4.5 h-4.5 text-amber-400" />
                Programs & Projects
              </button>
              <button
                onClick={() => { setActiveMenu('budget'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 ${activeMenu === 'budget' ? 'bg-[#091d64] text-white shadow-md' : 'text-slate-200 hover:bg-white/10'}`}
              >
                <Coins className="w-4.5 h-4.5 text-amber-400" />
                Budget Monitoring
              </button>
              <button
                onClick={() => { setActiveMenu('documents'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 ${activeMenu === 'documents' ? 'bg-[#091d64] text-white shadow-md' : 'text-slate-200 hover:bg-white/10'}`}
              >
                <Folder className="w-4.5 h-4.5 text-amber-400" />
                Document Repository
              </button>
              <button
                onClick={() => { setActiveMenu('reports'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 ${activeMenu === 'reports' ? 'bg-[#091d64] text-white shadow-md' : 'text-slate-200 hover:bg-white/10'}`}
              >
                <BarChart3 className="w-4.5 h-4.5 text-amber-400" />
                Reports Desk
              </button>
              <button
                onClick={() => { setActiveMenu('announcements'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 ${activeMenu === 'announcements' ? 'bg-[#091d64] text-white shadow-md' : 'text-slate-200 hover:bg-white/10'}`}
              >
                <Megaphone className="w-4.5 h-4.5 text-amber-400" />
                Announcements
              </button>
              <button
                onClick={() => { setActiveMenu('settings'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 ${activeMenu === 'settings' ? 'bg-[#091d64] text-white shadow-md' : 'text-slate-200 hover:bg-white/10'}`}
              >
                <SettingsIcon className="w-4.5 h-4.5 text-amber-400" />
                Settings
              </button>
              <button
                onClick={() => { setActiveMenu('audit'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 ${activeMenu === 'audit' ? 'bg-[#091d64] text-white shadow-md' : 'text-slate-200 hover:bg-white/10'}`}
              >
                <History className="w-4.5 h-4.5 text-amber-400" />
                Audit Log
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

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-100 flex-col justify-between h-full flex-shrink-0 z-40 shadow-sm">
        <div className="flex flex-col h-full overflow-y-auto">
          <div className="p-5 border-b border-slate-100 flex flex-col items-center gap-3 bg-gradient-to-b from-blue-50/40 to-transparent">
            <KabisigLogo className="scale-90" />
          </div>

          <nav className="p-4 space-y-1 flex-1">
            <button
              onClick={() => setActiveMenu('dashboard')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 ${
                activeMenu === 'dashboard' 
                  ? 'bg-[#eff6ff] text-[#091d64] shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#091d64]'
              }`}
            >
              <LayoutDashboard className={`w-4.5 h-4.5 ${activeMenu === 'dashboard' ? 'text-[#091d64]' : 'text-slate-400'}`} />
              Dashboard
            </button>
            
            <button
              onClick={() => setActiveMenu('youth')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${
                activeMenu === 'youth' 
                  ? 'bg-[#eff6ff] text-[#091d64] shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#091d64]'
              }`}
            >
              <span className="flex items-center gap-3">
                <Users className={`w-4.5 h-4.5 ${activeMenu === 'youth' ? 'text-[#091d64]' : 'text-slate-400'}`} />
                Youth Management
              </span>
              {pendingRegistrations.length > 0 && (
                <span className="bg-rose-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full font-mono">
                  {pendingRegistrations.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveMenu('programs')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 ${
                activeMenu === 'programs' 
                  ? 'bg-[#eff6ff] text-[#091d64] shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#091d64]'
              }`}
            >
              <ClipboardList className={`w-4.5 h-4.5 ${activeMenu === 'programs' ? 'text-[#091d64]' : 'text-slate-400'}`} />
              Programs & Projects
            </button>

            <button
              onClick={() => setActiveMenu('budget')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 ${
                activeMenu === 'budget' 
                  ? 'bg-[#eff6ff] text-[#091d64] shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#091d64]'
              }`}
            >
              <Coins className={`w-4.5 h-4.5 ${activeMenu === 'budget' ? 'text-[#091d64]' : 'text-slate-400'}`} />
              Budget Management
            </button>

            <button
              onClick={() => setActiveMenu('documents')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 ${
                activeMenu === 'documents' 
                  ? 'bg-[#eff6ff] text-[#091d64] shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#091d64]'
              }`}
            >
              <Folder className={`w-4.5 h-4.5 ${activeMenu === 'documents' ? 'text-[#091d64]' : 'text-slate-400'}`} />
              Documents
            </button>

            <button
              onClick={() => setActiveMenu('reports')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 ${
                activeMenu === 'reports' 
                  ? 'bg-[#eff6ff] text-[#091d64] shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#091d64]'
              }`}
            >
              <BarChart3 className={`w-4.5 h-4.5 ${activeMenu === 'reports' ? 'text-[#091d64]' : 'text-slate-400'}`} />
              Reports
            </button>

            <button
              onClick={() => setActiveMenu('announcements')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 ${
                activeMenu === 'announcements' 
                  ? 'bg-[#eff6ff] text-[#091d64] shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#091d64]'
              }`}
            >
              <Megaphone className={`w-4.5 h-4.5 ${activeMenu === 'announcements' ? 'text-[#091d64]' : 'text-slate-400'}`} />
              Announcements
            </button>

            <button
              onClick={() => setActiveMenu('settings')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 ${
                activeMenu === 'settings'
                  ? 'bg-[#eff6ff] text-[#091d64] shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#091d64]'
              }`}
            >
              <SettingsIcon className={`w-4.5 h-4.5 ${activeMenu === 'settings' ? 'text-[#091d64]' : 'text-slate-400'}`} />
              Settings
            </button>

            <button
              onClick={() => setActiveMenu('audit')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 ${
                activeMenu === 'audit' 
                  ? 'bg-[#eff6ff] text-[#091d64] shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#091d64]'
              }`}
            >
              <History className={`w-4.5 h-4.5 ${activeMenu === 'audit' ? 'text-[#091d64]' : 'text-slate-400'}`} />
              Audit Log
            </button>

            <div className="pt-4 border-t border-slate-50">
              <button
                onClick={onLogout}
                className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                Log Out
              </button>
            </div>
          </nav>
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* DESKTOP HEADER */}
        <header className="hidden lg:flex bg-white border-b border-slate-100 h-20 items-center justify-between px-8 flex-shrink-0 z-30">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <h1 className="font-sans font-extrabold text-[#091d64] text-2xl tracking-tight leading-none">
                  {activeMenu === 'dashboard' && `Barangay ${currentBarangay?.name || 'Barangay'} Dashboard`}
                  {activeMenu === 'youth' && 'Youth Management Registry'}
                  {activeMenu === 'programs' && 'Manage Programs'}
                  {activeMenu === 'budget' && 'Budget Monitoring'}
                  {activeMenu === 'documents' && 'Document Repository'}
                  {activeMenu === 'reports' && 'Reports Desk'}
                  {activeMenu === 'announcements' && 'Sangguniang Kabataan Announcements'}
                  {activeMenu === 'settings' && 'System Parameters Settings'}
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-[#091d64] text-white">
                  Barangay Admin
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-sans tracking-wide font-semibold mt-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Sangguniang Kabataan • Barangay {currentBarangay?.name || 'Barangay'}, Naga City
              </span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <NotificationMenu
              supplementalItems={[
                ...pendingRegistrations.map(profile => ({
                  id: `registration-${profile.id}`,
                  title: `Registration request from ${profile.name}`,
                  message: `Requested role: ${profile.registeredRole || 'Youth Constituent'} · Registered ${profile.dateRegistered}`,
                  is_read: false,
                  actionLabel: 'Review',
                  onSelect: () => setInspectProfile(profile),
                })),
                ...complianceIssues.map(issue => ({
                  id: `compliance-${issue.code}`,
                  title: issue.message.includes(':') ? issue.message.slice(0, issue.message.indexOf(':')) : 'Compliance notice',
                  message: `${issue.message.includes(':') ? issue.message.slice(issue.message.indexOf(':') + 1).trim() : issue.message} Recommended action: ${issue.action}`,
                  is_read: false,
                  actionLabel: 'Resolve',
                  onSelect: () => {
                    if (issue.action.includes('Document') || issue.action.includes('Budget')) setActiveMenu('documents');
                    else if (issue.action.includes('registration')) setActiveMenu('youth');
                    else setActiveMenu('programs');
                  },
                })),
                {
                  id: 'budget-trend',
                  title: `Budget spending trend: ${budgetAnalytics.consumptionTrend}`,
                  message: budgetAnalytics.consumptionTrend === 'Accelerated' ? 'Spending is progressing faster than planned.' : budgetAnalytics.consumptionTrend === 'Under-utilizing' ? 'Spending is below the expected pace.' : 'Spending is progressing as expected.',
                  is_read: true,
                  countInBadge: false,
                },
                ...budgetAlerts.map(alert => ({
                  id: `budget-${alert.code}`,
                  title: `${alert.level} budget alert`,
                  message: alert.message,
                  is_read: false,
                })),
                ...overspentBudgetPrograms.map(row => ({
                  id: `overspending-${row.program}`,
                  title: `Overspending in ${row.program}`,
                  message: `₱${(row.spent - row.allocated).toLocaleString()} over the allocated budget.`,
                  is_read: false,
                })),
                ...(pendingRegistrations.length === 0 ? [{ id: 'no-pending-validations', title: 'No pending validations', message: 'There are no registration requests waiting for review.', is_read: true, countInBadge: false }] : []),
                ...(complianceIssues.length === 0 ? [{ id: 'compliance-clear', title: 'Compliance is up to date', message: 'No issues were detected by the compliance tracker.', is_read: true, countInBadge: false }] : []),
                ...(budgetAlerts.length === 0 ? [{ id: 'budget-clear', title: 'Budget checks completed', message: 'No budget irregularities were detected.', is_read: true, countInBadge: false }] : []),
                ...(overspentBudgetPrograms.length === 0 ? [{ id: 'overspending-clear', title: 'No overspending detected', message: 'All programs are within their allocated budgets.', is_read: true, countInBadge: false }] : []),
              ] satisfies NotificationMenuItem[]}
              onNavigate={link => {
                if (link.includes('calendar')) setActiveMenu('programs');
                else if (link.includes('budget')) setActiveMenu('budget');
              }}
            />

            <UserMenu 
              userName={currentUser?.full_name || (currentBarangay?.chairperson && currentBarangay.chairperson !== 'Unassigned' ? currentBarangay.chairperson : 'SK Chairperson')}
              role="SK Chairperson"
              onLogout={onLogout}
            />
          </div>
        </header>

        {/* WORKSPACE AREA */}
        <div className="flex-grow p-3.5 sm:p-6 lg:p-8 pb-24 sm:pb-8 overflow-y-auto bg-[#f8fafc]">
          
          {/* 1. DASHBOARD VIEW */}
          {activeMenu === 'dashboard' && (
            <div className="space-y-6">
              
              {/* METRICS CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
                
                {/* CARD 1: BARANGAY IDENTITY */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-4 flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center border border-slate-200/80 p-1.5 flex-shrink-0 shadow-2xs overflow-hidden">
                    {barangayLogo ? (
                      <img 
                        src={barangayLogo} 
                        alt={`Barangay ${currentBarangay?.name} Official Seal`} 
                        className="w-full h-full object-contain" 
                      />
                    ) : (
                      <Building2 className="w-8 h-8 text-[#091d64]" />
                    )}
                  </div>
                  <div>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                      Official Seal
                    </span>
                    <h3 className="font-extrabold text-sm text-[#091d64] leading-tight mt-1">Barangay {currentBarangay?.name || 'Barangay'}</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Naga City, Camarines Sur</p>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">SK Council {new Date().getFullYear()}</p>
                  </div>
                </div>

                {/* CARD 2 */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Youth Population</span>
                    <div className="p-2.5 bg-blue-50 text-[#091d64] rounded-lg">
                      <Users className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <h4 className="text-2xl font-extrabold text-slate-800 leading-none">{currentBarangay?.youthPopulation || localProfiles.length || 0}</h4>
                    <span className="text-[10px] text-slate-400 font-medium mt-1 inline-block">Ages 15-30</span>
                  </div>
                  <button 
                    onClick={() => setActiveMenu('youth')}
                    className="text-[11px] text-[#091d64] font-bold hover:underline flex items-center gap-1 mt-3"
                  >
                    View Details &rarr;
                  </button>
                </div>

                {/* CARD 3 */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Programs</span>
                    <div className="p-2.5 bg-blue-50 text-[#091d64] rounded-lg">
                      <ClipboardList className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <h4 className="text-2xl font-extrabold text-slate-800 leading-none">{programs.length}</h4>
                    <span className="text-[10px] text-slate-400 font-medium mt-1 inline-block">Ongoing Initiatives</span>
                  </div>
                  <button 
                    onClick={() => setActiveMenu('programs')}
                    className="text-[11px] text-[#091d64] font-bold hover:underline flex items-center gap-1 mt-3"
                  >
                    View Programs &rarr;
                  </button>
                </div>

                {/* CARD 4 */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Budget</span>
                    <div className="p-2.5 bg-blue-50 text-[#091d64] rounded-lg">
                      <Coins className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <h4 className="text-2xl font-extrabold text-slate-800 leading-none">₱ {(currentBarangay?.totalBudget || 0).toLocaleString()}</h4>
                    <span className="text-[10px] text-slate-400 font-medium mt-1 inline-block">FY {new Date().getFullYear()} Budget</span>
                  </div>
                  <button 
                    onClick={() => setActiveMenu('budget')}
                    className="text-[11px] text-[#091d64] font-bold hover:underline flex items-center gap-1 mt-3"
                  >
                    View Budget &rarr;
                  </button>
                </div>

                {/* CARD 5 */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Approvals</span>
                    <div className="p-2.5 bg-red-50 text-red-500 rounded-lg">
                      <Clock className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <h4 className="text-2xl font-extrabold text-slate-800 leading-none">{pendingRegistrations.length}</h4>
                    <span className="text-[10px] text-slate-400 font-medium mt-1 inline-block">For Your Review</span>
                  </div>
                  <button 
                    onClick={() => setActiveMenu('youth')}
                    className="text-[11px] text-red-600 font-bold hover:underline flex items-center gap-1 mt-3"
                  >
                    Review Now &rarr;
                  </button>
                </div>

              </div>

              {/* QUICK ACTIONS */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Quick Actions</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button 
                    onClick={() => { setActiveMenu('programs'); }}
                    className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs hover:shadow-xs hover:border-blue-100 text-left flex items-center gap-4 transition-all cursor-pointer"
                  >
                    <div className="p-3 bg-blue-50 text-[#091d64] rounded-lg">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">Create Program</h5>
                      <p className="text-[10px] text-slate-400">Add a new program or activity</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setActiveMenu('youth')}
                    className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs hover:shadow-xs hover:border-blue-100 text-left flex items-center gap-4 transition-all cursor-pointer"
                  >
                    <div className="p-3 bg-blue-50 text-[#091d64] rounded-lg">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">View Registrations</h5>
                      <p className="text-[10px] text-slate-400">Manage youth registrations</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setActiveMenu('documents')}
                    className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs hover:shadow-xs hover:border-blue-100 text-left flex items-center gap-4 transition-all cursor-pointer"
                  >
                    <div className="p-3 bg-blue-50 text-[#091d64] rounded-lg">
                      <Folder className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">Manage Documents</h5>
                      <p className="text-[10px] text-slate-400">Upload and manage documents</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* COMPLIANCE & BUDGET ALERTS */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-xs">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-black text-[#091d64] uppercase tracking-wider flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-500" />
                      Compliance Tracker
                    </h4>
                    <span className="text-[9px] bg-amber-50 text-amber-800 font-extrabold px-2 py-0.5 rounded-full">
                      DILG Statutory Audit
                    </span>
                  </div>
                  <div className="space-y-3 max-h-72 overflow-y-auto">
                    {complianceIssues.map((issue, idx) => (
                      <div key={idx} className={`p-3 rounded-lg border flex gap-3 items-start ${
                        issue.level === 'Urgent' ? 'bg-red-50/50 border-red-100 text-red-950' : 'bg-amber-50/50 border-amber-100 text-amber-950'
                      }`}>
                        <div className={`p-1.5 rounded-full mt-0.5 flex-shrink-0 ${issue.level === 'Urgent' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold leading-tight">{issue.message}</p>
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-500">Action: {issue.action}</span>
                            <button 
                              type="button"
                              onClick={() => {
                                if (issue.action.includes('Document') || issue.action.includes('Budget')) {
                                  setActiveMenu('documents');
                                } else if (issue.action.includes('registration')) {
                                  setActiveMenu('youth');
                                } else {
                                  setActiveMenu('programs');
                                }
                              }}
                              className="text-[9px] text-blue-700 font-extrabold hover:underline cursor-pointer"
                            >
                              Resolve &rarr;
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {complianceIssues.length === 0 && (
                      <div className="py-8 text-center text-xs text-slate-400 font-bold">
                        Zero compliance issues detected. Sangguniang Kabataan fully compliant.
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-xs">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-black text-[#091d64] uppercase tracking-wider flex items-center gap-2">
                      <Coins className="w-4 h-4 text-[#091d64]" />
                      Budget Auditor & Alerts
                    </h4>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                      budgetAnalytics.consumptionTrend === 'Accelerated' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      Trend: {budgetAnalytics.consumptionTrend}
                    </span>
                  </div>
                  <div className="space-y-3 max-h-72 overflow-y-auto">
                    {budgetAlerts.map((alert, idx) => (
                      <div key={idx} className={`p-3 rounded-lg border flex gap-3 items-start ${
                        alert.level === 'Critical' ? 'bg-red-50/50 border-red-100' : alert.level === 'Warning' ? 'bg-amber-50/50 border-amber-100' : 'bg-blue-50/50 border-blue-100'
                      }`}>
                        <div className={`p-1.5 rounded-full mt-0.5 flex-shrink-0 ${
                          alert.level === 'Critical' ? 'bg-red-100 text-red-600' : alert.level === 'Warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold leading-tight text-slate-800">{alert.message}</p>
                          <span className="text-[8px] text-slate-400 font-mono font-bold block mt-1">Trigger Code: {alert.code}</span>
                        </div>
                      </div>
                    ))}
                    {budgetAlerts.length === 0 && (
                      <div className="py-8 text-center text-xs text-slate-400 font-bold">
                        Budget spend checks successfully completed. No irregularities.
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* 2. YOUTH MANAGEMENT */}
          {activeMenu === 'youth' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-100">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                  <div>
                    <h3 className="font-extrabold text-[#091d64] text-lg">Katipunan ng Kabataan Registry Desk</h3>
                    <p className="text-xs text-slate-400 mt-1">Review and validate youth profile records matching DILG profiling requirements</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as any)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white focus:outline-none cursor-pointer"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Pending">Pending Validation</option>
                      <option value="Approved">Approved Profiles</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div className="relative mb-6">
                  <input 
                    type="text" 
                    placeholder="Search registry by name, email or Purok..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>


              {/* BENEFICIARY DISTRIBUTION AUDIT */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <h4 className="font-extrabold text-slate-800 text-sm">Underserved Youth</h4>
                    <span className="ml-auto text-[10px] font-extrabold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full">
                      {underservedYouth.length} Never Participated
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-3">Approved youth with zero program registrations. Prioritize these for outreach to ensure equitable distribution.</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {underservedYouth.slice(0, 8).map(y => (
                      <div key={y.id} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-50">
                        <span className="font-bold text-slate-700 truncate">{y.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono flex-shrink-0 ml-2">{y.zone}</span>
                      </div>
                    ))}
                    {underservedYouth.length === 0 && (
                      <p className="py-3 text-center text-[10px] text-emerald-600 font-bold">All approved youth have received at least one program.</p>
                    )}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-rose-100 shadow-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <h4 className="font-extrabold text-slate-800 text-sm">Duplicate Assistance Flag</h4>
                    <span className="ml-auto text-[10px] font-extrabold bg-rose-50 text-rose-800 px-2 py-0.5 rounded-full">
                      {overBenefitedYouth.length} For Review
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-3">Youth participating in 3 or more programs. Review to prevent duplicate resource allocation.</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {overBenefitedYouth.slice(0, 8).map(y => (
                      <div key={y.id} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-50">
                        <span className="font-bold text-slate-700 truncate">{y.name}</span>
                        <span className="text-[10px] font-extrabold text-rose-700 flex-shrink-0 ml-2">{y.programCount} programs</span>
                      </div>
                    ))}
                    {overBenefitedYouth.length === 0 && (
                      <p className="py-3 text-center text-[10px] text-emerald-600 font-bold">No duplicate assistance patterns detected.</p>
                    )}
                  </div>
                </div>
              </div>

                <div className="overflow-x-auto border border-slate-100 rounded-lg">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[10px] text-slate-500 font-extrabold uppercase border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3">Applicant Profile</th>
                        <th className="px-6 py-3">Age / Sex</th>
                        <th className="px-6 py-3">Residency Address</th>
                        <th className="px-6 py-3">Scholastic State</th>
                        <th className="px-6 py-3 text-center">Status</th>
                        <th className="px-6 py-3 text-center">Desk Validation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {!youthProfilesLoading && !youthProfilesError && filteredProfiles.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-extrabold text-slate-800 flex items-center gap-3">
                            <ProfileAvatar name={p.name} src={p.profilePic} alt={p.name} className="w-8 h-8 rounded-full border border-slate-100" />
                            <div>
                              <span className="block font-bold">{p.name}</span>
                              <span className="text-[9px] text-slate-400 font-mono font-bold block mt-0.5">{p.id}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold">
                            {p.age} yrs / <span className="text-slate-500 font-semibold">{p.sex}</span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-500">
                            {p.address} ({p.zone})
                          </td>
                          <td className="px-6 py-4">
                            <span className="block font-bold text-slate-700">{p.educationalLevel}</span>
                            <span className="text-[9px] text-amber-600 font-bold block mt-0.5">{p.scholarStatus}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              p.status === 'Approved' ? 'bg-green-100 text-green-800' :
                              p.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => setInspectProfile(p)}
                              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold rounded-lg flex items-center gap-1 mx-auto transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                      {youthProfilesLoading && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-bold text-xs">
                            <span className="inline-flex items-center gap-2">
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#091d64]" />
                              Loading youth records...
                            </span>
                          </td>
                        </tr>
                      )}
                      {!youthProfilesLoading && youthProfilesError && (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-rose-600 font-semibold text-xs">
                            <div className="flex flex-col items-center gap-3">
                              <span>Unable to load records. {youthProfilesError}</span>
                              <button
                                type="button"
                                onClick={onRetryYouthProfiles}
                                className="rounded-lg bg-[#091d64] px-3 py-1.5 text-white font-bold hover:bg-blue-900"
                              >
                                Retry
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                      {!youthProfilesLoading && !youthProfilesError && localProfiles.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold text-xs">
                            No records found.
                          </td>
                        </tr>
                      )}
                      {!youthProfilesLoading && !youthProfilesError && localProfiles.length > 0 && filteredProfiles.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold text-xs">
                            No matching applicant profiles found in registry.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. MANAGE PROGRAMS */}
          {activeMenu === 'programs' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-xl font-extrabold text-[#091d64]">Manage Programs</h3>
                  <p className="text-xs text-slate-400 mt-1">View, manage, and track all programs and initiatives.</p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                  <div className="bg-slate-100 p-0.5 rounded-lg flex items-center border border-slate-100">
                    <button 
                      onClick={() => setProgListFilter('List')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                        progListFilter === 'List' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      List View
                    </button>
                    <button 
                      onClick={() => setProgListFilter('Calendar')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                        progListFilter === 'Calendar' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Calendar View
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => openProgramEditor()}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Program
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-4">
                  {progListFilter === 'Calendar' ? (
                    <div className="bg-white rounded-xl border border-slate-100 shadow-2xs p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-extrabold text-[#091d64]">AIP Localized Program Timeline</h4>
                          <p className="text-[11px] text-slate-400">Click a program to edit it. Changes are saved to the shared program record.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} className="px-2 py-1 border rounded text-xs font-bold">‹</button>
                          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-black">
                            {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                          </span>
                          <button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className="px-2 py-1 border rounded text-xs font-bold">&gt;</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 border-l border-t border-slate-200">
                        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                          <div key={day} className="bg-[#091d64] text-white text-center text-[10px] font-black py-2 border-r border-b border-[#091d64]">{day}</div>
                        ))}
                        {calendarCells.map((day, index) => (
                          <div key={`${day?.toISOString() || 'empty'}-${index}`} className={`min-h-[112px] border-r border-b border-slate-200 p-1.5 ${day ? 'bg-white' : 'bg-slate-50'}`}>
                            {day && <span className="text-[10px] font-bold text-slate-500">{day.getDate()}</span>}
                            <div className="space-y-1 mt-1">
                              {day && programsForDay(day).map(program => (
                                <button
                                  type="button"
                                  key={program.id}
                                  onClick={() => openProgramEditor(program, 'view')}
                                  className="w-full text-left rounded px-1.5 py-1 text-[9px] font-bold text-white bg-blue-600 hover:bg-blue-700 truncate"
                                  title={`${program.title} · ${program.category}`}
                                >
                                  {program.title}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : programs.map(p => (
                    <div key={p.id} className="bg-white rounded-xl border border-slate-100 shadow-2xs p-5 flex flex-col md:flex-row gap-5 items-start justify-between">
                      <div className="flex gap-4 items-start">
                        <div className="w-20 h-20 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                          <ClipboardList className="w-8 h-8 text-[#091d64]" />
                        </div>
                        <div>
                          <h4 className="text-base font-extrabold text-[#091d64]">{p.title}</h4>
                          <div className="flex items-center gap-1 text-slate-400 font-bold text-[10px] mt-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {p.startDate} - {p.endDate}
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">{p.description}</p>
                        </div>
                      </div>

                      <div className="w-full md:w-auto flex md:flex-col items-end justify-between md:justify-center border-t md:border-t-0 pt-4 md:pt-0 mt-4 md:mt-0 gap-4">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">Status</span>
                          <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full inline-block mt-0.5">
                            {p.status}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-bold">Budget</span>
                          <span className="text-xs font-extrabold text-slate-800 block mt-0.5">₱ {(p.budgetAllocation || 0).toLocaleString()}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-bold">Registrations</span>
                          <span className="text-xs font-extrabold text-slate-800 block mt-0.5">{p.registeredCount || 0} / {p.maxParticipants || 0}</span>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => openProgramEditor(p)} className="px-2 py-1 border rounded text-[10px] font-bold">Edit</button>
                          <button type="button" onClick={() => { if (window.confirm(`Delete "${p.title}"?`)) void onDeleteProgram(p.id); }} className="px-2 py-1 border border-red-200 text-red-600 rounded text-[10px] font-bold">Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {programs.length === 0 && (
                    <div className="bg-white p-12 text-center rounded-xl border border-slate-100 text-slate-400 font-bold text-xs">
                      No programs created yet. Click "Create New Program" to publish one.
                    </div>
                  )}
                </div>

                {showCreateProgDrawer && (
                  <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-xs h-fit sticky top-6">
                    <div className="flex justify-between items-center border-b pb-3 mb-4">
                      <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">{editingProgram ? 'Edit Program' : 'Create New Program'}</h4>
                      <button 
                        onClick={() => setShowCreateProgDrawer(false)}
                        className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleCreateProgramSubmit} className="space-y-4">
                      {/* SECTION: Program Details */}
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-[#091d64] uppercase tracking-widest border-b border-slate-100 pb-1">Program Details</p>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Program Title <span className="text-rose-500">*</span></label>
                          <input type="text" value={newProgForm.title} onChange={(e) => setNewProgForm({...newProgForm, title: e.target.value})} placeholder="e.g. Basketball League 2026" className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 font-semibold" required />
                          <p className="text-[10px] text-slate-400 mt-1">Short, descriptive name shown to youth constituents.</p>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Description</label>
                          <textarea value={newProgForm.description} onChange={(e) => setNewProgForm({...newProgForm, description: e.target.value})} placeholder="What is this program about? Who can join?" className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none" rows={3} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Category <span className="text-rose-500">*</span></label>
                          <select value={newProgForm.category} onChange={(e) => setNewProgForm({ ...newProgForm, category: e.target.value as Program['category'] })} className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-semibold" required>
                            <option>Health & Nutrition</option>
                            <option>Education & Scholarship</option>
                            <option>Sports Development</option>
                            <option>Livelihood & Skills</option>
                            <option>Peace & Security</option>
                            <option>Environmental Protection</option>
                          </select>
                        </div>
                      </div>

                      {/* SECTION: Schedule */}
                      <div className="space-y-3 pt-2">
                        <p className="text-[10px] font-bold text-[#091d64] uppercase tracking-widest border-b border-slate-100 pb-1">Schedule</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Start Date <span className="text-rose-500">*</span></label>
                            <input type="date" value={newProgForm.startDate} onChange={(e) => setNewProgForm({...newProgForm, startDate: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-semibold" required />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">End Date <span className="text-rose-500">*</span></label>
                            <input type="date" value={newProgForm.endDate} onChange={(e) => setNewProgForm({...newProgForm, endDate: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-semibold" required />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Venue / Location <span className="text-rose-500">*</span></label>
                          <input type="text" required value={newProgForm.location} onChange={(e) => setNewProgForm({ ...newProgForm, location: e.target.value })} placeholder="e.g. Barangay Hall Multi-Purpose Court" className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-semibold" />
                        </div>
                      </div>

                      {/* SECTION: Budget & Slots */}
                      <div className="space-y-3 pt-2">
                        <p className="text-[10px] font-bold text-[#091d64] uppercase tracking-widest border-b border-slate-100 pb-1">Budget & Slots</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Budget Allocation</label>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₱</span>
                              <input type="text" inputMode="decimal" value={newProgForm.budgetAllocation == null ? '' : newProgForm.budgetAllocation.toLocaleString('en-PH')} onChange={(e) => { const raw = e.target.value.replace(/[^0-9.]/g, '' ); setNewProgForm({...newProgForm, budgetAllocation: raw === '' ? null : Number(raw)}); }} placeholder="0" className="w-full border border-slate-200 rounded-lg pl-7 pr-3 p-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-semibold" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Max Slots <span className="text-rose-500">*</span></label>
                            <input type="number" min="1" required value={newProgForm.maxParticipants || ''} onChange={(e) => setNewProgForm({ ...newProgForm, maxParticipants: Number(e.target.value) || 0 })} placeholder="e.g. 50" className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-semibold" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">AIP Reference Code</label>
                          <input type="text" value={newProgForm.aipReference} onChange={(e) => setNewProgForm({ ...newProgForm, aipReference: e.target.value })} placeholder="e.g. AIP-2026-001" className="w-full border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                          <p className="text-[10px] text-slate-400 mt-1">Optional. Link this program to its Annual Investment Program line.</p>
                        </div>
                      </div>

                      {/* Sticky Footer */}
                      <div className="flex gap-2 pt-3 border-t border-slate-200 sticky bottom-0 bg-white">
                        <button type="button" onClick={() => { setShowCreateProgDrawer(false); }} className="flex-1 py-2 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-bold cursor-pointer transition-colors">Cancel</button>
                        <button type="submit" className="flex-1 py-2 text-xs bg-[#091d64] hover:bg-[#061344] text-white rounded-lg font-bold cursor-pointer transition-colors shadow-sm">{editingProgram ? 'Save Changes' : 'Create Program'}</button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. BUDGET MANAGEMENT */}
          {activeMenu === 'budget' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {totalBudgetNotice && (
                <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
                  {totalBudgetNotice}
                </div>
              )}
              {showSetTotal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
                  <form
                    onSubmit={async (event) => {
                      event.preventDefault();
                      setTotalFormError('');
                      const amount = Number(totalForm.amount.replace(/[^0-9.]/g, ''));
                      if (!amount || amount <= 0) { setTotalFormError('Amount must be greater than zero.'); return; }
                      if (!currentBarangay?.id) { setTotalFormError('No Barangay selected.'); return; }
                      setIsSavingTotal(true);
                      try {
                        const res = await kabisigApi.setSkTotalBudget(currentBarangay.id, {
                          total_amount: amount,
                          fiscal_year: Number(totalForm.fiscalYear),
                        });
                        if (!res.success) { setTotalFormError(res.message || 'Total budget save failed.'); return; }
                        setShowSetTotal(false);
                        setTotalForm({ amount: '', fiscalYear: String(new Date().getFullYear()) });
                        setSavedTotalBudget(amount);
                        setTotalBudgetNotice('Total SK budget saved: P' + amount.toLocaleString());
                        window.setTimeout(() => setTotalBudgetNotice(''), 5000);
                      } catch (err) {
                        setTotalFormError((err && err.message) ? err.message : 'Network error saving total budget.');
                      } finally {
                        setIsSavingTotal(false);
                      }
                    }}
                    className="w-full max-w-lg space-y-4 rounded-xl bg-white p-5 shadow-2xl"
                  >
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-base font-extrabold text-[#091d64]">Set total SK budget</h3>
                        <p className="mt-1 text-xs text-slate-500">Per DILG JMC No. 1 s. 2025 Item 4.3.2.2, the SK Chairperson prepares the SK Annual/Supplemental budget with assistance from the SK Treasurer. This is the ceiling the Treasurer allocates from.</p>
                      </div>
                      <button type="button" onClick={() => setShowSetTotal(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close total budget form"><X className="h-4 w-4" /></button>
                    </div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Fiscal year
                      <input required type="number" min="2020" max="2100" value={totalForm.fiscalYear} onChange={(event) => setTotalForm((previous) => ({ ...previous, fiscalYear: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800" />
                    </label>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Total SK budget for the year
                      <input required type="text" inputMode="decimal" value={totalForm.amount} onChange={(event) => setTotalForm((previous) => ({ ...previous, amount: formatCurrencyInput(event.target.value) }))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800" placeholder="0.00" />
                    </label>
                    {totalFormError && <p role="alert" className="text-xs font-semibold text-rose-700">{totalFormError}</p>}
                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                      <button type="button" disabled={isSavingTotal} onClick={() => setShowSetTotal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-50">Cancel</button>
                      <button type="submit" disabled={isSavingTotal} className="rounded-lg bg-[#091d64] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{isSavingTotal ? 'Saving...' : 'Save total budget'}</button>
                    </div>
                  </form>
                </div>
              )}
              {showSetBudget && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
                  <form
                    onSubmit={async (event) => {
                      event.preventDefault();
                      setBudgetFormError('');
                      if (!budgetForm.category.trim()) { setBudgetFormError('Category is required.'); return; }
                      const amount = Number(budgetForm.allocatedAmount.replace(/[^0-9.]/g, ''));
                      if (!amount || amount <= 0) { setBudgetFormError('Amount must be greater than zero.'); return; }
                      setIsSavingBudget(true);
                      try {
                        const res = await kabisigApi.allocateBudget({
                          fiscal_year: Number(budgetForm.fiscalYear),
                          category: budgetForm.category.trim(),
                          allocated_amount: amount,
                          description: budgetForm.description.trim() || undefined,
                        });
                        if (!res.success) { setBudgetFormError(res.message || 'Budget allocation failed.'); return; }
                        setShowSetBudget(false);
                        setBudgetForm({ category: '', allocatedAmount: '', description: '', fiscalYear: String(new Date().getFullYear()) });
                        
                      } catch (err) {
                        setBudgetFormError((err && err.message) ? err.message : 'Network error saving budget.');
                      } finally {
                        setIsSavingBudget(false);
                      }
                    }}
                    className="w-full max-w-lg space-y-4 rounded-xl bg-white p-5 shadow-2xl"
                  >
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-base font-extrabold text-[#091d64]">Set budget allocation</h3>
                        <p className="mt-1 text-xs text-slate-500">Per DILG JMC No. 1 s. 2025, the SK Chairperson prepares the barangay SK budget with the Treasurer's assistance.</p>
                      </div>
                      <button type="button" onClick={() => setShowSetBudget(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close budget form"><X className="h-4 w-4" /></button>
                    </div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Fiscal year
                      <input required type="number" min="2020" max="2100" value={budgetForm.fiscalYear} onChange={(event) => setBudgetForm((previous) => ({ ...previous, fiscalYear: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800" />
                    </label>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Program
                      <select required value={budgetForm.category} onChange={(event) => setBudgetForm((previous) => ({ ...previous, category: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800">
                        <option value="">Select a created program...</option>
                        {programs.filter(p => !currentBarangay?.id || p.barangayId === currentBarangay.id).map(p => <option key={p.id} value={p.title}>{p.title}</option>)}
                      </select>
                    </label>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Allocated amount
                      <input required type="text" inputMode="decimal" value={budgetForm.allocatedAmount} onChange={(event) => setBudgetForm((previous) => ({ ...previous, allocatedAmount: formatCurrencyInput(event.target.value) }))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800" placeholder="0.00" />
                    </label>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Description <span className="text-slate-400 font-normal normal-case tracking-normal">(Optional)</span>
                      <input value={budgetForm.description} onChange={(event) => setBudgetForm((previous) => ({ ...previous, description: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-800" placeholder="Notes for this allocation" />
                    </label>
                    {budgetFormError && <p role="alert" className="text-xs font-semibold text-rose-700">{budgetFormError}</p>}
                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                      <button type="button" disabled={isSavingBudget} onClick={() => setShowSetBudget(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-50">Cancel</button>
                      <button type="submit" disabled={isSavingBudget} className="rounded-lg bg-[#091d64] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{isSavingBudget ? 'Saving...' : 'Save allocation'}</button>
                    </div>
                  </form>
                </div>
              )}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-extrabold text-[#091d64]">Budget Management</h3>
                  <p className="text-xs text-slate-400 mt-1">Live allocation and expenditure view for Barangay {currentBarangay?.name || 'Barangay'}.</p>
                </div>
                <button type="button" onClick={() => { setTotalFormError(''); setShowSetTotal(true); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-xs font-bold text-amber-950 hover:bg-amber-300">
                  <Coins className="h-4 w-4" /> Set total SK budget
                </button>
                                <button type="button" onClick={() => { setExpenseFormError(''); setShowRecordExpense(true); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#091d64] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#122878]">
                  <Plus className="h-4 w-4" /> Record expense
                </button>
                <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fiscal year
                    <select value={budgetYear} onChange={event => setBudgetYear(event.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">
                      {[...new Set([new Date().getFullYear(), ...programs.map(program => new Date(program.startDate).getFullYear()).filter(Boolean)])].sort().reverse().map(year => <option key={year}>{year}</option>)}
                    </select>
                  </label>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Program
                    <select value={budgetProgramFilter} onChange={event => setBudgetProgramFilter(event.target.value)} className="mt-1 block min-w-52 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">
                      <option>All Programs</option>
                      {programs.map(program => <option key={program.id} value={program.id}>{program.title}</option>)}
                    </select>
                  </label>
                  <button type="button" onClick={() => { setBudgetYear(String(new Date().getFullYear())); setBudgetProgramFilter('All Programs'); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Reset filters</button>
                </div>
              </div>

              {showRecordExpense && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
                  <form onSubmit={handleRecordExpense} className="w-full max-w-lg space-y-4 rounded-xl bg-white p-5 shadow-2xl">
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-base font-extrabold text-[#091d64]">Record expense</h3>
                        <p className="mt-1 text-xs text-slate-500">Saved spending updates the budget totals and utilization.</p>
                      </div>
                      <button type="button" onClick={() => setShowRecordExpense(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close expense form"><X className="h-4 w-4" /></button>
                    </div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Expense title
                      <input required minLength={2} value={expenseForm.title} onChange={event => setExpenseForm(previous => ({ ...previous, title: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-slate-800" placeholder="e.g. Program supplies" />
                    </label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Amount spent
                        <input required type="number" min="0.01" step="0.01" value={expenseForm.amount} onChange={event => setExpenseForm(previous => ({ ...previous, amount: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800" placeholder="0.00" />
                      </label>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Expense date
                        <input required type="date" value={expenseForm.expenseDate} onChange={event => setExpenseForm(previous => ({ ...previous, expenseDate: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800" />
                      </label>
                    </div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Budget category
                      <select required value={expenseForm.budgetId} onChange={event => setExpenseForm(previous => ({ ...previous, budgetId: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800">
                        <option value="">Select a budget category</option>
                        {budgetAllocations.map(allocation => <option key={allocation.id} value={allocation.id} disabled={Number(allocation.remaining_amount) <= 0}>{allocation.category} · ₱{Number(allocation.remaining_amount || 0).toLocaleString()} remaining</option>)}
                      </select>
                    </label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Program (optional)
                        <select value={expenseForm.programId} onChange={event => setExpenseForm(previous => ({ ...previous, programId: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800">
                          <option value="">Unassigned</option>
                          {programs.map(program => <option key={program.id} value={program.id}>{program.title}</option>)}
                        </select>
                      </label>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Tax treatment
                        <select value={expenseForm.taxType} onChange={event => setExpenseForm(previous => ({ ...previous, taxType: event.target.value as typeof expenseForm.taxType }))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800">
                          <option value="Exempt">Tax exempt</option>
                          <option value="VAT">VAT</option>
                          <option value="Non-VAT">Non-VAT</option>
                        </select>
                      </label>
                    </div>
                    {budgetAllocations.length === 0 && <p className="text-xs font-semibold text-amber-700">No budget categories are available for FY {budgetYear}. Allocate a budget before recording an expense.</p>}
                    {expenseFormError && <p role="alert" className="text-xs font-semibold text-rose-700">{expenseFormError}</p>}
                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                      <button type="button" disabled={isSavingExpense} onClick={() => setShowRecordExpense(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-50">Cancel</button>
                      <button type="submit" disabled={isSavingExpense || budgetAllocations.length === 0} className="rounded-lg bg-[#091d64] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{isSavingExpense ? 'Saving...' : 'Save expense'}</button>
                    </div>
                  </form>
                </div>
              )}

              {(() => {
                const filteredAllocated = budgetPrograms.reduce((sum, program) => sum + (Number(program.budgetAllocation) || 0), 0);
                const filteredSpent = budgetPrograms.reduce((sum, program) => sum + (expenses.filter(expense => expense.programId === program.id).reduce((total, expense) => total + (Number(expense.amount) || Number(expense.gross_amount) || 0), 0) || 0), 0);
                const isAllPrograms = budgetProgramFilter === 'All Programs';
                const barangayTotalBudget = savedTotalBudget !== null ? savedTotalBudget : (Number(currentBarangay?.totalBudget) || 0);
                const useBudgetTable = isAllPrograms;
                const displaySpent = useBudgetTable ? (Number(currentBarangay?.spentBudget) || 0) : filteredSpent;
                const displayBase = useBudgetTable ? barangayTotalBudget : filteredAllocated;
                const filteredRemaining = Math.max(0, displayBase - displaySpent);
                const filteredRate = displayBase > 0 ? (displaySpent / displayBase) * 100 : 0;
                const overspent = budgetUtilizationTable.filter(row => row.spent > row.allocated && row.allocated > 0);
                                                return (
                  <>
                    {isAllPrograms && barangayTotalBudget === 0 && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800">
                        No FY {new Date().getFullYear()} budget has been configured for this barangay yet. Per DILG JMC No. 1 s. 2025, the SK Chairperson prepares the barangay SK budget.
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                      {[
                        [isAllPrograms ? 'Total budget' : 'Program budget', displayBase, Coins, 'text-[#091d64] bg-blue-50'],
                        ['Allocated to programs', filteredAllocated, Briefcase, 'text-blue-600 bg-blue-50'],
                        ['Total spent', displaySpent, Coins, 'text-amber-600 bg-amber-50'],
                        ['Remaining balance', filteredRemaining, DollarSign, 'text-emerald-600 bg-emerald-50'],
                      ].map(([label, value, Icon, iconClass]) => (
                        <div key={String(label)} className="rounded-xl border border-slate-100 bg-white p-5 shadow-2xs">
                          <div className="flex items-start justify-between"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{String(label)}</span><span className={`rounded-lg p-2 ${iconClass}`}><Icon className="h-4 w-4" /></span></div>
                          <p className="mt-3 text-2xl font-extrabold text-slate-800">₱{Number(value).toLocaleString()}</p>
                        </div>
                      ))}
                      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-2xs">
                        <div className="flex items-start justify-between"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Utilization rate</span><span className="rounded-lg bg-violet-50 p-2 text-violet-600"><TrendingUp className="h-4 w-4" /></span></div>
                        <p className="mt-3 text-2xl font-extrabold text-[#091d64]">{filteredRate.toFixed(1)}%</p>
                        <p className="mt-1 text-[10px] font-semibold text-slate-400">{filteredAllocated ? 'Based on recorded expenses' : 'No allocation recorded'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
                      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-2xs xl:col-span-3">
                                            <h4 className="text-sm font-extrabold text-slate-800">Monthly budget vs actual</h4>
                        <p className="mb-4 text-[10px] text-slate-400">Actual expenses are grouped by expense date.</p>
                        {budgetPrograms.length || expenses.length ? <ResponsiveContainer width="100%" height={260}><BarChart data={budgetVsActualMonthlyData}><XAxis dataKey="month" fontSize={10} /><YAxis fontSize={10} tickFormatter={value => `₱${Number(value) / 1000}k`} /><Tooltip formatter={(value: any) => `₱${Number(value).toLocaleString()}`} /><Legend /><Bar dataKey="budget" name="Budget" fill="#bfdbfe" radius={[4, 4, 0, 0]} /><Bar dataKey="spent" name="Actual" fill="#091d64" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="flex h-64 items-center justify-center text-xs font-semibold text-slate-400">No budget or expense records for this view.</div>}
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-2xs xl:col-span-2">
                        <h4 className="text-sm font-extrabold text-slate-800">Program allocation</h4>
                        <p className="mb-2 text-[10px] text-slate-400">Share of the selected allocation.</p>
                        {budgetAllocationByProgramData.some(item => item.value > 0) ? <><ResponsiveContainer width="100%" height={190}><PieChart><Pie data={budgetAllocationByProgramData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={78} paddingAngle={3}>{budgetAllocationByProgramData.map(item => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={(value: any) => `₱${Number(value).toLocaleString()}`} /></PieChart></ResponsiveContainer><div className="space-y-2">{budgetAllocationByProgramData.slice(0, 6).map(item => <div key={item.name} className="flex items-center justify-between text-[10px] font-semibold text-slate-600"><span className="flex min-w-0 items-center gap-2"><i className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} /> <span className="truncate">{item.name}</span></span><span>{item.percentage}</span></div>)}</div></> : <div className="flex h-64 items-center justify-center text-xs font-semibold text-slate-400">No program allocations recorded.</div>}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-2xs">
                      <h4 className="mb-4 text-sm font-extrabold text-slate-800">Utilization by program</h4>
                      {budgetUtilizationTable.length ? <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-3 py-3">Program</th><th className="px-3 py-3 text-right">Allocated</th><th className="px-3 py-3 text-right">Actual</th><th className="px-3 py-3 text-right">Remaining</th><th className="px-3 py-3 text-right">Utilization</th></tr></thead><tbody className="divide-y divide-slate-50">{budgetUtilizationTable.map(row => <tr key={row.program}><td className="px-3 py-3 font-bold text-slate-700">{row.program}</td><td className="px-3 py-3 text-right">₱{row.allocated.toLocaleString()}</td><td className="px-3 py-3 text-right">₱{row.spent.toLocaleString()}</td><td className="px-3 py-3 text-right">₱{row.remaining.toLocaleString()}</td><td className={`px-3 py-3 text-right font-bold ${row.rate > 100 ? 'text-rose-600' : 'text-slate-700'}`}>{row.rate.toFixed(1)}%</td></tr>)}</tbody></table></div> : <div className="py-10 text-center text-xs font-semibold text-slate-400">No programs available for this filter.</div>}
                    </div>

                  </>
                );
              })()}
            </div>
          )}

          {/* 5. DOCUMENTS VIEW */}
          {activeMenu === 'documents' && (
            <div className="space-y-6 animate-in fade-in duration-200 text-left">
              <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-6">
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h3 className="text-xl font-extrabold text-[#091d64] mt-1.5 flex items-center gap-2">
                      <Folder className="w-5 h-5 text-blue-600" />
                      Barangay Document Repository & Executive Approval Desk
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Collaborative governance archive maintained by SK Secretary, SK Treasurer, and Hon. SK Chairperson.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button 
                      onClick={() => setShowUploadDocModal(true)}
                      className="px-4 py-2 bg-[#091d64] hover:bg-[#122878] text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-amber-400" />
                      Upload Official Document
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200/80 rounded-xl shadow-xs">
                  <table className="w-full text-left text-xs font-semibold text-slate-600">
                    <thead className="bg-[#091d64] text-[10px] text-white font-extrabold uppercase tracking-widest">
                      <tr>
                        <th className="px-5 py-3.5">Code / Ref No.</th>
                        <th className="px-5 py-3.5">Document Title</th>
                        <th className="px-5 py-3.5">Category</th>
                        <th className="px-5 py-3.5">Author / Officer</th>
                        <th className="px-5 py-3.5">Date</th>
                        <th className="px-5 py-3.5 text-center">Approval Status</th>
                        <th className="px-5 py-3.5 text-right">Review</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                      {localDocs.map(doc => (
                        <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-4 font-mono font-bold text-[#091d64]">
                            {doc.resolutionNumber || doc.id}
                          </td>
                          <td className="px-5 py-4 font-bold text-slate-900">
                            {doc.title}
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase">
                              {doc.category}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-bold text-slate-800">
                            {doc.uploadedBy}
                          </td>
                          <td className="px-5 py-4 font-mono text-slate-600">
                            {doc.uploadedDate}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase border ${
                              doc.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              doc.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {doc.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            {(doc as any).fileUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  const url = (doc as any).fileUrl;
                                  if (url) { window.open(url, '_blank'); return; }
                                  alert('No file attached.');
                                }}
                                className="mr-1.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-[10px] font-bold hover:bg-slate-50"
                                title="View Uploaded File"
                              >
                                <Eye className="w-3.5 h-3.5" /> View
                              </button>
                            )}
                            {doc.status === 'Pending' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDocForApprove(doc);
                                  setApprovalDecision('Approved');
                                  setApprovalNotes('');
                                  setDocumentReviewError('');
                                  setShowApproveDocModal(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#091d64] text-white text-[10px] font-bold hover:bg-[#122878]"
                              >
                                <FileCheck className="w-3.5 h-3.5" /> Review
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {localDocs.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-slate-400 font-bold">
                            No documents found in repository.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {showApproveDocModal && selectedDocForApprove && (
                  <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
                    <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl overflow-hidden">
                      <div className="bg-[#091d64] text-white p-5">
                        <h3 className="font-bold text-base">Review Document</h3>
                        <p className="mt-1 text-xs text-blue-100">{selectedDocForApprove.title}</p>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Review decision">
                          <button
                            type="button"
                            onClick={() => setApprovalDecision('Approved')}
                            className={`rounded-lg border px-3 py-2 text-xs font-bold ${approvalDecision === 'Approved' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-slate-600 border-slate-200'}`}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => setApprovalDecision('Rejected')}
                            className={`rounded-lg border px-3 py-2 text-xs font-bold ${approvalDecision === 'Rejected' ? 'bg-rose-700 text-white border-rose-700' : 'bg-white text-slate-600 border-slate-200'}`}
                          >
                            Reject
                          </button>
                        </div>
                        <div>
                          <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase">
                            {approvalDecision === 'Rejected' ? 'Rejection reason (required)' : 'Review notes (optional)'}
                          </label>
                          <textarea
                            value={approvalNotes}
                            onChange={(event) => setApprovalNotes(event.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-slate-200 p-2.5 text-xs"
                          />
                        </div>
                        {documentReviewError && <p role="alert" className="text-xs text-rose-700">{documentReviewError}</p>}
                        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                          <button type="button" disabled={isReviewingDocument} onClick={() => setShowApproveDocModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold disabled:opacity-50">Cancel</button>
                          <button type="button" disabled={isReviewingDocument} onClick={handleReviewDocument} className="rounded-lg bg-[#091d64] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                            {isReviewingDocument ? 'Saving...' : `Confirm ${approvalDecision}`}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* 6. REPORTS */}
          {activeMenu === 'reports' && (
            <div className="space-y-6 animate-in fade-in duration-200 text-left">
              <div className="bg-white p-6 rounded-xl border border-slate-100 space-y-6">
                <div className="border-b border-slate-100 pb-4 flex justify-between items-start">
                  <div>
                    <span className="px-2.5 py-0.5 bg-blue-50 text-[#091d64] font-black text-[10px] rounded uppercase tracking-wider">GOVERNANCE REPORTS - AYDP ALIGNED</span>
                    <h3 className="font-sans font-bold text-slate-900 text-lg mt-1">Executive Reports & Decision Analytics Center</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Live governance database synced across Barangay {currentBarangay?.name || 'Barangay'}.</p>
                  </div>
                  <button onClick={() => generatePDFReport('Executive Summary & COA Financial Performance Report')} className="px-4 py-2.5 bg-[#091d64] hover:bg-[#122878] text-white font-bold rounded-xl text-xs flex items-center gap-2 shrink-0"><Printer className="w-4 h-4" /> Export Master PDF</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1"><div className="flex justify-between items-center text-slate-400"><span className="text-[10px] font-bold uppercase tracking-wider">Registered Youth</span><Users className="w-4 h-4 text-[#091d64]" /></div><h4 className="text-xl font-black text-[#091d64]">{youthProfiles.length.toLocaleString()}</h4><p className="text-[10px] text-slate-500">KK roster</p></div>
                  <div className="p-5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1"><div className="flex justify-between items-center text-slate-400"><span className="text-[10px] font-bold uppercase tracking-wider">Active Programs</span><ClipboardList className="w-4 h-4 text-blue-600" /></div><h4 className="text-xl font-black text-blue-600">{programs.filter(p => p.status === 'Upcoming' || p.status === 'Ongoing').length}</h4><p className="text-[10px] text-slate-500">Upcoming & ongoing</p></div>
                  <div className="p-5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1"><div className="flex justify-between items-center text-slate-400"><span className="text-[10px] font-bold uppercase tracking-wider">Total Allocated</span><Coins className="w-4 h-4 text-emerald-600" /></div><h4 className="text-xl font-black text-emerald-600">₱{programs.reduce((s, p) => s + (Number(p.budgetAllocation) || 0), 0).toLocaleString()}</h4><p className="text-[10px] text-slate-500">Program budget</p></div>
                  <div className="p-5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1"><div className="flex justify-between items-center text-slate-400"><span className="text-[10px] font-bold uppercase tracking-wider">Documents</span><Folder className="w-4 h-4 text-amber-600" /></div><h4 className="text-xl font-black text-amber-600">{documents.length}</h4><p className="text-[10px] text-slate-500">Repository records</p></div>
                </div>

                <div className="flex gap-2 border-b border-slate-100 pb-2 overflow-x-auto">
                  <button onClick={() => setReportSubTab('attendance')} className={reportSubTab === 'attendance' ? 'px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 bg-[#091d64] text-white' : 'px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 bg-slate-50 text-slate-600 hover:bg-slate-100'}>Attendance</button>
                  <button onClick={() => setReportSubTab('accomplishments')} className={reportSubTab === 'accomplishments' ? 'px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 bg-[#091d64] text-white' : 'px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 bg-slate-50 text-slate-600 hover:bg-slate-100'}>Accomplishments</button>
                  <button onClick={() => setReportSubTab('beneficiaries')} className={reportSubTab === 'beneficiaries' ? 'px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 bg-[#091d64] text-white' : 'px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 bg-slate-50 text-slate-600 hover:bg-slate-100'}>Beneficiaries</button>
                  <button onClick={() => setReportSubTab('demographics')} className={reportSubTab === 'demographics' ? 'px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 bg-[#091d64] text-white' : 'px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 bg-slate-50 text-slate-600 hover:bg-slate-100'}>Demographics</button>
                  <button onClick={() => setReportSubTab('financial')} className={reportSubTab === 'financial' ? 'px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 bg-[#091d64] text-white' : 'px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 bg-slate-50 text-slate-600 hover:bg-slate-100'}>Financial</button>
                </div>
                {reportSubTab === 'attendance' && (<div className="overflow-x-auto border border-slate-100 rounded-xl"><table className="w-full text-left text-xs"><thead className="bg-[#091d64] text-white text-[10px] font-bold uppercase"><tr><th className="px-4 py-3">Program</th><th className="px-4 py-3 text-right">Registered</th><th className="px-4 py-3 text-right">Slots</th><th className="px-4 py-3 text-right">Fill Rate</th></tr></thead><tbody className="divide-y divide-slate-100">{programs.map(p => { const reg = p.registeredCount || 0; const max = p.maxParticipants || 1; return <tr key={p.id}><td className="px-4 py-3 font-bold">{p.title}</td><td className="px-4 py-3 text-right font-mono">{reg}</td><td className="px-4 py-3 text-right font-mono">{p.maxParticipants || 0}</td><td className="px-4 py-3 text-right font-mono font-bold text-[#091d64]">{((reg / max) * 100).toFixed(0)}%</td></tr>; })}</tbody></table></div>)}
                {reportSubTab === 'accomplishments' && (<div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 text-center"><span className="text-2xl font-black text-emerald-800 block">{programs.reduce((s, p) => s + (p.registeredCount || 0), 0)}</span><span className="text-[10px] font-bold text-emerald-600 uppercase block mt-1">Total Registrations</span></div><div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-center"><span className="text-2xl font-black text-[#091d64] block">{programs.filter(p => p.status === 'Completed').length}</span><span className="text-[10px] font-bold text-blue-600 uppercase block mt-1">Completed Programs</span></div><div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100 text-center"><span className="text-2xl font-black text-amber-800 block">{documents.length}</span><span className="text-[10px] font-bold text-amber-600 uppercase block mt-1">Documented Reports</span></div></div>)}
                {reportSubTab === 'beneficiaries' && (<div className="overflow-x-auto border border-slate-100 rounded-xl"><table className="w-full text-left text-xs"><thead className="bg-[#091d64] text-white text-[10px] font-bold uppercase"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Zone</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{youthProfiles.slice(0, 50).map(y => <tr key={y.id}><td className="px-4 py-3 font-bold">{y.name}</td><td className="px-4 py-3 text-slate-500">{y.zone}</td><td className="px-4 py-3">{y.status}</td></tr>)}</tbody></table></div>)}
                                {reportSubTab === 'demographics' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <h4 className="font-bold text-slate-800 text-sm">Katipunan ng Kabataan Demographics</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Aggregated from {youthProfiles.length} registered youth in Barangay {currentBarangay?.name || 'Barangay'}.</p>
                    </div>
                    {(() => {
                      const byGender: Record<string, number> = {};
                      const byAge: Record<string, number> = { '15-17': 0, '18-24': 0, '25-30': 0 };
                      const byEdu: Record<string, number> = {};
                      const byEmp: Record<string, number> = {};
                      youthProfiles.forEach(y => {
                        const g = y.sex || 'Unspecified';
                        byGender[g] = (byGender[g] || 0) + 1;
                        const a = Number(y.age) || 0;
                        if (a >= 15 && a <= 17) byAge['15-17']++;
                        else if (a >= 18 && a <= 24) byAge['18-24']++;
                        else if (a >= 25 && a <= 30) byAge['25-30']++;
                        const e = y.educationalLevel || 'Not Specified';
                        byEdu[e] = (byEdu[e] || 0) + 1;
                        const em = y.employmentStatus || 'Not Specified';
                        byEmp[em] = (byEmp[em] || 0) + 1;
                      });
                      const total = youthProfiles.length || 1;
                      const colors = ['#091d64', '#2563eb', '#10b981', '#f59e0b', '#d32f2f', '#7c3aed'];
                      const panel = (title: string, data: Record<string, number>) => (
                        <div className="p-5 rounded-xl border border-slate-100 bg-white space-y-3">
                          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{title}</h5>
                          {Object.keys(data).length === 0 ? (
                            <p className="text-[11px] text-slate-400">No data yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {Object.entries(data).sort((a, b) => b[1] - a[1]).map(([k, v], i) => {
                                const pct = (v / total) * 100;
                                return (
                                  <div key={k}>
                                    <div className="flex justify-between text-[11px] mb-1">
                                      <span className="text-slate-600 font-semibold">{k}</span>
                                      <span className="font-mono font-bold text-[#091d64]">{v} ({pct.toFixed(0)}%)</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                      <div className="h-full rounded-full" style={{ width: pct + "%", backgroundColor: colors[i % colors.length] }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {panel('Gender Distribution', byGender)}
                          {panel('Age Bracket (RA 10742)', byAge)}
                          {panel('Educational Level', byEdu)}
                          {panel('Employment Status', byEmp)}
                        </div>
                      );
                    })()}
                  </div>
                )}
                {reportSubTab === 'financial' && (<div className="overflow-x-auto border border-slate-100 rounded-xl"><table className="w-full text-left text-xs"><thead className="bg-[#091d64] text-white text-[10px] font-bold uppercase"><tr><th className="px-4 py-3">Program</th><th className="px-4 py-3 text-right">Allocated</th><th className="px-4 py-3 text-right">Cost per Slot</th></tr></thead><tbody className="divide-y divide-slate-100">{programs.map(p => { const alloc = Number(p.budgetAllocation) || 0; const slots = p.maxParticipants || 0; return <tr key={p.id}><td className="px-4 py-3 font-bold">{p.title}</td><td className="px-4 py-3 text-right font-mono">₱{alloc.toLocaleString()}</td><td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">₱{(slots > 0 ? Math.round(alloc / slots) : 0).toLocaleString()}</td></tr>; })}</tbody></table></div>)}
              </div>
            </div>
          )}


          {/* 7. ANNOUNCEMENTS */}
          {activeMenu === 'announcements' && (
            <div className="space-y-6 text-left animate-in fade-in duration-200">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)]">
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h4 className="mb-5 flex items-center gap-2 text-sm font-black text-slate-800"><Megaphone className="h-4 w-4 text-[#091d64]" />{editingAnnouncementId ? 'Edit Announcement' : 'Compose Announcement'}</h4>
                <form onSubmit={handlePublishAnnouncement} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Announcement Title *</label>
                    <input 
                      type="text" 
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      placeholder="e.g. SK Youth Assembly Consultation Notice" 
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#091d64] bg-slate-50 focus:bg-white"
                      required
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">What *</label>
                      <input value={annWhat} onChange={e => setAnnWhat(e.target.value)} placeholder="What is happening?" className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5" required />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Where *</label>
                      <input value={annWhere} onChange={e => setAnnWhere(e.target.value)} placeholder="Venue or location" className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5" required />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">When *</label>
                      <input value={annWhen} onChange={e => setAnnWhen(e.target.value)} placeholder="Date and time" className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Body Content *</label>
                    <textarea 
                      value={annContent}
                      onChange={(e) => setAnnContent(e.target.value)}
                      rows={5}
                      placeholder="Type announcement details..." 
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#091d64] bg-slate-50 focus:bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hashtags *</label>
                    <input value={annHashtags} onChange={e => setAnnHashtags(e.target.value)} placeholder="#KABISIG #Kabataan" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white" required />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Announcement Pubmat (JPG or PNG)</label>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                      onChange={event => void handleAnnouncementImageSelected(event.currentTarget.files?.[0] || null)}
                      disabled={annImageUploading || isSubmittingAnnouncement}
                      className="block w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-[10px] file:font-bold file:text-[#091d64]"
                    />
                    {annImageUploading && (
                      <p role="status" className="mt-2 flex items-center gap-2 text-[10px] font-semibold text-blue-700">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" />
                        Uploading pubmat to Supabase Storage…
                      </p>
                    )}
                    {annImageFile && !annImageUploading && <p className="mt-1 text-[10px] text-slate-500">{annImageFile.name}</p>}
                    {!annImageUploading && annImagePreview && (
                      <img src={annImagePreview} alt="Current announcement pubmat" className="mt-3 max-h-48 rounded-lg border border-slate-200 object-contain" />
                    )}
                  </div>
                  {!editingAnnouncementId && (
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={annPostToFb}
                        onChange={(e) => setAnnPostToFb(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-[#091d64] focus:ring-[#091d64]"
                      />
                      Also publish to Facebook
                      <span className="text-[10px] font-medium text-slate-400">(off by default)</span>
                    </label>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={isSubmittingAnnouncement || annImageUploading}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#091d64] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmittingAnnouncement ? 'Saving...' : editingAnnouncementId ? 'Update Announcement' : 'Publish Announcement'}
                    </button>
                    {editingAnnouncementId && (
                      <button type="button" onClick={handleCancelAnnouncementEdit} disabled={isSubmittingAnnouncement} className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 disabled:opacity-50">
                        Cancel edit
                      </button>
                    )}
                  </div>
                  {announcementSuccess && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{announcementSuccess}</p>}
                  {announcementError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{announcementError}</p>}
                </form>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Announcements</h5>
                    <button type="button" onClick={() => void refreshAnnouncements()} className="text-[10px] font-bold text-[#091d64] hover:underline">{isLoadingAnnouncements ? 'Refreshing...' : 'Refresh'}</button>
                  </div>
                  {announcementsList.length ? (
                    <div className="space-y-2">
                      {announcementsList.map((announcement: AnnouncementRecord) => (
                        <article key={announcement.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h6 className="text-sm font-black text-slate-900">{announcement.title}</h6>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                <span className="rounded bg-blue-50 px-2 py-0.5 text-[9px] font-bold uppercase text-blue-700">{announcement.category}</span>
                                <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase ${announcement.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>{announcement.status || 'published'}</span>
                              </div>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <button type="button" aria-label={`Edit ${announcement.title}`} onClick={() => handleEditAnnouncement(announcement)} className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-blue-50 hover:text-blue-700">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button type="button" aria-label={`Delete ${announcement.title}`} onClick={() => void handleDeleteAnnouncement(announcement)} disabled={mutatingAnnouncementId === announcement.id} className="rounded-md border border-slate-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          {announcement.imageUrl && <img src={announcement.imageUrl} alt={`Pubmat for ${announcement.title}`} className="mt-3 max-h-64 w-full rounded-lg border border-slate-200 bg-white object-contain" />}
                          <div className="mt-3 space-y-2 text-[11px]">
                            <p className="text-slate-600"><span className="font-bold text-slate-700">What:</span> {announcement.what || '—'}</p>
                            <p className="text-slate-600"><span className="font-bold text-slate-700">Where:</span> {announcement.where || '—'}</p>
                            <p className="text-slate-600"><span className="font-bold text-slate-700">When:</span> {announcement.when || '—'}</p>
                            <div className="border-t border-slate-200 pt-2">
                              <p className="font-bold text-slate-700">Body Content</p>
                              <p className="mt-1 whitespace-pre-line font-medium text-slate-600">{announcement.content}</p>
                            </div>
                            {announcement.hashtags && <p className="border-t border-slate-200 pt-2 font-semibold text-blue-700">{announcement.hashtags}</p>}
                          </div>
                          <p className="mt-2 text-[10px] text-slate-400">{announcement.datePosted} · {announcement.author}</p>
                          {(facebookPosts[announcement.id]?.post_url || announcement.facebookPostUrl) && <a href={facebookPosts[announcement.id]?.post_url || announcement.facebookPostUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:underline"><Facebook className="h-3 w-3" />View Facebook post</a>}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="py-5 text-center text-xs font-semibold text-slate-400">{isLoadingAnnouncements ? 'Loading announcements...' : 'No persisted announcements found.'}</p>
                  )}
                </div>
              </div>
              </div>
            </div>
          )}

          {activeMenu === 'settings' && (
            <section className="mx-auto max-w-3xl space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-blue-50 p-3 text-[#091d64]">
                    <Facebook className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-[#091d64]">Facebook Integration</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Connect the Facebook Page managed by Barangay {currentBarangay?.name || 'your Barangay'}.
                      Its access token is encrypted before it is stored and is never returned to the browser.
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  {facebookIntegrationLoading ? (
                    <p className="text-xs font-semibold text-slate-500">Loading Facebook connection…</p>
                  ) : facebookIntegration?.is_active ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Connected Page</p>
                        <p className="mt-1 text-sm font-extrabold text-slate-900">{facebookIntegration.page_name}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-slate-500">Page ID: {facebookIntegration.page_id}</p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-extrabold text-emerald-800">Active</span>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-slate-600">No Barangay Facebook Page is connected.</p>
                  )}
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="facebook-page-id" className="mb-1 block text-xs font-bold text-slate-700">Page ID</label>
                    <input
                      id="facebook-page-id"
                      value={facebookPageId}
                      onChange={event => setFacebookPageId(event.target.value)}
                      autoComplete="off"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#091d64] focus:outline-none focus:ring-1 focus:ring-[#091d64]"
                      placeholder="Enter Facebook Page ID"
                    />
                  </div>
                  <div>
                    <label htmlFor="facebook-page-token" className="mb-1 block text-xs font-bold text-slate-700">Page Access Token</label>
                    <input
                      id="facebook-page-token"
                      type="password"
                      value={facebookPageToken}
                      onChange={event => setFacebookPageToken(event.target.value)}
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#091d64] focus:outline-none focus:ring-1 focus:ring-[#091d64]"
                      placeholder={facebookIntegration ? 'Enter token to verify or replace the saved token' : 'Enter Page Access Token'}
                    />
                    <p className="mt-1 text-[10px] text-slate-400">The saved token cannot be viewed again. Enter it to test or replace the connection.</p>
                  </div>
                </div>

                {facebookIntegrationError && (
                  <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                    {facebookIntegrationError}
                  </p>
                )}
                {facebookIntegrationNotice && (
                  <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                    {facebookIntegrationNotice}
                  </p>
                )}
                {facebookTestPageName && (
                  <p className="mt-2 text-xs font-bold text-emerald-700">Verified Page: {facebookTestPageName}</p>
                )}
                <p className="mt-4 text-[10px] leading-relaxed text-slate-400">
                  Existing system-wide Facebook environment credentials remain available as a temporary publishing fallback only when this Barangay has no integration record.
                </p>

                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  {facebookIntegration?.is_active && (
                    <button
                      type="button"
                      onClick={() => void handleDisconnectFacebookIntegration()}
                      disabled={facebookIntegrationSaving || facebookIntegrationLoading}
                      className="rounded-xl border border-rose-200 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      {facebookIntegrationSaving ? 'Working…' : 'Disconnect'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleTestFacebookIntegration()}
                    disabled={facebookIntegrationTesting || facebookIntegrationSaving || facebookIntegrationLoading}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {facebookIntegrationTesting ? 'Testing…' : 'Test Connection'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConnectFacebookIntegration()}
                    disabled={facebookIntegrationSaving || facebookIntegrationTesting || facebookIntegrationLoading}
                    className="rounded-xl bg-[#091d64] px-4 py-2 text-xs font-bold text-white hover:bg-blue-900 disabled:opacity-50"
                  >
                    {facebookIntegrationSaving ? 'Saving…' : facebookIntegration ? 'Update Connection' : 'Connect'}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* 8. AUDIT LOG */}
          {activeMenu === 'audit' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-xs space-y-4">
                <h3 className="text-lg font-extrabold text-[#091d64]">Barangay Official Activity & Audit Log</h3>
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs font-semibold text-slate-600">
                    <thead className="bg-slate-50 text-[10px] text-slate-500 font-extrabold uppercase border-b border-slate-100">
                      <tr>
                        <th className="p-3.5">Timestamp</th>
                        <th className="p-3.5">Official Name & Role</th>
                        <th className="p-3.5">Action Code</th>
                        <th className="p-3.5">Activity Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                          <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="p-3.5 font-bold text-slate-800">
                            {log.user} ({log.role})
                          </td>
                          <td className="p-3.5 font-mono text-[10px]">{log.action}</td>
                          <td className="p-3.5 text-slate-600">{log.details}</td>
                        </tr>
                      ))}
                      {auditLogs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-slate-400 font-bold">
                            No audit logs recorded yet.
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

        <footer className="h-12 border-t border-slate-100 bg-white flex items-center justify-center text-[11px] text-slate-400 font-sans tracking-wide">
          © 2026 SK Federation Naga City. All rights reserved.
        </footer>

      </div>

      {/* INSPECT PROFILE MODAL */}
      {inspectProfile && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="bg-[#091d64] text-white p-5 border-b-4 border-[#fbbf24] flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg">Katipunan ng Kabataan Profile Verification</h3>
                <p className="text-xs text-slate-300">Desk inspection for {inspectProfile.name}</p>
              </div>
              <button 
                onClick={() => { setInspectProfile(null); setShowRejectField(false); }}
                className="p-1 text-slate-200 hover:text-white cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
              <div className="flex items-center gap-4 border-b pb-4">
                <ProfileAvatar name={inspectProfile.name} src={inspectProfile.profilePic} alt={inspectProfile.name} className="w-16 h-16 rounded-full border border-slate-100 shadow-2xs" />
                <div>
                  <h4 className="text-xl font-bold text-slate-800 leading-none">{inspectProfile.name}</h4>
                  <span className="text-xs text-slate-400 font-mono font-bold mt-1 inline-block">ID: {inspectProfile.id}</span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-xs font-bold text-slate-600">
                <div>
                  <span className="text-slate-400 block mb-0.5 text-[10px] uppercase tracking-wider">Birthdate & calculated age</span>
                  <span className="text-slate-800 block">{inspectProfile.birthdate} ({inspectProfile.age} yrs old)</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 text-[10px] uppercase tracking-wider">Address</span>
                  <span className="text-slate-800 block">{inspectProfile.address} ({inspectProfile.zone})</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 text-[10px] uppercase tracking-wider">Contact & email</span>
                  <span className="text-slate-800 block">{inspectProfile.mobile || 'Not provided'} · {inspectProfile.email || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 text-[10px] uppercase tracking-wider">Education</span>
                  <span className="text-slate-800 block">{inspectProfile.educationalLevel || 'Not provided'}{inspectProfile.school ? ` · ${inspectProfile.school}` : ''}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 text-[10px] uppercase tracking-wider">Employment & scholarship</span>
                  <span className="text-slate-800 block">{inspectProfile.employmentStatus || inspectProfile.employment || 'Not provided'} · {inspectProfile.scholarStatus || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 text-[10px] uppercase tracking-wider">Youth sector</span>
                  <span className="text-slate-800 block">{inspectProfile.youthSector || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 text-[10px] uppercase tracking-wider">Guardian</span>
                  <span className="text-slate-800 block">{inspectProfile.guardianName || 'Not provided'}{inspectProfile.guardianContact ? ` · ${inspectProfile.guardianContact}` : ''}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 text-[10px] uppercase tracking-wider">Registration status</span>
                  <span className="text-slate-800 block">{inspectProfile.status} · Registered {inspectProfile.dateRegistered || 'date unavailable'}</span>
                </div>
              </div>

              {showRejectField && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs space-y-2">
                  <label className="block font-bold text-slate-700">Reason for Application Rejection</label>
                  <textarea 
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason..."
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                    rows={2}
                  />
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setShowRejectField(false)}
                      className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-md font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        if (!rejectionReason) {
                          alert('Please enter a rejection reason.');
                          return;
                        }
                        onRejectYouth(inspectProfile.id, rejectionReason);
                        setInspectProfile(null);
                        setShowRejectField(false);
                      }}
                      className="px-3 py-1 bg-red-600 text-white rounded-md font-bold cursor-pointer"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 bg-slate-50 border-t flex justify-between items-center">
              {!showRejectField && (
                <button
                  onClick={() => setShowRejectField(true)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                >
                  Reject Profile
                </button>
              )}
              <div />
              <div className="flex gap-2">
                <button
                  onClick={() => { setInspectProfile(null); setShowRejectField(false); }}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-lg text-xs cursor-pointer"
                >
                  Close
                </button>
                {inspectProfile.status === 'Pending' && !showRejectField && (
                  <button
                    onClick={() => {
                      onApproveYouth(inspectProfile.id);
                      setInspectProfile(null);
                    }}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs shadow-md flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Approve Application
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD DOCUMENT MODAL */}
      {showUploadDocModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200 text-left">
            <div className="bg-[#091d64] text-white p-5 border-b-4 border-[#fbbf24] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Upload className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-base">Upload Official Governance Document</h3>
              </div>
              <button 
                onClick={() => setShowUploadDocModal(false)}
                className="p-1 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newDocForm.title.trim()) return;
                if (!selectedUploadFile) {
                  setDocumentUploadError('Select a document file to upload.');
                  return;
                }
                setIsUploadingDocument(true);
                setDocumentUploadError('');
                try {
                  const documentType = newDocForm.category === 'Resolutions' ? 'Resolution' : newDocForm.category === 'Minutes' ? 'Minutes' : newDocForm.category === 'Reports' || newDocForm.category === 'Budget' ? 'Financial Report' : 'Other';
                  const result = await kabisigApi.uploadDocument({
                    title: newDocForm.title.trim(),
                    document_type: documentType,
                    file: selectedUploadFile,
                  });
                  if (!result.success || !result.data?.id) throw new Error(result.message || 'Document upload failed.');

                  const saved = result.data;
                  const uploaded: DocumentRecord = {
                    id: saved.id,
                    title: saved.title,
                    category: newDocForm.category,
                    uploadedBy: currentUser?.full_name || `Hon. SK Chairperson (${currentBarangay?.name || 'Barangay'})`,
                    uploadedDate: saved.created_at ? new Date(saved.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
                    fileSize: `${(selectedUploadFile.size / (1024 * 1024)).toFixed(2)} MB`,
                    status: 'Pending',
                    resolutionNumber: newDocForm.resolutionNumber || `DOC-${saved.id.slice(0, 8)}`,
                    description: newDocForm.description,
                    designatedApprover: 'Hon. SK Chairperson',
                    barangayId: saved.tenant_id,
                    fileUrl: saved.file_url,
                  };
                  setLocalDocs(previous => [uploaded, ...previous]);
                  onAddDocument(uploaded);
                  setShowUploadDocModal(false);
                  setSelectedUploadFile(null);
                  setNewDocForm({ title: '', category: 'Resolutions', resolutionNumber: '', description: '', fileSize: '1.4 MB', designatedApprover: 'Hon. SK Chairperson' });
                } catch (error: any) {
                  setDocumentUploadError(error.message || 'Document upload failed.');
                } finally {
                  setIsUploadingDocument(false);
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Executive Order No. 04 - SK Youth Council"
                  value={newDocForm.title}
                  onChange={(e) => setNewDocForm({ ...newDocForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#091d64]/20 focus:border-[#091d64]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Document File *</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  required
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    if (file && file.size > 25 * 1024 * 1024) {
                      setDocumentUploadError('File size exceeds maximum limit of 25MB.');
                      setSelectedUploadFile(null);
                      return;
                    }
                    if (file && !['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'].includes(file.type)) {
                      setDocumentUploadError('Only PDF, Word, JPG, and PNG files are allowed.');
                      setSelectedUploadFile(null);
                      return;
                    }
                    setSelectedUploadFile(file);
                    setDocumentUploadError('');
                  }}
                  className="block w-full text-xs"
                />
              </div>
              {documentUploadError && <p role="alert" className="text-xs text-rose-700">{documentUploadError}</p>}
              {documentUploadError && <p role="alert" className="text-xs text-rose-700">{documentUploadError}</p>}
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isUploadingDocument}
                  onClick={() => setShowUploadDocModal(false)}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingDocument}
                  className="px-5 py-2 bg-[#091d64] hover:bg-[#122878] text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 text-amber-400" />
                  {isUploadingDocument ? 'Uploading...' : 'Upload for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
