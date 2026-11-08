# Ryan Kim: personal website

Personal website with integrations and demos of custom agents and previous AI project experience.
Built with [Astro](https://astro.build) and Tailwind CSS.

## Run it locally

You need [Node.js](https://nodejs.org) 20 or newer (`node -v` to check).

```bash
git clone https://github.com/ryandkim/Personal-Website.git
cd Personal-Website
git checkout claude/project-thread-83f4pu   # until this branch is merged into main
npm install
npm run dev
```

Then open http://localhost:4321. The page reloads as you save files. Press `Ctrl+C` in the terminal to stop.

## Where to edit things

| What | File |
| --- | --- |
<<<<<<< HEAD
| Page text (headline, bio, section titles, "right now", project blurbs…) | `src/content/site.json`, or sign in and use **Edit page** |
| Name, email, links | `src/data/site.ts` |
=======
| Name, headline, bio, "right now", "looking for", email, links | `src/data/site.ts` |
| Career timeline and career quest game (one file feeds both) | `src/data/career.ts` |
| Career quest map layout | `src/game/map.ts` (one letter per tile, legend at the top) |
>>>>>>> origin/claude/project-thread-nuslnm
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
