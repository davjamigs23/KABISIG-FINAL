import express from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { supabaseAdmin } from '../services/supabase.service.js';
import { authenticateUser, requireActiveUser, requireRoles } from '../middleware/auth.js';
import { sendError, sendSuccess } from '../utils/response.js';
import type { AuthRequest } from '../types/database.types.js';

const router = express.Router();
const announcementFields = {
  title: z.string().trim().min(3).max(200),
  content: z.string().trim().min(1).max(10000),
  what: z.string().trim().max(2000).optional(),
  where: z.string().trim().max(1000).optional(),
  where_text: z.string().trim().max(1000).optional(),
  when: z.string().trim().max(500).optional(),
  event_when: z.string().trim().max(500).optional(),
  hashtags: z.string().trim().max(1000).optional(),
  image_path: z.string().trim().max(1024).nullable().optional(),
  category: z.enum(['Opportunity', 'Notice', 'Emergency', 'Event']),
  status: z.enum(['draft', 'published']),
  image: z.object({
    file_name: z.string().min(1).max(255),
    content_type: z.enum(['image/jpeg', 'image/png']),
    file_base64: z.string().min(1),
  }).optional(),
};
const createSchema = z.object(announcementFields).extend({
  status: z.enum(['draft', 'published']).default('published'),
  category: z.enum(['Opportunity', 'Notice', 'Emergency', 'Event']).default('Notice'),
});
const updateSchema = z.object(announcementFields).partial();
const MAX_PUBMAT_BYTES = 10 * 1024 * 1024;
const PUBMAT_BUCKET = 'announcement-pubmats';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function missingTable(error: any) {
  return error?.code === '42P01'
    || error?.code === 'PGRST205'
    || /relation ["']?(?:public\.)?announcement["']? does not exist/i.test(error?.message || '');
}

function missingAnnouncementDetails(error: any) {
  return /column .*?\b(what|where_text|event_when|hashtags|image_path)\b.*?does not exist|could not find the .*?\b(what|where_text|event_when|hashtags|image_path)\b.*?column/i.test(error?.message || '');
}

function safeFileName(fileName: string): string {
  return fileName.split(/[\\/]/).pop()?.replace(/[^A-Za-z0-9._-]/g, '_') || 'announcement-pubmat';
}

function belongsToTenantStoragePath(imagePath: string, tenantId: string): boolean {
  const [pathTenantId, uploadId, fileName, ...extraSegments] = imagePath.split('/');
  return pathTenantId?.toLowerCase() === tenantId.toLowerCase()
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uploadId || '')
    && typeof fileName === 'string'
    && fileName.length > 0
    && !extraSegments.length
    && !fileName.includes('..');
}

function decodePubmat(image: z.infer<typeof announcementFields.image>): Buffer | null {
  if (!image) return null;
  const extension = image.file_name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  const expectedExtension = image.content_type === 'image/jpeg' ? ['jpg', 'jpeg'] : ['png'];
  if (!extension || !expectedExtension.includes(extension)) return null;

  const buffer = Buffer.from(image.file_base64, 'base64');
  if (!buffer.length || buffer.length > MAX_PUBMAT_BYTES) return null;
  const isJpeg = image.content_type === 'image/jpeg'
    && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = image.content_type === 'image/png'
    && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return isJpeg || isPng ? buffer : null;
}

async function signPubmat<T extends { image_path?: string | null }>(announcement: T): Promise<{ data?: T & { image_url?: string }; error?: string }> {
  if (!announcement.image_path) return { data: announcement };
  const { data, error } = await supabaseAdmin.storage
    .from(PUBMAT_BUCKET)
    .createSignedUrl(announcement.image_path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    return { error: `Failed to create a signed announcement image URL: ${error?.message || 'URL was not returned.'}` };
  }
  return { data: { ...announcement, image_url: data.signedUrl } };
}

async function uploadPubmat(
  tenantId: string,
  image: z.infer<typeof announcementFields.image> | undefined,
): Promise<{ path?: string; error?: string }> {
  if (!image) return {};
  const buffer = decodePubmat(image);
  if (!buffer) {
    return { error: 'Upload a valid JPG or PNG pubmat no larger than 10 MB.' };
  }
  const path = `${tenantId}/${randomUUID()}/${safeFileName(image.file_name)}`;
  const { error } = await supabaseAdmin.storage.from(PUBMAT_BUCKET).upload(path, buffer, {
    contentType: image.content_type,
    upsert: false,
  });
  if (error) {
    const hint = error.message.toLowerCase().includes('bucket not found')
      ? ' Apply migration 008_add_announcement_details.sql to create the announcement-pubmats bucket.'
      : '';
    return { error: `Failed to upload announcement pubmat: ${error.message}.${hint}` };
  }
  return { path };
}

async function deletePubmat(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { error } = await supabaseAdmin.storage.from(PUBMAT_BUCKET).remove([path]);
  return error ? error.message : null;
}

router.get('/', authenticateUser, requireActiveUser, async (req, res) => {
  const user = (req as AuthRequest).user!;
  let query = supabaseAdmin.from('announcement').select('*').order('created_at', { ascending: false });
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'VIEWER') {
    if (!user.tenant_id) {
      sendError(res, 'User has no assigned Barangay tenant.', 400);
      return;
    }
    query = query.eq('tenant_id', user.tenant_id);
  }
  if (user.role === 'YOUTH_CONSTITUENT' || user.role === 'VIEWER') {
    query = query.eq('status', 'published');
  }
  const { data, error } = await query;
  if (error) {
    const message = missingTable(error)
      ? 'Announcements are not configured. Apply migration 003_add_announcements.sql.'
      : missingAnnouncementDetails(error)
        ? 'Structured announcements are not configured. Apply migration 008_add_announcement_details.sql.'
        : error.message;
    sendError(res, message, missingTable(error) || missingAnnouncementDetails(error) ? 503 : 500);
    return;
  }

  const signedAnnouncements = await Promise.all((data || []).map(announcement => signPubmat(announcement)));
  const signingFailure = signedAnnouncements.find(item => item.error);
  if (signingFailure?.error) {
    sendError(res, signingFailure.error, 502);
    return;
  }
  sendSuccess(res, signedAnnouncements.map(item => item.data));
});

router.post(
  '/',
  authenticateUser,
  requireActiveUser,
  requireRoles('BARANGAY_ADMIN', 'SUPER_ADMIN'),
  async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors);
      return;
    }
    const user = (req as AuthRequest).user!;
    if (!user.tenant_id) {
      sendError(res, 'User has no assigned Barangay tenant.', 400);
      return;
    }
    if (parsed.data.image_path && !belongsToTenantStoragePath(parsed.data.image_path, user.tenant_id)) {
      sendError(res, 'Announcement image path must point to an uploaded file in your Barangay folder.', 403);
      return;
    }
    if (parsed.data.image_path && parsed.data.image) {
      sendError(res, 'Provide either an uploaded image path or a legacy image payload, not both.', 400);
      return;
    }
    const upload = await uploadPubmat(user.tenant_id, parsed.data.image);
    if (upload.error) {
      sendError(res, upload.error, upload.error.startsWith('Upload a valid') ? 415 : 502);
      return;
    }
    const {
      image: _image,
      where,
      where_text,
      when,
      event_when,
      image_path,
      ...fields
    } = parsed.data;
    const status = fields.status;
    const { data, error } = await supabaseAdmin.from('announcement').insert({
      ...fields,
      where_text: where_text ?? where ?? null,
      event_when: event_when ?? when ?? null,
      image_path: image_path ?? upload.path ?? null,
      tenant_id: user.tenant_id,
      author_id: user.id,
      published_at: status === 'published' ? new Date().toISOString() : null,
    }).select('*').single();
    if (error) {
      if (upload.path) {
        const cleanupError = await deletePubmat(upload.path);
        if (cleanupError) console.error('Failed to clean up pubmat after announcement insert failed:', cleanupError);
      }
      const message = missingTable(error)
        ? 'Announcements are not configured. Apply migration 003_add_announcements.sql.'
        : missingAnnouncementDetails(error)
          ? 'Structured announcements are not configured. Apply migration 008_add_announcement_details.sql.'
          : error.message;
      sendError(res, message, missingTable(error) || missingAnnouncementDetails(error) ? 503 : 500);
      return;
    }
    const signed = await signPubmat(data);
    if (signed.error) {
      sendError(res, signed.error, 502);
      return;
    }
    sendSuccess(res, signed.data, 'Announcement saved.');
  },
);

router.patch(
  '/:id',
  authenticateUser,
  requireActiveUser,
  requireRoles('BARANGAY_ADMIN', 'SUPER_ADMIN'),
  async (req, res) => {
    const idResult = z.string().uuid().safeParse(req.params.id);
    const parsed = updateSchema.safeParse(req.body);
    if (!idResult.success || !parsed.success || Object.keys(parsed.data || {}).length === 0) {
      sendError(res, 'A valid announcement ID and at least one valid update field are required.', 400, parsed.success ? undefined : parsed.error.flatten().fieldErrors);
      return;
    }
    const user = (req as AuthRequest).user!;
    let existingQuery = supabaseAdmin.from('announcement').select('*').eq('id', idResult.data);
    if (user.role !== 'SUPER_ADMIN') {
      if (!user.tenant_id) {
        sendError(res, 'User has no assigned Barangay tenant.', 400);
        return;
      }
      existingQuery = existingQuery.eq('tenant_id', user.tenant_id);
    }
    const { data: existing, error: existingError } = await existingQuery.maybeSingle();
    if (existingError) {
      sendError(res, existingError.message, 500);
      return;
    }
    if (!existing) {
      sendError(res, 'Announcement not found in your Barangay.', 404);
      return;
    }

    if (parsed.data.image_path && !belongsToTenantStoragePath(parsed.data.image_path, existing.tenant_id)) {
      sendError(res, 'Announcement image path must point to an uploaded file in its Barangay folder.', 403);
      return;
    }
    if (parsed.data.image_path && parsed.data.image) {
      sendError(res, 'Provide either an uploaded image path or a legacy image payload, not both.', 400);
      return;
    }
    const upload = await uploadPubmat(existing.tenant_id, parsed.data.image);
    if (upload.error) {
      sendError(res, upload.error, upload.error.startsWith('Upload a valid') ? 415 : 502);
      return;
    }
    const {
      image: _image,
      where,
      where_text,
      when,
      event_when,
      image_path,
      ...fields
    } = parsed.data;
    const changes: Record<string, unknown> = { ...fields, updated_at: new Date().toISOString() };
    if (where !== undefined || where_text !== undefined) {
      changes.where_text = where_text ?? where ?? null;
    }
    if (when !== undefined || event_when !== undefined) {
      changes.event_when = event_when ?? when ?? null;
    }
    if (image_path !== undefined) changes.image_path = image_path;
    else if (upload.path) changes.image_path = upload.path;
    if (fields.status) {
      changes.published_at = fields.status === 'published'
        ? existing.published_at || new Date().toISOString()
        : null;
    }

    let updateQuery = supabaseAdmin.from('announcement').update(changes).eq('id', idResult.data);
    if (user.role !== 'SUPER_ADMIN') updateQuery = updateQuery.eq('tenant_id', user.tenant_id);
    const { data, error } = await updateQuery.select('*').maybeSingle();
    if (error || !data) {
      if (upload.path) {
        const cleanupError = await deletePubmat(upload.path);
        if (cleanupError) console.error('Failed to clean up pubmat after announcement update failed:', cleanupError);
      }
      const configurationError = missingTable(error)
        ? 'Announcements are not configured. Apply migration 003_add_announcements.sql.'
        : missingAnnouncementDetails(error)
          ? 'Structured announcements are not configured. Apply migration 008_add_announcement_details.sql.'
          : null;
      sendError(res, configurationError || error?.message || 'Announcement could not be updated.', configurationError ? 503 : 500);
      return;
    }

    const signed = await signPubmat(data);
    if (signed.error) {
      sendError(res, signed.error, 502);
      return;
    }
    if ((upload.path || image_path !== undefined) && existing.image_path && existing.image_path !== data.image_path) {
      const cleanupError = await deletePubmat(existing.image_path);
      if (cleanupError) {
        console.error('Updated announcement pubmat but could not remove replaced image:', cleanupError);
      }
    }
    sendSuccess(res, signed.data, 'Announcement updated.');
  },
);

router.delete(
  '/:id',
  authenticateUser,
  requireActiveUser,
  requireRoles('BARANGAY_ADMIN', 'SUPER_ADMIN'),
  async (req, res) => {
    const idResult = z.string().uuid().safeParse(req.params.id);
    if (!idResult.success) {
      sendError(res, 'A valid announcement ID is required.', 400);
      return;
    }
    const user = (req as AuthRequest).user!;
    let deleteQuery = supabaseAdmin.from('announcement').delete().eq('id', idResult.data).select('id, image_path');
    if (user.role !== 'SUPER_ADMIN') {
      if (!user.tenant_id) {
        sendError(res, 'User has no assigned Barangay tenant.', 400);
        return;
      }
      deleteQuery = deleteQuery.eq('tenant_id', user.tenant_id);
    }
    const { data, error } = await deleteQuery.maybeSingle();
    if (error) {
      sendError(res, error.message, 500);
      return;
    }
    if (!data) {
      sendError(res, 'Announcement not found in your Barangay.', 404);
      return;
    }
    const cleanupError = await deletePubmat(data.image_path);
    if (cleanupError) {
      console.error('Announcement was deleted but its pubmat could not be removed:', cleanupError);
    }
    sendSuccess(res, { id: data.id }, cleanupError
      ? 'Announcement deleted; its stored image could not be cleaned up.'
      : 'Announcement deleted.');
  },
);

export default router;
