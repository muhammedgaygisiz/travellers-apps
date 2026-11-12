import {
  EnvironmentProviders,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';

/** The query parameter a city landing page puts on every link into the app. */
export const CITY_PAGE_PARAM = 'city_page';

/** The slug shape the admin editor accepts; anything else is not ours. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 80;

export type CityPageArrival = {
  page_slug: string;
  destination: 'start' | 'bite';
};

/**
 * Reads where a visit came from off the URL it arrived on.
 *
 * Only the two link shapes a city page produces are recognised: the call to
 * action opens the root, and an entry opens `/bite/<id>`. A hand-edited or
 * foreign `city_page` value is ignored rather than recorded, so the dimension
 * only ever holds slugs that exist.
 */
export const readCityPageArrival = (
  location: Pick<Location, 'pathname' | 'search'>,
): CityPageArrival | undefined => {
  const slug = new URLSearchParams(location.search).get(CITY_PAGE_PARAM);

  if (!slug || slug.length > MAX_SLUG_LENGTH || !SLUG_PATTERN.test(slug)) {
    return undefined;
  }

  if (location.pathname === '/' || location.pathname === '') {
    return { page_slug: slug, destination: 'start' };
  }

  if (/^\/bite\/[^/]+\/?$/.test(location.pathname)) {
    return { page_slug: slug, destination: 'bite' };
  }

  return undefined;
};

/**
 * Records a visit that arrived from a city landing page (issue #1492).
 *
 * An app initializer rather than a route hook, because it has to run before
 * the first navigation: a signed-out visitor sent to `/bite/<id>` is
 * redirected to `/start` by `authGuard`, and the query string goes with the
 * URL it was on. The page itself carries no analytics (epic #1487); the
 * attribution is recorded here, at the destination, where the app's own
 * consent and analytics already apply.
 */
export const provideCityPageAttribution = (): EnvironmentProviders =>
  provideAppInitializer(() => {
    const arrival = readCityPageArrival(window.location);

    if (arrival) {
      inject(AnalyticsService).logEvent(
        AnalyticsEvent.CityPageArrived,
        arrival,
      );
    }
  });
