// Career quest: a small top-down exploration game. Each marker you find is the
// next stage of the career timeline (src/data/career.ts). Original code and art.
import { stages, regions } from '../data/career';
import { rows, COLS, ROWS, TILE, findMarkers, findStart, regionAt, MARKER_CHARS } from './map';
import { drawTile, drawMarker } from './tiles';
import { drawPlayer, type Dir } from './sprites';
import { setMusic, isMusicOn, sfx, voice } from './audio';

const VIEW_W = 320;
const VIEW_H = 180;
const SPEED = 72; // px per second
const STORE = 'career-quest-progress';

type Els = {
  root: HTMLElement; canvas: HTMLCanvasElement; hint: HTMLElement; count: HTMLElement; pips: HTMLElement;
  banner: HTMLElement; dialog: HTMLElement; journal: HTMLElement; journalList: HTMLElement; sound: HTMLButtonElement;
  start: HTMLElement;
};

export function startQuest(root: HTMLElement) {
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;
  const els: Els = {
    root, canvas: $('canvas'), hint: $('[data-hint]'), count: $('[data-count]'), pips: $('[data-pips]'),
    banner: $('[data-banner]'), dialog: $('[data-dialog]'), journal: $('[data-journal]'), journalList: $('[data-journal-list]'),
    sound: $('[data-sound]'), start: $('[data-start]'),
  };
  const ctx = els.canvas.getContext('2d')!;
  const markers = findMarkers().slice(0, stages.length);
  const total = markers.length;
  const lastCity = stages.map((s) => s.region).lastIndexOf('city');
  const lastCampus = stages.map((s) => s.region).lastIndexOf('campus');

  // ----- state -----
  let found = 0;
  try { found = Math.min(total, Number(localStorage.getItem(STORE)) || 0); } catch {}
  const startTile = findStart();
  const player = { x: startTile.col * TILE + 8, y: startTile.row * TILE + 14, dir: 'right' as Dir, frame: 0, walkT: 0 };
  let started = false;
  let paused = false;
  let seenRegion = '';
  let bannerTimer = 0;
  const keys = new Set<string>();
  const gates = () => ({ g1: found > lastCampus, g2: found > lastCity });

  // ----- sizing: render at an integer multiple of 320x180 for crisp pixels -----
  let scale = 1;
  function resize() {
    const w = els.canvas.clientWidth * (window.devicePixelRatio || 1);
    scale = Math.max(1, Math.floor(w / VIEW_W));
    els.canvas.width = VIEW_W * scale;
    els.canvas.height = VIEW_H * scale;
    ctx.imageSmoothingEnabled = false;
  }
  new ResizeObserver(resize).observe(els.canvas);
  resize();

  // ----- world queries -----
  function tileAt(col: number, row: number) {
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return 'T';
    return rows[row][col];
  }
  function solid(col: number, row: number) {
    const ch = tileAt(col, row);
    const g = gates();
    if (ch === '1') return !g.g1;
    if (ch === '2') return !g.g2;
    return 'TRBD~Lk'.includes(ch) || MARKER_CHARS.includes(ch);
  }
  function blocked(x: number, y: number) {
    // feet box: 10px wide, 6px tall, bottom-centered on (x, y)
    const pts = [[x - 5, y - 6], [x + 4, y - 6], [x - 5, y - 1], [x + 4, y - 1]];
    return pts.some(([px, py]) => solid(Math.floor(px / TILE), Math.floor(py / TILE)));
  }
  function nearbyMarker() {
    let best = -1;
    let bestD = 22;
    for (const m of markers) {
      const d = Math.hypot(m.col * TILE + 8 - player.x, m.row * TILE + 10 - (player.y - 4));
      if (d < bestD) { bestD = d; best = m.index; }
    }
    return best;
  }
  const markerState = (i: number) => (i < found ? 'found' : i === found ? 'active' : 'dormant');

  // ----- HUD -----
  function updateHud() {
    els.count.textContent = `${found}/${total}`;
    els.pips.innerHTML = markers.map((_, i) => `<span class="q-pip ${i < found ? 'is-on' : ''}"></span>`).join('');
    els.journalList.innerHTML = stages.slice(0, found).map((s, i) =>
      `<li><button type="button" data-open="${i}"><span>${s.start}–${s.end}</span>${s.role}</button></li>`).join('')
      || '<li class="q-empty">Nothing yet. Find the glowing marker.</li>';
    setHint();
  }
  function setHint(text?: string) {
    if (text) { els.hint.textContent = text; return; }
    if (found >= total) { els.hint.textContent = 'Journey complete. Open the journal to revisit any stage.'; return; }
    const next = stages[found];
    els.hint.textContent = `Next: ${regions[next.region].hint} Follow the amber arrow.`;
  }
  function showBanner(title: string, sub: string) {
    els.banner.innerHTML = `<strong>${title}</strong><span>${sub}</span>`;
    els.banner.classList.add('is-on');
    clearTimeout(bannerTimer);
    bannerTimer = window.setTimeout(() => els.banner.classList.remove('is-on'), 2600);
  }

  // ----- dialog -----
  let typing = 0;
  let finishTyping = () => {};
  function openStage(i: number, fresh: boolean) {
    const s = stages[i];
    paused = true;
    const gateMsg = fresh && i === lastCampus ? 'You hear a gate creak open to the east.'
      : fresh && i === lastCity ? 'The bridge to the east is open.' : '';
    const done = fresh && i === total - 1;
    els.dialog.innerHTML = `
      <div class="q-box" role="dialog" aria-modal="true" aria-labelledby="q-title">
        <p class="q-kicker">Stage ${i + 1} of ${total} · ${s.start}–${s.end}</p>
        <h3 id="q-title">${s.role}</h3>
        <p class="q-org">${s.org} · ${s.location}</p>
        <p class="q-say" data-say></p>
        <ul>${s.highlights.map((h) => `<li>${h}</li>`).join('')}</ul>
        ${gateMsg ? `<p class="q-gate">${gateMsg}</p>` : ''}
        ${done ? `<p class="q-gate">You've reached the present. <a href="/#journey">Read the full timeline</a> or <a href="/#projects">see the projects</a>.</p>` : ''}
        <button type="button" data-close>Continue <kbd>Space</kbd></button>
      </div>`;
    els.dialog.classList.add('is-on');
    const say = els.dialog.querySelector('[data-say]') as HTMLElement;
    const text = s.discovery;
    let n = 0;
    let wait = 0;
    clearInterval(typing);
    finishTyping = () => { clearInterval(typing); typing = 0; say.textContent = text; };
    typing = window.setInterval(() => {
      if (wait > 0) { wait--; return; }
      const ch = text[n];
      n++;
      say.textContent = text.slice(0, n);
      if (n % 2 === 1) voice(ch); // chirp on every other letter, like speech
      if ('.,:;!?\u2014'.includes(ch)) wait = ch === ',' ? 3 : 6; // pause at punctuation
      if (n >= text.length) { clearInterval(typing); typing = 0; }
    }, 32);
    (els.dialog.querySelector('[data-close]') as HTMLElement).focus({ preventScroll: true });
  }
  function closeDialog() {
    clearInterval(typing);
    els.dialog.classList.remove('is-on');
    els.dialog.innerHTML = '';
    paused = false;
    els.canvas.focus({ preventScroll: true });
  }

  function interact() {
    if (els.dialog.classList.contains('is-on')) {
      if (typing) finishTyping(); // first press shows the whole line, second press closes
      else closeDialog();
      return;
    }
    const i = nearbyMarker();
    if (i < 0) return;
    if (i < found) { openStage(i, false); return; }
    if (i > found) { setHint('This marker is still dim. Find the earlier stages first.'); sfx('bump'); return; }
    const wasG1 = gates().g1;
    const wasG2 = gates().g2;
    found++;
    try { localStorage.setItem(STORE, String(found)); } catch {}
    sfx('discover');
    if ((!wasG1 && gates().g1) || (!wasG2 && gates().g2)) setTimeout(() => sfx('gate'), 500);
    updateHud();
    openStage(i, true);
  }

  // ----- input -----
  const MOVE: Record<string, Dir> = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
  };
  const ours = () => started && (root.contains(document.activeElement) || document.activeElement === document.body);
  window.addEventListener('keydown', (e) => {
    if (!ours()) return;
    if (e.key === 'Escape' && els.dialog.classList.contains('is-on')) { closeDialog(); return; }
    if (e.key === ' ' || e.key === 'Enter') {
      const t = e.target as HTMLElement;
      if (t.closest('[data-journal], [data-sound], a') && !els.dialog.classList.contains('is-on')) return;
      e.preventDefault();
      if (!e.repeat) interact();
      return;
    }
    const dir = MOVE[e.key];
    if (dir) { e.preventDefault(); keys.add(dir); }
  });
  window.addEventListener('keyup', (e) => { const d = MOVE[e.key]; if (d) keys.delete(d); });
  window.addEventListener('blur', () => keys.clear());

  root.querySelectorAll<HTMLElement>('[data-pad]').forEach((b) => {
    const dir = b.dataset.pad as Dir;
    const on = (e: Event) => { e.preventDefault(); keys.add(dir); };
    const off = () => keys.delete(dir);
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointerleave', off);
    b.addEventListener('pointercancel', off);
  });
  $('[data-act]').addEventListener('click', (e) => { e.preventDefault(); interact(); });
  els.dialog.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('[data-close]')) closeDialog(); });

  els.sound.addEventListener('click', () => {
    setMusic(!isMusicOn());
    els.sound.setAttribute('aria-pressed', String(isMusicOn()));
    els.sound.textContent = isMusicOn() ? 'Sound: on' : 'Sound: off';
  });
  $('[data-journal-btn]').addEventListener('click', () => els.journal.toggleAttribute('hidden'));
  els.journal.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-open]');
    if (b) { els.journal.setAttribute('hidden', ''); openStage(Number(b.dataset.open), false); }
  });
  $('[data-restart]').addEventListener('click', () => {
    found = 0;
    try { localStorage.removeItem(STORE); } catch {}
    player.x = startTile.col * TILE + 8; player.y = startTile.row * TILE + 14; player.dir = 'right';
    seenRegion = '';
    closeDialog();
    updateHud();
  });
  els.start.addEventListener('click', () => {
    started = true;
    els.start.remove();
    els.canvas.focus({ preventScroll: true });
    root.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // ----- loop -----
  let last = performance.now();
  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    if (started && !paused) update(dt);
    render(t);
    requestAnimationFrame(frame);
  }

  function update(dt: number) {
    let dx = 0, dy = 0;
    if (keys.has('left')) dx -= 1;
    if (keys.has('right')) dx += 1;
    if (keys.has('up')) dy -= 1;
    if (keys.has('down')) dy += 1;
    const moving = dx !== 0 || dy !== 0;
    if (moving) {
      player.dir = dx < 0 ? 'left' : dx > 0 ? 'right' : dy < 0 ? 'up' : 'down';
      const len = Math.hypot(dx, dy);
      const sx = (dx / len) * SPEED * dt;
      const sy = (dy / len) * SPEED * dt;
      if (!blocked(player.x + sx, player.y)) player.x += sx;
      if (!blocked(player.x, player.y + sy)) player.y += sy;
      player.walkT += dt;
      player.frame = Math.floor(player.walkT * 8) % 4 === 1 ? 1 : Math.floor(player.walkT * 8) % 4 === 3 ? 2 : 0;
    } else {
      player.frame = 0;
    }
    const reg = regionAt(Math.floor(player.x / TILE));
    if (reg !== seenRegion) {
      seenRegion = reg;
      showBanner(regions[reg].name, regions[reg].years);
    }
    const near = nearbyMarker();
    const touch = matchMedia('(pointer: coarse)').matches;
    if (near >= 0 && near <= found) setHint(near < found ? `${touch ? 'Tap A' : 'Press Space'} to revisit this stage.` : `${touch ? 'Tap A' : 'Press Space'} to look closer.`);
    else if (near < 0) setHint();
  }

  function render(t: number) {
    const camX = Math.round(Math.max(0, Math.min(COLS * TILE - VIEW_W, player.x - VIEW_W / 2)));
    const camY = Math.round(Math.max(0, Math.min(ROWS * TILE - VIEW_H, player.y - 8 - VIEW_H / 2)));
    ctx.setTransform(scale, 0, 0, scale, -camX * scale, -camY * scale);
    const c0 = Math.floor(camX / TILE), c1 = Math.min(COLS - 1, c0 + Math.ceil(VIEW_W / TILE) + 1);
    const r0 = Math.floor(camY / TILE), r1 = Math.min(ROWS - 1, r0 + Math.ceil(VIEW_H / TILE) + 1);
    const g = gates();
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const ch = rows[r][c];
        const mi = MARKER_CHARS.indexOf(ch);
        drawTile(ctx, mi >= 0 || ch === 'P' ? '.' : ch, c, r, t, g);
        if (mi >= 0 && mi < total) drawMarker(ctx, c, r, markerState(mi), t);
      }
    }
    drawPlayer(ctx, Math.round(player.x - 6), Math.round(player.y - 16), player.dir, player.frame);

    // amber arrow toward the next marker when it is off screen
    if (found < total) {
      const m = markers[found];
      const mx = m.col * TILE + 8, my = m.row * TILE + 8;
      const onScreen = mx > camX && mx < camX + VIEW_W && my > camY && my < camY + VIEW_H;
      if (!onScreen) {
        const ang = Math.atan2(my - player.y, mx - player.x);
        const cx = camX + VIEW_W / 2 + Math.cos(ang) * (VIEW_W / 2 - 14);
        const cy = camY + VIEW_H / 2 + Math.sin(ang) * (VIEW_H / 2 - 14);
        const pulse = 1 + 0.15 * Math.sin(t * 6);
        ctx.save();
        ctx.translate(Math.round(cx), Math.round(cy));
        ctx.rotate(ang);
        ctx.scale(pulse, pulse);
        ctx.fillStyle = '#f2b544';
        ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-4, -5); ctx.lineTo(-1, 0); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
    // gentle vignette
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (!started) { ctx.fillStyle = 'rgba(11,12,14,0.45)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
  }

  updateHud();
  requestAnimationFrame(frame);
}
