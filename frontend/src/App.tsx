'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import kabisigApi from './lib/api';
import { formatPhilippineDate, getPhilippineDateString } from './lib/dateUtils';
import { DEFAULT_BARANGAY_LOGOS } from './data';
import PublicPages from './components/PublicPages';
import LandingPage from './components/LandingPage';
import SuperAdminPages from './components/SuperAdminPages';
import BarangayAdminPages from './components/BarangayAdminPages';
import OfficialPages from './components/OfficialPages';
import YouthPages from './components/YouthPages';
import ViewerPages from './components/ViewerPages';
import GlobalFormBehavior from './components/GlobalFormBehavior';
import { computeProgramStatus } from './lib/intelligence';
import { resolveUserRole } from './lib/role-routing';
import { useTenantFinancialRealtime } from './hooks/useTenantFinancialRealtime';
import { 
  BarangayTenant, 
  Program, 
  YouthProfile, 
  Registration, 
  AttendanceRecord,
  FeedbackRecord, 
  ResolutionRecord, 
  ExpenseRecord, 
  DocumentRecord,
  AnnouncementRecord,
  SystemAuditLog,
  UserRole
} from './types';
import { Settings, Info, RefreshCw, Layers, X } from 'lucide-react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';

function normalizeDocumentCategory(raw: string): string {
  if (!raw) return 'Other';
  const map: Record<string, string> = {
    'Resolution': 'Resolutions',
    'Resolutions': 'Resolutions',
    'Ordinance': 'Ordinances',
    'Ordinances': 'Ordinances',
    'Minutes': 'Minutes',
    'Meeting Minutes': 'Minutes',
    'Financial Report': 'Reports',
    'Reports': 'Reports',
    'Project Proposal': 'Accomplishment',
    'Accomplishment': 'Accomplishment',
    'Budget': 'Budget',
    'Vouchers': 'Vouchers',
    'Liquidation': 'Liquidation',
    'Communications': 'Communications',
    'Other': 'Other',
  };
  return map[raw] || raw;
}

function mapBackendProgram(program: any): Program {
  return {
    id: program.id,
    title: program.title,
    imageUrl: program.image_url || program.imageUrl || '',
    description: program.description || '',
    startDate: program.start_date ? getPhilippineDateString(program.start_date) : '',
    endDate: program.end_date ? getPhilippineDateString(program.end_date) : '',
    location: program.location || '',
    maxParticipants: Number(program.total_slots) || 0,
    budgetAllocation: Number(program.budget_allocation) || 0,
    spentBudget: 0,
    aipReference: program.aip_reference || '',
    category: program.category || 'Other',
    status: String(program.status).toLowerCase() === 'completed' ? 'Completed' : computeProgramStatus(program),
    registeredCount: program.program_registrations?.[0]?.count || 0,
    barangayId: program.tenant_id,
  };
}

function mapBackendDocument(document: any): DocumentRecord {
  return {
    id: document.id,
    title: document.title,
    category: normalizeDocumentCategory(document.document_type),
    uploadedBy: document.submitter?.full_name || 'Official',
    uploadedDate: document.created_at ? formatPhilippineDate(document.created_at) : '',
    fileSize: '',
    status: document.status === 'approved' ? 'Approved' : document.status === 'pending_approval' ? 'Pending' : document.status,
    resolutionNumber: document.resolution_number || document.resolution_no || `DOC-${document.id.slice(0, 6).toUpperCase()}`,
    resolution_number: document.resolution_number || document.resolution_no || `DOC-${document.id.slice(0, 6).toUpperCase()}`,
    description: document.description ?? '',
    fileUrl: document.file_url,
    reviewFeedback: document.feedback || '',
    designatedApprover: 'Hon. SK Chairperson',
    barangayId: document.tenant_id,
  };
}

function AppContent() {
  const router = useRouter();
  // --- Client state synchronized with the backend ---
  const [tenants, setTenants] = useState<BarangayTenant[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  const [youthProfiles, setYouthProfiles] = useState<YouthProfile[]>([]);
  const [youthProfilesLoading, setYouthProfilesLoading] = useState(false);
  const [youthProfilesError, setYouthProfilesError] = useState<string | null>(null);
  const [youthProfilesRetryCount, setYouthProfilesRetryCount] = useState(0);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [resolutions, setResolutions] = useState<ResolutionRecord[]>([]);
    const [pollsError, setPollsError] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [realtimeRefreshVersions, setRealtimeRefreshVersions] = useState({
    documents: 0,
    announcement: 0,
    feedback: 0,
  });

  // --- AUTHENTICATED USER SESSION ---
  const [currentUser, setCurrentUser] = useState<any>(null);
    const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
    // --- GLOBAL ALERT MODAL STATE ---
    const [globalAlert, setGlobalAlert] = useState<{ title: string, message: string, type: 'error' | 'success' | 'info' } | null>(null);
    const showGlobalAlert = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
      setGlobalAlert({ title: type === 'success' ? 'Success' : type === 'error' ? 'Notice' : 'KABISIG Alert', message, type });
    };
  const [currentTenant, setCurrentTenant] = useState<BarangayTenant | null>(null);
  const [currentYouth, setCurrentYouth] = useState<YouthProfile | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string>('');
  const [authReady, setAuthReady] = useState(false);
  const [authProfileReady, setAuthProfileReady] = useState(false);
  const [pendingLoginMessage, setPendingLoginMessage] = useState<string | null>(null);
  const isChairpersonRole = Number(currentUser?.role_id) === 2;
  const officialSetupRequired = [2, 3].includes(Number(currentUser?.role_id))
    && currentUser?.setup_completed !== true;
  const chairpersonSetupRequired = isChairpersonRole && officialSetupRequired;

  useTenantFinancialRealtime(
    !officialSetupRequired && currentUser?.id && currentRole !== 'Viewer'
      ? currentUser.tenant_id || currentTenant?.id
      : undefined,
    (tables) => {
      setRealtimeRefreshVersions(previous => ({
        ...previous,
        documents: previous.documents + (tables.includes('documents') ? 1 : 0),
        announcement: previous.announcement + (tables.includes('announcement') ? 1 : 0),
        feedback: previous.feedback + (tables.includes('feedback') ? 1 : 0),
      }));
    },
    ['documents', 'announcement', 'feedback'],
  );

  // Program registrations and notifications are private and must only load for authenticated roles.
  const programIdsKey = programs.map(program => program.id).join(',');
  useEffect(() => {
    if (officialSetupRequired || !currentRole || currentRole === 'Viewer' || currentRole === 'Youth Constituent' || !currentUser?.id || !kabisigApi.getToken() || !programIdsKey) {
      setRegistrations([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const all: any[] = [];
      for (const programId of programIdsKey.split(',')) {
        try {
          const rows = await kabisigApi.getProgramRegistrations(programId);
          if (Array.isArray(rows)) {
            all.push(...rows.map((row: any) => ({
              ...row,
              programId: row.programId || row.program_id || programId,
            })));
          }

        } catch (error) {
          console.warn('Registration load failed for', programId, error);
        }

      }
      if (!cancelled) setRegistrations(all);
    })();
    return () => { cancelled = true; };
  }, [programIdsKey, currentRole, currentUser?.id, officialSetupRequired]);

  useEffect(() => {
    if (officialSetupRequired || !currentRole || currentRole === 'Viewer' || !currentUser?.id || !kabisigApi.getToken()) {
      setNotifications([]);
      return;
    }
    let isMounted = true;
    const refreshNotifications = () => {
      kabisigApi.getNotifications().then(items => {
        if (isMounted) setNotifications(items);
      }).catch(error => {
        if (isMounted) console.warn('Unable to load notifications:', error);
      });
    };
    refreshNotifications();
    const intervalId = window.setInterval(refreshNotifications, 30000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshNotifications();
    };
    window.addEventListener('focus', refreshNotifications);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshNotifications);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [currentRole, currentUser?.id, officialSetupRequired]);

  useEffect(() => {
    const handleAvatarUpdated = (event: Event) => {
      const avatarUrl = (event as CustomEvent<{ avatar_url?: string }>).detail?.avatar_url;
      if (!avatarUrl) return;
      setCurrentUser((previous: any) => previous ? { ...previous, avatar_url: avatarUrl } : previous);
      setCurrentYouth((previous) => previous ? { ...previous, profilePic: avatarUrl } : previous);
    };
    window.addEventListener('kabisig:avatar-updated', handleAvatarUpdated);
    return () => window.removeEventListener('kabisig:avatar-updated', handleAvatarUpdated);
  }, []);

  useEffect(() => {
    if (!currentRole || currentRole === 'Viewer' || !currentUser?.id || !kabisigApi.getToken()) return;
    let isMounted = true;
    const refreshCurrentProfile = () => {
      kabisigApi.getCurrentUser().then((profile) => {
        if (!isMounted || !profile || profile.id !== currentUser.id) return;
        if (
          currentUser.role_id != null
          && profile.role_id != null
          && Number(profile.role_id) !== Number(currentUser.role_id)
        ) {
          kabisigApi.logout();
          queryClient.clear();
          setCurrentUser(null);
          setCurrentRole(null);
          setCurrentTenant(null);
          setCurrentYouth(null);
          setCurrentEmail('');
          setPendingLoginMessage('Your account role has changed. Please sign in again.');
          setPublicView('login');
          return;
        }
        setCurrentUser(profile);
        const verificationStatus = profile.resident_profile?.verification_status;
        if (verificationStatus) {
          setCurrentYouth(previous => previous?.userId === profile.id
            ? { ...previous, verificationStatus }
            : previous);
        }
        if (profile.avatar_url) {
          setCurrentYouth((previous) => previous ? { ...previous, profilePic: profile.avatar_url } : previous);
        }
      }).catch((error: unknown) => {
        console.warn('Unable to refresh the signed-in profile:', error);
      });
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshCurrentProfile();
    };
    refreshCurrentProfile();
    const intervalId = window.setInterval(refreshCurrentProfile, 60 * 1000);
    window.addEventListener('focus', refreshCurrentProfile);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshCurrentProfile);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [currentRole, currentUser?.id, officialSetupRequired]);

  useEffect(() => {
    if (officialSetupRequired || !currentRole || currentRole === 'Viewer' || !currentUser?.id || !kabisigApi.getToken()) return;
    let isMounted = true;
    kabisigApi.getAnnouncements().then(rows => {
      if (!isMounted) return;
      setAnnouncements(rows.map((announcement: any): AnnouncementRecord => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content || '',
        what: announcement.what || '',
        where: announcement.where_text || '',
        when: announcement.event_when || '',
        hashtags: announcement.hashtags || '',
        imageUrl: announcement.image_urls?.[0] || announcement.image_url || '',
        imageUrls: announcement.image_urls || (announcement.image_url ? [announcement.image_url] : []),
        imagePaths: announcement.image_paths || announcement.image_urls || [],
        imagePath: announcement.image_path || '',
        author: announcement.author?.full_name || 'SK Official',
        barangay: tenants.find(tenant => tenant.id === announcement.tenant_id)?.name || 'Barangay',
        datePosted: (announcement.published_at || announcement.created_at)
          ? getPhilippineDateString(announcement.published_at || announcement.created_at)
          : '',
        category: announcement.category || 'Notice',
        status: announcement.status,
        attachments: [],
      })));
    }).catch((error: any) => console.warn('Announcements unavailable:', error?.message || error));


  return () => { isMounted = false; };
  }, [currentRole, currentTenant?.id, currentUser?.id, officialSetupRequired, realtimeRefreshVersions.announcement]);

  // --- VIEWER PORTAL PUBLIC DATA (no auth) ---
  useEffect(() => {
    if (currentRole !== 'Viewer') return;
    let isMounted = true;

    kabisigApi.getPublicAnnouncements().then(rows => {
      if (!isMounted) return;
      setAnnouncements(rows.map((a: any) => ({
        id: a.id,
        title: a.title,
        content: a.content || '',
        what: a.what || '',
        where: a.where_text || '',
        when: a.event_when || '',
        hashtags: a.hashtags || '',
        imageUrl: a.image_urls?.[0] || a.image_url || '',
        imageUrls: a.image_urls || (a.image_url ? [a.image_url] : []),
        imagePaths: a.image_paths || a.image_urls || [],
        imagePath: a.image_path || '',
        author: a.author?.full_name || 'SK Official',
        barangay: a.barangay?.name || 'Barangay',
        datePosted: (a.published_at || a.created_at)
          ? getPhilippineDateString(a.published_at || a.created_at)
          : '',
        category: a.category || 'Notice',
        status: 'published',
        attachments: [],
      })));
    }).catch((e: any) => console.warn('Public announcements failed:', e?.message));

    kabisigApi.getPublicExpenses().then(rows => {
      if (!isMounted) return;
      setExpenses(rows.map((e: any) => ({
        id: e.id,
        programId: e.program_id || '',
        programTitle: e.program?.title || e.title || 'General',
        category: e.expense_category || e.budget?.category || 'Supplies',
        amount: Number(e.gross_amount) || 0,
        gross_amount: Number(e.gross_amount) || 0,
        supplier: e.payee_name || e.payee || e.supplier || 'Various Suppliers',
        taxType: e.tax_type === 'EXEMPT' ? 'Exempt' : e.tax_type || 'Non-VAT',
        vatAmount: Number(e.tax_amount) || 0,
        tax_amount: Number(e.tax_amount) || 0,
        withholdingTax: 0,
        netAmount: Number(e.net_amount) || 0,
        net_amount: Number(e.net_amount) || 0,
        barangay_name: e.barangay_name || 'Unknown Barangay',
        description: e.description || '',
        date: e.expense_date || '',
        dateLogged: e.expense_date || '',
        voucherNumber: e.voucher_number || 'DV-' + String(e.id).slice(0, 6).toUpperCase(),
        aipCode: e.aip_reference || e.program?.aip_reference || '',
        status: e.status || 'Unknown',
        barangayId: e.tenant_id,
      })));
    }).catch((e: any) => console.warn('Public expenses failed:', e?.message));

  return () => { isMounted = false; };
  }, [currentRole, currentUser?.id]);

  // --- PUBLIC PAGES NAVIGATION STATE ---
  const [publicView, setPublicView] = useState<'landing' | 'login' | 'signup' | 'transparency'>('landing');
  const navigatingToSignInRef = useRef(false);
  const [programConflict, setProgramConflict] = useState<{ program: Program; resolve: (confirmed: boolean) => void } | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (chairpersonSetupRequired) {
      const setupParams = new URLSearchParams();
      const email = currentEmail || currentUser?.email || '';
      const tenantId = currentTenant?.id || currentUser?.tenant_id || '';
      if (email) setupParams.set('invite_email', email);
      if (tenantId) setupParams.set('tenant_id', tenantId);
      setupParams.set('role', 'chairperson');
      router.replace(`/chairperson-setup?${setupParams.toString()}`);
    }
  }, [chairpersonSetupRequired, currentEmail, currentUser?.email, currentUser?.tenant_id, currentTenant?.id, router]);

  // Load 27 permanently seeded Naga City barangays and restore session from backend API
  useEffect(() => {
    const invalidateSession = () => {
      kabisigApi.setToken(null);
      queryClient.clear();
      setCurrentUser(null);
      setCurrentRole(null);
      setCurrentTenant(null);
      setCurrentYouth(null);
      setCurrentEmail('');
      setPublicView(navigatingToSignInRef.current ? 'login' : 'landing');
    };
    window.addEventListener('kabisig:auth-invalid', invalidateSession);


  return () => window.removeEventListener('kabisig:auth-invalid', invalidateSession);
  }, []);

  useEffect(() => {
    const storedToken = kabisigApi.getToken();
    kabisigApi.getBarangays().then((data) => {
      const sortedBarangays = data
        .map(barangay => ({
          ...barangay,
          logo: barangay.logo_url || barangay.logo || DEFAULT_BARANGAY_LOGOS[barangay.name] || '',
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setTenants(sortedBarangays);

      if (storedToken) {
        kabisigApi.getCurrentUser().then(user => {
          if (user?.tenant_id) {
            const matchedBgy = sortedBarangays.find(b => b.id === user.tenant_id);
            if (matchedBgy) setCurrentTenant(matchedBgy);
          }
        }).catch(console.warn).finally(() => setAuthReady(true));
      } else {
        setAuthReady(true);
      }
    }).catch(error => {
      if (error?.message !== 'UNAUTHORIZED') {
        console.error('Unable to load barangay registry:', error);
        setTenants([]);
        showGlobalAlert('The barangay registry could not be loaded. Please refresh and try again.', 'error');
      }
      setAuthReady(true);
    });

    // Invitation links must never reuse an existing Super Admin/browser session.
    const inviteParams = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : null;
    const isChairpersonInvite = inviteParams?.get('invite_email')
      && inviteParams.get('role') === 'chairperson';
    const isChairpersonSetupPath = typeof window !== 'undefined'
      && window.location.pathname === '/chairperson-setup';

    if (isChairpersonInvite) {
      kabisigApi.logout();
      queryClient.clear();
      setCurrentUser(null);
      setCurrentTenant(null);
      setCurrentYouth(null);
      setCurrentRole(null);
      setPublicView('login');
    } else if (isChairpersonSetupPath) {
      setPublicView('login');
    }

    // Restore an authenticated session only when this is not an invitation flow.
    const token = isChairpersonInvite ? null : kabisigApi.getToken();
    if (token) {
      let profileResolved = false;
      kabisigApi.getCurrentUser().then(user => {
        if (!user) {
          profileResolved = true;
          return;
        }
        if (user.role_id === undefined || user.role_id === null) {
          setCurrentUser(user);
          return;
        }
        profileResolved = true;
        {
          const isYouthConstituent = Number(user.role_id) === 4;
          const restoredRole = isYouthConstituent ? 'Youth Constituent' : resolveUserRole(user);
          if (
            String(user.status || '').toLowerCase() === 'pending'
            && !isYouthConstituent
            && restoredRole !== 'Super Admin'
            && restoredRole !== 'Barangay Admin'
          ) {
            localStorage.removeItem('token');
            localStorage.removeItem('kabisig_token');
            localStorage.removeItem('user');
            sessionStorage.clear();
            kabisigApi.setToken(null);
            setCurrentUser(null);
            setCurrentRole(null);
            setCurrentTenant(null);
            setCurrentYouth(null);
            setCurrentEmail('');
            setGlobalAlert(null);
            setPendingLoginMessage('Your account is still pending approval by your Sangguniang Kabataan Chairperson. Please contact your SK Chairperson.');
            setPublicView('login');
            setAuthReady(true);
            return;
          }
          if (user.status === 'rejected') {
            kabisigApi.logout();
            showGlobalAlert('Access Denied!\n\nYour account application was rejected.', 'error');
            return;
          }
          if (!restoredRole) {
            kabisigApi.logout();
            setCurrentUser(null);
            setCurrentTenant(null);
            setCurrentYouth(null);
            setCurrentRole(null);
            setPublicView('landing');
            showGlobalAlert('Your account role or SK Official position is not configured. Please contact your SK Federation President.', 'error');
            return;
          }
          if (user && user.role_id === 4 && user.full_name) { user.full_name = user.full_name.replace(/^Hon\.\s+/i, ''); }
        setCurrentUser(user);
          setCurrentEmail(user.email || '');
          if (restoredRole === 'Super Admin') {
            setCurrentRole(restoredRole);
          } else if (restoredRole === 'Barangay Admin') {
            setCurrentRole(restoredRole);
            if (user.tenant_id) {
              const bgy = tenants.find(t => t.id === user.tenant_id);
              if (bgy) {
                setCurrentTenant({
                  ...bgy,
                  logo: bgy.logo || DEFAULT_BARANGAY_LOGOS[bgy.name] || ''
                });
              }
            }
          } else if (
            restoredRole === 'SK Kagawad' ||
            restoredRole === 'SK Secretary' ||
            restoredRole === 'SK Treasurer'
          ) {
            setCurrentRole(restoredRole);
            if (user.tenant_id) {
              const bgy = tenants.find(t => t.id === user.tenant_id);
              if (bgy) {
                setCurrentTenant({
                  ...bgy,
                  logo: bgy.logo || DEFAULT_BARANGAY_LOGOS[bgy.name] || ''
                });
              }
            }
          } else if (restoredRole === 'Youth Constituent') {
            setCurrentRole(restoredRole);
            if (user.tenant_id) {
              const bgy = tenants.find(t => t.id === user.tenant_id);
              if (bgy) {
                setCurrentTenant({
                  ...bgy,
                  logo: bgy.logo || DEFAULT_BARANGAY_LOGOS[bgy.name] || ''
                });
              }
            }
            const meta = user.user_metadata || {};
            const resident = user.resident_profile || {};
            const youthFromDb: any = {
              userId: user.id,
              id: meta.id || resident.digital_youth_id || '',
              name: user.full_name || meta.name || '',
              full_name: user.full_name || meta.full_name || meta.name || '',
              first_name: (user as any).first_name ?? null,
              middle_name: (user as any).middle_name ?? null,
              last_name: (user as any).last_name ?? null,
              suffix: (user as any).suffix ?? null,
              sex: resident.sex || meta.sex || '',
              birthdate: resident.birthdate || meta.birthdate || '',
              age: Number(user.age ?? meta.age) || 0,
              is_age_out: user.is_age_out === true,
              civilStatus: resident.civil_status || resident.marital_status || meta.civilStatus || '',
              address: resident.address || meta.address || '',
              zone: resident.zone || meta.zone || '',
              mobile: user.phone || meta.mobile || '',
              email: user.email || meta.email || '',
              educationalLevel: meta.educationalLevel || resident.educational_status || '',
              school: resident.school || meta.school || '',
              course: resident.course || meta.course || '',
              youthSector: (resident as any).youth_sector || '',
              is_registered_voter: resident.is_registered_voter === true,
              privacy_consent: resident.privacy_consent === true,
              profilePic: user.avatar_url || meta.profilePic || '',
              year: resident.year_level || meta.year || '',
              employmentStatus: resident.employment_status || meta.employmentStatus || '',
              scholarStatus: resident.scholar_status || meta.scholarStatus || '',
              scholarshipSource: resident.scholarship_source || meta.scholarshipSource || '',
              scholarshipSourceDetail: meta.scholarshipSourceDetail || '',
              scholarshipType: meta.scholarshipType || '',
              guardianName: resident.guardian_name || meta.guardianName || '',
              guardianContact: resident.guardian_contact || meta.guardianContact || '',
              qrCode: resident.qr_code_url || meta.qrCode,
              verificationStatus: resident.verification_status || meta.verificationStatus || 'pending',
              status: user.status === 'active' ? 'Approved' : (user.status === 'rejected' ? 'Rejected' : user.status === 'suspended' ? 'suspended' : 'Pending'),
              suspension_reason: (user as any).suspension_reason || null,
              barangayId: user.tenant_id || '',
              dateRegistered: user.created_at ? getPhilippineDateString(user.created_at) : getPhilippineDateString(),
              registeredRole: 'Youth Constituent',
              is_demoted: (user as any).is_demoted === true,
              has_edited_profile: (user as any).has_edited_profile === true,
            };
            setCurrentYouth(youthFromDb);
            setYouthProfiles(prev => [youthFromDb, ...prev.filter(p => p.id !== youthFromDb.id && p.email !== youthFromDb.email)]);
          }
        }
      }).catch(console.warn).finally(() => {
        if (profileResolved) setAuthProfileReady(true);
      });
    } else {
      setAuthProfileReady(true);
    }

  }, []);

  useEffect(() => {
    const authenticatedUserId = currentUser?.id;
    const authenticatedTenantId = currentUser?.tenant_id;
    if (!authenticatedUserId) return;

    let isMounted = true;
    kabisigApi.getBarangays().then(data => {
      if (!isMounted) return;
      const sortedBarangays = data
        .map(barangay => ({
          ...barangay,
          logo: barangay.logo_url || barangay.logo || DEFAULT_BARANGAY_LOGOS[barangay.name] || '',
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setTenants(sortedBarangays);
      if (authenticatedTenantId) {
        const matchedBarangay = sortedBarangays.find(barangay => barangay.id === authenticatedTenantId);
        if (matchedBarangay) setCurrentTenant(matchedBarangay);
      }
    }).catch(error => {
      if (!isMounted) return;
      if (error?.message !== 'UNAUTHORIZED') {
        console.error('Unable to refresh barangay registry:', error);
        showGlobalAlert('The barangay registry could not be loaded. Please refresh and try again.', 'error');
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, currentUser?.tenant_id]);

  useEffect(() => {
    if (officialSetupRequired) {
      setPrograms([]);
      setDocuments([]);
      setExpenses([]);
      setRegistrations([]);
      setResolutions([]);
      setFeedback([]);
      setYouthProfiles([]);
      setAnnouncements([]);
      return;
    }
    if (!currentRole) {
      setPrograms([]);
      setDocuments([]);
      setExpenses([]);
      return;
    }

    if (currentRole === 'Viewer') {
      let isMounted = true;
      kabisigApi.getPublicDocuments().then((docs: any[]) => {
        if (!isMounted) return;
        const publicDocuments = docs || [];
        setDocuments(publicDocuments);
      }).catch(error => {
        if (isMounted) console.warn('Unable to load public resolutions:', error);
      });
      kabisigApi.request<any[]>('/public/polls', { method: 'GET' }).then(response => {
        if (!isMounted) return;
        if (!response.success) {
          console.warn('Unable to load public polls:', response.message);
          return;
        }
        if (!Array.isArray(response.data)) {
          console.warn('Unable to load public polls: the server returned an invalid response.');
          setResolutions([]);
          return;
        }
        const mappedResolutions: ResolutionRecord[] = response.data.map((poll: any) => ({
          id: poll.id,
          tenant_id: poll.tenant_id,
          end_date: poll.end_date,
          resolutionNumber: poll.id,
          author: 'SK Council',
          title: poll.question || 'Untitled Resolution',
          content: poll.question || '',
          status: poll.is_active ? 'Voting Open' : 'Closed',
          validityPeriod: '',
          votesSupport: 0,
          votesOppose: 0,
          votesAbstain: 0,
          votedUsers: [],
          dateCreated: poll.created_at || '',
        }));
        setResolutions(mappedResolutions);
      }).catch(error => {
        if (isMounted) console.warn('Unable to load public polls:', error);
      });
      setPrograms([]);
      setFeedback([]);
      setYouthProfiles([]);
      setExpenses([]);
      setAnnouncements([]);

      const refreshPublicPrograms = () => {
        kabisigApi.getPublicPrograms().then(rows => {
          if (!isMounted) return;
          setPrograms(rows.map((p: any): Program => ({
            id: p.id,
            title: p.title,
            imageUrl: p.image_url || p.imageUrl || '',
            description: p.description || '',
            startDate: p.start_date ? getPhilippineDateString(p.start_date) : '',
            endDate: p.end_date ? getPhilippineDateString(p.end_date) : '',
            location: p.location || '',
            maxParticipants: Number(p.total_slots) || 0,
            budgetAllocation: Number(p.budget_allocation) || 0,
            spentBudget: 0,
            aipReference: p.aip_reference || '',
            category: p.category || 'Other',
            status: (String((p as any).status).toLowerCase() === 'completed' ? 'Completed' : computeProgramStatus(p)),
            registeredCount: 0,
            barangayId: p.tenant_id,
          })));
        }).catch(error => console.warn('Unable to load public programs:', error));
      };
      refreshPublicPrograms();
      const intervalId = window.setInterval(refreshPublicPrograms, 120000);
      return () => {
        isMounted = false;
        window.clearInterval(intervalId);
      };
    }

    const token = kabisigApi.getToken();
    if (!currentUser?.id || !token) {
      setPrograms([]);
      setDocuments([]);
      setExpenses([]);
      setRegistrations([]);
      setResolutions([]);
      setFeedback([]);
      setYouthProfiles([]);
      return;
    }

    let isMounted = true;
    setPrograms([]);
    setDocuments([]);
    setExpenses([]);
    if (currentRole !== 'Barangay Admin' && currentRole !== 'SK Chairperson' && currentRole !== 'Super Admin') setYouthProfiles([]);

    const refreshPrograms = () => {
      kabisigApi.getPrograms().then(progs => {
        if (!isMounted) return;
        setPrograms(progs.map(mapBackendProgram));
      }).catch(error => console.warn('Unable to load programs for active role:', error));
    };
    const refreshProgramsWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshPrograms();
    };
    refreshPrograms();
    const programRefreshInterval = window.setInterval(refreshPrograms, 120000);
    document.addEventListener('visibilitychange', refreshProgramsWhenVisible);

    kabisigApi.getDocuments().then(docs => {
      if (!isMounted) return;
      setDocuments(docs.map(mapBackendDocument));
    }).catch(error => console.warn('Unable to load documents for active role:', error));

    kabisigApi.getExpenses(currentTenant?.id).then(exps => {
      if (!isMounted) return;
      setExpenses(exps.map((e: any): ExpenseRecord => ({
          id: e.id,
          programId: e.program_id || '',
          budgetId: e.budget_id,
          programTitle: e.program?.title || e.title,
          category: e.budget?.category || 'Supplies',
          amount: Number(e.gross_amount) || Number(e.amount) || 0,
          supplier: e.payee || e.supplier || e.title || 'N/A',
          taxType: e.tax_type === 'EXEMPT' ? 'Exempt' : e.tax_type || e.taxType || 'Non-VAT',
          vatAmount: Number(e.vat_amount ?? e.vatAmount) || 0,
          withholdingTax: Number(e.withholding_tax ?? e.withholdingTax) || 0,
          netAmount: e.net_amount != null || e.netAmount != null
            ? Number(e.net_amount ?? e.netAmount)
            : undefined,
          description: e.description || '',
          date: e.expense_date || (e.created_at ? getPhilippineDateString(e.created_at) : ''),
          dateLogged: e.expense_date || e.dateLogged || (e.created_at ? getPhilippineDateString(e.created_at) : ''),
          voucherNumber: `DV-${e.id.slice(0, 6).toUpperCase()}`,
          status: e.status === 'approved' ? 'Approved' : 'Pending',
          payee: e.payee || e.title,
          barangayId: e.tenant_id,
      })));
    }).catch(error => console.warn('Unable to load expenses for active role:', error));



  return () => {
    isMounted = false;
    window.clearInterval(programRefreshInterval);
    window.removeEventListener('focus', refreshPrograms);
    document.removeEventListener('visibilitychange', refreshProgramsWhenVisible);
  };
  }, [currentRole, currentTenant?.id, officialSetupRequired]);

  useEffect(() => {
    if (
      realtimeRefreshVersions.documents === 0
      || officialSetupRequired
      || !currentRole
      || currentRole === 'Viewer'
      || !currentUser?.id
      || !kabisigApi.getToken()
    ) return;
    let isMounted = true;
    kabisigApi.getDocuments().then(docs => {
      if (isMounted) setDocuments(docs.map(mapBackendDocument));
    }).catch(error => console.warn('Unable to refresh documents after a realtime update:', error));
    return () => {
      isMounted = false;
    };
  }, [currentRole, currentUser?.id, officialSetupRequired, realtimeRefreshVersions.documents]);

  // After login, reload barangays with the user's token: the pre-login list hides contact details.
  useEffect(() => {
    if (!currentUser?.id || !kabisigApi.getToken()) return;
    let isMounted = true;
    kabisigApi.getBarangays().then((data) => {
      if (!isMounted || !data || data.length === 0) return;
      setTenants(prev => prev.map(existing => {
        const fresh = data.find(b => b.id === existing.id);
        return fresh ? {
          ...existing,
          ...fresh,
          logo: fresh.logo_url || fresh.logo || existing.logo || '',
        } : existing;
      }));
    }).catch(console.warn);


  return () => { isMounted = false; };
  }, [currentUser?.id]);

  // Keep currentTenant in step with the live tenants list so budget cards update after expenses or a refetch.
  useEffect(() => {
    setCurrentTenant(prev => {
      if (!prev) return prev;
      const live = tenants.find(t => t.id === prev.id);
      return live ? {
        ...prev,
        ...live,
        logo: live.logo_url || live.logo || prev.logo || '',
      } : prev;
    });
  }, [tenants]);

  useEffect(() => {
    if (officialSetupRequired) {
      setYouthProfilesLoading(false);
      setYouthProfilesError(null);
      return;
    }
    const officialOrAdmin =
      currentRole === 'Barangay Admin' ||
      currentRole === 'SK Chairperson' ||
      currentRole === 'SK Kagawad' ||
      currentRole === 'SK Secretary' ||
      currentRole === 'SK Treasurer';
    const hasToken = Boolean(kabisigApi.getToken());
    if (!officialOrAdmin || !currentUser?.id || !hasToken) {
      setYouthProfilesLoading(false);
      setYouthProfilesError(null);
      setYouthProfiles([]);
      return;
    }

    let isMounted = true;
    let hasLoaded = false;
    const youthProfileTenantId = currentUser?.tenant_id || currentTenant?.id;
    const refreshYouthProfiles = () => {
      if (!hasLoaded) {
        setYouthProfilesLoading(true);
        setYouthProfilesError(null);
      }
      kabisigApi.getYouthProfiles(false, undefined, youthProfileTenantId).then(({ data, error }) => {
        if (!isMounted) return;
        if (error || data === null) {
          setYouthProfilesError(error || 'Unable to load youth profiles.');
          return;
        }
        setYouthProfiles(data);
        setYouthProfilesError(null);
      }).catch((error: unknown) => {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : 'Unable to load youth profiles.';
        setYouthProfilesError(message);
        console.warn('Unable to refresh youth management records:', message);
      }).finally(() => {
        if (isMounted && !hasLoaded) {
          hasLoaded = true;
          setYouthProfilesLoading(false);
        }
      });
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshYouthProfiles();
    };
    refreshYouthProfiles();
    const intervalId = window.setInterval(refreshYouthProfiles, 120000);
    window.addEventListener('focus', refreshYouthProfiles);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshYouthProfiles);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [currentRole, currentTenant?.id, currentUser?.id, currentUser?.tenant_id, youthProfilesRetryCount, officialSetupRequired]);

  useEffect(() => {
    if (officialSetupRequired || !currentRole || currentRole === 'Viewer' || !currentUser?.id || !kabisigApi.getToken()) {
      setPollsError(null);
      return;
    }
    let isMounted = true;
    const refreshPolls = () => {
      kabisigApi.getPolls().then((polls) => {
        if (!isMounted) return;
        setResolutions(polls);
        setPollsError(null);
      }).catch((error: any) => {
        if (!isMounted) return;
        setPollsError(error.message || 'Polls could not be loaded.');
        console.warn('Unable to load polls for active tenant:', error);
      });
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshPolls();
    };
    refreshPolls();
    const intervalId = window.setInterval(refreshPolls, 30000);
    window.addEventListener('focus', refreshPolls);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshPolls);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [currentRole, currentTenant?.id, currentUser?.id, officialSetupRequired]);

  useEffect(() => {
    if (officialSetupRequired) {
      setFeedback([]);
      setFeedbackError(null);
      return;
    }
    if (!currentRole || currentRole === 'Viewer' || currentRole === 'Super Admin' || !currentUser?.id || !kabisigApi.getToken()) return;
    let isMounted = true;
    const refreshFeedback = () => {
      kabisigApi.getFeedback().then((feeds) => {
        if (!isMounted) return;
        setFeedback(feeds.map((f: any): FeedbackRecord => ({
          id: f.id,
          userId: f.user_id || undefined,
          type: f.category || 'General',
          title: f.subject,
          content: f.message,
          rating: f.sentiment === 'positive' ? 5 : f.sentiment === 'negative' ? 1 : 3,
          sentiment: f.sentiment,
          anonymous: f.is_anonymous || false,
          status: f.status === 'resolved' ? 'Resolved'
            : f.status === 'under_review' ? 'Reviewed'
              : f.status === 'dismissed' ? 'Dismissed'
                : f.status === 'spam' || f.status === 'pending_review' || f.status === 'flagged' ? f.status
                  : 'Pending',
          dateSubmitted: f.created_at ? getPhilippineDateString(f.created_at) : getPhilippineDateString(),
          submittedBy: f.is_anonymous ? 'Anonymous' : f.users?.full_name || 'Youth Constituent',
          response: f.response || '',
          residentProfile: f.users?.resident_profile ? {
            age: f.users.resident_profile.birthdate ? Math.max(15, Math.floor((Date.now() - new Date(f.users.resident_profile.birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))) : undefined,
            sex: f.users.resident_profile.sex || undefined,
            address: f.users.resident_profile.address || undefined,
            educationalLevel: f.users.resident_profile.educational_status || undefined,
            employmentStatus: f.users.resident_profile.employment_status || undefined,
            contact: f.users.phone || undefined,
            email: f.users.email || undefined,
          } : undefined,
        })));
        setFeedbackError(null);
      }).catch(error => {
        if (!isMounted) return;
        setFeedbackError(error instanceof Error ? error.message : 'Feedback could not be loaded.');
        console.warn('Unable to load feedback history for active user:', error);
      });
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshFeedback();
    };
    refreshFeedback();
    const intervalId = window.setInterval(refreshFeedback, 30000);
    window.addEventListener('focus', refreshFeedback);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshFeedback);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };

  }, [currentRole, currentTenant?.id, currentUser?.id, officialSetupRequired, realtimeRefreshVersions.feedback]);

  useEffect(() => {
    if (officialSetupRequired) {
      setAuditLogs([]);
      return;
    }
    const canReadAuditLogs = currentRole === 'Super Admin'
      || currentRole === 'Barangay Admin'
      || currentRole === 'SK Chairperson'
      || currentRole === 'SK Kagawad'
      || currentRole === 'SK Secretary'
      || currentRole === 'SK Treasurer';
    if (!canReadAuditLogs || !currentUser?.id || !kabisigApi.getToken()) return;
    let isMounted = true;
    const refreshAuditLogs = () => {
      kabisigApi.getAuditLogs().then(logs => {
        if (isMounted && logs) setAuditLogs(logs);
      }).catch(error => console.warn('Unable to load audit logs:', error));
    };
    refreshAuditLogs();
    const intervalId = window.setInterval(refreshAuditLogs, 30000);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [currentRole, currentUser?.id, officialSetupRequired]);

  // --- AUTH CALLBACKS ---
  const handleLogin = (role: UserRole | 'Viewer', tenantId: string, emailOrName?: string, userObj?: any) => {
    navigatingToSignInRef.current = false;
    const roleId = Number(userObj?.role_id);
    const roleFromId: UserRole | null = roleId === 1
      ? 'Super Admin'
      : roleId === 2
        ? 'Barangay Admin'
        : roleId === 3
          ? resolveUserRole({
            ...userObj,
            official_position: userObj?.official_position || userObj?.official_role || userObj?.position,
          })
          : roleId === 4
            ? 'Youth Constituent'
            : null;
    const resolvedRole: UserRole = roleFromId || ((role === 'SK Chairperson' || role === 'Barangay Admin') ? 'Barangay Admin' : role);

    if (emailOrName) {
      setCurrentEmail(emailOrName);
    }
    if (userObj) {
      if (currentUser?.id !== userObj.id) {
        queryClient.clear();
      }
      setCurrentUser(userObj);
    } else {
      queryClient.clear();
      setCurrentUser(null);
      kabisigApi.getCurrentUser().then(user => {
        if (user) if (user && user.role_id === 4 && user.full_name) { user.full_name = user.full_name.replace(/^Hon\.\s+/i, ''); }
        setCurrentUser(user);
      }).catch(console.warn);
    }
    // Check if the user has a registered profile with a pending or rejected status
    if (emailOrName) {
      const matchedProfile = youthProfiles.find(p => p.email.toLowerCase() === emailOrName.trim().toLowerCase());
      if (matchedProfile && matchedProfile.registeredRole === resolvedRole) {
        if (matchedProfile.status === 'Pending' && resolvedRole !== 'Youth Constituent') {
          showGlobalAlert(`Access Denied!\n\nYour registration as ${resolvedRole} is currently PENDING approval by your Sangguniang Kabataan Chairperson.\n\nPlease wait for validation.`, 'error');
          return;
        } else if (matchedProfile.status === 'Rejected') {
          showGlobalAlert(`Access Denied!\n\nYour registration as ${resolvedRole} was REJECTED by your Sangguniang Kabataan Chairperson.\n\nReason: ${matchedProfile.rejectionReason || 'No reason specified.'}`, 'error');
          return;
        }
      }
    }

    // Resolve tenant with multi-tenant binding priority
    const authoritativeTenantId = userObj?.tenant_id || tenantId;
    let selectedTenant = tenants.find(t => t.id === authoritativeTenantId);
    if (!selectedTenant && emailOrName) {
      const emailLower = emailOrName.trim().toLowerCase();
      // Match by youth/official profile binding
      const matchedProfile = youthProfiles.find(p => p.email.toLowerCase() === emailLower);
      if (matchedProfile?.barangayId) {
        selectedTenant = tenants.find(t => t.id === matchedProfile.barangayId);
      }
      // Match by assigned chairperson email
      if (!selectedTenant) {
        selectedTenant = tenants.find(t => t.chairpersonEmail?.toLowerCase() === emailLower);
      }
    }
    if (!selectedTenant) {
      selectedTenant = tenants[0];
    }

    if (selectedTenant) {
      selectedTenant = {
        ...selectedTenant,
        logo: selectedTenant.logo || DEFAULT_BARANGAY_LOGOS[selectedTenant.name] || ''
      };
    }

    setCurrentTenant(selectedTenant);
    setCurrentRole(resolvedRole);

    if (resolvedRole === 'Youth Constituent') {
      let matchedProfile = youthProfiles.find(p => p.email.toLowerCase() === emailOrName?.toLowerCase() || p.name === emailOrName);
      if (userObj) {
        const meta = userObj.user_metadata || {};
        const resident = userObj.resident_profile || {};
        const mergedFromDb: any = {
          userId: userObj.id,
          id: resident.digital_youth_id || meta.id || matchedProfile?.id || '',
          name: userObj.full_name || meta.name || matchedProfile?.name || '',
          full_name: userObj.full_name ?? meta.full_name ?? meta.name ?? matchedProfile?.full_name ?? matchedProfile?.name ?? '',
          first_name: userObj.first_name ?? null,
          middle_name: userObj.middle_name ?? null,
          last_name: userObj.last_name ?? null,
          suffix: userObj.suffix ?? null,
          sex: resident.sex || meta.sex || matchedProfile?.sex || '',
          birthdate: resident.birthdate || meta.birthdate || matchedProfile?.birthdate || '',
          age: Number(meta.age ?? matchedProfile?.age) || 0,
          civilStatus: resident.civil_status || resident.marital_status || meta.civilStatus || matchedProfile?.civilStatus || '',
          address: resident.address || meta.address || matchedProfile?.address || '',
          zone: resident.zone || meta.zone || matchedProfile?.zone || '',
          mobile: userObj.phone || meta.mobile || matchedProfile?.mobile || '',
          email: userObj.email || meta.email || matchedProfile?.email || emailOrName || '',
          educationalLevel: meta.educationalLevel || resident.educational_status || matchedProfile?.educationalLevel || '',
          school: resident.school || meta.school || matchedProfile?.school || '',
          course: resident.course || meta.course || matchedProfile?.course || '',
          youthSector: (resident as any).youth_sector || matchedProfile?.youthSector || '',
          is_registered_voter: resident.is_registered_voter === true,
          privacy_consent: resident.privacy_consent === true,
          year: resident.year_level || meta.year || matchedProfile?.year || '',
          employmentStatus: resident.employment_status || meta.employmentStatus || matchedProfile?.employmentStatus || '',
          scholarStatus: resident.scholar_status || meta.scholarStatus || matchedProfile?.scholarStatus || '',
          scholarshipSource: resident.scholarship_source || meta.scholarshipSource || matchedProfile?.scholarshipSource || '',
          scholarshipSourceDetail: meta.scholarshipSourceDetail || matchedProfile?.scholarshipSourceDetail || '',
          scholarshipType: meta.scholarshipType || matchedProfile?.scholarshipType || '',
          guardianName: resident.guardian_name || meta.guardianName || matchedProfile?.guardianName || '',
          guardianContact: resident.guardian_contact || meta.guardianContact || matchedProfile?.guardianContact || '',
          qrCode: resident.qr_code_url || meta.qrCode || matchedProfile?.qrCode,
          verificationStatus: resident.verification_status || meta.verificationStatus || matchedProfile?.verificationStatus || 'pending',
          status: userObj.status === 'active' ? 'Approved' : (userObj.status === 'rejected' ? 'Rejected' : userObj.status === 'suspended' ? 'suspended' : 'Pending'),
          suspension_reason: (userObj as any).suspension_reason || null,
          barangayId: userObj.tenant_id || matchedProfile?.barangayId || '',
          dateRegistered: userObj.created_at ? getPhilippineDateString(userObj.created_at) : matchedProfile?.dateRegistered || getPhilippineDateString(),
          registeredRole: 'Youth Constituent',
          is_demoted: (userObj as any).is_demoted === true,
          has_edited_profile: (userObj as any).has_edited_profile === true,
        };
        matchedProfile = mergedFromDb;
      }

      if (!matchedProfile && typeof window !== 'undefined') {
        const saved = localStorage.getItem('kabisig_current_youth');
        if (saved) {
          try { matchedProfile = JSON.parse(saved); } catch {}
        }
      }

      const finalProfile = matchedProfile || youthProfiles[0];
      setCurrentYouth(finalProfile);
      if (finalProfile) {
        setYouthProfiles(prev => {
          const exists = prev.some(p => p.id === finalProfile.id || p.email.toLowerCase() === finalProfile.email.toLowerCase());
          return exists ? prev.map(p => (p.id === finalProfile.id || p.email.toLowerCase() === finalProfile.email.toLowerCase()) ? finalProfile : p) : [finalProfile, ...prev];
        });
      }
    } else {
      setCurrentYouth(null);
    }
  };

  const handleLogout = () => {
    kabisigApi.logout();
    queryClient.clear();
    navigatingToSignInRef.current = false;
    setCurrentRole(null);
    setCurrentTenant(null);
    setCurrentYouth(null);
    setCurrentUser(null);
    setCurrentEmail('');
    setPublicView('landing');
    if (typeof window !== 'undefined') {
      try { localStorage.clear(); sessionStorage.clear(); } catch {}
    }
  };

  // --- BARANGAY ADMIN INTERACTION WORKFLOWS ---
  const handleApproveYouth = async (id: string) => {
    const matchedYouth = youthProfiles.find(p => p.id === id || p.userId === id);
    if (!matchedYouth?.userId) {
      showGlobalAlert('This profile has no database user ID and cannot be approved yet. Refresh the youth registry and try again.', 'error');
      return;
    }

    const approval = await kabisigApi.approveUser(matchedYouth.userId);
    if (!approval.success) {
      showGlobalAlert(approval.message || 'The youth profile could not be approved.', 'error');
      return;
    }

    const approvedByName = currentTenant ? currentTenant.chairperson : 'SK Chairperson';
    const approvedAtTime = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Update youth profile state
    setYouthProfiles(prev => prev.map(p => p.id === id || p.userId === id ? {
      ...p, 
      status: 'Approved',
      verificationStatus: 'verified',
      approvedBy: approvedByName,
      approvedAt: approvedAtTime
    } : p));
    
    // Also approve associated registration tickets
    setRegistrations(prev => prev.map(r => r.participantId === id ? { ...r, status: 'Approved' } : r));
    
    // Update tenant counts if it's a regular constituent
    if (currentTenant && (!matchedYouth?.registeredRole || matchedYouth?.registeredRole === 'Youth Constituent')) {
      setTenants(prev => prev.map(t => t.id === currentTenant.id ? { ...t, youthPopulation: t.youthPopulation + 1 } : t));
    }

    if (matchedYouth) {
      // Create audit log
      const isOfficial = matchedYouth.registeredRole && matchedYouth.registeredRole !== 'Youth Constituent';
      const logRole = isOfficial ? matchedYouth.registeredRole : 'Youth Constituent';
      const newLog: SystemAuditLog = {
        id: `LOG-${Date.now().toString().slice(-4)}`,
        timestamp: approvedAtTime,
        user: approvedByName,
        role: 'Barangay Admin',
        action: 'Account Verification Approved',
        details: `Approved registry application for ${matchedYouth.name} as ${logRole}. Approved By: ${approvedByName}.`
      };
      setAuditLogs(prev => [newLog, ...prev]);

      // Show in-app notification
      showGlobalAlert(`Approval Successful!\n\nUser: ${matchedYouth.name}\nRole: ${logRole}\nApproved By: ${approvedByName}\nApproved At: ${approvedAtTime}\n\nNotification sent to registered email: ${matchedYouth.email}`, 'success');
    }
  };

  const handleRejectYouth = async (id: string, reason: string) => {
    const matchedYouth = youthProfiles.find(p => p.id === id || p.userId === id);
    if (!matchedYouth?.userId) {
      showGlobalAlert('This profile has no database user ID and cannot be rejected yet.', 'error');
      return;
    }
    const rejection = await kabisigApi.rejectUser(matchedYouth.userId, reason);
    if (!rejection.success) {
      showGlobalAlert(rejection.message || 'The user application could not be rejected.', 'error');
      return;
    }
    const approvedByName = currentTenant ? currentTenant.chairperson : 'SK Chairperson';
    const approvedAtTime = new Date().toISOString().replace('T', ' ').slice(0, 19);

    setYouthProfiles(prev => prev.map(p => p.id === id || p.userId === id ? { ...p, status: 'Rejected', rejectionReason: reason } : p));
    setRegistrations(prev => prev.map(r => r.participantId === id ? { ...r, status: 'Rejected' } : r));
    
    if (matchedYouth) {
      // Create audit log
      const isOfficial = matchedYouth.registeredRole && matchedYouth.registeredRole !== 'Youth Constituent';
      const logRole = isOfficial ? matchedYouth.registeredRole : 'Youth Constituent';
      const newLog: SystemAuditLog = {
        id: `LOG-${Date.now().toString().slice(-4)}`,
        timestamp: approvedAtTime,
        user: approvedByName,
        role: 'Barangay Admin',
        action: 'Account Verification Rejected',
        details: `Rejected registry application for ${matchedYouth.name} (${logRole}). Reason: ${reason}`
      };
      setAuditLogs(prev => [newLog, ...prev]);

      // Log a notification/feedback item to represent the rejection reason to the youth
      const feedbackItem: FeedbackRecord = {
        id: `feed-rej-${Date.now().toString().slice(-3)}`,
        type: 'Complaint',
        title: 'Registry Verification Failed',
        content: `Your Sangguniang Kabataan profile registration was rejected. Reason: ${reason}`,
        rating: 1,
        anonymous: false,
        status: 'Resolved',
        dateSubmitted: getPhilippineDateString(),
        submittedBy: matchedYouth.name,
        response: 'Review your residency information details and re-submit a validation inquiry.'
      };
      setFeedback(prev => [feedbackItem, ...prev]);

      // Show in-app rejection notice
      showGlobalAlert(`Rejection Processed!\n\nUser: ${matchedYouth.name}\nRole: ${logRole}\nReason: ${reason}\n\nRejection notice sent to registered email: ${matchedYouth.email}`, 'success');
    }
  };

  // --- SK OFFICIAL ACTIONS WORKFLOWS ---
  const handleCreateProgram = async (newP: Program, override = false): Promise<boolean> => {
    const result = await kabisigApi.createProgram({
      title: newP.title,
      description: newP.description,
      category: newP.category || 'Sports Development',
      location: newP.location || `Barangay ${currentTenant?.name || 'Hall'}`,
      start_date: new Date(newP.startDate).toISOString(),
      end_date: new Date(newP.endDate).toISOString(),
      total_slots: newP.maxParticipants,
      budget_allocation: newP.budgetAllocation || 0,
      aip_reference: newP.aipReference || undefined,
      status: 'upcoming',
      override,
      tenant_id: currentTenant?.id,
      image_base64: (newP as any).image_base64 || null,
      image_mime_type: (newP as any).image_mime_type || null
    });

    if (!result.success || !result.data) {
      if (result.status === 409 && !override) {
        return await new Promise<boolean>((resolve) => setProgramConflict({ program: newP, resolve }));
      }
      showGlobalAlert(result.message || 'Program could not be saved to the server.', 'error');
      return false;
    }

    const savedProgram = result.data;
    const persistedProgram: Program = {
      ...newP,
      id: savedProgram.id,
      status: 'Upcoming',
      registeredCount: 0,
    };

    setPrograms(prev => [persistedProgram, ...prev]);
    try {
      const refreshedPrograms = await kabisigApi.getPrograms();
      const mappedPrograms = refreshedPrograms.map(mapBackendProgram);
      setPrograms(mappedPrograms.some(program => program.id === persistedProgram.id)
        ? mappedPrograms
        : [persistedProgram, ...mappedPrograms]);
    } catch (error) {
      console.warn('Unable to refresh programs after creation:', error);
      showGlobalAlert('The program was saved, but the latest program list could not be refreshed. It will sync on the next refresh.', 'error');
    }

    // Also log a public announcement about the new program automatically!
    const authorName = currentUser?.full_name || (currentTenant?.chairperson && currentTenant.chairperson !== 'Unassigned' ? currentTenant.chairperson : 'SK Chairperson');
    const newAnn: AnnouncementRecord = {
      id: `ann-${Date.now().toString().slice(-3)}`,
      title: `Registration Open: ${newP.title}`,
      content: `${newP.description}\nLocation: ${newP.location}\nBudget Allocation: \u20B1${newP.budgetAllocation.toLocaleString()}\nSlots available: ${newP.maxParticipants}. Under the AIP framework, registration is free for KK validated members.`,
      author: authorName,
      barangay: currentTenant?.name || 'City-Wide',
      datePosted: getPhilippineDateString(),
      category: 'Opportunity',
      imageUrl: (savedProgram as any).image_url || '',
      attachments: ['AIP-Initiative-Flyer.pdf']
    };
    setAnnouncements(prev => [newAnn, ...prev]);
    return true;
  };

  const handleUpdateProgram = async (program: Program): Promise<boolean> => {
    const imageFields = program as Program & {
      image_base64?: string | null;
      image_mime_type?: string | null;
    };
    const result = await kabisigApi.updateProgram(program.id, {
      title: program.title,
      description: program.description,
      category: program.category,
      location: program.location,
      start_date: new Date(program.startDate).toISOString(),
      end_date: new Date(program.endDate).toISOString(),
      total_slots: program.maxParticipants,
      budget_allocation: program.budgetAllocation,
      aip_reference: program.aipReference || undefined,
      status: program.status.toLowerCase() === 'published' ? 'upcoming' : program.status.toLowerCase(),
      ...(imageFields.image_base64 && imageFields.image_mime_type
        ? {
          image_base64: imageFields.image_base64,
          image_mime_type: imageFields.image_mime_type,
        }
        : {}),
    });
    if (!result.success) {
      showGlobalAlert(result.message || 'Program could not be updated.', 'error');
      return false;
    }
    setPrograms(previous => previous.map(item => item.id === program.id ? program : item));
    return true;
  };

  const handleDeleteProgram = async (programId: string): Promise<boolean> => {
    const result = await kabisigApi.deleteProgram(programId);
    if (!result.success) {
      showGlobalAlert(result.message || 'Program could not be deleted.', 'error');
      return false;
    }
    setPrograms(previous => previous.filter(item => item.id !== programId));
    return true;
  };

  const handleLogExpense = async (newE: ExpenseRecord): Promise<void> => {
    if (!currentTenant?.id) throw new Error('Select a barangay before recording an expense.');
    if (!newE.budgetId) throw new Error('A barangay budget allocation is required.');

    const taxType = newE.taxType === 'VAT' ? 'VAT' : newE.taxType === 'Exempt' ? 'EXEMPT' : 'NON_VAT';
    const taxRate = taxType === 'VAT' ? 12 : taxType === 'NON_VAT' ? 3 : 0;
    const result = await kabisigApi.recordExpense({
      budget_id: newE.budgetId,
      program_id: newE.programId || undefined,
      title: newE.supplier || newE.programTitle || 'Expense Item',
      description: newE.description,
      gross_amount: newE.amount,
      tax_type: taxType,
      tax_rate: taxRate,
    });

    if (!result.success || !result.data?.expense) {
      throw new Error(result.message || 'The backend did not confirm the expense.');
    }

    const persistedExpense = result.data.expense;
    const savedExpense: ExpenseRecord = {
      ...newE,
      id: persistedExpense.id,
      budgetId: persistedExpense.budget_id,
      amount: Number(persistedExpense.gross_amount),
      taxType: persistedExpense.tax_type === 'EXEMPT' ? 'Exempt' : persistedExpense.tax_type || newE.taxType,
      vatAmount: Number(persistedExpense.vat_amount ?? (persistedExpense.tax_type === 'VAT' ? persistedExpense.tax_amount : newE.vatAmount)) || 0,
      withholdingTax: Number(persistedExpense.withholding_tax ?? newE.withholdingTax) || 0,
      netAmount: Number(persistedExpense.net_amount ?? newE.netAmount ?? persistedExpense.gross_amount) || 0,
      status: persistedExpense.status === 'approved' ? 'Approved' : 'Pending',
      date: persistedExpense.expense_date,
      dateLogged: persistedExpense.expense_date,
    };
    setExpenses(prev => [savedExpense, ...prev]);
    setPrograms(prev => prev.map(program => program.id === savedExpense.programId
      ? { ...program, spentBudget: (program.spentBudget || 0) + savedExpense.amount }
      : program));
    
    // Increment the tenant's spent budget reactively
    if (currentTenant) {
      setTenants(prev => prev.map(t => {
        if (t.name === currentTenant.name || t.id === currentTenant.id) {
          return {
            ...t,
            spentBudget: t.spentBudget + Number(persistedExpense.gross_amount)
          };
        }
        return t;
      }));
    }
  };

  const handleRegisterAttendance = async (record: AttendanceRecord, qrPayload: string): Promise<AttendanceRecord> => {
    const result = await kabisigApi.recordProgramAttendance(record.programId, qrPayload);
    if (!result.success || !result.data?.attendance) {
      const err: any = new Error(result.message || 'Attendance could not be recorded.');
      err.details = result.details;
      err.error = result.error;
      throw err;
    }

    const saved = result.data.attendance;
    const youthProfile = youthProfiles.find(profile => profile.userId === saved.user_id);
    const persistedRecord: AttendanceRecord = {
      id: saved.id,
      programId: saved.program_id,
      participantId: youthProfile?.id || result.data.digital_youth_id || saved.user_id,
      participantName: result.data.attendee_name || youthProfile?.name || record.participantName,
      checkInTime: result.data.checked_in_at || saved.checked_in_at,
      status: 'Present',
    };

    setRegistrations(prev => prev.map(registration =>
      registration.programId === persistedRecord.programId && registration.participantId === persistedRecord.participantId
        ? { ...registration, status: 'Completed' }
        : registration
    ));
    return persistedRecord;
  };

  // --- YOUTH CONSTITUENT WORKFLOWS ---
  const handleRegisterProgram = async (progId: string): Promise<Registration> => {
    const selectedP = programs.find(p => p.id === progId);
    if (!selectedP || !currentYouth) throw new Error('The selected program or youth profile is unavailable.');

    const result = await kabisigApi.registerForProgram(progId);
    if (!result.success || !result.data?.registration) {
      throw new Error(result.message || 'Program registration failed.');
    }

    const savedRegistration = result.data.registration;

    const newReg: Registration = {
      id: savedRegistration.id,
      programId: savedRegistration.program_id,
      programTitle: result.data.program_title || selectedP.title,
      participantId: currentYouth.id,
      participantName: currentYouth.name,
      status: savedRegistration.status === 'attended' ? 'Completed' : 'Approved',
      dateRegistered: savedRegistration.registered_at ? getPhilippineDateString(savedRegistration.registered_at) : getPhilippineDateString(),
      qrCode: `QR-KK-${currentYouth.id}`
    };

    setRegistrations(prev => [newReg, ...prev.filter(reg => reg.id !== newReg.id)]);
    setPrograms(prev => prev.map(program => program.id === progId
      ? { ...program, registeredCount: Math.max(program.registeredCount + 1, Number(result.data.slot_number) || 0) }
      : program));
    return newReg;
  };

  const handleVoteResolution = async (rId: string, voteType: string): Promise<ResolutionRecord> => {
    if (!currentYouth?.userId) throw new Error('Your authenticated youth account could not be verified.');

    const result = await kabisigApi.voteOnPoll(rId, voteType);
    if (!result.success || !result.data) throw new Error(result.message || 'Your vote could not be recorded.');

    setResolutions(prev => prev.map(res => res.id === rId ? result.data! : res));
    return result.data;
  };




  return (
    <div className="min-h-screen flex flex-col relative bg-slate-50">
      
      {/* 1. PUBLIC LANDING / LOGIN / SIGN-UP VIEW */}
      {(!authReady || !authProfileReady) && (
        <div className="flex-1 flex items-center justify-center text-slate-500 font-semibold">Checking your session...</div>
      )}
      {authReady && authProfileReady && currentRole === null && publicView === 'landing' && (
        <LandingPage
          onSignIn={() => { navigatingToSignInRef.current = true; setPublicView('login'); }}
          onCreateAccount={() => { navigatingToSignInRef.current = false; setPublicView('signup'); }}
          onTransparencyPortal={() => { navigatingToSignInRef.current = false; kabisigApi.logout(); queryClient.clear(); setCurrentRole('Viewer'); setCurrentUser(null); setCurrentYouth(null); setCurrentEmail('viewer@kabisig.ph'); }}
        />
      )}

      {authReady && authProfileReady && currentRole === null && publicView !== 'landing' && (
        <PublicPages 
          barangays={tenants}
          programs={programs}
          loginErrorMessage={pendingLoginMessage}
          activeTab={publicView}
          setActiveTab={(tab) => { navigatingToSignInRef.current = tab === 'login'; setPublicView(tab === '_landing' ? 'landing' : (tab as any)); }}
          onLogin={(email, role, tenantId, userObj) => { if (role === 'Viewer') { navigatingToSignInRef.current = false; kabisigApi.logout(); queryClient.clear(); setCurrentUser(null); setCurrentYouth(null); setCurrentEmail('viewer@kabisig.ph'); setCurrentRole('Viewer'); setPublicView('login'); return; } handleLogin(role, tenantId || '', email, userObj); }}
        />
      )}

      {authReady && authProfileReady && isChairpersonRole && chairpersonSetupRequired && (
        <PublicPages
          key={`chairperson-setup-${currentUser?.id || currentEmail}`}
          barangays={tenants}
          programs={programs}
          activeTab="login"
          forceChairpersonSetup
          chairpersonSetupEmail={currentEmail || currentUser?.email || ''}
          chairpersonTenantId={currentTenant?.id || ''}
          setActiveTab={() => {}}
          onLogin={(email, role, tenantId, userObj) => handleLogin(role, tenantId || '', email, userObj)}
        />
      )}

      {authReady && authProfileReady && officialSetupRequired && !isChairpersonRole && (
        <div className="flex min-h-[70vh] flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
            <h1 className="text-xl font-black text-slate-900">Official Account Setup Required</h1>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Your SK Official account is not ready to access the dashboard. Complete setup using the secure link in your invitation email.
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-6 rounded-lg bg-[#091d64] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#102a83]"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* 2. SUPER ADMIN PANELS */}
      {!officialSetupRequired && currentRole === 'Super Admin' && (
        <SuperAdminPages 
          barangays={tenants}
          programs={programs}
          auditLogs={auditLogs}
          onSyncBarangay={(id, updates) => {
            setTenants(prev => prev.map(tenant => tenant.id === id ? { ...tenant, ...updates } : tenant));
          }}
          onRefreshAuditLogs={async () => {
            const logs = await kabisigApi.getAuditLogs();
            if (logs) setAuditLogs(logs);
          }}
          onUpdateBarangay={async (id, updated) => {
            // Only explicitly saved, supported settings are sent to the backend.
            const configPayload: {
              logo: string;
              logo_url: string;
              allocatedBudget?: number;
              totalBudget?: number;
            } = {
              logo: updated.logo_url ?? updated.logo ?? '',
              logo_url: updated.logo_url ?? updated.logo ?? '',
            };

            if (typeof updated.totalBudget === 'number' && updated.totalBudget >= 0) {
              configPayload.allocatedBudget = updated.allocatedBudget ?? updated.totalBudget;
              configPayload.totalBudget = updated.totalBudget;
            }

            const res = await kabisigApi.saveBarangayConfiguration(id, configPayload);

            if (!res.success) {
              throw new Error(res.message || 'Database error: Could not save barangay settings.');
            }

            // Update local state reactively with backend response data
            const savedData = res.data || updated;
            setTenants(prev => prev.map(t => t.id === id ? { ...t, ...savedData } : t));

            kabisigApi.getBarangays().then(fresh => {
              if (fresh && fresh.length > 0) {
                setTenants(prev => prev.map(current => {
                  const latest = fresh.find(item => item.id === current.id);
                  return latest ? { ...current, ...latest } : current;
                }));
              }
            }).catch(error => console.warn('Failed to refresh the barangay registry after saving settings:', error));

            kabisigApi.getAuditLogs().then(logs => {
              if (logs) setAuditLogs(logs);
            }).catch(() => {});
          }}
          onLogout={handleLogout}
          userEmail={currentEmail || "Guest"}
        />
      )}

      {/* 3. BARANGAY ADMIN (SK CHAIRPERSON) PANELS */}
      {!officialSetupRequired && isChairpersonRole && currentTenant && (
        <BarangayAdminPages
          key={`barangay-admin-${currentUser?.id || currentEmail}`}
          currentBarangay={currentTenant}
          onTotalBudgetSaved={(allocatedBudget, fiscalYear) => {
            setTenants(prev => prev.map(tenant => tenant.id === currentTenant.id
              ? {
                  ...tenant,
                  allocated_budget: allocatedBudget,
                  totalBudget: allocatedBudget,
                  active_fiscal_year: fiscalYear,
                }
              : tenant));
            setCurrentTenant(prev => prev && prev.id === currentTenant.id
              ? {
                  ...prev,
                  allocated_budget: allocatedBudget,
                  totalBudget: allocatedBudget,
                  active_fiscal_year: fiscalYear,
                }
              : prev);
          }}
          currentUser={currentUser}
            notifications={notifications}
            programs={programs}
            youthProfiles={youthProfiles}
            youthProfilesLoading={youthProfilesLoading}
            youthProfilesError={youthProfilesError}
            onRetryYouthProfiles={() => setYouthProfilesRetryCount(count => count + 1)}
            documents={documents}
            auditLogs={auditLogs}
            registrations={registrations}
            feedback={feedback}
            expenses={expenses}
            resolutions={resolutions}
            onApproveYouth={handleApproveYouth}
            onRejectYouth={handleRejectYouth}
            onAddExpense={handleLogExpense}
            onRefreshPrograms={async () => {
              const rows = await kabisigApi.getPrograms();
              setPrograms(rows.map(mapBackendProgram));
            }}
            onRefreshExpenses={async () => {
              const rows = await kabisigApi.getExpenses(currentTenant?.id);
              setExpenses(rows.map((expense: any): ExpenseRecord => ({
                id: expense.id,
                programId: expense.program_id || '',
                budgetId: expense.budget_id,
                programTitle: expense.program?.title || expense.title,
                category: expense.budget?.category || 'Supplies',
                amount: Number(expense.gross_amount) || Number(expense.amount) || 0,
                gross_amount: Number(expense.gross_amount) || 0,
                supplier: expense.payee || expense.supplier || expense.title || 'N/A',
                taxType: expense.tax_type === 'EXEMPT' ? 'Exempt' : expense.tax_type || expense.taxType || 'Non-VAT',
                vatAmount: Number(expense.vat_amount ?? expense.vatAmount) || 0,
                withholdingTax: Number(expense.withholding_tax ?? expense.withholdingTax) || 0,
                netAmount: expense.net_amount != null || expense.netAmount != null
                  ? Number(expense.net_amount ?? expense.netAmount)
                  : undefined,
                description: expense.description || '',
                date: expense.expense_date || '',
                dateLogged: expense.expense_date || '',
                voucherNumber: `DV-${expense.id.slice(0, 6).toUpperCase()}`,
                status: expense.status === 'approved' ? 'Approved' : 'Pending',
                payee: expense.payee || expense.title,
                barangayId: expense.tenant_id,
              })));
            }}
            onApproveDocument={async (id, notes) => {
              const result = await kabisigApi.approveDocument(id, notes);
              if (!result.success || !result.data) throw new Error(result.message || 'Document approval failed.');
              const existing = documents.find(document => document.id === id);
              if (!existing) throw new Error('The document is no longer in the loaded repository. Refresh and retry.');
              const reviewed: DocumentRecord = {
                ...existing,
                status: 'Approved',
                reviewFeedback: result.data.feedback || notes,
              };
              setDocuments(prev => prev.map(document => document.id === id ? reviewed : document));
              return reviewed;
            }}
            onRejectDocument={async (id, notes) => {
              const result = await kabisigApi.rejectDocument(id, notes);
              if (!result.success || !result.data) throw new Error(result.message || 'Document rejection failed.');
              const existing = documents.find(document => document.id === id);
              if (!existing) throw new Error('The document is no longer in the loaded repository. Refresh and retry.');
              const reviewed: DocumentRecord = {
                ...existing,
                status: 'Rejected',
                reviewFeedback: result.data.feedback || notes,
              };
              setDocuments(prev => prev.map(document => document.id === id ? reviewed : document));
              return reviewed;
            }}
            onAddDocument={(document) => setDocuments(prev => [document, ...prev.filter(item => item.id !== document.id)])}
            onCreateProgram={handleCreateProgram}
            onUpdateProgram={handleUpdateProgram}
            onDeleteProgram={handleDeleteProgram}
            onAnnouncementsChanged={(updatedAnnouncements) => setAnnouncements(updatedAnnouncements)}
            onLogout={handleLogout}
          />
      )}

      {/* 4. OTHER SK OFFICIALS (KAGAWAD, SECRETARY, TREASURER) PANELS */}
      {!officialSetupRequired && (currentRole === 'SK Kagawad' || currentRole === 'SK Secretary' || currentRole === 'SK Treasurer') && (
        <OfficialPages 
          key={`${currentUser?.id || currentEmail}:${currentRole}`}
          currentRole={currentRole}
          notifications={notifications}
          programs={programs}
          youthProfiles={youthProfiles}
          registrations={registrations}
          documents={documents}
          feedback={feedback}
          feedbackError={feedbackError}
          resolutions={resolutions}
          pollsError={pollsError}
          expenses={expenses}
          announcements={announcements.filter(announcement => announcement.status === 'published')}
          currentTenant={currentTenant}
          tenants={tenants}
          currentUser={currentUser}
          onAddProgram={handleCreateProgram}
          onUpdateProgram={handleUpdateProgram}
          onDeleteProgram={handleDeleteProgram}
          onAddResolution={(resolution) => setResolutions(prev => [resolution, ...prev.filter(item => item.id !== resolution.id)])}
          onAddExpense={handleLogExpense}
          onRefreshExpenses={async () => {
            const rows = await kabisigApi.getExpenses(currentTenant?.id);
            setExpenses(rows.map((e: any): ExpenseRecord => ({
              id: e.id,
              programId: e.program_id || '',
              budgetId: e.budget_id,
              programTitle: e.program?.title || e.title,
              category: e.budget?.category || 'Supplies',
              amount: Number(e.gross_amount) || Number(e.amount) || 0,
              supplier: e.payee || e.supplier || e.title || 'N/A',
              taxType: e.tax_type === 'EXEMPT' ? 'Exempt' : e.tax_type || e.taxType || 'Non-VAT',
              vatAmount: Number(e.vat_amount ?? e.vatAmount) || 0,
              withholdingTax: Number(e.withholding_tax ?? e.withholdingTax) || 0,
              netAmount: e.net_amount != null || e.netAmount != null
                ? Number(e.net_amount ?? e.netAmount)
                : undefined,
              description: e.description || '',
              date: e.expense_date || (e.created_at ? getPhilippineDateString(e.created_at) : ''),
              dateLogged: e.expense_date || e.dateLogged || (e.created_at ? getPhilippineDateString(e.created_at) : ''),
              voucherNumber: `DV-${e.id.slice(0, 6).toUpperCase()}`,
              status: e.status === 'approved' ? 'Approved' : 'Pending',
              payee: e.payee || e.title,
              barangayId: e.tenant_id,
            })));
          }}
          onRefreshPrograms={async () => {
            const rows = await kabisigApi.getPrograms();
            setPrograms(rows.map(mapBackendProgram));
          }}
          onAddDocument={(d) => setDocuments(prev => [d, ...prev])}
          onUpdateDocument={(d) => setDocuments(prev => prev.map(document => document.id === d.id ? d : document))}
          onRegisterAttendance={handleRegisterAttendance}
          onLogout={handleLogout}
        />
      )}

      {/* 5. YOUTH CONSTITUENT PANELS */}
      {!officialSetupRequired && currentRole === 'Youth Constituent' && currentYouth && (
        <YouthPages 
          notifications={notifications}
          currentYouth={currentYouth}
          currentTenant={tenants.find(tenant => tenant.id === currentYouth.barangayId) || currentTenant}
          programs={programs}
          registrations={registrations}
          
          feedback={feedback}
          resolutions={resolutions}
          announcements={announcements.filter(announcement => announcement.status === 'published')}
          tenants={tenants}
          pollsError={pollsError}
          onSubmitFeedback={(feed) => setFeedback(prev => [feed, ...prev])}
          onVoteResolution={handleVoteResolution}
          onRegisterProgram={handleRegisterProgram}
          onUpdateYouthProfile={(updated) => {
            setCurrentYouth(updated);
            setYouthProfiles(prev => prev.map(p =>
              p.id === updated.id || (updated.userId && p.userId === updated.userId) || p.email.toLowerCase() === updated.email.toLowerCase()
                ? updated
                : p
            ));
            if (typeof window !== 'undefined') {
              localStorage.setItem('kabisig_current_youth', JSON.stringify(updated));
            }
          }}
          onLogout={handleLogout}
        />
      )}

      {/* 6. PUBLIC TRANSPARENCY VIEWER PORTAL */}
      {!officialSetupRequired && currentRole === 'Viewer' && (
        <ViewerPages 
          tenants={tenants}
          programs={programs}
          youthProfiles={youthProfiles}
          documents={documents}
          resolutions={resolutions}
          expenses={expenses}
          announcements={announcements.filter(announcement => announcement.status === 'published')}
          onLogout={handleLogout}
          onNavigateSignUp={() => {
            setCurrentRole(null);
            setPublicView('signup');
          }}
        />
      )}



          {/* GLOBAL KABISIG ALERT MODAL */}
      {programConflict && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900">Schedule conflict detected</h3>
            <p className="mt-2 text-sm text-slate-600">This program overlaps an active program in the same Barangay. Do you want to create it anyway?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" data-escape-close onClick={() => { programConflict.resolve(false); setProgramConflict(null); }} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancel</button>
              <button type="button" onClick={async () => { const pending = programConflict; setProgramConflict(null); const confirmed = await handleCreateProgram(pending.program, true); pending.resolve(confirmed); }} className="rounded-xl bg-[#091d64] px-4 py-2 text-xs font-bold text-white">Create Anyway</button>
            </div>
          </div>
        </div>
      )}
      {globalAlert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${globalAlert.type === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
              <span className="text-xl font-bold">{globalAlert.type === 'error' ? '!' : 'i'}</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">{globalAlert.title}</h3>
            <p className="text-xs text-slate-500 mb-6 whitespace-pre-wrap leading-relaxed">
              {globalAlert.message.split('\n').map((line, i) => {
                if (line.startsWith('Reason:')) {
                  const parts = line.split('Reason:');
                  return <span key={i} className="block mt-2 text-sm font-bold text-slate-800"><span className="text-rose-600">Reason:</span> {parts[1]}</span>;
                }
                return <span key={i} className="block">{line}</span>;
              })}
            </p>
            <div className="space-y-2">
              <button data-escape-close onClick={() => setGlobalAlert(null)} className="w-full py-3 bg-[#091d64] hover:bg-[#102a83] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer">
                Okay, I understand
              </button>
              {globalAlert.message.startsWith('Access Denied!') && (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }}
                  className="w-full rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Clear Session
                </button>
              )}
            </div>
          </div>
        </div>
      )}</div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalFormBehavior />
      <AppContent />
    </QueryClientProvider>
  );
}
