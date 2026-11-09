// Replay demos: saved agent runs that visitors click through on a project page.
// Each project's demo lives in src/content/demos/<slug>.json and is made by
// scripts/demos/record.py. No AI model is called when a visitor presses play.

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
  | { type: 'list'; title?: string; items: { title: string; meta?: string; detail?: string; tone?: Tone; badge?: string }[] }
  | { type: 'avatar'; title?: string; picks: OutfitPick[] };

// Wardrobe: one outfit shown on the rotating 3D mannequin.
export interface OutfitItem {
  label: string;
  slot: 'top' | 'outer' | 'bottom' | 'shoes';
  img?: string; // transparent product cut-out, e.g. /media/demos/wardrobe/x.webp
  color: string; // fallback / shoe color
  fit?: 'short'; // shorts
  view?: 'side' | 'top'; // shoe photo angle
}
export interface OutfitPick { title: string; meta?: string; body?: string; items: OutfitItem[] }

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
  layout?: 'wide'; // steps across the top, result full width
  extra?: 'dashboard-walkthrough' | 'skills-session'; // a guided tour shown under the replay
  scenarios: DemoScenario[];
}

const demos = import.meta.glob<Demo>('../content/demos/*.json', { eager: true, import: 'default' });

export function getDemo(slug: string): Demo | undefined {
  const d = demos[`../content/demos/${slug}.json`];
  return d && d.scenarios?.length ? d : undefined;
}
