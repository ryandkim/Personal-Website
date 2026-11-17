# Notes for Claude Code sessions

Ryan Kim's recruiter-facing personal site. Astro 7 + Tailwind 4, deployed on Vercel from `main`.
Live: https://ryan-tech-build.vercel.app/ (ryantech.me is an unrelated company; never use it).
The README has setup, the file map and env vars; this file is the short version for a new session.

## Working rules
- Branch from `main`, open a PR into `main`, Ryan merges. Never push to `main` directly.
- Run `npm run build` as the check before opening a PR. Don't make preview screenshots for Ryan.
- No per-visit API costs: anything visitor-facing that looks like AI is precomputed or replayed
  (AI Ryan = saved answers in `src/content/twin.json`; demos = saved runs in `src/content/demos/`).
- All art, music and code original. No Nintendo/Pokemon/Zelda names, sprites or music.
- No résumé download link (the PDF has a phone number) unless Ryan approves.
- Ryan edits text, photos and captions himself through the live site's edit mode, which commits
  straight to `main` ("Edit site text: …", "Edit photos and videos: …"). Pull `main` before you start
  and don't overwrite his copy in `src/content/site.json` or `src/content/media.json`.

## Where things are
| Area | Files |
| --- | --- |
| Page sections and order | `src/pages/index.astro` |
| Editable text | `src/content/site.json` (saved by edit mode via `src/pages/api/content.ts`) |
| Recent highlights + Games/Music/Travel galleries | `src/content/media.json`, types in `src/data/media.ts` |
| Gallery cards (arrows, stack peek, `2 / 4` badge, inline video, captions) | `src/components/GalleryCard.astro`, `MediaSlide.astro`, `Carousel.astro` |
| Edit-mode photo/video picker (upload, crop, links, ✕ remove) | `src/components/MediaPicker.astro`, `src/components/OwnerBar.astro` |
| Upload APIs | `src/pages/api/media.ts` (commits files < 4 MB to `public/media/uploads/`), `media-blob.ts` (optional Vercel Blob) |
| Owner sign-in | `src/pages/owner.astro`, `src/pages/api/auth/`, `src/lib/auth.ts` |
| Career timeline + `/quest` game | `src/data/career.ts`, `src/content/career.json`, `src/game/` |
| Projects (from each agent repo's `portfolio.json`) | `src/data/projects.ts`, `src/lib/portfolio.ts`, fallbacks `src/content/projects/` |
| Replay demos | `src/content/demos/`, `src/components/DemoPlayer.astro`, `scripts/demos/record.py` |
| AI Ryan (flip the headshot) | `src/components/Hero.astro`, `src/content/twin.json` |
| Design tokens | `src/styles/global.css` (near-black, amber #f2b544, Fraunces + Inter) |

## Media conventions
- Photos and short videos are image/video files in `public/media/uploads/`; YouTube items are stored as links (`{ "type": "youtube", "id": … }`).
- Highlight boxes follow the Kellogg hackathon box: same height, caption, then a year line (`date`).
- Gallery placeholders disappear once a box has media; Travel keeps two placeholders until filled.
