import data from '../content/media.json';

// Types for the "Recent highlights" strip and the Games / Art / Music / Travel galleries.
//
// The items themselves live in src/content/media.json. Item types:
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

export const highlights = data.highlights as MediaItem[];

// Titles and blurbs for these four come from src/content/site.json (editable on the page).
export const beyond = data.beyond as { id: 'games' | 'art' | 'music' | 'travel'; items: MediaItem[] }[];
