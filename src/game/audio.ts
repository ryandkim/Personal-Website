// Original chiptune loop and sound effects, generated live with the Web Audio API.
// No audio files. Sound is off until the visitor turns it on.

let ac: AudioContext | null = null;
let master: GainNode | null = null;
let musicTimer: number | null = null;
let musicOn = false;

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function ctx() {
  if (!ac) {
    ac = new AudioContext();
    master = ac.createGain();
    master.gain.value = 0.5;
    master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, vol: number) {
  const a = ctx();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(master!);
  o.start(start);
  o.stop(start + dur + 0.02);
}

// Eight bars of eighth notes (MIDI numbers, 0 = rest), plus a bass root per bar.
const MELODY = [
  74, 0, 76, 78, 81, 0, 78, 76,   74, 0, 71, 0, 73, 74, 76, 0,
  78, 0, 81, 83, 81, 78, 76, 0,   74, 76, 78, 0, 76, 0, 74, 0,
  71, 0, 74, 76, 78, 0, 76, 74,   73, 0, 69, 0, 71, 73, 74, 0,
  76, 78, 81, 0, 83, 81, 78, 76,  74, 0, 0, 0, 74, 0, 0, 0,
];
const BASS = [50, 43, 47, 45, 43, 45, 47, 50];
const STEP = 60 / 112 / 2; // eighth note at 112 bpm

let step = 0;
let nextTime = 0;

function schedule() {
  const a = ctx();
  while (nextTime < a.currentTime + 0.2) {
    const m = MELODY[step % MELODY.length];
    if (m) tone(mtof(m), nextTime, STEP * 0.9, 'square', 0.035);
    if (step % 2 === 0) {
      const root = BASS[Math.floor(step / 8) % BASS.length];
      tone(mtof(step % 4 === 0 ? root : root + 7), nextTime, STEP * 1.8, 'triangle', 0.09);
    }
    step++;
    nextTime += STEP;
  }
}

export function setMusic(on: boolean) {
  musicOn = on;
  if (on) {
    const a = ctx();
    nextTime = a.currentTime + 0.05;
    if (musicTimer === null) musicTimer = window.setInterval(schedule, 50);
  } else if (musicTimer !== null) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}

export const isMusicOn = () => musicOn;
export const soundEnabled = () => musicOn;

export function sfx(kind: 'discover' | 'gate' | 'blip' | 'bump') {
  if (!musicOn) return;
  const a = ctx();
  const t = a.currentTime;
  if (kind === 'discover') [72, 76, 79, 84, 88].forEach((m, i) => tone(mtof(m), t + i * 0.07, 0.25, 'square', 0.05));
  if (kind === 'gate') [55, 52, 48, 43].forEach((m, i) => tone(mtof(m), t + i * 0.09, 0.2, 'triangle', 0.12));
  if (kind === 'blip') tone(mtof(84), t, 0.05, 'square', 0.03);
  if (kind === 'bump') tone(mtof(40), t, 0.06, 'triangle', 0.08);
}

// "Voice" for dialogue text: a short 8-bit chirp per letter whose pitch depends on
// the letter, so the text sounds like it is being spoken in a babbling, made-up language.
export function voice(ch: string) {
  if (!musicOn || !/[a-z0-9]/i.test(ch)) return;
  const a = ctx();
  const t = a.currentTime;
  const steps = [0, 2, 4, 7, 9, 12, 14]; // pentatonic, so it always sounds pleasant
  const semis = steps[ch.toLowerCase().charCodeAt(0) % steps.length] + (Math.random() < 0.3 ? 1 : 0);
  const f = 392 * Math.pow(2, semis / 12);
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(f * 1.06, t);
  o.frequency.exponentialRampToValueAtTime(f * 0.94, t + 0.05);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.045, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + 0.07);
}
