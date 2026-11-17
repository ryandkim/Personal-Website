// Adds, replaces, crops and removes photos and videos in the "Recent highlights"
// strip and the Games / Music / Travel galleries (src/content/media.json).
// Owner only: every call checks the owner session cookie.
//
// Two steps, so each request stays small:
//   1. POST /api/media?step=upload   body = one file's bytes (up to 4 MB).
//      The file type is read from its first bytes (not trusted from the
//      browser), and the server picks the file name.
//        On your computer: written to public/media/uploads/.
//        On the live site: stored on GitHub as a git blob (not yet committed).
//   2. POST /api/media               JSON { lists, files }
//      Sent when the owner presses Save. Writes the new order of each changed
//      gallery to media.json and commits it with the uploaded files in one
//      commit, so Vercel rebuilds once.
//
// Videos over 4 MB go to Vercel Blob instead (see /api/media-blob), because
// Vercel caps a request at 4.5 MB and GitHub is a poor home for big videos.
// GET /api/media tells the editor whether Blob is set up.
import type { APIRoute } from 'astro';
import { readFile, writeFile, mkdir, access, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { SITE_EDIT_TOKEN, SITE_REPO, BLOB_READ_WRITE_TOKEN } from 'astro:env/server';
import { isOwner, json } from '../../lib/auth';
export const prerender = false;

const ROOT = new URL('../../../', import.meta.url); // repo root (used only when running locally)
const MEDIA_FILE = 'src/content/media.json';
const UPLOAD_DIR = 'public/media/uploads';
const MAX_REPO_BYTES = 4 * 1024 * 1024;
const run = promisify(execFile);

// ---- File type sniffing ----
const EXT_KIND: Record<string, 'image' | 'video'> = {
  jpg: 'image', png: 'image', gif: 'image', webp: 'image', avif: 'image',
  mp4: 'video', mov: 'video', webm: 'video',
};
function sniff(b: Uint8Array): string | null {
  const s = (o: number, n: number) => String.fromCharCode(...b.subarray(o, o + n));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b[0] === 0x89 && s(1, 3) === 'PNG') return 'png';
  if (s(0, 4) === 'GIF8') return 'gif';
  if (s(0, 4) === 'RIFF' && s(8, 4) === 'WEBP') return 'webp';
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'webm';
  if (s(4, 4) === 'ftyp') {
    const brand = s(8, 4);
    if (brand === 'avif' || brand === 'avis') return 'avif';
    if (/^(heic|heix|hevc|heim|heis|mif1|msf1)$/.test(brand)) return 'heic';
    if (brand === 'qt  ') return 'mov';
    return 'mp4';
  }
  return null;
}

const slug = (name: string) =>
  name.replace(/\.[^.]*$/, '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'media';
const stamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');

// ---- GitHub API (live site) ----
const ghHeaders = () => ({ Authorization: `Bearer ${SITE_EDIT_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'personal-site-editor', 'X-GitHub-Api-Version': '2022-11-28' });
async function gh(path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.github.com/repos/${SITE_REPO}/${path}`, { ...init, headers: { ...ghHeaders(), ...(init.body ? { 'content-type': 'application/json' } : {}) } });
  if (!res.ok) throw Object.assign(new Error(`GitHub request failed: ${path.split('?')[0]} (${res.status})`), { status: res.status });
  return res.json();
}
const branchName = () => process.env.VERCEL_GIT_COMMIT_REF;

// ---- Items ----
type Item = Record<string, string>;
const YT = /^[\w-]{11}$/;
const UPLOAD_SRC = /^\/media\/uploads\/[a-z0-9-]+\.(jpg|png|gif|webp|avif|mp4|mov|webm)$/;
const FILE_PATH = /^public\/media\/uploads\/[a-z0-9-]+\.(jpg|png|gif|webp|avif|mp4|mov|webm)$/;

function httpsUrl(v: unknown) {
  if (typeof v !== 'string' || v.length > 1000) return null;
  try { const u = new URL(v); return u.protocol === 'https:' ? u.href : null; } catch { return null; }
}

/** Check one new item from the browser and keep only known fields. */
function cleanItem(raw: any, uploaded: Set<string>): Item | string {
  if (!raw || typeof raw !== 'object') return 'Bad item';
  if (raw.type === 'image' || raw.type === 'video') {
    const src = String(raw.src ?? '');
    if (UPLOAD_SRC.test(src)) {
      if (!uploaded.has(`public${src}`)) return 'Unknown uploaded file';
      return { type: raw.type, src };
    }
    const url = httpsUrl(src);
    return url ? { type: raw.type, src: url } : 'Links must start with https://';
  }
  if (raw.type === 'youtube') return YT.test(String(raw.id)) ? { type: 'youtube', id: String(raw.id) } : 'Not a YouTube video id';
  if (raw.type === 'linkedin') {
    const url = httpsUrl(raw.embed);
    return url?.startsWith('https://www.linkedin.com/embed/') ? { type: 'linkedin', embed: url } : 'Not a LinkedIn embed link';
  }
  return 'Unknown item type';
}

/** Find the list ("highlights" or "beyond.2") inside media.json. */
function listOf(data: any, list: string): any[] | null {
  if (list === 'highlights') return Array.isArray(data.highlights) ? data.highlights : null;
  const m = list.match(/^beyond\.(\d+)$/);
  return m && Array.isArray(data.beyond?.[+m[1]]?.items) ? data.beyond[+m[1]].items : null;
}

/** Uploaded files no item uses any more (after a replace or remove), to delete in the same commit. */
function orphans(data: any, before: any[]): string[] {
  const used = new Set<string>();
  for (const it of [...(data.highlights ?? []), ...(data.beyond ?? []).flatMap((b: any) => b.items ?? [])]) if (typeof it?.src === 'string') used.add(it.src);
  return [...new Set(before.map((it) => it?.src))].filter((src): src is string => typeof src === 'string' && UPLOAD_SRC.test(src) && !used.has(src)).map((src) => `public${src}`);
}

type Result = { error: string } | { message: string; removed: string[] };

const clean = (v: unknown) => String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\r\n?/g, '\n').trim().slice(0, 2000);

/**
 * Apply the owner's edits to media.json. The browser sends the new order of
 * every gallery it changed:
 *   { lists: { "highlights": [ { keep: 0, text: { caption, date } },          // existing item, maybe new caption
 *                              { keep: 2, item: { type, src } },            // existing item with new photo
 *                              { item: { type: "youtube", id }, text } ] } } // new item
 * Items left out are removed. Returns an error, or a commit message and files to delete.
 */
function change(data: any, body: any, uploaded: Set<string>): Result {
  const lists = body?.lists;
  if (!lists || typeof lists !== 'object' || Array.isArray(lists)) return { error: 'Bad request' };
  const before: any[] = [];
  const names: string[] = [];
  for (const [name, slots] of Object.entries(lists)) {
    const list = listOf(data, name);
    if (!list) return { error: `Unknown gallery: ${name}` };
    if (!Array.isArray(slots) || slots.length > 60) return { error: 'Bad request' };
    const seen = new Set<number>();
    const next: any[] = [];
    for (const slot of slots as any[]) {
      if (!slot || typeof slot !== 'object') return { error: 'Bad request' };
      let base: any = {};
      if (slot.keep !== undefined) {
        const k = Number(slot.keep);
        if (!Number.isInteger(k) || k < 0 || k >= list.length || seen.has(k)) return { error: 'The page is out of date. Reload it and try again.' };
        seen.add(k);
        base = { ...list[k] };
      }
      if (slot.item !== undefined) {
        const it = cleanItem(slot.item, uploaded);
        if (typeof it === 'string') return { error: it };
        // New media in an existing box: keep its caption, date and link.
        const keep: Item = {};
        for (const f of ['caption', 'date', 'link', 'alt']) if (typeof base[f] === 'string') keep[f] = base[f];
        base = { ...it, ...keep };
      } else if (slot.keep === undefined) return { error: 'Bad request' };
      if (slot.text && typeof slot.text === 'object')
        for (const f of ['caption', 'date']) if (typeof slot.text[f] === 'string') base[f] = clean(slot.text[f]);
      if (typeof base.caption !== 'string') base.caption = '';
      if (base.date === '') delete base.date;
      next.push(base);
    }
    before.push(...list);
    // In a gallery, empty placeholder boxes go away once it has real photos or videos.
    const filled = (it: any) => Boolean(it.src || it.id || it.embed);
    const kept = name.startsWith('beyond.') && next.some(filled) ? next.filter(filled) : next;
    list.splice(0, list.length, ...kept);
    names.push(name);
  }
  if (!names.length) return { error: 'Nothing to save' };
  return { message: `Edit photos and videos: ${names.join(', ')}`, removed: orphans(data, before) };
}

const serialize = (data: unknown) => JSON.stringify(data, null, 2) + '\n';

// ---- Routes ----
export const GET: APIRoute = async ({ cookies }) => {
  if (!(await isOwner(cookies))) return json({ error: 'Not signed in as the owner.' }, 401);
  return json({ blob: Boolean(BLOB_READ_WRITE_TOKEN), maxBytes: MAX_REPO_BYTES });
};

export const POST: APIRoute = async ({ request, cookies, url }) => {
  if (!(await isOwner(cookies))) return json({ error: 'Not signed in as the owner.' }, 401);
  if (import.meta.env.PROD && !SITE_EDIT_TOKEN) return json({ error: 'Live saving is not set up: add SITE_EDIT_TOKEN on Vercel.' }, 501);
  try {
    return url.searchParams.get('step') === 'upload' ? await upload(request, url) : await apply(request);
  } catch (e) {
    console.warn('[media]', (e as Error).message);
    return json({ error: (e as Error).message }, 502);
  }
};

async function upload(request: Request, url: URL) {
  if (request.headers.get('content-type') !== 'application/octet-stream') return json({ error: 'Bad request' }, 400);
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length === 0) return json({ error: 'Empty file' }, 400);
  if (bytes.length > MAX_REPO_BYTES) return json({ error: 'File is over 4 MB.' }, 413);
  const ext = sniff(bytes);
  if (ext === 'heic') return json({ error: 'HEIC photos don’t show in most browsers. Export it as JPEG and try again.' }, 415);
  if (!ext) return json({ error: 'Use a JPEG, PNG, GIF, WebP or AVIF photo, or an MP4, MOV or WebM video.' }, 415);

  const name = `${stamp()}-${randomBytes(3).toString('hex')}-${slug(url.searchParams.get('name') ?? '')}.${ext}`;
  const path = `${UPLOAD_DIR}/${name}`;
  let sha: string | undefined;
  if (import.meta.env.PROD) {
    ({ sha } = await gh('git/blobs', { method: 'POST', body: JSON.stringify({ content: Buffer.from(bytes).toString('base64'), encoding: 'base64' }) }));
  } else {
    const dir = new URL(`${UPLOAD_DIR}/`, ROOT);
    await mkdir(dir, { recursive: true });
    await writeFile(new URL(name, dir), bytes);
  }
  return json({ path, sha, src: `/media/uploads/${name}`, kind: EXT_KIND[ext] });
}

async function apply(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'Bad request' }, 400);
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Bad request' }, 400); }
  const files: { path: string; sha?: string }[] = Array.isArray(body?.files) ? body.files : [];
  if (files.length > 60 || files.some((f) => !f || !FILE_PATH.test(String(f.path)) || (import.meta.env.PROD && !/^[0-9a-f]{40}$/.test(String(f.sha)))))
    return json({ error: 'Bad request' }, 400);
  const uploaded = new Set(files.map((f) => f.path));

  return import.meta.env.PROD ? applyLive(body, files, uploaded) : applyLocal(body, files, uploaded);
}

// On your computer: write media.json, commit it with the new files, push.
async function applyLocal(body: any, files: { path: string }[], uploaded: Set<string>) {
  for (const f of files) {
    try { await access(new URL(f.path, ROOT)); } catch { return json({ error: 'Uploaded file not found. Try again.' }, 400); }
  }
  const abs = new URL(MEDIA_FILE, ROOT);
  const data = JSON.parse(await readFile(abs, 'utf8'));
  const r = change(data, body, uploaded);
  if ('error' in r) return json({ error: r.error }, 400);
  await writeFile(abs, serialize(data));
  for (const p of r.removed) await rm(new URL(p, ROOT), { force: true });

  const paths = [fileURLToPath(abs), ...[...files.map((f) => f.path), ...r.removed].map((p) => fileURLToPath(new URL(p, ROOT)))];
  const git = (...args: string[]) => run('git', args, { cwd: fileURLToPath(ROOT), timeout: 60_000 });
  try {
    await git('add', '-A', '--', ...paths);
    await git('commit', '-m', r.message, '--', ...paths);
  } catch (e) {
    console.warn('[media] git commit failed:', (e as Error).message);
    return json({ ok: true, message: 'Saved here, but the git commit failed. Check the terminal.' });
  }
  try {
    await git('push');
    return json({ ok: true, message: 'Saved and pushed to GitHub' });
  } catch (e) {
    console.warn('[media] git push failed:', (e as Error).message);
    return json({ ok: true, message: 'Saved and committed. Push failed: run git pull, then git push.' });
  }
}

// Live site: one commit with media.json and the uploaded files; Vercel rebuilds.
async function applyLive(body: any, files: { path: string; sha?: string }[], uploaded: Set<string>) {
  const branch = branchName();
  if (!branch) return json({ error: 'Unknown branch for this deployment.' }, 500);
  const ref = `heads/${branch.split('/').map(encodeURIComponent).join('/')}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const head = await gh(`git/ref/${ref}`);
    const commit = await gh(`git/commits/${head.object.sha}`);
    const cur = await gh(`contents/${MEDIA_FILE}?ref=${head.object.sha}`);
    const data = JSON.parse(Buffer.from(cur.content, 'base64').toString('utf8'));
    const r = change(data, body, uploaded);
    if ('error' in r) return json({ error: r.error }, 400);
    const tree = await gh('git/trees', {
      method: 'POST',
      body: JSON.stringify({
        base_tree: commit.tree.sha,
        tree: [
          { path: MEDIA_FILE, mode: '100644', type: 'blob', content: serialize(data) },
          ...files.map((f) => ({ path: f.path, mode: '100644', type: 'blob', sha: f.sha })),
          ...r.removed.filter((p) => !uploaded.has(p)).map((p) => ({ path: p, mode: '100644', type: 'blob', sha: null })),
        ],
      }),
    });
    const next = await gh('git/commits', { method: 'POST', body: JSON.stringify({ message: r.message, tree: tree.sha, parents: [head.object.sha] }) });
    try {
      await gh(`git/refs/${ref}`, { method: 'PATCH', body: JSON.stringify({ sha: next.sha, force: false }) });
      return json({ ok: true, message: 'Saved to GitHub. The live site updates in about a minute.' });
    } catch (e) {
      if ((e as any).status !== 422) throw e; // someone else committed first: try again on top of it
    }
  }
  return json({ error: 'GitHub was busy. Try again.' }, 409);
}
