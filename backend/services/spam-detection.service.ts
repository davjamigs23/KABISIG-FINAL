import { supabaseAdmin, recordAuditLog } from './supabase.service.js';

export type SpamAction = 'allow' | 'flag' | 'temp_suspend' | 'permanent_ban';

export interface SpamDetectionResult {
  action: SpamAction;
  reason: string;
  details: {
    duplicates24h: number;
    submissions15m: number;
    submissions60s: number;
    contentHash: string;
  };
}

const TEMP_SUSPEND_HOURS = 24;

function normalizeContent(subject: string, message: string): string {
  return (subject + ' ' + message).toLowerCase().replace(/\s+/g, ' ').trim();
}

function hashContent(text: string): string {
  // Simple deterministic hash for duplicate detection (no crypto dep needed)
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  }
  return 'h' + (h >>> 0).toString(16);
}

export async function detectSpam(
  userId: string,
  tenantId: string,
  subject: string,
  message: string
): Promise<SpamDetectionResult> {
  const now = Date.now();
  const window24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const window15m = new Date(now - 15 * 60 * 1000).toISOString();
  const window60s = new Date(now - 60 * 1000).toISOString();

  // Fetch recent submissions from this user
  const { data: recent } = await supabaseAdmin
    .from('feedback')
    .select('subject, message, created_at')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .gte('created_at', window24h)
    .order('created_at', { ascending: false });

  const list = (recent || []) as Array<{ subject: string; message: string; created_at: string }>;

  const currentHash = hashContent(normalizeContent(subject, message));

  const duplicates24h = list.filter(
    (f) => hashContent(normalizeContent(f.subject, f.message)) === currentHash
  ).length;

  const submissions15m = list.filter(
    (f) => new Date(f.created_at).getTime() >= new Date(window15m).getTime()
  ).length;

  const submissions60s = list.filter(
    (f) => new Date(f.created_at).getTime() >= new Date(window60s).getTime()
  ).length;

  const details = { duplicates24h, submissions15m, submissions60s, contentHash: currentHash };

  // Decision tree
  if (duplicates24h >= 3 && submissions15m >= 5 && submissions60s >= 3) {
    return { action: 'permanent_ban', reason: 'Repeated duplicate + high velocity + rapid-fire submissions', details };
  }
  if (submissions60s >= 3) {
    return { action: 'temp_suspend', reason: 'Rapid-fire submissions (3+ within 60 seconds)', details };
  }
  if (submissions15m >= 5) {
    return { action: 'temp_suspend', reason: 'High submission velocity (5+ within 15 minutes)', details };
  }
  if (duplicates24h >= 3) {
    return { action: 'temp_suspend', reason: 'Repeated duplicate content (3+ within 24 hours)', details };
  }
  if (duplicates24h === 2) {
    return { action: 'flag', reason: 'Duplicate content detected (2x in 24h)', details };
  }

  return { action: 'allow', reason: 'No anomalies detected', details };
}

export async function applyRestriction(params: {
  userId: string;
  tenantId: string;
  action: SpamAction;
  reason: string;
  details: any;
  ipAddress: string | null;
}): Promise<void> {
  const { userId, tenantId, action, reason, details, ipAddress } = params;

  if (action === 'allow') return;

  const newStatus =
    action === 'permanent_ban' ? 'banned' :
    action === 'temp_suspend' ? 'suspended' :
    action === 'flag' ? 'flagged' : null;

  // Update user status (skip for flag — keep account usable)
  if (newStatus && action !== 'flag') {
    await supabaseAdmin
      .from('users')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', userId);
  }

  const expiresAt =
    action === 'temp_suspend'
      ? new Date(Date.now() + TEMP_SUSPEND_HOURS * 60 * 60 * 1000).toISOString()
      : null;

  // Deactivate prior active restrictions for the same user
  await supabaseAdmin
    .from('account_restrictions')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_active', true);

  // Insert restriction row
  await supabaseAdmin
    .from('account_restrictions')
    .insert({
      user_id: userId,
      tenant_id: tenantId,
      restriction_type: action === 'permanent_ban' ? 'permanent_ban' : action === 'temp_suspend' ? 'temp_suspend' : 'flag',
      reason,
      detection_details: details,
      expires_at: expiresAt,
      is_active: true,
      review_history: [{
        at: new Date().toISOString(),
        action: action,
        reason,
        by: 'system',
        ip: ipAddress,
      }],
    });

  await recordAuditLog({
    tenantId,
    userId,
    action: 'SPAM_DETECTION_' + action.toUpperCase(),
    entityName: 'users',
    entityId: userId,
    details: { reason, ...details, ip: ipAddress },
    ipAddress,
  });
}