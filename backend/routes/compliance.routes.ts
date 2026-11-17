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
    .in('status', ['approved', 'Approved'])
    .order('created_at', { ascending: false });

  if (docsErr) {
    console.error('[/compliance] documents query error:', docsErr.message);
    sendError(res, `Failed to load approved compliance documents: ${docsErr.message}`, 500);
    return;
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

  // Strictly map by the Category Group selected during upload
  const q2Docs = (docs || []).filter((d: any) => {
    const type = String(d.document_type || '').toLowerCase();
    const title = String(d.title || '').toLowerCase();
    return type.includes('report') || type.includes('budget') || type.includes('financial') || title.includes('q2') || title.includes('quarter');
  });

  const liqDocs = (docs || []).filter((d: any) => {
    const type = String(d.document_type || '').toLowerCase();
    const title = String(d.title || '').toLowerCase();
    return type.includes('voucher') || type.includes('liquidation') || title.includes('liquidation');
  });

  console.log('[COMPLIANCE DEBUG] Approved docs found:', (docs || []).length);
  console.log('[COMPLIANCE DEBUG] Q2 Docs matched:', q2Docs.length, '| Liquidation Docs matched:', liqDocs.length);

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
      q2_report_count: q2Docs.length,
      q2_latest_upload: q2Docs[0]?.created_at || null,
      liquidation_count: liqDocs.length,
      liquidation_latest_upload: liqDocs[0]?.created_at || null,
    },
  }, 'Compliance records retrieved.');
});

export default router;