import express from 'express';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { supabaseAdmin, canAccessTenant, recordAuditLog } from '../services/supabase.service.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { authenticateUser, optionalAuthenticateUser, requireActiveUser, requireRoles } from '../middleware/auth.js';
import type { AuthRequest } from '../types/database.types.js';

const router = express.Router();

const CreateDocumentSchema = z.object({
  title: z.string().min(3, 'Document title is required'),
  document_type: z.enum([
    'Resolution',
    'Ordinance',
    'Financial Report',
    'Minutes',
    'Project Proposal',
    'Other',
  ]),
  file_url: z.string().url('A valid file URL is required'),
  status: z.enum(['draft', 'pending_approval']).default('pending_approval'),
});

const RejectDocumentSchema = z.object({
  feedback: z.string().min(5, 'A clear reason for rejection must be provided in feedback'),
});

const ApproveDocumentSchema = z.object({
  feedback: z.string().max(2000).optional(),
});

const UploadDocumentSchema = z.object({
  title: z.string().min(3, 'Document title is required'),
  document_type: z.enum(['Resolution', 'Resolutions', 'Ordinance', 'Ordinances', 'Financial Report', 'Reports', 'Minutes', 'Meeting Minutes', 'Project Proposal', 'Accomplishment', 'Budget', 'Vouchers', 'Liquidation', 'Communications', 'Other']),
  file_name: z.string().min(1, 'File name is required'),
  content_type: z.string().min(1, 'Content type is required'),
  file_base64: z.string().min(1, 'File data is required'),
});

const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]);
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function getStoragePath(fileUrl: string): string | null {
  if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
    return fileUrl;
  }

  try {
    const url = new URL(fileUrl);
    const marker = '/storage/v1/object/';
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return null;

    const objectPath = url.pathname.slice(markerIndex + marker.length);
    const bucketPrefix = objectPath.match(/^(?:public|sign|authenticated)\/documents\/(.+)$/);
    const storagePath = bucketPrefix?.[1];
    return storagePath ? decodeURIComponent(storagePath) : null;
  } catch {
    return null;
  }
}

async function withSignedDocumentUrl<T extends { file_url: string }>(document: T): Promise<T> {
  const storagePath = getStoragePath(document.file_url);
  if (!storagePath) return document;

  const { data, error } = await supabaseAdmin.storage
    .from('documents')
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to generate a signed document URL: ${error?.message || 'URL was not returned.'}`);
  }

  return { ...document, file_url: data.signedUrl };
}

router.post(
  '/upload',
  authenticateUser,
  requireActiveUser,
  requireRoles('BARANGAY_ADMIN', 'SK_OFFICIAL', 'SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = UploadDocumentSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors);
      return;
    }

    const user = (req as AuthRequest).user!;
    const tenantId = user.tenant_id;
    if (!tenantId) {
      sendError(res, 'User has no assigned Barangay tenant.', 400);
      return;
    }

    const { title, document_type, file_name, content_type, file_base64 } = parsed.data;
    const normalizedContentType = content_type.toLowerCase().split(';')[0]?.trim() || '';
    const extension = file_name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
    const allowedExtensions = new Set(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']);
    if (!ALLOWED_DOCUMENT_TYPES.has(normalizedContentType) || !allowedExtensions.has(extension)) {
      sendError(res, 'Only PDF, Word (.doc/.docx), JPG, and PNG files are allowed.', 415);
      return;
    }
    const fileBuffer = Buffer.from(file_base64, 'base64');
    if (!fileBuffer.length || fileBuffer.length > MAX_DOCUMENT_BYTES) {
      sendError(res, 'Document file must be between 1 byte and 25 MB.', 413);
      return;
    }

    const safeFileName = file_name.split(/[\\/]/).pop()?.replace(/[^A-Za-z0-9._-]/g, '_') || 'document';
    const objectPath = `${tenantId}/${randomUUID()}/${safeFileName}`;
    const storage = supabaseAdmin.storage.from('documents');
    const { error: uploadError } = await storage.upload(objectPath, fileBuffer, {
      contentType: normalizedContentType,
      upsert: false,
    });

    if (uploadError) {
      if (uploadError.message.toLowerCase().includes('bucket not found')) {
        sendError(res, 'The Supabase Storage bucket "documents" is not configured. Apply migration 004_create_documents_storage_bucket.sql, then retry the upload.', 503);
        return;
      }
      sendError(res, `Failed to upload document to Supabase Storage: ${uploadError.message}`, 502);
      return;
    }

    const { data: newDoc, error: insertError } = await supabaseAdmin
      .from('documents')
      .insert({
        tenant_id: tenantId,
        title,
        document_type,
        file_url: objectPath,
        status: 'pending_approval',
        submitted_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      await storage.remove([objectPath]);
      sendError(res, `Failed to create document record: ${insertError.message}`, 500);
      return;
    }

    await recordAuditLog({
      tenantId,
      userId: user.id,
      action: 'SUBMIT_DOCUMENT',
      entityName: 'documents',
      entityId: newDoc.id,
      details: { title, type: document_type, file_name: safeFileName, storage_path: objectPath },
      ipAddress: req.ip || null,
    });

    // Notify all SK Chairpersons in this tenant that a document awaits review
    try {
      const { data: chairpersons } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('role_id', 2);

      if (chairpersons && chairpersons.length > 0) {
        const { error: uploadNotifErr } = await supabaseAdmin
          .from('notifications')
          .insert(
            chairpersons.map((c: any) => ({
              tenant_id: tenantId,
              user_id: c.id,
              title: 'New Document Pending Approval',
              message: '"' + title + '" (' + document_type + ') was uploaded by ' + (user.full_name || 'SK Secretary') + '. Please review and approve.',
              notification_type: 'DOCUMENT_APPROVAL',
              link: '/documents',
              is_read: false,
            })),
          );
        if (uploadNotifErr) console.warn('Upload notification failed:', uploadNotifErr.message);
      }
    } catch (notifErr: any) {
      console.warn('Upload notification error:', notifErr?.message || notifErr);
    }
    sendCreated(res, newDoc, `Document "${title}" uploaded and submitted for approval.`);
  }
);

router.get('/', optionalAuthenticateUser, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthRequest).user;
  const { status, document_type, tenant_id } = req.query;

  let query = supabaseAdmin
    .from('documents')
    .select('*, submitter:users!submitted_by(full_name, email), reviewer:users!reviewed_by(full_name)');

  if (user && user.role !== 'SUPER_ADMIN') {
    if (!user.tenant_id) {
      sendError(res, 'User has no assigned Barangay tenant.', 403);
      return;
    }
    query = query.eq('tenant_id', user.tenant_id);
  } else if (user?.role === 'SUPER_ADMIN' && tenant_id && typeof tenant_id === 'string') {
    query = query.eq('tenant_id', tenant_id);
  } else if (!user) {
    query = query.eq('status', 'approved');
  }

  if (status && typeof status === 'string') {
    query = query.eq('status', status);
  }

  if (document_type && typeof document_type === 'string') {
    query = query.eq('document_type', document_type);
  }

  const { data: documents, error } = await query.order('created_at', { ascending: false });

  if (error) {
    sendError(res, `Failed to retrieve documents: ${error.message}`, 500);
    return;
  }

  try {
    const documentsWithSignedUrls = await Promise.all((documents || []).map(withSignedDocumentUrl));
    const publicSafeDocuments = user
      ? documentsWithSignedUrls
      : documentsWithSignedUrls.map((doc: any) => ({
          ...doc,
          submitter: doc.submitter ? { full_name: doc.submitter.full_name } : doc.submitter,
        }));
    sendSuccess(res, publicSafeDocuments, 'Documents retrieved successfully.');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to generate document download URLs.', 502);
  }
});

router.get('/:id/download', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id || '');
  const user = (req as AuthRequest).user!;

  const { data: document, error } = await supabaseAdmin
    .from('documents')
    .select('id, tenant_id, file_url')
    .eq('id', id)
    .single();

  if (error || !document) {
    sendError(res, 'Document not found.', 404);
    return;
  }

  if (!canAccessTenant(user, document.tenant_id)) {
    sendError(res, 'Forbidden: You cannot download documents belonging to another Barangay.', 403);
    return;
  }

  try {
    const signedDocument = await withSignedDocumentUrl(document);
    sendSuccess(res, {
      url: signedDocument.file_url,
      expires_in: SIGNED_URL_TTL_SECONDS,
    }, 'Signed document download URL generated.');
  } catch (downloadError) {
    sendError(res, downloadError instanceof Error ? downloadError.message : 'Failed to generate document download URL.', 502);
  }
});

router.get('/:id', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id || '');
  const user = (req as AuthRequest).user!;

  const { data: document, error } = await supabaseAdmin
    .from('documents')
    .select('*, submitter:users!submitted_by(full_name, email), reviewer:users!reviewed_by(full_name)')
    .eq('id', id)
    .single();

  if (error || !document) {
    sendError(res, 'Document not found.', 404);
    return;
  }

  if (!canAccessTenant(user, document.tenant_id)) {
    sendError(res, 'Forbidden: You cannot access documents belonging to another Barangay.', 403);
    return;
  }

  try {
    sendSuccess(res, await withSignedDocumentUrl(document), 'Document details retrieved.');
  } catch (signedUrlError) {
    sendError(res, signedUrlError instanceof Error ? signedUrlError.message : 'Failed to generate document download URL.', 502);
  }
});

router.post(
  '/',
  authenticateUser,
  requireActiveUser,
  requireRoles('BARANGAY_ADMIN', 'SK_OFFICIAL', 'SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parseResult = CreateDocumentSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
      return;
    }

    const user = (req as AuthRequest).user!;
    const { title, document_type, file_url, status } = parseResult.data;

    const tenantId = user.tenant_id;
    if (!tenantId) {
      sendError(res, 'User has no assigned Barangay tenant.', 400);
      return;
    }

    const { data: newDoc, error } = await supabaseAdmin
      .from('documents')
      .insert([
        {
          tenant_id: tenantId,
          title,
          document_type,
          file_url,
          status,
          submitted_by: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      sendError(res, `Failed to submit document: ${error.message}`, 500);
      return;
    }

    await recordAuditLog({
      tenantId,
      userId: user.id,
      action: 'SUBMIT_DOCUMENT',
      entityName: 'documents',
      entityId: newDoc.id,
      details: { title, type: document_type, status },
      ipAddress: req.ip || null,
    });

    sendCreated(res, newDoc, `Document "${title}" submitted for approval workflow.`);
  }
);

router.patch(
  '/:id/approve',
  authenticateUser,
  requireActiveUser,
  requireRoles('BARANGAY_ADMIN', 'SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id || '');
    const reviewer = (req as AuthRequest).user!;
    const parsed = ApproveDocumentSchema.safeParse(req.body || {});
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors);
      return;
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('id, tenant_id, title, status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      sendError(res, 'Document not found.', 404);
      return;
    }

    if (!canAccessTenant(reviewer, existing.tenant_id)) {
      sendError(res, 'Forbidden: You cannot review documents from another Barangay.', 403);
      return;
    }

    if (existing.status === 'approved') {
      sendError(res, 'Document is already approved.', 400);
      return;
    }

    const approvalFeedback = parsed.data.feedback?.trim() || null;
    const { error: approvalError } = await supabaseAdmin
      .from('document_approvals')
      .insert({
        tenant_id: existing.tenant_id,
        document_id: id,
        reviewer_id: reviewer.id,
        status: 'approved',
        feedback: approvalFeedback,
      })
      .select()
      .single();

    // The approval history table is additive. A stale Supabase schema cache
    // must not prevent the authoritative document status update.
    if (approvalError) console.warn('Document approval history unavailable; continuing with status update:', approvalError.message);

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('documents')
      .update({
        status: 'approved',
        reviewed_by: reviewer.id,
        feedback: approvalFeedback || 'Approved by Barangay Administrator',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      sendError(res, `Failed to approve document: ${updateError.message}`, 500);
      return;
    }
    // Notify the original submitter that their document was approved
    try {
      if (updated && updated.submitted_by) {
        const { error: approveNotifErr } = await supabaseAdmin
          .from('notifications')
          .insert([{
            tenant_id: existing.tenant_id,
            user_id: updated.submitted_by,
            title: 'Document Approved',
            message: 'Your document "' + existing.title + '" has been approved.' + (approvalFeedback ? ' Reviewer notes: ' + approvalFeedback : ''),
            notification_type: 'DOCUMENT_APPROVED',
            link: '/documents',
            is_read: false,
          }]);
        if (approveNotifErr) console.warn('Approval notification failed:', approveNotifErr.message);
      }
    } catch (notifErr: any) {
      console.warn('Approval notification error:', notifErr?.message || notifErr);
    }

    await recordAuditLog({
      tenantId: existing.tenant_id,
      userId: reviewer.id,
      action: 'APPROVE_DOCUMENT',
      entityName: 'documents',
      entityId: id,
      details: { title: existing.title, reviewer: reviewer.full_name },
      ipAddress: req.ip || null,
    });

    sendSuccess(res, updated, `Document "${existing.title}" has been approved.`);
  }
);

router.patch(
  '/:id/reject',
  authenticateUser,
  requireActiveUser,
  requireRoles('BARANGAY_ADMIN', 'SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id || '');
    const reviewer = (req as AuthRequest).user!;

    const parseResult = RejectDocumentSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
      return;
    }

    const { feedback } = parseResult.data;

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('id, tenant_id, title, submitted_by')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      sendError(res, 'Document not found.', 404);
      return;
    }

    if (!canAccessTenant(reviewer, existing.tenant_id)) {
      sendError(res, 'Forbidden: You cannot review documents from another Barangay.', 403);
      return;
    }

    const { error: approvalError } = await supabaseAdmin
      .from('document_approvals')
      .insert({
        tenant_id: existing.tenant_id,
        document_id: id,
        reviewer_id: reviewer.id,
        status: 'rejected',
        feedback,
      })
      .select('id')
      .single();

    if (approvalError) console.warn('Document rejection history unavailable; continuing with status update:', approvalError.message);

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('documents')
      .update({
        status: 'rejected',
        reviewed_by: reviewer.id,
        feedback,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      sendError(res, `Failed to reject document: ${updateError.message}`, 500);
      return;
    }

        // Notify the original submitter that their document was rejected
        try {
          if (updated && updated.submitted_by) {
            const { error: rejectNotifErr } = await supabaseAdmin
              .from('notifications')
              .insert([{
                tenant_id: existing.tenant_id,
                user_id: updated.submitted_by,
                title: 'Document Rejected',
                message: 'Your document "' + existing.title + '" was returned for revision.' + (feedback ? ' Reason: ' + feedback : ''),
                notification_type: 'DOCUMENT_REJECTED',
                link: '/documents',
                is_read: false,
              }]);
            if (rejectNotifErr) console.warn('Reject notification failed:', rejectNotifErr.message);
          }
        } catch (notifErr: any) {
          console.warn('Reject notification error:', notifErr?.message || notifErr);
        }

    await recordAuditLog({
      tenantId: existing.tenant_id,
      userId: reviewer.id,
      action: 'REJECT_DOCUMENT',
      entityName: 'documents',
      entityId: id,
      details: { title: existing.title, feedback },
      ipAddress: req.ip || null,
    });

    sendSuccess(res, updated, `Document "${existing.title}" rejected with feedback.`);
  }
);

export default router;
