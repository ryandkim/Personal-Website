// Replay demos: saved agent runs that visitors click through on a project page.
// Each project's demo lives in src/content/demos/<slug>.json and is made by
// scripts/demos/record.py. No AI model is called when a visitor presses play.
// A launch video is picked up automatically from public/media/videos/<slug>.mp4.
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface DemoStep {
  tool: string;
  label: string;
  detail?: string;
  ms?: number; // measured run time, when known
  lines?: string[];
  status?: 'ok' | 'block';
}

type Tone = 'red' | 'orange' | 'blue' | 'green';
export type DemoBlock =
  | { type: 'stats'; items: { label: string; value: string }[] }
  | { type: 'bullets'; title?: string; items: string[] }
  | { type: 'table'; title?: string; columns: string[]; rows: (string | { v: string; tone?: 'up' | 'down' })[][] }
  | { type: 'cards'; title?: string; items: { title: string; meta?: string; body?: string; href?: string; chips?: { label: string; color?: string | null }[] }[] }
  | { type: 'list'; title?: string; items: { title: string; meta?: string; detail?: string; tone?: Tone; badge?: string }[] };

export interface DemoScenario {
  id: string;
  label: string;
  prompt?: string;
  steps: DemoStep[];
  result: DemoBlock[];
}

export interface Demo {
  title: string;
  intro: string;
  recorded: string;
  source: string;
  sample?: boolean;
  scenarios: DemoScenario[];
}

const demos = import.meta.glob<Demo>('../content/demos/*.json', { eager: true, import: 'default' });

export function getDemo(slug: string): Demo | undefined {
  const d = demos[`../content/demos/${slug}.json`];
  return d && d.scenarios?.length ? d : undefined;
}

export function getVideo(slug: string): { src: string; poster?: string } | undefined {
  const dir = join(process.cwd(), 'public', 'media', 'videos');
  if (!existsSync(join(dir, `${slug}.mp4`))) return undefined;
  return {
    src: `/media/videos/${slug}.mp4`,
    poster: existsSync(join(dir, `${slug}.jpg`)) ? `/media/videos/${slug}.jpg` : undefined,
  };
}
