import express from 'express';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response as ExpressResponse } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../services/supabase.service.js';
import { authenticateUser, requireActiveUser, requireRoles } from '../middleware/auth.js';
import { sendError, sendSuccess } from '../utils/response.js';
import type { AuthRequest } from '../types/database.types.js';

const router = express.Router();
const publishSchema = z.object({ announcement_id: z.string().uuid() });
const FacebookIntegrationSchema = z.object({
  page_id: z.string().trim().min(1).max(200),
  page_access_token: z.string().trim().min(1).max(4096),
});

function requireBarangayAdminOnly(req: Request, res: ExpressResponse, next: NextFunction): void {
  const user = (req as AuthRequest).user;
  if (!user) {
    sendError(res, 'User is not authenticated.', 401);
    return;
  }
  if (user.role !== 'BARANGAY_ADMIN') {
    sendError(res, 'Only Barangay Admins can manage Facebook Page integrations.', 403);
    return;
  }
  next();
}

function facebookEncryptionKey(): Buffer {
  const secret = process.env.FACEBOOK_INTEGRATION_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('FACEBOOK_INTEGRATION_ENCRYPTION_KEY must be configured as a 32-byte base64 or 64-character hex key.');
  }
  const key = /^[a-f0-9]{64}$/i.test(secret)
    ? Buffer.from(secret, 'hex')
    : Buffer.from(secret, 'base64');
  if (key.length !== 32 || (!/^[a-f0-9]{64}$/i.test(secret) && key.toString('base64') !== secret)) {
    throw new Error('FACEBOOK_INTEGRATION_ENCRYPTION_KEY must be configured as a 32-byte base64 or 64-character hex key.');
  }
  return key;
}

function encryptPageToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', facebookEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptPageToken(ciphertext: string): string {
  const [version, ivEncoded, tagEncoded, encryptedEncoded] = ciphertext.split(':');
  if (version !== 'v1' || !ivEncoded || !tagEncoded || !encryptedEncoded) {
    throw new Error('Stored Facebook Page token has an unsupported encrypted format.');
  }
  const decipher = createDecipheriv('aes-256-gcm', facebookEncryptionKey(), Buffer.from(ivEncoded, 'base64'));
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

async function verifyFacebookPage(pageId: string, pageAccessToken: string): Promise<{ id: string; name: string }> {
  const version = process.env.FACEBOOK_GRAPH_VERSION || 'v25.0';
  const url = new URL(`https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(pageId)}`);
  url.searchParams.set('fields', 'id,name');
  url.searchParams.set('access_token', pageAccessToken);

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('Facebook Graph API could not be reached.');
  }

  const body = await response.json().catch(() => null) as
    | { id?: string; name?: string; error?: { message?: string } }
    | null;
  if (!response.ok || !body?.id || !body.name) {
    throw new Error(body?.error?.message || `Facebook Page verification failed with status ${response.status}.`);
  }
  if (body.id !== pageId) {
    throw new Error('Facebook returned a different Page ID than the one requested.');
  }
  return { id: body.id, name: body.name };
}

router.get(
  '/facebook/integration',
  authenticateUser,
  requireActiveUser,
  requireBarangayAdminOnly,
  async (req, res) => {
    const user = (req as AuthRequest).user!;
    if (!user.tenant_id) {
      sendError(res, 'User has no assigned Barangay tenant.', 403);
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('facebook_integration')
      .select('id, tenant_id, page_id, page_name, connected_at, connected_by, is_active, last_verified_at, created_at, updated_at')
      .eq('tenant_id', user.tenant_id)
      .maybeSingle();

    if (error) {
      sendError(res, `Failed to load Facebook integration: ${error.message}`, 500);
      return;
    }
    const activeConnection = data?.is_active ? data : null;
    sendSuccess(res, activeConnection, activeConnection ? 'Facebook Page connection retrieved.' : 'No active Facebook Page connection.');
  },
);

router.post(
  '/facebook/integration/test',
  authenticateUser,
  requireActiveUser,
  requireBarangayAdminOnly,
  async (req, res) => {
    const user = (req as AuthRequest).user!;
    if (!user.tenant_id) {
      sendError(res, 'User has no assigned Barangay tenant.', 403);
      return;
    }
    const parsed = FacebookIntegrationSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Page ID and Page Access Token are required.', 400, parsed.error.flatten().fieldErrors);
      return;
    }
    try {
      const page = await verifyFacebookPage(parsed.data.page_id, parsed.data.page_access_token);
      sendSuccess(res, { page_id: page.id, page_name: page.name }, `Connected to Facebook Page "${page.name}".`);
    } catch (error) {
      sendError(res, error instanceof Error ? error.message : 'Facebook Page verification failed.', 502);
    }
  },
);

router.post(
  '/facebook/integration',
  authenticateUser,
  requireActiveUser,
  requireBarangayAdminOnly,
  async (req, res) => {
    const user = (req as AuthRequest).user!;
    if (!user.tenant_id) {
      sendError(res, 'User has no assigned Barangay tenant.', 403);
      return;
    }

    const parsed = FacebookIntegrationSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Page ID and Page Access Token are required.', 400, parsed.error.flatten().fieldErrors);
      return;
    }

    let page: { id: string; name: string };
    let encryptedToken: string;
    try {
      page = await verifyFacebookPage(parsed.data.page_id, parsed.data.page_access_token);
      encryptedToken = encryptPageToken(parsed.data.page_access_token);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Facebook Page connection could not be verified.';
      sendError(res, message, message.includes('FACEBOOK_INTEGRATION_ENCRYPTION_KEY') ? 503 : 502);
      return;
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('facebook_integration')
      .upsert({
        tenant_id: user.tenant_id,
        page_id: page.id,
        page_name: page.name,
        page_access_token: encryptedToken,
        connected_at: now,
        connected_by: user.id,
        is_active: true,
        last_verified_at: now,
        updated_at: now,
      }, { onConflict: 'tenant_id' })
      .select('id, tenant_id, page_id, page_name, connected_at, connected_by, is_active, last_verified_at, created_at, updated_at')
      .single();

    if (error || !data) {
      sendError(res, `Failed to save Facebook Page connection: ${error?.message || 'No connection record was returned.'}`, 500);
      return;
    }
    sendSuccess(res, data, `Facebook Page "${page.name}" connected successfully.`);
  },
);

router.delete(
  '/facebook/integration',
  authenticateUser,
  requireActiveUser,
  requireBarangayAdminOnly,
  async (req, res) => {
    const user = (req as AuthRequest).user!;
    if (!user.tenant_id) {
      sendError(res, 'User has no assigned Barangay tenant.', 403);
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('facebook_integration')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('tenant_id', user.tenant_id)
      .select('id, tenant_id, page_id, page_name, is_active, updated_at')
      .maybeSingle();

    if (error) {
      sendError(res, `Failed to disconnect Facebook Page: ${error.message}`, 500);
      return;
    }
    if (!data) {
      sendError(res, 'No Facebook Page connection exists for this Barangay.', 404);
      return;
    }
    sendSuccess(res, data, 'Facebook Page disconnected.');
  },
);

router.post(
  '/facebook/publish',
  authenticateUser,
  requireActiveUser,
  requireRoles('BARANGAY_ADMIN', 'SUPER_ADMIN'),
  async (req, res) => {
    const parsed = publishSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'announcement_id must be a valid UUID.', 400, parsed.error.flatten().fieldErrors);
      return;
    }

    const user = (req as AuthRequest).user!;
    const { data: announcement, error: announcementError } = await supabaseAdmin
      .from('announcement')
      .select('id, tenant_id, title, content, what, where_text, event_when, hashtags, image_path, status')
      .eq('id', parsed.data.announcement_id)
      .maybeSingle();

    if (announcementError) {
      sendError(res, 'Unable to load the announcement for Facebook publishing.', 500);
      return;
    }
    if (!announcement) {
      sendError(res, 'Announcement not found.', 404);
      return;
    }
    if (user.role !== 'SUPER_ADMIN' && announcement.tenant_id !== user.tenant_id) {
      sendError(res, 'You are not authorized to publish this announcement.', 403);
      return;
    }
    if (announcement.status !== 'published') {
      sendError(res, 'Only published announcements can be sent to Facebook.', 409);
      return;
    }

    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('facebook_integration')
      .select('page_id, page_access_token, is_active')
      .eq('tenant_id', announcement.tenant_id)
      .maybeSingle();

    const integrationTableMissing = Boolean(integrationError && (
      integrationError.code === '42P01'
      || integrationError.code === 'PGRST205'
    ));
    if (integrationError && !integrationTableMissing) {
      sendError(res, `Failed to retrieve this Barangay's Facebook connection: ${integrationError.message}`, 500);
      return;
    }

    let pageId: string | undefined;
    let pageAccessToken: string | undefined;
    if (integration && !integrationTableMissing) {
      if (!integration.is_active) {
        sendError(res, 'Facebook Page not connected. Please connect your Page in Settings.', 409);
        return;
      }
      try {
        pageId = integration.page_id;
        pageAccessToken = decryptPageToken(integration.page_access_token);
      } catch (error) {
        sendError(res, error instanceof Error ? error.message : 'Stored Facebook connection could not be decrypted.', 503);
        return;
      }
    } else {
      pageId = process.env.FACEBOOK_PAGE_ID;
      pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
      if (!pageId || !pageAccessToken) {
        sendError(res, 'Facebook Page not connected. Please connect your Page in Settings.', 409);
        return;
      }
    }

    if (!pageId || !pageAccessToken) {
      sendError(res, 'Facebook Page not connected. Please connect your Page in Settings.', 409);
      return;
    }

    const version = process.env.FACEBOOK_GRAPH_VERSION || 'v25.0';
    const parts: string[] = [];
parts.push('📢 ' + announcement.title.toUpperCase());
parts.push('━━━━━━━━━━━━━━━━━━━━━━');
if (announcement.what) parts.push('🎯 WHAT\n' + announcement.what);
if (announcement.where_text) parts.push('📍 WHERE\n' + announcement.where_text);
if (announcement.event_when) parts.push('📅 WHEN\n' + announcement.event_when);
if (announcement.content) parts.push('📝 DETAILS\n' + announcement.content);
parts.push('━━━━━━━━━━━━━━━━━━━━━━');
if (announcement.hashtags) parts.push(announcement.hashtags);
const message = parts.join('\n\n');

    let imageUrl: string | null = null;
    if (announcement.image_path) {
      const { data: signedImage, error: signedImageError } = await supabaseAdmin.storage
        .from('announcement-pubmats')
        .createSignedUrl(announcement.image_path, 60 * 60);
      if (signedImageError || !signedImage?.signedUrl) {
        sendError(res, `The announcement image could not be prepared for Facebook: ${signedImageError?.message || 'No signed URL was returned.'}`, 502);
        return;
      }
      imageUrl = signedImage.signedUrl;
    }

    const graphUrl = `https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(pageId)}/${imageUrl ? 'photos' : 'feed'}`;
    const graphParams = imageUrl
      ? new URLSearchParams({ url: imageUrl, caption: message, access_token: pageAccessToken })
      : new URLSearchParams({ message, access_token: pageAccessToken });
    try {
      const graphResponse = await fetch(graphUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: graphParams,
      });
      const graphBody = await graphResponse.json().catch(() => null) as
        | { id?: string; post_id?: string; post_url?: string; created_time?: string; posted_at?: string; error?: { message?: string; type?: string; code?: number } }
        | null;

      if (!graphResponse.ok || !graphBody?.id) {
        const apiMessage = graphBody?.error?.message;
        const graphError = graphBody?.error;
        console.error('Facebook Graph API publishing failed', {
          status: graphResponse.status,
          code: graphError?.code,
          type: graphError?.type,
          message: apiMessage,
        });
        sendError(res, apiMessage
          ? `Facebook publishing failed: ${apiMessage}`
          : `Facebook publishing failed with status ${graphResponse.status}.`, 502, {
            graph: {
              code: graphError?.code,
              type: graphError?.type,
              message: apiMessage,
            },
          });
        return;
      }

      const facebookPostId = graphBody.post_id || graphBody.id;
      const postUrl = graphBody.post_url || `https://www.facebook.com/${encodeURIComponent(facebookPostId)}`;
      const postedAt = graphBody.posted_at || graphBody.created_time || new Date().toISOString();
      const { data: persistedPost, error: persistenceError } = await supabaseAdmin
        .from('social_media_posts')
        .insert({
          tenant_id: announcement.tenant_id,
          platform: 'facebook',
          post_url: postUrl,
          content: message,
          posted_at: postedAt,
        })
        .select('id, post_url, posted_at')
        .single();

      if (persistenceError || !persistedPost) {
        const dbMessage = persistenceError?.message || 'The Facebook post could not be persisted.';
        console.error('Facebook post persistence failed', {
          tenantId: announcement.tenant_id,
          announcementId: announcement.id,
          message: dbMessage,
        });
        sendError(res, `Facebook published, but saving the social post failed: ${dbMessage}`, 500);
        return;
      }

      sendSuccess(res, {
        id: persistedPost.id,
        post_id: facebookPostId,
        post_url: persistedPost.post_url,
        posted_at: persistedPost.posted_at,
        persisted: true,
      }, 'Announcement published to Facebook.');
    } catch {
      sendError(res, 'Facebook publishing failed because the Meta Graph API could not be reached.', 502);
    }
  },
);

export default router;
