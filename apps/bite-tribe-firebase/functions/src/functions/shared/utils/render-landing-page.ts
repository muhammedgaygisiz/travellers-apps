import { LandingPage, LandingPageItem } from '../model/landing-page';
import { BITE_TRIBE_ORIGIN } from './bite-tribe-origin';
import { escapeHtml, renderSocialMeta } from './render-html';
import { APP_STORE_URL, PLAY_STORE_URL } from './store-urls';

/**
 * The full document for a city landing page (issue #1489). Unlike the share
 * stub it is the destination: no `meta refresh`, no script, and everything a
 * crawler needs is in the one response.
 *
 * Plain HTML with inline CSS on purpose. The page is read far more often by
 * crawlers and link unfurlers than by people, and the consumer app's bundle is
 * the wrong payload for a document whose job is to be parsed.
 */

const STYLE = `
  :root { color-scheme: light dark; --fg:#1d1d1b; --muted:#6b6a65; --line:#e4e2da; --card:#f6f5f0; --bg:#fff; }
  @media (prefers-color-scheme: dark) { :root { --fg:#f1efe8; --muted:#a9a79f; --line:#3a3a37; --card:#262624; --bg:#1a1a18; } }
  * { box-sizing: border-box; }
  body { margin:0; font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; color:var(--fg); background:var(--bg); }
  a { color:inherit; }
  header, main, footer { max-width:1080px; margin:0 auto; padding:0 16px; }
  header { display:flex; align-items:center; justify-content:space-between; height:56px; border-bottom:1px solid var(--line); }
  .brand { display:flex; align-items:center; gap:10px; font-weight:600; font-size:18px; text-decoration:none; }
  .brand img { height:36px; width:auto; display:block; }
  .ig { display:flex; align-items:center; gap:8px; font-size:14px; color:var(--muted); text-decoration:none; }
  .ig img { width:24px; height:24px; display:block; }
  .ig:hover span { text-decoration:underline; }
  .eyebrow { color:var(--muted); font-size:14px; margin:24px 0 4px; }
  h1 { font-size:28px; line-height:1.25; margin:0 0 12px; }
  .intro { color:var(--muted); max-width:680px; margin:0 0 24px; white-space:pre-line; }
  ol { list-style:none; padding:0; margin:0 0 32px; display:grid; grid-template-columns:minmax(0,1fr); gap:24px; }
  li { min-width:0; }
  li img { width:100%; max-width:100%; height:auto; aspect-ratio:1/1; object-fit:cover; border-radius:12px; background:var(--card); display:block; }
  h2 { font-size:18px; margin:10px 0 0; }
  .loc { color:var(--muted); font-size:14px; margin:2px 0 0; }
  footer { border-top:1px solid var(--line); padding-top:16px; padding-bottom:32px; color:var(--muted); font-size:14px; }
  footer a { margin-right:16px; }
  .entry { display:block; text-decoration:none; }
  .entry:hover h2 { text-decoration:underline; }
  .cta { display:block; text-align:center; text-decoration:none; font-weight:600; padding:14px 20px; border-radius:12px; background:#e8590c; color:#fff; }
  .stores { display:flex; justify-content:center; align-items:center; gap:12px; margin-top:8px; }
  .store { display:flex; flex-direction:column; align-items:center; gap:6px; text-decoration:none; }
  .store .qr { display:none; }
  .badge-app-store { width:120px; height:40px; margin:4px 0; display:block; }
  .badge-google-play { width:154px; height:60px; display:block; margin:-10px 0; }
  /* A phone gets the call to action as a bar pinned to the bottom, with the
     store badges under it: on a phone they install the app directly. */
  main { padding-bottom:148px; }
  .get { position:fixed; left:0; right:0; bottom:0; margin:0; padding:12px 16px; background:var(--bg); border-top:1px solid var(--line); }
  .get-lead { display:none; margin:0; font-weight:600; }
  @media (min-width:720px) {
    h1 { font-size:36px; }
    ol { grid-template-columns:repeat(3,minmax(0,1fr)); gap:24px; }
    main { padding-bottom:0; }
    .get { position:static; display:flex; align-items:center; justify-content:space-between; gap:24px; padding:20px; border:1px solid var(--line); border-radius:12px; margin:0 0 32px; }
    .get-lead { display:block; }
    .cta { flex:none; }
    .stores { gap:16px; margin-top:0; align-items:flex-start; }
    .store .qr { display:block; width:96px; height:96px; background:#fff; border-radius:8px; padding:4px; }
    .badge-app-store { width:96px; height:32px; }
    .badge-google-play { width:124px; height:48px; margin:-8px 0; }
  }
`;

/** The query parameter every link into the app carries (issue #1492). */
export const CITY_PAGE_PARAM = 'city_page';

/**
 * A link into the app that says which city page it came from. The consumer
 * app records it as `city_page_arrived` at start-up; the page itself carries
 * no analytics, cookie or storage (epic #1487).
 */
export const appLink = (path: string, city: string): string =>
  `${BITE_TRIBE_ORIGIN}${path}?${CITY_PAGE_PARAM}=${encodeURIComponent(city)}`;

/**
 * The app's own logo, served by the web build, so the page carries the same
 * mark as every other BiteTribe surface. Empty `alt`: the wordmark beside it
 * already names the link.
 */
const LOGO_URL = `${BITE_TRIBE_ORIGIN}/assets/icons/logo.svg`;

/**
 * The store badges and QR codes the web app's start page shows (issue #1453),
 * served from the same build so there is one drawing of each. Apple ships a
 * black badge for light backgrounds and a white one for dark; Google ships
 * one, whose PNG already carries its clear space - hence its taller box.
 */
const STORE_ASSETS = `${BITE_TRIBE_ORIGIN}/assets/store`;

/** The account every city page mirrors a "Top 5 dishes" post from. */
export const INSTAGRAM_URL = 'https://www.instagram.com/bitetribeapp/';

/**
 * A link to the account, with Instagram's own glyph from Meta's brand
 * resources, unaltered (issue #1978). Black on a light page and white on a
 * dark one, the two monochrome variants the guidelines allow; the gradient
 * glyph ships as a 10 MB SVG and is no header icon. Served from the web build
 * like the logo and the store badges, so the page still loads nothing from
 * an Instagram host, and carries no embed, script or tracking.
 */
const INSTAGRAM_LINK = `<a class="ig" href="${INSTAGRAM_URL}" rel="noopener" aria-label="BiteTribe on Instagram">
      <picture>
        <source srcset="${BITE_TRIBE_ORIGIN}/assets/social/instagram-glyph-white.svg" media="(prefers-color-scheme: dark)" />
        <img src="${BITE_TRIBE_ORIGIN}/assets/social/instagram-glyph-black.svg" alt="" width="24" height="24" />
      </picture>
      <span>@bitetribeapp</span>
    </a>`;

/** `/eat/<city>` on the canonical host, never `bite-tribe.web.app`. */
export const landingPageUrl = (page: Pick<LandingPage, 'city'>): string =>
  `${BITE_TRIBE_ORIGIN}/eat/${encodeURIComponent(page.city)}`;

/**
 * One Bite. The whole entry links to the Bite in the app: a member lands on
 * it, and a signed-out visitor is sent to sign up by `authGuard`, which
 * remembers the Bite and opens it once they have (decided on #1487).
 */
const renderItem =
  (city: string) =>
  (item: LandingPageItem, index: number): string => {
    const name = escapeHtml(item.name);
    const location = [item.place, item.locality].filter(Boolean).join(' · ');
    const href = appLink(`/bite/${encodeURIComponent(item.biteId)}`, city);

    return `
      <li>
        <a class="entry" href="${escapeHtml(href)}">
          <img src="${escapeHtml(item.imageUrl)}" alt="${name}" loading="${index === 0 ? 'eager' : 'lazy'}" width="800" height="800" />
          <h2>${name}</h2>
          <p class="loc">${escapeHtml(location)}</p>
        </a>
      </li>`;
  };

/**
 * The page's one call to action, and on a wide screen the store QR codes
 * beside it (issue #1492). The codes are the ones the web app's start page
 * shows (issue #1453), served from the same build, so there is one drawing of
 * each. A phone gets a bar pinned to the bottom with the button alone: it
 * cannot scan its own screen.
 */
const renderCallToAction = (city: string): string => `
    <section class="get" aria-label="BiteTribe">
      <p class="get-lead">See every dish, price and photo on BiteTribe</p>
      <a class="cta" data-cta="primary" href="${escapeHtml(appLink('/', city))}">Open BiteTribe</a>
      <div class="stores">
        <a class="store" href="${APP_STORE_URL}" rel="noopener" aria-label="Download on the App Store">
          <img class="qr" src="${STORE_ASSETS}/app-store-qr.svg" alt="" loading="lazy" />
          <picture>
            <source srcset="${STORE_ASSETS}/app-store-badge-white.svg" media="(prefers-color-scheme: dark)" />
            <img class="badge badge-app-store" src="${STORE_ASSETS}/app-store-badge-black.svg" alt="" width="120" height="40" />
          </picture>
        </a>
        <a class="store" href="${PLAY_STORE_URL}" rel="noopener" aria-label="Get it on Google Play">
          <img class="qr" src="${STORE_ASSETS}/google-play-qr.svg" alt="" loading="lazy" />
          <img class="badge badge-google-play" src="${STORE_ASSETS}/google-play-badge.png" alt="" width="154" height="60" />
        </a>
      </div>
    </section>`;

/**
 * Structured data for the page (issue #1491): an `ItemList` of the Bites in
 * order. Each entry is the `Restaurant` the Bite was eaten at, carrying the
 * dish as a `MenuItem` on its menu, so the list stays a type search engines
 * understand while saying what the page is actually about - the dish.
 *
 * The address is city-level only: a Bite carries a city, not a street, and a
 * guessed street is worse than none.
 */
export const landingPageJsonLd = (page: LandingPage): object => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: page.title,
  description: page.metaDescription,
  url: landingPageUrl(page),
  numberOfItems: page.items.length,
  itemListElement: page.items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: {
      '@type': 'Restaurant',
      name: item.place,
      image: item.imageUrl,
      address: {
        '@type': 'PostalAddress',
        addressLocality: item.locality || page.cityName,
        addressCountry: page.countryCode,
      },
      hasMenu: {
        '@type': 'Menu',
        hasMenuItem: {
          '@type': 'MenuItem',
          name: item.name,
          image: item.imageUrl,
        },
      },
    },
  })),
});

/**
 * JSON inside a `<script>` element is not HTML-escaped by the parser, so the
 * only way out of it is a literal `</script`. Escaping every `<` (and the two
 * line separators JavaScript treats as newlines) closes that door whatever an
 * operator or a Bite name contains.
 */
export const renderJsonLd = (data: object): string =>
  JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

const formatMonth = (page: LandingPage): string | undefined => {
  const at = page.updatedAt ?? page.publishedAt;
  if (!at) {
    return undefined;
  }
  try {
    return at
      .toDate()
      .toLocaleDateString(page.locale, { month: 'long', year: 'numeric' });
  } catch {
    return undefined;
  }
};

export const renderLandingPage = (page: LandingPage): string => {
  const month = formatMonth(page);
  const eyebrow = [page.cityName, month].filter(Boolean).join(' · ');

  return `<!doctype html>
<html lang="${escapeHtml(page.locale || 'en')}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="${escapeHtml(page.metaDescription)}" />
  <meta property="og:site_name" content="BiteTribe" />

  ${renderSocialMeta({
    title: page.title,
    description: page.metaDescription,
    imageUrl: page.items[0]?.imageUrl,
    canonicalUrl: landingPageUrl(page),
  })}

  <script type="application/ld+json">${renderJsonLd(landingPageJsonLd(page))}</script>

  <style>${STYLE}</style>
</head>
<body>
  <header>
    <a class="brand" href="${BITE_TRIBE_ORIGIN}/"><img src="${LOGO_URL}" alt="" width="28" height="36" />BiteTribe</a>
    ${INSTAGRAM_LINK}
  </header>
  <main>
    <p class="eyebrow">${escapeHtml(eyebrow)}</p>
    <h1>${escapeHtml(page.title)}</h1>
    <p class="intro">${escapeHtml(page.intro)}</p>
    ${renderCallToAction(page.city)}
    <ol>${page.items.map(renderItem(page.city)).join('')}
    </ol>
  </main>
  <footer>
    <a href="${BITE_TRIBE_ORIGIN}/support">Support</a>
    <a href="${BITE_TRIBE_ORIGIN}/privacy">Privacy</a>
  </footer>
</body>
</html>`;
};
