// Saves text edits made with the on-page Edit button.
// Only the signed-in owner can call it, only existing text fields can change,
// and values are stored as plain text (no HTML), so nothing can inject code.
import type { APIRoute } from 'astro';
import { readFile, writeFile } from 'node:fs/promises';
import { isOwner, json } from '../../lib/auth';
export const prerender = false;

const FILE = new URL('../../content/site.json', import.meta.url);
const MAX_LEN = 2000;

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function textFields(obj: Json, prefix = '', out = new Set<string>()) {
  if (typeof obj === 'string') out.add(prefix);
  else if (obj && typeof obj === 'object')
    for (const [k, v] of Object.entries(obj)) textFields(v as Json, prefix ? `${prefix}.${k}` : k, out);
  return out;
}

function setPath(obj: any, path: string, value: string) {
  const keys = path.split('.');
  const last = keys.pop()!;
  for (const k of keys) obj = obj[k];
  obj[last] = value;
}

const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\r\n?/g, '\n').trim();

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await isOwner(cookies))) return json({ error: 'Not signed in as the owner.' }, 401);
  if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'Bad request' }, 400);

  let changes: Record<string, unknown>;
  try { changes = (await request.json()).changes; } catch { return json({ error: 'Bad request' }, 400); }
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) return json({ error: 'Bad request' }, 400);
  const entries = Object.entries(changes);
  if (entries.length === 0 || entries.length > 100) return json({ error: 'Bad request' }, 400);

  if (import.meta.env.PROD) {
    // Saving on the live site gets connected when the site is published (it will
    // commit the change to GitHub, which rebuilds the site).
    return json({ error: 'Saving on the live site is not connected yet. Edit locally for now.' }, 501);
  }

  const data = JSON.parse(await readFile(FILE, 'utf8')) as Json;
  const allowed = textFields(data);
  for (const [key, value] of entries) {
    if (!allowed.has(key) || typeof value !== 'string') return json({ error: `Field not editable: ${key}` }, 400);
    const v = clean(value);
    if (v.length > MAX_LEN) return json({ error: `Too long: ${key}` }, 400);
    setPath(data, key, v);
  }
  await writeFile(FILE, JSON.stringify(data, null, 2) + '\n');
  return json({ ok: true, saved: entries.length });
};
