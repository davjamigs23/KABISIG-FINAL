import express from 'express';
import type { Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabase.service.js';
import { resolveAvatarUrl } from '../services/avatar.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = express.Router();

// GET /api/public/announcements — published only, all barangays
router.get('/announcements', async (_req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin
    .from('announcement')
    .select('id, tenant_id, title, content, what, where_text, event_when, hashtags, image_path, category, published_at, created_at, author:users!author_id(full_name), barangay(name)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(100);

  if (error) {
    sendError(res, `Failed to load public announcements: ${error.message}`, 500);
    return;
  }
  const signedAnnouncements = await Promise.all((data || []).map(async (ann: any) => {
    if (!ann.image_path) return { ...ann, image_url: null };
    try {
      const { data: urlData } = supabaseAdmin.storage.from('announcement-pubmats').getPublicUrl(ann.image_path);
      return { ...ann, image_url: urlData?.publicUrl || null };
    } catch { return { ...ann, image_url: null }; }
  }));
  sendSuccess(res, signedAnnouncements, 'Public announcements retrieved.');
});

// GET /api/public/expenses — approved only, no payee/receipt fields
router.get('/expenses', async (_req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin
    .from('expense')
    .select('id, tenant_id, program_id, title, description, gross_amount, tax_type, tax_rate, tax_amount, net_amount, expense_date, status, budget:budget_id(category, fiscal_year), program:program_id(title)')
    .eq('status', 'approved')
    .order('expense_date', { ascending: false })
    .limit(500);

  if (error) {
    sendError(res, `Failed to load public expenses: ${error.message}`, 500);
    return;
  }
  sendSuccess(res, data || [], 'Public expenses retrieved.');
});

// GET /api/public/demographics — anonymized aggregate only, no PII
router.get('/demographics', async (_req: Request, res: Response): Promise<void> => {
  const { data: profiles, error } = await supabaseAdmin
    .from('resident_profile')
    .select('sex, birthdate, educational_status, employment_status, users!resident_profile_user_id_fkey!inner(role_id, status)')
    .eq('users.role_id', 4)
    .eq('users.status', 'active');

  if (error) {
    sendError(res, `Failed to load demographics: ${error.message}`, 500);
    return;
  }

  const list = profiles || [];

  const calculateAge = (bd: string): number => {
    if (!bd) return 0;
    const b = new Date(bd);
    const t = new Date();
    let a = t.getFullYear() - b.getFullYear();
    const m = t.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
    return a;
  };

  let pwdCount = 0;
  let soloParentCount = 0;
  let profileScholarCount = 0;
  const sexCounts: Record<string, number> = {};
  const eduCounts: Record<string, number> = {};
  const empCounts: Record<string, number> = {};
  const ageBuckets = { '15-17': 0, '18-24': 0, '25-30': 0 };

  for (const p of list as any[]) {
    if ((p as any).is_pwd || (p as any).youth_sector === 'PWD') pwdCount++;
    if ((p as any).is_solo_parent || (p as any).youth_sector === 'Solo Parent') soloParentCount++;
    if ((p as any).scholar_status === 'Scholar') profileScholarCount++;
    const s = p.sex || 'Unspecified';
    sexCounts[s] = (sexCounts[s] || 0) + 1;

    const e = p.educational_status || 'Not Specified';
    eduCounts[e] = (eduCounts[e] || 0) + 1;

    const emp = p.employment_status || 'Not Specified';
    empCounts[emp] = (empCounts[emp] || 0) + 1;

    const age = calculateAge(p.birthdate);
    if (age >= 15 && age <= 17) ageBuckets['15-17']++;
    else if (age >= 18 && age <= 24) ageBuckets['18-24']++;
    else if (age >= 25 && age <= 30) ageBuckets['25-30']++;
  }

  const { count: attendeeCount } = await supabaseAdmin.from('program_attendance').select('*', { count: 'exact', head: true });
  const { count: scholarCount } = await supabaseAdmin.from('resident_profile').select('*', { count: 'exact', head: true }).or('scholar_status.eq.Scholar,scholar_status.eq.Yes,is_scholar.eq.true');
  const { count: resolutionCount } = await supabaseAdmin.from('documents').select('*', { count: 'exact', head: true }).eq('document_type', 'Resolution').eq('status', 'approved');

  sendSuccess(
    res,
    {
      total_youth: list.length,
      sex_distribution: sexCounts,
      pwd_count: pwdCount,
      solo_parent_count: soloParentCount,
      scholar_count: scholarCount || 0,
      youth_event_attendees: attendeeCount || 0,
      passed_resolutions: resolutionCount || 0,
      education_distribution: eduCounts,
      employment_distribution: empCounts,
      age_brackets: ageBuckets,
    },
    'Anonymized city demographics retrieved.'
  );
});

// GET /api/public/programs - public program listing
router.get('/programs', async (_req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin
    .from('program')
    .select('id, tenant_id, title, description, category, location, start_date, end_date, total_slots, budget_allocation, aip_reference, image_url, status, barangay(name)')
    .order('start_date', { ascending: false })
    .limit(100);

  if (error) {
    sendError(res, 'Failed to load public programs: ' + error.message, 500);
    return;
  }
  sendSuccess(res, data || [], 'Public programs retrieved.');
});

// GET /api/public/officials — active public roster without contact or address data
router.get('/officials', async (_req: Request, res: Response): Promise<void> => {
  const { data: barangays, error: barangayError } = await supabaseAdmin
    .from('barangay')
    .select('id, name')
    .order('name', { ascending: true });

  if (barangayError) {
    sendError(res, `Failed to load barangays for the public officials roster: ${barangayError.message}`, 500);
    return;
  }

  const { data: officials, error } = await supabaseAdmin
    .from('users')
    .select('id, tenant_id, full_name, role_id, avatar_url, barangay(name)')
    .in('role_id', [2, 3])
    .eq('status', 'active')
    .not('tenant_id', 'is', null);

  if (error) {
    sendError(res, `Failed to load public officials: ${error.message}`, 500);
    return;
  }

  const officialIds = new Set((officials || []).map((official: any) => official.id));
  const authUsers = new Map<string, any>();
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error: authError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (authError) {
      sendError(res, `Failed to load public official positions: ${authError.message}`, 500);
      return;
    }
    for (const authUser of data.users) {
      if (officialIds.has(authUser.id)) authUsers.set(authUser.id, authUser);
    }
    if (data.users.length < perPage) break;
  }

  const groupedOfficials = new Map<string, {
    barangay_name: string;
    officials: Array<{
      id: string;
      full_name: string;
      role_id: number;
      official_role: string;
      position: string;
      avatar_url: string | null;
    }>;
  }>();

  (barangays || []).forEach(barangay => {
    groupedOfficials.set(barangay.id, { barangay_name: barangay.name, officials: [] });
  });

  const resolvedOfficials = await Promise.all((officials || []).map(async (official: any) => {
    const authUser = authUsers.get(official.id);
    const officialRole = String(
      authUser?.user_metadata?.official_role
      || authUser?.app_metadata?.official_role
      || (Number(official.role_id) === 3 ? 'SK Kagawad' : 'SK Chairperson')
    );
    return {
      ...official,
      official_role: officialRole,
      position: officialRole,
      avatar_url: await resolveAvatarUrl(official.avatar_url),
    };
  }));

  resolvedOfficials.forEach((official: any) => {
    if (!official.tenant_id) return;
    const group = groupedOfficials.get(official.tenant_id);
    if (!group) return;

    const joinedBarangay = Array.isArray(official.barangay) ? official.barangay[0] : official.barangay;
    if (joinedBarangay?.name) group.barangay_name = joinedBarangay.name;
    group.officials.push({
      id: official.id,
      full_name: official.full_name || '',
      role_id: Number(official.role_id),
      official_role: official.official_role,
      position: official.position,
      avatar_url: official.avatar_url,
    });
  });

  sendSuccess(res, Array.from(groupedOfficials.values()), 'Public officials roster retrieved.');
});

// GET /api/public/programs/:id/budget - itemized budget breakdown
router.get('/programs/:id/budget', async (req: Request, res: Response): Promise<void> => {
  const programId = String(req.params.id || '');
  if (!programId) {
    sendError(res, 'Program ID is required.', 400);
    return;
  }

  const { data: program, error: pErr } = await supabaseAdmin
    .from('program')
    .select('id, title, tenant_id, budget_allocation, start_date, end_date, status, barangay(name)')
    .eq('id', programId)
    .single();

  if (pErr || !program) {
    sendError(res, 'Program not found.', 404);
    return;
  }

  const { data: expenses, error: eErr } = await supabaseAdmin
    .from('expense')
    .select('id, title, description, gross_amount, status, expense_date')
    .eq('program_id', programId)
    .in('status', ['approved', 'pending'])
    .order('expense_date', { ascending: true });

  if (eErr) {
    sendError(res, 'Failed to load program budget: ' + eErr.message, 500);
    return;
  }

  const list = (expenses || []) as Array<{ gross_amount: number | string; status: string }>;
  const allocated = Number(program.budget_allocation) || 0;
  const spent = list
    .filter((e) => e.status === 'approved')
    .reduce((acc, e) => acc + (Number(e.gross_amount) || 0), 0);
  const remaining = Math.max(allocated - spent, 0);
  const utilization = allocated > 0 ? (spent / allocated) * 100 : 0;

  sendSuccess(
    res,
    {
      program: {
        id: program.id,
        title: program.title,
        barangay: (program as any).barangay?.name || null,
        start_date: program.start_date,
        end_date: program.end_date,
        status: program.status,
      },
      summary: {
        total_allocated: allocated,
        total_spent: spent,
        remaining_balance: remaining,
        utilization_rate: Number(utilization.toFixed(1)),
      },
      expenses: expenses || [],
    },
    'Program budget breakdown retrieved.'
  );
});


// GET /api/public/documents — approved FPD documents (no PII)
router.get('/documents', async (_req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('id, title, document_type, tenant_id, created_at, status')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    sendError(res, `Failed to load public documents: ${error.message}`, 500);
    return;
  }

  const publicDocuments = (data || []).map(document => ({
    id: document.id,
    title: document.title,
    document_type: document.document_type,
    category: document.document_type,
    barangayId: document.tenant_id,
    uploadedDate: document.created_at?.split('T')[0],
    created_at: document.created_at,
    status: document.status,
  }));

  sendSuccess(res, publicDocuments, 'Public FPD documents retrieved.');
});

// GET /api/public/polls — public resolution and civic poll summaries
router.get('/polls', async (_req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin
    .from('polls')
    .select('id, question, description, is_active, end_date, created_at, tenant_id')
    .eq('is_active', true)
    .gt('end_date', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    sendError(res, `Failed to load public polls: ${error.message}`, 500);
    return;
  }

  sendSuccess(res, data || [], 'Public polls retrieved.');
});
export default router;
