'use client';

import { useState, useEffect } from 'react';
import kabisigApi from './lib/api';
import { 
  NAGA_BARANGAYS, 
  DEFAULT_BARANGAY_LOGOS,






} from './data';
import PublicPages from './components/PublicPages';
import LandingPage from './components/LandingPage';
import SuperAdminPages from './components/SuperAdminPages';
import BarangayAdminPages from './components/BarangayAdminPages';
import ChairpersonOnboarding from './components/ChairpersonOnboarding';
import OfficialPages from './components/OfficialPages';
import YouthPages from './components/YouthPages';
import ViewerPages from './components/ViewerPages';
import { detectScheduleConflicts } from './lib/intelligence';
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
export default function App() {
  // --- Client state synchronized with the backend ---
  const [tenants, setTenants] = useState<BarangayTenant[]>(NAGA_BARANGAYS);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [youthProfiles, setYouthProfiles] = useState<YouthProfile[]>([]);
  const [youthProfilesLoading, setYouthProfilesLoading] = useState(false);
  const [youthProfilesError, setYouthProfilesError] = useState<string | null>(null);
  const [youthProfilesRetryCount, setYouthProfilesRetryCount] = useState(0);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);
  const [resolutions, setResolutions] = useState<ResolutionRecord[]>([]);
    const [pollsError, setPollsError] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);

  // --- AUTHENTICATED USER SESSION ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentRole, setCurrentRole] = useState<UserRole | 'Viewer' | null>(null);
  const [currentTenant, setCurrentTenant] = useState<BarangayTenant | null>(null);
  const [currentYouth, setCurrentYouth] = useState<YouthProfile | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string>('');
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!currentRole || !kabisigApi.getToken()) return;
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
        imageUrl: announcement.image_url || '',
        author: announcement.author?.full_name || 'SK Official',
        barangay: tenants.find(tenant => tenant.id === announcement.tenant_id)?.name || 'Barangay',
        datePosted: (announcement.published_at || announcement.created_at || '').split('T')[0],
        category: announcement.category || 'Notice',
        status: announcement.status,
        attachments: [],
      })));
    }).catch((error: any) => console.warn('Announcements unavailable:', error?.message || error));
    return () => { isMounted = false; };
  }, [currentRole, currentTenant?.id, currentUser?.id]);

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
        imageUrl: '',
        author: a.author?.full_name || 'SK Official',
        barangay: a.barangay?.name || 'Barangay',
        datePosted: (a.published_at || a.created_at || '').split('T')[0],
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
        category: e.budget?.category || 'Supplies',
        amount: Number(e.gross_amount) || 0,
        supplier: 'Various Suppliers',
        taxType: e.tax_type === 'EXEMPT' ? 'Exempt' : e.tax_type || 'Non-VAT',
        vatAmount: Number(e.tax_amount) || 0,
        withholdingTax: 0,
        netAmount: Number(e.net_amount) || 0,
        description: e.description || '',
        date: e.expense_date || '',
        dateLogged: e.expense_date || '',
        voucherNumber: 'DV-' + String(e.id).slice(0, 6).toUpperCase(),
        status: 'Approved',
        barangayId: e.tenant_id,
      })));
    }).catch((e: any) => console.warn('Public expenses failed:', e?.message));

    return () => { isMounted = false; };
  }, [currentRole]);

  // --- PUBLIC PAGES NAVIGATION STATE ---
  const [publicView, setPublicView] = useState<'landing' | 'login' | 'signup'>('landing');

  // Load 27 permanently seeded Naga City barangays and restore session from backend API
  useEffect(() => {
    const invalidateSession = () => {
      kabisigApi.logout();
      setCurrentUser(null);
      setCurrentRole(null);
      setCurrentTenant(null);
      setCurrentYouth(null);
      setCurrentEmail('');
      setPublicView('landing');
    };
    window.addEventListener('kabisig:auth-invalid', invalidateSession);
    return () => window.removeEventListener('kabisig:auth-invalid', invalidateSession);
  }, []);

  useEffect(() => {
    kabisigApi.getBarangays().then((data) => {
      if (data && data.length > 0) {
        setTenants(prev => {
          const updated = prev.map(existing => {
            const backendBarangay = data.find(b => b.id === existing.id);
            if (!backendBarangay) return existing;

            return {
              ...existing,
              ...backendBarangay,
              youthPopulation: backendBarangay.youthPopulation ?? existing.youthPopulation ?? 0,
              youthPopulationAvailable: backendBarangay.youthPopulationAvailable ?? false,
              activePrograms: backendBarangay.activePrograms ?? existing.activePrograms ?? 0,
              totalBudget: backendBarangay.totalBudget ?? existing.totalBudget ?? 0,
              allocatedBudget: backendBarangay.allocatedBudget ?? existing.allocatedBudget ?? 0,
              spentBudget: backendBarangay.spentBudget ?? existing.spentBudget ?? 0,
              logo: backendBarangay.logo || existing.logo || ''
            };
          });
          return updated.sort((a, b) => a.name.localeCompare(b.name));
        });

        // If user already restored with tenant_id, sync currentTenant with backend data
        const token = kabisigApi.getToken();
        if (token) {
          kabisigApi.getCurrentUser().then(user => {
            if (user?.tenant_id) {
              const matchedBgy = data.find(b => b.id === user.tenant_id);
              if (matchedBgy) {
                setCurrentTenant({
                  ...matchedBgy,
                  logo: matchedBgy.logo || DEFAULT_BARANGAY_LOGOS[matchedBgy.name] || ''
                });
              }
            }
          }).catch(console.warn).finally(() => setAuthReady(true));
        } else {
          setAuthReady(true);
        }
      }
    }).catch(console.warn);

    kabisigApi.getAuditLogs().then((logs) => {
      if (logs) setAuditLogs(logs);
    }).catch(console.warn);

    // Invitation links must never reuse an existing Super Admin/browser session.
    const inviteParams = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : null;
    const isChairpersonInvite = inviteParams?.get('invite_email')
      && inviteParams.get('role') === 'chairperson';

    if (isChairpersonInvite) {
      kabisigApi.logout();
      setCurrentUser(null);
      setCurrentTenant(null);
      setCurrentYouth(null);
      setCurrentRole(null);
      setPublicView('landing');
    }

    // Restore an authenticated session only when this is not an invitation flow.
    const token = isChairpersonInvite ? null : kabisigApi.getToken();
    if (token) {
      kabisigApi.getCurrentUser().then(user => {
        if (user) {
          if (user.status === 'pending' || user.status === 'rejected') {
            kabisigApi.logout();
            alert(
              user.status === 'pending'
                ? 'Access Denied!\n\nYour account is still pending approval by your Sangguniang Kabataan Chairperson.'
                : 'Access Denied!\n\nYour account application was rejected.'
            );
            return;
          }
          setCurrentUser(user);
          setCurrentEmail(user.email || '');
          const roleId = user.role_id;
          if (roleId === 1) {
            setCurrentRole('Super Admin');
          } else if (roleId === 2) {
            setCurrentRole('Barangay Admin');
            if (user.tenant_id) {
              const bgy = tenants.find(t => t.id === user.tenant_id) || NAGA_BARANGAYS.find(t => t.id === user.tenant_id);
              if (bgy) {
                setCurrentTenant({
                  ...bgy,
                  logo: bgy.logo || DEFAULT_BARANGAY_LOGOS[bgy.name] || ''
                });
              }
            }
          } else if (roleId === 3) {
            const registeredRole = user.user_metadata?.role || user.official_position || user.role;
            setCurrentRole(
              registeredRole === 'SK Secretary'
                ? 'SK Secretary'
                : registeredRole === 'SK Treasurer'
                  ? 'SK Treasurer'
                  : 'SK Kagawad'
            );
            if (user.tenant_id) {
              const bgy = tenants.find(t => t.id === user.tenant_id) || NAGA_BARANGAYS.find(t => t.id === user.tenant_id);
              if (bgy) {
                setCurrentTenant({
                  ...bgy,
                  logo: bgy.logo || DEFAULT_BARANGAY_LOGOS[bgy.name] || ''
                });
              }
            }
          } else if (roleId === 4) {
            setCurrentRole('Youth Constituent');
            if (user.tenant_id) {
              const bgy = tenants.find(t => t.id === user.tenant_id) || NAGA_BARANGAYS.find(t => t.id === user.tenant_id);
              if (bgy) {
                setCurrentTenant({
                  ...bgy,
                  logo: bgy.logo || DEFAULT_BARANGAY_LOGOS[bgy.name] || ''
                });
              }
            }
            const meta = user.user_metadata || {};
            const resident = user.resident_profile || {};
            const youthFromDb: YouthProfile = {
              userId: user.id,
              id: meta.id || resident.digital_youth_id || `SK-2026-${user.id.slice(0, 4)}`,
              name: user.full_name || meta.name || 'Anonymous',
              sex: resident.sex || meta.sex || 'Female',
              birthdate: resident.birthdate || meta.birthdate || '2005-01-01',
              age: meta.age || 20,
              civilStatus: meta.civilStatus || 'Single',
              address: resident.address || meta.address || '',
              zone: resident.zone || meta.zone || 'Not specified',
              mobile: user.phone || meta.mobile || '',
              email: user.email || meta.email || '',
              educationalLevel: meta.educationalLevel || resident.educational_status || 'College',
              school: resident.school || meta.school || '',
              course: resident.course || meta.course || '',
              year: resident.year_level || meta.year || '1st Year',
              employmentStatus: meta.employmentStatus || resident.employment_status || 'Student',
              scholarStatus: meta.scholarStatus || 'Non-Scholar',
              scholarshipType: meta.scholarshipType || '',
              youthSector: meta.youthSector || 'In-School Youth',
              guardianName: meta.guardianName || '',
              guardianContact: meta.guardianContact || '',
              profilePic: meta.profilePic,
              qrCode: resident.qr_code_url || meta.qrCode,
              status: user.status === 'active' ? 'Approved' : (user.status === 'rejected' ? 'Rejected' : 'Pending'),
              barangayId: user.tenant_id || '',
              dateRegistered: user.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
              registeredRole: 'Youth Constituent',
            };
            setCurrentYouth(youthFromDb);
            setYouthProfiles(prev => [youthFromDb, ...prev.filter(p => p.id !== youthFromDb.id && p.email !== youthFromDb.email)]);
          }
        }
      }).catch(console.warn);
    }

  }, []);

  useEffect(() => {
    if (!currentRole) {
      setPrograms([]);
      setDocuments([]);
      setExpenses([]);
      return;
    }

    let isMounted = true;
    setPrograms([]);
    setDocuments([]);
    setExpenses([]);
    if (currentRole !== 'Barangay Admin' && currentRole !== 'SK Chairperson' && currentRole !== 'Super Admin') setYouthProfiles([]);

    kabisigApi.getPrograms().then(progs => {
      if (!isMounted) return;
      setPrograms(progs.map((p: any): Program => ({
        id: p.id,
        title: p.title,
        description: p.description || '',
        startDate: p.start_date ? p.start_date.split('T')[0] : '',
        endDate: p.end_date ? p.end_date.split('T')[0] : '',
        location: p.location || '',
        maxParticipants: Number(p.total_slots) || 0,
        budgetAllocation: Number(p.budget_allocation) || 0,
        spentBudget: 0,
        aipReference: p.aip_reference || '',
        category: p.category || 'Other',
        status: p.status === 'upcoming' ? 'Upcoming' : p.status === 'ongoing' ? 'Ongoing' : p.status === 'completed' ? 'Completed' : 'Upcoming',
        registeredCount: p.program_registrations?.[0]?.count || 0,
        barangayId: p.tenant_id,
      })));
    }).catch(error => console.warn('Unable to load programs for active role:', error));

    kabisigApi.getDocuments().then(docs => {
      if (!isMounted) return;
      setDocuments(docs.map((d: any): DocumentRecord => ({
        id: d.id,
        title: d.title,
        category: normalizeDocumentCategory(d.document_type),
        uploadedBy: d.submitter?.full_name || 'Official',
        uploadedDate: d.created_at ? new Date(d.created_at).toLocaleDateString() : '',
        fileSize: '',
        status: d.status === 'approved' ? 'Approved' : d.status === 'pending_approval' ? 'Pending' : d.status,
        resolutionNumber: `DOC-${d.id.slice(0, 6).toUpperCase()}`,
        description: d.description || '',
        fileUrl: d.file_url,
        reviewFeedback: d.feedback || '',
        designatedApprover: 'Hon. SK Chairperson',
        barangayId: d.tenant_id,
      })));
    }).catch(error => console.warn('Unable to load documents for active role:', error));

    if (currentRole !== 'Viewer') {
      kabisigApi.getExpenses().then(exps => {
        if (!isMounted) return;
        setExpenses(exps.map((e: any): ExpenseRecord => ({
          id: e.id,
          programId: e.program_id || '',
          budgetId: e.budget_id,
          programTitle: e.program?.title || e.title,
          category: e.budget?.category || 'Supplies',
          amount: Number(e.gross_amount) || Number(e.amount) || 0,
          supplier: e.payee || e.supplier || e.title || '',
          taxType: e.tax_type === 'EXEMPT' ? 'Exempt' : e.tax_type || e.taxType || 'Non-VAT',
          vatAmount: Number(e.vat_amount ?? e.vatAmount) || 0,
          withholdingTax: Number(e.withholding_tax ?? e.withholdingTax) || 0,
          netAmount: Number(e.net_amount ?? e.netAmount ?? e.gross_amount ?? e.amount) || 0,
          description: e.description || '',
          date: e.expense_date || e.created_at?.split('T')[0] || '',
          dateLogged: e.expense_date || e.dateLogged || e.created_at?.split('T')[0] || '',
          voucherNumber: `DV-${e.id.slice(0, 6).toUpperCase()}`,
          status: e.status === 'approved' ? 'Approved' : 'Pending',
          payee: e.payee || e.title,
          barangayId: e.tenant_id,
        })));
      }).catch(error => console.warn('Unable to load expenses for active role:', error));
    }

    return () => { isMounted = false; };
  }, [currentRole, currentTenant?.id]);

  // After login, reload barangays with the user's token: the pre-login list hides contact details.
  useEffect(() => {
    if (!currentUser?.id || !kabisigApi.getToken()) return;
    let isMounted = true;
    kabisigApi.getBarangays().then((data) => {
      if (!isMounted || !data || data.length === 0) return;
      setTenants(prev => prev.map(existing => {
        const fresh = data.find(b => b.id === existing.id);
        return fresh ? { ...existing, ...fresh, logo: fresh.logo || existing.logo || '' } : existing;
      }));
    }).catch(console.warn);
    return () => { isMounted = false; };
  }, [currentUser?.id]);

  // Keep currentTenant in step with the live tenants list so budget cards update after expenses or a refetch.
  useEffect(() => {
    setCurrentTenant(prev => {
      if (!prev) return prev;
      const live = tenants.find(t => t.id === prev.id);
      return live ? { ...prev, ...live, logo: live.logo || prev.logo || '' } : prev;
    });
  }, [tenants]);

  useEffect(() => {
    const officialOrAdmin =
      currentRole === 'Barangay Admin' ||
      currentRole === 'SK Chairperson' ||
      currentRole === 'SK Kagawad' ||
      currentRole === 'SK Secretary' ||
      currentRole === 'SK Treasurer';
    if (!officialOrAdmin) {
      setYouthProfilesLoading(false);
      setYouthProfilesError(null);
      return;
    }

    let isMounted = true;
    setYouthProfilesLoading(true);
    setYouthProfilesError(null);
    kabisigApi.getYouthProfiles().then(({ data, error }) => {
      if (!isMounted) return;
      if (error || data === null) {
        setYouthProfilesError(error || 'Unable to load youth profiles.');
        return;
      }
      setYouthProfiles(data);
    }).catch((error: unknown) => {
      if (!isMounted) return;
      const message = error instanceof Error ? error.message : 'Unable to load youth profiles.';
      setYouthProfilesError(message);
      console.warn('Unable to refresh youth management records:', message);
    }).finally(() => {
      if (isMounted) setYouthProfilesLoading(false);
    });
    return () => { isMounted = false; };
  }, [currentRole, currentTenant?.id, youthProfilesRetryCount]);

  useEffect(() => {
    if (!currentRole || currentRole === 'Viewer') return;
    let isMounted = true;
    kabisigApi.getPolls().then((polls) => {
      if (!isMounted) return;
      setResolutions(polls);
      setPollsError(null);
    }).catch((error: any) => {
      if (!isMounted) return;
      setPollsError(error.message || 'Polls could not be loaded.');
      console.warn('Unable to load polls for active tenant:', error);
    });
    return () => { isMounted = false; };
  }, [currentRole, currentTenant?.id, currentUser?.id]);

  useEffect(() => {
    if (!currentRole || currentRole === 'Viewer' || currentRole === 'Super Admin' || !kabisigApi.getToken()) return;
    let isMounted = true;
    kabisigApi.getFeedback().then((feeds) => {
      if (!isMounted) return;
      setFeedback(feeds.map((f: any): FeedbackRecord => ({
        id: f.id,
        userId: f.user_id || undefined,
        type: f.category || 'General',
        title: f.subject,
        content: f.message,
        rating: f.sentiment === 'positive' ? 5 : f.sentiment === 'negative' ? 1 : 3,
        anonymous: f.is_anonymous || false,
        status: f.status === 'resolved' ? 'Resolved' : f.status === 'under_review' ? 'Reviewed' : 'Pending',
        dateSubmitted: f.created_at ? f.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
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
    }).catch(error => console.warn('Unable to load feedback history for active user:', error));

    return () => { isMounted = false; };
  }, [currentRole, currentTenant?.id, currentUser?.id]);

  // --- AUTH CALLBACKS ---
  const handleLogin = (role: UserRole | 'Viewer', tenantId: string, emailOrName?: string, userObj?: any) => {
    if (emailOrName) {
      setCurrentEmail(emailOrName);
    }
    if (userObj) {
      setCurrentUser(userObj);
    } else {
      kabisigApi.getCurrentUser().then(user => {
        if (user) setCurrentUser(user);
      }).catch(console.warn);
    }
    // Check if the user has a registered profile with a pending or rejected status
    if (emailOrName) {
      const matchedProfile = youthProfiles.find(p => p.email.toLowerCase() === emailOrName.trim().toLowerCase());
      if (matchedProfile && matchedProfile.registeredRole === role) {
        if (matchedProfile.status === 'Pending') {
          alert(`Access Denied!\n\nYour registration as ${role} is currently PENDING approval by your Sangguniang Kabataan Chairperson.\n\nPlease wait for validation.`);
          return;
        } else if (matchedProfile.status === 'Rejected') {
          alert(`Access Denied!\n\nYour registration as ${role} was REJECTED by your Sangguniang Kabataan Chairperson.\n\nReason: ${matchedProfile.rejectionReason || 'No reason specified.'}`);
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

    const resolvedRole: UserRole = (role === 'SK Chairperson' || role === 'Barangay Admin') ? 'Barangay Admin' : role;
    setCurrentTenant(selectedTenant);
    setCurrentRole(resolvedRole);

    if (resolvedRole === 'Youth Constituent') {
      let matchedProfile = youthProfiles.find(p => p.email.toLowerCase() === emailOrName?.toLowerCase() || p.name === emailOrName);
      if (userObj) {
        const meta = userObj.user_metadata || {};
        const resident = userObj.resident_profile || {};
        const mergedFromDb: YouthProfile = {
          userId: userObj.id,
          id: meta.id || resident.digital_youth_id || matchedProfile?.id || `SK-2026-${userObj.id.slice(0, 4)}`,
          name: userObj.full_name || meta.name || matchedProfile?.name || 'Anonymous',
          sex: resident.sex || meta.sex || matchedProfile?.sex || 'Female',
          birthdate: resident.birthdate || meta.birthdate || matchedProfile?.birthdate || '2005-01-01',
          age: meta.age || matchedProfile?.age || 20,
          civilStatus: meta.civilStatus || matchedProfile?.civilStatus || 'Single',
          address: resident.address || meta.address || matchedProfile?.address || '',
          zone: resident.zone || meta.zone || matchedProfile?.zone || 'Not specified',
          mobile: userObj.phone || meta.mobile || matchedProfile?.mobile || '',
          email: userObj.email || meta.email || matchedProfile?.email || emailOrName || '',
          educationalLevel: meta.educationalLevel || resident.educational_status || matchedProfile?.educationalLevel || 'College',
          school: resident.school || meta.school || matchedProfile?.school || '',
          course: meta.course || matchedProfile?.course || '',
          year: meta.year || matchedProfile?.year || '1st Year',
          employmentStatus: meta.employmentStatus || resident.employment_status || matchedProfile?.employmentStatus || 'Student',
          scholarStatus: meta.scholarStatus || matchedProfile?.scholarStatus || 'Non-Scholar',
          scholarshipType: meta.scholarshipType || matchedProfile?.scholarshipType || '',
          youthSector: meta.youthSector || matchedProfile?.youthSector || 'In-School Youth',
          guardianName: meta.guardianName || matchedProfile?.guardianName || '',
          guardianContact: meta.guardianContact || matchedProfile?.guardianContact || '',
          profilePic: meta.profilePic || matchedProfile?.profilePic,
          qrCode: resident.qr_code_url || meta.qrCode || matchedProfile?.qrCode,
          status: userObj.status === 'active' ? 'Approved' : (userObj.status === 'rejected' ? 'Rejected' : 'Pending'),
          barangayId: userObj.tenant_id || matchedProfile?.barangayId || '',
          dateRegistered: userObj.created_at?.split('T')[0] || matchedProfile?.dateRegistered || new Date().toISOString().split('T')[0],
          registeredRole: 'Youth Constituent',
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
    setCurrentRole(null);
    setCurrentTenant(null);
    setCurrentYouth(null);
    setCurrentUser(null);
    setCurrentEmail('');
    setPublicView('landing');
  };

  // --- SYSTEM REGISTRATION WORKFLOWS (Multi-Tenancy Binding) ---
  const handleSignUpSubmit = (newProfile: YouthProfile) => {
    // Bind profile strictly to an existing home barangay from the 27 Naga City registry
    const targetTenant = tenants.find(t => t.id === newProfile.barangayId) || tenants[0];
    const boundProfile: YouthProfile = {
      ...newProfile,
      barangayId: targetTenant.id
    };

    // Add profile to local database
    setYouthProfiles(prev => [boundProfile, ...prev]);

    const isOfficial = boundProfile.registeredRole && boundProfile.registeredRole !== 'Youth Constituent';

    if (isOfficial) {
      // Create a pending SK Official registration request
      const newLog: SystemAuditLog = {
        id: `LOG-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        user: boundProfile.name,
        role: boundProfile.registeredRole || 'SK Official',
        action: 'Account Self-Registration',
        details: `Registered as ${boundProfile.registeredRole} bound to Brgy. ${targetTenant.name} (Tenant ID: ${targetTenant.id}). Status: PENDING validation.`
      };
      setAuditLogs(prev => [newLog, ...prev]);
    } else {
      // Keep the newly registered account signed out until it is approved.
    }
  };

  // --- BARANGAY ADMIN INTERACTION WORKFLOWS ---
  const handleApproveYouth = async (id: string) => {
    const matchedYouth = youthProfiles.find(p => p.id === id);
    if (!matchedYouth?.userId) {
      alert('This profile has no database user ID and cannot be approved yet. Refresh the youth registry and try again.');
      return;
    }

    const approval = await kabisigApi.approveUser(matchedYouth.userId);
    if (!approval.success) {
      alert(approval.message || 'The youth profile could not be approved.');
      return;
    }

    const approvedByName = currentTenant ? currentTenant.chairperson : 'SK Chairperson';
    const approvedAtTime = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Update youth profile state
    setYouthProfiles(prev => prev.map(p => p.id === id ? { 
      ...p, 
      status: 'Approved',
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
      alert(`Approval Successful!\n\nUser: ${matchedYouth.name}\nRole: ${logRole}\nApproved By: ${approvedByName}\nApproved At: ${approvedAtTime}\n\nNotification sent to registered email: ${matchedYouth.email}`);
    }
  };

  const handleRejectYouth = async (id: string, reason: string) => {
    const matchedYouth = youthProfiles.find(p => p.id === id);
    if (!matchedYouth?.userId) {
      alert('This profile has no database user ID and cannot be rejected yet.');
      return;
    }
    const rejection = await kabisigApi.rejectUser(matchedYouth.userId, reason);
    if (!rejection.success) {
      alert(rejection.message || 'The user application could not be rejected.');
      return;
    }
    const approvedByName = currentTenant ? currentTenant.chairperson : 'SK Chairperson';
    const approvedAtTime = new Date().toISOString().replace('T', ' ').slice(0, 19);

    setYouthProfiles(prev => prev.map(p => p.id === id ? { ...p, status: 'Rejected', rejectionReason: reason } : p));
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
        dateSubmitted: new Date().toISOString().split('T')[0],
        submittedBy: matchedYouth.name,
        response: 'Review your residency information details and re-submit a validation inquiry.'
      };
      setFeedback(prev => [feedbackItem, ...prev]);

      // Show in-app rejection notice
      alert(`Rejection Processed!\n\nUser: ${matchedYouth.name}\nRole: ${logRole}\nReason: ${reason}\n\nRejection notice sent to registered email: ${matchedYouth.email}`);
    }
  };

  // --- SK OFFICIAL ACTIONS WORKFLOWS ---
  const handleCreateProgram = async (newP: Program): Promise<boolean> => {
    const conflicts = detectScheduleConflicts(
      {
        title: newP.title,
        startDate: newP.startDate,
        endDate: newP.endDate,
        location: newP.location,
      },
      programs
    );
    if (conflicts.length > 0) {
      alert(`Program scheduling conflict detected:\n\n${conflicts.join('\n\n')}`);
      return false;
    }

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
      tenant_id: currentTenant?.id
    });

    if (!result.success || !result.data) {
      alert(result.message || 'Program could not be saved to the server.');
      return false;
    }

    const savedProgram = result.data;
    const persistedProgram: Program = {
      ...newP,
      id: savedProgram.id,
      registeredCount: 0,
    };

    setPrograms(prev => [persistedProgram, ...prev]);

    // Also log a public announcement about the new program automatically!
    const authorName = currentUser?.full_name || (currentTenant?.chairperson && currentTenant.chairperson !== 'Unassigned' ? currentTenant.chairperson : 'SK Chairperson');
    const newAnn: AnnouncementRecord = {
      id: `ann-${Date.now().toString().slice(-3)}`,
      title: `Registration Open: ${newP.title}`,
      content: `${newP.description}\nLocation: ${newP.location}\nBudget Allocation: ₱${newP.budgetAllocation.toLocaleString()}\nSlots available: ${newP.maxParticipants}. Under the AIP framework, registration is free for KK validated members.`,
      author: authorName,
      barangay: currentTenant?.name || 'City-Wide',
      datePosted: new Date().toISOString().split('T')[0],
      category: 'Opportunity',
      attachments: ['AIP-Initiative-Flyer.pdf']
    };
    setAnnouncements(prev => [newAnn, ...prev]);
    return true;
  };

  const handleUpdateProgram = async (program: Program): Promise<boolean> => {
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
    });
    if (!result.success) {
      alert(result.message || 'Program could not be updated.');
      return false;
    }
    setPrograms(previous => previous.map(item => item.id === program.id ? program : item));
    return true;
  };

  const handleDeleteProgram = async (programId: string): Promise<boolean> => {
    const result = await kabisigApi.deleteProgram(programId);
    if (!result.success) {
      alert(result.message || 'Program could not be deleted.');
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
      expense_date: newE.date,
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
      dateRegistered: savedRegistration.registered_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      qrCode: `QR-KK-${currentYouth.id}`
    };

    setRegistrations(prev => [newReg, ...prev.filter(reg => reg.id !== newReg.id)]);
    setPrograms(prev => prev.map(program => program.id === progId
      ? { ...program, registeredCount: Math.max(program.registeredCount + 1, Number(result.data.slot_number) || 0) }
      : program));
    return newReg;
  };

  const handleVoteResolution = async (rId: string, voteType: 'Support' | 'Oppose' | 'Abstain'): Promise<ResolutionRecord> => {
    if (!currentYouth?.userId) throw new Error('Your authenticated youth account could not be verified.');
    if (voteType === 'Abstain') throw new Error('Abstain is not an available option for this poll.');

    const result = await kabisigApi.voteOnPoll(rId, voteType);
    if (!result.success || !result.data) throw new Error(result.message || 'Your vote could not be recorded.');

    setResolutions(prev => prev.map(res => res.id === rId ? result.data! : res));
    return result.data;
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-slate-50">
      
      {/* 1. PUBLIC LANDING / LOGIN / SIGN-UP VIEW */}
      {!authReady && (
        <div className="flex-1 flex items-center justify-center text-slate-500 font-semibold">Checking your session…</div>
      )}
      {authReady && currentRole === null && publicView === 'landing' && (
        <LandingPage
          onSignIn={() => setPublicView('login')}
          onCreateAccount={() => setPublicView('signup')}
          onTransparencyPortal={() => { setCurrentUser(null); setCurrentEmail('viewer@kabisig.ph'); setCurrentRole('Viewer'); }}
        />
      )}

      {authReady && currentRole === null && publicView !== 'landing' && (
        <PublicPages 
          barangays={tenants}
          programs={programs}
          activeTab={publicView}
          setActiveTab={(tab) => setPublicView(tab === '_landing' ? 'landing' : (tab as any))}
          onLogin={(email, role, tenantId, userObj) => { if (role === 'Viewer') { setCurrentUser(null); setCurrentEmail('viewer@kabisig.ph'); setCurrentRole('Viewer'); setPublicView('login'); return; } handleLogin(role, tenantId || '', email, userObj); }}
          onSignUp={(partialProfile) => {
            const completeProfile: YouthProfile = {
              id: `SK-2026-${Math.floor(100 + Math.random() * 900)}`,
              name: partialProfile.name || 'Anonymous',
              sex: partialProfile.sex || 'Male',
              birthdate: partialProfile.birthdate || '',
              age: partialProfile.age || 0,
              mobile: partialProfile.mobile || '',
              email: partialProfile.email || '',
              address: partialProfile.address || '',
              zone: partialProfile.zone || '',
              school: partialProfile.school || '',
              educationalLevel: partialProfile.educationalLevel || 'College',
              course: partialProfile.course || '',
              year: partialProfile.year || '1st Year',
              scholarStatus: partialProfile.scholarStatus || 'Non-Scholar',
              guardianName: partialProfile.guardianName || '',
              guardianContact: partialProfile.guardianContact || '',
              status: 'Pending',
              dateRegistered: new Date().toISOString().split('T')[0],
              profilePic: partialProfile.profilePic,
              registeredRole: partialProfile.registeredRole || 'Youth Constituent',
              barangayId: partialProfile.barangayId || '',
              registeredProgramsCount: 0,
              attendanceRate: 0,
              engagementScore: 0
            };
            handleSignUpSubmit(completeProfile);
          }}
        />
      )}

      {/* 2. SUPER ADMIN PANELS */}
      {currentRole === 'Super Admin' && (
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
            const configPayload: any = {
              logo: updated.logo,
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
            }).catch(() => {});

            kabisigApi.getAuditLogs().then(logs => {
              if (logs) setAuditLogs(logs);
            }).catch(() => {});
          }}
          onLogout={handleLogout}
          userEmail={currentEmail || "kyla.vinzon@example.com"}
        />
      )}

      {/* 3. BARANGAY ADMIN (SK CHAIRPERSON) PANELS */}
      {(currentRole === 'Barangay Admin' || currentRole === 'SK Chairperson') && currentTenant && (
        (!currentUser?.full_name || currentUser.full_name.trim() === '' || currentUser.full_name === 'Pending Chairperson' || currentUser.full_name === 'Pending Invitation' || !currentUser?.resident_profile?.birthdate) ? (
          <ChairpersonOnboarding 
            currentBarangay={currentTenant}
            userEmail={currentEmail || currentUser?.email || ''}
            onProfileCompleted={(updatedUser) => {
              setCurrentUser(updatedUser);
              if (updatedUser.full_name) {
                setTenants(prev => prev.map(t => t.id === currentTenant.id ? { ...t, chairperson: updatedUser.full_name, chairpersonEmail: updatedUser.email } : t));
              }
            }}
            onLogout={handleLogout}
          />
        ) : (
          <BarangayAdminPages 
            currentBarangay={currentTenant}
            currentUser={currentUser}
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
        )
      )}

      {/* 4. OTHER SK OFFICIALS (KAGAWAD, SECRETARY, TREASURER) PANELS */}
      {(currentRole === 'SK Kagawad' || currentRole === 'SK Secretary' || currentRole === 'SK Treasurer') && (
        <OfficialPages 
          currentRole={currentRole}
          programs={programs}
          youthProfiles={youthProfiles}
          registrations={registrations}
          documents={documents}
          feedback={feedback}
          resolutions={resolutions}
          pollsError={pollsError}
          expenses={expenses}
          announcements={announcements.filter(announcement => announcement.status === 'published')}
          currentTenant={currentTenant}
          tenants={tenants}
          currentUser={currentUser}
          onAddProgram={handleCreateProgram}
          onAddResolution={(resolution) => setResolutions(prev => [resolution, ...prev.filter(item => item.id !== resolution.id)])}
          onAddExpense={handleLogExpense}
          onAddDocument={(d) => setDocuments(prev => [d, ...prev])}
          onRegisterAttendance={handleRegisterAttendance}
          onLogout={handleLogout}
        />
      )}

      {/* 5. YOUTH CONSTITUENT PANELS */}
      {currentRole === 'Youth Constituent' && currentYouth && (
        <YouthPages 
          currentYouth={currentYouth}
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
      {currentRole === 'Viewer' && (
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



    </div>
  );
}
