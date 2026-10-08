import express from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin, canAccessTenant, recordAuditLog } from '../services/supabase.service.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { authenticateUser, optionalAuthenticateUser, requireActiveUser, requireRoles } from '../middleware/auth.js';
import type { AuthRequest } from '../types/database.types.js';

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
});

const UpdateProgramSchema = CreateProgramSchema.partial();

const AttendanceScanSchema = z.object({
  qr_payload: z.string().min(1, 'QR payload or digital ID is required'),
});

router.get('/', optionalAuthenticateUser, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthRequest).user;
  const { category, status, tenant_id } = req.query;

  let query = supabaseAdmin
    .from('program')
    .select('*, barangay(name), program_registrations(count)', { count: 'exact' });

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
      sendError(res, 'Forbidden: You cannot view registrations for another Barangay.', 403);
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('program_registrations')
      .select('id, program_id, user_id, tenant_id, status, registered_at, users(full_name, email)')
      .eq('program_id', programId)
      .neq('status', 'cancelled')
      .order('registered_at', { ascending: true });

    if (error) {
      sendError(res, `Failed to retrieve program registrations: ${error.message}`, 500);
      return;
    }
    sendSuccess(res, data || [], 'Program registrations retrieved successfully.');
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
    const programData = parseResult.data;

    const tenantId = user.tenant_id;
    if (!tenantId) {
      sendError(res, 'User has no assigned Barangay tenant.', 400);
      return;
    }

    if (new Date(programData.end_date) < new Date(programData.start_date)) {
      sendError(res, 'End date cannot be prior to start date.', 400);
      return;
    }

    const { data: newProgram, error } = await supabaseAdmin
      .from('program')
      .insert([
        {
          ...programData,
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
      .select('id, tenant_id')
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

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('program')
      .update({
        ...parseResult.data,
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
  requireRoles('BARANGAY_ADMIN', 'SUPER_ADMIN'),
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

    const { error: deleteError } = await supabaseAdmin.from('program').delete().eq('id', id);

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

router.post(
  '/:id/register',
  authenticateUser,
  requireActiveUser,
  async (req: Request, res: Response): Promise<void> => {
    const programId = String(req.params.id || '');
    const user = (req as AuthRequest).user!;

    const { data: program, error: progError } = await supabaseAdmin
      .from('program')
      .select('id, title, tenant_id, total_slots, status')
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

router.post(
  '/:id/attendance',
  authenticateUser,
  requireActiveUser,
  requireRoles('BARANGAY_ADMIN', 'SK_OFFICIAL', 'SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const programId = String(req.params.id || '');
    const scanner = (req as AuthRequest).user!;

    const parseResult = AttendanceScanSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
      return;
    }

    const { qr_payload } = parseResult.data;

    const { data: program, error: progError } = await supabaseAdmin
      .from('program')
      .select('id, title, tenant_id')
      .eq('id', programId)
      .single();

    if (progError || !program) {
      sendError(res, 'Program not found.', 404);
      return;
    }

    if (!canAccessTenant(scanner, program.tenant_id)) {
      sendError(res, 'Forbidden: You cannot record attendance for other Barangays.', 403);
      return;
    }

    let attendeeUserId: string | null = null;
    let digitalYouthId: string | null = null;

    try {
      const parsedJson = JSON.parse(qr_payload);
      attendeeUserId = parsedJson.user_id || null;
      digitalYouthId = parsedJson.digital_youth_id || null;
    } catch {
      if (qr_payload.startsWith('KAB-NAGA-')) {
        digitalYouthId = qr_payload;
      } else {
        attendeeUserId = qr_payload;
      }
    }

    let residentQuery = supabaseAdmin.from('resident_profile').select('user_id, digital_youth_id, users(full_name, email)');

    if (attendeeUserId) {
      residentQuery = residentQuery.eq('user_id', attendeeUserId);
    } else if (digitalYouthId) {
      residentQuery = residentQuery.eq('digital_youth_id', digitalYouthId);
    }

    const { data: resident, error: resError } = await residentQuery.maybeSingle();

    if (resError || !resident) {
      sendError(res, 'Invalid QR code: Attendee profile could not be verified.', 404);
      return;
    }

    const resolvedUserId = resident.user_id;
    const attendeeUser = resident.users as unknown as { full_name: string; email: string } | { full_name: string; email: string }[] | null;
    const attendeeName = (Array.isArray(attendeeUser) ? attendeeUser[0]?.full_name : attendeeUser?.full_name) || 'Youth Constituent';

    const { data: existingAttendance } = await supabaseAdmin
      .from('program_attendance')
      .select('id, checked_in_at')
      .eq('program_id', programId)
      .eq('user_id', resolvedUserId)
      .maybeSingle();

    if (existingAttendance) {
      sendError(
        res,
        `Duplicate Check-In: ${attendeeName} was already checked in at ${new Date(existingAttendance.checked_in_at).toLocaleTimeString()}.`,
        409,
        { checked_in_at: existingAttendance.checked_in_at }
      );
      return;
    }

    const { data: registration } = await supabaseAdmin
      .from('program_registrations')
      .select('id, status')
      .eq('program_id', programId)
      .eq('user_id', resolvedUserId)
      .maybeSingle();

    if (!registration) {
      sendError(res, `${attendeeName} is not registered for this program.`, 400, { attendee_name: attendeeName, reason: 'not_registered' });
      return;
    }

    const checkInTime = new Date().toISOString();
    const { data: newAttendance, error: attendError } = await supabaseAdmin
      .from('program_attendance')
      .insert([
        {
          program_id: programId,
          user_id: resolvedUserId,
          tenant_id: program.tenant_id,
          checked_in_at: checkInTime,
          checked_in_by: scanner.id,
          qr_payload,
        },
      ])
      .select()
      .single();

    if (attendError) {
      sendError(res, `Failed to record attendance: ${attendError.message}`, 500);
      return;
    }

    await supabaseAdmin
      .from('program_registrations')
      .update({ status: 'attended' })
      .eq('id', registration.id);

    sendSuccess(
      res,
      {
        attendance: newAttendance,
        attendee_name: attendeeName,
        digital_youth_id: resident.digital_youth_id,
        program_title: program.title,
        checked_in_at: checkInTime,
      },
      `Attendance verified and recorded for ${attendeeName}.`
    );
  }
);

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
