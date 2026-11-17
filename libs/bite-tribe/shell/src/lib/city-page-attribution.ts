import {
  EnvironmentProviders,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';

/** The query parameter a city landing page puts on every link into the app. */
export const CITY_PAGE_PARAM = 'city_page';

/** The city shape the admin editor accepts; anything else is not ours. */
const CITY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_CITY_LENGTH = 60;

export type CityPageArrival = {
  city_page: string;
  destination: 'start' | 'bite';
};

/**
 * Reads where a visit came from off the URL it arrived on.
 *
 * Only the two link shapes a city page produces are recognised: the call to
 * action opens the root, and an entry opens `/bite/<id>`. A hand-edited or
 * foreign `city_page` value is ignored rather than recorded, so the dimension
 * only ever holds cities a page could exist for.
 */
export const readCityPageArrival = (
  location: Pick<Location, 'pathname' | 'search'>,
): CityPageArrival | undefined => {
  const city = new URLSearchParams(location.search).get(CITY_PAGE_PARAM);

  if (!city || city.length > MAX_CITY_LENGTH || !CITY_PATTERN.test(city)) {
    return undefined;
  }

  if (location.pathname === '/' || location.pathname === '') {
    return { city_page: city, destination: 'start' };
  }

  if (/^\/bite\/[^/]+\/?$/.test(location.pathname)) {
    return { city_page: city, destination: 'bite' };
  }

  return undefined;
};

/**
 * Records the arrival a URL describes, if it describes one.
 *
 * Shared by the web start-up and the app's link handler: a city page links
 * its Bites through the share address `/s/bite/<id>` so that an installed app
 * opens them, and the app, which never sees that URL in `window.location`,
 * passes on the Bite route it navigates to together with the link's query.
 */
export const logCityPageArrival = (
  analytics: Pick<AnalyticsService, 'logEvent'>,
  location: Pick<Location, 'pathname' | 'search'>,
): void => {
  const arrival = readCityPageArrival(location);

  if (arrival) {
    analytics.logEvent(AnalyticsEvent.CityPageArrived, arrival);
  }
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
    logCityPageArrival(inject(AnalyticsService), window.location);
  });
