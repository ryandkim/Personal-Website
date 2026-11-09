// Owner sign-in.
//
// How it stays safe:
// - We ask Google for identity only (the "openid email" scopes). Google sends
//   us a signed ID token saying "this is <email>". We never request or store an
//   access token, so this site has no way to read or change anything in your
//   Google account. Information only flows from Google to the site.
// - The ID token is checked against Google's public keys, our client ID, a
//   one-time nonce, and the owner email. Anyone else is refused.
// - After that the site issues its own short-lived session cookie (HttpOnly,
//   SameSite=Strict, Secure in production), signed with SESSION_SECRET.
import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose';
import type { AstroCookies } from 'astro';
import { GOOGLE_CLIENT_ID } from 'astro:env/client';
import { OWNER_EMAIL, SESSION_SECRET } from 'astro:env/server';

export const SESSION_COOKIE = 'owner_session';
export const NONCE_COOKIE = 'owner_login_nonce';
const SESSION_HOURS = 8;
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export function authConfigured() {
  return Boolean(GOOGLE_CLIENT_ID && OWNER_EMAIL && SESSION_SECRET && SESSION_SECRET.length >= 32);
}

const secretKey = () => new TextEncoder().encode(SESSION_SECRET!);

export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: import.meta.env.PROD,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

/** Verify a Google ID token and return the email only if it is the owner's. */
export async function verifyGoogleOwner(idToken: string, expectedNonce: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(idToken, googleKeys, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: GOOGLE_CLIENT_ID!,
      maxTokenAge: '10m',
    });
    const email = String(payload.email ?? '').toLowerCase();
    if (payload.email_verified !== true) return null;
    if (!expectedNonce || payload.nonce !== expectedNonce) return null;
    if (email !== OWNER_EMAIL!.trim().toLowerCase()) return null;
    return email;
  } catch {
    return null;
  }
}

export async function createSession(email: string) {
  return new SignJWT({ role: 'owner' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(email)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secretKey());
}

export const SESSION_MAX_AGE = SESSION_HOURS * 3600;

/** True only if the request carries a valid, unexpired owner session. */
export async function isOwner(cookies: AstroCookies): Promise<boolean> {
  if (!authConfigured()) return false;
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    return payload.role === 'owner' && payload.sub === OWNER_EMAIL!.trim().toLowerCase();
  } catch {
    return false;
  }
}

/** Plain JSON response with no caching. */
export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
  });
}

// Simple per-IP limit on sign-in attempts (resets when the server restarts).
const attempts = new Map<string, { n: number; until: number }>();
export function rateLimited(ip: string, max = 10, windowMs = 15 * 60_000) {
  const now = Date.now();
  const a = attempts.get(ip);
  if (!a || a.until < now) { attempts.set(ip, { n: 1, until: now + windowMs }); return false; }
  a.n += 1;
  return a.n > max;
}
