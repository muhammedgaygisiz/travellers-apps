import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/https';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { LandingPage } from '../shared/model/landing-page';
import {
  CITY_INDEX_URL,
  landingPageUrl,
  renderLandingPage,
} from '../shared/utils/render-landing-page';
import { renderCityIndex } from '../shared/utils/render-city-index';
import { escapeHtml } from '../shared/utils/render-html';

/**
 * Serves a published city landing page at `/eat/<city>` (epic #1487,
 * issue #1489).
 *
 * Rendered here with the Admin SDK rather than by a public Angular route: the
 * browser never opens a Firestore connection, so App Check and the security
 * rules are not in the request path, and nothing about either has to be
 * loosened while #1078 is outstanding.
 */

const db = getFirestore();

/** Hosting's CDN absorbs repeat traffic; a republish shows within the hour. */
export const PUBLISHED_CACHE_CONTROL =
  'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';

/**
 * Short, so a page published moments after a crawler hit its URL is not
 * hidden behind a cached 404 for an hour.
 */
export const MISSING_CACHE_CONTROL = 'public, max-age=60, s-maxage=60';

/**
 * The sitemap's job is to change when the published set does, so it is
 * cached for minutes, not a day (issue #1980). With the pages' header the CDN
 * kept serving the empty sitemap from before the first publication, and
 * Search Console could not read the pages from it.
 */
export const SITEMAP_CACHE_CONTROL = 'public, max-age=300, s-maxage=300';

/** The city segment the admin editor accepts: lowercase letters, digits, hyphens. */
const CITY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const notFound = (
  res: Parameters<Parameters<typeof onRequest>[0]>[1],
): void => {
  res.set('Cache-Control', MISSING_CACHE_CONTROL);
  res.status(404).send('Not Found');
};

/**
 * The published set as a sitemap (issue #1491), at `/eat/sitemap.xml`.
 *
 * Served from the same function because it is already behind the `/eat/**`
 * rewrite, and a growing set of pages cannot live in the static
 * `sitemap.xml`. `robots.txt` names it in a second `Sitemap:` line. A city
 * segment can never be `sitemap.xml`: the editor only accepts lowercase
 * letters, digits and hyphens there.
 */
export const SITEMAP_PATH = 'sitemap.xml';

const isoDate = (value: unknown): string | undefined =>
  value instanceof Timestamp
    ? value.toDate().toISOString().slice(0, 10)
    : undefined;

/**
 * The page's Bite photos as image sitemap entries (issue #2326), so Google
 * Images finds them without crawling the page first. Only `image:loc`: Google
 * dropped the extension's caption, title, geo and licence tags in 2022. A photo
 * used twice on a page is listed once.
 */
const sitemapImages = (page: LandingPage): string =>
  [...new Set(page.items.map((item) => item.imageUrl).filter(Boolean))]
    .map(
      (url) => `
    <image:image>
      <image:loc>${escapeHtml(url)}</image:loc>
    </image:image>`,
    )
    .join('');

/**
 * The published set plus `/eat` itself (issue #2091), whose last change is the
 * newest publication among them.
 */
export const renderSitemap = (pages: LandingPage[]): string => {
  const newest = pages
    .map((page) => isoDate(page.publishedAt))
    .filter((date): date is string => !!date)
    .sort()
    .pop();
  const index = pages.length
    ? `  <url>
    <loc>${escapeHtml(CITY_INDEX_URL)}</loc>${newest ? `\n    <lastmod>${newest}</lastmod>` : ''}
  </url>\n`
    : '';
  const urls = pages
    .map((page) => {
      const lastmod = isoDate(page.publishedAt);

      return `  <url>
    <loc>${escapeHtml(landingPageUrl(page))}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}${sitemapImages(page)}
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${index}${urls}
</urlset>
`;
};

/** Every published page, by city. Draft and withdrawn pages are never listed. */
const publishedPages = async (): Promise<LandingPage[]> => {
  const published = await db
    .collection('landingPages')
    .where('status', '==', 'published')
    .get();

  return published.docs
    .map((doc) => ({ ...(doc.data() as LandingPage), city: doc.id }))
    .sort((a, b) => a.city.localeCompare(b.city));
};

export const renderCityPage = onRequest(async (req, res) => {
  try {
    const parts = req.path.split('/').filter(Boolean);

    // `/eat`: every published city on one page (issue #2091). Cached like the
    // sitemap rather than like a city page, because it changes whenever the
    // published set does and a new city should show within minutes.
    if (parts.length === 1 && parts[0] === 'eat') {
      const pages = await publishedPages();

      if (!pages.length) {
        notFound(res);
        return;
      }

      res.set('Cache-Control', SITEMAP_CACHE_CONTROL);
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(renderCityIndex(pages));
      return;
    }

    if (parts.length === 2 && parts[0] === 'eat' && parts[1] === SITEMAP_PATH) {
      const pages = await publishedPages();

      res.set('Cache-Control', SITEMAP_CACHE_CONTROL);
      res.set('Content-Type', 'application/xml; charset=utf-8');
      res.status(200).send(renderSitemap(pages));
      return;
    }

    // Otherwise expected: /eat/<city>, nothing more. One page per city, so
    // the city is both the path and the document id.
    if (parts.length !== 2 || parts[0] !== 'eat') {
      notFound(res);
      return;
    }

    const city = decodeURIComponent(parts[1]);
    // Only the shape the editor writes. Anything else - a slash that would
    // address a subcollection, a dot, an upper-case letter - is not a page.
    if (!CITY_PATTERN.test(city)) {
      notFound(res);
      return;
    }

    const snap = await db.collection('landingPages').doc(city).get();
    let page = snap.exists ? (snap.data() as LandingPage) : undefined;
    // The page's own city when the request named one of its aliases instead
    // (issue #1974): `/eat/koeln` for the page at `/eat/cologne`.
    let canonicalCity: string | undefined;

    if (!page) {
      const aliased = await db
        .collection('landingPages')
        .where('aliases', 'array-contains', city)
        .get();
      const match = aliased.docs[0];

      if (match) {
        page = match.data() as LandingPage;
        canonicalCity = match.id;
      }
    }

    if (!page) {
      notFound(res);
      return;
    }

    if (page.status === 'withdrawn') {
      res.set('Cache-Control', MISSING_CACHE_CONTROL);
      res.status(410).send('Gone');
      return;
    }

    if (page.status !== 'published') {
      notFound(res);
      return;
    }

    // An alias never serves the page a second time: two URLs with one
    // content would split its ranking. It answers as the page would - 404 for
    // a draft, 410 once withdrawn - and otherwise sends the reader on, for
    // good, to the one URL search engines should index.
    if (canonicalCity) {
      res.set('Cache-Control', PUBLISHED_CACHE_CONTROL);
      res.redirect(301, landingPageUrl({ city: canonicalCity }));
      return;
    }

    res.set('Cache-Control', PUBLISHED_CACHE_CONTROL);
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(renderLandingPage({ ...page, city }));
  } catch (error) {
    logger.error('renderCityPage failed', error);
    res.status(500).send('Internal Server Error');
  }
});
