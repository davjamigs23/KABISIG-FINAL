import express from 'express';
import type { Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabase.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticateUser, requireActiveUser } from '../middleware/auth.js';
import type { AuthRequest } from '../types/database.types.js';

const router = express.Router();

/**
 * GET /api/compliance
 * Returns real COA compliance records from compliance_monitoring table
 * plus auto-detected approved documents (reports + liquidations).
 */
router.get('/', authenticateUser, requireActiveUser, async (req: Request, res: Response): Promise<void> => {
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
    console.warn('[/compliance] compliance_monitoring query error:', recErr.message);
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
  const overdue = list.filter(r => r.status !== 'Completed' && r.due_date && new Date(r.due_date) < now);
  const onTimePercent = completed.length > 0 ? Math.round((onTime.length / completed.length) * 100) : null;

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
      is_overdue: r.status !== 'Completed' && r.due_date && new Date(r.due_date) < now,
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