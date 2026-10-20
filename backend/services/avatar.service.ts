import { supabaseAdmin } from './supabase.service.js';

const AVATAR_URL_TTL_SECONDS = 24 * 60 * 60;

export async function resolveAvatarUrl(storagePath: string | null | undefined): Promise<string | null> {
  if (!storagePath) return null;
  if (/^https?:\/\//i.test(storagePath)) return storagePath;

  const { data, error } = await supabaseAdmin.storage
    .from('avatars')
    .createSignedUrl(storagePath, AVATAR_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create avatar URL: ${error?.message || 'Storage returned no signed URL.'}`);
  }

  return data.signedUrl;
}
