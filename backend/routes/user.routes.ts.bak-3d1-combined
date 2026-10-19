import express from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin, recordAuditLog } from '../services/supabase.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import {authenticateUser, requireActiveUser, requireRoles} from '../middleware/auth.js';
import type { AuthRequest } from '../types/database.types.js';

const router = express.Router();

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

const CompleteProfileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional(),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Birthdate must be formatted as YYYY-MM-DD'),
  sex: z.enum(['Male', 'Female', 'Other', 'Prefer not to say']),
  address: z.string().min(3, 'Address is required'),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
});

/**
 * PUT /api/users/complete-profile
 * First-time login profile completion for SK Chairpersons and newly provisioned users.
 * Updates public.users with personal name and contact info,
 * and upserts public.resident_profile with birthdate, sex, and residential address.
 */
router.put('/complete-profile', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const parseResult = CompleteProfileSchema.safeParse(req.body);
  if (!parseResult.success) {
    sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
    return;
  }

  const { full_name, phone, birthdate, sex, address, password, confirmPassword } = parseResult.data;
  const user = (req as AuthRequest).user!;

  if ((password || confirmPassword) && (!password || !confirmPassword)) {
    sendError(res, 'Please provide both password and confirm password.', 400);
    return;
  }

  if (password && confirmPassword && password !== confirmPassword) {
    sendError(res, 'Password and confirm password must match.', 400);
    return;
  }

  if (password) {
    const passwordCheck = SecurePasswordSchema.safeParse(password);
    if (!passwordCheck.success) {
      sendError(res, 'Invalid password format.', 400, passwordCheck.error.flatten().fieldErrors);
      return;
    }
  }

  // 1. Age Verification (Republic Act No. 10742 - SK Reform Act: 15 to 30 years old)
  const age = calculateAge(birthdate);
  if (age < 15 || age > 30) {
    sendError(
      res,
      `Republic Act No. 10742 requires SK officials and members to be between 15 and 30 years old. Calculated age is ${age}.`,
      422,
      { calculatedAge: age, requiredRange: '15-30' }
    );
    return;
  }

  // 2. Fetch current user from DB to obtain tenant_id if missing in token
  let tenantId = user.tenant_id;
  if (!tenantId) {
    const { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();
    if (dbUser?.tenant_id) {
      tenantId = dbUser.tenant_id;
    }
  }

  if (!tenantId) {
    sendError(res, 'User is not bound to a valid Naga City Barangay tenant.', 400);
    return;
  }

  // 3. Update public.users record
  const { error: userUpdateErr } = await supabaseAdmin
    .from('users')
    .update({
      full_name: full_name.trim(),
      phone: phone ? phone.trim() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (userUpdateErr) {
    sendError(res, `Failed to update user profile: ${userUpdateErr.message}`, 500);
    return;
  }

  // 4. Upsert into public.resident_profile
  const { error: profileUpsertErr } = await supabaseAdmin
    .from('resident_profile')
    .upsert(
      {
        user_id: user.id,
        tenant_id: tenantId,
        birthdate,
        sex,
        address: address.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (profileUpsertErr) {
    sendError(res, `Failed to initialize resident profile: ${profileUpsertErr.message}`, 500);
    return;
  }

  // 5. Update auth user metadata and password in Supabase Auth
  try {
    const authUpdateData: Record<string, any> = {
      user_metadata: { full_name: full_name.trim() },
    };

    if (password) {
      authUpdateData.password = password;
    }

    await supabaseAdmin.auth.admin.updateUserById(user.id, authUpdateData);
  } catch (authErr) {
    console.warn('Failed to update Supabase Auth user metadata/password:', authErr);
  }

  // 6. Record system audit log
  await recordAuditLog({
    tenantId,
    userId: user.id,
    action: 'COMPLETE_CHAIRPERSON_PROFILE',
    entityName: 'users',
    entityId: user.id,
    details: {
      full_name: full_name.trim(),
      email: user.email,
      birthdate,
      sex,
      age,
    },
    ipAddress: req.ip || null,
  });

  // 7. Retrieve refreshed comprehensive profile
  const { data: updatedProfile } = await supabaseAdmin
    .from('users')
    .select('*, roles(role_name), barangay(name, city, district), resident_profile(birthdate, sex, address, digital_youth_id, qr_code_url)')
    .eq('id', user.id)
    .single();

  sendSuccess(
    res,
    updatedProfile || {
      id: user.id,
      full_name: full_name.trim(),
      email: user.email,
      tenant_id: tenantId,
      phone: phone || null,
      role: user.role,
      role_id: user.role_id,
    },
    'Chairperson profile completed successfully. Full administrative access unlocked.'
  );
});

function normalizeEducationalStatus(level?: string | null): 'Elementary' | 'High School' | 'Vocational' | 'College' | 'Post-Graduate' | 'Out of School Youth' | null {
  if (!level) return null;
  const valid = ['Elementary', 'High School', 'Vocational', 'College', 'Post-Graduate', 'Out of School Youth'] as const;
  if (valid.includes(level as any)) return level as any;
  if (level.includes('High')) return 'High School';
  if (level.includes('College') || level.includes('Tertiary')) return 'College';
  if (level.includes('Vocational')) return 'Vocational';
  if (level.includes('Elementary')) return 'Elementary';
  if (level.includes('Post') || level.includes('Master') || level.includes('Doctor')) return 'Post-Graduate';
  if (level.includes('Out of School') || level.includes('OSY')) return 'Out of School Youth';
  return null;
}

function normalizeEmploymentStatus(status?: string | null): 'Employed' | 'Unemployed' | 'Self-Employed' | 'Student' | null {
  if (!status) return null;
  const valid = ['Employed', 'Unemployed', 'Self-Employed', 'Student'] as const;
  if (valid.includes(status as any)) return status as any;
  const lower = status.toLowerCase();
  if (lower.includes('student')) return 'Student';
  if (lower.includes('self')) return 'Self-Employed';
  if (lower.includes('unemploy') || lower.includes('out-of-school')) return 'Unemployed';
  if (lower.includes('employ') || lower.includes('working')) return 'Employed';
  return 'Student';
}

/**
 * PUT /api/users/profile
 * Updates Constituent / Youth Profile in public.users, public.resident_profile,
 * and permanently saves all 20 Katipunan ng Kabataan profile fields in Supabase Auth user_metadata.
 */
router.put('/profile', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const authenticatedUser = (req as AuthRequest).user!;
    const userId = authenticatedUser.id;
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, tenant_id, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      sendError(res, `Failed to retrieve authenticated user profile: ${userError.message}`, 500);
      return;
    }
    if (!user) {
      sendError(res, 'Authenticated user profile not found.', 404);
      return;
    }

    const body = req.body || {};

    // 1. Update public.users
    const userUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (body.name || body.full_name) {
      userUpdates.full_name = (body.name || body.full_name).trim();
    }
    if (body.mobile || body.phone) {
      userUpdates.phone = (body.mobile || body.phone).trim();
    }

    const { error: userUpdateError } = await supabaseAdmin.from('users').update(userUpdates).eq('id', userId);
    if (userUpdateError) {
      sendError(res, `Failed to update user profile: ${userUpdateError.message}`, 500);
      return;
    }

    // 2. Fetch or update resident_profile
    const { data: existingProfile } = await supabaseAdmin
      .from('resident_profile')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('tenant_id, email, full_name')
      .eq('id', userId)
      .single();

    const tenantId = dbUser?.tenant_id || existingProfile?.tenant_id || authenticatedUser.tenant_id;
    const birthdate = body.birthdate || existingProfile?.birthdate || '2005-01-01';
    const sex = body.sex || existingProfile?.sex || 'Female';
    const address = body.address || existingProfile?.address || 'Naga City';
    const rawEdu = body.educationalLevel || body.educational_status;
    const rawEmp = body.employmentStatus || body.employment_status;
    const normalizedEdu = normalizeEducationalStatus(rawEdu) || existingProfile?.educational_status;
    const normalizedEmp = normalizeEmploymentStatus(rawEmp) || existingProfile?.employment_status;

    const residentPayload: Record<string, any> = {
      school: body.school ?? undefined,
      course: body.course ?? undefined,
      year_level: body.year_level ?? body.yearLevel ?? undefined,
      zone: body.zone ?? body.purok ?? undefined,
      user_id: userId,
      tenant_id: tenantId,
      birthdate,
      sex: ['Male', 'Female', 'Other', 'Prefer not to say'].includes(sex) ? sex : 'Female',
      address,
      educational_status: normalizedEdu || null,
      employment_status: normalizedEmp || null,
      updated_at: new Date().toISOString(),
    };

    if (body.digital_youth_id || body.id) {
      residentPayload.digital_youth_id = body.digital_youth_id || body.id;
    }
    if (body.qrCode || body.qr_code_url) {
      residentPayload.qr_code_url = body.qrCode || body.qr_code_url;
    }

    const { error: profileUpsertErr } = await supabaseAdmin
      .from('resident_profile')
      .upsert(residentPayload, { onConflict: 'user_id' });

    if (profileUpsertErr) {
      console.warn('Resident Profile Upsert Notice:', profileUpsertErr.message);
    }

    // 3. Update Supabase Auth user_metadata to persist all 20 KK fields
    let updatedMetadata: Record<string, any> = {};
    try {
      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId);
      const prevMeta = authData?.user?.user_metadata || {};
      const safePrevMeta = Object.fromEntries(
        Object.entries(prevMeta).filter(([key]) => !['profilePic', 'qrCode', 'picture'].includes(key)),
      );
      const calculatedAge = calculateAge(birthdate);

      updatedMetadata = {
        ...safePrevMeta,
        id: body.id || prevMeta.id || residentPayload.digital_youth_id || `SK-2026-${userId.slice(0, 4)}`,
        name: body.name || body.full_name || prevMeta.name || userUpdates.full_name || user.full_name,
        sex: body.sex || prevMeta.sex || sex,
        birthdate: birthdate,
        age: body.age || calculatedAge || prevMeta.age || 20,
        civilStatus: body.civilStatus || prevMeta.civilStatus || 'Single',
        address: body.address || prevMeta.address || address,
        zone: body.zone || prevMeta.zone || 'Zone 1',
        mobile: body.mobile || body.phone || prevMeta.mobile || userUpdates.phone,
        email: body.email || dbUser?.email || user.email || prevMeta.email,
        educationalLevel: body.educationalLevel || prevMeta.educationalLevel || normalizedEdu || 'College',
        school: body.school ?? prevMeta.school ?? '',
        course: body.course ?? prevMeta.course ?? '',
        year: body.year ?? prevMeta.year ?? '1st Year',
        employmentStatus: body.employmentStatus || prevMeta.employmentStatus || normalizedEmp || 'Student',
        scholarStatus: body.scholarStatus || prevMeta.scholarStatus || 'Non-Scholar',
        scholarshipType: body.scholarshipType ?? prevMeta.scholarshipType ?? '',
        youthSector: body.youthSector || prevMeta.youthSector || 'In-School Youth',
        guardianName: body.guardianName ?? prevMeta.guardianName ?? '',
        guardianContact: body.guardianContact ?? prevMeta.guardianContact ?? '',
        status: body.status || prevMeta.status || 'Pending',
        barangayId: tenantId,
        dateRegistered: body.dateRegistered || prevMeta.dateRegistered || new Date().toISOString().split('T')[0],
      };

      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: updatedMetadata,
      });
    } catch (metaErr) {
      console.warn('Failed to update Supabase Auth user_metadata:', metaErr);
    }

    // 4. Record Audit Log
    await recordAuditLog({
      tenantId,
      userId,
      action: 'UPDATE_YOUTH_PROFILE',
      entityName: 'resident_profile',
      entityId: userId,
      details: {
        full_name: userUpdates.full_name || user.full_name,
        updated_fields: Object.keys(body),
      },
      ipAddress: req.ip || null,
    });

    sendSuccess(
      res,
      updatedMetadata,
      'Katipunan ng Kabataan Profile updated and saved to the database successfully!'
    );
  } catch (err: any) {
    console.error('Update Profile Handler Error:', err);
    sendError(res, err.message || 'Internal error saving profile', 500);
  }
});

/**
 * GET /api/users/profile
 * Returns the current user's complete KK profile from database.
 */
router.get('/profile', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const authenticatedUser = (req as AuthRequest).user!;
    const requestedUserId = req.query.id;
    const adminScope = req.query.scope === 'admin';
    let userId = authenticatedUser.id;

    if (adminScope) {
      if (authenticatedUser.role !== 'SUPER_ADMIN') {
        sendError(res, 'Only a Super Admin may use administrative profile lookup.', 403);
        return;
      }
      if (typeof requestedUserId !== 'string' || !z.string().uuid().safeParse(requestedUserId).success) {
        sendError(res, 'A valid user ID is required for administrative profile lookup.', 400);
        return;
      }
      userId = requestedUserId;
    } else if (requestedUserId !== undefined && requestedUserId !== authenticatedUser.id) {
      sendError(res, 'You cannot access another user’s profile.', 403);
      return;
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (userError) {
      sendError(res, `Failed to retrieve user profile: ${userError.message}`, 500);
      return;
    }
    if (!user) {
      sendError(res, 'User profile not found.', 404);
      return;
    }

    const { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('*, roles(role_name), barangay(name, city, district), resident_profile(*)')
      .eq('id', userId)
      .single();

    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const meta = authData?.user?.user_metadata || {};
    const resident = dbUser?.resident_profile || {};

    const fullProfile = {
      id: meta.id || resident.digital_youth_id || `SK-2026-${userId.slice(0, 4)}`,
      name: dbUser?.full_name || meta.name || meta.full_name || '',
      sex: resident.sex || meta.sex || 'Female',
      birthdate: resident.birthdate || meta.birthdate || '2005-01-01',
      age: meta.age || (resident.birthdate ? calculateAge(resident.birthdate) : 20),
      civilStatus: meta.civilStatus || 'Single',
      address: resident.address || meta.address || '',
      zone: meta.zone || 'Zone 1',
      mobile: dbUser?.phone || meta.mobile || '',
      email: dbUser?.email || meta.email || '',
      educationalLevel: meta.educationalLevel || resident.educational_status || 'College',
      school: resident.school || meta.school || '',
      course: resident.course || meta.course || '',
      year: resident.year_level || meta.year || '',
      employmentStatus: meta.employmentStatus || resident.employment_status || 'Student',
      scholarStatus: meta.scholarStatus || 'Non-Scholar',
      scholarshipType: meta.scholarshipType || '',
      youthSector: meta.youthSector || 'In-School Youth',
      guardianName: meta.guardianName || '',
      guardianContact: meta.guardianContact || '',
      profilePic: meta.profilePic || '',
      qrCode: resident.qr_code_url || meta.qrCode || resident.digital_youth_id || '',
      status: dbUser?.status === 'active' ? 'Approved' : (dbUser?.status === 'rejected' ? 'Rejected' : 'Pending'),
      barangayId: dbUser?.tenant_id || meta.barangayId || '',
      dateRegistered: dbUser?.created_at?.split('T')[0] || meta.dateRegistered || new Date().toISOString().split('T')[0],
      registeredRole: 'Youth Constituent',
    };

    sendSuccess(res, fullProfile, 'Profile retrieved successfully.');
  } catch (err: any) {
    sendError(res, err.message || 'Error retrieving profile', 500);
  }
});

/**
 * GET /api/users/youth-profiles
 * Returns all Katipunan ng Kabataan constituents for a barangay.
 */
router.get('/youth-profiles', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as AuthRequest).user!;
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    const allTenantsRequested = req.query.scope === 'all';

    if (!user.tenant_id && !(isSuperAdmin && allTenantsRequested)) {
      sendError(res, 'A barangay tenant context is required to load youth constituents.', 403);
      return;
    }

    const includeOfficials = req.query.include_officials === 'true';

    let query = supabaseAdmin
      .from('users')
      .select('*, resident_profile(*)');

    query = includeOfficials ? query.in('role_id', [3, 4]) : query.or('role_id.eq.4,and(role_id.eq.3,status.eq.pending)');

    if (!(isSuperAdmin && allTenantsRequested)) {
      query = query.eq('tenant_id', user.tenant_id);
    }

    const { data: users, error } = await query;
    if (error) {
      sendError(res, `Failed to load youth constituents: ${error.message}`, 500);
      return;
    }

    const profiles = await Promise.all(
      (users || []).map(async (u) => {
        let meta: Record<string, any> = {};
        try {
          const { data: authData } = await supabaseAdmin.auth.admin.getUserById(u.id);
          meta = authData?.user?.user_metadata || {};
        } catch {
          // Ignore
        }

        const resident = u.resident_profile || {};
        const registeredRole = u.role_id === 3
          ? ({
              'SK_KAGAWAD': 'SK Kagawad',
              'SK_SECRETARY': 'SK Secretary',
              'SK_TREASURER': 'SK Treasurer',
              'SK Kagawad': 'SK Kagawad',
              'SK Secretary': 'SK Secretary',
              'SK Treasurer': 'SK Treasurer',
            } as Record<string, 'SK Kagawad' | 'SK Secretary' | 'SK Treasurer'>)[
              String(meta.role || meta.registeredRole || '')
            ] || 'SK Kagawad'
          : 'Youth Constituent';

        return {
          userId: u.id,
          id: meta.id || resident.digital_youth_id || `SK-2026-${u.id.slice(0, 4)}`,
          name: u.full_name || meta.name || '',
          sex: resident.sex || meta.sex || 'Female',
          birthdate: resident.birthdate || meta.birthdate || '2005-01-01',
          age: meta.age || (resident.birthdate ? calculateAge(resident.birthdate) : 20),
          civilStatus: meta.civilStatus || 'Single',
          address: resident.address || meta.address || '',
          zone: meta.zone || 'Zone 1',
          mobile: u.phone || meta.mobile || '',
          email: u.email || meta.email || '',
          educationalLevel: meta.educationalLevel || resident.educational_status || 'College',
          school: meta.school || '',
          course: meta.course || '',
          year: meta.year || '1st Year',
          employmentStatus: meta.employmentStatus || resident.employment_status || 'Student',
          scholarStatus: meta.scholarStatus || 'Non-Scholar',
          scholarshipType: meta.scholarshipType || '',
          youthSector: meta.youthSector || 'In-School Youth',
          guardianName: meta.guardianName || '',
          guardianContact: meta.guardianContact || '',
          profilePic: meta.profilePic || '',
          qrCode: resident.qr_code_url || meta.qrCode || resident.digital_youth_id || '',
          status: u.status === 'active' ? 'Approved' : (u.status === 'rejected' ? 'Rejected' : 'Pending'),
          barangayId: u.tenant_id || meta.barangayId || '',
          dateRegistered: u.created_at?.split('T')[0] || meta.dateRegistered || new Date().toISOString().split('T')[0],
          registeredRole,
        };
      })
    );

    sendSuccess(res, profiles, 'Youth constituent profiles retrieved.');
  } catch (err: any) {
    sendError(res, err.message || 'Error fetching youth profiles', 500);
  }
});

/**
 * PUT /api/users/:id/profile
 * Admin-only: SK Chairperson updates another user's profile.
 * Reuses the same field mapping as PUT /profile.
 */
router.put(
  '/:id/profile',
  authenticateUser,
  requireActiveUser,
  requireRoles('BARANGAY_ADMIN', 'SK_OFFICIAL', 'SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id: targetUserId } = req.params;
      const requester = (req as AuthRequest).user!;
      const { body } = req;

      // Load target user
      const { data: targetUser, error: targetErr } = await supabaseAdmin
        .from('users')
        .select('id, tenant_id, full_name, email')
        .eq('id', targetUserId)
        .maybeSingle();

      if (targetErr || !targetUser) {
        sendError(res, 'Target user not found.', 404);
        return;
      }

      // Tenant guard
      if (requester.role !== 'SUPER_ADMIN' && requester.tenant_id !== targetUser.tenant_id) {
        sendError(res, 'Forbidden: You cannot edit users from another Barangay.', 403);
        return;
      }

      // Update public.users row (name/phone only)
      const userUpdates: Record<string, any> = {};
      if (body.name || body.full_name) userUpdates.full_name = body.name || body.full_name;
      if (body.mobile || body.phone) userUpdates.phone = body.mobile || body.phone;
      if (Object.keys(userUpdates).length > 0) {
        await supabaseAdmin.from('users').update(userUpdates).eq('id', targetUserId);
      }

      // Upsert resident_profile
      const residentPayload: Record<string, any> = {
        user_id: targetUserId,
        tenant_id: targetUser.tenant_id,
        updated_at: new Date().toISOString(),
      };
      if (body.school !== undefined) residentPayload.school = body.school || null;
      if (body.course !== undefined) residentPayload.course = body.course || null;
      if (body.year_level !== undefined || body.yearLevel !== undefined)
        residentPayload.year_level = body.year_level || body.yearLevel || null;
      if (body.zone !== undefined) residentPayload.zone = body.zone || null;
      if (body.address !== undefined) residentPayload.address = body.address || null;
      if (body.educationalLevel !== undefined || body.educational_status !== undefined)
        residentPayload.educational_status = body.educationalLevel || body.educational_status || null;
      if (body.employmentStatus !== undefined || body.employment_status !== undefined)
        residentPayload.employment_status = body.employmentStatus || body.employment_status || null;

      const { error: profileErr } = await supabaseAdmin
        .from('resident_profile')
        .upsert(residentPayload, { onConflict: 'user_id' });

      if (profileErr) {
        console.warn('Admin profile update warning:', profileErr.message);
      }

      await recordAuditLog({
        tenantId: targetUser.tenant_id,
        userId: requester.id,
        action: 'ADMIN_UPDATE_YOUTH_PROFILE',
        entityName: 'resident_profile',
        entityId: String(targetUserId),
        details: { updated_fields: Object.keys(body) },
        ipAddress: req.ip || null,
      });

      sendSuccess(res, { id: targetUserId }, `Profile updated for ${targetUser.full_name}.`);
    } catch (err: any) {
      sendError(res, err?.message || 'Failed to update profile.', 500);
    }
  }
);
export default router;
