# Ryan Kim: personal website

Recruiter-facing personal site: career timeline and retro career-quest game, AI agent projects synced from GitHub
with replay demos, a free "AI Ryan" chat on the back of the headshot, and Games / Art / Music / Travel galleries.
Built with [Astro](https://astro.build) and Tailwind CSS, hosted on [Vercel](https://vercel.com).

- **Live site:** Vercel project `ryan-personal-website`. Every push to `main` redeploys it.
- **Branch:** work happens on `main` only. New changes go in a short-lived branch and a pull request into `main`.

## Quick start

You need [Node.js](https://nodejs.org) 20 or newer (`node -v` to check).

```bash
git clone https://github.com/ryandkim/Personal-Website.git
cd Personal-Website
npm install        # again whenever package.json changes
npm run dev        # http://localhost:4321
```

Already cloned? `git checkout main && git pull && npm install && npm run dev`.

The page reloads as you save files; `Ctrl+C` stops it. The site runs without a `.env` file. You only need one for
owner sign-in, on-page editing and private-repo sync (see [Environment variables](#environment-variables)).

Other commands: `npm run build` builds into `dist/`, and `npm run preview` serves that build.

## Where to edit things

The easiest way to change text is on the page itself: sign in at `/owner` (link in the footer), click **Edit**,
click any outlined text, type, and **Save**. Everything else:

| What | File |
| --- | --- |
| Page text (headline, bio, nav, section titles, buttons) | `src/content/site.json` |
| Name, email, links | `src/data/site.ts` |
| Career timeline and career quest game (one file feeds both) | `src/content/career.json` (field guide in `src/data/career.ts`) |
| Career quest map layout | `src/game/map.ts` (one letter per tile, legend at the top) |
| Recent highlights strip and Games / Art / Music / Travel galleries | `src/content/media.json` (item types in `src/data/media.ts`) |
| Photos and videos for those | `public/media/highlights/` and `public/media/beyond/<section>/` |
| AI Ryan answers | `src/content/twin.json` |
| Project list | `src/data/projects.ts` |
| Project demos | `src/content/demos/<slug>.json` |
| Colors and fonts | `src/styles/global.css` |
| Page sections and order | `src/pages/index.astro` |
| Headshot | `public/images/headshot.jpg` (4:5 crop) |

## Environment variables

Copy `.env.example` to `.env` for local use (never committed), and set the same names on Vercel under
**Settings → Environment Variables**. Use a different `SESSION_SECRET` on Vercel than locally.

| Name | Needed for | Where it comes from |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | Owner sign-in | Google Cloud → APIs & Services → Credentials → OAuth client ID (Web application) |
| `OWNER_EMAIL` | Owner sign-in | The Google account allowed to edit |
| `SESSION_SECRET` | Owner sign-in | `openssl rand -base64 48` |
| `GITHUB_TOKEN` | Reading `portfolio.json` from private agent repos at build time | Fine-grained token, agent repos only, Contents read-only |
| `SITE_EDIT_TOKEN` | Saving edits from the live site, and saving project text to agent repos | Fine-grained token for `Personal-Website`, `Claude.agent_semiconductor_news` and `Kellogg-Networking-Apps-Tracker`, Contents read and write |

**Google OAuth origins:** in your OAuth client, **Authorized JavaScript origins** must list
`http://localhost:4321`, `http://localhost`, and the live site's `https://…vercel.app` URL (plus any custom domain
you add later), or sign-in fails on that address.

## How saving works

- **Locally:** Save writes the JSON file, then commits and pushes just that file to the branch you're on.
- **On the live site:** Save commits the change to GitHub through the API (`SITE_EDIT_TOKEN`), and Vercel rebuilds
  in about a minute.
- Project text is saved to that project's `portfolio.json` in its own repo.
- You can edit existing list items on the page; adding or removing items is done in the JSON files.

**Privacy:** sign-in asks Google for identity only (`openid email`), never an access token. The site checks Google's
signature, a one-time nonce and `OWNER_EMAIL`, then sets an 8-hour HttpOnly, SameSite=Strict session cookie. The
save endpoint only accepts existing text fields and refuses anyone without that session.

## Projects (synced from GitHub)

Each project page is built from a `portfolio.json` in that project's repo, listed in `src/data/projects.ts`. If the
build can't read it (no file, no network, or a private repo without `GITHUB_TOKEN`), it falls back to
`src/content/projects/<slug>.json`.

- **Edit a project:** change `portfolio.json` in the agent repo and push (or use Edit on the page).
- **Add a project:** add a line to `src/data/projects.ts` and a `portfolio.json` in that repo.
- **Hide a project:** set `"hidden": true`.
- **Rebuild on push:** copy `docs/notify-site.yml` into each agent repo (setup steps are in the file).

Required fields: `name`, `tagline`, `status` (idea, prototype, building, working, shipped), `tags`, `summary`.
Optional: `order`, `problem`, `how` (list of steps), `stack`, `highlights`, `links` (`demo`, `video`, `site`), `hidden`.

## Replay demos

Demos are saved agent runs that visitors step through, so they cost nothing per visit. Record or refresh them
(`--repo` points at your agents folder; default `~/Projects/Claude`):

```bash
python3 scripts/demos/record.py dashboard      # real priority engine on the test feed
python3 scripts/demos/record.py toolkit        # real privacy scanner on sample tool calls
python3 scripts/demos/record.py semiconductor  # imports the last weekly run from .tmp/
python3 scripts/demos/record.py wardrobe       # imports this morning's run (needs: pip3 install pillow)
```

The semiconductor and wardrobe demos are labelled samples until you import a real run. Review the JSON before
committing. Guided tours: `src/components/DashboardWalkthrough.astro` (text in
`src/content/walkthroughs/networking-tracker.json`) and `src/components/SkillsSession.astro`.

## AI Ryan chat

**Flip me around to chat** on the headshot turns it into a pixel-art Ryan with a retro chat box. There is no AI call
and no API key: answers come from `src/content/twin.json`, matched by keywords in the browser, with topic buttons
(`suggestions`) and a `fallback` reply that points to your email. Edit answers on the page (sign in, Edit, flip the
card) or in the file.

## Deploying from scratch (Vercel)

Already set up. To redo it: sign in to Vercel with GitHub, **Add New → Project**, import `Personal-Website` (Astro is
detected), add the environment variables above, and deploy. Then add the new URL to the Google OAuth origins.
