// Where each project's portfolio.json lives on GitHub.
// To add a project: add a line here and put a portfolio.json in that repo
// (copy one from src/content/projects/ as a starting point). The site reads the
// file from GitHub at build time, so pushing a change to it updates the site
// on the next build. If GitHub can't be reached, the copy in
// src/content/projects/<slug>.json is used instead.

export interface ProjectSource {
  slug: string;
  repo: string; // owner/name
  file: string; // path of portfolio.json inside the repo
  activity?: string; // folder whose latest commit counts as "last updated" (default: the whole repo)
  public: boolean; // show a "View code" link (only for public repos)
}

export const projectSources: ProjectSource[] = [
  { slug: 'semiconductor-news', repo: 'ryandkim/Claude.agent_semiconductor_news', file: 'portfolio.json', activity: 'tools', public: false },
  { slug: 'wardrobe-agent', repo: 'ryandkim/Claude.agent_semiconductor_news', file: 'Wardrobe Agent/portfolio.json', activity: 'Wardrobe Agent', public: false },
  { slug: 'networking-tracker', repo: 'ryandkim/Kellogg-Networking-Apps-Tracker', file: 'portfolio.json', public: false },
  { slug: 'kellogg-dashboard', repo: 'ryandkim/Claude.agent_semiconductor_news', file: 'Kellogg Dashboard/portfolio.json', activity: 'Kellogg Dashboard', public: false },
  { slug: 'mixr', repo: 'ryandkim/MBAi_Hackathon_2026', file: 'portfolio.json', public: true },
  { slug: 'agent-toolkit', repo: 'ryandkim/Claude.agent_semiconductor_news', file: 'Master Architecture/portfolio.json', activity: 'Master Architecture', public: false },
];

export const statusLabels: Record<string, string> = {
  idea: 'Idea',
  prototype: 'Prototype',
  building: 'In progress',
  working: 'Working',
  shipped: 'Shipped',
};
