// Renders the "New in v<version>" release announcement as one Instagram Story,
// 1080x1920 (9:16): the mascot with two brand characters, a version badge, a
// two-line headline, five highlight cards and the update call to action.
//
// Usage, from the repository root (Playwright resolves from there):
//   node skills/release-story/scripts/render.mjs <config.json> <out.png>
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [configPath, outArg] = process.argv.slice(2);
if (!configPath || !outArg) {
  console.error('usage: node render.mjs <config.json> <out.png>');
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(join(root, 'package.json'));
const { chromium } = require('playwright');

const config = JSON.parse(readFileSync(configPath, 'utf8'));
const out = resolve(outArg);
mkdirSync(dirname(out), { recursive: true });

// The layout holds exactly five cards between the headline and the call to
// action; four leaves a gap and six runs into the button.
if (config.highlights?.length !== 5)
  throw new Error('config.highlights must hold exactly five highlights');
if (!config.version) throw new Error('config.version is required');
if (config.headline?.length !== 2)
  throw new Error('config.headline must hold exactly two lines');

const svg = (p) =>
  `data:image/svg+xml;base64,${readFileSync(join(root, p)).toString('base64')}`;
const character = (name) => svg(`ssot/marketing/assets/characters/${name}.svg`);
const escape = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const logo = svg('apps/bite-tribe/src/assets/icons/logo.svg');
const [left, right] = config.characters ?? ['01-viking', '06-japanese'];

// 24x24 stroke icons, drawn in the card's tone colour.
const icons = {
  instagram:
    '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>',
  celebrate:
    '<path d="M4 20 9 7l8 8-13 5Z"/><path d="M14 4v2M19 9h2M17 6l1.5-1.5M12.5 8.5 14 7"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z"/>',
  hand: '<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M12 10.5V9a1.5 1.5 0 0 1 3 0v2"/><path d="M15 10.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L4 15.5a1.6 1.6 0 0 1 2.6-1.8L9 16"/>',
  people:
    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5A6.5 6.5 0 0 1 21.5 20"/>',
  language:
    '<path d="M4 5h9M8.5 3v2M6 5c.8 3.5 3 6 6 7.5M11 5c-.8 3.5-3 6-6.5 7.5"/><path d="m12 21 4.5-10L21 21M13.6 17.5h5.8"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  bookmark: '<path d="M6 3h12v18l-6-4.5L6 21V3Z"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2Z"/><path d="M10 21h4"/>',
  shield:
    '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
  camera:
    '<path d="M4 8h3l2-3h6l2 3h3v11H4V8Z"/><circle cx="12" cy="13" r="3.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4h-4z"/>',
  sparkles:
    '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  desktop:
    '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
};
// The 1.1.0 story's tone order, used when a highlight names none.
const defaultTones = ['gold', 'ember', 'blue', 'gold', 'blue'];

const cards = config.highlights
  .map((h, i) => {
    const icon = icons[h.icon];
    if (!icon)
      throw new Error(
        `unknown icon "${h.icon}"; use one of ${Object.keys(icons).join(', ')}`,
      );
    const tone = h.tone ?? defaultTones[i];
    return `
      <div class="item">
        <div class="icon ${tone === 'gold' ? '' : tone}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
        </div>
        <div>
          <h3>${escape(h.title)}</h3>
          <p>${escape(h.text)}</p>
        </div>
      </div>`;
  })
  .join('');

const cta = config.cta ?? 'Update now';
const link = config.link ?? 'bitetribe.app/download';
const handle = config.handle ?? '@bitetribeapp';

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=block" rel="stylesheet">
<style>
  :root {
    --bg: #1c212b;
    --bg-2: #232a37;
    --cookie: #f0b967;
    --cookie-dark: #ce8b3d;
    --ember: #d36127;
    --blue: #4a90d9;
    --text: #fcf7f0;
    --muted: #a9b0bd;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1080px; height: 1920px; }
  body {
    font-family: 'Outfit', sans-serif;
    color: var(--text);
    background:
      radial-gradient(900px 700px at 50% 22%, rgba(240,185,103,.18), transparent 70%),
      radial-gradient(700px 600px at 100% 100%, rgba(74,144,217,.14), transparent 70%),
      var(--bg);
    overflow: hidden;
    position: relative;
  }
  .confetti { position: absolute; border-radius: 3px; }
  .wrap { position: absolute; inset: 0; padding: 140px 80px 0; display: flex; flex-direction: column; align-items: center; }

  .hero { position: relative; width: 480px; height: 270px; }
  .hero .logo { position: absolute; left: 50%; top: 0; height: 270px; transform: translateX(-50%); }
  .hero .side { position: absolute; height: 110px; }
  .hero .l { left: -50px; top: 120px; transform: rotate(-12deg); }
  .hero .r { right: -50px; top: 100px; transform: rotate(10deg); }

  .badge {
    margin-top: 28px;
    display: inline-flex; align-items: center; gap: 14px;
    padding: 12px 28px; border-radius: 999px;
    background: rgba(240,185,103,.14); border: 2px solid rgba(240,185,103,.5);
    color: var(--cookie); font-size: 32px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
  }
  .badge b { color: var(--text); font-weight: 800; text-transform: none; }

  h1 { margin-top: 20px; font-size: 92px; line-height: 1; font-weight: 800; text-align: center; letter-spacing: -.02em; }
  h1 span { color: var(--cookie); }

  .list { margin-top: 44px; width: 100%; display: flex; flex-direction: column; gap: 14px; }
  .item {
    display: flex; align-items: center; gap: 30px;
    padding: 22px 30px; border-radius: 30px;
    background: var(--bg-2); border: 2px solid rgba(255,255,255,.06);
  }
  .icon {
    flex: none; width: 92px; height: 92px; border-radius: 26px;
    display: grid; place-items: center;
    background: rgba(240,185,103,.16); color: var(--cookie);
  }
  .icon svg { width: 50px; height: 50px; }
  .icon.blue { background: rgba(74,144,217,.18); color: #7fb3ea; }
  .icon.ember { background: rgba(211,97,39,.2); color: #f08a55; }
  .item h3 { font-size: 38px; font-weight: 700; line-height: 1.1; }
  .item p { margin-top: 6px; font-size: 28px; color: var(--muted); line-height: 1.25; }

  .cta { position: absolute; left: 0; right: 0; bottom: 215px; display: flex; flex-direction: column; align-items: center; gap: 18px; }
  .btn {
    padding: 26px 64px; border-radius: 999px;
    background: var(--cookie); color: #20201e;
    font-size: 42px; font-weight: 800;
    box-shadow: 0 14px 40px rgba(240,185,103,.35);
  }
  .handle { font-size: 30px; color: var(--muted); }
  .handle b { color: var(--text); font-weight: 600; }
</style>
</head>
<body>
  <div id="confetti"></div>

  <div class="wrap">
    <div class="hero">
      <img class="side l" src="${character(left)}">
      <img class="logo" src="${logo}">
      <img class="side r" src="${character(right)}">
    </div>

    <div class="badge">New in <b>v${escape(config.version)}</b></div>
    <h1>${escape(config.headline[0])}<br><span>${escape(config.headline[1])}</span></h1>

    <div class="list">${cards}
    </div>
  </div>

  <div class="cta">
    <div class="btn">${escape(cta)}</div>
    <div class="handle"><b>${escape(link)}</b> · ${escape(handle)}</div>
  </div>

<script>
  // Deterministic confetti scattered around the edges, kept clear of the content column.
  const colors = ['#f0b967', '#d36127', '#4a90d9', '#ce8b3d', '#fcf7f0'];
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const host = document.getElementById('confetti');
  for (let i = 0; i < 70; i++) {
    const el = document.createElement('div');
    el.className = 'confetti';
    const edge = rnd() < .5;
    const x = edge ? rnd() * 60 : 1020 + rnd() * 60;
    const y = 120 + rnd() * 1700;
    const top = i < 22;
    const w = 10 + rnd() * 14, h = 18 + rnd() * 18;
    el.style.cssText = \`left:\${top ? 60 + rnd() * 960 : x}px;top:\${top ? 30 + rnd() * 400 : y}px;width:\${w}px;height:\${h}px;background:\${colors[i % colors.length]};opacity:\${.35 + rnd() * .5};transform:rotate(\${rnd() * 180}deg)\`;
    host.appendChild(el);
  }
</script>
</body>
</html>`;

const browser = await chromium.launch({ channel: 'chrome' });
try {
  const tab = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
  });
  await tab.setContent(html, { waitUntil: 'networkidle' });
  await tab.evaluate(() => document.fonts.ready);
  // A card whose text wraps pushes the list into the call to action.
  const overlap = await tab.evaluate(() => {
    const list = document.querySelector('.list').getBoundingClientRect();
    const cta = document.querySelector('.btn').getBoundingClientRect();
    return list.bottom - cta.top;
  });
  if (overlap > -16)
    console.warn(
      `warning: the highlights end ${Math.round(overlap + 16)}px too close to the button; shorten a title or text so no card wraps`,
    );
  await tab.screenshot({ path: out });
} finally {
  await browser.close();
}
console.log(out);
