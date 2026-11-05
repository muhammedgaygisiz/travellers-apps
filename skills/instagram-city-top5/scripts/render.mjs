// Renders the "<City> Top 5 dishes" Instagram carousel: a cover with Leela, five
// Bite cards and Leela's closing call to action, each 1080x1440 (3:4).
//
// Usage, from the repository root (Playwright and sharp resolve from there):
//   node skills/instagram-city-top5/scripts/render.mjs <config.json> <out-dir>
//
// Relative paths in the config resolve against the config file's folder.
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const [configPath, outArg] = process.argv.slice(2);
if (!configPath || !outArg) {
  console.error('usage: node render.mjs <config.json> <out-dir>');
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(join(root, 'package.json'));
const { chromium } = require('playwright');
const sharp = require('sharp');

const config = JSON.parse(readFileSync(configPath, 'utf8'));
const base = dirname(resolve(configPath));
const out = resolve(outArg);
mkdirSync(out, { recursive: true });

if (config.bites?.length !== 5)
  throw new Error('config.bites must hold exactly five Bites');

const mime = {
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};
const dataUri = (p) =>
  `data:${mime[extname(p).toLowerCase()] ?? 'image/jpeg'};base64,${readFileSync(p).toString('base64')}`;
const fromConfig = (p) => dataUri(resolve(base, p));
const escape = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const logo = dataUri(join(root, 'apps/bite-tribe/src/assets/icons/logo.svg'));
const leela = (file) =>
  dataUri(join(root, 'ssot/assets/characters/leela', file));

const leelaCover =
  config.leela?.cover ??
  `Hi, I'm Leela! Here are my favourite bites in ${config.city} 👉`;
const leelaOutro =
  config.leela?.outro ??
  'Liked these? Follow us for more city picks, and try BiteTribe to find your own!';

// Ionicons "star", the icon star-rating draws.
const star = `<svg viewBox="0 0 512 512"><path d="M394 480a16 16 0 01-9.39-3L256 383.76 127.39 477a16 16 0 01-24.55-18.08L153 310.35 23 221.2a16 16 0 019-29.2h160.38l48.4-148.95a16 16 0 0130.44 0l48.4 149H480a16 16 0 019.05 29.2L359 310.35l50.13 148.53A16 16 0 01394 480z"/></svg>`;

// Web card values (libs/bite-tribe-common/bite/src/lib/bite.component.scss) scaled
// by K so the 458px search card fills the slide.
const K = 2.2;
const px = (v) => `${Math.round(v * K)}px`;

const head = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Playfair+Display:ital,wght@1,800&family=Noto+Color+Emoji&display=block" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1080px; height: 1440px; overflow: hidden; background: #1a1c22; }
  body { font-family: Outfit, 'Noto Color Emoji', sans-serif; color: #fcf7f0; }
  .brand { display: flex; align-items: center; justify-content: center; gap: 22px; }
  .brand img { height: 128px; }
  .brand span { font-weight: 600; font-size: 64px; color: #fff; letter-spacing: 0.5px; }

  /* Cover */
  .cover { position: relative; width: 1080px; height: 1440px; }
  .cover > img.photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .cover .shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,12,16,.45) 0%, rgba(10,12,16,.38) 45%, rgba(10,12,16,.42) 100%); }
  .cover .brand { position: absolute; top: 170px; left: 0; right: 0; }
  .cover .city { position: absolute; right: 40px; top: 400px; text-align: right; }
  .cover .city h1 { font-family: 'Playfair Display', serif; font-style: italic; font-weight: 800; line-height: 1; color: #fff; letter-spacing: -1px; }
  .cover .city h2 { font-weight: 400; font-size: 68px; color: #fff; margin-top: 44px; }

  /* Dish slide */
  .dish { width: 1080px; height: 1440px; display: flex; flex-direction: column; align-items: center; }
  .card { margin-top: 240px; width: ${px(458)}; border-radius: ${px(46)}; overflow: hidden; border: ${px(1)} solid #434a51; background: #434a51; }
  .card .photo { height: ${px(220)}; }
  .card .photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .card header { background: #191e26; padding: ${px(10)} ${px(15)} 0; }
  .card .title { font-size: ${px(28)}; line-height: 1.15; letter-spacing: ${px(0.96)}; font-weight: 400; }
  .card .sub { display: grid; grid-template-columns: 45% 10% 45%; padding-top: ${px(8)}; font-size: ${px(14)}; letter-spacing: ${px(0.84)}; text-transform: uppercase; line-height: 1.3; }
  .card .sub .loc { grid-column: 3; text-align: end; color: #ababab; }
  .card .content { background: #191e26; display: flex; justify-content: space-between; align-items: flex-end; min-height: ${px(80)}; padding: ${px(8)} 0 0 ${px(16)}; }
  .card .stars { display: flex; gap: ${px(4)}; margin: ${px(16)} 0 ${px(24)}; }
  .card .stars svg { width: ${px(32)}; height: ${px(32)}; fill: #fec56b; stroke: #434a51; stroke-width: 16; }
  .card .stars svg.empty { fill: none; stroke: #fec56b; stroke-width: 24; }
  .card .likes { background: rgba(255,255,255,.12); border-radius: ${px(16)} 0 0 0; padding: ${px(14)} ${px(30)} ${px(14)} ${px(16)}; font-size: ${px(24)}; color: #fff; display: flex; gap: ${px(6)}; align-items: center; }
  .dish .brand { margin-top: auto; margin-bottom: 120px; }

  /* Leela: a round crop of her comic panel plus a speech bubble */
  .leela { border-radius: 50%; overflow: hidden; border: 8px solid #fff; box-shadow: 0 12px 40px rgba(0,0,0,.45); flex: none; }
  .leela img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 100%; display: block; }
  .bubble { position: relative; background: #fff; color: #1a1c22; border-radius: 44px; padding: 34px 40px; font-size: 44px; line-height: 1.25; font-weight: 600; }
  .cover .say { position: absolute; left: 50px; right: 50px; bottom: 90px; display: flex; align-items: center; gap: 34px; }
  .cover .say .leela { width: 340px; height: 340px; }
  .cover .say .bubble::before { content: ''; position: absolute; left: -26px; top: 50%; margin-top: -22px; border: 22px solid transparent; border-right: 30px solid #fff; border-left: 0; }

  /* Closing slide */
  .outro { width: 1080px; height: 1440px; display: flex; flex-direction: column; align-items: center; padding: 120px 80px 0; }
  .outro .leela { width: 460px; height: 460px; }
  .outro .bubble { margin-top: 60px; text-align: center; font-size: 52px; padding: 44px 56px; }
  .outro .bubble::before { content: ''; position: absolute; top: -34px; left: 50%; margin-left: -26px; border: 26px solid transparent; border-bottom: 36px solid #fff; border-top: 0; }
  .outro .handle { margin-top: 50px; font-size: 50px; font-weight: 600; color: #fec56b; }
  .outro .stores { margin-top: 16px; font-size: 40px; color: #ababab; }
  .outro .brand { margin-top: auto; margin-bottom: 120px; }
</style>`;

const page = (body) =>
  `<!doctype html><html><head><meta charset="utf-8">${head}</head><body>${body}</body></html>`;
const brand = `<div class="brand"><img src="${logo}"><span>BiteTribe</span></div>`;

const cover = page(`
<div class="cover">
  <img class="photo" src="${fromConfig(config.coverPhoto)}">
  <div class="shade"></div>
  ${brand}
  <div class="city"><h1 style="font-size: ${config.cityFontSize ?? 190}px">${escape(config.city)}</h1><h2>Top 5 dishes</h2></div>
  <div class="say">
    <div class="leela"><img src="${leela('leela-vienna-first-bite.png')}"></div>
    <div class="bubble">${escape(leelaCover)}</div>
  </div>
</div>`);

const stars = (n = 5) =>
  Array.from({ length: 5 }, (_, i) =>
    i < n ? star : star.replace('<svg', '<svg class="empty"'),
  ).join('');

const dish = (b) =>
  page(`
<div class="dish">
  <div class="card">
    <div class="photo"><img src="${fromConfig(b.photo)}"></div>
    <header>
      <div class="title">${escape(b.name)}</div>
      <div class="sub"><span>${escape(b.place)}</span><span class="loc">${escape(b.where ?? config.where)}</span></div>
    </header>
    <div class="content">
      <div class="stars">${stars(b.stars)}</div>
      ${b.count ? `<div class="likes"><span>${b.emojis}</span><span>${b.count}</span></div>` : ''}
    </div>
  </div>
  ${brand}
</div>`);

const outro = page(`
<div class="outro">
  <div class="leela"><img src="${leela('leela-vienna-shows-her-phone.png')}"></div>
  <div class="bubble">${escape(leelaOutro)}</div>
  <div class="handle">@bitetribeapp</div>
  <div class="stores">📲 Available on iOS and Android</div>
  ${brand}
</div>`);

const slides = [cover, ...config.bites.map(dish), outro];
const browser = await chromium.launch({ channel: 'chrome' });
const tab = await browser.newPage({ viewport: { width: 1080, height: 1440 } });
for (const [i, html] of slides.entries()) {
  await tab.setContent(html, { waitUntil: 'networkidle' });
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: join(out, `slide-${i}.png`) });
  await sharp(join(out, `slide-${i}.png`))
    .jpeg({ quality: 92 })
    .toFile(join(out, `slide-${i}.jpg`));
}
await browser.close();

// Contact sheet: all slides at a third of their size, four to a row.
const W = 360;
const H = 480;
const tiles = await Promise.all(
  slides.map(async (_, i) => ({
    input: await sharp(join(out, `slide-${i}.png`))
      .resize(W, H)
      .toBuffer(),
    left: (i % 4) * (W + 10),
    top: Math.floor(i / 4) * (H + 10),
  })),
);
await sharp({
  create: {
    width: 4 * W + 30,
    height: 2 * H + 10,
    channels: 3,
    background: '#000',
  },
})
  .composite(tiles)
  .png()
  .toFile(join(out, 'contact.png'));

console.log(`rendered ${slides.length} slides and contact.png to ${out}`);
