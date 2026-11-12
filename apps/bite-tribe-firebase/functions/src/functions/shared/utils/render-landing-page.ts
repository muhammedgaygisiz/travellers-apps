import { LandingPage, LandingPageItem } from '../model/landing-page';
import { BITE_TRIBE_ORIGIN } from './bite-tribe-origin';
import { escapeHtml, renderSocialMeta } from './render-html';

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
  @media (min-width:720px) { h1 { font-size:36px; } ol { grid-template-columns:repeat(3,minmax(0,1fr)); gap:24px; } }
`;

/**
 * The app's own logo, served by the web build, so the page carries the same
 * mark as every other BiteTribe surface. Empty `alt`: the wordmark beside it
 * already names the link.
 */
const LOGO_URL = `${BITE_TRIBE_ORIGIN}/assets/icons/logo.svg`;

/** `/eat/<city>` on the canonical host, never `bite-tribe.web.app`. */
export const landingPageUrl = (page: Pick<LandingPage, 'city'>): string =>
  `${BITE_TRIBE_ORIGIN}/eat/${encodeURIComponent(page.city)}`;

const renderItem = (item: LandingPageItem, index: number): string => {
  const name = escapeHtml(item.name);
  const location = [item.place, item.locality].filter(Boolean).join(' · ');

  return `
      <li>
        <img src="${escapeHtml(item.imageUrl)}" alt="${name}" loading="${index === 0 ? 'eager' : 'lazy'}" width="800" height="800" />
        <h2>${name}</h2>
        <p class="loc">${escapeHtml(location)}</p>
      </li>`;
};

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
  </header>
  <main>
    <p class="eyebrow">${escapeHtml(eyebrow)}</p>
    <h1>${escapeHtml(page.title)}</h1>
    <p class="intro">${escapeHtml(page.intro)}</p>
    <ol>${page.items.map(renderItem).join('')}
    </ol>
  </main>
  <footer>
    <a href="${BITE_TRIBE_ORIGIN}/support">Support</a>
    <a href="${BITE_TRIBE_ORIGIN}/privacy">Privacy</a>
  </footer>
</body>
</html>`;
};
