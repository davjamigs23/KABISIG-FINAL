import express from 'express';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { supabaseAdmin, recordAuditLog } from '../services/supabase.service.js';

import { resolveAvatarUrl } from '../services/avatar.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import {authenticateUser, requireActiveUser, requireRoles} from '../middleware/auth.js';
import type { AuthRequest } from '../types/database.types.js';
import { resolveName } from '../utils/name.js';

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
  first_name: z.string().max(100).optional(),
  middle_name: z.string().max(100).optional().nullable(),
  last_name: z.string().max(100).optional(),
  suffix: z.string().max(20).optional().nullable(),
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

  const { full_name, phone, birthdate, sex, address, password, confirmPassword, first_name, middle_name, last_name, suffix } = parseResult.data;
  const resolvedName = resolveName({
    payload: { first_name, middle_name, last_name, suffix, full_name },
    placeholders: ['Pending Chairperson', 'Pending Invitation'],
    fallback: { first_name: 'SK', last_name: 'Chairperson' },
  });
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
      full_name: resolvedName.full_name || full_name.trim(),
      first_name: resolvedName.first_name || null,
      middle_name: resolvedName.middle_name || null,
      last_name: resolvedName.last_name || null,
      suffix: resolvedName.suffix || null,
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
      user_metadata: { full_name: resolvedName.full_name || full_name.trim(), first_name: resolvedName.first_name, middle_name: resolvedName.middle_name, last_name: resolvedName.last_name, suffix: resolvedName.suffix },
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
      full_name: resolvedName.full_name || full_name.trim(),
      first_name: resolvedName.first_name || null,
      middle_name: resolvedName.middle_name || null,
      last_name: resolvedName.last_name || null,
      suffix: resolvedName.suffix || null,
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
    .select('*, roles(role_name), barangay(name, city, district), resident_profile!resident_profile_user_id_fkey(birthdate, sex, address, digital_youth_id, qr_code_url)')
    .eq('id', user.id)
    .single();

  sendSuccess(
    res,
    updatedProfile || {
      id: user.id,
      full_name: resolvedName.full_name || full_name.trim(),
      first_name: resolvedName.first_name || null,
      middle_name: resolvedName.middle_name || null,
      last_name: resolvedName.last_name || null,
      suffix: resolvedName.suffix || null,
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
  const authUser = (req as any).user;
  if (authUser.role_id === 1 && req.body.email && req.body.email !== authUser.email) {
    sendError(res, 'Super Admin email cannot be changed.', 403); return;
  }
  try {
    const authenticatedUser = (req as AuthRequest).user!;
    const userId = authenticatedUser.id;
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, tenant_id, full_name, first_name, middle_name, last_name, suffix, suspension_reason')
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
    if (body.name || body.full_name || body.first_name || body.last_name) {
      const _resolvedProfile = resolveName({
        payload: {
          first_name: body.first_name,
          middle_name: body.middle_name,
          last_name: body.last_name,
          suffix: body.suffix,
          full_name: body.full_name || body.name,
        },
        existing: { full_name: user.full_name || null },
      });
      userUpdates.full_name = _resolvedProfile.full_name;
      userUpdates.first_name = _resolvedProfile.first_name || null;
      userUpdates.middle_name = _resolvedProfile.middle_name || null;
      userUpdates.last_name = _resolvedProfile.last_name || null;
      userUpdates.suffix = _resolvedProfile.suffix || null;
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
      guardian_name: body.guardianName !== undefined
        ? (typeof body.guardianName === 'string' ? body.guardianName.trim() || null : null)
        : existingProfile?.guardian_name ?? null,
      guardian_contact: body.guardianContact !== undefined
        ? (typeof body.guardianContact === 'string' ? body.guardianContact.trim() || null : null)
        : existingProfile?.guardian_contact ?? null,
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
        zone: body.zone || prevMeta.zone || null,
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
      .select('*, roles(role_name), barangay(name, city, district), resident_profile!resident_profile_user_id_fkey(*)')
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
      civilStatus: (resident as any).marital_status || meta.civilStatus || 'Single',
      address: resident.address || meta.address || '',
      zone: resident.zone || meta.zone || null,
      mobile: dbUser?.phone || meta.mobile || '',
      email: dbUser?.email || meta.email || '',
      educationalLevel: meta.educationalLevel || resident.educational_status || 'College',
      school: resident.school || meta.school || '',
      course: resident.course || meta.course || '',
      year: resident.year_level || meta.year || '',
      employmentStatus: (resident as any).employment_status || meta.employmentStatus || 'Not Specified',
      scholarStatus: (resident as any).scholar_status || meta.scholarStatus || 'Not Specified',
      scholarshipType: meta.scholarshipType || '',
      youthSector: meta.youthSector || 'In-School Youth',
          isPwd: (resident as any).is_pwd || false,
          isSoloParent: (resident as any).is_solo_parent || false,
          verificationStatus: (resident as any).verification_status || 'pending',
      guardianName: resident.guardian_name || meta.guardianName || '',
      guardianContact: resident.guardian_contact || meta.guardianContact || '',
      profilePic: await resolveAvatarUrl(dbUser?.avatar_url) || meta.profilePic || '',
      qrCode: resident.qr_code_url || meta.qrCode || resident.digital_youth_id || '',
      status: dbUser?.status === 'active' ? 'Approved' : (dbUser?.status === 'rejected' ? 'Rejected' : dbUser?.status === 'suspended' ? 'suspended' : 'Pending'),
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
router.get(
  '/youth-profiles',
  authenticateUser,
  requireActiveUser,
  requireRoles('BARANGAY_ADMIN', 'SK_OFFICIAL', 'SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
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
      .select('*, resident_profile!resident_profile_user_id_fkey(*)');

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
          civilStatus: (resident as any).marital_status || meta.civilStatus || 'Single',
          address: resident.address || meta.address || '',
          zone: resident.zone || meta.zone || null,
          mobile: u.phone || meta.mobile || '',
          email: u.email || meta.email || '',
          educationalLevel: meta.educationalLevel || resident.educational_status || 'College',
          school: resident.school || meta.school || '',
          course: resident.course || meta.course || '',
          year: resident.year_level || meta.year || '1st Year',
          employmentStatus: (resident as any).employment_status || meta.employmentStatus || 'Not Specified',
          scholarStatus: (resident as any).scholar_status || meta.scholarStatus || 'Not Specified',
          scholarshipType: meta.scholarshipType || '',
          youthSector: meta.youthSector || 'In-School Youth',
          isPwd: (resident as any).is_pwd || false,
          isSoloParent: (resident as any).is_solo_parent || false,
          verificationStatus: (resident as any).verification_status || 'pending',
          guardianName: resident.guardian_name || meta.guardianName || '',
          guardianContact: resident.guardian_contact || meta.guardianContact || '',
          profilePic: await resolveAvatarUrl(u.avatar_url) || meta.profilePic || '',
          qrCode: resident.qr_code_url || meta.qrCode || resident.digital_youth_id || '',
          status: u.status === 'active' ? 'Approved' : (u.status === 'rejected' ? 'Rejected' : u.status === 'suspended' ? 'suspended' : 'Pending'),
          suspension_reason: (u as any).suspension_reason || null,
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
  }
);

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
        .select('id, tenant_id, full_name, first_name, middle_name, last_name, suffix, email')
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
      if (body.name || body.full_name || body.first_name || body.last_name) {
        const _resolvedAdminProfile = resolveName({
          payload: {
            first_name: body.first_name,
            middle_name: body.middle_name,
            last_name: body.last_name,
            suffix: body.suffix,
            full_name: body.full_name || body.name,
          },
          existing: { full_name: (targetUser as any)?.full_name || null },
        });
        userUpdates.full_name = _resolvedAdminProfile.full_name;
        userUpdates.first_name = _resolvedAdminProfile.first_name || null;
        userUpdates.middle_name = _resolvedAdminProfile.middle_name || null;
        userUpdates.last_name = _resolvedAdminProfile.last_name || null;
        userUpdates.suffix = _resolvedAdminProfile.suffix || null;
      }
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
      if (body.guardianName !== undefined || body.guardian_name !== undefined)
        residentPayload.guardian_name = String(body.guardianName ?? body.guardian_name ?? '').trim() || null;
      if (body.guardianContact !== undefined || body.guardian_contact !== undefined)
        residentPayload.guardian_contact = String(body.guardianContact ?? body.guardian_contact ?? '').trim() || null;

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
// ============================================================
// Panel rec #12: ID-based Profile Verification
// ============================================================

const ID_TYPES = ["Philippine Passport", "Driver's License", "PRC ID", "UMID", "PhilHealth ID", "SSS ID", "Pag-IBIG ID", "Voter's ID (COMELEC)", "Postal ID", "NBI Clearance", "Police Clearance", "PhilSys National ID", "Student ID", "Barangay Certificate", "Other"] as const;
const UploadVerificationSchema = z.object({
  id_back_document_base64: z.string().optional(),
  id_back_document_name: z.string().optional(),
  id_back_document_mime: z.string().optional(),
  id_type: z.enum(ID_TYPES),
  id_number: z.string().min(2).max(100),
  file_base64: z.string().min(20),
  file_name: z.string().min(3).max(200),
  mime_type: z.string().regex(/^image\/(jpeg|png|webp)$/, 'Only JPEG, PNG, or WEBP images are allowed'),
});

/**
 * POST /api/users/verification/upload
 * Youth uploads a valid ID. Stores file in `verification-ids/{userId}/{timestamp}.{ext}`
 * and sets resident_profile.verification_status = 'submitted'.
 */
router.post(
  '/verification/upload',
  authenticateUser,

  async (req: Request, res: Response): Promise<void> => {
    const parseResult = UploadVerificationSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
      return;
    }
    const { id_type, id_number, file_base64, file_name, mime_type, id_back_document_base64, id_back_document_name, id_back_document_mime } = parseResult.data;
    const user = (req as AuthRequest).user!;

    if (!user.tenant_id) {
      sendError(res, 'Your account is not linked to a barangay.', 403);
      return;
    }

    // Decode base64
    let buffer: Buffer;
    try {
      buffer = Buffer.from(file_base64, 'base64');
    } catch (e: any) {
      sendError(res, 'Invalid base64 payload.', 400);
      return;
    }

    const MAX_BYTES = 5 * 1024 * 1024;
    if (buffer.length > MAX_BYTES) {
      sendError(res, 'File exceeds 5 MB limit.', 413);
      return;
    }

    // Sanitize extension
    const extFromName = (file_name.split('.').pop() || '').toLowerCase();
    const allowedExt = ['jpg', 'jpeg', 'png', 'webp'];
    const ext = allowedExt.includes(extFromName) ? extFromName : (mime_type === 'image/png' ? 'png' : (mime_type === 'image/webp' ? 'webp' : 'jpg'));
    const storagePath = user.id + '/' + Date.now() + '.' + ext;

    let backStoragePath: string | null = null;
    // Upload to bucket
    const { error: uploadErr } = await supabaseAdmin.storage
      .from('verification-ids')
      .upload(storagePath, buffer, { contentType: mime_type, upsert: true });

    if (uploadErr) {
      sendError(res, 'Failed to upload ID document: ' + uploadErr.message, 500);
      return;
    }

    if (id_back_document_base64) {
      try {
        const backBuffer = Buffer.from(id_back_document_base64, 'base64');
        const backExtFromName = ((id_back_document_name || '').split('.').pop() || '').toLowerCase();
        const backExt = allowedExt.includes(backExtFromName) ? backExtFromName : ((id_back_document_mime === 'image/png') ? 'png' : ((id_back_document_mime === 'image/webp') ? 'webp' : 'jpg'));
        backStoragePath = user.id + '/back-' + Date.now() + '.' + backExt;
        const { error: backUploadErr } = await supabaseAdmin.storage
          .from('verification-ids')
          .upload(backStoragePath, backBuffer, { contentType: id_back_document_mime || 'image/jpeg', upsert: true });
        if (backUploadErr) {
          console.warn('Back ID upload failed:', backUploadErr.message);
          backStoragePath = null;
        }
      } catch (e) {
        console.warn('Back ID parsing failed:', e);
      }
    }

    // Update resident_profile
    const { error: updateErr } = await supabaseAdmin
      .from('resident_profile')
      .update({
        id_type,
        id_number,
        id_document_path: storagePath,
        id_back_document_path: backStoragePath,
        verification_status: 'submitted',
        verification_notes: null,
        verification_reviewed_by: null,
        verification_reviewed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateErr) {
      // rollback storage
      await supabaseAdmin.storage.from('verification-ids').remove([storagePath]);
      sendError(res, 'Failed to record verification metadata: ' + updateErr.message, 500);
      return;
    }

    await recordAuditLog({
      tenantId: user.tenant_id,
      userId: user.id,
      action: 'ID_VERIFICATION_SUBMITTED',
      entityName: 'resident_profile',
      entityId: user.id,
      details: { id_type, id_number, storage_path: storagePath, size_bytes: buffer.length },
      ipAddress: req.ip || null,
    });

    sendSuccess(
      res,
      { id_type, id_number, verification_status: 'submitted' },
      'ID document uploaded successfully. Your barangay SK will review it shortly.'
    );
  }
);

/**
 * GET /api/users/verification/status
 * Youth fetches their own verification status.
 */
router.get(
  '/verification/status',
  authenticateUser,

  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthRequest).user!;

    const { data, error } = await supabaseAdmin
      .from('resident_profile')
      .select('id_type, id_number, verification_status, verification_notes, verification_reviewed_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      sendError(res, 'Failed to load verification status: ' + error.message, 500);
      return;
    }

    const { data: transferRecord } = await supabaseAdmin
      .from('chairperson_transfers')
      .select('id')
      .eq('outgoing_user_id', user.id)
      .maybeSingle();
    const isDemotedChair = Boolean(transferRecord);

    sendSuccess(
      res,
      data ? { ...data, is_demoted_chair: isDemotedChair } : { id_type: null, id_number: null, verification_status: 'not_submitted', verification_notes: null, verification_reviewed_at: null, is_demoted_chair: isDemotedChair },
      'Verification status retrieved.'
    );
  }
);

/**
 * GET /api/users/verification/:userId
 * Chairperson / SK Official reads a youth's ID — returns signed URL (5 min) + metadata.
 */
router.get(
  '/verification/:userId',
  authenticateUser,
  requireActiveUser,
  requireRoles('BARANGAY_ADMIN', 'SK_OFFICIAL', 'SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const requester = (req as AuthRequest).user!;
    const targetUserId = String(req.params.userId || '');
    if (!targetUserId) {
      sendError(res, 'Target user ID is required.', 400);
      return;
    }

    // 1. Fetch Profile safely
    const { data: profile, error } = await supabaseAdmin
      .from('resident_profile')
      .select('user_id, tenant_id, id_type, id_number, id_document_path, id_back_document_path, verification_status, verification_notes, verification_reviewed_at')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (error) {
      sendError(res, 'Failed to load verification: ' + error.message, 500);
      return;
    }
    if (!profile) {
      sendError(res, 'Verification record not found for this user.', 404);
      return;
    }

    if (requester.role !== 'SUPER_ADMIN' && profile.tenant_id !== requester.tenant_id) {
      sendError(res, 'You can only review youth in your barangay.', 403);
      return;
    }

    // 2. Fetch User info safely (no fragile !inner joins)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('full_name, email')
      .eq('id', targetUserId)
      .maybeSingle();

    // 3. Generate Signed URLs
    let signedUrl: string | null = null;
    if (profile.id_document_path) {
      const { data: signData, error: signErr } = await supabaseAdmin.storage
        .from('verification-ids')
        .createSignedUrl(profile.id_document_path, 300);
      if (signErr) console.error("Storage Sign Error (Front):", signErr.message);
      if (signData) signedUrl = signData.signedUrl;
    }

    let backSignedUrl: string | null = null;
    if ((profile as any).id_back_document_path) {
      const { data: signData, error: signErr } = await supabaseAdmin.storage
        .from('verification-ids')
        .createSignedUrl((profile as any).id_back_document_path, 300);
      if (signErr) console.error("Storage Sign Error (Back):", signErr.message);
      if (signData) backSignedUrl = signData.signedUrl;
    }

    // 4. Check if demoted chair
    const { data: transferRecord } = await supabaseAdmin
      .from('chairperson_transfers')
      .select('id')
      .eq('outgoing_user_id', targetUserId)
      .maybeSingle();

    sendSuccess(
      res,
      {
        user_id: profile.user_id,
        is_demoted_chair: Boolean(transferRecord),
        full_name: userData?.full_name || null,
        email: userData?.email || null,
        id_type: profile.id_type,
        id_number: profile.id_number,
        has_document: Boolean(profile.id_document_path),
        signed_url: signedUrl,
        has_back_document: Boolean((profile as any).id_back_document_path),
        back_signed_url: backSignedUrl,
        signed_url_expires_in_seconds: signedUrl ? 300 : null,
        verification_status: profile.verification_status,
        verification_notes: profile.verification_notes,
        verification_reviewed_at: profile.verification_reviewed_at,
      },
      'Verification details retrieved.'
    );
  }
);

/**
 * PATCH /api/users/verification/:userId
 * Chairperson / SK Official approves or rejects a youth's ID.
 */
router.patch(
  '/verification/:userId',
  authenticateUser,
  requireActiveUser,
  requireRoles('BARANGAY_ADMIN', 'SK_OFFICIAL', 'SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const targetUserId = String(req.params.userId);
    const { status } = req.body;
    const user = (req as AuthRequest).user!;

    if (!['verified', 'rejected'].includes(status)) {
      sendError(res, 'Invalid status. Must be "verified" or "rejected".', 400);
      return;
    }

    // Tenant check
    const { data: targetProfile } = await supabaseAdmin
      .from('resident_profile')
      .select('tenant_id')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (!targetProfile || (user.role !== 'SUPER_ADMIN' && targetProfile.tenant_id !== user.tenant_id)) {
      sendError(res, 'You can only verify youth in your barangay.', 403);
      return;
    }

    const { error } = await supabaseAdmin
      .from('resident_profile')
      .update({
        verification_status: status,
        verification_reviewed_by: user.id,
        verification_reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', targetUserId);

    if (error) {
      sendError(res, 'Failed to update verification status: ' + error.message, 500);
      return;
    }

    // Send email notification to the user
    try {
      const { data: targetUser } = await supabaseAdmin
        .from('users')
        .select('email, full_name')
        .eq('id', targetUserId)
        .single();

      if (targetUser?.email) {
        const emailHtml = status === 'verified' 
          ? `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;"><h1 style="color: #091d64; margin: 0 0 8px 0;">KABISIG</h1><p style="color: #64748b; font-size: 12px; margin: 0 0 24px 0;">Kabataang Bagong Sistema para sa Inklusibong Gobyerno</p><h2 style="color: #10b981;">ID Verified!</h2><p style="color: #334155; line-height: 1.6;">Your uploaded ID has been successfully verified by your SK Chairperson. You now have full access to the KABISIG system, including program registration and feedback.</p><div style="text-align: center; margin: 24px 0;"><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background-color: #091d64; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Log In to KABISIG</a></div></div>`
          : `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;"><h1 style="color: #091d64; margin: 0 0 8px 0;">KABISIG</h1><p style="color: #64748b; font-size: 12px; margin: 0 0 24px 0;">Kabataang Bagong Sistema para sa Inklusibong Gobyerno</p><h2 style="color: #ef4444;">ID Rejected</h2><p style="color: #334155; line-height: 1.6;">Your uploaded ID was rejected by your SK Chairperson. Please log in to the KABISIG system and upload a clearer valid ID to verify your account.</p><div style="text-align: center; margin: 24px 0;"><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background-color: #091d64; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Log In to KABISIG</a></div></div>`;
        
        await sendEmail(targetUser.email, status === 'verified' ? 'KABISIG ID Verified' : 'KABISIG ID Rejected', emailHtml);
      }
    } catch (emailErr) {
      console.error('Failed to send verification status email:', emailErr);
    }
    // Send email notification directly via Brevo (Self-contained)
    try {
      const { data: targetUser } = await supabaseAdmin
        .from('users')
        .select('email, full_name')
        .eq('id', targetUserId)
        .single();

      if (targetUser?.email && process.env.BREVO_API_KEY) {
        const emailHtml = status === 'verified' 
          ? `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;"><h1 style="color: #091d64; margin: 0 0 8px 0;">KABISIG</h1><p style="color: #64748b; font-size: 12px; margin: 0 0 24px 0;">Kabataang Bagong Sistema para sa Inklusibong Gobyerno</p><h2 style="color: #10b981;">ID Verified!</h2><p style="color: #334155; line-height: 1.6;">Your uploaded ID has been successfully verified by your SK Chairperson. You now have full access to the KABISIG system, including program registration and feedback.</p><div style="text-align: center; margin: 24px 0;"><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background-color: #091d64; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Log In to KABISIG</a></div></div>`
          : `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;"><h1 style="color: #091d64; margin: 0 0 8px 0;">KABISIG</h1><p style="color: #64748b; font-size: 12px; margin: 0 0 24px 0;">Kabataang Bagong Sistema para sa Inklusibong Gobyerno</p><h2 style="color: #ef4444;">ID Rejected</h2><p style="color: #334155; line-height: 1.6;">Your uploaded ID was rejected by your SK Chairperson. Please log in to the KABISIG system and upload a clearer valid ID to verify your account.</p><div style="text-align: center; margin: 24px 0;"><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background-color: #091d64; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Log In to KABISIG</a></div></div>`;

        // Duplicate fetch removed. Using sendEmail helper above.
        console.log(`[EMAIL] Sent ${status} notification to ${targetUser.email}`);
      }
    } catch (emailErr) {
      console.error('Failed to send verification status email:', emailErr);
    }
    sendSuccess(res, { verification_status: status }, 'ID verification status updated.');
  }
);
/**
 * GET /api/users/role-capacity/:barangayId
 * Returns how many SK Officials per sub-role exist in a barangay + capacity limits.
 * Limits: 1 Chairperson, 1 Secretary, 1 Treasurer, 7 Kagawad.
 */
router.get(
  '/role-capacity/:barangayId',
  authenticateUser,
  requireRoles('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const barangayId = String(req.params.barangayId || '');
    if (!barangayId) {
      sendError(res, 'Barangay ID is required.', 400);
      return;
    }

    // Fetch all SK Officials for this barangay (role_id 2 or 3)
    const { data: officials, error } = await supabaseAdmin
      .from('users')
      .select('id, email, role_id, status, full_name, first_name, middle_name, last_name, suffix, suspension_reason')
      .eq('tenant_id', barangayId)
      .in('role_id', [2, 3]);

    if (error) {
      sendError(res, 'Failed to load officials: ' + error.message, 500);
      return;
    }

    // Fetch each official's metadata to determine sub-role
    const authList = await supabaseAdmin.auth.admin.listUsers();
    const metaMap: Record<string, any> = {};
    (authList.data?.users || []).forEach((u) => {
      metaMap[u.id] = u.user_metadata || {};
    });

    const activeOnly = (officials || []).filter((o: any) => o.status === 'active');

    let chairperson = 0;
    let secretary = 0;
    let treasurer = 0;
    let kagawad = 0;

    activeOnly.forEach((o: any) => {
      if (o.role_id === 2) {
        chairperson++;
        return;
      }
      const meta = metaMap[o.id] || {};
      const sub = String(meta.official_role || '').toLowerCase();
      if (sub.includes('secretary')) secretary++;
      else if (sub.includes('treasurer')) treasurer++;
      else kagawad++;
    });

    const skRoster = (officials || [])
      .filter((o: any) => o.role_id === 3)
      .map((o: any) => {
        const meta = metaMap[o.id] || {};
        const sub = String(meta.official_role || '').toLowerCase();
        const official_role = sub.includes('secretary') ? 'SK Secretary'
          : sub.includes('treasurer') ? 'SK Treasurer'
          : 'SK Kagawad';
        const row: any = o;
        const composed = [row.first_name, row.middle_name, row.last_name, row.suffix].filter(Boolean).join(' ').trim();
        return {
          id: o.id,
          email: o.email,
          official_role,
          status: o.status,
          full_name: composed || row.full_name || 'Pending Invitation',
        };
      });
    sendSuccess(
      res,
      {
        chairperson: { current: chairperson, limit: 1 },
        secretary:   { current: secretary,   limit: 1 },
        treasurer:   { current: treasurer,   limit: 1 },
        kagawad:     { current: kagawad,     limit: 7 },
        officials: skRoster,
      },
      'Role capacity retrieved.'
    );
  }
);
// POST /api/users/upload-avatar
router.post('/upload-avatar', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const { base64, mime_type } = req.body;
    const normalizedMimeType = typeof mime_type === 'string' ? mime_type.toLowerCase() : '';
    const extensionByMimeType: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const extension = extensionByMimeType[normalizedMimeType];
    if (typeof base64 !== 'string' || !base64 || !extension) {
      sendError(res, 'Upload a JPEG, PNG, or WebP image.', 400);
      return;
    }
    const user = (req as AuthRequest).user!;
    const imageData = base64.replace(/^data:image\/(?:jpeg|png|webp);base64,/i, '');
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(imageData)) {
      sendError(res, 'The uploaded image data is invalid.', 400);
      return;
    }
    const buffer = Buffer.from(imageData, 'base64');
    if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) {
      sendError(res, 'The image must be smaller than 5 MB.', 413);
      return;
    }
    const hasValidSignature =
      (normalizedMimeType === 'image/jpeg' && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
      (normalizedMimeType === 'image/png' && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
      (normalizedMimeType === 'image/webp' && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP');
    if (!hasValidSignature) {
      sendError(res, 'The image contents do not match the selected file type.', 400);
      return;
    }

    const fileName = `${user.id}/${randomUUID()}.${extension}`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from('avatars')
      .upload(fileName, buffer, { contentType: normalizedMimeType, upsert: false });

    if (uploadErr) { sendError(res, 'Failed to upload avatar: ' + uploadErr.message, 500); return; }

    const { data: updatedUser, error: dbErr } = await supabaseAdmin
      .from('users')
      .update({ avatar_url: fileName })
      .eq('id', user.id)
      .select('id')
      .maybeSingle();
    if (dbErr || !updatedUser) {
      const { error: cleanupError } = await supabaseAdmin.storage.from('avatars').remove([fileName]);
      if (cleanupError) console.error('Failed to remove an avatar after its profile update failed:', cleanupError);
      sendError(res, 'Failed to save avatar URL: ' + (dbErr?.message || 'User profile was not updated.'), 500);
      return;
    }

    const avatarUrl = await resolveAvatarUrl(fileName);
    sendSuccess(res, { avatar_url: avatarUrl }, 'Avatar updated successfully.');
  } catch (err: any) {
    sendError(res, err.message || 'Upload failed.', 500);
  }
});


// POST /api/users/acknowledge-warning - Clears the reactivation warning
router.post('/acknowledge-warning', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthRequest).user!;
  const { error } = await supabaseAdmin
    .from('users')
    .update({ suspension_reason: null })
    .eq('id', user.id);
  if (error) { sendError(res, error.message, 500); return; }
  sendSuccess(res, null, 'Warning acknowledged.');
});
export default router;
// PATCH /api/users/:id/status - Admin updates user status (e.g., active, suspended)
router.patch(
  '/:id/status',
  authenticateUser,
  requireActiveUser,
  requireRoles('BARANGAY_ADMIN', 'SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const targetId = String(req.params.id);
      const { status } = req.body;
      
      if (!['active', 'suspended', 'pending', 'rejected'].includes(status)) {
        sendError(res, 'Invalid status value.', 400);
        return;
      }

      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === 'active') {
        updates.suspension_reason = 'Your account was recently reactivated. Please review the community guidelines.'; // Clear the reason upon reactivation
      }

      // C1: Cross-tenant guard - Barangay Admins may only modify users in own barangay
      {
        const callerRole = (req as any).user?.role;
        const callerTenant = (req as any).user?.tenant_id;
        if (callerRole !== 'SUPER_ADMIN') {
          const { data: targetRow } = await supabaseAdmin
            .from('users')
            .select('tenant_id')
            .eq('id', targetId)
            .maybeSingle();
          if (!targetRow) { sendError(res, 'User not found.', 404); return; }
          if (targetRow.tenant_id !== callerTenant) {
            sendError(res, 'Forbidden: cannot modify users outside your barangay.', 403);
            return;
          }
        }
      }

      const { error } = await supabaseAdmin.from('users').update(updates).eq('id', targetId);

      // Force verification status update when approving
      if (status === 'active') {
        await supabaseAdmin.from('resident_profile').update({ verification_status: 'verified' }).eq('user_id', targetId);
      }

      if (!error && status === 'active') {
        // Force update verification status to prevent 'pending verification' banner
        await supabaseAdmin
          .from('resident_profile')
          .update({ verification_status: 'verified', verification_reviewed_at: new Date().toISOString() })
          .eq('user_id', targetId);
      }
      
  if (error) {
    sendError(res, "Failed to update user status: ${error.message}", 500);
    return;
  }

      // If reactivating, also update auth metadata if needed
      if (status === 'active') {
        await supabaseAdmin.auth.admin.updateUserById(targetId, { ban_duration: 'none' });
      }

      sendSuccess(res, { id: targetId, status }, `User status updated to ${status}.`);
    } catch (err: any) {
      sendError(res, err.message || 'Internal server error', 500);
    }
  }
);

// GET /api/users/suspended - Fetch all suspended users (Chairperson only)
router.get('/suspended', authenticateUser, requireActiveUser, requireRoles('BARANGAY_ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as AuthRequest).user!;
    let query = supabaseAdmin.from('users').select('id, email, full_name, status, suspension_reason, tenant_id').eq('status', 'suspended');
    
    if (user.role !== 'SUPER_ADMIN') {
      query = query.eq('tenant_id', user.tenant_id);
    }
    
    const { data, error } = await query;
    if (error) { sendError(res, error.message, 500); return; }
    sendSuccess(res, data || [], 'Suspended users retrieved.');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
});

router.patch('/:id/status', authenticateUser, requireActiveUser, requireRoles('BARANGAY_ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (status === 'active') updates.suspension_reason = null;
      // C1: Cross-tenant guard - Barangay Admins may only modify users in own barangay
      {
        const callerRole = (req as any).user?.role;
        const callerTenant = (req as any).user?.tenant_id;
        if (callerRole !== 'SUPER_ADMIN') {
          const targetId = String(req.params.id);
          const { data: targetRow } = await supabaseAdmin
            .from('users')
            .select('tenant_id')
            .eq('id', targetId)
            .maybeSingle();
          if (!targetRow) { sendError(res, 'User not found.', 404); return; }
          if (targetRow.tenant_id !== callerTenant) {
            sendError(res, 'Forbidden: cannot modify users outside your barangay.', 403);
            return;
          }
        }
      }

    const { error } = await supabaseAdmin.from('users').update(updates).eq('id', String(req.params.id));
    if (error) { sendError(res, error.message, 500); return; }
    sendSuccess(res, { id: req.params.id, status }, 'Status updated.');
  } catch (err: any) { sendError(res, err.message, 500); }
});

// Helper to send emails via Resend API (or any standard HTTP email provider)
async function sendEmail(to: string, subject: string, html: string) {
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY || '',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'KABISIG',
          email: process.env.BREVO_SENDER_EMAIL || 'noreply@kabisig.com',
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.warn('Brevo email failed:', errorData);
    }
  } catch (err) {
    console.warn('Email delivery failed (network):', err);
  }
}


/**
 * GET /api/users/youth-directory
 * Returns a list of youths in the same barangay (for the Youth Directory)
 */
router.get(
  '/youth-directory',
  authenticateUser,
  requireActiveUser,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthRequest).user!;
    if (!user.tenant_id) {
      sendError(res, 'User has no assigned Barangay.', 400);
      return;
    }

    // Fetch users in the same tenant
    const { data: users, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email')
      .eq('tenant_id', user.tenant_id)
      .eq('role_id', 4) // Only Youths
      .eq('status', 'active');

    if (userErr) {
      sendError(res, 'Failed to load directory: ' + userErr.message, 500);
      return;
    }

    // Fetch zones for these users
    const userIds = users.map(u => u.id);
    const { data: profiles } = await supabaseAdmin
      .from('resident_profile')
      .select('user_id, zone')
      .in('user_id', userIds);

    const zoneMap = new Map(profiles?.map(p => [p.user_id, p.zone]) || []);

    // Fetch program registrations for these users
    const { data: registrations } = await supabaseAdmin
      .from('program_registrations')
      .select('user_id, program:program_id(title)')
      .in('user_id', userIds);

    const programMap = new Map<string, string[]>();
    registrations?.forEach((r: any) => {
      if (!programMap.has(r.user_id)) programMap.set(r.user_id, []);
      // Handle both object and array returns from Supabase
      const title = r.program?.title || (Array.isArray(r.program) ? r.program[0]?.title : null);
      if (title) programMap.get(r.user_id)!.push(title);
    });

    // Format the data
    const formatted = users.map((u: any) => ({
      id: u.id,
      name: u.full_name,
      email: u.email || 'N/A',
      zone: zoneMap.get(u.id) || 'N/A',
      programs: programMap.get(u.id) || [],
    }));

    sendSuccess(res, formatted, 'Directory retrieved.');
  }
);
