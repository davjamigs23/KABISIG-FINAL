import NotificationMenu from './NotificationMenu';
import { formatPhilippineDate, formatPhilippineDateTime } from '../lib/dateUtils';
/* PDF Export Available */ import { generateBudgetUtilizationReport } from '../lib/pdfReports';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ProfileSettings from './ProfileSettings';
import { formatAuditDetails } from '../lib/auditFormatter';
import { formatOfficialName } from '../lib/officialFormatting';
import { 
  LayoutDashboard, Building2, BarChart3, History, 
  Plus, Edit2, Search, Filter, Download, FileSpreadsheet,
  CheckCircle2, AlertTriangle, Users, Wallet, Calendar,
  ArrowUpRight, Lock, Eye, ShieldCheck, FileText, Check,
  X, ChevronDown, RefreshCw, Layers, Award, TrendingUp, LogOut, Menu,
  Upload, Image as ImageIcon, Trash2, Mail, Loader2, Settings, AlertCircle,
  ShieldAlert
, ArrowLeft, Clock } from 'lucide-react';
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
import PopupDialog, { PopupMessage } from './PopupDialog';
import { useRealtimeData } from '../hooks/useRealtimeData';

const isPendingChair = (chair: any) => {
  if (!chair) return false;
  const status = String(chair.status || '').trim().toLowerCase();
  return status === 'pending'
    || status === 'pending_invite'
    || chair.is_pending === true
    || chair.setup_completed === false
    || chair.full_name?.trim() === 'SK Chairperson'
    || chair.full_name?.trim() === 'Pending Invitation';
};

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

interface FederationBarangayAnalyticsRow {
  id: string;
  registered_youth?: number | string | null;
  allocated_amount?: number | string | null;
  aip_budget?: number | string | null;
  budget_allocated?: number | string | null;
  spent_amount?: number | string | null;
  actual_spent?: number | string | null;
  budget_spent?: number | string | null;
  active_programs?: number | string | null;
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
  const allOfficialsQuery = useQuery({
    queryKey: ['all-officials'],
    queryFn: async () => {
      if (!kabisigApi.getToken()) {
        throw new Error('Your session has expired. Please sign in again.');
      }
      const response = await kabisigApi.getAllOfficials();
      if (!response.success || !Array.isArray(response.data)) {
        throw new Error(response.message || 'Unable to load officials.');
      }
      return response.data;
    },
    enabled: Boolean(kabisigApi.getToken()),
  });
  const barangaysQuery = useQuery({
    queryKey: ['barangays'],
    queryFn: async () => {
      const response = await kabisigApi.getBarangays();
      return Array.isArray(response) ? response : [];
    },
    enabled: Boolean(kabisigApi.getToken()),
  });
  useRealtimeData({
    table: 'users',
    queryKey: ['all-officials'],
    filter: 'role_id=in.(2,3)',
    enabled: Boolean(kabisigApi.getToken()),
  });

  const toNumber = (value: number | string | null | undefined) => {
    const parsed = typeof value === 'number' ? value : Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const isDisplayedOfficial = (official: any) =>
    official?.status === 'active'
    && !String(official?.full_name || '').toLowerCase().includes('pending');
  const [activeMenu, setActiveMenu] = useState<string>('dashboard');
  const [popupMsg, setPopupMsg] = useState<PopupMessage | null>(null);
  const [confirmMsg, setConfirmMsg] = useState<PopupMessage | null>(null);
  const showPopup = (message: string, type: PopupMessage['type'] = 'error') => {
    setPopupMsg({
      title: type === 'success' ? 'Success' : type === 'error' ? 'Notice' : type === 'warning' ? 'Warning' : 'Information',
      message,
      type,
    });
  };
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  useEffect(() => {
    const handleFocus = () => {
      // Refetch the federation data when the window regains focus
      if (typeof onRefreshAuditLogs === 'function') onRefreshAuditLogs();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [onRefreshAuditLogs]);
useEffect(() => {
    
    let cancelled = false;
    (async () => {
      try {
        const res = await kabisigApi.getCurrentUser();
        if (!cancelled) setCurrentUser(res?.data?.user || res?.user || res?.data || res || null);
      } catch { /* silent - fallback stays */ }
    })();
    return () => { cancelled = true; };
  }, []);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [auditSearchTerm, setAuditSearchTerm] = useState('');

  // LYDP Report Modal
  const [showLydpModal, setShowLydpModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showFixTypoModal, setShowFixTypoModal] = useState(false);
  const [typoUserId, setTypoUserId] = useState('');
  const [typoTargetUserId, setTypoTargetUserId] = useState('');
  const [typoTargetUser, setTypoTargetUser] = useState<{
    role_id: number;
    status: string | null;
    verification_status: string | null;
  } | null>(null);
  const [typoHasProfile, setTypoHasProfile] = useState(false);
  const [typoUserProfile, setTypoUserProfile] = useState<{ is_registered_voter: boolean } | null>(null);
  const [isResendingYouthLoginLink, setIsResendingYouthLoginLink] = useState(false);

  const handleLookupUser = async (searchValue = typoUserId) => {
    if (!searchValue.trim()) return;
    clearTypoLookupResult();
    setIsSearching(true);
    try {
      const res = await kabisigApi.lookupUser(searchValue.trim());
      if (!res.success || !res.data) {
        clearTypoLookupResult();
        setSearchBanner({ type: 'error', text: 'User not found.' });
        return;
      }

      const user = res.data.user || res.data;
      if (!user.id) {
        clearTypoLookupResult();
        setSearchBanner({ type: 'error', text: 'User not found.' });
        return;
      }
      const roleId = Number(user.role_id);
      if (String(user.status || '').trim().toLowerCase() === 'pending') {
        clearTypoLookupResult();
        if (roleId === 4) {
          showPopup('This Youth Constituent is still pending SK Chairperson approval.', 'warning');
        } else if ([2, 3].includes(roleId)) {
          showPopup('This SK Official is still in Pending Invite status.', 'warning');
        } else {
          showPopup('This user account is still pending approval.', 'warning');
        }
        return;
      }
      setIsEditingCreds(false);
      const joinedProfile = user.resident_profile;
      const profile = Array.isArray(joinedProfile) ? joinedProfile[0] || null : joinedProfile || null;
      setTypoTargetUserId(user.id);
      setTypoTargetUser({
        role_id: Number(user.role_id),
        status: user.status || null,
        verification_status: profile?.verification_status || user.verification_status || null,
      });
      setTypoHasProfile(Boolean(profile || user.has_profile));
      setTypoUserProfile({
        is_registered_voter: profile?.is_registered_voter === true || user.is_registered_voter === true,
      });
      const firstName = String(user.first_name || '').trim();
      const middleName = String(user.middle_name || '').trim();
      const lastName = String(user.last_name || '').trim();
      const suffix = String(user.suffix || '').trim();

      setTypoFirstName(firstName);
      setTypoMiddleName(middleName);
      setTypoLastName(lastName);
      setTypoSuffix(suffix);

      setTypoEmail(user.email || '');
      setTypoPhone(String(user.phone || ''));
      const birthdate = user.birthdate || profile?.birthdate;
      setTypoBirthdate(typeof birthdate === 'string' ? birthdate.slice(0, 10) : '');
      setTypoAddress(user.address || profile?.address || '');
      setTypoSex(user.sex || profile?.sex || '');
      setTypoZone(profile?.zone || '');
      setTypoCivilStatus(profile?.civil_status || profile?.marital_status || '');
      setTypoEducation(profile?.educational_status || '');
      setTypoSchool(profile?.school || '');
      setTypoCourse(profile?.course || '');
      setTypoYearLevel(profile?.year_level || '');
      setTypoEmploymentStatus(profile?.employment_status || '');
      setTypoScholarStatus(profile?.scholar_status || '');
      setTypoScholarshipType(profile?.scholarship_type || profile?.scholarship_source || '');
      setTypoFullName(String(user.full_name || '').trim() || [firstName, middleName, lastName, suffix].filter(Boolean).join(' '));
      setSearchBanner({ type: 'success', text: 'User account found!' });
    } catch (err: any) {
      clearTypoLookupResult();
      setSearchBanner({ type: 'error', text: err.message || 'Lookup failed.' });
      showPopup(err.message || 'Lookup failed.');
    } finally {
      setIsSearching(false);
    }
  };
  const canResendYouthLoginLink = typoTargetUser?.role_id === 4
    && ['active', 'pending'].includes(String(typoTargetUser.status || '').trim().toLowerCase())
    && String(typoTargetUser.verification_status || '').trim().toLowerCase() === 'pending';
  const handleResendYouthLoginLink = async () => {
    if (!typoTargetUserId || !canResendYouthLoginLink) return;
    setIsResendingYouthLoginLink(true);
    try {
      const response = await kabisigApi.resendYouthLoginLink(typoTargetUserId);
      if (!response.success) {
        showPopup(response.message || 'Failed to resend the Youth sign-in link.');
        return;
      }
      showPopup(response.message || 'Youth sign-in link sent successfully.', 'success');
    } catch (error: any) {
      showPopup(error?.message || 'Failed to resend the Youth sign-in link.');
    } finally {
      setIsResendingYouthLoginLink(false);
    }
  };
  const [typoFirstName, setTypoFirstName] = useState('');
  const [typoMiddleName, setTypoMiddleName] = useState('');
  const [typoLastName, setTypoLastName] = useState('');
  const [typoSuffix, setTypoSuffix] = useState('');
  const [typoFullName, setTypoFullName] = useState(''); // Keep for backward compatibility if needed
  const [typoEmail, setTypoEmail] = useState('');
  const [typoPhone, setTypoPhone] = useState('');
  const [typoBirthdate, setTypoBirthdate] = useState('');
  const [typoAddress, setTypoAddress] = useState('');
  const [typoSex, setTypoSex] = useState('');
  const [typoZone, setTypoZone] = useState('');
  const [typoCivilStatus, setTypoCivilStatus] = useState('');
  const [typoEducation, setTypoEducation] = useState('');
  const [typoSchool, setTypoSchool] = useState('');
  const [typoCourse, setTypoCourse] = useState('');
  const [typoYearLevel, setTypoYearLevel] = useState('');
  const [typoEmploymentStatus, setTypoEmploymentStatus] = useState('');
  const [typoScholarStatus, setTypoScholarStatus] = useState('');
  const [typoScholarshipType, setTypoScholarshipType] = useState('');
  const [typoReason, setTypoReason] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isEditingCreds, setIsEditingCreds] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [emailForm, setEmailForm] = useState({ current_email: '', new_email: '', reason: '' });
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailModalTab, setEmailModalTab] = useState<'update' | 'history'>('update');
  const [emailHistoryList, setEmailHistoryList] = useState<any[]>([]);
  const [isFetchingEmailHistory, setIsFetchingEmailHistory] = useState(false);
  const [searchBanner, setSearchBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const hasScholarStatus = /\bscholar\b/i.test(typoScholarStatus)
    && !/\b(?:not|non)[-\s]+scholar\b/i.test(typoScholarStatus);
  const clearTypoLookupResult = () => {
    setIsEditingCreds(false);
    setTypoTargetUserId('');
    setTypoTargetUser(null);
    setTypoHasProfile(false);
    setTypoUserProfile(null);
    setTypoFirstName('');
    setTypoMiddleName('');
    setTypoLastName('');
    setTypoSuffix('');
    setTypoFullName('');
    setTypoEmail('');
    setTypoPhone('');
    setTypoBirthdate('');
    setTypoAddress('');
    setTypoSex('');
    setTypoZone('');
    setTypoCivilStatus('');
    setTypoEducation('');
    setTypoSchool('');
    setTypoCourse('');
    setTypoYearLevel('');
    setTypoEmploymentStatus('');
    setTypoScholarStatus('');
    setTypoScholarshipType('');
    setTypoReason('');
    setSearchBanner(null);
  };

  // Dedicated Assign SK Chairperson Modal State (Email-only)
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningBarangay, setAssigningBarangay] = useState<BarangayTenant | null>(null);
  const assigningChairpersonName = assigningBarangay?.chairpersonUser?.full_name?.trim() || '';
  const assigningChairpersonStatus = assigningBarangay?.chairpersonUser?.status?.trim().toLowerCase();
  const assigningBarangayHasActiveChairperson = Boolean(
    assigningChairpersonName &&
    !['pending invitation', 'unassigned'].includes(assigningChairpersonName.toLowerCase()) &&
    (!assigningChairpersonStatus || assigningChairpersonStatus === 'active')
  );
  const assigningBarangayHasChairpersonUser = Boolean(assigningBarangay?.chairpersonUser);
  const [assignEmail, setAssignEmail] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignNotice, setAssignNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [assignSuccessMessage, setAssignSuccessMessage] = useState<string | null>(null);
  const [districtFilter, setDistrictFilter] = useState<'All' | 'North' | 'South' | 'West' | 'East'>('All');
  const [chairpersonFilter, setChairpersonFilter] = useState<'All' | 'Assigned' | 'Pending' | 'Unassigned'>('All');
  // Panel rec #9: Transfer Leadership modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [historyBarangay, setHistoryBarangay] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const handleOpenHistory = async (b: any) => {
    setHistoryBarangay(b);
    setHistoryData([]);
    setIsLoadingHistory(true);
    try {
      const res = await kabisigApi.getTransferHistory(b.id);
      if (res.success && Array.isArray(res.data)) setHistoryData(res.data);
    } catch (e) { console.error(e); }
    finally { setIsLoadingHistory(false); }
  };
  const handleLoadEmailHistory = async () => {
    setEmailHistoryList([]);
    setIsFetchingEmailHistory(true);
    try {
      const res = await kabisigApi.getEmailHistory();
      if (!res.success) {
        showPopup(res.message || 'Unable to load email change history.');
        return;
      }
      if (!Array.isArray(res.data)) {
        showPopup('The email history endpoint returned an invalid response.');
        return;
      }
      const validEmailHistory = res.data
        .map((log: any) => {
          let details = log?.details;
          if (typeof details === 'string') {
            try {
              details = JSON.parse(details);
            } catch {
              return null;
            }
          }
          if (!details || typeof details !== 'object' || !details.new_email) return null;
          return { ...log, details };
        })
        .filter((log): log is any => Boolean(log));
      setEmailHistoryList(validEmailHistory);
    } catch (error) {
      showPopup(error instanceof Error ? error.message : 'Unable to load email change history.');
    } finally {
      setIsFetchingEmailHistory(false);
    }
  };
  const [transferringBarangay, setTransferringBarangay] = useState<BarangayTenant | null>(null);
  const [transferReturnToConfigure, setTransferReturnToConfigure] = useState(false);
  const [cancelInviteReturnToConfigure, setCancelInviteReturnToConfigure] = useState(false);
  const [assignReturnToConfigure, setAssignReturnToConfigure] = useState(false);
  const [transferCurrentChair, setTransferCurrentChair] = useState<{ email: string; name: string } | null>(null);
  const [transferSuccessorEmail, setTransferSuccessorEmail] = useState('');
  const [transferReason, setTransferReason] = useState<'Resigned' | 'End of Term' | 'Succession' | 'Other' | ''>('');
  const [transferNotes, setTransferNotes] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferNotice, setTransferNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // Cancel pending Chairperson invitation state
  const [showCancelInviteModal, setShowCancelInviteModal] = useState(false);
  const [cancellingBarangay, setCancellingBarangay] = useState<BarangayTenant | null>(null);
  const [isCancellingInvite, setIsCancellingInvite] = useState(false);
  const [cancelInviteNotice, setCancelInviteNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // P12b: Restricted users panel state
  const [restrictions, setRestrictions] = useState<any[]>([]);
  const [restrictionsLoading, setRestrictionsLoading] = useState(false);
  const [restrictionsFilter, setRestrictionsFilter] = useState<'all' | 'active'>('all');
  const [restrictionsNotice, setRestrictionsNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [clearingId, setClearingId] = useState<string | null>(null);

  // P9/P10: SK Official invite modal state
  const [showInviteOfficialModal, setShowInviteOfficialModal] = useState(false);
  const [inviteOfficialBarangay, setInviteOfficialBarangay] = useState<BarangayTenant | null>(null);
  const [inviteReturnToConfigure, setInviteReturnToConfigure] = useState(false);
  const [inviteOfficialEmail, setInviteOfficialEmail] = useState('');
  const inviteOfficialEmailRef = useRef('');
  const [inviteOfficialRole, setInviteOfficialRole] = useState<'SK Kagawad' | 'SK Secretary' | 'SK Treasurer' | ''>('');
  const [isInvitingOfficial, setIsInvitingOfficial] = useState(false);
  const [inviteOfficialNotice, setInviteOfficialNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pendingOfficialToCancel, setPendingOfficialToCancel] = useState<any>(null);
  const [isCancellingOfficialInvite, setIsCancellingOfficialInvite] = useState(false);
  const [isResendingOfficialId, setIsResendingOfficialId] = useState<string | null>(null);
  const [cancelOfficialInviteNotice, setCancelOfficialInviteNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // Role capacity for the selected barangay
  const [roleCapacity, setRoleCapacity] = useState<any>(null);
  const [isLoadingCapacity, setIsLoadingCapacity] = useState(false);
  const [showOfficialsModal, setShowOfficialsModal] = useState(false);
  const [officialsModalBarangay, setOfficialsModalBarangay] = useState<BarangayTenant | null>(null);
  const [officialsRoster, setOfficialsRoster] = useState<any>(null);
  const [officialsRosterLoading, setOfficialsRosterLoading] = useState(false);
  const [officialsRosterError, setOfficialsRosterError] = useState<string | null>(null);
  const [showAllOfficialsModal, setShowAllOfficialsModal] = useState(false);
  const [allOfficialsRoster, setAllOfficialsRoster] = useState<any[]>([]);
  const [allOfficialsLoading, setAllOfficialsLoading] = useState(false);
  const [allOfficialsError, setAllOfficialsError] = useState<string | null>(null);
  const [allOfficialsSearch, setAllOfficialsSearch] = useState('');

  const normalizedInviteOfficialEmail = inviteOfficialEmail.trim().toLowerCase();
  const roleCapacityOfficials = Array.isArray(roleCapacity?.officials)
    ? roleCapacity.officials.map((official: any) => ({
        ...official,
        setup_completed: official.setup_completed === true,
        status: official.status || 'pending',
      }))
    : [];
  const pendingOfficialInvites = roleCapacityOfficials.filter((official: any) =>
        official.setup_completed === false
        || official.setup_completed === 'false'
        || String(official.status || '').toLowerCase() === 'pending'
        || String(official.full_name || '').toLowerCase().includes('pending invitation')
      );
  const completedOfficialRoster = roleCapacityOfficials.filter((official: any) => !pendingOfficialInvites.some((pending: any) => pending.id === official.id));
  const isPendingInviteForEmail = (email: string): boolean => {
    const normalizedEmail = email.trim().toLowerCase();
    return Boolean(normalizedEmail && pendingOfficialInvites.some(
      (official: any) =>
        String(official.email || '').trim().toLowerCase() === normalizedEmail
        && official.official_role === inviteOfficialRole
    ));
  };
  const getInviteOfficialFailureMessage = (failure: {
    message?: string;
    details?: { code?: string; actual_barangay_name?: string; current_role?: string };
    error?: { details?: { code?: string; actual_barangay_name?: string; current_role?: string } };
    response?: { data?: { message?: string; details?: { code?: string; actual_barangay_name?: string; current_role?: string } } };
  } | null | undefined): string => {
    if (!failure) return 'Failed to send SK Official invitation.';
    const details = failure.details || failure.response?.data?.details || failure.error?.details;
    if (details?.code === 'EMAIL_ALREADY_CHAIRPERSON' && details.actual_barangay_name) {
      return `This email is already assigned as SK Chairperson in ${details.actual_barangay_name}. Use Transfer Leadership instead of re-inviting.`;
    }
    if (details?.code === 'EMAIL_ALREADY_OFFICIAL_OTHER_TENANT' && details.actual_barangay_name) {
      return `This email is already registered as ${details.current_role || 'an SK Official'} in ${details.actual_barangay_name}. Each email can only hold one SK Official role. To change their role, use a different email address.`;
    }
    return failure.response?.data?.message || failure.message || 'Failed to send SK Official invitation.';
  };
  const isEmailAlreadyAssigned = (email: string): boolean => {
    const normalizedEmail = email.trim().toLowerCase();
    return Boolean(normalizedEmail && (
      inviteOfficialBarangay?.chairpersonEmail?.trim().toLowerCase() === normalizedEmail
      || (Array.isArray(roleCapacity?.chairperson_details) && roleCapacity.chairperson_details.some(
        (official: any) => String(official.email || '').trim().toLowerCase() === normalizedEmail
      ))
      || completedOfficialRoster.some(
        (official: any) => String(official.email || '').trim().toLowerCase() === normalizedEmail
      )
      || pendingOfficialInvites.some(
        (official: any) =>
          String(official.email || '').trim().toLowerCase() === normalizedEmail
          && official.official_role !== inviteOfficialRole
      )
    ));
  };
  const isInviteOfficialEmailDuplicate = isEmailAlreadyAssigned(normalizedInviteOfficialEmail);

  useEffect(() => {
    const handleFocus = () => {
      // Refetch the federation data when the window regains focus
      if (typeof onRefreshAuditLogs === 'function') onRefreshAuditLogs();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [onRefreshAuditLogs]);
useEffect(() => {
    
    if (!showInviteOfficialModal || !inviteOfficialBarangay?.id) {
      setRoleCapacity(null);
      setIsLoadingCapacity(false);
      return;
    }
    let cancelled = false;
    setIsLoadingCapacity(true);
    kabisigApi.getRoleCapacity(inviteOfficialBarangay.id)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setRoleCapacity(res.data);
          setInviteOfficialNotice(null);
        } else {
          setRoleCapacity(null);
          setInviteOfficialNotice({ type: 'error', text: res.message || 'Unable to verify assigned officials.' });
        }
      })
      .catch((error: any) => {
        if (cancelled) return;
        setRoleCapacity(null);
        setInviteOfficialNotice({ type: 'error', text: error?.message || 'Unable to verify assigned officials.' });
      })
      .finally(() => { if (!cancelled) setIsLoadingCapacity(false); });
    return () => { cancelled = true; };
  }, [showInviteOfficialModal, inviteOfficialBarangay?.id]);

  useEffect(() => {
    const pendingInvite = pendingOfficialInvites.find(
      (official: any) => String(official.email || '').trim().toLowerCase() === normalizedInviteOfficialEmail
    );
    if (pendingInvite?.official_role && pendingInvite.official_role !== inviteOfficialRole) {
      setInviteOfficialRole(pendingInvite.official_role);
    }
  }, [normalizedInviteOfficialEmail, roleCapacity, inviteOfficialRole]);

  const [federationAnalytics, setFederationAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');

  // Tenant Provisioning Modals
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingBarangay, setEditingBarangay] = useState<BarangayTenant | null>(null);
  const editingChairpersonName = editingBarangay?.chairpersonUser?.full_name?.trim() || '';
  const editingChairpersonIsPending = isPendingChair(editingBarangay?.chairpersonUser);
  const editingChairpersonIsPendingDisplay =
    editingChairpersonIsPending
    || editingChairpersonName === 'SK Chairperson'
    || editingChairpersonName === 'Pending Invitation';
  const editingChairpersonDisplayName = editingChairpersonIsPendingDisplay
    ? 'Pending Invite'
    : (editingBarangay?.chairpersonUser?.full_name || 'Unassigned');
  const editingChairpersonIsActive =
    editingBarangay?.chairpersonUser?.status?.trim().toLowerCase() === 'active'
    && editingBarangay?.chairpersonUser?.setup_completed !== false
    && editingBarangay?.chairpersonUser?.is_pending !== true;
  const [modalNotice, setModalNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modalForm, setModalForm] = useState({
    name: '',
    totalBudget: null as number | null,
    logo: ''
  });

  
  useEffect(() => {
    const handleFocus = () => {
      // Refetch the federation data when the window regains focus
      if (typeof onRefreshAuditLogs === 'function') onRefreshAuditLogs();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [onRefreshAuditLogs]);
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
  const totalRegisteredVoters = citywideTotals?.total_registered_voters == null
    ? null
    : toNumber(citywideTotals.total_registered_voters);
  const totalCityBudget = toNumber(citywideTotals?.total_budget_allocated ?? barangays.reduce((sum, b) => sum + toNumber(b.totalBudget), 0));
  const totalCitySpent = toNumber(citywideTotals?.total_budget_spent ?? barangays.reduce((sum, b) => sum + toNumber(b.spentBudget), 0));
  const totalActivePrograms = toNumber(citywideTotals?.total_active_programs ?? programs.filter(p => p.status === 'Upcoming' || p.status === 'Ongoing').length);

  // Audit honesty flag: true only when server aggregate loaded.
  const isAuthoritative = Boolean(citywideTotals && typeof citywideTotals === 'object');
  const avgBudgetUtilization = totalCityBudget > 0 ? Math.round((totalCitySpent / totalCityBudget) * 100) : 0;

  // Consistently sort barangays in alphabetical order
  const sortedBarangays = [...barangays].sort((a, b) => a.name.localeCompare(b.name));
  const getShortBarangayId = (barangayName: string) => {
    const sorted = sortedBarangays.map((barangay) => barangay.name);
    const index = sorted.findIndex((name) => name === barangayName);
    return `${String(index + 1).padStart(2, '0')}-${new Date().getFullYear()}`;
  };
  const displayBarangayId = editingBarangay ? getShortBarangayId(editingBarangay.name) : '';

  const handleOpenOfficialsModal = async (barangay: BarangayTenant) => {
    setOfficialsModalBarangay(barangay);
    setOfficialsRoster(null);
    setOfficialsRosterError(null);
    setOfficialsRosterLoading(true);
    setShowOfficialsModal(true);
    try {
      if (!kabisigApi.getToken()) {
        throw new Error('Your session has expired. Please sign in again.');
      }
      const response = await allOfficialsQuery.refetch();
      const officialsForThisBarangay = (response.data || []).filter(
        (official) => String(official.tenant_id) === String(barangay.id)
      );
      setOfficialsRoster(officialsForThisBarangay);
    } catch (error: any) {
      setOfficialsRosterError(error?.message || 'Unable to load officials for this Barangay.');
    } finally {
      setOfficialsRosterLoading(false);
    }
  };

  const handleOpenAllOfficialsModal = async () => {
    setShowAllOfficialsModal(true);
    setAllOfficialsRoster([]);
    setAllOfficialsError(null);
    setAllOfficialsSearch('');
    setAllOfficialsLoading(true);
    try {
      if (!kabisigApi.getToken()) {
        throw new Error('Your session has expired. Please sign in again.');
      }
      const response = await allOfficialsQuery.refetch();
      setAllOfficialsRoster(response.data || []);
    } catch (error: any) {
      setAllOfficialsError(error?.message || 'Unable to load officials across all Barangays.');
    } finally {
      setAllOfficialsLoading(false);
    }
  };

  const getOfficialSetupBadge = (official: {
    email?: string | null;
    setup_completed?: boolean | string | null;
    status?: string | null;
    full_name?: string | null;
  } | null | undefined) => {
    if (
      official?.setup_completed === false
      || official?.setup_completed === 'false'
      || String(official?.status || '').toLowerCase() === 'pending'
      || String(official?.full_name || '').toLowerCase().includes('pending invitation')
    ) {
      return { label: 'Pending', className: 'bg-amber-100 text-amber-800' };
    }
    if (official?.setup_completed === true) {
      return { label: 'Assigned', className: 'bg-emerald-100 text-emerald-700' };
    }
    if (!official?.email) {
      return { label: 'Unassigned', className: 'bg-slate-200 text-slate-600' };
    }
    return { label: 'Pending', className: 'bg-amber-100 text-amber-800' };
  };

  const getInitial = (name: string) => {
    if (!name) return '?';
    // Strip prefixes like Hon., Ms., Mr., etc. (handles periods and spaces)
    const cleanName = name.replace(/^(Hon\.|Ms\.|Mr\.|Mrs\.|Dr\.|Engr\.)\s*/gi, '').trim();
    return cleanName.charAt(0).toUpperCase() || '?';
  };

  const dedupeOfficials = (officials: any[]) => {
    const seen = new Set<string>();
    return officials.filter((official) => {
      if (official.id == null) return true;
      const id = String(official.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };

  const getOfficialStatusBadge = (official: { status?: string | null } | null | undefined) => {
    const status = String(official?.status || 'pending').toLowerCase();
    const isPending = status === 'pending';
    const label = `${status.charAt(0).toUpperCase()}${status.slice(1)}`;

    if (isPending) {
      return { label: 'Pending', className: 'bg-amber-100 text-amber-800' };
    }
    if (status === 'active') {
      return { label: 'Active', className: 'bg-emerald-100 text-emerald-700' };
    }
    if (status === 'rejected' || status === 'suspended') {
      return { label, className: 'bg-rose-100 text-rose-700' };
    }
    return { label, className: 'bg-slate-100 text-slate-600' };
  };

  const renderAllOfficial = (official: any) => {
    if (official.status !== 'active' || String(official.full_name || '').toLowerCase().includes('pending')) return null;
    const badge = getOfficialStatusBadge(official);

    return (
      <span key={official.id} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700">
        {official.avatar_url ? (
          <img src={official.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-black text-[#091d64]">
            {getInitial(official.full_name)}
          </span>
        )}
        <span className="min-w-0">
          <span className="block break-words">{formatOfficialName(official)}</span>
          <span className="block text-[9px] text-slate-500">{official.official_role} · {official.barangay_name}</span>
        </span>
        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${badge.className}`}>
          {badge.label}
        </span>
      </span>
    );
  };

  // Data for Charts
  const federationRows = (federationAnalytics?.barangay_rankings || []) as FederationBarangayAnalyticsRow[];
  const federationRowsByBarangayId = new Map(
    federationRows.map(row => [String(row.id), row] as const)
  );
  const chartBarangayData = sortedBarangays.map(b => {
    const liveRow = federationRowsByBarangayId.get(String(b.id));
    const registeredYouth = toNumber(liveRow?.registered_youth ?? 0);
    const totalBudget = toNumber(liveRow?.allocated_amount ?? liveRow?.aip_budget ?? liveRow?.budget_allocated ?? b.totalBudget);
    const spentBudget = toNumber(liveRow?.spent_amount ?? liveRow?.actual_spent ?? liveRow?.budget_spent ?? b.spentBudget);

    return {
      id: b.id,
      name: b.name,
      fullName: b.name,
      registeredYouth,
      activePrograms: toNumber(liveRow?.active_programs ?? b.activePrograms),
      budget: totalBudget,
      spent: spentBudget,
      utilization: totalBudget > 0 ? Math.round((spentBudget / totalBudget) * 100) : 0
    };
  });

  const participationTrendData = (federationAnalytics?.participation_trend || []).map((point: any) => ({
    label: String(point.date),
    participants: toNumber(point.attendees),
  }));

  const budgetColors = ['#091d64', '#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777'];
  const pieBudgetData = (federationAnalytics?.budget_by_category || [])
    .filter((item: any) => String(item.category || '').trim().toLowerCase() !== 'general youth development fund')
    .map((item: any, index: number) => ({
      name: item.category,
      value: toNumber(item.allocated),
      color: budgetColors[index % budgetColors.length],
    }))
    .filter((item: { name: string; value: number }) => Boolean(item.name) && item.value > 0);

  const hasAssignedChairperson = (barangay: BarangayTenant): boolean => {
    return Boolean(barangay.chairpersonUser);
  };

  // Filtered Barangays list
  const filteredBarangays = sortedBarangays.filter(b => {
    const bgyDistrict = b.skDistrict || BARANGAY_SK_DISTRICTS[b.name];
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.chairperson.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (b.chairpersonEmail && b.chairpersonEmail.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDistrict = districtFilter === 'All' || bgyDistrict === districtFilter;
    const isPending = isPendingChair(b.chairpersonUser);
    const isAssigned = hasAssignedChairperson(b) && !isPending;
    const matchesChairperson = chairpersonFilter === 'All'
      || (chairpersonFilter === 'Assigned' && isAssigned)
      || (chairpersonFilter === 'Pending' && isPending)
      || (chairpersonFilter === 'Unassigned' && !hasAssignedChairperson(b));
    return matchesSearch && matchesDistrict && matchesChairperson;
  });

  // Filtered version of chartBarangayData for Analytics tab (respects search + district filter)
  const analyticsChartData = filteredBarangays.length === sortedBarangays.length
    ? chartBarangayData
    : chartBarangayData.filter((item: any) => filteredBarangays.some(b => b.id === item.id));
  const hasRegisteredYouthAnalytics = chartBarangayData.length > 0;
  const hasFinancialAnalytics = analyticsChartData.some((item: any) => item.budget > 0 || item.spent > 0);

  const handleOpenInviteOfficialModal = (barangay?: BarangayTenant, returnToConfigure: boolean = false) => {
    setInviteOfficialBarangay(barangay || null);
    inviteOfficialEmailRef.current = '';
    setInviteOfficialEmail('');
    setInviteOfficialRole('');
    setInviteOfficialNotice(null);
    setRoleCapacity(null);
    setIsLoadingCapacity(Boolean(barangay?.id));
    setInviteReturnToConfigure(returnToConfigure);
    setShowInviteOfficialModal(true);
  };

  const handleInviteOfficialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteOfficialBarangay) {
      setInviteOfficialNotice({ type: 'error', text: 'Please select a Barangay.' });
      return;
    }
    if (!inviteOfficialRole) {
      setInviteOfficialNotice({ type: 'error', text: 'Please select an official role.' });
      return;
    }
    const email = inviteOfficialEmail.trim().toLowerCase();
    if (!email) {
      setInviteOfficialNotice({ type: 'error', text: 'Please enter a valid official email address.' });
      return;
    }
    if (isLoadingCapacity) {
      setInviteOfficialNotice({ type: 'error', text: 'Checking existing officials. Please wait.' });
      return;
    }
    if (!roleCapacity) {
      setInviteOfficialNotice({ type: 'error', text: 'Unable to verify assigned officials. Please try again before sending an invitation.' });
      return;
    }
    const isPendingResend = isPendingInviteForEmail(email);
    if (isPendingResend) {
      setInviteOfficialNotice({ type: 'error', text: 'Use Resend on the matching Pending Invites card.' });
      return;
    }
    if (isEmailAlreadyAssigned(email)) {
      setInviteOfficialNotice({ type: 'error', text: 'This email is already assigned in this barangay.' });
      return;
    }
    const capacityKey = inviteOfficialRole === 'SK Kagawad'
      ? 'kagawad'
      : inviteOfficialRole === 'SK Secretary'
        ? 'secretary'
        : 'treasurer';
    const roleCapacityRow = roleCapacity[capacityKey];
    if (roleCapacityRow && roleCapacityRow.current >= roleCapacityRow.limit) {
      setInviteOfficialNotice({
        type: 'error',
        text: `${inviteOfficialRole} slots are full for this barangay.`,
      });
      return;
    }
    setIsInvitingOfficial(true);
    setInviteOfficialNotice(null);
    try {
      const res = await kabisigApi.inviteSkOfficial(inviteOfficialBarangay.id, email, inviteOfficialRole);
      if (!res.success) {
        if (inviteOfficialEmailRef.current.trim().toLowerCase() === email) {
          setInviteOfficialNotice({ type: 'error', text: getInviteOfficialFailureMessage(res) });
        }
        setIsInvitingOfficial(false);
        return;
      }
      const refreshedCapacity = await kabisigApi.getRoleCapacity(inviteOfficialBarangay.id);
      if (refreshedCapacity.success) setRoleCapacity(refreshedCapacity.data);
      if (inviteOfficialEmailRef.current.trim().toLowerCase() === email) {
        showPopup(`A secure sign-in link was sent to ${email}.`, 'success');
      }
    } catch (err: any) {
      if (inviteOfficialEmailRef.current.trim().toLowerCase() === email) {
        setInviteOfficialNotice({ type: 'error', text: getInviteOfficialFailureMessage(err) });
      }
    } finally {
      setIsInvitingOfficial(false);
    }
  };

  const handleResendOfficialInvitation = async (official: any) => {
    if (!inviteOfficialBarangay || !official?.email || !official?.official_role) {
      setInviteOfficialNotice({ type: 'error', text: 'This pending invitation is missing its email or role.' });
      return;
    }

    const getResendErrorMessage = (message?: string) => {
      const normalizedMessage = String(message || '').toLowerCase();
      if (normalizedMessage.includes('already active') || normalizedMessage.includes('already completed')) {
        return 'This user has already completed their account setup. You do not need to resend an invitation.';
      }
      return message || 'Failed to resend invitation.';
    };

    setIsResendingOfficialId(official.id);
    setInviteOfficialNotice(null);
    try {
      const email = String(official.email).trim().toLowerCase();
      const response = await kabisigApi.inviteSkOfficial(
        inviteOfficialBarangay.id,
        email,
        official.official_role
      );
      if (!response.success) {
        const errorMessage = getResendErrorMessage(response.message);
        setInviteOfficialNotice({ type: 'error', text: errorMessage });
        return;
      }
      showPopup(`A secure sign-in link was sent to ${email}.`, 'success');
      const refreshedCapacity = await kabisigApi.getRoleCapacity(inviteOfficialBarangay.id);
      if (refreshedCapacity.success) setRoleCapacity(refreshedCapacity.data);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message;
      setInviteOfficialNotice({ type: 'error', text: getResendErrorMessage(errorMessage) });
    } finally {
      setIsResendingOfficialId(null);
    }
  };

  const handleCancelOfficialInvitation = async () => {
    if (!pendingOfficialToCancel) return;
    setIsCancellingOfficialInvite(true);
    setCancelOfficialInviteNotice(null);
    try {
      const response = await kabisigApi.cancelSkOfficialInvitation(pendingOfficialToCancel.id);
      if (!response.success) {
        setCancelOfficialInviteNotice({ type: 'error', text: response.message || 'Failed to cancel invitation.' });
        return;
      }
      if (inviteOfficialBarangay) {
        const refreshedCapacity = await kabisigApi.getRoleCapacity(inviteOfficialBarangay.id);
        if (refreshedCapacity.success) setRoleCapacity(refreshedCapacity.data);
      }
      setCancelOfficialInviteNotice({ type: 'success', text: response.message || 'Invitation cancelled.' });
    } catch (error: any) {
      setCancelOfficialInviteNotice({ type: 'error', text: error?.message || 'Failed to cancel invitation.' });
    } finally {
      setIsCancellingOfficialInvite(false);
    }
  };


  const loadRestrictions = async () => {
    setRestrictionsLoading(true);
    setRestrictionsNotice(null);
    try {
      const data = await kabisigApi.getRestrictions({ activeOnly: restrictionsFilter === 'active' });
      setRestrictions(data);
    } catch (e: any) {
      setRestrictionsNotice({ type: 'error', text: e.message || 'Failed to load restrictions.' });
    } finally {
      setRestrictionsLoading(false);
    }
  };

  const performClearRestriction = async (r: any) => {
    setClearingId(r.id);
    setRestrictionsNotice(null);
    try {
      const res = await kabisigApi.clearRestriction(r.id, 'Cleared by Super Admin');
      if (res.success) {
        setRestrictionsNotice({ type: 'success', text: 'Restriction cleared. Account is now active.' });
        await loadRestrictions();
      } else {
        setRestrictionsNotice({ type: 'error', text: res.message || 'Failed to clear restriction.' });
      }
    } catch (e: any) {
      setRestrictionsNotice({ type: 'error', text: e.message || 'Network error.' });
    } finally {
      setClearingId(null);
    }
  };
  const handleClearRestriction = (r: any) => {
    setConfirmMsg({
      title: 'Clear Restriction?',
      message: 'Clear this restriction and reactivate the account?',
      type: 'info',
      confirmLabel: 'Clear Restriction',
      onConfirm: () => { void performClearRestriction(r); }
    });
  };

  
  useEffect(() => {
    const handleFocus = () => {
      // Refetch the federation data when the window regains focus
      if (typeof onRefreshAuditLogs === 'function') onRefreshAuditLogs();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [onRefreshAuditLogs]);
useEffect(() => {
    
    if (activeMenu !== 'restrictions') return;
    loadRestrictions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMenu, restrictionsFilter]);
  const handleOpenCancelInviteModal = (b: BarangayTenant, returnToConfigure: boolean = false) => {
    setCancellingBarangay(b);
    setCancelInviteNotice(null);
    setCancelInviteReturnToConfigure(returnToConfigure);
    setShowCancelInviteModal(true);
  };

  const handleCancelInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingBarangay) return;
    setIsCancellingInvite(true);
    setCancelInviteNotice(null);
    try {
      const res = await kabisigApi.cancelChairpersonInvitation(cancellingBarangay.id);
      if (!res.success) {
        setCancelInviteNotice({ type: 'error', text: res.message || 'Failed to cancel invitation.' });
        return;
      }
      onSyncBarangay(cancellingBarangay.id, { chairperson: 'Unassigned', chairpersonUser: null, chairpersonEmail: '' });
      await onRefreshAuditLogs();
      setCancelInviteNotice({ type: 'success', text: res.message || 'Invitation cancelled.' });
    } catch (err: any) {
      setCancelInviteNotice({ type: 'error', text: err.message || 'Network error.' });
    } finally {
      setIsCancellingInvite(false);
    }
  };
  const handleOpenTransferModal = async (b: BarangayTenant, returnToConfigure: boolean = false) => {
    setTransferringBarangay(b);
    setTransferSuccessorEmail('');
    setTransferReason('');
    setTransferNotes('');
    setTransferNotice(null);
    setTransferCurrentChair(null);
    setTransferReturnToConfigure(returnToConfigure);
    setShowTransferModal(true);

    const current = barangays.find((x) => x.id === b.id);
    if (current) {
      setTransferCurrentChair({
        email: current.chairpersonEmail || '',
        name: current.chairperson || 'Unassigned',
      });
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringBarangay) return;

    if (!transferReason) {
      setTransferNotice({ type: 'error', text: 'Please select a reason for the transfer.' });
      return;
    }

    const email = transferSuccessorEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setTransferNotice({ type: 'error', text: 'Please enter a valid successor email address.' });
      return;
    }

    setIsTransferring(true);
    setTransferNotice(null);

    try {
      const res = await kabisigApi.transferChairmanship(
        transferringBarangay.id,
        email,
        transferReason,
        transferNotes.trim() || undefined
      );

      if (!res.success) {
        setTransferNotice({ type: 'error', text: res.message || 'Failed to transfer leadership.' });
        setIsTransferring(false);
        return;
      }

      onSyncBarangay(transferringBarangay.id, {
        chairperson: res.data?.incoming?.full_name || 'Pending Invitation',
        chairpersonUser: { full_name: res.data?.incoming?.full_name || 'Pending Invitation', email, status: 'pending' },
        chairpersonEmail: email,
      });
      await onRefreshAuditLogs();
      setTransferNotice({
        type: 'success',
        text: res.data?.email_delivery === true
          ? `Leadership transferred successfully. Invitation email sent to ${email}.`
          : 'Leadership transferred successfully, but invitation email delivery could not be confirmed. Please resend the invitation.',
      });
    } catch (err: any) {
      setTransferNotice({ type: 'error', text: err.message || 'Network error.' });
    } finally {
      setIsTransferring(false);
    }
  };
  const handleOpenAssignModal = (barangay?: BarangayTenant, returnToConfigure: boolean = false) => {
    setAssigningBarangay(barangay || null);
    setAssignEmail(barangay?.chairpersonUser?.email || barangay?.chairpersonEmail || '');
    setAssignError(null);
    setAssignNotice(null);
    setAssignSuccessMessage(null);
    setAssignReturnToConfigure(returnToConfigure);
    setShowAssignModal(true);
  };

  const handleAssignChairpersonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningBarangay) {
      setAssignError('Please select a Barangay.');
      return;
    }
    if (assigningBarangayHasActiveChairperson) {
      setAssignError('This Barangay already has an active Chairperson. Use Transfer Leadership instead.');
      return;
    }
    if (assigningBarangayHasChairpersonUser) {
      setAssignError('An invitation is already pending for this email. Cancel it first to change.');
      return;
    }

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
        chairpersonUser: { full_name: res.data?.full_name || 'Pending Invitation', email, status: 'pending' },
        chairpersonEmail: email,
      });
      const refreshedBarangays = await barangaysQuery.refetch();
      const refreshedBarangay = refreshedBarangays.data?.find((barangay) => String(barangay.id) === String(assigningBarangay.id));
      if (refreshedBarangay) onSyncBarangay(assigningBarangay.id, refreshedBarangay);
      await onRefreshAuditLogs();
      setAssignNotice(null);
      setAssignSuccessMessage(`SK Chairperson invitation sent to ${email} for ${assigningBarangay.name}.`);
    } catch (err: any) {
      setAssignError(err.message || 'Network connection failed.');
      setAssignNotice({ type: 'error', text: err.message || 'Network connection failed.' });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleResendChairpersonInvitation = async (barangay: BarangayTenant) => {
    const response = await kabisigApi.resendChairpersonInvitation(barangay.id);
    if (!response.success) {
      showPopup(response.message || 'Failed to resend invitation.');
      return;
    }
    const email = response.data?.email || barangay.chairpersonUser?.email || barangay.chairpersonEmail || 'the Chairperson';
    showPopup(`A secure sign-in link was sent to ${email}.`, 'success');
    await onRefreshAuditLogs();
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
      logo: b.logo_url || b.logo || defaultLogo
    });
    setShowModal(true);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setModalNotice({ type: 'error', text: 'Maximum file size is 3MB. Please compress your file.' });
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
      logo: modalForm.logo,
      logo_url: modalForm.logo,
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
      showPopup('Allow pop-ups to print or save the LYDP report as a PDF.');
      return;
    }

    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character] || character));
    const rows = sortedBarangays.map(barangay => {
      const liveRow = federationRows.find((row: any) => row.id === barangay.id);
      return `<tr><td>${escapeHtml(barangay.name)}</td><td>${toNumber(liveRow?.registered_youth ?? barangay.youthPopulation)}</td><td>\u20B1${Number(toNumber(liveRow?.budget_allocated ?? barangay.totalBudget) || 0).toLocaleString()}</td><td>\u20B1${Number(toNumber(liveRow?.budget_spent ?? barangay.spentBudget) || 0).toLocaleString()}</td><td>${toNumber(liveRow?.active_programs ?? barangay.activePrograms)}</td></tr>`;
    }).join('');

    reportWindow.document.write(`<!doctype html><html><head><title>Naga City LYDP ${new Date().getFullYear()}</title><style>
      body{font:12px Arial,sans-serif;color:#172033;margin:36px}h1{font-size:22px;margin:0 0 6px;color:#091d64}h2{font-size:15px;margin:24px 0 8px;color:#091d64}p{line-height:1.5}.meta{color:#586174}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:7px;text-align:left}th{background:#f1f5f9} .summary{display:flex;gap:20px;margin:20px 0}.summary div{border:1px solid #cbd5e1;padding:12px;flex:1}.summary b{display:block;font-size:16px;margin-top:4px}@media print{body{margin:15mm}}
      </style></head><body><h1>Naga City SK Federation</h1><p class="meta">Local Youth Development Plan Report • Generated ${formatPhilippineDate(new Date())}</p><h2>Citywide Summary</h2><p>This report summarizes current registry, budget, and active program figures available to KABISIG. It does not create or modify database records.</p><div class="summary"><div>Barangays<b>${barangays.length}</b></div><div>Registered youth<b>${Number(totalYouthPop || 0).toLocaleString()}</b></div><div>Allocated budget<b>\u20B1${Number(totalCityBudget || 0).toLocaleString()}</b></div><div>Active programs<b>${Number(totalActivePrograms || 0)}</b></div></div><h2>Barangay Indicators</h2><table><thead><tr><th>Barangay</th><th>Registered youth</th><th>Allocated budget</th><th>Spent</th><th>Active programs</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    reportWindow.document.close();
    reportWindow.focus();
  };

  const displayBarangayName = (name: string) => name === 'Igualdad Interior' ? 'Igualdad' : name;

  const handleUpdateCredentials = async () => {
    if (!typoTargetUserId || !typoFullName) {
      showPopup('Search for a user before updating credentials.');
      return;
    }
    if (typoPhone && !/^09\d{9}$/.test(typoPhone)) {
      showPopup('Phone number must be exactly 11 digits and start with 09 (e.g., 09171234567).');
      return;
    }
    setIsUpdating(true);
    try {
      const combinedName = [typoFirstName.trim(), typoMiddleName.trim(), typoLastName.trim(), typoSuffix.trim()].filter(Boolean).join(' ');
      if (!combinedName) {
        showPopup('Please enter at least a First or Last name.');
        return;
      }

      const res = await kabisigApi.updateUserName(typoTargetUserId, {
        full_name: combinedName,
        first_name: typoFirstName.trim() || undefined,
        middle_name: typoMiddleName.trim() || undefined,
        last_name: typoLastName.trim() || undefined,
        suffix: typoSuffix.trim() || undefined,
        email: typoEmail.trim() || undefined,
        phone: typoPhone.trim() || undefined,
        birthdate: typoBirthdate || undefined,
        address: typoAddress.trim() || undefined,
        sex: typoSex || undefined,
        zone: typoZone.trim() || undefined,
        civil_status: typoCivilStatus || undefined,
        educational_status: typoEducation || undefined,
        school: typoSchool.trim() || undefined,
        course: typoCourse.trim() || undefined,
        year_level: typoYearLevel.trim() || undefined,
        employment_status: typoEmploymentStatus || undefined,
        scholar_status: typoScholarStatus.trim() || undefined,
        scholarship_type: typoScholarshipType || undefined,
        is_registered_voter: typoHasProfile ? Boolean(typoUserProfile?.is_registered_voter) : undefined,
        reason: typoReason.trim() || undefined
      });
      if (res.success) {
        showPopup('User credentials updated successfully!', 'success');
        setShowFixTypoModal(false);
        setIsEditingCreds(false);
        setTypoUserId('');
        setTypoTargetUserId('');
        setTypoTargetUser(null);
        setTypoFullName('');
        setTypoFirstName('');
        setTypoMiddleName('');
        setTypoLastName('');
        setTypoSuffix('');
        setTypoEmail('');
        setTypoPhone('');
        setTypoBirthdate('');
        setTypoAddress('');
        setTypoSex('');
        setTypoZone('');
        setTypoCivilStatus('');
        setTypoEducation('');
        setTypoSchool('');
        setTypoCourse('');
        setTypoYearLevel('');
        setTypoEmploymentStatus('');
        setTypoScholarStatus('');
        setTypoScholarshipType('');
        setTypoHasProfile(false);
        setTypoUserProfile(null);
        setTypoReason('');
      } else {
        showPopup(res.message || 'Failed to update.');
      }
    } catch (err: any) {
      showPopup(err.message || 'Error updating name.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#f8fafc] overflow-hidden font-sans text-slate-800">
      
      {/* MOBILE TOP HEADER BAR */}
      <div className="lg:hidden bg-[#091d64]/95 backdrop-blur-md text-white px-4 py-2 flex justify-between items-center sticky top-0 z-50 shadow-sm border-b border-white/10 h-14">
        <div className="flex items-center gap-2">
          <div className="h-10 px-1.5 rounded-lg bg-white shadow-md ring-1 ring-white/30 flex items-center justify-center overflow-hidden flex-shrink-0">
            <img src="/images/Kabisig_logo.png" alt="KABISIG" className="h-9 w-auto object-contain" />
          </div>
          <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded text-amber-300">Super Admin</span>
        </div>
        <div className="flex items-center gap-2">
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
          {activeMenu === 'restrictions' && 'Restricted Users & Spam Review'}
              </h1>
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#091d64] text-white">
                {activeMenu === 'profile' ? 'My Profile' : 'Super Admin'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{activeMenu === 'profile' ? 'Your personal profile, name, photo, and account credentials' : 'Naga City SK Federation Central Management Hub'}</p>
          </div>

          <div className="flex items-center gap-5">
            <UserMenu avatarUrl={currentUser?.avatar_url} onNavigateProfile={() => setActiveMenu('profile')} 
              userName={currentUser?.full_name || 'Federation President'}
              role="SK Federation President"
              onLogout={onLogout}
            />
          </div>
        </header>

        {/* MAIN WORKSPACE CONTENT */}
        <div className="flex-1 overflow-y-auto pb-24 p-3.5 sm:p-6 lg:p-8 pb-24 sm:pb-8 bg-[#f8fafc]">
          
          {/* ==================== 1. DASHBOARD TAB ==================== */}
          {activeMenu === 'profile' && (
            <ProfileSettings />
          )}
          {activeMenu === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-200 text-left">
              
              {/* TOP METRIC CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
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
                  <span className="text-3xl font-black text-[#091d64] block">{Number(totalYouthPop || 0).toLocaleString()}</span>
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
                    {totalCityBudget > 0 ? `\u20B1${Number(totalCityBudget || 0).toLocaleString('en-US')}` : '\u20B10'}
                  </span>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {totalCitySpent > 0 ? `\u20B1${Number(totalCitySpent || 0).toLocaleString('en-US')} Spent (${avgBudgetUtilization}%)` : '\u20B10 Spent (0%)'}
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
              <div className="bg-white border border-slate-200 p-5 rounded-2xl text-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Super Admin Tools</span>
                  <h3 className="font-sans font-black text-lg text-slate-900">Super Admin Quick Actions</h3>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto md:justify-end">
                  <button 
                    onClick={() => setActiveMenu('barangays')}
                    className="px-3 py-2 bg-white text-[#091d64] hover:bg-blue-50 font-bold rounded-xl text-[11px] transition-colors flex items-center gap-2 cursor-pointer shadow-xs border border-slate-200 whitespace-nowrap"
                  >
                    <Building2 className="w-4 h-4" /> Manage Barangays
                  </button>
                  <button 
                     onClick={() => {
    setTypoUserId('');
    clearTypoLookupResult();
    setShowFixTypoModal(true);
  }}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-[11px] transition-colors flex items-center gap-2 cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <span className="font-black text-sm">@</span> Manage Credentials
                  </button>
                  <button
                    onClick={() => handleOpenAssignModal()}
                    className="px-3 py-2 bg-[#091d64] text-white hover:bg-[#102a83] font-bold rounded-xl text-[11px] transition-colors flex items-center gap-2 cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <ShieldCheck className="w-4 h-4" /> Assign Chairperson
                  </button>
                  <button
                    onClick={() => handleOpenInviteOfficialModal()}
                    className="px-3 py-2 bg-amber-400 text-amber-950 hover:bg-amber-300 font-bold rounded-xl text-[11px] transition-colors flex items-center gap-2 cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <ShieldCheck className="w-4 h-4" /> Invite SK Official
                  </button>
                  <button onClick={() => setShowLydpModal(true)}
                    className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-amber-950 font-extrabold rounded-xl text-[11px] transition-colors flex items-center gap-2 cursor-pointer shadow-xs whitespace-nowrap"
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
                  {hasRegisteredYouthAnalytics ? (
                    <div className="w-full overflow-x-auto">
                      <div className="h-80 min-w-[1200px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                          <BarChart data={chartBarangayData}>
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} interval={0} angle={-45} textAnchor="end" height={80} tickFormatter={(val) => val === 'Concepcion Pequeña' ? 'Conc. Pequeña' : val === 'Concepcion Grande' ? 'Conc. Grande' : val} />
                            <YAxis stroke="#94a3b8" fontSize={10} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="registeredYouth" fill="#2563eb" name="Registered KK Members" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-sm text-slate-500">
                      No youth registration data available.
                    </div>
                  )}
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
                        {'\u20B1'}0
                      </div>
                      <p className="text-xs font-bold text-slate-700">No Budget Allocation Data</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">No positive current-year allocations are available.</p>
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
                          <Tooltip formatter={(value: number) => `\u20B1${Number(value || 0).toLocaleString('en-US')}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="max-h-48 overflow-y-auto w-full space-y-1.5 pt-2 border-t border-slate-100">
                    {pieBudgetData.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px] font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-600 max-w-md whitespace-normal break-words truncate max-w-[140px]">{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-900">
                          {item.value > 0 ? `\u20B1${Number(item.value || 0).toLocaleString('en-US')}` : '\u20B10'}
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

                <div className="border border-slate-100 rounded-xl">
                  <div className="w-full overflow-x-auto block">
                  <table className="w-full text-left text-xs text-slate-700 min-w-[800px]">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="p-3 whitespace-nowrap">Barangay</th>
                        <th className="p-3 whitespace-nowrap">SK Chairperson</th>
                        <th className="p-3 whitespace-nowrap">Registered Youth</th>
                        <th className="p-3 whitespace-nowrap">Total AIP Budget</th>
                        <th className="p-3 whitespace-nowrap">Budget Spent</th>
                        <th className="p-3 whitespace-nowrap">Utilization Rate</th>
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
                            <td className="p-3 font-bold text-[#091d64] whitespace-nowrap">
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
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium text-slate-800">
                                  {isPendingChair(b.chairpersonUser)
                                    ? 'Pending Invite'
                                    : (b.chairpersonUser?.full_name || 'Unassigned')}
                                </span>
                                {b.chairpersonUser && (
                                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                    isPendingChair(b.chairpersonUser)
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {isPendingChair(b.chairpersonUser) ? 'Pending' : 'Active'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 font-mono whitespace-nowrap">{Number(registeredYouth || 0).toLocaleString()}</td>
                            <td className="p-3 font-mono font-bold text-slate-800 whitespace-nowrap">{'\u20B1'}{Number(totalBudget || 0).toLocaleString()}</td>
                            <td className="p-3 font-mono text-emerald-700 whitespace-nowrap">{'\u20B1'}{Number(spent || 0).toLocaleString()}</td>
                            <td className="p-3 whitespace-nowrap">
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
                    <option value="Pending">Pending Chairperson</option>
                    <option value="Unassigned">No Chairperson assigned</option>
                  </select>

                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{filteredBarangays.length} of 27 Naga Barangays</span>
                  <button
                    type="button"
                    onClick={() => { void handleOpenAllOfficialsModal(); }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-[#091d64] transition-colors hover:bg-blue-100"
                  >
                    <Users className="h-3.5 w-3.5" />
                    View All Officials
                  </button>
                </div>
              </div>

              {/* DATA TABLE: BARANGAY NAME | SK DISTRICT | ASSIGNED CHAIRPERSON | STATUS | ACTION */}
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
                <div className="w-full overflow-x-auto block">
                  <table className="w-full text-left text-xs text-slate-700 min-w-[600px]">
                    <thead className="bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                      <tr>
                        <th className="py-3.5 px-4 font-bold whitespace-nowrap">Barangay Name</th>
                        <th className="py-3.5 px-4 font-bold whitespace-nowrap">SK District</th>
                        <th className="py-3.5 px-4 font-bold whitespace-nowrap">Assigned Chairperson</th>
                        <th className="py-3.5 px-4 font-bold whitespace-nowrap">Status</th>
                        <th className="py-3.5 px-4 text-right font-bold whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredBarangays.map(b => {
                        const bDistrict = b.skDistrict || BARANGAY_SK_DISTRICTS[b.name] || 'Unassigned';
                        const chairpersonBadge = getOfficialSetupBadge(b.chairpersonUser);
                        const isAssigned = Boolean(b.chairpersonUser);
                        const setupCompleted = chairpersonBadge.label === 'Assigned';
                        const chairpersonName = b.chairpersonUser?.full_name || b.chairperson || '';
                        const isPendingChairperson = isPendingChair(b.chairpersonUser);
                        const hasChairperson = isAssigned || isPendingChairperson;
                        const chairpersonEmail = b.chairpersonEmail || b.chairpersonUser?.email;

                        return (
                          <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Barangay Name */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
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
                                  <span className="text-[10px] text-slate-400 font-mono">ID: {getShortBarangayId(b.name)}</span>
                                </div>
                              </div>
                            </td>

                            {/* District */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                bDistrict === 'North'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200/80'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
                              }`}>
                                {bDistrict}
                              </span>
                            </td>

                            {/* Assigned Chairperson (Name & Email) */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {isPendingChairperson ? (
                                <div className="flex items-center gap-2">
                                  {chairpersonEmail && (
                                    <span className="block text-sm text-slate-600 break-all">
                                      {chairpersonEmail}
                                    </span>
                                  )}
                                  <span className="ml-2 shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                                    ASSIGNED
                                  </span>
                                </div>
                              ) : hasChairperson ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 text-xs">
                                      {formatOfficialName(chairpersonName, b.chairpersonUser?.sex, 2, 'SK Chairperson')}
                                    </span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                                      ASSIGNED
                                    </span>
                                  </div>
                                  {chairpersonEmail ? (
                                    <span className="block text-xs text-slate-500">
                                      {chairpersonEmail}
                                    </span>
                                  ) : (
                                    <span className="block text-xs text-slate-400 italic">No email recorded</span>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">
                                      UNASSIGNED
                                    </span>
                                  </div>
                                  <span className="block text-xs text-slate-400 italic mt-1">
                                    No chairperson assigned yet
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                setupCompleted
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : isAssigned
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  setupCompleted ? 'bg-emerald-500' : isAssigned ? 'bg-amber-500' : 'bg-slate-400'
                                }`}></span>
                                {chairpersonBadge.label === 'Assigned' ? 'Active' : isAssigned ? 'Pending' : 'Inactive'}
                              </span>
                            </td>

                            {/* Action */}
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => { void handleOpenOfficialsModal(b); }}
                                    className="px-2 py-1 text-[10px] font-bold text-[#091d64] hover:bg-blue-50 rounded-lg border border-blue-100 transition-colors"
                                  >
                                    View Details
                                  </button>
                                  <button onClick={() => handleOpenHistory(b)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="View Transfer History">
                                    <Clock className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleEditClick(b)}
                                    className="p-1.5 text-slate-500 hover:text-[#091d64] hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 cursor-pointer"
                                    title="Configure AIP Budget & Settings"
                                  >
                                    <Settings className="w-3.5 h-3.5" />
                                  </button>
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
              
              <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Registered Voters Citywide</span>
                <div className="mt-1 text-3xl font-black text-emerald-700">
                  {totalRegisteredVoters == null ? '—' : totalRegisteredVoters.toLocaleString('en-US')}
                </div>
                <p className="mt-1 text-[11px] font-medium text-slate-400">
                  Active youth profiles marked as registered voters
                </p>
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
                  {hasRegisteredYouthAnalytics ? (
                    <div className="w-full overflow-x-auto">
                      <div className="h-80 min-w-[1200px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                          <BarChart data={chartBarangayData}>
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} interval={0} angle={-45} textAnchor="end" height={80} tickFormatter={(val) => val === 'Concepcion Pequeña' ? 'Conc. Pequeña' : val === 'Concepcion Grande' ? 'Conc. Grande' : val} />
                            <YAxis stroke="#94a3b8" fontSize={10} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="registeredYouth" fill="#3b82f6" name="KK Registered" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-sm text-slate-500">
                      No youth registration data available.
                    </div>
                  )}
                </div>

                {/* CHART 2: BUDGET VS SPENT COMPARISON */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4 min-w-0">
                  <div className="border-b border-slate-100 pb-3">
                    <h4 className="font-sans font-bold text-slate-800 text-sm">AIP Budget Allocation vs. Actual Expenditure</h4>
                    <p className="text-xs text-slate-400">Financial execution tracking across component barangays</p>
                  </div>
                  {hasFinancialAnalytics ? (
                    <div className="h-64 w-full min-w-0 overflow-hidden">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                        <BarChart data={analyticsChartData}>
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                          <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(value: number) => `\u20B1${Number(value || 0).toLocaleString('en-US')}`} />
                          <Tooltip formatter={(value: number) => `\u20B1${Number(value || 0).toLocaleString('en-US')}`} />
                          <Legend />
                          <Bar dataKey="budget" fill="#059669" name="Total AIP Budget" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="spent" fill="#10b981" name="Actual Spent" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-sm text-slate-500">
                      No budget or expenditure data available.
                    </div>
                  )}
                </div>

              </div>

              <ProgramTrendD3 data={participationTrendData} />

              {/* DETAILED BARANGAYS COMPARISON TABLE */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-sans font-bold text-slate-800 text-sm">Barangay Performance & Metrics Matrix</h4>
                    <p className="text-xs text-slate-400">Comprehensive municipal statistics table</p>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-xl">
                  <div className="w-full overflow-x-auto block">
                  <table className="w-full text-left text-xs text-slate-700 min-w-[800px]">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="p-3 whitespace-nowrap">Barangay Name</th>
                        <th className="p-3 whitespace-nowrap">SK Chairperson</th>
                        <th className="p-3 whitespace-nowrap">Registered Youth</th>
                        <th className="p-3 whitespace-nowrap">AIP Budget</th>
                        <th className="p-3 whitespace-nowrap">Budget Spent</th>
                        <th className="p-3 whitespace-nowrap">Utilization Rate</th>
                        <th className="p-3 whitespace-nowrap">Active Programs</th>
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
                        const chairpersonName = b.chairpersonUser?.full_name || '';
                        const chairpersonIsPending = Boolean(
                          b.chairpersonUser
                          && (
                            String(b.chairpersonUser.status || '').trim().toLowerCase() === 'pending'
                            || b.chairpersonUser.setup_completed === false
                          )
                        );
                        return (
                          <tr key={b.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-[#091d64] whitespace-nowrap">Brgy. {displayBarangayName(b.name)}</td>
                            <td className="p-3 font-semibold whitespace-nowrap">
                              {chairpersonIsPending
                                ? <span className="text-slate-400">Pending Invitation</span>
                                : b.chairpersonUser
                                  ? formatOfficialName(chairpersonName, b.chairpersonUser.sex, 2, 'SK Chairperson')
                                  : <span className="text-slate-400">Unassigned</span>}
                            </td>
                            <td className="p-3 font-mono whitespace-nowrap">{Number(registeredYouth || 0).toLocaleString()}</td>
                            <td className="p-3 font-mono font-bold text-slate-800 whitespace-nowrap">{'\u20B1'}{Number(totalBudget || 0).toLocaleString()}</td>
                            <td className="p-3 font-mono text-emerald-700 whitespace-nowrap">{'\u20B1'}{Number(spentBudget || 0).toLocaleString()}</td>
                            <td className="p-3 font-bold text-emerald-800 whitespace-nowrap">{rate}%</td>
                            <td className="p-3 font-mono whitespace-nowrap">{activePrograms} Programs</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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

                <div className="w-full overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full table-fixed text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="p-3 w-[20%]">Timestamp</th>
                        <th className="p-3 w-[22%]">SK Chairperson & Barangay</th>
                        <th className="p-3 w-[18%]">Action</th>
                        <th className="p-3 w-[40%]">Activity & Executive Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium">
                      {filteredAuditLogs.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono text-slate-400 whitespace-nowrap align-top">
                              {formatPhilippineDateTime(log.timestamp, undefined, { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td className="p-3 font-bold text-slate-800 whitespace-normal break-words align-top">
                              <span className="text-[#091d64]">{log.user}</span>
                              <span className="block text-[10px] text-slate-400 font-semibold">{log.role === 'Barangay Admin' ? 'SK Chairperson' : log.role}</span>
                            </td>
                            <td className="p-3 font-mono text-[10px] whitespace-normal break-words align-top">{log.action}</td>
                            <td className="p-3 align-top">
                              <div className="max-w-md whitespace-normal break-words text-xs text-slate-600">
                                {formatAuditDetails(log.action, log.details)}
                              </div>
                            </td>
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

          {activeMenu === 'restrictions' && (
            <div className="space-y-6 animate-in fade-in duration-200 text-left">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-3">
                  <div>
                    <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 font-black text-[10px] rounded uppercase tracking-wider">
                      SPAM PREVENTION
                    </span>
                    <h4 className="font-sans font-bold text-slate-800 text-sm mt-1">Restricted Users</h4>
                    <p className="text-xs text-slate-400">Flagged, suspended, and banned accounts from automated abuse detection</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRestrictionsFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer ${restrictionsFilter === 'all' ? 'bg-[#091d64] text-white' : 'bg-slate-100 text-slate-600'}`}
                    >All</button>
                    <button
                      onClick={() => setRestrictionsFilter('active')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer ${restrictionsFilter === 'active' ? 'bg-[#091d64] text-white' : 'bg-slate-100 text-slate-600'}`}
                    >Active Only</button>
                    <button
                      onClick={loadRestrictions}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer"
                      title="Refresh"
                    ><RefreshCw className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                {restrictionsNotice && (
                  <div className={`p-3 rounded-xl text-xs border ${restrictionsNotice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {restrictionsNotice.text}
                  </div>
                )}

                <div className="border border-slate-100 rounded-xl">
                  <div className="w-full overflow-x-auto block">
                  <table className="w-full text-left text-xs text-slate-600 table-fixed min-w-[800px]">
                    <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="p-3 whitespace-nowrap">Detected</th>
                        <th className="p-3 whitespace-nowrap">User</th>
                        <th className="p-3 whitespace-nowrap">Type</th>
                        <th className="p-3 whitespace-nowrap">Reason</th>
                        <th className="p-3 whitespace-nowrap">Status</th>
                        <th className="p-3 text-right whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium">
                      {restrictionsLoading && (
                        <tr><td colSpan={6} className="p-6 text-center text-slate-400 whitespace-nowrap"><Loader2 className="w-4 h-4 animate-spin inline" /> Loading...</td></tr>
                      )}
                      {!restrictionsLoading && restrictions.length === 0 && (
                        <tr><td colSpan={6} className="p-6 text-center text-slate-400 font-bold whitespace-nowrap">No restrictions found.</td></tr>
                      )}
                      {!restrictionsLoading && restrictions.map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono text-slate-400 whitespace-nowrap">{formatPhilippineDateTime(r.created_at)}</td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="font-bold text-slate-800 block">{r.users?.full_name || 'Unknown'}</span>
                            <span className="text-[10px] text-slate-400">{r.users?.email}</span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              r.restriction_type === 'permanent_ban' ? 'bg-rose-100 text-rose-800' :
                              r.restriction_type === 'temp_suspend' ? 'bg-amber-100 text-amber-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>{r.restriction_type}</span>
                          </td>
                          <td className="p-3 text-slate-600 max-w-md whitespace-normal break-words text-[11px] max-w-xs whitespace-nowrap">{r.reason}</td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`text-[10px] font-bold ${r.is_active ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {r.is_active ? 'ACTIVE' : 'CLEARED'}
                            </span>
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            {r.is_active ? (
                              <button
                                onClick={() => handleClearRestriction(r)}
                                disabled={clearingId === r.id}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg cursor-pointer disabled:opacity-50"
                              >
                                {clearingId === r.id ? 'Clearing...' : 'Clear Restriction'}
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* LYDP REPORT GENERATOR PREVIEW MODAL */}
      {showLydpModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-w-[95vw] md:max-w-2xl">
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
                <p className="text-slate-600 max-w-md whitespace-normal break-words">
                  Current KABISIG snapshot: {barangays.length} barangays, {Number(totalYouthPop || 0).toLocaleString()} registered youth, and {Number(totalActivePrograms || 0)} active programs. Figures reflect loaded records, not a certified population estimate.
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">Strategic Priority Pillars:</h5>
                
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                  <span className="font-bold text-[#091d64] block">1. Governance & Active Citizenship</span>
                  <p className="text-slate-600 max-w-md whitespace-normal break-words text-[11px] mt-0.5">Planning theme for assemblies, civic participation, and transparent financial disclosures.</p>
                </div>

                <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                  <span className="font-bold text-emerald-800 block">2. Education, Livelihood & Skills Empowerment</span>
                  <p className="text-slate-600 max-w-md whitespace-normal break-words text-[11px] mt-0.5">Planning theme for education assistance, livelihood access, and digital skills workshops.</p>
                </div>

                <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
                  <span className="font-bold text-amber-900 block">3. Health, Sports & Anti-Drug Risk Prevention</span>
                  <p className="text-slate-600 max-w-md whitespace-normal break-words text-[11px] mt-0.5">Planning theme for sports participation, health promotion, and peer support.</p>
                </div>

                <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-lg">
                  <span className="font-bold text-purple-900 block">4. Climate Action & Environmental Protection</span>
                  <p className="text-slate-600 max-w-md whitespace-normal break-words text-[11px] mt-0.5">Planning theme for local climate action and environmental protection.</p>
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

      {/* CANCEL PENDING CHAIRPERSON INVITATION MODAL */}
      {showCancelInviteModal && cancellingBarangay && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 max-w-[95vw] md:max-w-2xl lg:max-w-md">
            <div className="bg-rose-600 p-5 text-white flex justify-between items-center text-left">
              <div>
                <h3 className="font-sans font-black text-base flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-white" />
                  Cancel Chairperson Invitation
                </h3>
                <p className="text-xs text-rose-50">Barangay {cancellingBarangay.name}</p>
              </div>
                        <div className="flex items-center gap-2">                 <button                   type="button"                   onClick={() => { setShowCancelInviteModal(false); setCancellingBarangay(null); if (cancelInviteReturnToConfigure) { setShowModal(true); setCancelInviteReturnToConfigure(false); } }}                   className="flex items-center gap-1 text-white/90 hover:text-white cursor-pointer text-xs font-bold px-2 py-1 rounded hover:bg-white/10 transition-colors"                 >                   <ArrowLeft className="w-4 h-4" /> Back                 </button>
              <button
                onClick={() => { setShowCancelInviteModal(false); setCancellingBarangay(null); if (cancelInviteReturnToConfigure) { setShowModal(true); setCancelInviteReturnToConfigure(false); } }}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              </div>
            </div>

            <form onSubmit={handleCancelInviteSubmit} className="p-6 space-y-4 text-left text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="block text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">
                  Pending Invitation
                </span>
                <p className="font-mono text-xs text-amber-900">{cancellingBarangay.chairpersonEmail || 'no email'}</p>
                <p className="text-[10px] text-amber-700 mt-2 italic">
                  This invite has not been accepted yet. Cancelling will free the slot so you can assign a new Chairperson.
                </p>
              </div>

              {cancelInviteNotice && (
                (cancelInviteNotice.type !== 'error'
                  || cancelInviteNotice.text !== 'No active Chairperson to cancel.'
                  || cancellingBarangay.chairpersonUser === null
                  || cancellingBarangay.chairpersonUser === undefined) && (
                <div className={'p-3 rounded-xl text-xs border ' + (cancelInviteNotice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700')}>
                  {cancelInviteNotice.text}
                </div>
                )
              )}

              {cancelInviteNotice?.type === 'success' ? (
                <button
                  type="button"
                  onClick={() => { setShowCancelInviteModal(false); setCancellingBarangay(null); if (cancelInviteReturnToConfigure) { setShowModal(true); setCancelInviteReturnToConfigure(false); } }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Close
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowCancelInviteModal(false); setCancellingBarangay(null); if (cancelInviteReturnToConfigure) { setShowModal(true); setCancelInviteReturnToConfigure(false); } }}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Keep Invitation
                  </button>
                  <button
                    type="submit"
                    disabled={isCancellingInvite}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs cursor-pointer"
                  >
                    {isCancellingInvite ? 'Cancelling...' : 'Cancel Invitation'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
      {/* PANEL REC #9: TRANSFER LEADERSHIP MODAL */}
      {showTransferModal && transferringBarangay && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 max-w-[95vw] md:max-w-2xl lg:max-w-md">
            <div className="bg-amber-500 p-5 text-white flex justify-between items-center text-left">
              <div>
                <h3 className="font-sans font-black text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-white" />
                  Transfer Leadership
                </h3>
                <p className="text-xs text-amber-50">Barangay {transferringBarangay.name}</p>
              </div>
                        <div className="flex items-center gap-2">                 <button                   type="button"                   onClick={() => { setShowTransferModal(false); setTransferringBarangay(null); if (transferReturnToConfigure) { setShowModal(true); setTransferReturnToConfigure(false); } }}                   className="flex items-center gap-1 text-white/90 hover:text-white cursor-pointer text-xs font-bold px-2 py-1 rounded hover:bg-white/10 transition-colors"                 >                   <ArrowLeft className="w-4 h-4" /> Back                 </button>
              <button
                onClick={() => { setShowTransferModal(false); setTransferringBarangay(null); setShowModal(false); setTransferReturnToConfigure(false); }}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              </div>
            </div>

            <form onSubmit={handleTransferSubmit} className="p-6 space-y-4 text-left text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <span className="block text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-1">
                  Current Chairperson
                </span>
                <p className="font-bold text-rose-900 text-sm">{transferCurrentChair?.name || 'Unknown'}</p>
                <p className="text-rose-700 text-[11px] font-mono">{transferCurrentChair?.email || 'no email'}</p>
                <p className="text-[10px] text-rose-600 mt-2 italic">
                  This person will be demoted to Youth Constituent. Their record is preserved.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Successor Official Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={transferSuccessorEmail}
                  onChange={(e) => setTransferSuccessorEmail(e.target.value)}
                  placeholder="incoming.chairperson@example.com"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Reason for Transfer</label>
                <select
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value as any)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-amber-500 focus:outline-none cursor-pointer"
                  required
                >
                  <option value="" disabled>Select reason</option>
                  <option value="Resigned">Resigned</option>
                  <option value="End of Term">End of Term</option>
                  <option value="Succession">Succession</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Notes (optional)</label>
                <textarea
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="Additional context for audit trail..."
                  rows={2}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-1 focus:ring-amber-500 focus:outline-none resize-none"
                />
              </div>

              {transferNotice && (
                <div className={'p-3 rounded-xl text-xs border ' + (transferNotice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700')}>
                  {transferNotice.text}
                </div>
              )}

              <button
                type="submit"
                disabled={isTransferring}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {isTransferring ? 'Transferring...' : 'Confirm Transfer of Leadership'}
              </button>
            </form>
          </div>
        </div>
      )}
      {showOfficialsModal && officialsModalBarangay && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#091d64] p-5 text-white">
              <div>
                <h3 className="text-base font-black">Barangay Officials</h3>
                <p className="mt-1 text-xs text-blue-100">{officialsModalBarangay.name}</p>
              </div>
              <button type="button" onClick={() => setShowOfficialsModal(false)} aria-label="Close officials details">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 overflow-y-auto p-5">
              {officialsRosterLoading && (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading Barangay officials…
                </div>
              )}
              {officialsRosterError && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {officialsRosterError}
                </div>
              )}
              {!officialsRosterLoading && !officialsRosterError && officialsRoster && (
                (() => {
                  const activeOfficials = dedupeOfficials(officialsRoster.filter(isDisplayedOfficial));
                  const groups = [
                    {
                      title: 'SK Chairperson',
                      members: activeOfficials.filter((official: any) => Number(official.role_id) === 2),
                    },
                    {
                      title: 'SK Kagawad',
                      members: activeOfficials.filter((official: any) =>
                        Number(official.role_id) === 3 && official.official_role === 'SK Kagawad'
                      ).slice(0, 7),
                    },
                    {
                      title: 'SK Secretary',
                      members: activeOfficials.filter((official: any) =>
                        Number(official.role_id) === 3 && official.official_role === 'SK Secretary'
                      ),
                    },
                    {
                      title: 'SK Treasurer',
                      members: activeOfficials.filter((official: any) =>
                        Number(official.role_id) === 3 && official.official_role === 'SK Treasurer'
                      ),
                    },
                  ];

                  return groups.map((group) => (
                  <section key={group.title}>
                    <h4 className="mb-2 border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                      {group.title}
                    </h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {group.members.length > 0 ? (
                        group.members.map((person: any) => {
                          const statusBadge = getOfficialStatusBadge(person);

                          return (
                            <div key={person.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-3">
                              {person.avatar_url ? (
                                <img src={person.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-[#091d64]">
                                  {getInitial(person.full_name)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                  <span className="truncate">{formatOfficialName(person)}</span>
                                </p>
                                <p className="truncate text-xs text-slate-500">{person.email || 'No email recorded'}</p>
                                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${statusBadge.className}`}>
                                  {statusBadge.label}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-400 italic py-2 px-3 sm:col-span-2">
                          No {group.title} assigned yet
                        </p>
                      )}
                    </div>
                  </section>
                  ));
                })()
              )}
            </div>
            <div className="flex justify-end border-t border-slate-100 bg-slate-50 p-4">
              <button type="button" onClick={() => setShowOfficialsModal(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showAllOfficialsModal && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#091d64] p-5 text-white">
              <div>
                <h3 className="text-base font-black">All Barangay Officials</h3>
                <p className="mt-1 text-xs text-blue-100">Chairpersons and SK officials across Naga City</p>
              </div>
              <button type="button" onClick={() => setShowAllOfficialsModal(false)} aria-label="Close all Barangay officials">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto p-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={allOfficialsSearch}
                  onChange={(event) => setAllOfficialsSearch(event.target.value)}
                  placeholder="Search barangays or officials..."
                  aria-label="Search barangays or officials"
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-xs focus:border-[#091d64] focus:outline-none focus:ring-1 focus:ring-[#091d64]"
                />
              </div>
              {allOfficialsLoading && (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading all Barangay officials…
                </div>
              )}
              {allOfficialsError && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {allOfficialsError}
                </div>
              )}
              {!allOfficialsLoading && !allOfficialsError && sortedBarangays.filter((barangay) => {
                const search = allOfficialsSearch.trim().toLowerCase();
                if (!search || barangay.name.toLowerCase().includes(search)) return true;
                return allOfficialsRoster.some((official) =>
                  String(official.tenant_id) === String(barangay.id)
                  && isDisplayedOfficial(official)
                  && [official.full_name, official.first_name, official.middle_name, official.last_name, official.email, official.official_role, official.position]
                    .some((value) => String(value || '').toLowerCase().includes(search))
                );
              }).map((barangay) => {
                const officials = dedupeOfficials(allOfficialsRoster.filter((official) =>
                  String(official.tenant_id) === String(barangay.id)
                  && isDisplayedOfficial(official)
                )).map((official) => ({
                  ...official,
                  official_role: official.official_role || (Number(official.role_id) === 2 ? 'SK Chairperson' : official.position || 'SK Official'),
                  barangay_name: barangay.name,
                }));
                const chairperson = officials.filter((official) => Number(official.role_id) === 2);
                const secretaries = officials.filter((official) =>
                  Number(official.role_id) === 3 && official.official_role === 'SK Secretary'
                );
                const treasurers = officials.filter((official) =>
                  Number(official.role_id) === 3 && official.official_role === 'SK Treasurer'
                );
                const kagawads = officials.filter((official) =>
                  Number(official.role_id) === 3 && official.official_role === 'SK Kagawad'
                ).slice(0, 7);
                const groupedOfficials = [
                  { label: 'SK Chairperson', people: chairperson, emptyMessage: 'Unassigned' },
                  { label: 'SK Kagawad', people: kagawads, emptyMessage: 'No SK Kagawad assigned.' },
                  { label: 'SK Secretary', people: secretaries, emptyMessage: 'No SK Secretary assigned.' },
                  { label: 'SK Treasurer', people: treasurers, emptyMessage: 'No SK Treasurer assigned.' },
                ];
                return (
                  <section key={barangay.id} className="rounded-xl border border-slate-200 p-4">
                    <h4 className="mb-3 border-b border-slate-100 pb-2 text-sm font-black text-[#091d64]">
                      Barangay {barangay.name}
                    </h4>
                    <div className="space-y-3 text-xs">
                      {groupedOfficials.map((group) => (
                        <div key={group.label}>
                          <p className="mb-1 font-bold text-slate-600">{group.label}</p>
                          <div className="flex flex-wrap gap-2">
                            {group.people.length > 0
                              ? group.people.map(renderAllOfficial)
                              : <p className="text-xs text-slate-400 italic py-2 px-3">{group.emptyMessage}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
            <div className="flex justify-end border-t border-slate-100 bg-slate-50 p-4">
              <button type="button" onClick={() => setShowAllOfficialsModal(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* DEDICATED ASSIGN SK CHAIRPERSON MODAL (ONLY CHAIRPERSON EMAIL) */}
      {/* P9/P10: INVITE SK OFFICIAL MODAL */}
      {showInviteOfficialModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="flex w-full max-w-lg max-h-[85vh] mx-auto my-auto flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="shrink-0 bg-[#091d64] p-5 text-white flex justify-between items-center text-left">
              <div>
                <h3 className="font-sans font-black text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-300" />
                  Invite SK Official
                </h3>
                <p className="text-xs text-blue-100">{inviteOfficialBarangay ? `Barangay ${inviteOfficialBarangay.name}` : 'Select a Barangay to continue'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setShowInviteOfficialModal(false); setInviteOfficialBarangay(null); if (inviteReturnToConfigure) { setShowModal(true); setInviteReturnToConfigure(false); } }}
                  className="flex items-center gap-1 text-white/90 hover:text-white cursor-pointer text-xs font-bold px-2 py-1 rounded hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              <button onClick={() => { setShowInviteOfficialModal(false); setInviteOfficialBarangay(null); setShowModal(false); setInviteReturnToConfigure(false); }} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
              </div>
            </div>
            <form onSubmit={handleInviteOfficialSubmit} className="min-h-0 max-h-[80vh] flex-1 overflow-y-auto p-6 space-y-4 text-left text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Barangay</label>
                <select value={inviteOfficialBarangay?.id || ''}
                  onChange={(e) => {
                    const selected = barangays.find(b => b.id === e.target.value);
                    setInviteOfficialBarangay(selected || null);
                    setRoleCapacity(null);
                    setIsLoadingCapacity(Boolean(selected));
                    setInviteOfficialNotice(null);
                  }}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-[#091d64] focus:outline-none cursor-pointer"
                >
                  <option value="" disabled>Select Barangay...</option>
                  {sortedBarangays.map(b => (<option key={b.id} value={b.id}>Barangay {b.name}</option>))}
                </select>
              </div>
              {inviteOfficialBarangay && (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-3">
                    {inviteOfficialBarangay.logo ? (
                      <img
                        src={inviteOfficialBarangay.logo}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full border border-slate-200 bg-white object-contain p-0.5"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-xs font-bold text-[#091d64]">
                        {inviteOfficialBarangay.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <span className="block text-[10px] font-mono font-semibold text-slate-400">Target Jurisdiction</span>
                      <h4 className="text-xs font-extrabold text-[#091d64]">Barangay {inviteOfficialBarangay.name}</h4>
                    </div>
                  </div>
                  <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-extrabold uppercase text-blue-700">
                    {inviteOfficialBarangay.skDistrict || BARANGAY_SK_DISTRICTS[inviteOfficialBarangay.name] || 'Unassigned'}
                  </span>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Official Role</label>
                <select value={inviteOfficialRole}
                  disabled={!inviteOfficialBarangay}
                  onChange={(e) => setInviteOfficialRole(e.target.value as typeof inviteOfficialRole)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-[#091d64] focus:outline-none cursor-pointer"
                >
                  <option value="" disabled>Select Official Role...</option>
                  <option value="SK Kagawad">SK Kagawad</option>
                  <option value="SK Secretary">SK Secretary</option>
                  <option value="SK Treasurer">SK Treasurer</option>
                </select>
              </div>

                {isLoadingCapacity && (
                  <p className="text-[10px] text-slate-400 mt-1">Loading current roster…</p>
                )}
                {!isLoadingCapacity && roleCapacity && (
                  <div className="mt-2 space-y-1 text-[10px]">
                    {(['SK Kagawad', 'SK Secretary', 'SK Treasurer'] as const).map((r) => {
                      const key = r === 'SK Kagawad' ? 'kagawad' : r === 'SK Secretary' ? 'secretary' : 'treasurer';
                      const row = roleCapacity[key] || { current: 0, limit: 0 };
                      const full = row.current >= row.limit;
                      const isSelected = inviteOfficialRole === r;
                      return (
                        <div key={r} className={`flex justify-between ${isSelected ? 'font-bold text-[#091d64]' : 'text-slate-500'}`}>
                          <span>{r}{isSelected ? ' ←' : ''}</span>
                          <span className={full ? 'text-rose-600 font-bold' : ''}>{row.current} / {row.limit}{full ? ' (FULL)' : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              {!isLoadingCapacity && pendingOfficialInvites.length > 0 && (
                <div className="border-t border-amber-100 pt-3">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2">
                    Pending Invites
                  </p>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {pendingOfficialInvites.map((official: any) => (
                      <div key={official.id} className="rounded-lg border border-amber-100 bg-amber-50 p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="block truncate text-[11px] font-bold text-slate-800">{formatOfficialName(official.full_name, official.sex, official.role_id, official.position || official.official_role)}</span>
                            <span className="block truncate font-mono text-[10px] text-slate-500">{official.email}</span>
                            <span className="mt-1 inline-block rounded bg-white px-1.5 py-0.5 text-[9px] font-bold text-[#091d64]">
                              {official.official_role}
                            </span>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              disabled={isResendingOfficialId === official.id}
                              onClick={() => void handleResendOfficialInvitation(official)}
                              className="rounded-md bg-[#091d64] px-2 py-1 text-[9px] font-bold text-white disabled:opacity-50"
                            >
                              {isResendingOfficialId === official.id ? 'Sending...' : 'Resend'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPendingOfficialToCancel(official);
                                setCancelOfficialInviteNotice(null);
                              }}
                              className="rounded-md bg-rose-600 px-2 py-1 text-[9px] font-bold text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!isLoadingCapacity && completedOfficialRoster.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Existing SK Officials for this Barangay
                  </p>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {completedOfficialRoster.map((o: any) => {
                      const setupBadge = getOfficialSetupBadge(o);
                      return (
                        <div key={o.id} className="flex items-center justify-between text-[11px] p-2 bg-slate-50 rounded-lg">
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-slate-800 block truncate">{formatOfficialName(o.full_name, o.sex, o.role_id, o.position || o.official_role)}</span>
                            <span className="text-[10px] text-slate-500 font-mono block truncate">{o.email}</span>
                          </div>
                          <div className="ml-2 flex shrink-0 items-center gap-1">
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-[#091d64]">
                              {o.official_role}
                            </span>
                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${setupBadge.className}`}>
                              {setupBadge.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Official Email Address <span className="text-rose-500">*</span></label>
                <input
                  type="email"
                  value={inviteOfficialEmail}
                  onChange={(e) => {
                    const email = e.target.value;
                    const pendingInvite = pendingOfficialInvites.find(
                      (official: any) => String(official.email || '').trim().toLowerCase() === email.trim().toLowerCase()
                    );
                    setInviteOfficialEmail(email);
                    inviteOfficialEmailRef.current = email;
                    if (pendingInvite?.official_role) setInviteOfficialRole(pendingInvite.official_role);
                    setInviteOfficialNotice(null);
                  }}
                  className={`w-full p-2.5 bg-white border ${isInviteOfficialEmailDuplicate ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:ring-[#091d64]'} rounded-xl text-xs font-semibold text-slate-800 focus:ring-1 focus:outline-none`}
                  placeholder="official@example.com" required />
                {isInviteOfficialEmailDuplicate && (
                  <p role="alert" className="mt-1 text-[10px] font-semibold text-rose-600">
                    This email is already assigned in this barangay.
                  </p>
                )}
              </div>
              {inviteOfficialNotice && (
                <div className={'p-3 rounded-xl text-xs border ' + (inviteOfficialNotice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700')}>
                  {inviteOfficialNotice.text}
                </div>
              )}
              {(() => {
                const _key = inviteOfficialRole === 'SK Kagawad' ? 'kagawad' : inviteOfficialRole === 'SK Secretary' ? 'secretary' : 'treasurer';
                const _row = roleCapacity?.[_key];
                const _full = Boolean(inviteOfficialRole && _row && _row.current >= _row.limit);
                const _pendingResend = isPendingInviteForEmail(normalizedInviteOfficialEmail);
                const _emailHasPendingInvite = Boolean(normalizedInviteOfficialEmail && pendingOfficialInvites.some(
                  (official: any) => String(official.email || '').trim().toLowerCase() === normalizedInviteOfficialEmail
                ));
                const _emailBlocked = isInviteOfficialEmailDuplicate || (_full && !_pendingResend);
                return (
                  <>
                    {_full && !_pendingResend && (
                      <p className="text-[10px] text-rose-600 font-bold text-center">
                        {inviteOfficialRole} slots are full for this barangay. Choose a different role or barangay.
                      </p>
                    )}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowInviteOfficialModal(false);
                          setInviteOfficialBarangay(null);
                          if (inviteReturnToConfigure) {
                            setShowModal(true);
                            setInviteReturnToConfigure(false);
                          }
                        }}
                        className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      {!_emailHasPendingInvite && (
                        <button type="submit" disabled={isInvitingOfficial || isLoadingCapacity || !roleCapacity || _emailBlocked || !inviteOfficialBarangay || !inviteOfficialRole}
                          className="flex-1 py-3 bg-[#091d64] hover:bg-[#102a83] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer">
                          {isInvitingOfficial
                            ? 'Sending...'
                            : isInviteOfficialEmailDuplicate
                              ? 'This email is already assigned in this barangay.'
                              : isLoadingCapacity
                                ? 'Checking existing officials...'
                            : !inviteOfficialBarangay || !inviteOfficialRole
                              ? 'Select Barangay and Role'
                              : !roleCapacity
                                ? 'Unable to verify assigned officials'
                                : _pendingResend
                                  ? 'Resend Invitation'
                                : _full
                                ? inviteOfficialRole + ' — At Capacity'
                                : 'Send ' + inviteOfficialRole + ' Invitation'}
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
            </form>
          </div>
        </div>
      )}

      {pendingOfficialToCancel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-rose-600 p-5 text-white">
              <div>
                <h3 className="flex items-center gap-2 text-base font-black">
                  <AlertCircle className="h-5 w-5" /> Cancel SK Official Invitation
                </h3>
                <p className="text-xs text-rose-50">{pendingOfficialToCancel.official_role}</p>
              </div>
              <button
                type="button"
                onClick={() => setPendingOfficialToCancel(null)}
                className="text-white/80 hover:text-white"
                aria-label="Close cancel invitation dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6 text-left text-xs">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">Pending Invitation</p>
                <p className="font-mono text-xs text-amber-900">{pendingOfficialToCancel.email || 'No email recorded'}</p>
                <p className="mt-2 text-[10px] text-amber-700">
                  Cancelling removes this uncompleted account and frees its role capacity.
                </p>
              </div>
              {cancelOfficialInviteNotice && (
                <div
                  role="status"
                  className={`rounded-xl border p-3 ${
                    cancelOfficialInviteNotice.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {cancelOfficialInviteNotice.text}
                </div>
              )}
              {cancelOfficialInviteNotice?.type === 'success' ? (
                <button
                  type="button"
                  onClick={() => {
                    setPendingOfficialToCancel(null);
                    setCancelOfficialInviteNotice(null);
                  }}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white"
                >
                  Done
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isCancellingOfficialInvite}
                    onClick={() => {
                      setPendingOfficialToCancel(null);
                      setCancelOfficialInviteNotice(null);
                    }}
                    className="flex-1 rounded-xl bg-slate-100 py-3 text-xs font-bold text-slate-700 disabled:opacity-60"
                  >
                    Keep Invitation
                  </button>
                  <button
                    type="button"
                    disabled={isCancellingOfficialInvite}
                    onClick={() => void handleCancelOfficialInvitation()}
                    className="flex-1 rounded-xl bg-rose-600 py-3 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {isCancellingOfficialInvite ? 'Cancelling...' : 'Cancel Invitation'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-w-[95vw] md:max-w-2xl lg:max-w-md">
            <div className="bg-[#091d64] p-5 text-white flex justify-between items-center text-left">
              <div>
                <h3 className="font-sans font-black text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-300" />
                  Assign SK Chairperson
                </h3>
                <p className="text-xs text-blue-100">
                  {assigningBarangay ? `Barangay ${assigningBarangay.name} • Naga City Multi-Tenant Registry` : 'Select a Barangay to continue'}
                </p>
              </div>
              <button 
                onClick={() => { setShowAssignModal(false); setAssigningBarangay(null); if (assignReturnToConfigure) { setShowModal(true); setAssignReturnToConfigure(false); } }} 
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

              <form onSubmit={handleAssignChairpersonSubmit} className="p-6 space-y-4 text-left text-xs">

                {/* Selected Barangay Card */}
                {assigningBarangay && (
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
                )}

                {/* Target Barangay Selector */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Change Target Barangay (27 Naga Barangays)
                  </label>
                  <select
                    value={assigningBarangay?.id || ''}
                    onChange={(e) => {
                      const selected = barangays.find(b => b.id === e.target.value);
                      setAssigningBarangay(selected || null);
                      setAssignEmail('');
                      setAssignError(null);
                    }}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-[#091d64] focus:outline-none cursor-pointer"
                  >
                    <option value="" disabled>Select Barangay...</option>
                    {sortedBarangays.map(b => (
                      <option key={b.id} value={b.id}>
                        Barangay {b.name} ({b.chairperson && b.chairperson !== 'Unassigned' ? `Assigned: ${formatOfficialName(b.chairpersonUser?.full_name || b.chairperson, b.chairpersonUser?.sex, 2, 'SK Chairperson')}` : 'Unassigned'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chairperson Official Email Input */}
                {assigningBarangay && <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Chairperson Official Email Address <span className="text-rose-500">*</span>
                  </label>
                  {assigningBarangayHasActiveChairperson && (
                    <p role="alert" className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                      This Barangay already has an active Chairperson. Use Transfer Leadership instead.
                    </p>
                  )}
                  <div className="relative">
                    <input 
                      type="email"
                      value={assignEmail}
                      onChange={(e) => setAssignEmail(e.target.value)}
                      placeholder="chairperson.example@naga.gov.ph"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#091d64] focus:border-[#091d64] font-mono"
                      disabled={assigningBarangayHasChairpersonUser}
                      required
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {assigningBarangayHasChairpersonUser
                      ? 'An invitation is already pending for this email. Cancel it first to change.'
                      : "Enter ONLY the Chairperson's email. An invitation link will be triggered."}
                  </p>
                </div>}


                {assignSuccessMessage && (
                  <div className="p-3 mb-4 text-sm text-emerald-800 bg-emerald-50 rounded-lg border border-emerald-200">
                    {assignSuccessMessage}
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
                    onClick={() => { setShowAssignModal(false); setAssigningBarangay(null); if (assignReturnToConfigure) { setShowModal(true); setAssignReturnToConfigure(false); } }}
                    className="px-4 py-2 border border-slate-200 text-slate-600 max-w-md whitespace-normal break-words text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isAssigning || !assigningBarangay || !assignEmail.trim() || assigningBarangayHasChairpersonUser}
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
                        <span>{assigningBarangayHasChairpersonUser ? 'Cancel Invitation First' : 'Send Invitation & Assign'}</span>
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="flex w-full max-w-lg max-h-[85vh] mx-auto my-auto flex-col overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="shrink-0 bg-[#091d64] p-4 text-white flex justify-between items-center text-left">
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

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
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
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Barangay Name
                    </label>
                    <input
                      type="text"
                      value={modalForm.name}
                      readOnly
                      className="w-full cursor-default border border-slate-200 bg-slate-100 p-2.5 font-medium text-slate-500 rounded-xl focus:outline-none focus:ring-0"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Barangay ID
                    </label>
                    <input
                      type="text"
                      value={displayBarangayId}
                      readOnly
                      className="w-full cursor-default border border-slate-200 bg-slate-100 p-2.5 font-medium text-slate-500 rounded-xl focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="min-w-0">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Logo
                    </label>
                    <p className="text-[10px] text-slate-500">This can be changed anytime.</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
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
                  <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
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

                <div className="flex flex-col gap-4 w-full p-4 border border-slate-200 rounded-xl bg-slate-50">
                  <div className="min-w-0 flex-1 pr-4">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 whitespace-nowrap">
                      SK CHAIRPERSON
                    </span>
                    <span className="block text-sm font-medium text-slate-800 break-words leading-tight">
                      {editingBarangay?.chairpersonUser?.full_name || 'Unassigned'}
                    </span>
                    <span className="block text-[10px] text-slate-500 truncate mt-1">
                      {editingBarangay?.chairpersonEmail || 'No email recorded'}
                    </span>
                  </div>
                  <div className="shrink-0 flex flex-wrap gap-2 justify-end w-full">
                    {editingChairpersonIsPending ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const barangay = editingBarangay;
                            setShowModal(false);
                            if (barangay) void handleResendChairpersonInvitation(barangay);
                          }}
                          className="px-3 py-2 bg-[#091d64] hover:bg-[#102a83] text-white rounded-lg text-xs font-bold whitespace-nowrap"
                        >
                          Resend Invitation
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const barangay = editingBarangay;
                            setShowModal(false);
                            if (barangay) handleOpenCancelInviteModal(barangay, true);
                          }}
                          className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold whitespace-nowrap"
                        >
                          Cancel Invitation
                        </button>
                      </>
                    ) : editingChairpersonIsActive ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const barangay = editingBarangay;
                            setShowModal(false);
                            if (barangay) handleOpenTransferModal(barangay, true);
                          }}
                          className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold whitespace-nowrap"
                        >
                          Transfer Leadership
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const barangay = editingBarangay;
                            setShowModal(false);
                            if (barangay) handleOpenAssignModal(barangay, true);
                          }}
                          className="px-3 py-2 bg-[#091d64] hover:bg-[#102a83] text-white rounded-lg text-xs font-bold whitespace-nowrap"
                        >
                          Assign Chairperson
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const barangay = editingBarangay;
                        setShowModal(false);
                        if (barangay) handleOpenInviteOfficialModal(barangay, true);
                      }}
                      className="px-3 py-2 bg-[#091d64] hover:bg-[#102a83] text-white rounded-lg text-xs font-bold whitespace-nowrap"
                    >
                      Invite Official
                    </button>
                  </div>
                </div>
            </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t bg-slate-50">
                <button 
                  disabled={isSaving}
                  onClick={() => setShowModal(false)} 
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 disabled:opacity-50 w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button 
                  disabled={isSaving}
                  onClick={handleSaveBarangay} 
                  className="px-5 py-2 bg-[#091d64] text-white text-xs font-bold rounded-xl hover:bg-opacity-95 cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2 w-full sm:w-auto"
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

        <button
          onClick={() => setActiveMenu('profile')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeMenu === 'profile' ? 'text-[#091d64] font-extrabold bg-blue-50/80' : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
        >
          <Users className={`w-5 h-5 ${activeMenu === 'profile' ? 'text-[#091d64] scale-110' : 'text-slate-400'} transition-transform`} />
          <span className="text-[10px] mt-0.5 tracking-tight font-sans">Profile</span>
        </button>
      </div>

      {historyBarangay && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 max-w-[95vw] md:max-w-2xl">
            <div className="bg-[#091d64] p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="font-sans font-black text-base flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-200" /> Transfer History
                </h3>
                <p className="text-xs text-indigo-100">Barangay {historyBarangay.name}</p>
              </div>
              <button onClick={() => setHistoryBarangay(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {isLoadingHistory ? (
                <p className="text-center text-slate-500 text-sm py-8">Loading history...</p>
              ) : historyData.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-8">No transfer records found for this barangay.</p>
              ) : (
                <div className="space-y-4">
                  {historyData.map((h: any, i: number) => (
                    <div key={i} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h.reason}</span>
                          <p className="font-bold text-slate-800 text-sm mt-1">{h.outgoing_full_name || h.outgoing_email} <span className="font-normal text-slate-400 mx-1">→</span> {h.incoming_full_name || h.incoming_email}</p>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{formatPhilippineDate(h.created_at)}</span>
                      </div>
                      <div className="bg-white border border-slate-100 rounded p-3 text-xs text-slate-600 font-mono mt-2">
                        {h.notes || 'No additional notes provided.'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showEmailModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh] max-w-[95vw] md:max-w-2xl lg:max-w-5xl">
            <div className="bg-[#091d64] p-4 flex justify-between items-center text-white shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <button type="button" onClick={() => { setShowEmailModal(false); setShowFixTypoModal(true); }} className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors" title="Back to form">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  </button>
                  <h3 className="font-bold text-lg">Email Management &amp; History</h3>
                </div>
                <p className="text-xs text-blue-200">Update user emails and view the audit trail securely.</p>
              </div>
              <button onClick={() => setShowEmailModal(false)} className="text-white hover:text-blue-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
              
              <button onClick={() => setEmailModalTab('history')} className={`flex-1 py-3 text-xs font-bold transition-colors ${emailModalTab === 'history' ? 'text-[#091d64] border-b-2 border-[#091d64] bg-white' : 'text-slate-500 hover:bg-slate-100'}`}>Change History</button>
            </div>
            <div className="p-6 overflow-y-auto">
              {emailModalTab === 'update' ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setIsUpdatingEmail(true);
                  const res = await kabisigApi.updateUserEmail(emailForm);
                  setIsUpdatingEmail(false);
                  if (res.success) {
                    await handleLoadEmailHistory();
                    showPopup('Email updated successfully!', 'success');
                    setShowEmailModal(false);
                    setEmailForm({ current_email: '', new_email: '', reason: '' });
                  } else {
                    showPopup(res.message || 'Failed to update email.');
                  }
                }} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Current Email (of User)</label>
                    <input required type="email" placeholder="user@example.com" value={emailForm.current_email} onChange={e => setEmailForm({...emailForm, current_email: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#091d64]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">New Email Address</label>
                    <input required type="email" placeholder="new.email@example.com" value={emailForm.new_email} onChange={e => setEmailForm({...emailForm, new_email: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#091d64]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reason for Change (Audit Log)</label>
                    <input required type="text" placeholder="e.g., Official government email requested" value={emailForm.reason} onChange={e => setEmailForm({...emailForm, reason: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#091d64]" />
                  </div>
                  <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                    <button type="button" onClick={() => setShowEmailModal(false)} className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50">Cancel</button>
                    <button type="submit" disabled={isUpdatingEmail} className="px-5 py-2 bg-[#091d64] hover:bg-[#102a83] text-white text-xs font-bold rounded-xl disabled:opacity-50">
                      {isUpdatingEmail ? 'Updating...' : 'Update Email'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  {isFetchingEmailHistory ? (
                    <p className="text-center text-xs text-slate-500">Loading history...</p>
                  ) : emailHistoryList.length === 0 ? (
                    <p className="text-center text-xs text-slate-500">No email changes recorded yet.</p>
                  ) : (
                    <div className="max-h-[60vh] overflow-y-auto w-full border border-slate-200 rounded-lg">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">User Modified</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Barangay</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Changed Details</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {emailHistoryList.map((log: any) => (
                          <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="px-4 py-4 text-[11px] text-slate-500 align-top whitespace-nowrap">
                              {formatPhilippineDateTime(log.created_at)}
                            </td>
                            <td className="px-4 py-4 text-xs align-top whitespace-nowrap">
                              {log.details?.old_full_name || log.details?.target_name ? (
                                <span className="font-bold text-[#091d64]">{log.details.target_name}</span>
                              ) : (log.details?.old_email || log.details?.new_email) ? (
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-700">Legacy User</span>
                                  <span className="text-[10px] text-slate-500 font-normal break-words">
                                    {log.details?.old_email || log.details?.new_email}
                                  </span>
                                </div>
                              ) : (
                                <span className="font-bold text-slate-700">System User</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600 align-top whitespace-nowrap">
                              {log.details?.target_barangay || log.users?.barangay?.name || 'N/A'}
                            </td>
                            <td className="px-4 py-4 text-slate-600 align-top whitespace-normal break-words text-xs max-w-xs">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {log.details?.changes ? (
                                  Object.entries(log.details.changes).map(([key, val]: any) =>
                                    val ? (
                                      <div key={key} className="flex flex-col bg-slate-50 p-1.5 rounded border border-slate-100">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{key.replace(/_/g, ' ')}</span>
                                        <div className="flex items-start gap-2 text-[11px]">
                                          <span className="text-slate-400 font-semibold shrink-0 w-9">Old:</span>
                                          <span className="text-[11px] text-rose-500 break-words truncate">{val.old || 'None'}</span>
                                        </div>
                                        <div className="flex items-start gap-2 text-[11px] mt-0.5">
                                          <span className="text-slate-400 font-semibold shrink-0 w-9">New:</span>
                                          <span className="text-[11px] text-emerald-600 font-medium break-words truncate">{val.new || 'None'}</span>
                                        </div>
                                      </div>
                                    ) : null
                                  )
                                ) : log.details?.old_email || log.details?.new_email ? (
                                  <div className="flex flex-col bg-slate-50 p-1.5 rounded border border-slate-100">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email</span>
                                    <div className="flex items-start gap-2 text-[11px]">
                                      <span className="text-slate-400 font-semibold shrink-0 w-9">Old:</span>
                                      <span className="text-[11px] text-rose-500 break-words truncate">{log.details?.old_email || 'None'}</span>
                                    </div>
                                    <div className="flex items-start gap-2 text-[11px] mt-0.5">
                                      <span className="text-slate-400 font-semibold shrink-0 w-9">New:</span>
                                      <span className="text-[11px] text-emerald-600 font-medium break-words truncate">{log.details?.new_email || 'None'}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px] col-span-full">No details recorded</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-[11px] text-slate-500 italic align-top whitespace-nowrap">
                              "{log.details?.reason || 'N/A'}"
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FIX USER TYPO MODAL */}
      {showFixTypoModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-800 text-lg mb-1">Manage User Credentials</h3>
            <p className="text-xs text-slate-500 mb-4">Correct a user&apos;s profile, contact info, or birthdate directly in the database. Leave fields blank to keep them unchanged.</p>
            
            <form onSubmit={e => { e.preventDefault(); void handleUpdateCredentials(); }} className="space-y-4">
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Search by Name, Email, Role, or User ID</label>
                <div className="flex gap-2">
                  <input required type="text" value={typoUserId} onChange={e => { setTypoUserId(e.target.value); setSearchBanner(null); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleLookupUser(); } }} className="flex-1 border border-slate-200 rounded-lg p-2.5 text-xs" placeholder="Exact email, phone number, or full name" />
                  <button type="button" onClick={(e) => { e.preventDefault(); handleLookupUser(); }} disabled={isSearching} className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 transition-colors disabled:opacity-50">
                    {isSearching ? '...' : 'Search'}
                  </button>
                </div>
                {searchBanner && (
                  <div
                    role={searchBanner.type === 'error' ? 'alert' : 'status'}
                    className={searchBanner.type === 'success' ? 'text-emerald-600 bg-emerald-50 p-2 rounded' : 'text-rose-600 bg-rose-50 p-2 rounded'}
                  >
                    {searchBanner.text}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">First Name</label>
                  <input required type="text" value={typoFirstName} disabled={!isEditingCreds} onChange={e => setTypoFirstName(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Middle Name</label>
                  <input type="text" value={typoMiddleName} disabled={!isEditingCreds} onChange={e => setTypoMiddleName(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Last Name</label>
                  <input required type="text" value={typoLastName} disabled={!isEditingCreds} onChange={e => setTypoLastName(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Suffix</label>
                  <input type="text" value={typoSuffix} disabled={!isEditingCreds} onChange={e => setTypoSuffix(e.target.value)} placeholder="e.g. Jr., III" className="w-full border border-slate-200 rounded-lg p-2.5 text-xs" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Corrected Email</label>
                <input type="email" value={typoEmail} disabled={!isEditingCreds} onChange={e => setTypoEmail(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-xs" placeholder="Leave blank if unchanged" />
              </div>

              {canResendYouthLoginLink && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs text-amber-900">Youth verification is pending. Resend a secure sign-in link so the user can submit or update their ID.</p>
                  <button
                    type="button"
                    onClick={() => void handleResendYouthLoginLink()}
                    disabled={isResendingYouthLoginLink}
                    className="shrink-0 rounded-lg bg-[#091d64] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {isResendingYouthLoginLink ? 'Sending...' : 'Resend Youth Login Link'}
                  </button>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Corrected Phone</label>
                <input type="text" value={typoPhone} disabled={!isEditingCreds} onChange={(e) => { let val = e.target.value.replace(/\D/g, ''); if (val.length > 11) val = val.slice(0, 11); setTypoPhone(val); }} maxLength={11} inputMode="numeric" className="w-full border border-slate-200 rounded-lg p-2.5 text-xs" placeholder="Leave blank if unchanged" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Corrected Birthdate</label>
                <input type="date" value={typoBirthdate} disabled={!isEditingCreds} onChange={e => setTypoBirthdate(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-xs" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Address {typoZone && <span className="normal-case text-slate-400">(Zone: {typoZone})</span>}
                </label>
                <input type="text" value={typoAddress} disabled={!isEditingCreds} onChange={e => setTypoAddress(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-xs" placeholder="Leave blank if unchanged" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Biological Sex</label>
                <select value={typoSex} disabled={!isEditingCreds} onChange={e => setTypoSex(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-xs">
                  <option value="">Leave unchanged</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <section className="rounded-xl border border-slate-200 p-4">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#091d64]">Resident Profile Details</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Zone</label>
                    <input type="text" value={typoZone} disabled={!isEditingCreds} onChange={e => setTypoZone(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-xs" placeholder="Leave blank if unchanged" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Civil Status</label>
                    <select value={typoCivilStatus} disabled={!isEditingCreds} onChange={e => setTypoCivilStatus(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-xs">
                      <option value="">Leave unchanged</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Separated">Separated</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Education</label>
                    <select value={typoEducation} disabled={!isEditingCreds} onChange={e => setTypoEducation(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-xs">
                      <option value="">Leave unchanged</option>
                      <option value="Elementary">Elementary</option>
                      <option value="High School">High School</option>
                      <option value="Vocational">Vocational</option>
                      <option value="College">College</option>
                      <option value="Post-Graduate">Post-Graduate</option>
                      <option value="Out of School Youth">Out of School Youth</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">School</label>
                    <input type="text" value={typoSchool} disabled={!isEditingCreds} onChange={e => setTypoSchool(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-xs" placeholder="Leave blank if unchanged" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Course</label>
                    <input type="text" value={typoCourse} disabled={!isEditingCreds} onChange={e => setTypoCourse(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-xs" placeholder="Leave blank if unchanged" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Year Level</label>
                    <select value={typoYearLevel} disabled={!isEditingCreds} onChange={e => setTypoYearLevel(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-xs">
                      <option value="">Leave blank if unchanged</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="5th Year">5th Year</option>
                      <option value="Graduate">Graduate</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Employment Status</label>
                    <select value={typoEmploymentStatus} disabled={!isEditingCreds} onChange={e => setTypoEmploymentStatus(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-xs">
                      <option value="">Leave unchanged</option>
                      <option value="Employed">Employed</option>
                      <option value="Unemployed">Unemployed</option>
                      <option value="Self-Employed">Self-Employed</option>
                      <option value="Student">Student</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Scholar Status</label>
                    <input type="text" value={typoScholarStatus} disabled={!isEditingCreds} onChange={e => {
                      setTypoScholarStatus(e.target.value);
                      if (!/\bscholar\b/i.test(e.target.value) || /\b(?:not|non)[-\s]+scholar\b/i.test(e.target.value)) setTypoScholarshipType('');
                    }} placeholder="e.g. Scholar, Not Scholar" className="w-full border border-slate-200 rounded-lg p-2.5 text-xs" />
                  </div>
                  {hasScholarStatus && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Scholarship Type</label>
                      <select value={typoScholarshipType} disabled={!isEditingCreds} onChange={e => setTypoScholarshipType(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-xs">
                        <option value="">Select scholarship type</option>
                        <option value="Government">Government</option>
                        <option value="Private">Private</option>
                        <option value="Academic">Academic</option>
                        <option value="NGO">NGO</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  )}
                </div>
              </section>

              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <input
                    type="checkbox"
                    checked={typoUserProfile?.is_registered_voter || false}
                    disabled={!isEditingCreds || !typoHasProfile || isUpdating}
                    onChange={(e) => setTypoUserProfile({ is_registered_voter: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-[#091d64] focus:ring-[#091d64]"
                  />
                  Registered voter
                </label>
                {!typoHasProfile && (
                  <p className="mt-1 text-[10px] text-slate-400">This user has no resident profile to store voter status.</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Purpose / Reason for Change</label>
                <textarea value={typoReason} disabled={!isEditingCreds} onChange={e => setTypoReason(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-xs" rows={2} placeholder="E.g., Corrected birthdate typo upon user request" />
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      clearTypoLookupResult();
                      setTypoUserId('');
                      setShowFixTypoModal(false);
                    }}
                    disabled={isUpdating || isSearching}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button type="button" onClick={() => { setShowFixTypoModal(false); setShowEmailModal(true); setEmailModalTab('history'); void handleLoadEmailHistory(); }} className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline">
                    View Change History
                  </button>
                </div>
                <div className="flex gap-2">
                  {!isEditingCreds ? (
                    <button type="button" disabled={!typoTargetUserId} onClick={() => setIsEditingCreds(true)} className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                      Edit Credentials
                    </button>
                  ) : (
                    <button type="button" onClick={handleUpdateCredentials} disabled={isUpdating} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                      {isUpdating ? 'Saving...' : 'Save Changes'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      <PopupDialog notice={popupMsg} onClose={() => setPopupMsg(null)} />
      <PopupDialog notice={confirmMsg} onClose={() => setConfirmMsg(null)} />
    </div>
  );
}
