// Saves text edits made with the owner Edit button.
// Only the signed-in owner can call it, only existing text fields can change,
// and values are stored as plain text (no HTML), so nothing can inject code.
//
// Each editable element has a key that says which file it lives in:
//   "hero.bio"                     src/content/site.json
//   "career:stages.0.summary"      src/content/career.json
//   "media:highlights.1.caption"   src/content/media.json
//   "project:mixr:how.2"           that project's portfolio.json (in its own
//                                  repo) plus the copy in src/content/projects/
//
// On your computer: files in this repo are written (the page updates right
// away), committed, and pushed. On the live site they are committed through
// the GitHub API and Vercel rebuilds. A project's own portfolio.json is always
// updated through the GitHub API, so it needs SITE_EDIT_TOKEN in both places.
import type { APIRoute } from 'astro';
import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { SITE_EDIT_TOKEN, SITE_REPO } from 'astro:env/server';
import { isOwner, json } from '../../lib/auth';
import { projectSources } from '../../data/projects';
export const prerender = false;

const ROOT = new URL('../../../', import.meta.url); // repo root (used only when running locally)
const MAX_LEN = 2000;
const run = promisify(execFile);

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
type Entry = [string, string];

// Ids, file paths and links are not page text, so they can't be changed here.
const LOCKED = new Set(['id', 'ids', 'kind', 'region', 'type', 'src', 'embed', 'link', 'poster', 'status', 'order', 'hidden']);

function textFields(obj: Json, prefix = '', out = new Set<string>()) {
  if (typeof obj === 'string') out.add(prefix);
  else if (obj && typeof obj === 'object')
    for (const [k, v] of Object.entries(obj)) {
      if (LOCKED.has(k) || k === 'links') continue;
      textFields(v as Json, prefix ? `${prefix}.${k}` : k, out);
    }
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

function apply(data: Json, entries: Entry[]): string | null {
  const allowed = textFields(data);
  for (const [key, value] of entries) {
    if (!allowed.has(key)) return `Field not editable: ${key}`;
    const v = clean(value);
    if (v.length > MAX_LEN) return `Too long: ${key}`;
    setPath(data, key, v);
  }
  return null;
}

// Which file a key belongs to.
interface Target { file: string; agent?: { repo: string; path: string } }
function targetOf(store: string): Target | null {
  if (store === 'site') return { file: 'src/content/site.json' };
  if (store === 'career') return { file: 'src/content/career.json' };
  if (store === 'media') return { file: 'src/content/media.json' };
  if (store.startsWith('project:')) {
    const src = projectSources.find((s) => s.slug === store.slice(8));
    if (!src) return null;
    return { file: `src/content/projects/${src.slug}.json`, agent: src.repo ? { repo: src.repo, path: src.file } : undefined };
  }
  return null;
}

function group(entries: Entry[]) {
  const out = new Map<string, Entry[]>();
  for (const [key, value] of entries) {
    let store = 'site', path = key;
    const m = key.match(/^(project:[a-z0-9-]+|career|media):(.+)$/);
    if (m) [, store, path] = m;
    if (!out.has(store)) out.set(store, []);
    out.get(store)!.push([path, value]);
  }
  return out;
}

const describe = (entries: Entry[]) =>
  `Edit site text: ${entries.map(([k]) => k).slice(0, 5).join(', ')}${entries.length > 5 ? ', …' : ''}`;

// ---- GitHub API (live site, and every project's own repo) ----
const ghHeaders = () => ({ Authorization: `Bearer ${SITE_EDIT_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'personal-site-editor', 'X-GitHub-Api-Version': '2022-11-28' });
const enc = (p: string) => p.split('/').map(encodeURIComponent).join('/');

async function ghRead(repo: string, path: string, branch?: string) {
  const url = `https://api.github.com/repos/${repo}/contents/${enc(path)}${branch ? `?ref=${encodeURIComponent(branch)}` : ''}`;
  const res = await fetch(url, { headers: ghHeaders() });
  if (res.status === 404) return { sha: undefined, data: undefined };
  if (!res.ok) throw new Error(`Could not read ${path} from ${repo} (${res.status})`);
  const { sha, content } = await res.json();
  return { sha: sha as string, data: JSON.parse(Buffer.from(content, 'base64').toString('utf8')) as Json };
}

async function ghWrite(repo: string, path: string, data: Json, sha: string | undefined, message: string, branch?: string) {
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${enc(path)}`, {
    method: 'PUT', headers: ghHeaders(),
    body: JSON.stringify({ message, content: Buffer.from(serialize(data)).toString('base64'), sha, ...(branch ? { branch } : {}) }),
  });
  if (!res.ok) throw new Error(`GitHub save to ${repo} failed (${res.status})`);
}

// A project's text lives in its own repo; update it there first.
async function saveAgent(t: Target, entries: Entry[], fallback: Json) {
  const { repo, path } = t.agent!;
  const cur = await ghRead(repo, path);
  const data = cur.data ?? structuredClone(fallback);
  const err = apply(data, entries);
  if (err) throw new Error(err);
  await ghWrite(repo, path, data, cur.sha, describe(entries));
  return data;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await isOwner(cookies))) return json({ error: 'Not signed in as the owner.' }, 401);
  if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'Bad request' }, 400);

  let changes: Record<string, unknown>;
  try { changes = (await request.json()).changes; } catch { return json({ error: 'Bad request' }, 400); }
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) return json({ error: 'Bad request' }, 400);
  const all = Object.entries(changes);
  if (all.length === 0 || all.length > 100) return json({ error: 'Bad request' }, 400);
  if (all.some(([, v]) => typeof v !== 'string')) return json({ error: 'Bad request' }, 400);

  const groups = [...group(all as Entry[])].map(([store, entries]) => ({ store, entries, t: targetOf(store) }));
  const bad = groups.find((g) => !g.t);
  if (bad) return json({ error: `Unknown section: ${bad.store}` }, 400);
  const needsToken = import.meta.env.PROD || groups.some((g) => g.t!.agent);
  if (needsToken && !SITE_EDIT_TOKEN)
    return json({ error: import.meta.env.PROD
      ? 'Live saving is not set up: add SITE_EDIT_TOKEN on Vercel.'
      : 'Project text is stored in each project’s repo. Add SITE_EDIT_TOKEN to .env to edit it here.' }, 501);

  try {
    return import.meta.env.PROD ? await saveLive(groups) : await saveLocal(groups);
  } catch (e) {
    console.warn('[save]', (e as Error).message);
    return json({ error: (e as Error).message }, 502);
  }
};

type Group = { store: string; entries: Entry[]; t: Target | null };

// Local: write the files, commit them, push.
async function saveLocal(groups: Group[]) {
  const files: string[] = [];
  const all: Entry[] = [];
  for (const { entries, t } of groups) {
    const abs = new URL(t!.file, ROOT);
    let data = JSON.parse(await readFile(abs, 'utf8')) as Json;
    if (t!.agent) data = await saveAgent(t!, entries, data); // keep the local copy identical to the repo's
    else {
      const err = apply(data, entries);
      if (err) return json({ error: err }, 400);
    }
    await writeFile(abs, serialize(data));
    files.push(fileURLToPath(abs));
    all.push(...entries);
  }

  const git = (...args: string[]) => run('git', args, { cwd: fileURLToPath(ROOT), timeout: 30_000 });
  try {
    await git('add', '--', ...files);
    await git('commit', '-m', describe(all), '--', ...files);
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

// Live site: commit each changed file to GitHub; Vercel rebuilds.
async function saveLive(groups: Group[]) {
  const branch = process.env.VERCEL_GIT_COMMIT_REF;
  if (!branch) return json({ error: 'Unknown branch for this deployment.' }, 500);
  for (const { entries, t } of groups) {
    const cur = await ghRead(SITE_REPO, t!.file, branch);
    if (!cur.data) return json({ error: `Missing ${t!.file} on GitHub.` }, 502);
    let data = cur.data;
    if (t!.agent) data = await saveAgent(t!, entries, data);
    else {
      const err = apply(data, entries);
      if (err) return json({ error: err }, 400);
    }
    await ghWrite(SITE_REPO, t!.file, data, cur.sha, describe(entries), branch);
  }
  return json({ ok: true, message: 'Saved to GitHub. The live site updates in about a minute.' });
}
