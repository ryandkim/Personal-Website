import type { APIRoute } from 'astro';
import { authConfigured, cookieOptions, json, NONCE_COOKIE } from '../../../lib/auth';
export const prerender = false;

// Hands out a one-time value that Google signs into the ID token, so a token
// can't be replayed later.
export const POST: APIRoute = ({ cookies }) => {
  if (!authConfigured()) return json({ error: 'Owner sign-in is not set up yet.' }, 503);
  const nonce = crypto.randomUUID();
  cookies.set(NONCE_COOKIE, nonce, cookieOptions(600));
  return json({ nonce });
};
