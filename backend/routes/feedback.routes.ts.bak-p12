import express from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin, canAccessTenant, recordAuditLog } from '../services/supabase.service.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { authenticateUser, optionalAuthenticateUser, requireActiveUser, requireRoles } from '../middleware/auth.js';
import type { AuthRequest, FeedbackSentiment } from '../types/database.types.js';

const router = express.Router();

const POSITIVE_LEXICON = new Set([
  'good', 'great', 'awesome', 'excellent', 'helpful', 'impressive', 'love', 'satisfying',
  'support', 'clean', 'friendly', 'commend', 'thank', 'thanks', 'safe', 'success',
  'beneficial', 'productive', 'effective', 'fair', 'transparent', 'fast', 'organized',
  'salamat', 'maganda', 'mahusay', 'ayos', 'galing', 'masaya', 'mabilis', 'malinis',
  'asenso', 'tulong', 'hanga', 'nagpapasalamat', 'payapa', 'tapat', 'maasahan',
  'maray', 'marhay', 'mabalos', 'magayon', 'ayus', 'tabang', 'nauugma', 'orag', 'maorag',
  'salud', 'padaba', 'mabinat', 'mauswag'
]);

const NEGATIVE_LEXICON = new Set([
  'bad', 'terrible', 'poor', 'horrible', 'slow', 'corrupt', 'broken', 'unfair',
  'waste', 'useless', 'dirty', 'danger', 'delay', 'neglect', 'complaint', 'failure',
  'frustrating', 'annoying', 'bias', 'unhelpful', 'scam', 'late', 'absent',
  'pangit', 'reklamo', 'bulok', 'bagal', 'kurakot', 'dumi', 'basura', 'delikado',
  'sayang', 'dismayado', 'hirap', 'galit', 'abala', 'pabaya', 'huli', 'tamad',
  'maraot', 'wara', 'maluya', 'baha', 'anggot', 'kulang', 'palso', 'rara', 'supog',
  'supug', 'ungod'
]);

const NEGATORS = new Set(['not', 'no', 'never', 'hindi', 'di', 'wala', 'dae', 'bako']);

export function analyzeSentiment(text: string): {
  sentiment: FeedbackSentiment;
  score: number;
  positiveMatches: string[];
  negativeMatches: string[];
} {
  const words = text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  let score = 0;
  const positiveMatches: string[] = [];
  const negativeMatches: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i]!;
    const prevWord = i > 0 ? words[i - 1] : null;
    const isNegated = prevWord && NEGATORS.has(prevWord);

    if (POSITIVE_LEXICON.has(word)) {
      if (isNegated) {
        score -= 1;
        negativeMatches.push(`not ${word}`);
      } else {
        score += 1;
        positiveMatches.push(word);
      }
    } else if (NEGATIVE_LEXICON.has(word)) {
      if (isNegated) {
        score += 1;
        positiveMatches.push(`not ${word}`);
      } else {
        score -= 1;
        negativeMatches.push(word);
      }
    }
  }

  let sentiment: FeedbackSentiment = 'neutral';
  if (score > 0) sentiment = 'positive';
  else if (score < 0) sentiment = 'negative';

  return { sentiment, score, positiveMatches, negativeMatches };
}

const SubmitFeedbackSchema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  message: z.string().min(5, 'Message must be at least 5 characters'),
  category: z.string().min(2, 'Category is required'),
  is_anonymous: z.boolean().default(false),
});

const RespondFeedbackSchema = z.object({
  response: z.string().min(3, 'Official response is required'),
  status: z.enum(['under_review', 'resolved', 'dismissed']).default('resolved'),
});

router.post(
  '/',
  authenticateUser,
  requireActiveUser,
  async (req: Request, res: Response): Promise<void> => {
  const parseResult = SubmitFeedbackSchema.safeParse(req.body);
  if (!parseResult.success) {
    sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
    return;
  }

  const { subject, message, category, is_anonymous } = parseResult.data;
  const user = (req as AuthRequest).user!;
  if (!user.tenant_id) {
    sendError(res, 'Your account is not linked to a barangay.', 403);
    return;
  }

  const textToAnalyze = `${subject} ${message}`;
  const sentimentResult = analyzeSentiment(textToAnalyze);

  const { data: newFeedback, error } = await supabaseAdmin
    .from('feedback')
    .insert([
      {
        tenant_id: user.tenant_id,
        user_id: is_anonymous ? null : user.id,
        is_anonymous,
        subject,
        message,
        category,
        sentiment: sentimentResult.sentiment,
        status: 'submitted',
      },
    ])
    .select()
    .single();

  if (error) {
    sendError(res, `Failed to record feedback: ${error.message}`, 500);
    return;
  }

  const { error: analysisError } = await supabaseAdmin
    .from('sentiment_analysis')
    .insert({
      tenant_id: user.tenant_id,
      feedback_id: newFeedback.id,
      sentiment: sentimentResult.sentiment,
      score: sentimentResult.score,
      positive_keywords: sentimentResult.positiveMatches,
      negative_keywords: sentimentResult.negativeMatches,
    });

  if (analysisError) {
    await supabaseAdmin.from('feedback').delete().eq('id', newFeedback.id);
    console.error('Failed to persist sentiment analysis; feedback row rolled back:', analysisError);
    sendError(res, `Failed to persist sentiment analysis: ${analysisError.message}`, 500);
    return;
  }

  sendCreated(
    res,
    {
      feedback: newFeedback,
      sentiment_analysis: {
        sentiment: sentimentResult.sentiment,
        score: sentimentResult.score,
        positive_keywords: sentimentResult.positiveMatches,
        negative_keywords: sentimentResult.negativeMatches,
      },
    },
    'Your voice has been heard! Feedback submitted to Boses ng Kabataan.'
  );
  }
);

router.get(
  '/',
  authenticateUser,
  requireActiveUser,
  async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthRequest).user!;
  const { sentiment, category, status, tenant_id, scope } = req.query;

  let query = supabaseAdmin
    .from('feedback')
    .select('*, barangay(name), users(full_name, email, phone, resident_profile(birthdate, sex, address, educational_status, employment_status, is_registered_voter, digital_youth_id))');

  if (user.role === 'YOUTH_CONSTITUENT') {
    if (!user.tenant_id) {
      sendError(res, 'Your account is not linked to a barangay.', 403);
      return;
    }
    query = query
      .eq('tenant_id', user.tenant_id)
      .eq('user_id', user.id)
      .eq('is_anonymous', false);
  } else if (user.role !== 'SUPER_ADMIN') {
    if (!user.tenant_id) {
      sendError(res, 'Your account is not linked to a barangay.', 403);
      return;
    }
    query = query.eq('tenant_id', user.tenant_id);
  } else if (scope === 'all') {
    // Explicit federation-wide access for Super Admin only.
  } else if (tenant_id && typeof tenant_id === 'string') {
    query = query.eq('tenant_id', tenant_id);
  } else {
    sendError(res, 'Super Admin must specify scope=all or a tenant_id.', 400);
    return;
  }

  if (sentiment && typeof sentiment === 'string') {
    query = query.eq('sentiment', sentiment);
  }

  if (category && typeof category === 'string') {
    query = query.eq('category', category);
  }

  if (status && typeof status === 'string') {
    query = query.eq('status', status);
  }

  const { data: feedbacks, error } = await query.order('created_at', { ascending: false });

  if (error) {
    sendError(res, `Failed to retrieve feedbacks: ${error.message}`, 500);
    return;
  }

  const summary = {
    total: feedbacks?.length || 0,
    positive: feedbacks?.filter((f) => f.sentiment === 'positive').length || 0,
    neutral: feedbacks?.filter((f) => f.sentiment === 'neutral').length || 0,
    negative: feedbacks?.filter((f) => f.sentiment === 'negative').length || 0,
  };

  sendSuccess(res, { summary, feedbacks }, 'Feedback list retrieved.');
  }
);

router.patch(
  '/:id/respond',
  authenticateUser,
  requireActiveUser,
  requireRoles('BARANGAY_ADMIN', 'SK_OFFICIAL', 'SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id || '');
    const user = (req as AuthRequest).user!;

    const parseResult = RespondFeedbackSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
      return;
    }

    const { response, status } = parseResult.data;

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('feedback')
      .select('id, tenant_id, subject')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      sendError(res, 'Feedback not found.', 404);
      return;
    }

    if (!canAccessTenant(user, existing.tenant_id)) {
      sendError(res, 'Forbidden: You cannot respond to feedback from another Barangay.', 403);
      return;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('feedback')
      .update({
        response,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      sendError(res, `Failed to update feedback: ${updateError.message}`, 500);
      return;
    }

    await recordAuditLog({
      tenantId: existing.tenant_id,
      userId: user.id,
      action: 'RESPOND_FEEDBACK',
      entityName: 'feedback',
      entityId: id,
      details: { subject: existing.subject, status },
      ipAddress: req.ip || null,
    });

    sendSuccess(res, updated, 'Official response recorded successfully.');
  }
);

export default router;
