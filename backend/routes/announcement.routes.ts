import express from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { supabaseAdmin } from '../services/supabase.service.js';
import { authenticateUser, requireActiveUser, requireRoles } from '../middleware/auth.js';
import { sendError, sendSuccess } from '../utils/response.js';
import type { AuthRequest } from '../types/database.types.js';
import { sendEmail } from '../utils/email.js';

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
  image_urls: z.array(z.string().trim().min(1).max(1024)).max(10).optional(),
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

function escapeEmailHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character);
}

async function notifyApprovedYouth(tenantId: string, title: string, content: string): Promise<void> {
  try {
    const { data: recipients, error } = await supabaseAdmin
      .from('users')
      .select('email, resident_profile!resident_profile_user_id_fkey!inner(verification_status)')
      .eq('tenant_id', tenantId)
      .eq('role_id', 4)
      .eq('status', 'active')
      .eq('resident_profile.verification_status', 'verified');
    if (error) throw new Error(error.message);

    const frontendUrl = (process.env.FRONTEND_URL || 'https://kabisig-naga.vercel.app').replace(/\/+$/, '');
    const logoUrl = `${frontendUrl}/images/Kabisig_logo.png`;
    const safeTitle = escapeEmailHtml(title);
    const safeContent = escapeEmailHtml(content).replace(/\r?\n/g, '<br>');
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden"><div style="background:#091d64;padding:22px;text-align:center"><img src="${escapeEmailHtml(logoUrl)}" alt="KABISIG" style="width:160px;max-width:100%;height:auto"></div><div style="padding:28px;background:#fff"><p style="color:#64748b;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:1px">New Barangay Announcement</p><h1 style="color:#091d64;font-size:22px">${safeTitle}</h1><p style="color:#334155;font-size:15px;line-height:1.7">${safeContent}</p><p style="text-align:center;margin:30px 0 8px"><a href="${escapeEmailHtml(frontendUrl)}" style="display:inline-block;background:#091d64;color:#fff;padding:13px 24px;text-decoration:none;border-radius:8px;font-weight:bold">View in KABISIG</a></p></div><div style="background:#f8fafc;padding:14px;text-align:center;color:#94a3b8;font-size:12px">KABISIG · Kabataan Information System for Inclusive Governance</div></div>`;
    const results = await Promise.allSettled((recipients || [])
      .filter(recipient => typeof recipient.email === 'string' && recipient.email.trim().length > 0)
      .map(recipient => sendEmail(recipient.email, `KABISIG Announcement: ${title}`, html)));
    const failedCount = results.filter(result => result.status === 'rejected').length;
    if (failedCount > 0) {
      console.error(`[ANNOUNCEMENT EMAIL] Failed to send ${failedCount} of ${results.length} youth notification(s).`);
    }
  } catch (error) {
    console.error('[ANNOUNCEMENT EMAIL] Announcement was saved, but youth notifications failed:', error);
  }
}

function missingTable(error: any) {
  return error?.code === '42P01'
    || error?.code === 'PGRST205'
    || /relation ["']?(?:public\.)?announcement["']? does not exist/i.test(error?.message || '');
}

function missingAnnouncementDetails(error: any) {
  return /column .*?\b(what|where_text|event_when|hashtags|image_path|image_urls)\b.*?does not exist|could not find the .*?\b(what|where_text|event_when|hashtags|image_path|image_urls)\b.*?column/i.test(error?.message || '');
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

async function signPubmat<T extends { image_path?: string | null; image_urls?: string[] | null }>(
  announcement: T,
): Promise<{ data?: T & { image_url?: string | null; image_urls?: string[]; image_paths?: string[] }; error?: string }> {
  const paths = announcement.image_urls?.length
    ? announcement.image_urls
    : announcement.image_path
      ? [announcement.image_path]
      : [];
  if (!paths.length) return { data: { ...announcement, image_url: null, image_urls: [], image_paths: [] } };

  const signedUrls = await Promise.all(paths.map(async path => {
    const { data, error } = await supabaseAdmin.storage
      .from(PUBMAT_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) {
      return { error: error?.message || 'URL was not returned.' };
    }
    return { url: data.signedUrl };
  }));
  const failure = signedUrls.find(result => 'error' in result);
  if (failure && 'error' in failure) {
    return { error: `Failed to create a signed announcement image URL: ${failure.error}` };
  }
  const urls = signedUrls.flatMap(result => 'url' in result ? [result.url] : []);
  return { data: { ...announcement, image_url: urls[0] || null, image_urls: urls, image_paths: paths } };
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
  let query = supabaseAdmin
    .from('announcement')
    .select('*, author:users!author_id(full_name)')
    .order('created_at', { ascending: false });
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'VIEWER') {
    const tenantId = user.tenant_id;
    if (!tenantId) {
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
    const tenantId = user.tenant_id;
    if (!tenantId) {
      sendError(res, 'User has no assigned Barangay tenant.', 400);
      return;
    }
    if (parsed.data.image_urls?.some(path => !belongsToTenantStoragePath(path, tenantId))
      || (typeof parsed.data.image_path === 'string' && !belongsToTenantStoragePath(parsed.data.image_path, tenantId))) {
      sendError(res, 'Announcement images must point to uploaded files in your Barangay folder.', 403);
      return;
    }
    if ((parsed.data.image_path || parsed.data.image_urls?.length) && parsed.data.image) {
      sendError(res, 'Provide either an uploaded image path or a legacy image payload, not both.', 400);
      return;
    }
    const upload = await uploadPubmat(tenantId, parsed.data.image);
    if (upload.error) {
      sendError(res, upload.error, upload.error.startsWith('Upload a valid') ? 415 : 502);
      return;
    }
    const {
      image: _image,
      image_urls,
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
      image_path: image_path ?? null,
      image_urls: image_urls ?? (image_path ? [image_path] : upload.path ? [upload.path] : []),
      tenant_id: tenantId,
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
    if (status === 'published' && signed.data) {
      await notifyApprovedYouth(tenantId, signed.data.title, signed.data.content);
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

    if (parsed.data.image_urls?.some(path => !belongsToTenantStoragePath(path, existing.tenant_id))
      || (typeof parsed.data.image_path === 'string' && !belongsToTenantStoragePath(parsed.data.image_path, existing.tenant_id))) {
      sendError(res, 'Announcement images must point to uploaded files in its Barangay folder.', 403);
      return;
    }
    if ((parsed.data.image_path || parsed.data.image_urls?.length) && parsed.data.image) {
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
      image_urls,
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
    if (image_path !== undefined) {
      changes.image_path = image_path;
      if (image_urls === undefined) changes.image_urls = image_path ? [image_path] : [];
    } else if (image_urls !== undefined) {
      changes.image_urls = image_urls;
      changes.image_path = null;
    } else if (upload.path) {
      changes.image_path = upload.path;
      changes.image_urls = [upload.path];
    }
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
    const currentPaths: string[] = existing.image_urls?.length
      ? existing.image_urls
      : existing.image_path
        ? [existing.image_path]
        : [];
    const retainedPaths = new Set((data.image_urls as string[] | null) || []);
    const removedPaths = currentPaths.filter(path => !retainedPaths.has(path));
    for (const removedPath of removedPaths) {
      const cleanupError = await deletePubmat(removedPath);
      if (cleanupError) console.error('Updated announcement but could not remove a deleted image:', cleanupError);
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
    let deleteQuery = supabaseAdmin.from('announcement').delete().eq('id', idResult.data).select('id, image_path, image_urls');
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
    const imagePaths = [...new Set([...(data.image_urls || []), ...(data.image_path ? [data.image_path] : [])])];
    const cleanupErrors = await Promise.all(imagePaths.map(deletePubmat));
    const cleanupError = cleanupErrors.find(Boolean);
    if (cleanupError) {
      console.error('Announcement was deleted but one or more pubmats could not be removed:', cleanupError);
    }
    sendSuccess(res, { id: data.id }, cleanupError
      ? 'Announcement deleted; its stored image could not be cleaned up.'
      : 'Announcement deleted.');
  },
);

export default router;
