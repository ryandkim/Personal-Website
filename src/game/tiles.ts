// Procedural pixel-art tiles. Everything is drawn with rectangles; no image files.
import { TILE, regionAt } from './map';

const hash = (x: number, y: number, n: number) => ((((x * 73856093) ^ (y * 19349663)) >>> 0) % n);

type Ctx = CanvasRenderingContext2D;
const rect = (c: Ctx, color: string, x: number, y: number, w: number, h: number) => {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
};

const THEME = {
  campus: { roof: '#6b2e26', roofLine: '#4f201b', wall: '#a0523f', wallLine: '#86412f', window: '#f4d58d', plaza: '#9c4a3a', plazaLine: '#7d382b' },
  city: { roof: '#4a5568', roofLine: '#363e4d', wall: '#8a93a3', wallLine: '#727b8b', window: '#9fd3ff', plaza: '#9a9ca3', plazaLine: '#7d7f86' },
  lakeshore: { roof: '#4e2a84', roofLine: '#3a1e64', wall: '#cfc6b3', wallLine: '#b3aa96', window: '#f4d58d', plaza: '#cbbfa6', plazaLine: '#ab9f86' },
};

function grass(c: Ctx, px: number, py: number, col: number, row: number) {
  rect(c, '#3f7d3a', px, py, TILE, TILE);
  for (let i = 0; i < 6; i++) {
    const h = hash(col * 7 + i, row * 13 + i, 256);
    rect(c, i % 2 ? '#4f9446' : '#356b31', px + (h % 16), py + ((h >> 4) % 16), 1, 2);
  }
}

export function drawTile(c: Ctx, ch: string, col: number, row: number, t: number, opened: { g1: boolean; g2: boolean }) {
  const px = col * TILE;
  const py = row * TILE;
  const th = THEME[regionAt(col)];
  switch (ch) {
    case ',': {
      grass(c, px, py, col, row);
      const colors = ['#f7a1c4', '#ffe27a', '#ffffff'];
      for (let i = 0; i < 3; i++) {
        const h = hash(col + i * 3, row + i * 5, 196);
        rect(c, colors[i], px + 2 + (h % 12), py + 2 + ((h >> 3) % 12), 2, 2);
      }
      return;
    }
    case 'T': {
      grass(c, px, py, col, row);
      rect(c, '#5b3b22', px + 6, py + 10, 4, 6);
      rect(c, '#1f4d22', px + 1, py + 2, 14, 10);
      rect(c, '#1f4d22', px + 3, py, 10, 13);
      rect(c, '#2d6b30', px + 3, py + 2, 8, 6);
      rect(c, '#3d8a3d', px + 4, py + 3, 3, 2);
      return;
    }
    case '_':
      rect(c, '#b08a5a', px, py, TILE, TILE);
      rect(c, '#9a7549', px + (hash(col, row, 12)), py + 5, 3, 1);
      rect(c, '#c49c69', px + (hash(row, col, 12)), py + 11, 2, 1);
      return;
    case 'p':
      rect(c, th.plaza, px, py, TILE, TILE);
      rect(c, th.plazaLine, px, py + 7, TILE, 1);
      rect(c, th.plazaLine, px, py + 15, TILE, 1);
      rect(c, th.plazaLine, px + ((row % 2) ? 4 : 11), py, 1, 7);
      rect(c, th.plazaLine, px + ((row % 2) ? 11 : 4), py + 8, 1, 7);
      return;
    case 'R':
      rect(c, th.roof, px, py, TILE, TILE);
      for (let y = 3; y < 16; y += 4) rect(c, th.roofLine, px, py + y, TILE, 1);
      rect(c, th.roofLine, px + ((row * 3) % 8), py, 1, 3);
      return;
    case 'B':
    case 'D': {
      rect(c, th.wall, px, py, TILE, TILE);
      rect(c, th.wallLine, px, py + 15, TILE, 1);
      if (ch === 'D') {
        rect(c, '#3b2616', px + 4, py + 4, 8, 12);
        rect(c, '#f2b544', px + 10, py + 10, 1, 1);
      } else {
        const lit = hash(col, row, 3) !== 0;
        rect(c, '#2a2f3a', px + 3, py + 4, 4, 6);
        rect(c, '#2a2f3a', px + 9, py + 4, 4, 6);
        if (lit) {
          rect(c, th.window, px + 4, py + 5, 2, 4);
          rect(c, th.window, px + 10, py + 5, 2, 4);
        }
      }
      return;
    }
    case '~': {
      rect(c, '#2b5d8a', px, py, TILE, TILE);
      const off = Math.floor(t * 4 + col * 3 + row * 5) % 16;
      rect(c, '#4b84b8', px + off, py + 4 + (row % 3) * 3, 4, 1);
      rect(c, '#4b84b8', px + ((off + 8) % 16), py + 11, 3, 1);
      return;
    }
    case '=':
    case '2':
      rect(c, '#2b5d8a', px, py, TILE, TILE);
      rect(c, '#8b5e34', px, py + 1, TILE, 14);
      for (let x = 0; x < 16; x += 4) rect(c, '#6e4826', px + x, py + 1, 1, 14);
      rect(c, '#5a3a1e', px, py + 1, TILE, 1);
      rect(c, '#5a3a1e', px, py + 14, TILE, 1);
      if (ch === '2' && !opened.g2) {
        rect(c, '#5a5f6b', px + 1, py, 3, 16);
        rect(c, '#5a5f6b', px + 12, py, 3, 16);
        rect(c, '#c94b3c', px + 4, py + 5, 8, 2);
        rect(c, '#ecebe6', px + 6, py + 5, 2, 2);
        rect(c, '#c94b3c', px + 4, py + 10, 8, 2);
        rect(c, '#ecebe6', px + 8, py + 10, 2, 2);
      }
      return;
    case '1':
      rect(c, '#b08a5a', px, py, TILE, TILE);
      if (!opened.g1) {
        rect(c, '#5b3b22', px, py, 3, 16);
        rect(c, '#5b3b22', px + 13, py, 3, 16);
        rect(c, '#8b5e34', px + 3, py + 3, 10, 2);
        rect(c, '#8b5e34', px + 3, py + 8, 10, 2);
        rect(c, '#8b5e34', px + 3, py + 13, 10, 2);
        rect(c, '#8b5e34', px + 7, py + 3, 2, 12);
      }
      return;
    case 's':
      rect(c, '#e0c98f', px, py, TILE, TILE);
      rect(c, '#cdb478', px + hash(col, row, 14), py + hash(row, col, 14), 2, 1);
      return;
    case 'r':
      rect(c, '#3a3d44', px, py, TILE, TILE);
      rect(c, '#33363c', px + hash(col, row, 14), py + hash(row, col, 14), 2, 1);
      return;
    case '-':
      rect(c, '#3a3d44', px, py, TILE, TILE);
      if (col % 2 === 0) rect(c, '#e8c44a', px + 3, py + 7, 10, 2);
      return;
    case 'w':
      rect(c, '#a4a6ad', px, py, TILE, TILE);
      rect(c, '#8b8d94', px, py, 1, TILE);
      rect(c, '#8b8d94', px, py + 15, TILE, 1);
      return;
    case 'L':
      grass(c, px, py, col, row);
      rect(c, '#2b2e35', px + 7, py + 4, 2, 12);
      rect(c, '#2b2e35', px + 5, py + 14, 6, 2);
      rect(c, '#2b2e35', px + 5, py + 1, 6, 4);
      rect(c, '#ffe9a8', px + 6, py + 2, 4, 2);
      return;
    case 'k':
      grass(c, px, py, col, row);
      rect(c, '#8b5e34', px + 1, py + 6, 14, 3);
      rect(c, '#8b5e34', px + 1, py + 10, 14, 2);
      rect(c, '#4a3020', px + 2, py + 12, 2, 4);
      rect(c, '#4a3020', px + 12, py + 12, 2, 4);
      return;
    default:
      grass(c, px, py, col, row);
  }
}

// A career marker: a stone pedestal with a floating crystal.
// state: 'dormant' (not yet reachable), 'active' (the next one to find), 'found'.
export function drawMarker(c: Ctx, col: number, row: number, state: 'dormant' | 'active' | 'found', t: number) {
  const px = col * TILE;
  const py = row * TILE;
  rect(c, '#6e7179', px + 3, py + 11, 10, 5);
  rect(c, '#8d9098', px + 4, py + 11, 8, 2);
  rect(c, '#55585f', px + 3, py + 15, 10, 1);
  const bob = state === 'active' ? Math.round(Math.sin(t * 3) * 1.5) : 0;
  const cy = py + 2 + bob;
  const colors = {
    dormant: ['#5b6474', '#6f7a8c', '#46505e'],
    active: ['#f2b544', '#ffe08a', '#c98d24'],
    found: ['#56c2a6', '#a6f0dc', '#2f8f78'],
  }[state];
  if (state === 'active') {
    const a = 0.25 + 0.15 * Math.sin(t * 4);
    c.fillStyle = `rgba(242,181,68,${a})`;
    c.fillRect(px - 1, cy - 2, 18, 14);
  }
  rect(c, colors[0], px + 6, cy, 4, 9);
  rect(c, colors[0], px + 5, cy + 2, 6, 5);
  rect(c, colors[1], px + 6, cy + 1, 1, 4);
  rect(c, colors[2], px + 9, cy + 3, 1, 5);
  if (state === 'active') {
    const s = Math.floor(t * 6) % 4;
    rect(c, '#fff6d8', px + [2, 13, 1, 14][s], py + [3, 1, 8, 6][s], 1, 1);
  }
}
