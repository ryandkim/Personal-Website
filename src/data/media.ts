// Media for the "Recent highlights" strip and the Games / Art / Music / Travel galleries.
//
// Item types:
//   { type: 'image',    src: '/media/...jpg', caption }   put the file in public/media/...
//   { type: 'video',    src: '/media/...mp4', caption }   short clips; plays muted on loop
//   { type: 'youtube',  id: 'dQw4w9WgXcQ', caption }      the part after "v=" in a YouTube link
//   { type: 'linkedin', embed: 'https://www.linkedin.com/embed/feed/update/urn:li:share:123...', caption }
//        On LinkedIn: open the post (or your repost) → "..." menu → "Embed this post" → copy the src="..." URL.
//   Leave src empty ('') to show a placeholder card.
//
// Optional on any item: date (shown small), link (makes the caption clickable).

export type MediaItem =
  | { type: 'image'; src: string; caption: string; alt?: string; date?: string; link?: string }
  | { type: 'video'; src: string; caption: string; poster?: string; date?: string; link?: string }
  | { type: 'youtube'; id: string; caption: string; date?: string; link?: string }
  | { type: 'linkedin'; embed: string; caption: string; date?: string; link?: string };

export const highlights: MediaItem[] = [
  { type: 'image', src: '', caption: '2nd place, inaugural Kellogg program-wide AI hackathon (Mixr)', date: '2026' },
  { type: 'image', src: '', caption: 'Finalist, Tepper Innovation Challenge', date: '2026' },
  { type: 'linkedin', embed: '', caption: 'Your latest LinkedIn post or repost goes here' },
  { type: 'youtube', id: '', caption: 'A YouTube video you want to feature' },
];

// Titles and blurbs for these four come from src/content/site.json (editable on the page).
export const beyond: { id: 'games' | 'art' | 'music' | 'travel'; items: MediaItem[] }[] = [
  {
    id: 'games',
    items: [
      { type: 'image', src: '', caption: 'Placeholder: the D&D campaign I am running' },
      { type: 'image', src: '', caption: 'Placeholder: a game I am into right now' },
    ],
  },
  {
    id: 'art',
    items: [
      { type: 'image', src: '', caption: 'Placeholder: a piece I made' },
      { type: 'image', src: '', caption: 'Placeholder: a Cubism vs AI comparison' },
    ],
  },
  {
    id: 'music',
    items: [
      { type: 'image', src: '', caption: 'Placeholder: a show I went to' },
      { type: 'video', src: '', caption: 'Placeholder: a short clip' },
    ],
  },
  {
    id: 'travel',
    items: [
      { type: 'image', src: '', caption: 'Placeholder: a favorite trip' },
      { type: 'image', src: '', caption: 'Placeholder: beach volleyball' },
    ],
  },
];
