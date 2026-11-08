// Saves text edits made with the on-page Edit button.
// Only the signed-in owner can call it, only existing text fields can change,
// and values are stored as plain text (no HTML), so nothing can inject code.
//
// On your computer: writes src/content/site.json (the page updates right away),
// then commits that one file and pushes it to GitHub.
// On the live site: commits site.json to GitHub through the API (needs
// SITE_EDIT_TOKEN), and Vercel rebuilds the site with the change.
import type { APIRoute } from 'astro';
import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { SITE_EDIT_TOKEN, SITE_REPO } from 'astro:env/server';
import { isOwner, json } from '../../lib/auth';
export const prerender = false;

const FILE = new URL('../../content/site.json', import.meta.url);
const REPO_PATH = 'src/content/site.json';
const MAX_LEN = 2000;
const run = promisify(execFile);

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
const serialize = (data: Json) => JSON.stringify(data, null, 2) + '\n';

function apply(data: Json, entries: [string, unknown][]): string | null {
  const allowed = textFields(data);
  for (const [key, value] of entries) {
    if (!allowed.has(key) || typeof value !== 'string') return `Field not editable: ${key}`;
    const v = clean(value);
    if (v.length > MAX_LEN) return `Too long: ${key}`;
    setPath(data, key, v);
  }
  return null;
}

const commitMessage = (entries: [string, unknown][]) =>
  `Edit site text: ${entries.map(([k]) => k).slice(0, 5).join(', ')}${entries.length > 5 ? ', …' : ''}`;

// Local: write the file, then commit and push just that file.
async function saveLocal(entries: [string, unknown][]) {
  const data = JSON.parse(await readFile(FILE, 'utf8')) as Json;
  const err = apply(data, entries);
  if (err) return json({ error: err }, 400);
  await writeFile(FILE, serialize(data));

  const file = fileURLToPath(FILE);
  const git = (...args: string[]) => run('git', args, { cwd: dirname(file), timeout: 30_000 });
  try {
    await git('add', '--', file);
    await git('commit', '-m', commitMessage(entries), '--', file);
  } catch (e) {
    console.warn('[save] git commit failed:', (e as Error).message);
    return json({ ok: true, message: 'Saved here, but the git commit failed. Check the terminal.' });
  }
  try {
    await git('push');
    return json({ ok: true, message: 'Saved and pushed to GitHub' });
  } catch (e) {
    console.warn('[save] git push failed:', (e as Error).message);
    return json({ ok: true, message: 'Saved and committed. Push failed: run git pull, then git push.' });
  }
}

// Live site: read the latest site.json from GitHub, apply the edit, commit it back.
async function saveToGitHub(entries: [string, unknown][]) {
  if (!SITE_EDIT_TOKEN) return json({ error: 'Live saving is not set up: add SITE_EDIT_TOKEN on Vercel.' }, 501);
  const branch = process.env.VERCEL_GIT_COMMIT_REF;
  if (!branch) return json({ error: 'Unknown branch for this deployment.' }, 500);
  const url = `https://api.github.com/repos/${SITE_REPO}/contents/${REPO_PATH}`;
  const headers = { Authorization: `Bearer ${SITE_EDIT_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'personal-site-editor', 'X-GitHub-Api-Version': '2022-11-28' };

  const cur = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers });
  if (!cur.ok) return json({ error: `Could not read site.json from GitHub (${cur.status}).` }, 502);
  const { sha, content } = await cur.json();
  const data = JSON.parse(Buffer.from(content, 'base64').toString('utf8')) as Json;
  const err = apply(data, entries);
  if (err) return json({ error: err }, 400);

  const put = await fetch(url, {
    method: 'PUT', headers,
    body: JSON.stringify({ message: commitMessage(entries), content: Buffer.from(serialize(data)).toString('base64'), sha, branch }),
  });
  if (!put.ok) return json({ error: `GitHub save failed (${put.status}). Try again.` }, 502);
  return json({ ok: true, message: 'Saved to GitHub. The live site updates in about a minute.' });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await isOwner(cookies))) return json({ error: 'Not signed in as the owner.' }, 401);
  if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'Bad request' }, 400);

  let changes: Record<string, unknown>;
  try { changes = (await request.json()).changes; } catch { return json({ error: 'Bad request' }, 400); }
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) return json({ error: 'Bad request' }, 400);
  const entries = Object.entries(changes);
  if (entries.length === 0 || entries.length > 100) return json({ error: 'Bad request' }, 400);

  return import.meta.env.PROD ? saveToGitHub(entries) : saveLocal(entries);
};
