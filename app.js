/* Flow Field Studio
 * A self-contained generative-art engine: particles advected through a
 * value-noise flow field, rendered as fading trails on a 2D canvas.
 * No dependencies, no network. (c) MIT.
 */
'use strict';

/* ---------------- seeded value noise ---------------- */
// Small, fast 3D value-noise with a seedable PRNG so "New seed" is reproducible.
function makeNoise(seed) {
  let s = seed >>> 0;
  const rand = () => {
    // xorshift32
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
  const size = 256;
  const perm = new Uint8Array(size * 2);
  const grad = new Float32Array(size);
  for (let i = 0; i < size; i++) { perm[i] = i; grad[i] = rand(); }
  for (let i = size - 1; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0;
    const t = perm[i]; perm[i] = perm[j]; perm[j] = t;
  }
  for (let i = 0; i < size; i++) perm[size + i] = perm[i];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  const val = (xi, yi, zi) => grad[perm[(perm[(xi & 255) + perm[yi & 255]] + zi) & 255]];
  return function (x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = fade(xf), v = fade(yf), w = fade(zf);
    const c000 = val(xi, yi, zi),       c100 = val(xi + 1, yi, zi);
    const c010 = val(xi, yi + 1, zi),   c110 = val(xi + 1, yi + 1, zi);
    const c001 = val(xi, yi, zi + 1),   c101 = val(xi + 1, yi, zi + 1);
    const c011 = val(xi, yi + 1, zi + 1), c111 = val(xi + 1, yi + 1, zi + 1);
    const x00 = lerp(c000, c100, u), x10 = lerp(c010, c110, u);
    const x01 = lerp(c001, c101, u), x11 = lerp(c011, c111, u);
    return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w); // 0..1
  };
}

/* ---------------- palettes ---------------- */
const PALETTES = [
  { name: 'Aurora',   bg: '#070b12', colors: ['#6ee7ff', '#5eead4', '#b794ff', '#f0abfc'] },
  { name: 'Ember',    bg: '#120806', colors: ['#fb7185', '#fb923c', '#fbbf24', '#f43f5e'] },
  { name: 'Verdant',  bg: '#06120c', colors: ['#34d399', '#a3e635', '#22d3ee', '#4ade80'] },
  { name: 'Mono',     bg: '#0a0a0a', colors: ['#ffffff', '#cbd5e1', '#94a3b8', '#e2e8f0'] },
  { name: 'Candy',    bg: '#0f0717', colors: ['#f0abfc', '#c084fc', '#818cf8', '#22d3ee'] },
  { name: 'Sunset',   bg: '#140a12', colors: ['#fda4af', '#fdba74', '#fcd34d', '#c084fc'] },
  { name: 'Ocean',    bg: '#040b14', colors: ['#38bdf8', '#0ea5e9', '#2dd4bf', '#818cf8'] },
  { name: 'Magma',    bg: '#100404', colors: ['#ef4444', '#f97316', '#facc15', '#fb7185'] },
];

/* ---------------- state ---------------- */
const cfg = {
  count: 1400, scale: 1.4, speed: 1.2, curl: 2.3,
  width: 1.4, fade: 0.045, force: 'attract', palette: 0,
};

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d', { alpha: false });
let W = 0, H = 0, DPR = 1;
let noise = makeNoise((Math.random() * 1e9) | 0);
let particles = [];
let zoff = 0;
let running = true;
let rafId = null;
const pointer = { x: 0, y: 0, active: false };

/* ---------------- sizing ---------------- */
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  paintBg();
}

function paintBg() {
  ctx.fillStyle = PALETTES[cfg.palette].bg;
  ctx.fillRect(0, 0, W, H);
}

/* ---------------- particles ---------------- */
function spawn(p) {
  p.x = Math.random() * W;
  p.y = Math.random() * H;
  p.life = 40 + Math.random() * 220;
  p.c = PALETTES[cfg.palette].colors[(Math.random() * PALETTES[cfg.palette].colors.length) | 0];
  return p;
}
function rebuild() {
  particles = [];
  for (let i = 0; i < cfg.count; i++) particles.push(spawn({}));
}

/* ---------------- simulation ---------------- */
function step() {
  // translucent wash creates the fading-trail look
  const fade = cfg.fade;
  if (fade > 0) {
    ctx.globalAlpha = fade;
    paintBg();
    ctx.globalAlpha = 1;
  }

  const inv = 0.0016 * cfg.scale;
  ctx.lineWidth = cfg.width;
  ctx.lineCap = 'round';

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const angle = noise(p.x * inv, p.y * inv, zoff) * Math.PI * 2 * cfg.curl;
    let vx = Math.cos(angle) * cfg.speed;
    let vy = Math.sin(angle) * cfg.speed;

    if (cfg.force !== 'off' && pointer.active) {
      const dx = pointer.x - p.x, dy = pointer.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 240 * 240 && d2 > 1) {
        const f = (cfg.force === 'attract' ? 1 : -1) * (1 - Math.sqrt(d2) / 240) * 2.4;
        const id = 1 / Math.sqrt(d2);
        vx += dx * id * f; vy += dy * id * f;
      }
    }

    const nx = p.x + vx, ny = p.y + vy;
    ctx.strokeStyle = p.c;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(nx, ny);
    ctx.stroke();

    p.x = nx; p.y = ny;
    if (--p.life <= 0 || nx < -5 || nx > W + 5 || ny < -5 || ny > H + 5) spawn(p);
  }
  zoff += 0.0008 * cfg.speed;
}

function loop() {
  step();
  rafId = requestAnimationFrame(loop);
}
function start() { if (!rafId) loop(); }
function stop() { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }

/* ---------------- UI wiring ---------------- */
const $ = (id) => document.getElementById(id);

function bindSlider(id, key, outId, digits) {
  const el = $(id), out = $(outId);
  const sync = () => {
    cfg[key] = parseFloat(el.value);
    out.textContent = cfg[key].toFixed(digits);
    if (key === 'count') rebuild();
  };
  el.addEventListener('input', sync);
  sync();
}
bindSlider('count', 'count', 'out-count', 0);
bindSlider('scale', 'scale', 'out-scale', 2);
bindSlider('speed', 'speed', 'out-speed', 2);
bindSlider('curl', 'curl', 'out-curl', 2);
bindSlider('width', 'width', 'out-width', 1);
bindSlider('fade', 'fade', 'out-fade', 3);

// palettes
const palWrap = $('palettes');
PALETTES.forEach((pal, i) => {
  const b = document.createElement('button');
  b.className = 'swatch' + (i === cfg.palette ? ' is-on' : '');
  b.style.background = `linear-gradient(135deg, ${pal.colors[0]}, ${pal.colors[2]})`;
  b.title = pal.name;
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-label', pal.name);
  b.setAttribute('aria-checked', i === cfg.palette ? 'true' : 'false');
  b.addEventListener('click', () => {
    cfg.palette = i;
    [...palWrap.children].forEach((c, j) => {
      c.classList.toggle('is-on', j === i);
      c.setAttribute('aria-checked', j === i ? 'true' : 'false');
    });
    paintBg();
    particles.forEach((p) => { p.c = pal.colors[(Math.random() * pal.colors.length) | 0]; });
  });
  palWrap.appendChild(b);
});

// cursor force segmented control
document.querySelectorAll('.seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('is-on'));
    btn.classList.add('is-on');
    cfg.force = btn.dataset.force;
  });
});

// actions
$('reseed').addEventListener('click', () => {
  noise = makeNoise((Math.random() * 1e9) | 0);
  paintBg(); rebuild(); toast('New field seeded');
});
$('clear').addEventListener('click', () => { paintBg(); toast('Canvas cleared'); });
const playBtn = $('play');
playBtn.addEventListener('click', () => {
  running = !running;
  playBtn.textContent = running ? 'Pause' : 'Play';
  if (running) start(); else stop();
});
$('save').addEventListener('click', () => {
  const a = document.createElement('a');
  a.download = `flow-field-${Date.now()}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
  toast('PNG saved');
});

// panel toggle
const panel = $('panel');
const toggle = $('toggle-panel');
toggle.addEventListener('click', () => {
  const hidden = panel.classList.toggle('is-hidden');
  toggle.setAttribute('aria-expanded', hidden ? 'false' : 'true');
});

// pointer steering
function setPointer(e) {
  const t = e.touches ? e.touches[0] : e;
  pointer.x = t.clientX; pointer.y = t.clientY;
}
canvas.addEventListener('pointerdown', (e) => { pointer.active = true; setPointer(e); });
canvas.addEventListener('pointermove', (e) => { if (pointer.active) setPointer(e); });
window.addEventListener('pointerup', () => { pointer.active = false; });

// toast helper
let toastTimer = null;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 1600);
}

// keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === ' ') { e.preventDefault(); playBtn.click(); }
  else if (e.key.toLowerCase() === 'r') $('reseed').click();
  else if (e.key.toLowerCase() === 's') $('save').click();
  else if (e.key.toLowerCase() === 'c') $('clear').click();
});

/* ---------------- boot ---------------- */
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resize, 150);
});
resize();
rebuild();
start();
