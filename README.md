# Ryan Kim: personal website

Personal website with integrations and demos of custom agents and previous AI project experience.
Built with [Astro](https://astro.build) and Tailwind CSS.

## Run it locally

You need [Node.js](https://nodejs.org) 20 or newer (`node -v` to check).

```bash
git clone https://github.com/ryandkim/Personal-Website.git
cd Personal-Website
git checkout main
npm install
npm run dev
```

Then open http://localhost:4321. The page reloads as you save files. Press `Ctrl+C` in the terminal to stop.

## Where to edit things

| What | File |
| --- | --- |
| Page text (headline, bio, section titles, "right now", project blurbs…) | `src/content/site.json`, or sign in and use **Edit page** |
| Name, email, links | `src/data/site.ts` |
| Career timeline and career quest game (one file feeds both) | `src/data/career.ts` |
| Career quest map layout | `src/game/map.ts` (one letter per tile, legend at the top) |
| Colors and fonts (design tokens) | `src/styles/global.css` |
| Page sections and order | `src/pages/index.astro` |
| Headshot | `public/images/headshot.jpg` (4:5 crop) |
| Recent highlights strip, and Games / Art / Music / Travel galleries | `src/data/media.ts` (instructions at the top of the file) |
| Photos and videos for those | `public/media/highlights/` and `public/media/beyond/<section>/` |

Other commands: `npm run build` makes the static site in `dist/`, and `npm run preview` serves that build.

## Owner sign-in and on-page editing

Sign in with Google at `/owner` (there's a small "Owner sign-in" link in the footer). Once signed in, an
**Edit page** bar appears at the bottom of the page for you only. Click it, click any outlined text, type, and press **Save**.
Saving writes to `src/content/site.json`; commit and push that file like any other change.
(Saving from the live public site gets connected when the site is published.)

**Privacy:** the site asks Google for your identity only (the `openid email` scopes). It never gets an access token,
so it cannot read or change anything in your Google account. It checks Google's signature, a one-time nonce, and that
the email matches `OWNER_EMAIL`, then sets its own 8-hour session cookie (HttpOnly, SameSite=Strict, Secure on HTTPS).
The save endpoint accepts only existing text fields, stores plain text, and refuses anyone without that session.

### One-time setup

1. Go to https://console.cloud.google.com/, create a project (any name, e.g. "personal-website").
2. **APIs & Services → OAuth consent screen**: choose *External*, fill in the app name and your email, and save.
   You don't need to add any scopes.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**: type *Web application*.
   Under **Authorized JavaScript origins** add `http://localhost:4321` and `http://localhost`. Create it and copy the Client ID.
4. In the project folder, copy `.env.example` to `.env` and fill in the three values
   (`openssl rand -base64 48` prints a good `SESSION_SECRET`). `.env` is never committed.
5. Restart `npm run dev` and open http://localhost:4321/owner.

## Public site (Vercel)

The site deploys to [Vercel](https://vercel.com) (free Hobby plan). Every push to `main` rebuilds the live site.

1. Sign in at https://vercel.com with **Continue with GitHub**.
2. **Add New → Project**, pick `Personal-Website`, and click **Import**. Vercel detects Astro; keep the defaults.
3. Before clicking **Deploy**, open **Environment Variables** and add `GOOGLE_CLIENT_ID`, `OWNER_EMAIL`, and
   `SESSION_SECRET` (use a *new* random secret here, not the one in your local `.env`).
4. Click **Deploy**. Your public URL looks like `https://personal-website-xxxx.vercel.app`
   (rename it under **Settings → Domains**, or add your own domain later).
5. In Google Cloud **Credentials**, edit your OAuth client and add that `https://…vercel.app` URL to
   **Authorized JavaScript origins**, so owner sign-in works on the live site.

Sign-in works on the live site; saving edits there is not connected yet (edit locally and push for now).

## AI Ryan chat (back of the headshot)

Click **Flip me around to chat** on the headshot: it turns over to a pixel-art you, and a retro chat box opens
below it. It costs nothing to run: there is no AI call and no API key. AI Ryan answers from saved notes in
`src/content/twin.json`, matching each question to the answer whose keywords fit best, and shows topic buttons
to tap. Questions with no match get the `fallback` reply, which points people to your email.

- **Edit answers:** sign in, click Edit, and flip the card. The saved answers show under the chat box while editing.
  To add a topic or change its keywords, edit `src/content/twin.json` (`suggestions` lists the topic buttons, in order).
- To write new answers, ask Claude Code to draft them from your résumé and add them to that file.

## Projects (synced from GitHub)

Each project's page is built from a `portfolio.json` in that project's repo.
`src/data/projects.ts` lists where each file lives. At build time the site reads
the file from GitHub; if it can't (no file yet, no network, or a private repo
without a token), it uses the copy in `src/content/projects/<slug>.json`.

- **Edit a project:** change `portfolio.json` in the agent repo and push.
- **Add a project:** add a line to `src/data/projects.ts` and a `portfolio.json` in that repo.
- **Hide a project:** set `"hidden": true`.
- **Private repos:** add `GITHUB_TOKEN` to `.env` (see `.env.example`): a fine-grained token with read-only Contents access to just those repos.
- **Rebuild on push:** after the site is on Vercel, copy `docs/notify-site.yml` into each agent repo (steps are in the file).

Fields: `name`, `tagline`, `status` (idea, prototype, building, working, shipped),
`tags`, `summary` are required. Optional: `order`, `problem`, `how` (list of steps),
`stack`, `highlights`, `links` (`demo`, `video`, `site`), `hidden`.

## Project demos and videos

Each project page can show a **replay demo**: a saved agent run that visitors
step through. Nothing calls an AI model when someone presses play, so demos
cost nothing per visit. Demos live in `src/content/demos/<slug>.json`.

Record or refresh them with (point `--repo` at your agents folder; default `~/Projects/Claude`):

```
python3 scripts/demos/record.py dashboard      # real priority engine on the test feed
python3 scripts/demos/record.py toolkit        # real privacy scanner on sample tool calls
python3 scripts/demos/record.py semiconductor  # imports the last weekly run from .tmp/
python3 scripts/demos/record.py wardrobe       # imports this morning's run from .tmp/
```

The semiconductor and wardrobe demos start as clearly labelled samples until
you import a real run. The wardrobe import also copies each item's product
cut-out for the 3D mannequin (needs `pip3 install pillow`). Review the JSON
before you commit it.

Extra guided tours sit under some demos: `src/components/DashboardWalkthrough.astro`
(text in `src/content/walkthroughs/networking-tracker.json`) and
`src/components/SkillsSession.astro` for the always-on skills.
