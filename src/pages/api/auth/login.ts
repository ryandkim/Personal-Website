import type { APIRoute } from 'astro';
import {
  authConfigured, createSession, cookieOptions, json, NONCE_COOKIE, rateLimited,
  SESSION_COOKIE, SESSION_MAX_AGE, verifyGoogleOwner,
} from '../../../lib/auth';
export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  if (!authConfigured()) return json({ error: 'Owner sign-in is not set up yet.' }, 503);
  if (rateLimited(clientAddress ?? 'unknown')) return json({ error: 'Too many attempts. Try again later.' }, 429);
  if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'Bad request' }, 400);

  let credential = '';
  try { credential = String((await request.json()).credential ?? ''); } catch { /* fall through */ }
  const nonce = cookies.get(NONCE_COOKIE)?.value ?? '';
  cookies.delete(NONCE_COOKIE, { path: '/' });
  if (!credential || credential.length > 4096) return json({ error: 'Bad request' }, 400);

  const email = await verifyGoogleOwner(credential, nonce);
  // Same answer for every failure, so the page reveals nothing about why.
  if (!email) return json({ error: 'This account is not allowed to edit this site.' }, 403);

  cookies.set(SESSION_COOKIE, await createSession(email), cookieOptions(SESSION_MAX_AGE));
  return json({ ok: true });
};
