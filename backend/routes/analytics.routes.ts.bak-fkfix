import express from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin, canAccessTenant } from '../services/supabase.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticateUser, requireRoles } from '../middleware/auth.js';
import type { AuthRequest } from '../types/database.types.js';

const router = express.Router();

const ComplianceIssueSchema = z.object({
  report_type: z.string().min(1).max(150),
  fiscal_year: z.number().int().min(2000).max(2100),
  status: z.enum(['pending', 'submitted', 'approved', 'rejected', 'overdue']).default('pending'),
  due_date: z.string().date().optional(),
  notes: z.string().max(5000).optional(),
});

const BudgetAlertSchema = z.object({
  alert_code: z.string().min(1).max(150),
  level: z.enum(['Critical', 'Warning', 'Info']),
  message: z.string().min(1).max(5000),
  link: z.string().max(500).optional(),
});

router.post('/budget-alerts', authenticateUser, requireRoles('BARANGAY_ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthRequest).user!;
  const parsed = BudgetAlertSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors);
    return;
  }

  if (!user.tenant_id) {
    sendError(res, 'User has no assigned Barangay tenant.', 400);
    return;
  }

  const { data: recipients, error: recipientError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('tenant_id', user.tenant_id)
    .in('role_id', [2, 3]);

  if (recipientError) {
    sendError(res, `Failed to find budget alert recipients: ${recipientError.message}`, 500);
    return;
  }

  const recipientIds = (recipients || []).map(recipient => recipient.id);
  if (recipientIds.length === 0) {
    sendSuccess(res, { inserted: 0 }, 'No tenant officials are available for budget alerts.');
    return;
  }

  const notificationType = `BUDGET_ALERT_${parsed.data.alert_code}`;
  const link = parsed.data.link || '/budget';
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('notifications')
    .select('user_id')
    .eq('tenant_id', user.tenant_id)
    .eq('notification_type', notificationType)
    .eq('link', link)
    .eq('is_read', false)
    .in('user_id', recipientIds);

  if (existingError) {
    sendError(res, `Failed to check existing budget alerts: ${existingError.message}`, 500);
    return;
  }

  const existingRecipients = new Set((existing || []).map(notification => notification.user_id));
  const notifications = recipientIds
    .filter(userId => !existingRecipients.has(userId))
    .map(userId => ({
      tenant_id: user.tenant_id,
      user_id: userId,
      notification_type: notificationType,
      title: `${parsed.data.level} budget alert`,
      message: parsed.data.message,
      link,
      is_read: false,
    }));

  if (notifications.length === 0) {
    sendSuccess(res, { inserted: 0 }, 'Budget alert already exists for all tenant officials.');
    return;
  }

  const { error: insertError } = await supabaseAdmin.from('notifications').insert(notifications);
  if (insertError) {
    sendError(res, `Failed to persist budget alert notifications: ${insertError.message}`, 500);
    return;
  }

  sendSuccess(res, { inserted: notifications.length }, 'Budget alert notifications persisted.');
});

router.post('/compliance', authenticateUser, requireRoles('BARANGAY_ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthRequest).user!;
  const parsed = ComplianceIssueSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors);
    return;
  }

  if (!user.tenant_id && user.role !== 'SUPER_ADMIN') {
    sendError(res, 'User has no assigned Barangay tenant.', 400);
    return;
  }

  const tenantId = user.tenant_id;
  if (!tenantId) {
    sendError(res, 'A tenant_id is required for compliance records.', 400);
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('compliance_monitoring')
    .upsert({
      tenant_id: tenantId,
      report_type: parsed.data.report_type,
      fiscal_year: parsed.data.fiscal_year,
      status: parsed.data.status,
      due_date: parsed.data.due_date || null,
      notes: parsed.data.notes || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,report_type,fiscal_year' })
    .select()
    .single();

  if (error) {
    sendError(res, `Failed to persist compliance issue: ${error.message}`, 500);
    return;
  }

  sendSuccess(res, data, 'Compliance issue persisted.');
});

function calculateAge(birthdateStr: string): number {
  const birthdate = new Date(birthdateStr);
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDiff = today.getMonth() - birthdate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
    age--;
  }
  return age;
}

router.get('/barangay', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthRequest).user!;
  let tenantId = user.tenant_id;

  if (req.query.tenant_id && typeof req.query.tenant_id === 'string') {
    if (canAccessTenant(user, req.query.tenant_id)) {
      tenantId = req.query.tenant_id;
    } else {
      sendError(res, 'Forbidden: You do not have permission to view analytics for this Barangay.', 403);
      return;
    }
  }

  if (!tenantId) {
    sendError(res, 'No Barangay tenant ID provided or associated with this user.', 400);
    return;
  }

  const { data: barangay } = await supabaseAdmin
    .from('barangay')
    .select('id, name, city, district')
    .eq('id', tenantId)
    .single();

  const { data: profiles } = await supabaseAdmin
    .from('resident_profile')
    .select('birthdate, sex, educational_status, employment_status, is_registered_voter, users!inner(role_id)')
    .eq('tenant_id', tenantId)
    .eq('users.role_id', 4);

  const totalRegisteredYouth = profiles?.length || 0;
  let votersCount = 0;
  const ageDistribution = { '15-17': 0, '18-24': 0, '25-30': 0 };
  const sexDistribution: Record<string, number> = {};
  const educationDistribution: Record<string, number> = {};
  const employmentDistribution: Record<string, number> = {};

  profiles?.forEach((p) => {
    if (p.is_registered_voter) votersCount++;

    const age = calculateAge(p.birthdate);
    if (age <= 17) ageDistribution['15-17']++;
    else if (age <= 24) ageDistribution['18-24']++;
    else if (age <= 30) ageDistribution['25-30']++;

    sexDistribution[p.sex] = (sexDistribution[p.sex] || 0) + 1;

    if (p.educational_status) {
      educationDistribution[p.educational_status] = (educationDistribution[p.educational_status] || 0) + 1;
    }

    if (p.employment_status) {
      employmentDistribution[p.employment_status] = (employmentDistribution[p.employment_status] || 0) + 1;
    }
  });

  const voterPercentage = totalRegisteredYouth > 0 ? Math.round((votersCount / totalRegisteredYouth) * 100) : 0;

  const currentYear = new Date().getFullYear();
  const { data: budgets } = await supabaseAdmin
    .from('budget')
    .select('allocated_amount, remaining_amount')
    .eq('tenant_id', tenantId)
    .eq('fiscal_year', currentYear);

  const totalAllocated = budgets?.reduce((acc, b) => acc + Number(b.allocated_amount), 0) || 0;
  const totalRemaining = budgets?.reduce((acc, b) => acc + Number(b.remaining_amount), 0) || 0;
  const totalSpent = totalAllocated - totalRemaining;
  const budgetUtilizationRate = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

  const { count: programCount } = await supabaseAdmin
    .from('program')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  const { count: totalAttendees } = await supabaseAdmin
    .from('program_attendance')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  const { data: feedbacks } = await supabaseAdmin
    .from('feedback')
    .select('sentiment, status, category')
    .eq('tenant_id', tenantId);

  const feedbackSummary = {
    total: feedbacks?.length || 0,
    positive: feedbacks?.filter((f) => f.sentiment === 'positive').length || 0,
    neutral: feedbacks?.filter((f) => f.sentiment === 'neutral').length || 0,
    negative: feedbacks?.filter((f) => f.sentiment === 'negative').length || 0,
    resolved: feedbacks?.filter((f) => f.status === 'resolved').length || 0,
  };

  sendSuccess(
    res,
    {
      barangay,
      demographics: {
        total_youth: totalRegisteredYouth,
        registered_voters: votersCount,
        voter_percentage: voterPercentage,
        age_brackets: ageDistribution,
        sex_distribution: sexDistribution,
        education_distribution: educationDistribution,
        employment_distribution: employmentDistribution,
      },
      fiscal: {
        fiscal_year: currentYear,
        total_allocated: totalAllocated,
        total_spent: totalSpent,
        total_remaining: totalRemaining,
        utilization_rate_pct: budgetUtilizationRate,
      },
      programs: {
        total_programs: programCount || 0,
        total_check_ins: totalAttendees || 0,
      },
      feedback: feedbackSummary,
    },
    'Barangay dashboard analytics retrieved.'
  );
});

router.get(
  '/federation',
  authenticateUser,
  requireRoles('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const { data: barangays, error: bgyError } = await supabaseAdmin
      .from('barangay')
      .select('id, name, sk_district, allocated_budget')
      .order('name', { ascending: true });

    if (bgyError) {
      sendError(res, `Failed to load barangays: ${bgyError.message}`, 500);
      return;
    }

    const { data: youthCounts } = await supabaseAdmin
      .from('users')
      .select('tenant_id, role_id')
      .eq('role_id', 4)
      .eq('status', 'active');

    const youthPerBarangay: Record<string, number> = {};
    youthCounts?.forEach((y) => {
      if (y.tenant_id) {
        youthPerBarangay[y.tenant_id] = (youthPerBarangay[y.tenant_id] || 0) + 1;
      }
    });

    const currentYear = new Date().getFullYear();
    const { data: allBudgets } = await supabaseAdmin
      .from('budget')
      .select('tenant_id, category, allocated_amount, remaining_amount')
      .eq('fiscal_year', currentYear);

    const budgetPerBarangay: Record<string, { allocated: number; spent: number }> = {};
    const budgetByCategory: Record<string, number> = {};
    let cityTotalAllocated = 0;
    let cityTotalSpent = 0;

    allBudgets?.forEach((b) => {
      const allocated = Number(b.allocated_amount);
      const spent = allocated - Number(b.remaining_amount);
      cityTotalAllocated += allocated;
      cityTotalSpent += spent;
      budgetByCategory[b.category] = (budgetByCategory[b.category] || 0) + allocated;

      const current = budgetPerBarangay[b.tenant_id] || { allocated: 0, spent: 0 };
      budgetPerBarangay[b.tenant_id] = {
        allocated: current.allocated + allocated,
        spent: current.spent + spent,
      };
    });

    const { data: cityPrograms } = await supabaseAdmin
      .from('program')
      .select('tenant_id, status');

    const activeProgramStatuses = new Set(['upcoming', 'ongoing']);
    const programPerBarangay: Record<string, number> = {};
    cityPrograms?.forEach((program) => {
      if (activeProgramStatuses.has(program.status)) {
        programPerBarangay[program.tenant_id] = (programPerBarangay[program.tenant_id] || 0) + 1;
      }
    });

    const { count: cityAttendanceCount } = await supabaseAdmin
      .from('program_attendance')
      .select('*', { count: 'exact', head: true });

    const { data: allFeedbacks } = await supabaseAdmin
      .from('feedback')
      .select('sentiment');

    const sentimentOverview = {
      positive: allFeedbacks?.filter((f) => f.sentiment === 'positive').length || 0,
      neutral: allFeedbacks?.filter((f) => f.sentiment === 'neutral').length || 0,
      negative: allFeedbacks?.filter((f) => f.sentiment === 'negative').length || 0,
      total: allFeedbacks?.length || 0,
    };

    const loadedBarangays = barangays || [];
    const barangayMatrix = loadedBarangays.map((b) => {
      const bgyBudget = budgetPerBarangay[b.id] || { allocated: 0, spent: 0 };
      const utilization = bgyBudget.allocated > 0 ? Math.round((bgyBudget.spent / bgyBudget.allocated) * 100) : 0;
      return {
        id: b.id,
        name: b.name,
        sk_district: b.sk_district ?? null,
        registered_youth: youthPerBarangay[b.id] || 0,
        active_programs: programPerBarangay[b.id] || 0,
        budget_allocated: (Number(b.allocated_budget) > 0 ? Number(b.allocated_budget) : bgyBudget.allocated),
        budget_spent: bgyBudget.spent,
        budget_utilization_pct: utilization,
      };
    });

    barangayMatrix.sort((a, b) => a.name.localeCompare(b.name));

    sendSuccess(
      res,
      {
        city: 'Naga City',
        fiscal_year: currentYear,
        citywide_totals: {
          total_barangays: loadedBarangays.length,
          total_registered_youth: youthCounts?.length || 0,
          total_budget_allocated: loadedBarangays.reduce((sum, b) => sum + (Number(b.allocated_budget) > 0 ? Number(b.allocated_budget) : 0), 0) || cityTotalAllocated,
          total_budget_spent: cityTotalSpent,
          total_active_programs: Object.values(programPerBarangay).reduce((sum, count) => sum + count, 0),
          total_program_attendees: cityAttendanceCount || 0,
        },
        budget_by_category: Object.entries(budgetByCategory).map(([category, allocated]) => ({ category, allocated })),
        sentiment_overview: sentimentOverview,
        barangay_rankings: barangayMatrix,
      },
      'Federation-level Naga City dashboard retrieved.'
    );
  }
);

export default router;
