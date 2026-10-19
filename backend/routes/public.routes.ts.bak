import express from 'express';
import type { Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabase.service.js';
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
  sendSuccess(res, data || [], 'Public announcements retrieved.');
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
    .select('sex, birthdate, educational_status, employment_status, users!inner(role_id, status)')
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

  const sexCounts: Record<string, number> = {};
  const eduCounts: Record<string, number> = {};
  const empCounts: Record<string, number> = {};
  const ageBuckets = { '15-17': 0, '18-24': 0, '25-30': 0 };

  for (const p of list as any[]) {
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

  sendSuccess(
    res,
    {
      total_youth: list.length,
      sex_distribution: sexCounts,
      education_distribution: eduCounts,
      employment_distribution: empCounts,
      age_brackets: ageBuckets,
    },
    'Anonymized city demographics retrieved.'
  );
});

export default router;