import express from 'express';
import type { Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabase.service.js';
import { authenticateUser, requireRoles } from '../middleware/auth.js';
import type { AuthRequest } from '../types/database.types.js';
import { sendError, sendSuccess, sendCreated } from '../utils/response.js';

const router = express.Router();

router.get('/', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthRequest).user!;
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('id, notification_type, title, message, link, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    sendError(res, `Failed to retrieve notifications: ${error.message}`, 500);
    return;
  }

  sendSuccess(res, data || [], 'Notifications retrieved successfully.');
});

router.patch('/read-all', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthRequest).user!;
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) {
    sendError(res, `Failed to mark notifications as read: ${error.message}`, 500);
    return;
  }

  sendSuccess(res, null, 'Notifications marked as read.');
});

router.patch('/:id/read', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthRequest).user!;
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('id', req.params.id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) {
    sendError(res, `Failed to mark notification as read: ${error.message}`, 500);
    return;
  }
  if (!data) {
    sendError(res, 'Notification not found.', 404);
    return;
  }

  sendSuccess(res, data, 'Notification marked as read.');
});

router.post('/',
  authenticateUser,
  requireRoles('BARANGAY_ADMIN', 'SK_OFFICIAL', 'SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthRequest).user!;
    const body = req.body || {};
    const userId = body.user_id;
    const title = (body.title || '').toString().trim();
    const message = (body.message || '').toString().trim();
    const notificationType = (body.notification_type || 'outreach').toString();
    const link = body.link || null;

    if (!userId || !title || !message) {
      sendError(res, 'user_id, title, and message are required.', 400);
      return;
    }

    if (user.role !== 'SUPER_ADMIN' && !user.tenant_id) {
      sendError(res, 'User has no assigned Barangay tenant.', 403);
      return;
    }

    const { data: target } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id')
      .eq('id', userId)
      .maybeSingle();

    if (!target) {
      sendError(res, 'Target user not found.', 404);
      return;
    }

    if (user.role !== 'SUPER_ADMIN' && target.tenant_id !== user.tenant_id) {
      sendError(res, 'You can only notify users within your own Barangay.', 403);
      return;
    }

    const { data: created, error } = await supabaseAdmin
      .from('notifications')
      .insert([{
        tenant_id: target.tenant_id,
        user_id: userId,
        title,
        message,
        notification_type: notificationType,
        link,
        is_read: false,
      }])
      .select()
      .single();

    if (error) {
      sendError(res, `Failed to create notification: ${error.message}`, 500);
      return;
    }

    sendCreated(res, created, 'Notification sent.');
  }
);
export default router;
