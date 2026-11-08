// Career quest world map. One character per 16px tile. Three regions, west to east:
// the campus (cols 0-21), the city (cols 23-45), a river, then the lakeshore (cols 49-65).
//
// Legend
//   .  grass        ,  flowers      T  tree         _  dirt path    p  plaza / brick path
//   R  roof         B  wall         D  door         ~  water        =  bridge
//   s  sand         r  road         -  road (lane)  w  sidewalk     L  lamp post
//   k  bench        P  player start
//   1  gate that opens after the campus   2  gate that opens after the city
//   a..g  career markers, in order (the n-th letter is the n-th stage in career.ts)

const campus = [
  'TTTTTTTTTTTTTTTTTTTTTT',
  'T,....RRRRRRRR....,...',
  'T.....BBBBBBBB........',
  'T.TT..BBBDDBBB...TT...',
  'T.TT.....pp......TT...',
  'T........pp.........,.',
  'T..,..pppppppp.RRRR...',
  'T.....p..,...p.BBBB...',
  'T..k..p..a...p.BDBB...',
  'TP____p......p________',
  'T.....p......p.......,',
  'T..L..pppppppp..L.....',
  'T.........pp..........',
  'T.TT..RRRRRRRR....TT..',
  'T.TT..BBBBBBBB....TT..',
  'T,....BBBDDBBB...,....',
  'T.....................',
  'TTTTTTTTTTTTTTTTTTTTTT',
];

const city = [
  'TTTTTTTTTTTTTTTTTTTTTTT',
  '.RRRR...RRRRRR...RRRR..',
  '.BBBB...BBBBBB...BBBB..',
  '.BDBB...BBBDBB...BBDB..',
  '...b.........c.........',
  'wwwwwwwwwwwwwwwwwwwwwww',
  'rrrrrrrrrrrrrrrrrrrrrrr',
  '-----------------------',
  'rrrrrrrrrrrrrrrrrrrrrrr',
  'wwwwwwwwwwwwwwwwwwwwwww',
  '..L......L......L....L.',
  '.RRRRR...RRRR...RRRR...',
  '.BBBBB...BBBB...BBBB...',
  '.BBDBB...BDBB...BBDB...',
  '...d........e..........',
  'sssssssssssssssssssssss',
  '~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~',
];

const lake = [
  '~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~',
  'sssssssssssssssss',
  's.....,.......g.s',
  '..L.......L......',
  '..pppppppppppp...',
  '..p..RRRRRR..p...',
  '..p..BBBBBB..p...',
  'pppp.BBDDBB..p..T',
  '..p....f.....p..T',
  '..ppppppppppppp.T',
  '..,......k......T',
  '.TT..RRRR...TT..T',
  '.TT..BBBB...TT..T',
  '.....BDBB.....,.T',
  '................T',
  'TTTTTTTTTTTTTTTTT',
];

export const TILE = 16;
export const ROWS = 18;
export const REGION_COLS = { campus: [0, 22], city: [23, 45], lakeshore: [46, 65] } as const;

export const rows: string[] = Array.from({ length: ROWS }, (_, y) => {
  const sep = y === 9 ? '1' : 'T';
  const river = y === 9 ? '2==' : '~~~';
  return campus[y].padEnd(22, '.') + sep + city[y].padEnd(23, '.') + river + lake[y].padEnd(17, '.');
});

export const COLS = rows[0].length;

export function regionAt(col: number): 'campus' | 'city' | 'lakeshore' {
  if (col <= REGION_COLS.campus[1]) return 'campus';
  if (col <= REGION_COLS.city[1]) return 'city';
  return 'lakeshore';
}

export const MARKER_CHARS = 'abcdefg';
export type Marker = { index: number; col: number; row: number };

export function findMarkers(): Marker[] {
  const out: Marker[] = [];
  rows.forEach((line, row) => {
    [...line].forEach((ch, col) => {
      const i = MARKER_CHARS.indexOf(ch);
      if (i >= 0) out.push({ index: i, col, row });
    });
  });
  return out.sort((a, b) => a.index - b.index);
}

export function findStart(): { col: number; row: number } {
  for (let row = 0; row < ROWS; row++) {
    const col = rows[row].indexOf('P');
    if (col >= 0) return { col, row };
  }
  return { col: 1, row: 9 };
}
