#!/usr/bin/env node
/**
 * Composes the Instagram launch post from the brand artwork. Run: npm run generate-launch-post
 *
 * Writes ssot/assets/social/launch-post.png, 1080x1350. The logo stands in front, the
 * seven brand characters stand behind it as a pyramid, and the wordmark and tagline sit
 * below. Every pixel comes from committed artwork, so nothing is redrawn:
 *
 * - the characters are the SVGs in ssot/assets/characters/ and the logo is logo.svg
 * - the wordmark and tagline are cut from the Play feature graphic, which carries them
 *   as outlined paths, so no font is needed
 *
 * See ssot/implementation/social-media-channels.md, section "The Launch Post".
 */
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const OUT = 'ssot/assets/social/launch-post.png';
const W = 1080;
const H = 1350;
const BG = '#1a1c22';
const CHARACTERS = 'ssot/assets/characters/';
const FEATURE_GRAPHIC =
  'ssot/assets/store-listing/feature-graphic/feature-graphic.svg';

/** Moves the whole composition vertically, so the space above and below is even. */
const SHIFT = -30;

const logo = {
  file: 'apps/bite-tribe/src/assets/icons/logo.svg',
  left: 320,
  top: 250,
  width: 440,
};

/**
 * Body centre (x, y), square canvas size and tilt in degrees, listed back to front.
 * Smaller means further back. Nothing may sit in the logo's bite notch, on its right
 * between roughly x 600-760 and y 410-640.
 */
const tribe = [
  { file: '02-arab.svg', x: 175, y: 745, size: 290, rotate: -8 },
  { file: '04-turk.svg', x: 905, y: 745, size: 285, rotate: 8 },
  { file: '07-swiss.svg', x: 320, y: 815, size: 320, rotate: -3 },
  { file: '03-ethiopian.svg', x: 730, y: 815, size: 315, rotate: 4 },
  { file: '05-chinese.svg', x: 250, y: 590, size: 250, rotate: -6 },
  { file: '06-japanese.svg', x: 850, y: 570, size: 240, rotate: 7 },
  { file: '01-viking.svg', x: 325, y: 450, size: 225, rotate: -8 },
];

/** Wordmark and tagline: regions of the 1024x500 feature graphic, and the gap below each. */
const lettering = [
  { left: 245, top: 165, width: 340, height: 55, gap: 34 },
  { left: 250, top: 225, width: 335, height: 45, gap: 0 },
];
const TEXT_TOP = 985;
const TAGLINE_WIDTH = 780;

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

async function renderSvg(file, width, rotate = 0) {
  const png = await sharp(readFileSync(file), { density: 300 })
    .resize({ width })
    .png()
    .toBuffer();
  const out = rotate
    ? await sharp(png)
        .rotate(rotate, { background: transparent })
        .png()
        .toBuffer()
    : png;
  const { width: w, height: h } = await sharp(out).metadata();
  return { input: out, w, h };
}

/** The feature graphic with its photo and fade removed, rendered at 4x. */
async function renderLettering() {
  const scale = 4;
  const svg = readFileSync(FEATURE_GRAPHIC, 'utf8')
    .replace(/<rect x="130"[^>]*pattern0[^>]*\/>/, '')
    .replace(/<rect x="398.114"[^>]*\/>/, '');
  const sheet = await sharp(Buffer.from(svg), { density: 72 * scale })
    .png()
    .toBuffer();
  const pieces = [];
  for (const region of lettering) {
    const cut = await sharp(sheet)
      .extract({
        left: region.left * scale,
        top: region.top * scale,
        width: region.width * scale,
        height: region.height * scale,
      })
      .toBuffer();
    const trimmed = await sharp(cut)
      .trim({ background: BG, threshold: 10 })
      .png()
      .toBuffer();
    const { width, height } = await sharp(trimmed).metadata();
    pieces.push({ buffer: trimmed, width, height, gap: region.gap });
  }
  return pieces;
}

const layers = [];

for (const t of tribe) {
  const r = await renderSvg(CHARACTERS + t.file, t.size, t.rotate);
  // The cookie body sits at (0.5, 0.55) of a character's canvas; rotating grows the canvas.
  layers.push({
    input: r.input,
    left: Math.round(t.x - r.w / 2),
    top: Math.round(t.y - 0.55 * t.size - (r.h - t.size) / 2),
  });
}

const main = await renderSvg(logo.file, logo.width);
layers.push({ input: main.input, left: logo.left, top: logo.top });

const pieces = await renderLettering();
const scale = TAGLINE_WIDTH / pieces[pieces.length - 1].width;
let y = TEXT_TOP;
for (const piece of pieces) {
  const w = Math.round(piece.width * scale);
  const h = Math.round(piece.height * scale);
  layers.push({
    input: await sharp(piece.buffer).resize(w, h).png().toBuffer(),
    left: Math.round((W - w) / 2),
    top: y,
  });
  y += h + piece.gap;
}

for (const layer of layers) layer.top += SHIFT;

await sharp({ create: { width: W, height: H, channels: 4, background: BG } })
  .composite(layers)
  .flatten({ background: BG })
  .png({ compressionLevel: 9 })
  .toFile(OUT);

console.log(`wrote ${OUT}`);
