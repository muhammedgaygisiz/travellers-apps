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
 * Serves a published city landing page at `/eat/<city>/<slug>` (epic #1487,
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
 * Short, so a page published moments after a crawler hit its slug is not
 * hidden behind a cached 404 for an hour.
 */
export const MISSING_CACHE_CONTROL = 'public, max-age=60, s-maxage=60';

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
        .map((doc) => ({ ...(doc.data() as LandingPage), slug: doc.id }))
        .sort(
          (a, b) =>
            a.city.localeCompare(b.city) || a.slug.localeCompare(b.slug),
        );

      res.set('Cache-Control', PUBLISHED_CACHE_CONTROL);
      res.set('Content-Type', 'application/xml; charset=utf-8');
      res.status(200).send(renderSitemap(pages));
      return;
    }

    // Otherwise expected: /eat/<city>/<slug>, nothing more.
    if (parts.length !== 3 || parts[0] !== 'eat') {
      notFound(res);
      return;
    }

    const [, city, slug] = parts.map((part) => decodeURIComponent(part));
    // A slug with a slash would address a subcollection; anything else is a
    // valid document id or simply misses.
    if (!slug || slug.includes('/')) {
      notFound(res);
      return;
    }

    const snap = await db.collection('landingPages').doc(slug).get();
    const page = snap.exists ? (snap.data() as LandingPage) : undefined;

    // A page is reachable under its own city only, so one document cannot be
    // indexed under several URLs.
    if (!page || page.city !== city) {
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

    res.set('Cache-Control', PUBLISHED_CACHE_CONTROL);
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(renderLandingPage({ ...page, slug }));
  } catch (error) {
    logger.error('renderCityPage failed', error);
    res.status(500).send('Internal Server Error');
  }
});
