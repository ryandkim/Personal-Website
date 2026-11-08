// Your career timeline. Both the plain timeline on the home page and the
// career quest game (/quest) read from this one file, so edit wording here.
//
// Each stage is one step of the journey, oldest first. In the game, each stage
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

export const stages: Stage[] = [
  {
    id: 'washu',
    kind: 'education',
    org: 'Washington University in St. Louis',
    role: 'B.A., Environmental Policy and Economics',
    start: '2018',
    end: '2022',
    location: 'St. Louis, MO',
    summary: 'Studied environmental policy and economics, with a specialization in econometric data science modeling.',
    highlights: [
      'GPA 3.86 / 4.0; Dean’s List (4 semesters)',
      'Specialization in econometric data science modeling',
    ],
    region: 'campus',
    discovery: 'Four years of policy, economics, and data. The foundation for everything after.',
  },
  {
    id: 'arup-graduate',
    kind: 'work',
    org: 'Arup',
    role: 'Graduate Transaction Advice Analyst',
    start: '2022',
    end: '2023',
    location: 'San Francisco, CA',
    summary: 'Joined Arup’s infrastructure M&A advisory team, working on procurement and renewable energy assets.',
    highlights: [
      'Defined product scope and technical requirements for the full lifecycle of a 3-year procurement initiative',
      'Researched policy and tax-break implications for the procurement strategy of a $10M renewable energy portfolio, delivering an action plan and criteria matrix for 3 energy developers',
    ],
    region: 'city',
    discovery: 'First stop in the city: learning how infrastructure deals actually get done.',
  },
  {
    id: 'arup-dpm',
    kind: 'work',
    org: 'Arup',
    role: 'Deputy Project Manager',
    start: '2023',
    end: '2024',
    location: 'San Francisco, CA',
    summary: 'Ran pricing, revenue, and risk work across renewable energy, datacenter, and port projects, and led the firm’s first agentic AI deployment.',
    highlights: [
      'Built pricing and revenue models for a $500M renewable energy portfolio from federal tax financing, utility rates, and market trends, leading to a $15M annual revenue plan',
      'Engineered the firm’s first agentic AI deployment for contractual risk assessment and liability review, benchmarking 10 years of project workflow',
      'Found a 30% cost-optimizing strategy with cashflow modeling and designed a financial modeling tool for water infrastructure across 12 datacenters ($200M)',
      'Caught critical-path loan disbursement noncompliance on a $350M cargo port, built the mitigation plan, and negotiated added service at an 18% margin',
    ],
    region: 'city',
    discovery: 'The first AI agent shipped inside the firm. Here’s where building with AI began.',
  },
  {
    id: 'arup-events',
    kind: 'work',
    org: 'Arup',
    role: 'Events Lead, Energy Advisory Business Development',
    start: '2023',
    end: '2025',
    location: 'San Francisco, CA',
    summary: 'Founded a business development group bridging finance and engineering teams.',
    highlights: [
      'Founded the group, won senior leadership buy-in, and ran monthly brainstorms with 8 cross-disciplinary senior leads, producing a 200MW energy portfolio revenue strategy',
      'Spotted the opportunity to bridge finance and engineering, raising cross-functional revenue by up to 20% on a $400M pipeline and securing a $35M deal on California’s first high-speed rail project',
      'Young Professionals in Infrastructure: hosted 2 industry panels on autonomous vehicles across 50 companies',
    ],
    region: 'city',
    discovery: 'Bringing people together: a new group, new deals, and a high-speed rail first.',
  },
  {
    id: 'arup-senior',
    kind: 'work',
    org: 'Arup',
    role: 'Senior Analyst',
    start: '2024',
    end: '2025',
    location: 'San Francisco, CA',
    summary: 'Led analysis and strategy on some of the largest energy, semiconductor, and datacenter projects in the portfolio.',
    highlights: [
      'Worked across engineering and marketing on the full lifecycle of a proposal for Colombia’s largest solar plant: $600k fee, delivered at a 15% margin',
      'Interviewed dozens of companies, assessed the market, adapted procurement strategy, and built 3 financial model alternatives for a $200M civic center',
      'Translated technical requirements into investment risk strategy for a loan program director, resulting in an $820M loan for $6B semiconductor fabs',
      'Defined and tracked success metrics on a $50B hyperscale datacenter; secured 5GW of new power supply through contract risk management, 300% more than competitors',
      'Prioritized features and coordinated 20 engineers to optimize buildout against cost benchmarks; presented to senior leadership and won a $150M bid',
      'Analyzed housing price data in ArcGIS and R for a greenbelt proposal, with a cost-benefit ratio for grant disbursement and a 10-year price forecast',
    ],
    region: 'city',
    discovery: 'The biggest projects yet: semiconductors, hyperscale datacenters, and gigawatts of power.',
  },
  {
    id: 'kellogg',
    kind: 'education',
    org: 'Kellogg School of Management and McCormick School of Engineering, Northwestern',
    role: 'MBA + MS in Artificial Intelligence (joint degree)',
    start: '2026',
    end: '2028',
    location: 'Evanston, IL',
    summary: 'Joint MBA and AI degree candidate, graduating March 2028.',
    highlights: [
      'Director, AI Club: Special Projects and AI Conference Outreach',
      'Director, Asian Management Association: Careers',
      'Courses: Tech Product Management, Applied AI for Business, Modern Software Architecture',
    ],
    region: 'lakeshore',
    discovery: 'A new chapter by the lake: business and AI, side by side.',
  },
  {
    id: 'agents',
    kind: 'project',
    org: 'Independent and hackathon projects',
    role: 'Building AI agents',
    start: '2026',
    end: 'Now',
    location: 'Evanston, IL',
    summary: 'Designing and shipping AI agents, solo and in teams.',
    highlights: [
      '2nd place in Kellogg’s inaugural program-wide hackathon (Mixr)',
      'Finalist, inter-school Tepper Innovation Challenge',
      'Built a recruiting prioritization dashboard, a semiconductor news tracker, and a personal wardrobe stylist with recommended deals',
    ],
    region: 'lakeshore',
    discovery: 'The journey so far ends here, for now. The next stage is still being written.',
  },
];

// Game regions, west to east. `name` shows on screen when you enter.
export const regions = {
  campus: { name: 'The Brick Campus', years: '2018–2022', hint: 'Find the glowing marker on campus.' },
  city: { name: 'Bay City', years: '2022–2025', hint: 'Four markers are hidden around the city. Find them in order.' },
  lakeshore: { name: 'The Lakeshore', years: '2026–now', hint: 'Cross the bridge to the lake.' },
} as const;

// Shown as one block in the plain timeline under the Arup roles.
export const groups = [
  { org: 'Northwestern University: Kellogg and McCormick', ids: ['agents', 'kellogg'] },
  { org: 'Arup: engineering consulting for infrastructure M&A', ids: ['arup-senior', 'arup-events', 'arup-dpm', 'arup-graduate'] },
  { org: 'Washington University in St. Louis', ids: ['washu'] },
];
