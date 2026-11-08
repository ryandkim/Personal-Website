// Loads every project's portfolio.json at build time.
// Order of preference: the file on GitHub, then the local copy in
// src/content/projects/. Private repos need GITHUB_TOKEN (read-only) in .env
// or in the host's environment; without it the local copies are used.
import { GITHUB_TOKEN } from 'astro:env/server';
import { projectSources, type ProjectSource } from '../data/projects';

export interface Portfolio {
  name: string;
  tagline: string;
  status: string;
  tags: string[];
  order?: number;
  hidden?: boolean;
  summary: string;
  problem?: string;
  how?: string[];
  stack?: string[];
  highlights?: string[];
  links?: { demo?: string; video?: string; site?: string };
}

export interface Project extends Portfolio {
  slug: string;
  repoUrl?: string; // only for public repos
  updated?: string; // ISO date of the latest commit
  source: 'github' | 'local';
}

const local = import.meta.glob<Portfolio>('../content/projects/*.json', { eager: true, import: 'default' });

const enc = (p: string) => p.split('/').map(encodeURIComponent).join('/');

async function gh(path: string, accept = 'application/vnd.github+json') {
  const headers: Record<string, string> = { Accept: accept, 'User-Agent': 'personal-site-build', 'X-GitHub-Api-Version': '2022-11-28' };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com/${path}`, { headers, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res;
}

function valid(p: any): p is Portfolio {
  return p && typeof p.name === 'string' && typeof p.summary === 'string' && Array.isArray(p.tags);
}

async function load(src: ProjectSource): Promise<Project | null> {
  const fallback = local[`../content/projects/${src.slug}.json`];
  let data: Portfolio | undefined;
  let updated: string | undefined;
  let source: Project['source'] = 'local';
  // Skip the network for private repos when there is no token: it would only 404.
  if (GITHUB_TOKEN || src.public) {
    try {
      const raw = await (await gh(`repos/${src.repo}/contents/${enc(src.file)}`, 'application/vnd.github.raw+json')).json();
      if (valid(raw)) { data = raw; source = 'github'; }
      else console.warn(`[portfolio] ${src.slug}: portfolio.json is missing name, summary or tags; using local copy`);
    } catch (e) {
      console.warn(`[portfolio] ${src.slug}: ${(e as Error).message}; using local copy`);
    }
    try {
      const q = src.activity ? `&path=${encodeURIComponent(src.activity)}` : '';
      const [c] = await (await gh(`repos/${src.repo}/commits?per_page=1${q}`)).json();
      updated = c?.commit?.committer?.date;
    } catch { /* last-updated date is optional */ }
  }
  data ??= fallback;
  if (!data || data.hidden) return null;
  return {
    ...data,
    slug: src.slug,
    repoUrl: src.public ? `https://github.com/${src.repo}` : undefined,
    updated,
    source,
  };
}

let cache: Promise<Project[]> | undefined;

export function getProjects(): Promise<Project[]> {
  cache ??= Promise.all(projectSources.map(load)).then((list) =>
    (list.filter(Boolean) as Project[]).sort((a, b) => (a.order ?? 99) - (b.order ?? 99)),
  );
  return cache;
}

export const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
