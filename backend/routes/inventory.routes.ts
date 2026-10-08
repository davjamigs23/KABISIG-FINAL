import express from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../services/supabase.service.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { authenticateUser, requireRoles } from '../middleware/auth.js';
import type { AuthRequest } from '../types/database.types.js';

const router = express.Router();

const InventoryItemSchema = z.object({
  item_name: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  condition: z.enum(['New', 'Good', 'Fair', 'Damaged', 'Disposed']).default('Good'),
  quantity: z.number().int().min(0).default(1),
  unit: z.string().max(50).default('pcs'),
  unit_cost: z.number().min(0).default(0),
  location: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
});

router.get('/', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthRequest).user!;
  let query = supabaseAdmin
    .from('inventory')
    .select('*')
    .order('created_at', { ascending: false });

  if (user.role !== 'SUPER_ADMIN') {
    if (!user.tenant_id) {
      sendError(res, 'User has no assigned Barangay tenant.', 400);
      return;
    }
    query = query.eq('tenant_id', user.tenant_id);
  }

  const { data, error } = await query;
  if (error) {
    sendError(res, `Failed to retrieve inventory: ${error.message}`, 500);
    return;
  }
  sendSuccess(res, data || [], 'Inventory retrieved successfully.');
});

router.post(
  '/',
  authenticateUser,
  requireRoles('BARANGAY_ADMIN', 'SK_OFFICIAL', 'SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthRequest).user!;
    if (!user.tenant_id) {
      sendError(res, 'User has no assigned Barangay tenant.', 400);
      return;
    }
    const parsed = InventoryItemSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors);
      return;
    }
    const { data, error } = await supabaseAdmin
      .from('inventory')
      .insert({
        tenant_id: user.tenant_id,
        ...parsed.data,
      })
      .select()
      .single();
    if (error) {
      sendError(res, `Failed to register asset: ${error.message}`, 500);
      return;
    }
    sendCreated(res, data, 'Asset registered successfully.');
  }
);

export default router;