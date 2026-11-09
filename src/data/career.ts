import data from '../content/career.json';

// Your career timeline. Both the plain timeline on the home page and the
// career quest game (/quest) read from src/content/career.json. Edit wording
// there, or on the page with the owner Edit button.
//
// In career.json, each stage is one step of the journey, oldest first. In the game, each stage
// is a glowing marker you discover in order; finishing a region opens the gate
// to the next one. Fields:
//   org, role, dates, location  shown everywhere
//   summary                     one line shown before "highlights"
//   highlights                  bullet points (from the résumé; edit freely)
//   region                      which game area it sits in (see `regions` below)
//   discovery                   a short line the game shows when you find it

export type Stage = {
  id: string;
  kind: 'education' | 'work' | 'project';
  org: string;
  role: string;
  start: string;
  end: string;
  location: string;
  summary: string;
  highlights: string[];
  region: 'campus' | 'city' | 'lakeshore';
  discovery: string;
};

export type RegionId = Stage['region'];

export const stages = data.stages as Stage[];

// Game regions, west to east. `name` shows on screen when you enter.
export const regions = data.regions as Record<RegionId, { name: string; years: string; hint: string }>;

// Shown as one block in the plain timeline.
export const groups = data.groups as { org: string; ids: string[] }[];
