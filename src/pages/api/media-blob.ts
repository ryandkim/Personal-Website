// Hands the owner's browser a short-lived token to upload one big video (or
// photo) straight to Vercel Blob, skipping Vercel's 4.5 MB request limit.
// Only works when a Blob store is connected to the Vercel project
// (Storage > Create > Blob), which adds BLOB_READ_WRITE_TOKEN.
// Everyone except the signed-in owner is refused before a token is made.
import type { APIRoute } from 'astro';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { BLOB_READ_WRITE_TOKEN } from 'astro:env/server';
import { isOwner, json } from '../../lib/auth';
export const prerender = false;

const MAX_BYTES = 200 * 1024 * 1024;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await isOwner(cookies))) return json({ error: 'Not signed in as the owner.' }, 401);
  if (!BLOB_READ_WRITE_TOKEN) return json({ error: 'Video storage is not set up (BLOB_READ_WRITE_TOKEN).' }, 501);
  let body: HandleUploadBody;
  try { body = await request.json(); } catch { return json({ error: 'Bad request' }, 400); }
  if (body?.type !== 'blob.generate-client-token') return json({ error: 'Bad request' }, 400);
  try {
    const result = await handleUpload({
      body,
      request,
      token: BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname) => {
        if (!/^media\/[a-z0-9-]+\.(mp4|mov|webm|jpg|png|gif|webp|avif)$/.test(pathname)) throw new Error('Bad file name');
        return {
          allowedContentTypes: ['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return json(result);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
};
