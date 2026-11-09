#!/usr/bin/env node
// Records a short launch-style video for every project that has a replay demo.
// It starts the dev server, opens /film/<slug> in a headless browser, records
// the screen, and saves public/media/videos/<slug>.mp4 plus a poster .jpg.
//
// Usage: node scripts/demos/make-videos.mjs [slug ...]
// Needs: ffmpeg, and Playwright with Chromium
//   (npm i --no-save playwright && npx playwright install chromium).
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  console.error('Playwright is missing. Run: npm i --no-save playwright && npx playwright install chromium');
  process.exit(1);
}

const root = resolve(import.meta.dirname, '../..');
const out = join(root, 'public/media/videos');
const tmp = join(root, '.tmp-video');
const PORT = 4399;
const W = 1280, H = 720;

const all = readdirSync(join(root, 'src/content/demos')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
const slugs = process.argv.length > 2 ? process.argv.slice(2) : all;

const server = spawn('npx', ['astro', 'dev', '--port', String(PORT)], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'], detached: true });
const stop = () => { try { process.kill(-server.pid); } catch {} };
await new Promise((ok, fail) => {
  server.stdout.on('data', (d) => {
    const s = String(d);
    if (s.includes('already running')) { console.error('Stop your running dev server first (npx astro dev stop), then try again.'); fail(new Error('dev server busy')); }
    else if (s.includes(`${PORT}`)) ok();
  });
  server.on('exit', () => fail(new Error('dev server exited')));
});

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const slug of slugs) {
    rmSync(tmp, { recursive: true, force: true });
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: tmp, size: { width: W, height: H } } });
    const page = await ctx.newPage();
    const t0 = Date.now();
    const res = await page.goto(`http://localhost:${PORT}/film/${slug}`, { waitUntil: 'networkidle' });
    if (!res?.ok()) { console.log(`${slug}: no film page (does it have a demo?)`); await ctx.close(); continue; }
    const lead = (Date.now() - t0) / 1000; // trim the blank page load
    // Poster: a frame from the middle of the demo.
    await page.waitForSelector('[data-scene="demo"].on', { timeout: 60000 });
    await page.waitForSelector('.demo-run:not([hidden]).has-result', { timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(out, `${slug}.jpg`), type: 'jpeg', quality: 82 });
    await page.waitForFunction(() => window.__filmDone === true, null, { timeout: 180000 });
    await page.waitForTimeout(800);
    const video = page.video();
    await ctx.close();
    const webm = await video.path();
    const mp4 = join(out, `${slug}.mp4`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', lead.toFixed(2), '-i', webm,
      '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-movflags', '+faststart', '-an', mp4]);
    console.log(`${slug}: saved public/media/videos/${slug}.mp4`);
  }
} finally {
  await browser.close();
  stop();
  rmSync(tmp, { recursive: true, force: true });
}
