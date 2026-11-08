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
| Name, headline, bio, "right now", "looking for", email, links | `src/data/site.ts` |
| Colors and fonts (design tokens) | `src/styles/global.css` |
| Page sections and order | `src/pages/index.astro` |
| Headshot | `public/images/headshot.jpg` (4:5 crop) |
| Recent highlights strip, and Games / Art / Music / Travel galleries | `src/data/media.ts` (instructions at the top of the file) |
| Photos and videos for those | `public/media/highlights/` and `public/media/beyond/<section>/` |

Other commands: `npm run build` makes the static site in `dist/`, and `npm run preview` serves that build.
