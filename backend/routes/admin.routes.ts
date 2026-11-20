import { sendEmail } from '../utils/email.js';
import express from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin, recordAuditLog } from '../services/supabase.service.js';
import { resolveAvatarUrl } from '../services/avatar.service.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { authenticateUser, requireRoles } from '../middleware/auth.js';
import type { AuthRequest } from '../types/database.types.js';
import { resolveName } from '../utils/name.js';

async function sendInvitationEmail(email: string, role: string, setupLink: string): Promise<void> {
  const htmlMsg = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;"><h1 style="color: #091d64; margin: 0 0 8px 0;">KABISIG</h1><p style="color: #64748b; font-size: 12px; margin: 0 0 24px 0;">Kabataang Bagong Sistema para sa Inklusibong Gobyerno</p><h2 style="color: #091d64;">KABISIG secure access link</h2><p style="color: #334155; line-height: 1.6;">Use the secure link below to access KABISIG as ' + role + '. New invitees can complete account setup, and existing officials can sign in:</p><div style="text-align: center; margin: 24px 0;"><a href="' + setupLink + '" style="background-color: #091d64; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Access KABISIG</a></div><p style="color: #94a3b8; font-size: 11px;">If the button does not work, copy this link: <a href="' + setupLink + '">' + setupLink + '</a></p></div>';
  await sendEmail(email, 'KABISIG Account Invitation', htmlMsg);
}

// Wrapper: generate invite link via Supabase, then email it via Brevo
type InvitationLinkType = 'invite' | 'recovery' | 'magiclink';

function getInvitationErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return String(error);
}

async function inviteWithBrevo(
  email: string,
  options: any = {}
): Promise<{ data: any; error: any }> {
  const inviteOptions = {
    ...options,
    expiresIn: 18000,
    data: {
      ...(options.data || {}),
      setup_completed: false,
    },
  };
  const attemptLink = async (type: InvitationLinkType): Promise<{ data: any; error: Error | null }> => {
    let result: { data: any; error: any };
    try {
      if (type === 'invite') {
        result = await supabaseAdmin.auth.admin.generateLink({ type: 'invite', email, options: inviteOptions });
      } else if (type === 'recovery') {
        result = await supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email, options: inviteOptions });
      } else {
        result = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email, options: inviteOptions });
      }
    } catch (error) {
      const attemptError = new Error(getInvitationErrorMessage(error));
      console.error(`[INVITATION LINK] type=${type} result=error reason=${attemptError.message}`);
      return { data: null, error: attemptError };
    }

    if (result.error) {
      const attemptError = new Error(getInvitationErrorMessage(result.error));
      console.error(`[INVITATION LINK] type=${type} result=error reason=${attemptError.message}`);
      return { data: result.data, error: attemptError };
    }
    if (!result.data?.properties?.action_link) {
      const attemptError = new Error('Supabase did not return an action link.');
      console.error(`[INVITATION LINK] type=${type} result=error reason=${attemptError.message}`);
      return { data: result.data, error: attemptError };
    }
    if (!result.data.user?.id) {
      const attemptError = new Error('Supabase did not return the linked user account.');
      console.error(`[INVITATION LINK] type=${type} result=error reason=${attemptError.message}`);
      return { data: result.data, error: attemptError };
    }

    console.info(`[INVITATION LINK] type=${type} result=success`);
    return { data: result.data, error: null };
  };

  const failedAttempts: string[] = [];
  let successfulType: InvitationLinkType = 'invite';
  let linkAttempt = await attemptLink(successfulType);
  if (linkAttempt.error) {
    const inviteError = linkAttempt.error.message;
    if (!/already|registered|exists/i.test(inviteError)) {
      return {
        data: linkAttempt.data,
        error: new Error(`Supabase link type 'invite' failed: ${inviteError}`),
      };
    }

    failedAttempts.push(`invite: ${inviteError}`);
    successfulType = 'recovery';
    linkAttempt = await attemptLink(successfulType);
    if (linkAttempt.error) {
      failedAttempts.push(`recovery: ${linkAttempt.error.message}`);
      successfulType = 'magiclink';
      linkAttempt = await attemptLink(successfulType);
      if (linkAttempt.error) {
        failedAttempts.push(`magiclink: ${linkAttempt.error.message}`);
        return {
          data: linkAttempt.data,
          error: new Error(`Supabase link generation failed after attempts: ${failedAttempts.join('; ')}`),
        };
      }
    }
  }

  const data = { ...linkAttempt.data, link_type: successfulType };
  try {
    const { error: setupMetadataError } = await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
      app_metadata: {
        ...(data.user.app_metadata || {}),
        setup_completed: false,
      },
    });
    if (setupMetadataError) {
      return {
        data,
        error: new Error(`Supabase link type '${successfulType}' succeeded, but setup state initialization failed: ${getInvitationErrorMessage(setupMetadataError)}`),
      };
    }
  } catch (error) {
    return {
      data,
      error: new Error(`Supabase link type '${successfulType}' succeeded, but setup state initialization failed: ${getInvitationErrorMessage(error)}`),
    };
  }

  const setupLink = data.properties.action_link;
  const invRole = inviteOptions.data.role_id === 2 ? 'SK Chairperson' : (inviteOptions.data.official_role || inviteOptions.data.role || 'SK Official');
  try {
    await sendInvitationEmail(email, invRole, setupLink);
  } catch (error) {
    const reason = getInvitationErrorMessage(error);
    console.error(`[INVITATION EMAIL] link_type=${successfulType} result=error reason=${reason}`);
    return {
      data,
      error: new Error(`Supabase link type '${successfulType}' generated a setup link, but Brevo email delivery failed: ${reason}`),
    };
  }

  return { data, error: null };
}

async function findAuthUserByEmail(email: string): Promise<{ user: any | null; error: any | null }> {
  const normalizedEmail = email.toLowerCase();
  const perPage = 1000;
  try {
    for (let page = 1; page <= 20; page += 1) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.warn('[findAuthUserByEmail] listUsers failed, treating as not found:', error.message);
        return { user: null, error: null };
      }
      const user = data.users.find((u: any) => u.email?.toLowerCase() === normalizedEmail);
      if (user) return { user, error: null };
      if (data.users.length < perPage) return { user: null, error: null };
    }
  } catch (err: any) {
    console.warn('[findAuthUserByEmail] exception:', err?.message || err);
    return { user: null, error: null };
  }
  return { user: null, error: null };
}


// Helper to send emails via Brevo API


const router = express.Router();
const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://kabisig-naga.vercel.app').replace(/\/$/, '');

const AssignChairpersonByEmailSchema = z.object({
  email: z.string().email('Valid email address is required'),
  barangay_id: z.string().uuid('Valid Barangay ID is required'),
});

router.get('/all-officials', authenticateUser, requireRoles('SUPER_ADMIN'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const { data: users, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, email, full_name, role_id, status, phone, avatar_url, setup_completed, official_role')
      .or('role_id.in.(2,3),official_role.not.is.null')
      .not('tenant_id', 'is', null)
      .order('full_name', { ascending: true });

    if (userErr) {
      console.error('Error fetching users:', userErr);
      sendError(res, 'Failed to load official account details.', 500);
      return;
    }

    const userIds = (users || []).map((user) => user.id);
    let profiles: Array<{ user_id: string; sex: string | null; birthdate: string | null }> = [];
    if (userIds.length > 0) {
      const { data: profileData, error: profErr } = await supabaseAdmin
        .from('resident_profile')
        .select('user_id, sex, birthdate')
        .in('user_id', userIds);
      if (profErr) {
        console.error('Error fetching related data:', profErr);
        sendError(res, 'Failed to load related data.', 500);
        return;
      }
      profiles = profileData || [];
    }

    const { data: barangays, error: bgyErr } = await supabaseAdmin
      .from('barangay')
      .select('id, name');
    if (bgyErr) {
      console.error('Error fetching related data:', bgyErr);
      sendError(res, 'Failed to load related data.', 500);
      return;
    }

    const profileByUserId = new Map(profiles.map((profile) => [profile.user_id, profile]));
    const barangayById = new Map((barangays || []).map((barangay) => [barangay.id, barangay.name]));
    const roster = await Promise.all((users || []).map(async (official) => {
      const profile = profileByUserId.get(official.id);
      const fullName = official.full_name || 'Pending Invitation';
      const status = official.status;
      const isPending = status === 'pending' || fullName === 'Pending Invitation';
      const sex = profile?.sex || 'Prefer not to say';
      const officialRole = Number(official.role_id) === 2
        ? 'SK Chairperson'
        : official.official_role || 'SK Kagawad';
      return {
        id: official.id,
        tenant_id: official.tenant_id,
        barangay_name: barangayById.get(official.tenant_id) || 'Unknown Barangay',
        role_id: Number(official.role_id),
        official_role: Number(official.role_id) === 2
          ? 'SK Chairperson'
          : official.official_role || 'SK Kagawad',
        position: officialRole,
        sex,
        birthdate: profile?.birthdate || null,
        gender_title: sex === 'Male' ? 'Mr.' : sex === 'Female' ? 'Ms.' : sex === 'Other' ? 'Mr./Ms.' : '',
        full_name: official.full_name || '',
        display_name: isPending ? 'Pending Invite' : (official.full_name || 'Unassigned'),
        email: official.email || '',
        phone: official.phone,
        status,
        is_pending: isPending,
        setup_completed: official.setup_completed ?? false,
        avatar_url: await resolveAvatarUrl(official.avatar_url),
      };
    }));

    sendSuccess(res, roster, 'Officials retrieved successfully.');
  } catch (error: any) {
    console.error('Failed to retrieve all Barangay officials:', error);
    sendError(res, error?.message || 'Failed to load officials.', 500);
  }
});

const ResendChairpersonInvitationSchema = z.object({
  barangay_id: z.string().uuid('Valid Barangay ID is required'),
});

router.post(
  '/resend-chairperson-invitation',
  authenticateUser,
  requireRoles('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parseResult = ResendChairpersonInvitationSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
      return;
    }

    const { barangay_id } = parseResult.data;
    const admin = (req as AuthRequest).user!;
    const { data: barangay, error: barangayError } = await supabaseAdmin
      .from('barangay')
      .select('id, name')
      .eq('id', barangay_id)
      .maybeSingle();
    if (barangayError) {
      sendError(res, `Failed to load Barangay: ${barangayError.message}`, 500);
      return;
    }
    if (!barangay) {
      sendError(res, 'Target Barangay does not exist.', 404);
      return;
    }

    const { data: chairperson, error: chairpersonError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, status')
      .eq('tenant_id', barangay_id)
      .eq('role_id', 2)
      .in('status', ['active', 'pending'])
      .maybeSingle();
    if (chairpersonError) {
      sendError(res, `Failed to load the Barangay Chairperson: ${chairpersonError.message}`, 500);
      return;
    }
    if (!chairperson?.email) {
      sendError(res, 'No Chairperson with a registered email was found for this Barangay.', 404);
      return;
    }

    const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(chairperson.id);
    if (authUserError || !authUserData.user) {
      sendError(res, `Failed to load the Chairperson account: ${authUserError?.message || 'Auth account not found.'}`, 500);
      return;
    }

    const isFullyOnboarded =
      authUserData.user.app_metadata?.setup_completed === true
      || chairperson.status === 'active';
    if (isFullyOnboarded) {
      sendError(res, 'This official has already completed onboarding. Please use Transfer Leadership instead.', 400);
      return;
    }

    const cleanEmail = chairperson.email.trim().toLowerCase();
    if (authUserData.user.email?.trim().toLowerCase() !== cleanEmail) {
      sendError(res, 'The Chairperson email does not match the linked authentication account.', 409);
      return;
    }
    const setupUrl = `${FRONTEND_URL}/chairperson-setup?invite_email=${encodeURIComponent(cleanEmail)}&role=chairperson&tenant_id=${barangay_id}`;
    let linkData: any = null;
    let linkError: unknown = null;
    try {
      const generatedLink = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: cleanEmail,
        options: { redirectTo: setupUrl, expiresIn: 18000 } as any,
      });
      linkData = generatedLink.data;
      linkError = generatedLink.error;
    } catch (error) {
      linkError = error;
    }
    const actionLink = linkData?.properties?.action_link;
    if (linkError || !actionLink) {
      const reason = linkError ? getInvitationErrorMessage(linkError) : 'Supabase did not return an action link.';
      console.error(`[INVITATION LINK] type=magiclink result=error reason=${reason}`);
      sendError(res, `Supabase link type 'magiclink' failed: ${reason}`, 502, { link_type: 'magiclink' });
      return;
    }
    console.info('[INVITATION LINK] type=magiclink result=success');

    try {
      await sendInvitationEmail(cleanEmail, 'SK Chairperson', actionLink);
    } catch (emailError) {
      const message = getInvitationErrorMessage(emailError);
      sendError(
        res,
        `Supabase link type 'magiclink' generated a setup link, but Brevo email delivery failed: ${message}`,
        502,
        { link_type: 'magiclink', action_link: actionLink, setup_url: setupUrl }
      );
      return;
    }

    await recordAuditLog({
      tenantId: barangay_id,
      userId: admin.id,
      action: 'RESEND_SK_CHAIRPERSON_INVITATION',
      entityName: 'users',
      entityId: chairperson.id,
      details: {
        chairperson_email: cleanEmail,
        barangay_name: barangay.name,
        account_status: chairperson.status,
      },
      ipAddress: req.ip || null,
    });

    sendSuccess(
      res,
      { email: cleanEmail, barangay_id, link_type: 'magiclink', action_link: actionLink, setup_url: setupUrl },
      `A secure sign-in link was sent to ${cleanEmail}.`
    );
  }
);

// PUT /api/admin/users/:userId/update-name - SA only
// GET /api/admin/users/lookup/:identifier - SA only
router.get('/users/lookup', authenticateUser, requireRoles('SUPER_ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const caller = (req as AuthRequest).user!;
    const identifier = String(req.query.identifier || '').trim();
    if (!identifier) { sendError(res, 'Identifier is required.', 400); return; }

    // Detect UUID format to avoid PostgreSQL type cast errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(identifier);

    // Use public.users as the source of truth; Auth records may be absent or incomplete.
    let userQuery = supabaseAdmin
      .from('users')
      .select('id, email, full_name, first_name, middle_name, last_name, suffix, phone, role_id, tenant_id, status');
    if (Number(caller.role_id) === 2 || Number(caller.role_id) === 3) {
      if (!caller.tenant_id) {
        sendError(res, 'A barangay tenant is required for this lookup.', 403);
        return;
      }
      userQuery = userQuery.eq('tenant_id', caller.tenant_id);
    }
    if (isUuid) {
      userQuery = userQuery.eq('id', identifier);
    } else {
      userQuery = userQuery.ilike('email', '%' + identifier.toLowerCase() + '%');
    }

    const { data: matchingUsers, error: userErr } = await userQuery.limit(2);
    if (userErr) { sendError(res, 'Lookup failed: ' + userErr.message, 500); return; }
    if (!matchingUsers?.length) { sendError(res, 'User not found.', 404); return; }
    if (matchingUsers.length > 1) {
      sendError(res, 'Multiple users match this email. Enter a more specific email address.', 409);
      return;
    }
    const user = matchingUsers[0];
    if (!user) { sendError(res, 'User not found.', 404); return; }

    // Profile is optional — only youth constituents have it.
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('resident_profile')
      .select('birthdate, sex')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profileErr) {
      sendError(res, 'Failed to load user profile: ' + profileErr.message, 500);
      return;
    }

    sendSuccess(res, {
      ...user,
      birthdate: profile?.birthdate || null,
      sex: profile?.sex || null,
      resident_profile: profile || null,
      has_profile: !!profile
    }, 'User found.');
  } catch (err: any) {
    sendError(res, 'Unexpected error: ' + err.message, 500);
  }
});

router.put('/users/:userId/update-name', authenticateUser, requireRoles('SUPER_ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const authUser = (req as AuthRequest).user!;
    const rawId = String(req.params.userId || '').trim();
    const { full_name, first_name, middle_name, last_name, suffix, email, phone, birthdate, reason } = req.body;
    if (!full_name) { sendError(res, 'Full name is required.', 400); return; }

    // --- Resolve UUID from Email or use as-is if already a UUID ---
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let userId = rawId;
    if (!uuidRegex.test(rawId)) {
      // Not a UUID, assume it's an email and look up the user
      const { data: resolvedUser, error: resolveErr } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', rawId.toLowerCase())
        .maybeSingle();
      if (resolveErr || !resolvedUser) { sendError(res, 'User not found with that email.', 404); return; }
      userId = resolvedUser.id;
    }

    // --- Check for duplicate email ---
    if (email && email.trim()) {
      const { data: existingEmail } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .neq('id', userId)
        .maybeSingle();
      if (existingEmail) { sendError(res, 'Email is already in use by another account.', 400); return; }
    }

    // --- Fetch old data for diff ---
    const { data: oldUser } = await supabaseAdmin.from('users').select('full_name, first_name, middle_name, last_name, email, phone').eq('id', userId).single();
    const { data: oldProfile } = await supabaseAdmin.from('resident_profile').select('birthdate').eq('user_id', userId).single();

    // --- Fetch target's barangay for audit trail ---
    const { data: _targetBgy } = await supabaseAdmin.from('users').select('barangay(name)').eq('id', userId).maybeSingle();
    const _bgyData: any = (_targetBgy as any)?.barangay;
    const targetBarangayName = (Array.isArray(_bgyData) ? _bgyData[0]?.name : _bgyData?.name) || 'N/A';

    // --- Update public.users ---
    const { error: userError } = await supabaseAdmin.from('users').update({
      full_name: full_name.trim(),
      first_name: first_name?.trim() || null,
      middle_name: middle_name?.trim() || null,
      last_name: last_name?.trim() || null,
      suffix: suffix?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || undefined,
      updated_at: new Date().toISOString()
    }).eq('id', userId);

    if (userError) { sendError(res, 'Failed to update user: ' + userError.message, 500); return; }

    // --- Update auth.users ---
    const authUpdate: any = { user_metadata: { full_name: full_name.trim() } };
    if (email && email.trim()) {
      authUpdate.email = email.trim();
      authUpdate.email_confirm = true;
    }
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdate);
    if (authError) { sendError(res, 'Auth update failed: ' + authError.message, 500); return; }

    // --- Update resident_profile ---
    if (birthdate) {
      const { error: profileError } = await supabaseAdmin.from('resident_profile').update({ birthdate: birthdate }).eq('user_id', userId);
      if (profileError) { console.warn('Profile update failed:', profileError.message); }
    }

        // --- Send Professional Email Alert with Full Change Log ---
    const changesList: string[] = [];
    if (oldUser?.full_name !== full_name) changesList.push(`Name: ${oldUser?.full_name || 'None'} &rarr; ${full_name}`);
    if (oldUser?.email !== email && email) changesList.push(`Email: ${oldUser?.email || 'None'} &rarr; ${email}`);
    if (oldUser?.phone !== phone) changesList.push(`Phone: ${oldUser?.phone || 'None'} &rarr; ${phone || 'None'}`);
    if (oldProfile?.birthdate !== birthdate && birthdate) changesList.push(`Birthdate: ${oldProfile?.birthdate || 'None'} &rarr; ${birthdate}`);

    if (changesList.length > 0) {
      const emailSubject = 'Security Alert: Your KABISIG Account Was Updated';
      
      const changesHtml = changesList.map(change => 
        `<li style="margin-bottom: 8px; color: #334155; font-size: 14px;">${change}</li>`
      ).join('');

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #091d64; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">KABISIG</h1>
            <p style="color: #93c5fd; margin: 4px 0 0 0; font-size: 14px;">Kabataang Bagong Sistema para sa Inklusibong Gobyerno</p>
          </div>
          <div style="padding: 32px; background-color: #ffffff;">
            <h2 style="color: #091d64; margin-top: 0;">Account Details Updated</h2>
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hello <strong>${full_name}</strong>,</p>
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">The following information on your KABISIG account has been updated by an administrator:</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <ul style="margin: 0; padding-left: 20px;">
                ${changesHtml}
              </ul>
            </div>
            
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">If you did not request these changes, please contact the SK Federation President immediately.</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background-color: #091d64; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Log In to KABISIG</a>
            </div>
          </div>
          <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} KABISIG. All rights reserved.</p>
          </div>
        </div>
      `;
      
      const recipients = [oldUser?.email, email].filter((e): e is string => !!e);
      for (const recipient of recipients) {
        try {
          await sendEmail(recipient, emailSubject, emailHtml);
        } catch (err) { console.warn('Failed to send email alert to ' + recipient + ':', err); }
      }
    }
// --- Audit Log ---
    await recordAuditLog({
      tenantId: null,
      userId: authUser.id,
      action: 'UPDATE_USER_CREDENTIALS',
      entityName: 'users',
      entityId: userId,
      details: {
        reason: reason || 'No reason provided',
        target_name: full_name,
        old_full_name: oldUser?.full_name || 'Unknown',
        target_barangay: targetBarangayName,
        changes: {
          first_name: (oldUser?.first_name || '') !== (first_name || '') ? { old: oldUser?.first_name || '', new: first_name || '' } : undefined,
          middle_name: (oldUser?.middle_name || '') !== (middle_name || '') ? { old: oldUser?.middle_name || '', new: middle_name || '' } : undefined,
          last_name: (oldUser?.last_name || '') !== (last_name || '') ? { old: oldUser?.last_name || '', new: last_name || '' } : undefined,
          email: oldUser?.email !== email && email ? { old: oldUser?.email, new: email } : undefined,
          phone: oldUser?.phone !== phone ? { old: oldUser?.phone, new: phone } : undefined,
          birthdate: oldProfile?.birthdate !== birthdate && birthdate ? { old: oldProfile?.birthdate, new: birthdate } : undefined
        }
      },
      ipAddress: req.ip || null
    });

    sendSuccess(res, { id: userId, full_name: full_name.trim() }, 'User profile corrected successfully.');
  } catch (err: any) {
    sendError(res, 'Unexpected error: ' + err.message, 500);
  }
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

    const user = (req as AuthRequest).user!;
    if (user.role_id !== 1) {
      if (!user.tenant_id) {
        sendError(res, 'Tenant scope missing from session.', 403);
        return;
      }
      query = query.eq('tenant_id', user.tenant_id);
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

    // Panel rec #9: prevent silent overwrite of an existing Chairperson.
    // If a Chairperson already exists, use the Transfer Leadership workflow instead.

  // === Chairperson honorific auto-enforcement ===
  // Elected chairs always carry "Hon." — enforced at invite/assign time.
  const ensureHon = (n: string | null | undefined): string => {
    const _n = String(n || '').trim();
    if (!_n || _n === 'Pending Invitation') return _n || 'Pending Invitation';
    return _n.toLowerCase().startsWith('hon.') ? _n : `Hon. ${_n}`;
  };
    const { data: existingChair } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, status')
      .eq('tenant_id', barangay_id)
      .eq('role_id', 2)
      .eq('status', 'active')
      .maybeSingle();

    if (existingChair && existingChair.email && existingChair.email.toLowerCase() !== cleanEmail) {
      sendError(
        res,
        `Barangay ${barangay.name} already has an active Chairperson (${existingChair.full_name || existingChair.email}). Use Transfer Leadership to hand over the role.`,
        409,
        {
          code: 'CHAIRPERSON_EXISTS',
          current_chairperson_id: existingChair.id,
          current_chairperson_email: existingChair.email,
        }
      );
      return;
    }

    let targetUserId: string = '';
    let actionLink = '';
    let invitationLinkType: InvitationLinkType | null = null;
    let inviteMethod: 'email_invitation' | 'existing_auth_user' | 'temp_credentials' = 'existing_auth_user';

    // 2. Check the app's users table first
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, email, tenant_id, role_id, full_name, first_name, middle_name, last_name, suffix, status')
      .eq('email', cleanEmail)
      .maybeSingle();
    const chairpersonAuthFullName = existingUser?.full_name || 'Pending Invitation';

    // 3. Check Supabase Auth users too, since invite/create may fail if the auth user already exists
    let existingAuthUser: any | null = null;
    try {
      const authLookup = await findAuthUserByEmail(cleanEmail);
      existingAuthUser = authLookup.user;
    } catch (error) {
      console.error('[assign-chairperson] findAuthUserByEmail failed:', error);
    }

    if (existingUser) {
      // === Reused-email guard (single-account-per-email policy) ===
      // Each email may hold exactly one role. Reject if this email already
      // belongs to a different role (Youth / SK Official / SA / Viewer).
      if (Number(existingUser.role_id) !== 2) {
        const _roleNames: Record<number, string> = { 1: 'Super Admin', 3: 'SK Official', 4: 'Youth Constituent', 5: 'Viewer' };
        const _currentRole = _roleNames[Number(existingUser.role_id)] || 'another role';
        sendError(
          res,
          'This email is already registered as ' + _currentRole + '. Each email can only be linked to one account across all roles. Please use a different email address.',
          409,
          { code: 'EMAIL_ALREADY_REGISTERED_OTHER_ROLE', current_role_id: existingUser.role_id }
        );
        return;
      }
      targetUserId = existingUser.id;

      if (!existingAuthUser) {
        // Existing public.users row but missing Supabase Auth user: re-invite/create auth account
        const { data: inviteData, error: inviteErr } = await inviteWithBrevo(
          cleanEmail,
          {
            data: {
              tenant_id: barangay_id,
              role_id: 2,
              full_name: chairpersonAuthFullName,
            },
            redirectTo: `${FRONTEND_URL}/chairperson-setup?invite_email=${encodeURIComponent(cleanEmail)}&role=chairperson&tenant_id=${barangay_id}`,
          } as any
        );

        if (inviteErr || !inviteData?.user) {
          const errorMessage = inviteErr instanceof Error
            ? inviteErr.message
            : inviteErr?.message || 'Supabase did not return an invited Chairperson account.';
          const linkType = inviteData?.link_type || 'invite';
          sendError(
            res,
            `Failed to send Chairperson invitation using Supabase link type '${linkType}': ${errorMessage}`,
            502,
            { link_type: linkType, action_link: inviteData?.properties?.action_link || null }
          );
          return;
        }
        targetUserId = inviteData.user.id;
        actionLink = inviteData.properties.action_link;
        invitationLinkType = inviteData.link_type || 'invite';
        inviteMethod = 'email_invitation';

        const { error: rebindErr } = await supabaseAdmin
          .from('users')
          .update({
            id: targetUserId,
            tenant_id: barangay_id,
            role_id: 2,
            full_name: existingUser.full_name || 'Pending Invitation',
            first_name: (existingUser as any).first_name || null,
            middle_name: (existingUser as any).middle_name || null,
            last_name: (existingUser as any).last_name || null,
            suffix: (existingUser as any).suffix || null,
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
        inviteMethod = 'existing_auth_user';
        const _preserveChair = resolveName({
          payload: {},
          existing: {
            first_name: (existingUser as any).first_name,
            middle_name: (existingUser as any).middle_name,
            last_name: (existingUser as any).last_name,
            suffix: (existingUser as any).suffix,
            full_name: existingUser.full_name,
          },
          placeholders: ['Pending Invitation', 'Pending Chairperson'],
          fallback: { first_name: 'SK', last_name: 'Chairperson' },
        });
        const { error: updateErr } = await supabaseAdmin
          .from('users')
          .update({
            tenant_id: barangay_id,
            role_id: 2, // BARANGAY_ADMIN
            status: 'active',
            approved_by: admin.id,
            updated_at: new Date().toISOString(),
            full_name: ensureHon(_preserveChair.full_name || existingUser.full_name || 'Pending Invitation'),
            first_name: _preserveChair.first_name || null,
            middle_name: _preserveChair.middle_name || null,
            last_name: _preserveChair.last_name || null,
            suffix: _preserveChair.suffix || null,
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
          full_name: ensureHon(existingAuthUser.user_metadata?.full_name || ''),
          first_name: null,
          middle_name: null,
          last_name: null,
          suffix: null,
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
      const { data: inviteData, error: inviteErr } = await inviteWithBrevo(
        cleanEmail,
        {
          data: {
            tenant_id: barangay_id,
            role_id: 2,
            full_name: chairpersonAuthFullName,
          },
            redirectTo: `${FRONTEND_URL}/chairperson-setup?invite_email=${encodeURIComponent(cleanEmail)}&role=chairperson&tenant_id=${barangay_id}`,
        } as any
      );

      if (inviteErr || !inviteData?.user) {
        const errorMessage = inviteErr instanceof Error
          ? inviteErr.message
          : inviteErr?.message || 'Supabase did not return an invited Chairperson account.';
        const linkType = inviteData?.link_type || 'invite';
        sendError(
          res,
          `Failed to send Chairperson invitation using Supabase link type '${linkType}': ${errorMessage}`,
          502,
          { link_type: linkType, action_link: inviteData?.properties?.action_link || null }
        );
        return;
      }
      targetUserId = inviteData.user.id;
      actionLink = inviteData.properties.action_link;
      invitationLinkType = inviteData.link_type || 'invite';
      inviteMethod = 'email_invitation';

      // 5. Pre-set public.users record with role_id: 2, tenant_id, status: 'active'
      const { error: insertUserErr } = await supabaseAdmin.from('users').upsert(
        {
          id: targetUserId,
          tenant_id: barangay_id,
          role_id: 2, // BARANGAY_ADMIN
          full_name: 'Pending Invitation',
          first_name: null,
          middle_name: null,
          last_name: null,
          suffix: null,
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

    if (existingAuthUser) {
      const { error: setupResetError } = await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
        app_metadata: {
          ...(existingAuthUser.app_metadata || {}),
          setup_completed: false,
        },
        user_metadata: {
          ...(existingAuthUser.user_metadata || {}),
          tenant_id: barangay_id,
          role_id: 2,
          role: 'Barangay Admin',
          setup_completed: false,
        },
      });
      if (setupResetError) {
        sendError(res, `Failed to reset Chairperson setup state: ${setupResetError.message}`, 500);
        return;
      }
    }

    const { error: chairpersonSetupStateError } = await supabaseAdmin
      .from('users')
      .update({ setup_completed: false })
      .eq('id', targetUserId);
    if (chairpersonSetupStateError) {
      sendError(res, `Failed to reset Chairperson setup state: ${chairpersonSetupStateError.message}`, 500);
      return;
    }

    // 6. Generate direct Action / Setup link
    let actionLinkError: unknown;
    if (!actionLink) {
      try {
        console.info('[INVITATION LINK] type=magiclink result=attempt');
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: cleanEmail,
          options: {
            redirectTo: `${FRONTEND_URL}/chairperson-setup?invite_email=${encodeURIComponent(cleanEmail)}&role=chairperson&tenant_id=${barangay_id}`,
            expiresIn: 18000,
          } as any,
        });
        if (linkError) throw linkError;
        actionLink = linkData?.properties?.action_link || '';
        if (actionLink) {
          invitationLinkType = 'magiclink';
          console.info('[INVITATION LINK] type=magiclink result=success');
        } else {
          actionLinkError = new Error('Supabase did not return an action link.');
          console.error(`[INVITATION LINK] type=magiclink result=error reason=${getInvitationErrorMessage(actionLinkError)}`);
        }
      } catch (linkErr) {
        actionLinkError = linkErr;
        console.error(`[INVITATION LINK] type=magiclink result=error reason=${getInvitationErrorMessage(linkErr)}`);
      }
    }

    if (inviteMethod === 'existing_auth_user') {
      if (!actionLink) {
        const errorMessage = actionLinkError ? getInvitationErrorMessage(actionLinkError) : 'Supabase did not return a setup link.';
        sendError(res, `Supabase link type 'magiclink' failed: ${errorMessage}`, 502, { link_type: 'magiclink' });
        return;
      }
      try {
        await sendInvitationEmail(cleanEmail, 'SK Chairperson', actionLink);
        inviteMethod = 'email_invitation';
      } catch (emailError) {
        const errorMessage = getInvitationErrorMessage(emailError);
        sendError(
          res,
          `Supabase link type '${invitationLinkType || 'magiclink'}' generated a setup link, but Brevo email delivery failed: ${errorMessage}`,
          502,
          { link_type: invitationLinkType || 'magiclink', action_link: actionLink }
        );
        return;
      }
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
        setup_url: '',
      },
      ipAddress: req.ip || null,
    });

    const emailDelivered = inviteMethod === 'email_invitation';
    const responseMessage = `SK Chairperson invitation sent to ${cleanEmail} for Barangay ${barangay.name}. Please check the inbox (and spam folder) for the setup email. If it has not arrived within a few minutes, retry the assignment or contact the SK Federation President.`;

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
        link_type: invitationLinkType || 'magiclink',
        setup_url: directSetupUrl,
        action_link: actionLink || directSetupUrl,
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
  first_name: z.string().trim().optional().nullable(),
  middle_name: z.string().trim().optional().nullable(),
  last_name: z.string().trim().optional().nullable(),
  suffix: z.string().trim().optional().nullable(),
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
    const { email, barangay_id, official_role, first_name, middle_name, last_name, suffix } = parseResult.data;

    const cleanEmail = email.trim().toLowerCase();
    const authReq = req as AuthRequest;
    const admin = authReq.user;
    if (!admin) { sendError(res, 'Authentication required.', 401); return; }

    const { data: barangay, error: bgyError } = await supabaseAdmin
      .from('barangay').select('id, name, district').eq('id', barangay_id).single();
    if (bgyError || !barangay) { sendError(res, 'Target Barangay does not exist in Naga City registry.', 404); return; }

    let targetUserId: string = '';
    let actionLink = '';
    let invitationLinkType: InvitationLinkType | null = null;
    let invitationDeliveryError: unknown = null;
    let inviteMethod: 'email_invitation' | 'existing_auth_user' | 'temp_credentials' | 'setup_link_only' = 'email_invitation';
    const redirectUrl = FRONTEND_URL + '/official-setup?invite_email=' + encodeURIComponent(cleanEmail) + '&role=official&tenant_id=' + barangay_id + '&official_role=' + encodeURIComponent(official_role);

    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from('users').select('id, email, tenant_id, role_id, full_name, first_name, middle_name, last_name, suffix, status, official_role, setup_completed')
      .eq('email', cleanEmail).maybeSingle();
    if (existingUserError) {
      sendError(res, 'Failed to inspect existing user record: ' + existingUserError.message, 500);
      return;
    }
    const officialAuthFullName = resolveName({
      payload: { first_name, middle_name, last_name, suffix },
      existing: existingUser ? {
        first_name: (existingUser as any).first_name,
        middle_name: (existingUser as any).middle_name,
        last_name: (existingUser as any).last_name,
        suffix: (existingUser as any).suffix,
        full_name: existingUser.full_name,
      } : null,
      placeholders: ['Pending Invitation'],
      fallback: { first_name: 'SK', last_name: 'Official' },
    }).full_name;

    const { user: existingAuthUser } = await findAuthUserByEmail(cleanEmail);

    const existingOfficialRoleMetadata = String(existingUser?.official_role || '').toLowerCase();
    const existingOfficialRole = existingOfficialRoleMetadata.includes('secretary') ? 'SK Secretary'
      : existingOfficialRoleMetadata.includes('treasurer') ? 'SK Treasurer'
      : 'SK Kagawad';
    const setupMarkedIncomplete = Boolean(existingUser && (
      existingUser.setup_completed === false
      || String(existingUser?.full_name || '').toLowerCase().includes('pending invitation')
    ) && existingUser.setup_completed !== true);
    const isPendingSetupReinvite = Boolean(
      existingUser
      && Number(existingUser.role_id) === 3
      && existingUser.tenant_id === barangay_id
      && setupMarkedIncomplete
      && existingOfficialRole === official_role
    );

    // Exclude the pending account being re-invited from the capacity calculation.
    {
      const ROLE_LIMITS: Record<string, number> = {
        'SK Kagawad': 7,
        'SK Secretary': 1,
        'SK Treasurer': 1,
      };
      const limit = ROLE_LIMITS[official_role] || 0;

      const { data: existingOfficials, error: existingOfficialsError } = await supabaseAdmin
        .from('users')
        .select('id, role_id, status, official_role')
        .eq('tenant_id', barangay_id)
        .eq('role_id', 3)
        .eq('status', 'active');
      if (existingOfficialsError) {
        sendError(res, 'Failed to verify role capacity: ' + existingOfficialsError.message, 500);
        return;
      }

      const list = (existingOfficials || []).filter(
        official => !isPendingSetupReinvite || official.id !== existingUser?.id
      );
      if (list.length > 0) {
        let current = 0;
        for (const o of list) {
          const sub = String(o.official_role || '').toLowerCase();
          const normalized = sub.includes('secretary') ? 'SK Secretary'
            : sub.includes('treasurer') ? 'SK Treasurer'
            : 'SK Kagawad';
          if (normalized === official_role) current++;
        }

        if (current >= limit) {
          sendError(
            res,
            `Barangay capacity reached: only ${limit} ${official_role}${limit > 1 ? 's' : ''} allowed per Barangay. ${current} already registered.`,
            409,
            { code: 'ROLE_CAPACITY_REACHED', role: official_role, current, limit }
          );
          return;
        }
      }
    }

    // Guard: prevent email reassignment across roles / barangays.
    // An email already bound to an active SK Chairperson or SK Official
    // cannot be invited again (would overwrite the existing role).
    if (existingUser && (existingUser as any).status === 'active') {
      const eu: any = existingUser;
      let actualBarangayName: string | null = null;
      if (eu.tenant_id && (eu.role_id === 2 || (eu.role_id === 3 && eu.tenant_id !== barangay_id))) {
        const { data: actualBarangay, error: actualBarangayError } = await supabaseAdmin
          .from('barangay')
          .select('name')
          .eq('id', eu.tenant_id)
          .maybeSingle();
        if (actualBarangayError) {
          sendError(res, 'Failed to identify the existing user barangay: ' + actualBarangayError.message, 500);
          return;
        }
        actualBarangayName = actualBarangay?.name || null;
      }
      if (eu.role_id === 2) {
        const existingBarangayName = actualBarangayName || 'another barangay';
        sendError(
          res,
          `This email is already assigned as SK Chairperson in ${existingBarangayName}. Use Transfer Leadership instead of re-inviting.`,
          409,
          { code: 'EMAIL_ALREADY_CHAIRPERSON', actual_barangay_name: actualBarangayName }
        );
        return;
      }
      if (eu.role_id === 3) {
        const euRoleRaw = String(eu.official_role || '').toLowerCase();
        const euRole = euRoleRaw.includes('secretary') ? 'SK Secretary'
          : euRoleRaw.includes('treasurer') ? 'SK Treasurer'
          : 'SK Kagawad';
        if (eu.tenant_id === barangay_id && !isPendingSetupReinvite) {
          sendError(
            res,
            'This email is already assigned as ' + euRole + ' in ' + barangay.name + '. Each email can only hold one SK Official role. To change their role, use a different email address.',
            409,
            { code: 'EMAIL_ALREADY_OFFICIAL_SAME_TENANT', current_role: euRole }
          );
          return;
        } else if (eu.tenant_id !== barangay_id) {
          const existingBarangayName = actualBarangayName || 'another barangay';
          sendError(
            res,
            `This email is already registered as ${euRole} in ${existingBarangayName}. Each email can only hold one SK Official role. To change their role, use a different email address.`,
            409,
            { code: 'EMAIL_ALREADY_OFFICIAL_OTHER_TENANT', current_role: euRole, actual_barangay_name: actualBarangayName }
          );
          return;
        }
      }
    }


    if (existingUser) {
      targetUserId = existingUser.id;
      if (!existingAuthUser) {
        const { data: inviteData, error: inviteErr } = await inviteWithBrevo(cleanEmail, {
          data: { tenant_id: barangay_id, role_id: 3, official_role, full_name: officialAuthFullName },
          redirectTo: redirectUrl,
        } as any);
        const emailDeliveryFailed = inviteErr instanceof Error && inviteErr.message.includes('Brevo email delivery failed');
        if (inviteData?.user && inviteData?.properties?.action_link && (!inviteErr || emailDeliveryFailed)) {
          targetUserId = inviteData.user.id;
          actionLink = inviteData.properties.action_link;
          invitationLinkType = inviteData.link_type || 'invite';
          if (emailDeliveryFailed) {
            inviteMethod = 'setup_link_only';
            invitationDeliveryError = inviteErr;
          } else {
            inviteMethod = 'email_invitation';
          }
        } else if (inviteErr && inviteData?.properties?.action_link) {
          const linkType = inviteData.link_type || 'invite';
          sendError(
            res,
            `Supabase link type '${linkType}' generated a link, but SK Official setup initialization failed: ${inviteErr.message}`,
            502,
            { link_type: linkType, action_link: inviteData.properties.action_link }
          );
          return;
        } else {
          const tempPassword = 'Kb' + Math.random().toString(36).slice(-6) + 'A!1';
          const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: cleanEmail,
            password: tempPassword,
            email_confirm: true,
            app_metadata: { setup_completed: false },
            user_metadata: { tenant_id: barangay_id, role_id: 3, official_role, full_name: officialAuthFullName, setup_completed: false },
            redirectTo: redirectUrl,
          } as any);
          if (createErr || !createData?.user) { sendError(res, createErr?.message || 'Failed to initialize SK Official account.', 500); return; }
          targetUserId = createData.user.id;
          inviteMethod = 'temp_credentials';
        }
        const resolvedA = resolveName({
          payload: { first_name, middle_name, last_name, suffix },
          existing: {
            first_name: (existingUser as any).first_name,
            middle_name: (existingUser as any).middle_name,
            last_name: (existingUser as any).last_name,
            suffix: (existingUser as any).suffix,
            full_name: existingUser.full_name,
          },
          placeholders: ['Pending Invitation'],
          fallback: { first_name: 'SK', last_name: 'Official' },
        });
        const { error: rebindErr } = await supabaseAdmin.from('users').update({
          id: targetUserId,
          tenant_id: barangay_id,
          role_id: 3,
          full_name: resolvedA.full_name,
          first_name: resolvedA.first_name || null,
          middle_name: resolvedA.middle_name || null,
          last_name: resolvedA.last_name || null,
          suffix: resolvedA.suffix || null,
          email: cleanEmail,
          status: 'active',
          approved_by: admin.id,
          updated_at: new Date().toISOString(),
        }).eq('email', cleanEmail);
        if (rebindErr) { sendError(res, 'Failed to rebind SK Official record: ' + rebindErr.message, 500); return; }
      } else {
        inviteMethod = 'existing_auth_user';
        const _preserveOff = resolveName({
          payload: { first_name, middle_name, last_name, suffix },
          existing: {
            first_name: (existingUser as any).first_name,
            middle_name: (existingUser as any).middle_name,
            last_name: (existingUser as any).last_name,
            suffix: (existingUser as any).suffix,
            full_name: existingUser.full_name,
          },
          placeholders: ['Pending Invitation'],
          fallback: { first_name: 'SK', last_name: 'Official' },
        });
        const { error: updateErr } = await supabaseAdmin.from('users').update({
          tenant_id: barangay_id,
          role_id: 3,
          status: 'active',
          approved_by: admin.id,
          updated_at: new Date().toISOString(),
          full_name: _preserveOff.full_name || existingUser.full_name || 'Pending Invitation',
          first_name: _preserveOff.first_name || null,
          middle_name: _preserveOff.middle_name || null,
          last_name: _preserveOff.last_name || null,
          suffix: _preserveOff.suffix || null,
        }).eq('id', existingUser.id);
        if (updateErr) { sendError(res, 'Failed to update user record: ' + updateErr.message, 500); return; }
      }
    } else if (existingAuthUser) {
      targetUserId = existingAuthUser.id;
      inviteMethod = 'existing_auth_user';
        const resolvedC = resolveName({
          payload: { first_name, middle_name, last_name, suffix },
          existing: {
            full_name: existingAuthUser.user_metadata?.full_name,
          },
          placeholders: ['Pending Invitation'],
          fallback: { first_name: 'SK', last_name: 'Official' },
        });
        const { error: insertUserErr } = await supabaseAdmin.from('users').upsert({
          id: targetUserId,
          tenant_id: barangay_id,
          role_id: 3,
          full_name: resolvedC.full_name,
          first_name: resolvedC.first_name || null,
          middle_name: resolvedC.middle_name || null,
          last_name: resolvedC.last_name || null,
          suffix: resolvedC.suffix || null,
          email: cleanEmail,
          phone: null,
          status: 'active',
          approved_by: admin.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      if (insertUserErr) { sendError(res, 'Failed to bind existing auth user: ' + insertUserErr.message, 500); return; }
    } else {
      const { data: inviteData, error: inviteErr } = await inviteWithBrevo(cleanEmail, {
        data: { tenant_id: barangay_id, role_id: 3, official_role, full_name: officialAuthFullName },
        redirectTo: redirectUrl,
      } as any);
      const emailDeliveryFailed = inviteErr instanceof Error && inviteErr.message.includes('Brevo email delivery failed');
      if (inviteData?.user && inviteData?.properties?.action_link && (!inviteErr || emailDeliveryFailed)) {
        targetUserId = inviteData.user.id;
        actionLink = inviteData.properties.action_link;
        invitationLinkType = inviteData.link_type || 'invite';
        if (emailDeliveryFailed) {
          inviteMethod = 'setup_link_only';
          invitationDeliveryError = inviteErr;
        } else {
          inviteMethod = 'email_invitation';
        }
      } else if (inviteErr && inviteData?.properties?.action_link) {
        const linkType = inviteData.link_type || 'invite';
        sendError(
          res,
          `Supabase link type '${linkType}' generated a link, but SK Official setup initialization failed: ${inviteErr.message}`,
          502,
          { link_type: linkType, action_link: inviteData.properties.action_link }
        );
        return;
      } else {
        const tempPassword = 'Kb' + Math.random().toString(36).slice(-6) + 'A!1';
        const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: tempPassword,
          email_confirm: true,
          app_metadata: { setup_completed: false },
          user_metadata: { tenant_id: barangay_id, role_id: 3, official_role, full_name: officialAuthFullName, setup_completed: false },
          redirectTo: redirectUrl,
        } as any);
        if (createErr || !createData?.user) { sendError(res, createErr?.message || 'Failed to initialize SK Official account.', 500); return; }
        targetUserId = createData.user.id;
        inviteMethod = 'temp_credentials';
      }
      const resolvedD = resolveName({
        payload: { first_name, middle_name, last_name, suffix },
        placeholders: ['Pending Invitation'],
        fallback: { first_name: 'SK', last_name: 'Official' },
      });
      const { error: insertUserErr } = await supabaseAdmin.from('users').upsert({
        id: targetUserId,
        tenant_id: barangay_id,
        role_id: 3,
        full_name: resolvedD.full_name,
        first_name: resolvedD.first_name || null,
        middle_name: resolvedD.middle_name || null,
        last_name: resolvedD.last_name || null,
        suffix: resolvedD.suffix || null,
        email: cleanEmail,
        phone: null,
        status: 'active',
        approved_by: admin.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      if (insertUserErr) { sendError(res, 'Failed to pre-set SK Official record: ' + insertUserErr.message, 500); return; }
    }

    const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
    if (authUserError || !authUserData.user) {
      sendError(res, 'Failed to load invited SK Official auth account: ' + (authUserError?.message || 'User not found.'), 500);
      return;
    }

    const { error: metadataUpdateError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      user_metadata: {
        ...(authUserData.user.user_metadata || {}),
        tenant_id: barangay_id,
        role_id: 3,
        role: 'SK Official',
        official_role,
        setup_completed: false,
      },
      app_metadata: {
        ...(authUserData.user.app_metadata || {}),
        setup_completed: false,
      },
    });
    if (metadataUpdateError) {
      sendError(res, 'Failed to save SK Official setup metadata: ' + metadataUpdateError.message, 500);
      return;
    }

    const { error: officialSetupStateError } = await supabaseAdmin
      .from('users')
      .update({ official_role, setup_completed: false })
      .eq('id', targetUserId);
    if (officialSetupStateError) {
      sendError(res, 'Failed to save SK Official setup state: ' + officialSetupStateError.message, 500);
      return;
    }

    let actionLinkError: unknown;
    if (!actionLink) {
      console.info('[INVITATION LINK] type=magiclink result=attempt');
      try {
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: cleanEmail,
          options: { redirectTo: redirectUrl, expiresIn: 18000 } as any,
        });
        if (linkError) throw linkError;
        actionLink = linkData?.properties?.action_link || '';
        if (actionLink) {
          invitationLinkType = 'magiclink';
          console.info('[INVITATION LINK] type=magiclink result=success');
        } else {
          actionLinkError = new Error('Supabase did not return an action link.');
          console.error(`[INVITATION LINK] type=magiclink result=error reason=${getInvitationErrorMessage(actionLinkError)}`);
        }
      } catch (linkErr) {
        actionLinkError = linkErr;
        console.error(`[INVITATION LINK] type=magiclink result=error reason=${getInvitationErrorMessage(linkErr)}`);
      }
    }

    if (inviteMethod === 'existing_auth_user') {
      if (!actionLink) {
        const errorMessage = actionLinkError
          ? getInvitationErrorMessage(actionLinkError)
          : 'Supabase did not return a setup link.';
        sendError(res, `Supabase link type 'magiclink' failed: ${errorMessage}`, 502, { link_type: 'magiclink' });
        return;
      }
      try {
        await sendInvitationEmail(cleanEmail, official_role, actionLink);
        inviteMethod = 'email_invitation';
      } catch (emailError) {
        const errorMessage = getInvitationErrorMessage(emailError);
        sendError(
          res,
          `Supabase link type '${invitationLinkType || 'magiclink'}' generated a setup link, but Brevo email delivery failed: ${errorMessage}`,
          502,
          { link_type: invitationLinkType || 'magiclink', action_link: actionLink, setup_url: redirectUrl }
        );
        return;
      }
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
        setup_url: '',
      },
      ipAddress: req.ip || null,
    });

    const emailDelivered = inviteMethod === 'email_invitation';
    const composedRespName = [first_name, middle_name, last_name, suffix].filter(Boolean).join(' ') || cleanEmail;
    const responseMessage = invitationDeliveryError
      ? `${official_role} invitation prepared for ${composedRespName} (${cleanEmail}) for Barangay ${barangay.name}, but email delivery failed: ${getInvitationErrorMessage(invitationDeliveryError)}. Manually deliver the setup link below.`
      : official_role + ' invitation sent to ' + composedRespName + ' (' + cleanEmail + ') for Barangay ' + barangay.name + '. Please check the inbox (and spam folder) for the setup email. If it has not arrived within a few minutes, retry the invitation.';

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
      link_type: invitationLinkType || 'magiclink',
      setup_url: actionLink || redirectUrl,
      action_link: actionLink,
    }, responseMessage);
  }
);
// P12b: Restriction review — Super Admin only
const ClearRestrictionSchema = z.object({
  admin_notes: z.string().max(1000).optional(),
});

// GET /api/admin/restrictions - list all (or active-only) restrictions
router.get(
  '/restrictions',
  authenticateUser,
  requireRoles('SUPER_ADMIN', 'BARANGAY_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const { active_only } = req.query;

    const authUser = (req as any).user;
    let q = supabaseAdmin
      .from('account_restrictions')
      .select('id, user_id, tenant_id, restriction_type, reason, detection_details, admin_id, admin_notes, expires_at, is_active, review_history, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (authUser && authUser.role_id === 2) q = q.eq('tenant_id', authUser.tenant_id);
    if (active_only === 'true') q = q.eq('is_active', true);

    const { data: rows, error } = await q;
    if (error) { sendError(res, 'Failed to retrieve restrictions: ' + error.message, 500); return; }

    const userIds = Array.from(new Set((rows || []).map((r: any) => r.user_id)));
    const userMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, status, tenant_id, roles(role_name), barangay(name)')
        .in('id', userIds);
      (users || []).forEach((u: any) => { userMap[u.id] = u; });
    }

    const merged = (rows || []).map((r: any) => ({
      ...r,
      users: userMap[r.user_id] || null,
    }));

    sendSuccess(res, merged, 'Restrictions retrieved.');
  }
);


// PATCH /api/admin/restrictions/:id/clear - clear restriction and reactivate account
router.patch(
  '/restrictions/:id/clear',
  authenticateUser,
  requireRoles('SUPER_ADMIN', 'BARANGAY_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const restrictionId = String(req.params.id || '');
    if (!restrictionId) { sendError(res, 'Restriction ID is required.', 400); return; }

    const parseResult = ClearRestrictionSchema.safeParse(req.body || {});
    if (!parseResult.success) {
      sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
      return;
    }

    const authReq = req as AuthRequest;
    const admin = authReq.user;
    if (!admin) { sendError(res, 'Authentication required.', 401); return; }

    let rQuery = supabaseAdmin
      .from('account_restrictions')
      .select('id, user_id, tenant_id, restriction_type, review_history')
      .eq('id', restrictionId);
    if (admin.role_id === 2) rQuery = rQuery.eq('tenant_id', admin.tenant_id);
    const { data: restriction, error: rErr } = await rQuery
      .single();

    if (rErr || !restriction) { sendError(res, 'Restriction not found.', 404); return; }

    const history = Array.isArray(restriction.review_history) ? restriction.review_history : [];
    const newEntry = {
      at: new Date().toISOString(),
      action: 'cleared',
      by: admin.full_name || 'Super Admin',
      admin_id: admin.id,
      notes: parseResult.data.admin_notes || null,
    };

    const { error: updErr } = await supabaseAdmin
      .from('account_restrictions')
      .update({
        is_active: false,
        admin_id: admin.id,
        admin_notes: parseResult.data.admin_notes || null,
        review_history: [...history, newEntry],
        updated_at: new Date().toISOString(),
      })
      .eq('id', restrictionId);

    if (updErr) { sendError(res, 'Failed to clear restriction: ' + updErr.message, 500); return; }

    const { error: userErr } = await supabaseAdmin
      .from('users')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', restriction.user_id);

    if (userErr) { sendError(res, 'Restriction cleared but failed to reactivate account: ' + userErr.message, 500); return; }

    await recordAuditLog({
      tenantId: restriction.tenant_id,
      userId: admin.id,
      action: 'RESTRICTION_CLEARED',
      entityName: 'account_restrictions',
      entityId: restrictionId,
      details: {
        cleared_user: restriction.user_id,
        original_type: restriction.restriction_type,
        notes: parseResult.data.admin_notes || null,
      },
      ipAddress: req.ip || null,
    });

    sendSuccess(
      res,
      { restriction_id: restrictionId, user_id: restriction.user_id, status: 'active' },
      'Restriction cleared and account reactivated.'
    );
  }
);
// ============================================================
// Panel rec #9: Transfer Leadership (Chairperson handover)
// ============================================================
const TransferChairmanshipSchema = z.object({
  barangay_id: z.string().uuid('Valid Barangay ID is required'),
  successor_email: z.string().email('Valid successor email is required').optional().nullable(),
  reason: z.enum(['Resignation', 'Resigned', 'Resign', 'End of Term', 'Replaced', 'Succession', 'Other']).default('Other').transform(v => (v === 'Resigned' || v === 'Resign') ? 'Resignation' : v),
  notes: z.string().max(1000).optional().nullable(),
});

router.post(
  '/transfer-chairmanship',
  authenticateUser,
  requireRoles('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parseResult = TransferChairmanshipSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
      return;
    }
    const { barangay_id, successor_email, reason, notes } = parseResult.data;
    const cleanSuccessorEmail = successor_email ? successor_email.trim().toLowerCase() : null;
    const admin = (req as AuthRequest).user!;

    // 1. Verify barangay
    const { data: barangay, error: bgyError } = await supabaseAdmin
      .from('barangay')
      .select('id, name, district')
      .eq('id', barangay_id)
      .single();

    if (bgyError || !barangay) {
      sendError(res, 'Target Barangay does not exist.', 404);
      return;
    }

    // 2. Find current active Chairperson
    const { data: outgoing } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, first_name, middle_name, last_name, suffix, status, role_id')
      .eq('tenant_id', barangay_id)
      .eq('role_id', 2)
      .eq('status', 'active')
      .maybeSingle();

    if (!outgoing) {
      sendError(res, `Barangay ${barangay.name} has no active Chairperson. Use Assign Chairperson instead.`, 409, { code: 'NO_CURRENT_CHAIRPERSON' });
      return;
    }

    if (outgoing.email && outgoing.email.toLowerCase() === cleanSuccessorEmail) {
      sendError(res, 'Successor cannot be the same person as the current Chairperson.', 409, { code: 'SAME_AS_CURRENT' });
      return;
    }

    // 3. Find or create successor
    let successorUserId: string | null = null;
    let successorInviteMethod: 'existing_user' | 'email_invitation' | 'temp_credentials' | 'setup_link_only' | 'resignation' = 'resignation';
    let successorLink = '';
    let successorLinkType: InvitationLinkType | null = null;
    let successorInviteError: unknown = null;
    let successor: any = null;
    let successorNeedsPublicRecord = false;
    const redirectUrl = FRONTEND_URL + '/chairperson-setup?invite_email=' + encodeURIComponent(cleanSuccessorEmail || '') + '&role=chairperson&tenant_id=' + barangay_id;

    if (cleanSuccessorEmail) {
      const { data: successorData } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, first_name, middle_name, last_name, suffix, status, role_id, tenant_id')
        .ilike('email', cleanSuccessorEmail)
        .maybeSingle();

      successor = successorData;
      successorInviteMethod = 'existing_user';

      if (successor) {
        // Defer role changes until the transfer record is safely written.
        successorUserId = successor.id;
        successorLink = redirectUrl;
      } else {
        successorNeedsPublicRecord = true;
        const { data: inviteData, error: inviteErr } = await inviteWithBrevo(
          cleanSuccessorEmail,
          {
            data: { tenant_id: barangay_id, role_id: 2 },
            redirectTo: redirectUrl,
          } as any
        );

        const emailDeliveryFailed = inviteErr instanceof Error && inviteErr.message.includes('Brevo email delivery failed');
        if (inviteData?.user && inviteData?.properties?.action_link && (!inviteErr || emailDeliveryFailed)) {
          successorUserId = inviteData.user.id;
          successorLink = inviteData.properties.action_link;
          successorLinkType = inviteData.link_type || 'invite';
          if (emailDeliveryFailed) {
            successorInviteMethod = 'setup_link_only';
            successorInviteError = inviteErr;
          } else {
            successorInviteMethod = 'email_invitation';
          }
        } else if (inviteErr && inviteData?.properties?.action_link) {
          const linkType = inviteData.link_type || 'invite';
          sendError(
            res,
            `Supabase link type '${linkType}' generated a link, but successor setup initialization failed: ${inviteErr.message}`,
            502,
            { link_type: linkType, action_link: inviteData.properties.action_link }
          );
          return;
        } else {
          const tempPassword = 'Kb' + Math.random().toString(36).slice(-6) + 'A!1';
          const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: cleanSuccessorEmail,
            password: tempPassword,
            email_confirm: true,
            app_metadata: { setup_completed: false },
            user_metadata: { tenant_id: barangay_id, role_id: 2, setup_completed: false },
            redirectTo: redirectUrl,
          } as any);

          if (createErr || !createData?.user) {
            sendError(res, 'Failed to initialize successor account: ' + (createErr?.message || 'unknown'), 500);
            return;
          }
          successorUserId = createData.user.id;
          successorInviteMethod = 'temp_credentials';
        }

        if (!successorLink) {
          console.info('[INVITATION LINK] type=magiclink result=attempt');
          try {
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
              type: 'magiclink',
              email: cleanSuccessorEmail,
              options: { redirectTo: redirectUrl, expiresIn: 18000 } as any,
            });
            if (linkError) throw linkError;
            if (linkData?.properties?.action_link) {
              successorLink = linkData.properties.action_link;
              successorLinkType = 'magiclink';
              console.info('[INVITATION LINK] type=magiclink result=success');
            } else {
              console.error('[INVITATION LINK] type=magiclink result=error reason=Supabase did not return an action link.');
            }
          } catch (linkErr) {
            console.error(`[INVITATION LINK] type=magiclink result=error reason=${getInvitationErrorMessage(linkErr)}`);
          }
        }
        if (!successorLink) successorLink = redirectUrl;
      }
    }

    // The database function commits the public user changes and transfer record atomically.
    const { error: transferError } = await supabaseAdmin.rpc('transfer_chairperson', {
      p_barangay_id: barangay_id,
      p_outgoing_user_id: outgoing.id,
      p_successor_user_id: successorUserId,
      p_successor_email: cleanSuccessorEmail,
      p_successor_full_name: successor?.full_name || 'Pending Invitation',
      p_create_successor_record: successorNeedsPublicRecord,
      p_admin_id: admin.id,
      p_admin_email: admin.email || null,
      p_reason: reason,
      p_notes: notes || null,
    });

    if (transferError) {
      sendError(res, 'Failed to complete chairperson transfer: ' + transferError.message, 500);
      return;
    }

    // 5. Audit log
    await recordAuditLog({
      tenantId: barangay_id,
      userId: admin.id,
      action: 'TRANSFER_CHAIRMANSHIP',
      entityName: 'users',
      entityId: successorUserId,
      details: {
        outgoing_email: outgoing.email,
        outgoing_name: outgoing.full_name,
        incoming_email: cleanSuccessorEmail,
        reason,
        notes: 'Succession Notes: ' + (notes || 'None') + '. Reason: ' + reason,
        invitation_method: successorInviteMethod,
      },
      ipAddress: req.ip || null,
    });

    // 7. Response
    let emailDelivered = successorInviteMethod === 'email_invitation';
    console.log('[TRANSFER] Preparing to send emails...');
    try {
      const outgoingEmail = outgoing.email;
      const successorEmail = cleanSuccessorEmail;
      
      if (outgoingEmail) {
        console.log('[TRANSFER] Sending demotion email to outgoing: ' + outgoingEmail);
        const outgoingHtml = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;"><h1 style="color: #091d64; margin: 0 0 8px 0;">KABISIG</h1><p style="color: #64748b; font-size: 12px; margin: 0 0 24px 0;">Kabataang Bagong Sistema para sa Inklusibong Gobyerno</p><h2 style="color: #091d64;">Leadership Update</h2><p style="color: #334155; line-height: 1.6;">Your role as SK Chairperson has been successfully transferred.</p><p style="color: #334155; line-height: 1.6;">You have been demoted to <strong>Youth Constituent</strong> and your profile verification is pending re-approval by the incoming Chairperson.</p><div style="text-align: center; margin: 24px 0;"><a href="' + FRONTEND_URL + '" style="background-color: #091d64; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Log In to KABISIG</a></div><p style="color: #94a3b8; font-size: 11px;">If the button does not work, copy this link: ' + FRONTEND_URL + '</p></div>';
        await sendEmail(outgoingEmail, 'KABISIG Leadership Update', outgoingHtml);
      }
      
      if (successorEmail) {
        console.log('[TRANSFER] Sending appointment email to successor: ' + successorEmail);
        const successHtml = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;"><h1 style="color: #091d64; margin: 0 0 8px 0;">KABISIG</h1><p style="color: #64748b; font-size: 12px; margin: 0 0 24px 0;">Kabataang Bagong Sistema para sa Inklusibong Gobyerno</p><h2 style="color: #091d64;">You are Invited to be SK Chairperson!</h2><p style="color: #334155; line-height: 1.6;">You have been appointed as the new SK Chairperson. Please click the button below to set up your account password and complete your profile.</p><div style="text-align: center; margin: 24px 0;"><a href="' + successorLink + '" style="background-color: #091d64; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Set Up Account</a></div><p style="color: #94a3b8; font-size: 11px;">If the button does not work, copy this link: ' + successorLink + '</p></div>';
        await sendEmail(successorEmail, 'KABISIG Chairmanship Appointment', successHtml);
        emailDelivered = true;
        if (successorInviteMethod === 'setup_link_only') {
          successorInviteMethod = 'email_invitation';
          successorInviteError = null;
        }
      }
    } catch (emailErr) {
      console.error('[TRANSFER] Email dispatch failed:', emailErr);
    }

    sendSuccess(res, {
      barangay_id,
      barangay_name: barangay.name,
      outgoing: {
        role_id: 4,
        status: 'pending',
        id: outgoing.id,
        email: outgoing.email,
        full_name: outgoing.full_name,
        new_role: 'Youth Constituent',
      },
      incoming: {
        id: successorUserId,
        email: cleanSuccessorEmail,
        full_name: successor?.full_name || 'Pending Invitation',
        role_id: 2,
        status: 'active',
        new_role: 'Barangay Admin',
      },
      link_type: successorLinkType || undefined,
      setup_url: successorLink,
      action_link: successorLink,
      invitation_method: successorInviteMethod,
      email_delivery: emailDelivered,
    }, 'Leadership transferred at Barangay ' + barangay.name + '. ' + (outgoing.full_name || outgoing.email) + ' demoted to Youth Constituent (pending re-approval); ' + cleanSuccessorEmail + ' is now Chairperson.' + (successorInviteError ? ' The invitation email failed: ' + getInvitationErrorMessage(successorInviteError) + '. Manually deliver the setup link from the response.' : ''));
  }
);
// ============================================================
// Cancel a pending Chairperson invitation (Super Admin)
// ============================================================
const CancelChairpersonInvitationSchema = z.object({
  barangay_id: z.string().uuid('Valid Barangay ID is required'),
});

router.post(
  '/cancel-chairperson-invitation',
  authenticateUser,
  requireRoles('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parseResult = CancelChairpersonInvitationSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
      return;
    }
    const { barangay_id } = parseResult.data;
    const admin = (req as AuthRequest).user!;

    const { data: barangay } = await supabaseAdmin
      .from('barangay')
      .select('id, name')
      .eq('id', barangay_id)
      .single();

    if (!barangay) {
      sendError(res, 'Barangay not found.', 404);
      return;
    }

    const { data: pendingChair } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, first_name, last_name, role_id, status, setup_completed')
      .eq('tenant_id', barangay_id)
      .eq('role_id', 2)
      .in('status', ['active', 'pending'])
      .maybeSingle();

    if (!pendingChair) {
      sendError(res, 'No pending Chairperson invitation to cancel.', 404);
      return;
    }

    const isFullyOnboarded =
      pendingChair.setup_completed === true
      || pendingChair.status === 'active';
    if (isFullyOnboarded) {
      sendError(res, 'This official has already completed onboarding. Please use Transfer Leadership instead.', 400);
      return;
    }

    const isPendingInvite =
      pendingChair.status === 'pending'
      || pendingChair.setup_completed === false
      || pendingChair.full_name === 'Pending Invitation'
      || (!pendingChair.first_name && !pendingChair.last_name);

    if (!isPendingInvite) {
      sendError(
        res,
        'This Chairperson has completed onboarding and cannot be cancelled. Use Transfer Leadership instead.',
        409,
        { code: 'CHAIRPERSON_ALREADY_REGISTERED' }
      );
      return;
    }

    // Cancel any chairperson_transfers records referencing this pending user
    // Prevents FK constraint violation: chairperson_transfers_incoming_user_id_fkey
    const { error: transferCleanupErr } = await supabaseAdmin
      .from('chairperson_transfers')
      .delete()
      .or(`incoming_user_id.eq.${pendingChair.id},outgoing_user_id.eq.${pendingChair.id}`);

    if (transferCleanupErr) {
      sendError(res, 'Failed to clean up chairperson transfer records: ' + transferCleanupErr.message, 500);
      return;
    }

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(pendingChair.id);
    if (authDeleteError) {
      sendError(res, 'Failed to remove Chairperson authentication account: ' + authDeleteError.message, 500);
      return;
    }

    const { error: delErr } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', pendingChair.id);

    if (delErr) {
      sendError(res, 'Failed to remove invitation record: ' + delErr.message, 500);
      return;
    }

    await recordAuditLog({
      tenantId: barangay_id,
      userId: admin.id,
      action: 'CANCEL_CHAIRPERSON_INVITATION',
      entityName: 'users',
      entityId: pendingChair.id,
      details: {
        cancelled_email: pendingChair.email,
        barangay_name: barangay.name,
        cancelled_by: admin.full_name,
      },
      ipAddress: req.ip || null,
    });

    sendSuccess(res, {
      barangay_id,
      barangay_name: barangay.name,
      cancelled_email: pendingChair.email,
    }, `Chairperson invitation for ${pendingChair.email} cancelled. Barangay ${barangay.name} is now open for a new assignment.`);
  }
);

const CancelSkOfficialInvitationSchema = z.object({
  user_id: z.string().uuid('Valid user ID is required'),
});

router.post(
  '/cancel-sk-official-invitation',
  authenticateUser,
  requireRoles('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parseResult = CancelSkOfficialInvitationSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
      return;
    }

    const { user_id } = parseResult.data;
    const admin = (req as AuthRequest).user!;
    const { data: official, error: officialError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role_id, email')
      .eq('id', user_id)
      .maybeSingle();

    if (officialError) {
      sendError(res, `Failed to verify SK Official invitation: ${officialError.message}`, 500);
      return;
    }
    if (!official || Number(official.role_id) !== 3 || !official.tenant_id) {
      sendError(res, 'SK Official invitation not found.', 404);
      return;
    }

    const { data: authData, error: authLookupError } = await supabaseAdmin.auth.admin.getUserById(user_id);
    if (authLookupError || !authData.user) {
      sendError(res, `Failed to verify invitation setup status: ${authLookupError?.message || 'Auth user not found.'}`, 500);
      return;
    }
    if (
      authData.user.user_metadata?.setup_completed !== false
      || authData.user.app_metadata?.setup_completed !== false
    ) {
      sendError(res, 'This SK Official has completed setup and cannot be cancelled as a pending invitation.', 409);
      return;
    }

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (authDeleteError) {
      sendError(res, `Failed to delete invited Auth user: ${authDeleteError.message}`, 500);
      return;
    }

    const { error: userDeleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', user_id);
    if (userDeleteError) {
      sendError(res, `Failed to remove SK Official invitation record: ${userDeleteError.message}`, 500);
      return;
    }

    await recordAuditLog({
      tenantId: official.tenant_id,
      userId: admin.id,
      action: 'CANCEL_SK_OFFICIAL_INVITATION',
      entityName: 'users',
      entityId: user_id,
      details: { cancelled_email: official.email },
      ipAddress: req.ip || null,
    });

    sendSuccess(res, { user_id, cancelled_email: official.email }, 'SK Official invitation cancelled.');
  }
);

// PATCH /api/admin/users/:id/email - SA manually updates a user's email
router.patch('/users/:id/email', authenticateUser, requireRoles('SUPER_ADMIN'), async (req: Request, res: Response): Promise<void> => {
  const userId = String(req.params.id || '');
  const { email } = req.body;
  if (!email || !email.includes('@')) { sendError(res, 'Valid email required', 400); return; }
  const cleanEmail = email.trim().toLowerCase();
  const admin = (req as AuthRequest).user!;

  const { data: existing } = await supabaseAdmin.from('users').select('id').eq('email', cleanEmail).maybeSingle();
  if (existing && existing.id !== userId) { sendError(res, 'Email already in use by another account.', 409); return; }

  const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, { email: cleanEmail });
  if (authErr) { sendError(res, 'Failed to update Auth: ' + authErr.message, 500); return; }

  const { error: dbErr } = await supabaseAdmin.from('users').update({ email: cleanEmail }).eq('id', userId);
  if (dbErr) { sendError(res, 'Failed to update DB: ' + dbErr.message, 500); return; }

  await recordAuditLog({ tenantId: null, userId: admin.id, action: 'UPDATE_USER_EMAIL', entityName: 'users', entityId: userId, details: { new_email: cleanEmail }, ipAddress: req.ip || null });
  sendSuccess(res, { id: userId, email: cleanEmail }, 'Email updated successfully.');
});

// POST /api/users/request-email-change - Notifies Super Admin
// Self-service: the request is attributed to the authenticated user and accepts no target user ID.
router.post('/request-email-change', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const { new_email } = req.body;
  if (!new_email || !new_email.includes('@')) { sendError(res, 'Valid email required', 400); return; }
  const cleanEmail = new_email.trim().toLowerCase();
  const user = (req as AuthRequest).user!;

  const { data: sa } = await supabaseAdmin.from('users').select('id').eq('role_id', 1).limit(1).maybeSingle();
  if (!sa) { sendError(res, 'Super Admin not found.', 500); return; }

  await supabaseAdmin.from('notifications').insert({
    user_id: sa.id,
    tenant_id: user.tenant_id,
    title: 'Email Change Request',
    message: user.full_name + ' (' + user.email + ') requested to change email to ' + cleanEmail + '. Go to Admin Panel to update.',
    type: 'EMAIL_CHANGE_REQUEST',
    is_read: false
  });

  sendSuccess(res, null, 'Request sent to Super Admin.');
});

// GET /api/admin/chairperson-transfers/:barangayId
router.get(
  '/chairperson-transfers/:barangayId',
  authenticateUser,
  requireRoles('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const barangayId = String(req.params.barangayId);
    const { data, error } = await supabaseAdmin
      .from('chairperson_transfers')
      .select('*')
      .eq('barangay_id', barangayId)
      .order('created_at', { ascending: false });
    if (error) { sendError(res, error.message, 500); return; }
    sendSuccess(res, data || [], 'Transfer history retrieved.');
  }
);

export default router;

// POST /api/admin/update-user-email - Super Admin only
router.post(
  '/update-user-email',
  authenticateUser,
  requireRoles('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const { target_user_id, current_email, new_email, reason } = req.body;
    if ((!target_user_id && !current_email) || !new_email) {
      sendError(res, 'User ID (or Current Email) and new email are required.', 400);
      return;
    }

        // 1. Find the user explicitly to get their CURRENT email before we change it
    const query = supabaseAdmin.from('users').select('id, email, full_name');
    if (target_user_id) query.eq('id', target_user_id);
    else query.eq('email', current_email);

    const { data: foundUser, error: findErr } = await query.single();
    if (findErr || !foundUser) {
      sendError(res, 'User not found.', 404);
      return;
    }
    
    const userIdToUpdate = foundUser.id;
    const old_email = foundUser.email; // Guaranteed to be the real current email
      
      if (!old_email) {
        sendError(res, 'User does not have an existing email.', 400);
        return;
      }

      // 1. Update Supabase Auth (Login Credentials)
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userIdToUpdate, { email: new_email });
      if (authError) {
        sendError(res, 'Failed to update Auth email: ' + authError.message, 500);
        return;
      }

      // 2. Update Public Users Table
      const { error: dbError } = await supabaseAdmin.from('users').update({ email: new_email }).eq('id', userIdToUpdate);
      if (dbError) {
        sendError(res, 'Failed to update database email: ' + dbError.message, 500);
        return;
      }

      // 3. Send Security Notifications to OLD and NEW emails
      const htmlTemplate = (title: string, message: string, color: string) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #091d64; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">KABISIG</h1>
            <p style="color: #93c5fd; margin: 4px 0 0 0; font-size: 14px;">Kabataang Bagong Sistema para sa Inklusibong Gobyerno</p>
          </div>
          <div style="padding: 32px; background-color: #ffffff;">
            <h2 style="color: ${color}; margin-top: 0;">${title}</h2>
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">${message}</p>
            <p style="color: #334155; font-size: 14px; margin-top: 24px;"><strong>Reason for change:</strong> ${reason}</p>
          </div>
          <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; 2026 KABISIG. All rights reserved.</p>
          </div>
        </div>`;

      // Notify OLD email
      await sendEmail(
        old_email,
        'Security Alert: Your KABISIG Email Has Been Changed',
        htmlTemplate(
          'Email Changed',
          `Hello,<br><br>This is a security notification to inform you that the email address associated with your KABISIG account has been updated to <strong>${new_email}</strong>.<br><br>If you did not request this change, please contact your SK Federation President immediately.`,
          '#ef4444'
        )
      );

      // Notify NEW email
      await sendEmail(
        new_email,
        'Welcome to your new KABISIG Login',
        htmlTemplate(
          'Email Successfully Updated',
          `Hello,<br><br>Your KABISIG account email has been successfully updated to this address.<br><br>You can now use this email to log in to the system.`,
          '#10b981'
        )
      );

      // 4. Audit Log
      await recordAuditLog({
        userId: (req as AuthRequest).user!.id,
        action: 'UPDATE_USER_EMAIL',
        entityName: 'users',
        entityId: userIdToUpdate,
        details: { old_email, new_email, reason },
      });

      sendSuccess(res, null, 'User email updated successfully. Notifications sent.');
  }
);
// GET /api/admin/email-history - Super Admin only
router.get(
  '/email-history',
  authenticateUser,
  requireRoles('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('id, created_at, user_id, details, users(full_name, barangay(name))')
      .in('action', ['UPDATE_USER_EMAIL', 'UPDATE_USER_CREDENTIALS'])
      .order('created_at', { ascending: false });

    if (error) {
      sendError(res, 'Failed to load history: ' + error.message, 500);
      return;
    }
    // Enrich legacy records with actual user names based on email
    const enrichedData = await Promise.all((data || []).map(async (log: any) => {
      if (!log.details?.target_name) {
        const emailToFind = log.details?.old_email || log.details?.new_email;
        if (emailToFind) {
          const { data: user } = await supabaseAdmin.from('users').select('full_name').eq('email', emailToFind).single();
          if (user) {
            if (!log.details) log.details = {};
            log.details.target_name = user.full_name;
          }
        }
      }
      return log;
    }));

    sendSuccess(res, enrichedData, 'Email history retrieved.');
  }
);
