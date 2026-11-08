// Original pixel-art traveler (12x16). Each letter is a palette color, '.' is transparent.
const PAL: Record<string, string> = {
  h: '#2a1d17', s: '#f1c7a1', e: '#1b1b1b', j: '#f2b544', J: '#c98d24',
  w: '#ecebe6', p: '#2e3550', b: '#141414',
};

const down = [
  '...hhhhhh...', '..hhhhhhhh..', '.hhhhhhhhhh.', '.hhssssssh..',
  '.hsesssses..', '..ssssssss..', '...ssssss...', '..jjjwwjjj..',
  '.jjjjwwjjjj.', '.Jjjjjjjjjj.', '.sJjjjjjjJs.', '..JJJJJJJJ..',
  '..pppppppp..', '..ppp..ppp..', '..ppp..ppp..', '..bbb..bbb..',
];
const up = [
  '...hhhhhh...', '..hhhhhhhh..', '.hhhhhhhhhh.', '.hhhhhhhhhh.',
  '.hhhhhhhhhh.', '..hhhhhhhh..', '...ssssss...', '..jjjjjjjj..',
  '.jjjjjjjjjj.', '.jjjjjjjjjj.', '.sJjjjjjjJs.', '..JJJJJJJJ..',
  '..pppppppp..', '..ppp..ppp..', '..ppp..ppp..', '..bbb..bbb..',
];
const right = [
  '...hhhhhh...', '..hhhhhhhh..', '.hhhhhhhhhh.', '.hhhhsssss..',
  '.hhhssssess.', '..hhssssss..', '....sssss...', '...jjjjjj...',
  '..jjjjjjjj..', '..jjjjjjjj..', '..jjjjjsj...', '...JJJJJJ...',
  '...pppppp...', '...pp..pp...', '...pp..pp...', '...bb..bbb..',
];
const mirror = (rows: string[]) => rows.map((r) => [...r].reverse().join(''));

export type Dir = 'down' | 'up' | 'left' | 'right';
const FRAMES: Record<Dir, string[]> = { down, up, right, left: mirror(right) };

// Walk cycle: frame 1 lifts the left leg, frame 2 the right leg.
function legs(rows: string[], frame: number): string[] {
  if (frame === 0) return rows;
  const out = rows.slice();
  const lift = (r: string, from: number, to: number) => [...r].map((c, i) => (i >= from && i < to ? '.' : c)).join('');
  const half = frame === 1 ? [0, 6] : [6, 12];
  out[15] = lift(out[15], half[0], half[1]);
  out[14] = [...out[14]].map((c, i) => (i >= half[0] && i < half[1] && c === 'p' ? 'b' : c)).join('');
  return out;
}

export function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, dir: Dir, frame: number) {
  const rows = legs(FRAMES[dir], frame);
  // soft shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x + 2, y + 14, 8, 2);
  for (let r = 0; r < rows.length; r++) {
    const line = rows[r];
    for (let c = 0; c < line.length; c++) {
      const col = PAL[line[c]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x + c, y + r, 1, 1);
    }
  }
}
