import express from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin, recordAuditLog } from '../services/supabase.service.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { authenticateUser, requireRoles } from '../middleware/auth.js';
import type { AuthRequest } from '../types/database.types.js';

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const AssignChairpersonByEmailSchema = z.object({
  email: z.string().email('Valid email address is required'),
  barangay_id: z.string().uuid('Valid Barangay ID is required'),
});

router.get(
  '/audit-logs',
  authenticateUser,
  requireRoles('SUPER_ADMIN', 'BARANGAY_ADMIN', 'SK_OFFICIAL'),
  async (req: Request, res: Response): Promise<void> => {
    const requestedLimit = Number(req.query.limit);
    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 500)
      : 200;

    let query = supabaseAdmin
      .from('audit_logs')
      .select('id, tenant_id, user_id, action, entity_name, entity_id, details, created_at, users(full_name, roles(role_name)), barangay(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Tenant scoping: only SUPER_ADMIN sees all tenants
    const authReq = req as unknown as { user?: { role?: string; tenant_id?: string } };
    if (authReq.user?.role !== 'SUPER_ADMIN') {
      if (!authReq.user?.tenant_id) {
        sendError(res, 'Tenant scope missing from session.', 403);
        return;
      }
      query = query.eq('tenant_id', authReq.user.tenant_id);
    }

    const { data, error } = await query;

    if (error) {
      sendError(res, `Failed to retrieve audit logs: ${error.message}`, 500);
      return;
    }

    const logs = (data || []).map((entry: any) => {
      const user = Array.isArray(entry.users) ? entry.users[0] : entry.users;
      const role = Array.isArray(user?.roles) ? user.roles[0] : user?.roles;
      const barangay = Array.isArray(entry.barangay) ? entry.barangay[0] : entry.barangay;
      const details = typeof entry.details === 'string'
        ? entry.details
        : entry.details
          ? JSON.stringify(entry.details)
          : '';

      return {
        id: entry.id,
        timestamp: entry.created_at,
        user: user?.full_name || 'System',
        role: role?.role_name === 'BARANGAY_ADMIN' ? 'Barangay Admin' : role?.role_name || 'System',
        action: entry.action,
        details: barangay?.name ? `${details} (Barangay: ${barangay.name})` : details,
      };
    });

    sendSuccess(res, logs, 'Audit logs retrieved successfully.');
  }
);

/**
 * POST /api/admin/assign-chairperson
 * Super Admin (SK Federation President) assigns an SK Chairperson to a barangay.
 * Takes ONLY the Chairperson's Email Address and target barangay_id.
 * Triggers a Supabase Auth invitation, pre-setting their user record in public.users
 * with role_id: 2 (BARANGAY_ADMIN), tenant_id: barangay_id, and status: 'active',
 * leaving their profile uninitialized so first login triggers profile completion.
 */
router.post(
  '/assign-chairperson',
  authenticateUser,
  requireRoles('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parseResult = AssignChairpersonByEmailSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
      return;
    }

    const { email, barangay_id } = parseResult.data;
    const cleanEmail = email.trim().toLowerCase();
    const admin = (req as AuthRequest).user!;

    // 1. Verify target Barangay exists in the 27 Naga City registry
    const { data: barangay, error: bgyError } = await supabaseAdmin
      .from('barangay')
      .select('id, name, district')
      .eq('id', barangay_id)
      .single();

    if (bgyError || !barangay) {
      sendError(res, 'Target Barangay does not exist in Naga City registry.', 404);
      return;
    }

    let targetUserId: string = '';
    let inviteMethod: 'email_invitation' | 'existing_auth_user' | 'temp_credentials' = 'email_invitation';

    // 2. Check the app's users table first
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, email, tenant_id, role_id, full_name, status')
      .eq('email', cleanEmail)
      .maybeSingle();

    // 3. Check Supabase Auth users too, since invite/create may fail if the auth user already exists
    const { data: authUsersData, error: listAuthError } = await supabaseAdmin.auth.admin.listUsers();

    if (listAuthError) {
      sendError(res, `Failed to inspect existing auth users: ${listAuthError.message}`, 500);
      return;
    }

    const existingAuthUser = authUsersData?.users?.find(u => u.email?.toLowerCase() === cleanEmail);

    if (existingUser) {
      targetUserId = existingUser.id;

      if (!existingAuthUser) {
        // Existing public.users row but missing Supabase Auth user: re-invite/create auth account
        const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          cleanEmail,
          {
            data: {
              tenant_id: barangay_id,
              role_id: 2,
            },
            redirectTo: `${FRONTEND_URL}/chairperson-setup?invite_email=${encodeURIComponent(cleanEmail)}&role=chairperson&tenant_id=${barangay_id}`,
          } as any
        );

        if (!inviteErr && inviteData?.user) {
          targetUserId = inviteData.user.id;
          inviteMethod = 'email_invitation';
        } else {
          const tempPassword = `KabisigChairperson${new Date().getFullYear()}!`;
          const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: cleanEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              tenant_id: barangay_id,
              role_id: 2,
            },
            redirectTo: `${FRONTEND_URL}/chairperson-setup?invite_email=${encodeURIComponent(cleanEmail)}&role=chairperson&tenant_id=${barangay_id}`,
          } as any);

          if (createErr || !createData?.user) {
            sendError(res, createErr?.message || 'Failed to initialize Chairperson account via Supabase Auth.', 500);
            return;
          }

          targetUserId = createData.user.id;
          inviteMethod = 'temp_credentials';
        }

        const { error: rebindErr } = await supabaseAdmin
          .from('users')
          .update({
            id: targetUserId,
            tenant_id: barangay_id,
            role_id: 2,
            full_name: existingUser.full_name || 'Pending Invitation',
            email: cleanEmail,
            status: 'active',
            approved_by: admin.id,
            updated_at: new Date().toISOString(),
          })
          .eq('email', cleanEmail);

        if (rebindErr) {
          sendError(res, `Failed to rebind chairperson record to auth user: ${rebindErr.message}`, 500);
          return;
        }
      } else {
        // Update the existing user to BARANGAY_ADMIN for the selected barangay
        const { error: updateErr } = await supabaseAdmin
          .from('users')
          .update({
            tenant_id: barangay_id,
            role_id: 2, // BARANGAY_ADMIN
            status: 'active',
            approved_by: admin.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingUser.id);

        if (updateErr) {
          sendError(res, `Failed to update user record: ${updateErr.message}`, 500);
          return;
        }
      }
    } else if (existingAuthUser) {
      // Existing auth-only record: bind it to the app's public.users table without re-registering.
      targetUserId = existingAuthUser.id;
      inviteMethod = 'existing_auth_user';

      const { error: insertUserErr } = await supabaseAdmin.from('users').upsert(
        {
          id: targetUserId,
          tenant_id: barangay_id,
          role_id: 2,
          full_name: existingAuthUser.user_metadata?.full_name || '',
          email: cleanEmail,
          phone: null,
          status: 'active',
          approved_by: admin.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (insertUserErr) {
        sendError(res, `Failed to bind existing auth user to public.users: ${insertUserErr.message}`, 500);
        return;
      }
    } else {
      // 4. New Chairperson: Trigger Supabase Auth invitation
      const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        cleanEmail,
        {
          data: {
            tenant_id: barangay_id,
            role_id: 2,
          },
            redirectTo: `${FRONTEND_URL}/chairperson-setup?invite_email=${encodeURIComponent(cleanEmail)}&role=chairperson&tenant_id=${barangay_id}`,
        } as any
      );

      if (!inviteErr && inviteData?.user) {
        targetUserId = inviteData.user.id;
        inviteMethod = 'email_invitation';
      } else {
        // Fallback for environments without active SMTP mailers:
        // Create user with standard initial credentials so testing never halts
        const tempPassword = `KabisigChairperson${new Date().getFullYear()}!`;
        const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            tenant_id: barangay_id,
            role_id: 2,
          },
            redirectTo: `${FRONTEND_URL}/chairperson-setup?invite_email=${encodeURIComponent(cleanEmail)}&role=chairperson&tenant_id=${barangay_id}`,
        } as any);

        if (createErr || !createData?.user) {
          sendError(res, createErr?.message || 'Failed to initialize Chairperson account via Supabase Auth.', 500);
          return;
        }

        targetUserId = createData.user.id;
        inviteMethod = 'temp_credentials';
      }

      // 5. Pre-set public.users record with role_id: 2, tenant_id, status: 'active'
      const { error: insertUserErr } = await supabaseAdmin.from('users').upsert(
        {
          id: targetUserId,
          tenant_id: barangay_id,
          role_id: 2, // BARANGAY_ADMIN
          full_name: 'Pending Invitation',
          email: cleanEmail,
          phone: null,
          status: 'active',
          approved_by: admin.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (insertUserErr) {
        sendError(res, `Failed to pre-set Chairperson record in database: ${insertUserErr.message}`, 500);
        return;
      }
    }

    // 6. Generate direct Action / Setup link
    let actionLink = '';
    try {
      const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: cleanEmail,
        options: {
          redirectTo: `${FRONTEND_URL}/chairperson-setup?invite_email=${encodeURIComponent(cleanEmail)}&role=chairperson&tenant_id=${barangay_id}`,
        } as any,
      });
      if (linkData?.properties?.action_link) {
        actionLink = linkData.properties.action_link;
      }
    } catch (linkErr) {
      console.warn('generateLink warning:', linkErr);
    }

    const directSetupUrl = `${FRONTEND_URL}/chairperson-setup?invite_email=${encodeURIComponent(cleanEmail)}&role=chairperson&tenant_id=${barangay_id}`;

    // 7. Audit Logging
    await recordAuditLog({
      tenantId: barangay_id,
      userId: admin.id,
      action: 'ASSIGN_SK_CHAIRPERSON',
      entityName: 'users',
      entityId: targetUserId,
      details: {
        chairperson_email: cleanEmail,
        barangay_id,
        barangay_name: barangay.name,
        assigned_by: admin.full_name,
        invitation_method: inviteMethod,
        setup_url: directSetupUrl,
      },
      ipAddress: req.ip || null,
    });

    const emailDelivered = inviteMethod === 'email_invitation';
    const responseMessage = emailDelivered
      ? `SK Chairperson invitation generated for ${cleanEmail} (Barangay ${barangay.name}). Chairperson can visit Sign In to create their password and access their dashboard.`
      : `SK Chairperson setup link generated for ${cleanEmail} (Barangay ${barangay.name}). Supabase invitation email delivery is not available in this project, so the Chairperson must use the direct setup link below.`;

    sendCreated(
      res,
      {
        user_id: targetUserId,
        email: cleanEmail,
        full_name: (existingUser?.full_name && existingUser.full_name !== 'Pending Invitation' ? existingUser.full_name : existingAuthUser?.user_metadata?.full_name) || null,
        barangay_id,
        barangay_name: barangay.name,
        role: 'BARANGAY_ADMIN',
        status: 'active',
        invitation_method: inviteMethod,
        invitation_status: emailDelivered ? 'email_sent' : 'setup_link_only',
        email_delivery: emailDelivered,
        setup_url: emailDelivered ? '' : directSetupUrl,
        action_link: emailDelivered ? '' : (actionLink || directSetupUrl),
      },
      responseMessage
    );
  }
);

// POST /api/admin/invite-sk-official - Super Admin invites SK Kagawad/Secretary/Treasurer
const InviteSkOfficialSchema = z.object({
  email: z.string().email('Valid email address is required'),
  barangay_id: z.string().uuid('Valid Barangay ID is required'),
  official_role: z.enum(['SK Kagawad', 'SK Secretary', 'SK Treasurer']),
});

router.post(
  '/invite-sk-official',
  authenticateUser,
  requireRoles('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parseResult = InviteSkOfficialSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
      return;
    }
    const { email, barangay_id, official_role } = parseResult.data;
    const cleanEmail = email.trim().toLowerCase();
    const authReq = req as AuthRequest;
    const admin = authReq.user;
    if (!admin) { sendError(res, 'Authentication required.', 401); return; }

    const { data: barangay, error: bgyError } = await supabaseAdmin
      .from('barangay').select('id, name, district').eq('id', barangay_id).single();
    if (bgyError || !barangay) { sendError(res, 'Target Barangay does not exist in Naga City registry.', 404); return; }

    let targetUserId: string = '';
    let inviteMethod: 'email_invitation' | 'existing_auth_user' | 'temp_credentials' = 'email_invitation';
    const redirectUrl = FRONTEND_URL + '/official-setup?invite_email=' + encodeURIComponent(cleanEmail) + '&role=official&tenant_id=' + barangay_id + '&official_role=' + encodeURIComponent(official_role);

    const { data: existingUser } = await supabaseAdmin
      .from('users').select('id, email, tenant_id, role_id, full_name, status')
      .eq('email', cleanEmail).maybeSingle();

    const { data: authUsersData, error: listAuthError } = await supabaseAdmin.auth.admin.listUsers();
    if (listAuthError) { sendError(res, 'Failed to inspect existing auth users: ' + listAuthError.message, 500); return; }

    const existingAuthUser = authUsersData?.users?.find(u => u.email?.toLowerCase() === cleanEmail);

    if (existingUser) {
      targetUserId = existingUser.id;
      if (!existingAuthUser) {
        const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
          data: { tenant_id: barangay_id, role_id: 3, official_role },
          redirectTo: redirectUrl,
        } as any);
        if (!inviteErr && inviteData?.user) {
          targetUserId = inviteData.user.id;
          inviteMethod = 'email_invitation';
        } else {
          const tempPassword = 'KabisigOfficial' + new Date().getFullYear() + '!';
          const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: cleanEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { tenant_id: barangay_id, role_id: 3, official_role },
            redirectTo: redirectUrl,
          } as any);
          if (createErr || !createData?.user) { sendError(res, createErr?.message || 'Failed to initialize SK Official account.', 500); return; }
          targetUserId = createData.user.id;
          inviteMethod = 'temp_credentials';
        }
        const { error: rebindErr } = await supabaseAdmin.from('users').update({
          id: targetUserId,
          tenant_id: barangay_id,
          role_id: 3,
          full_name: existingUser.full_name || 'Pending Invitation',
          email: cleanEmail,
          status: 'active',
          approved_by: admin.id,
          updated_at: new Date().toISOString(),
        }).eq('email', cleanEmail);
        if (rebindErr) { sendError(res, 'Failed to rebind SK Official record: ' + rebindErr.message, 500); return; }
      } else {
        const { error: updateErr } = await supabaseAdmin.from('users').update({
          tenant_id: barangay_id,
          role_id: 3,
          status: 'active',
          approved_by: admin.id,
          updated_at: new Date().toISOString(),
        }).eq('id', existingUser.id);
        if (updateErr) { sendError(res, 'Failed to update user record: ' + updateErr.message, 500); return; }
      }
    } else if (existingAuthUser) {
      targetUserId = existingAuthUser.id;
      inviteMethod = 'existing_auth_user';
      const { error: insertUserErr } = await supabaseAdmin.from('users').upsert({
        id: targetUserId,
        tenant_id: barangay_id,
        role_id: 3,
        full_name: existingAuthUser.user_metadata?.full_name || '',
        email: cleanEmail,
        phone: null,
        status: 'active',
        approved_by: admin.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      if (insertUserErr) { sendError(res, 'Failed to bind existing auth user: ' + insertUserErr.message, 500); return; }
    } else {
      const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
        data: { tenant_id: barangay_id, role_id: 3, official_role },
        redirectTo: redirectUrl,
      } as any);
      if (!inviteErr && inviteData?.user) {
        targetUserId = inviteData.user.id;
        inviteMethod = 'email_invitation';
      } else {
        const tempPassword = 'KabisigOfficial' + new Date().getFullYear() + '!';
        const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { tenant_id: barangay_id, role_id: 3, official_role },
          redirectTo: redirectUrl,
        } as any);
        if (createErr || !createData?.user) { sendError(res, createErr?.message || 'Failed to initialize SK Official account.', 500); return; }
        targetUserId = createData.user.id;
        inviteMethod = 'temp_credentials';
      }
      const { error: insertUserErr } = await supabaseAdmin.from('users').upsert({
        id: targetUserId,
        tenant_id: barangay_id,
        role_id: 3,
        full_name: 'Pending Invitation',
        email: cleanEmail,
        phone: null,
        status: 'active',
        approved_by: admin.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      if (insertUserErr) { sendError(res, 'Failed to pre-set SK Official record: ' + insertUserErr.message, 500); return; }
    }

    let actionLink = '';
    try {
      const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: cleanEmail,
        options: { redirectTo: redirectUrl } as any,
      });
      if (linkData?.properties?.action_link) actionLink = linkData.properties.action_link;
    } catch (linkErr) {
      console.warn('generateLink warning:', linkErr);
    }

    await recordAuditLog({
      tenantId: barangay_id,
      userId: admin.id,
      action: 'INVITE_SK_OFFICIAL',
      entityName: 'users',
      entityId: targetUserId,
      details: {
        official_email: cleanEmail,
        official_role,
        barangay_id,
        barangay_name: barangay.name,
        assigned_by: admin.full_name,
        invitation_method: inviteMethod,
        setup_url: redirectUrl,
      },
      ipAddress: req.ip || null,
    });

    const emailDelivered = inviteMethod === 'email_invitation';
    const responseMessage = emailDelivered
      ? official_role + ' invitation generated for ' + cleanEmail + ' (Barangay ' + barangay.name + '). They can visit Sign In to create their password.'
      : official_role + ' setup link generated for ' + cleanEmail + ' (Barangay ' + barangay.name + '). Supabase email delivery is not available, so they must use the direct setup link below.';

    sendCreated(res, {
      user_id: targetUserId,
      email: cleanEmail,
      full_name: (existingUser?.full_name && existingUser.full_name !== 'Pending Invitation' ? existingUser.full_name : existingAuthUser?.user_metadata?.full_name) || null,
      barangay_id,
      barangay_name: barangay.name,
      role: 'SK_OFFICIAL',
      official_role,
      status: 'active',
      invitation_method: inviteMethod,
      invitation_status: emailDelivered ? 'email_sent' : 'setup_link_only',
      email_delivery: emailDelivered,
      setup_url: redirectUrl,
      action_link: actionLink || redirectUrl,
    }, responseMessage);
  }
);
export default router;

