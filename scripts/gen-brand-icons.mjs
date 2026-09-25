/**
 * N-BRAND-02 — generate the brand icon set procedurally (Phase D2).
 *
 * The shipped icons were still the Expo template chevron on a blue gradient: no brand, and
 * the wrong palette for a dark neon game. Rather than add an image dependency, this draws
 * the mark into an RGBA buffer and encodes PNG with Node's built-in `zlib`.
 *
 * The mark is "Pulse Paddle": a white paddle with a cyan pulse glow, the ball above it, and
 * a row of brick-palette bars. Colours come from `src/render/colors.ts`.
 *
 * Regenerate with `npm run gen:icons`. Deterministic — same bytes every run.
 */
import { deflateSync } from 'node:zlib';
import { Buffer } from 'node:buffer';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../assets/images');

// --- palette (mirrors src/render/colors.ts) ---
const FIELD_NAVY = [0x1a, 0x1a, 0x2e];
const DEEP = [0x0b, 0x0b, 0x16];
const WHITE = [0xff, 0xff, 0xff];
const CYAN = [0x67, 0xe8, 0xf9];
const BRICKS = [
  [0xc4, 0x45, 0x69],
  [0xe0, 0x7a, 0x5f],
  [0xf2, 0xcc, 0x8f],
  [0xf9, 0x73, 0x16],
];

const SS = 4; // supersample factor — cheap anti-aliasing

// --- tiny float canvas (premultiplied-free straight alpha over opaque bg) ---
function canvas(w, h) {
  return { w, h, px: new Float64Array(w * h * 4) };
}

function blend(c, x, y, rgb, a) {
  if (a <= 0 || x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const i = (y * c.w + x) * 4;
  const inv = 1 - a;
  c.px[i] = c.px[i] * inv + rgb[0] * a;
  c.px[i + 1] = c.px[i + 1] * inv + rgb[1] * a;
  c.px[i + 2] = c.px[i + 2] * inv + rgb[2] * a;
  c.px[i + 3] = c.px[i + 3] * inv + 255 * a;
}

/** Vertical gradient between two colours. */
function gradient(c, top, bottom) {
  for (let y = 0; y < c.h; y++) {
    const t = y / (c.h - 1);
    const rgb = [
      top[0] + (bottom[0] - top[0]) * t,
      top[1] + (bottom[1] - top[1]) * t,
      top[2] + (bottom[2] - top[2]) * t,
    ];
    for (let x = 0; x < c.w; x++) blend(c, x, y, rgb, 1);
  }
}

function roundRect(c, x0, y0, w, h, r, rgb, a = 1) {
  const x1 = x0 + w;
  const y1 = y0 + h;
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
      const cx = Math.min(Math.max(x + 0.5, x0 + r), x1 - r);
      const cy = Math.min(Math.max(y + 0.5, y0 + r), y1 - r);
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r * r) blend(c, x, y, rgb, a);
    }
  }
}

function disc(c, cx, cy, r, rgb, a = 1) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r * r) blend(c, x, y, rgb, a);
    }
  }
}

/** Soft radial falloff — the "pulse". */
function glow(c, cx, cy, r, rgb, peak) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = (x + 0.5 - cx) / r;
      const dy = (y + 0.5 - cy) / r;
      const d = Math.hypot(dx, dy);
      if (d >= 1) continue;
      const f = (1 - d) * (1 - d);
      blend(c, x, y, rgb, peak * f);
    }
  }
}

function downsample(c, factor) {
  const w = c.w / factor;
  const h = c.h / factor;
  const out = canvas(w, h);
  const n = factor * factor;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < factor; sy++) {
        for (let sx = 0; sx < factor; sx++) {
          const i = ((y * factor + sy) * c.w + (x * factor + sx)) * 4;
          r += c.px[i]; g += c.px[i + 1]; b += c.px[i + 2]; a += c.px[i + 3];
        }
      }
      const o = (y * w + x) * 4;
      out.px[o] = r / n; out.px[o + 1] = g / n; out.px[o + 2] = b / n; out.px[o + 3] = a / n;
    }
  }
  return out;
}

// --- PNG encoding (RGBA8, filter 0) ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(c) {
  const raw = Buffer.alloc(c.h * (c.w * 4 + 1));
  let p = 0;
  for (let y = 0; y < c.h; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < c.w; x++) {
      const i = (y * c.w + x) * 4;
      raw[p++] = Math.max(0, Math.min(255, Math.round(c.px[i])));
      raw[p++] = Math.max(0, Math.min(255, Math.round(c.px[i + 1])));
      raw[p++] = Math.max(0, Math.min(255, Math.round(c.px[i + 2])));
      raw[p++] = Math.max(0, Math.min(255, Math.round(c.px[i + 3])));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(c.w, 0);
  ihdr.writeUInt32BE(c.h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- the mark ---
/**
 * Draw the Pulse Paddle mark on a unit square of side `S`.
 * `opts.background` false → transparent (adaptive foreground / monochrome).
 * `opts.mono` → single flat colour silhouette.
 * `inset` shrinks the mark for Android's adaptive safe zone.
 */
function drawMark(c, S, opts = {}) {
  const { background = true, mono = null, inset = 0 } = opts;
  if (background) gradient(c, FIELD_NAVY, DEEP);

  const k = 1 - inset * 2;
  const ox = S * inset;
  const u = (v) => ox + v * S * k;
  const s = (v) => v * S * k;

  const paddleW = s(0.56);
  const paddleH = s(0.085);
  const paddleX = u(0.22);
  const paddleY = u(0.70);
  const ballR = s(0.085);
  const ballCx = u(0.5);
  const ballCy = u(0.47);

  if (mono) {
    roundRect(c, paddleX, paddleY, paddleW, paddleH, paddleH / 2, mono, 1);
    disc(c, ballCx, ballCy, ballR, mono, 1);
    for (let i = 0; i < 4; i++) {
      const bw = s(0.155);
      const bx = u(0.115) + i * s(0.1925);
      roundRect(c, bx, u(0.2), bw, s(0.06), s(0.014), mono, 1);
    }
    return;
  }

  // brick row
  for (let i = 0; i < 4; i++) {
    const bw = s(0.155);
    const bx = u(0.115) + i * s(0.1925);
    roundRect(c, bx, u(0.2), bw, s(0.06), s(0.014), BRICKS[i], 1);
  }

  // the pulse under the paddle, then the paddle, then the ball + its halo
  glow(c, ballCx, paddleY + paddleH / 2, s(0.42), CYAN, 0.5);
  roundRect(c, paddleX, paddleY, paddleW, paddleH, paddleH / 2, CYAN, 0.55);
  roundRect(
    c,
    paddleX + s(0.012),
    paddleY + s(0.012),
    paddleW - s(0.024),
    paddleH - s(0.024),
    (paddleH - s(0.024)) / 2,
    WHITE,
    1,
  );
  glow(c, ballCx, ballCy, ballR * 2.6, CYAN, 0.45);
  disc(c, ballCx, ballCy, ballR, WHITE, 1);
}

function render(size, opts) {
  const c = canvas(size * SS, size * SS);
  drawMark(c, size * SS, opts);
  return downsample(c, SS);
}

function write(name, c) {
  const buf = encodePng(c);
  writeFileSync(join(OUT, name), buf);
  console.log(`${name}: ${c.w}x${c.h}, ${buf.length} bytes`);
}

write('icon.png', render(1024, {}));
write('splash-icon.png', render(512, { background: false }));
write('favicon.png', render(48, {}));
// Android adaptive: foreground inset into the 66% safe zone, background is the field.
write('android-icon-foreground.png', render(432, { background: false, inset: 0.17 }));
const bg = canvas(432, 432);
gradient(bg, FIELD_NAVY, DEEP);
write('android-icon-background.png', bg);
write('android-icon-monochrome.png', render(432, { background: false, mono: WHITE, inset: 0.17 }));
