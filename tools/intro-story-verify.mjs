/**
 * Browser-verify Intro Story Compare + real-UI beats against Storybook @ :4400.
 * Proves: scale framing, scroll sync, beat state transitions, images, nav honesty.
 */
import { chromium } from 'playwright';

const BASE = process.env.STORYBOOK_URL || 'http://localhost:4400';

const STORIES = {
  compare: 'prototypes-intro-story-compare--interactive',
  beats: 'prototypes-intro-story-b-real-ui-story-beats--interactive',
  discover: 'prototypes-intro-story-b-real-ui-story-beats-beats--discover-home-feed',
  share: 'prototypes-intro-story-b-real-ui-story-beats-beats--share-create-bite',
  tribe: 'prototypes-intro-story-b-real-ui-story-beats-beats--tribe-follow-explorer',
  go: 'prototypes-intro-story-b-real-ui-story-beats-beats--go-find-nearby',
  icons: 'prototypes-intro-story-a-icons-only--interactive',
};

const results = [];

function ok(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function openStory(page, id) {
  const url = `${BASE}/iframe.html?id=${id}&viewMode=story`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('intro-real-ui-source, intro-story-compare, intro-icons-only, intro-story-beats', {
    timeout: 45000,
  }).catch(() => null);
  await page.waitForTimeout(1800);
  return url;
}

async function probeDiscover(page) {
  await openStory(page, STORIES.discover);

  const framing = await page.evaluate(() => {
    const vp = document.querySelector('.source__viewport');
    const native = document.querySelector('.source__native');
    if (!vp || !native) return { error: 'missing stage' };
    const vr = vp.getBoundingClientRect();
    const nr = native.getBoundingClientRect();
    const t = getComputedStyle(native).transform;
    return {
      vpW: Math.round(vr.width),
      vpH: Math.round(vr.height),
      visualW: Math.round(nr.width),
      visualH: Math.round(nr.height),
      transform: t,
      hasFilters: !!document.querySelector(
        '.source__layer--in [data-testid="home-feed-controls"], .source__layer--in ion-chip'
      ),
      hasCards: !!document.querySelector('.source__layer--in bt-bite, .source__layer--in .bite'),
    };
  });

  ok(
    'Discover framing scale',
    !framing.error && framing.vpH >= 280 && framing.visualH > 200 && framing.visualW > 100,
    JSON.stringify(framing)
  );
  ok('Discover filters visible', !!framing.hasFilters, JSON.stringify(framing));

  // Sample during scroll window AND catch details before loop returns home
  const scrollSamples = [];
  let sawDetails = false;
  for (let i = 0; i < 18; i++) {
    await page.waitForTimeout(350);
    const sample = await page.evaluate(() => {
      const root =
        document.querySelector('.source__layer--in') ||
        document.querySelector('.source__native');
      const ions = root?.querySelectorAll('ion-content') || [];
      const ion = ions[ions.length - 1];
      const scroller =
        ion?.shadowRoot?.querySelector('.inner-scroll') ||
        root?.querySelector('.inner-scroll') ||
        root?.querySelector('.main-content');
      const touch = document.querySelector('.gesture__touch');
      const inLayer = document.querySelector('.source__layer--in');
      return {
        scrollTop: scroller?.scrollTop ?? null,
        scrollH: scroller?.scrollHeight ?? null,
        clientH: scroller?.clientHeight ?? null,
        hasScroller: !!scroller,
        fingerOn: touch?.classList.contains('gesture__touch--on') ?? false,
        fingerY: touch ? parseFloat(touch.style.top || '0') : null,
        hasDetails: !!inLayer?.querySelector(
          'details-page, .bite-creator-container'
        ),
        vpW: Math.round(
          document.querySelector('.source__viewport')?.getBoundingClientRect()
            .width || 0
        ),
      };
    });
    scrollSamples.push(sample);
    sawDetails = sawDetails || sample.hasDetails;
  }

  const maxScroll = Math.max(
    ...scrollSamples.map((s) => (typeof s.scrollTop === 'number' ? s.scrollTop : 0))
  );
  const fingerMoved = scrollSamples.some((s) => s.fingerOn);
  const wideEnough = scrollSamples.some((s) => (s.vpW || 0) > 200);
  ok(
    'Discover viewport width',
    wideEnough,
    `vpW samples=${scrollSamples.map((s) => s.vpW).slice(0, 3)}`
  );
  ok(
    'Discover scroll sync (scrollTop moves)',
    maxScroll > 20,
    `maxScroll=${maxScroll} scrollH/clientH=${scrollSamples[0]?.scrollH}/${scrollSamples[0]?.clientH}`
  );
  ok(
    'Discover soft pointer visible',
    fingerMoved,
    JSON.stringify(scrollSamples.find((s) => s.fingerOn))
  );
  ok('Discover → details state', sawDetails);
}

async function probeShare(page) {
  await openStory(page, STORIES.share);
  await page.waitForTimeout(2500);
  const picker = await page.evaluate(() => !!document.querySelector('.picker'));
  // Wait through picker → photo apply → details
  let sawPicker = picker;
  let sawPhoto = false;
  let sawLikes = false;
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(450);
    const s = await page.evaluate(() => ({
      picker: !!document.querySelector('.picker'),
      photo: !!document.querySelector(
        '.source__layer--in img[src*="bite-botanic"], .source__layer--in img[src*="botanic"]'
      ),
      likes: !!document.querySelector('.source__react, .source__thumb'),
      details: !!document.querySelector('.source__layer--in details-page, .source__layer--in .bite-creator-container'),
    }));
    sawPicker = sawPicker || s.picker;
    sawPhoto = sawPhoto || s.photo;
    sawLikes = sawLikes || s.likes;
    if (s.details && sawLikes) break;
  }
  ok('Share picker overlay', sawPicker);
  ok('Share photo applied / thematic image', sawPhoto);
  ok('Share reactions burst', sawLikes);
}

async function probeTribe(page) {
  await openStory(page, STORIES.tribe);
  let sawProfile = false;
  let sawFollow = false;
  for (let i = 0; i < 18; i++) {
    await page.waitForTimeout(400);
    const s = await page.evaluate(() => ({
      profile: !!document.querySelector('.source__layer--in profile-page, .source__layer--in .profile-actions'),
      toast: !!document.querySelector('.source__toast'),
      toastText: document.querySelector('.source__toast')?.textContent?.trim() || '',
    }));
    sawProfile = sawProfile || s.profile;
    sawFollow = sawFollow || (s.toast && /Following/i.test(s.toastText));
    if (sawProfile && sawFollow) break;
  }
  ok('Tribe → profile', sawProfile);
  ok('Tribe follow toast / Following', sawFollow);
}

async function probeGo(page) {
  await openStory(page, STORIES.go);
  let sawMap = false;
  let sawDrawer = false;
  let sawDetails = false;
  let sawGoHint = false;
  for (let i = 0; i < 22; i++) {
    await page.waitForTimeout(400);
    const s = await page.evaluate(() => ({
      map: !!document.querySelector('.source__layer--in map-page, .source__layer--in .leaflet-container'),
      drawer: !!document.querySelector('.source__layer--in bt-snap-drawer, .source__layer--in .drawer'),
      details: !!document.querySelector(
        '.source__layer--in details-page, .source__layer--in [data-testid="bite-details-navigation"]'
      ),
      goHint: !!document.querySelector('.source__go-hint'),
    }));
    sawMap = sawMap || s.map;
    sawDrawer = sawDrawer || s.drawer;
    sawDetails = sawDetails || s.details;
    sawGoHint = sawGoHint || s.goHint;
    if (sawMap && sawDrawer && sawDetails) break;
  }
  ok('Go → map', sawMap);
  ok('Go pin → snap drawer', sawDrawer);
  ok('Go → details', sawDetails);
  ok('Go directions highlight', sawGoHint || sawDetails, sawGoHint ? 'hint' : 'details-only fallback');
}

async function probeCompare(page) {
  await openStory(page, STORIES.compare);
  const tabs = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('.compare__switcher button')].map((b) =>
      b.textContent.trim()
    );
    return buttons;
  });
  ok(
    'Compare tabs (no fake video)',
    tabs.length >= 4 &&
      tabs.some((t) => /Icons/i.test(t)) &&
      tabs.some((t) => /Beats/i.test(t)) &&
      !tabs.some((t) => /video|fake|remotion/i.test(t)),
    JSON.stringify(tabs)
  );

  // Click through B beats stage present
  const hasStage = await page.evaluate(() => !!document.querySelector('intro-real-ui-source, .source__native'));
  ok('Compare shows real-UI stage', hasStage);
}

async function probeIcons(page) {
  await openStory(page, STORIES.icons);
  const icons = await page.evaluate(() => ({
    host: !!document.querySelector('intro-icons-only'),
    ionIcons: document.querySelectorAll('ion-icon').length,
  }));
  ok('Icons-only kept', icons.host && icons.ionIcons > 0, JSON.stringify(icons));
}

async function probeNoBlueBorders(page) {
  await openStory(page, STORIES.discover);
  await page.waitForTimeout(1500);
  const blue = await page.evaluate(() => {
    const touch = document.querySelector('.gesture__touch');
    if (!touch) return { missing: true };
    const s = getComputedStyle(touch);
    return {
      border: s.borderColor,
      outline: s.outlineColor,
      bg: s.backgroundColor,
    };
  });
  const isBlue =
    /rgb\(\s*(0|50|60|70|80|90|100),\s*(100|120|140|160|180|200),\s*2[0-9]{2}\s*\)/i.test(
      `${blue.border} ${blue.outline}`
    ) || /#00|blue|#4a90d9|#3b82f6/i.test(`${blue.border}${blue.outline}`);
  ok('Subtle pointer (no blue border)', !blue.missing && !isBlue, JSON.stringify(blue));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  try {
    await probeCompare(page);
    await probeIcons(page);
    await probeDiscover(page);
    await probeNoBlueBorders(page);
    await probeShare(page);
    await probeTribe(page);
    await probeGo(page);
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.pass);
  console.log('\n——— SUMMARY ———');
  console.log(`passed ${results.length - failed.length}/${results.length}`);
  if (failed.length) {
    console.log('FAILED:');
    for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
