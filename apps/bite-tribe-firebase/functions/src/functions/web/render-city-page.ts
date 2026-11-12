import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/https';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { LandingPage } from '../shared/model/landing-page';
import {
  landingPageUrl,
  renderLandingPage,
} from '../shared/utils/render-landing-page';
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

export const renderSitemap = (pages: LandingPage[]): string => {
  const urls = pages
    .map((page) => {
      const lastmod = isoDate(page.publishedAt);

      return `  <url>
    <loc>${escapeHtml(landingPageUrl(page))}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
};

export const renderCityPage = onRequest(async (req, res) => {
  try {
    const parts = req.path.split('/').filter(Boolean);

    if (parts.length === 2 && parts[0] === 'eat' && parts[1] === SITEMAP_PATH) {
      const published = await db
        .collection('landingPages')
        .where('status', '==', 'published')
        .get();
      const pages = published.docs
        .map((doc) => ({ ...(doc.data() as LandingPage), city: doc.id }))
        .sort((a, b) => a.city.localeCompare(b.city));

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
