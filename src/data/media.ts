import data from '../content/media.json';

// Types for the "Recent highlights" strip and the Games / Music / Travel galleries.
//
// The items themselves live in src/content/media.json. Item types:
//   { type: 'image',    src: '/media/...jpg', caption }   put the file in public/media/...
//   { type: 'video',    src: '/media/...mp4', caption }   short clips; plays muted on loop
//   { type: 'youtube',  id: 'dQw4w9WgXcQ', caption }      the part after "v=" in a YouTube link
//   { type: 'linkedin', embed: 'https://www.linkedin.com/embed/feed/update/urn:li:share:123...', caption }
//        On LinkedIn: open the post (or your repost) → "..." menu → "Embed this post" → copy the src="..." URL.
//   Leave src empty ('') to show a placeholder card.
//
// Optional on any item: date (shown small), link (makes the caption clickable),
// more (extra photos/videos in the same box, after the first: the box gets
// arrows and a "1 / 3" badge, and keeps one caption).

/** One photo, video or embed, without a caption. */
export type Media =
  | { type: 'image'; src: string }
  | { type: 'video'; src: string; poster?: string }
  | { type: 'youtube'; id: string }
  | { type: 'linkedin'; embed: string };

type Box = { caption: string; date?: string; link?: string; more?: Media[] };
export type MediaItem =
  | ({ type: 'image'; src: string; alt?: string } & Box)
  | ({ type: 'video'; src: string; poster?: string } & Box)
  | ({ type: 'youtube'; id: string } & Box)
  | ({ type: 'linkedin'; embed: string } & Box);

/** Everything shown in one box, in order (the item itself first). */
export const mediaOf = (item: MediaItem): Media[] => [item as Media, ...(item.more ?? [])];

export const highlights = data.highlights as MediaItem[];

// Titles and blurbs for these four come from src/content/site.json (editable on the page).
export const beyond = data.beyond as { id: 'games' | 'music' | 'travel'; items: MediaItem[] }[];
