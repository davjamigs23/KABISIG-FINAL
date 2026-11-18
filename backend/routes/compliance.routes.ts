import express from 'express';
import type { Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabase.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticateUser, requireActiveUser, requireRoles } from '../middleware/auth.js';
import type { AuthRequest } from '../types/database.types.js';

const router = express.Router();

/**
 * GET /api/compliance
 * Returns real COA compliance records from compliance_monitoring table
 * plus auto-detected approved documents (reports + liquidations).
 */
router.get('/', authenticateUser, requireRoles('BARANGAY_ADMIN', 'SK_OFFICIAL', 'SUPER_ADMIN'), requireActiveUser, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthRequest).user!;
  if (!user.tenant_id) {
    sendError(res, 'User is not bound to a barangay.', 403);
    return;
  }

  const { data: records, error: recErr } = await supabaseAdmin
    .from('compliance_monitoring')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .order('due_date', { ascending: true });

  if (recErr) {
    sendError(res, `Failed to load compliance records: ${recErr.message}`, 500, recErr);
    return;
  }

  const { data: docs, error: docsErr } = await supabaseAdmin
    .from('documents')
    .select('id, title, document_type, status, created_at')
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false });

  if (docsErr) {
    console.error('[/compliance] documents query error:', docsErr.message);
    sendError(res, `Failed to load compliance documents: ${docsErr.message}`, 500);
    return;
  }

  const expensePageSize = 1000;
  const cashAdvanceExpenses: Array<{ id: string; created_at: string; status: string }> = [];
  for (let offset = 0; ; offset += expensePageSize) {
    const { data: expenseRows, error: expenseError } = await supabaseAdmin
      .from('expense')
      .select('id, status, created_at, budget:budget_id(category)')
      .eq('tenant_id', user.tenant_id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(offset, offset + expensePageSize - 1);

    if (expenseError) {
      sendError(res, `Failed to load approved cash advance expenses: ${expenseError.message}`, 500, expenseError);
      return;
    }

    for (const expense of expenseRows || []) {
      const budget = Array.isArray(expense.budget) ? expense.budget[0] : expense.budget;
      if (String(budget?.category || '').toLowerCase().includes('cash advance')) {
        cashAdvanceExpenses.push(expense);
      }
    }
    if (!expenseRows || expenseRows.length < expensePageSize) break;
  }

  const now = new Date();
  const list = (records || []) as any[];

  const completed = list.filter(r => r.status === 'Completed');
  const onTime = completed.filter(r => r.submitted_at && new Date(r.submitted_at) <= new Date(r.due_date));
  const isOverdue = (record: any) => {
    const status = String(record.status || '').toLowerCase();
    return status === 'overdue'
      || Boolean(status !== 'completed' && record.due_date && new Date(record.due_date) < now);
  };
  const overdue = list.filter(isOverdue);
  const onTimePercent = completed.length > 0 ? Math.round((onTime.length / completed.length) * 100) : null;

  if (overdue.length > 0) {
    const { data: chairpersons, error: chairpersonError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('tenant_id', user.tenant_id)
      .eq('role_id', 2)
      .eq('status', 'active');

    if (chairpersonError) {
      sendError(res, `Failed to find the Chairperson for compliance notifications: ${chairpersonError.message}`, 500, chairpersonError);
      return;
    }

    const chairpersonIds = (chairpersons || []).map(chairperson => chairperson.id);
    if (chairpersonIds.length > 0) {
      const overdueLinks = overdue.map((record: any) => `/compliance?record=${record.id}`);
      const { data: existingNotifications, error: notificationLookupError } = await supabaseAdmin
        .from('notifications')
        .select('user_id, link')
        .eq('tenant_id', user.tenant_id)
        .eq('notification_type', 'COMPLIANCE_OVERDUE')
        .in('user_id', chairpersonIds)
        .in('link', overdueLinks);

      if (notificationLookupError) {
        sendError(res, `Failed to check existing compliance notifications: ${notificationLookupError.message}`, 500, notificationLookupError);
        return;
      }

      const existingKeys = new Set(
        (existingNotifications || []).map(notification => `${notification.user_id}:${notification.link}`)
      );
      const notifications = overdue.flatMap((record: any) => {
        const link = `/compliance?record=${record.id}`;
        return chairpersonIds
          .filter(userId => !existingKeys.has(`${userId}:${link}`))
          .map(userId => ({
            tenant_id: user.tenant_id!,
            user_id: userId,
            notification_type: 'COMPLIANCE_OVERDUE',
            title: 'Compliance Overdue',
            message: `Compliance requirement "${record.report_type}" for FY ${record.fiscal_year} is overdue. Please review and submit the required documentation.`,
            link,
            is_read: false,
          }));
      });

      if (notifications.length > 0) {
        const { error: notificationInsertError } = await supabaseAdmin
          .from('notifications')
          .insert(notifications);

        if (notificationInsertError) {
          sendError(res, `Failed to create compliance notifications: ${notificationInsertError.message}`, 500, notificationInsertError);
          return;
        }
      }
    }
  }

  // Match only the named Q2 financial-performance report, not unrelated reports.
  const q2Docs = (docs || []).filter((d: any) => {
    const type = String(d.document_type || '').trim().toLowerCase();
    const title = String(d.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    return type === 'financial report' && /(?:^|\s)q2 financial performance report(?:$|\s)/.test(title);
  });
  const q2ApprovedDocs = q2Docs.filter((document: any) => String(document.status || '').toLowerCase() === 'approved');
  const q2PendingDocs = q2Docs.filter((document: any) =>
    ['pending_approval', 'pending'].includes(String(document.status || '').toLowerCase())
  );

  sendSuccess(res, {
    records: list.map((r: any) => ({
      id: r.id,
      report_type: r.report_type,
      fiscal_year: r.fiscal_year,
      due_date: r.due_date,
      submitted_at: r.submitted_at,
      status: r.status,
      notes: r.notes,
      is_overdue: isOverdue(r),
    })),
    stats: {
      total: list.length,
      completed_count: completed.length,
      overdue_count: overdue.length,
      on_time_percent: onTimePercent,
    },
    auto_detected: {
      q2_report_status: q2ApprovedDocs.length > 0
        ? 'Submitted'
        : q2PendingDocs.length > 0
          ? 'Pending Approval'
          : 'Not Yet Submitted',
      q2_report_count: q2ApprovedDocs.length,
      q2_latest_upload: q2Docs[0]?.created_at || null,
      liquidation_status: cashAdvanceExpenses.length > 0 ? 'Submitted' : 'Not Yet Submitted',
      liquidation_count: cashAdvanceExpenses.length,
      liquidation_latest_upload: cashAdvanceExpenses[0]?.created_at || null,
    },
  }, 'Compliance records retrieved.');
});

export default router;