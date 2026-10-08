import express from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin, canAccessTenant } from '../services/supabase.service.js';
import { sendCreated, sendError, sendSuccess } from '../utils/response.js';
import { authenticateUser, requireActiveUser, requireRoles } from '../middleware/auth.js';
import type { AuthRequest } from '../types/database.types.js';

const router = express.Router();

const CreatePollSchema = z.object({
  question: z.string().min(3),
  description: z.string().optional(),
  options: z.array(z.string().min(1)).min(2),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
});

const VoteSchema = z.object({
  vote_choice: z.enum(['Support', 'Oppose']),
});

function withVoteCounts(poll: any, currentUserId?: string) {
  const responses = Array.isArray(poll.poll_responses) ? poll.poll_responses : [];
  return {
    ...poll,
    vote_counts: {
      support: responses.filter((response: any) => response.selected_option === 'Support').length,
      oppose: responses.filter((response: any) => response.selected_option === 'Oppose').length,
    },
    voted_users: responses.map((response: any) => response.user_id),
    my_vote: responses.find((response: any) => response.user_id === currentUserId)?.selected_option || null,
  };
}

router.get('/', authenticateUser, requireActiveUser, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthRequest).user!;
  let query = supabaseAdmin
    .from('polls')
    .select('*, poll_responses(user_id, selected_option)')
    .eq('is_active', true)
    .gt('end_date', new Date().toISOString());

  if (user.role !== 'SUPER_ADMIN') {
    query = query.eq('tenant_id', user.tenant_id);
  } else if (req.query.tenant_id && typeof req.query.tenant_id === 'string') {
    query = query.eq('tenant_id', req.query.tenant_id);
  }

  const { data, error } = await query.order('end_date', { ascending: true });
  if (error) {
    sendError(res, `Failed to retrieve active polls: ${error.message}`, 500);
    return;
  }

  sendSuccess(res, (data || []).map(poll => withVoteCounts(poll, user.id)), 'Active polls retrieved.');
});

router.post(
  '/',
  authenticateUser,
  requireActiveUser,
  requireRoles('BARANGAY_ADMIN', 'SK_OFFICIAL', 'SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = CreatePollSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors);
      return;
    }

    const user = (req as AuthRequest).user!;
    if (!user.tenant_id) {
      sendError(res, 'User has no assigned Barangay tenant.', 400);
      return;
    }
    if (new Date(parsed.data.end_date) <= new Date(parsed.data.start_date)) {
      sendError(res, 'Poll end date must be after its start date.', 400);
      return;
    }

    // Force author server-side (ignore client-supplied "Proposed by:").
    const rawDescription = parsed.data.description || '';
    const strippedDescription = rawDescription
      .split('\n')
      .filter((line) => !line.startsWith('Proposed by: '))
      .join('\n')
      .trimEnd();
    const authoredDescription = strippedDescription
      ? `${strippedDescription}\nProposed by: ${user.full_name || 'SK Official'}`
      : `Proposed by: ${user.full_name || 'SK Official'}`;

    const { data, error } = await supabaseAdmin
      .from('polls')
      .insert({
        tenant_id: user.tenant_id,
        question: parsed.data.question,
        description: authoredDescription,
        options: parsed.data.options,
        start_date: parsed.data.start_date,
        end_date: parsed.data.end_date,
        is_active: true,
        created_by: user.id,
      })
      .select('*, poll_responses(user_id, selected_option)')
      .single();

    if (error) {
      sendError(res, `Failed to create poll: ${error.message}`, 500);
      return;
    }

    sendCreated(res, withVoteCounts(data, user.id), 'Resolution poll created successfully.');
  }
);

router.post(
  '/:id/vote',
  authenticateUser,
  requireActiveUser,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = VoteSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors);
      return;
    }

    const pollId = String(req.params.id || '');
    const user = (req as AuthRequest).user!;
    const { data: poll, error: pollError } = await supabaseAdmin
      .from('polls')
      .select('id, tenant_id, options, end_date, is_active')
      .eq('id', pollId)
      .single();

    if (pollError || !poll) {
      sendError(res, 'Poll not found.', 404);
      return;
    }
    if (!canAccessTenant(user, poll.tenant_id)) {
      sendError(res, 'Forbidden: You cannot vote in a poll from another Barangay.', 403);
      return;
    }
    if (!poll.is_active || new Date(poll.end_date) <= new Date()) {
      sendError(res, 'This poll is closed.', 400);
      return;
    }
    if (!Array.isArray(poll.options) || !poll.options.includes(parsed.data.vote_choice)) {
      sendError(res, 'This voting option is not available for the poll.', 400);
      return;
    }

    const { data: existingVote } = await supabaseAdmin
      .from('poll_responses')
      .select('id')
      .eq('poll_id', pollId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (existingVote) {
      sendError(res, 'You have already voted in this poll.', 409);
      return;
    }

    const { error: voteError } = await supabaseAdmin.from('poll_responses').insert({
      poll_id: pollId,
      user_id: user.id,
      tenant_id: poll.tenant_id,
      selected_option: parsed.data.vote_choice,
    });
    if (voteError) {
      sendError(res, voteError.code === '23505' ? 'You have already voted in this poll.' : `Failed to record vote: ${voteError.message}`, voteError.code === '23505' ? 409 : 500);
      return;
    }

    const { data: responses, error: responsesError } = await supabaseAdmin
      .from('poll_responses')
      .select('user_id, selected_option')
      .eq('poll_id', pollId);
    if (responsesError) {
      sendError(res, `Vote was recorded, but results could not be refreshed: ${responsesError.message}`, 500);
      return;
    }

    sendSuccess(
      res,
      withVoteCounts({ ...poll, poll_responses: responses || [] }, user.id),
      'Your vote was recorded successfully.'
    );
  }
);

export default router;