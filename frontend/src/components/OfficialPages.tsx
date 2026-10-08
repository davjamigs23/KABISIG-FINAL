import { formatCurrencyInput } from '../lib/utils';
import { useState, useEffect } from 'react';
import { composeFullName, splitFullName } from '../lib/name';
import { 
  Building2, 
  Calendar, 
  Check, 
  X, 
  Search, 
  Filter, 
  Plus, 
  FileText, 
  DollarSign, 
  Users, 
  Camera, 
  Upload, 
  FolderClosed, 
  Download, 
  Trash2, 
  AlertTriangle, 
  Clock, 
  Grid, 
  List,
  RefreshCw,
  TrendingUp,
  Tag,
  LayoutDashboard,
  Bell,
  ChevronDown,
  History,
  LogOut,
  Menu,
  FileSpreadsheet,
  Layers,
  Info,
  Phone,
  Mail,
  User,
  Shield,
  ShieldCheck,
  Award,
  CalendarCheck,
  ClipboardList,
  BarChart3,
  Settings,
  Coins,
  Megaphone,
  MessageSquare,
  Star,
  HeartHandshake,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Edit,
  Eye,
  Printer,
  BookOpen,
  Send,
  FileCheck,
  QrCode,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { LiveCameraScanner } from './LiveCameraScanner';
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
  Program, 
  YouthProfile, 
  Registration, 
  AttendanceRecord, 
  DocumentRecord, 
  ExpenseRecord,
  FeedbackRecord,
  ResolutionRecord,
  UserRole,
  BarangayTenant,
  AnnouncementRecord
} from '../types';
import { analyzeFeedbackSentiment, 
  extractFeedbackKeywords, 
  getMostRequestedProgramTrends,
  recommendPrograms,
  calculateEngagementScore, detectLowEngagement, detectScheduleConflicts } from '../lib/intelligence';
import { KabisigLogo } from './PublicPages';
import { UserMenu } from './UserMenu';
import NotificationMenu from './NotificationMenu';
import ProfileAvatar from './ProfileAvatar';
import kabisigApi from '../lib/api';
import { DEFAULT_BARANGAY_LOGOS } from '../data';

interface OfficialPagesProps {
  currentRole: UserRole; // 'SK Kagawad' | 'SK Secretary' | 'SK Treasurer'
  programs: Program[];
  youthProfiles: YouthProfile[];
  registrations: Registration[];
  documents: DocumentRecord[];
  feedback: FeedbackRecord[];
  resolutions: ResolutionRecord[];
    pollsError?: string | null;
  expenses: ExpenseRecord[];
  announcements?: AnnouncementRecord[];
  currentTenant?: BarangayTenant | null;
  tenants?: BarangayTenant[];
  currentUser?: any;
  onAddProgram: (p: Program) => Promise<boolean>;
  onAddResolution: (resolution: ResolutionRecord) => void;
  onAddExpense: (e: ExpenseRecord) => Promise<void> | void;
  onAddDocument: (d: DocumentRecord) => void;
  onRegisterAttendance: (record: AttendanceRecord, qrPayload: string) => Promise<AttendanceRecord>;
  onLogout: () => void;
  onApproveDocument?: (id: string, notes?: string) => Promise<DocumentRecord>;
  onRejectDocument?: (id: string, notes?: string) => Promise<DocumentRecord>;
}

export default function OfficialPages({
  currentRole,
  programs,
  youthProfiles,
  registrations,
  documents,
  feedback,
  resolutions,
    pollsError = null,
  expenses,
  announcements = [],
  currentTenant,
  tenants = [],
  currentUser,
  onAddProgram,
  onAddResolution,
  onAddExpense,
  onAddDocument,
  onRegisterAttendance,
  onApproveDocument,
  onRejectDocument,
  onLogout
}: OfficialPagesProps) {
  // Navigation active tab (resets to 'dashboard' on role change)
  const [activeMenu, setActiveMenu] = useState<string>('dashboard');

  useEffect(() => {
    setActiveMenu('dashboard');
  }, [currentRole]);

  // Global UI utilities state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const barangayLogo = currentTenant?.logo || DEFAULT_BARANGAY_LOGOS[currentTenant?.name || ''] || '';

  // --- Local UI state mirrors backend-backed shared records ---
  const [localAttendance, setLocalAttendance] = useState<AttendanceRecord[]>([]);
  const [localResolutions, setLocalResolutions] = useState<any[]>(resolutions);
  const [inventory, setInventory] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    kabisigApi.getInventory().then(rows => {
      if (!isMounted) return;
      setInventory(rows.map((row: any) => ({ id: row.id, item: row.item_name, category: row.category, condition: row.condition, quantity: Number(row.quantity) || 0, cost: Number(row.unit_cost) || 0, location: row.location || '' })));
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [currentRole]);

  const [localFeedback, setLocalFeedback] = useState<FeedbackRecord[]>(feedback);

  // Feedback Desk States
  const [feedbackSubTab, setFeedbackSubTab] = useState<'boses' | 'resolutions'>('boses');
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState('All');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState('All');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackRecord | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackResponseText, setFeedbackResponseText] = useState('');
  const [feedbackStatusChoice, setFeedbackStatusChoice] = useState<'Reviewed' | 'Resolved'>('Reviewed');

  // --- SK SECRETARY SPECIFIC STATES & REPOSITORY ---
  const [localDocs, setLocalDocs] = useState<DocumentRecord[]>(documents);

  const [docCategoryFilter, setDocCategoryFilter] = useState<string>('All');
  const [docStatusFilter, setDocStatusFilter] = useState<string>('All');
  const [docSearchQuery, setDocSearchQuery] = useState<string>('');
  const [showViewDocModal, setShowViewDocModal] = useState<boolean>(false);
  const [showEditDocModal, setShowEditDocModal] = useState<boolean>(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);
  const [showReviewDocModal, setShowReviewDocModal] = useState<boolean>(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isReviewingDoc, setIsReviewingDoc] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [documentUploadError, setDocumentUploadError] = useState('');

  // Youth Records & Profile Management State
  const [localYouthProfiles, setLocalYouthProfiles] = useState<YouthProfile[]>(youthProfiles || []);

  useEffect(() => {
    setLocalYouthProfiles(youthProfiles || []);
  }, [youthProfiles]);

  const [secYouthTab, setSecYouthTab] = useState<'verified' | 'pending'>('verified');
  const [selectedYouthProfile, setSelectedYouthProfile] = useState<YouthProfile | null>(null);
  const [showYouthDetailModal, setShowYouthDetailModal] = useState<boolean>(false);
  const [showYouthEditModal, setShowYouthEditModal] = useState<boolean>(false);
  const [youthEditForm, setYouthEditForm] = useState({
    name: '',
    first_name: '',     middle_name: '',     last_name: '',     suffix: '',
    email: '',
    mobile: '',
    zone: 'Zone 1',
    educationalLevel: 'College Undergraduate',
    school: '',
    scholarStatus: 'Non-Scholar' as 'Scholar' | 'Non-Scholar' | 'Yes' | 'No'
  });
  const [showBeneficiariesModal, setShowBeneficiariesModal] = useState<boolean>(false);

  // Administrative Reports State
  const [reportModuleCategory, setReportModuleCategory] = useState<'attendance' | 'residents' | 'accomplishment' | 'compliance' | 'minutes' | 'document_reports' | 'financial'>('attendance');
  const [treasurerReportTab, setTreasurerReportTab] = useState<'statement' | 'utilization' | 'tax' | 'naga_federation' | 'inventory_valuation'>('statement');
  const [nagaBarangaySearch, setNagaBarangaySearch] = useState<string>('');
  const [selectedProgramForReport, setSelectedProgramForReport] = useState<string>('');
  const [selectedZoneForReport, setSelectedZoneForReport] = useState<string>('All');

  // Sync documents prop to localDocs
  useEffect(() => {
    setLocalDocs(documents || []);
  }, [documents]);

  useEffect(() => {
    setLocalFeedback(feedback || []);
  }, [feedback]);

  useEffect(() => {
    setLocalResolutions(resolutions || []);
  }, [resolutions]);

  // --- MODALS STATE ---
  const [showProgModal, setShowProgModal] = useState(false);
  const [programNotice, setProgramNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const handleDownloadPDFReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for this website to export the PDF report.');
      return;
    }

    const totalYouth = localYouthProfiles.filter(profile => profile.status === 'Approved').length;
    const activeResolutions = localResolutions.filter(resolution => resolution.status === 'Voting Open' || resolution.status === 'Approved').length;
    const totalAttendance = localAttendance.length;
    const totalAllocated = programs.reduce((sum, program) => sum + (program.budgetAllocation || 0), 0);
    const totalSpent = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const utilization = totalAllocated > 0 ? ((totalSpent / totalAllocated) * 100).toFixed(1) : '0.0';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>KABISIG SK Official Compliance Report - Barangay ${currentTenant?.name || 'Barangay'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
          body { font-family: 'Poppins', ui-sans-serif, system-ui, sans-serif; color: #1e293b; margin: 0; padding: 40px; background: #ffffff; }
          .header { text-align: center; border-bottom: 3px solid #091d64; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { font-size: 14px; font-weight: 700; color: #64748b; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
          .header h2 { font-size: 20px; font-weight: 800; color: #091d64; margin: 5px 0; }
          .header p { font-size: 12px; color: #64748b; margin: 0; }
          .section-title { font-size: 14px; font-weight: 800; color: #091d64; background: #eff6ff; padding: 8px 12px; border-left: 4px solid #091d64; margin: 25px 0 15px 0; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
          th { background: #f8fafc; color: #475569; font-weight: 700; text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .badge { display: inline-block; padding: 3px 8px; font-size: 10px; font-weight: 700; border-radius: 4px; background: #ecfdf5; color: #065f46; }
          .badge-warning { background: #fffbeb; color: #92400e; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
          .card h4 { font-size: 13px; font-weight: 700; color: #091d64; margin: 0 0 8px 0; }
          .card p { font-size: 12px; color: #475569; margin: 4px 0; }
          .footer { margin-top: 50px; text-align: right; font-size: 12px; color: #475569; }
          .footer .sign { margin-top: 40px; font-weight: 700; color: #091d64; }
          @media print {
            body { padding: 20px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Republic of the Philippines &bull; Province of Camarines Sur &bull; City of Naga</h1>
          <h2>Barangay ${currentTenant?.name || 'Barangay'} &bull; Sangguniang Kabataan Council</h2>
          <p>Official Municipal Compliance & Financial Statements Report &bull; Generated: ${new Date().toLocaleDateString()}</p>
        </div>

        <div class="section-title">Part I: COA Annual Audit Statement & Sectoral Budget Breakdown</div>
        <table>
          <thead>
            <tr>
              <th>Sector / Program Category</th>
              <th>AIP Reference</th>
              <th class="text-right">Allocated Budget</th>
              <th class="text-right">Disbursed Expenses</th>
              <th class="text-right">Utilization Rate</th>
              <th class="text-center">COA Audit Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>All published programs</strong></td>
              <td>${programs.length} records</td>
              <td class="text-right">₱${totalAllocated.toLocaleString()}</td>
              <td class="text-right">₱${totalSpent.toLocaleString()}</td>
              <td class="text-right"><strong>${utilization}%</strong></td>
              <td class="text-center"><span class="badge">${programs.length > 0 ? 'Recorded' : 'No records'}</span></td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">Part II: DILG MC 2023 Compliance Report</div>
        <div class="grid-2">
          <div class="card">
            <h4>Program & Resolution Alignment</h4>
            <p><strong>CBYDP Alignment:</strong> Fully compliant with 5-Year Development Plan.</p>
            <p><strong>Active Resolutions:</strong> ${activeResolutions} records.</p>
          </div>
          <div class="card">
            <h4>Meeting Attendance & Quorum</h4>
            <p><strong>Attendance Records:</strong> ${totalAttendance} records.</p>
            <p><strong>Mandatory Trainings:</strong> No training records available.</p>
          </div>
        </div>

        <div class="section-title">Part III: Katipunan ng Kabataan Demographics & Beneficiaries</div>
        <div class="grid-2">
          <div class="card">
            <h4>Youth Population (Aged 15–30)</h4>
            <p><strong>Total Verified:</strong> ${totalYouth} Residents</p>
            <p>Age distribution is calculated from verified profiles when available.</p>
          </div>
          <div class="card">
            <h4>Educational & Scholarship Grantees</h4>
            <p><strong>Senior High / College:</strong> ${localYouthProfiles.filter(profile => profile.educationalLevel?.includes('High School') || profile.educationalLevel?.includes('College')).length} Youth</p>
            <p><strong>Active Scholarship Grantees:</strong> ${localYouthProfiles.filter(profile => profile.scholarStatus === 'Scholar').length} Beneficiaries</p>
          </div>
        </div>

        <div class="footer">
          <p>Certified Accurate and Compliant by:</p>
          <div class="sign">
            ${currentUser?.full_name || 'Authorized SK Official'}<br>
            <span style="font-weight: normal; color: #64748b;">${profileConfig[currentRole]?.title || 'SK Official'}, Barangay ${currentTenant?.name || 'Barangay'}</span>
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

  const [showDocModal, setShowDocModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showResModal, setShowResModal] = useState(false);
  const [showInvModal, setShowInvModal] = useState(false);

  // Form states
  const [progForm, setProgForm] = useState({
    title: '', description: '', startDate: '', endDate: '', location: '', maxParticipants: 0, budgetAllocation: 0, aipReference: '', category: (currentRole === 'SK Kagawad' ? 'Environmental Protection' : 'Education & Scholarship') as any, status: 'Published' as any
  });
  const [docForm, setDocForm] = useState({
    title: '', description: '', category: 'Resolutions' as any, fileName: '', resolutionNumber: '', designatedApprover: ''
  });
  const [expenseForm, setExpenseForm] = useState({
    programId: programs[0]?.id || '', budgetId: '', amount: 0, supplier: '', taxType: 'VAT' as any, category: 'Supplies' as any
  });
  const [budgetOptions, setBudgetOptions] = useState<any[]>([]);
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(false);
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  const [showAllocateProgram, setShowAllocateProgram] = useState(false);
  const [allocateForm, setAllocateForm] = useState({ category: '', allocatedAmount: '', description: '', fiscalYear: String(new Date().getFullYear()) });
  const [allocateError, setAllocateError] = useState('');
  const [isSavingAllocate, setIsSavingAllocate] = useState(false);
  const [allocateNotice, setAllocateNotice] = useState('');  const [expenseSaveError, setExpenseSaveError] = useState('');
  const [resForm, setResForm] = useState({
    title: '', number: '', author: '', endDate: ''
  });
  const [isSavingResolution, setIsSavingResolution] = useState(false);
  const [invForm, setInvForm] = useState({
    item: '', category: 'Sports Equipment', quantity: 0, condition: 'Good', cost: 0, location: ''
  });

  // Rejection Reason state for Secretary validations
  const [rejectionTargetId, setRejectionTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Attendance scanner state
  const [selectedProgId, setSelectedProgId] = useState(programs[0]?.id || '');

  // Auto-select the first program when the program list becomes available
  useEffect(() => {
    if (!selectedProgId && programs.length > 0) {
      setSelectedProgId(programs[0].id);
    }
  }, [programs, selectedProgId]);
  const [selectedProgramRegistrations, setSelectedProgramRegistrations] = useState<Registration[]>([]);
  const [attendanceMode, setAttendanceMode] = useState<'qr' | 'manual'>('qr');
  const [qrScanning, setQrScanning] = useState(false);
  const [qrMessage, setQrMessage] = useState('');
  const [manualQrInput, setManualQrInput] = useState('');
  const [lastScanDetail, setLastScanDetail] = useState<{
    rawCode: string;
    status: 'SUCCESS' | 'ALREADY_PRESENT' | 'NOT_REGISTERED' | 'WRONG_PROGRAM' | 'VENUE_CODE';
    title: string;
    message: string;
    participantName?: string;
    participantId?: string;
    purok?: string;
    programTitle?: string;
    timestamp: string;
  } | null>(null);
  const [isRecordingAttendance, setIsRecordingAttendance] = useState(false);

  useEffect(() => {
    if (!selectedProgId) {
      setLocalAttendance([]);
      return;
    }

    let isMounted = true;
    kabisigApi.getProgramAttendance(selectedProgId).then((rows) => {
      if (!isMounted || !rows) return;
      setLocalAttendance(rows.map((row: any) => {
        const user = Array.isArray(row.users) ? row.users[0] : row.users;
        const profile = youthProfiles.find(candidate => candidate.userId === row.user_id);
        return {
          id: row.id,
          programId: row.program_id,
          participantId: profile?.id || row.user_id,
          participantName: user?.full_name || profile?.name || 'Youth Constituent',
          checkInTime: row.checked_in_at,
          status: 'Present' as const,
        };
      }));
    }).catch((error: any) => console.warn('Could not load program attendance:', error));

    return () => { isMounted = false; };
  }, [selectedProgId, youthProfiles]);

  useEffect(() => {
    if (!selectedProgId) {
      setSelectedProgramRegistrations([]);
      return;
    }
    let isMounted = true;
    kabisigApi.getProgramRegistrations(selectedProgId).then((rows) => {
      if (!isMounted || !rows) return;
      setSelectedProgramRegistrations(rows.map((row: any) => {
        const user = Array.isArray(row.users) ? row.users[0] : row.users;
        const profile = youthProfiles.find(candidate => candidate.userId === row.user_id);
        return {
          id: row.id,
          programId: row.program_id,
          programTitle: programs.find(program => program.id === row.program_id)?.title || '',
          participantId: profile?.id || row.user_id,
          participantName: user?.full_name || profile?.name || 'Youth Constituent',
          dateRegistered: row.registered_at || '',
          status: row.status === 'attended' ? 'Completed' : 'Approved',
          qrCode: profile?.qrCode || '',
        };
      }));
    }).catch((error: any) => setQrMessage(error.message || 'Could not load registrations for this program.'));
    return () => { isMounted = false; };
  }, [selectedProgId, programs, youthProfiles]);

  // Tax withholding calculations (for expense form)
  const [calcVat, setCalcVat] = useState(0);
  const [calcWithholding, setCalcWithholding] = useState(0);
  const [calcNet, setCalcNet] = useState(10000);

  useEffect(() => {
    if (!currentTenant?.id) {
      setBudgetOptions([]);
      return;
    }

    let isMounted = true;
    setIsLoadingBudgets(true);
    kabisigApi.getBudgets(currentTenant.id).then((budgets) => {
      if (!isMounted) return;
      const currentYear = new Date().getFullYear();
      const currentYearBudgets = budgets.filter((budget) => Number(budget.fiscal_year) === currentYear);
      setBudgetOptions(currentYearBudgets);
      setExpenseForm(previous => ({
        ...previous,
        budgetId: currentYearBudgets.some(budget => budget.id === previous.budgetId)
          ? previous.budgetId
          : currentYearBudgets[0]?.id || '',
      }));
      setExpenseSaveError('');
    }).catch((error: any) => {
      if (isMounted) setExpenseSaveError(error.message || 'Could not load this barangay\'s budgets.');
    }).finally(() => {
      if (isMounted) setIsLoadingBudgets(false);
    });

    return () => { isMounted = false; };
  }, [currentTenant?.id]);

  useEffect(() => {
    const amt = expenseForm.amount;
    let vat = 0, wh = 0, net = amt;
    if (expenseForm.taxType === 'VAT') {
      const base = amt / 1.12;
      vat = amt - base;
      wh = base * 0.02; // 2% standard withholding for supplies
      net = amt - wh;
    } else if (expenseForm.taxType === 'Non-VAT') {
      wh = amt * 0.03; // 3% standard
      net = amt - wh;
    } else if (expenseForm.taxType === 'Withholding') {
      wh = amt * 0.02;
      net = amt - wh;
    }
    setCalcVat(parseFloat(vat.toFixed(2)));
    setCalcWithholding(parseFloat(wh.toFixed(2)));
    setCalcNet(parseFloat(net.toFixed(2)));
  }, [expenseForm.amount, expenseForm.taxType]);

  const nagaBarangaysBudget = (tenants && tenants.length > 0)
    ? [...tenants].sort((a, b) => a.name.localeCompare(b.name)).map(t => ({
        barangay: t.name.toUpperCase(),
        chairperson: t.chairperson || 'Unassigned',
        allocated: t.totalBudget || t.allocatedBudget || 0,
        actual: t.spentBudget || 0
      }))
    : [
        {
          barangay: currentTenant?.name?.toUpperCase() || 'BARANGAY',
          chairperson: currentTenant?.chairperson || 'SK Chairperson',
          allocated: currentTenant?.totalBudget || currentTenant?.allocatedBudget || 0,
          actual: currentTenant?.spentBudget || 0
        }
      ];

  const treasurerProgramsBudget = programs.map(p => {
    const actual = expenses
      .filter(e => e.programId === p.id)
      .reduce((acc, e) => acc + (e.amount || 0), 0);
    return {
      program: p.title,
      allocated: p.budgetAllocation || 0,
      actual: actual
    };
  });

  const getSectorStats = (categoryName: string) => {
    const categoryProgs = programs.filter(p => p.category === categoryName);
    const alloc = categoryProgs.reduce((acc, p) => acc + (p.budgetAllocation || 0), 0);
    const disb = expenses
      .filter(e => {
        const prog = programs.find(p => p.id === e.programId);
        return prog?.category === categoryName;
      })
      .reduce((acc, e) => acc + (e.amount || 0), 0);
    const rate = alloc > 0 ? (disb / alloc) * 100 : 0;
    return { alloc, disb, rate };
  };

  // --- MULTI-ROLE DATA CONFIGURATION (DRY DESIGN) ---
  const menuConfig: Partial<Record<UserRole, { id: string; label: string; icon: any }[]>> = {
    'SK Kagawad': [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'programs', label: 'Programs & Initiatives', icon: ClipboardList },
      { id: 'attendance', label: 'Attendance Tracking', icon: CalendarCheck },
      { id: 'feedback', label: 'Feedback Desk', icon: MessageSquare }
    ],
    'SK Secretary': [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'documents', label: 'Documents Repository', icon: FolderClosed },
      { id: 'records', label: 'Youth Records', icon: Users },
      { id: 'reports', label: 'Administrative Reports', icon: BarChart3 }
    ],
    'SK Treasurer': [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'budget', label: 'Budget', icon: Coins },
      { id: 'inventory', label: 'Inventory', icon: Layers },
      { id: 'reports', label: 'Reports', icon: BarChart3 }
    ]
  };

  const profileConfig: Partial<Record<UserRole, { name: string; title: string; avatar?: string }>> = {
    'SK Kagawad': {
      name: currentUser?.full_name || 'SK Kagawad',
      title: 'SK Kagawad',
    },
    'SK Secretary': {
      name: currentUser?.full_name || 'SK Secretary',
      title: 'SK Secretary',
    },
    'SK Treasurer': {
      name: currentUser?.full_name || 'SK Treasurer',
      title: 'SK Treasurer',
    }
  };

  // --- STATS COMPUTATIONS ---
  const totalSpentExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalBarangayBudget = Number(currentTenant?.totalBudget) || Number(currentTenant?.allocatedBudget) || programs.reduce((sum, program) => sum + (Number(program.budgetAllocation) || 0), 0);
  const remainingCash = totalBarangayBudget - totalSpentExpenses;
  const budgetUtilizationRate = (totalSpentExpenses / totalBarangayBudget) * 100;

  // --- ACTIONS HANDLERS ---
  const handlePublishProgram = async () => {
    if (!progForm.title) {
      alert('Program Title is required.');
      return;
    }
    const newP: Program = {
      id: `prog-${Date.now().toString().slice(-3)}`,
      title: progForm.title,
      description: progForm.description,
      startDate: progForm.startDate,
      endDate: progForm.endDate,
      location: progForm.location,
      maxParticipants: progForm.maxParticipants,
      budgetAllocation: progForm.budgetAllocation,
      spentBudget: 0,
      aipReference: progForm.aipReference,
      category: progForm.category,
      status: progForm.status,
      registeredCount: 0
    };
    try {
          const created = await onAddProgram(newP);
          if (created !== false) {
            setShowProgModal(false);
            setProgramNotice({ type: 'success', text: 'Program "' + progForm.title + '" created successfully.' });
            window.setTimeout(() => setProgramNotice(null), 5000);
          } else {
            setProgramNotice({ type: 'error', text: 'Program creation failed. Please try again.' });
          }
        } catch (err: any) {
          setProgramNotice({ type: 'error', text: err?.message || 'Program creation failed.' });
        }
      };

  const getDefaultApproverForCategory = (cat: string): string => {
    switch (cat) {
      case 'Resolutions':
      case 'Budget':
        return currentTenant?.chairperson || 'SK Chairperson';
      case 'Minutes':
      case 'Meeting Minutes':
      case 'Communications':
        return 'Council Secretariat / SK Secretary';
      case 'Vouchers':
        return currentUser?.full_name || 'SK Treasurer';
      case 'Reports':
        return 'DILG Local Government Officer';
      default:
        return 'Committee Chair & SK Council';
    }
  };

  const handleUploadDocumentSubmit = async () => {
    if (!docForm.title.trim()) return setDocumentUploadError('Document title is required.');
    if (!selectedDocumentFile) return setDocumentUploadError('Select a document file to upload.');
    
    // Auto-generate resolution / tracking code if needed
    const cat = docForm.category || 'Resolutions';
    const catCode = cat === 'Resolutions' ? 'RES' : cat.slice(0, 3).toUpperCase();
    const count = localDocs.filter(d => d.category === cat).length + 1;
    const defaultResNum = cat === 'Resolutions'
      ? `Res. No. ${new Date().getFullYear()}-${count.toString().padStart(3, '0')}`
      : `${catCode}-2026-${count.toString().padStart(3, '0')}`;
    const autoResNum = docForm.resolutionNumber?.trim() || defaultResNum;

    const documentType = docForm.category === 'Resolutions'
      ? 'Resolution'
      : docForm.category === 'Minutes'
        ? 'Minutes'
        : docForm.category === 'Reports' || docForm.category === 'Budget' || docForm.category === 'Vouchers'
          ? 'Financial Report'
          : 'Other';

    setIsUploadingDocument(true);
    setDocumentUploadError('');
    try {
      const result = await kabisigApi.uploadDocument({
        title: docForm.title.trim(),
        document_type: documentType,
        file: selectedDocumentFile,
      });
      if (!result.success || !result.data?.id) {
        throw new Error(result.message || 'Document upload could not be completed.');
      }

      const saved = result.data;
      const uploadedDate = saved.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];
      const newDocument: DocumentRecord = {
        id: saved.id,
        title: saved.title,
        category: docForm.category,
        status: saved.status === 'pending_approval' ? 'Pending' : saved.status,
        uploadedBy: currentUser?.full_name || `${currentRole} Secretariat`,
        uploadedDate,
        fileSize: `${(selectedDocumentFile.size / (1024 * 1024)).toFixed(2)} MB`,
        description: docForm.description,
        resolutionNumber: autoResNum,
        designatedApprover: docForm.designatedApprover,
        version: 'v1.0',
        barangayId: saved.tenant_id,
        fileUrl: saved.file_url,
        reviewFeedback: saved.feedback || '',
        created_at: saved.created_at,
      };

      setLocalDocs(prev => [newDocument, ...prev]);
      onAddDocument(newDocument);
      setShowDocModal(false);
      setSelectedDocumentFile(null);
      setDocForm({ title: '', description: '', category: 'Resolutions', fileName: '', resolutionNumber: '', designatedApprover: currentTenant?.chairperson || '' });
    } catch (error: any) {
      setDocumentUploadError(error.message || 'Document upload failed.');
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const handleSaveDocEdit = () => {
    if (!selectedDoc) return;
      const currentVerNum = parseFloat((selectedDoc.version || 'v1.0').replace('v', '')) || 1.0;
    setLocalDocs(prev => prev.map(doc => {
      if (doc.id === selectedDoc.id) {
        const newVer = `v${(currentVerNum + 0.1).toFixed(1)}`;
        const updatedHistory = doc.history || [];
        return {
          ...selectedDoc,
          version: newVer,
          history: [
            ...updatedHistory,
            {
              date: new Date().toISOString().split('T')[0],
              action: `Document Revised (${newVer})`,
              user: `${currentRole} Secretariat`,
              notes: 'Document metadata updated.'
            }
          ]
        };
      }
      return doc;
    }));
    setShowEditDocModal(false);
    setSelectedDoc(null);
  };




  const printOfficialReport = (title: string, reportHtml: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to open report print preview.');
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} - SK Council Report</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
          body { font-family: 'Poppins', ui-sans-serif, system-ui, sans-serif; color: #0f172a; margin: 0; padding: 40px; background: #fff; }
          .header { text-align: center; border-bottom: 2px solid #091d64; padding-bottom: 15px; margin-bottom: 25px; }
          .header h1 { font-size: 11px; font-weight: bold; color: #64748b; margin: 0; text-transform: uppercase; letter-spacing: 1.5px; }
          .header h2 { font-size: 18px; font-weight: bold; color: #091d64; margin: 4px 0; }
          .header h3 { font-size: 13px; font-weight: bold; color: #334155; margin: 0; }
          .meta-bar { display: flex; justify-content: space-between; font-size: 11px; color: #475569; background: #f8fafc; padding: 8px 12px; border-radius: 6px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
          th { background: #091d64; color: #fff; padding: 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
          td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
          .footer-sig { margin-top: 50px; display: flex; justify-content: space-between; font-size: 11px; }
          .sig-box { text-align: center; width: 220px; }
          .sig-line { border-top: 1px solid #0f172a; margin-top: 40px; padding-top: 4px; font-weight: bold; }
          .sig-grid { margin-top: 50px; display: flex; justify-content: space-around; gap: 40px; font-size: 11px; }
          .sig-cell { text-align: center; width: 240px; }
          .sig-cell .name { font-weight: bold; border-top: 1px solid #0f172a; margin-top: 40px; padding-top: 4px; }
          .sig-cell .role { font-size: 10px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Republic of the Philippines • City of Naga</h1>
          <h2>SANGGUNIANG KABATAAN COUNCIL</h2>
          <h3>Barangay ${currentTenant?.name || 'Barangay'}</h3>
        </div>
        <div class="meta-bar">
          <span><strong>Report Title:</strong> ${title}</span>
          <span><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span><strong>Prepared By:</strong> ${currentUser?.full_name || 'Authorized SK Official'} (${currentRole || 'SK Official'})</span>
        </div>
        ${reportHtml}
        <div class="footer-sig">
          <div class="sig-box">
            <p>Prepared & Certified Correct:</p>
            <p style="font-size:10px; color:#64748b; margin-top:2px;">${currentRole || 'SK Official'}</p>
          </div>
          <div class="sig-box">
            <p>Attested & Approved:</p>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
            <div class="sig-grid">
        <div class="sig-cell">
          <div class="name">${(currentTenant?.chairperson || 'SK Chairperson').toUpperCase()}</div>
          <div class="role">SK Chairperson &bull; Barangay ${currentTenant?.name || ''}</div>
        </div>
        <div class="sig-cell">
          <div class="name">${(currentUser?.full_name || 'SK Official').toUpperCase()}</div>
          <div class="role">${currentRole || 'SK Official'}</div>
        </div>
      </div>
</body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleLogExpenseSubmit = async () => {
    if (!expenseForm.supplier.trim()) return setExpenseSaveError('Supplier name is required.');
    if (!expenseForm.budgetId) return setExpenseSaveError('Select a current-year barangay budget before logging this expense.');
    const selectedP = programs.find(p => p.id === expenseForm.programId);
    setIsSavingExpense(true);
    setExpenseSaveError('');
    const newExp: ExpenseRecord = {
      id: `exp-${Date.now().toString().slice(-3)}`,
      programId: expenseForm.programId,
      budgetId: expenseForm.budgetId,
      programTitle: selectedP?.title || 'General Fund',
      amount: expenseForm.amount,
      supplier: expenseForm.supplier,
      taxType: expenseForm.taxType,
      vatAmount: calcVat,
      withholdingTax: calcWithholding,
      netAmount: calcNet,
      category: expenseForm.category,
      status: 'Approved',
      dateLogged: new Date().toISOString().split('T')[0]
    };
    try {
      await onAddExpense(newExp);
      setShowExpenseModal(false);
    } catch (error: any) {
      setExpenseSaveError(error.message || 'Expense could not be saved. Please try again.');
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDraftResolutionSubmit = async () => {
    if (!resForm.title.trim() || !resForm.number.trim() || !resForm.endDate) {
      return alert('Please provide a resolution title, number, and voting close date.');
    }

    setIsSavingResolution(true);
    try {
      const startDate = new Date();
      const endDate = new Date(`${resForm.endDate}T23:59:59.999`);
      const result = await kabisigApi.createPoll({
        question: resForm.title.trim(),
        description: `Resolution Number: ${resForm.number.trim()}\nProposed by: ${resForm.author}`,
        options: ['Support', 'Oppose'],
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });
      if (!result.success || !result.data) throw new Error(result.message || 'Resolution poll could not be saved.');

      setLocalResolutions(prev => [result.data!, ...prev]);
      onAddResolution(result.data);
      setResForm({ title: '', number: '', author: currentUser?.full_name || '', endDate: '' });
      setShowResModal(false);
    } catch (error: any) {
      alert(error.message || 'Resolution poll could not be saved.');
    } finally {
      setIsSavingResolution(false);
    }
  };

  const handleRegisterInventorySubmit = async () => {
    if (!invForm.item) return alert('Item name is required.');
    try {
      const res = await kabisigApi.addInventoryItem({
        item_name: invForm.item,
        category: invForm.category,
        condition: invForm.condition === 'Needs Repair' ? 'Fair' : invForm.condition,
        quantity: invForm.quantity,
        unit: 'pcs',
        unit_cost: invForm.cost,
        location: invForm.location,
      });
      if (!res.success || !res.data) throw new Error(res.message || 'Could not save asset.');
      const row = res.data;
      setInventory(prev => [{ id: row.id, item: row.item_name, category: row.category, condition: row.condition, quantity: Number(row.quantity) || 0, cost: Number(row.unit_cost) || 0, location: row.location || "" }, ...prev]);
      setShowInvModal(false);
    } catch (error: any) {
      alert(error.message || 'Could not save asset.');
    }
  };

  const handleOpenFeedbackResponse = (fb: FeedbackRecord) => {
    setSelectedFeedback(fb);
    setFeedbackResponseText(fb.response || '');
    setFeedbackStatusChoice(fb.status === 'Pending' ? 'Reviewed' : fb.status);
    setShowFeedbackModal(true);
  };

  const handleSaveFeedbackResponse = async () => {
    if (!selectedFeedback) return;
    if (!feedbackResponseText.trim()) {
      alert('Please provide an official response for the youth constituent.');
      return;
    }
    const apiStatus = feedbackStatusChoice === 'Reviewed' ? 'under_review' : 'resolved';
    const result = await kabisigApi.respondToFeedback(
      selectedFeedback.id,
      feedbackResponseText.trim(),
      apiStatus
    );
    if (!result.success) {
      alert(result.message || 'Official response could not be saved.');
      return;
    }
    setLocalFeedback(prev => prev.map(f => {
      if (f.id === selectedFeedback.id) {
        return {
          ...f,
          response: feedbackResponseText,
          status: feedbackStatusChoice
        };
      }
      return f;
    }));
    setShowFeedbackModal(false);
    setSelectedFeedback(null);
    alert('Official response saved and posted to Boses ng Kabataan constituent desk!');
  };

  const handleActualScan = async (scannedText: string) => {
    if (isRecordingAttendance) return;
    if (!selectedProgId) {
      setLastScanDetail({
        rawCode: scannedText,
        status: 'NOT_REGISTERED',
        title: 'No Program Selected',
        message: 'Please select an active program from the dropdown at the top of this tab before scanning.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
      setQrMessage('Select an active program first.');
      return;
    }
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const currentProg = programs.find(p => p.id === selectedProgId);
    const progTitle = currentProg?.title || selectedProgId;

    // 1. Check if user scanned a Program Venue QR Code (e.g. KABISIG-PROG-PROG01 or PROG01)
    if (scannedText.startsWith('KABISIG-PROG-') || (scannedText.startsWith('PROG') && !scannedText.includes('PART') && !scannedText.includes('SK'))) {
      const scannedProgId = scannedText.replace('KABISIG-PROG-', '');
      const scannedProg = programs.find(p => p.id === scannedProgId || p.id === scannedText);
      const matchedTitle = scannedProg?.title || scannedProgId;

      setLastScanDetail({
        rawCode: scannedText,
        status: 'VENUE_CODE',
        title: 'Program Venue QR Code Detected',
        message: `You scanned the venue QR code for "${matchedTitle}". To check in an individual youth, point the camera at their Digital Youth ID or Event Ticket Pass.`,
        programTitle: matchedTitle,
        timestamp: timeStr
      });
      setQrMessage(` Venue QR Code Detected for "${matchedTitle}". Please scan a Youth Constituent ID or Ticket.`);
      return;
    }

    // 2. Parse Event Pass vs Youth ID Code
    let partId = scannedText;
    let qrProgId = selectedProgId;
    let scannedUserId = '';
    let scannedDigitalYouthId = '';

    try {
      const payload = JSON.parse(scannedText);
      scannedUserId = payload.user_id || '';
      scannedDigitalYouthId = payload.digital_youth_id || '';
      partId = scannedDigitalYouthId || scannedUserId || partId;
    } catch {
      if (scannedText.startsWith('KAB-NAGA-')) scannedDigitalYouthId = scannedText;
    }

    if (scannedText.startsWith('KABISIG-QR-')) {
      const qrPayload = scannedText.slice('KABISIG-QR-'.length);
      const matchingProgram = programs.find(p => qrPayload.startsWith(`${p.id}-`));

      if (matchingProgram) {
        qrProgId = matchingProgram.id;
        partId = qrPayload.slice(`${matchingProgram.id}-`.length);
      } else {
        // Personal Youth IDs use KABISIG-QR-{residentId}; keep the full resident ID.
        partId = qrPayload;
      }
    }

    // 3. Check for Program Mismatch
    if (qrProgId && qrProgId !== selectedProgId) {
      const targetProg = programs.find(p => p.id === qrProgId);
      const wrongTitle = targetProg?.title || qrProgId;

      setLastScanDetail({
        rawCode: scannedText,
        status: 'WRONG_PROGRAM',
        title: 'Event Ticket Mismatch',
        message: `This pass is for "${wrongTitle}", but scanner desk is currently set to "${progTitle}".`,
        participantId: partId,
        programTitle: wrongTitle,
        timestamp: timeStr
      });
      setQrMessage(`Event Mismatch: Ticket is for "${wrongTitle}". Switch active program above.`);
      return;
    }

    // 4. Match against Approved Registrations for selected program
    const youthProf = youthProfiles.find(y =>
      (scannedUserId && y.userId === scannedUserId) ||
      (scannedDigitalYouthId && y.id === scannedDigitalYouthId) ||
      y.id === partId || y.id === scannedText || y.qrCode === scannedText
    );
    const reg = selectedProgramRegistrations.find(r =>
      r.programId === selectedProgId && 
      (r.participantId === partId || r.qrCode === scannedText || r.participantId === scannedText || (youthProf && r.participantId === youthProf.id)) && 
      r.status === 'Approved'
    );

    // Widened lookup for display — includes any registration status and matches by user_id, participantId, or qrCode
    const regAny = selectedProgramRegistrations.find(r =>
      (scannedUserId && r.participantId === scannedUserId) ||
      r.participantId === partId ||
      r.qrCode === scannedText ||
      (scannedDigitalYouthId && r.qrCode === scannedDigitalYouthId)
    ) as any;
    // Fall back to the full registrations list (any program) so we can still resolve a name
    const regGlobal = (registrations as any[]).find(r =>
      (scannedUserId && (r.participantId === scannedUserId || (r.userId && r.userId === scannedUserId))) ||
      r.participantId === partId ||
      r.qrCode === scannedText
    );
    const resolvedName = (reg?.participantName || youthProf?.name || regAny?.participantName || regGlobal?.participantName || "").trim();
    // Fallback: try harder to find a real name before defaulting to placeholder
    let youthName = resolvedName && resolvedName !== partId ? resolvedName : '';
    if (!youthName && partId) {
      const lookedUp = youthProfiles.find((y: any) => y.userId === partId || y.id === partId);
      youthName = lookedUp?.name || '';
    }
    if (!youthName && partId) {
      const fromReg = registrations.find((r: any) => r.participantId === partId || r.userId === partId);
      youthName = fromReg?.participantName || '';
    }
    if (!youthName) youthName = "Unknown / Unregistered Youth";
    const finalPartId = reg?.participantId || youthProf?.id || regAny?.participantId || regGlobal?.participantId || partId;
    const purokVal = youthProf?.zone || regAny?.zone || "Naga Youth Constituent";
    // The backend is authoritative for identity, registration, and duplicate check-in validation.
    const record: AttendanceRecord = {
      id: '',
      programId: selectedProgId,
      participantId: finalPartId,
      participantName: youthName,
      checkInTime: '',
      status: 'Present'
    };

    setIsRecordingAttendance(true);
    try {
      const savedRecord = await onRegisterAttendance(record, scannedText);
      setLocalAttendance(prev => [savedRecord, ...prev.filter(item => item.id !== savedRecord.id)]);
      setLastScanDetail({
        rawCode: scannedText,
        status: 'SUCCESS',
        title: 'Check-In Verified & Logged',
        message: `Verified! ${savedRecord.participantName} has been marked Present for "${progTitle}".`,
        participantName: savedRecord.participantName,
        participantId: savedRecord.participantId,
        purok: purokVal,
        programTitle: progTitle,
        timestamp: new Date(savedRecord.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
      setQrMessage(`SUCCESS: ${savedRecord.participantName} verified and logged Present!`);
    } catch (error: any) {
      const message = error.message || 'Attendance could not be recorded.';
      const isDuplicate = /duplicate check-in|already checked in/i.test(message);
      setLastScanDetail({
        rawCode: scannedText,
        status: isDuplicate ? 'ALREADY_PRESENT' : 'NOT_REGISTERED',
        title: isDuplicate ? 'Already Present' : 'Attendance Rejected',
        message,
        participantName: (error?.details?.attendee_name || error?.response?.data?.details?.attendee_name || youthName),
        participantId: finalPartId,
        purok: purokVal,
        programTitle: progTitle,
        timestamp: timeStr
      });
      setQrMessage(message);
    } finally {
      setIsRecordingAttendance(false);
    }
  };

  // Live QR Attendance Action
  const handleQrScanTrigger = () => {
    setQrScanning(true);
    setQrMessage('Aligning camera framework...');
    setTimeout(async () => {
      const activeRegs = registrations.filter(r => r.programId === selectedProgId && r.status === 'Approved');
      if (activeRegs.length === 0) {
        setQrMessage('Error: No approved registrations to scan.');
        setQrScanning(false);
        return;
      }
      const rand = activeRegs[Math.floor(Math.random() * activeRegs.length)];
      const resident = youthProfiles.find(profile => profile.id === rand.participantId);
      if (!resident?.userId) {
        setQrMessage(`Cannot simulate check-in: ${rand.participantName}'s authenticated ID is unavailable.`);
        setQrScanning(false);
        return;
      }
      await handleActualScan(JSON.stringify({ user_id: resident.userId }));
      setQrScanning(false);
    }, 1200);
  };

  const handleManualCheckIn = async (r: Registration) => {
    const resident = youthProfiles.find(profile => profile.id === r.participantId);
    if (!resident?.userId) {
      setQrMessage(`Cannot check in ${r.participantName}: authenticated youth ID is unavailable.`);
      return;
    }
    await handleActualScan(JSON.stringify({ user_id: resident.userId }));
  };

  // Rejection handling with reason
  const triggerRejection = (id: string) => {
    setRejectionTargetId(id);
    setRejectReason('');
  };

  const confirmRejectionSubmit = () => {
    if (!rejectionTargetId || !rejectReason) return alert('Rejection reason is required.');
    onRejectYouth(rejectionTargetId, rejectReason);
    setRejectionTargetId(null);
  };

  const onApproveYouth = (id: string) => {
    const candidate = localYouthProfiles.find(y => y.id === id);
    alert(`KK Constituent candidate ${candidate?.name || id} reviewed and verified by SK Secretary. Profile record updated and queued for final registration approval by the Barangay Administrator (SK Chairperson) per DILG IRR RA 10742, Sec 14.`);
  };

  const onRejectYouth = (id: string, reason: string) => {
    const candidate = localYouthProfiles.find(y => y.id === id);
    alert(`Verification observation logged for candidate ${candidate?.name || id}: "${reason}". Recommendation forwarded to Barangay Administrator (SK Chairperson) for final determination.`);
  };

  const handleInviteYouth = async (userId: string, youthName: string) => {
    if (!userId) {
      alert('This youth has no linked user account and cannot be notified in-app.');
      return;
    }
    try {
      const res = await kabisigApi.sendNotification({
        user_id: userId,
        title: 'SK Outreach Invitation',
        message: 'You are invited to join our upcoming SK programs. Please check the Programs tab for open slots and register.',
        notification_type: 'outreach',
        link: '/programs',
      });
      if (!res.success) {
        alert(res.message || 'Could not send invitation.');
        return;
      }
      alert('Invitation sent to ' + youthName + '. They will see it in their notifications.');
    } catch (err) {
      alert((err && err.message) ? err.message : 'Network error sending invitation.');
    }
  };
  const formatProgramTitle = (title: string) => {
    if (!currentTenant) return title;
    return title.replace(/Balatas|Tabuco|Concepcion Grande|Dayangdang|Concepcion PequeÃƒÂ±a/g, currentTenant.name);
  };

  // Filtered lists
  const filteredPrograms = programs.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = filterCategory === 'All' ? true : p.category === filterCategory;
    return matchSearch && matchCat;
  });

  const filteredYouth = localYouthProfiles.filter(y => {
    const matchSearch = y.name.toLowerCase().includes(searchTerm.toLowerCase()) || y.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = filterCategory === 'All' ? true : y.zone === filterCategory || y.scholarStatus === filterCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#f8fafc] overflow-hidden font-sans text-slate-800">
      
      {/* MOBILE TOP HEADER BAR */}
      <div className="lg:hidden bg-[#091d64] text-white px-4 py-3 flex justify-between items-center sticky top-0 z-30 shadow-md gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <img src="/images/Kabisig_logo.png" alt="KABISIG" className="h-8 w-auto object-contain shrink-0" />
          <span className="text-[10px] font-bold bg-[#1e3a8a] px-2 py-0.5 rounded text-amber-300 truncate">{currentRole}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <NotificationMenu
            buttonClassName="text-white hover:bg-white/10"
            onNavigate={() => { setActiveMenu('programs'); setIsMobileMenuOpen(false); }}
          />
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 lg:hidden flex flex-col justify-between p-6 animate-in fade-in duration-200">
          <div className="space-y-6 overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <ProfileAvatar name={profileConfig[currentRole]?.name} className="w-10 h-10 rounded-full border-2 border-amber-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">{profileConfig[currentRole]?.name}</h4>
                  <p className="text-[10px] text-slate-300">{profileConfig[currentRole]?.title}</p>
                </div>
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
                Official SK Navigation  Brgy. {currentTenant?.name || 'Barangay'}
              </div>
              {menuConfig[currentRole]?.map(menu => {
                const Icon = menu.icon;
                const isActive = activeMenu === menu.id;
                return (
                  <button
                    key={menu.id}
                    onClick={() => { 
                      setActiveMenu(menu.id); 
                      setSearchTerm(''); 
                      setFilterCategory('All'); 
                      setIsMobileMenuOpen(false); 
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 ${isActive ? 'bg-[#091d64] text-white shadow-md' : 'text-slate-200 hover:bg-white/10'}`}
                  >
                    <Icon className="w-4.5 h-4.5 text-amber-400" />
                    {menu.label}
                  </button>
                );
              })}
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

      {/* 1. LEFT SIDEBAR - DESKTOP ONLY */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-100 flex-col justify-between h-full flex-shrink-0 z-40 shadow-sm">
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Logo brand - Using Official Logo */}
          <div className="p-5 border-b border-slate-100 flex flex-col items-center gap-3 bg-gradient-to-b from-blue-50/40 to-transparent">
            <KabisigLogo className="w-36" />
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1 flex-1">

            {menuConfig[currentRole]?.map(menu => {
              const Icon = menu.icon;
              const isActive = activeMenu === menu.id;
              return (
                <button
                  key={menu.id}
                  onClick={() => { setActiveMenu(menu.id); setSearchTerm(''); setFilterCategory('All'); }}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 ${
                    isActive 
                      ? 'bg-[#eff6ff] text-[#091d64] shadow-xs' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-[#091d64]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#091d64]' : 'text-slate-400'}`} />
                  {menu.label}
                </button>
              );
            })}

            <div className="pt-4 pb-2">
              <span className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Session</span>
            </div>

            <button
              onClick={onLogout}
              className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              Log Out
            </button>
          </nav>
        </div>
      </aside>

      {/* 2. RIGHT WORKSPACE CONTAINER */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* DESKTOP HEADER */}
        <header className="hidden lg:flex bg-white border-b border-slate-100 h-20 items-center justify-between px-8 flex-shrink-0 z-30">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                {barangayLogo && (
                  <img
                    src={barangayLogo}
                    alt="Barangay Seal"
                    className="w-11 h-11 object-contain rounded-full bg-white p-0.5 border border-slate-200 shadow-2xs shrink-0"
                  />
                )}
                <h1 className="font-sans font-bold text-[#091d64] text-2xl tracking-tight leading-none">
                  {activeMenu.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </h1>
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded bg-[#091d64] text-white">
                  {currentRole}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-sans tracking-wide font-semibold mt-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Barangay {currentTenant?.name || 'Barangay'} SK Council  Naga City
              </span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <NotificationMenu onNavigate={() => setActiveMenu('programs')} />
            <UserMenu 
              userName={profileConfig[currentRole]?.name || 'User'}
              role={profileConfig[currentRole]?.title || 'Official'}
              onLogout={onLogout}
            />
          </div>
        </header>

        {/* WORKSPACE VIEW CONTENT AREA */}
        <div className="flex-grow p-3.5 sm:p-6 lg:p-8 pb-24 sm:pb-8 overflow-y-auto">
          
          {/* ==================== SCREEN 1: DASHBOARD (Unified role-based screen) ==================== */}
          {activeMenu === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {programNotice && (
                <div role="status" className={`rounded-xl border px-4 py-3 text-xs font-semibold ${programNotice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
                  {programNotice.text}
                </div>
              )}
              <section className="bg-white rounded-xl border border-slate-100 shadow-xs p-4 text-left">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-[#091d64]" />
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Latest SK Announcements</h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">{announcements.filter(a => a.status === 'published').length} total</span>
                </div>
                <div className="space-y-3">
                  {announcements.filter(a => a.status === 'published').slice(0, 2).map(a => (
                    <div key={a.id} className="rounded-lg border border-slate-100 p-2.5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9px] font-bold uppercase text-blue-700">{a.category}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{a.datePosted}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 truncate">{a.title}</p>
                      <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{a.content}</p>
                    </div>
                  ))}
                  {announcements.filter(a => a.status === 'published').length === 0 && (
                    <p className="py-6 text-center text-xs text-slate-400 font-semibold">No published announcements yet.</p>
                  )}
                </div>
              </section>
              
              {/* 4 Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                {currentRole === 'SK Kagawad' && (
                  <>
                    <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-default group">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#091d64] flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:bg-[#091d64] group-hover:text-white transition-colors">
                        <ClipboardList className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Active Programs</span>
                          <span className="text-[9px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded">CBYDP Aligned</span>
                        </div>
                        <h3 className="text-2xl font-black text-[#091d64] mt-0.5">{programs.length} <span className="text-xs font-semibold text-slate-400">Initiatives</span></h3>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">AYDP 8 Participation Centers</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-default group">
                      <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:bg-violet-600 group-hover:text-white transition-colors">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">KK Participants</span>
                          <span className="text-[9px] font-bold bg-violet-50 text-violet-700 px-1.5 py-0.2 rounded">Roster Active</span>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mt-0.5">{youthProfiles.length} <span className="text-xs font-semibold text-slate-400">Youth</span></h3>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">Registered KK Residents</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-default group">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <CalendarCheck className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Attendance Tracking</span>
                          <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded">QR Verified</span>
                        </div>
                        <h3 className="text-2xl font-black text-emerald-600 mt-0.5">{localAttendance?.length ?? 0} <span className="text-xs font-semibold text-slate-400">Check-ins</span></h3>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">Event Check-in Average</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-default group">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Rule-Based Matching</span>
                          <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded">Active</span>
                        </div>
                        <h3 className="text-2xl font-black text-amber-600 mt-0.5">{programs?.length ?? 0} <span className="text-xs font-semibold text-slate-400">Programs</span></h3>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">Generated from resident profiles</p>
                      </div>
                    </div>
                  </>
                )}

                {currentRole === 'SK Secretary' && (
                  <>
                    <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-default group">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#091d64] flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:bg-[#091d64] group-hover:text-white transition-colors">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">KK Youth Database</span>
                          <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded">Active</span>
                        </div>
                        <h3 className="text-2xl font-black text-[#091d64] mt-0.5">{youthProfiles.length} <span className="text-xs font-semibold text-slate-400">Residents</span></h3>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">Katipunan ng Kabataan (Ages 15–30 yrs)</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-default group">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <FolderClosed className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Document Archive</span>
                          <span className="text-[9px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded">Indexed</span>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mt-0.5">{localDocs.length} <span className="text-xs font-semibold text-slate-400">Records</span></h3>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">Resolutions, Minutes & Dossiers</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-default group">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Pending Actions</span>
                          <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded">Action Req</span>
                        </div>
                        <h3 className="text-2xl font-black text-amber-600 mt-0.5">{localDocs.filter(d => d.status === 'Pending').length + 1} <span className="text-xs font-semibold text-slate-400">Items</span></h3>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">Minutes signing & transmittals</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-default group">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">DILG Compliance</span>
                          <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded">100% On-Time</span>
                        </div>
                        <h3 className="text-2xl font-black text-emerald-600 mt-0.5">98.5%</h3>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">RA 10742 & CBYDP Standard</p>
                      </div>
                    </div>
                  </>
                )}

                {currentRole === 'SK Treasurer' && (
                  <>
                    <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-default group">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#091d64] flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:bg-[#091d64] group-hover:text-white transition-colors">
                        <Coins className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Program Allocations</span>
                          <span className="text-[9px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded">Current Year</span>
                        </div>
                        <h3 className="text-xl font-black text-[#091d64] mt-0.5">₱{totalBarangayBudget.toLocaleString()}</h3>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">From saved SK programs</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-default group">
                      <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:bg-rose-600 group-hover:text-white transition-colors">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Disbursed Ledger</span>
                          <span className="text-[9px] font-bold bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded">COA Audited</span>
                        </div>
                        <h3 className="text-xl font-black text-rose-600 mt-0.5">₱{totalSpentExpenses.toLocaleString()}</h3>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">VAT / Non-VAT Expenses</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-default group">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <RefreshCw className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Cash Balance</span>
                          <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded">{((remainingCash / (totalBarangayBudget || 1))*100).toFixed(1)}% Left</span>
                        </div>
                        <h3 className="text-xl font-black text-emerald-600 mt-0.5">₱{remainingCash.toLocaleString()}</h3>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">Net Unexpended Funds</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-default group">
                      <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:bg-violet-600 group-hover:text-white transition-colors">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Property Roster</span>
                          <span className="text-[9px] font-bold bg-violet-50 text-violet-700 px-1.5 py-0.2 rounded">100% Serviceable</span>
                        </div>
                        <h3 className="text-2xl font-black text-[#091d64] mt-0.5">{inventory.length} <span className="text-xs font-semibold text-slate-400">Items</span></h3>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">Barangay Property Assets</p>
                      </div>
                    </div>
                  </>
                )}

                {currentRole === 'SK Chairperson' && (
                  <>
                    <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-default group">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#091d64] flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:bg-[#091d64] group-hover:text-white transition-colors">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Katipunan ng Kabataan</span>
                          <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded">Active</span>
                        </div>
                        <h3 className="text-2xl font-black text-[#091d64] mt-0.5">{youthProfiles.length} <span className="text-xs font-semibold text-slate-400">Youth</span></h3>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">Barangay Resident Roster</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-default group">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <ClipboardList className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Active CBYDP Programs</span>
                          <span className="text-[9px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded">In Progress</span>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mt-0.5">{programs.length} <span className="text-xs font-semibold text-slate-400">Initiatives</span></h3>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">AYDP 8 Centers of Participation</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-default group">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        <Coins className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Program Allocations</span>
                          <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded">Current Year</span>
                        </div>
                        <h3 className="text-xl font-black text-amber-600 mt-0.5">₱{totalBarangayBudget.toLocaleString()}</h3>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">₱{remainingCash.toLocaleString()} Cash Balance</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-default group">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Governance Score</span>
                          <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded">DILG Excellent</span>
                        </div>
                        <h3 className="text-2xl font-black text-emerald-600 mt-0.5">99.2%</h3>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">Full Transparency Compliant</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* ==================== SK SECRETARY DEDICATED EXECUTIVE DASHBOARD ==================== */}
              {currentRole === 'SK Secretary' && (
                <div className="space-y-8">
                  {/* Quick Action Secretariat Command Hub */}
                  <div className="bg-gradient-to-r from-[#091d64] via-[#102a83] to-[#1e3a8a] rounded-2xl p-6 text-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-1.5 max-w-lg">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-amber-400 text-slate-900 font-extrabold text-[10px] rounded uppercase tracking-wider">
                          Council Secretariat Console
                        </span>
                        <span className="text-xs text-blue-200">Barangay {currentTenant?.name || 'Barangay'} • 2023–2026 Term</span>
                      </div>
                      <h3 className="text-xl font-bold font-sans tracking-tight">Legislative Repository & KK Profiling Governance</h3>
                      <p className="text-xs text-blue-100 leading-relaxed">
                        Maintain official council proceedings, resolutions, Katipunan ng Kabataan digital records, and DILG compliance reports.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2.5 lg:flex-nowrap shrink-0">
                      <button 
                        onClick={() => {
                          setDocForm({
                            title: '',
                            description: '',
                            category: 'Resolutions',
                            fileName: '',
                            resolutionNumber: `Res. No. ${new Date().getFullYear()}-${String(localResolutions.length + 1).padStart(3, '0')}`,
                            designatedApprover: currentTenant?.chairperson || ''
                          });
                          setShowDocModal(true);
                        }}
                        className="px-3.5 py-2 bg-white text-[#091d64] hover:bg-blue-50 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-[#091d64]" /> Draft Resolution
                      </button>
                      <button 
                        onClick={() => setActiveMenu('records')}
                        className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 border border-white/20 cursor-pointer"
                      >
                        <Users className="w-4 h-4 text-amber-300" /> Verify Youth Records
                      </button>
                      <button 
                        onClick={() => {
                          setActiveMenu('reports');
                          setReportModuleCategory('accomplishment');
                        }}
                        className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 border border-white/20 cursor-pointer"
                      >
                        <FileCheck className="w-4 h-4 text-emerald-300" /> DILG Reports Suite
                      </button>
                    </div>
                  </div>

                  {/* Section 1: Legislative Repository Analytics & Lifecycle Pipeline */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left 2 Cols: Document Vault Distribution with Interactive Legend & Data Callouts */}
                    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-2xs col-span-1 lg:col-span-2 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <h4 className="font-sans font-bold text-slate-800 text-sm flex items-center gap-2">
                            <FolderClosed className="w-4 h-4 text-[#091d64]" />
                            Document Repository & Legislative Archive Distribution
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">Breakdown of archived resolutions, session minutes, disbursement records, and reports.</p>
                        </div>
                        <span className="text-xs font-mono font-bold text-[#091d64] bg-blue-50 px-2.5 py-1 rounded">
                          {localDocs.length} Total Documents
                        </span>
                      </div>

                      {/* Visual & Detailed Breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        {/* Interactive Donut with Center Data Callout */}
                        <div className="relative h-60 w-full flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie 
                                data={[
                                  { name: 'Council Resolutions', value: localDocs.filter(d=>d.category==='Resolutions').length, color: '#091d64' },
                                  { name: 'Session Minutes', value: localDocs.filter(d=>d.category==='Minutes').length, color: '#2563eb' },
                                  { name: 'Accomplishment Reports', value: localDocs.filter(d=>d.category==='Accomplishment' || d.category==='Reports').length, color: '#10b981' },
                                  { name: 'Disbursement Vouchers', value: localDocs.filter(d=>d.category==='Vouchers' || d.category==='Liquidation').length, color: '#f59e0b' }
                                ]}
                                dataKey="value"
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={4}
                              >
                                <Cell fill="#091d64" />
                                <Cell fill="#2563eb" />
                                <Cell fill="#10b981" />
                                <Cell fill="#f59e0b" />
                              </Pie>
                              <Tooltip 
                                formatter={(value: any, name: any) => [`${value} Records (${((Number(value) / localDocs.length) * 100).toFixed(0)}%)`, name]}
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                                itemStyle={{ color: '#ffffff' }}
                                labelStyle={{ color: '#cbd5e1' }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-black text-slate-800">{localDocs.length}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Archived</span>
                          </div>
                        </div>

                        {/* Detailed Category Data Cards */}
                        <div className="space-y-2.5">
                          {(() => {
                            const resCount = localDocs.filter(d=>d.category==='Resolutions').length;
                            const minCount = localDocs.filter(d=>d.category==='Minutes').length;
                            const repCount = localDocs.filter(d=>d.category==='Accomplishment' || d.category==='Reports').length;
                            const vouCount = localDocs.filter(d=>d.category==='Vouchers' || d.category==='Liquidation').length;
                            const total = localDocs.length || 1;

                            return [
                              { label: 'Council Resolutions & Ordinances', count: resCount, color: 'bg-[#091d64]', textColor: 'text-[#091d64]', pct: ((resCount/total)*100).toFixed(0) },
                              { label: 'Regular & Special Session Minutes', count: minCount, color: 'bg-blue-600', textColor: 'text-blue-600', pct: ((minCount/total)*100).toFixed(0) },
                              { label: 'Quarterly Accomplishment Dossiers', count: repCount, color: 'bg-emerald-500', textColor: 'text-emerald-700', pct: ((repCount/total)*100).toFixed(0) },
                              { label: 'Vouchers & Procurement Transmittals', count: vouCount, color: 'bg-amber-500', textColor: 'text-amber-700', pct: ((vouCount/total)*100).toFixed(0) }
                            ].map((item, idx) => (
                              <div key={idx} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`w-2.5 h-2.5 rounded-full ${item.color} flex-shrink-0`}></span>
                                  <span className="text-xs font-semibold text-slate-700 truncate">{item.label}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="font-mono font-bold text-xs text-slate-800">{item.count} docs</span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 ${item.textColor}`}>
                                    {item.pct}%
                                  </span>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Recent Enacted Resolutions Mini Table */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Latest Enacted Council Legislation</span>
                          <button 
                            onClick={() => setActiveMenu('documents')} 
                            className="text-xs font-bold text-[#091d64] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            View Repository <Eye className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="overflow-x-auto border border-slate-100 rounded-lg">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                              <tr>
                                <th className="px-3 py-2">Res #</th>
                                <th className="px-3 py-2">Document Title</th>
                                <th className="px-3 py-2">Category</th>
                                <th className="px-3 py-2 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {localDocs.slice(0, 3).map((d) => (
                                <tr key={d.id} className="hover:bg-slate-50/80">
                                  <td className="px-3 py-2 font-mono font-bold text-[#091d64]">{d.resolutionNumber || '—'}</td>
                                  <td className="px-3 py-2 text-slate-700 font-semibold truncate max-w-xs">{d.title}</td>
                                  <td className="px-3 py-2 text-slate-500">{d.category}</td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${d.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                      {d.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Right Col: Approval Funnel & DILG Statutory Compliance */}
                    <div className="space-y-6 col-span-1">
                      {/* Document Approval Pipeline */}
                      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-2xs space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-sans font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Secretariat Document Pipeline
                          </h4>
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded"></span>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span className="text-slate-600">Approved & Enacted</span>
                              <span className="font-mono text-emerald-600 font-bold">{localDocs.filter(d=>d.status==='Approved').length} / {localDocs.length}</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${localDocs.filter(d=>d.status==='Approved').length > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} 
                                style={{ width: `${localDocs.length > 0 ? (localDocs.filter(d=>d.status==='Approved').length / localDocs.length) * 100 : 0}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span className="text-slate-600">Pending Council Approvals</span>
                              <span className={`font-mono font-bold ${localDocs.filter(d=>d.status==='Pending').length > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                                {localDocs.filter(d=>d.status==='Pending').length} Pending
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${localDocs.filter(d=>d.status==='Pending').length > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} 
                                style={{ width: `${localDocs.length > 0 ? (localDocs.filter(d=>d.status==='Pending').length / localDocs.length) * 100 : 0}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span className="text-slate-600">Drafting / Committee Review</span>
                              <span className={`font-mono font-bold ${localDocs.filter(d=>d.status==='Draft').length > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                                {localDocs.filter(d=>d.status==='Draft').length} Drafts
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${localDocs.filter(d=>d.status==='Draft').length > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} 
                                style={{ width: `${localDocs.length > 0 ? (localDocs.filter(d=>d.status==='Draft').length / localDocs.length) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                          <button 
                            onClick={() => setActiveMenu('documents')}
                            className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <FolderClosed className="w-3.5 h-3.5 text-[#091d64]" /> Manage Document Lifecycle
                          </button>
                        </div>
                      </div>

                      {/* Statutory Compliance Checklist (PDF Module 3 & 4) */}
                      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-sans font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-[#091d64]" />
                            Compliance Monitor
                          </h4>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">RA 10742</span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-100 flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800">Regular SK Session Minutes</p>
                              <p className="text-[10px] text-slate-500">Transmitted to Sangguniang Barangay (4/4 Complete)</p>
                            </div>
                          </div>

                          <div className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-100 flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800">CY 2026 ABYIP Resolution</p>
                              <p className="text-[10px] text-slate-500">DILG Naga City City Endorsement Validated</p>
                            </div>
                          </div>

                          <div className="p-2 rounded-lg bg-blue-50/50 border border-blue-100 flex items-start gap-2">
                            <Clock className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800">Quarterly Youth Accomplishment Report</p>
                              <p className="text-[10px] text-slate-500">Draft ready for council verification</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Katipunan ng Kabataan (KK) Sectoral & Demographic Profiling Grid */}
                  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-2xs space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="font-sans font-bold text-slate-800 text-sm flex items-center gap-2">
                          <Users className="w-4 h-4 text-[#091d64]" />
                          Katipunan ng Kabataan (KK) Sectoral Profiling Census (Ages 15–30)
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">Demographic classification derived automatically from verified youth resident digital profiles.</p>
                      </div>
                      <button 
                        onClick={() => setActiveMenu('records')}
                        className="text-xs font-bold text-[#091d64] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Open Full KK Masterlist <Users className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/30 text-center space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">In-School Students</span>
                        <h4 className="text-xl font-black text-[#091d64]">
                          {youthProfiles.filter(y => y.educationalLevel?.includes('College') || y.educationalLevel?.includes('High') || y.educationalLevel?.includes('Elementary') || y.school).length}
                        </h4>
                        <span className="text-[9px] font-bold text-blue-700 bg-blue-100/60 px-1.5 py-0.2 rounded inline-block">72% of Total</span>
                      </div>

                      <div className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/30 text-center space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Out-of-School Youth</span>
                        <h4 className="text-xl font-black text-amber-600">
                          {youthProfiles.filter(y => y.employmentStatus === 'Unemployed' && !y.school).length}
                        </h4>
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-100/60 px-1.5 py-0.2 rounded inline-block">Priority Outreach</span>
                      </div>

                      <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/30 text-center space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Scholars</span>
                        <h4 className="text-xl font-black text-emerald-600">
                          {youthProfiles.filter(y => y.scholarStatus === 'Scholar' || y.scholarStatus === 'Yes').length}
                        </h4>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.2 rounded inline-block">Barangay Grantees</span>
                      </div>

                      <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/30 text-center space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Employed Youth</span>
                        <h4 className="text-xl font-black text-indigo-600">
                          {youthProfiles.filter(y => y.employmentStatus === 'Employed').length}
                        </h4>
                        <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100/60 px-1.5 py-0.2 rounded inline-block">Labor Force</span>
                      </div>

                      <div className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/30 text-center space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PWD Youth</span>
                        <h4 className="text-xl font-black text-purple-600">1</h4>
                        <span className="text-[9px] font-bold text-purple-700 bg-purple-100/60 px-1.5 py-0.2 rounded inline-block">Special Needs</span>
                      </div>

                      <div className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/30 text-center space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Solo Parents</span>
                        <h4 className="text-xl font-black text-rose-600">1</h4>
                        <span className="text-[9px] font-bold text-rose-700 bg-rose-100/60 px-1.5 py-0.2 rounded inline-block">Assistance Eligible</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== SK KAGAWAD (PROGRAM OFFICER) DEDICATED EXECUTIVE DASHBOARD ==================== */}
              {currentRole === 'SK Kagawad' && (
                <div className="space-y-8">
                  {/* Quick Action Program Officer Command Hub */}
                  <div className="bg-gradient-to-r from-[#091d64] via-[#102a83] to-[#1e3a8a] rounded-2xl p-6 text-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-1.5 max-w-lg">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-amber-400 text-slate-900 font-extrabold text-[10px] rounded uppercase tracking-wider">
                          Program Operations & Youth Engagement Console
                        </span>
                        <span className="text-xs text-blue-200">Barangay {currentTenant?.name || 'Barangay'} • AYDP Aligned</span>
                      </div>
                      <h3 className="text-xl font-bold font-sans tracking-tight">CBYDP Youth Initiatives, Attendance & Feedback Hub</h3>
                      <p className="text-xs text-blue-100 leading-relaxed">
                        Manage youth development programs, track real-time QR code attendance check-ins, resolve low engagement alerts, and monitor youth sentiment.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2.5 lg:flex-nowrap shrink-0">
                      <button 
                        onClick={() => {
                          setProgForm({ title: '', description: '', startDate: '', endDate: '', location: '', maxParticipants: 0, budgetAllocation: 0, aipReference: '', category: 'Sports Development', status: 'Published' });
                          setShowProgModal(true);
                        }}
                        className="px-3.5 py-2 bg-white text-[#091d64] hover:bg-blue-50 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-[#091d64]" /> Create New Program
                      </button>
                      <button 
                        onClick={() => setActiveMenu('attendance')}
                        className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 border border-white/20 cursor-pointer"
                      >
                        <QrCode className="w-4 h-4 text-emerald-300" /> Launch QR Attendance
                      </button>
                      <button 
                        onClick={() => setActiveMenu('feedback')}
                        className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 border border-white/20 cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4 text-amber-300" /> Youth Feedback Desk
                      </button>
                    </div>
                  </div>

                  {/* Section 1: Program Capacity Analytics & Rule-Based Features */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left 2 Cols: Program Capacity & Registration Bar Chart */}
                    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-2xs col-span-1 lg:col-span-2 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <h4 className="font-sans font-bold text-slate-800 text-sm flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-[#091d64]" />
                            CBYDP Program Participation & Capacity Velocity
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">Real-time registration counts against maximum target participant limits.</p>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded">

                        </span>
                      </div>

                      <div className="h-64 w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={programs.slice(0, 5).map(p => ({
                            name: p.title.length > 18 ? p.title.slice(0, 18) + '...' : p.title,
                            registered: p.registeredCount || registrations.filter(r => r.programId === p.id).length,
                            capacity: p.maxParticipants || 0
                          }))} margin={{ top: 10, right: 15, left: 10, bottom: 40 }}>
                            <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} interval={0} angle={-15} textAnchor="end" />
                            <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                              itemStyle={{ color: '#ffffff' }}
                              labelStyle={{ color: '#cbd5e1' }}
                            />
                            <Legend verticalAlign="top" height={30} />
                            <Bar dataKey="capacity" name="Target Capacity" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="registered" name="Registered Youth" fill="#091d64" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="pt-2 border-t border-slate-100 text-xs text-slate-400"></div>
                    </div>
                    <div className="space-y-6 col-span-1">
                      {/* Venue & Schedule Conflict Alert Widget */}
                      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-sans font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-emerald-600" />
                            Schedule Conflict Monitor
                          </h4>
                          <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">Clear</span>
                        </div>

                        {(() => {
                          const active = programs.filter(p => p.status !== 'Completed');
                          const conflicts = [];
                          for (let i = 0; i < active.length; i++) {
                            for (let j = i + 1; j < active.length; j++) {
                              const a = active[i], b = active[j];
                              const aS = new Date(a.startDate).getTime();
                              const aE = new Date(a.endDate).getTime();
                              const bS = new Date(b.startDate).getTime();
                              const bE = new Date(b.endDate).getTime();
                              if (aS <= bE && aE >= bS) {
                                const aV = (a.location || '').toLowerCase().trim();
                                const bV = (b.location || '').toLowerCase().trim();
                                if (aV && aV === bV) {
                                  conflicts.push({ a: a.title, b: b.title, reason: 'Venue double-booking at ' + a.location });
                                } else if (a.category === 'Sports Development' && b.category === 'Sports Development') {
                                  conflicts.push({ a: a.title, b: b.title, reason: 'Overlapping sports events - volunteer split expected.' });
                                }
                              }
                            }
                          }
                          if (conflicts.length === 0) {
                            return (
                              <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100 text-xs space-y-1">
                                <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Zero Schedule Overlaps
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                  No conflicts detected across {active.length} active program{active.length === 1 ? '' : 's'}.
                                </p>
                              </div>
                            );
                          }
                          return (
                            <div className="space-y-2">
                              {conflicts.map((conf, idx) => (
                                <div key={idx} className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs space-y-1">
                                  <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                                    <AlertTriangle className="w-4 h-4 text-amber-600" /> Conflict Detected
                                  </div>
                                  <p className="text-[11px] text-slate-700 leading-relaxed">{conf.reason}</p>
                                  <p className="text-[10px] text-slate-500 italic">{conf.a} vs {conf.b}</p>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Low Engagement Youth Detection & Outreach Recommendations */}
                      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-sans font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            Low Engagement Detection
                          </h4>
                          <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded">{detectLowEngagement(youthProfiles, registrations).length} Profiles</span>
                        </div>

                        {(() => {
                          const low = detectLowEngagement(youthProfiles, registrations);
                          if (low.length === 0) {
                            return (
                              <p className="text-xs text-slate-500 italic py-4 text-center">
                                No low-engagement youth detected. All constituents are actively participating.
                              </p>
                            );
                          }
                          return (
                            <div className="space-y-2 text-xs">
                              {low.slice(0, 5).map((item, idx) => (
                                <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-800 truncate">{item.profile.name}</p>
                                    <p className="text-[10px] text-slate-500 truncate">
                                      {item.profile.youthSector || item.profile.employmentStatus || 'Youth'} - Score {item.score}
                                    </p>
                                    {item.recommendedOutreach[0] && (
                                      <p className="text-[10px] text-slate-400 truncate italic">{item.recommendedOutreach[0]}</p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleInviteYouth(item.profile.userId || '', item.profile.name)}
                                    className="text-[10px] font-bold text-[#091d64] bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded cursor-pointer shrink-0 ml-2"
                                  >
                                    Invite
                                  </button>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== SK TREASURER DEDICATED EXECUTIVE DASHBOARD ==================== */}
              {currentRole === 'SK Treasurer' && (
                <div className="space-y-8">
                  {/* Quick Action Treasurer Command Hub */}
                  <div className="bg-gradient-to-r from-emerald-900 via-[#091d64] to-[#0f172a] rounded-2xl p-6 text-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-1.5 max-w-lg">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-emerald-400 text-slate-900 font-extrabold text-[10px] rounded uppercase tracking-wider">
                          Financial Management & COA Audit Console
                        </span>
                        <span className="text-xs text-emerald-200">Barangay {currentTenant?.name || 'Barangay'} • FY {new Date().getFullYear()} Budget</span>
                      </div>
                      <h3 className="text-xl font-bold font-sans tracking-tight">Program Allocations, Tax Withholding & Public Ledger</h3>
                      <p className="text-xs text-emerald-100 leading-relaxed">
                        Log disbursement vouchers, compute automated 5% VAT / 1% EWT tax withholdings, track liquidation timelines, and publish COA reports.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2.5 lg:flex-nowrap shrink-0">
                      <button 
                        onClick={() => {
                          setExpenseForm({ programId: programs[0]?.id || '', budgetId: budgetOptions[0]?.id || '', amount: 0, supplier: '', taxType: 'VAT', category: 'Supplies' });
                          setShowExpenseModal(true);
                        }}
                        className="px-3.5 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-slate-950" /> Log Disbursement
                      </button>
                      <button 
                        onClick={() => {
                          setActiveMenu('reports');
                          setReportModuleCategory('financial');
                        }}
                        className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 border border-white/20 cursor-pointer"
                      >
                        <Coins className="w-4 h-4 text-amber-300" /> Manage Liquidations
                      </button>
                      <button 
                        onClick={() => {
                          setActiveMenu('reports');
                          setReportModuleCategory('financial');
                        }}
                        className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 border border-white/20 cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-blue-300" /> COA Financial Reports
                      </button>
                    </div>
                  </div>

                  {/* Section 1: Budget Utilization & VAT Audit Trail */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left 2 Cols: Bar Chart of Budget Limits vs Actual Expenditures */}
                    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-2xs col-span-1 lg:col-span-2 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <h4 className="font-sans font-bold text-slate-800 text-sm flex items-center gap-2">
                            <Coins className="w-4 h-4 text-emerald-600" />
                            Budget Limits vs Actual Program Expenditure Breakdown
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">Disbursement tracking per AYDP center of participation with utilization velocity.</p>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
                          {((totalSpentExpenses / (totalBarangayBudget || 1)) * 100).toFixed(1)}% Utilized
                        </span>
                      </div>

                      {treasurerProgramsBudget.length === 0 ? (
                        <div className="h-64 w-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                          <Coins className="w-8 h-8 text-slate-300 mb-2" />
                          <p className="text-xs font-bold text-slate-600">No Program Budget Allocations</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Create your first program in the Budget module to view expenditure comparison charts.</p>
                        </div>
                      ) : (
                        <div className="h-64 w-full min-w-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={treasurerProgramsBudget} margin={{ top: 10, right: 15, left: 10, bottom: 40 }}>
                              <XAxis dataKey="program" stroke="#64748b" fontSize={9} tickLine={false} interval={0} angle={-15} textAnchor="end" />
                              <YAxis stroke="#64748b" fontSize={9} tickLine={false} tickFormatter={(val) => `₱${(val/1000).toFixed(0)}k`} />
                              <Tooltip 
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    const util = ((data.actual / data.allocated) * 100).toFixed(1);
                                    return (
                                      <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg text-xs space-y-1">
                                        <p className="font-bold uppercase tracking-wider text-amber-400">{data.program}</p>
                                        <p className="text-slate-300">Budget Limit: <span className="font-mono font-bold text-blue-300">₱{data.allocated.toLocaleString()}</span></p>
                                        <p className="text-slate-300">Actual Expenditure: <span className="font-mono font-bold text-green-300">₱{data.actual.toLocaleString()}</span></p>
                                        <p className="text-slate-300">Utilization %: <span className="font-mono font-bold text-emerald-400">{util}%</span></p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Legend verticalAlign="top" height={30} />
                              <Bar dataKey="allocated" name="Budget Allocation" fill="#93c5fd" radius={[3, 3, 0, 0]} />
                              <Bar dataKey="actual" name="Disbursed Expenditure" fill="#10b981" radius={[3, 3, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Tax Withholding Quick Summary Table */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Latest Audit Ledger & VAT Withholding Vouchers</span>
                          <button 
                            onClick={() => setActiveMenu('finances')}
                            className="text-xs font-bold text-[#091d64] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            Open Financial Ledger <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="overflow-x-auto border border-slate-100 rounded-lg">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                              <tr>
                                <th className="px-3 py-2">Voucher #</th>
                                <th className="px-3 py-2">Payee / Purpose</th>
                                <th className="px-3 py-2">Gross Amount</th>
                                <th className="px-3 py-2">5% VAT / 1% EWT</th>
                                <th className="px-3 py-2 text-center">Audit Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {expenses.slice(0, 3).map((exp) => {
                                const gross = exp.amount;
                                const vat = exp.isVat ? Math.round(gross * 0.12) : 0;
                                return (
                                  <tr key={exp.id} className="hover:bg-slate-50/80">
                                    <td className="px-3 py-2 font-mono font-bold text-[#091d64]">{exp.voucherNumber || 'DV-2026-001'}</td>
                                    <td className="px-3 py-2 text-slate-700 font-semibold truncate max-w-xs">{exp.payee || exp.title}</td>
                                    <td className="px-3 py-2 font-mono font-bold text-slate-800">₱{gross.toLocaleString()}</td>
                                    <td className="px-3 py-2 font-mono text-xs text-amber-700">
                                      {exp.isVat ? `₱${vat.toLocaleString()} (5% VAT)` : 'Non-VAT Exempt'}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        COA Audited
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Right Col: Liquidation Tracker & Asset Inventory */}
                    <div className="space-y-6 col-span-1">
                      {/* Pending Liquidation & COA Deadlines */}
                      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-sans font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-emerald-600" />
                            Statutory COA Deadlines
                          </h4>
                          <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">100% On-Time</span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-bold text-slate-800">Q2 Financial Performance Report</p>
                              <p className="text-[10px] text-slate-500">Submitted to COA Resident Auditor</p>
                            </div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-100 flex items-start gap-2">
                            <RefreshCw className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-bold text-slate-800">Cash Advances Liquidation</p>
                              <p className="text-[10px] text-slate-500">0 Overdue liquidations active</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Barangay Asset & Equipment Inventory Snapshot */}
                      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-sans font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-[#091d64]" />
                            Barangay SK Property Asset Roster
                          </h4>
                          <button 
                            onClick={() => setActiveMenu('inventory')}
                            className="text-[10px] font-bold text-[#091d64] hover:underline cursor-pointer"
                          >
                            View Inventory
                          </button>
                        </div>

                        <div className="space-y-2 text-xs">
                          {inventory.slice(0, 3).map((item) => (
                            <div key={item.id} className="p-2 rounded-lg border border-slate-100 bg-slate-50/60 flex items-center justify-between">
                              <div>
                                <p className="font-bold text-slate-800">{item.item}</p>
                                <p className="text-[10px] text-slate-500">Qty: {item.quantity} units ({item.category})</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${item.condition === 'Serviceable' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                {item.condition}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== DEFAULT / SK CHAIRPERSON DASHBOARD BODY ==================== */}
              {currentRole === 'SK Chairperson' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Chart container */}
                  <div className="bg-white p-6 rounded-xl border border-slate-100 col-span-1 lg:col-span-2">
                    <h4 className="font-sans font-bold text-slate-800 text-sm mb-4">
                      Program Participation & Budget Allocation Trends
                    </h4>

                    <div className="h-64 w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={programs.slice(0, 5).map(p=>({ name: p.title.slice(0, 15)+'...', registered: p.registeredCount }))}>
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                          <Tooltip />
                          <Bar dataKey="registered" fill="#091d64" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Recent Activities side widget */}
                  <div className="bg-white p-6 rounded-xl border border-slate-100 col-span-1">
                    <h4 className="font-sans font-bold text-slate-800 text-sm mb-4">Executive Council Log</h4>
                    <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                      <div className="flex gap-3 text-xs">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <p className="text-slate-600 font-medium">Signed <span className="font-bold text-[#091d64]">Resolution No. 2026-004</span> into barangay ordinance record.</p>
                      </div>
                      <div className="flex gap-3 text-xs">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <p className="text-slate-600 font-medium">Approved quarterly financial disbursement report for COA submission.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ==================== SCREEN 2: PROGRAMS & INITIATIVES (Kagawad) ==================== */}
          {activeMenu === 'programs' && (
            <div className="bg-white p-6 rounded-xl border border-slate-100 text-left animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="font-sans font-bold text-slate-800 text-base">Sangguniang Kabataan Programs Directory</h3>
                  <p className="text-xs text-slate-400 mt-1">Delineate schedules, locations, and funding profiles for municipal audits.</p>
                </div>
                <button 
                  onClick={() => {
                    setProgForm({ title: '', description: '', startDate: '', endDate: '', location: '', maxParticipants: 0, budgetAllocation: 0, aipReference: '', category: currentRole === 'SK Kagawad' ? 'Environmental Protection' : 'Education & Scholarship', status: 'Published' });
                    setShowProgModal(true);
                  }}
                  className="px-4 py-2 bg-[#091d64] hover:bg-opacity-95 text-white font-bold rounded-lg transition-all text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Create New Program
                </button>
              </div>

              {/* Filters / Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-4 rounded-lg mb-6">
                <div className="relative flex-grow">
                  <input 
                    type="text" 
                    placeholder="Search initiatives by title or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#091d64]"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#091d64]"
                >
                  <option value="All">All Categories</option>
                  <option value="Education & Scholarship">Education & Scholarship</option>
                  <option value="Sports Development">Sports Development</option>
                  <option value="Health & Nutrition">Health & Nutrition</option>
                  <option value="Environmental Protection">Environmental Protection</option>
                </select>

                <div className="border border-slate-200 rounded-md flex overflow-hidden">
                  <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-[#eff6ff] text-[#091d64]' : 'bg-white text-slate-600'}`}><Grid className="w-4 h-4" /></button>
                  <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-[#eff6ff] text-[#091d64]' : 'bg-white text-slate-600'}`}><List className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Grid Layout of programs */}
              {viewMode === 'grid' ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPrograms.map(p => (
                    <div key={p.id} className="bg-white border border-slate-100 rounded-xl overflow-hidden hover:shadow-xs transition-shadow flex flex-col justify-between h-full">
                      <div className="p-5 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] bg-blue-50 text-[#091d64] font-bold px-2 py-0.5 rounded-full uppercase">{p.category}</span>
                          <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-[9px] font-extrabold uppercase">{p.status}</span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm">{formatProgramTitle(p.title)}</h4>
                        <p className="text-slate-500 text-xs line-clamp-3 leading-relaxed">{p.description}</p>
                      </div>
                      <div className="bg-slate-50 border-t border-slate-50 p-4 text-[11px] space-y-1 text-slate-500 font-medium">
                        <div className="flex justify-between"><span>Location:</span><span className="text-slate-800 font-bold">{p.location}</span></div>
                        <div className="flex justify-between"><span>Date:</span><span className="text-slate-800 font-bold">{p.startDate} - {p.endDate}</span></div>
                        <div className="flex justify-between"><span>Allocated Budget:</span><span className="text-slate-800 font-bold">₱{p.budgetAllocation.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Registered Youth:</span><span className="text-slate-800 font-bold">{p.registeredCount} / {p.maxParticipants} slots</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-lg">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3">AIP Ref</th>
                        <th className="px-6 py-3">Program Title</th>
                        <th className="px-6 py-3">Location</th>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3 text-right">Budget Limit</th>
                        <th className="px-6 py-3 text-center">Participants</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs font-medium">
                      {filteredPrograms.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-mono text-[11px] text-slate-400">{p.aipReference || 'N/A'}</td>
                          <td className="px-6 py-4 font-bold text-slate-800">{formatProgramTitle(p.title)}</td>
                          <td className="px-6 py-4 text-slate-500">{p.location}</td>
                          <td className="px-6 py-4 font-mono text-slate-500">{p.startDate} - {p.endDate}</td>
                          <td className="px-6 py-4 text-right font-mono text-slate-800">₱{p.budgetAllocation.toLocaleString()}</td>
                          <td className="px-6 py-4 text-center font-mono text-slate-800">{p.registeredCount} / {p.maxParticipants}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ==================== SCREEN 3: ATTENDANCE TRACKING (Kagawad & Secretary) ==================== */}
          {activeMenu === 'attendance' && (
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 text-left space-y-6 animate-in fade-in duration-200 shadow-sm">
              
              {/* Header Title & Responsive Controls Bar */}
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-sans font-extrabold text-slate-900 text-lg">SK Youth Attendance & QR Validation Desk</h3>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-full uppercase tracking-wider"></span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Live camera QR verification and real-time attendance tracking for SK Kagawads.</p>
                </div>
                
                {/* Responsive Touch Mode Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={() => setAttendanceMode('qr')} 
                    className={`flex-1 sm:flex-none px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px] ${attendanceMode === 'qr' ? 'bg-[#091d64] text-white shadow-md shadow-blue-900/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    <Camera className="w-4 h-4" />
                    <span>Camera QR Scanner</span>
                  </button>
                  <button
                  onClick={() => setAttendanceMode('manual')} 
                  className={`flex-1 sm:flex-none px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px] ${attendanceMode === 'manual' ? 'bg-[#091d64] text-white shadow-md shadow-blue-900/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Roster & Manual List</span>
                </button>
                </div>
              </div>

              {/* Selected Program & Date Selectors Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1 tracking-wider">Target SK Program / Activity</label>
                  <select 
                    value={selectedProgId} 
                    onChange={(e) => setSelectedProgId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#091d64]"
                  >
                    {programs.map(p => (
                      <option key={p.id} value={p.id}>{p.title} ({p.category})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Attendance Analytics Stat Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 border border-slate-100 rounded-xl bg-white shadow-sm">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Registered</span>
                  <span className="text-xl font-black text-[#091d64] block mt-1">
                    {selectedProgramRegistrations.length}
                  </span>
                </div>
                <div className="p-3.5 border border-slate-100 rounded-xl bg-white shadow-sm">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block text-emerald-600">Present</span>
                  <span className="text-xl font-black text-emerald-600 block mt-1">
                    {localAttendance.filter(a => a.programId === selectedProgId).length}
                  </span>
                </div>
                <div className="p-3.5 border border-slate-100 rounded-xl bg-white shadow-sm">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block text-rose-500">Absentees</span>
                  <span className="text-xl font-black text-rose-500 block mt-1">
                    {Math.max(0, selectedProgramRegistrations.length - localAttendance.filter(a => a.programId === selectedProgId).length)}
                  </span>
                </div>
                <div className="p-3.5 border border-slate-100 rounded-xl bg-[#091d64] shadow-md text-white">
                  <span className="text-[9px] font-extrabold text-white/70 uppercase tracking-widest block">Yield Rate</span>
                  <span className="text-xl font-black text-amber-400 block mt-1">
                    {(() => {
                      const reg = selectedProgramRegistrations.length;
                      const pres = localAttendance.filter(a => a.programId === selectedProgId).length;
                      return reg > 0 ? ((pres / reg) * 100).toFixed(0) : '0';
                    })()}%
                  </span>
                </div>
              </div>

              {attendanceMode === 'qr' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Live Camera Scanner */}
                  <div className="lg:col-span-7 space-y-4">
                    <LiveCameraScanner 
                      selectedProgId={selectedProgId}
                      onScan={(decodedText) => handleActualScan(decodedText)}
                    />

                    {/* Detailed Scanned Verification Card */}
                    {lastScanDetail ? (
                      <div className={`p-4 rounded-xl border transition-all shadow-sm space-y-3 ${
                        lastScanDetail.status === 'SUCCESS' ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950' :
                        lastScanDetail.status === 'ALREADY_PRESENT' ? 'bg-amber-50/90 border-amber-300 text-amber-950' :
                        lastScanDetail.status === 'WRONG_PROGRAM' ? 'bg-purple-50/90 border-purple-300 text-purple-950' :
                        lastScanDetail.status === 'VENUE_CODE' ? 'bg-blue-50/90 border-blue-300 text-blue-950' :
                        'bg-rose-50/90 border-rose-300 text-rose-950'
                      }`}>
                        <div className="flex items-center justify-between border-b pb-2.5 border-current/10">
                          <div className="flex items-center gap-2">
                            {lastScanDetail.status === 'SUCCESS' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                            {lastScanDetail.status === 'ALREADY_PRESENT' && <Clock className="w-5 h-5 text-amber-600 shrink-0" />}
                            {lastScanDetail.status === 'WRONG_PROGRAM' && <AlertTriangle className="w-5 h-5 text-purple-600 shrink-0" />}
                            {lastScanDetail.status === 'VENUE_CODE' && <QrCode className="w-5 h-5 text-blue-600 shrink-0" />}
                            {lastScanDetail.status === 'NOT_REGISTERED' && <XCircle className="w-5 h-5 text-rose-600 shrink-0" />}
                            
                            <span className="text-xs font-black tracking-wide uppercase">{lastScanDetail.title}</span>
                          </div>

                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/5">
                            {lastScanDetail.timestamp}
                          </span>
                        </div>

                        <p className="text-xs font-bold leading-relaxed">{lastScanDetail.message}</p>

                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/70 p-2.5 rounded-lg border border-current/10 font-medium">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Scanned QR Data</span>
                            <span className="font-mono font-bold text-slate-800 break-all">{lastScanDetail.rawCode}</span>
                          </div>
                          {lastScanDetail.participantName && (
                            <div>
                              <span className="text-[9px] uppercase font-bold text-slate-400 block">Constituent Name</span>
                              <span className="font-bold text-slate-900">{lastScanDetail.participantName}</span>
                            </div>
                          )}
                          {lastScanDetail.participantId && (
                            <div>
                              <span className="text-[9px] uppercase font-bold text-slate-400 block">Participant ID</span>
                              <span className="font-mono font-semibold text-slate-700">{lastScanDetail.participantId}</span>
                            </div>
                          )}
                          {lastScanDetail.programTitle && (
                            <div>
                              <span className="text-[9px] uppercase font-bold text-slate-400 block">Event Program</span>
                              <span className="font-semibold text-slate-800">{lastScanDetail.programTitle}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : qrMessage ? (
                      <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/80 flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-slate-400 shrink-0" />
                        <p className="text-xs font-medium text-slate-600 leading-relaxed">{qrMessage}</p>
                      </div>
                    ) : null}
</div>

                  {/* Right Column: Code Input & Quick Constituent Tap Cards */}
                  <div className="lg:col-span-5 space-y-4">
                    
                    {/* Manual Code Input / Google Lens Paste Box */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <QrCode className="w-4 h-4 text-[#091d64]" />
                          Input / Paste QR Code String
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Google Lens Compatible</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={manualQrInput}
                          onChange={(e) => setManualQrInput(e.target.value)}
                          placeholder="e.g. KABISIG-QR-PROG01-PART001"
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#091d64]"
                        />
                        <button
                          onClick={() => {
                            if (!manualQrInput.trim()) return;
                            handleActualScan(manualQrInput.trim());
                            setManualQrInput('');
                          }}
                          className="px-4 py-2 bg-[#091d64] text-white rounded-xl text-xs font-bold hover:bg-opacity-95 cursor-pointer whitespace-nowrap"
                        >
                          Validate
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">Scanned an ID code? Paste or enter the string above to check in manually.</p>
                    </div>

                    {/* Registered Youth Participant List (Quick Tap) */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800">Registered Participants</span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {selectedProgramRegistrations.length} Registered
                        </span>
                      </div>

                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {selectedProgramRegistrations.map(r => {
                          const isPresent = localAttendance.some(a => a.programId === selectedProgId && a.participantId === r.participantId);
                          return (
                            <div 
                              key={r.id} 
                              className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${isPresent ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50/70 border-slate-100 hover:border-slate-300'}`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isPresent ? 'bg-emerald-600 text-white' : 'bg-[#091d64] text-white'}`}>
                                  {r.participantName.charAt(0)}
                                </div>
                                <div className="text-left">
                                  <p className="text-xs font-bold text-slate-800">{r.participantName}</p>
                                  <p className="text-[10px] font-mono text-slate-400">ID: {r.participantId}</p>
                                </div>
                              </div>

                              <button
                                onClick={() => handleActualScan(`KABISIG-QR-${selectedProgId}-${r.participantId}`)}
                                disabled={isPresent}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${isPresent ? 'bg-emerald-100 text-emerald-800 cursor-default' : 'bg-[#091d64] text-white hover:bg-opacity-90 shadow-sm'}`}
                              >
                                {isPresent ? 'Verified' : 'Scan QR'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Roster & Manual Table View */
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3">Participant Name</th>
                        <th className="px-6 py-3 font-mono text-center">Participant ID</th>
                        <th className="px-6 py-3 text-center">Attendance Status</th>
                        <th className="px-6 py-3 text-center">Action Check-In</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs font-medium">
                      {selectedProgramRegistrations.map(r => {
                        const isPresent = localAttendance.some(a => a.programId === selectedProgId && a.participantId === r.participantId);
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-6 py-3.5 font-bold text-slate-800">{r.participantName}</td>
                            <td className="px-6 py-3.5 text-center font-mono text-slate-500">{r.participantId}</td>
                            <td className="px-6 py-3.5 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${isPresent ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                                {isPresent ? 'Present' : 'Absent'}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-center">
                              <button
                                onClick={() => handleManualCheckIn(r)}
                                disabled={isPresent}
                                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer ${isPresent ? 'bg-slate-100 text-slate-400 cursor-default' : 'bg-[#091d64] text-white hover:bg-opacity-90'}`}
                              >
                                {isPresent ? 'Marked Present' : 'Mark Present'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ==================== SCREEN 4: FEEDBACK & LEGISLATIVE DESK (SK Kagawad) ==================== */}
          {activeMenu === 'feedback' && (
            <div className="space-y-6 text-left animate-in fade-in duration-200">
              
              {/* Header Sub-Nav Tabs */}
              <div className="flex border-b border-slate-200 gap-6">
                <button
                  onClick={() => setFeedbackSubTab('boses')}
                  className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                    feedbackSubTab === 'boses'
                      ? 'border-[#091d64] text-[#091d64]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Boses ng Kabataan (Youth Feedback Desk)
                </button>
                <button
                  onClick={() => setFeedbackSubTab('resolutions')}
                  className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                    feedbackSubTab === 'resolutions'
                      ? 'border-[#091d64] text-[#091d64]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Sponsored Resolutions & Legislative Tracking
                </button>
              </div>

              {/* VIEW 1: Boses ng Kabataan Desk */}
              {feedbackSubTab === 'boses' && (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Submissions</span>
                      <span className="text-2xl font-black text-[#091d64] mt-1 block">{localFeedback.length}</span>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Pending Review</span>
                      <span className="text-2xl font-black text-amber-600 mt-1 block">
                        {localFeedback.filter(f => f.status === 'Pending').length}
                      </span>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Action Taken</span>
                      <span className="text-2xl font-black text-green-600 mt-1 block">
                        {localFeedback.filter(f => f.status !== 'Pending').length}
                      </span>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Satisfaction Avg</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-2xl font-black text-[#091d64]">
                          {(localFeedback.reduce((a, b) => a + b.rating, 0) / (localFeedback.length || 1)).toFixed(1)}
                        </span>
                        <div className="flex text-amber-400">
                          <Star className="w-4 h-4 fill-amber-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RULE-BASED FEEDBACK ANALYTICS (PDF MODULE 4 & 5) */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Sentiment Analysis Widget */}
                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <BarChart3 className="w-4 h-4 text-[#091d64]" />
                          Rule-Based Feedback Sentiment
                        </h4>
                        <span className="text-[10px] bg-blue-50 text-[#091d64] font-bold px-2 py-0.5 rounded">Rule-Based Analysis</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Automated sentiment categorization using rule-based keyword matching.</p>
                      
                      {(() => {
                        const positiveCount = localFeedback.filter(f => analyzeFeedbackSentiment(f.content, f.type) === 'Positive').length;
                        const negativeCount = localFeedback.filter(f => analyzeFeedbackSentiment(f.content, f.type) === 'Negative').length;
                        const neutralCount = localFeedback.length - positiveCount - negativeCount;
                        const total = localFeedback.length || 1;
                        return (
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className={`${localFeedback.length > 0 ? 'text-emerald-700' : 'text-slate-400'} flex items-center gap-1.5`}> Positive ({positiveCount})</span>
                              <span className={`font-mono ${localFeedback.length > 0 ? 'text-slate-600 font-bold' : 'text-slate-400'}`}>
                                {localFeedback.length > 0 ? `${((positiveCount / total) * 100).toFixed(0)}%` : '0%'}
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                              {localFeedback.length === 0 ? (
                                <div className="bg-slate-300 h-full w-full"></div>
                              ) : (
                                <>
                                  <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${(positiveCount / total) * 100}%` }}></div>
                                  <div className="bg-slate-400 h-full transition-all duration-300" style={{ width: `${(neutralCount / total) * 100}%` }}></div>
                                  <div className="bg-rose-500 h-full transition-all duration-300" style={{ width: `${(negativeCount / total) * 100}%` }}></div>
                                </>
                              )}
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400 font-medium pt-1">
                              <span>Neutral: {neutralCount} ({((neutralCount / total) * 100).toFixed(0)}%)</span>
                              <span className="text-rose-600 font-semibold">Negative / Concerns: {negativeCount} ({((negativeCount / total) * 100).toFixed(0)}%)</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Extracted Key Phrases */}
                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-2xs space-y-3">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-emerald-600" />
                        Keyword Extraction
                      </h4>
                      <p className="text-[11px] text-slate-500">Most frequently extracted topics from youth resident submissions.</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {extractFeedbackKeywords(localFeedback).map((kw, i) => (
                          <span key={i} className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1">
                            #{kw.word}
                            <span className="bg-slate-200 text-slate-600 text-[9px] px-1 rounded font-mono">{kw.count}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Most Requested Programs (PDF Page 6) */}
                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-2xs space-y-3">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-500" />
                        Most Requested Programs
                      </h4>
                      <p className="text-[11px] text-slate-500">Prioritization trends to guide AYDP planning.</p>
                      <div className="space-y-1.5 pt-1">
                        {getMostRequestedProgramTrends(localFeedback).slice(0, 4).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                            <span className="font-semibold text-slate-700 truncate pr-2">
                              {idx + 1}. {item.program}
                            </span>
                            <span className="font-mono font-bold text-[#091d64] bg-blue-50 px-2 py-0.5 rounded text-[10px]">
                              {item.requests} votes
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-2xs">
                    <div className="relative w-full sm:w-72">
                      <input
                        type="text"
                        placeholder="Search feedback content or program..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#091d64]"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <select
                        value={feedbackTypeFilter}
                        onChange={(e) => setFeedbackTypeFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#091d64]"
                      >
                        <option value="All">All Types</option>
                        <option value="Suggestion">Suggestions</option>
                        <option value="Complaint">Complaints</option>
                        <option value="Inquiry">Inquiries</option>
                        <option value="Evaluation">Evaluations</option>
                      </select>

                      <select
                        value={feedbackStatusFilter}
                        onChange={(e) => setFeedbackStatusFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#091d64]"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="Reviewed">Reviewed</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>
                  </div>

                  {/* Feedback Item Cards */}
                  <div className="space-y-4">
                    {localFeedback
                      .filter(f => {
                        const matchSearch = f.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          f.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (f.programTitle && f.programTitle.toLowerCase().includes(searchTerm.toLowerCase()));
                        const matchType = feedbackTypeFilter === 'All' ? true : f.type === feedbackTypeFilter;
                        const matchStatus = feedbackStatusFilter === 'All' ? true : f.status === feedbackStatusFilter;
                        return matchSearch && matchType && matchStatus;
                      })
                      .map(fb => (
                        <div key={fb.id} className="bg-white p-5 rounded-xl border border-slate-100 shadow-2xs space-y-4">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-50 pb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                fb.type === 'Suggestion' ? 'bg-blue-50 text-blue-700' :
                                fb.type === 'Complaint' ? 'bg-rose-50 text-rose-700' :
                                fb.type === 'Inquiry' ? 'bg-amber-50 text-amber-700' :
                                'bg-emerald-50 text-emerald-700'
                              }`}>
                                {fb.type}
                              </span>

                              {/* Rule-Based Sentiment Classification Badge */}
                              {(() => {
                                const sentiment = analyzeFeedbackSentiment(fb.content, fb.type);
                                return (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                                    sentiment === 'Positive' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                    sentiment === 'Negative' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                    'bg-slate-50 text-slate-600 border border-slate-200'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                      sentiment === 'Positive' ? 'bg-emerald-500' :
                                      sentiment === 'Negative' ? 'bg-rose-500' :
                                      'bg-slate-400'
                                    }`}></span>
                                    {sentiment} Sentiment
                                  </span>
                                );
                              })()}

                              {fb.programTitle && (
                                <span className="text-slate-400 text-xs font-bold flex items-center gap-1">
                                   {fb.programTitle}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                                fb.status === 'Pending' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                                fb.status === 'Reviewed' ? 'bg-blue-100 text-blue-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {fb.status}
                              </span>
                              <span className="text-[11px] font-mono text-slate-400">{fb.dateSubmitted}</span>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{fb.title}</h4>
                            <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">{fb.content}</p>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-500">
                                Submitted by: {fb.anonymous ? ' Anonymous Youth Constituent' : fb.submittedBy}</span>
                              {!fb.anonymous && fb.residentProfile && (
                                <span className="inline-flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 font-medium">
                                  {fb.residentProfile.age && <span><strong className="text-slate-600">Age:</strong> {fb.residentProfile.age}</span>}
                                  {fb.residentProfile.sex && <span><strong className="text-slate-600">Sex:</strong> {fb.residentProfile.sex}</span>}
                                  {fb.residentProfile.educationalLevel && <span><strong className="text-slate-600">Education:</strong> {fb.residentProfile.educationalLevel}</span>}
                                  {fb.residentProfile.employmentStatus && <span><strong className="text-slate-600">Employment:</strong> {fb.residentProfile.employmentStatus}</span>}
                                  {fb.residentProfile.contact && <span><strong className="text-slate-600">Contact:</strong> {fb.residentProfile.contact}</span>}
                                </span>
                              )}
                              <div className="flex text-amber-400 gap-0.5 ml-2">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`w-3 h-3 ${i < fb.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                                ))}
                              </div>
                            </div>

                            <button
                              onClick={() => handleOpenFeedbackResponse(fb)}
                              className="px-3.5 py-1.5 bg-[#091d64] hover:bg-opacity-90 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              {fb.response ? 'Edit Response' : 'Respond / Action'}
                            </button>
                          </div>

                          {/* Render official SK response if present */}
                          {fb.response && (
                            <div className="mt-3 p-3.5 bg-blue-50/60 border border-blue-100 rounded-lg space-y-1">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#091d64] uppercase tracking-wider">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#091d64]" />
                                Official SK Committee Response
                              </div>
                              <p className="text-xs text-slate-700 font-medium leading-relaxed">{fb.response}</p>
                            </div>
                          )}
                        </div>
                      ))}

                    {localFeedback.length === 0 && (
                      <div className="bg-white p-8 text-center rounded-xl border border-slate-100 text-slate-400 font-bold text-xs">
                        No feedback submissions found matching criteria.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* VIEW 2: Sponsored Resolutions & Legislative Tracking */}
              {feedbackSubTab === 'resolutions' && (
                <div className="bg-white p-6 rounded-xl border border-slate-100 text-left space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <h3 className="font-sans font-bold text-slate-800 text-base">Council Legislative Resolutions Panel</h3>
                      <p className="text-xs text-slate-400 mt-1">Author, catalog, and track municipal legislative submissions for youth development.</p>
                    </div>
                    <button 
                      onClick={() => { setResForm({ title: '', number: '', author: currentUser?.full_name || '', endDate: '' }); setShowResModal(true); }}
                      className="px-4 py-2 bg-[#091d64] hover:bg-opacity-95 text-white font-bold rounded-lg transition-all text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Draft Resolution
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-100 rounded-lg">
                    {pollsError && <p role="alert" className="m-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">Polls could not be loaded: {pollsError}</p>}
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-3">Res. Number</th>
                          <th className="px-6 py-3">Resolution Title</th>
                          <th className="px-6 py-3">Author</th>
                          <th className="px-6 py-3 text-center">Legislation Status</th>
                          <th className="px-6 py-3 text-center">Votes Support</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-xs font-medium">
                        {localResolutions.map(r => (
                          <tr key={r.id}>
                            <td className="px-6 py-4 font-mono font-bold text-[#091d64]">{r.resolutionNumber || r.number || ''}</td>
                            <td className="px-6 py-4 text-slate-800 leading-normal font-semibold max-w-sm">{r.title}</td>
                            <td className="px-6 py-4 text-slate-500">{r.author || ''}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${r.status === 'Approved' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700 animate-pulse'}`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center font-mono font-bold text-emerald-600">
                              {r.votesSupport} Supporting
                            </td>
                          </tr>
                        ))}
                        {localResolutions.length === 0 && !pollsError && (
                          <tr><td colSpan={5} className="px-6 py-8 text-center text-xs text-slate-400">No active polls are available for this barangay yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ==================== SCREEN 5: REPORTS (Role-Adaptive: SK Treasurer Financial Reports vs Secretariat Reports) ==================== */}
          {activeMenu === 'reports' && (
            <div className="space-y-6 animate-in fade-in duration-200 text-left">
              
              {/* --- SK TREASURER REPORTS VIEW (ORIGINAL FIRST UI/UX DESIGN) --- */}
              {currentRole === 'SK Treasurer' ? (
                <div className="bg-white p-6 rounded-xl border border-slate-100 space-y-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-blue-50 text-[#091d64] font-black text-[10px] rounded uppercase tracking-wider">FINANCIAL GOVERNANCE • FISCAL YEAR 2026</span>
                        <span className="text-xs text-slate-400">Barangay {currentTenant?.name || 'Barangay'} • Naga City</span>
                      </div>
                      <h3 className="font-sans font-bold text-slate-900 text-lg mt-1">Financial Statements & Reports</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Financial statements and compliance tracking for SK funds and disbursements.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const body = '<h3>Financial Summary</h3>' +
                          '<p><strong>Barangay:</strong> ' + (currentTenant?.name || 'Barangay') + '</p>' +
                          '<p><strong>Total Annual Budget:</strong> P' + totalBarangayBudget.toLocaleString() + '</p>' +
                          '<p><strong>Total Disbursed:</strong> P' + totalSpentExpenses.toLocaleString() + '</p>' +
                          '<p><strong>Remaining Cash:</strong> P' + remainingCash.toLocaleString() + '</p>' +
                          '<p><strong>Utilization Rate:</strong> ' + budgetUtilizationRate.toFixed(1) + '%</p>';
                        printOfficialReport('SK Financial Report - ' + (currentTenant?.name || 'Barangay'), body);
                      }}
                      className="px-4 py-2.5 bg-[#091d64] hover:bg-[#122878] text-white font-bold rounded-xl text-xs flex items-center gap-2 shrink-0"
                    >
                      <Printer className="w-4 h-4" /> Export Financial Report (PDF)
                    </button>
                  </div>

                  {/* 4 Financial Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
                      <div className="flex justify-between items-center text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Annual SK 10% Fund</span>
                        <Coins className="w-4 h-4 text-[#091d64]" />
                      </div>
                      <h4 className="text-xl font-black text-[#091d64]">₱{totalBarangayBudget.toLocaleString()}</h4>
                      <p className="text-[10px] text-slate-500">Statutory allocation under RA 10742</p>
                    </div>

                    <div className="p-5 rounded-xl border border-rose-100 bg-rose-50/30 space-y-1">
                      <div className="flex justify-between items-center text-rose-500">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Disbursed Expenditures</span>
                        <DollarSign className="w-4 h-4 text-rose-600" />
                      </div>
                      <h4 className="text-xl font-black text-rose-600">₱{totalSpentExpenses.toLocaleString()}</h4>
                      <p className="text-[10px] text-slate-500">{budgetUtilizationRate.toFixed(1)}% total fund utilization rate</p>
                    </div>

                    <div className="p-5 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-1">
                      <div className="flex justify-between items-center text-emerald-600">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Unliquidated / Cash Balance</span>
                        <RefreshCw className="w-4 h-4 text-emerald-600" />
                      </div>
                      <h4 className="text-xl font-black text-emerald-600">₱{remainingCash.toLocaleString()}</h4>
                      <p className="text-[10px] text-slate-500">Current available fiscal surplus</p>
                    </div>

                    <div className="p-5 rounded-xl border border-amber-100 bg-amber-50/30 space-y-1">
                      <div className="flex justify-between items-center text-amber-600">
                        <span className="text-[10px] font-bold uppercase tracking-wider">BIR Tax Withholdings</span>
                        <Tag className="w-4 h-4 text-amber-600" />
                      </div>
                      <h4 className="text-xl font-black text-amber-700">₱{expenses.reduce((a,c)=>a + (Number(c.withholdingTax) || 0), 0).toLocaleString()}</h4>
                      <p className="text-[10px] text-slate-500">Audited deductions for BIR remittance</p>
                    </div>
                  </div>

                  {/* Treasurer Sub-Module Selector */}
                  <div className="flex gap-2 border-b border-slate-100 pb-2 overflow-x-auto">
                    <button
                      onClick={() => setTreasurerReportTab('statement')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${treasurerReportTab === 'statement' ? 'bg-[#091d64] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" /> COA Financial Statements (SRE)
                    </button>
                    <button
                      onClick={() => setTreasurerReportTab('utilization')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${treasurerReportTab === 'utilization' ? 'bg-[#091d64] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" /> Program Budget Limits vs Actuals
                    </button>
                    <button
                      onClick={() => setTreasurerReportTab('tax')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${treasurerReportTab === 'tax' ? 'bg-[#091d64] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Tax Deductions & BIR Withholding
                    </button>
                    <button
                      onClick={() => setTreasurerReportTab('naga_federation')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${treasurerReportTab === 'naga_federation' ? 'bg-[#091d64] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                    >
                      <Building2 className="w-3.5 h-3.5" /> Naga City 27-Barangay Comparison
                    </button>
                    <button
                      onClick={() => setTreasurerReportTab('inventory_valuation')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${treasurerReportTab === 'inventory_valuation' ? 'bg-[#091d64] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                    >
                      <Layers className="w-3.5 h-3.5" /> Asset & Inventory Valuation
                    </button>
                  </div>

                  {/* SUB-VIEW 1: COA STATEMENT OF RECEIPTS & EXPENDITURES (SRE) */}
                  {treasurerReportTab === 'statement' && (
                    <div className="space-y-6">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">Statement of Receipts and Expenditures (SRE) & Sector Breakdown</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Formulated under the Commission on Audit (COA) Circular No. 2019-001 Guidelines.</p>
                        </div>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded font-black text-[10px] uppercase">COA Audit Ready</span>
                      </div>

                      {/* Sector Summary Breakdown */}
              {([
                { key: 'Sports Development', label: 'Sports Sector Limit' },
                { key: 'Education & Scholarship', label: 'Scholarship & Education' },
                { key: 'Health & Nutrition', label: 'Health & Wellness Limit' },
                { key: 'Livelihood & Skills', label: 'Livelihood & Skills' },
                { key: 'Peace & Security', label: 'Peace & Security' },
                { key: 'Environmental Protection', label: 'Environmental Protection' },
              ] as const).map(cat => {
                const stats = getSectorStats(cat.key);
                return (
                  <div key={cat.key} className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{cat.label}</span>
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#091d64] flex items-center justify-center font-bold text-xs group-hover:scale-110 transition-transform">₱</div>
                    </div>
                    <h4 className="text-2xl font-black text-[#091d64] mt-1 tracking-tight">₱{stats.alloc.toLocaleString()}</h4>
                    <div className="mt-4">
                      <div className="flex justify-between text-[10px] font-bold mb-1.5">
                        <span className="text-slate-400 uppercase">Utilization</span>
                        <span className={stats.rate > 0 ? 'text-emerald-600 font-black' : 'text-slate-400 font-medium'}>
                          {stats.rate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ` + (stats.rate > 0 ? 'bg-emerald-500' : 'bg-slate-300')}
                          style={{ width: (stats.rate > 0 ? Math.min(100, stats.rate) : 0) + '%' }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-400">Certification details will appear after live budget records are available.</div>
                    </div>
                  )}

                  {/* SUB-VIEW 2: PROGRAM BUDGET LIMITS VS ACTUALS */}
                  {treasurerReportTab === 'utilization' && (
                    <div className="space-y-6">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">Program Budget Limits vs. Actual Expenditures</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Visual comparison across all Sangguniang Kabataan initiatives and projects.</p>
                        </div>
                        <span className="text-xs text-slate-400 italic">Values in Philippine Peso (₱)</span>
                      </div>

                      {/* Interactive Bar Chart */}
                      {treasurerProgramsBudget.length === 0 ? (
                        <div className="w-full bg-white p-8 rounded-xl border border-dashed border-slate-200 text-center flex flex-col items-center justify-center">
                          <Coins className="w-10 h-10 text-slate-300 mb-2" />
                          <p className="text-sm font-bold text-slate-700">No Program Budget Limits Recorded</p>
                          <p className="text-xs text-slate-400 mt-1">Register new programs under Budget Allocation to compare ceilings against actual disbursements.</p>
                        </div>
                      ) : (
                        <div className="w-full bg-white p-5 rounded-xl border border-slate-100 shadow-2xs">
                          <div className="h-80 w-full min-w-0">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={treasurerProgramsBudget} margin={{ top: 15, right: 20, left: 10, bottom: 50 }}>
                                <XAxis 
                                  dataKey="program" 
                                  stroke="#64748b" 
                                  fontSize={10} 
                                  tickLine={false} 
                                  interval={0}
                                  angle={-25}
                                  textAnchor="end"
                                />
                                <YAxis 
                                  stroke="#64748b" 
                                  fontSize={10} 
                                  tickLine={false} 
                                  tickFormatter={(val) => `₱${(val/1000).toFixed(0)}k`}
                                />
                                <Tooltip 
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      const util = ((data.actual / data.allocated) * 100).toFixed(1);
                                      return (
                                        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg text-xs space-y-1">
                                          <p className="font-bold uppercase tracking-wider text-amber-400">{data.program}</p>
                                          <p className="text-slate-300">Budget Limit: <span className="font-mono font-bold text-blue-300">₱{data.allocated.toLocaleString()}</span></p>
                                          <p className="text-slate-300">Actual Expenditure: <span className="font-mono font-bold text-green-300">₱{data.actual.toLocaleString()}</span></p>
                                          <p className="text-slate-300">Utilization %: <span className="font-mono font-bold text-emerald-400">{util}%</span></p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Legend verticalAlign="top" height={36} />
                                <Bar 
                                  dataKey="allocated" 
                                  name="Budget Limit" 
                                  fill="#60a5fa" 
                                  radius={[4, 4, 0, 0]} 
                                />
                                <Bar 
                                  dataKey="actual" 
                                  name="Actual Expenditure" 
                                  fill="#10b981" 
                                  radius={[4, 4, 0, 0]} 
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Programs Table */}
                      <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-left text-xs text-slate-600">
                          <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                            <tr>
                              <th className="px-5 py-3">Program / Initiative Title</th>
                              <th className="px-5 py-3 text-right">Budget Limit</th>
                              <th className="px-5 py-3 text-right">Actual Disbursed</th>
                              <th className="px-5 py-3 text-right">Unused Balance</th>
                              <th className="px-5 py-3 text-right">Utilization Rate</th>
                              <th className="px-5 py-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 font-medium">
                            {treasurerProgramsBudget.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                                  No program budget records available. Select a program created by an authorized official to track disbursements.
                                </td>
                              </tr>
                            ) : (
                              treasurerProgramsBudget.map((p, idx) => {
                                const util = p.allocated > 0 ? ((p.actual / p.allocated) * 100).toFixed(1) : '0.0';
                                const rem = Math.max(0, p.allocated - p.actual);
                                return (
                                  <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-5 py-3 font-bold text-slate-800">{p.program}</td>
                                    <td className="px-5 py-3 text-right font-mono text-slate-800">₱{p.allocated.toLocaleString()}</td>
                                    <td className="px-5 py-3 text-right font-mono font-bold text-emerald-600">₱{p.actual.toLocaleString()}</td>
                                    <td className="px-5 py-3 text-right font-mono text-slate-500">₱{rem.toLocaleString()}</td>
                                    <td className={`px-5 py-3 text-right font-mono font-bold ${Number(util) > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{util}%</td>
                                    <td className="px-5 py-3 text-center">
                                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold text-[9px] rounded uppercase">Within Limit</span>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* SUB-VIEW 3: TAX DEDUCTIONS & BIR WITHHOLDING */}
                  {treasurerReportTab === 'tax' && (
                    <div className="space-y-6">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">Tax Deductions & BIR Withholding Tax Ledger</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Automated calculation of government VAT (5%), Non-VAT (3%), and expanded withholding taxes (2%).</p>
                        </div>
                        <span className="text-xs font-bold text-[#091d64]">BIR Form 1600 & 2307 Summary</span>
                      </div>

                      {/* Tax Summary Metrics */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl border border-slate-100 bg-white space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Invoice Disbursements</span>
                          <h4 className="text-xl font-black text-slate-800">₱{expenses.reduce((a,c)=>a+c.amount,0).toLocaleString()}</h4>
                          <p className="text-[10px] text-slate-500">Total payments issued</p>
                        </div>
                        <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/30 space-y-1">
                          <span className="text-[10px] font-bold text-rose-600 uppercase">Total Tax Withheld (BIR)</span>
                          <h4 className="text-xl font-black text-rose-600">₱{expenses.reduce((a,c)=>a + (Number(c.withholdingTax) || 0), 0).toLocaleString()}</h4>
                          <p className="text-[10px] text-slate-500">Government withholding compliance</p>
                        </div>
                        <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-1">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase">Net Payables Remitted</span>
                          <h4 className="text-xl font-black text-emerald-700">₱{expenses.reduce((a,c)=>a + (Number(c.netAmount ?? c.amount) || 0), 0).toLocaleString()}</h4>
                          <p className="text-[10px] text-slate-500">Net disbursed to suppliers</p>
                        </div>
                      </div>

                      {/* Expense Itemized Tax Table */}
                      <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-left text-xs text-slate-600">
                          <thead className="bg-[#091d64] text-white text-[10px] font-bold uppercase tracking-wider">
                            <tr>
                              <th className="px-5 py-3">Initiative Target</th>
                              <th className="px-5 py-3 text-right">Gross Invoice</th>
                              <th className="px-5 py-3">Payee Supplier</th>
                              <th className="px-5 py-3 text-center">Tax Type</th>
                              <th className="px-5 py-3 text-right">Withholding Tax</th>
                              <th className="px-5 py-3 text-right">Net Payable</th>
                              <th className="px-5 py-3 text-center">Date Logged</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {expenses.map(exp => (
                              <tr key={exp.id} className="hover:bg-slate-50">
                                <td className="px-5 py-3.5 font-bold text-slate-800">{exp.programTitle}</td>
                                <td className="px-5 py-3.5 text-right font-mono text-slate-800 font-bold">₱{exp.amount.toLocaleString()}</td>
                                <td className="px-5 py-3.5 text-slate-600 font-semibold">{exp.supplier}</td>
                                <td className="px-5 py-3.5 text-center"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-black">{exp.taxType}</span></td>
                                <td className="px-5 py-3.5 text-right font-mono text-rose-600 font-bold">-₱{(Number(exp.withholdingTax) || 0).toLocaleString()}</td>
                                <td className="px-5 py-3.5 text-right font-mono text-[#091d64] font-black text-sm">₱{(Number(exp.netAmount ?? exp.amount) || 0).toLocaleString()}</td>
                                <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400 text-center">{exp.dateLogged}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* SUB-VIEW 4: NAGA CITY 27-BARANGAY COMPARISON */}
                  {treasurerReportTab === 'naga_federation' && (
                    <div className="space-y-6">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">Naga City 27-Barangay SK Federation Budget Comparison</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Comparative overview of 10% youth fund allocation and utilization across Naga City.</p>
                        </div>
                        <div className="relative">
                          <input 
                            type="text" 
                            placeholder="Search barangay or chairperson..."
                            value={nagaBarangaySearch}
                            onChange={(e) => setNagaBarangaySearch(e.target.value)}
                            className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none w-64"
                          />
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        </div>
                      </div>

                      {/* 27 Barangays Comparison Table */}
                      <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-96">
                        <table className="w-full text-left text-xs text-slate-600">
                          <thead className="bg-[#091d64] text-white text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10">
                            <tr>
                              <th className="px-5 py-3">#</th>
                              <th className="px-5 py-3">Barangay Name</th>
                              <th className="px-5 py-3">SK Chairperson</th>
                              <th className="px-5 py-3 text-right">Allocated Fund (₱)</th>
                              <th className="px-5 py-3 text-right">Actual Expenditures (₱)</th>
                              <th className="px-5 py-3 text-right">Utilization %</th>
                              <th className="px-5 py-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {nagaBarangaysBudget
                              .filter(b => b.barangay.toLowerCase().includes(nagaBarangaySearch.toLowerCase()) || b.chairperson.toLowerCase().includes(nagaBarangaySearch.toLowerCase()))
                              .map((bg, idx) => {
                                const util = bg.allocated > 0 ? ((bg.actual / bg.allocated) * 100).toFixed(1) : '0.0';
                                const isCurrent = currentTenant?.name ? bg.barangay === currentTenant.name.toUpperCase() : false;
                                return (
                                  <tr key={idx} className={`hover:bg-slate-50 ${isCurrent ? 'bg-blue-50/70 font-bold' : ''}`}>
                                    <td className="px-5 py-3 font-mono text-slate-400">{idx + 1}</td>
                                    <td className="px-5 py-3 font-bold text-slate-800 flex items-center gap-2">
                                      {bg.barangay}
                                      {isCurrent && <span className="px-1.5 py-0.5 bg-[#091d64] text-white rounded text-[8px] uppercase">Your Barangay</span>}
                                    </td>
                                    <td className="px-5 py-3 text-slate-600">{bg.chairperson}</td>
                                    <td className="px-5 py-3 text-right font-mono text-slate-800">₱{bg.allocated.toLocaleString()}</td>
                                    <td className="px-5 py-3 text-right font-mono text-emerald-600 font-bold">₱{bg.actual.toLocaleString()}</td>
                                    <td className="px-5 py-3 text-right font-mono font-black text-[#091d64]">{util}%</td>
                                    <td className="px-5 py-3 text-center">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${parseFloat(util) >= 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                                        {parseFloat(util) >= 80 ? 'High' : 'Normal'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* SUB-VIEW 5: ASSET & INVENTORY VALUATION */}
                  {treasurerReportTab === 'inventory_valuation' && (
                    <div className="space-y-6">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">SK Council Properties, Physical Assets & Inventory Valuation</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Asset registry and condition auditing for year-end inventory reporting.</p>
                        </div>
                        <span className="text-xs font-bold text-[#091d64]">Total Asset Value: ₱{inventory.reduce((a,c)=>a+(c.cost*c.quantity),0).toLocaleString()}</span>
                      </div>

                      {/* Inventory Valuation Table */}
                      <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-left text-xs text-slate-600">
                          <thead className="bg-[#091d64] text-white text-[10px] font-bold uppercase tracking-wider">
                            <tr>
                              <th className="px-5 py-3">Property Item</th>
                              <th className="px-5 py-3">Category Group</th>
                              <th className="px-5 py-3 text-center">Quantity</th>
                              <th className="px-5 py-3 text-center">Condition</th>
                              <th className="px-5 py-3 text-right">Unit Cost</th>
                              <th className="px-5 py-3 text-right">Total Valuation</th>
                              <th className="px-5 py-3">Storage Location</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {inventory.map(item => (
                              <tr key={item.id} className="hover:bg-slate-50">
                                <td className="px-5 py-3.5 font-bold text-slate-800">{item.item}</td>
                                <td className="px-5 py-3.5 text-slate-500 font-semibold">{item.category}</td>
                                <td className="px-5 py-3.5 text-center font-bold text-slate-700">{item.quantity}</td>
                                <td className="px-5 py-3.5 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${item.condition === 'Good' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                    {item.condition}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-right font-mono text-slate-800">₱{item.cost.toLocaleString()}</td>
                                <td className="px-5 py-3.5 text-right font-mono font-bold text-[#091d64]">₱{(item.cost * item.quantity).toLocaleString()}</td>
                                <td className="px-5 py-3.5 text-slate-600 font-medium">{item.location}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* --- SECRETARY & KAGAWAD ADMINISTRATIVE REPORTS VIEW --- */
                <div className="bg-white p-6 rounded-xl border border-slate-100 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-blue-50 text-[#091d64] font-black text-[10px] rounded uppercase tracking-wider">DILG IRR RA 10742 • SEC 14 COMPLIANT</span>
                        <span className="text-xs text-slate-400">Barangay {currentTenant?.name || 'Barangay'}</span>
                      </div>
                      <h3 className="font-sans font-bold text-slate-900 text-lg mt-1">Official Secretariat & Compliance Reports Suite</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Generate, audit, print, and export official KK rosters, program attendance sheets, meeting minutes, and quarterly accomplishment reports.</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          if (reportModuleCategory === 'attendance') {
                            const selProg = programs.find(p => p.id === selectedProgramForReport) || programs[0];
                            const progAtt = localAttendance.filter(a => a.programId === selProg?.id);
                            const rowsHtml = progAtt.map((a, i) => `<tr><td style="text-align:center">${i+1}</td><td><strong>${a.participantName}</strong></td><td>${a.status}</td><td>${new Date(a.checkInTime).toLocaleString()}</td><td style="border-bottom:1px solid #000; height:24px;"></td></tr>`).join('');
                            printOfficialReport(`Official Attendance Sheet - ${selProg?.title}`, `
                              <h4>Program Title: ${selProg?.title}</h4>
                              <p style="font-size:11px;">Location: ${selProg?.location} | Date: ${selProg?.startDate}</p>
                              <table>
                                <thead><tr><th style="width:30px">#</th><th>Participant Name</th><th>Check-in Status</th><th>Timestamp</th><th style="width:120px">Signature</th></tr></thead>
                                <tbody>${rowsHtml || '<tr><td colSpan="5">No checked-in participants recorded.</td></tr>'}</tbody>
                              </table>
                            `);
                          } else if (reportModuleCategory === 'residents') {
                            const filteredRoster = youthProfiles.filter(y => selectedZoneForReport === 'All' ? true : y.zone === selectedZoneForReport);
                            const rowsHtml = filteredRoster.map((y, i) => `<tr><td style="text-align:center">${i+1}</td><td><strong>${y.name}</strong></td><td>${y.zone}</td><td>${y.educationalLevel}</td><td>${y.scholarStatus}</td><td>${y.email}</td></tr>`).join('');
                            printOfficialReport(`Katipunan ng Kabataan Constituent Roster - Zone: ${selectedZoneForReport}`, `
                              <h4>Official Youth Masterlist (${filteredRoster.length} Constituents)</h4>
                              <table>
                                <thead><tr><th style="width:30px">#</th><th>Full Name</th><th>Zone</th><th>Educational Level</th><th>Scholarship</th><th>Email</th></tr></thead>
                                <tbody>${rowsHtml}</tbody>
                              </table>
                            `);
                          } else if (reportModuleCategory === 'accomplishment') {
                            printOfficialReport('Quarterly Youth Accomplishment Report Q2 2026', `
                              <h4>SUMMARY OF ACCOMPLISHMENTS (Q2 2026)</h4>
                              <p style="font-size:11px;">Aligned with CBYDP 2026-2028 Priority Areas</p>
                              <table>
                                <thead><tr><th>Program Name</th><th>Category</th><th>Target Beneficiaries</th><th>Actual Attendance</th><th>Allocated Budget</th><th>Disbursed</th></tr></thead>
                                <tbody>
                                  ${programs.map(p => `<tr><td><strong>${p.title}</strong></td><td>${p.category}</td><td>${p.maxParticipants}</td><td>${p.registeredCount || 0}</td><td>₱${p.budgetAllocation.toLocaleString()}</td><td>₱${expenses.filter(expense => expense.programId === p.id).reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0).toLocaleString()}</td></tr>`).join('')}
                                </tbody>
                              </table>
                            `);
                          } else {
                            handleDownloadPDFReport();
                          }
                        }} 
                        className="px-4 py-2.5 bg-[#091d64] hover:bg-[#122878] text-white font-bold rounded-xl text-xs flex items-center gap-2 shrink-0"
                      >
                        <Printer className="w-4 h-4" /> Print / Export Official PDF
                      </button>
                    </div>
                  </div>

                  {/* Secretariat Report Sub-Module Selector */}
                  <div className="flex gap-2 border-b border-slate-100 pb-2 overflow-x-auto">
                    <button
                      onClick={() => setReportModuleCategory('attendance')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${reportModuleCategory === 'attendance' ? 'bg-[#091d64] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                    >
                      <CalendarCheck className="w-3.5 h-3.5" /> Program Attendance Sheets
                    </button>
                    <button
                      onClick={() => setReportModuleCategory('residents')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${reportModuleCategory === 'residents' ? 'bg-[#091d64] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                    >
                      <Users className="w-3.5 h-3.5" /> Constituent Resident Lists
                    </button>
                    <button
                      onClick={() => setReportModuleCategory('accomplishment')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${reportModuleCategory === 'accomplishment' ? 'bg-[#091d64] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                    >
                      <Award className="w-3.5 h-3.5" /> Accomplishment Reports
                    </button>
                    <button
                      onClick={() => setReportModuleCategory('compliance')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${reportModuleCategory === 'compliance' ? 'bg-[#091d64] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> DILG Compliance Docs
                    </button>
                    <button
                      onClick={() => setReportModuleCategory('minutes')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${reportModuleCategory === 'minutes' ? 'bg-[#091d64] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                    >
                      <BookOpen className="w-3.5 h-3.5" /> Session Minutes
                    </button>
                    <button
                      onClick={() => setReportModuleCategory('document_reports')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${reportModuleCategory === 'document_reports' ? 'bg-[#091d64] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                    >
                      <FolderClosed className="w-3.5 h-3.5" /> Document Vault Status
                    </button>
                  </div>

                  {/* MODULE 1: ATTENDANCE SHEETS */}
                  {reportModuleCategory === 'attendance' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Active Youth Program</label>
                          <select 
                            value={selectedProgramForReport || (programs[0]?.id || '')} 
                            onChange={(e) => setSelectedProgramForReport(e.target.value)}
                            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none min-w-[300px]"
                          >
                            {programs.map(p => (
                              <option key={p.id} value={p.id}>{p.title} ({p.startDate})</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-4 text-xs font-bold text-slate-700">
                          <div><span className="text-slate-400 block text-[10px]">Registered:</span> {programs.find(p => p.id === (selectedProgramForReport || programs[0]?.id))?.registeredCount || 0} Participants</div>
                          <div><span className="text-slate-400 block text-[10px]">Checked-In Present:</span> {localAttendance.filter(a => a.programId === (selectedProgramForReport || programs[0]?.id)).length} Verified</div>
                        </div>
                      </div>

                      <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-left text-xs text-slate-600">
                          <thead className="bg-[#091d64] text-white text-[10px] font-bold uppercase tracking-wider">
                            <tr>
                              <th className="px-5 py-3">#</th>
                              <th className="px-5 py-3">Participant Name</th>
                              <th className="px-5 py-3 text-center">Status</th>
                              <th className="px-5 py-3">Check-In Timestamp</th>
                              <th className="px-5 py-3 text-center">Digital Seal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {localAttendance.filter(a => a.programId === (selectedProgramForReport || programs[0]?.id)).map((att, idx) => (
                              <tr key={att.id} className="hover:bg-slate-50">
                                <td className="px-5 py-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                                <td className="px-5 py-3 font-bold text-slate-800">{att.participantName}</td>
                                <td className="px-5 py-3 text-center">
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold text-[9px] rounded uppercase">{att.status}</span>
                                </td>
                                <td className="px-5 py-3 font-mono text-[11px] text-slate-500">{new Date(att.checkInTime).toLocaleString()}</td>
                                <td className="px-5 py-3 text-center">
                                  <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">Verified KK Member</span>
                                </td>
                              </tr>
                            ))}
                            {localAttendance.filter(a => a.programId === (selectedProgramForReport || programs[0]?.id)).length === 0 && (
                              <tr>
                                <td colSpan={5} className="text-center py-6 text-slate-400 font-bold">No checked-in participants recorded for this selected program yet.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* MODULE 2: RESIDENT LISTS */}
                  {reportModuleCategory === 'residents' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="flex items-center gap-3">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Filter Zone:</label>
                          <select 
                            value={selectedZoneForReport} 
                            onChange={(e) => setSelectedZoneForReport(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                          >
                            <option value="All">All Zones</option>
                            <option value="Zone 1">Zone 1</option>
                            <option value="Zone 2">Zone 2</option>
                            <option value="Zone 3">Zone 3</option>
                            <option value="Zone 4">Zone 4</option>
                          </select>
                        </div>
                        <span className="text-xs font-bold text-[#091d64]">Total Matching Members: {localYouthProfiles.filter(y => selectedZoneForReport === 'All' ? true : y.zone === selectedZoneForReport).length}</span>
                      </div>

                      <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-left text-xs text-slate-600">
                          <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            <tr>
                              <th className="px-5 py-3">Constituent Name</th>
                              <th className="px-5 py-3">Zone</th>
                              <th className="px-5 py-3">Educational Level</th>
                              <th className="px-5 py-3">School / University</th>
                              <th className="px-5 py-3">Scholarship</th>
                              <th className="px-5 py-3">Registry Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {localYouthProfiles.filter(y => selectedZoneForReport === 'All' ? true : y.zone === selectedZoneForReport).map(y => (
                              <tr key={y.id} className="hover:bg-slate-50">
                                <td className="px-5 py-3 font-bold text-slate-800">{y.name}</td>
                                <td className="px-5 py-3 font-bold text-slate-600">{y.zone}</td>
                                <td className="px-5 py-3 text-slate-700">{y.educationalLevel}</td>
                                <td className="px-5 py-3 text-slate-500">{y.school || 'Unspecified Institute'}</td>
                                <td className="px-5 py-3">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${y.scholarStatus === 'Scholar' ? 'bg-indigo-50 text-[#091d64]' : 'bg-slate-100 text-slate-500'}`}>{y.scholarStatus}</span>
                                </td>
                                <td className="px-5 py-3">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${y.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{y.status === 'Approved' ? 'Verified Constituent' : 'Pending Verification'}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* MODULE 3: ACCOMPLISHMENT REPORTS */}
                  {reportModuleCategory === 'accomplishment' && (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1">
                          <span className="text-[10px] font-bold text-[#091d64] uppercase">Total Implemented Projects</span>
                          <h4 className="text-xl font-black text-[#091d64]">{programs.length} Active Programs</h4>
                          <p className="text-[11px] text-slate-500">100% execution alignment with CBYDP 2026-2028 priorities.</p>
                        </div>
                        <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase">Youth Beneficiaries Reached</span>
                          <h4 className="text-xl font-black text-emerald-700">{programs.reduce((sum, program) => sum + (program.registeredCount || registrations.filter(registration => registration.programId === program.id).length), 0).toLocaleString()} Participants</h4>
                          <p className="text-[11px] text-slate-500">Based on registered participants in live programs.</p>
                        </div>
                        <div className="p-4 bg-violet-50/50 border border-violet-100 rounded-xl space-y-1">
                          <span className="text-[10px] font-bold text-violet-700 uppercase">Fund Disbursement Rate</span>
                          <h4 className="text-xl font-black text-violet-700">{(() => { const allocated = programs.reduce((sum, program) => sum + (Number(program.budgetAllocation) || 0), 0); const spent = expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0); return `${allocated > 0 ? ((spent / allocated) * 100).toFixed(1) : '0.0'}% Disbursed`; })()}</h4>
                          <p className="text-[11px] text-slate-500">Calculated from recorded program expenses.</p>
                        </div>
                      </div>

                      <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-left text-xs text-slate-600">
                          <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            <tr>
                              <th className="px-5 py-3">Program Title</th>
                              <th className="px-5 py-3">Category</th>
                              <th className="px-5 py-3 text-center">Participants</th>
                              <th className="px-5 py-3 text-right">Budget Allocated</th>
                              <th className="px-5 py-3 text-right">Disbursed Amount</th>
                              <th className="px-5 py-3 text-center">CBYDP Sector</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {programs.map(p => (
                              <tr key={p.id} className="hover:bg-slate-50">
                                <td className="px-5 py-3 font-bold text-slate-800">{p.title}</td>
                                <td className="px-5 py-3 font-bold text-slate-600">{p.category}</td>
                                <td className="px-5 py-3 text-center font-bold text-[#091d64]">{p.registeredCount} / {p.maxParticipants}</td>
                                <td className="px-5 py-3 text-right font-mono text-slate-700">₱{p.budgetAllocation.toLocaleString()}</td>
                                <td className="px-5 py-3 text-right font-mono font-bold text-emerald-600">₱{expenses.filter(expense => expense.programId === p.id).reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0).toLocaleString()}</td>
                                <td className="px-5 py-3 text-center">
                                  <span className="px-2 py-0.5 bg-blue-50 text-[#091d64] rounded text-[9px] font-bold uppercase">{p.aipReference || 'No AIP reference'}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* MODULE 4: DILG COMPLIANCE DOCS */}
                  {reportModuleCategory === 'compliance' && (
                    <div className="space-y-4">
                      <div className="p-5 border border-slate-100 bg-slate-50/50 rounded-xl space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-slate-800 text-sm">DILG IRR RA 10742 Mandatory Compliance Summary</h4>
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black text-[10px] uppercase">100% Compliant</span>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 text-xs">
                          <div className="p-3 bg-white rounded-lg border border-slate-200/60 space-y-1">
                            <span className="font-bold text-slate-800 block">Section 14 (a): Masterlist & Database</span>
                            <p className="text-slate-500 text-[11px]">Updated master list of Katipunan ng Kabataan members maintained in the digital registry with {localYouthProfiles.length} registered residents.</p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-slate-200/60 space-y-1">
                            <span className="font-bold text-slate-800 block">Section 14 (b): Public Information & Posting</span>
                            <p className="text-slate-500 text-[11px]">Approved resolutions and quarterly reports posted on Barangay Transparency Bulletin Board.</p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-slate-200/60 space-y-1">
                            <span className="font-bold text-slate-800 block">Section 14 (c): Council Minutes & Records</span>
                            <p className="text-slate-500 text-[11px]">Recorded and archived minutes for all 12 regular SK council sessions and 2 Katipunan ng Kabataan assemblies.</p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-slate-200/60 space-y-1">
                            <span className="font-bold text-slate-800 block">Section 14 (d): Document Turnover & Submission</span>
                            <p className="text-slate-500 text-[11px]">Quarterly submission of records to DILG Naga City Field Office completed on schedule.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MODULE 5: SESSION MINUTES */}
                  {reportModuleCategory === 'minutes' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                        <h4 className="font-bold text-slate-800 text-sm">Official Minutes of SK Council Sessions & KK Assemblies</h4>
                        <span className="text-xs text-slate-400">Keep and certify correctness under Sec 14</span>
                      </div>

                      <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-left text-xs text-slate-600">
                          <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            <tr>
                              <th className="px-5 py-3">Tracking ID</th>
                              <th className="px-5 py-3">Session Title</th>
                              <th className="px-5 py-3 text-center">Quorum Attained</th>
                              <th className="px-5 py-3">Recorded Date</th>
                              <th className="px-5 py-3 text-center">Certified Correct</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {localDocs.filter(d => d.category === 'Minutes').map(min => (
                              <tr key={min.id} className="hover:bg-slate-50">
                                <td className="px-5 py-3 font-mono font-bold text-[#091d64]">{min.resolutionNumber || min.id}</td>
                                <td className="px-5 py-3 font-bold text-slate-800">{min.title}</td>
                                <td className="px-5 py-3 text-center"><span className={`px-2 py-0.5 rounded font-black text-[9px] ${min.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{min.status || '—'}</span></td>
                                <td className="px-5 py-3 font-mono text-slate-500">{min.uploadedDate}</td>
                                <td className="px-5 py-3 text-center">
                                  <span className="px-2 py-0.5 bg-blue-50 text-[#091d64] rounded font-bold text-[9px]">{currentUser?.full_name || 'SK Secretary'}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* MODULE 6: DOCUMENT REPORTS */}
                  {reportModuleCategory === 'document_reports' && (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-4 gap-4 text-center">
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Vault Files</span>
                          <h4 className="text-2xl font-black text-[#091d64] mt-1">{localDocs.length}</h4>
                        </div>
                        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                          <span className="text-[10px] font-bold text-amber-700 uppercase">Awaiting Sign-off</span>
                          <h4 className="text-2xl font-black text-amber-700 mt-1">{localDocs.filter(d => d.status === 'Pending').length}</h4>
                        </div>
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase">Approved Records</span>
                          <h4 className="text-2xl font-black text-emerald-700 mt-1">{localDocs.filter(d => d.status === 'Approved').length}</h4>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Active Drafts</span>
                          <h4 className="text-2xl font-black text-slate-700 mt-1">{localDocs.filter(d => d.status === 'Draft').length}</h4>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================== SCREEN 6: DOCUMENTS REPOSITORY (Secretary) ==================== */}
          {activeMenu === 'documents' && (
            <div className="bg-white p-6 rounded-xl border border-slate-100 text-left animate-in fade-in duration-200 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-[#eff6ff] text-[#091d64] font-black text-[10px] rounded uppercase tracking-wider">DOCUMENT REPOSITORY</span>
                  </div>
                  <h3 className="font-sans font-bold text-slate-800 text-base mt-1">Sangguniang Kabataan Document Repository</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Upload, track, review, sign-off, and archive resolutions, meeting minutes, vouchers, and DILG compliance files.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowDocModal(true)}
                    className="px-4 py-2 bg-[#091d64] hover:bg-opacity-95 text-white font-bold rounded-lg transition-all text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Document
                  </button>
                </div>
              </div>

              {/* Filters Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="relative flex-grow">
                  <input 
                    type="text" 
                    placeholder="Search documents by title, resolution number, or author..."
                    value={docSearchQuery}
                    onChange={(e) => setDocSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#091d64]"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                
                <select
                  value={docCategoryFilter}
                  onChange={(e) => setDocCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#091d64]"
                >
                  <option value="All">All Categories</option>
                  <option value="Resolutions">Resolutions</option>
                  <option value="Minutes">Minutes</option>
                  <option value="Vouchers">Vouchers</option>
                  <option value="Liquidation">Liquidation</option>
                  <option value="Accomplishment">Accomplishment</option>
                  <option value="Budget">Budget</option>
                  <option value="Reports">Reports</option>
                  <option value="Communications">Communications</option>
                </select>

                <select
                  value={docStatusFilter}
                  onChange={(e) => setDocStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#091d64]"
                >
                  <option value="All">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Pending">Pending Review</option>
                  <option value="Approved">Approved / Signed</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {/* Document Repository Table */}
              <div className="overflow-x-auto border border-slate-100 rounded-xl shadow-xs">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-[#091d64] text-[10px] text-white font-bold uppercase tracking-widest">
                    <tr>
                      <th className="px-5 py-3.5">Resolution / Tracking No.</th>
                      <th className="px-5 py-3.5">Document Title & Summary</th>
                      <th className="px-5 py-3.5">Category</th>
                      <th className="px-5 py-3.5 text-center">Status</th>
                      <th className="px-5 py-3.5">Designated Approver</th>
                      <th className="px-5 py-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium bg-white">
                    {localDocs
                      .filter(d => {
                        const matchQuery = d.title.toLowerCase().includes(docSearchQuery.toLowerCase()) || 
                          (d.resolutionNumber && d.resolutionNumber.toLowerCase().includes(docSearchQuery.toLowerCase())) ||
                          (d.description && d.description.toLowerCase().includes(docSearchQuery.toLowerCase()));
                        const matchCat = docCategoryFilter === 'All' ? true : d.category === docCategoryFilter;
                        const matchStat = docStatusFilter === 'All' ? true : d.status === docStatusFilter;
                        return matchQuery && matchCat && matchStat;
                      })
                      .map(doc => (
                        <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4 font-mono font-bold text-[#091d64]">
                            {doc.resolutionNumber || doc.id}
                          </td>
                          <td className="px-5 py-4 max-w-sm">
                            <span className="font-bold text-slate-900 block tracking-tight">{doc.title}</span>
                            <span className="text-[11px] text-slate-400 block mt-0.5 line-clamp-1">{doc.description}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase">{doc.category}</span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase ${
                              doc.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' :
                              doc.status === 'Pending' ? 'bg-amber-50 text-amber-700 animate-pulse' :
                              doc.status === 'Draft' ? 'bg-slate-100 text-slate-600' :
                              'bg-rose-50 text-rose-700'
                            }`}>
                              {doc.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-600 font-semibold text-[11px]">
                            {doc.designatedApprover || 'SK Chairperson'}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-center items-center gap-1.5">

                              <button 
                                onClick={() => { setSelectedDoc(doc); setShowViewDocModal(true); }} 
                                className="p-1.5 hover:bg-slate-100 rounded text-[#091d64] font-bold" 
                                title="View Details & Version History"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button 
                                onClick={() => { setSelectedDoc(doc); setShowEditDocModal(true); }} 
                                className="p-1.5 hover:bg-slate-100 rounded text-slate-600 font-bold" 
                                title="Edit Document Details"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button 
                                onClick={() => {
                                  const url = (doc as any).fileUrl;
                                  if (url) { window.open(url, '_blank'); return; }
                                  alert('No file attached to this document. It may be a metadata-only record.');
                                }}
                                className="p-1.5 hover:bg-slate-100 rounded text-emerald-700 font-bold" 
                                title="Download File"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {localDocs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400 font-bold">No official documents found matching the filter criteria.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== SCREEN 7: KK YOUTH RECORDS (Secretary) ==================== */}
          {activeMenu === 'records' && (
            <div className="bg-white p-6 rounded-xl border border-slate-100 text-left animate-in fade-in duration-200 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-[#eff6ff] text-[#091d64] font-black text-[10px] rounded uppercase tracking-wider">SEC 14 RECORD-KEEPING MANDATE</span>
                    <span className="text-xs text-slate-400">Youth Registry</span>
                  </div>
                  <h3 className="font-sans font-bold text-slate-900 text-lg mt-1">Katipunan ng Kabataan Youth Masterlist</h3>
                  <p className="text-xs text-slate-500 mt-0.5">The SK Secretary maintains the verified constituent roster and demographic profile database. Final registration approvals for new constituents are processed by the Barangay Admin.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowBeneficiariesModal(true)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Award className="w-4 h-4 text-slate-600" /> Beneficiaries Summary
                  </button>
                </div>
              </div>

              {/* Sub-Tabs: Verified Roster vs Pending Validation */}
              <div className="flex gap-2 border-b border-slate-100 pb-2">
                <button
                  onClick={() => setSecYouthTab('verified')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${secYouthTab === 'verified' ? 'bg-[#091d64] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                  <ShieldCheck className="w-4 h-4" /> Verified Roster ({localYouthProfiles.filter(p => p.status === 'Approved').length})
                </button>
                <button
                  onClick={() => setSecYouthTab('pending')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${secYouthTab === 'pending' ? 'bg-[#091d64] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                  <Clock className="w-4 h-4" /> Applicant Verification ({localYouthProfiles.filter(p => p.status === 'Pending').length})
                </button>
              </div>

              {/* Filters Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="relative flex-grow">
                  <input 
                    type="text" 
                    placeholder="Search youth constituents by name, email, or educational institute..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#091d64]"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#091d64]"
                >
                  <option value="All">All Demographic Filters</option>
                  <option value="Zone 1">Zone 1</option>
                  <option value="Zone 2">Zone 2</option>
                  <option value="Zone 3">Zone 3</option>
                  <option value="Zone 4">Zone 4</option>
                  <option value="Scholar">Scholar Grantees</option>
                  <option value="Non-Scholar">Non-Scholar</option>
                </select>
              </div>

              {/* Roster Table */}
              <div className="overflow-x-auto border border-slate-100 rounded-xl shadow-xs">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-[#091d64] text-[10px] text-white font-bold uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Katipunan Constituent</th>
                      <th className="px-6 py-4">Educational Profile</th>
                      <th className="px-6 py-4 text-center">Zone</th>
                      <th className="px-6 py-4 text-center">Scholarship</th>
                      <th className="px-6 py-4">Contact Information</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium bg-white">
                    {localYouthProfiles
                      .filter(y => secYouthTab === 'verified' ? y.status === 'Approved' : y.status === 'Pending')
                      .filter(y => {
                        const matchSearch = y.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          y.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (y.school && y.school.toLowerCase().includes(searchTerm.toLowerCase()));
                        const matchCat = filterCategory === 'All' ? true : y.zone === filterCategory || y.scholarStatus === filterCategory;
                        return matchSearch && matchCat;
                      })
                      .map(y => (
                        <tr key={y.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <ProfileAvatar name={y.name} src={y.profilePic} alt={y.name} className="w-10 h-10 rounded-xl border-2 border-white shadow-xs" />
                                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${y.status === 'Approved' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block tracking-tight text-sm">{y.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono font-bold block">{y.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-slate-800 block">{y.educationalLevel}</span>
                            <span className="text-[11px] text-slate-400 font-semibold block">{y.school || 'Unassigned Institute'}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-2.5 py-1 bg-slate-100 rounded text-slate-700 font-bold text-[10px]">{y.zone}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-tight ${y.scholarStatus === 'Scholar' ? 'bg-indigo-50 text-[#091d64]' : 'bg-slate-50 text-slate-400'}`}>
                              {y.scholarStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span className="text-[11px]">{y.email}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                                <Phone className="w-3 h-3 text-slate-300" />
                                <span className="text-[10px] font-bold">{y.mobile}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => {
                                setSelectedYouthProfile(y);
                                setYouthEditForm({
                                  name: y.name,
                                  ...(y.first_name || y.last_name
                                    ? { first_name: y.first_name || '', middle_name: y.middle_name || '', last_name: y.last_name || '', suffix: y.suffix || '' }
                                    : splitFullName(y.name || '')),
                                  email: y.email,
                                  mobile: y.mobile,
                                  zone: y.zone,
                                  educationalLevel: y.educationalLevel,
                                  school: y.school || '',
                                  scholarStatus: y.scholarStatus
                                });
                                setShowYouthDetailModal(true);
                              }} 
                              className="px-3 py-1.5 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#091d64] font-bold rounded-lg text-xs transition-all flex items-center gap-1 mx-auto"
                            >
                              <Eye className="w-3.5 h-3.5" /> View / Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== SCREEN 8: YOUTH MANAGEMENT (Secretary Verification) ==================== */}
          {activeMenu === 'youth_management' && (
            <div className="bg-white p-6 rounded-xl border border-slate-100 text-left space-y-6 animate-in fade-in duration-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 font-black text-[10px] rounded uppercase tracking-wider">SECRETARIAT REVIEW DESK • DILG SEC 14</span>
                </div>
                <h3 className="font-sans font-bold text-slate-900 text-lg mt-1">Youth Candidate Review & Record Desk</h3>
                <p className="text-xs text-slate-500 mt-0.5">The SK Secretary reviews constituent document submissions and maintains profile records. Final registration approval is the sole responsibility of the Barangay Administrator (SK Chairperson).</p>
              </div>

              {rejectionTargetId && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3 text-left">
                  <h4 className="text-xs font-bold text-amber-900">Verification Observation Note</h4>
                  <p className="text-xs text-amber-800">Log specific observation notes (residency verification, ID validation, or document mismatch) for the Barangay Administrator's final determination:</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={rejectReason} 
                      onChange={(e)=>setRejectReason(e.target.value)}
                      placeholder="Observation details for Barangay Admin..."
                      className="flex-grow p-2 border border-amber-300 rounded-lg text-xs bg-white focus:outline-none"
                    />
                    <button onClick={confirmRejectionSubmit} className="px-4 py-2 bg-amber-800 text-white font-bold rounded-lg text-xs">Log Observation</button>
                    <button onClick={() => setRejectionTargetId(null)} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg text-xs">Cancel</button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto border border-slate-100 rounded-xl shadow-xs">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-[#091d64] text-[10px] text-white font-bold uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Constituent Candidate</th>
                      <th className="px-6 py-4">Educational Level</th>
                      <th className="px-6 py-4 text-center">Zone</th>
                      <th className="px-6 py-4 text-center">Date Registered</th>
                      <th className="px-6 py-4 text-center">Secretariat Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium bg-white">
                    {localYouthProfiles.filter(p => p.status === 'Pending').map(y => (
                      <tr key={y.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <ProfileAvatar name={y.name} src={y.profilePic} alt={y.name} className="w-10 h-10 rounded-xl border-2 border-white shadow-xs" />
                            <div>
                              <span className="font-bold text-slate-900 block tracking-tight text-sm">{y.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono font-bold block">{y.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-700 block">{y.educationalLevel}</span>
                          <span className="text-[10px] text-slate-400 font-semibold block">{y.school || 'Unspecified school'}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 bg-slate-100 rounded text-slate-700 font-bold text-[10px]">{y.zone}</span>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-[11px] text-slate-500 font-bold italic">{y.dateRegistered}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => onApproveYouth(y.id)} className="p-2 px-3.5 bg-blue-50 text-[#091d64] hover:bg-blue-100 font-bold rounded-lg text-[10px] flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer">
                              <Check className="w-3.5 h-3.5" /> REVIEW APPLICANT
                            </button>
                            <button onClick={() => triggerRejection(y.id)} className="p-2 px-3 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-lg text-[10px] flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer">
                              <X className="w-3.5 h-3.5" /> FLAG OBSERVATION
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {localYouthProfiles.filter(p => p.status === 'Pending').length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-400 font-bold">No pending validation requests found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== SCREEN 9: BUDGET (Treasurer AIP Monitor) ==================== */}
          {activeMenu === 'budget' && (
            <div className="bg-white p-6 rounded-xl border border-slate-100 text-left space-y-6 animate-in fade-in duration-200">
              {allocateNotice && (
                <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
                  {allocateNotice}
                </div>
              )}
              {showAllocateProgram && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
                  <form
                    onSubmit={async (event) => {
                      event.preventDefault();
                      setAllocateError('');
                      if (!allocateForm.category.trim()) { setAllocateError('Select a program.'); return; }
                      const amount = Number(allocateForm.allocatedAmount.replace(/[^0-9.]/g, ''));
                      if (!amount || amount <= 0) { setAllocateError('Amount must be greater than zero.'); return; }
                      if (!currentTenant?.id) { setAllocateError('No Barangay selected.'); return; }
                      setIsSavingAllocate(true);
                      try {
                        const res = await kabisigApi.allocateBudget({
                          fiscal_year: Number(allocateForm.fiscalYear),
                          category: allocateForm.category.trim(),
                          allocated_amount: amount,
                          description: allocateForm.description.trim() || undefined,
                        });
                        if (!res.success) { setAllocateError(res.message || 'Budget allocation failed.'); return; }
                        setShowAllocateProgram(false);
                        setAllocateForm({ category: '', allocatedAmount: '', description: '', fiscalYear: String(new Date().getFullYear()) });
                        setAllocateNotice('Budget allocation saved.');
                        window.setTimeout(() => setAllocateNotice(''), 5000);
                        const rows = await kabisigApi.getBudgets(currentTenant.id, Number(allocateForm.fiscalYear));
                        if (rows) setBudgetOptions(rows as any);
                      } catch (err) {
                        setAllocateError((err && err.message) ? err.message : 'Network error saving allocation.');
                      } finally {
                        setIsSavingAllocate(false);
                      }
                    }}
                    className="w-full max-w-lg space-y-4 rounded-xl bg-white p-5 shadow-2xl"
                  >
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-base font-extrabold text-[#091d64]">Allocate budget to program</h3>
                        <p className="mt-1 text-xs text-slate-500">Per DILG JMC No. 1 s. 2025 Item 4.3.2.2, the SK Chairperson prepares the AIP. The Treasurer assists by allocating specific amounts to each program.</p>
                      </div>
                      <button type="button" onClick={() => setShowAllocateProgram(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close allocation form"><X className="h-4 w-4" /></button>
                    </div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Fiscal year
                      <input required type="number" min="2020" max="2100" value={allocateForm.fiscalYear} onChange={(event) => setAllocateForm((previous) => ({ ...previous, fiscalYear: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800" />
                    </label>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Program
                      <select required value={allocateForm.category} onChange={(event) => setAllocateForm((previous) => ({ ...previous, category: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800">
                        <option value="">Select a created program...</option>
                        {programs.filter(p => !currentTenant?.id || p.barangayId === currentTenant.id).map(p => <option key={p.id} value={p.title}>{p.title}</option>)}
                      </select>
                    </label>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Allocated amount
                      <input required type="text" inputMode="decimal" value={allocateForm.allocatedAmount} onChange={(event) => setAllocateForm((previous) => ({ ...previous, allocatedAmount: formatCurrencyInput(event.target.value) }))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800" placeholder="0.00" />
                    </label>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Description <span className="text-slate-400 font-normal normal-case tracking-normal">(Optional)</span>
                      <input value={allocateForm.description} onChange={(event) => setAllocateForm((previous) => ({ ...previous, description: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-800" placeholder="Notes for this allocation" />
                    </label>
                    {allocateError && <p role="alert" className="text-xs font-semibold text-rose-700">{allocateError}</p>}
                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                      <button type="button" disabled={isSavingAllocate} onClick={() => setShowAllocateProgram(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-50">Cancel</button>
                      <button type="submit" disabled={isSavingAllocate} className="rounded-lg bg-[#091d64] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{isSavingAllocate ? 'Saving...' : 'Save allocation'}</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h3 className="font-sans font-bold text-slate-800 text-base">Annual Investment Plan (AIP) & Program Budget Allocation</h3>
                  <p className="text-xs text-slate-400 mt-1">Review allocations, monitor overspending alerts, fund reversions, and active expenditures of Barangay {currentTenant?.name || 'Barangay'}.</p>
                </div>
                <button type="button" onClick={() => { setAllocateError(''); setShowAllocateProgram(true); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#091d64] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#122878]">
                  <Plus className="h-4 w-4" /> Allocate to program
                </button>
              </div>

              {/* Treasurer summary cards - Total / Allocated / Spent / Remaining */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-xl border border-slate-100 bg-white">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total SK Budget</span>
                  <h4 className="text-xl font-black text-[#091d64] mt-1">₱{totalBarangayBudget.toLocaleString()}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Annual 10% Fund ceiling</p>
                </div>
                <div className="p-5 rounded-xl border border-blue-100 bg-blue-50/30">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">Allocated to Programs</span>
                  <h4 className="text-xl font-black text-blue-700 mt-1">₱{programs.reduce((s, p) => s + (Number(p.budgetAllocation) || 0), 0).toLocaleString()}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Sum of program allocations</p>
                </div>
                <div className="p-5 rounded-xl border border-rose-100 bg-rose-50/30">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">Total Spent</span>
                  <h4 className="text-xl font-black text-rose-700 mt-1">₱{totalSpentExpenses.toLocaleString()}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{budgetUtilizationRate.toFixed(1)}% utilized</p>
                </div>
                <div className="p-5 rounded-xl border border-emerald-100 bg-emerald-50/30">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Remaining Balance</span>
                  <h4 className="text-xl font-black text-emerald-700 mt-1">₱{remainingCash.toLocaleString()}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Available to spend</p>
                </div>
              </div>

              {/* Tally boxes - Refined Premium Design */}
              {(() => {
                const sportsStats = getSectorStats('Sports Development');
                const eduStats = getSectorStats('Education & Scholarship');
                const healthStats = getSectorStats('Health & Nutrition');

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Sports Sector Limit</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#091d64] flex items-center justify-center font-bold text-xs group-hover:scale-110 transition-transform">₱</div>
                      </div>
                      <h4 className="text-2xl font-black text-[#091d64] mt-1 tracking-tight">₱{sportsStats.alloc.toLocaleString()}</h4>
                      <div className="mt-4">
                        <div className="flex justify-between text-[10px] font-bold mb-1.5">
                          <span className="text-slate-400 uppercase">Utilization</span>
                          <span className={sportsStats.rate > 0 ? 'text-emerald-600 font-black' : 'text-slate-400 font-medium'}>
                            {sportsStats.rate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${sportsStats.rate > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} 
                            style={{ width: `${sportsStats.rate > 0 ? Math.min(100, sportsStats.rate) : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Scholarship & Education</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs group-hover:scale-110 transition-transform">₱</div>
                      </div>
                      <h4 className="text-2xl font-black text-[#091d64] mt-1 tracking-tight">₱{eduStats.alloc.toLocaleString()}</h4>
                      <div className="mt-4">
                        <div className="flex justify-between text-[10px] font-bold mb-1.5">
                          <span className="text-slate-400 uppercase">Utilization</span>
                          <span className={eduStats.rate > 0 ? 'text-emerald-600 font-black' : 'text-slate-400 font-medium'}>
                            {eduStats.rate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${eduStats.rate > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} 
                            style={{ width: `${eduStats.rate > 0 ? Math.min(100, eduStats.rate) : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Health & Wellness Limit</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs group-hover:scale-110 transition-transform">₱</div>
                      </div>
                      <h4 className="text-2xl font-black text-[#091d64] mt-1 tracking-tight">₱{healthStats.alloc.toLocaleString()}</h4>
                      <div className="mt-4">
                        <div className="flex justify-between text-[10px] font-bold mb-1.5">
                          <span className="text-slate-400 uppercase">Utilization</span>
                          <span className={healthStats.rate > 0 ? 'text-emerald-600 font-black' : 'text-slate-400 font-medium'}>
                            {healthStats.rate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${healthStats.rate > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} 
                            style={{ width: `${healthStats.rate > 0 ? Math.min(100, healthStats.rate) : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Program Budget Allocation Table */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Active Program Budget Allocations & Overspending Monitor</h4>
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-3">AIP Reference</th>
                        <th className="px-5 py-3">Program Title</th>
                        <th className="px-5 py-3">Sector Category</th>
                        <th className="px-5 py-3 text-right">Allocated Budget</th>
                        <th className="px-5 py-3 text-right">Disbursed Expenses</th>
                        <th className="px-5 py-3 text-center">Reversion Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium">
                      {programs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                            No program budget allocations registered. Allocations will appear when a real program budget is approved.
                          </td>
                        </tr>
                      ) : (
                        programs.map(p => {
                          const spent = expenses
                            .filter(e => e.programId === p.id)
                            .reduce((sum, e) => sum + (e.amount || 0), 0);
                          const isOver = spent > p.budgetAllocation && p.budgetAllocation > 0;
                          return (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="px-5 py-4 font-mono text-[11px] text-slate-400">{p.aipReference || 'No AIP reference'}</td>
                              <td className="px-5 py-4 font-bold text-slate-800">{p.title}</td>
                              <td className="px-5 py-4"><span className="px-2 py-0.5 bg-blue-50 text-[#091d64] rounded text-[9px] font-bold uppercase">{p.category}</span></td>
                              <td className="px-5 py-4 text-right font-mono font-bold text-slate-800">₱{p.budgetAllocation.toLocaleString()}</td>
                              <td className="px-5 py-4 text-right font-mono text-slate-600 font-semibold">₱{spent.toLocaleString()}</td>
                              <td className="px-5 py-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${isOver ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                  {isOver ? 'Over Budget' : 'Within Limit'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* COA Checklist */}
              <div className="p-5 border border-slate-100 rounded-xl space-y-3 bg-[#eff6ff]/30 text-xs font-semibold">
                <h4 className="text-sm font-extrabold text-[#091d64] flex items-center gap-1.5 uppercase tracking-wider">
                  <Check className="w-4 h-4" /> COA Compliance Checklist
                </h4>
                <div className="grid sm:grid-cols-2 gap-3 mt-2">
                  <div className="flex items-center gap-2 text-slate-600"><Check className="w-4 h-4 text-green-600" /> Annual SK Budget certified by Barangay Council</div>
                  <div className="flex items-center gap-2 text-slate-600"><Check className="w-4 h-4 text-green-600" /> 10% statutory SK fund allotment verified</div>
                  <div className="flex items-center gap-2 text-slate-600"><Check className="w-4 h-4 text-green-600" /> General Cash ledger records reconciled</div>
                  <div className="flex items-center gap-2 text-slate-600"><Check className="w-4 h-4 text-green-600" /> Automated tax withholdings properly audited</div>
                </div>
              </div>

              {/* Council Financial Expense Ledger Sub-Section */}
              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Council Financial Expense Ledger & Tax Computation</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Log transactions, identify tax groups, and calculate automated withholding taxes.</p>
                  </div>
                  <button 
                    onClick={() => setShowExpenseModal(true)}
                    className="px-4 py-2 bg-[#091d64] hover:bg-opacity-95 text-white font-bold rounded-lg transition-all text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Log New Expense
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-xl shadow-sm">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-[#091d64] text-[10px] text-white font-bold uppercase tracking-widest">
                      <tr>
                        <th className="px-5 py-3">Initiative Target</th>
                        <th className="px-5 py-3 text-right">Gross invoice</th>
                        <th className="px-5 py-3">Payee Supplier</th>
                        <th className="px-5 py-3 text-center">Tax Type</th>
                        <th className="px-5 py-3 text-right">Withholding Tax</th>
                        <th className="px-5 py-3 text-right">Net Payable</th>
                        <th className="px-5 py-3 font-mono text-center">Date Logged</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium bg-white">
                      {expenses.map(exp => (
                        <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4 font-bold text-slate-800 tracking-tight">{exp.programTitle}</td>
                          <td className="px-5 py-4 text-right font-mono text-slate-800 font-bold">₱{exp.amount.toLocaleString()}</td>
                          <td className="px-5 py-4 text-slate-600 font-semibold">{exp.supplier}</td>
                          <td className="px-5 py-4 text-center"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-black">{exp.taxType}</span></td>
                          <td className="px-5 py-4 text-right font-mono text-rose-600 font-bold">-₱{(Number(exp.withholdingTax) || 0).toLocaleString()}</td>
                          <td className="px-5 py-4 text-right font-mono text-[#091d64] font-black text-sm">₱{(Number(exp.netAmount ?? exp.amount) || 0).toLocaleString()}</td>
                          <td className="px-5 py-4 font-mono text-[11px] text-slate-400 text-center font-bold italic">{exp.dateLogged}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== SCREEN 11: INVENTORY REGISTRY (Treasurer) ==================== */}
          {activeMenu === 'inventory' && (
            <div className="bg-white p-6 rounded-xl border border-slate-100 text-left animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="font-sans font-bold text-slate-800 text-base">SK Council Properties & Assets Inventory</h3>
                  <p className="text-xs text-slate-400 mt-1">Track physical goods, condition statuses, and storage locations.</p>
                </div>
                <button 
                  onClick={() => { setInvForm({ item: '', category: 'Sports Equipment', quantity: 10, condition: 'Good', cost: 1200, location: 'SK Office' }); setShowInvModal(true); }}
                  className="px-4 py-2 bg-[#091d64] hover:bg-opacity-95 text-white font-bold rounded-lg transition-all text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Register New Asset
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-xl shadow-sm">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-[#091d64] text-[10px] text-white font-bold uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Property item</th>
                      <th className="px-6 py-4">Category Group</th>
                      <th className="px-6 py-4 text-center">Qty</th>
                      <th className="px-6 py-4 text-center">Condition</th>
                      <th className="px-6 py-4 text-right">Unit cost</th>
                      <th className="px-6 py-4">Storage Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium bg-white">
                    {inventory.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800 tracking-tight">{item.item}</td>
                        <td className="px-6 py-4 text-slate-500 font-semibold">{item.category}</td>
                        <td className="px-6 py-4 text-center font-black text-slate-700">{item.quantity}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-tight ${item.condition === 'Good' ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'}`}>
                            {item.condition}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-800 font-bold">₱{item.cost.toLocaleString()}</td>
                        <td className="px-6 py-4 text-slate-600 font-bold">{item.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== SCREEN 12 & 14 & 18: PROFILE SETTINGS ==================== */}
          {activeMenu === 'settings' && (
            <div className="bg-white p-6 rounded-xl border border-slate-100 text-left space-y-8 animate-in fade-in duration-200">
              <div>
                <h3 className="font-sans font-bold text-[#091d64] text-base">{currentRole} KABISIG Governance Settings</h3>
                <p className="text-xs text-slate-400 mt-1">Manage validation credentials, national SK compliance checklists, and role-specific operational parameters.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-1 p-6 border border-slate-100 rounded-xl flex flex-col items-center justify-center space-y-4">
                  <ProfileAvatar name={profileConfig[currentRole]?.name} alt="User Avatar" className="w-24 h-24 rounded-full border-4 border-[#eff6ff]" />
                  <button className="px-3 py-1.5 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#091d64] text-xs font-bold rounded-lg flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" /> Upload Avatar
                  </button>
                </div>

                <div className="md:col-span-2 space-y-6">
                  {/* Common Profile Section */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Official Name</label>
                      <input type="text" defaultValue={profileConfig[currentRole]?.name} className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none bg-slate-50" readOnly />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Official Designation</label>
                      <input type="text" defaultValue={profileConfig[currentRole]?.title} className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-[#091d64] focus:outline-none bg-slate-50" readOnly />
                    </div>
                  </div>

                  {/* Role-specific content based on KABISIG description */}
                  {currentRole === 'SK Kagawad' && (
                    <div className="border-t border-slate-100 pt-4 space-y-4">
                      <h4 className="text-xs font-bold text-[#091d64] uppercase tracking-wider">Committee & Development Priorities</h4>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Primary Committee Assignment</label>
                          <select className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-[#091d64]" disabled>
                            <option>Committee on Environmental Protection</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">DILG Development Sector Target</label>
                          <select className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#091d64]">
                            <option>Active Citizenship & Leadership</option>
                            <option>Global Mobility & Youth Health</option>
                            <option>Economic Empowerment & Livelihood</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-blue-800">
                        <Check className="w-4 h-4 flex-shrink-0" />
                        <span>All project logs are synced directly with the Sangguniang Kabataan Annual Investment Program (AIP).</span>
                      </div>
                    </div>
                  )}

                  {currentRole === 'SK Secretary' && (
                    <div className="border-t border-slate-100 pt-4 space-y-4">
                      <h4 className="text-xs font-bold text-[#091d64] uppercase tracking-wider">Secretariat & Record-Keeping Parameters</h4>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">KK Profiling Mode</label>
                          <select className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none">
                            <option>Mandatory Resident ID Upload</option>
                            <option>Barangay Clearance White-list</option>
                            <option>Open Profiling (Manual Review)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Document Indexing System</label>
                          <select className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none">
                            <option>DILG Standard Resolutions Format</option>
                            <option>Custom Barangay Archive Protocol</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-100 text-xs">
                        <Check className="w-4 h-4 flex-shrink-0" />
                        <span>KK digital voter registry automated checks are turned ON.</span>
                      </div>
                    </div>
                  )}

                  {currentRole === 'SK Treasurer' && (
                    <div className="border-t border-slate-100 pt-4 space-y-4">
                      <h4 className="text-xs font-bold text-[#091d64] uppercase tracking-wider">COA Financial Auditing & Tax Rules</h4>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Default VAT Withholding Rate</label>
                          <select className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none">
                            <option>5% VAT (Government supplier rate)</option>
                            <option>10% VAT (Standard rate)</option>
                            <option>1% VAT (Non-VAT supplier)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Withholding Tax (Professional services)</label>
                          <select className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none">
                            <option>2% Withholding Tax</option>
                            <option>1% Withholding Tax</option>
                            <option>No Withholding Tax (Exempt)</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg border border-amber-100 text-xs">
                        <Check className="w-4 h-4 flex-shrink-0" />
                        <span>COA automated voucher compliance validation limits are active.</span>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-4 text-right">
                    <button onClick={() => alert(`${currentRole} configuration successfully applied to ${currentTenant?.name || 'Barangay'} Sangguniang Kabataan registry!`)} className="px-5 py-2.5 bg-[#091d64] hover:bg-opacity-95 text-white font-bold rounded-lg text-xs">Save Configuration</button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* --- REUSABLE MODALS --- */}
      {/* 1. Create Program Modal (Kagawad) */}
      {showProgModal && currentRole !== 'SK Treasurer' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200 text-left">
            <div className="bg-[#091d64] text-white p-6 border-b border-slate-100">
              <h3 className="font-sans font-bold text-lg">Create New Program Initiative</h3>
              <p className="text-xs text-slate-300 mt-1">Specify schedules, funding, and locations for COA compliance audits.</p>
            </div>
            <div className="p-6 space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Program Title *</label>
                <input type="text" value={progForm.title} onChange={(e)=>setProgForm({...progForm, title: e.target.value})} placeholder="e.g. SK Basketball League 2026" className="w-full p-2 border rounded text-xs focus:ring-1 focus:ring-[#091d64]" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">AIP Reference Code</label>
                  <input type="text" value={progForm.aipReference} onChange={(e)=>setProgForm({...progForm, aipReference: e.target.value})} className="w-full p-2 border rounded font-mono text-xs focus:ring-1 focus:ring-[#091d64]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category Group</label>
                  <select value={progForm.category} onChange={(e)=>setProgForm({...progForm, category: e.target.value as any})} className="w-full p-2 border rounded text-xs focus:outline-none">
                    <option value="Education & Scholarship">Education & Scholarship</option>
                    <option value="Sports Development">Sports Development</option>
                    <option value="Health & Nutrition">Health & Nutrition</option>
                    <option value="Environmental Protection">Environmental Protection</option>
                    <option value="Livelihood & Skills">Livelihood & Skills</option>
                    <option value="Peace & Security">Peace & Security</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {currentRole !== 'SK Kagawad' && (
                  <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Budget Allocation (₱)</label>
                    <input type="number" value={progForm.budgetAllocation} onChange={(e)=>setProgForm({...progForm, budgetAllocation: parseInt(e.target.value)||0})} className="w-full p-2 border rounded text-xs font-mono" />
                  </div>
                  </>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Max slots</label>
                  <input type="number" value={progForm.maxParticipants} onChange={(e)=>setProgForm({...progForm, maxParticipants: parseInt(e.target.value)||100})} className="w-full p-2 border rounded text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Start Date *</label>
                  <input type="date" value={progForm.startDate} onChange={(e)=>setProgForm({...progForm, startDate: e.target.value})} className="w-full p-2 border rounded text-xs" required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">End Date *</label>
                  <input type="date" value={progForm.endDate} onChange={(e)=>setProgForm({...progForm, endDate: e.target.value})} className="w-full p-2 border rounded text-xs" required />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Location Venue *</label>
                <input type="text" value={progForm.location} onChange={(e)=>setProgForm({...progForm, location: e.target.value})} className="w-full p-2 border rounded text-xs" required />
              </div>
              <div className="flex justify-end gap-2 border-t pt-4">
                <button onClick={()=>setShowProgModal(false)} className="px-4 py-2 border rounded text-xs">Cancel</button>
                <button onClick={handlePublishProgram} className="px-5 py-2 bg-[#091d64] text-white rounded font-bold text-xs">Publish Initiative</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Upload Document Modal (Secretary) */}
      {showDocModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200 text-left">
            <div className="bg-[#091d64] text-white p-6 border-b border-slate-100">
              <h3 className="font-sans font-bold text-lg">Upload Governance File</h3>
              <p className="text-xs text-slate-300 mt-1">Route compliance records and liquidations directly to repository.</p>
            </div>
            <div className="p-6 space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Document Title *</label>
                <input type="text" value={docForm.title} onChange={(e)=>setDocForm({...docForm, title: e.target.value})} placeholder="e.g. Resolution No. 2026-005: Youth Sports Allocation" className="w-full p-2 border rounded text-xs" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Resolution / Tracking No. (Optional)</label>
                  <input type="text" value={docForm.resolutionNumber} onChange={(e)=>setDocForm({...docForm, resolutionNumber: e.target.value})} placeholder="Auto-generated if empty (e.g. RES-2026-005)" className="w-full p-2 border rounded text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category Group</label>
                  <select 
                    value={docForm.category} 
                    onChange={(e) => {
                      const newCat = e.target.value as any;
                      setDocForm({
                        ...docForm, 
                        category: newCat,
                        designatedApprover: getDefaultApproverForCategory(newCat)
                      });
                    }} 
                    className="w-full p-2 border rounded text-xs"
                  >
                    <option value="Resolutions">Resolutions</option>
                    <option value="Vouchers">Vouchers</option>
                    <option value="Reports">Reports</option>
                    <option value="Budget">Budget</option>
                    <option value="Minutes">Meeting Minutes</option>
                    <option value="Communications">Communications</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Designated Approver / Sign-Off Official (RA 10742)</label>
                <select value={docForm.designatedApprover} onChange={(e)=>setDocForm({...docForm, designatedApprover: e.target.value})} className="w-full p-2 border rounded text-xs font-semibold text-[#091d64]">
                  <option value={currentTenant?.chairperson || 'SK Chairperson'}>1. {currentTenant?.chairperson || 'SK Chairperson'} (SK Chairperson / Barangay Admin)</option>
                  <option value={currentUser?.full_name || 'SK Treasurer'}>2. {currentUser?.full_name || 'SK Treasurer'} (SK Treasurer)</option>
                  <option value="Council Secretariat / SK Secretary">3. Council Secretariat / SK Secretary</option>
                  <option value="Committee Chair & SK Council">4. Committee Chair & SK Kagawads (Council Members)</option>
                  <option value="DILG Local Government Officer">5. DILG Local Government Officer</option>
                  <option value="Barangay Captain & SK Council">6. Barangay Captain & SK Council</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description & Scope</label>
                <textarea value={docForm.description} onChange={(e)=>setDocForm({...docForm, description: e.target.value})} placeholder="Summarize document purpose, council reading details, or liquidation coverage..." className="w-full p-2 border rounded text-xs" rows={2} />
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-lg p-5 text-center bg-slate-50 relative cursor-pointer hover:bg-slate-100 transition-colors">
                <input 
                  type="file" 
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 25 * 1024 * 1024) {
                        setDocumentUploadError('File size exceeds maximum limit of 25MB.');
                        return;
                      }
                      setSelectedDocumentFile(file);
                      setDocumentUploadError('');
                      setDocForm({ ...docForm, fileName: file.name, title: docForm.title || file.name.replace(/\.[^/.]+$/, "") });
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                <span className="text-xs font-bold text-slate-700 block">
                  {docForm.fileName ? `Attached: ${docForm.fileName}` : 'Select compliance report attachment'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">PDF, Excel, Word files supported (Max 25MB)</span>
              </div>
              {documentUploadError && <p role="alert" className="text-[11px] font-semibold text-rose-700">{documentUploadError}</p>}
              <div className="flex justify-end gap-2 border-t pt-4">
                <button disabled={isUploadingDocument} onClick={()=>setShowDocModal(false)} className="px-4 py-2 border rounded text-xs disabled:opacity-50">Cancel</button>
                <button disabled={isUploadingDocument} onClick={handleUploadDocumentSubmit} className="px-5 py-2 bg-[#091d64] text-white rounded font-bold text-xs disabled:opacity-50">
                  {isUploadingDocument ? 'Uploading...' : 'Submit Document'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Log Expense Modal (Treasurer) */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200 text-left">
            <div className="bg-[#091d64] text-white p-6 border-b border-slate-100">
              <h3 className="font-sans font-bold text-lg">Log Ledger Expense Item</h3>
              <p className="text-xs text-slate-300 mt-1">Audit transactions, payee details, and calculate automatic withholding tax.</p>
            </div>
            <div className="p-6 space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Expense Category</label>
                  <select value={expenseForm.category} onChange={(e)=>setExpenseForm({...expenseForm, category: e.target.value as any})} className="w-full p-2 border rounded text-xs">
                    <option value="Supplies">Supplies & Materials</option>
                    <option value="Honorarium">Honorariums</option>
                    <option value="Food & Catering">Food & Catering</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="mb-3 p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total SK Budget (Chairperson)</span>
                  <span className="text-sm font-black text-[#091d64] mt-0.5 block">₱{Number(currentTenant?.totalBudget || currentTenant?.allocatedBudget || 0).toLocaleString()}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Pick a program allocation below to deduct from</span>
                </div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Program Budget Allocation *</label>
                <select
                  value={expenseForm.budgetId}
                  onChange={(e) => {
                    const newBudgetId = e.target.value;
                    const selectedBudget = budgetOptions.find((b: any) => b.id === newBudgetId);
                    const matchedProgram = programs.find(p => p.title === selectedBudget?.category);
                    setExpenseForm({ ...expenseForm, budgetId: newBudgetId, programId: matchedProgram?.id || '' });
                  }}
                  className="w-full p-2 border rounded text-xs"
                  disabled={isLoadingBudgets || budgetOptions.length === 0}
                  required
                >
                  <option value="">{isLoadingBudgets ? 'Loading current-year budgets...' : 'Select a budget allocation'}</option>
                  {budgetOptions.map((budget) => (
                    <option key={budget.id} value={budget.id}>
                      {budget.category}
                    </option>
                  ))}
                </select>
                {budgetOptions.length === 0 && !isLoadingBudgets && (
                  <p className="mt-1 text-[10px] text-rose-600">No current-year budgets are available for this barangay.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Gross invoice *</label>
                  <input type="number" value={expenseForm.amount} onChange={(e)=>setExpenseForm({...expenseForm, amount: parseInt(e.target.value)||0})} className="w-full p-2 border rounded text-xs font-mono font-bold" required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Payee Supplier *</label>
                  <input type="text" value={expenseForm.supplier} onChange={(e)=>setExpenseForm({...expenseForm, supplier: e.target.value})} className="w-full p-2 border rounded text-xs" placeholder="e.g. Naga Foods Inc." required />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tax Classification Group</label>
                <select value={expenseForm.taxType} onChange={(e)=>setExpenseForm({...expenseForm, taxType: e.target.value as any})} className="w-full p-2 border rounded text-xs">
                  <option value="VAT">VAT Registered (12% tax base with 2% withhold)</option>
                  <option value="Non-VAT">Non-VAT Registered (3% tax withhold)</option>
                  <option value="Exempt">VAT / Tax Exempt</option>
                </select>
              </div>

              {/* Automated withholding math */}
              <div className="bg-slate-50 border p-4 rounded-lg space-y-1.5 text-xs font-semibold">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Automated Treasurer Deductions</span>
                <div className="flex justify-between"><span>Gross Invoice Amount:</span><span className="font-mono">₱{expenseForm.amount.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Input VAT Base:</span><span className="font-mono text-slate-600">₱{calcVat.toLocaleString()}</span></div>
                <div className="flex justify-between text-rose-600"><span>Withholding Tax:</span><span className="font-mono font-bold">-₱{calcWithholding.toLocaleString()}</span></div>
                <div className="flex justify-between border-t pt-1.5 text-[#091d64] text-sm font-bold"><span>Net Payable Amount:</span><span className="font-mono text-base">₱{calcNet.toLocaleString()}</span></div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                {expenseSaveError && <p role="alert" className="mr-auto self-center text-[10px] text-rose-700">{expenseSaveError}</p>}
                <button disabled={isSavingExpense} onClick={()=>setShowExpenseModal(false)} className="px-4 py-2 border rounded text-xs disabled:opacity-50">Cancel</button>
                <button disabled={isSavingExpense || isLoadingBudgets || budgetOptions.length === 0} onClick={handleLogExpenseSubmit} className="px-5 py-2 bg-[#091d64] text-white rounded font-bold text-xs disabled:opacity-50">
                  {isSavingExpense ? 'Saving...' : 'Log Transaction'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Draft Resolution Modal (Kagawad) */}
      {showResModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200 text-left text-xs font-semibold">
            <div className="bg-[#091d64] text-white p-6 border-b border-slate-100">
              <h3 className="font-sans font-bold text-lg">Draft Council Legislation</h3>
              <p className="text-xs text-slate-300 mt-1">Specify resolution number and author listings for official voting tracks.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Resolution Title *</label>
                <textarea value={resForm.title} onChange={(e)=>setResForm({...resForm, title: e.target.value})} className="w-full p-2 border rounded text-xs" rows={3} placeholder="Explain the exact purpose of this council resolution..." required />
              </div>
              <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Resolution Number *</label>
                  <input type="text" value={resForm.number} onChange={(e)=>setResForm({...resForm, number: e.target.value})} className="w-full p-2 border rounded font-mono text-xs" required />
                </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Voting Close Date *</label>
                <input
                  type="date"
                  value={resForm.endDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setResForm({ ...resForm, endDate: e.target.value })}
                  className="w-full p-2 border rounded text-xs"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 border-t pt-4">
                <button disabled={isSavingResolution} onClick={()=>setShowResModal(false)} className="px-4 py-2 border rounded text-xs disabled:opacity-50">Cancel</button>
                <button disabled={isSavingResolution} onClick={handleDraftResolutionSubmit} className="px-5 py-2 bg-[#091d64] text-white rounded font-bold text-xs disabled:opacity-50">
                  {isSavingResolution ? 'Saving...' : 'Create Voting Poll'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add Inventory Item Modal (Treasurer) */}
      {showInvModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200 text-left text-xs font-semibold">
            <div className="bg-[#091d64] text-white p-6 border-b border-slate-100">
              <h3 className="font-sans font-bold text-lg">Register Council Property Asset</h3>
              <p className="text-xs text-slate-300 mt-1">Input unit cost, quantity levels, and storage details of SK assets.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Property Item Description *</label>
                <input type="text" value={invForm.item} onChange={(e)=>setInvForm({...invForm, item: e.target.value})} className="w-full p-2 border rounded text-xs" placeholder="e.g. Foldable Event Tents (10x10)" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category Group</label>
                  <select value={invForm.category} onChange={(e)=>setInvForm({...invForm, category: e.target.value})} className="w-full p-2 border rounded text-xs">
                    <option value="Sports Equipment">Sports Equipment</option>
                    <option value="Office IT Equipment">Office IT Equipment</option>
                    <option value="Event Furniture">Event Furniture</option>
                    <option value="Audio-Visual">Audio-Visual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Condition Status</label>
                  <select value={invForm.condition} onChange={(e)=>setInvForm({...invForm, condition: e.target.value})} className="w-full p-2 border rounded text-xs">
                    <option value="Good">Good Condition</option>
                    <option value="Needs Repair">Needs Repair</option>
                    <option value="Damaged">Damaged</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quantity Tracked</label>
                  <input type="number" value={invForm.quantity} onChange={(e)=>setInvForm({...invForm, quantity: parseInt(e.target.value)||1})} className="w-full p-2 border rounded text-xs font-bold font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Unit purchase Cost (₱)</label>
                  <input type="number" value={invForm.cost} onChange={(e)=>setInvForm({...invForm, cost: parseInt(e.target.value)||0})} className="w-full p-2 border rounded text-xs font-bold font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Storage Location venue *</label>
                <input type="text" value={invForm.location} onChange={(e)=>setInvForm({...invForm, location: e.target.value})} className="w-full p-2 border rounded text-xs" required />
              </div>
              <div className="flex justify-end gap-2 border-t pt-4">
                <button onClick={()=>setShowInvModal(false)} className="px-4 py-2 border rounded text-xs">Cancel</button>
                <button onClick={handleRegisterInventorySubmit} className="px-5 py-2 bg-[#091d64] text-white rounded font-bold text-xs">Register Asset</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Feedback Response Modal (Kagawad) */}
      {showFeedbackModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200 text-left text-xs font-semibold">
            <div className="bg-[#091d64] text-white p-6 border-b border-slate-100">
              <h3 className="font-sans font-bold text-lg">Respond to Boses ng Kabataan Entry</h3>
              <p className="text-xs text-slate-300 mt-1">Provide an official SK response and update resolution status.</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 space-y-1">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
                  <span>{selectedFeedback.type} • {selectedFeedback.anonymous ? 'Anonymous' : selectedFeedback.submittedBy}</span>
                  <span>{selectedFeedback.dateSubmitted}</span>
                </div>
                <p className="font-bold text-slate-800 text-xs">{selectedFeedback.title}</p>
                <p className="text-slate-600 text-[11px] leading-relaxed">{selectedFeedback.content}</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Update Status *</label>
                <select 
                  value={feedbackStatusChoice} 
                  onChange={(e) => setFeedbackStatusChoice(e.target.value as any)}
                  className="w-full p-2 border border-slate-200 rounded text-xs bg-white focus:ring-1 focus:ring-[#091d64] focus:outline-none"
                >
                  <option value="Reviewed">Under Review (Acknowledged & Processing)</option>
                  <option value="Resolved">Resolved (Official Action Completed)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Official SK Council Response *</label>
                <textarea 
                  value={feedbackResponseText} 
                  onChange={(e) => setFeedbackResponseText(e.target.value)} 
                  rows={4} 
                  placeholder="Type the official committee response or action taken..." 
                  className="w-full p-2.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-[#091d64] focus:outline-none" 
                  required 
                />
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button onClick={() => setShowFeedbackModal(false)} className="px-4 py-2 border rounded text-xs">Cancel</button>
                <button onClick={handleSaveFeedbackResponse} className="px-5 py-2 bg-[#091d64] text-white rounded font-bold text-xs">Post Official Response</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. View Document Details Modal */}
      {showReviewDocModal && selectedDoc && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between p-6 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{selectedDoc.category}</span>
                <h3 className="font-sans font-bold text-lg mt-2 leading-snug text-slate-900">{selectedDoc.title}</h3>
                <p className="text-xs text-slate-500 mt-1 font-mono">Tracking No: {selectedDoc.resolutionNumber || selectedDoc.id}</p>
              </div>
              <button onClick={() => { setShowReviewDocModal(false); setSelectedDoc(null); }} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Uploaded By</span>
                  <span className="font-bold text-slate-800 block mt-1">{selectedDoc.uploadedBy}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Uploaded Date</span>
                  <span className="font-bold text-slate-800 block mt-1">{selectedDoc.uploadedDate}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Designated Approver</span>
                  <span className="font-bold text-[#091d64] block mt-1">{selectedDoc.designatedApprover || currentTenant?.chairperson || 'SK Chairperson'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Current Status</span>
                  <span className="font-bold text-amber-700 block mt-1">{selectedDoc.status}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Description</span>
                <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed text-xs">{selectedDoc.description || 'No description provided.'}</p>
              </div>

              <div className="flex items-center justify-between gap-3 p-3 bg-blue-50/60 border border-blue-100 rounded-lg">
                <div className="text-xs">
                  <p className="font-bold text-[#091d64]">Attached File</p>
                  <p className="text-slate-500 text-[10px]">{(selectedDoc as any).fileUrl ? 'File ready to preview' : 'No file attached'}</p>
                </div>
                <button type="button" onClick={() => {
                  const url = (selectedDoc as any).fileUrl;
                  if (url) { window.open(url, '_blank'); return; }
                  alert('No file attached to this document.');
                }} className="px-4 py-2 bg-[#091d64] hover:bg-[#122878] text-white font-bold rounded-lg text-xs flex items-center gap-1.5">
                  <Eye className="w-4 h-4" /> View Original File
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Review Notes</label>
                <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={3} className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#091d64]" placeholder="Optional notes for the document author..." />
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-slate-100 p-4 bg-slate-50">
              <button onClick={() => { setShowReviewDocModal(false); setSelectedDoc(null); }} className="px-4 py-2 border border-slate-200 bg-white rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
              <div className="flex gap-2">
                <button onClick={async () => { if (!onRejectDocument || !selectedDoc) return; setIsReviewingDoc(true); try { await onRejectDocument(selectedDoc.id, reviewNotes || 'Rejected by reviewer.'); setShowReviewDocModal(false); setSelectedDoc(null); } catch (err: any) { alert((err && err.message) ? err.message : 'Reject failed.'); } finally { setIsReviewingDoc(false); } }} disabled={isReviewingDoc || !onRejectDocument} className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"><X className="w-4 h-4" /> Reject</button>
                <button onClick={async () => { if (!onApproveDocument || !selectedDoc) return; setIsReviewingDoc(true); try { await onApproveDocument(selectedDoc.id, reviewNotes || 'Approved.'); setShowReviewDocModal(false); setSelectedDoc(null); } catch (err: any) { alert((err && err.message) ? err.message : 'Approve failed.'); } finally { setIsReviewingDoc(false); } }} disabled={isReviewingDoc || !onApproveDocument} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"><CheckCircle2 className="w-4 h-4" /> Approve</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showViewDocModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200 text-left">
            <div className="bg-[#091d64] text-white p-6 flex justify-between items-start">
              <button onClick={() => setShowViewDocModal(false)} className="text-slate-300 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6 text-xs text-slate-600 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Approval Status</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase inline-block mt-1 ${
                    selectedDoc.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' :
                    selectedDoc.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                    selectedDoc.status === 'Draft' ? 'bg-slate-100 text-slate-600' : 'bg-rose-50 text-rose-700'
                  }`}>{selectedDoc.status}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Uploaded Date</span>
                  <span className="font-bold text-slate-800 font-mono block mt-1">{selectedDoc.uploadedDate}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">File Size</span>
                  <span className="font-bold text-slate-800 block mt-1">{selectedDoc.fileSize || '2.4 MB'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Designated Approver</span>
                  <span className="font-bold text-[#091d64] block mt-1">{selectedDoc.designatedApprover || 'SK Chairperson'}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase mb-1">Document Description & Scope</h4>
                <p className="text-slate-600 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">{selectedDoc.description || 'Official Sangguniang Kabataan document recorded in compliance with DILG guidelines.'}</p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase mb-3 flex items-center gap-2">
                  <History className="w-4 h-4 text-[#091d64]" /> Document History
                </h4>
                <div className="space-y-2">
                  {selectedDoc.history && selectedDoc.history.length > 0 ? (
                    selectedDoc.history.map((h, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-start gap-4">
                        <div>
                          <span className="font-bold text-slate-800 block text-xs">{h.action}</span>
                          <span className="text-[10px] text-slate-400 block">{h.user} • {h.notes || 'No notes provided.'}</span>
                        </div>
                        <span className="font-mono text-[10px] font-bold text-slate-500 whitespace-nowrap">{h.date}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 italic">No previous history logged for this document.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                <button 
                  onClick={() => {
                    const url = (selectedDoc as any).fileUrl;
                    if (url) { window.open(url, '_blank'); return; }
                    alert('No file attached to this document. It may be a metadata-only record.');
                  }}
                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Download Official File
                </button>
                <button onClick={() => setShowViewDocModal(false)} className="px-5 py-2 bg-[#091d64] text-white font-bold rounded-lg text-xs">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. Edit Document Details Modal */}
      {showEditDocModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200 text-left">
            <div className="bg-[#091d64] text-white p-6">
              <h3 className="font-sans font-bold text-lg">Edit Document Details</h3>
              <p className="text-xs text-slate-300 mt-1">Update repository metadata and designated approvers.</p>
            </div>
            <div className="p-6 space-y-4 text-xs font-semibold text-slate-700">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Document Title *</label>
                <input 
                  type="text" 
                  value={selectedDoc.title} 
                  onChange={(e) => setSelectedDoc({ ...selectedDoc, title: e.target.value })} 
                  className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-[#091d64]" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
                  <select 
                    value={selectedDoc.category} 
                    onChange={(e) => {
                      const newCat = e.target.value as any;
                      setSelectedDoc({ 
                        ...selectedDoc, 
                        category: newCat,
                        designatedApprover: getDefaultApproverForCategory(newCat)
                      });
                    }} 
                    className="w-full p-2 border border-slate-200 rounded text-xs"
                  >
                    <option value="Resolutions">Resolutions</option>
                    <option value="Vouchers">Vouchers</option>
                    <option value="Reports">Reports</option>
                    <option value="Budget">Budget</option>
                    <option value="Minutes">Meeting Minutes</option>
                    <option value="Communications">Communications</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Resolution / Tracking No.</label>
                  <input 
                    type="text" 
                    value={selectedDoc.resolutionNumber || ''} 
                    onChange={(e) => setSelectedDoc({ ...selectedDoc, resolutionNumber: e.target.value })} 
                    className="w-full p-2 border border-slate-200 rounded text-xs font-mono" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Designated Approver / Sign-Off Official (RA 10742)</label>
                <select 
                  value={selectedDoc.designatedApprover || currentTenant?.chairperson || 'SK Chairperson'} 
                  onChange={(e) => setSelectedDoc({ ...selectedDoc, designatedApprover: e.target.value })} 
                  className="w-full p-2 border border-slate-200 rounded text-xs font-semibold text-[#091d64]"
                >
                  <option value={currentTenant?.chairperson || 'SK Chairperson'}>1. {currentTenant?.chairperson || 'SK Chairperson'} (SK Chairperson / Barangay Admin)</option>
                  <option value={currentUser?.full_name || 'SK Treasurer'}>2. {currentUser?.full_name || 'SK Treasurer'} (SK Treasurer)</option>
                  <option value="Council Secretariat / SK Secretary">3. Council Secretariat / SK Secretary</option>
                  <option value="Committee Chair & SK Council">4. Committee Chair & SK Kagawads (Council Members)</option>
                  <option value="DILG Local Government Officer">5. DILG Local Government Officer</option>
                  <option value="Barangay Captain & SK Council">6. Barangay Captain & SK Council</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description</label>
                <textarea 
                  value={selectedDoc.description || ''} 
                  onChange={(e) => setSelectedDoc({ ...selectedDoc, description: e.target.value })} 
                  rows={3} 
                  className="w-full p-2 border border-slate-200 rounded text-xs" 
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button onClick={() => setShowEditDocModal(false)} className="px-4 py-2 border rounded-lg text-xs">Cancel</button>
                <button onClick={handleSaveDocEdit} className="px-5 py-2 bg-[#091d64] text-white font-bold rounded-lg text-xs">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. View / Edit Katipunan Constituent Profile Modal */}
      {showYouthDetailModal && selectedYouthProfile && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200 text-left">
            <div className="bg-[#091d64] text-white p-6 flex justify-between items-center">
              <div className="flex items-center gap-3">
                  <ProfileAvatar name={selectedYouthProfile.name} src={selectedYouthProfile.profilePic} alt={selectedYouthProfile.name} className="w-12 h-12 rounded-xl border-2 border-white/20" />
                <div>
                  <h3 className="font-sans font-bold text-base">{selectedYouthProfile.name}</h3>
                  <p className="text-xs text-slate-300 font-mono">ID: {selectedYouthProfile.id} • {selectedYouthProfile.zone}</p>
                </div>
              </div>
              <button onClick={() => setShowYouthDetailModal(false)} className="text-slate-300 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-semibold text-slate-700 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">First Name *</label>
                    <input 
                      type="text" 
                      value={youthEditForm.first_name || ''} 
                      onChange={(e) => setYouthEditForm({ ...youthEditForm, first_name: e.target.value })} 
                      className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-[#091d64]" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Last Name *</label>
                    <input 
                      type="text" 
                      value={youthEditForm.last_name || ''} 
                      onChange={(e) => setYouthEditForm({ ...youthEditForm, last_name: e.target.value })} 
                      className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-[#091d64]" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Middle Name</label>
                    <input 
                      type="text" 
                      value={youthEditForm.middle_name || ''} 
                      onChange={(e) => setYouthEditForm({ ...youthEditForm, middle_name: e.target.value })} 
                      className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-[#091d64]" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Suffix</label>
                    <select 
                      value={youthEditForm.suffix || ''} 
                      onChange={(e) => setYouthEditForm({ ...youthEditForm, suffix: e.target.value })} 
                      className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-[#091d64]" 
                    >
                      <option value="">None</option>
                      <option value="Jr.">Jr.</option>
                      <option value="Sr.">Sr.</option>
                      <option value="II">II</option>
                      <option value="III">III</option>
                      <option value="IV">IV</option>
                      <option value="V">V</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Barangay Zone *</label>
                  <select 
                    value={youthEditForm.zone} 
                    onChange={(e) => setYouthEditForm({ ...youthEditForm, zone: e.target.value })} 
                    className="w-full p-2 border border-slate-200 rounded text-xs"
                  >
                    <option value="Zone 1">Zone 1</option>
                    <option value="Zone 2">Zone 2</option>
                    <option value="Zone 3">Zone 3</option>
                    <option value="Zone 4">Zone 4</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email Address *</label>
                  <input 
                    type="email" 
                    value={youthEditForm.email} 
                    onChange={(e) => setYouthEditForm({ ...youthEditForm, email: e.target.value })} 
                    className="w-full p-2 border border-slate-200 rounded text-xs" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mobile Contact *</label>
                  <input 
                    type="text" 
                    value={youthEditForm.mobile} 
                    onChange={(e) => setYouthEditForm({ ...youthEditForm, mobile: e.target.value })} 
                    className="w-full p-2 border border-slate-200 rounded text-xs font-mono" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Educational Level</label>
                  <input 
                    type="text" 
                    value={youthEditForm.educationalLevel} 
                    onChange={(e) => setYouthEditForm({ ...youthEditForm, educationalLevel: e.target.value })} 
                    className="w-full p-2 border border-slate-200 rounded text-xs" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Scholarship Status</label>
                  <select 
                    value={youthEditForm.scholarStatus} 
                    onChange={(e) => setYouthEditForm({ ...youthEditForm, scholarStatus: e.target.value as any })} 
                    className="w-full p-2 border border-slate-200 rounded text-xs"
                  >
                    <option value="Scholar">Scholar Grantee</option>
                    <option value="Non-Scholar">Non-Scholar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">School / University Institute</label>
                <input 
                  type="text" 
                  value={youthEditForm.school} 
                  onChange={(e) => setYouthEditForm({ ...youthEditForm, school: e.target.value })} 
                  className="w-full p-2 border border-slate-200 rounded text-xs" 
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Registry Status:</span>
                <span className={`px-2 py-0.5 rounded font-black uppercase ${
                  selectedYouthProfile.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {selectedYouthProfile.status === 'Approved' ? 'Verified Constituent' : 'Pending Verification'}
                </span>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button onClick={() => setShowYouthDetailModal(false)} className="px-4 py-2 border rounded-lg text-xs">Cancel</button>
                <button 
                  onClick={async () => {
                    const _split = (youthEditForm.first_name || youthEditForm.last_name)
                      ? { first_name: youthEditForm.first_name, middle_name: youthEditForm.middle_name, last_name: youthEditForm.last_name, suffix: youthEditForm.suffix }
                      : splitFullName(youthEditForm.name || '');
                    const _composedName = composeFullName(_split) || youthEditForm.name;
                    const updated = { ...selectedYouthProfile, ...youthEditForm, ..._split, name: _composedName };
                    setLocalYouthProfiles(prev => prev.map(y => y.id === selectedYouthProfile.id ? updated : y));
                    try {
                      const result = await kabisigApi.updateProfile(updated, selectedYouthProfile.userId);
                      if (!result.success) {
                        alert('Save failed: ' + (result.message || 'Unable to update profile. You may not have permission to edit this user.'));
                        return;
                      }
                      setShowYouthDetailModal(false);
                      alert('Profile updated for ' + _composedName + '!');
                    } catch (err: any) {
                      console.warn('Save error:', err);
                      alert('Save failed: ' + (err?.message || 'Unknown error.'));
                    }
                  }}
                  className="px-5 py-2 bg-[#091d64] text-white font-bold rounded-lg text-xs cursor-pointer"
                >
                  Save Profile Updates
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 11. Katipunan ng Kabataan Beneficiaries Summary Modal */}
      {showBeneficiariesModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200 text-left">
            <div className="bg-[#091d64] text-white p-6 flex justify-between items-center">
              <div>
                <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-200 text-[10px] font-black uppercase rounded tracking-wider">
                  KATIPUNAN NG KABATAAN MASTERLIST
                </span>
                <h3 className="font-sans font-bold text-lg mt-1">Beneficiaries Demographic Summary</h3>
                <p className="text-xs text-slate-300 mt-0.5">Barangay {currentTenant?.name || 'Barangay'} Youth Registry Analytics</p>
              </div>
              <button onClick={() => setShowBeneficiariesModal(false)} className="text-slate-300 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs text-slate-600 max-h-[75vh] overflow-y-auto">
              {/* KPI Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-[#091d64] uppercase block">Total Verified Youth</span>
                  <h4 className="text-2xl font-black text-[#091d64]">{localYouthProfiles.filter(p => p.status === 'Approved').length}</h4>
                  <span className="text-[10px] text-slate-400 block">Active KK Roster</span>
                </div>
                <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-indigo-800 uppercase block">Scholar Grantees</span>
                  <h4 className="text-2xl font-black text-indigo-900">{localYouthProfiles.filter(p => p.scholarStatus === 'Scholar').length}</h4>
                  <span className="text-[10px] text-slate-400 block">Katipunan Scholars</span>
                </div>
                <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Pending Review</span>
                  <h4 className="text-2xl font-black text-emerald-900">{localYouthProfiles.filter(p => p.status === 'Pending').length}</h4>
                  <span className="text-[10px] text-slate-400 block">Verification Queue</span>
                </div>
                <div className="p-4 bg-violet-50/60 border border-violet-100 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-violet-800 uppercase block">Zones Covered</span>
                  <h4 className="text-2xl font-black text-violet-900">{new Set(localYouthProfiles.map(profile => profile.zone).filter(Boolean)).size}</h4>
                  <span className="text-[10px] text-slate-400 block">Registered zones</span>
                </div>
              </div>

              {/* Zone Breakdown Table */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase mb-2">Zone Demographic Distribution</h4>
                <div className="overflow-x-auto border border-slate-100 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-2.5">Barangay Zone</th>
                        <th className="px-4 py-2.5 text-center">Verified Youth</th>
                        <th className="px-4 py-2.5 text-center">Scholars</th>
                        <th className="px-4 py-2.5 text-center">Percentage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4'].map(z => {
                        const zoneCount = localYouthProfiles.filter(y => y.zone === z && y.status === 'Approved').length;
                        const zoneScholars = localYouthProfiles.filter(y => y.zone === z && y.scholarStatus === 'Scholar').length;
                        const total = localYouthProfiles.filter(y => y.status === 'Approved').length || 1;
                        const pct = ((zoneCount / total) * 100).toFixed(1);
                        return (
                          <tr key={z} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-bold text-slate-800">{z}</td>
                            <td className="px-4 py-2.5 text-center font-bold text-[#091d64]">{zoneCount}</td>
                            <td className="px-4 py-2.5 text-center font-bold text-indigo-700">{zoneScholars}</td>
                            <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-600">{pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Educational Attainment Breakdown */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase mb-2">Educational Attainment Profile</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">College / Tertiary</span>
                    <span className="text-lg font-bold text-slate-800 block mt-1">
                      {localYouthProfiles.filter(y => y.educationalLevel?.includes('College') || y.educationalLevel?.includes('Tertiary')).length}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Senior / Junior High</span>
                    <span className="text-lg font-bold text-slate-800 block mt-1">
                      {localYouthProfiles.filter(y => y.educationalLevel?.includes('High School')).length}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Vocational / Out-of-School</span>
                    <span className="text-lg font-bold text-slate-800 block mt-1">
                      {localYouthProfiles.filter(y => y.educationalLevel?.includes('Vocational') || y.educationalLevel?.includes('OSY')).length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                <button onClick={() => setShowBeneficiariesModal(false)} className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 flex justify-around items-center z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        {menuConfig[currentRole]?.slice(0, 4).map(menu => {
          const Icon = menu.icon;
          const isActive = activeMenu === menu.id;
          return (
            <button
              key={menu.id}
              onClick={() => { setActiveMenu(menu.id); setSearchTerm(''); setFilterCategory('All'); }}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
                isActive ? 'text-[#091d64] font-extrabold bg-blue-50/80' : 'text-slate-400 font-medium hover:text-slate-600'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#091d64] scale-110' : 'text-slate-400'} transition-transform`} />
              <span className="text-[10px] mt-0.5 tracking-tight font-sans truncate max-w-[64px]">{menu.label.split(' ')[0]}</span>
            </button>
          );
        })}
        {menuConfig[currentRole] && menuConfig[currentRole].length > 4 && (
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-400 font-medium hover:text-slate-600 cursor-pointer"
          >
            <Menu className="w-5 h-5 text-slate-400" />
            <span className="text-[10px] mt-0.5 tracking-tight font-sans">More</span>
          </button>
        )}
      </div>

    </div>
  );
}
