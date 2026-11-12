import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/https';
import { getFirestore } from 'firebase-admin/firestore';
import { LandingPage } from '../shared/model/landing-page';
import { renderLandingPage } from '../shared/utils/render-landing-page';

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

/** The city segment the admin editor accepts: lowercase letters, digits, hyphens. */
const CITY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const notFound = (
  res: Parameters<Parameters<typeof onRequest>[0]>[1],
): void => {
  res.set('Cache-Control', MISSING_CACHE_CONTROL);
  res.status(404).send('Not Found');
};

export const renderCityPage = onRequest(async (req, res) => {
  try {
    // Expected: /eat/<city>, nothing more. One page per city, so the city
    // is both the path and the document id.
    const parts = req.path.split('/').filter(Boolean);
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
    const page = snap.exists ? (snap.data() as LandingPage) : undefined;

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

    res.set('Cache-Control', PUBLISHED_CACHE_CONTROL);
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(renderLandingPage({ ...page, city }));
  } catch (error) {
    logger.error('renderCityPage failed', error);
    res.status(500).send('Internal Server Error');
  }
});
