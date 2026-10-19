import express from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import { supabase, supabaseAdmin, recordAuditLog, canAccessTenant } from '../services/supabase.service.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { authenticateUser, requireRoles } from '../middleware/auth.js';
import type { AuthRequest } from '../types/database.types.js';

const router = express.Router();

// Role IDs matching public.roles table (int4)
const ROLE_IDS = {
  SUPER_ADMIN: 1,
  BARANGAY_ADMIN: 2,
  SK_OFFICIAL: 3,
  YOUTH_CONSTITUENT: 4,
  VIEWER: 5,
};

const CANONICAL_BARANGAY_REGISTRY: Record<string, { name: string; district: 'District 1' | 'District 2' }> = {
  'a0111111-1111-4000-8000-000000000001': { name: 'Bagumbayan Norte', district: 'District 1' },
  'a0111111-1111-4000-8000-000000000002': { name: 'Bagumbayan Sur', district: 'District 1' },
  'a0111111-1111-4000-8000-000000000003': { name: 'Calauag', district: 'District 1' },
  'a0111111-1111-4000-8000-000000000004': { name: 'Carolina', district: 'District 1' },
  'a0111111-1111-4000-8000-000000000005': { name: 'Dayangdang', district: 'District 1' },
  'a0111111-1111-4000-8000-000000000006': { name: 'Liboton', district: 'District 1' },
  'a0111111-1111-4000-8000-000000000007': { name: 'Pacol', district: 'District 1' },
  'a0111111-1111-4000-8000-000000000008': { name: 'Panicuason', district: 'District 1' },
  'a0111111-1111-4000-8000-000000000009': { name: 'Peñafrancia', district: 'District 1' },
  'a0111111-1111-4000-8000-000000000010': { name: 'San Felipe', district: 'District 1' },
  'a0111111-1111-4000-8000-000000000011': { name: 'Santa Cruz', district: 'District 1' },
  'b0222222-2222-4000-8000-000000000012': { name: 'Abella', district: 'District 2' },
  'b0222222-2222-4000-8000-000000000013': { name: 'Balatas', district: 'District 2' },
  'b0222222-2222-4000-8000-000000000014': { name: 'Cararayan', district: 'District 2' },
  'b0222222-2222-4000-8000-000000000015': { name: 'Concepcion Grande', district: 'District 2' },
  'b0222222-2222-4000-8000-000000000016': { name: 'Concepcion Pequeña', district: 'District 2' },
  'b0222222-2222-4000-8000-000000000017': { name: 'Del Rosario', district: 'District 2' },
  'b0222222-2222-4000-8000-000000000018': { name: 'Dinaga', district: 'District 2' },
  'b0222222-2222-4000-8000-000000000019': { name: 'Igualdad Interior', district: 'District 2' },
  'b0222222-2222-4000-8000-000000000020': { name: 'Lerma', district: 'District 2' },
  'b0222222-2222-4000-8000-000000000021': { name: 'Mabolo', district: 'District 2' },
  'b0222222-2222-4000-8000-000000000022': { name: 'Sabang', district: 'District 2' },
  'b0222222-2222-4000-8000-000000000023': { name: 'San Francisco', district: 'District 2' },
  'b0222222-2222-4000-8000-000000000024': { name: 'San Isidro', district: 'District 2' },
  'b0222222-2222-4000-8000-000000000025': { name: 'Tabuco', district: 'District 2' },
  'b0222222-2222-4000-8000-000000000026': { name: 'Tinago', district: 'District 2' },
  'b0222222-2222-4000-8000-000000000027': { name: 'Triangulo', district: 'District 2' },
};

async function ensureBarangayRecordExists(barangayId: string): Promise<{ id: string; name: string } | null> {
  const canonicalBarangay = CANONICAL_BARANGAY_REGISTRY[barangayId];

  if (!canonicalBarangay) {
    return null;
  }

  const { error } = await supabaseAdmin
    .from('barangay')
    .upsert(
      {
        id: barangayId,
        name: canonicalBarangay.name,
        city: 'Naga City',
        district: canonicalBarangay.district,
      },
      { onConflict: 'id' }
    );

  if (error) {
    console.error('Failed to restore canonical barangay registry entry:', error);
    return null;
  }

  return {
    id: barangayId,
    name: canonicalBarangay.name,
  };
}

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

const SecurePasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter (A-Z)')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter (a-z)')
  .regex(/[0-9]/, 'Password must contain at least one number (0-9)')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one symbol (!@#$%^&*...)');

const RegisterYouthSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: SecurePasswordSchema,
  full_name: z.string().min(2, 'Full name is required'),
  barangay_id: z.string().uuid('Valid Barangay ID is required'),
  phone: z.string().optional(),
  profile_pic: z.string().max(2_000_000).optional(),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Birthdate must be formatted as YYYY-MM-DD'),
  sex: z.enum(['Male', 'Female', 'Other', 'Prefer not to say']),
  address: z.string().min(3, 'Address is required'),
  educational_status: z
    .enum(['Elementary', 'High School', 'Vocational', 'College', 'Post-Graduate', 'Out of School Youth'])
    .optional(),
  employment_status: z.enum(['Employed', 'Unemployed', 'Self-Employed', 'Student']).optional(),
  school: z.string().max(200).optional(),
  course: z.string().max(200).optional(),
  year: z.string().max(50).optional(),
  is_registered_voter: z.boolean().default(false),
});

const ApproveUserSchema = z.object({
  user_id: z.string().uuid('Valid user ID is required'),
});

const RejectUserSchema = ApproveUserSchema.extend({
  reason: z.string().min(3, 'A rejection reason is required'),
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  redirectTo: z.string().url().optional(),
});

// POST /api/auth/register-youth
router.post('/register-youth', async (req: Request, res: Response): Promise<void> => {
  const parseResult = RegisterYouthSchema.safeParse(req.body);
  if (!parseResult.success) {
    sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
    return;
  }

  const {
    email,
    password,
    full_name,
    barangay_id,
    phone,
    profile_pic,
    birthdate,
    sex,
    address,
    educational_status,
    employment_status,
    school,
    course,
    year,
    is_registered_voter,
  } = parseResult.data;

  // 1. Age Verification (SK Reform Act: 15 to 30 years old)
  const calculatedAge = calculateAge(birthdate);
  if (calculatedAge < 15 || calculatedAge > 30) {
    sendError(
      res,
      `Registration rejected: In accordance with Republic Act No. 10742 (SK Reform Act), youth constituents must be between 15 and 30 years old. Your calculated age is ${calculatedAge}.`,
      422,
      { calculatedAge, requiredRange: '15-30' }
    );
    return;
  }

  // 2. Verify Barangay Existence
  let barangay = null as { id: string; name: string } | null;
  const { data: existingBarangay, error: bgyError } = await supabaseAdmin
    .from('barangay')
    .select('id, name')
    .eq('id', barangay_id)
    .maybeSingle();

  if (existingBarangay) {
    barangay = existingBarangay;
  } else {
    barangay = await ensureBarangayRecordExists(barangay_id);
  }

  if (!barangay) {
    sendError(res, 'Specified Barangay does not exist in Naga City registry.', 404);
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const { data: existingUser, error: existingUserError } = await supabaseAdmin
    .from('users')
    .select('id, status, role_id, tenant_id')
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (existingUserError) {
    console.error('Failed to check existing youth user record:', existingUserError);
    sendError(res, 'Unable to verify whether this email is already registered. Please try again.', 500);
    return;
  }

  if (existingUser) {
    const statusMessage = existingUser.status === 'pending'
      ? 'This email already has a pending registration. Please wait for approval or use the existing account.'
      : existingUser.status === 'rejected'
        ? 'This email has a rejected registration. Please contact the barangay administrator before registering again.'
        : 'This email is already registered. Please sign in or use a different email address.';
    sendError(res, statusMessage, 409, {
      code: 'EMAIL_ALREADY_REGISTERED',
      status: existingUser.status,
    });
    return;
  }

  // 3. Create Supabase Auth Account
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: { full_name, barangay_id, tenant_id: barangay_id },
    },
  });

  if (authError || !authData.user) {
    sendError(res, authError?.message || 'Failed to create auth account.', 400);
    return;
  }

  const userId = authData.user.id;

  // 4. Create Public User Record
  const { error: userError } = await supabaseAdmin.from('users').insert([
    {
      id: userId,
      tenant_id: barangay_id,
      role_id: ROLE_IDS.YOUTH_CONSTITUENT, // Integer ID (4)
      full_name,
      email: normalizedEmail,
      phone: phone || null,
      status: 'pending',
    },
  ]);

  if (userError) {
    console.error('Users Table Insert Error:', userError);
    // Rollback auth account if public insert fails
    await supabaseAdmin.auth.admin.deleteUser(userId);
    if (userError.code === '23505' && userError.message.includes('users_email_key')) {
      sendError(
        res,
        'This email is already registered. Please sign in or use a different email address.',
        409,
        { code: 'EMAIL_ALREADY_REGISTERED' }
      );
      return;
    }
    sendError(res, `Failed to initialize user record: ${userError.message}`, 500);
    return;
  }

  // 5. Create Resident Profile Record
  const { error: profileError } = await supabaseAdmin.from('resident_profile').insert([
    {
      user_id: userId,
      tenant_id: barangay_id,
      birthdate,
      sex,
      address,
      educational_status: educational_status || null,
      employment_status: employment_status || null,
      school: school || null,
      course: course || null,
      year_level: year || null,
      is_registered_voter,
      digital_youth_id: null,
      qr_code_url: null,
    },
  ]);

  if (profileError) {
    console.error('Resident Profile Table Insert Error:', profileError);
    // Rollback users table record and auth account if profile creation fails
    await supabaseAdmin.from('users').delete().eq('id', userId);
    await supabaseAdmin.auth.admin.deleteUser(userId);

    sendError(res, `Failed to create resident profile: ${profileError.message}`, 500, profileError);
    return;
  }

  // 6. Record System Audit Log
  await recordAuditLog({
    tenantId: barangay_id,
    userId,
    action: 'REGISTER_YOUTH',
    entityName: 'users',
    entityId: userId,
    details: { full_name, barangay: barangay.name, age: calculatedAge },
    ipAddress: req.ip || null,
  });

  sendCreated(
    res,
    {
      user_id: userId,
      email,
      full_name,
      barangay: barangay.name,
      status: 'pending',
      age: calculatedAge,
    },
    'Youth registration submitted successfully. Your profile is currently pending verification by your Barangay SK officials.'
  );
});

// POST /api/auth/approve-user
router.post(
  '/approve-user',
  authenticateUser,
  requireRoles('BARANGAY_ADMIN', 'SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parseResult = ApproveUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
      return;
    }

    const { user_id } = parseResult.data;
    const admin = (req as AuthRequest).user!;

    const { data: targetUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, tenant_id, status, barangay(name)')
      .eq('id', user_id)
      .single();

    if (fetchError || !targetUser) {
      sendError(res, 'Target user not found.', 404);
      return;
    }

    if (!canAccessTenant(admin, targetUser.tenant_id)) {
      sendError(res, 'Forbidden: You do not have permission to approve users outside your assigned Barangay.', 403);
      return;
    }

    if (targetUser.status === 'active') {
      sendError(res, 'User is already active.', 400);
      return;
    }

    const currentYear = new Date().getFullYear();
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const digitalYouthId = `KAB-NAGA-${currentYear}-${randomSuffix}`;

    const qrPayload = JSON.stringify({
      digital_youth_id: digitalYouthId,
      user_id: targetUser.id,
      tenant_id: targetUser.tenant_id,
      full_name: targetUser.full_name,
      issued_at: new Date().toISOString(),
    });

    let qrCodeDataUrl = '';
    try {
      qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300,
        color: {
          dark: '#1E3A8A',
          light: '#FFFFFF',
        },
      });
    } catch (qrErr: any) {
      sendError(res, 'Failed to generate QR code: ' + qrErr.message, 500);
      return;
    }

    const { error: updateUserError } = await supabaseAdmin
      .from('users')
      .update({
        status: 'active',
        approved_by: admin.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUser.id);

    if (updateUserError) {
      sendError(res, `Failed to activate user: ${updateUserError.message}`, 500);
      return;
    }

    const { error: updateProfileError } = await supabaseAdmin
      .from('resident_profile')
      .update({
        digital_youth_id: digitalYouthId,
        qr_code_url: qrCodeDataUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', targetUser.id);

    if (updateProfileError) {
      sendError(res, `Failed to assign Digital Youth ID: ${updateProfileError.message}`, 500);
      return;
    }

    await recordAuditLog({
      tenantId: targetUser.tenant_id,
      userId: admin.id,
      action: 'APPROVE_USER',
      entityName: 'users',
      entityId: targetUser.id,
      details: {
        target_email: targetUser.email,
        digital_youth_id: digitalYouthId,
        approved_by: admin.full_name,
      },
      ipAddress: req.ip || null,
    });

    sendSuccess(
      res,
      {
        user_id: targetUser.id,
        full_name: targetUser.full_name,
        status: 'active',
        digital_youth_id: digitalYouthId,
        qr_code_url: qrCodeDataUrl,
      },
      `User ${targetUser.full_name} has been approved and granted Digital Youth ID ${digitalYouthId}.`
    );
  }
);

// POST /api/auth/reject-user
router.post(
  '/reject-user',
  authenticateUser,
  requireRoles('BARANGAY_ADMIN', 'SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parseResult = RejectUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
      return;
    }

    const admin = (req as AuthRequest).user!;
    const { user_id, reason } = parseResult.data;
    const { data: targetUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, tenant_id, status')
      .eq('id', user_id)
      .single();

    if (fetchError || !targetUser) {
      sendError(res, 'Target user not found.', 404);
      return;
    }
    if (!canAccessTenant(admin, targetUser.tenant_id)) {
      sendError(res, 'Forbidden: You do not have permission to reject users outside your assigned Barangay.', 403);
      return;
    }
    if (targetUser.status === 'active') {
      sendError(res, 'Active users cannot be rejected.', 400);
      return;
    }

    const { data: rejectedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', targetUser.id)
      .select('id, full_name, email, tenant_id, status')
      .single();

    if (updateError || !rejectedUser) {
      sendError(res, `Failed to reject user: ${updateError?.message || 'No user was updated.'}`, 500);
      return;
    }

    await recordAuditLog({
      tenantId: targetUser.tenant_id,
      userId: admin.id,
      action: 'REJECT_USER',
      entityName: 'users',
      entityId: targetUser.id,
      details: { reason },
      ipAddress: req.ip || null,
    });

    sendSuccess(res, rejectedUser, 'User application rejected.');
  }
);
// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parseResult = LoginSchema.safeParse(req.body);
  if (!parseResult.success) {
    sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
    return;
  }

  const { email, password } = parseResult.data;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    sendError(res, error?.message || 'Invalid login credentials.', 401);
    return;
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('*, roles(role_name), barangay(name), resident_profile(*)')
    .eq('id', data.user.id)
    .single();

  const userMeta = data.user.user_metadata || {};
  const enrichedUser = {
    ...(profile || data.user),
    user_metadata: userMeta,
  };

  sendSuccess(
    res,
    {
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: enrichedUser,
    },
    'Login successful.'
  );
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const parseResult = ForgotPasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
    return;
  }

  const { email, redirectTo } = parseResult.data;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || ((process.env.FRONTEND_URL || 'http://localhost:3000') + '/reset-password'),
  });

  if (error) {
    sendError(res, error.message, 400);
    return;
  }

  sendSuccess(res, null, 'Password reset instructions sent to your email.');
});

// POST /api/auth/register-official
const RegisterOfficialSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: SecurePasswordSchema,
  full_name: z.string().min(2, 'Full name is required'),
  barangay_id: z.string().uuid('Valid Barangay ID is required'),
  role: z.string().default('SK_OFFICIAL'),
  phone: z.string().optional(),
});

router.post('/register-official', async (req: Request, res: Response): Promise<void> => {
  const parseResult = RegisterOfficialSchema.safeParse(req.body);
  if (!parseResult.success) {
    sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
    return;
  }

  const { email, password, full_name, barangay_id, role, phone } = parseResult.data;
  const normalizedEmail = email.trim().toLowerCase();

  // Enforce role boundary: Super Admin / Federation President cannot self-register
  const forbiddenRoles = ['SUPER_ADMIN', 'PRESIDENT', 'FEDERATION'];
  if (forbiddenRoles.some(r => role.toUpperCase().includes(r))) {
    sendError(res, 'SK Federation President (Super Admin) cannot self-register through public forms.', 403);
    return;
  }

  // 1. Verify Barangay Existence
  let barangay = null as { id: string; name: string } | null;
  const { data: existingBarangay, error: bgyError } = await supabaseAdmin
    .from('barangay')
    .select('id, name')
    .eq('id', barangay_id)
    .maybeSingle();

  if (existingBarangay) {
    barangay = existingBarangay;
  } else {
    barangay = await ensureBarangayRecordExists(barangay_id);
  }

  if (!barangay) {
    sendError(res, 'Specified Barangay does not exist in Naga City registry.', 404);
    return;
  }

  const isChairperson = role.toUpperCase().includes('CHAIRPERSON') || role.toUpperCase().includes('BARANGAY_ADMIN');
  const roleId = isChairperson ? ROLE_IDS.BARANGAY_ADMIN : ROLE_IDS.SK_OFFICIAL;
  // Chairpersons are activated immediately so they can log in; other SK officials are pending validation
  const status = isChairperson ? 'active' : 'pending';

  // --- Role capacity enforcement (RA 10742 SK council structure) ---
  // Per barangay: 1 Chairperson, 1 Secretary, 1 Treasurer, 7 Kagawad.
  const ROLE_LIMITS: Record<string, number> = {
    'SK Chairperson': 1,
    'SK Secretary': 1,
    'SK Treasurer': 1,
    'SK Kagawad': 7,
    'SK Official': 7,
  };
  const normalizeRoleKey = (r: string): string => {
    if (/chairperson|barangay_admin/i.test(r)) return 'SK Chairperson';
    if (/secretary/i.test(r)) return 'SK Secretary';
    if (/treasurer/i.test(r)) return 'SK Treasurer';
    if (/kagawad/i.test(r)) return 'SK Kagawad';
    return 'SK Official';
  };
  const roleKey = normalizeRoleKey(role);
  const roleLimit = ROLE_LIMITS[roleKey] ?? 0;
  const { data: _capacityList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const _allAuthUsersForCapacity = _capacityList?.users || [];
  const _emailAlreadyExists = _allAuthUsersForCapacity.some(u => u.email?.toLowerCase() === normalizedEmail);
  if (!_emailAlreadyExists && roleLimit > 0) {
    const _roleOccupants = _allAuthUsersForCapacity.filter(u => {
      const meta = u.user_metadata || {};
      if (meta.tenant_id !== barangay_id) return false;
      if (!meta.role) return false;
      return normalizeRoleKey(String(meta.role)) === roleKey;
    });
    if (_roleOccupants.length >= roleLimit) {
      sendError(res, "Barangay capacity reached: only " + roleLimit + " " + roleKey + (roleLimit > 1 ? "s" : "") + " allowed per Barangay. " + _roleOccupants.length + " already registered.", 409);
      return;
    }
  }

  // Check if user already exists in public.users
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id, email, tenant_id, role_id, status')
    .eq('email', normalizedEmail)
    .maybeSingle();

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    // Update password and metadata in auth.users
    const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { full_name, tenant_id: barangay_id, role_id: roleId, role },
    });

    if (updateAuthErr) {
      sendError(res, `Failed to update credentials: ${updateAuthErr.message}`, 400);
      return;
    }

    // Update public.users record
    const { error: updatePublicErr } = await supabaseAdmin
      .from('users')
      .update({
        full_name,
        tenant_id: barangay_id,
        role_id: roleId,
        phone: phone || null,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updatePublicErr) {
      sendError(res, `Failed to update user profile: ${updatePublicErr.message}`, 500);
      return;
    }
  } else {
    // Check if auth user exists (in case user exists in auth but not yet in public.users)
    const { data: authUsersList } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = authUsersList?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);

    if (existingAuthUser) {
      userId = existingAuthUser.id;
      const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: { full_name, tenant_id: barangay_id, role_id: roleId, role },
      });
      if (updateAuthErr) {
        sendError(res, `Failed to configure account credentials: ${updateAuthErr.message}`, 400);
        return;
      }
    } else {
      // Create new user in Supabase Auth
      const { data: newAuthData, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name, tenant_id: barangay_id, role_id: roleId, role },
      });

      if (createAuthErr || !newAuthData?.user) {
        sendError(res, createAuthErr?.message || 'Failed to create official auth account.', 400);
        return;
      }
      userId = newAuthData.user.id;
    }

    // Insert into public.users
    const { error: insertUserErr } = await supabaseAdmin.from('users').upsert({
      id: userId,
      tenant_id: barangay_id,
      role_id: roleId,
      full_name,
      email: normalizedEmail,
      phone: phone || null,
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertUserErr) {
      sendError(res, `Failed to initialize official user record: ${insertUserErr.message}`, 500);
      return;
    }
  }

  await recordAuditLog({
    tenantId: barangay_id,
    userId,
    action: isChairperson ? 'REGISTER_SK_CHAIRPERSON' : 'REGISTER_SK_OFFICIAL',
    entityName: 'users',
    entityId: userId,
    details: { full_name, role: isChairperson ? 'SK Chairperson' : role, barangay: barangay.name },
    ipAddress: req.ip || null,
  });

  sendCreated(
    res,
    {
      user_id: userId,
      email: normalizedEmail,
      full_name,
      barangay: barangay.name,
      role: isChairperson ? 'SK Chairperson' : role,
      status,
    },
    (() => {
      const displayName = full_name.startsWith('Hon.') ? full_name : `Hon. ${full_name}`;
      return isChairperson
        ? `SK Chairperson account created successfully for ${displayName}. You can now sign in with your password.`
        : `Official registration for ${displayName} submitted. Awaiting approval.`;
    })()
  );
});

// GET /api/auth/check-chairperson-invite - Check if an email is an invited Chairperson
router.get('/check-chairperson-invite', async (req: Request, res: Response): Promise<void> => {
  const emailParam = req.query.email as string | undefined;
  if (!emailParam) {
    sendError(res, 'Email query parameter is required.', 400);
    return;
  }
  const normalizedEmail = emailParam.trim().toLowerCase();

  // Check users table
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, tenant_id, role_id, full_name, status, barangay(name, city, district)')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (user && user.role_id === ROLE_IDS.BARANGAY_ADMIN) {
    const barangayInfo = (user as any).barangay || {};
    sendSuccess(
      res,
      {
        isInvitedChairperson: true,
        email: normalizedEmail,
        tenant_id: user.tenant_id,
        barangay_name: barangayInfo.name || 'Barangay Abella',
        full_name: user.full_name,
        status: user.status,
      },
      'Chairperson invitation verified.'
    );
    return;
  }

  // Also check auth metadata
  const { data: authList } = await supabaseAdmin.auth.admin.listUsers();
  const authUser = authList?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);
  if (authUser && (authUser.user_metadata?.role_id === 2 || authUser.user_metadata?.role === 'Barangay Admin')) {
    const tenantId = authUser.user_metadata?.tenant_id;
    let bgyName = 'Barangay Abella';
    if (tenantId) {
      const { data: bgy } = await supabaseAdmin.from('barangay').select('name').eq('id', tenantId).maybeSingle();
      if (bgy) bgyName = bgy.name;
    }
    sendSuccess(
      res,
      {
        isInvitedChairperson: true,
        email: normalizedEmail,
        tenant_id: tenantId,
        barangay_name: bgyName,
        full_name: authUser.user_metadata?.full_name || '',
        status: 'active',
      },
      'Chairperson invitation verified.'
    );
    return;
  }

  sendSuccess(res, { isInvitedChairperson: false }, 'No pending invitation found for this email.');
});

// POST /api/auth/setup-chairperson-password - Chairperson creates password and confirm password
const SetupChairpersonPasswordSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: SecurePasswordSchema,
  confirmPassword: z.string(),
  full_name: z.string().optional(),
});

router.post('/setup-chairperson-password', async (req: Request, res: Response): Promise<void> => {
  const parseResult = SetupChairpersonPasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
    return;
  }

  const { email, password, confirmPassword, full_name } = parseResult.data;
  if (password !== confirmPassword) {
    sendError(res, 'Password and Confirm Password do not match.', 400);
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Find user in public.users or auth.users
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id, tenant_id, role_id, full_name, status, barangay(name)')
    .eq('email', normalizedEmail)
    .maybeSingle();

  const { data: authList } = await supabaseAdmin.auth.admin.listUsers();
  const existingAuthUser = authList?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);

  let userId: string;
  let tenantId = existingUser?.tenant_id || existingAuthUser?.user_metadata?.tenant_id;

  // If tenantId is not resolved yet, default to Barangay Abella
  if (!tenantId) {
    tenantId = 'b0222222-2222-4000-8000-000000000012';
  }

  const cleanFullName =
    full_name && full_name.trim().length > 0
      ? full_name.trim()
      : existingUser?.full_name && existingUser.full_name !== 'Pending Chairperson' && existingUser.full_name !== 'Pending Invitation'
      ? existingUser.full_name
      : 'Hon. SK Chairperson';

  if (existingAuthUser) {
    userId = existingAuthUser.id;
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: {
        tenant_id: tenantId,
        role_id: ROLE_IDS.BARANGAY_ADMIN,
        role: 'Barangay Admin',
        full_name: cleanFullName,
        must_set_password: false,
      },
    });
    if (updateErr) {
      sendError(res, `Failed to update password credentials: ${updateErr.message}`, 400);
      return;
    }
  } else {
    const { data: newAuthUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        tenant_id: tenantId,
        role_id: ROLE_IDS.BARANGAY_ADMIN,
        role: 'Barangay Admin',
        full_name: cleanFullName,
        must_set_password: false,
      },
    });
    if (createErr || !newAuthUser?.user) {
      sendError(res, `Failed to initialize Chairperson auth account: ${createErr?.message}`, 400);
      return;
    }
    userId = newAuthUser.user.id;
  }

  // Update public.users
  const { error: userUpsertErr } = await supabaseAdmin.from('users').upsert(
    {
      id: userId,
      tenant_id: tenantId,
      role_id: ROLE_IDS.BARANGAY_ADMIN,
      full_name: cleanFullName,
      email: normalizedEmail,
      status: 'active',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (userUpsertErr) {
    console.warn('Notice updating users table:', userUpsertErr.message);
  }

  // Ensure resident_profile exists with valid birthdate so App.tsx routes straight to Chairperson's Dashboard
  const { error: profileUpsertErr } = await supabaseAdmin.from('resident_profile').upsert(
    {
      user_id: userId,
      tenant_id: tenantId,
      birthdate: '2001-01-01',
      sex: 'Female',
      address: 'Barangay Hall, Naga City',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (profileUpsertErr) {
    console.warn('Notice updating resident_profile:', profileUpsertErr.message);
  }

  // Record Audit Log
  await recordAuditLog({
    tenantId,
    userId,
    action: 'CHAIRPERSON_PASSWORD_SETUP',
    entityName: 'users',
    entityId: userId,
    details: {
      email: normalizedEmail,
      full_name: cleanFullName,
      status: 'active',
    },
    ipAddress: req.ip || null,
  });

  // Authenticate session to obtain access token
  const { data: sessionData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (signInErr || !sessionData?.session) {
    sendError(res, signInErr?.message || 'Password configured, but could not start session. Please sign in.', 400);
    return;
  }

  // Retrieve complete user profile
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('*, roles(role_name), barangay(name, city, district), resident_profile(*)')
    .eq('id', userId)
    .single();

  const enrichedUser = {
    ...(profile || {}),
    id: userId,
    email: normalizedEmail,
    full_name: cleanFullName,
    role_id: ROLE_IDS.BARANGAY_ADMIN,
    tenant_id: tenantId,
    status: 'active',
    user_metadata: {
      tenant_id: tenantId,
      role_id: ROLE_IDS.BARANGAY_ADMIN,
      role: 'Barangay Admin',
      full_name: cleanFullName,
    },
    resident_profile: {
      birthdate: '2001-01-01',
      sex: 'Female',
      address: 'Barangay Hall, Naga City',
    },
  };

  sendSuccess(
    res,
    {
      token: sessionData.session.access_token,
      refreshToken: sessionData.session.refresh_token,
      user: enrichedUser,
    },
    'Chairperson password configured successfully! Redirecting to Chairperson Dashboard...'
  );
});

// GET /api/auth/me - Get current user profile
router.get('/me', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthRequest).user!;
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('*, roles(role_name), barangay(name, city, district), resident_profile(*)')
    .eq('id', user.id)
    .single();

  const { data: authData } = await supabaseAdmin.auth.admin.getUserById(user.id);
  const userMeta = authData?.user?.user_metadata || {};

  sendSuccess(res, { ...(profile || user), user_metadata: userMeta }, 'User profile retrieved.');
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    await supabase.auth.admin.signOut(token);
  }
  sendSuccess(res, null, 'Logged out successfully.');
});

export default router;