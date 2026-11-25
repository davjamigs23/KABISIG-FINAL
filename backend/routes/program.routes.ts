import express from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin, canAccessTenant, recordAuditLog } from '../services/supabase.service.js';
import { resolveAvatarUrl } from '../services/avatar.service.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { authenticateUser, optionalAuthenticateUser, requireActiveUser, requireRoles } from '../middleware/auth.js';
import type { AuthRequest } from '../types/database.types.js';
import { sendEmail } from '../utils/email.js';

const router = express.Router();

const CreateProgramSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  category: z.string().min(2, 'Category is required'),
  location: z.string().min(2, 'Location is required'),
  start_date: z.string().datetime({ message: 'Valid ISO start date required' }),
  end_date: z.string().datetime({ message: 'Valid ISO end date required' }),
  total_slots: z.number().int().min(1, 'Total slots must be at least 1').default(50),
  budget_allocation: z.number().min(0).default(0),
  aip_reference: z.string().trim().max(100).optional(),
  status: z.enum(['draft', 'upcoming', 'ongoing', 'completed', 'cancelled']).default('upcoming'),
  override: z.boolean().optional(),
});

const UpdateProgramSchema = CreateProgramSchema.partial().extend({
  image_base64: z.string().nullable().optional(),
  image_mime_type: z.string().nullable().optional(),
});

const AttendanceScanSchema = z.object({
  qr_payload: z.string().min(1, 'QR payload or digital ID is required'),
});

const ACTIVE_PROGRAM_STATUSES = ['upcoming', 'ongoing'];

function getAge(birthdate: string): number {
  const date = new Date(birthdate);
  if (Number.isNaN(date.getTime())) return -1;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  if (today.getMonth() < date.getMonth()
    || (today.getMonth() === date.getMonth() && today.getDate() < date.getDate())) age -= 1;
  return age;
}

async function findOverlappingProgram(
  tenantId: string,
  startDate: string,
  endDate: string,
  excludeProgramId?: string
) {
  let query = supabaseAdmin
    .from('program')
    .select('id, tenant_id, start_date, end_date, status')
    .eq('tenant_id', tenantId)
    .in('status', ACTIVE_PROGRAM_STATUSES)
    .lte('start_date', endDate)
    .gte('end_date', startDate);

  if (excludeProgramId !== undefined) {
    query = query.neq('id', excludeProgramId);
  }

  const result = await query.limit(1).maybeSingle();
  if (result.error) {
    console.error('Failed to check for overlapping programs.', {
      tenantId,
      startDate,
      endDate,
      excludeProgramId,
      error: result.error.message,
    });
  } else if (result.data) {
    console.warn('Program date overlap detected.', {
      program_id: result.data.id,
      conflict_start_date: result.data.start_date,
      conflict_end_date: result.data.end_date,
      tenant_id: result.data.tenant_id,
      status: result.data.status,
      excludeProgramId,
      requested_start_date: startDate,
      requested_end_date: endDate,
    });
  }
  return result;
}

router.get('/', optionalAuthenticateUser, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthRequest).user;
  const { category, status, tenant_id } = req.query;

  let query = supabaseAdmin
    .from('program')
    .select('*, barangay(name), program_registrations(count)', { count: 'exact' });
  query = query.neq('program_registrations.status', 'cancelled');

  if (user && user.role !== 'SUPER_ADMIN') {
    if (!user.tenant_id) {
      sendError(res, 'User has no assigned Barangay tenant.', 403);
      return;
    }
    query = query.eq('tenant_id', user.tenant_id);
  } else {
    if (!user) {
      query = query.in('status', ['upcoming', 'ongoing', 'completed']);
    }
    if (tenant_id && typeof tenant_id === 'string') {
      query = query.eq('tenant_id', tenant_id);
    }
  }

  if (category && typeof category === 'string') {
    query = query.eq('category', category);
  }

  if (status && typeof status === 'string') {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('start_date', { ascending: true });

  if (error) {
    sendError(res, `Failed to retrieve programs: ${error.message}`, 500);
    return;
  }

  sendSuccess(res, data, 'Programs retrieved successfully.');
});

// Self-service: registration results are always filtered by the authenticated user's ID.
router.get('/registrations/mine', authenticateUser, requireActiveUser, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthRequest).user!;
  const { data, error } = await supabaseAdmin
    .from('program_registrations')
    .select('id, program_id, tenant_id, status, registered_at, program(title)')
    .eq('user_id', user.id)
    .neq('status', 'cancelled')
    .order('registered_at', { ascending: false });

  if (error) {
    sendError(res, `Failed to retrieve your program registrations: ${error.message}`, 500);
    return;
  }

  sendSuccess(res, data || [], 'Your program registrations were retrieved successfully.');
});

// Authenticated tenant read; access to the loaded program is checked with canAccessTenant.
router.get('/:id', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id || '');
  const user = (req as AuthRequest).user!;

  const { data: program, error } = await supabaseAdmin
    .from('program')
    .select('*, barangay(name)')
    .eq('id', id)
    .single();

  if (error || !program) {
    sendError(res, 'Program not found.', 404);
    return;
  }

  if (!canAccessTenant(user, program.tenant_id)) {
    sendError(res, 'Forbidden: You cannot access programs outside your assigned Barangay.', 403);
    return;
  }

  const { count: registeredCount } = await supabaseAdmin
    .from('program_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('program_id', id)
    .neq('status', 'cancelled');

  const { data: userReg } = await supabaseAdmin
    .from('program_registrations')
    .select('id, status, registered_at')
    .eq('program_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  const totalRegistered = registeredCount || 0;
  const availableSlots = Math.max(0, program.total_slots - totalRegistered);

  sendSuccess(
    res,
    {
      ...program,
      registered_count: totalRegistered,
      available_slots: availableSlots,
      is_full: totalRegistered >= program.total_slots,
      my_registration: userReg || null,
    },
    'Program details retrieved.'
  );
});

router.get(
  '/:id/registrations',
  authenticateUser,
  requireActiveUser,
  requireRoles('BARANGAY_ADMIN', 'SK_OFFICIAL', 'SUPER_ADMIN', 'YOUTH_CONSTITUENT'),
  async (req: Request, res: Response): Promise<void> => {
    const programId = String(req.params.id || '');
    const user = (req as AuthRequest).user!;
    const { data: program, error: programError } = await supabaseAdmin
      .from('program')
      .select('id, tenant_id')
      .eq('id', programId)
      .single();

    if (programError || !program) {
      sendError(res, 'Program not found.', 404);
      return;
    }
    if (!canAccessTenant(user, program.tenant_id)) {
      sendError(res, 'Forbidden: You cannot view registrations for another Barangay.', 403);
      return;
    }

    const registrationsQuery = supabaseAdmin
      .from('program_registrations')
      .select(
        user.role === 'YOUTH_CONSTITUENT'
          ? 'users!user_id(full_name, avatar_url)'
          : 'id, program_id, user_id, tenant_id, status, registered_at, users!user_id(full_name, email, phone, resident_profile!resident_profile_user_id_fkey(zone))'
      )
      .eq('program_id', programId)
      .neq('status', 'cancelled')
      .order('registered_at', { ascending: true });
    const { data, error } = await registrationsQuery;

    if (error) {
      sendError(res, `Failed to retrieve program registrations: ${error.message}`, 500);
      return;
    }
    const registrations = user.role === 'YOUTH_CONSTITUENT'
      ? await Promise.all((data || []).map(async (registration: any) => {
          const participants = registration.users;
          if (Array.isArray(participants)) {
            return {
              ...registration,
              users: await Promise.all(participants.map(async (participant: any) => ({
                ...participant,
                avatar_url: await resolveAvatarUrl(participant.avatar_url),
              }))),
            };
          }
          return {
            ...registration,
            users: participants
              ? { ...participants, avatar_url: await resolveAvatarUrl(participants.avatar_url) }
              : participants,
          };
        }))
      : data || [];
    sendSuccess(res, registrations, 'Program registrations retrieved successfully.');
  }
);

router.post(
  '/',
  authenticateUser,
  requireActiveUser,
  requireRoles('BARANGAY_ADMIN', 'SK_OFFICIAL', 'SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parseResult = CreateProgramSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
      return;
    }

    const user = (req as AuthRequest).user!;

    // --- PUBMAT UPLOAD LOGIC ---
    let imageUrl: string | null = null;
    if (req.body.image_base64 && req.body.image_mime_type) {
      try {
        const buffer = Buffer.from(req.body.image_base64, 'base64');
        const ext = req.body.image_mime_type.split('/')[1] || 'png';
        const fileName = user.tenant_id + '/' + Date.now() + '_pubmat.' + ext;
        const { error: uploadErr } = await supabaseAdmin.storage.from('program-pubmats').upload(fileName, buffer, { contentType: req.body.image_mime_type, upsert: true });
        if (!uploadErr) {
          const { data: urlData } = supabaseAdmin.storage.from('program-pubmats').getPublicUrl(fileName);
          imageUrl = urlData.publicUrl;
        }
      } catch (err) { console.error('Pubmat upload error:', err); }
    }
    // --- END PUBMAT UPLOAD ---
    const { override, ...programData } = parseResult.data;

    const tenantId = user.tenant_id;
    if (!tenantId) {
      sendError(res, 'User has no assigned Barangay tenant.', 400);
      return;
    }

    if (new Date(programData.end_date) < new Date(programData.start_date)) {
      sendError(res, 'End date cannot be prior to start date.', 400);
      return;
    }

    if (ACTIVE_PROGRAM_STATUSES.includes(programData.status) && !override) {
      const { data: overlappingProgram, error: overlapError } = await findOverlappingProgram(
        tenantId,
        programData.start_date,
        programData.end_date
      );
      if (overlapError) {
        sendError(res, `Failed to check for overlapping programs: ${overlapError.message}`, 500);
        return;
      }
      if (overlappingProgram) {
        sendError(res, 'Program dates overlap with another active program in this Barangay.', 409);
        return;
      }
    }

    const { data: newProgram, error } = await supabaseAdmin
      .from('program')
      .insert([
        {
          ...programData,
          image_url: imageUrl,
          tenant_id: tenantId,
          created_by: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      sendError(res, `Failed to create program: ${error.message}`, 500);
      return;
    }

    await recordAuditLog({
      tenantId,
      userId: user.id,
      action: 'CREATE_PROGRAM',
      entityName: 'program',
      entityId: newProgram.id,
      details: { title: newProgram.title, slots: newProgram.total_slots },
      ipAddress: req.ip || null,
    });

    sendCreated(res, newProgram, 'Program successfully scheduled and created.');
  }
);

router.put(
  '/:id',
  authenticateUser,
  requireActiveUser,
  requireRoles('BARANGAY_ADMIN', 'SK_OFFICIAL', 'SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id || '');
    const user = (req as AuthRequest).user!;

    const parseResult = UpdateProgramSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
      return;
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('program')
      .select('id, tenant_id, start_date, end_date, status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      sendError(res, 'Program not found.', 404);
      return;
    }

    if (!canAccessTenant(user, existing.tenant_id)) {
      sendError(res, 'Forbidden: You cannot modify programs from another Barangay.', 403);
      return;
    }

    const { override, image_base64, image_mime_type, ...updateFields } = parseResult.data;
    if (Boolean(image_base64) !== Boolean(image_mime_type)) {
      sendError(res, 'Both program image data and image MIME type are required.', 400);
      return;
    }

    let imageUrl: string | undefined;
    if (image_base64 && image_mime_type) {
      const buffer = Buffer.from(image_base64, 'base64');
      const ext = image_mime_type.split('/')[1] || 'png';
      const fileName = `${existing.tenant_id}/${Date.now()}_pubmat.${ext}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from('program-pubmats')
        .upload(fileName, buffer, { contentType: image_mime_type, upsert: true });

      if (uploadError) {
        sendError(res, `Failed to upload program image: ${uploadError.message}`, 500);
        return;
      }

      const { data: urlData } = supabaseAdmin.storage.from('program-pubmats').getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;
    }
    const updatedStartDate = updateFields.start_date || existing.start_date;
    const updatedEndDate = updateFields.end_date || existing.end_date;
    const updatedStatus = updateFields.status || existing.status;
    if (new Date(updatedEndDate) < new Date(updatedStartDate)) {
      sendError(res, 'End date cannot be prior to start date.', 400);
      return;
    }

    if (ACTIVE_PROGRAM_STATUSES.includes(updatedStatus) && !override) {
      const { data: overlappingProgram, error: overlapError } = await findOverlappingProgram(
        existing.tenant_id,
        updatedStartDate,
        updatedEndDate,
        existing.id
      );
      if (overlapError) {
        sendError(res, `Failed to check for overlapping programs: ${overlapError.message}`, 500);
        return;
      }
      if (overlappingProgram) {
        sendError(res, 'Program dates overlap with another active program in this Barangay.', 409);
        return;
      }
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('program')
      .update({
        ...updateFields,
        ...(imageUrl ? { image_url: imageUrl } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      sendError(res, `Failed to update program: ${updateError.message}`, 500);
      return;
    }

    sendSuccess(res, updated, 'Program updated successfully.');
  }
);

router.delete(
  '/:id',
  authenticateUser,
  requireActiveUser,
  requireRoles('BARANGAY_ADMIN', 'SK_OFFICIAL', 'SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id || '');
    const user = (req as AuthRequest).user!;

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('program')
      .select('id, tenant_id, title')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      sendError(res, 'Program not found.', 404);
      return;
    }

    if (!canAccessTenant(user, existing.tenant_id)) {
      sendError(res, 'Forbidden: Cannot delete program from another Barangay.', 403);
      return;
    }

    const { data: relatedBudgets, error: budgetLookupError } = await supabaseAdmin
      .from('budget')
      .select('id')
      .eq('tenant_id', existing.tenant_id)
      .eq('program_id', id);
    if (budgetLookupError) {
      sendError(res, `Failed to find program budget allocations: ${budgetLookupError.message}`, 500);
      return;
    }

    const budgetIds = (relatedBudgets || []).map((budget) => budget.id);
    const { error: programExpenseDeleteError } = await supabaseAdmin
      .from('expense')
      .delete()
      .eq('tenant_id', existing.tenant_id)
      .eq('program_id', id);
    if (programExpenseDeleteError) {
      sendError(res, `Failed to delete program expenses: ${programExpenseDeleteError.message}`, 500);
      return;
    }

    if (budgetIds.length > 0) {
      const { error: budgetExpenseDeleteError } = await supabaseAdmin
        .from('expense')
        .delete()
        .eq('tenant_id', existing.tenant_id)
        .in('budget_id', budgetIds);
      if (budgetExpenseDeleteError) {
        sendError(res, `Failed to delete expenses linked to program budgets: ${budgetExpenseDeleteError.message}`, 500);
        return;
      }

      const { error: budgetDeleteError } = await supabaseAdmin
        .from('budget')
        .delete()
        .eq('tenant_id', existing.tenant_id)
        .in('id', budgetIds);
      if (budgetDeleteError) {
        sendError(res, `Failed to delete program budget allocations: ${budgetDeleteError.message}`, 500);
        return;
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from('program')
      .delete()
      .eq('tenant_id', existing.tenant_id)
      .eq('id', id);

    if (deleteError) {
      sendError(res, `Failed to delete program: ${deleteError.message}`, 500);
      return;
    }

    await recordAuditLog({
      tenantId: existing.tenant_id,
      userId: user.id,
      action: 'DELETE_PROGRAM',
      entityName: 'program',
      entityId: id,
      details: { title: existing.title },
      ipAddress: req.ip || null,
    });

    sendSuccess(res, null, 'Program deleted successfully.');
  }
);

// Self-service registration; the profile and registration are tied to the authenticated user.
router.post(
  '/:id/register',
  authenticateUser,
  requireActiveUser,
  async (req: Request, res: Response): Promise<void> => {
    const programId = String(req.params.id || '');
    const user = (req as AuthRequest).user!;

    if (Number(user.role_id) !== 4) {
      sendError(res, 'Only Youth Constituents can register for programs.', 403);
      return;
    }

    // STRICT CHECK: Block pending users from registering
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('resident_profile')
      .select('verification_status, birthdate')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profileError) {
      sendError(res, `Could not verify your youth profile: ${profileError.message}`, 500);
      return;
    }
    if (!profile || profile.verification_status?.toLowerCase() !== 'verified') {
      sendError(res, 'Your uploaded ID is currently under review. You will be able to register once the SK Chairperson approves it.', 403);
      return;
    }
    const age = profile.birthdate ? getAge(profile.birthdate) : -1;
    if (age < 15 || age > 30) {
      sendError(res, 'Youth Constituents must be 15 to 30 years old to register for new programs.', 403, {
        code: 'YOUTH_AGE_OUT',
        age: age >= 0 ? age : null,
      });
      return;
    }

    const { data: program, error: progError } = await supabaseAdmin
      .from('program')
      .select('id, title, tenant_id, total_slots, status, end_date')
      .eq('id', programId)
      .single();

    if (progError || !program) {
      sendError(res, 'Program not found.', 404);
      return;
    }

    if (program.status === 'cancelled' || program.status === 'completed') {
      sendError(res, `Cannot register: Program is currently '${program.status}'.`, 400);
      return;
    }

    if (program.end_date) {
      const endDate = new Date(program.end_date);
      endDate.setHours(23, 59, 59, 999);
      if (endDate < new Date()) {
        sendError(res, `Cannot register: This program ended on ${program.end_date}.`, 400, { code: 'PROGRAM_ENDED', end_date: program.end_date });
        return;
      }
    }

    if (!canAccessTenant(user, program.tenant_id)) {
      sendError(res, 'You can only register for programs organized by your registered Barangay.', 403);
      return;
    }

    const { data: existingReg } = await supabaseAdmin
      .from('program_registrations')
      .select('id, status')
      .eq('program_id', programId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingReg && existingReg.status !== 'cancelled') {
      sendError(res, `You are already registered for this program (Status: ${existingReg.status}).`, 409);
      return;
    }

    const { count: currentCount } = await supabaseAdmin
      .from('program_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('program_id', programId)
      .neq('status', 'cancelled');

    const totalActiveRegistrations = currentCount || 0;

    if (totalActiveRegistrations >= program.total_slots) {
      // Notify the youth that this program is full
      const { error: programFullNotifErr } = await supabaseAdmin.from('notifications').insert([
        {
          tenant_id: program.tenant_id,
          user_id: user.id,
          title: 'Program Slot Limit Reached',
          message: 'The program "' + program.title + '" is already full (' + program.total_slots + '/' + program.total_slots + ' slots filled). You can register for other programs from your dashboard.',
          notification_type: 'PROGRAM_FULL',
          link: '/programs',
          is_read: false,
        },
      ]);
      if (programFullNotifErr) { console.warn('Program-full notification failed:', programFullNotifErr.message); }

      sendError(
        res,
        `Registration full: All ${program.total_slots} slots for "${program.title}" have already been filled.`,
        422,
        { total_slots: program.total_slots, current_registrations: totalActiveRegistrations }
      );
      return;
    }

    const { data: newReg, error: regError } = await supabaseAdmin
      .from('program_registrations')
      .insert([
        {
          program_id: programId,
          user_id: user.id,
          tenant_id: program.tenant_id,
          status: 'registered',
        },
      ])
      .select()
      .single();

    if (regError) {
      sendError(res, `Registration failed: ${regError.message}`, 500);
      return;
    }

    sendCreated(
      res,
      {
        registration: newReg,
        program_title: program.title,
        slot_number: totalActiveRegistrations + 1,
        total_slots: program.total_slots,
      },
      `Successfully registered for ${program.title}!`
    );
  }
);

router.post('/:id/attendance', authenticateUser, requireActiveUser, requireRoles('BARANGAY_ADMIN', 'SK_OFFICIAL', 'SUPER_ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const programId = String(req.params.id);
    const user = (req as AuthRequest).user!;
    const requestedProgramId = typeof req.body?.program_id === 'string' ? req.body.program_id.trim() : '';
    if (requestedProgramId && requestedProgramId !== programId) {
      sendError(res, 'Selected program does not match the attendance request.', 400);
      return;
    }
    const qrPayload = typeof req.body?.qr_payload === 'string' ? req.body.qr_payload.trim() : '';
    const directUserId = typeof req.body?.userId === 'string'
      ? req.body.userId.trim()
      : typeof req.body?.user_id === 'string'
        ? req.body.user_id.trim()
        : '';
    const scanValue = qrPayload || directUserId;
    if (!scanValue) { sendError(res, 'A QR payload or user ID is required.', 400); return; }

    let attendeeUserId = directUserId;
    let digitalYouthId = '';

    try {
      const parsedJson = JSON.parse(scanValue);
      attendeeUserId = parsedJson.user_id || parsedJson.userId || parsedJson.id || attendeeUserId;
      digitalYouthId = parsedJson.digital_youth_id || parsedJson.digitalYouthId || '';
    } catch {
      if (scanValue.startsWith('KABISIG-QR-')) {
        const idMatch = scanValue.match(/(?:KAB-NAGA-|(?:KK|SK)-\d{4}-)/i);
        if (idMatch?.index !== undefined) digitalYouthId = scanValue.substring(idMatch.index);
        else attendeeUserId = scanValue;
      } else if (/^(?:KAB-NAGA-|(?:KK|SK)-\d{4}-)/i.test(scanValue)) {
        digitalYouthId = scanValue;
      } else {
        attendeeUserId = scanValue;
      }
    }

    const { data: program, error: progError } = await supabaseAdmin
      .from('program')
      .select('*')
      .eq('id', programId)
      .single();
    if (progError || !program) { sendError(res, 'Program not found.', 404); return; }
    if (!canAccessTenant(user, program.tenant_id)) { sendError(res, 'Forbidden.', 403); return; }

    let resolvedUserId = attendeeUserId;

    if (!resolvedUserId && digitalYouthId) {
      const { data: rp } = await supabaseAdmin
        .from('resident_profile')
        .select('user_id')
        .eq('digital_youth_id', digitalYouthId)
        .eq('tenant_id', program.tenant_id)
        .maybeSingle();
      if (rp) resolvedUserId = rp.user_id;
    }

    if (!resolvedUserId) {
      sendError(res, 'Invalid QR code: Could not find user.', 404);
      return;
    }

    if (program.end_date && new Date(program.end_date) < new Date()) {
      sendError(res, `Attendance blocked: this program ended on ${program.end_date}.`, 400, { code: 'PROGRAM_ENDED', end_date: program.end_date });
      return;
    }

    const { data: uData } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email')
      .eq('id', resolvedUserId)
      .eq('tenant_id', program.tenant_id)
      .maybeSingle();
    if (!uData) {
      sendError(res, 'Participant not found in this Barangay.', 404);
      return;
    }
    const attendeeName = uData.full_name || 'Youth Constituent';

    const { data: existingAttendance, error: existingAttendanceError } = await supabaseAdmin
      .from('program_attendance')
      .select('id')
      .eq('program_id', programId)
      .eq('tenant_id', program.tenant_id)
      .eq('user_id', resolvedUserId)
      .maybeSingle();
    if (existingAttendanceError) {
      sendError(res, `Failed to check existing attendance: ${existingAttendanceError.message}`, 500);
      return;
    }
    if (existingAttendance) {
      sendError(res, 'Already marked present', 400, { attendee_name: attendeeName });
      return;
    }

    const { data: registration } = await supabaseAdmin
      .from('program_registrations')
      .select('id, status')
      .eq('program_id', programId)
      .eq('tenant_id', program.tenant_id)
      .eq('user_id', resolvedUserId)
      .maybeSingle();
    if (!registration) {
      sendError(res, `Error: ${attendeeName} is not registered for this specific program.`, 400, { attendee_name: attendeeName, reason: 'not_registered' });
      return;
    }

    const checkInTime = new Date().toISOString();
    const { data: newAttendance, error: attendError } = await supabaseAdmin.from('program_attendance').insert([{
      program_id: programId,
      user_id: resolvedUserId,
      tenant_id: program.tenant_id,
      checked_in_at: checkInTime,
      checked_in_by: user.id,
      qr_payload: qrPayload || scanValue || null,
    }]).select().single();

    if (attendError) {
      if (attendError.code === '23505') {
        sendError(res, 'Already marked present', 400, { attendee_name: attendeeName });
        return;
      }
      sendError(res, `Failed to record attendance: ${attendError.message}`, 500);
      return;
    }

    await supabaseAdmin.from('program_registrations').update({ status: 'attended' }).eq('id', registration.id);

    if (uData?.email) {
      const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] || character);
      let scannerName = user.full_name?.trim() || '';
      if (!scannerName) {
        try {
          const { data: scannerUser, error: scannerLookupError } = await supabaseAdmin
            .from('users')
            .select('full_name, email')
            .eq('id', user.id)
            .maybeSingle();
          if (scannerLookupError) {
            console.error(`Could not load scanner name for user ${user.id}:`, scannerLookupError.message);
          }
          scannerName = scannerUser?.full_name?.trim() || scannerUser?.email?.trim() || user.email || 'SK Official';
        } catch (scannerLookupError) {
          console.error(`Could not load scanner name for user ${user.id}:`, scannerLookupError);
          scannerName = user.email || 'SK Official';
        }
      }

      try {
        await sendEmail(
          uData.email,
          `Attendance confirmed: ${program.title}`,
          `
          <!DOCTYPE html>
          <html>
          <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: Arial, sans-serif;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 0;">
                  <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="background-color: #091d64; padding: 24px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px;">KABISIG</h1>
                        <p style="color: #93c5fd; margin: 4px 0 0 0; font-size: 12px;">Kabataang Bagong Sistema para sa Inklusibong Gobyerno</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 32px;">
                        <div style="text-align: center; margin-bottom: 24px;">
                          <div style="display: inline-block; background-color: #dcfce7; color: #166534; font-weight: bold; padding: 8px 16px; border-radius: 9999px; font-size: 14px; border: 1px solid #86efac;">
                            ✅ Attendance Confirmed
                          </div>
                        </div>
                        <p style="color: #334155; font-size: 16px; margin: 0 0 8px 0;">Hello <strong>${escapeHtml(attendeeName)}</strong>,</p>
                        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                          Your attendance has been successfully recorded. You are now marked as <strong>Present</strong> for the following program.
                        </p>
                        <table role="presentation" style="width: 100%; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                          <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase;">Program</td>
                            <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: bold; text-align: right;">${escapeHtml(program.title)}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase;">Date &amp; Time</td>
                            <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: bold; text-align: right;">${escapeHtml(new Date(checkInTime).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }))}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase;">Scanned By</td>
                            <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: bold; text-align: right;">${escapeHtml(scannerName)}</td>
                          </tr>
                        </table>
                        <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">
                          If you believe this is an error, please contact your Sangguniang Kabataan Chairperson or the SK Official who scanned your ID.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} KABISIG. All rights reserved.</p>
                        <p style="color: #94a3b8; font-size: 11px; margin: 4px 0 0 0;">Naga City, Philippines</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
          `
        );
      } catch (emailError) {
        console.error(`Attendance confirmation email failed for user ${resolvedUserId}:`, emailError);
      }
    }

    sendSuccess(res, {
      attendance: newAttendance,
      attendee_name: attendeeName,
      program_title: program.title,
      checked_in_at: checkInTime,
    }, `Attendance verified and recorded for ${attendeeName}.`);

  } catch (err: any) {
    sendError(res, err.message || 'Internal server error', 500);
  }
});
router.get(
  '/:id/attendance',
  authenticateUser,
  requireActiveUser,
  requireRoles('BARANGAY_ADMIN', 'SK_OFFICIAL', 'SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const programId = String(req.params.id || '');
    const user = (req as AuthRequest).user!;
    const { data: program, error: programError } = await supabaseAdmin
      .from('program')
      .select('id, tenant_id')
      .eq('id', programId)
      .single();

    if (programError || !program) {
      sendError(res, 'Program not found.', 404);
      return;
    }
    if (!canAccessTenant(user, program.tenant_id)) {
      sendError(res, 'Forbidden: You cannot view attendance for another Barangay.', 403);
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('program_attendance')
      .select('id, program_id, user_id, tenant_id, checked_in_at, qr_payload, users!user_id(full_name)')
      .eq('program_id', programId)
      .order('checked_in_at', { ascending: false });

    if (error) {
      sendError(res, `Failed to retrieve program attendance: ${error.message}`, 500);
      return;
    }

    sendSuccess(res, data || [], 'Program attendance retrieved successfully.');
  }
);

export default router;
